// Layer blending functions
//
// The FullAlpha versions are the ones that work in all cases
// others need the bottom layer to be 100% opaque but are faster
export default function CPBlend() {
}

const
    BYTES_PER_PIXEL = 4,
    
    RED_BYTE_OFFSET = 0,
    GREEN_BYTE_OFFSET = 1,
    BLUE_BYTE_OFFSET = 2,
    ALPHA_BYTE_OFFSET = 3;

CPBlend.prototype.fusionWithMultiply = function(that, fusion, rect) {
    var 
        yStride = (that.width - rect.getWidth()) * BYTES_PER_PIXEL,
        pixIndex = that.offsetOfPixel(rect.left, rect.top);

    for (var y = rect.top; y < rect.bottom; y++, pixIndex += yStride) {
        for (var x = rect.left; x < rect.right; x++) {
            var 
                alpha = (that.data[pixIndex + ALPHA_BYTE_OFFSET] * that.alpha / 100) | 0;
            
            if (alpha > 0) {
                for (var i = 0; i < 3; i++, pixIndex++) {
                    fusion.data[pixIndex] = (fusion.data[pixIndex] - (that.data[pixIndex] ^ 0xFF) * fusion.data[pixIndex] * alpha / (255 * 255)) | 0;
                }
                pixIndex++; // Don't need to update the alpha because it started out as 100%
            } else {
                pixIndex += BYTES_PER_PIXEL;
            }
        }
    }
};

/* Blend onto an opaque fusion. Supports .alpha < 100 on this layer */
CPBlend.prototype.fusionWithNormal = function(that, fusion, rect) {
    var
        yStride = ((that.width - rect.getWidth()) * BYTES_PER_PIXEL) | 0,
        pixIndex = that.offsetOfPixel(rect.left, rect.top) | 0,
        h = (rect.bottom - rect.top) | 0,
        w = (rect.right - rect.left) | 0;

    for (var y = 0 ; y < h; y++, pixIndex += yStride) {
        for (var x = 0; x < w; x++) {
            var 
                alpha = (that.data[pixIndex + ALPHA_BYTE_OFFSET] * that.alpha / 100) | 0;
            
            if (alpha > 0) {
                if (alpha == 255) {
                    fusion.data[pixIndex] = that.data[pixIndex];
                    fusion.data[pixIndex + 1] = that.data[pixIndex + 1];
                    fusion.data[pixIndex + 2] = that.data[pixIndex + 2];
                    fusion.data[pixIndex + 3] = 255;
                } else {
                    var
                        invAlpha = 255 - alpha;

                    fusion.data[pixIndex] = ((that.data[pixIndex] * alpha + fusion.data[pixIndex] * invAlpha) / 255) | 0;
                    fusion.data[pixIndex + 1] = ((that.data[pixIndex + 1] * alpha + fusion.data[pixIndex + 1] * invAlpha) / 255) | 0;
                    fusion.data[pixIndex + 2] = ((that.data[pixIndex + 2] * alpha + fusion.data[pixIndex + 2] * invAlpha) / 255) | 0;
                }
            }

            pixIndex += BYTES_PER_PIXEL;
        }
    }
};

// Fusing onto an opaque layer when this layer has alpha set to 100
CPBlend.prototype.fusionWithNormalNoAlpha = function(that, fusion, rect) {
    var 
        yStride = ((that.width - rect.getWidth()) * BYTES_PER_PIXEL) | 0,
        pixIndex = that.offsetOfPixel(rect.left, rect.top) | 0,
        h = (rect.bottom - rect.top) | 0,
        w = (rect.right - rect.left) | 0;
    
    for (var y = 0 ; y < h; y++, pixIndex += yStride) {
        for (var x = 0; x < w; x++) {
            var 
                alpha = that.data[pixIndex + ALPHA_BYTE_OFFSET];
            
            if (alpha > 0) {
                if (alpha == 255) {
                    fusion.data[pixIndex] = that.data[pixIndex];
                    fusion.data[pixIndex + 1] = that.data[pixIndex + 1];
                    fusion.data[pixIndex + 2] = that.data[pixIndex + 2];
                    fusion.data[pixIndex + 3] = that.data[pixIndex + 3];
                } else {
                    var 
                        invAlpha = 255 - alpha;
    
                    fusion.data[pixIndex] = (that.data[pixIndex] * alpha + fusion.data[pixIndex] * invAlpha) / 255;
                    fusion.data[pixIndex + 1] = (that.data[pixIndex + 1] * alpha + fusion.data[pixIndex + 1] * invAlpha) / 255;
                    fusion.data[pixIndex + 2] = (that.data[pixIndex + 2] * alpha + fusion.data[pixIndex + 2] * invAlpha) / 255;
                }
            }
            
            pixIndex += BYTES_PER_PIXEL;
        }
    }
};

CPBlend.prototype.fusionWithAdd = function(that, fusion, rect) {
    var 
        yStride = (that.width - rect.getWidth()) * BYTES_PER_PIXEL,
        pixIndex = that.offsetOfPixel(rect.left, rect.top);

    for (var y = rect.top; y < rect.bottom; y++, pixIndex += yStride) {
        for (var x = rect.left; x < rect.right; x++) {
            var 
                alpha = (that.data[pixIndex + ALPHA_BYTE_OFFSET] * that.alpha / 100) | 0;
            
            if (alpha > 0) {
                for (var i = 0; i < 3; i++, pixIndex++) {
                    fusion.data[pixIndex] = Math.min(255, (fusion.data[pixIndex] + alpha * that.data[pixIndex] / 255) | 0);
                }
                pixIndex++; // Don't need to update the alpha because it started out as 100%
            } else {
                pixIndex += BYTES_PER_PIXEL;
            }
        }
    }
};

