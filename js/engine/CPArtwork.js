"use strict";

function CPArtwork(_width, _height) {
    var
        MAX_UNDO = 30,
        EMPTY_CANVAS_COLOR = 0x800000FF;
    
    var
        layers = [],
        curLayer,
        
        hasUnsavedChanges,
        
        curSelection = new CPRect(),
        
        fusion, undoBuffer, opacityBuffer,
        fusionArea, undoArea = new CPRect(), opacityArea = new CPRect(),
        
        clipBoard = null,
        undoList = [], redoList = [],
        
        curBrush = null,
        
        brushManager = null,
        
        lastX = 0.0, lastY = 0.0, lastPressure = 0.0,
        
        sampleAllLayers = false,
        lockAlpha = false,
        
        curColor,
        
        that = this;
    
    this.width = _width;
    this.height = _height;

    function getDefaultLayerName() {
        return "Layer 1"; //TODO
    }
    
    function restoreAlpha(rect) {
        this.getActiveLayer().copyAlphaFrom(undoBuffer, rect);
    }
    
    /**
     * Merge
     */
    function mergeOpacityBuffer(color, clear) {
        if (!opacityArea.isEmpty()) {
//            if (curBrush.paintMode != CPBrushInfo.M_ERASE || !lockAlpha) {
                paintingModes[curBrush.paintMode].mergeOpacityBuf(opacityArea, color);
/*            } else {
                // FIXME: it would be nice to be able to set the paper color
                paintingModes[CPBrushInfo.M_PAINT].mergeOpacityBuf(opacityArea, 0xffffff);
            }

            if (lockAlpha) {
                restoreAlpha(opacityArea);
            } */

            if (clear) {
                opacityBuffer.clearRect(opacityArea, 0);
            }

            opacityArea.makeEmpty();
        }
    }
    
    function initDynamicProps() {
        fusionArea = new CPRect(0, 0, that.width, that.height);
    
        undoBuffer = new CPLayer(that.width, that.height);
        // we reserve a double sized buffer to be used as a 16bits per channel buffer
        opacityBuffer = new CPLayer(that.width, that.height);
    
        fusion = new CPLayer(that.width, that.height);
    }
    
    this.createEmptyArtwork = function() {
        var
            defaultLayer = new CPLayer(that.width, that.height, getDefaultLayerName());
        
        defaultLayer.clearAll(EMPTY_CANVAS_COLOR);
        
        layers = [defaultLayer];
        
        curLayer = defaultLayer;
        
        initDynamicProps();
    }

    this.fusionLayers = function() {
        if (fusionArea.isEmpty()) {
            return;
        }

        mergeOpacityBuffer(curColor, false);

        fusion.clearAll(fusionArea, 0x00FFFFFF);
        
        var 
            fusionIsSemiTransparent = true, 
            first = true;
        
        layers.forEach(function(layer) {
            if (!first) {
                fusionIsSemiTransparent = fusionIsSemiTransparent && fusion.hasAlphaInRect(fusionArea);
            }

            if (layer.visible) {
                first = false;
                
                // If we're merging onto a semi-transparent canvas then we need to blend our opacity values onto the existing ones
                if (fusionIsSemiTransparent) {
                    layer.fusionWithFullAlpha(fusion, fusionArea);
                } else {
                    layer.fusionWith(fusion, fusionArea);
                }
            }
        });

        fusionArea.makeEmpty();
        
        return fusion.getImageData();
    }
    
    this.getActiveLayerIndex = function() {
        for (var i = 0; i < layers.length; i++) {
            if (layers[i] == curLayer) {
                return i;
            }
        }
        
        return -1;
    };
    
    this.getActiveLayer = function() {
        return curLayer;
    };
    
    this.addLayer = function(layer) {
        layers.push(layer);
        
        if (layers.length == 1) {
            curLayer = layers[0];
        }
    }
    
    initDynamicProps();
};