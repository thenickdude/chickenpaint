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
import CPImageLayer from "./CPImageLayer";
import CPLayerGroup from "./CPLayerGroup";
import CPBlend from "./CPBlend";
import CPGreyBmp from "./CPGreyBmp";
import CPBlendTree from "./CPBlendTree";
import CPColorBmp from "./CPColorBmp";
import CPBrushManager from "./CPBrushManager";
import CPBrushInfo from "./CPBrushInfo";
import CPUndo from "./CPUndo";
import CPClip from "./CPClip";

import CPColor from "../util/CPColor";
import CPColorFloat from "../util/CPColorFloat";
import CPRect from "../util/CPRect";
import CPRandom from "../util/CPRandom";
import CPTransform from "../util/CPTransform";
import {setCanvasInterpolation} from "../util/CPPolyfill";

/**
 * Capitalize the first letter of the string.
 *
 * @param {string} string
 * @returns {string}
 */
function capitalizeFirst(string) {
    return string.substring(0, 1).toUpperCase() + string.substring(1);
}

function sum(a, b) {
    return a + b;
}

function arrayEquals(a, b) {
    if (a.length != b.length) {
        return false;
    }

    for (var i = 0; i < a.length; i++) {
        if (a[i] != b[i]) {
            return false;
        }
    }

    return true;
}