// Normal Alpha Mode
// C = A*d + B*(1-d) and d = aa / (aa + ab - aa*ab)
CPBlend.prototype.fusionWithNormalFullAlpha = function(that, fusion, rect) {
    var
        yStride = ((that.width - rect.getWidth()) * BYTES_PER_PIXEL) | 0,
        pixIndex = that.offsetOfPixel(rect.left, rect.top) | 0,
        h = (rect.bottom - rect.top) | 0,
        w = (rect.right - rect.left) | 0;

    for (var y = 0 ; y < h; y++, pixIndex += yStride) {
        for (var x = 0; x < w; x++) {
            var 
                alpha1 = (that.data[pixIndex + ALPHA_BYTE_OFFSET] * that.alpha) / 100,
                alpha2 = (fusion.data[pixIndex + ALPHA_BYTE_OFFSET] * fusion.alpha) / 100,

                newAlpha = (alpha1 + alpha2 - alpha1 * alpha2 / 255) | 0;
            
            if (newAlpha > 0) {
                var 
                    realAlpha = (alpha1 * 255 / newAlpha) | 0,
                    invAlpha = 255 - realAlpha;

                fusion.data[pixIndex] = (that.data[pixIndex] * realAlpha + fusion.data[pixIndex] * invAlpha) / 255;
                fusion.data[pixIndex + 1] = (that.data[pixIndex + 1] * realAlpha + fusion.data[pixIndex + 1] * invAlpha) / 255;
                fusion.data[pixIndex + 2] = (that.data[pixIndex + 2] * realAlpha + fusion.data[pixIndex + 2] * invAlpha) / 255;
                fusion.data[pixIndex + 3] = newAlpha;
            }
            
            pixIndex += BYTES_PER_PIXEL;
        }
    }

    fusion.alpha = 100;
};

// Multiply Mode
// C = (A*aa*(1-ab) + B*ab*(1-aa) + A*B*aa*ab) / (aa + ab - aa*ab)

CPBlend.prototype.fusionWithMultiplyFullAlpha = function(that, fusion, rect) {
    var
        yStride = (that.width - rect.getWidth()) * BYTES_PER_PIXEL,
        pixIndex = that.offsetOfPixel(rect.left, rect.top);

    for (var y = rect.top; y < rect.bottom; y++, pixIndex += yStride) {
        for (var x = rect.left; x < rect.right; x++) {
            var 
                alpha1 = (that.data[pixIndex + ALPHA_BYTE_OFFSET] * that.alpha) / 100,
                alpha2 = (fusion.data[pixIndex + ALPHA_BYTE_OFFSET] * fusion.alpha) / 100,

                newAlpha = (alpha1 + alpha2 - alpha1 * alpha2 / 255) | 0;
            
            if (newAlpha > 0) {
                var 
                    alpha12 = (alpha1 * alpha2 / 255) | 0,
                    alpha1n2 = (alpha1 * (alpha2 ^ 0xFF) / 255) | 0,
                    alphan12 = ((alpha1 ^ 0xff) * alpha2 / 255) | 0;

                for (var i = 0; i < 3; i++, pixIndex++) {
                    fusion.data[pixIndex] = ((that.data[pixIndex] * alpha1n2 + fusion.data[pixIndex] * alphan12 + that.data[pixIndex]
                            * fusion.data[pixIndex] * alpha12 / 255) / newAlpha) | 0;
                }
                fusion.data[pixIndex++] = newAlpha;
            } else {
                pixIndex += BYTES_PER_PIXEL;
            }
        }
    }
    
    fusion.alpha = 100;
};

// Linear Dodge (Add) Mode
// C = (aa * A + ab * B) / (aa + ab - aa*ab)

CPBlend.prototype.fusionWithAddFullAlpha = function(that, fusion, rect) {
    var
        yStride = (that.width - rect.getWidth()) * BYTES_PER_PIXEL,
        pixIndex = that.offsetOfPixel(rect.left, rect.top);

    for (var y = rect.top; y < rect.bottom; y++, pixIndex += yStride) {
        for (var x = rect.left; x < rect.right; x++) {
            var 
                alpha1 = (that.data[pixIndex + ALPHA_BYTE_OFFSET] * that.alpha) / 100,
                alpha2 = (fusion.data[pixIndex + ALPHA_BYTE_OFFSET] * fusion.alpha) / 100,

                newAlpha = (alpha1 + alpha2 - alpha1 * alpha2 / 255) | 0;

            if (newAlpha > 0) {

                /*
             * // this version seems slower than the Math.min one int r = (alpha2 * (color2 >>> 16 & 0xff) +
             * alpha1 * (color1 >>> 16 & 0xff)) / newAlpha; r |= ((~((r & 0xffffff00) - 1) >> 16) | r) & 0xff;
             * int g = (alpha2 * (color2 >>> 8 & 0xff) + alpha1 * (color1 >>> 8 & 0xff)) / newAlpha; g |= ((~((g &
             * 0xffffff00) - 1) >> 16) | g) & 0xff; int b = (alpha2 * (color2 & 0xff) + alpha1 * (color1 &
             * 0xff)) / newAlpha; b |= ((~((b & 0xffffff00) - 1) >> 16) | b) & 0xff;
             */

                for (var i = 0; i < 3; i++, pixIndex++) {
                    fusion.data[pixIndex] = Math.min(255, ((alpha2 * fusion.data[pixIndex] + alpha1 * that.data[pixIndex]) / newAlpha) | 0);
                }
                fusion.data[pixIndex++] = newAlpha;
            } else {
                pixIndex += BYTES_PER_PIXEL;
            }
        }
    }
    
    fusion.alpha = 100;
};

