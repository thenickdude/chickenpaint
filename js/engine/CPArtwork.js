/*
    ChickenPaint
    
    ChickenPaint is a translation of ChibiPaint from Java to JavaScript
    by Nicholas Sherlock / Chicken Smoothie.
    
    ChibiPaint is Copyright (c) 2006-2008 Marc Schefer

    ChickenPaint is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    ChickenPaint is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with ChickenPaint. If not, see <http://www.gnu.org/licenses/>.
*/

import CPLayer from "./CPLayer";
import CPGreyBmp from "./CPGreyBmp";
import CPColorBmp from "./CPColorBmp";
import CPBrushManager from "./CPBrushManager";
import CPBrushInfo from "./CPBrushInfo";
import CPUndo from "./CPUndo";
import CPClip from "./CPClip";

import CPColorFloat from "../util/CPColorFloat";
import CPRect from "../util/CPRect";
import CPRandom from "../util/CPRandom";
import CPTransform from "../util/CPTransform";
import {setCanvasInterpolation} from "../util/CPPolyfill";

// Polyfill, used in duplicateLayer
if (!String.prototype.endsWith) {
    String.prototype.endsWith = function(searchString, position) {
        var subjectString = this.toString();
        if (typeof position !== 'number' || !isFinite(position) || Math.floor(position) !== position || position > subjectString.length) {
            position = subjectString.length;
        }
        position -= searchString.length;
        var lastIndex = subjectString.indexOf(searchString, position);
        return lastIndex !== -1 && lastIndex === position;
    };
}

