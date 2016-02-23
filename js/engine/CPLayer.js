"use strict";

function CPLayer(width, height, name) {
    var
        
        blendMode, //TODO
        
        BYTES_PER_PIXEL = 4,
        
        RED_BYTE_OFFSET = 0,
        GREEN_BYTE_OFFSET = 1,
        BLUE_BYTE_OFFSET = 2,
        ALPHA_BYTE_OFFSET = 3,
        
        imageData = new ImageData(width, height),
        
        that = this;
        
    name = name || "";
    width = width | 0;
    height = height | 0;
    
    this.data = imageData.data,
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
            that.data[i++] = r;
            that.data[i++] = g;
            that.data[i++] = b;
            that.data[i++] = a;
        }
    };
    
    this.clearRect = function(rect, color) {
        var
            a = (color >> 24) & 0xFF,
            r = (color >> 16) & 0xFF,
            g = (color >> 8) & 0xFF,
            b = color & 0xFF;
        
        var
            rect = that.getBounds().clip(rect);
            yStride = (width - rect.getWidth()) * BYTES_PER_PIXEL,
            
            pixIndex = offsetOfPixel(rect.left, rect.top);
        
        for (var y = rect.top; y < rect.bottom; y++) {
            for (var x = rect.left; x < rect.right; x++) {
                that.data[pixIndex++] = r;
                that.data[pixIndex++] = g;
                that.data[pixIndex++] = b;
                that.data[pixIndex++] = a;
            }
            pixIndex += yStride;
        }
    };

    // Layer blending functions
    //
    // The FullAlpha versions are the ones that work in all cases
    // others need the bottom layer to be 100% opaque but are faster
    
    function fuseOntoOpaqueLayerNormal(fusion, rect) {
        rect = that.getBounds().clip(rect);
        
        var 
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

    function fuseOntoOpaqueLayerNoAlphaNormal(fusion, rect) {
        rect = that.getBounds().clip(rect);
        
        var 
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
    function fuseOntoLayerNormal(fusion, rect) {
        rect = that.getBounds().clip(rect);
        
        var
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
        if (this.alpha <= 0) {
            return;
        }
        
        // TODO non-normal blend modes
        if (this.alpha >= 100) {
            fuseOntoOpaqueLayerNoAlphaNormal(fusion, r);
        } else {
            fuseOntoOpaqueLayerNormal(fusion, r);
        }
    };
    
    this.fusionWithFullAlpha = function(fusion, rect) {
        if (this.alpha <= 0) {
            return;
        }

        //TODO non-normal blend modes
        fuseOntoLayerNormal(fusion, rect);
    };
    
    // Do we have any semi-transparent pixels in the entire layer?
    this.hasAlpha = function() {
        if (this.alpha != 100) {
            return true;
        }
        
        var 
            pixIndex = ALPHA_BYTE_OFFSET;
        
        for (var y = 0; y < height; y++) {
            var
                alphaAnded = 0xFF;
            
            for (var x = 0; x < width; x++, pixIndex += BYTES_PER_PIXEL) {
                alphaAnded &= this.data[pixIndex];
            }
            
            // Only check once per row in order to reduce branching in the inner loop
            if (alphaAnded != 0xFF) {
                return true;
            }
        }
        
        return false;
    };

    // Do we have any semi-transparent pixels in the given rectangle?
    this.hasAlphaInRect = function(rect) {
        if (this.alpha != 100) {
            return true;
        }

        rect = this.getBounds().clip(rect);

        var 
            yStride = (width - rect.getWidth()) * BYTES_PER_PIXEL,
            pixIndex = offsetOfPixel(rect.left, rect.top) + ALPHA_BYTE_OFFSET;
        
        for (var y = rect.top; y < rect.bottom; y++, pixIndex += yStride) {
            var
                alphaAnded = 0xFF;
            
            for (var x = rect.left; x < rect.right; x++, pixIndex += BYTES_PER_PIXEL) {
                alphaAnded &= this.data[pixIndex];
            }
            
            // Only check once per row in order to reduce branching in the inner loop
            if (alphaAnded != 0xFF) {
                return true;
            }
        }
        
        return false;
    }
    
    // Return the canvas ImageData that backs this layer
    this.getImageData = function() {
        return imageData;
    };
    
    this.clearAll(0xFFFFFFFF);
};