// Linear Burn (Sub) Mode
// C = (aa * A + ab * B - aa*ab ) / (aa + ab - aa*ab)

CPBlend.prototype.fusionWithSubtractFullAlpha = function(that, fusion, rect) {
    var
        yStride = (that.width - rect.getWidth()) * BYTES_PER_PIXEL,
        pixIndex = that.offsetOfPixel(rect.left, rect.top);

    for (var y = rect.top; y < rect.bottom; y++, pixIndex += yStride) {
        for (var x = rect.left; x < rect.right; x++) {
            var 
                alpha1 = ((that.data[pixIndex + ALPHA_BYTE_OFFSET] * that.alpha) / 100) | 0,
                alpha2 = ((fusion.data[pixIndex + ALPHA_BYTE_OFFSET] * fusion.alpha) / 100) | 0,

                newAlpha = (alpha1 + alpha2 - alpha1 * alpha2 / 255) | 0;

            if (newAlpha > 0) {
                var 
                    alpha12 = alpha1 * alpha2;

                for (var i = 0; i < 3; i++, pixIndex++) {
                    var 
                        channel = (alpha2 * fusion.data[pixIndex] + alpha1 * that.data[pixIndex] - alpha12) / newAlpha;
                    
                    // binary magic to clamp negative values to zero without using a condition
                    fusion.data[pixIndex] = channel & (~channel >>> 24); 
                }
                fusion.data[pixIndex++] = newAlpha;
            } else {
                pixIndex += BYTES_PER_PIXEL;
            }
        }
    }
    
    fusion.alpha = 100;
};

// For opaque fusion
CPBlend.prototype.fusionWithSubtract = function(that, fusion, rect) {
    var
        yStride = ((that.width - rect.getWidth()) * BYTES_PER_PIXEL) | 0,
        pixIndex = that.offsetOfPixel(rect.left, rect.top) | 0;

    for (var y = rect.top; y < rect.bottom; y++, pixIndex += yStride) {
        for (var x = rect.left; x < rect.right; x++) {
            var 
                alpha1 = ((that.data[pixIndex + ALPHA_BYTE_OFFSET] * that.alpha) / 100) | 0,
                alpha12 = alpha1 * 255;

            for (var i = 0; i < 3; i++, pixIndex++) {
                var 
                    channel = (255 * fusion.data[pixIndex] + alpha1 * that.data[pixIndex] - alpha12) / 255;
                
                // binary magic to clamp negative values to zero without using a condition
                fusion.data[pixIndex] = channel & (~channel >>> 24); 
            }
            pixIndex++; // Alpha stays the same
        }
    }
    
    fusion.alpha = 100;
};

// Screen Mode
// same as Multiply except all color channels are inverted and the result too
// C = 1 - (((1-A)*aa*(1-ab) + (1-B)*ab*(1-aa) + (1-A)*(1-B)*aa*ab) / (aa + ab - aa*ab))

CPBlend.prototype.fusionWithScreenFullAlpha = function(that, fusion, rect) {
    var
        yStride = (that.width - rect.getWidth()) * BYTES_PER_PIXEL,
        pixIndex = that.offsetOfPixel(rect.left, rect.top);

    for (var y = rect.top; y < rect.bottom; y++, pixIndex += yStride) {
        for (var x = rect.left; x < rect.right; x++) {
            var 
                alpha1 = ((that.data[pixIndex + ALPHA_BYTE_OFFSET] * that.alpha) / 100) | 0,
                alpha2 = ((fusion.data[pixIndex + ALPHA_BYTE_OFFSET] * fusion.alpha) / 100) | 0,

                newAlpha = (alpha1 + alpha2 - alpha1 * alpha2 / 255) | 0;

            if (newAlpha > 0) {
                var 
                    alpha12 = (alpha1 * alpha2 / 255) | 0,
                    alpha1n2 = (alpha1 * (alpha2 ^ 0xFF) / 255) | 0,
                    alphan12 = ((alpha1 ^ 0xff) * alpha2 / 255) | 0;
                
                for (var i = 0; i < 3; i++, pixIndex++) {
                    fusion.data[pixIndex] = 0xFF ^ (
                        (
                            (that.data[pixIndex] ^ 0xFF) * alpha1n2
                            + (fusion.data[pixIndex] ^ 0xFF) * alphan12 
                            + (that.data[pixIndex] ^ 0xFF) * (fusion.data[pixIndex] ^ 0xFF) * alpha12 / 255
                        )
                        / newAlpha
                    );
                }
                fusion.data[pixIndex++] = newAlpha;
            } else {
                pixIndex += BYTES_PER_PIXEL;
            }
        }
    }
    
    fusion.alpha = 100;
};

// For opaque fusion
CPBlend.prototype.fusionWithScreen = function(that, fusion, rect) {
    var
        yStride = ((that.width - rect.getWidth()) * BYTES_PER_PIXEL) | 0,
        pixIndex = that.offsetOfPixel(rect.left, rect.top) | 0;

    for (var y = rect.top; y < rect.bottom; y++, pixIndex += yStride) {
        for (var x = rect.left; x < rect.right; x++) {
            var 
                alpha1 = ((that.data[pixIndex + ALPHA_BYTE_OFFSET] * that.alpha) / 100) | 0,
                invAlpha1 = alpha1 ^ 0xff;
            
            for (var i = 0; i < 3; i++, pixIndex++) {
                fusion.data[pixIndex] = 0xFF ^ (
                    (
                        (fusion.data[pixIndex] ^ 0xFF) * invAlpha1
                        + (that.data[pixIndex] ^ 0xFF) * (fusion.data[pixIndex] ^ 0xFF) * alpha1 / 255
                    )
                    / 255
                );
            }
            pixIndex++; // Alpha stays the same
        }
    }
    
    fusion.alpha = 100;
};