export default function CPArtwork(_width, _height) {
    
    _width = _width | 0;
    _height = _height | 0;
    
    const
        MAX_UNDO = 30,
        EMPTY_BACKGROUND_COLOR = 0xFFFFFFFF,
        EMPTY_MASK_COLOR = 0,
        EMPTY_LAYER_COLOR = 0x00FFFFFF,
        
        BURN_CONSTANT = 260,
        BLUR_MIN = 64,
        BLUR_MAX = 1,

        THUMBNAIL_REBUILD_DELAY_MSEC = 1000;

    const
        /**
         * The root of the document's hierarchy of layers and layer groups.
         *
         * @type {CPLayerGroup}
         */
        layersRoot = new CPLayerGroup("Root", CPBlend.LM_NORMAL),

        /**
         * Our cached strategy for merging the layers together into one for display.
         *
         * @type {CPBlendTree}
         */
        blendTree = new CPBlendTree(layersRoot, _width, _height, true),

        /**
         * A copy of the current layer's image data that can be used for undo operations.
         *
         * @type {CPColorBmp}
         */
        undoImage = new CPColorBmp(_width, _height);

    var
        paintingModes = [],

	    /**
         * The currently selected layer (should never be null)
         *
         * @type {(CPImageLayer|CPLayerGroup)}
         */
        curLayer,

	    /**
         * True if we're editing the mask of the currently selected layer, false otherwise.
         *
         * @type {boolean}
         */
        maskEditingMode = false,
        
        hasUnsavedChanges = false,
        
        curSelection = new CPRect(0, 0, 0, 0),

        /**
         * Points to a buffer which represents all the layers merged together. Since this buffer might be an actual
         * layer from the image stack, you must not write to it through here (you'll damage the image).
         *
         * @type {CPColorBmp}
         */
        fusion = null,

        /**
         * The region of the undoImage which is out of date with respect to the content of the layer, and needs updated
         * with prepareForLayerUndo().
         *
         * @type {CPRect}
         */
        undoImageInvalidRegion = new CPRect(0, 0, _width, _height),

        /**
         * A copy of the current layer's mask that can be used for undo operations.
         *
         * @type {CPGreyBmp}
         */
        undoMask = new CPGreyBmp(_width, _height, 8),

        /**
         * The region of the undoMask which is out of date with respect to the content of the layer, and needs updated
         * with prepareForLayerUndo().
         *
         * @type {CPRect}
         */
        undoMaskInvalidRegion = new CPRect(0, 0, _width, _height),

        /**
         * We use this buffer so we can customize the accumulation of the area painted during a brush stroke.
         * (e.g. so that brushing over the same area multiple times during one stroke doesn't further increase opacity
         * there).
         * 
         * Normally we use it as a 16-bit opacity channel per pixel, but some brushes use the full 32-bits per pixel
         * as ARGB.
         *
         * @type {CPGreyBmp}
         */
        strokeBuffer = new CPGreyBmp(_width, _height, 32),

        /**
         * The area of dirty data contained by strokeBuffer that should be merged by fusionLayers()
         *
         * @type {CPRect}
         */
        strokedRegion = new CPRect(0, 0, 0, 0),
        
        /**
         * Used by CPUndoPaint to keep track of the area of layer data that has been dirtied during a brush stroke
         * (or other drawing operation) and should be saved for later undo.
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

	    /**
         * Set to true when the user is in the middle of a painting operation (so redrawing the thumbnail would be
         * a waste of time).
         *
         * @type {boolean}
         */
        drawingInProgress = false,

        rebuildMaskThumbnail = new Set(),
        rebuildImageThumbnail = new Set(),
        thumbnailRebuildTimer = null,

        curColor = 0x000000, // Black
        transformInterpolation = "smooth",

        that = this;

	/**
     * We use this routine to suppress the updating of a thumbnail while the user is still drawing.
     */
    function beginPaintingInteraction() {
        drawingInProgress = true;
    }

    function endPaintingInteraction() {
        drawingInProgress = false;

        if ((rebuildImageThumbnail.size > 0 || rebuildMaskThumbnail.size > 0) && !thumbnailRebuildTimer) {
            setTimeout(buildThumbnails, THUMBNAIL_REBUILD_DELAY_MSEC);
        }
    }

    // When the selected rectangle changes
    function callListenersSelectionChange() {
        that.emitEvent("changeSelection", []);
    }

	/**
     * Get the root group which contains all the layers of the document.
     *
     * @returns {CPLayerGroup}
     */
    this.getLayersRoot = function() {
        return layersRoot;
    };

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

    function callListenersUpdateRegion(region) {
        that.emitEvent("updateRegion", [region]);
    }

    /**
     * Notify listeners that the structure of the document has changed (layers added or removed).
     */
    function artworkStructureChanged() {
        that.emitEvent("changeStructure");

        blendTree.resetTree();

        var
            rect = that.getBounds();

        undoImageInvalidRegion.set(rect);

        callListenersUpdateRegion(rect);
    }

    /**
     * Notify listeners that the properties of the given layer has changed (opacity, blendMode, etc).
     *
     * @param {CPLayer} layer
     * @param {boolean} noVisibleEffect - If true, notify listeners that the layer has changed but don't redraw anything.
     *                                    This is useful for properties like "expanded" and "name".
     */
    function layerPropertyChanged(layer, noVisibleEffect) {
        that.emitEvent("changeLayer", [layer]);

        if (!noVisibleEffect) {
            blendTree.layerPropertyChanged(layer);

            callListenersUpdateRegion(that.getBounds());
        }
    }

    function buildThumbnails() {
        for (let layer of rebuildImageThumbnail) {
            layer.rebuildImageThumbnail();

            that.emitEvent("changeLayerImageThumb", [layer]);
        }

        for (let layer of rebuildMaskThumbnail) {
            layer.rebuildMaskThumbnail();

            that.emitEvent("changeLayerMaskThumb", [layer]);
        }

        rebuildImageThumbnail.clear();

        if (thumbnailRebuildTimer) {
            clearTimeout(thumbnailRebuildTimer);
            thumbnailRebuildTimer = null;
        }
    }

    /**
     * Mark the given rectangle on the layer as needing to be re-fused (i.e. we've drawn in this region).
     * Listeners are notified about our updated canvas region.
     *
     * @param {(CPLayer|CPLayer[])} layer - Layer or layers to invalidate
     * @param {CPRect} rect - Rect to invalidate. Must have all integer co-ordinates, and the rectangle must be contained
     * within the artwork bounds.
     * @param {boolean} invalidateImage - True if drawing happened on the layer's image data
     * @param {boolean} invalidateMask - True if drawing happened on the layer's mask
     */
    function invalidateLayer(layer, rect, invalidateImage, invalidateMask) {
        if (blendTree) {
            if (Array.isArray(layer)) {
                layer.forEach(l => blendTree.invalidateLayerRect(l, rect));
            } else {
                blendTree.invalidateLayerRect(layer, rect);
            }
        }

        // This updated area will need to be updated in our undo buffer later
        if (invalidateImage) {
            undoImageInvalidRegion.union(rect);
        }

        if (invalidateMask) {
            undoMaskInvalidRegion.union(rect);
        }

        // Update layer thumbnails
        var
            newThumbToRebuild = false;

        if (invalidateMask) {
            if (Array.isArray(layer)) {
                layer.forEach(l => rebuildMaskThumbnail.add(l));
            } else {
                rebuildMaskThumbnail.add(layer);
            }
            newThumbToRebuild = true;
        }

        if (invalidateImage) {
            if (Array.isArray(layer)) {
                for (let l of layer) {
                    if (l instanceof CPImageLayer) {
                        rebuildImageThumbnail.add(l);
                        newThumbToRebuild = true;
                    }
                }
                newThumbToRebuild = true;
            } else if (layer instanceof CPImageLayer) {
                rebuildImageThumbnail.add(layer);
                newThumbToRebuild = true;
            }
        }

        if (newThumbToRebuild) {
            if (thumbnailRebuildTimer) {
                clearTimeout(thumbnailRebuildTimer);
                thumbnailRebuildTimer = null;
            }
            if (!drawingInProgress) {
                thumbnailRebuildTimer = setTimeout(buildThumbnails, THUMBNAIL_REBUILD_DELAY_MSEC);
            }
        }

        callListenersUpdateRegion(rect);
    }

    /**
     * Call when the layer's pixels have been updated as part of a paint operation, to mark it to be redrawn.
     *
     * The routine will decide if the layer's image or mask has been modified by using the global 'maskEditingMode'
     * flag. This is what you want for a typical painting operation (since it'll typically modify only the image the
     * user selected).
     *
     * @param {CPLayer} layer
     * @param {CPRect} rect
     */
    function invalidateLayerPaint(layer, rect) {
        invalidateLayer(layer, rect, !maskEditingMode, maskEditingMode);
    }

	/**
     * Gets the image that the user has selected for drawing onto (a member of the currently active layer).
     *
     * @returns {CPColorBmp|?CPGreyBmp}
     */
    function getActiveImage() {
        return maskEditingMode ? curLayer.mask : curLayer.image;
    }

    this.setHasUnsavedChanges = function(value) {
        hasUnsavedChanges = value;
    };
    
    this.getHasUnsavedChanges = function() {
        return hasUnsavedChanges;
    };

    /**
     * Add a layer mask to the current layer.
     */
    this.addLayerMask = function() {
        if (!curLayer.mask) {
            addUndo(new CPActionAddLayerMask(curLayer));
        }
    };

    this.isRemoveLayerMaskAllowed = function() {
        return curLayer.mask != null;
    };

    this.removeLayerMask = function() {
        if (this.isRemoveLayerMaskAllowed()) {
            addUndo(new CPActionRemoveLayerMask(curLayer, false));
        }
    };

    this.isApplyLayerMaskAllowed = function() {
        return curLayer.mask != null && curLayer instanceof CPImageLayer;
    };

    this.applyLayerMask = function(apply) {
        if (this.isApplyLayerMaskAllowed()) {
            addUndo(new CPActionRemoveLayerMask(curLayer, true));
        }
    };

    /**
     * Add a layer of the specified type (layer, group) on top of the selected layer.
     *
     * @param {string} layerType
     * @returns {CPLayer}
     */
    this.addLayer = function(layerType) {
        let
            parentGroup,
            newLayerIndex,
            newLayer;
        
        if (curLayer instanceof CPLayerGroup && curLayer.expanded) {
            parentGroup = curLayer;
            newLayerIndex = curLayer.layers.length; 
        } else {
            parentGroup = curLayer.parent;
            newLayerIndex = parentGroup.layers.indexOf(curLayer) + 1;
        }

        switch (layerType) {
            case "group":
                // Attempt to insert above the clipping group if we're trying to insert inside one
                while (parentGroup.layers[newLayerIndex] instanceof CPImageLayer && parentGroup.layers[newLayerIndex].clip) {
                    newLayerIndex++;
                }

                newLayer = new CPLayerGroup(this.getDefaultLayerName(true), CPBlend.LM_PASSTHROUGH);
            break;
            default:
                newLayer = new CPImageLayer(this.width, this.height, this.getDefaultLayerName(false));
                newLayer.image.clearAll(EMPTY_LAYER_COLOR);
        }

        addUndo(new CPActionAddLayer(parentGroup, newLayerIndex, newLayer));

        return newLayer;
    };

	/**
     * Effectively an internal method to be called by CPChibiFile to populate the layer stack.
     *
     * @param {CPLayerGroup} parent
     * @param {(CPImageLayer|CPLayerGroup)} layer
     */
    this.addLayerObject = function(parent, layer) {
        parent.addLayer(layer);
        
        if (layersRoot.layers.length == 1) {
            curLayer = layer;
        }
        
        artworkStructureChanged();
    };

	/**
     * Internal method for CPChibiFile to call to wrap a group around the given number of children on
     * the top of the layer stack.
     *
     * @param {CPLayerGroup} parent
     * @param {CPLayerGroup} group
     * @param {int} numChildren - Number of layers from the parent group to wrap
     */
    this.addLayerGroupObject = function(parent, group, numChildren) {
        var
            children = [];

        // Grab our child layers off the stack and add them to us.
        for (var i = 0; i < numChildren; i++) {
            children.unshift(parent.layers.pop());
        }

        children.forEach(child => group.addLayer(child));

        this.addLayerObject(parent, group);
    };
    
    /**
     * Remove the currently selected layer.
     * 
     * Returns true if the layer was removed, or false when removal failed because there is currently only one image
     * layer in the document.
     */
    this.removeLayer = function() {
        if (curLayer instanceof CPImageLayer) {
            var
                layers = layersRoot.getLinearizedLayerList(false),
                imageLayerCount = 0;

            for (let layer of layers) {
                if (layer instanceof CPImageLayer) {
                    imageLayerCount++;
                }
            }

            if (imageLayerCount <= 1) {
                return false;
            }
        }
        
        addUndo(new CPActionRemoveLayer(curLayer));

        return true;
    };

    this.duplicateLayer = function() {
        addUndo(new CPActionDuplicateLayer(curLayer));
    };

    this.isMergeDownAllowed = function() {
        var
            layerIndex = curLayer.parent.indexOf(curLayer);

        return layerIndex > 0 && curLayer instanceof CPImageLayer && curLayer.parent.layers[layerIndex - 1] instanceof CPImageLayer;
    };

    this.mergeDown = function() {
        if (this.isMergeDownAllowed()) {
            addUndo(new CPActionMergeDownLayer(curLayer));
        }
    };

    this.isMergeGroupAllowed = function() {
        return curLayer instanceof CPLayerGroup && curLayer.getEffectiveAlpha() > 0;
    };

    this.mergeGroup = function() {
        if (this.isMergeGroupAllowed()) {
            addUndo(new CPActionMergeGroup(curLayer));
        }
    };

    this.mergeAllLayers = function() {
        var
            numLayers = layersRoot.getLinearizedLayerList(false).length;
        
        if (numLayers > 1) {
            addUndo(new CPActionMergeAllLayers());
        }
    };

    /**
     * Move a layer in the stack from one index to another.
     * 
     * @param {(CPImageLayer|CPLayerGroup)} layer
     * @param {CPLayerGroup} toGroup
     * @param {int} toIndex
     */
    this.relocateLayer = function(layer, toGroup, toIndex) {
        if (layer && toGroup && !toGroup.hasAncestor(layer)) {
            addUndo(new CPActionRelocateLayer(layer, toGroup, toIndex));
        }
    };

	/**
     *
     * @param {CPLayer} layer
     * @param {boolean} visible
     */
    this.setLayerVisibility = function(layer, visible) {
        let
            layers = [];

        if (!layer.ancestorsAreVisible()) {
            // Assume the user wants to make this layer visible by revealing its hidden ancestors (as well as the layer)
            for (let node = layer; node != null; node = node.parent) {
                if (!node.visible) {
                    layers.push(node);
                }
            }
            addUndo(new CPActionChangeLayerVisible(layers, true));
        } else if (layer.visible != visible) {
            addUndo(new CPActionChangeLayerVisible(layer, visible));
        }
    };

	/**
     * Expand or collapse the given layer group.
     *
     * @param {CPLayerGroup} group
     * @param {boolean} expand - True to expand, false to collapse
     */
    this.expandLayerGroup = function(group, expand) {
        if (group.expanded != expand) {
            group.expanded = expand;

            if (!expand && curLayer.hasAncestor(group)) {
                // Don't allow the selected layer to get hidden in the group
                this.setActiveLayer(group, false);
            }

            layerPropertyChanged(group, true);
        }
    };

    this.setLayerAlpha = function(alpha) {
        if (curLayer.getAlpha() != alpha) {
            addUndo(new CPActionChangeLayerAlpha(curLayer, alpha));
        }
    };

    this.setLayerMaskLinked = function(linked) {
        if (curLayer.maskLinked != linked) {
            addUndo(new CPActionChangeLayerMaskLinked(curLayer, linked));
        }
    };

    this.setLayerBlendMode = function(blendMode) {
        if (curLayer.getBlendMode() != blendMode) {
            addUndo(new CPActionChangeLayerMode(curLayer, blendMode));
        }
    };

	/**
     * @param {CPLayer} layer
     * @param {string} name
     */
    this.setLayerName = function(layer, name) {
        if (layer.getName() != name) {
            addUndo(new CPActionChangeLayerName(layer, name));
        }
    };
    
    class CPBrushToolBase {
        beginStroke(x, y, pressure) {
            prepareForLayerPaintUndo();
            undoArea.makeEmpty();

            strokeBuffer.clearAll(0);
            strokedRegion.makeEmpty();

            lastX = x;
            lastY = y;
            lastPressure = pressure;

            beginPaintingInteraction();

            this.createAndPaintDab(x, y, pressure);
        }

        continueStroke(x, y, pressure) {
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
        }

        endStroke() {
            undoArea.clipTo(that.getBounds());

            // Did we end up painting anything?
            if (!undoArea.isEmpty()) {
                mergeStrokeBuffer();
                addUndo(new CPUndoPaint());

                /* Eagerly update the undo buffer for next time so we can avoid this lengthy
                 * prepare at the beginning of a paint stroke
                 */
                prepareForLayerPaintUndo();
            }

            brushBuffer = null;

            endPaintingInteraction();
        }

        /**
         * Create a paint dab at the given position using the current brush, and paint it.
         *
         * @param x float
         * @param y float
         * @param pressure float
         */
        createAndPaintDab(x, y, pressure) {
            curBrush.applyPressure(pressure);

            if (curBrush.scattering > 0.0) {
                x += rnd.nextGaussian() * curBrush.curScattering / 4.0;
                y += rnd.nextGaussian() * curBrush.curScattering / 4.0;
            }

            var
                dab = brushManager.getDab(x, y, curBrush);

            this.paintDab(dab);
        }

        /**
         * Paint a dab returned by brushManager.getDab()
         *
         * @param {CPBrushDab} dab
         */
        paintDab(dab) {
            var
                srcRect = new CPRect(0, 0, dab.width, dab.height),
                dstRect = new CPRect(0, 0, dab.width, dab.height);

            dstRect.translate(dab.x, dab.y);

            that.getBounds().clipSourceDest(srcRect, dstRect);

            // drawing entirely outside the canvas
            if (dstRect.isEmpty()) {
                return;
            }

            undoArea.union(dstRect);
            strokedRegion.union(dstRect);

            this.paintDabImplementation(srcRect, dstRect, dab);

            invalidateLayerPaint(curLayer, dstRect);
        }
    }

    class CPBrushToolSimpleBrush extends CPBrushToolBase {

        paintDabImplementation(srcRect, dstRect, dab) {
            // FIXME: there should be no reference to a specific tool here
            // create a new brush parameter instead
            if (curBrush.isAirbrush) {
                this.paintFlow(srcRect, dstRect, dab.brush, dab.width, Math.max(1, dab.alpha / 8));
            } else if (curBrush.toolNb == ChickenPaint.T_PEN) {
                this.paintFlow(srcRect, dstRect, dab.brush, dab.width, Math.max(1, dab.alpha / 2));
            } else {
                this.paintOpacity(srcRect, dstRect, dab.brush, dab.width, dab.alpha);
            }
        }

        /**
         * Blends the brush data from the current stroke onto the original (pre-stroke)
         * image data (from undoData) and stores the result in destImage.
         *
         * @param {CPColorBmp} destImage - The layer to draw onto
         * @param {CPColorBmp} undoImage - The original pixels for the layer before the stroke began
         * @param {CPGreyBmp} strokeBuffer - Stroke data from the current stroke
         * @param {CPRect} rect - Area to merge
         * @param {int} color
         */
        mergeOntoImage(destImage, undoImage, strokeBuffer, rect, color) {
            var
                strokeData = strokeBuffer.data,
                undoData = undoImage.data,

                destData = destImage.data,

                red = (color >> 16) & 0xFF,
                green = (color >> 8) & 0xFF,
                blue = color & 0xFF,

                width = rect.getWidth() | 0,
                height = rect.getHeight() | 0,

                dstOffset = destImage.offsetOfPixel(rect.left, rect.top),
                srcOffset = strokeBuffer.offsetOfPixel(rect.left, rect.top),

                srcYStride = (strokeBuffer.width - width) | 0,
                dstYStride = ((destImage.width - width) * CPColorBmp.BYTES_PER_PIXEL) | 0;

            for (var y = 0; y < height; y++, srcOffset += srcYStride, dstOffset += dstYStride) {
                for (var x = 0; x < width; x++, srcOffset++, dstOffset += CPColorBmp.BYTES_PER_PIXEL) {
                    var
                        strokeAlpha = (strokeData[srcOffset] / 255) | 0;

                    if (strokeAlpha > 0) {
                        var
                            destAlpha = undoData[dstOffset + CPColorBmp.ALPHA_BYTE_OFFSET],

                            newLayerAlpha = (strokeAlpha + destAlpha * (255 - strokeAlpha) / 255) | 0,
                            realAlpha = (255 * strokeAlpha / newLayerAlpha) | 0,
                            invAlpha = 255 - realAlpha;

                        destData[dstOffset] = ((red * realAlpha + undoData[dstOffset] * invAlpha) / 255) & 0xff;
                        destData[dstOffset + 1] = ((green * realAlpha + undoData[dstOffset + 1] * invAlpha) / 255) & 0xff;
                        destData[dstOffset + 2] = ((blue * realAlpha + undoData[dstOffset + 2] * invAlpha) / 255) & 0xff;
                        destData[dstOffset + 3] = newLayerAlpha;
                    }
                }
            }
        }

        /**
         * Blends the brush data from the current stroke (strokeBuffer) onto the original (pre-stroke) mask data (undoMask)
         * and stores the result in destMask.
         *
         * @param {CPGreyBmp} destMask - The destination to write to
         * @param {CPGreyBmp} undoMask - The original contents of the mask
         * @param {CPGreyBmp} strokeBuffer - Data from the current stroke
         * @param {CPRect} rect - Area to merge
         * @param {int} color - Intensity to paint (0-255)
         */
        mergeOntoMask(destMask, undoMask, strokeBuffer, rect, color) {
            var
                strokeData = strokeBuffer.data,
                undoData = undoMask.data,
                destData = destMask.data,

                width = rect.getWidth() | 0,
                height = rect.getHeight() | 0,

                dstOffset = destMask.offsetOfPixel(rect.left, rect.top),
                srcOffset = strokeBuffer.offsetOfPixel(rect.left, rect.top),

                srcYStride = (strokeBuffer.width - width) | 0,
                dstYStride = (destMask.width - width) | 0;

            for (var y = 0; y < height; y++, srcOffset += srcYStride, dstOffset += dstYStride) {
                for (var x = 0; x < width; x++, srcOffset++, dstOffset++) {
                    var
                        strokeAlpha = (strokeData[srcOffset] / 255) | 0;

                    if (strokeAlpha > 0) {
                        var
                            invAlpha = 255 - strokeAlpha;

                        destData[dstOffset] = (color * strokeAlpha + undoData[dstOffset] * invAlpha) / 255;
                    }
                }
            }
        }

        /**
         * The shape of the brush is combined with the alpha in the strokeData with a simple max()
         * operation. Effectively, the brush just sets the opacity of the buffer.
         *
         * Painting the same area multiple times during a single stroke does not increase the opacity.
         *
         * @param {CPRect} srcRect
         * @param {CPRect} dstRect
         * @param {int[]} brush
         * @param {int} brushWidth
         * @param {int} alpha
         */
        paintOpacity(srcRect, dstRect, brush, brushWidth, alpha) {
            var
                strokeData = strokeBuffer.data,

                srcOffset = srcRect.left + srcRect.top * brushWidth,
                dstOffset = strokeBuffer.offsetOfPixel(dstRect.left, dstRect.top),

                dstWidth = dstRect.getWidth(),

                srcYStride = brushWidth - dstWidth,
                dstYStride = that.width - dstWidth;

            alpha = Math.min(255, alpha);

            for (var y = dstRect.top; y < dstRect.bottom; y++, srcOffset += srcYStride, dstOffset += dstYStride) {
                for (var x = 0; x < dstWidth; x++, srcOffset++, dstOffset++) {
                    strokeData[dstOffset] = Math.max(brush[srcOffset] * alpha, strokeData[dstOffset]);
                }
            }
        }

        /**
         * If the brush covers the same area multiple times, ink builds up until the area becomes opaque.
         *
         * @param {CPRect} srcRect
         * @param {CPRect} dstRect
         * @param {int[]} brush
         * @param {int} brushWidth
         * @param {int} alpha
         */
        paintFlow(srcRect, dstRect, brush, brushWidth, alpha) {
            var
                strokeData = strokeBuffer.data,

                srcOffset = srcRect.left + srcRect.top * brushWidth,
                dstOffset = strokeBuffer.offsetOfPixel(dstRect.left, dstRect.top),

                dstWidth = dstRect.getWidth(),

                srcYStride = brushWidth - dstWidth,
                dstYStride = that.width - dstWidth;

            for (var y = dstRect.top; y < dstRect.bottom; y++, srcOffset += srcYStride, dstOffset += dstYStride) {
                for (var x = 0; x < dstWidth; x++, srcOffset++, dstOffset++) {
                    var
                        brushAlpha = brush[srcOffset] * alpha;

                    if (brushAlpha != 0) {
                        strokeData[dstOffset] = Math.min(255 * 255, strokeData[dstOffset] + (255 - strokeData[dstOffset] / 255) * brushAlpha / 255);
                    }
                }
            }
        }
    }

    class CPBrushToolEraser extends CPBrushToolSimpleBrush {
	    /**
         * @override
         */
        mergeOntoImage(destImage, undoImage, strokeBuffer, rect, color) {
            var
                strokeData = strokeBuffer.data,
                undoData = undoImage.data,
                destData = destImage.data;

            for (var y = rect.top; y < rect.bottom; y++) {
                var
                    dstOffset = destImage.offsetOfPixel(rect.left, y) + CPColorBmp.ALPHA_BYTE_OFFSET,
                    srcOffset = strokeBuffer.offsetOfPixel(rect.left, y);

                for (var x = rect.left; x < rect.right; x++, dstOffset += CPColorBmp.BYTES_PER_PIXEL) {
                    var
                        opacityAlpha = (strokeData[srcOffset++] / 255) | 0;

                    if (opacityAlpha > 0) {
                        var
                            destAlpha = undoData[dstOffset],
                            realAlpha = destAlpha * (255 - opacityAlpha) / 255;

                        destData[dstOffset] = realAlpha;
                    }
                }
            }
        }
    }

    class CPBrushToolDodge extends CPBrushToolSimpleBrush {
	    /**
         * @override
         */
        mergeOntoImage(destImage, undoImage, strokeBuffer, rect, color) {
            var
                strokeData = strokeBuffer.data,
                undoData = undoImage.data,
                destImageData = destImage.data;

            for (var y = rect.top; y < rect.bottom; y++) {
                var
                    dstOffset = destImage.offsetOfPixel(rect.left, y),
                    srcOffset = strokeBuffer.offsetOfPixel(rect.left, y);

                for (var x = rect.left; x < rect.right; x++, srcOffset++, dstOffset += CPColorBmp.BYTES_PER_PIXEL) {
                    var
                        opacityAlpha = (strokeData[srcOffset] / 255) | 0;

                    if (opacityAlpha > 0 && undoData[dstOffset + CPColorBmp.ALPHA_BYTE_OFFSET] != 0) {
                        opacityAlpha += 255;

                        for (var i = 0; i < 3; i++) {
                            var channel = (undoData[dstOffset + i] * opacityAlpha / 255) | 0;

                            if (channel > 255) {
                                channel = 255;
                            }

                            destImageData[dstOffset + i] = channel;
                        }
                    }
                }
            }
        }
    }

    class CPBrushToolBurn extends CPBrushToolSimpleBrush {
	    /**
         * @override
         */
        mergeOntoImage(destImage, undoImage, strokeBuffer, rect, color) {
            var
                strokeData = strokeBuffer.data,
                undoData = undoImage.data,
                destImageData = destImage.data;

            for (var y = rect.top; y < rect.bottom; y++) {
                var
                    dstOffset = destImage.offsetOfPixel(rect.left, y),
                    srcOffset = strokeBuffer.offsetOfPixel(rect.left, y);

                for (var x = rect.left; x < rect.right; x++, srcOffset++, dstOffset += CPColorBmp.BYTES_PER_PIXEL) {
                    var
                        strokeAlpha = (strokeData[srcOffset] / 255) | 0;

                    if (strokeAlpha > 0 && undoData[dstOffset + CPColorBmp.ALPHA_BYTE_OFFSET] != 0) {
                        for (var i = 0; i < 3; i++) {
                            var channel = undoData[dstOffset + i];

                            channel = (channel - (BURN_CONSTANT - channel) * strokeAlpha / 255) | 0;

                            if (channel < 0) {
                                channel = 0;
                            }

                            destImageData[dstOffset + i] = channel;
                        }
                    }
                }
            }
        }
    }
    
    class CPBrushToolBlur extends CPBrushToolSimpleBrush {
	    /**
         * @override
         */
        mergeOntoImage(destImage, undoImage, strokeBuffer, rect, color) {
            var
                strokeData = strokeBuffer.data,
                undoData = undoImage.data,
                destImageData = destImage.data,

                destYStride = undoImage.width * CPColorBmp.BYTES_PER_PIXEL,

                r, g, b, a;

            function addSample(sampleOffset) {
                r += undoData[sampleOffset + CPColorBmp.RED_BYTE_OFFSET];
                g += undoData[sampleOffset + CPColorBmp.GREEN_BYTE_OFFSET];
                b += undoData[sampleOffset + CPColorBmp.BLUE_BYTE_OFFSET];
                a += undoData[sampleOffset + CPColorBmp.ALPHA_BYTE_OFFSET];
            }

            for (var y = rect.top; y < rect.bottom; y++) {
                var
                    destOffset = undoImage.offsetOfPixel(rect.left, y),
                    srcOffset = strokeBuffer.offsetOfPixel(rect.left, y);

                for (var x = rect.left; x < rect.right; x++, destOffset += CPColorBmp.BYTES_PER_PIXEL, srcOffset++) {
                    var
                        strokeAlpha = (strokeData[srcOffset] / 255) | 0;

                    if (strokeAlpha > 0) {
                        var
                            blur = (BLUR_MIN + (BLUR_MAX - BLUR_MIN) * strokeAlpha / 255) | 0,

                            sum = blur + 4;

                        r = blur * undoData[destOffset + CPColorBmp.RED_BYTE_OFFSET];
                        g = blur * undoData[destOffset + CPColorBmp.GREEN_BYTE_OFFSET];
                        b = blur * undoData[destOffset + CPColorBmp.BLUE_BYTE_OFFSET];
                        a = blur * undoData[destOffset + CPColorBmp.ALPHA_BYTE_OFFSET];

                        addSample(y > 0 ? destOffset - destYStride : destOffset);
                        addSample(y < undoImage.height - 1 ? destOffset + destYStride : destOffset);
                        addSample(x > 0 ? destOffset - CPColorBmp.BYTES_PER_PIXEL : destOffset);
                        addSample(x < undoImage.width - 1 ? destOffset + CPColorBmp.BYTES_PER_PIXEL : destOffset);

                        a /= sum;
                        r /= sum;
                        g /= sum;
                        b /= sum;

                        destImageData[destOffset + CPColorBmp.RED_BYTE_OFFSET] = r | 0;
                        destImageData[destOffset + CPColorBmp.GREEN_BYTE_OFFSET] = g | 0;
                        destImageData[destOffset + CPColorBmp.BLUE_BYTE_OFFSET] = b | 0;
                        destImageData[destOffset + CPColorBmp.ALPHA_BYTE_OFFSET] = a | 0;
                    }
                }
            }
        }
    }
    
    /**
     * Brushes derived from this class use the opacity buffer as a simple alpha layer (32-bit pixels in ARGB order).
     *
     * The undoBuffer (pre-stroke image data) is restored to the layer, then the pixels from opacityData are blended
     * on top of that.
     */
    class CPBrushToolDirectBrush extends CPBrushToolSimpleBrush {
	    /**
         * @override
         */
        mergeOntoImage(destImage, undoImage, strokeBuffer, rect, color) {
            var
                strokeData = strokeBuffer.data,
                undoData = undoImage.data,
                destImageData = destImage.data,

                srcOffset = strokeBuffer.offsetOfPixel(rect.left, rect.top),
                dstOffset = destImage.offsetOfPixel(rect.left, rect.top),

                width = rect.getWidth() | 0,
                height = rect.getHeight() | 0,

                srcYStride = (strokeBuffer.width - width) | 0,
                dstYStride = ((destImage.width - width) * CPColorBmp.BYTES_PER_PIXEL) | 0,

                x, y;

            for (y = 0; y < height; y++, srcOffset += srcYStride, dstOffset += dstYStride) {
                for (x = 0; x < width; x++, srcOffset++, dstOffset += CPColorBmp.BYTES_PER_PIXEL) {
                    var
                        color1 = strokeData[srcOffset],
                        alpha1 = color1 >>> 24;

                    if (alpha1 == 0) {
                        continue;
                    }

                    var
                        alpha2 = undoData[dstOffset + CPColorBmp.ALPHA_BYTE_OFFSET],
                        newAlpha = (alpha1 + alpha2 - alpha1 * alpha2 / 255) | 0;

                    if (newAlpha > 0) {
                        var
                            realAlpha = (alpha1 * 255 / newAlpha) | 0,
                            invAlpha = 255 - realAlpha;

                        destImageData[dstOffset] = ((((color1 >> 16) & 0xFF) * realAlpha + undoData[dstOffset] * invAlpha) / 255) | 0;
                        destImageData[dstOffset + 1] = ((((color1 >> 8) & 0xFF) * realAlpha + undoData[dstOffset + 1] * invAlpha) / 255) | 0;
                        destImageData[dstOffset + 2] = (((color1 & 0xFF) * realAlpha + undoData[dstOffset + 2] * invAlpha) / 255) | 0;
                        destImageData[dstOffset + 3] = newAlpha;
                    }
                }
            }
        }
    }
    
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
                
                imageToSample = sampleAllLayers ? fusion : that.getActiveLayer().image;
            
            x = x | 0;
            y = y | 0;

            samples.push(CPColorFloat.createFromInt(imageToSample.getPixel(x, y)));

            for (var r = 0.25; r < 1.001; r += .25) {
                samples.push(CPColorFloat.createFromInt(imageToSample.getPixel(~~(x + r * dx), y)));
                samples.push(CPColorFloat.createFromInt(imageToSample.getPixel(~~(x - r * dx), y)));
                samples.push(CPColorFloat.createFromInt(imageToSample.getPixel(x, ~~(y + r * dy))));
                samples.push(CPColorFloat.createFromInt(imageToSample.getPixel(x, ~~(y - r * dy))));

                samples.push(CPColorFloat.createFromInt(imageToSample.getPixel(~~(x + r * 0.7 * dx), ~~(y + r * 0.7 * dy))));
                samples.push(CPColorFloat.createFromInt(imageToSample.getPixel(~~(x + r * 0.7 * dx), ~~(y - r * 0.7 * dy))));
                samples.push(CPColorFloat.createFromInt(imageToSample.getPixel(~~(x - r * 0.7 * dx), ~~(y + r * 0.7 * dy))));
                samples.push(CPColorFloat.createFromInt(imageToSample.getPixel(~~(x - r * 0.7 * dx), ~~(y - r * 0.7 * dy))));
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

	    /**
         * Blend the brush stroke with full color into the brushBuffer
         *
         * @param {CPRect} srcRect
         * @param {CPRect} dstRect
         * @param {Uint8Array} brush
         * @param {int} brushWidth
         * @param {int} alpha
         * @param {int} color1
	     */
        function paintDirect(srcRect, dstRect, brush, brushWidth, alpha, color1) {
            var
                strokeData = strokeBuffer.data,

                brushY = srcRect.top;
            
            for (var y = dstRect.top; y < dstRect.bottom; y++, brushY++) {
                var
                    srcOffset = srcRect.left + brushY * brushWidth,
                    dstOffset = strokeBuffer.offsetOfPixel(dstRect.left, y);
                
                for (var x = dstRect.left; x < dstRect.right; x++, srcOffset++, dstOffset++) {
                    var 
                        alpha1 = ((brush[srcOffset] & 0xff) * alpha / 255) | 0;
                    
                    if (alpha1 <= 0) {
                        continue;
                    }

                    var
                        color2 = strokeData[dstOffset],
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

                        strokeData[dstOffset] = newColor;
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
                
                for (let i = 0; i < WCMEMORY; i++) {
                    previousSamples.push(startColor);
                }
            }
            
            let
                wcColor = new CPColorFloat(0, 0, 0);
            
            for (let i = 0; i < previousSamples.length; i++) {
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
            mergeStrokeBuffer();
            
            if (sampleAllLayers) {
                that.fusionLayers();
            }
        };
    }
    
    CPBrushToolWatercolor.prototype = Object.create(CPBrushToolDirectBrush.prototype);
    CPBrushToolWatercolor.prototype.constructor = CPBrushToolWatercolor;
    
    class CPBrushToolOil extends CPBrushToolDirectBrush {
        static oilAccumBuffer(srcRect, dstRect, buffer, bufferWidth, alpha) {
            var
                imageToSample = sampleAllLayers ? fusion : that.getActiveLayer().image,

                bufferY = srcRect.top;
            
            for (var y = dstRect.top; y < dstRect.bottom; y++, bufferY++) {
                var 
                    srcOffset = srcRect.left + bufferY * bufferWidth,
                    dstOffset = imageToSample.offsetOfPixel(dstRect.left, y);
                
                for (var x = dstRect.left; x < dstRect.right; x++, srcOffset++, dstOffset += CPColorBmp.BYTES_PER_PIXEL) {
                    var
                        alpha1 = (imageToSample.data[dstOffset + CPColorBmp.ALPHA_BYTE_OFFSET] * alpha / 255) | 0;
                    
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
                            
                            color1Red = imageToSample.data[dstOffset + CPColorBmp.RED_BYTE_OFFSET],
                            color1Green = imageToSample.data[dstOffset + CPColorBmp.GREEN_BYTE_OFFSET],
                            color1Blue = imageToSample.data[dstOffset + CPColorBmp.BLUE_BYTE_OFFSET],

                            newColor = newAlpha << 24
                                | (color1Red + (((color2 >>> 16 & 0xff) * invAlpha - color1Red * invAlpha) / 255)) << 16
                                | (color1Green + (((color2 >>> 8 & 0xff) * invAlpha - color1Green * invAlpha) / 255)) << 8
                                | (color1Blue + (((color2 & 0xff) * invAlpha - color1Blue * invAlpha) / 255));

                        buffer[srcOffset] = newColor;
                    }
                }
            }
        }

        static oilResatBuffer(srcRect, dstRect, buffer, bufferWidth, alpha1, color1) {
            var
                bufferY = srcRect.top;
            
            if (alpha1 <= 0) {
                return;
            }
            
            for (var y = dstRect.top; y < dstRect.bottom; y++, bufferY++) {
                var 
                    srcOffset = srcRect.left + bufferY * bufferWidth;
                
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

        static oilPasteBuffer(srcRect, dstRect, buffer, brush, brushWidth, alpha) {
            var
                strokeData = strokeBuffer.data,
                destImage = curLayer.image,
                destImageData = destImage.data,
    
                brushY = srcRect.top;
            
            for (var y = dstRect.top; y < dstRect.bottom; y++, brushY++) {
                var 
                    bufferOffset = srcRect.left + brushY * brushWidth, // Brush buffer is 1 integer per pixel
                    strokeOffset = dstRect.left + y * that.width, // Opacity buffer is 1 integer per pixel
                    layerOffset = destImage.offsetOfPixel(dstRect.left, y); // 4 bytes per pixel
                
                for (var x = dstRect.left; x < dstRect.right; x++, bufferOffset++, layerOffset += CPColorBmp.BYTES_PER_PIXEL, strokeOffset++) {
                    var 
                        color1 = buffer[bufferOffset],
                        alpha1 = ((color1 >>> 24) * (brush[bufferOffset] & 0xff) * alpha / (255 * 255)) | 0;
                    
                    if (alpha1 <= 0) {
                        continue;
                    }

                    var
                        alpha2 = destImageData[layerOffset + CPColorBmp.ALPHA_BYTE_OFFSET],

                        newAlpha = (alpha1 + alpha2 - alpha1 * alpha2 / 255) | 0;
                    
                    if (newAlpha > 0) {
                        var 
                            color2Red = destImageData[layerOffset + CPColorBmp.RED_BYTE_OFFSET],
                            color2Green = destImageData[layerOffset + CPColorBmp.GREEN_BYTE_OFFSET],
                            color2Blue = destImageData[layerOffset + CPColorBmp.BLUE_BYTE_OFFSET],
                            
                            realAlpha = (alpha1 * 255 / newAlpha) | 0,
                            invAlpha = 255 - realAlpha,

                            newColor = newAlpha << 24
                                | ((color1 >>> 16 & 0xff) + ((color2Red * invAlpha - (color1 >>> 16 & 0xff) * invAlpha) / 255)) << 16
                                | ((color1 >>> 8 & 0xff) + ((color2Green * invAlpha - (color1 >>> 8 & 0xff) * invAlpha) / 255)) << 8
                                | ((color1 & 0xff) + ((color2Blue * invAlpha - (color1 & 0xff) * invAlpha) / 255));

                        strokeData[strokeOffset] = newColor;
                    }
                }
            }
        }
        
        paintDabImplementation(srcRect, dstRect, dab) {
            if (brushBuffer == null) {
                brushBuffer = new Uint32Array(dab.width * dab.height); // Initialized to 0 for us by the browser

                CPBrushToolOil.oilAccumBuffer(srcRect, dstRect, brushBuffer, dab.width, 255);
            } else {
                CPBrushToolOil.oilResatBuffer(srcRect, dstRect, brushBuffer, dab.width, ~~((curBrush.resat <= 0.0) ? 0 : Math.max(1, (curBrush.resat * curBrush.resat) * 255)), curColor & 0xFFFFFF);
                CPBrushToolOil.oilPasteBuffer(srcRect, dstRect, brushBuffer, dab.brush, dab.width, dab.alpha);
                CPBrushToolOil.oilAccumBuffer(srcRect, dstRect, brushBuffer, dab.width, ~~(curBrush.bleed * 255));
            }
            
            mergeStrokeBuffer();
            
            if (sampleAllLayers) {
                that.fusionLayers();
            }
        }
    }

    class CPBrushToolSmudge extends CPBrushToolDirectBrush {
        
        /**
         * 
         * @param {CPRect} srcRect
         * @param {CPRect} dstRect
         * @param {Uint32Array} buffer
         * @param {int} bufferWidth
         * @param {int} alpha
         */
        static smudgeAccumBuffer(srcRect, dstRect, buffer, bufferWidth, alpha) {
            let
                imageToSample = sampleAllLayers ? fusion : that.getActiveLayer().image,
                opacityAlpha = 255 - alpha,
                bufferY = srcRect.top;

            if (opacityAlpha == 0) {
                return;
            }

            for (let y = dstRect.top; y < dstRect.bottom; y++, bufferY++) {
                let
                    srcOffset = srcRect.left + bufferY * bufferWidth,
                    dstOffset = imageToSample.offsetOfPixel(dstRect.left, y);
                
                for (let x = dstRect.left; x < dstRect.right; x++, srcOffset++, dstOffset += CPColorBmp.BYTES_PER_PIXEL) {
                    let
                        sampleRed = imageToSample.data[dstOffset + CPColorBmp.RED_BYTE_OFFSET],
                        sampleGreen = imageToSample.data[dstOffset + CPColorBmp.GREEN_BYTE_OFFSET],
                        sampleBlue = imageToSample.data[dstOffset + CPColorBmp.BLUE_BYTE_OFFSET],
                        sampleAlpha = imageToSample.data[dstOffset + CPColorBmp.ALPHA_BYTE_OFFSET],
                    
                        dstColor = buffer[srcOffset],

                        destAlpha = 255,
                        newLayerAlpha = (opacityAlpha + destAlpha * (255 - opacityAlpha) / 255) | 0,
                        realAlpha = (255 * opacityAlpha / newLayerAlpha) | 0,
                        invAlpha = 255 - realAlpha,

                        newColor =
                            ((sampleAlpha * realAlpha + (dstColor >>> 24 & 0xff) * invAlpha) / 255) << 24 & 0xff000000
                            | ((sampleRed * realAlpha + (dstColor >>> 16 & 0xff) * invAlpha) / 255) << 16 & 0xff0000
                            | ((sampleGreen * realAlpha + (dstColor >>> 8 & 0xff) * invAlpha) / 255) << 8 & 0xff00
                            | ((sampleBlue * realAlpha + (dstColor & 0xff) * invAlpha) / 255) & 0xff;

                    if (newColor == dstColor) {
                        let
                            destRed   = (dstColor & 0xff0000) >> 16,
                            destGreen = (dstColor & 0x00ff00) >> 8,
                            destBlue  =  dstColor & 0x0000ff;

                        if (sampleRed > destRed) {
                            newColor += 1 << 16;
                        } else if (sampleRed < destRed) {
                            newColor -= 1 << 16;
                        }

                        if (sampleGreen > destGreen) {
                            newColor += 1 << 8;
                        } else if (sampleGreen < destGreen) {
                            newColor -= 1 << 8;
                        }

                        if (sampleBlue > destBlue) {
                            newColor += 1;
                        } else if (sampleBlue < destBlue) {
                            newColor -= 1;
                        }
                    }

                    buffer[srcOffset] = newColor;
                }
            }

            if (srcRect.left > 0) {
                let
                    fill = srcRect.left;
                
                for (let y = srcRect.top; y < srcRect.bottom; y++) {
                    let
                        offset = y * bufferWidth,
                        fillColor = buffer[offset + srcRect.left];
                    
                    for (let x = 0; x < fill; x++) {
                        buffer[offset++] = fillColor;
                    }
                }
            }

            if (srcRect.right < bufferWidth) {
                let
                    fill = bufferWidth - srcRect.right;
                
                for (let y = srcRect.top; y < srcRect.bottom; y++) {
                    var
                        offset = y * bufferWidth + srcRect.right,
                        fillColor = buffer[offset - 1];
                    
                    for (let x = 0; x < fill; x++) {
                        buffer[offset++] = fillColor;
                    }
                }
            }

            for (let y = 0; y < srcRect.top; y++) {
                let
                    srcOffset = srcRect.top * bufferWidth,
                    dstOffset = y * bufferWidth;
                
                for (let x = 0; x < bufferWidth; x++, srcOffset++, dstOffset++) {
                    buffer[dstOffset] = buffer[srcOffset];
                }
            }
            
            for (let y = srcRect.bottom; y < bufferWidth; y++) {
                let
                    srcOffset = (srcRect.bottom - 1) * bufferWidth,
                    dstOffset = y * bufferWidth;
                
                for (let x = 0; x < bufferWidth; x++, srcOffset++, dstOffset++) {
                    buffer[dstOffset] = buffer[srcOffset];
                }
            }
        }

        /**
         * Write the smudge buffer onto the layer's image.
         *
         * @param {CPColorBmp} destImage
         * @param {CPRect} srcRect
         * @param {CPRect} dstRect
         * @param {Uint32Array} buffer
         * @param {Uint8Array} brush
         * @param {int} brushWidth
         */
        static smudgePasteBuffer(destImage, srcRect, dstRect, buffer, brush, brushWidth) {
            var
                brushY = srcRect.top,
                destImageData = destImage.data;
            
            for (var y = dstRect.top; y < dstRect.bottom; y++, brushY++) {
                var 
                    srcOffset = srcRect.left + brushY * brushWidth,
                    dstOffset = destImage.offsetOfPixel(dstRect.left, y);
                
                for (var x = dstRect.left; x < dstRect.right; x++, srcOffset++, dstOffset += CPColorBmp.BYTES_PER_PIXEL) {
                    var
                        bufferColor = buffer[srcOffset],
                        opacityAlpha = (bufferColor >>> 24) * (brush[srcOffset] & 0xff) / 255;
                    
                    if (opacityAlpha > 0) {
                        destImageData[dstOffset + CPColorBmp.RED_BYTE_OFFSET] = (bufferColor >> 16) & 0xff;
                        destImageData[dstOffset + CPColorBmp.GREEN_BYTE_OFFSET] = (bufferColor >> 8) & 0xff;
                        destImageData[dstOffset + CPColorBmp.BLUE_BYTE_OFFSET] = bufferColor & 0xff;
                        destImageData[dstOffset + CPColorBmp.ALPHA_BYTE_OFFSET] = (bufferColor >> 24) & 0xff;
                    }
                }
            }
        }
        
        /**
         * @override
         * @param {CPRect} srcRect
         * @param {CPRect} dstRect
         * @param {CPBrushDab} dab
         */
        paintDabImplementation(srcRect, dstRect, dab) {
            if (brushBuffer == null) {
                brushBuffer = new Uint32Array(dab.width * dab.height);
                CPBrushToolSmudge.smudgeAccumBuffer(srcRect, dstRect, brushBuffer, dab.width, 0);
            } else {
                CPBrushToolSmudge.smudgeAccumBuffer(srcRect, dstRect, brushBuffer, dab.width, dab.alpha);
                CPBrushToolSmudge.smudgePasteBuffer(curLayer.image, srcRect, dstRect, brushBuffer, dab.brush, dab.width);

                if (lockAlpha) {
                    restoreImageAlpha(curLayer.image, dstRect);
                }
            }
            
            strokedRegion.makeEmpty();
            
            if (sampleAllLayers) {
                that.fusionLayers();
            }
        }

	    /**
         * A no-op since our paint implementation paints directly to the underlying image during the stroke.
         *
         * @override
	     */
        mergeOntoImage(destImage, undoImage, opacityBuffer, rect, color) {
        }
    }

    this.getDefaultLayerName = function(isGroup) {
        var
            prefix = isGroup ? "Group " : "Layer ",
            nameRegex = isGroup ? /^Group [0-9]+$/ : /^Layer [0-9]+$/,
            highestLayerNb = 0,
            layers = layersRoot.getLinearizedLayerList(false);
        
        for (var i = 0; i < layers.length; i++) {
            var
                layer = layers[i];
            
            if (nameRegex.test(layer.name)) {
                highestLayerNb = Math.max(highestLayerNb, parseInt(layer.name.substring(prefix.length), 10));
            }
        }
        return prefix + (highestLayerNb + 1);
    };

	/**
     * Restore the alpha channel of the given image from the undoImage (i.e. restore it to what it was before the
     * current drawing operation started).
     *
     * @param {CPColorBmp} image
     * @param {CPRect} rect
     */
    function restoreImageAlpha(image, rect) {
        image.copyAlphaFrom(undoImage, rect);
    }
    
    /**
     * Merge the brush buffer from the current drawing operation to the active layer.*
     */
    function mergeStrokeBuffer() {
        if (!strokedRegion.isEmpty()) {
            var
                color;

            if (maskEditingMode) {
                var
                    destMask = curLayer.mask;

                // Can't erase on masks, so just paint black instead
                if (curBrush.paintMode == CPBrushInfo.M_ERASE) {
                    paintingModes[CPBrushInfo.M_PAINT].mergeOntoMask(destMask, undoMask, strokeBuffer, strokedRegion, 0xFF000000);
                } else {
                    color = curColor & 0xFF;

                    paintingModes[curBrush.paintMode].mergeOntoMask(destMask, undoMask, strokeBuffer, strokedRegion, color);
                }
            } else {
                var
                    destImage = curLayer.image;

                color = curColor;

                if (curBrush.paintMode == CPBrushInfo.M_ERASE && lockAlpha) {
                    // We're erasing with locked alpha, so the only sensible thing to do is paint white...

                    // FIXME: it would be nice to be able to set the paper color
                    paintingModes[CPBrushInfo.M_PAINT].mergeOntoImage(destImage, undoImage, strokeBuffer, strokedRegion, EMPTY_LAYER_COLOR);
                } else {
                    paintingModes[curBrush.paintMode].mergeOntoImage(destImage, undoImage, strokeBuffer, strokedRegion, color);
                }

                if (lockAlpha) {
                    restoreImageAlpha(destImage, strokedRegion);
                }
            }

            strokedRegion.makeEmpty();
        }
    }

    function prepareForFusion() {
        blendTree.buildTree();
    }

    this.addBackgroundLayer = function() {
        var
            layer = new CPImageLayer(that.width, that.height, this.getDefaultLayerName(false));
        
        layer.image.clearAll(EMPTY_BACKGROUND_COLOR);
        
        this.addLayerObject(this.getLayersRoot(), layer);
    };

    /**
     * Merge together the visible layers and return the resulting image for display to the screen.
     * 
     * The image is cached, so repeat calls are cheap.
     *
     * @returns {CPColorBmp}
     */
    this.fusionLayers = function() {
        // The current brush renders out its buffers to the layer stack for us
        mergeStrokeBuffer();

        prepareForFusion();

        fusion = blendTree.blendTree().image;
        
        return fusion;
    };

    this.isCreateClippingMaskAllowed = function() {
        var
            layerIndex = curLayer.parent.indexOf(curLayer),
            underLayer = curLayer.parent.layers[layerIndex - 1];

        return curLayer instanceof CPImageLayer && !curLayer.clip && underLayer instanceof CPImageLayer;
    };

	/**
     * Clip this layer to the one below, if it is not already clipped.
     */
    this.createClippingMask = function() {
        if (this.isCreateClippingMaskAllowed()) {
            addUndo(new CPActionChangeLayerClip(curLayer, true));
        }
    };

    /**
     * Clip this layer to the one below, if it is not already clipped.
     */
    this.releaseClippingMask = function() {
        if ((curLayer instanceof CPImageLayer) && curLayer.clip) {
            addUndo(new CPActionChangeLayerClip(curLayer, false));
        }
    };

	/**
     * Change the currently active layer. The layer may not be set to null.
     *
     * @param {(CPLayer|CPImageLayer|CPLayerGroup)} newLayer
     * @param {boolean} selectMask - True to select the layer's mask for editing
     */
    this.setActiveLayer = function(newLayer, selectMask) {
        if (newLayer && (curLayer != newLayer || selectMask != maskEditingMode)) {
            var
                oldLayer = curLayer;
            
            curLayer = newLayer;
            maskEditingMode = selectMask;

            invalidateUndoBuffers();

            this.emitEvent("changeActiveLayer", [oldLayer, newLayer, maskEditingMode]);
        }
    };
    
    /**
     * Select the topmost visible layer, or the topmost layer if none are visible.
     */
    this.selectTopmostVisibleLayer = function() {
        let
            list = layersRoot.getLinearizedLayerList(false);

        // Find a visible, drawable layer
        for (let i = list.length - 1; i >= 0; i--) {
            if (list[i] instanceof CPImageLayer && list[i].getEffectiveAlpha() > 0) {
                this.setActiveLayer(list[i], false);
                return;
            }
        }

        // None? Okay, how about just a drawable layer
        for (let i = list.length - 1; i >= 0; i--) {
            if (list[i] instanceof CPImageLayer) {
                this.setActiveLayer(list[i], false);
                return;
            }
        }

        // Trying to be difficult, huh?
        this.setActiveLayer(list[list.length - 1], false);
    };

	/**
     * Get the currently active layer (the layer that drawing operations will be applied to))
     *
     * @returns {CPLayer}
     */
    this.getActiveLayer = function() {
        return curLayer;
    };

    this.isEditingMask = function() {
        return maskEditingMode;
    };

    this.isActiveLayerDrawable = function() {
        return maskEditingMode && curLayer.mask || curLayer instanceof CPImageLayer;
    };

	/**
     *
     * @returns {number}
     */
    this.getUndoMemoryUsed = function() {
        var
            total = 0;

        for (let redo of redoList) {
            total += redo.getMemoryUsed(true, null);
        }

        for (let undo of undoList) {
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
    };

    this.redo = function() {
        if (!canRedo()) {
            return;
        }
        hasUnsavedChanges = true;

        var
            redo = redoList.pop();
        
        redo.redo();
        
        undoList.push(redo);
    };

    function prepareForLayerImageUndo() {
        if (curLayer instanceof CPImageLayer && !undoImageInvalidRegion.isEmpty()) {
            // console.log("Copying " + undoImageInvalidRegion + " to the image undo buffer");

            undoImage.copyBitmapRect(curLayer.image, undoImageInvalidRegion.left, undoImageInvalidRegion.top, undoImageInvalidRegion);

            undoImageInvalidRegion.makeEmpty();
        }
    }

    function prepareForLayerMaskUndo() {
        if (curLayer.mask && !undoMaskInvalidRegion.isEmpty()) {
            // console.log("Copying " + undoMaskInvalidRegion + " to the mask undo buffer");

            undoMask.copyBitmapRect(curLayer.mask, undoMaskInvalidRegion.left, undoMaskInvalidRegion.top, undoMaskInvalidRegion);

            undoMaskInvalidRegion.makeEmpty();
        }
    }

    /**
     * Call before making a paint operation on the current layer, in order to store the state of the layer for
     * later undo with CPUndoPaint.
     */
    function prepareForLayerPaintUndo() {
        if (maskEditingMode) {
            prepareForLayerMaskUndo();
        } else {
            prepareForLayerImageUndo();
        }
    }

    /**
     * Call when the undo buffer has become completely worthless (e.g. after the active layer index changes, the undo
     * buffer won't contain any data from the new layer to begin with).
     */
    function invalidateUndoBuffers() {
        undoImageInvalidRegion = that.getBounds();
        undoMaskInvalidRegion = that.getBounds();
    }

    /**
     * The result of some of our operations aren't needed until later, so we can defer them until the user is idle.
     *
     * You may call this routine at any time (or never, if you like) as a hint that the user is idle and we should
     * try to perform pending operations before we will need to block on their results.
     */
    this.performIdleTasks = function() {
        prepareForLayerPaintUndo();

        prepareForFusion();
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
            that.compactUndo();
            undoList.push(undo);
        } else if (undoList[undoList.length - 1].noChange()) {
            // Two merged changes can mean no change at all
            // don't leave a useless undo in the list
            undoList.pop();
        }
    }

	/**
     * Compress the undo action at the top of the stack to save space. Intended for internal calls only.
     */
    this.compactUndo = function() {
        if (undoList.length > 0) {
            undoList[undoList.length - 1].compact();
        }
    };

    this.clearHistory = function() {
        undoList = [];
        redoList = [];
    };

	/**
     * Sample the color at the given coordinates.
     *
     * @param {int} x
     * @param {int} y
     * @returns {int}
     */
    this.colorPicker = function(x, y) {
        if (maskEditingMode && curLayer.mask) {
            return CPColor.greyToRGB(curLayer.mask.getPixel(~~x, ~~y));
        } else {
            return fusion.getPixel(~~x, ~~y) & 0xFFFFFF;
        }
    };

    this.setSelection = function(rect) {
        curSelection.set(rect);
        curSelection.clipTo(this.getBounds());
    };

    this.emptySelection = function() {
        curSelection.makeEmpty();
    };

    this.floodFill = function(x, y) {
        prepareForLayerPaintUndo();
        undoArea = this.getBounds();

        getActiveImage().floodFill(~~x, ~~y, curColor | 0xff000000);

        addUndo(new CPUndoPaint());
        invalidateLayerPaint(curLayer, this.getBounds());
    };

    this.gradientFill = function(fromX, fromY, toX, toY, gradientPoints) {
        var
            r = this.getSelectionAutoSelect(),
            target = getActiveImage();

        prepareForLayerPaintUndo();
        undoArea = r.clone();

        target.gradient(r, fromX, fromY, toX, toY, gradientPoints, false);

        if (lockAlpha && target instanceof CPColorBmp) {
            restoreImageAlpha(target, r);
        }

        addUndo(new CPUndoPaint());
        invalidateLayerPaint(curLayer, r);
    };

	/**
     * Fill the selection rectangle with a solid opaque color.
     *
     * @param {int} color - RGB color to fill with
     */
    this.fill = function(color) {
        var
            r = this.getSelectionAutoSelect(),
            target = getActiveImage();

        prepareForLayerPaintUndo();
        undoArea = r.clone();

        target.clearRect(r, color);

        addUndo(new CPUndoPaint());
        invalidateLayerPaint(curLayer, r);
    };

    this.clear = function() {
        this.fill(0xffffff);
    };

	/**
     *
     * @param {boolean} horizontal
     */
    this.flip = function(horizontal) {
        var
            rect = this.getSelectionAutoSelect(),

            transformBoth = curLayer instanceof CPImageLayer && curLayer.mask && curLayer.maskLinked,
            transformImage = !maskEditingMode || transformBoth,
            transformMask = maskEditingMode || transformBoth,

            routine = horizontal ? "copyRegionHFlip" : "copyRegionVFlip";

        undoArea = rect.clone();

        if (transformImage) {
            prepareForLayerImageUndo();

            curLayer.image[routine](rect, undoImage);
        }
        if (transformMask) {
            prepareForLayerMaskUndo();

            curLayer.mask[routine](rect, undoMask);
        }

        addUndo(new CPUndoPaint(transformImage, transformMask));
        invalidateLayer(curLayer, rect, transformImage, transformMask);
    };

    this.hFlip = function() {
        this.flip(true);
    };

    this.vFlip = function() {
        this.flip(false);
    };

    this.monochromaticNoise = function() {
        var
            r = this.getSelectionAutoSelect();

        prepareForLayerPaintUndo();
        undoArea = r.clone();

        getActiveImage().fillWithNoise(r);

        addUndo(new CPUndoPaint());
        invalidateLayerPaint(curLayer, r);
    };

    this.isColorNoiseAllowed = function() {
        return !this.isEditingMask() && this.isActiveLayerDrawable();
    };

	/**
     * We can only fill layer images with color noise (not masks)
     */
    this.colorNoise = function() {
        if (this.isColorNoiseAllowed()) {
            var
                r = this.getSelectionAutoSelect();

            prepareForLayerPaintUndo();
            undoArea = r.clone();

            curLayer.image.fillWithColorNoise(r);

            addUndo(new CPUndoPaint(true, false));
            invalidateLayer(curLayer, r, true, false);
        }
    };
    
    this.invert = function() {
        var
            r = this.getSelectionAutoSelect(),
            target = getActiveImage();

        prepareForLayerPaintUndo();
        undoArea = r.clone();

        target.invert(r);

        addUndo(new CPUndoPaint());
        invalidateLayerPaint(curLayer, r);
    };
    
    this.boxBlur = function(radiusX, radiusY, iterations) {
        var
            r = this.getSelectionAutoSelect(),
            target = getActiveImage();

        prepareForLayerPaintUndo();
        undoArea = r.clone();

        for (var i = 0; i < iterations; i++) {
            target.boxBlur(r, radiusX, radiusY);
        }

        addUndo(new CPUndoPaint());
        invalidateLayerPaint(curLayer, r);
    };
    
    this.rectangleSelection = function(r) {
        var
            newSelection = r.clone();
        
        newSelection.clipTo(this.getBounds());

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
     * Move the currently selected layer by the given offset.
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

        strokedRegion.makeEmpty(); // Prevents a drawing tool being called during layer fusion to draw itself to the layer

        var
            activeOp = getActiveOperation();

        // If we've changed layers since our last move, we want to move the new layer, not the old one, so can't amend
        if (!copy && activeOp instanceof CPActionMoveSelection && activeOp.layer == this.getActiveLayer()) {
            activeOp.amend(offsetX, offsetY);
            redoList = [];
            hasUnsavedChanges = true;
        } else {
            addUndo(new CPActionMoveSelection(this.getSelectionAutoSelect(), offsetX, offsetY, copy));
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
            endPaintingInteraction();
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
    
        strokedRegion.makeEmpty(); // Prevents a drawing tool being called during layer fusion to draw itself to the layer

        beginPaintingInteraction();

        return {transform: initialTransform, rect: initialRect, selection: selection};
    };

	/**
     * Finish and save the transform that is currently in progress.
     */
    this.transformAffineFinish = function() {
        if (previewOperation instanceof CPActionTransformSelection) {
            addUndo(previewOperation);
            previewOperation = null;
            endPaintingInteraction();
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
    
    this.cutSelection = function() {
        var
            selection = this.getSelection(),
            image = getActiveImage();
        
        if (!selection.isEmpty() && image != null) {
            addUndo(new CPActionCut(curLayer, maskEditingMode, selection));
        }
    };

    this.copySelection = function() {
        var
            selection = that.getSelection(),
            image = getActiveImage();
        
        if (!selection.isEmpty() && image != null) {
            clipboard = new CPClip(image.cloneRect(selection), selection.left, selection.top);
        }
    };

    this.copySelectionMerged = function() {
        var 
            selection = that.getSelection();
        
        if (selection.isEmpty()) {
            return;
        }

        clipboard = new CPClip(this.fusionLayers().cloneRect(selection), selection.left, selection.top);
    };

    this.isPasteClipboardAllowed = function() {
        return !this.isClipboardEmpty();
    };

    this.pasteClipboard = function() {
        if (this.isPasteClipboardAllowed()) {
            addUndo(new CPActionPaste(clipboard, this.getActiveLayer()));
        }
    };

    this.isClipboardEmpty = function() {
        return clipboard == null;
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
    };

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
     * @return {string} A binary string of the PNG file data.
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
        return layersRoot.layers.length == 1 && layersRoot.layers[0] instanceof CPImageLayer && !layersRoot.layers[0].mask && layersRoot.layers[0].getEffectiveAlpha() == 100;
    };

    /**
     * Save the difference between the current layer and the undoImage / undoMask (within the undoArea) for undo, and
     * clear the undoArea.
     *
     * @constructor
     */
    function CPUndoPaint(paintedImage, paintedMask) {
        if (!paintedImage && !paintedMask) {
            paintedImage = !maskEditingMode;
            paintedMask = maskEditingMode;
        }

        var
            rect = undoArea.clone(),

            xorImage = paintedImage ? undoImage.copyRectXOR(curLayer.image, rect) : null,
            xorMask = paintedMask ? undoMask.copyRectXOR(curLayer.mask, rect) : null;
        
        this.layer = curLayer;

        undoArea.makeEmpty();

        this.undo = function() {
            if (xorImage) {
                this.layer.image.setRectXOR(xorImage, rect);
            }
            if (xorMask) {
                this.layer.mask.setRectXOR(xorMask, rect);
            }

            invalidateLayer(this.layer, rect, xorImage != null, xorMask != null);
        };

        this.redo = this.undo;

        this.getMemoryUsed = function(undone, param) {
            return (xorImage ? xorImage.length : 0) + (xorMask ? xorMask.length : 0);
        };
    }
    
    CPUndoPaint.prototype = Object.create(CPUndo.prototype);
    CPUndoPaint.prototype.constructor = CPUndoPaint;

    /**
     * Upon creation, adds a layer mask to the given layer.
     *
     * @param {CPLayer} layer
     *
     * @constructor
     */
    function CPActionAddLayerMask(layer) {
        this.undo = function() {
            layer.setMask(null);

            artworkStructureChanged();

            that.setActiveLayer(layer, false);
        };

        this.redo = function() {
            var
                newMask = new CPGreyBmp(that.width, that.height, 8);
            newMask.clearAll(255);

            layer.maskLinked = true;
            layer.setMask(newMask);

            artworkStructureChanged();

            that.setActiveLayer(layer, true);
        };

        this.redo();
    }

    CPActionAddLayerMask.prototype = Object.create(CPUndo.prototype);
    CPActionAddLayerMask.prototype.constructor = CPActionAddLayerMask;

    /**
     * Upon creation, removes, or applies and removes, the layer mask on the given layer.
     *
     * @param {CPLayer} layer
     * @param {boolean} apply
     *
     * @constructor
     */
    function CPActionRemoveLayerMask(layer, apply) {
        var
            oldMask = layer.mask,
            oldLayerImage,
            maskWasSelected = false;

        if (apply && layer instanceof CPImageLayer) {
            oldLayerImage = layer.image.clone();
        } else {
            oldLayerImage = null;
        }

        maskWasSelected = curLayer == layer && maskEditingMode;

        this.undo = function() {
            layer.setMask(oldMask);

            if (oldLayerImage) {
                layer.image.copyPixelsFrom(oldLayerImage);
                invalidateLayer(layer, layer.image.getBounds(), true, false);
            }

            if (maskWasSelected) {
                that.setActiveLayer(layer, true);
            }

            artworkStructureChanged();
        };

        this.redo = function() {
            if (oldLayerImage) {
                CPBlend.multiplyAlphaByMask(layer.image, 100, layer.mask);

                // Ensure thumbnail is repainted (artworkStructureChanged() doesn't repaint thumbs)
                invalidateLayer(layer, that.getBounds(), true, false);
            }

            if (maskWasSelected) {
                that.setActiveLayer(layer, false);
            }

            layer.setMask(null);

            artworkStructureChanged();
        };

        this.redo();
    }

    CPActionRemoveLayerMask.prototype = Object.create(CPUndo.prototype);
    CPActionRemoveLayerMask.prototype.constructor = CPActionRemoveLayerMask;

    /**
     * Upon creation, adds a layer at the given index in the given layer group.
     *
     * @param {CPLayerGroup} parentGroup
     * @param {int} newLayerIndex
     * @param {CPLayer} newLayer
     *
     * @constructor
     */
    function CPActionAddLayer(parentGroup, newLayerIndex, newLayer) {
        const
            newLayerWasClipped = newLayer instanceof CPImageLayer && newLayer.clip,
            toBelowLayer = parentGroup.layers[newLayerIndex],
            toBelowLayerWasClipped = toBelowLayer instanceof CPImageLayer && toBelowLayer.clip,
            fromMask = maskEditingMode;

        this.undo = function() {
            parentGroup.removeLayer(newLayer);

            var
                newSelection = parentGroup.layers[newLayerIndex - 1] || parentGroup.layers[0] || parentGroup;

            if (toBelowLayer instanceof CPImageLayer) {
                toBelowLayer.clip = toBelowLayerWasClipped;
            }
            if (newLayer instanceof CPImageLayer) {
                newLayer.clip = newLayerWasClipped;
            }

            artworkStructureChanged();
            that.setActiveLayer(newSelection, fromMask);
        };

        this.redo = function() {
            parentGroup.insertLayer(newLayerIndex, newLayer);

            if (toBelowLayerWasClipped) {
                if (newLayer instanceof CPImageLayer) {
                    // Join a clipping group if we add an image layer in the middle of it
                    newLayer.clip = true;
                } else {
                    // If we add a group into a clipping group, break it
                    toBelowLayer.clip = false;
                }
            }

            artworkStructureChanged();
            that.setActiveLayer(newLayer, false);
        };

        this.redo();
    }
    
    CPActionAddLayer.prototype = Object.create(CPUndo.prototype);
    CPActionAddLayer.prototype.constructor = CPActionAddLayer;

	/**
     * Make a copy of the currently selected layer and add the new layer on top of the current layer.
     * 
     * @param {CPLayer} sourceLayer
     * @constructor
     */
    function CPActionDuplicateLayer(sourceLayer) {
        var
            newLayer = sourceLayer.clone(),
            oldMask = maskEditingMode;

        this.undo = function() {
            newLayer.parent.removeLayer(newLayer);

            artworkStructureChanged();
            that.setActiveLayer(sourceLayer, oldMask);
        };

        this.redo = function() {
            const
                COPY_SUFFIX = " Copy";

            var
                newLayerName = sourceLayer.name;
            
            if (!newLayerName.endsWith(COPY_SUFFIX)) {
                newLayerName += COPY_SUFFIX;
            }
            
            newLayer.name = newLayerName;

            sourceLayer.parent.insertLayer(sourceLayer.parent.indexOf(sourceLayer) + 1, newLayer);

            artworkStructureChanged();
            that.setActiveLayer(newLayer, false);
        };

        this.redo();
    }
    
    CPActionDuplicateLayer.prototype = Object.create(CPUndo.prototype);
    CPActionDuplicateLayer.prototype.constructor = CPActionDuplicateLayer;

    /**
     * @param {CPLayer} layer
     */
    function CPActionRemoveLayer(layer) {
        var
            oldGroup = layer.parent,
            oldIndex = oldGroup.indexOf(layer),
            oldMask = maskEditingMode,

            fromBelowLayer = oldGroup.layers[oldIndex + 1],
            removeClipFromAboveLayer = fromBelowLayer instanceof CPImageLayer && fromBelowLayer.getClippingBase() == layer;
    
        this.undo = function() {
            oldGroup.insertLayer(oldIndex, layer);

            if (removeClipFromAboveLayer) {
                fromBelowLayer.clip = true;
            }

            artworkStructureChanged();
            that.setActiveLayer(layer, oldMask);
        };

        this.redo = function() {
            if (removeClipFromAboveLayer) {
                fromBelowLayer.clip = false;
            }

            oldGroup.removeLayerAtIndex(oldIndex);

            var
                newSelectedLayer;

            /* Attempt to select the layer underneath the one that was removed, otherwise the one on top,
             * otherwise the group that contained the layer.
             */
            if (oldGroup.layers.length == 0) {
                newSelectedLayer = layer.parent;
            } else {
                newSelectedLayer = oldGroup.layers[Math.max(oldIndex - 1, 0)];
            }

            artworkStructureChanged();
            that.setActiveLayer(newSelectedLayer, false);
        };

        this.getMemoryUsed = function(undone, param) {
            return undone ? 0 : layer.getMemoryUsed();
        };
        
        this.redo();
    }
    
    CPActionRemoveLayer.prototype = Object.create(CPUndo.prototype);
    CPActionRemoveLayer.prototype.constructor = CPActionRemoveLayer;

    /**
     * Merge the given group together to form an image layer.
     *
     * @param {CPLayerGroup} layerGroup
     * @constructor
     */
    function CPActionMergeGroup(layerGroup) {
        var
            oldGroupIndex = layerGroup.parent.indexOf(layerGroup),
            fromMask = maskEditingMode,
            mergedLayer = new CPImageLayer(that.width, that.height, "");

        this.undo = function() {
            layerGroup.parent.setLayerAtIndex(oldGroupIndex, layerGroup);

            artworkStructureChanged();
            that.setActiveLayer(layerGroup, fromMask);
        };

        this.redo = function() {
            layerGroup.parent.setLayerAtIndex(oldGroupIndex, mergedLayer);

            artworkStructureChanged();
            that.setActiveLayer(mergedLayer, false);
        };

        this.getMemoryUsed = function(undone, param) {
            return undone ? 0 : layerGroup.getMemoryUsed();
        };

        var
            blendTree = new CPBlendTree(layerGroup, that.width, that.height, false),
            blended;

        blendTree.buildTree();

        blended = blendTree.blendTree();

        mergedLayer.name = layerGroup.name;

        mergedLayer.alpha = blended.alpha;
        mergedLayer.image = blended.image;
        mergedLayer.blendMode = blended.blendMode;
        mergedLayer.mask = blended.mask;

        if (mergedLayer.blendMode == CPBlend.LM_PASSTHROUGH) {
            // Passthrough is not a meaningful blend mode for a single layer
            mergedLayer.blendMode = CPBlend.LM_NORMAL;
        }

        this.redo();
    }

    CPActionMergeGroup.prototype = Object.create(CPUndo.prototype);
    CPActionMergeGroup.prototype.constructor = CPActionMergeGroup;

    /**
     * Merge the top layer onto the under layer and remove the top layer.
     *
     * @param {CPImageLayer} topLayer
     * @constructor
     */
    function CPActionMergeDownLayer(topLayer) {
        var
            group = topLayer.parent,

            underLayer = group.layers[group.indexOf(topLayer) - 1],
            mergedLayer = new CPImageLayer(that.width, that.height, ""),

            fromMask = maskEditingMode;

        this.undo = function() {
            var
                mergedIndex = group.indexOf(mergedLayer);

            group.removeLayerAtIndex(mergedIndex);

            group.insertLayer(mergedIndex, topLayer);
            group.insertLayer(mergedIndex, underLayer);

            artworkStructureChanged();
            that.setActiveLayer(topLayer, fromMask);
        };

        this.redo = function() {
            mergedLayer.copyFrom(underLayer);
    
            if (topLayer.getEffectiveAlpha() > 0) {
                // Ensure base layer has alpha 100, and apply its mask, ready for blending
                if (mergedLayer.mask) {
                    CPBlend.multiplyAlphaByMask(mergedLayer.image, mergedLayer.alpha, mergedLayer.mask);
                    mergedLayer.mask = null;
                } else {
                    CPBlend.multiplyAlphaBy(mergedLayer.image, mergedLayer.alpha);
                }
                mergedLayer.alpha = 100;
    
                CPBlend.fuseImageOntoImage(mergedLayer.image, true, topLayer.image, topLayer.alpha, topLayer.blendMode, topLayer.getBounds(), topLayer.mask);
            }
            
            var
                underIndex = group.indexOf(underLayer);

            // Remove both of the layers to be merged
            group.removeLayerAtIndex(underIndex);
            group.removeLayerAtIndex(underIndex);

            // And put our new one in its place
            group.insertLayer(underIndex, mergedLayer);

            artworkStructureChanged();
            that.setActiveLayer(mergedLayer, false);
        };

        this.getMemoryUsed = function(undone, param) {
            return undone ? 0 : topLayer.getMemoryUsed() + mergedLayer.getMemoryUsed();
        };

        this.redo();
    }
    
    CPActionMergeDownLayer.prototype = Object.create(CPUndo.prototype);
    CPActionMergeDownLayer.prototype.constructor = CPActionMergeDownLayer;

    function CPActionMergeAllLayers() {
        var 
            oldActiveLayer = that.getActiveLayer(),
            oldRootLayers = layersRoot.layers.slice(0), // Clone old layers array
            flattenedLayer = new CPImageLayer(that.width, that.height, "");

        this.undo = function() {
            layersRoot.layers = oldRootLayers.slice(0);

            artworkStructureChanged();
            that.setActiveLayer(oldActiveLayer, false);
        };

        this.redo = function() {
            var
                oldFusion = that.fusionLayers();

            flattenedLayer.copyImageFrom(oldFusion);

            layersRoot.clearLayers();

            // Generate the name after the document is empty (so it can be "Layer 1")
            flattenedLayer.setName(that.getDefaultLayerName(false));

            layersRoot.addLayer(flattenedLayer);

            artworkStructureChanged();
            that.setActiveLayer(flattenedLayer, false);
        };

        this.getMemoryUsed = function(undone, param) {
            return oldRootLayers.map(layer => layer.getMemoryUsed()).reduce(sum, 0);
        };

        this.redo();
    }
    
    CPActionMergeAllLayers.prototype = Object.create(CPUndo.prototype);
    CPActionMergeAllLayers.prototype.constructor = CPActionMergeAllLayers;

    /**
     * Move the layer to the given index in the given group, releasing the layer clip if appropriate.
     *
     * @param {CPLayer} layer - The layer to move
     * @param {CPLayerGroup} toGroup - The group to move it to
     * @param {?CPLayer} toBelowLayer - The layer to insert the layer underneath, or null to insert at the top of the group.
     */
    function relocateLayerInternal(layer, toGroup, toBelowLayer) {
        const
            fromGroup = layer.parent,
            fromBelowLayer = fromGroup.layers[fromGroup.indexOf(layer) + 1],
            wasClippedTo = layer instanceof CPImageLayer ? layer.getClippingBase() : null;

        // Do we need to release the clip of the layer that was above us?
        if (fromBelowLayer instanceof CPImageLayer && fromBelowLayer.getClippingBase() == layer) {
            fromBelowLayer.clip = false;
        }

        layer.parent.removeLayer(layer);

        var
            destIndex = toGroup.indexOf(toBelowLayer);

        toGroup.insertLayer(destIndex == -1 ? toGroup.layers.length : destIndex, layer);

        if (layer instanceof CPImageLayer) {
            /*
             * Release the layer clip if we move the layer somewhere it won't be clipped onto its original base
             */
            if (wasClippedTo && layer.getClippingBase() != wasClippedTo) {
                layer.clip = false;
            }

            // If we're moving into the middle of a new clipping group, join the clip
            if (toBelowLayer instanceof CPImageLayer && toBelowLayer.clip) {
                layer.clip = true;
            }
        } else {
            // If we move a group into the middle of a clipping group, release the clip of the layer above
            if (toBelowLayer instanceof CPImageLayer && toBelowLayer.clip) {
                toBelowLayer.clip = false;
            }
        }
    }

	/**
     * Move the layer to the given position in the layer tree.
     *
     * @param {CPLayer} layer
     * @param {CPLayerGroup} toGroup - The group that the layer will be a child of after moving
     * @param {int} toIndex - The index inside the destination group that the layer will have after moving
     * @constructor
     */
    function CPActionRelocateLayer(layer, toGroup, toIndex) {
        const
            fromGroup = layer.parent,
            fromMask = maskEditingMode,
            fromBelowLayer = fromGroup.layers[fromGroup.indexOf(layer) + 1],
            toBelowLayer = toGroup.layers[toIndex],
            wasToBelowLayerClipped = toBelowLayer instanceof CPImageLayer && toBelowLayer.clip,
            wasClipped = layer instanceof CPImageLayer && layer.clip,
            wasFromBelowLayerClipped = fromBelowLayer instanceof CPImageLayer && fromBelowLayer.clip;

        this.undo = function() {
            relocateLayerInternal(layer, fromGroup, fromBelowLayer);

            if (wasClipped) {
                layer.clip = true;
            }
            if (wasFromBelowLayerClipped) {
                fromBelowLayer.clip = true;
            }
            if (wasToBelowLayerClipped) {
                toBelowLayer.clip = true;
            }

            artworkStructureChanged();
            that.setActiveLayer(layer, fromMask);
        };

        this.redo = function() {
            relocateLayerInternal(layer, toGroup, toBelowLayer);

            // TODO if moving to a collapsed group, select the group rather than the layer
            artworkStructureChanged();
            that.setActiveLayer(layer, false);
        };

        this.redo();
    }
    
    CPActionRelocateLayer.prototype = Object.create(CPUndo.prototype);
    CPActionRelocateLayer.prototype.constructor = CPActionRelocateLayer;

    function generateLayerPropertyChangeAction(propertyName, invalidatesLayer) {
        propertyName = capitalizeFirst(propertyName);

        var
            ChangeAction = function(layers, newValue) {
                if (!Array.isArray(layers)) {
                    layers = [layers];
                }
                this.layers = layers;
                this.from = this.layers.map(layer => layer["get" + propertyName]());
                this.to = newValue;

                this.redo();
            };

        ChangeAction.prototype = Object.create(CPUndo.prototype);
        ChangeAction.prototype.constructor = ChangeAction;

        ChangeAction.prototype.undo = function () {
            this.layers.forEach((layer, index) => layer["set" + propertyName](this.from[index]));

            this.layers.forEach(layer => layerPropertyChanged(layer, !invalidatesLayer));
        };

        ChangeAction.prototype.redo = function () {
            this.layers.forEach(layer => layer["set" + propertyName](this.to));

            this.layers.forEach(layer => layerPropertyChanged(layer, !invalidatesLayer));
        };

        ChangeAction.prototype.merge = function (u) {
            if (u instanceof ChangeAction && arrayEquals(this.layers, u.layers)) {
                this.to = u.to;
                return true;
            }
            return false;
        };

        ChangeAction.prototype.noChange = function () {
            for (var i = 0; i < this.from.length; i++) {
                if (this.from[i] != this.to) {
                    return false;
                }
            }
            return true;
        };

        return ChangeAction;
    }

    var
        CPActionChangeLayerAlpha = generateLayerPropertyChangeAction("alpha", true),
        CPActionChangeLayerMode = generateLayerPropertyChangeAction("blendMode", true),
        CPActionChangeLayerName = generateLayerPropertyChangeAction("name", false),
        CPActionChangeLayerVisible = generateLayerPropertyChangeAction("visible", true),
        CPActionChangeLayerClip = generateLayerPropertyChangeAction("clip", true),
        CPActionChangeLayerMaskLinked = generateLayerPropertyChangeAction("maskLinked", true);
    
    /**
     * @param {CPRect} from
     * @param {CPRect} to
     */
    function CPUndoRectangleSelection(from, to) {
        from = from.clone();
        to = to.clone();

        this.undo = function() {
            that.setSelection(from);
            // TODO this is just because CPCanvas doesn't know when to repaint the selection box
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
            thisAction = this,

	        /**
             * @type {CPRect}
             */
            fromSelection = that.getSelection(),

            /**
             * The rectangle we transformed onto in a previous iteration.
             *
             * @type {CPRect}
             */
            dstRect = new CPRect(0, 0, 0, 0),

	        /**
             * A copy of the source rectangles from the original layers to use for Canvas drawing operations.
             *
             * @type {HTMLCanvasElement[]}
             */
            sourceRectCanvas = null,
	        /**
             * @type {CanvasRenderingContext2D[]}
             */
            sourceRectCanvasContext = null,

	        /**
             * A copy of the original layer within the undoDataRect
             *
             * @type {CPColorBmp[]}
             */
            undoData,

	        /**
             * The rectangle of the image that undoData represents
             * @type {CPRect}
             */
            undoDataRect,

	        /**
             * A canvas for composing the transform onto
             * @type {HTMLCanvasElement}
             */
            composeCanvas = null,

	        /**
             * @type {CanvasRenderingContext2D}
             */
            composeCanvasContext = null;

        affineTransform = affineTransform.clone();
        interpolation = interpolation || "smooth";

        function expand() {
            if (undoDataRect.getWidth() < that.width || undoDataRect.getHeight() < that.height) {
                /*
                 * We need a complete copy of the layer in undoData to support further redo(). (As we probably previously
                 * only made a backup copy of the areas we erased using the old transform).
                 */
                thisAction.undo();

                undoData = thisAction.imageLayers.map(layer => layer.image.clone());
                undoDataRect = that.getBounds();
            }
        }

        function buildTempCanvasesForRedo() {
            expand();

            if (!composeCanvas) {
                composeCanvas = document.createElement("canvas");

                composeCanvas.width = that.width;
                composeCanvas.height = that.height;

                composeCanvasContext = composeCanvas.getContext("2d");
                setCanvasInterpolation(composeCanvasContext, interpolation == "smooth");

                sourceRectCanvas = [];
                sourceRectCanvasContext = [];

                // Make a copy of just the source rectangles in their own canvases so we can transform them layer with Canvas APIs
                thisAction.imageLayers.forEach(function (layer) {
                    let
                        canvas = document.createElement("canvas"),
                        context = canvas.getContext("2d");

                    canvas.width = srcRect.getWidth();
                    canvas.height = srcRect.getHeight();
                    context.putImageData(layer.image.getImageData(), -srcRect.left, -srcRect.top, srcRect.left, srcRect.top, srcRect.getWidth(), srcRect.getHeight());

                    sourceRectCanvas.push(canvas);
                    sourceRectCanvasContext.push(context);
                });
            }
        }

        this.undo = function() {
            var
                invalidateRegion = dstRect.getUnion(srcRect),
                undoSrcRegion = invalidateRegion.getTranslated(-undoDataRect.left, -undoDataRect.top);

            this.imageLayers.forEach((layer, index) => layer.image.copyBitmapRect(undoData[index], invalidateRegion.left, invalidateRegion.top, undoSrcRegion));

            dstRect.makeEmpty();

            that.setSelection(fromSelection);
            that.setActiveLayer(this.layer);

            invalidateLayer(this.layer, invalidateRegion);

            /*
             * Required because in the case of a copy, we don't invalidate the source rect in the fusion, so the canvas
             * won't end up repainting the selection rectangle there.
             */
            callListenersSelectionChange();
        };

        this.redo = function() {
            buildTempCanvasesForRedo();

            var
                oldDstRect = dstRect.clone(),
                dstCorners = srcRect.toPoints();

            affineTransform.transformPoints(dstCorners);

            dstRect = CPRect.createBoundingBox(dstCorners);
            dstRect.roundContain().clipTo(that.getBounds());

            let
            // The region that'll be different from the undo state after this redo is applied.
                redoRect = srcRect.getUnion(dstRect),
            // The region which needs repainting (from the previous redo() and after our redo())
                invalidateRect = redoRect.getUnion(oldDstRect);

            this.imageLayers.forEach(function(layer, layerIndex) {
                /*
                 * Make a fresh copy of the undo into a Canvas to compose the transformed data onto, except the source
                 * region since we'll just be erasing that.
                 */
                let
                    undoImageData = undoData[layerIndex].getImageData();

                CPRect.subtract(dstRect, srcRect).forEach(rect => {
                    // The region inside undoData[] that the dstRect corresponds to
                    let
                        undoSrcRegion = rect.getTranslated(-undoDataRect.left, -undoDataRect.top);

                    composeCanvasContext.putImageData(undoImageData, undoDataRect.left, undoDataRect.top, undoSrcRegion.left, undoSrcRegion.top, undoSrcRegion.getWidth(), undoSrcRegion.getHeight());
                });

                // Erase the region we moved from
                composeCanvasContext.clearRect(srcRect.left, srcRect.top, srcRect.getWidth(), srcRect.getHeight());

                composeCanvasContext.save();

                // Apply the transform when drawing the transformed fragment
                composeCanvasContext.setTransform(
                    affineTransform.m[0], affineTransform.m[1], affineTransform.m[2],
                    affineTransform.m[3], affineTransform.m[4], affineTransform.m[5]
                );
                composeCanvasContext.drawImage(sourceRectCanvas[layerIndex], srcRect.left, srcRect.top);

                composeCanvasContext.restore();

                // Now apply this to the actual layer data

                // First erase the source area that won't be covered by the dest
                CPRect.subtract(srcRect, dstRect).forEach(rect => layer.image.clearRect(rect, EMPTY_LAYER_COLOR));

                // Now copy the transformed dest area from the canvas.
                layer.image.copyBitmapRect(
                    new CPColorBmp(composeCanvasContext.getImageData(dstRect.left, dstRect.top, dstRect.getWidth(), dstRect.getHeight())),
                    dstRect.left,
                    dstRect.top,
                    new CPRect(0, 0, dstRect.getWidth(), dstRect.getHeight())
                );

                /* Use the CPColorBmp undo data to erase any leftovers from the previous redo(). We do this
                 * instead of just copying from the canvas, since Canvas' getImageData/setImageData doesn't round-trip
                 * (due to premultiplied alpha on some browsers/systems) and we want to avoid damaging areas we don't
                 * need to touch.
                 */
                CPRect.subtract(oldDstRect, [dstRect, srcRect]).forEach(
                    rect => layer.image.copyBitmapRect(undoData[layerIndex], rect.left, rect.top, rect.getTranslated(-undoDataRect.left, -undoDataRect.top))
                );
            });

            invalidateLayer(this.imageLayers, invalidateRect);

            // Transform the selection rect to enclose the transformed selection
            if (!fromSelection.isEmpty()) {
                var
                    toSelectionPoints = fromSelection.toPoints(),
                    toSelectionRect;

                affineTransform.transformPoints(toSelectionPoints);

                toSelectionRect = CPRect.createBoundingBox(toSelectionPoints);
                toSelectionRect.roundNearest();

                that.setSelection(toSelectionRect);
                callListenersSelectionChange();
            }

            that.setActiveLayer(this.layer);
        };

        /**
         * Replace the transform with the given one.
         *
         * @param {CPTransform} _affineTransform
         */
        this.amend = function(_affineTransform) {
            expand();

            affineTransform = _affineTransform.clone();
            this.redo();
        };

        this.setInterpolation = function(newInterpolation) {
            if (newInterpolation != interpolation) {
                interpolation = newInterpolation;

                if (composeCanvasContext) {
                    setCanvasInterpolation(composeCanvasContext, interpolation == "smooth");
                }

                this.undo();
                this.redo();
            }
        };

        /**
         * Called when we're no longer the top operation in the undo stack, so that we can optimize for lower memory
         * usage instead of faster revision speed
         */
        this.compact = function() {
            // If we have a full undo, and we don't need very much area for undo, trim it to just the area we need
            if (undoDataRect.getWidth() == that.width && undoDataRect.getHeight() == that.height) {
                var
                    dirtyRect = srcRect.getUnion(dstRect);

                if (dirtyRect.getArea() * 2 < that.width * that.height) {
                    undoDataRect = dirtyRect;
                    undoData = undoData.map(image => image.cloneRect(undoDataRect));
                }
            }

            // Discard our temporary drawing canvases
            composeCanvas = null;
            composeCanvasContext = null;
            sourceRectCanvas = null;
            sourceRectCanvasContext = null;
        };

        this.getMemoryUsed = function(undone, param) {
            var
                result = undoData.map(image => image.getMemorySize()).reduce(sum, 0);

            if (composeCanvas) {
                result += composeCanvas.width * composeCanvas.height * 4;
            }
            if (sourceRectCanvas) {
                result += sourceRectCanvas.map(canvas => (canvas.width * canvas.height * 4)).reduce(sum, 0);
            }

            return result;
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

        this.layer = that.getActiveLayer();

        // Only transform image layers
        if (this.layer instanceof CPImageLayer) {
            this.imageLayers = [this.layer];
        } else if (this.layer instanceof CPLayerGroup) {
            this.imageLayers = this.layer.getLinearizedLayerList(false).filter(layer => layer instanceof CPImageLayer);
        } else {
            throw "Unsupported layer type in CPActionTransform command";
        }

        undoData = this.imageLayers.map(layer => layer.image.clone());
        undoDataRect = that.getBounds();

        this.redo();
    }

    CPActionTransformSelection.prototype = Object.create(CPUndo.prototype);
    CPActionTransformSelection.prototype.constructor = CPActionTransformSelection;

    /**
     * Upon creation, moves the currently selected region of the current layer by the given offset
     *
     * @param {CPRect} srcRect - Rectangle that will be moved
     * @param {int} offsetX
     * @param {int} offsetY
     * @param {boolean} copy - True if we should copy to the destination instead of move.
     * @constructor
     */
    function CPActionMoveSelection(srcRect, offsetX, offsetY, copy) {
        /**
         * The layer we're moving (which might be an image layer or a whole group of layers).
         *
         * @type {CPLayer}
         */
        this.layer = curLayer;

        const
            fromSelection = that.getSelection(),
            fromMaskMode = maskEditingMode,

            movingWholeLayer = srcRect.equals(that.getBounds()),
            movingImage = !maskEditingMode || movingWholeLayer && this.layer.maskLinked,
            movingMask = maskEditingMode || movingWholeLayer && this.layer.maskLinked;

        var
            dstRect = new CPRect(0, 0, 0, 0),

	        hasFullUndo = false;

        /**
         * @typedef {Object} LayerMoveInfo
         *
         * @property {CPLayer} layer
         * @property {boolean} moveImage
         * @property {boolean} moveMask
         *
         * We either have these full undos which cover the whole layer area:
         *
         * @property {?CPColorBmp} imageUndo
         * @property {?CPGreyBmp} maskUndo
         *
         * Or else we have these snippets which cover the source and destination rectangles only (and we drop dest if it
         * is contained within src!)
         *
         * @property {?CPColorBmp} imageSrcUndo
         * @property {?CPColorBmp} imageDestUndo
         * @property {?CPGreyBmp} maskSrcUndo
         * @property {?CPGreyBmp} maskDestUndo
         */

	    /**
         * Info about the layers we're moving.
         *
         * @type {LayerMoveInfo[]}
         */
        this.movingLayers = [];

        this.undo = function() {
            var
                invalidateRegion = dstRect.clone();

            if (!copy) {
                invalidateRegion.union(srcRect);
            }

            // Restore the image data in the src and dest rectangles
            this.movingLayers.forEach(function(layerInfo) {
                if (hasFullUndo) {
                    if (layerInfo.moveImage) {
                        layerInfo.layer.image.copyBitmapRect(layerInfo.imageUndo, invalidateRegion.left, invalidateRegion.top, invalidateRegion);
                    }
                    if (layerInfo.moveMask) {
                        layerInfo.layer.mask.copyBitmapRect(layerInfo.maskUndo, invalidateRegion.left, invalidateRegion.top, invalidateRegion);
                    }
                } else {
                    if (layerInfo.moveImage) {
                        layerInfo.layer.image.copyBitmapRect(layerInfo.imageSrcUndo, srcRect.left, srcRect.top, layerInfo.imageSrcUndo.getBounds());

                        if (layerInfo.imageDestUndo) {
                            layerInfo.layer.image.copyBitmapRect(layerInfo.imageDestUndo, dstRect.left, dstRect.top, layerInfo.imageDestUndo.getBounds());
                        }
                    }
                    if (layerInfo.moveMask) {
                        layerInfo.layer.mask.copyBitmapRect(layerInfo.maskSrcUndo, srcRect.left, srcRect.top, layerInfo.maskSrcUndo.getBounds());

                        if (layerInfo.maskDestUndo) {
                            layerInfo.layer.mask.copyBitmapRect(layerInfo.maskDestUndo, dstRect.left, dstRect.top, layerInfo.maskDestUndo.getBounds());
                        }
                    }
                }
            });

            that.setSelection(fromSelection);
            that.setActiveLayer(this.layer, fromMaskMode);

            invalidateLayer(this.movingLayers.map(layerInfo => layerInfo.layer), invalidateRegion, true, true);

            /*
             * FIXME Required because in the case of a copy, we don't invalidate the source rect in the fusion, so the canvas
             * won't end up repainting the selection rectangle there.
             */
            callListenersSelectionChange();
        };

        this.redo = function() {
            var
                invalidateRegion = new CPRect(0, 0, 0, 0);

            this.buildFullUndo();

            if (!copy) {
                // Erase the source region we're moving out of

                this.movingLayers.forEach(function(layerInfo) {
                    if (layerInfo.moveImage) {
                        layerInfo.layer.image.clearRect(srcRect, EMPTY_LAYER_COLOR);
                    }
                    if (layerInfo.moveMask) {
                        layerInfo.layer.mask.clearRect(srcRect, movingWholeLayer ? 0xFF : EMPTY_MASK_COLOR);
                    }
                });

                invalidateRegion.set(srcRect);
            }

            dstRect.set(srcRect);
            dstRect.translate(offsetX, offsetY);

            /* Note that while we could copy image data from the layer itself onto the layer (instead of sourcing that
             * data from the undo buffers), this would require that pasteAlphaRect do the right thing when source and
             * dest rectangles overlap, which it doesn't.
             */

            // This function clamps the rectangles to the bounds for us
            this.movingLayers.forEach(function(layerInfo) {
                if (layerInfo.moveImage) {
                    CPBlend.normalFuseImageOntoImageAtPosition(layerInfo.layer.image, layerInfo.imageUndo, dstRect.left, dstRect.top, srcRect);
                }
                if (layerInfo.moveMask) {
                    layerInfo.layer.mask.copyBitmapRect(layerInfo.maskUndo, dstRect.left, dstRect.top, srcRect);
                }
            });

            // Clip dest rectangle to the bounds so we can update the invalidateRegion accurately
            dstRect.clipTo(that.getBounds());

            invalidateRegion.union(dstRect);

            invalidateLayer(this.movingLayers.map(layerInfo => layerInfo.layer), invalidateRegion, true, true);

            if (!fromSelection.isEmpty()) {
                var
                    toSelection = fromSelection.clone();
                toSelection.translate(offsetX, offsetY);
                that.setSelection(toSelection);
                callListenersSelectionChange();
            }
        };

        this.buildFullUndo = function() {
            if (!hasFullUndo) {
                this.movingLayers.forEach(function(layerInfo) {
                    if (layerInfo.moveImage) {
                        layerInfo.imageUndo = layerInfo.layer.image.clone();
                    }
                    if (layerInfo.moveMask) {
                        layerInfo.maskUndo = layerInfo.layer.mask.clone();
                    }

                    layerInfo.imageSrcUndo = null;
                    layerInfo.imageDestUndo = null;
                    layerInfo.maskSrcUndo = null;
                    layerInfo.maskDestUndo = null;
                });

                hasFullUndo = true;
            }
        };

        /**
         * Move further by the given offset on top of the current offset.
         *
         * @param _offsetX {int}
         * @param _offsetY {int}
         */
        this.amend = function(_offsetX, _offsetY) {
            if (copy || !hasFullUndo) {
                this.undo();
            } else {
                /*
                 * We don't need to restore the image at the *source* location as a full undo would do, since
                 * we'll only erase that area again once we redo(). So just restore the data at the dest.
                 */
                this.movingLayers.forEach(function(layerInfo) {
                    if (layerInfo.moveImage) {
                        layerInfo.layer.image.copyBitmapRect(layerInfo.imageUndo, dstRect.left, dstRect.top, dstRect);
                    }
                    if (layerInfo.moveMask) {
                        layerInfo.layer.mask.copyBitmapRect(layerInfo.maskUndo, dstRect.left, dstRect.top, dstRect);
                    }
                });

                invalidateLayer(this.movingLayers.map(layerInfo => layerInfo.layer), dstRect, true, true);
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
            if (hasFullUndo && srcRect.getArea() * 2 < that.width * that.height) {
                // Replace our copy of the entire layer with just a copy of the areas we damaged
                var
                    needDestData = !dstRect.isInside(srcRect);

                this.movingLayers.forEach(function(layerInfo) {
                    // Save src and dest rectangles for undo
                    if (layerInfo.moveImage) {
                        layerInfo.imageSrcUndo = layerInfo.imageUndo.cloneRect(srcRect);
                        if (needDestData) {
                            layerInfo.imageDestUndo = layerInfo.imageUndo.cloneRect(dstRect);
                        }
                    }
                    if (layerInfo.moveMask) {
                        layerInfo.maskSrcUndo = layerInfo.maskUndo.cloneRect(srcRect);
                        if (needDestData) {
                            layerInfo.maskDestUndo = layerInfo.maskUndo.cloneRect(dstRect);
                        }
                    }

                    // Discard the full-size undos
                    layerInfo.imageUndo = null;
                    layerInfo.maskUndo = null;
                });

                hasFullUndo = false;
            }
        };

        this.getMemoryUsed = function(undone, param) {
            return this.movingLayers.map(function(layerInfo) {
                var
                    images = [layerInfo.imageUndo, layerInfo.maskUndo, layerInfo.imageSrcUndo, layerInfo.imageDestUndo, layerInfo.maskSrcUndo, layerInfo.maskDestUndo];

                return images.map(image => image ? image.getMemorySize() : 0).reduce(sum, 0);
            }).reduce(sum, 0);
        };

        srcRect = srcRect.clone(); // Don't damage the caller's srcRect

	    /**
         * A list of the layers we're moving, and their properties.
         *
         * @type {LayerMoveInfo[]}
         */
        this.movingLayers = [{
            layer: this.layer,
            moveImage: this.layer instanceof CPImageLayer && movingImage,
            moveMask: this.layer.mask != null && movingMask
        }];

        if (this.layer instanceof CPLayerGroup && movingImage) {
            // Moving the "image" of a group means to move all of its children
            if (movingWholeLayer && movingImage) {
                this.movingLayers = this.movingLayers.concat(this.layer.getLinearizedLayerList(false).map(layer => ({
                    layer: layer,
                    moveImage: layer instanceof CPImageLayer,
                    moveMask: layer.mask != null && layer.maskLinked
                })));
            }
        }

        this.redo();
    }

    CPActionMoveSelection.prototype = Object.create(CPUndo.prototype);
    CPActionMoveSelection.prototype.constructor = CPActionMoveSelection;

    /**
     * Cut the selected rectangle from the layer
     * 
     * @param {CPImageLayer} layer - Layer to cut from
     * @param {boolean} cutFromMask - True to cut from the mask of the layer, false to cut from the image
     * @param {CPRect} selection - The cut rectangle co-ordinates
     */
    function CPActionCut(layer, cutFromMask, selection) {
        var
            fromImage = cutFromMask ? layer.mask : layer.image,
            cutData = fromImage.cloneRect(selection);

        selection = selection.clone();

        this.undo = function() {
            fromImage.copyBitmapRect(cutData, selection.left, selection.top, cutData.getBounds());

            that.setActiveLayer(layer, cutFromMask);
            that.setSelection(selection);
            invalidateLayer(layer, selection, !cutFromMask, cutFromMask);
        };

        this.redo = function() {
            if (cutFromMask) {
                fromImage.clearRect(selection, EMPTY_MASK_COLOR);
            } else {
                fromImage.clearRect(selection, EMPTY_LAYER_COLOR);
            }

            clipboard = new CPClip(cutData, selection.left, selection.top);

            that.setActiveLayer(layer, cutFromMask);
            that.emptySelection();
            invalidateLayer(layer, selection, !cutFromMask, cutFromMask);
        };

        this.getMemoryUsed = function(undone, param) {
            return cutData == param ? 0 : cutData.getMemorySize();
        };

        this.redo();
    }
    
    CPActionCut.prototype = Object.create(CPUndo.prototype);
    CPActionCut.prototype.constructor = CPActionCut;

    /**
     * Paste the given clipboard onto the given layer.
     * 
     * @param {CPClip} clip
     * @param {CPLayer} oldLayer
     */
    function CPActionPaste(clip, oldLayer) {
        var
            oldSelection = that.getSelection(),
            oldMask = maskEditingMode,
            newLayer = new CPImageLayer(that.width, that.height, that.getDefaultLayerName(false)),
            parentGroup = oldLayer.parent;

        this.undo = function() {
            parentGroup.removeLayer(newLayer);

            that.setSelection(oldSelection);

            artworkStructureChanged();
            that.setActiveLayer(oldLayer, oldMask);
        };

        this.redo = function() {
            var
                layerIndex = parentGroup.indexOf(oldLayer),
                sourceRect = clip.bmp.getBounds(),
                x, y;

            parentGroup.insertLayer(layerIndex + 1, newLayer);

            if (sourceRect.isInside(that.getBounds())) {
                x = clip.x;
                y = clip.y;
            } else {
                x = ((that.width - clip.bmp.width) / 2) | 0;
                y = ((that.height - clip.bmp.height) / 2) | 0;
            }

            if (clip.bmp instanceof CPGreyBmp) {
                // Need to convert greyscale to color before we can paste
                var
                    clone = new CPColorBmp(clip.bmp.width, clip.bmp.height);

                clone.copyPixelsFromGreyscale(clip.bmp);

                newLayer.image.copyBitmapRect(clone, x, y, sourceRect);
            } else {
                newLayer.image.copyBitmapRect(clip.bmp, x, y, sourceRect);
            }

            that.emptySelection();

            artworkStructureChanged();
            that.setActiveLayer(newLayer, false);
        };

        this.getMemoryUsed = function(undone, param) {
            return clip.bmp == param ? 0 : clip.bmp.getMemorySize();
        };

        this.redo();
    }
    
    CPActionPaste.prototype = Object.create(CPUndo.prototype);
    CPActionPaste.prototype.constructor = CPActionPaste;

    paintingModes = [
        new CPBrushToolSimpleBrush(), new CPBrushToolEraser(), new CPBrushToolDodge(),
        new CPBrushToolBurn(), new CPBrushToolWatercolor(), new CPBrushToolBlur(), new CPBrushToolSmudge(),
        new CPBrushToolOil()
    ];

    this.width = _width;
    this.height = _height;
};

CPArtwork.prototype = Object.create(EventEmitter.prototype);
CPArtwork.prototype.constructor = CPArtwork;

CPArtwork.prototype.getBounds = function() {
    return new CPRect(0, 0, this.width, this.height);
};

CPArtwork.prototype.isPointWithin = function(x, y) {
    return x >= 0 && y >= 0 && x < this.width && y < this.height;
};