export default function CPArtwork(_width, _height) {
    
    _width = _width | 0;
    _height = _height | 0;
    
    const
        MAX_UNDO = 30,
        EMPTY_BACKGROUND_COLOR = 0xFFFFFFFF,
        EMPTY_LAYER_COLOR = 0x00FFFFFF,
        
        BURN_CONSTANT = 260,
        BLUR_MIN = 64,
        BLUR_MAX = 1;
    
    var
        layers = [],
        curLayer,
        
        hasUnsavedChanges = false,
        
        curSelection = new CPRect(0, 0, 0, 0),

        /**
         * Our buffer for storing all the layers merged together according to their blending modes.
         *
         * @type {CPLayer}
         */
        fusionBuffer = new CPLayer(_width, _height),

        /**
         * Points to the buffer which represents all the layers merged together (either fusionBuffer or curLayer
         * depending on if the document is single-layered or not).
         *
         * @type {CPLayer}
         */
        fusion = fusionBuffer,

        /**
         * A copy of the current layer's data that can be used for undo operations.
         * 
         * @type {CPLayer}
         */
        undoBuffer = new CPLayer(_width, _height),

        /**
         * The region of the undoBuffer which is out of date with respect to the content of the layer, and needs updated
         * with prepareForLayerUndo().
         *
         * @type {CPRect}
         */
        undoBufferInvalidRegion = new CPRect(0, 0, _width, _height),

        /**
         * We use this buffer so we can accurately accumulate small changes to layer opacity during a brush stroke.
         * 
         * Normally we use it as a 16-bit opacity channel per pixel, but some brushes use the full 32-bits per pixel
         * as ARGB.
         */
        opacityBuffer = new CPGreyBmp(_width, _height, 32),

        /**
         * The area of dirty data contained by opacityBuffer that should be merged by fusionLayers()
         */
        opacityArea = new CPRect(0, 0, 0, 0),

        /**
         * The area of dirty layer data that should be merged into the fusion by fusionLayers().
         */
        fusionArea = new CPRect(0, 0, _width, _height),

        /**
         * Used by CPUndoPaint to keep track of the area that has been dirtied by layer operations and should be
         * saved for undo.
         */
        undoArea = new CPRect(0, 0, 0, 0),

        rnd = new CPRandom(),

        previewOperation = null,
        
        clipboard = null, // A CPClip
        undoList = [], redoList = [],
        
        curBrush = null,
        
        brushManager = new CPBrushManager(),
        
        lastX = 0.0, lastY = 0.0, lastPressure = 0.0,
        brushBuffer = null,
        
        sampleAllLayers = false,
        lockAlpha = false,
        
        curColor = 0x000000, // Black
        transformInterpolation = "smooth",
        
        that = this;
    
    // FIXME: 2007-01-13 I'm moving this to the CPRect class
    // find where this version is used and change the
    // code to use the CPRect version
    function clipSourceDest(srcRect, dstRect) {
        // FIXME:
        // /!\ dstRect bottom and right are ignored and instead we clip
        // against the width, height of the layer. :/
        //

        // this version would be enough in most cases (when we don't need
        // srcRect bottom and right to be clipped)
        // it's left here in case it's needed to make a faster version
        // of this function
        // dstRect.right = Math.min(width, dstRect.left + srcRect.getWidth());
        // dstRect.bottom = Math.min(height, dstRect.top + srcRect.getHeight());

        // new dest bottom/right
        dstRect.right = dstRect.left + srcRect.getWidth();
        if (dstRect.right > that.width) {
            srcRect.right -= dstRect.right - that.width;
            dstRect.right = that.width;
        }

        dstRect.bottom = dstRect.top + srcRect.getHeight();
        if (dstRect.bottom > that.height) {
            srcRect.bottom -= dstRect.bottom - that.height;
            dstRect.bottom = that.height;
        }

        // new src top/left
        if (dstRect.left < 0) {
            srcRect.left -= dstRect.left;
            dstRect.left = 0;
        }

        if (dstRect.top < 0) {
            srcRect.top -= dstRect.top;
            dstRect.top = 0;
        }
    }
    
    function callListenersUpdateRegion(region) {
        that.emitEvent("updateRegion", [region]);
    }

    // layerIndex is optional, provide when only one layer has been updated
    function callListenersLayerChange(layerIndex) {
        that.emitEvent("changeLayer", [layerIndex]);
    }

    // When the selected rectangle changes
    function callListenersSelectionChange() {
        that.emitEvent("changeSelection", []);
    }
    
    this.getLayers = function() {
        return layers;
    };

    this.getLayerCount = function() {
        return layers.length;
    };
    
    //
    // Selection methods
    //

    /**
     * Gets the current selection rect or a rectangle covering the whole canvas if there are no selections
     * 
     * @returns CPRect
     */
    this.getSelectionAutoSelect = function() {
        var
            r;

        if (!curSelection.isEmpty()) {
            r = curSelection.clone();
        } else {
            r = this.getBounds();
        }

        return r;
    };
    
    this.getSelection = function() {
        return curSelection.clone();
    };

    /**
     * Mark the given rectangle on the canvas as needing to be re-fused (i.e. we've drawn in this region).
     * Listeners are notified about our updated canvas region.
     *
     * @param rect CPRect Rect to invalidate
     */
    function invalidateFusionRect(rect) {
        fusionArea.union(rect);

        // This updated area will need to be updated in our undo buffer later
        undoBufferInvalidRegion.union(rect);

        callListenersUpdateRegion(rect);
    };

    /**
     * Mark the entire canvas as needing to be re-fused (we've drawn to the whole canvas)
     */
    function invalidateFusion() {
        invalidateFusionRect(new CPRect(0, 0, that.width, that.height));
    };
    
    this.setHasUnsavedChanges = function(value) {
        hasUnsavedChanges = value;
    };
    
    this.getHasUnsavedChanges = function() {
        return hasUnsavedChanges;
    };
    
    this.setLayerVisibility = function(layerIndex, visible) {
        var
            layer = this.getLayer(layerIndex);
        
        addUndo(new CPUndoLayerVisible(layerIndex, layer.visible, visible));
        layer.visible = visible;
        
        invalidateFusion();
        callListenersLayerChange(layerIndex);
    };

    this.addLayer = function() {
        var
            newLayer = new CPLayer(this.width, this.height, this.getDefaultLayerName()),
            activeLayerIndex = this.getActiveLayerIndex();
        
        newLayer.clearAll(EMPTY_LAYER_COLOR); // Transparent white
        
        addUndo(new CPUndoAddLayer(activeLayerIndex));

        layers.splice(activeLayerIndex + 1, 0, newLayer);
        this.setActiveLayerIndex(activeLayerIndex + 1);

        invalidateFusion();
        callListenersLayerChange();
    };
    
    this.addLayerObject = function(layer) {
        layers.push(layer);
        
        if (layers.length == 1) {
            curLayer = layers[0];
        }
        
        invalidateFusion();
        callListenersLayerChange();
    };
    
    /**
     * Remove the currently selected layer.
     * 
     * Returns true if the layer was removed, or false when removal failed because there is currently only one layer in 
     * the document.
     */
    this.removeLayer = function() {
        if (layers.length > 1) {
            var
                activeLayerIndex = this.getActiveLayerIndex();
            
            addUndo(new CPUndoRemoveLayer(activeLayerIndex, curLayer));
            
            layers.splice(activeLayerIndex, 1);
            this.setActiveLayerIndex(activeLayerIndex < layers.length ? activeLayerIndex : activeLayerIndex - 1);
            
            invalidateFusion();
            callListenersLayerChange();
            
            return true;
        }
        
        return false;
    };

    this.duplicateLayer = function() {
        var 
            copySuffix = " Copy",
            newLayer = new CPLayer(this.width, this.height),
            activeLayerIndex = this.getActiveLayerIndex();

        addUndo(new CPUndoDuplicateLayer(activeLayerIndex));
        
        newLayer.copyFrom(layers[activeLayerIndex]);
        
        if (!newLayer.name.endsWith(copySuffix)) {
            newLayer.name += copySuffix;
        }
        
        layers.splice(activeLayerIndex + 1, 0, newLayer);
        this.setActiveLayerIndex(activeLayerIndex + 1);
        
        invalidateFusion();
        callListenersLayerChange();
    };
    
    this.mergeDown = function(createUndo) {
        var
            activeLayerIndex = this.getActiveLayerIndex();
        
        if (layers.length > 1 && activeLayerIndex > 0) {
            if (createUndo) {
                addUndo(new CPUndoMergeDownLayer(activeLayerIndex));
            }

            layers[activeLayerIndex].fusionWithFullAlpha(layers[activeLayerIndex - 1], this.getBounds());
            layers.splice(activeLayerIndex, 1);
            this.setActiveLayerIndex(activeLayerIndex - 1);

            invalidateFusion();
            callListenersLayerChange();
        }
    };

    this.mergeAllLayers = function(createUndo) {
        if (layers.length > 1) {
            if (createUndo) {
                addUndo(new CPUndoMergeAllLayers());
            }

            that.fusionLayers();
            layers = [];

            var
                layer = new CPLayer(that.width, that.height, this.getDefaultLayerName());
            
            layer.copyDataFrom(fusion);
            
            layers.push(layer);
            this.setActiveLayerIndex(0);

            invalidateFusion();
            callListenersLayerChange();
        }
    };
    
    function moveLayerReal(from, to) {
        var
            layer = layers.splice(from, 1)[0];
        
        if (to <= from) {
            layers.splice(to, 0, layer);
            that.setActiveLayerIndex(to);
        } else {
            layers.splice(to - 1, 0, layer);
            that.setActiveLayerIndex(to - 1);
        }

        invalidateFusion();
        callListenersLayerChange();
    }
    
    /**
     * Move a layer in the stack from one index to another.
     * 
     * @param from int
     * @param to int
     */
    this.moveLayer = function(from, to) {
        if (from < 0 || from >= this.getLayerCount() || to < 0 || to > this.getLayerCount() || from == to) {
            return;
        }
        
        addUndo(new CPUndoMoveLayer(from, to));
        moveLayerReal(from, to);
    }
    
    this.setLayerAlpha = function(layerIndex, alpha) {
        var
            layer = this.getLayer(layerIndex);
        
        if (layer.getAlpha() != alpha) {
            addUndo(new CPUndoLayerAlpha(layerIndex, alpha));
            layer.setAlpha(alpha);
            
            invalidateFusion();
            callListenersLayerChange(layerIndex);
        }
    };

    this.setLayerBlendMode = function(layerIndex, blendMode) {
        var
            layer = this.getLayer(layerIndex);
    
        if (layer.getBlendMode() != blendMode) {
            addUndo(new CPUndoLayerMode(layerIndex, blendMode));
            layer.setBlendMode(blendMode);
            
            invalidateFusion();
            callListenersLayerChange(layerIndex);
        }
    };

    this.setLayerName = function(layerIndex, name) {
        var
            layer = this.getLayer(layerIndex);
        
        if (layer && layer.name != name) {
            addUndo(new CPUndoLayerRename(layerIndex, name));
            layer.name = name;
            
            callListenersLayerChange(layerIndex);
        }
    };
    
    function CPBrushToolBase() {
    }
    
    CPBrushToolBase.prototype.beginStroke = function(x, y, pressure) {
        prepareForLayerUndo();
        undoArea.makeEmpty();

        opacityBuffer.clearAll(0);
        opacityArea.makeEmpty();

        lastX = x;
        lastY = y;
        lastPressure = pressure;
        
        this.createAndPaintDab(x, y, pressure);
    };

    CPBrushToolBase.prototype.continueStroke = function(x, y, pressure) {
        var 
            dist = Math.sqrt(((lastX - x) * (lastX - x) + (lastY - y) * (lastY - y))),
            spacing = Math.max(curBrush.minSpacing, curBrush.curSize * curBrush.spacing);

        if (dist > spacing) {
            var 
                nx = lastX, ny = lastY, np = lastPressure,
                df = (spacing - 0.001) / dist;
            
            for (var f = df; f <= 1.0; f += df) {
                nx = f * x + (1.0 - f) * lastX;
                ny = f * y + (1.0 - f) * lastY;
                np = f * pressure + (1.0 - f) * lastPressure;
                this.createAndPaintDab(nx, ny, np);
            }
            lastX = nx;
            lastY = ny;
            lastPressure = np;
        }
    };

    CPBrushToolBase.prototype.endStroke = function() {
        undoArea.clip(that.getBounds());

        // Did we end up painting anything?
        if (!undoArea.isEmpty()) {
            mergeOpacityBuffer(curColor, false);
            addUndo(new CPUndoPaint());

            /* Eagerly update the undo buffer for next time so we can avoid this lengthy
             * prepare at the beginning of a paint stroke
             */
            prepareForLayerUndo(); 
        }
        brushBuffer = null;
    };

    /**
     * Create a paint dab at the given position using the current brush, and paint it.
     *
     * @param x float
     * @param y float
     * @param pressure float
     */
    CPBrushToolBase.prototype.createAndPaintDab = function(x, y, pressure) {
        curBrush.applyPressure(pressure);
        
        if (curBrush.scattering > 0.0) {
            x += rnd.nextGaussian() * curBrush.curScattering / 4.0;
            y += rnd.nextGaussian() * curBrush.curScattering / 4.0;
        }
        
        var 
            dab = brushManager.getDab(x, y, curBrush);
        
        this.paintDab(dab);
    };

    /**
     * Paint a dab returned by brushManager.getDab()
     *
     * @param dab {byte[] brush; int x, y, alpha, width, height}
     */
    CPBrushToolBase.prototype.paintDab = function(dab) {
        var
            srcRect = new CPRect(0, 0, dab.width, dab.height),
            dstRect = new CPRect(0, 0, dab.width, dab.height);
        
        dstRect.translate(dab.x, dab.y);

        clipSourceDest(srcRect, dstRect);

        // drawing entirely outside the canvas
        if (dstRect.isEmpty()) {
            return;
        }

        undoArea.union(dstRect);
        opacityArea.union(dstRect);

        this.paintDabImplementation(srcRect, dstRect, dab);
        
        invalidateFusionRect(dstRect);
    }

    function CPBrushToolSimpleBrush() {
    }

    CPBrushToolSimpleBrush.prototype = Object.create(CPBrushToolBase.prototype);
    CPBrushToolSimpleBrush.prototype.constructor = CPBrushToolSimpleBrush; 
    
    CPBrushToolSimpleBrush.prototype.paintDabImplementation = function(srcRect, dstRect, dab) {
        // FIXME: there should be no reference to a specific tool here
        // create a new brush parameter instead
        if (curBrush.isAirbrush) {
            this.paintFlow(srcRect, dstRect, dab.brush, dab.width, Math.max(1, dab.alpha / 8));
        } else if (curBrush.toolNb == ChickenPaint.T_PEN) {
            this.paintFlow(srcRect, dstRect, dab.brush, dab.width, Math.max(1, dab.alpha / 2));
        } else {
            this.paintOpacity(srcRect, dstRect, dab.brush, dab.width, dab.alpha);
        }
    };

    CPBrushToolSimpleBrush.prototype.mergeOpacityBuf = function(dstRect, color /* int */) {
        var 
            opacityData = opacityBuffer.data,
            undoData = undoBuffer.data,
            
            red = (color >> 16) & 0xFF,
            green = (color >> 8) & 0xFF,
            blue = color & 0xFF,
            
            width = dstRect.getWidth() | 0,
            height = dstRect.getHeight() | 0,
            
            dstOffset = curLayer.offsetOfPixel(dstRect.left, dstRect.top),
            srcOffset = opacityBuffer.offsetOfPixel(dstRect.left, dstRect.top),
        
            srcYStride = (opacityBuffer.width - width) | 0,
            dstYStride = ((curLayer.width - width) * CPColorBmp.BYTES_PER_PIXEL) | 0;

        for (var y = 0; y < height; y++, srcOffset += srcYStride, dstOffset += dstYStride) {
            for (var x = 0; x < width; x++, srcOffset++, dstOffset += CPColorBmp.BYTES_PER_PIXEL) {
                var
                    opacityAlpha = (opacityData[srcOffset] / 255) | 0;
                
                if (opacityAlpha > 0) {
                    var
                        destAlpha = undoData[dstOffset + CPColorBmp.ALPHA_BYTE_OFFSET],
                    
                        newLayerAlpha = (opacityAlpha + destAlpha * (255 - opacityAlpha) / 255) | 0,
                        realAlpha = (255 * opacityAlpha / newLayerAlpha) | 0,
                        invAlpha = 255 - realAlpha;
                    
                    curLayer.data[dstOffset] = ((red * realAlpha + undoData[dstOffset] * invAlpha) / 255) & 0xff;
                    curLayer.data[dstOffset + 1] = ((green * realAlpha + undoData[dstOffset + 1] * invAlpha) / 255) & 0xff;
                    curLayer.data[dstOffset + 2] = ((blue * realAlpha + undoData[dstOffset + 2] * invAlpha) / 255) & 0xff;
                    curLayer.data[dstOffset + 3] = newLayerAlpha;
                }
            }
        }
    };

    /**
     *
     * @param srcRect CPRect
     * @param dstRect CPRect
     * @param brush int[]
     * @param brushWidth int
     * @param alpha float
     */
    CPBrushToolSimpleBrush.prototype.paintOpacity = function(srcRect, dstRect, brush, brushWidth, alpha) {
        var 
            opacityData = opacityBuffer.data,
            
            srcOffset = srcRect.left + srcRect.top * brushWidth,
            dstOffset = opacityBuffer.offsetOfPixel(dstRect.left, dstRect.top),
            
            dstWidth = dstRect.getWidth(),
            
            srcYStride = brushWidth - dstWidth,
            dstYStride = that.width - dstWidth;

        alpha = Math.min(255, alpha);

        for (var y = dstRect.top; y < dstRect.bottom; y++, srcOffset += srcYStride, dstOffset += dstYStride) {
            for (var x = 0; x < dstWidth; x++, srcOffset++, dstOffset++) {
                opacityData[dstOffset] = Math.max(brush[srcOffset] * alpha, opacityData[dstOffset]);
            }
        }
    };

    CPBrushToolSimpleBrush.prototype.paintFlow = function(srcRect, dstRect, brush, brushWidth, alpha) {
        var 
            opacityData = opacityBuffer.data,

            srcOffset = srcRect.left + srcRect.top * brushWidth,
            dstOffset = opacityBuffer.offsetOfPixel(dstRect.left, dstRect.top),
            
            dstWidth = dstRect.getWidth(),

            srcYStride = brushWidth - dstWidth,
            dstYStride = that.width - dstWidth;
        
        for (var y = dstRect.top; y < dstRect.bottom; y++, srcOffset += srcYStride, dstOffset += dstYStride) {
            for (var x = 0; x < dstWidth; x++, srcOffset++, dstOffset++) {
                var
                    brushAlpha = brush[srcOffset] * alpha;
                
                if (brushAlpha != 0) {
                    var
                        opacityAlpha = Math.min(255 * 255, opacityData[dstOffset] + (255 - opacityData[dstOffset] / 255) * brushAlpha / 255);
                    
                    opacityData[dstOffset] = opacityAlpha;
                }
            }
        }
    };

    /*CPBrushToolSimpleBrush.prototype.paintOpacityFlow = function(srcRect, dstRect, brush, brushWidth, opacity, flow) {
        var 
            opacityData = opacityBuffer.data,

            by = srcRect.top;
        
        for (var y = dstRect.top; y < dstRect.bottom; y++, by++) {
            var 
                srcOffset = srcRect.left + by * brushWidth,
                dstOffset = dstRect.left + y * width;
            
            for (var x = dstRect.left; x < dstRect.right; x++, srcOffset++, dstOffset++) {
                var 
                    brushAlpha = brush[srcOffset] * flow;
                
                if (brushAlpha != 0) {
                    var
                        opacityAlpha = opacityData[dstOffset],
                        newAlpha = Math.min(255 * 255, opacityAlpha + (opacity - opacityAlpha / 255) * brushAlpha / 255);
                    
                    newAlpha = Math.min(opacity * brush[srcOffset], newAlpha);
                    
                    if (newAlpha > opacityAlpha) {
                        opacityData[dstOffset] = newAlpha;
                    }
                }
            }
        }
    };*/

    function CPBrushToolEraser() {
    }
    
    CPBrushToolEraser.prototype = Object.create(CPBrushToolSimpleBrush.prototype);
    CPBrushToolEraser.prototype.constructor = CPBrushToolEraser;
    
    CPBrushToolEraser.prototype.mergeOpacityBuf = function(dstRect, color) {
        var 
            opacityData = opacityBuffer.data,
            undoData = undoBuffer.data;
    
        for (var y = dstRect.top; y < dstRect.bottom; y++) {
            var
                dstOffset = curLayer.offsetOfPixel(dstRect.left, y) + CPColorBmp.ALPHA_BYTE_OFFSET,
                srcOffset = opacityBuffer.offsetOfPixel(dstRect.left, y);
            
            for (var x = dstRect.left; x < dstRect.right; x++, dstOffset += CPColorBmp.BYTES_PER_PIXEL) {
                var
                    opacityAlpha = (opacityData[srcOffset++] / 255) | 0;
                
                if (opacityAlpha > 0) {
                    var
                        destAlpha = undoData[dstOffset],
                        realAlpha = destAlpha * (255 - opacityAlpha) / 255;
                    
                    curLayer.data[dstOffset] = realAlpha;
                }
            }
        }
    };

    function CPBrushToolDodge() {
    }
    
    CPBrushToolDodge.prototype = Object.create(CPBrushToolSimpleBrush.prototype);
    CPBrushToolDodge.prototype.constructor = CPBrushToolDodge;
    
    CPBrushToolDodge.prototype.mergeOpacityBuf = function(dstRect, color) {
        var 
            opacityData = opacityBuffer.data,
            undoData = undoBuffer.data;
    
        for (var y = dstRect.top; y < dstRect.bottom; y++) {
            var
                dstOffset = curLayer.offsetOfPixel(dstRect.left, y),
                srcOffset = opacityBuffer.offsetOfPixel(dstRect.left, y);
            
            for (var x = dstRect.left; x < dstRect.right; x++, srcOffset++, dstOffset += CPColorBmp.BYTES_PER_PIXEL) {
                var
                    opacityAlpha = (opacityData[srcOffset] / 255) | 0;
                
                if (opacityAlpha > 0 && undoData[dstOffset + CPColorBmp.ALPHA_BYTE_OFFSET] != 0) {
                    opacityAlpha += 255;
                    
                    for (var i = 0; i < 3; i++) {
                        var channel = (undoData[dstOffset + i] * opacityAlpha / 255) | 0;
                    
                        if (channel > 255) {
                            channel = 255;
                        }
                        
                        curLayer.data[dstOffset + i] = channel;
                    }
                }
            }
        }
    };

    function CPBrushToolBurn() {
    }
    
    CPBrushToolBurn.prototype = Object.create(CPBrushToolSimpleBrush.prototype);
    CPBrushToolBurn.prototype.constructor = CPBrushToolBurn;
    
    CPBrushToolBurn.prototype.mergeOpacityBuf = function(dstRect, color) {
        var 
            opacityData = opacityBuffer.data,
            undoData = undoBuffer.data;
    
        for (var y = dstRect.top; y < dstRect.bottom; y++) {
            var
                dstOffset = curLayer.offsetOfPixel(dstRect.left, y),
                srcOffset = opacityBuffer.offsetOfPixel(dstRect.left, y);
            
            for (var x = dstRect.left; x < dstRect.right; x++, srcOffset++, dstOffset += CPColorBmp.BYTES_PER_PIXEL) {
                var
                    opacityAlpha = (opacityData[srcOffset] / 255) | 0;
                
                if (opacityAlpha > 0 && undoData[dstOffset + CPColorBmp.ALPHA_BYTE_OFFSET] != 0) {
                    for (var i = 0; i < 3; i++) {
                        var channel = undoData[dstOffset + i];
                        
                        channel = (channel - (BURN_CONSTANT - channel) * opacityAlpha / 255) | 0;
                    
                        if (channel < 0) {
                            channel = 0;
                        }
                        
                        curLayer.data[dstOffset + i] = channel;
                    }
                }
            }
        }
    };
    
    function CPBrushToolBlur() {
    }
    
    CPBrushToolBlur.prototype = Object.create(CPBrushToolSimpleBrush.prototype);
    CPBrushToolBlur.prototype.constructor = CPBrushToolBlur;

    CPBrushToolBlur.prototype.mergeOpacityBuf = function(dstRect, color) {
        var 
            opacityData = opacityBuffer.data,
            undoData = undoBuffer.data,
            
            dstYStride = undoBuffer.width * CPColorBmp.BYTES_PER_PIXEL,
            
            r, g, b, a;

        function addSample(sampleOffset) {
            r += undoData[sampleOffset + CPColorBmp.RED_BYTE_OFFSET];
            g += undoData[sampleOffset + CPColorBmp.GREEN_BYTE_OFFSET];
            b += undoData[sampleOffset + CPColorBmp.BLUE_BYTE_OFFSET];
            a += undoData[sampleOffset + CPColorBmp.ALPHA_BYTE_OFFSET];
        }
        
        for (var y = dstRect.top; y < dstRect.bottom; y++) {
            var 
                dstOffset = undoBuffer.offsetOfPixel(dstRect.left, y),
                srcOffset = opacityBuffer.offsetOfPixel(dstRect.left, y);
            
            for (var x = dstRect.left; x < dstRect.right; x++, dstOffset += CPColorBmp.BYTES_PER_PIXEL, srcOffset++) {
                var 
                    opacityAlpha = (opacityData[srcOffset] / 255) | 0;
                
                if (opacityAlpha > 0) {
                    var
                        blur = (BLUR_MIN + (BLUR_MAX - BLUR_MIN) * opacityAlpha / 255) | 0,

                        sum = blur + 4;
                    
                    r = blur * undoData[dstOffset + CPColorBmp.RED_BYTE_OFFSET];
                    g = blur * undoData[dstOffset + CPColorBmp.GREEN_BYTE_OFFSET];
                    b = blur * undoData[dstOffset + CPColorBmp.BLUE_BYTE_OFFSET];
                    a = blur * undoData[dstOffset + CPColorBmp.ALPHA_BYTE_OFFSET];

                    addSample(y > 0 ? dstOffset - dstYStride : dstOffset);
                    addSample(y < undoBuffer.height - 1 ? dstOffset + dstYStride : dstOffset);
                    addSample(x > 0 ? dstOffset - CPColorBmp.BYTES_PER_PIXEL : dstOffset);
                    addSample(x < undoBuffer.width - 1 ? dstOffset + CPColorBmp.BYTES_PER_PIXEL : dstOffset);

                    a /= sum;
                    r /= sum;
                    g /= sum;
                    b /= sum;
                    
                    curLayer.data[dstOffset + CPColorBmp.RED_BYTE_OFFSET] = r | 0;
                    curLayer.data[dstOffset + CPColorBmp.GREEN_BYTE_OFFSET] = g | 0;
                    curLayer.data[dstOffset + CPColorBmp.BLUE_BYTE_OFFSET] = b | 0;
                    curLayer.data[dstOffset + CPColorBmp.ALPHA_BYTE_OFFSET] = a | 0;
                }
            }
        }
    }
    
    /* Brushes derived from this class use the opacity buffer as a simple alpha layer (32-bit pixels in ARGB order) */
    function CPBrushToolDirectBrush() {
    }
    
    CPBrushToolDirectBrush.prototype = Object.create(CPBrushToolSimpleBrush.prototype);
    CPBrushToolDirectBrush.prototype.constructor = CPBrushToolDirectBrush;

    CPBrushToolDirectBrush.prototype.mergeOpacityBuf = function(dstRect, color) {
        var 
            opacityData = opacityBuffer.data,
            undoData = undoBuffer.data,
            
            srcOffset = opacityBuffer.offsetOfPixel(dstRect.left, dstRect.top),
            dstOffset = curLayer.offsetOfPixel(dstRect.left, dstRect.top),
            
            width = dstRect.getWidth() | 0,
            height = dstRect.getHeight() | 0,
            
            srcYStride = (opacityBuffer.width - width) | 0,
            dstYStride = ((curLayer.width - width) * CPColorBmp.BYTES_PER_PIXEL) | 0;

        for (var y = 0; y < height; y++, srcOffset += srcYStride, dstOffset += dstYStride) {
            for (var x = 0; x < width; x++, srcOffset++, dstOffset += CPColorBmp.BYTES_PER_PIXEL) {
                var
                    color1 = opacityData[srcOffset],
                    alpha1 = color1 >>> 24;
                
                if (alpha1 == 0) {
                    continue;
                }
                
                var 
                // Pretty sure fusion.alpha is always 100 and the commented section is a copy/paste error
                    alpha2 = undoData[dstOffset + CPColorBmp.ALPHA_BYTE_OFFSET] /* * fusion.alpha / 100 */, 
                    newAlpha = (alpha1 + alpha2 - alpha1 * alpha2 / 255) | 0;
                
                if (newAlpha > 0) {
                    var
                        realAlpha = (alpha1 * 255 / newAlpha) | 0,
                        invAlpha = 255 - realAlpha;
                    
                    curLayer.data[dstOffset] = ((((color1 >> 16) & 0xFF) * realAlpha + undoData[dstOffset] * invAlpha) / 255) | 0;
                    curLayer.data[dstOffset + 1] = ((((color1 >> 8) & 0xFF) * realAlpha + undoData[dstOffset + 1] * invAlpha) / 255) | 0;
                    curLayer.data[dstOffset + 2] = (((color1 & 0xFF) * realAlpha + undoData[dstOffset + 2] * invAlpha) / 255) | 0;
                    curLayer.data[dstOffset + 3] = newAlpha;
                }
            }
        }
    };
    
    function CPBrushToolWatercolor() {
        const
            WCMEMORY = 50,
            WXMAXSAMPLERADIUS = 64;

        var
            previousSamples = [];

        /**
         * Average out a bunch of samples around the given pixel (x, y).
         * 
         * dx, dy controls the spread of the samples.
         * 
         * @returns CPColorFloat
         */
        function sampleColor(x, y, dx, dy) {
            var
                samples = [],
                
                layerToSample = sampleAllLayers ? fusion : that.getActiveLayer();
            
            x = x | 0;
            y = y | 0;

            samples.push(CPColorFloat.createFromInt(layerToSample.getPixel(x, y)));

            for (var r = 0.25; r < 1.001; r += .25) {
                samples.push(CPColorFloat.createFromInt(layerToSample.getPixel(~~(x + r * dx), y)));
                samples.push(CPColorFloat.createFromInt(layerToSample.getPixel(~~(x - r * dx), y)));
                samples.push(CPColorFloat.createFromInt(layerToSample.getPixel(x, ~~(y + r * dy))));
                samples.push(CPColorFloat.createFromInt(layerToSample.getPixel(x, ~~(y - r * dy))));

                samples.push(CPColorFloat.createFromInt(layerToSample.getPixel(~~(x + r * 0.7 * dx), ~~(y + r * 0.7 * dy))));
                samples.push(CPColorFloat.createFromInt(layerToSample.getPixel(~~(x + r * 0.7 * dx), ~~(y - r * 0.7 * dy))));
                samples.push(CPColorFloat.createFromInt(layerToSample.getPixel(~~(x - r * 0.7 * dx), ~~(y + r * 0.7 * dy))));
                samples.push(CPColorFloat.createFromInt(layerToSample.getPixel(~~(x - r * 0.7 * dx), ~~(y - r * 0.7 * dy))));
            }

            var
                average = new CPColorFloat(0, 0, 0);
            
            for (var i = 0; i < samples.length; i++) {
                var
                    sample = samples[i];
                
                average.r += sample.r;
                average.g += sample.g;
                average.b += sample.b;
            }
            
            average.r /= samples.length;
            average.g /= samples.length;
            average.b /= samples.length;

            return average;
        }
        
        // Blend the brush stroke with full color into the opacityBuffer
        function paintDirect(srcRect, dstRect, brush, brushWidth, alpha, color1) {
            var
                opacityData = opacityBuffer.data,

                by = srcRect.top;
            
            for (var y = dstRect.top; y < dstRect.bottom; y++, by++) {
                var
                    srcOffset = srcRect.left + by * brushWidth,
                    dstOffset = opacityBuffer.offsetOfPixel(dstRect.left, y);
                
                for (var x = dstRect.left; x < dstRect.right; x++, srcOffset++, dstOffset++) {
                    var 
                        alpha1 = ((brush[srcOffset] & 0xff) * alpha / 255) | 0;
                    
                    if (alpha1 <= 0) {
                        continue;
                    }

                    var
                        color2 = opacityData[dstOffset],
                        alpha2 = color2 >>> 24,

                        newAlpha = (alpha1 + alpha2 - alpha1 * alpha2 / 255) | 0;
                    
                    if (newAlpha > 0) {
                        var 
                            realAlpha = (alpha1 * 255 / newAlpha) | 0,
                            invAlpha = 255 - realAlpha;

                        // The usual alpha blending formula C = A * alpha + B * (1 - alpha)
                        // has to rewritten in the form C = A + (1 - alpha) * B - (1 - alpha) *A
                        // that way the rounding up errors won't cause problems

                        var 
                            newColor = newAlpha << 24
                                | ((color1 >>> 16 & 0xff) + (((color2 >>> 16 & 0xff) * invAlpha - (color1 >>> 16 & 0xff) * invAlpha) / 255)) << 16
                                | ((color1 >>> 8 & 0xff) + (((color2 >>> 8 & 0xff) * invAlpha - (color1 >>> 8 & 0xff) * invAlpha) / 255)) << 8
                                | ((color1 & 0xff) + (((color2 & 0xff) * invAlpha - (color1 & 0xff) * invAlpha) / 255));

                        opacityData[dstOffset] = newColor;
                    }
                }
            }
        }
        
        this.beginStroke = function(x, y, pressure) {
            previousSamples = null;

            CPBrushToolDirectBrush.prototype.beginStroke.call(this, x, y, pressure);
        };

        this.paintDabImplementation = function(srcRect, dstRect, dab) {
            if (previousSamples == null) {
                // Seed the previousSamples list to capacity with a bunch of copies of one sample to get us started
                var 
                    startColor = sampleColor(
                        ~~((dstRect.left + dstRect.right) / 2),
                        ~~((dstRect.top + dstRect.bottom) / 2), 
                        Math.max(1, Math.min(WXMAXSAMPLERADIUS, dstRect.getWidth() * 2 / 6)), 
                        Math.max(1, Math.min(WXMAXSAMPLERADIUS, dstRect.getHeight() * 2 / 6))
                    );

                previousSamples = [];
                
                for (var i = 0; i < WCMEMORY; i++) {
                    previousSamples.push(startColor);
                }
            }
            
            var 
                wcColor = new CPColorFloat(0, 0, 0);
            
            for (var i = 0; i < previousSamples.length; i++) {
                var
                    sample = previousSamples[i];
                
                wcColor.r += sample.r;
                wcColor.g += sample.g;
                wcColor.b += sample.b;
            }
            wcColor.r /= previousSamples.length;
            wcColor.g /= previousSamples.length;
            wcColor.b /= previousSamples.length;

            // resaturation
            wcColor.mixWith(CPColorFloat.createFromInt(curColor), curBrush.resat * curBrush.resat);

            var
                newColor = wcColor.toInt();

            // bleed
            wcColor.mixWith(
                sampleColor(
                    (dstRect.left + dstRect.right) / 2,
                    (dstRect.top + dstRect.bottom) / 2,
                    Math.max(1, Math.min(WXMAXSAMPLERADIUS, dstRect.getWidth() * 2 / 6)),
                    Math.max(1, Math.min(WXMAXSAMPLERADIUS, dstRect.getHeight() * 2 / 6))
                ), 
                curBrush.bleed
            );

            previousSamples.push(wcColor);
            previousSamples.shift();

            paintDirect(srcRect, dstRect, dab.brush, dab.width, Math.max(1, dab.alpha / 4), newColor);
            mergeOpacityBuffer(0, false);
            
            if (sampleAllLayers) {
                that.fusionLayers();
            }
        };
    }
    
    CPBrushToolWatercolor.prototype = Object.create(CPBrushToolDirectBrush.prototype);
    CPBrushToolWatercolor.prototype.constructor = CPBrushToolWatercolor;
    
    function CPBrushToolOil() {

        function oilAccumBuffer(srcRect, dstRect, buffer, w, alpha) {
            var
                layerToSample = sampleAllLayers ? fusion : that.getActiveLayer(),

                by = srcRect.top;
            
            for (var y = dstRect.top; y < dstRect.bottom; y++, by++) {
                var 
                    srcOffset = srcRect.left + by * w,
                    dstOffset = layerToSample.offsetOfPixel(dstRect.left, y);
                
                for (var x = dstRect.left; x < dstRect.right; x++, srcOffset++, dstOffset += CPColorBmp.BYTES_PER_PIXEL) {
                    var
                        alpha1 = (layerToSample.data[dstOffset + CPColorBmp.ALPHA_BYTE_OFFSET] * alpha / 255) | 0;
                    
                    if (alpha1 <= 0) {
                        continue;
                    }

                    var
                        color2 = buffer[srcOffset],
                        alpha2 = color2 >>> 24,

                        newAlpha = (alpha1 + alpha2 - alpha1 * alpha2 / 255) | 0;
                    
                    if (newAlpha > 0) {
                        var 
                            realAlpha = (alpha1 * 255 / newAlpha) | 0,
                            invAlpha = 255 - realAlpha,
                            
                            color1Red = layerToSample.data[dstOffset + CPColorBmp.RED_BYTE_OFFSET],
                            color1Green = layerToSample.data[dstOffset + CPColorBmp.GREEN_BYTE_OFFSET],
                            color1Blue = layerToSample.data[dstOffset + CPColorBmp.BLUE_BYTE_OFFSET],

                            newColor = newAlpha << 24
                                | (color1Red + (((color2 >>> 16 & 0xff) * invAlpha - color1Red * invAlpha) / 255)) << 16
                                | (color1Green + (((color2 >>> 8 & 0xff) * invAlpha - color1Green * invAlpha) / 255)) << 8
                                | (color1Blue + (((color2 & 0xff) * invAlpha - color1Blue * invAlpha) / 255));

                        buffer[srcOffset] = newColor;
                    }
                }
            }
        }

        function oilResatBuffer(srcRect, dstRect, buffer, w, alpha1, color1) {
            var
                by = srcRect.top;
            
            if (alpha1 <= 0) {
                return;
            }
            
            for (var y = dstRect.top; y < dstRect.bottom; y++, by++) {
                var 
                    srcOffset = srcRect.left + by * w;
                
                for (var x = dstRect.left; x < dstRect.right; x++, srcOffset++) {
                    var
                        color2 = buffer[srcOffset],
                        alpha2 = (color2 >>> 24),
    
                        newAlpha = (alpha1 + alpha2 - alpha1 * alpha2 / 255) | 0;
                    
                    if (newAlpha > 0) {
                        var 
                            realAlpha = (alpha1 * 255 / newAlpha) | 0,
                            invAlpha = 255 - realAlpha,
                            
                            newColor = newAlpha << 24
                                | ((color1 >>> 16 & 0xff) + (((color2 >>> 16 & 0xff) * invAlpha - (color1 >>> 16 & 0xff) * invAlpha) / 255)) << 16
                                | ((color1 >>> 8 & 0xff) + (((color2 >>> 8 & 0xff) * invAlpha - (color1 >>> 8 & 0xff) * invAlpha) / 255)) << 8
                                | ((color1 & 0xff) + (((color2 & 0xff) * invAlpha - (color1 & 0xff) * invAlpha) / 255));
                        
                        buffer[srcOffset] = newColor;
                    }
                }
            }
        }

        function oilPasteBuffer(srcRect, dstRect, buffer, brush, w, alpha) {
            var
                opacityData = opacityBuffer.data,
    
                by = srcRect.top;
            
            for (var y = dstRect.top; y < dstRect.bottom; y++, by++) {
                var 
                    bufferOffset = srcRect.left + by * w, // Brush buffer is 1 integer per pixel
                    opacityOffset = dstRect.left + y * that.width, // Opacity buffer is 1 integer per pixel
                    layerOffset = curLayer.offsetOfPixel(dstRect.left, y); // 4 bytes per pixel 
                
                for (var x = dstRect.left; x < dstRect.right; x++, bufferOffset++, layerOffset += CPColorBmp.BYTES_PER_PIXEL, opacityOffset++) {
                    var 
                        color1 = buffer[bufferOffset],
                        alpha1 = ((color1 >>> 24) * (brush[bufferOffset] & 0xff) * alpha / (255 * 255)) | 0;
                    
                    if (alpha1 <= 0) {
                        continue;
                    }

                    var
                        alpha2 = curLayer.data[layerOffset + CPColorBmp.ALPHA_BYTE_OFFSET],

                        newAlpha = (alpha1 + alpha2 - alpha1 * alpha2 / 255) | 0;
                    
                    if (newAlpha > 0) {
                        var 
                            color2Red = curLayer.data[layerOffset + CPColorBmp.RED_BYTE_OFFSET],
                            color2Green = curLayer.data[layerOffset + CPColorBmp.GREEN_BYTE_OFFSET],
                            color2Blue = curLayer.data[layerOffset + CPColorBmp.BLUE_BYTE_OFFSET],
                            
                            realAlpha = (alpha1 * 255 / newAlpha) | 0,
                            invAlpha = 255 - realAlpha,

                            newColor = newAlpha << 24
                                | ((color1 >>> 16 & 0xff) + ((color2Red * invAlpha - (color1 >>> 16 & 0xff) * invAlpha) / 255)) << 16
                                | ((color1 >>> 8 & 0xff) + ((color2Green * invAlpha - (color1 >>> 8 & 0xff) * invAlpha) / 255)) << 8
                                | ((color1 & 0xff) + ((color2Blue * invAlpha - (color1 & 0xff) * invAlpha) / 255));

                        opacityData[opacityOffset] = newColor;
                    }
                }
            }
        }
        
        this.paintDabImplementation = function(srcRect, dstRect, dab) {
            if (brushBuffer == null) {
                brushBuffer = new Uint32Array(dab.width * dab.height); // Initialized to 0 for us by the browser
                
                oilAccumBuffer(srcRect, dstRect, brushBuffer, dab.width, 255);
            } else {
                oilResatBuffer(srcRect, dstRect, brushBuffer, dab.width, ~~((curBrush.resat <= 0.0) ? 0 : Math.max(1, (curBrush.resat * curBrush.resat) * 255)), curColor & 0xFFFFFF);
                oilPasteBuffer(srcRect, dstRect, brushBuffer, dab.brush, dab.width, dab.alpha);
                oilAccumBuffer(srcRect, dstRect, brushBuffer, dab.width, ~~(curBrush.bleed * 255));
            }
            
            mergeOpacityBuffer(0, false);
            
            if (sampleAllLayers) {
                that.fusionLayers();
            }
        };
    }
    
    CPBrushToolOil.prototype = Object.create(CPBrushToolDirectBrush.prototype);
    CPBrushToolOil.prototype.constructor = CPBrushToolOil;
    
    function CPBrushToolSmudge() {
        
        /**
         * 
         * @param srcRect
         * @param dstRect
         * @param buffer Uint32Array
         * @param w int
         * @param alpha int
         */
        function smudgeAccumBuffer(srcRect, dstRect, buffer, w, alpha) {
            var
                layerToSample = sampleAllLayers ? fusion : that.getActiveLayer(),

                by = srcRect.top;
            
            for (var y = dstRect.top; y < dstRect.bottom; y++, by++) {
                var
                    srcOffset = srcRect.left + by * w,
                    dstOffset = layerToSample.offsetOfPixel(dstRect.left, y);
                
                for (var x = dstRect.left; x < dstRect.right; x++, srcOffset++, dstOffset += CPColorBmp.BYTES_PER_PIXEL) {
                    var
                        layerRed = layerToSample.data[dstOffset + CPColorBmp.RED_BYTE_OFFSET],
                        layerGreen = layerToSample.data[dstOffset + CPColorBmp.GREEN_BYTE_OFFSET],
                        layerBlue = layerToSample.data[dstOffset + CPColorBmp.BLUE_BYTE_OFFSET],
                        layerAlpha = layerToSample.data[dstOffset + CPColorBmp.ALPHA_BYTE_OFFSET],
                        
                        opacityAlpha = 255 - alpha;
                    
                    if (opacityAlpha > 0) {
                        var
                            destColor = buffer[srcOffset],

                            destAlpha = 255,
                            newLayerAlpha = (opacityAlpha + destAlpha * (255 - opacityAlpha) / 255) | 0,
                            realAlpha = (255 * opacityAlpha / newLayerAlpha) | 0,
                            invAlpha = 255 - realAlpha,

                            newColor = 
                                ((layerAlpha * realAlpha + (destColor >>> 24 & 0xff) * invAlpha) / 255) << 24 & 0xff000000
                                | ((layerRed * realAlpha + (destColor >>> 16 & 0xff) * invAlpha) / 255) << 16 & 0xff0000
                                | ((layerGreen * realAlpha + (destColor >>> 8 & 0xff) * invAlpha) / 255) << 8 & 0xff00
                                | ((layerBlue * realAlpha + (destColor & 0xff) * invAlpha) / 255) & 0xff;

                        if (newColor == destColor) {
                            if (layerRed > (destColor & 0xff0000)) {
                                newColor += 1 << 16;
                            } else if (layerRed < (destColor & 0xff0000)) {
                                newColor -= 1 << 16;
                            }

                            if (layerGreen> (destColor & 0xff00)) {
                                newColor += 1 << 8;
                            } else if (layerGreen < (destColor & 0xff00)) {
                                newColor -= 1 << 8;
                            }

                            if (layerBlue > (destColor & 0xff)) {
                                newColor += 1;
                            } else if (layerBlue < (destColor & 0xff)) {
                                newColor -= 1;
                            }
                        }

                        buffer[srcOffset] = newColor;
                    }
                }
            }

            if (srcRect.left > 0) {
                var
                    fill = srcRect.left;
                
                for (var y = srcRect.top; y < srcRect.bottom; y++) {
                    var 
                        offset = y * w,
                        fillColor = buffer[offset + srcRect.left];
                    
                    for (var x = 0; x < fill; x++) {
                        buffer[offset++] = fillColor;
                    }
                }
            }

            if (srcRect.right < w) {
                var
                    fill = w - srcRect.right;
                
                for (var y = srcRect.top; y < srcRect.bottom; y++) {
                    var
                        offset = y * w + srcRect.right,
                        fillColor = buffer[offset - 1];
                    
                    for (var x = 0; x < fill; x++) {
                        buffer[offset++] = fillColor;
                    }
                }
            }

            for (var y = 0; y < srcRect.top; y++) {
                var 
                    srcOffset = srcRect.top * w,
                    dstOffset = y * w;
                
                for (var x = 0; x < w; x++, srcOffset++, dstOffset++) {
                    buffer[dstOffset] = buffer[srcOffset];
                }
            }
            
            for (var y = srcRect.bottom; y < w; y++) {
                var 
                    srcOffset = (srcRect.bottom - 1) * w,
                    dstOffset = y * w;
                
                for (var x = 0; x < w; x++, srcOffset++, dstOffset++) {
                    buffer[dstOffset] = buffer[srcOffset];
                }
            }
        }

        /**
         * 
         * @param srcRect CPRect
         * @param dstRect CPRect
         * @param buffer Uint32Array
         * @param brush Uint8Array
         * @param w int
         * @param alpha int
         */
        function smudgePasteBuffer(srcRect, dstRect, buffer, brush, w, alpha) {
            var
                by = srcRect.top;
            
            for (var y = dstRect.top; y < dstRect.bottom; y++, by++) {
                var 
                    srcOffset = srcRect.left + by * w,
                    dstOffset = curLayer.offsetOfPixel(dstRect.left, y);
                
                for (var x = dstRect.left; x < dstRect.right; x++, srcOffset++, dstOffset += CPColorBmp.BYTES_PER_PIXEL) {
                    var
                        bufferColor = buffer[srcOffset],
                        opacityAlpha = (bufferColor >>> 24) * (brush[srcOffset] & 0xff) / 255;
                    
                    if (opacityAlpha > 0) {
                        curLayer.data[dstOffset + CPColorBmp.RED_BYTE_OFFSET] = (bufferColor >> 16) & 0xff;
                        curLayer.data[dstOffset + CPColorBmp.GREEN_BYTE_OFFSET] = (bufferColor >> 8) & 0xff;
                        curLayer.data[dstOffset + CPColorBmp.BLUE_BYTE_OFFSET] = bufferColor & 0xff;
                        curLayer.data[dstOffset + CPColorBmp.ALPHA_BYTE_OFFSET] = (bufferColor >> 24) & 0xff;
                    }
                }
            }
        }
        
        /**
         * @param srcRect CPRect
         * @param dstRect CPRect
         * @param dab CPBrushDab
         */
        this.paintDabImplementation = function(srcRect, dstRect, dab) {
            if (brushBuffer == null) {
                brushBuffer = new Uint32Array(dab.width * dab.height);
                smudgeAccumBuffer(srcRect, dstRect, brushBuffer, dab.width, 0);
            } else {
                smudgeAccumBuffer(srcRect, dstRect, brushBuffer, dab.width, dab.alpha);
                smudgePasteBuffer(srcRect, dstRect, brushBuffer, dab.brush, dab.width, dab.alpha);

                if (lockAlpha) {
                    restoreAlpha(dstRect);
                }
            }
            
            opacityArea.makeEmpty();
            
            if (sampleAllLayers) {
                that.fusionLayers();
            }
        };
    }
    
    CPBrushToolSmudge.prototype = Object.create(CPBrushToolDirectBrush.prototype);
    CPBrushToolSmudge.prototype.constructor = CPBrushToolSmudge;

    CPBrushToolSmudge.prototype.mergeOpacityBuf = function(dstRect, color) {
    };
    
    var paintingModes = [
        new CPBrushToolSimpleBrush(), new CPBrushToolEraser(), new CPBrushToolDodge(),
        new CPBrushToolBurn(), new CPBrushToolWatercolor(), new CPBrushToolBlur(), new CPBrushToolSmudge(),
        new CPBrushToolOil()
    ];
    
    this.width = _width;
    this.height = _height;

    this.getDefaultLayerName = function() {
        var
            prefix = "Layer ",
            highestLayerNb = 0;
        
        for (var i = 0; i < layers.length; i++) {
            var
                layer = layers[i];
            
            if (/^Layer [0-9]+$/.test(layer.name)) {
                highestLayerNb = Math.max(highestLayerNb, parseInt(layer.name.substring(prefix.length), 10));
            }
        }
        return prefix + (highestLayerNb + 1);
    };
    
    function restoreAlpha(rect) {
        that.getActiveLayer().copyAlphaFrom(undoBuffer, rect);
    }
    
    /**
     * Merge the opacity buffer from the current drawing operation to the active layer.
     */
    function mergeOpacityBuffer(color, clear) {
        if (!opacityArea.isEmpty()) {
            if (curBrush.paintMode != CPBrushInfo.M_ERASE || !lockAlpha) {
                paintingModes[curBrush.paintMode].mergeOpacityBuf(opacityArea, color);
            } else {
                // FIXME: it would be nice to be able to set the paper color
                paintingModes[CPBrushInfo.M_PAINT].mergeOpacityBuf(opacityArea, EMPTY_LAYER_COLOR);
            }

            if (lockAlpha) {
                restoreAlpha(opacityArea);
            }

            if (clear) {
                opacityBuffer.clearRect(opacityArea, 0);
            }

            opacityArea.makeEmpty();
        }
    }
    
    this.addBackgroundLayer = function() {
        var
            layer = new CPLayer(that.width, that.height, this.getDefaultLayerName());
        
        layer.clearAll(EMPTY_BACKGROUND_COLOR);
        
        this.addLayerObject(layer);
    };

    /**
     * Merge together the visible layers and return the resulting ImageData for display to the screen.
     * 
     * The image is cached, so repeat calls are cheap.
     */
    this.fusionLayers = function() {
        // Is there anything to update from last call?
        if (!fusionArea.isEmpty()) {
            // The current brush renders out its buffers to the layer stack for us
            mergeOpacityBuffer(curColor, false);

            // If the drawing is single-layered and opaque, just use the bottom-most layer as our fusion, we don't need to blend anything!
            if (layers.length == 1 && layers[0].alpha >= 100 && layers[0].visible) {
                fusion = layers[0];
            } else {
                // Fuse into the actual fusion buffer since we need to blend
                fusion = fusionBuffer;

                var
                    fusionIsSemiTransparent = true,
                    first = true;

                layers.forEach(function (layer) {
                    if (!first) {
                        fusionIsSemiTransparent = fusionIsSemiTransparent && fusion.hasAlphaInRect(fusionArea);
                    }

                    if (layer.visible && layer.alpha > 0) {
                        if (first) {
                            first = false;

                            if (layer.alpha == 100) {
                                /*
                                 * Instead of blending the layer onto the empty transparent fusion, we can just copy the
                                 * layer data right into the fusion. This works for all of our blending modes.
                                 */

                                fusion.copyBitmapRect(layer, fusionArea.left, fusionArea.top, fusionArea);
                                return;
                            }

                            fusion.clearRect(fusionArea, 0x00FFFFFF); // Transparent white
                        }

                        // If we're merging onto a semi-transparent canvas then we need to blend our opacity values onto the existing ones
                        if (fusionIsSemiTransparent) {
                            layer.fusionWithFullAlpha(fusion, fusionArea);
                        } else {
                            // Most drawings will end up having 100% coverage and we can speed things up with this version instead
                            layer.fusionWith(fusion, fusionArea);
                        }
                    }
                });

                if (first) {
                    // Didn't draw any layers? We have to clear the area, then
                    fusion.clearRect(fusionArea, 0x00FFFFFF); // Transparent white
                }
            }

            fusionArea.makeEmpty();
        }
        
        return fusion.getImageData();
    }
    
    this.setActiveLayerIndex = function(newIndex) {
        if (newIndex < 0 || newIndex >= layers.length) {
            return;
        }

        if (curLayer != layers[newIndex]) {
            var
                oldIndex = this.getActiveLayerIndex();
            
            curLayer = layers[newIndex];
            
            // Was the old layer deleted?
            if (oldIndex == -1) {
                callListenersLayerChange();
            } else {
                callListenersLayerChange(oldIndex); // Old layer has now been deselected
                callListenersLayerChange(newIndex); // New layer has now been selected
            }

            invalidateLayerUndo();
        }
    };
    
    this.getActiveLayerIndex = function() {
        for (var i = 0; i < layers.length; i++) {
            if (layers[i] == curLayer) {
                return i;
            }
        }
        
        return -1;
    };
    
    /*
     * Get the index of the topmost visible layer, or 0.
     */
    this.getTopmostVisibleLayer = function() {
        for (var i = layers.length - 1; i >= 0; i--) {
            if (layers[i].visible) {
                return i;
            }
        }
        
        return 0;
    };

	/**
     * Get the layer with the specified index (no bounds checking)
     *
     * @param {int} i
     * @returns {CPLayer}
     */
    this.getLayer = function(i) {
        return layers[i];
    };

	/**
     * Get the currently active layer (the layer that drawing operations will be applied to))
     *
     * @returns {CPLayer}
     */
    this.getActiveLayer = function() {
        return curLayer;
    };

    this.getDocMemoryUsed = function() {
        var
            total = fusionBuffer.getMemorySize() * (3 + layers.length);

        if (clipboard != null) {
            total += clipboard.bmp.getMemorySize();
        }

        return total;
    };

    this.getUndoMemoryUsed = function() {
        var
            total = 0;

        for (var i = 0; i < redoList.length; i++) {
            var
                undo = redoList[i];

            total += undo.getMemoryUsed(true, null);
        }

        for (var i = 0; i < undoList.length; i++) {
            var
                undo = undoList[i];

            total += undo.getMemoryUsed(false, null);
        }

        return total;
    };
    
    function canUndo() {
        return undoList.length > 0;
    }

    function canRedo() {
        return redoList.length > 0;
    }

    //
    // Undo / Redo
    //

    this.undo = function() {
        if (!canUndo()) {
            return;
        }
        hasUnsavedChanges = true;
        
        var
            undo = undoList.pop();
        
        undo.undo();
        
        redoList.push(undo);
    }

    this.redo = function() {
        if (!canRedo()) {
            return;
        }
        hasUnsavedChanges = true;

        var
            redo = redoList.pop();
        
        redo.redo();
        
        undoList.push(redo);
    }

    /**
     * Ensures that the state of the current layer has been stored in undoBuffer so it can be undone later.
     */
    function prepareForLayerUndo() {
        if (!undoBufferInvalidRegion.isEmpty()) {
            //console.log("Copying " + undoBufferInvalidRegion + " to the undo buffer");
            undoBuffer.copyBitmapRect(curLayer, undoBufferInvalidRegion.left, undoBufferInvalidRegion.top, undoBufferInvalidRegion);
            undoBufferInvalidRegion.makeEmpty();
        }
    }

    /**
     * Call when the undo buffer has become completely worthless (e.g. after the active layer index changes, the undo
     * buffer won't contain any data from the new layer to begin with).
     */
    function invalidateLayerUndo() {
        undoBufferInvalidRegion = that.getBounds();
    }

    /**
     * The result of some of our operations aren't needed until later, so we can defer them until the user is idle.
     *
     * You may call this routine at any time (or never, if you like) as a hint that the user is idle and we should
     * try to perform pending operations before we will need to block on their results.
     */
    this.performIdleTasks = function() {
        prepareForLayerUndo();
    };

    function addUndo(undo) {
        hasUnsavedChanges = true;

        if (redoList.length > 0) {
            redoList = [];
        }

        if (undoList.length == 0 || !undoList[undoList.length - 1].merge(undo)) {
            if (undoList.length >= MAX_UNDO) {
                undoList.unshift();
            }
            if (undoList.length > 0) {
                undoList[undoList.length - 1].compact();
            }
            undoList.push(undo);
        } else if (undoList[undoList.length - 1].noChange()) {
            // Two merged changes can mean no change at all
            // don't leave a useless undo in the list
            undoList.pop();
        }
    }

    this.clearHistory = function() {
        undoList = [];
        redoList = [];
    };
    
    this.colorPicker = function(x, y) {
        // not really necessary and could potentially the repaint
        // of the canvas to miss that area
        // this.fusionLayers();

        return fusion.getPixel(~~x, ~~y) & 0xFFFFFF;
    }

    this.setSelection = function(rect) {
        curSelection.set(rect);
        curSelection.clip(this.getBounds());
    };

    this.emptySelection = function() {
        curSelection.makeEmpty();
    };

    this.floodFill = function(x, y) {
        prepareForLayerUndo();
        undoArea = this.getBounds();

        curLayer.floodFill(~~x, ~~y, curColor | 0xff000000);

        addUndo(new CPUndoPaint());
        invalidateFusion();
    };

    this.gradientFill = function(fromX, fromY, toX, toY, gradientPoints) {
        var
            r = this.getSelectionAutoSelect();

        prepareForLayerUndo();
        undoArea = r;

        curLayer.gradient(r, fromX, fromY, toX, toY, gradientPoints);

        if (lockAlpha) {
            restoreAlpha(r);
        }

        addUndo(new CPUndoPaint());
        invalidateFusion();
    };

    this.fill = function(color) {
        var
            r = this.getSelectionAutoSelect();

        prepareForLayerUndo();
        undoArea = r;

        curLayer.clearRect(r, color);

        addUndo(new CPUndoPaint());
        invalidateFusion();
    };

    this.clear = function() {
        this.fill(0xffffff);
    };

    this.hFlip = function() {
        var
            r = this.getSelectionAutoSelect();

        prepareForLayerUndo();
        undoArea = r;

        curLayer.copyRegionHFlip(r, undoBuffer);

        addUndo(new CPUndoPaint());
        invalidateFusion();
    };

    this.vFlip = function() {
        var
            r = this.getSelectionAutoSelect();

        prepareForLayerUndo();
        undoArea = r;

        curLayer.copyRegionVFlip(r, undoBuffer);

        addUndo(new CPUndoPaint());
        invalidateFusion();
    };

    this.monochromaticNoise = function() {
        var
            r = this.getSelectionAutoSelect();

        prepareForLayerUndo();
        undoArea = r;

        curLayer.fillWithNoise(r);

        addUndo(new CPUndoPaint());
        invalidateFusion();
    };

    this.colorNoise = function() {
        var
            r = this.getSelectionAutoSelect();

        prepareForLayerUndo();
        undoArea = r;

        curLayer.fillWithColorNoise(r);

        addUndo(new CPUndoPaint());
        invalidateFusion();
    };
    
    this.invert = function() {
        var
            r = this.getSelectionAutoSelect();

        prepareForLayerUndo();
        undoArea = r;

        curLayer.invert(r);

        addUndo(new CPUndoPaint());
        invalidateFusion();
    };
    
    this.boxBlur = function(radiusX, radiusY, iterations) {
        var
            r = this.getSelectionAutoSelect();

        prepareForLayerUndo();
        undoArea = r;

        for (var i = 0; i < iterations; i++) {
            curLayer.boxBlur(r, radiusX, radiusY);
        }

        addUndo(new CPUndoPaint());
        invalidateFusion();
    };
    
    this.rectangleSelection = function(r) {
        var
            newSelection = r.clone();
        
        newSelection.clip(this.getBounds());

        addUndo(new CPUndoRectangleSelection(this.getSelection(), newSelection));

        this.setSelection(newSelection);
    };

    /**
     * Get the most recently completed operation from the undo list, or null if the undo list is empty.
     *
     * @returns {*}
     */
    function getActiveOperation() {
        if (undoList.length > 0) {
            return undoList[undoList.length - 1];
        }

        return null;
    }

    /**
     * Move the currently selected layer data by the given offset.
     *
     * @param {int} offsetX
     * @param {int} offsetY
     * @param {boolean} copy - Make a copy of the selection instead of moving it.
     */
    this.move = function(offsetX, offsetY, copy) {
        /*
         * Add rounding to ensure we haven't been given float coordinates (that would cause horrible flow-on effects like
         * the boundary of the undo rectangle having float coordinates)
         */
        offsetX |= 0;
        offsetY |= 0;

        if (offsetX == 0 && offsetY == 0) {
            return;
        }

        opacityArea.makeEmpty(); // Prevents a drawing tool being called during layer fusion to draw itself to the layer

        var
            activeOp = getActiveOperation();

        // If we've changed layers since our last move, we want to move the new layer, not the old one, so can't amend
        if (!copy && activeOp instanceof CPActionMoveSelection && activeOp.layerIndex == this.getActiveLayerIndex()) {
            activeOp.amend(offsetX, offsetY);
            redoList = [];
            hasUnsavedChanges = true;
        } else {
            activeOp = new CPActionMoveSelection(this.getSelectionAutoSelect(), offsetX, offsetY, copy);

            addUndo(activeOp);
        }
    };

    /**
     * Change the interpolation mode used by Free Transform operations
     *
     * @param {string} interpolation - Either "sharp" or "smooth"
     */
    this.setTransformInterpolation = function(interpolation) {
        transformInterpolation = interpolation;
        if (previewOperation instanceof CPActionTransformSelection) {
            previewOperation.setInterpolation(interpolation);
        }
    };

	/**
     * If the current operation is an affine transform, roll it back and remove it from the undo history.
     */
    this.transformAffineAbort = function() {
        if (previewOperation instanceof CPActionTransformSelection) {
            previewOperation.undo();
            previewOperation = null;
        }
    };

	/**
     * Begins transforming the current selection/layer, and returns the initial source rectangle and initial transform.
     * You can update the transform by calling transformAffine().
     * 
     * You must call transformAffineFinish() or transformAffineAbort() to finish the transformation.
     * 
     * Returns null if the current selection/layer doesn't contain any non-transparent pixels, and doesn't start
     * transforming.
     */
    this.transformAffineBegin = function() {
        // Are we already transforming? Continue that instead
        if (previewOperation instanceof CPActionTransformSelection) {
            return {transform: previewOperation.getTransform(), rect: previewOperation.getInitialTransformRect(), selection: previewOperation.getInitialSelectionRect()};
        }

        // Only transform the non-transparent pixels
        var
            layer = this.getActiveLayer(),
            selection = this.getSelectionAutoSelect(),
            initialRect = layer.getNonTransparentBounds(selection),
            initialTransform = new CPTransform();

        if (initialRect.isEmpty()) {
            return null;
        }

        /* If we introduce other previewOperations, we might want to check we aren't overwriting them here...
         * Though probably ChickenPaint's global exclusive mode will enforce this for us.
         */
        previewOperation = new CPActionTransformSelection(initialRect, initialTransform, transformInterpolation);
    
        opacityArea.makeEmpty(); // Prevents a drawing tool being called during layer fusion to draw itself to the layer
    
        return {transform: initialTransform, rect: initialRect, selection: selection};
    };

	/**
     * Finish and save the transform that is currently in progress.
     */
    this.transformAffineFinish = function() {
        if (previewOperation instanceof CPActionTransformSelection) {
            addUndo(previewOperation);
            previewOperation = null;
        }
    };

    /**
     * Transform the currently selected layer data using the given AffineTransform.
     *
     * @param {CPTransform} affineTransform
     */
    this.transformAffineAmend = function(affineTransform) {
        if (previewOperation instanceof CPActionTransformSelection) {
            previewOperation.amend(affineTransform);
        }
    };
    
    // Copy/Paste functions
    
    this.cutSelection = function(createUndo) {
        var
            selection = this.getSelection();
        
        if (selection.isEmpty()) {
            return;
        }

        clipboard = new CPClip(curLayer.cloneRect(selection), selection.left, selection.top);

        if (createUndo) {
            addUndo(new CPUndoCut(clipboard.bmp, this.getActiveLayerIndex(), selection));
        }

        curLayer.clearRect(selection, EMPTY_LAYER_COLOR);
        invalidateFusionRect(selection);
    };

    this.copySelection = function() {
        var
            selection = that.getSelection();
        
        if (selection.isEmpty()) {
            return;
        }

        clipboard = new CPClip(curLayer.cloneRect(selection), selection.left, selection.top);
    };

    this.copySelectionMerged = function() {
        var 
            selection = that.getSelection();
        
        if (selection.isEmpty()) {
            return;
        }

        // make sure the fusioned picture is up to date
        this.fusionLayers();
        clipboard = new CPClip(fusion.cloneRect(selection), selection.left, selection.top);
    };

    /**
     *
     * @param createUndo boolean
     * @param clip CPClip
     */
    function pasteClip(createUndo, clip) {
        var
            activeLayerIndex = that.getActiveLayerIndex();
        
        if (createUndo) {
            addUndo(new CPUndoPaste(clip, activeLayerIndex, that.getSelection()));
        }

        var
            newLayer = new CPLayer(that.width, that.height, that.getDefaultLayerName()),
            sourceRect = clip.bmp.getBounds(),
            x, y;
        
        layers.splice(activeLayerIndex + 1, 0, newLayer);
        that.setActiveLayerIndex(activeLayerIndex + 1);

        if (sourceRect.isInside(that.getBounds())) {
            x = clip.x;
            y = clip.y;
        } else {
            x = ((that.width - clip.bmp.width) / 2) | 0;
            y = ((that.height - clip.bmp.height) / 2) | 0;
        }

        curLayer.copyBitmapRect(clip.bmp, x, y, sourceRect);
        that.emptySelection();

        invalidateFusion();
        callListenersLayerChange();
    }
    
    this.pasteClipboard = function(createUndo) {
        if (clipboard != null) {
            pasteClip(createUndo, clipboard);
        }
    };
    
    this.setSampleAllLayers = function(b) {
        sampleAllLayers = b;
    };

    this.setLockAlpha = function(b) {
        lockAlpha = b;
    };

    this.setForegroundColor = function(color) {
        curColor = color;
    };
    
    this.setBrush = function(brush) {
        curBrush = brush;
    };
    
    this.setBrushTexture = function(texture) {
        brushManager.setTexture(texture);
    }
    
    // ///////////////////////////////////////////////////////////////////////////////////
    // Paint engine
    // ///////////////////////////////////////////////////////////////////////////////////

    this.beginStroke = function(x, y, pressure) {
        if (curBrush == null) {
            return;
        }

        paintingModes[curBrush.paintMode].beginStroke(x, y, pressure);
    };

    this.continueStroke = function(x, y, pressure) {
        if (curBrush == null) {
            return;
        }

        paintingModes[curBrush.paintMode].continueStroke(x, y, pressure);
    };

    this.endStroke = function() {
        if (curBrush == null) {
            return;
        }

        paintingModes[curBrush.paintMode].endStroke();
    };
    
    this.hasAlpha = function() {
        return fusion.hasAlpha();
    };
    
    /**
     * Get the artwork as a single flat PNG image.
     * 
     * Rotation is [0..3] and selects a multiple of 90 degrees of clockwise rotation to be applied to the drawing before
     * saving.
     * 
     * @return A binary string of the PNG file data.
     */
    this.getFlatPNG = function(rotation) {
        this.fusionLayers();
        
        return fusion.getAsPNG(rotation);
    };
    
    /**
     * Returns true if this artwork can be exactly represented as a simple transparent PNG (i.e. doesn't have multiple 
     * layers, and base layer's opacity is set to 100%).
     */
    this.isSimpleDrawing = function() {
        return this.getLayerCount() == 1 && this.getLayer(0).getAlpha() == 100;
    };
    
    // ////////////////////////////////////////////////////
    // Undo classes

    /**
     * Save the difference between the current layer and the undoBuffer (within the undoArea) for undo, and clear
     * the undoArea.
     *
     * @constructor
     */
    function CPUndoPaint() {
        var
            rect = undoArea.clone(),
            data = undoBuffer.copyRectXOR(curLayer, rect);
        
        this.layer = that.getActiveLayerIndex();

        undoArea.makeEmpty();

        this.undo = function() {
            that.getLayer(this.layer).setRectXOR(data, rect);
            invalidateFusionRect(rect);
        };

        this.redo = function() {
            that.getLayer(this.layer).setRectXOR(data, rect);
            invalidateFusionRect(rect);
        };

        this.getMemoryUsed = function(undone, param) {
            return data.length;
        };
    }
    
    CPUndoPaint.prototype = Object.create(CPUndo.prototype);
    CPUndoPaint.prototype.constructor = CPUndoPaint;
    
    function CPUndoLayerVisible(_layerIndex, _oldVis, _newVis) {
        this.layerIndex = _layerIndex;
        this.oldVis = _oldVis;
        this.newVis = _newVis;
    }
    
    CPUndoLayerVisible.prototype = Object.create(CPUndo.prototype);
    CPUndoLayerVisible.prototype.constructor = CPUndoLayerVisible;
    
    CPUndoLayerVisible.prototype.redo = function() {
        that.getLayer(this.layerIndex).visible = this.newVis;
        
        invalidateFusion();
        callListenersLayerChange(this.layerIndex);
    };

    CPUndoLayerVisible.prototype.undo = function() {
        that.getLayer(this.layerIndex).visible = this.oldVis;
        
        invalidateFusion();
        callListenersLayerChange(this.layerIndex);
    };

    CPUndoLayerVisible.prototype.merge = function(u) {
        if (u instanceof CPUndoLayerVisible && this.layerIndex == u.layerIndex) {
            this.newVis = u.newVis;
            return true;
        }
        return false;
    };

    CPUndoLayerVisible.prototype.noChange = function() {
        return this.oldVis == this.newVis;
    };
    
    function CPUndoAddLayer(layerIndex) {
        this.undo = function() {
            layers.splice(layerIndex + 1, 1);
            that.setActiveLayerIndex(layerIndex);
            invalidateFusion();
            callListenersLayerChange();
        }

        this.redo = function() {
            var
                newLayer = new CPLayer(that.width, that.height, that.getDefaultLayerName());
            newLayer.clearAll(EMPTY_LAYER_COLOR);
            layers.splice(layerIndex + 1, 0, newLayer);
            that.setActiveLayerIndex(layerIndex + 1);
            
            invalidateFusion();
            callListenersLayerChange();
        }
    }
    
    CPUndoAddLayer.prototype = Object.create(CPUndo.prototype);
    CPUndoAddLayer.prototype.constructor = CPUndoAddLayer;

    function CPUndoDuplicateLayer(layerIndex) {
        this.undo = function() {
            layers.splice(layerIndex + 1, 1);
            that.setActiveLayerIndex(layerIndex);
            
            invalidateFusion();
            callListenersLayerChange();
        };

        this.redo = function() {
            var
                copySuffix = " Copy",

                sourceLayer = layers[layerIndex],
                newLayer = new CPLayer(that.width, that.height),
                
                newLayerName = sourceLayer.name;
            
            if (!newLayerName.endsWith(copySuffix)) {
                newLayerName += copySuffix;
            }
            
            newLayer.copyFrom(sourceLayer);
            newLayer.name = newLayerName;
            
            layers.splice(layerIndex + 1, 0, newLayer);

            that.setActiveLayerIndex(layerIndex + 1);
            
            invalidateFusion();
            callListenersLayerChange();
        };
    }
    
    CPUndoDuplicateLayer.prototype = Object.create(CPUndo.prototype);
    CPUndoDuplicateLayer.prototype.constructor = CPUndoDuplicateLayer;

    /**
     * @param layerIndex int
     * @param layer CPLayer
     */
    function CPUndoRemoveLayer(layerIndex, layer) {
        this.undo = function() {
            layers.splice(layerIndex, 0, layer);
            that.setActiveLayerIndex(layerIndex);
            
            invalidateFusion();
            callListenersLayerChange();
        };

        this.redo = function() {
            layers.splice(layerIndex, 1);
            that.setActiveLayerIndex(layerIndex < layers.length ? layerIndex : layerIndex - 1);
            
            invalidateFusion();
            callListenersLayerChange();
        };

        this.getMemoryUsed = function(undone) {
            return undone ? 0 : layer.width * layer.height * CPColorBmp.BYTES_PER_PIXEL;
        };
    }
    
    CPUndoRemoveLayer.prototype = Object.create(CPUndo.prototype);
    CPUndoRemoveLayer.prototype.constructor = CPUndoRemoveLayer;
    
    function CPUndoMergeDownLayer(layerIndex) {
        var
            layerBottom = new CPLayer(that.width, that.height),
            layerTop;

        layerBottom.copyFrom(layers[layerIndex - 1]);
        layerTop = layers[layerIndex];

        this.undo = function() {
            layers[layerIndex - 1].copyFrom(layerBottom);
            layers.splice(layerIndex, 0, layerTop);
            that.setActiveLayerIndex(layerIndex);

            layerBottom = layerTop = null;

            invalidateFusion();
            callListenersLayerChange();
        };

        this.redo = function() {
            layerBottom = new CPLayer(that.width, that.height);
            layerBottom.copyFrom(layers[layerIndex - 1]);
            layerTop = layers[layerIndex];

            that.setActiveLayerIndex(layerIndex);
            that.mergeDown(false);
        };

        this.getMemoryUsed = function(undone, param) {
            return undone ? 0 : that.width * that.height * CPColorBmp.BYTES_PER_PIXEL * 2;
        };
    }
    
    CPUndoMergeDownLayer.prototype = Object.create(CPUndo.prototype);
    CPUndoMergeDownLayer.prototype.constructor = CPUndoMergeDownLayer;

    function CPUndoMergeAllLayers() {
        var 
            oldActiveLayerIndex = that.getActiveLayerIndex(),
            oldLayers = layers.slice(0); // Clone old layers array

        this.undo = function() {
            layers = oldLayers.slice(0);
            that.setActiveLayerIndex(oldActiveLayerIndex);

            invalidateFusion();
            callListenersLayerChange();
        };

        this.redo = function() {
            that.mergeAllLayers(false);
        };

        this.getMemoryUsed = function(undone, param) {
            return undone ? 0 : oldLayers.length * width * height * CPColorBmp.BYTES_PER_PIXEL;
        };
    }
    
    CPUndoMergeAllLayers.prototype = Object.create(CPUndo.prototype);
    CPUndoMergeAllLayers.prototype.constructor = CPUndoMergeAllLayers;
    
    function CPUndoMoveLayer(from, to) {
        this.undo = function() {
            if (to <= from) {
                moveLayerReal(to, from + 1);
            } else {
                moveLayerReal(to - 1, from);
            }
        };

        this.redo = function() {
            moveLayerReal(from, to);
        };
    }
    
    CPUndoMoveLayer.prototype = Object.create(CPUndo.prototype);
    CPUndoMoveLayer.prototype.constructor = CPUndoMoveLayer;

    function CPUndoLayerAlpha(layerIndex, alpha) {
        this.from = that.getLayer(layerIndex).getAlpha();
        this.to = alpha;
        this.layerIndex = layerIndex;
    }
    
    CPUndoLayerAlpha.prototype = Object.create(CPUndo.prototype);
    CPUndoLayerAlpha.prototype.constructor = CPUndoLayerAlpha;

    CPUndoLayerAlpha.prototype.undo = function() {
        that.getLayer(this.layerIndex).setAlpha(this.from);
        
        invalidateFusion();
        callListenersLayerChange(this.layerIndex);
    };

    CPUndoLayerAlpha.prototype.redo = function() {
        that.getLayer(this.layerIndex).setAlpha(this.to);
        
        invalidateFusion();
        callListenersLayerChange(this.layerIndex);
    }

    CPUndoLayerAlpha.prototype.merge = function(u) {
        if (u instanceof CPUndoLayerAlpha && this.layerIndex == u.layerIndex) {
            this.to = u.to;
            return true;
        }
        return false;
    };

    CPUndoLayerAlpha.prototype.noChange = function() {
        return this.from == this.to;
    }

    function CPUndoLayerMode(layerIndex, to) {
        this.layerIndex = layerIndex;
        this.from = that.getLayer(layerIndex).getBlendMode();
        this.to = to;
    }
    
    CPUndoLayerMode.prototype = Object.create(CPUndo.prototype);
    CPUndoLayerMode.prototype.constructor = CPUndoLayerMode;

    CPUndoLayerMode.prototype.undo = function() {
        that.getLayer(this.layerIndex).setBlendMode(this.from);
        
        invalidateFusion();
        callListenersLayerChange();
    };

    CPUndoLayerMode.prototype.redo = function() {
        that.getLayer(this.layerIndex).setBlendMode(this.to);
        
        invalidateFusion();
        callListenersLayerChange();
    };

    CPUndoLayerMode.prototype.merge = function(u) {
        if (u instanceof CPUndoLayerMode && this.layerIndex == u.layerIndex) {
            this.to = u.to;
            return true;
        }
        return false;
    };

    CPUndoLayerMode.prototype.noChange = function() {
        return this.from == this.to;
    }

    function CPUndoLayerRename(layerIndex, to) {
        this.layerIndex = layerIndex;
        this.to = to;
        this.from = that.getLayer(layerIndex).name;
    }
    
    CPUndoLayerRename.prototype = Object.create(CPUndo.prototype);
    CPUndoLayerRename.prototype.constructor = CPUndoLayerRename;
    
    CPUndoLayerRename.prototype.undo = function() {
        that.getLayer(this.layerIndex).name = this.from;
        callListenersLayerChange(this.layerIndex);
    };

    CPUndoLayerRename.prototype.redo = function() {
        that.getLayer(this.layerIndex).name = this.to;
        callListenersLayerChange(this.layerIndex);
    };

    CPUndoLayerRename.prototype.merge = function(u) {
        if (u instanceof CPUndoLayerRename && this.layerIndex == u.layerIndex) {
            this.to = u.to;
            return true;
        }
        return false;
    };

    CPUndoLayerRename.prototype.noChange = function() {
        return this.from == this.to;
    };
    
    /**
     * @param from CPRect
     * @param to CPRect
     */
    function CPUndoRectangleSelection(from, to) {
        from = from.clone();
        to = to.clone();

        this.undo = function() {
            that.setSelection(from);
            callListenersUpdateRegion(that.getBounds());
        };

        this.redo = function() {
            that.setSelection(to);
            callListenersUpdateRegion(that.getBounds());
        };

        this.noChange = function() {
            return from.equals(to);
        };
    }
    
    CPUndoRectangleSelection.prototype = Object.create(CPUndo.prototype);
    CPUndoRectangleSelection.prototype.constructor = CPUndoRectangleSelection;

    /**
     * Upon creation, transforms the currently selected region of the current layer by the given affine transform.
     *
     * @param {CPRect} srcRect - Rectangle to transform
     * @param {CPTransform} affineTransform - Transform to apply
     * @param {string} interpolation - "smooth" or "sharp"
     */
    function CPActionTransformSelection(srcRect, affineTransform, interpolation) {
        var
            fromSelection = that.getSelection(),
            dstRect = null,

            tempCanvas = document.createElement("canvas"),
            tempCanvasContext = tempCanvas.getContext("2d"),

            undoData, // A copy of the original layer within the undoDataRect
            undoDataRect,

            // A canvas for composing the transform onto
            fullUndoCanvas = document.createElement("canvas"),
            fullUndoCanvasContext = fullUndoCanvas.getContext("2d");

        affineTransform = affineTransform.clone();
        interpolation = interpolation || "smooth";

        this.undo = function() {
            var
                layer = that.getLayer(this.layerIndex),
                invalidateRegion = dstRect.clone(),
                undoSrcRegion;

            invalidateRegion.union(srcRect);
            
            undoSrcRegion = invalidateRegion.clone();
            undoSrcRegion.translate(-undoDataRect.left, -undoDataRect.top);

            layer.copyBitmapRect(undoData, invalidateRegion.left, invalidateRegion.top, undoSrcRegion);

            that.setSelection(fromSelection);
            that.setActiveLayerIndex(this.layerIndex);

            invalidateFusionRect(invalidateRegion);

            /*
             * Required because in the case of a copy, we don't invalidate the source rect in the fusion, so the canvas
             * won't end up repainting the selection rectangle there.
             */
            callListenersSelectionChange();
        };

        this.redo = function() {
            var
                layer = that.getLayer(this.layerIndex);

            // Make a fresh copy of the layer into a Canvas to compose onto
            fullUndoCanvasContext.putImageData(layer.getImageData(), 0, 0);

            // Erase the region we moved from
            fullUndoCanvasContext.clearRect(srcRect.left, srcRect.top, srcRect.getWidth(), srcRect.getHeight());

            setCanvasInterpolation(fullUndoCanvasContext, interpolation == "smooth");

            fullUndoCanvasContext.save();

            // Apply the transform when drawing the transformed fragment
            fullUndoCanvasContext.setTransform(
                affineTransform.m[0], affineTransform.m[1], affineTransform.m[2],
                affineTransform.m[3], affineTransform.m[4], affineTransform.m[5]
            );
            fullUndoCanvasContext.drawImage(tempCanvas, srcRect.left, srcRect.top);

            fullUndoCanvasContext.restore();

            // Copy back to the layer data
            layer.setImageData(fullUndoCanvasContext.getImageData(0, 0, layer.width, layer.height));

            // Invalidate the source and destination regions we touched
            var
                invalidateRegion = srcRect.clone(),
                dstCorners = srcRect.toPoints();

            affineTransform.transformPoints(dstCorners);

            dstRect = CPRect.createBoundingBox(dstCorners);
            dstRect.roundContain();
            layer.getBounds().clip(dstRect);
            
            invalidateRegion.union(dstRect);

            invalidateFusionRect(invalidateRegion);

            // Transform the selection rect to enclose the transformed selection
            if (!fromSelection.isEmpty()) {
                var
                    toSelectionPoints = fromSelection.toPoints(),
                    toSelectionRect;

                affineTransform.transformPoints(toSelectionPoints);

                toSelectionRect = CPRect.createBoundingBox(toSelectionPoints);
                toSelectionRect.roundNearest();
                layer.getBounds().clip(toSelectionRect);

                that.setSelection(toSelectionRect);
                callListenersSelectionChange();
            }
        };

        /**
         * Replace the transform with the given one.
         *
         * @param {CPTransform} _affineTransform
         */
        this.amend = function(_affineTransform) {
            var
                layer = that.getLayer(this.layerIndex);

            this.undo();

            if (undoDataRect.getWidth() < layer.width || undoDataRect.getHeight() < layer.height) {
                /*
                 * We need a complete copy of the layer in undoData to support further redo(). (As we probably previously
                 * only made a backup copy of the areas we erased using the old transform).
                 */
                undoData = layer.clone();
                undoDataRect = layer.getBounds();
            }

            affineTransform = _affineTransform.clone();
            this.redo();
        };

        this.setInterpolation = function(newInterpolation) {
            if (newInterpolation != interpolation) {
                interpolation = newInterpolation;

                this.undo();
                this.redo();
            }
        };

        /**
         * Called when we're no longer the top operation in the undo stack, so that we can optimize for lower memory
         * usage instead of faster revision speed
         */
        this.compact = function() {
            var
                layer = that.getLayer(this.layerIndex);
            
            // If we have a full undo, and we don't need very much area for undo, trim it to just the area we need
            if (undoDataRect.getWidth() == layer.width && undoDataRect.getHeight() == layer.height) {
                var
                    dirtyRect = srcRect.getUnion(dstRect);

                if (dirtyRect.getArea() * 2 < layer.width * layer.height) {
                    undoDataRect = dirtyRect;
                    undoData = undoData.cloneRect(undoDataRect);
                }
            }
        };

        this.getMemoryUsed = function(undone, param) {
            return undoData.getMemorySize();
        };

	    /**
         * Get a copy of the affine transform.
         */
        this.getTransform = function() {
            return affineTransform.clone();
        };

        /**
         * Get a copy of the initial document rectangle (before the transform was applied)
         *
         * @returns {CPRect}
         */
        this.getInitialTransformRect = function() {
            return srcRect.clone();
        };

        /**
         * Get a copy of the initial user selection rectangle (before the transform was applied). Can be empty if
         * the user didn't have anything selected before the transform began.
         *
         * @returns {CPRect}
         */
        this.getInitialSelectionRect = function() {
            return fromSelection.clone();
        };

        this.layerIndex = that.getActiveLayerIndex();

        let
            layer = that.getLayer(this.layerIndex);

        undoData = layer.clone();
        undoDataRect = layer.getBounds();
        fullUndoCanvas.width = layer.width;
        fullUndoCanvas.height = layer.height;

        // Make a copy of just the source rectangle in its own canvas so we have it as an image to be drawn later
        tempCanvas.width = srcRect.getWidth();
        tempCanvas.height = srcRect.getHeight();
        tempCanvasContext.putImageData(undoData.getImageData(), -srcRect.left, -srcRect.top, srcRect.left, srcRect.top, srcRect.getWidth(), srcRect.getHeight());

        this.redo();
    }

    CPActionTransformSelection.prototype = Object.create(CPUndo.prototype);
    CPActionTransformSelection.prototype.constructor = CPActionTransformSelection;

    /**
     * Upon creation, moves the currently selected region of the current layer by the given offset (or copies it if
     * 'copy' is true).
     *
     * @param srcRect
     * @param offsetX
     * @param offsetY
     * @param copy
     * @constructor
     */
    function CPActionMoveSelection(srcRect, offsetX, offsetY, copy) {
        var
            fromSelection = that.getSelection(),
            dstRect = null,

            fullUndo, // A copy of the entire layer
            srcData = null, // A copy of the original pixels at the srcRect, or null if we use a fullUndo instead
            dstData = null // A copy of the original pixels at the dstRect, or null
        ;
        
        this.undo = function() {
            var
                layer = that.getLayer(this.layerIndex),
                invalidateRegion = dstRect.clone();

            if (!copy) {
                invalidateRegion.union(srcRect);
            }

            if (fullUndo) {
                layer.copyBitmapRect(fullUndo, invalidateRegion.left, invalidateRegion.top, invalidateRegion);
            } else {
                layer.copyBitmapRect(srcData, srcRect.left, srcRect.top, srcData.getBounds());

                if (dstData) {
                    layer.copyBitmapRect(dstData, dstRect.left, dstRect.top, dstData.getBounds());
                }
            }

            that.setSelection(fromSelection);
            that.setActiveLayerIndex(this.layerIndex);

            invalidateFusionRect(invalidateRegion);

            /*
             * Required because in the case of a copy, we don't invalidate the source rect in the fusion, so the canvas
             * won't end up repainting the selection rectangle there.
             */
            callListenersSelectionChange();
        };

        this.redo = function() {
            var
                layer = that.getLayer(this.layerIndex),
                invalidateRegion = new CPRect(0, 0, 0, 0);

            if (!copy) {
                layer.clearRect(srcRect, 0);
                invalidateRegion.set(srcRect);
            }

            dstRect = srcRect.clone();
            dstRect.translate(offsetX, offsetY);
            layer.getBounds().clip(dstRect);

            /* Note that while we could copy image data from the layer itself onto the layer (instead of sourcing that
             * data from the undo buffers), this would require that pasteAlphaRect do the right thing when source and
             * dest rects overlap, which it doesn't.
             */
            if (fullUndo) {
                layer.pasteAlphaRect(fullUndo, srcRect, dstRect.left, dstRect.top);
            } else {
                layer.pasteAlphaRect(srcData, srcData.getBounds(), dstRect.left, dstRect.top);
            }

            invalidateRegion.union(dstRect);

            invalidateFusionRect(invalidateRegion);

            if (!fromSelection.isEmpty()) {
                var
                    toSelection = fromSelection.clone();
                toSelection.translate(offsetX, offsetY);
                that.setSelection(toSelection);
                callListenersSelectionChange();
            }
        };

        /**
         * Move further by the given offset on top of the current offset.
         *
         * @param _offsetX {int}
         * @param _offsetY {int}
         */
        this.amend = function(_offsetX, _offsetY) {
            var
                layer = that.getLayer(this.layerIndex);

            if (fullUndo) {
                if (copy) {
                    this.undo();
                } else {
                    /*
                     * We don't need to restore the image at the *source* location as a full undo would do, since
                     * we'll only erase that area again once we redo(). So just restore the data at the dest.
                     */
                    layer.copyBitmapRect(fullUndo, dstRect.left, dstRect.top, dstRect);
                    invalidateFusionRect(dstRect);
                }
            } else {
                /*
                 * We want to make a complete copy of the layer in fullUndo to support fast further amend() calls.
                 */
                this.undo();

                fullUndo = layer.clone();
                srcData = null;
                dstData = null;
            }

            offsetX += _offsetX;
            offsetY += _offsetY;
            this.redo();
        };

        /**
         * Called when we're no longer the top operation in the undo stack, so that we can optimize for lower memory
         * usage instead of faster revision speed
         */
        this.compact = function() {
            if (fullUndo && srcRect.getArea() * 2 < that.width * that.height) {
                // Replace our copy of the entire layer with just a copy of the areas we damaged

                srcData = fullUndo.cloneRect(srcRect);

                if (!copy && dstRect.isInside(srcRect)) {
                    dstData = null;
                } else {
                    dstData = fullUndo.cloneRect(dstRect);
                }

                fullUndo = null;
            }
        };

        this.getMemoryUsed = function() {
            var
                size = 0;

            if (fullUndo) {
                size += fullUndo.getMemorySize();
            }
            if (srcData) {
                size += srcData.getMemorySize();
            }
            if (dstData) {
                size += dstData.getMemorySize();
            }

            return size;
        };

        this.layerIndex = that.getActiveLayerIndex();
        fullUndo = that.getLayer(this.layerIndex).clone();

        this.redo();
    }

    CPActionMoveSelection.prototype = Object.create(CPUndo.prototype);
    CPActionMoveSelection.prototype.constructor = CPActionMoveSelection;

    /**
     * Used to encapsulate multiple undo operation as one
     * 
     * @param undoes CPUndo[] List of undo operations to encapsulate
     */
    function CPMultiUndo(undoes) {
        this.undoes = undoes;
    }

    CPMultiUndo.prototype = Object.create(CPUndo.prototype);
    CPMultiUndo.prototype.constructor = CPMultiUndo;

    CPMultiUndo.prototype.undo = function() {
        for (var i = this.undoes.length - 1; i >= 0; i--) {
            this.undoes[i].undo();
        }
    };

    CPMultiUndo.prototype.redo = function() {
        for (var i = 0; i < this.undoes.length; i++) {
            this.undoes[i].redo();
        }
    };

    CPMultiUndo.prototype.noChange = function() {
        for (var i = 0; i < undoes.length; i++) {
            if (!undoes[i].noChange()) {
                return false;
            }
        }
        
        return true;
    };

    CPMultiUndo.prototype.getMemoryUsed = function(undone, param) {
        var
            total = 0;
        
        for (var i = 0; i < undoes.length; i++) {
            total += undoes[i].getMemoryUsed(undone, param);
        }
        
        return total;
    };
    
    /**
     * Store data to undo a cut operation
     * 
     * @param bmp CPColorBmp The rectangle of image data that was cut
     * @param layerIndex int Index of the layer the cut came from
     * @param selection CPRect The cut rectangle co-ordinates
     */
    function CPUndoCut(bmp, layerIndex, selection) {
        selection = selection.clone();

        this.undo = function() {
            that.setActiveLayerIndex(layerIndex);
            curLayer.copyBitmapRect(bmp, selection.left, selection.top, bmp.getBounds());
            that.setSelection(selection);
            invalidateFusionRect(selection);
        };

        this.redo = function() {
            that.setActiveLayerIndex(layerIndex);
            curLayer.clearRect(selection, EMPTY_LAYER_COLOR);
            that.emptySelection();
            invalidateFusionRect(selection);
        };

        this.getMemoryUsed = function(undone, param) {
            return bmp == param ? 0 : bmp.width * bmp.height * CPColorBmp.BYTES_PER_PIXEL;
        };
    }
    
    CPUndoCut.prototype = Object.create(CPUndo.prototype);
    CPUndoCut.prototype.constructor = CPUndoCut;

    /**
     * Store data to undo a paste operation
     * 
     * @param clip CPClip
     * @param layerIndex int
     * @param selection CPRect
     */
    function CPUndoPaste(clip, layerIndex, selection) {
        selection = selection.clone();

        this.undo = function() {
            layers.splice(layerIndex + 1, 1);
            
            that.setActiveLayerIndex(layerIndex);
            that.setSelection(selection);

            invalidateFusionRect(selection);
            callListenersLayerChange();
        };

        this.redo = function() {
            that.setActiveLayerIndex(layerIndex);
            pasteClip(false, clip);
        };

        this.getMemoryUsed = function(undone, param) {
            return clip.bmp == param ? 0 : clip.bmp.width * clip.bmp.height * 4;
        };
    }
    
    CPUndoPaste.prototype = Object.create(CPUndo.prototype);
    CPUndoPaste.prototype.constructor = CPUndoPaste;
};

CPArtwork.prototype = Object.create(EventEmitter.prototype);
CPArtwork.prototype.constructor = CPArtwork;

CPArtwork.prototype.getBounds = function() {
    return new CPRect(0, 0, this.width, this.height);
}

CPArtwork.prototype.isPointWithin = function(x, y) {
    return x >= 0 && y >= 0 && x < this.width && y < this.height;
};