// Lighten Mode
// if B >= A: C = A*d + B*(1-d) and d = aa * (1-ab) / (aa + ab - aa*ab)
// if A > B: C = B*d + A*(1-d) and d = ab * (1-aa) / (aa + ab - aa*ab)

CPBlend.prototype.fusionWithLightenFullAlpha = function(that, fusion, rect) {
    var
        yStride = (that.width - rect.getWidth()) * BYTES_PER_PIXEL,
        pixIndex = that.offsetOfPixel(rect.left, rect.top);

    for (var y = rect.top; y < rect.bottom; y++, pixIndex += yStride) {
        for (var x = rect.left; x < rect.right; x++) {
            var 
                alpha1 = ((that.data[pixIndex + ALPHA_BYTE_OFFSET] * that.alpha) / 100) | 0,
                alpha2 = ((fusion.data[pixIndex + ALPHA_BYTE_OFFSET] * fusion.alpha) / 100) | 0,

                newAlpha = (alpha1 + alpha2 - alpha1 * alpha2 / 255) | 0;

            if (newAlpha > 0) {
                var 
                // This alpha is used when color1 > color2
                    alpha12 = (alpha2 * (alpha1 ^ 0xff) / newAlpha) | 0,
                    invAlpha12 = alpha12 ^ 0xFF,

                // This alpha is used when color2 > color1
                    alpha21 = (alpha1 * (alpha2 ^ 0xff) / newAlpha) | 0,
                    invAlpha21 = alpha21 ^ 0xFF;

                for (var i = 0; i < 3; i++, pixIndex++) {
                    var 
                        c1 = that.data[pixIndex],
                        c2 = fusion.data[pixIndex];
                    
                    fusion.data[pixIndex] = (((c2 >= c1) ? (c1 * alpha21 + c2 * invAlpha21) : (c2 * alpha12 + c1 * invAlpha12)) / 255) | 0;
                }
                fusion.data[pixIndex++] = newAlpha;
            } else {
                pixIndex += BYTES_PER_PIXEL;
            }
        }
    }
    
    fusion.alpha = 100;
}

// When fusion is opaque
CPBlend.prototype.fusionWithLighten = function(that, fusion, rect) {
    var
        yStride = (that.width - rect.getWidth()) * BYTES_PER_PIXEL,
        pixIndex = that.offsetOfPixel(rect.left, rect.top);

    for (var y = rect.top; y < rect.bottom; y++, pixIndex += yStride) {
        for (var x = rect.left; x < rect.right; x++) {
            var 
                alpha1 = ((that.data[pixIndex + ALPHA_BYTE_OFFSET] * that.alpha) / 100) | 0,
                invAlpha1 = alpha1 ^ 0xff;

            for (var i = 0; i < 3; i++, pixIndex++) {
                var 
                    c1 = that.data[pixIndex],
                    c2 = fusion.data[pixIndex];
                
                fusion.data[pixIndex] = c2 >= c1 ? c2 : (c2 * invAlpha1 + c1 * alpha1) / 255;
            }
            pixIndex++; // Opacity unchanged (still 255)
        }
    }
}

// Darken Mode
// if B >= A: C = B*d + A*(1-d) and d = ab * (1-aa) / (aa + ab - aa*ab)
// if A > B: C = A*d + B*(1-d) and d = aa * (1-ab) / (aa + ab - aa*ab)

CPBlend.prototype.fusionWithDarkenFullAlpha = function(that, fusion, rect) {
    var
        yStride = (that.width - rect.getWidth()) * BYTES_PER_PIXEL,
        pixIndex = that.offsetOfPixel(rect.left, rect.top);

    for (var y = rect.top; y < rect.bottom; y++, pixIndex += yStride) {
        for (var x = rect.left; x < rect.right; x++) {
            var 
                alpha1 = ((that.data[pixIndex + ALPHA_BYTE_OFFSET] * that.alpha) / 100) | 0,
                alpha2 = ((fusion.data[pixIndex + ALPHA_BYTE_OFFSET] * fusion.alpha) / 100) | 0,

                newAlpha = (alpha1 + alpha2 - alpha1 * alpha2 / 255) | 0;

            if (newAlpha > 0) {
                var
                    // This alpha is used when color1 > color2
                alpha12 = (alpha1 * (alpha2 ^ 0xff) / newAlpha) | 0,
                invAlpha12 = (alpha12 ^ 0xff) | 0,

                // This alpha is used when color2 > color1
                    alpha21 = (alpha2 * (alpha1 ^ 0xff) / newAlpha) | 0,
                    invAlpha21 = (alpha21 ^ 0xff) | 0;

                for (var i = 0; i < 3; i++, pixIndex++) {
                    var 
                        c1 = that.data[pixIndex],
                        c2 = fusion.data[pixIndex];
                    
                    fusion.data[pixIndex] = (((c2 >= c1) ? (c2 * alpha21 + c1 * invAlpha21) : (c1 * alpha12 + c2 * invAlpha12)) / 255) | 0;
                }
                fusion.data[pixIndex++] = newAlpha;
            } else {
                pixIndex += BYTES_PER_PIXEL;
            }
        }
    }
    
    fusion.alpha = 100;
};

