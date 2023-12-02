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

import CPImageLayer from "./CPImageLayer.js";
import CPLayerGroup from "./CPLayerGroup.js";
import CPBlend from "./CPBlend.js";
import "./CPBlendAdditional.js";
import CPGreyBmp from "./CPGreyBmp.js";
import CPBlendTree from "./CPBlendTree.js";
import CPMaskView from "./CPMaskView.js";
import CPColorBmp from "./CPColorBmp.js";
import CPBrushManager from "./CPBrushManager.js";
import CPBrushInfo from "./CPBrushInfo.js";
import CPUndo from "./CPUndo.js";
import CPClip from "./CPClip.js";

import CPColor from "../util/CPColor.js";
import CPRect from "../util/CPRect.js";
import CPRandom from "../util/CPRandom.js";
import CPTransform from "../util/CPTransform.js";
import {setCanvasInterpolation} from "../util/CPPolyfill.js";
import {createCanvas} from "../util/Canvas.js";

import EventEmitter from "wolfy87-eventemitter";
import {
    CPBrushTool,
    CPBrushToolBlur,
    CPBrushToolBurn,
    CPBrushToolDodge,
    CPBrushToolEraser,
    CPBrushToolOil,
    CPBrushToolSmudge,
    CPBrushToolWatercolor
} from "./CPBrushTool.js";

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

    for (let i = 0; i < a.length; i++) {
        if (a[i] != b[i]) {
            return false;
        }
    }

    return true;
}

/**
 * @param {HTMLCanvasElement} canvas
 * @returns {int}
 */
function memoryUsedByCanvas(canvas) {
    return canvas ? canvas.width * canvas.height * 4 : 0;
}

/**
 * Create a new empty artwork with the given dimensions.
 *
 * Note that an artwork with no layers is invalid, so you must call a routine like addBackgroundLayer(), addLayer(), or
 * addLayerObject() before calling any other routines.
 *
 * @param {int} _width
 * @param {int} _height
 * @constructor
 */
