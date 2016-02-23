"use strict";

function CPLayer(width, height, name) {
    var
        
        blendMode, //TODO
        
        BYTES_PER_PIXEL = 4,
        
        RED_BYTE_OFFSET = 0,
        GREEN_BYTE_OFFSET = 1,
        BLUE_BYTE_OFFSET = 2,
        ALPHA_BYTE_OFFSET = 3,
        
        that = this;
        
    name = name || "";
    width |= 0;
    height |= 0;
    
    this.data = new ImageData(width, height),
    this.alpha = 100;
    this.visible = true;
    
    function offsetOfPixel(x, y) {
        return (y * width + x) * BYTES_PER_PIXEL;
    }
    
    this.getBounds = function() {
        return new CPRect(0, 0, width, height);
    };
    
    this.clearAll = function(color) {
        var
            a = (color >> 24) & 0xFF,
            r = (color >> 16) & 0xFF,
            g = (color >> 8) & 0xFF,
            b = color & 0xFF;
        
        for (var i = 0; i < width * height * BYTES_PER_PIXEL; ) {
            this.data[i++] = r;
            this.data[i++] = g;
            this.data[i++] = b;
            this.data[i++] = a;
        }
    };
    
    this.clearRect = function(rect, color) {
        var
            a = (color >> 24) & 0xFF,
            r = (color >> 16) & 0xFF,
            g = (color >> 8) & 0xFF,
            b = color & 0xFF;
        
        var
            rect = this.getBounds().clip(rect);
            yStride = (width - rect.getWidth()) * BYTES_PER_PIXEL,
            
            pixIndex = offsetOfPixel(rect.left, rect.top);
        
        for (var y = rect.top; y < rect.bottom; y++) {
            for (var x = rect.left; x < rect.right; x++) {
                this.data[pixIndex++] = r;
                this.data[pixIndex++] = g;
                this.data[pixIndex++] = b;
                this.data[pixIndex++] = a;
            }
            pixIndex += yStride;
        }
    };

    // Layer blending functions
    //
    // The FullAlpha versions are the ones that work in all cases
    // others need the bottom layer to be 100% opaque but are faster
    
    function fuseOntoOpaqueLayerNormal(fusion, rc) {
        var 
            rect = this.getBounds().clip(rc),
            yStride = (width - rect.getWidth()) * BYTES_PER_PIXEL,
            pixIndex = offsetOfPixel(rect.left, rect.top);

        for (var y = rect.top; y < rect.bottom; y++) {
            for (var x = rect.left; x < rect.right; x++) {
                var 
                    alpha = (that.data[pixIndex + ALPHA_BYTE_OFFSET] * that.alpha / 100) | 0;
                
                if (alpha == 0) {
                    pixIndex += 4;
                } else if (alpha == 255) {
                    for (var i = 0; i < BYTES_PER_PIXEL; i++, pixIndex++) {
                        fusion.data[pixIndex] = that.data[pixIndex];
                    }
                } else {
                    var 
                        invAlpha = 255 - alpha;

                    for (var i = 0; i < 3; i++, pixIndex++) {
                        fusion.data[pixIndex] = ((that.data[pixIndex] * alpha + fusion.data[pixIndex] * invAlpha) / 255) | 0;
                    }
                }
            }
            
            pixIndex += yStride;
        }
    }

    function fuseOntoOpaqueLayerNoAlphaNormal(fusion, rc) {
        var 
            rect = this.getBounds().clip(rc),
            yStride = (width - rect.getWidth()) * BYTES_PER_PIXEL,
            pixIndex = offsetOfPixel(rect.left, rect.top);

        for (var y = rect.top; y < rect.bottom; y++) {
            for (var x = rect.left; x < rect.right; x++) {
                var 
                    alpha = that.data[pixIndex + ALPHA_BYTE_OFFSET];
                
                if (alpha == 0) {
                    pixIndex += 4;
                } else if (alpha == 255) {
                    for (var i = 0; i < BYTES_PER_PIXEL; i++, pixIndex++) {
                        fusion.data[pixIndex] = that.data[pixIndex];
                    }
                } else {
                    var 
                        invAlpha = 255 - alpha;

                    for (var i = 0; i < 3; i++, pixIndex++) {
                        fusion.data[pixIndex] = ((that.data[pixIndex] * that.alpha + fusion.data[pixIndex] * invAlpha) / 255) | 0;
                    }
                }
            }
            
            pixIndex += yStride;
        }
    }
    
    // Normal Alpha Mode
    // C = A*d + B*(1-d) and d = aa / (aa + ab - aa*ab)
    function fuseOntoLayerNormal(fusion, rc) {
        var
            rect = this.getBounds().clip(rc),
            yStride = (width - rect.getWidth()) * BYTES_PER_PIXEL,
            pixIndex = offsetOfPixel(rect.left, rect.top);

        for (var y = rect.top; y < rect.bottom; y++) {
            for (var x = rect.left; x < rect.right; x++) {
                var 
                    alpha1 = (that.data[pixIndex + ALPHA_BYTE_OFFSET] * that.alpha) / 100,
                    alpha2 = (fusion.data[pixIndex + ALPHA_BYTE_OFFSET] * fusion.alpha) / 100,

                    newAlpha = (alpha1 + alpha2 - alpha1 * alpha2 / 255) | 0;
                
                if (newAlpha > 0) {
                    var 
                        realAlpha = (alpha1 * 255 / newAlpha) | 0,
                        invAlpha = 255 - realAlpha;

                    for (var i = 0; i < 3; i++, pixIndex++) {
                        fusion.data[pixIndex] = ((that.data[pixIndex] * realAlpha + fusion.data[pixIndex] * invAlpha) / 255) | 0;
                    }
                    fusion.data[pixIndex++] = newAlpha;
                }
            }
            
            pixIndex += yStride;
        }

        fusion.alpha = 100;
    }
    
    this.fusionWith = function(fusion, rect) {
        if (alpha <= 0) {
            return;
        }
        
        // TODO non-normal blend modes
        if (alpha >= 100) {
            fuseOntoOpaqueLayerNoAlphaNormal(fusion, r);
        } else {
            fuseOntoOpaqueLayerNormal(fusion, r);
        }
    };
    
    this.fusionWithFullAlpha = function(fusion, rect) {
        if (alpha <= 0) {
            return;
        }

        //TODO non-normal blend modes
        fuseOntoLayerNormal(fusion, r);
    };
    
    this.clearAll(0xFFFFFFFF);
};