// When fusion is opaque
CPBlend.prototype.fusionWithDarken = function(that, fusion, rect) {
    var
        yStride = ((that.width - rect.getWidth()) * BYTES_PER_PIXEL) | 0,
        pixIndex = that.offsetOfPixel(rect.left, rect.top) | 0;

    for (var y = rect.top; y < rect.bottom; y++, pixIndex += yStride) {
        for (var x = rect.left; x < rect.right; x++) {
            var 
                alpha1 = ((that.data[pixIndex + ALPHA_BYTE_OFFSET] * that.alpha) / 100) | 0,
                invAlpha1 = alpha1 ^ 0xff;

            for (var i = 0; i < 3; i++, pixIndex++) {
                var 
                    c1 = that.data[pixIndex],
                    c2 = fusion.data[pixIndex];
                
                fusion.data[pixIndex] = c2 >= c1 ? (c2 * invAlpha1 + c1 * alpha1) / 255 : c2;
            }
            
            pixIndex++; // Alpha stays the same
        }
    }
    
    fusion.alpha = 100;
};

// Dodge Mode
//
// C = (aa*(1-ab)*A + (1-aa)*ab*B + aa*ab*B/(1-A)) / (aa + ab - aa*ab)

CPBlend.prototype.fusionWithDodgeFullAlpha = function(that, fusion, rect) {
    var
        yStride = (that.width - rect.getWidth()) * BYTES_PER_PIXEL,
        pixIndex = that.offsetOfPixel(rect.left, rect.top);

    for (var y = rect.top; y < rect.bottom; y++, pixIndex += yStride) {
        for (var x = rect.left; x < rect.right; x++) {
            var 
                alpha1 = ((that.data[pixIndex + ALPHA_BYTE_OFFSET] * that.alpha) / 100) | 0;
            
            if (alpha1 == 0) {
                pixIndex += BYTES_PER_PIXEL;
                continue;
            }
            
            var
                alpha2 = ((fusion.data[pixIndex + ALPHA_BYTE_OFFSET] * fusion.alpha) / 100) | 0,
                newAlpha = (alpha1 + alpha2 - alpha1 * alpha2 / 255) | 0;
            
            if (newAlpha > 0) {
                var
                    alpha12 = (alpha1 * alpha2 / 255) | 0,
                    alpha1n2 = (alpha1 * (alpha2 ^ 0xff) / 255) | 0,
                    alphan12 = ((alpha1 ^ 0xff) * alpha2 / 255) | 0;
                
                for (var i = 0; i < 3; i++, pixIndex++) {
                    var 
                        color1 = that.data[pixIndex],
                        color2 = fusion.data[pixIndex],
                        invColor1 = color1 ^ 0xFF;
                    
                    fusion.data[pixIndex] = 
                        ((
                            (color1 * alpha1n2) 
                            + (color2 * alphan12) 
                            + alpha12 * (invColor1 == 0 ? 255 : Math.min(255, (255 * color2 / invColor1) | 0))
                        ) / newAlpha) | 0;
                }
                fusion.data[pixIndex++] = newAlpha;
            } else {
                pixIndex += BYTES_PER_PIXEL;
            }
        }
    }
    
    fusion.alpha = 100;
};

// When fusion is opaque
CPBlend.prototype.fusionWithDodge = function(that, fusion, rect) {
    var
        yStride = (that.width - rect.getWidth()) * BYTES_PER_PIXEL,
        pixIndex = that.offsetOfPixel(rect.left, rect.top);

    for (var y = rect.top; y < rect.bottom; y++, pixIndex += yStride) {
        for (var x = rect.left; x < rect.right; x++) {
            var 
                alpha1 = ((that.data[pixIndex + ALPHA_BYTE_OFFSET] * that.alpha) / 100) | 0;
            
            if (alpha1 == 0) {
                pixIndex += BYTES_PER_PIXEL;
                continue;
            }
            
            var
                invAlpha1 = alpha1 ^ 0xff;
            
            for (var i = 0; i < 3; i++, pixIndex++) {
                var 
                    color1 = that.data[pixIndex],
                    color2 = fusion.data[pixIndex],
                    invColor1 = color1 ^ 0xFF;
                
                fusion.data[pixIndex] = 
                    ((
                        color2 * invAlpha1 
                        + alpha1 * (invColor1 == 0 ? 255 : Math.min(255, (255 * color2 / invColor1) | 0))
                    ) / 255) | 0;
            }
            pixIndex++; // Alpha stays the same
        }
    }
};

// Burn Mode
//
// C = (aa*(1-ab)*A + (1-aa)*ab*B + aa*ab*(1-(1-B)/A)) / (aa + ab - aa*ab)

CPBlend.prototype.fusionWithBurnFullAlpha = function(that, fusion, rect) {
    var
        yStride = (that.width - rect.getWidth()) * BYTES_PER_PIXEL,
        pixIndex = that.offsetOfPixel(rect.left, rect.top);

    for (var y = rect.top; y < rect.bottom; y++, pixIndex += yStride) {
        for (var x = rect.left; x < rect.right; x++) {
            var 
                alpha1 = ((that.data[pixIndex + ALPHA_BYTE_OFFSET] * that.alpha) / 100) | 0;
            
            if (alpha1 == 0) {
                pixIndex += BYTES_PER_PIXEL;
                continue;
            }
            
            var
                alpha2 = ((fusion.data[pixIndex + ALPHA_BYTE_OFFSET] * fusion.alpha) / 100) | 0,
                newAlpha = (alpha1 + alpha2 - alpha1 * alpha2 / 255) | 0;
            
            if (newAlpha > 0) {
                var
                    alpha12 = (alpha1 * alpha2 / 255) | 0,
                    alpha1n2 = (alpha1 * (alpha2 ^ 0xff) / 255) | 0,
                    alphan12 = ((alpha1 ^ 0xff) * alpha2 / 255) | 0;

                for (var i = 0; i < 3; i++, pixIndex++) {
                    var 
                        color1 = that.data[pixIndex],
                        color2 = fusion.data[pixIndex],
                        invColor2 = color2 ^ 0xFF;
                    
                    fusion.data[pixIndex] = 
                        ((
                            color1 * alpha1n2 
                            + color2 * alphan12 
                            + alpha12 * (color1 == 0 ? 0 : Math.min(255, 255 * invColor2 / color1) ^ 0xff)
                        )
                        / newAlpha) | 0;
                }
                fusion.data[pixIndex++] = newAlpha;  
            } else {
                pixIndex += BYTES_PER_PIXEL;
            }
        }
    }
    
    fusion.alpha = 100;
};