export default function CPArtwork(_width, _height) {
    
    _width = _width | 0;
    _height = _height | 0;
    
    const
        MAX_UNDO = 30,
        EMPTY_BACKGROUND_COLOR = 0xFFFFFFFF,
        EMPTY_MASK_COLOR = 0x00,
        EMPTY_LAYER_COLOR = 0x00FFFFFF,

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
        undoImage = new CPColorBmp(_width, _height),

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

        brushManager = new CPBrushManager(),

        that = this;

    let
        paintingModes = [],

	    /**
         * The currently selected layer (should never be null)
         *
         * @type {(CPImageLayer|CPLayerGroup)}
         */
        curLayer = layersRoot,

	    /**
         * True if we're editing the mask of the currently selected layer, false otherwise.
         *
         * @type {boolean}
         */
        maskEditingMode = false,

	    /**
         * If the user is viewing a single mask from the document, we cache the view of that here for later invalidation.
         *
         * @type {CPMaskView}
         */
        maskView = null,

        /**
         * Used by CPUndoPaint to keep track of the area of layer data that has been dirtied during a brush stroke
         * (or other drawing operation) and should be saved for later undo.
         */
        paintUndoArea = new CPRect(0, 0, 0, 0),

        hasUnsavedChanges = false,
        
        curSelection = new CPRect(0, 0, 0, 0),

        /**
         * Points to a buffer which represents all the layers merged together. Since this buffer might be an actual
         * layer from the image stack, you must not write to it through here (you'll damage the image).
         *
         * @type {CPColorBmp}
         */
        fusion = null,

        rnd = new CPRandom(),

        previewOperation = null,

        /**
         * @type {?CPClip}
         */
        clipboard = null,

        /**
         * @type {CPUndo[]}
         */
        undoList = [],

        /**
         * @type {CPUndo[]}
         */
        redoList = [],

	    /**
         * @type {?CPBrushInfo}
         */
        curBrush = null,

        lastX = 0.0, lastY = 0.0, lastPressure = 0.0,

        sampleAllLayers = false,

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
	
	    /**
         * @type {int}
         */
        curColor = 0x000000, // Black
        transformInterpolation = "smooth";

	/**
     * We use this routine to suppress the updating of a thumbnail while the user is still drawing.
     */
    function beginPaintingInteraction() {
        drawingInProgress = true;
    }
	
	/**
     *
     * @param {boolean} immediateUpdateOfThumbnail
     */
    function endPaintingInteraction(immediateUpdateOfThumbnail) {
        drawingInProgress = false;

        if (rebuildImageThumbnail.size > 0 || rebuildMaskThumbnail.size > 0) {
            if (immediateUpdateOfThumbnail) {
                buildThumbnails();
            } else if (!thumbnailRebuildTimer) {
                setTimeout(buildThumbnails, THUMBNAIL_REBUILD_DELAY_MSEC);
            }
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
     * @returns {CPRect}
     */
    this.getSelectionAutoSelect = function() {
        if (!curSelection.isEmpty()) {
            return this.getSelection();
        }

        return this.getBounds();
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

        invalidateUndoBuffers();

        callListenersUpdateRegion(that.getBounds());
    }

    /**
     * Notify listeners that the properties of the given layer has changed (opacity, blendMode, etc).
     *
     * @param {CPLayer} layer
	 * @param {string} propertyName
     * @param {boolean} noVisibleEffect - If true, notify listeners that the layer has changed but don't redraw anything.
     *                                    This is useful for properties like "expanded" and "name" which don't change the
     *                                    visual appearance of the layer on the canvas.
     */
    function layerPropertyChanged(layer, propertyName, noVisibleEffect) {
        that.emitEvent("changeLayer", [layer]);

        if (!noVisibleEffect) {
            blendTree.layerPropertyChanged(layer, propertyName);

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
     * @param {(CPLayer|CPLayer[])} layers - Layer or layers to invalidate
     * @param {CPRect} rect - Rect to invalidate. Must have all integer co-ordinates, and the rectangle must be contained
     * within the artwork bounds.
     * @param {boolean} invalidateImage - True if drawing happened on the layer's image data
     * @param {boolean} invalidateMask - True if drawing happened on the layer's mask
     */
    function invalidateLayer(layers, rect, invalidateImage, invalidateMask) {
        if (!Array.isArray(layers)) {
            layers = [layers];
        }

        layers.forEach(layer => blendTree.invalidateLayerRect(layer, rect));

        let
            newThumbToRebuild = false;

        if (invalidateImage) {
            // This updated area will need to be updated in our undo buffer later
            undoImageInvalidRegion.union(rect);

            // Invalidate changed thumbnails
            for (let layer of layers) {
                if (layer instanceof CPImageLayer) {
                    rebuildImageThumbnail.add(layer);
                    newThumbToRebuild = true;
                }
            }
        }

        if (invalidateMask) {
            undoMaskInvalidRegion.union(rect);

            layers.forEach(layer => {
                rebuildMaskThumbnail.add(layer);

                if (maskView && maskView.layer == layer) {
                    maskView.invalidateRect(rect);
                }
            });

            newThumbToRebuild = true;
        }

        // Update layer thumbnails
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
     * Can be null if selecting a group's "image".
     *
     * @returns {?CPColorBmp|CPGreyBmp}
     */
    function getActiveImage() {
        return maskEditingMode ? curLayer.mask : curLayer.image;
    }

    this.setHasUnsavedChanges = function(value) {
        if (value != hasUnsavedChanges) {
            hasUnsavedChanges = value;
            this.emitEvent("unsavedChanges", [value]);
        }
    };
    
    this.getHasUnsavedChanges = function() {
        return hasUnsavedChanges;
    };

    this.isAddLayerMaskAllowed = function() {
        return !curLayer.mask
    };

    /**
     * Add a layer mask to the current layer.
     */
    this.addLayerMask = function() {
        if (this.isAddLayerMaskAllowed()) {
            addUndo(new CPActionAddLayerMask(curLayer));
        }
    };

    this.isRemoveLayerMaskAllowed = function() {
        return curLayer.mask !== null;
    };

    this.removeLayerMask = function() {
        if (this.isRemoveLayerMaskAllowed()) {
            addUndo(new CPActionRemoveLayerMask(curLayer, false));
        }
    };

    this.isApplyLayerMaskAllowed = function() {
        return curLayer.mask !== null && curLayer instanceof CPImageLayer;
    };

    this.applyLayerMask = function(apply) {
        if (this.isApplyLayerMaskAllowed()) {
            addUndo(new CPActionRemoveLayerMask(curLayer, true));
        }
    };

    /**
     * Add a layer of the specified type (layer, group) on top of the current layer.
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

        // Select the layer if it's the first one in the document (so we can get a valid curLayer field)
        if (parent == layersRoot && layersRoot.layers.length == 1) {
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
        let
            children = [];

        // Grab our child layers off the stack and add them to us.
        for (let i = 0; i < numChildren; i++) {
            children.unshift(parent.layers.pop());
        }

        children.forEach(child => group.addLayer(child));

        this.addLayerObject(parent, group);
    };

    this.isRemoveLayerAllowed = function() {
        if (curLayer instanceof CPImageLayer) {
            return layersRoot.getLinearizedLayerList(false).some(layer => layer instanceof CPImageLayer && layer != curLayer);
        }
        if (curLayer instanceof CPLayerGroup) {
            return layersRoot.getLinearizedLayerList(false).some(layer => layer instanceof CPImageLayer && !layer.hasAncestor(curLayer));
        }

        return false;
    };

    /**
     * Remove the currently selected layer.
     * 
     * @return {boolean} True if the layer was removed, or false when removal failed because there would be no image
     * layers left in the document after deletion.
     */
    this.removeLayer = function() {
        if (this.isRemoveLayerAllowed()) {
            addUndo(new CPActionRemoveLayer(curLayer));

            return true;
        }

        return false;
    };

    this.duplicateLayer = function() {
        addUndo(new CPActionDuplicateLayer(curLayer));
    };

    this.isMergeDownAllowed = function() {
        let
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

    this.isMergeAllLayersAllowed = function() {
        return layersRoot.getLinearizedLayerList(false).length > 1;
    };

    this.mergeAllLayers = function() {
        if (this.isMergeAllLayersAllowed()) {
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
        if (layer && toGroup && layer != toGroup && !toGroup.hasAncestor(layer)) {
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

            layerPropertyChanged(group, "expanded", true);
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
	
	/**
     *
	 * @param {CPLayer} layer
	 * @param {boolean} visible
	 */
	this.setLayerMaskVisible = function(layer, visible) {
		if (layer.maskVisible != visible) {
			addUndo(new CPActionChangeLayerMaskVisible(layer, visible));
		}
	};

    this.setLayerBlendMode = function(blendMode) {
        if (curLayer.getBlendMode() != blendMode && (blendMode != CPBlend.LM_PASSTHROUGH || curLayer instanceof CPLayerGroup)) {
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

    /**
     * Paint a dab of paint to the canvas using the current brush.
     *
     * @param {number} x - Position of brush tip
     * @param {number} y - Position of brush tip
     * @param {number} pressure - Pen pressure (tablets).
     */
    this.paintDab = function(x, y, pressure) {
        curBrush.applyPressure(pressure);

        if (curBrush.scattering > 0.0) {
            x += rnd.nextGaussian() * curBrush.curScattering / 4.0;
            y += rnd.nextGaussian() * curBrush.curScattering / 4.0;
        }

        let
            brushTool = paintingModes[curBrush.brushMode],

            dab = brushManager.getDab(x, y, curBrush),

            brushRect = new CPRect(0, 0, dab.width, dab.height),
            imageRect = new CPRect(0, 0, dab.width, dab.height);

        imageRect.translate(dab.x, dab.y);

        that.getBounds().clipSourceDest(brushRect, imageRect);

        if (imageRect.isEmpty()) {
            // drawing entirely outside the canvas
            return;
        }

        paintUndoArea.union(imageRect);

        let
            destImage = maskEditingMode ? curLayer.mask : curLayer.image,
            sampleImage = sampleAllLayers && !maskEditingMode ? fusion : destImage;

        /* The brush will either paint itself directly to the image, or paint itself to the strokeBuffer and update
         * the strokedRegion (which will be merged to the image later by mergeStrokeBuffer(), perhaps in response
         * to a call to fusionLayers())
         */
        brushTool.paintDab(destImage, imageRect, sampleImage, curBrush, brushRect, dab, curColor);

        if (!maskEditingMode && brushTool.noMergePhase && curLayer.getLockAlpha()) {
            // This tool painted to the image during paintDab(), so we have to apply image alpha here instead of during merge
            restoreImageAlpha(destImage, imageRect);
        }

        if (brushTool.wantsOutputAsInput) {
            mergeStrokeBuffer();

            if (sampleAllLayers && !maskEditingMode) {
                that.fusionLayers();
            }
        }

        invalidateLayerPaint(curLayer, imageRect);
    };

    this.getDefaultLayerName = function(isGroup) {
        let
            prefix = isGroup ? "Group " : "Layer ",
            nameRegex = isGroup ? /^Group [0-9]+$/ : /^Layer [0-9]+$/,
            highestLayerNb = 0,
            layers = layersRoot.getLinearizedLayerList(false);
        
        for (let i = 0; i < layers.length; i++) {
            let
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
     * Merge the brushstroke buffer from the current drawing operation to the active layer.
     */
    function mergeStrokeBuffer() {
        if (!strokedRegion.isEmpty()) {
            if (maskEditingMode) {
                let
                    destMask = curLayer.mask;

                // Can't erase on masks, so just paint black instead
                if (curBrush.brushMode == CPBrushInfo.BRUSH_MODE_ERASE) {
                    paintingModes[CPBrushInfo.BRUSH_MODE_PAINT].mergeOntoMask(destMask, undoMask, 0xFF000000);
                } else {
                    paintingModes[curBrush.brushMode].mergeOntoMask(destMask, undoMask, curColor & 0xFF);
                }
            } else {
                let
                    destImage = curLayer.image,
                    lockAlpha = curLayer.getLockAlpha();

                if (curBrush.brushMode == CPBrushInfo.BRUSH_MODE_ERASE && lockAlpha) {
                    // We're erasing with locked alpha, so the only sensible thing to do is paint white...

                    // FIXME: it would be nice to be able to set the paper color
                    paintingModes[CPBrushInfo.BRUSH_MODE_PAINT].mergeOntoImage(destImage, undoImage, EMPTY_LAYER_COLOR);
                } else {
                    paintingModes[curBrush.brushMode].mergeOntoImage(destImage, undoImage, curColor);
                }

                if (lockAlpha) {
                    restoreImageAlpha(destImage, strokedRegion);
                }
            }

            strokedRegion.makeEmpty();
        }
    }

    function prepareForFusion() {
        // The current brush renders out its buffers to the layer stack for us
        mergeStrokeBuffer();

        blendTree.buildTree();
    }

    this.addBackgroundLayer = function() {
        let
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
        prepareForFusion();

        fusion = blendTree.blendTree().image;
        
        return fusion;
    };

	/**
     * Old ChibiPaint used a blending operator with a slightly different formula than us for blending onto opaque
     * canvases. We can fix this in two ways:
     *
     * default - If it looks like the original layer would have used the old Opaque Multiply algorithm, keep using that
     *           one, otherwise upgrade it to the new Multiply2 algorithm.
     *
     * bake - modify the pixels of Multiply layers in the document in order to bring their blended appearance to match what
     *        the old multiply algorithm would have produced.
     *
     *        The resulting artwork is not really editable, because the baked-in corrections will only look correct when
     *        the layers underneath the multiply layers are all the same as they originally were. Any change to layer
     *        opacities will also ruin the result.
     *
     * Either way, this must not be called on new (ChickenPaint 0.10 format) artworks.
     *
     * @param {?string} mode
	 */
	this.upgradeMultiplyLayers = function(mode) {
	    let
            layers = this.getLayersRoot().getLinearizedLayerList(false, []),
            lastMultiplyLayerIndex = -1;

	    for (let i = 0; i < layers.length; i++) {
	        let
                layer = layers[i];

			if (!(layer instanceof CPImageLayer) || layer.mask || layer.blendMode > CPBlend.LM_LAST_CHIBIPAINT) {
				throw new Error("Bad layer type during multiply upgrade");
			}

	        if (layer.blendMode === CPBlend.LM_MULTIPLY) {
	            lastMultiplyLayerIndex = i;
            }
        }

	    if (lastMultiplyLayerIndex !== -1) {
			let
				fusion = new CPColorBmp(this.width, this.height),
				hasTransparency = true, first = true,
				blendRect = this.getBounds();

			fusion.clearAll(blendRect, 0x00FFFFFF); // Transparent white

			for (let i = 0; i <= lastMultiplyLayerIndex; i++) {
			    let
                    layer = layers[i];

				if (!first) {
					hasTransparency = hasTransparency && fusion.hasAlphaInRect(blendRect);
				}

				if (layer.blendMode === CPBlend.LM_MULTIPLY) {
					switch (mode) {
                        case "bake":
							/* Don't make changes to hidden multiply layers, we won't support editing the resulting
							 * artwork to reveal these layers later anyway.
							 */
							if (!hasTransparency && layer.getEffectiveAlpha() > 0) {
								// The original drawing probably used the old Opaque blend mode, so let's fix it up
								if (layer.alpha === 100) {
									CPBlend.upgradeMultiplyOfOpaqueLayer(fusion, layer.image, 100, blendRect);
								} else {
									CPBlend.upgradeMultiplyOfTransparentLayer(fusion, layer.image, layer.alpha, blendRect);
								}
								layer.setBlendMode(CPBlend.LM_MULTIPLY2);
							}
							break;
						default:
							if (hasTransparency) {
                                /* The original drawing probably wouldn't have used the old Opaque blend mode for this layer,
                                 * so we can upgrade it.
                                 */
								layer.setBlendMode(CPBlend.LM_MULTIPLY2);
							}
					}
				}

                if (layer.getEffectiveAlpha() > 0) {
					first = false;
					CPBlend.fuseImageOntoImage(fusion, hasTransparency, layer.image, layer.alpha, layer.blendMode, blendRect, null);
				}
			}
		}
    };

    this.isCreateClippingMaskAllowed = function() {
        let
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

    this.isReleaseClippingMaskAllowed = function() {
        return curLayer instanceof CPImageLayer && curLayer.clip;
    };

    /**
     * Clip this layer to the one below, if it is not already clipped.
     */
    this.releaseClippingMask = function() {
        if (this.isReleaseClippingMaskAllowed()) {
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
        if (newLayer) {
	        // Ensure the mask really exists if we ask to select it
	        selectMask = newLayer.mask && selectMask;
	
	        let
		        editingModeChanged = selectMask != maskEditingMode;
	
	        if (curLayer != newLayer || editingModeChanged) {
		        let
			        oldLayer = curLayer;
		
		        curLayer = newLayer;
		        maskEditingMode = selectMask;
		
		        invalidateUndoBuffers();
		
		        this.emitEvent("changeActiveLayer", [oldLayer, newLayer, maskEditingMode]);
		
		        if (editingModeChanged) {
			        this.emitEvent("editModeChanged", [maskEditingMode ? CPArtwork.EDITING_MODE_MASK : CPArtwork.EDITING_MODE_IMAGE]);
		        }
		
		        if (maskView && maskView.layer == oldLayer) {
			        if (selectMask) {
				        maskView.setLayer(newLayer);
			        } else {
				        this.closeMaskView();
			        }
		        }
	        }
        }
    };

    this.closeMaskView = function() {
        maskView.close();
        maskView = null;
    };
    
    this.toggleMaskView = function() {
        if (maskView == null || !maskView.isOpen()) {
            if (curLayer.mask) {
                maskView = new CPMaskView(curLayer, mergeStrokeBuffer);
            } else {
                maskView = null;
            }
        } else {
            this.closeMaskView();
        }

        return maskView;
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
        return maskEditingMode && curLayer.mask || !maskEditingMode && curLayer instanceof CPImageLayer;
    };

	/**
     *
     * @returns {number}
     */
    this.getUndoMemoryUsed = function() {
        let
            total = 0;

        for (let redo of redoList) {
            total += redo.getMemoryUsed(true, null);
        }

        for (let undo of undoList) {
            total += undo.getMemoryUsed(false, null);
        }

        return total;
    };
    
    this.isUndoAllowed = function() {
        return undoList.length > 0;
    };

    this.isRedoAllowed = function() {
        return redoList.length > 0;
    };

    //
    // Undo / Redo
    //

    this.undo = function() {
        if (!this.isUndoAllowed()) {
            return;
        }
        
        this.setHasUnsavedChanges(true);
        
        let
            undo = undoList.pop();
        
        undo.undo();
        
        redoList.push(undo);
    };

    this.redo = function() {
        if (!this.isRedoAllowed()) {
            return;
        }
        
        this.setHasUnsavedChanges(true);

        let
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
        let
            bounds = that.getBounds();

        undoImageInvalidRegion.set(bounds);
        undoMaskInvalidRegion.set(bounds);
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
	
	/**
     *
	 * @param {CPUndo} undo
	 */
	function addUndo(undo) {
        that.setHasUnsavedChanges(true);

        if (redoList.length > 0) {
            redoList = [];
        }

        if (undoList.length === 0 || !undoList[undoList.length - 1].merge(undo)) {
            if (undoList.length >= MAX_UNDO) {
                undoList.shift();
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
        // Ensure we never have fractional coordinates in our selections:
        curSelection.roundNearest();
        curSelection.clipTo(this.getBounds());
    };

    this.emptySelection = function() {
        curSelection.makeEmpty();
    };
	
	/**
     * Flood fill the current layer using the current color at the given coordinates.
     *
	 * @param {int} x
	 * @param {int} y
	 */
	this.floodFill = function(x, y) {
        let
            target = getActiveImage();
        
        if (target) {
	        prepareForLayerPaintUndo();
	        paintUndoArea = this.getBounds();
	
	        target.floodFill(~~x, ~~y, curColor | 0xff000000);
	
	        addUndo(new CPUndoPaint());
	        invalidateLayerPaint(curLayer, this.getBounds());
        }
    };

    this.gradientFill = function(fromX, fromY, toX, toY, gradientPoints) {
        let
            r = this.getSelectionAutoSelect(),
            target = getActiveImage();

        if (target) {
	        prepareForLayerPaintUndo();
	        paintUndoArea = r.clone();
	
	        target.gradient(r, fromX, fromY, toX, toY, gradientPoints, false);
	
	        if (this.getLayerLockAlpha() && target instanceof CPColorBmp) {
		        restoreImageAlpha(target, r);
	        }
	
	        addUndo(new CPUndoPaint());
	        invalidateLayerPaint(curLayer, r);
        }
    };

	/**
     * Replace the pixels in the selection rectangle with the specified color.
     *
     * @param {int} color - ARGB color to fill with
     */
    this.fill = function(color) {
        let
            r = this.getSelectionAutoSelect(),
            target = getActiveImage();

        if (target) {
	        prepareForLayerPaintUndo();
	        paintUndoArea = r.clone();
	
	        target.clearRect(r, color);
	
	        addUndo(new CPUndoPaint());
	        invalidateLayerPaint(curLayer, r);
        }
    };

    this.clear = function() {
        if (maskEditingMode) {
            this.fill(EMPTY_MASK_COLOR);
        } else {
            this.fill(EMPTY_LAYER_COLOR);
        }
    };

	/**
     *
     * @param {boolean} horizontal
     */
    this.flip = function(horizontal) {
        let
            rect = this.getSelection(),

            flipWholeLayer = rect.isEmpty(),

            transformBoth = flipWholeLayer && curLayer instanceof CPImageLayer && curLayer.mask && curLayer.maskLinked,
            transformImage = (!maskEditingMode || transformBoth) && curLayer instanceof CPImageLayer,
            transformMask = (maskEditingMode || transformBoth) && curLayer.mask,

            routine = horizontal ? "copyRegionHFlip" : "copyRegionVFlip";

        if (!transformImage && !transformMask) {
            return;
        }
        
        if (flipWholeLayer) {
            rect = this.getBounds();
        }

        paintUndoArea = rect.clone();

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
        let
            r = this.getSelectionAutoSelect(),
	        target = getActiveImage();

        if (target) {
	        prepareForLayerPaintUndo();
	        paintUndoArea = r.clone();
	
	        target.fillWithNoise(r);
	
	        addUndo(new CPUndoPaint());
	        invalidateLayerPaint(curLayer, r);
        }
    };

    this.isColorNoiseAllowed = function() {
        return !this.isEditingMask() && this.isActiveLayerDrawable();
    };

	/**
     * We can only fill layer images with color noise (not masks)
     */
    this.colorNoise = function() {
        if (this.isColorNoiseAllowed()) {
            let
                r = this.getSelectionAutoSelect();

            prepareForLayerPaintUndo();
            paintUndoArea = r.clone();

            curLayer.image.fillWithColorNoise(r);

            addUndo(new CPUndoPaint(true, false));
            invalidateLayer(curLayer, r, true, false);
        }
    };
    
    this.invert = function() {
        let
            r = this.getSelectionAutoSelect(),
            target = getActiveImage();

        if (target) {
	        prepareForLayerPaintUndo();
	        paintUndoArea = r.clone();
	
	        target.invert(r);
	
	        addUndo(new CPUndoPaint());
	        invalidateLayerPaint(curLayer, r);
        }
    };
	
	/**
     *
	 * @param {int} radiusX
	 * @param {int} radiusY
	 * @param {int} iterations
	 */
	this.boxBlur = function(radiusX, radiusY, iterations) {
        let
            r = this.getSelectionAutoSelect(),
            target = getActiveImage();

        if (target) {
	        prepareForLayerPaintUndo();
	        paintUndoArea = r.clone();
	
	        for (let i = 0; i < iterations; i++) {
		        target.boxBlur(r, radiusX, radiusY);
	        }
	
	        addUndo(new CPUndoPaint());
	        invalidateLayerPaint(curLayer, r);
        }
    };
    
    this.rectangleSelection = function(r) {
        let
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

        let
            activeOp = getActiveOperation();

        // If we've changed layers since our last move, we want to move the new layer, not the old one, so can't amend
        if (!copy && activeOp instanceof CPActionMoveSelection && activeOp.layer == this.getActiveLayer()) {
            activeOp.amend(offsetX, offsetY);
            redoList = [];
            this.setHasUnsavedChanges(true);
        } else {
            let
                action = new CPActionMoveSelection(offsetX, offsetY, copy);
            
            addUndo(action);
            
            action.redo();
        }
    };

    /**
     * Change the interpolation mode used by Free Transform operations
     *
     * @param {string} interpolation - Either "sharp" or "smooth"
     */
    this.setTransformInterpolation = function(interpolation) {
        transformInterpolation = interpolation;
        if (previewOperation instanceof CPActionAffineTransformSelection) {
            previewOperation.setInterpolation(interpolation);
        }
    };

	/**
     * If the current operation is an affine transform, roll it back and remove it from the undo history.
     */
    this.transformAffineAbort = function() {
        if (previewOperation instanceof CPActionAffineTransformSelection) {
            previewOperation.undo();
            previewOperation = null;
            endPaintingInteraction(true);
        }
    };

	/**
     * Begins transforming the current selection/layer, and returns the initial source rectangle and initial transform.
     * You can update the transform by calling transformAffineAmend().
     * 
     * You must call transformAffineFinish() or transformAffineAbort() to finish the transformation.
     * 
     * Returns null if the current selection/layer doesn't contain any non-transparent pixels, and doesn't start
     * transforming.
     */
    this.transformAffineBegin = function() {
        // Are we already transforming? Continue that instead
        if (previewOperation instanceof CPActionAffineTransformSelection) {
            return {transform: previewOperation.getTransform(), rect: previewOperation.getInitialTransformRect(), selection: previewOperation.getInitialSelectionRect()};
        }

        let
            initialTransform = new CPTransform(),
            operation;

        /* If we introduce other previewOperations, we might want to check we aren't overwriting them here...
         * Though probably ChickenPaint's global exclusive mode will enforce this for us.
         */
        operation = new CPActionAffineTransformSelection(initialTransform, transformInterpolation);

        if (operation.getInitialTransformRect().isEmpty()) {
            // Tried to transform a selection which contained no pixels
            return null;
        }
            
        previewOperation = operation;
        
        // No need for an initial .redo() since the transform is the identity
        
        beginPaintingInteraction();

        return {transform: initialTransform, rect: operation.getInitialTransformRect(), selection: operation.getInitialSelectionRect()};
    };

	/**
     * Finish and save the transform that is currently in progress.
     */
    this.transformAffineFinish = function() {
        if (previewOperation instanceof CPActionAffineTransformSelection) {
            addUndo(previewOperation);
            previewOperation = null;
            endPaintingInteraction(true);
        }
    };

    /**
     * Transform the currently selected layer data using the given AffineTransform.
     *
     * @param {CPTransform} affineTransform
     */
    this.transformAffineAmend = function(affineTransform) {
        if (previewOperation instanceof CPActionAffineTransformSelection) {
            previewOperation.amend(affineTransform);
        }
    };
    
    // Copy/Paste functions
    this.isCutSelectionAllowed = function() {
        return !this.getSelection().isEmpty() && getActiveImage() !== null;
    };

    this.isCopySelectionAllowed = this.isCutSelectionAllowed;

    this.cutSelection = function() {
        if (this.isCutSelectionAllowed()) {
            addUndo(new CPActionCut(curLayer, maskEditingMode, this.getSelection()));
        }
    };

    this.copySelection = function() {
        if (this.isCopySelectionAllowed()) {
	        let
		        selection = that.getSelection(),
		        image = getActiveImage();
	        
            clipboard = new CPClip(image.cloneRect(selection), selection.left, selection.top);
        }
    };

    this.isCopySelectionMergedAllowed = function() {
        return !this.getSelection().isEmpty()
    };

    this.copySelectionMerged = function() {
        if (this.isCopySelectionMergedAllowed()) {
            let
                selection = that.getSelection();

            clipboard = new CPClip(this.fusionLayers().cloneRect(selection), selection.left, selection.top);
        }
    };

    this.isPasteClipboardAllowed = function() {
        return !this.isClipboardEmpty();
    };

    this.pasteClipboard = function() {
        if (this.isPasteClipboardAllowed()) {
            addUndo(new CPActionPaste(clipboard));
        }
    };
	
	/**
     *
     * @returns {CPClip}
     */
    this.getClipboard = function() {
        return clipboard;
    };
    
    /*
     * @param {CPClip} clipboard
     */
    this.setClipboard = function(newClipboard) {
        clipboard = newClipboard;
    };
    
    this.isClipboardEmpty = function() {
        return clipboard == null;
    };

    this.setSampleAllLayers = function(b) {
        sampleAllLayers = b;
    };
    
    this.getLayerLockAlpha = function() {
        return this.getActiveLayer().getLockAlpha();
    };
    
    this.setLayerLockAlpha = function(lock) {
        if (curLayer.getLockAlpha() != lock) {
            addUndo(new CPActionChangeLayerLockAlpha(curLayer, lock));
        }
    };
	
	/**
     * @param {int} color - RGB color
     */
    this.setForegroundColor = function(color) {
        curColor = color;
    };
    
    this.setBrush = function(brush) {
        curBrush = brush;
    };
    
    this.setBrushTexture = function(texture) {
        brushManager.setTexture(texture);
    };
	
	/**
     * Start a painting operation.
     *
	 * @param {float} x
	 * @param {float} y
	 * @param {float} pressure
	 * @returns {boolean} - true if the painting began successfully, false otherwise (don't call continueStroke or endStroke!)
	 */
    this.beginStroke = function(x, y, pressure) {
        if (curBrush === null || !this.isActiveLayerDrawable()) {
            return false;
        }

        prepareForLayerPaintUndo();
        paintUndoArea.makeEmpty();

        strokeBuffer.clearAll(0);
        strokedRegion.makeEmpty();

        lastX = x;
        lastY = y;
        lastPressure = pressure;

        beginPaintingInteraction();

        paintingModes[curBrush.brushMode].beginStroke();

        this.paintDab(x, y, pressure);
        
        return true;
    };

    this.continueStroke = function(x, y, pressure) {
        if (curBrush == null) {
            return;
        }

        let
            dist = Math.sqrt(((lastX - x) * (lastX - x) + (lastY - y) * (lastY - y))),
            spacing = Math.max(curBrush.minSpacing, curBrush.curSize * curBrush.spacing);

        if (dist > spacing) {
            let
                nx = lastX, ny = lastY, np = lastPressure,
                df = (spacing - 0.001) / dist;

            for (let f = df; f <= 1.0; f += df) {
                nx = f * x + (1.0 - f) * lastX;
                ny = f * y + (1.0 - f) * lastY;
                np = f * pressure + (1.0 - f) * lastPressure;
                this.paintDab(nx, ny, np);
            }
            lastX = nx;
            lastY = ny;
            lastPressure = np;
        }
    };

    this.endStroke = function() {
        if (curBrush == null) {
            return;
        }

        mergeStrokeBuffer();

        paintingModes[curBrush.brushMode].endStroke();

        paintUndoArea.clipTo(this.getBounds());

        // Did we end up painting anything?
        if (!paintUndoArea.isEmpty()) {
            addUndo(new CPUndoPaint());

            /* Eagerly update the undo buffer for next time so we can avoid this lengthy
             * prepare at the beginning of a paint stroke
             */
            prepareForLayerPaintUndo();
        }

        endPaintingInteraction(false);
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
     * Get the artwork as a single flat PNG image.
     *
     * Rotation is [0..3] and selects a multiple of 90 degrees of clockwise rotation to be applied to the drawing before
     * saving.
     *
     * @return {Buffer}
     */
    this.getFlatPNGBuffer = function(rotation) {
        this.fusionLayers();

        return fusion.getAsPNGBuffer(rotation);
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

        let
            rect = paintUndoArea.clone(),

            xorImage = paintedImage ? undoImage.copyRectXOR(curLayer.image, rect) : null,
            xorMask = paintedMask ? undoMask.copyRectXOR(curLayer.mask, rect) : null;
        
        this.layer = curLayer;

        paintUndoArea.makeEmpty();

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
        let
            oldMaskLinked = layer.maskLinked,
            oldMaskVisible = layer.maskVisible;
        
        this.undo = function() {
            layer.setMask(null);
	
	        layer.maskLinked = oldMaskLinked;
	        layer.maskVisible = oldMaskVisible;
	
	        artworkStructureChanged();

            that.setActiveLayer(layer, false);
        };

        this.redo = function() {
            let
                newMask = new CPGreyBmp(that.width, that.height, 8);
            
            newMask.clearAll(255);

            layer.maskLinked = true;
            layer.maskVisible = true;
            
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
        let
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

            let
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
        let
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

            let
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
        let
            oldGroup = layer.parent,
            oldIndex = oldGroup.indexOf(layer),
            oldMask = maskEditingMode,

            numLayersClippedAbove = 0;

        if (layer instanceof CPImageLayer && !layer.clip) {
            for (let i = oldIndex + 1; i < oldGroup.layers.length; i++) {
                if (oldGroup.layers[i] instanceof CPImageLayer && oldGroup.layers[i].clip) {
                    numLayersClippedAbove++;
                } else {
                    break;
                }
            }
        }
        this.undo = function() {
            oldGroup.insertLayer(oldIndex, layer);

            for (let i = 0; i < numLayersClippedAbove; i++) {
                oldGroup.layers[i + oldIndex + 1].clip = true;
            }

            artworkStructureChanged();
            that.setActiveLayer(layer, oldMask);
        };

        this.redo = function() {
            // Release the clip of any layers who had us as their clipping root
            for (let i = 0; i < numLayersClippedAbove; i++) {
                oldGroup.layers[i + oldIndex + 1].clip = false;
            }

            oldGroup.removeLayerAtIndex(oldIndex);

            let
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
        let
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

        let
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
        let
            group = topLayer.parent,

            underLayer = group.layers[group.indexOf(topLayer) - 1],
            mergedLayer = new CPImageLayer(that.width, that.height, ""),

            fromMask = maskEditingMode;

        this.undo = function() {
            let
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
            
            let
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
        let 
            oldActiveLayer = that.getActiveLayer(),
            oldRootLayers = layersRoot.layers.slice(0), // Clone old layers array
            flattenedLayer = new CPImageLayer(that.width, that.height, "");

        this.undo = function() {
            layersRoot.layers = oldRootLayers.slice(0);

            artworkStructureChanged();
            that.setActiveLayer(oldActiveLayer, false);
        };

        this.redo = function() {
            let
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
     * Move the layer to the given position in the layer tree.
     *
     * @param {CPLayer} layer
     * @param {CPLayerGroup} toGroup - The group that the layer will be a child of after moving
     * @param {int} toIndex - The index of the layer inside the destination group that the layer will be below after the
     *                        move.
     * @constructor
     */
    function CPActionRelocateLayer(layer, toGroup, toIndex) {
        const
            fromGroup = layer.parent,
            fromIndex = layer.parent.indexOf(layer),
            fromMask = maskEditingMode,
            fromBelowLayer = fromGroup.layers[fromGroup.indexOf(layer) + 1],
            toBelowLayer = toGroup.layers[toIndex],
            wasClipped = layer instanceof CPImageLayer && layer.clip,
            wasClippedTo = wasClipped ? layer.getClippingBase() : false;

        let
            fromNumLayersClippedAbove = 0,
            toNumLayersClippedAbove = 0;

        if (layer instanceof CPImageLayer && !layer.clip) {
            // Release the clip of any layers that had us as their clipping root
            for (let i = fromIndex + 1; i < fromGroup.layers.length; i++) {
                if (fromGroup.layers[i] instanceof CPImageLayer && fromGroup.layers[i].clip) {
                    fromNumLayersClippedAbove++;
                } else {
                    break;
                }
            }
        } else if (layer instanceof CPLayerGroup) {
            // If we move a group into the middle of a clipping group, release the clip of the layers above
            for (let i = toIndex; i < toGroup.layers.length; i++) {
                if (toGroup.layers[i] instanceof CPImageLayer && toGroup.layers[i].clip) {
                    toNumLayersClippedAbove++;
                } else {
                    break;
                }
            }
        }

        this.undo = function() {
            layer.parent.removeLayer(layer);

            let
                newIndex = fromBelowLayer ? fromGroup.indexOf(fromBelowLayer) : fromGroup.layers.length;

            fromGroup.insertLayer(newIndex, layer);

            if (layer instanceof CPImageLayer) {
                layer.clip = wasClipped;
            }

            for (let i = 0; i < fromNumLayersClippedAbove; i++) {
                fromGroup.layers[i + fromIndex + 1].clip = true;
            }

            for (let i = 0; i < toNumLayersClippedAbove; i++) {
                toGroup.layers[i + toIndex].clip = true;
            }

            artworkStructureChanged();
            that.setActiveLayer(layer, fromMask);
        };

        this.redo = function() {
            for (let i = 0; i < fromNumLayersClippedAbove; i++) {
                fromGroup.layers[i + fromIndex + 1].clip = false;
            }

            layer.parent.removeLayer(layer);

            let
                newIndex = toBelowLayer ? toGroup.indexOf(toBelowLayer) : toGroup.layers.length;

            toGroup.insertLayer(newIndex, layer);

            for (let i = 0; i < toNumLayersClippedAbove; i++) {
                toGroup.layers[i + newIndex + 1].clip = false;
            }

            if (layer instanceof CPImageLayer) {
                /*
                 * Release the layer clip if we move the layer somewhere it won't be clipped onto its original base
                 */
                if (layer.clip && layer.getClippingBase() != wasClippedTo) {
                    layer.clip = false;
                }

                // If we're moving into the middle of a new clipping group, join the clip
                if (toBelowLayer instanceof CPImageLayer && toBelowLayer.clip) {
                    layer.clip = true;
                }
            }

            for (let i = 0; i < toNumLayersClippedAbove; i++) {
                toGroup.layers[i + newIndex + 1].clip = false;
            }

            artworkStructureChanged();
            
            // TODO if moving to a collapsed group, select the group rather than the layer
            that.setActiveLayer(layer, false);
        };

        this.redo();
    }
    
    CPActionRelocateLayer.prototype = Object.create(CPUndo.prototype);
    CPActionRelocateLayer.prototype.constructor = CPActionRelocateLayer;

    /**
     * @param {string} propertyName
     * @param {boolean} invalidatesLayer
     *
     * @returns {typeof CPUndo}
     */
    function generateLayerPropertyChangeAction(propertyName, invalidatesLayer) {
        let
			capitalPropertyName = capitalizeFirst(propertyName),

            ChangeAction = function(layers, newValue) {
                if (!Array.isArray(layers)) {
                    layers = [layers];
                }
                this.layers = layers;
                this.from = this.layers.map(layer => layer["get" + capitalPropertyName]());
                this.to = newValue;

                this.redo();
            };

        ChangeAction.prototype = Object.create(CPUndo.prototype);
        ChangeAction.prototype.constructor = ChangeAction;

        ChangeAction.prototype.undo = function () {
            this.layers.forEach((layer, index) => layer["set" + capitalPropertyName](this.from[index]));

            this.layers.forEach(layer => layerPropertyChanged(layer, propertyName, !invalidatesLayer));
        };

        ChangeAction.prototype.redo = function () {
            this.layers.forEach(layer => layer["set" + capitalPropertyName](this.to));

            this.layers.forEach(layer => layerPropertyChanged(layer, propertyName, !invalidatesLayer));
        };

        ChangeAction.prototype.merge = function (u) {
            if (u instanceof ChangeAction && arrayEquals(this.layers, u.layers)) {
                this.to = u.to;
                return true;
            }
            return false;
        };

        ChangeAction.prototype.noChange = function () {
            for (let i = 0; i < this.from.length; i++) {
                if (this.from[i] != this.to) {
                    return false;
                }
            }
            return true;
        };

        return ChangeAction;
    }

    let
        CPActionChangeLayerAlpha = generateLayerPropertyChangeAction("alpha", true),
        CPActionChangeLayerMode = generateLayerPropertyChangeAction("blendMode", true),
        CPActionChangeLayerVisible = generateLayerPropertyChangeAction("visible", true),
        CPActionChangeLayerClip = generateLayerPropertyChangeAction("clip", true),
	    CPActionChangeLayerMaskVisible = generateLayerPropertyChangeAction("maskVisible", true),
	
	    CPActionChangeLayerName = generateLayerPropertyChangeAction("name", false),
	    CPActionChangeLayerLockAlpha = generateLayerPropertyChangeAction("lockAlpha", false),
        CPActionChangeLayerMaskLinked = generateLayerPropertyChangeAction("maskLinked", false);
    
    /**
     * @param {CPRect} from
     * @param {CPRect} to
     *
     * @constructor
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

    class CPActionTransformSelection extends CPUndo {
        
        constructor() {
            super();
        
            /**
             * The layer we're moving (which might be an image layer or a whole group of layers).
             *
             * @type {CPLayer}
             */
            this.layer = curLayer;
        
            /**
             * @type {CPRect}
             */
            this.fromSelection = that.getSelection();
            this.fromMaskMode = maskEditingMode;
        
            this.movingWholeLayer = this.fromSelection.isEmpty();
        
            this.movingImage = !maskEditingMode || this.movingWholeLayer && this.layer.maskLinked;
            this.movingMask = maskEditingMode || this.movingWholeLayer && this.layer.maskLinked;
        
            this.hasFullUndo = false;
        
            /**
             * Set to true for transformations which will clear the pixels of the source rectangle (i.e. moves)
             * @type {boolean}
             */
            this.erasesSourceRect = false;
        
            /**
             * The rectangle we transformed onto in a previous iteration.
             *
             * @type {CPRect}
             */
            this.dstRect = new CPRect(0, 0, 0, 0);
        
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
             * Or else we have this map from rectangles to images which cover the dirtied areas only.
             *
             * @property {Map} imageRect
             * @property {Map} maskRect
             */
        
            /**
             * A list of the layers we're moving, and their properties.
             *
             * @type {LayerMoveInfo[]}
             */
            this.movingLayers = [{
                layer: this.layer,
                moveImage: this.layer instanceof CPImageLayer && this.movingImage,
                moveMask: this.layer.mask !== null && this.movingMask,
                imageRect: new Map(),
                maskRect: new Map()
            }];
	
	        // Moving the "image" of a group means to move all of its children
	        if (this.layer instanceof CPLayerGroup && this.movingImage && this.movingWholeLayer) {
                this.movingLayers = this.movingLayers.concat(this.layer.getLinearizedLayerList(false).map(layer => ({
                    layer: layer,
                    moveImage: layer instanceof CPImageLayer,
                    moveMask: layer.mask !== null && layer.maskLinked,
                    imageRect: new Map(),
                    maskRect: new Map()
                })));
            }
    
            // Only need to transform the non-transparent pixels
            let
                occupiedSpace = new CPRect(0, 0, 0, 0);
    
            if (this.movingWholeLayer) {
                /**
                 * @type {CPRect}
                 */
                this.srcRect = that.getBounds();
                
                for (let i = 0; i < this.movingLayers.length && !occupiedSpace.equals(this.srcRect); i++) {
                    let 
                        layerInfo = this.movingLayers[i];
                    
                    if (layerInfo.moveMask) {
                        // Find the non-white pixels, since we'll be erasing the moved area with white
                        occupiedSpace.union(layerInfo.layer.mask.getValueBounds(this.srcRect, 0xFF));
                    }
                    
                    if (layerInfo.moveImage) {
                        occupiedSpace.union(layerInfo.layer.image.getNonTransparentBounds(this.srcRect));
                    }
                }
            } else {
                this.srcRect = this.fromSelection.clone();
    
                for (let i = 0; i < this.movingLayers.length && !occupiedSpace.equals(this.srcRect); i++) {
                    let
                        layerInfo = this.movingLayers[i];
        
                    if (layerInfo.moveMask) {
                        // Find the non-black pixels, since we'll be erasing the moved area with black
                        occupiedSpace.union(layerInfo.layer.mask.getValueBounds(this.srcRect, 0x00));
                    }
        
                    if (layerInfo.moveImage) {
                        occupiedSpace.union(layerInfo.layer.image.getNonTransparentBounds(this.srcRect));
                    }
                }
            }
    
            this.srcRect = occupiedSpace;
        }
        
	    /**
         * @override
         */
        undo() {
            let
                // The region we're repainting for undo
                restoreRegions = [];
            
            if (!this.dstRect.isEmpty()) {
                restoreRegions.push(this.dstRect);
            }
            
            if (this.erasesSourceRect) {
                restoreRegions.push(this.srcRect);
                restoreRegions = CPRect.union(restoreRegions);
            }

            this.movingLayers.forEach(layerInfo => {
                if (this.hasFullUndo) {
                    restoreRegions.forEach(region => {
                        if (layerInfo.moveImage) {
                            layerInfo.layer.image.copyBitmapRect(layerInfo.imageUndo, region.left, region.top, region);
                        }
                        if (layerInfo.moveMask) {
                            layerInfo.layer.mask.copyBitmapRect(layerInfo.maskUndo, region.left, region.top, region);
                        }
                    });
                } else {
                    if (layerInfo.moveImage) {
                        layerInfo.imageRect.forEach((image, rect) => {
                            layerInfo.layer.image.copyBitmapRect(image, rect.left, rect.top, image.getBounds());
                        });
                    }
        
                    if (layerInfo.moveMask) {
                        layerInfo.maskRect.forEach((mask, rect) => {
                            layerInfo.layer.mask.copyBitmapRect(mask, rect.left, rect.top, mask.getBounds());
                        });
                    }
                }
            });

            invalidateLayer(this.movingLayers.map(layerInfo => layerInfo.layer), restoreRegions.reduce((a, b) => a.getUnion(b), new CPRect(0, 0, 0, 0)), true, true);

            // Call this after we're done with restoreRegions, since it might be a part of that array.
            this.dstRect.makeEmpty();
        
            that.setSelection(this.fromSelection);
            that.setActiveLayer(this.layer, this.fromMaskMode);
        
            /*
             * FIXME Required because in the case of a copy, we don't invalidate the source rect in the fusion, so the canvas
             * won't end up repainting the selection rectangle there.
             */
            callListenersSelectionChange();
        }

        getMemoryUsed(undone, param) {
            return this.movingLayers.map(function(layerInfo) {
                let
                    images = [layerInfo.imageUndo, layerInfo.maskUndo, layerInfo.imageRect, layerInfo.maskRect];
            
                return images.map(image => image ? image.getMemorySize() : 0).reduce(sum, 0);
            }).reduce(sum, 0);
        }
	
	    /**
         * Called internally to reverse the effects of compact()
         */
        buildFullUndo() {
            if (!this.hasFullUndo) {
                this.movingLayers.forEach(function(layerInfo) {
                    if (layerInfo.moveImage) {
                        layerInfo.imageUndo = layerInfo.layer.image.clone();
                    }
                    if (layerInfo.moveMask) {
                        layerInfo.maskUndo = layerInfo.layer.mask.clone();
                    }
                
                    layerInfo.imageRect.clear();
                    layerInfo.maskRect.clear();
                });
            
                this.hasFullUndo = true;
            }
        }
    
        /**
         * Called when we're no longer the top operation in the undo stack, so that we can optimize for lower memory
         * usage instead of faster revision speed
         */
        compact() {
            if (this.hasFullUndo) {
	            // Replace our copy of the whole layers with just a copy of the areas we damaged
	            let
		            damagedRects = [];
	            
	            if (!this.dstRect.isEmpty()) {
	                damagedRects.push(this.dstRect);
	            }
	            
	            if (this.erasesSourceRect) {
	            	damagedRects.push(this.srcRect);
		
		            damagedRects = CPRect.union(damagedRects);
	            }
	            
                this.movingLayers.forEach(layerInfo => {
                	layerInfo.imageRect.clear();
	                layerInfo.maskRect.clear();
	
	                damagedRects.forEach(rect => {
                		if (layerInfo.moveImage) {
			                layerInfo.imageRect.set(rect, layerInfo.imageUndo.cloneRect(rect));
		                }
	                    if (layerInfo.moveMask) {
		                    layerInfo.maskRect.set(rect, layerInfo.maskUndo.cloneRect(rect));
	                    }
	                });
    
                    // Discard the full-size undos
                    layerInfo.imageUndo = null;
                    layerInfo.maskUndo = null;
                });
            
                this.hasFullUndo = false;
            }
        }
    }

    /**
     * Transforms the currently selected region of the current layer by the given affine transform.
     *
     * @param {CPTransform} affineTransform - Transform to apply
     * @param {string} interpolation - "smooth" or "sharp"
     */
    class CPActionAffineTransformSelection extends CPActionTransformSelection {
        constructor(affineTransform, interpolation) {
            super();
            
            this.erasesSourceRect = true;
            
            this.affineTransform = affineTransform.clone();
            this.interpolation = interpolation || "smooth";
        
            /**
             * A canvas for composing the transform onto
             * @type {HTMLCanvasElement}
             */
            this.composeCanvas = null;
        
            /**
             * @type {CanvasRenderingContext2D}
             */
            this.composeCanvasContext = null;
        }
	
	    /**
         * @override
         */
        buildFullUndo() {
        	if (!this.hasFullUndo) {
		        super.buildFullUndo();
		
		        // Make a copy of just the source rectangles in their own canvases so we can transform them layer with Canvas APIs
		        this.movingLayers.forEach(layerInfo => {
		            if (layerInfo.moveImage) {
                        let
                            canvas = createCanvas(this.srcRect.getWidth(), this.srcRect.getHeight()),
                            context = canvas.getContext("2d");
            
                        context.putImageData(layerInfo.layer.image.getImageData(), -this.srcRect.left, -this.srcRect.top, this.srcRect.left, this.srcRect.top, this.srcRect.getWidth(), this.srcRect.getHeight());
            
                        layerInfo.imageSourceCanvas = canvas;
                    }
            
                    if (layerInfo.moveMask) {
                        let
                            canvas = createCanvas(this.srcRect.getWidth(), this.srcRect.getHeight()),
                            context = canvas.getContext("2d");
                
                        context.putImageData(layerInfo.layer.mask.getImageData(this.srcRect.left, this.srcRect.top, this.srcRect.getWidth(), this.srcRect.getHeight()), 0, 0);
                
                        layerInfo.maskSourceCanvas = canvas;
                    }
                });
		
		        this.composeCanvas = createCanvas(that.width, that.height);
		
				// willReadFrequently
				this.composeCanvasContext = this.composeCanvas.getContext("2d", {	
					willReadFrequently: true,
				});
		        setCanvasInterpolation(this.composeCanvasContext, this.interpolation == "smooth");
		        
		        /* Calling getImageData on the canvas forces Chrome to disable hardware acceleration for it, see
		         * GetImageDataForcesNoAcceleration in https://cs.chromium.org/chromium/src/third_party/WebKit/Source/platform/graphics/ExpensiveCanvasHeuristicParameters.h
		         *
		         * We normally call this as part of finishing up our redo(), which means that our first redo() would
		         * use hardware acceleration, and all subsequent redo()s would use software emulation, with subtly
		         * different pixel results.
		         *
		         * Force our results to be consistent by calling that right now:
		         */
                this.junk = this.composeCanvasContext.getImageData(0, 0, 1, 1);
            }
        }
        
        redo() {
            this.buildFullUndo();
    
            let
                oldDstRect = this.dstRect.clone(),
	            
                dstCorners = this.srcRect.toPoints();
    
            this.affineTransform.transformPoints(dstCorners);
    
            this.dstRect.set(CPRect.createBoundingBox(dstCorners).roundContain().clipTo(that.getBounds()));
            
            const
                /* The area of original image data that we need to compose the transformed area onto (i.e. excluding the
                 * source area we're just going to erase)
                 */
	            composeOntoRects = CPRect.subtract(this.dstRect, this.srcRect),
                
                /* We need to erase the area we're moving from.
                 *
                 * If this is an amend(), we've already erased the source rectangle (except for the part occupied by the
                 * old destination rectangle)
                 *
                 * We don't need to erase the area we're planning to overwrite later (dstRect)
                 */
                eraseRects = CPRect.subtract(oldDstRect.isEmpty() ? this.srcRect : this.srcRect.getIntersection(oldDstRect), this.dstRect),
    
                // The region of the source rectangle that we want to compose onto
                srcComposeRect = this.srcRect.getIntersection(this.dstRect),

                // Regions from oldDstRect in the layer data that we need to clean up after our operation
                repairOldRects = CPRect.subtract(oldDstRect, [this.dstRect, this.srcRect]),
    
                // The region which needs repainting (from the previous redo() and after our redo())
                invalidateRect = this.srcRect.getUnion(this.dstRect).getUnion(oldDstRect);
                
            this.movingLayers.forEach(layerInfo => {
                // Erase the source area that won't be replaced by the canvas dest area
                eraseRects.forEach(rect => {
                    if (layerInfo.moveImage) {
                        layerInfo.layer.image.clearRect(rect, EMPTY_LAYER_COLOR);
                    }
        
                    if (layerInfo.moveMask) {
                        if (this.movingWholeLayer) {
                            layerInfo.layer.mask.clearRect(rect, 0xFF);
                        } else {
                            layerInfo.layer.mask.clearRect(rect, EMPTY_MASK_COLOR);
                        }
                    }
                });
                
                if (!this.dstRect.isEmpty()) {
	                if (layerInfo.moveImage) {
		                let
			                imageData = layerInfo.imageUndo.getImageData();
        
                        /*
                         * Make a fresh copy of the undo data into the Canvas so we can compose the transformed data on top of
                         * it (except the source region since we'll just erase that).
                         */
		                composeOntoRects.forEach(rect => {
			                this.composeCanvasContext.putImageData(imageData, 0, 0, rect.left, rect.top, rect.getWidth(), rect.getHeight());
		                });
		
		                // Erase the portion of the source region that we're going to compose onto
		                this.composeCanvasContext.clearRect(srcComposeRect.left, srcComposeRect.top, srcComposeRect.getWidth(), srcComposeRect.getHeight());
		
		                this.composeCanvasContext.save();
		
		                // Apply the transform when drawing the transformed fragment
		                this.composeCanvasContext.setTransform(
			                this.affineTransform.m[0], this.affineTransform.m[1], this.affineTransform.m[2],
			                this.affineTransform.m[3], this.affineTransform.m[4], this.affineTransform.m[5]
		                );
		                this.composeCanvasContext.drawImage(layerInfo.imageSourceCanvas, this.srcRect.left, this.srcRect.top);
		
		                this.composeCanvasContext.restore();
		
		                // Save that to the layer data
		                layerInfo.layer.image.copyBitmapRect(
			                new CPColorBmp(this.composeCanvasContext.getImageData(this.dstRect.left, this.dstRect.top, this.dstRect.getWidth(), this.dstRect.getHeight())),
			                this.dstRect.left,
			                this.dstRect.top,
			                new CPRect(0, 0, this.dstRect.getWidth(), this.dstRect.getHeight())
		                );
	                }
	
	                if (layerInfo.moveMask) {
		                composeOntoRects.forEach(rect => {
			                this.composeCanvasContext.putImageData(layerInfo.layer.mask.getImageData(rect.left, rect.top, rect.getWidth(), rect.getHeight()), rect.left, rect.top);
		                });
		
		                if (this.movingWholeLayer) {
			                this.composeCanvasContext.fillStyle = '#FFF';
		                } else {
			                this.composeCanvasContext.fillStyle = '#000';
		                }
		
		                this.composeCanvasContext.fillRect(srcComposeRect.left, srcComposeRect.top, srcComposeRect.getWidth(), srcComposeRect.getHeight());
		
		                this.composeCanvasContext.save();
		
		                // TODO set blend mode to replace? We don't have any alpha in the source or dest images
		
		                this.composeCanvasContext.setTransform(
			                this.affineTransform.m[0], this.affineTransform.m[1], this.affineTransform.m[2],
			                this.affineTransform.m[3], this.affineTransform.m[4], this.affineTransform.m[5]
		                );
		                this.composeCanvasContext.drawImage(layerInfo.maskSourceCanvas, this.srcRect.left, this.srcRect.top);
		
		                this.composeCanvasContext.restore();
		
		                layerInfo.layer.mask.pasteImageData(
			                this.composeCanvasContext.getImageData(this.dstRect.left, this.dstRect.top, this.dstRect.getWidth(), this.dstRect.getHeight()),
			                this.dstRect.left,
			                this.dstRect.top
		                );
	                }
                }
    
                /*
                 * Use the CPColorBmp/CPGreyBmp undo data to erase any leftovers from the previous redo(). We do this
                 * instead of just copying from the canvas, since Canvas' getImageData/setImageData doesn't round-trip
                 * (due to premultiplied alpha on some browsers/systems) and we want to avoid damaging areas we don't
                 * need to touch.
                 */
                repairOldRects.forEach(rect => {
                    if (layerInfo.moveImage) {
                        layerInfo.layer.image.copyBitmapRect(layerInfo.imageUndo, rect.left, rect.top, rect);
                    }
    
                    if (layerInfo.moveMask) {
                        layerInfo.layer.mask.copyBitmapRect(layerInfo.maskUndo, rect.left, rect.top, rect);
                    }
                });
            });
    
            invalidateLayer(this.movingLayers.map(layerInfo => layerInfo.layer), invalidateRect, true, true);

            // Transform the selection rect to enclose the transformed selection
            if (!this.fromSelection.isEmpty()) {
                let
                    toSelectionPoints = this.fromSelection.toPoints(),
                    toSelectionRect;
    
                this.affineTransform.transformPoints(toSelectionPoints);

                toSelectionRect = CPRect.createBoundingBox(toSelectionPoints);
                toSelectionRect.roundNearest();

                that.setSelection(toSelectionRect);
                callListenersSelectionChange();
            }

            that.setActiveLayer(this.layer, this.fromMaskMode);
        }

        /**
         * Replace the transform with the given one.
         *
         * @override
         *
         * @param {CPTransform} affineTransform
         */
        amend(affineTransform) {
            if (!this.hasFullUndo) {
                /* redo() requires a full undo to be available to update the transform. It'll effectively undo the
                 * current transform for us while it does the redo.
                 *
                 * If there's no full undo, for redo() to be able to generate it we'll have to undo() for them first.
                 */
		        this.undo();
	        }
	
	        this.affineTransform = affineTransform.clone();
	
	        this.redo();
        }

        setInterpolation(newInterpolation) {
            if (newInterpolation != this.interpolation) {
                this.interpolation = newInterpolation;

                if (this.composeCanvasContext) {
                    setCanvasInterpolation(this.composeCanvasContext, this.interpolation == "smooth");
                }

                this.undo();
                this.redo();
            }
        }

        /**
         * @override
         */
        compact() {
            super.compact();

            // Discard our temporary drawing canvases
            this.composeCanvas = null;
            this.composeCanvasContext = null;
	        
	        this.movingLayers.forEach(layerInfo => layerInfo.imageSourceCanvas = null);
        }
    
        /**
         * @override
         */
        getMemoryUsed(undone, param) {
            let
                result = super.getMemoryUsed(undone, param);
            
            result += memoryUsedByCanvas(this.composeCanvas);
            
            result += this.movingLayers
                .map(layerInfo => memoryUsedByCanvas(layerInfo.imageSourceCanvas))
                .reduce(sum, 0);

            return result;
        }

	    /**
         * Get a copy of the affine transform.
         */
        getTransform() {
            return this.affineTransform.clone();
        }

        /**
         * Get a copy of the initial document rectangle (before the transform was applied)
         *
         * @returns {CPRect}
         */
        getInitialTransformRect() {
            return this.srcRect.clone();
        }

        /**
         * Get a copy of the initial user selection rectangle (before the transform was applied). Can be empty if
         * the user didn't have anything selected before the transform began.
         *
         * @returns {CPRect}
         */
        getInitialSelectionRect() {
            return this.fromSelection.clone();
        }
    }

    /**
     * Upon creation, moves the currently selected region of the current layer by the given offset
     *
     * @param {?CPRect} srcRect - Rectangle that will be moved, or an empty rectangle to move whole layer.
     * @param {int} offsetX
     * @param {int} offsetY
     * @param {boolean} copy - True if we should copy to the destination instead of move.
     * @constructor
     */
    class CPActionMoveSelection extends CPActionTransformSelection {
        constructor(offsetX, offsetY, copy) {
            super();
            
            this.offsetX = offsetX;
            this.offsetY = offsetY;
            
            this.erasesSourceRect = !copy;
        }
        
        redo() {
            let
                oldDestRect = this.dstRect.clone(),
                destRectUnclipped,
	            
	            /**
                 * Do we have anything to repaint from a previous call to redo()? (if we are called by amend())
                 * @type {CPRect[]}
                 */
                restoreFromUndoAreas,
                
                invalidateRegion = oldDestRect.clone(),
                eraseRegion = null;

            this.buildFullUndo();
    
            this.dstRect.set(this.srcRect);
            this.dstRect.translate(this.offsetX, this.offsetY);
    
            destRectUnclipped = this.dstRect.clone();
            
            this.dstRect.clipTo(that.getBounds());
    
            if (this.erasesSourceRect) {
                // We're moving, so erase the source region we're moving out of.
                if (oldDestRect.isEmpty()) {
                    eraseRegion = this.srcRect;
                } else {
                    /*
                     * We've erased the source rect already in a previous redo(), so we only need to erase the damaged
                     * area.
                     */
                    eraseRegion = this.srcRect.getIntersection(oldDestRect);
                }
                
                invalidateRegion.union(eraseRegion);
    
                restoreFromUndoAreas = oldDestRect.subtract(this.srcRect);
            } else {
                restoreFromUndoAreas = [oldDestRect];
            }
            
            this.movingLayers.forEach(layerInfo => {
                if (eraseRegion) {
                    if (layerInfo.moveImage) {
                        layerInfo.layer.image.clearRect(eraseRegion, EMPTY_LAYER_COLOR);
                    }
                    if (layerInfo.moveMask) {
                        layerInfo.layer.mask.clearRect(eraseRegion, this.movingWholeLayer ? 0xFF : EMPTY_MASK_COLOR);
                    }
                }
                
                restoreFromUndoAreas.forEach(function (restore) {
                    if (layerInfo.moveImage) {
                        layerInfo.layer.image.copyBitmapRect(layerInfo.imageUndo, restore.left, restore.top, restore);
                    }
                    if (layerInfo.moveMask) {
                        layerInfo.layer.mask.copyBitmapRect(layerInfo.maskUndo, restore.left, restore.top, restore);
                    }
                });
            
                /* Note that while we could copy image data from the layer itself onto the layer (instead of sourcing that
                 * data from the undo buffers), this would require that pasteAlphaRect do the right thing when source and
                 * dest rectangles overlap, which it doesn't.
                 */
                if (layerInfo.moveImage) {
                    CPBlend.normalFuseImageOntoImageAtPosition(layerInfo.layer.image, layerInfo.imageUndo, destRectUnclipped.left, destRectUnclipped.top, this.srcRect);
                }
                if (layerInfo.moveMask) {
                    layerInfo.layer.mask.copyBitmapRect(layerInfo.maskUndo, destRectUnclipped.left, destRectUnclipped.top, this.srcRect);
                }
            });

            invalidateRegion.union(this.dstRect);

            invalidateLayer(this.movingLayers.map(layerInfo => layerInfo.layer), invalidateRegion, true, true);

            if (!this.fromSelection.isEmpty()) {
                let
                    toSelection = this.fromSelection.clone();
                toSelection.translate(this.offsetX, this.offsetY);
                that.setSelection(toSelection);
                callListenersSelectionChange();
            }
        };

        /**
         * Move further by the given offset on top of the current offset.
         *
         * @param {int} offsetX
         * @param {int} offsetY
         */
        amend(offsetX, offsetY) {
            if (!this.hasFullUndo) {
                this.undo();
            }

            this.offsetX += offsetX;
            this.offsetY += offsetY;

            this.redo();
        }
    }

    /**
     * Cut the selected rectangle from the layer
     * 
     * @param {CPImageLayer} layer - Layer to cut from
     * @param {boolean} cutFromMask - True to cut from the mask of the layer, false to cut from the image
     * @param {CPRect} selection - The cut rectangle co-ordinates
     */
    function CPActionCut(layer, cutFromMask, selection) {
        const
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
     */
    function CPActionPaste(clip) {
        const
            oldSelection = that.getSelection(),
            oldMask = maskEditingMode,
            newLayer = new CPImageLayer(that.width, that.height, that.getDefaultLayerName(false)),
            oldLayer = curLayer,
            parentGroup = oldLayer.parent;

        this.undo = function() {
            parentGroup.removeLayer(newLayer);

            that.setSelection(oldSelection);

            artworkStructureChanged();
            that.setActiveLayer(oldLayer, oldMask);
        };

        this.redo = function() {
            let
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
                let
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
        CPBrushTool,
        CPBrushToolEraser,
        CPBrushToolDodge,
        CPBrushToolBurn,
        CPBrushToolWatercolor,
        CPBrushToolBlur,
        CPBrushToolSmudge,
        CPBrushToolOil
    ].map(modeFunc => new modeFunc(strokeBuffer, strokedRegion));

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

CPArtwork.EDITING_MODE_IMAGE = 0;
CPArtwork.EDITING_MODE_MASK = 1;