// When fusion is opaque
CPBlend.prototype.fusionWithBurn = function(that, fusion, rect) {
    var
        yStride = ((that.width - rect.getWidth()) * BYTES_PER_PIXEL) | 0,
        pixIndex = that.offsetOfPixel(rect.left, rect.top) | 0;

    for (var y = rect.top; y < rect.bottom; y++, pixIndex += yStride) {
        for (var x = rect.left; x < rect.right; x++) {
            var 
                alpha1 = ((that.data[pixIndex + ALPHA_BYTE_OFFSET] * that.alpha) / 100) | 0;
            
            if (alpha1 == 0) {
                pixIndex += BYTES_PER_PIXEL;
                continue;
            }
            
            var
                invAlpha1 = alpha1 ^ 0xff;

            for (var i = 0; i < 3; i++, pixIndex++) {
                var 
                    color1 = that.data[pixIndex],
                    color2 = fusion.data[pixIndex],
                    invColor2 = color2 ^ 0xFF;
                
                fusion.data[pixIndex] = 
                    ((
                        color2 * invAlpha1 
                        + alpha1 * (color1 == 0 ? 0 : Math.min(255, 255 * invColor2 / color1) ^ 0xff)
                    )
                    / 255) | 0;
            }
            pixIndex++; // Alpha stays the same
        }
    }
    
    fusion.alpha = 100;
};

// Overlay Mode
// If B <= 0.5 C = (A*aa*(1-ab) + B*ab*(1-aa) + aa*ab*(2*A*B) / (aa + ab - aa*ab)
// If B > 0.5 C = (A*aa*(1-ab) + B*ab*(1-aa) + aa*ab*(1 - 2*(1-A)*(1-B)) / (aa + ab - aa*ab)

CPBlend.prototype.fusionWithOverlayFullAlpha = function(that, fusion, rect) {
    var
        yStride = (that.width - rect.getWidth()) * BYTES_PER_PIXEL,
        pixIndex = that.offsetOfPixel(rect.left, rect.top);

    for (var y = rect.top; y < rect.bottom; y++, pixIndex += yStride) {
        for (var x = rect.left; x < rect.right; x++) {
            var 
                alpha1 = ((that.data[pixIndex + ALPHA_BYTE_OFFSET] * that.alpha) / 100) | 0;
            
            if (alpha1 == 0) {
                pixIndex += BYTES_PER_PIXEL;
                continue;
            }
            
            var
                alpha2 = ((fusion.data[pixIndex + ALPHA_BYTE_OFFSET] * fusion.alpha) / 100) | 0,
                newAlpha = (alpha1 + alpha2 - alpha1 * alpha2 / 255) | 0;
            
            if (newAlpha > 0) {
                var
                    alpha12 = (alpha1 * alpha2 / 255) | 0,
                    alpha1n2 = (alpha1 * (alpha2 ^ 0xff) / 255) | 0,
                    alphan12 = ((alpha1 ^ 0xff) * alpha2 / 255) | 0;

                for (var i = 0; i < 3; i++, pixIndex++) {
                    var 
                        c1 = that.data[pixIndex],
                        c2 = fusion.data[pixIndex];
                    
                    fusion.data[pixIndex] = 
                        ((
                            alpha1n2 * c1 
                            + alphan12 * c2 
                            + (
                                c2 <= 127
                                    ? (alpha12 * 2 * c1 * c2 / 255)
                                    : (alpha12 * ((2 * (c1 ^ 0xff) * (c2 ^ 0xff) / 255) ^ 0xff))
                            )
                        ) / newAlpha) | 0;
                }
                fusion.data[pixIndex++] = newAlpha;
            } else {
                pixIndex += BYTES_PER_PIXEL;
            }
        }
    }
    
    fusion.alpha = 100;
};

// When fusion is opaque
CPBlend.prototype.fusionWithOverlay = function(that, fusion, rect) {
    var
        yStride = ((that.width - rect.getWidth()) * BYTES_PER_PIXEL) | 0,
        pixIndex = that.offsetOfPixel(rect.left, rect.top) | 0;

    for (var y = rect.top; y < rect.bottom; y++, pixIndex += yStride) {
        for (var x = rect.left; x < rect.right; x++) {
            var 
                alpha1 = ((that.data[pixIndex + ALPHA_BYTE_OFFSET] * that.alpha) / 100) | 0;
            
            if (alpha1 == 0) {
                pixIndex += BYTES_PER_PIXEL;
                continue;
            }
            
            var
                alphan12 = alpha1 ^ 0xff;

            for (var i = 0; i < 3; i++, pixIndex++) {
                var 
                    c1 = that.data[pixIndex],
                    c2 = fusion.data[pixIndex];
                
                fusion.data[pixIndex] = 
                    ((
                        alphan12 * c2 
                        + (
                            c2 <= 127
                                ? (alpha1 * 2 * c1 * c2 / 255)
                                : (alpha1 * ((2 * (c1 ^ 0xff) * (c2 ^ 0xff) / 255) ^ 0xff))
                        )
                    ) / 255) | 0;
            }
            pixIndex++; // Alpha stays 255
        }
    }
};

// Hard Light Mode (same as Overlay with A and B swapped)
// If A <= 0.5 C = (A*aa*(1-ab) + B*ab*(1-aa) + aa*ab*(2*A*B) / (aa + ab - aa*ab)
// If A > 0.5 C = (A*aa*(1-ab) + B*ab*(1-aa) + aa*ab*(1 - 2*(1-A)*(1-B)) / (aa + ab - aa*ab)

CPBlend.prototype.fusionWithHardLightFullAlpha = function(that, fusion, rect) {
    var
        yStride = (that.width - rect.getWidth()) * BYTES_PER_PIXEL,
        pixIndex = that.offsetOfPixel(rect.left, rect.top);

    for (var y = rect.top; y < rect.bottom; y++, pixIndex += yStride) {
        for (var x = rect.left; x < rect.right; x++) {
            var 
                alpha1 = ((that.data[pixIndex + ALPHA_BYTE_OFFSET] * that.alpha) / 100) | 0;
            
            if (alpha1 == 0) {
                pixIndex += BYTES_PER_PIXEL;
                continue;
            }
            
            var
                alpha2 = ((fusion.data[pixIndex + ALPHA_BYTE_OFFSET] * fusion.alpha) / 100) | 0,
                newAlpha = (alpha1 + alpha2 - alpha1 * alpha2 / 255) | 0;
            
            if (newAlpha > 0) {
                var
                    alpha12 = (alpha1 * alpha2 / 255) | 0,
                    alpha1n2 = (alpha1 * (alpha2 ^ 0xff) / 255) | 0,
                    alphan12 = ((alpha1 ^ 0xff) * alpha2 / 255) | 0;

                for (var i = 0; i < 3; i++, pixIndex++) {
                    var 
                        c1 = that.data[pixIndex],
                        c2 = fusion.data[pixIndex];
                    
                    fusion.data[pixIndex] = 
                        ((
                            alpha1n2 * c1 
                            + alphan12 * c2 
                            + (
                                c1 <= 127
                                    ? (alpha12 * 2 * c1 * c2 / 255)
                                    : (alpha12 * ((2 * (c1 ^ 0xff) * (c2 ^ 0xff) / 255) ^ 0xff))
                            )
                        ) / newAlpha) | 0;
                }
                fusion.data[pixIndex++] = newAlpha;
            } else {
                pixIndex += BYTES_PER_PIXEL;
            }
        }
    }
    
    fusion.alpha = 100;
};

// Soft Light Mode
// A < 0.5 => C = (2*A - 1) * (B - B^2) + B
// A > 0.5 => C = (2*A - 1) * (sqrt(B) - B) + B

CPBlend.prototype.fusionWithSoftLightFullAlpha = function(that, fusion, rect) {
    var
        yStride = (that.width - rect.getWidth()) * BYTES_PER_PIXEL,
        pixIndex = that.offsetOfPixel(rect.left, rect.top);

    for (var y = rect.top; y < rect.bottom; y++, pixIndex += yStride) {
        for (var x = rect.left; x < rect.right; x++) {
            var 
                alpha1 = ((that.data[pixIndex + ALPHA_BYTE_OFFSET] * that.alpha) / 100) | 0;
            
            if (alpha1 == 0) {
                pixIndex += BYTES_PER_PIXEL;
                continue;
            }
            
            var
                alpha2 = ((fusion.data[pixIndex + ALPHA_BYTE_OFFSET] * fusion.alpha) / 100) | 0,
                newAlpha = (alpha1 + alpha2 - alpha1 * alpha2 / 255) | 0;
            
            if (newAlpha > 0) {
                var
                    alpha12 = (alpha1 * alpha2 / 255) | 0,
                    alpha1n2 = (alpha1 * (alpha2 ^ 0xff) / 255) | 0,
                    alphan12 = ((alpha1 ^ 0xff) * alpha2 / 255) | 0;

                for (var i = 0; i < 3; i++, pixIndex++) {
                    var 
                        c1 = that.data[pixIndex],
                        c2 = fusion.data[pixIndex];
                    
                    fusion.data[pixIndex] = 
                        ((
                            alpha1n2 * c1 
                            + alphan12 * c2 
                            + (
                                c1 <= 127
                                    ? alpha12 * ((2 * c1 - 255) * that.softLightLUTSquare[c2] / 255 + c2)
                                    : alpha12 * ((2 * c1 - 255) * that.softLightLUTSquareRoot[c2] / 255 + c2)
                            )
                        ) / newAlpha) | 0;
                }
                fusion.data[pixIndex++] = newAlpha;

            } else {
                pixIndex += BYTES_PER_PIXEL;
            }
        }
    }
    
    fusion.alpha = 100;
};

// Vivid Light Mode
// A < 0.5 => C = 1 - (1-B) / (2*A)
// A > 0.5 => C = B / (2*(1-A))

CPBlend.prototype.fusionWithVividLightFullAlpha = function(that, fusion, rect) {
    var
        yStride = (that.width - rect.getWidth()) * BYTES_PER_PIXEL,
        pixIndex = that.offsetOfPixel(rect.left, rect.top);

    for (var y = rect.top; y < rect.bottom; y++, pixIndex += yStride) {
        for (var x = rect.left; x < rect.right; x++) {
            var 
                alpha1 = ((that.data[pixIndex + ALPHA_BYTE_OFFSET] * that.alpha) / 100) | 0;
            
            if (alpha1 == 0) {
                pixIndex += BYTES_PER_PIXEL;
                continue;
            }
            
            var
                alpha2 = ((fusion.data[pixIndex + ALPHA_BYTE_OFFSET] * fusion.alpha) / 100) | 0,
                newAlpha = (alpha1 + alpha2 - alpha1 * alpha2 / 255) | 0;
            
            if (newAlpha > 0) {
                var
                    alpha12 = (alpha1 * alpha2 / 255) | 0,
                    alpha1n2 = (alpha1 * (alpha2 ^ 0xff) / 255) | 0,
                    alphan12 = ((alpha1 ^ 0xff) * alpha2 / 255) | 0;

                for (var i = 0; i < 3; i++, pixIndex++) {
                    var 
                        c1 = that.data[pixIndex],
                        c2 = fusion.data[pixIndex];
                    
                    fusion.data[pixIndex] = 
                        ((
                            alpha1n2 * c1 
                            + alphan12 * c2 
                            + (
                                c1 <= 127
                                    ? (alpha12 * ((c1 == 0) ? 0 : 255 - Math.min(255, (255 - c2) * 255 / (2 * c1))))
                                    : (alpha12 * (c1 == 255 ? 255 : Math.min(255, c2 * 255 / (2 * (255 - c1)))))
                            )
                        ) / newAlpha) | 0;
                }
                fusion.data[pixIndex++] = newAlpha;
            } else {
                pixIndex += BYTES_PER_PIXEL;
            }
        }
    }
    
    fusion.alpha = 100;
};

// Linear Light Mode
// C = B + 2*A -1

CPBlend.prototype.fusionWithLinearLightFullAlpha = function(that, fusion, rect) {
    var
        yStride = (that.width - rect.getWidth()) * BYTES_PER_PIXEL,
        pixIndex = that.offsetOfPixel(rect.left, rect.top);

    for (var y = rect.top; y < rect.bottom; y++, pixIndex += yStride) {
        for (var x = rect.left; x < rect.right; x++) {
            var 
                alpha1 = ((that.data[pixIndex + ALPHA_BYTE_OFFSET] * that.alpha) / 100) | 0;
            
            if (alpha1 == 0) {
                pixIndex += BYTES_PER_PIXEL;
                continue;
            }
            
            var
                alpha2 = ((fusion.data[pixIndex + ALPHA_BYTE_OFFSET] * fusion.alpha) / 100) | 0,
                newAlpha = (alpha1 + alpha2 - alpha1 * alpha2 / 255) | 0;
            
            if (newAlpha > 0) {
                var
                    alpha12 = (alpha1 * alpha2 / 255) | 0,
                    alpha1n2 = (alpha1 * (alpha2 ^ 0xff) / 255) | 0,
                    alphan12 = ((alpha1 ^ 0xff) * alpha2 / 255) | 0;
                    
                for (var i = 0; i < 3; i++, pixIndex++) {
                    var 
                        c1 = that.data[pixIndex],
                        c2 = fusion.data[pixIndex];
                    
                    fusion.data[pixIndex] = 
                        ((
                            alpha1n2 * c1 
                            + alphan12 * c2 
                            + alpha12 * Math.min(255, Math.max(0, c2 + 2 * c1 - 255))
                        ) / newAlpha) | 0;
                }
                fusion.data[pixIndex++] = newAlpha;
            } else {
                pixIndex += BYTES_PER_PIXEL;
            }
        }
    }
    
    fusion.alpha = 100;
};

// Pin Light Mode
// B > 2*A => C = 2*A
// B < 2*A-1 => C = 2*A-1
// else => C = B

CPBlend.prototype.fusionWithPinLightFullAlpha = function(that, fusion, rect) {
    var
        yStride = (that.width - rect.getWidth()) * BYTES_PER_PIXEL,
        pixIndex = that.offsetOfPixel(rect.left, rect.top);

    for (var y = rect.top; y < rect.bottom; y++, pixIndex += yStride) {
        for (var x = rect.left; x < rect.right; x++) {
            var 
                alpha1 = ((that.data[pixIndex + ALPHA_BYTE_OFFSET] * that.alpha) / 100) | 0;
            
            if (alpha1 == 0) {
                pixIndex += BYTES_PER_PIXEL;
                continue;
            }
            
            var
                alpha2 = ((fusion.data[pixIndex + ALPHA_BYTE_OFFSET] * fusion.alpha) / 100) | 0,
                newAlpha = (alpha1 + alpha2 - alpha1 * alpha2 / 255) | 0;
            
            if (newAlpha > 0) {
                var
                    alpha12 = (alpha1 * alpha2 / 255) | 0,
                    alpha1n2 = (alpha1 * (alpha2 ^ 0xff) / 255) | 0,
                    alphan12 = ((alpha1 ^ 0xff) * alpha2 / 255) | 0;

                for (var i = 0; i < 3; i++, pixIndex++) {
                    var 
                        c1 = that.data[pixIndex],
                        c2 = fusion.data[pixIndex],
                        c3 = (c2 >= 2 * c1) ? (2 * c1) : (c2 <= 2 * c1 - 255) ? (2 * c1 - 255) : c2;
                    
                    fusion.data[pixIndex] = ((
                        alpha1n2 * c1 
                        + alphan12 * c2 
                        + alpha12 * c3
                    ) / newAlpha) | 0;
                }
                fusion.data[pixIndex++] = newAlpha;
            } else {
                pixIndex += BYTES_PER_PIXEL;
            }
        }
    }
    
    fusion.alpha = 100;
};