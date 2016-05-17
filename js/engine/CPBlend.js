// This file is generated, please see codegenerator/BlendGenerator.js!

    export default function CPBlend() {
    }
    
    const
        BYTES_PER_PIXEL = 4,
        ALPHA_BYTE_OFFSET = 3,
        
        BLEND_MODE_NAMES = [
            "normal",
            "multiply",
            "add",
            "screen",
            "lighten",
            "darken",
            "subtract",
            "dodge",
            "burn",
            "overlay",
            "hardLight",
            "softLight",
            "vividLight",
            "linearLight",
            "pinLight"
        ],
        
        softLightLUTSquare = new Array(256),
        softLightLUTSquareRoot = new Array(256);
    
    
                /**
 * Blend the given layer onto the fusion using the multiply blending operator.
 * 
 * The layer must have its layer alpha set to 100
 * 
 * Fusion pixels must be opaque, and the fusion layer's opacity must be set to 100.
 */

                CPBlend.multiplyOntoOpaqueFusionWithOpaqueLayer = function(layer, fusion, rect) {
                    var
                        h = rect.getHeight() | 0,
w = rect.getWidth() | 0,
yStride = ((layer.width - w) * BYTES_PER_PIXEL) | 0,
pixIndex = layer.offsetOfPixel(rect.left, rect.top) | 0;
                        
                    for (var y = 0 ; y < h; y++, pixIndex += yStride) {
                        for (var x = 0; x < w; x++, pixIndex += BYTES_PER_PIXEL) {
                            var
                                alpha1,
color2;
                            
                            alpha1 = layer.data[pixIndex + ALPHA_BYTE_OFFSET];
                            
                            
                    if (alpha1) {
                
                                
                        color2 = fusion.data[pixIndex];
                    
                    fusion.data[pixIndex] = (color2 - (layer.data[pixIndex] ^ 0xFF) * color2 * alpha1 / (255 * 255)) | 0;
                
                        color2 = fusion.data[pixIndex + 1];
                    
                    fusion.data[pixIndex + 1] = (color2 - (layer.data[pixIndex + 1] ^ 0xFF) * color2 * alpha1 / (255 * 255)) | 0;
                
                        color2 = fusion.data[pixIndex + 2];
                    
                    fusion.data[pixIndex + 2] = (color2 - (layer.data[pixIndex + 2] ^ 0xFF) * color2 * alpha1 / (255 * 255)) | 0;
                
            
                            
                    }
                
                        }
                    }
                };
            
                /**
 * Blend the given layer onto the fusion using the multiply blending operator.
 * 
 * Fusion pixels must be opaque, and the fusion layer's opacity must be set to 100.
 */

                CPBlend.multiplyOntoOpaqueFusionWithTransparentLayer = function(layer, fusion, rect) {
                    var
                        h = rect.getHeight() | 0,
w = rect.getWidth() | 0,
yStride = ((layer.width - w) * BYTES_PER_PIXEL) | 0,
pixIndex = layer.offsetOfPixel(rect.left, rect.top) | 0;
                        
                    for (var y = 0 ; y < h; y++, pixIndex += yStride) {
                        for (var x = 0; x < w; x++, pixIndex += BYTES_PER_PIXEL) {
                            var
                                alpha1,
color2;
                            
                            alpha1 = (((layer.data[pixIndex + ALPHA_BYTE_OFFSET]) * layer.alpha / 100)  | 0);
                            
                            
                    if (alpha1) {
                
                                
                        color2 = fusion.data[pixIndex];
                    
                    fusion.data[pixIndex] = (color2 - (layer.data[pixIndex] ^ 0xFF) * color2 * alpha1 / (255 * 255)) | 0;
                
                        color2 = fusion.data[pixIndex + 1];
                    
                    fusion.data[pixIndex + 1] = (color2 - (layer.data[pixIndex + 1] ^ 0xFF) * color2 * alpha1 / (255 * 255)) | 0;
                
                        color2 = fusion.data[pixIndex + 2];
                    
                    fusion.data[pixIndex + 2] = (color2 - (layer.data[pixIndex + 2] ^ 0xFF) * color2 * alpha1 / (255 * 255)) | 0;
                
            
                            
                    }
                
                        }
                    }
                };
            
                /**
 * Blend the given layer onto the fusion using the multiply blending operator.
 * 
 * The layer must have its layer alpha set to 100
 * 
 * Fusion can contain transparent pixels, but the fusion layer's opacity must be set to 100.
 */

                CPBlend.multiplyOntoTransparentFusionWithOpaqueLayer = function(layer, fusion, rect) {
                    var
                        h = rect.getHeight() | 0,
w = rect.getWidth() | 0,
yStride = ((layer.width - w) * BYTES_PER_PIXEL) | 0,
pixIndex = layer.offsetOfPixel(rect.left, rect.top) | 0;
                        
                    for (var y = 0 ; y < h; y++, pixIndex += yStride) {
                        for (var x = 0; x < w; x++, pixIndex += BYTES_PER_PIXEL) {
                            var
                                alpha1,
alpha2,
color1,
color2;
                            
                            alpha1 = layer.data[pixIndex + ALPHA_BYTE_OFFSET];
                            
                            
                    if (alpha1) {
                        alpha2 = fusion.data[pixIndex + ALPHA_BYTE_OFFSET];
                
                                
                var
                    newAlpha = (alpha1 + alpha2 - alpha1 * alpha2 / 255) | 0,

                    alpha12 = (alpha1 * alpha2 / 255) | 0,
                    alpha1n2 = (alpha1 * (alpha2 ^ 0xFF) / 255) | 0,
                    alphan12 = ((alpha1 ^ 0xFF) * alpha2 / 255) | 0;

                        color1 = layer.data[pixIndex];
                    
                        color2 = fusion.data[pixIndex];
                    
                    fusion.data[pixIndex] = ((color1 * alpha1n2 + color2 * alphan12 + color1 * color2 * alpha12 / 255) / newAlpha) | 0;
                
                        color1 = layer.data[pixIndex + 1];
                    
                        color2 = fusion.data[pixIndex + 1];
                    
                    fusion.data[pixIndex + 1] = ((color1 * alpha1n2 + color2 * alphan12 + color1 * color2 * alpha12 / 255) / newAlpha) | 0;
                
                        color1 = layer.data[pixIndex + 2];
                    
                        color2 = fusion.data[pixIndex + 2];
                    
                    fusion.data[pixIndex + 2] = ((color1 * alpha1n2 + color2 * alphan12 + color1 * color2 * alpha12 / 255) / newAlpha) | 0;

            fusion.data[pixIndex + ALPHA_BYTE_OFFSET] = newAlpha;
        
            
                            
                    }
                
                        }
                    }
                };
            
                /**
 * Blend the given layer onto the fusion using the multiply blending operator.
 * 
 * Fusion can contain transparent pixels, but the fusion layer's opacity must be set to 100.
 */

                CPBlend.multiplyOntoTransparentFusionWithTransparentLayer = function(layer, fusion, rect) {
                    var
                        h = rect.getHeight() | 0,
w = rect.getWidth() | 0,
yStride = ((layer.width - w) * BYTES_PER_PIXEL) | 0,
pixIndex = layer.offsetOfPixel(rect.left, rect.top) | 0;
                        
                    for (var y = 0 ; y < h; y++, pixIndex += yStride) {
                        for (var x = 0; x < w; x++, pixIndex += BYTES_PER_PIXEL) {
                            var
                                alpha1,
alpha2,
color1,
color2;
                            
                            alpha1 = (((layer.data[pixIndex + ALPHA_BYTE_OFFSET]) * layer.alpha / 100)  | 0);
                            
                            
                    if (alpha1) {
                        alpha2 = fusion.data[pixIndex + ALPHA_BYTE_OFFSET];
                
                                
                var
                    newAlpha = (alpha1 + alpha2 - alpha1 * alpha2 / 255) | 0,

                    alpha12 = (alpha1 * alpha2 / 255) | 0,
                    alpha1n2 = (alpha1 * (alpha2 ^ 0xFF) / 255) | 0,
                    alphan12 = ((alpha1 ^ 0xFF) * alpha2 / 255) | 0;

                        color1 = layer.data[pixIndex];
                    
                        color2 = fusion.data[pixIndex];
                    
                    fusion.data[pixIndex] = ((color1 * alpha1n2 + color2 * alphan12 + color1 * color2 * alpha12 / 255) / newAlpha) | 0;
                
                        color1 = layer.data[pixIndex + 1];
                    
                        color2 = fusion.data[pixIndex + 1];
                    
                    fusion.data[pixIndex + 1] = ((color1 * alpha1n2 + color2 * alphan12 + color1 * color2 * alpha12 / 255) / newAlpha) | 0;
                
                        color1 = layer.data[pixIndex + 2];
                    
                        color2 = fusion.data[pixIndex + 2];
                    
                    fusion.data[pixIndex + 2] = ((color1 * alpha1n2 + color2 * alphan12 + color1 * color2 * alpha12 / 255) / newAlpha) | 0;

            fusion.data[pixIndex + ALPHA_BYTE_OFFSET] = newAlpha;
        
            
                            
                    }
                
                        }
                    }
                };
            
                /**
 * Blend the given layer onto the fusion using the normal blending operator.
 * 
 * The layer must have its layer alpha set to 100
 * 
 * Fusion pixels must be opaque, and the fusion layer's opacity must be set to 100.
 */

                CPBlend.normalOntoOpaqueFusionWithOpaqueLayer = function(layer, fusion, rect) {
                    var
                        h = rect.getHeight() | 0,
w = rect.getWidth() | 0,
yStride = ((layer.width - w) * BYTES_PER_PIXEL) | 0,
pixIndex = layer.offsetOfPixel(rect.left, rect.top) | 0;
                        
                    for (var y = 0 ; y < h; y++, pixIndex += yStride) {
                        for (var x = 0; x < w; x++, pixIndex += BYTES_PER_PIXEL) {
                            var
                                alpha1,
color1;
                            
                            alpha1 = layer.data[pixIndex + ALPHA_BYTE_OFFSET];
                            
                            
                    if (alpha1) {
                
                                
                if (alpha1 == 255) {

                    fusion.data[pixIndex] = layer.data[pixIndex];
                
                    fusion.data[pixIndex + 1] = layer.data[pixIndex + 1];
                
                    fusion.data[pixIndex + 2] = layer.data[pixIndex + 2];
                
                } else {
                    var
                        invAlpha1 = 255 - alpha1;

                        color1 = layer.data[pixIndex];
                    
                    fusion.data[pixIndex] = ((color1 * alpha1 + fusion.data[pixIndex] * invAlpha1) / 255) | 0;
                
                        color1 = layer.data[pixIndex + 1];
                    
                    fusion.data[pixIndex + 1] = ((color1 * alpha1 + fusion.data[pixIndex + 1] * invAlpha1) / 255) | 0;
                
                        color1 = layer.data[pixIndex + 2];
                    
                    fusion.data[pixIndex + 2] = ((color1 * alpha1 + fusion.data[pixIndex + 2] * invAlpha1) / 255) | 0;
                
                }
            
                            
                    }
                
                        }
                    }
                };
            
                /**
 * Blend the given layer onto the fusion using the normal blending operator.
 * 
 * Fusion pixels must be opaque, and the fusion layer's opacity must be set to 100.
 */

                CPBlend.normalOntoOpaqueFusionWithTransparentLayer = function(layer, fusion, rect) {
                    var
                        h = rect.getHeight() | 0,
w = rect.getWidth() | 0,
yStride = ((layer.width - w) * BYTES_PER_PIXEL) | 0,
pixIndex = layer.offsetOfPixel(rect.left, rect.top) | 0;
                        
                    for (var y = 0 ; y < h; y++, pixIndex += yStride) {
                        for (var x = 0; x < w; x++, pixIndex += BYTES_PER_PIXEL) {
                            var
                                alpha1,
color1;
                            
                            alpha1 = (((layer.data[pixIndex + ALPHA_BYTE_OFFSET]) * layer.alpha / 100)  | 0);
                            
                            
                    if (alpha1) {
                
                                
                if (alpha1 == 255) {

                    fusion.data[pixIndex] = layer.data[pixIndex];
                
                    fusion.data[pixIndex + 1] = layer.data[pixIndex + 1];
                
                    fusion.data[pixIndex + 2] = layer.data[pixIndex + 2];
                
                } else {
                    var
                        invAlpha1 = 255 - alpha1;

                        color1 = layer.data[pixIndex];
                    
                    fusion.data[pixIndex] = ((color1 * alpha1 + fusion.data[pixIndex] * invAlpha1) / 255) | 0;
                
                        color1 = layer.data[pixIndex + 1];
                    
                    fusion.data[pixIndex + 1] = ((color1 * alpha1 + fusion.data[pixIndex + 1] * invAlpha1) / 255) | 0;
                
                        color1 = layer.data[pixIndex + 2];
                    
                    fusion.data[pixIndex + 2] = ((color1 * alpha1 + fusion.data[pixIndex + 2] * invAlpha1) / 255) | 0;
                
                }
            
                            
                    }
                
                        }
                    }
                };
            
                /**
 * Blend the given layer onto the fusion using the normal blending operator.
 * 
 * The layer must have its layer alpha set to 100
 * 
 * Fusion can contain transparent pixels, but the fusion layer's opacity must be set to 100.
 */

                CPBlend.normalOntoTransparentFusionWithOpaqueLayer = function(layer, fusion, rect) {
                    var
                        h = rect.getHeight() | 0,
w = rect.getWidth() | 0,
yStride = ((layer.width - w) * BYTES_PER_PIXEL) | 0,
pixIndex = layer.offsetOfPixel(rect.left, rect.top) | 0;
                        
                    for (var y = 0 ; y < h; y++, pixIndex += yStride) {
                        for (var x = 0; x < w; x++, pixIndex += BYTES_PER_PIXEL) {
                            var
                                alpha1,
alpha2;
                            
                            alpha1 = layer.data[pixIndex + ALPHA_BYTE_OFFSET];
                            
                            
                    if (alpha1) {
                        alpha2 = fusion.data[pixIndex + ALPHA_BYTE_OFFSET];
                
                                
                var
                    newAlpha = (alpha1 + alpha2 - alpha1 * alpha2 / 255) | 0,
                    realAlpha = (alpha1 * 255 / newAlpha) | 0,
                    invAlpha = 255 - realAlpha;

                    fusion.data[pixIndex] = (layer.data[pixIndex] * realAlpha + fusion.data[pixIndex] * invAlpha) / 255;
                
                    fusion.data[pixIndex + 1] = (layer.data[pixIndex + 1] * realAlpha + fusion.data[pixIndex + 1] * invAlpha) / 255;
                
                    fusion.data[pixIndex + 2] = (layer.data[pixIndex + 2] * realAlpha + fusion.data[pixIndex + 2] * invAlpha) / 255;

            fusion.data[pixIndex + ALPHA_BYTE_OFFSET] = newAlpha;
        
            
                            
                    }
                
                        }
                    }
                };
            
                /**
 * Blend the given layer onto the fusion using the normal blending operator.
 * 
 * Fusion can contain transparent pixels, but the fusion layer's opacity must be set to 100.
 */

                CPBlend.normalOntoTransparentFusionWithTransparentLayer = function(layer, fusion, rect) {
                    var
                        h = rect.getHeight() | 0,
w = rect.getWidth() | 0,
yStride = ((layer.width - w) * BYTES_PER_PIXEL) | 0,
pixIndex = layer.offsetOfPixel(rect.left, rect.top) | 0;
                        
                    for (var y = 0 ; y < h; y++, pixIndex += yStride) {
                        for (var x = 0; x < w; x++, pixIndex += BYTES_PER_PIXEL) {
                            var
                                alpha1,
alpha2;
                            
                            alpha1 = (((layer.data[pixIndex + ALPHA_BYTE_OFFSET]) * layer.alpha / 100)  | 0);
                            
                            
                    if (alpha1) {
                        alpha2 = fusion.data[pixIndex + ALPHA_BYTE_OFFSET];
                
                                
                var
                    newAlpha = (alpha1 + alpha2 - alpha1 * alpha2 / 255) | 0,
                    realAlpha = (alpha1 * 255 / newAlpha) | 0,
                    invAlpha = 255 - realAlpha;

                    fusion.data[pixIndex] = (layer.data[pixIndex] * realAlpha + fusion.data[pixIndex] * invAlpha) / 255;
                
                    fusion.data[pixIndex + 1] = (layer.data[pixIndex + 1] * realAlpha + fusion.data[pixIndex + 1] * invAlpha) / 255;
                
                    fusion.data[pixIndex + 2] = (layer.data[pixIndex + 2] * realAlpha + fusion.data[pixIndex + 2] * invAlpha) / 255;

            fusion.data[pixIndex + ALPHA_BYTE_OFFSET] = newAlpha;
        
            
                            
                    }
                
                        }
                    }
                };
            
                /**
 * Blend the given layer onto the fusion using the add blending operator.
 * 
 * The layer must have its layer alpha set to 100
 * 
 * Fusion pixels must be opaque, and the fusion layer's opacity must be set to 100.
 */

                CPBlend.addOntoOpaqueFusionWithOpaqueLayer = function(layer, fusion, rect) {
                    var
                        h = rect.getHeight() | 0,
w = rect.getWidth() | 0,
yStride = ((layer.width - w) * BYTES_PER_PIXEL) | 0,
pixIndex = layer.offsetOfPixel(rect.left, rect.top) | 0;
                        
                    for (var y = 0 ; y < h; y++, pixIndex += yStride) {
                        for (var x = 0; x < w; x++, pixIndex += BYTES_PER_PIXEL) {
                            var
                                alpha1;
                            
                            alpha1 = layer.data[pixIndex + ALPHA_BYTE_OFFSET];
                            
                            
                    if (alpha1) {
                
                                
                    fusion.data[pixIndex] = (fusion.data[pixIndex] + alpha1 * layer.data[pixIndex] / 255) | 0;
                
                    fusion.data[pixIndex + 1] = (fusion.data[pixIndex + 1] + alpha1 * layer.data[pixIndex + 1] / 255) | 0;
                
                    fusion.data[pixIndex + 2] = (fusion.data[pixIndex + 2] + alpha1 * layer.data[pixIndex + 2] / 255) | 0;
                
            
                            
                    }
                
                        }
                    }
                };
            
                /**
 * Blend the given layer onto the fusion using the add blending operator.
 * 
 * Fusion pixels must be opaque, and the fusion layer's opacity must be set to 100.
 */

                CPBlend.addOntoOpaqueFusionWithTransparentLayer = function(layer, fusion, rect) {
                    var
                        h = rect.getHeight() | 0,
w = rect.getWidth() | 0,
yStride = ((layer.width - w) * BYTES_PER_PIXEL) | 0,
pixIndex = layer.offsetOfPixel(rect.left, rect.top) | 0;
                        
                    for (var y = 0 ; y < h; y++, pixIndex += yStride) {
                        for (var x = 0; x < w; x++, pixIndex += BYTES_PER_PIXEL) {
                            var
                                alpha1;
                            
                            alpha1 = (((layer.data[pixIndex + ALPHA_BYTE_OFFSET]) * layer.alpha / 100)  | 0);
                            
                            
                    if (alpha1) {
                
                                
                    fusion.data[pixIndex] = (fusion.data[pixIndex] + alpha1 * layer.data[pixIndex] / 255) | 0;
                
                    fusion.data[pixIndex + 1] = (fusion.data[pixIndex + 1] + alpha1 * layer.data[pixIndex + 1] / 255) | 0;
                
                    fusion.data[pixIndex + 2] = (fusion.data[pixIndex + 2] + alpha1 * layer.data[pixIndex + 2] / 255) | 0;
                
            
                            
                    }
                
                        }
                    }
                };
            
                /**
 * Blend the given layer onto the fusion using the add blending operator.
 * 
 * The layer must have its layer alpha set to 100
 * 
 * Fusion can contain transparent pixels, but the fusion layer's opacity must be set to 100.
 */

                CPBlend.addOntoTransparentFusionWithOpaqueLayer = function(layer, fusion, rect) {
                    var
                        h = rect.getHeight() | 0,
w = rect.getWidth() | 0,
yStride = ((layer.width - w) * BYTES_PER_PIXEL) | 0,
pixIndex = layer.offsetOfPixel(rect.left, rect.top) | 0;
                        
                    for (var y = 0 ; y < h; y++, pixIndex += yStride) {
                        for (var x = 0; x < w; x++, pixIndex += BYTES_PER_PIXEL) {
                            var
                                alpha1,
alpha2;
                            
                            alpha1 = layer.data[pixIndex + ALPHA_BYTE_OFFSET];
                            
                            
                    if (alpha1) {
                        alpha2 = fusion.data[pixIndex + ALPHA_BYTE_OFFSET];
                
                                
                var
                    newAlpha = (alpha1 + alpha2 - alpha1 * alpha2 / 255) | 0;

                // No need to clamp the color to 0...255 since we're writing to a clamped array anyway

                    fusion.data[pixIndex] = ((alpha2 * fusion.data[pixIndex] + alpha1 * layer.data[pixIndex]) / newAlpha) | 0;
                
                    fusion.data[pixIndex + 1] = ((alpha2 * fusion.data[pixIndex + 1] + alpha1 * layer.data[pixIndex + 1]) / newAlpha) | 0;
                
                    fusion.data[pixIndex + 2] = ((alpha2 * fusion.data[pixIndex + 2] + alpha1 * layer.data[pixIndex + 2]) / newAlpha) | 0;

            fusion.data[pixIndex + ALPHA_BYTE_OFFSET] = newAlpha;
        
            
                            
                    }
                
                        }
                    }
                };
            
                /**
 * Blend the given layer onto the fusion using the add blending operator.
 * 
 * Fusion can contain transparent pixels, but the fusion layer's opacity must be set to 100.
 */

                CPBlend.addOntoTransparentFusionWithTransparentLayer = function(layer, fusion, rect) {
                    var
                        h = rect.getHeight() | 0,
w = rect.getWidth() | 0,
yStride = ((layer.width - w) * BYTES_PER_PIXEL) | 0,
pixIndex = layer.offsetOfPixel(rect.left, rect.top) | 0;
                        
                    for (var y = 0 ; y < h; y++, pixIndex += yStride) {
                        for (var x = 0; x < w; x++, pixIndex += BYTES_PER_PIXEL) {
                            var
                                alpha1,
alpha2;
                            
                            alpha1 = (((layer.data[pixIndex + ALPHA_BYTE_OFFSET]) * layer.alpha / 100)  | 0);
                            
                            
                    if (alpha1) {
                        alpha2 = fusion.data[pixIndex + ALPHA_BYTE_OFFSET];
                
                                
                var
                    newAlpha = (alpha1 + alpha2 - alpha1 * alpha2 / 255) | 0;

                // No need to clamp the color to 0...255 since we're writing to a clamped array anyway

                    fusion.data[pixIndex] = ((alpha2 * fusion.data[pixIndex] + alpha1 * layer.data[pixIndex]) / newAlpha) | 0;
                
                    fusion.data[pixIndex + 1] = ((alpha2 * fusion.data[pixIndex + 1] + alpha1 * layer.data[pixIndex + 1]) / newAlpha) | 0;
                
                    fusion.data[pixIndex + 2] = ((alpha2 * fusion.data[pixIndex + 2] + alpha1 * layer.data[pixIndex + 2]) / newAlpha) | 0;

            fusion.data[pixIndex + ALPHA_BYTE_OFFSET] = newAlpha;
        
            
                            
                    }
                
                        }
                    }
                };
            
                /**
 * Blend the given layer onto the fusion using the subtract blending operator.
 * 
 * The layer must have its layer alpha set to 100
 * 
 * Fusion pixels must be opaque, and the fusion layer's opacity must be set to 100.
 */

                CPBlend.subtractOntoOpaqueFusionWithOpaqueLayer = function(layer, fusion, rect) {
                    var
                        h = rect.getHeight() | 0,
w = rect.getWidth() | 0,
yStride = ((layer.width - w) * BYTES_PER_PIXEL) | 0,
pixIndex = layer.offsetOfPixel(rect.left, rect.top) | 0;
                        
                    for (var y = 0 ; y < h; y++, pixIndex += yStride) {
                        for (var x = 0; x < w; x++, pixIndex += BYTES_PER_PIXEL) {
                            var
                                alpha1;
                            
                            alpha1 = layer.data[pixIndex + ALPHA_BYTE_OFFSET];
                            
                            
                    if (alpha1) {
                
                                
                    fusion.data[pixIndex] = (fusion.data[pixIndex] + alpha1 * layer.data[pixIndex] / 255 - alpha1) | 0;
                
                    fusion.data[pixIndex + 1] = (fusion.data[pixIndex + 1] + alpha1 * layer.data[pixIndex + 1] / 255 - alpha1) | 0;
                
                    fusion.data[pixIndex + 2] = (fusion.data[pixIndex + 2] + alpha1 * layer.data[pixIndex + 2] / 255 - alpha1) | 0;
                
            
                            
                    }
                
                        }
                    }
                };
            
                /**
 * Blend the given layer onto the fusion using the subtract blending operator.
 * 
 * Fusion pixels must be opaque, and the fusion layer's opacity must be set to 100.
 */

                CPBlend.subtractOntoOpaqueFusionWithTransparentLayer = function(layer, fusion, rect) {
                    var
                        h = rect.getHeight() | 0,
w = rect.getWidth() | 0,
yStride = ((layer.width - w) * BYTES_PER_PIXEL) | 0,
pixIndex = layer.offsetOfPixel(rect.left, rect.top) | 0;
                        
                    for (var y = 0 ; y < h; y++, pixIndex += yStride) {
                        for (var x = 0; x < w; x++, pixIndex += BYTES_PER_PIXEL) {
                            var
                                alpha1;
                            
                            alpha1 = (((layer.data[pixIndex + ALPHA_BYTE_OFFSET]) * layer.alpha / 100)  | 0);
                            
                            
                    if (alpha1) {
                
                                
                    fusion.data[pixIndex] = (fusion.data[pixIndex] + alpha1 * layer.data[pixIndex] / 255 - alpha1) | 0;
                
                    fusion.data[pixIndex + 1] = (fusion.data[pixIndex + 1] + alpha1 * layer.data[pixIndex + 1] / 255 - alpha1) | 0;
                
                    fusion.data[pixIndex + 2] = (fusion.data[pixIndex + 2] + alpha1 * layer.data[pixIndex + 2] / 255 - alpha1) | 0;
                
            
                            
                    }
                
                        }
                    }
                };
            
                /**
 * Blend the given layer onto the fusion using the subtract blending operator.
 * 
 * The layer must have its layer alpha set to 100
 * 
 * Fusion can contain transparent pixels, but the fusion layer's opacity must be set to 100.
 */

                CPBlend.subtractOntoTransparentFusionWithOpaqueLayer = function(layer, fusion, rect) {
                    var
                        h = rect.getHeight() | 0,
w = rect.getWidth() | 0,
yStride = ((layer.width - w) * BYTES_PER_PIXEL) | 0,
pixIndex = layer.offsetOfPixel(rect.left, rect.top) | 0;
                        
                    for (var y = 0 ; y < h; y++, pixIndex += yStride) {
                        for (var x = 0; x < w; x++, pixIndex += BYTES_PER_PIXEL) {
                            var
                                alpha1,
alpha2;
                            
                            alpha1 = layer.data[pixIndex + ALPHA_BYTE_OFFSET];
                            
                            
                    if (alpha1) {
                        alpha2 = fusion.data[pixIndex + ALPHA_BYTE_OFFSET];
                
                                
                var
                    newAlpha = (alpha1 + alpha2 - alpha1 * alpha2 / 255) | 0,
                    alpha12 = alpha1 * alpha2;

                // No need to clamp the color to 255 since we're writing to a clamped array anyway

                    fusion.data[pixIndex] = ((alpha2 * fusion.data[pixIndex] + alpha1 * layer.data[pixIndex] - alpha12) / newAlpha) | 0;
                
                    fusion.data[pixIndex + 1] = ((alpha2 * fusion.data[pixIndex + 1] + alpha1 * layer.data[pixIndex + 1] - alpha12) / newAlpha) | 0;
                
                    fusion.data[pixIndex + 2] = ((alpha2 * fusion.data[pixIndex + 2] + alpha1 * layer.data[pixIndex + 2] - alpha12) / newAlpha) | 0;

            fusion.data[pixIndex + ALPHA_BYTE_OFFSET] = newAlpha;
        
            
                            
                    }
                
                        }
                    }
                };
            
                /**
 * Blend the given layer onto the fusion using the subtract blending operator.
 * 
 * Fusion can contain transparent pixels, but the fusion layer's opacity must be set to 100.
 */

                CPBlend.subtractOntoTransparentFusionWithTransparentLayer = function(layer, fusion, rect) {
                    var
                        h = rect.getHeight() | 0,
w = rect.getWidth() | 0,
yStride = ((layer.width - w) * BYTES_PER_PIXEL) | 0,
pixIndex = layer.offsetOfPixel(rect.left, rect.top) | 0;
                        
                    for (var y = 0 ; y < h; y++, pixIndex += yStride) {
                        for (var x = 0; x < w; x++, pixIndex += BYTES_PER_PIXEL) {
                            var
                                alpha1,
alpha2;
                            
                            alpha1 = (((layer.data[pixIndex + ALPHA_BYTE_OFFSET]) * layer.alpha / 100)  | 0);
                            
                            
                    if (alpha1) {
                        alpha2 = fusion.data[pixIndex + ALPHA_BYTE_OFFSET];
                
                                
                var
                    newAlpha = (alpha1 + alpha2 - alpha1 * alpha2 / 255) | 0,
                    alpha12 = alpha1 * alpha2;

                // No need to clamp the color to 255 since we're writing to a clamped array anyway

                    fusion.data[pixIndex] = ((alpha2 * fusion.data[pixIndex] + alpha1 * layer.data[pixIndex] - alpha12) / newAlpha) | 0;
                
                    fusion.data[pixIndex + 1] = ((alpha2 * fusion.data[pixIndex + 1] + alpha1 * layer.data[pixIndex + 1] - alpha12) / newAlpha) | 0;
                
                    fusion.data[pixIndex + 2] = ((alpha2 * fusion.data[pixIndex + 2] + alpha1 * layer.data[pixIndex + 2] - alpha12) / newAlpha) | 0;

            fusion.data[pixIndex + ALPHA_BYTE_OFFSET] = newAlpha;
        
            
                            
                    }
                
                        }
                    }
                };
            
                /**
 * Blend the given layer onto the fusion using the screen blending operator.
 * 
 * The layer must have its layer alpha set to 100
 * 
 * Fusion pixels must be opaque, and the fusion layer's opacity must be set to 100.
 */

                CPBlend.screenOntoOpaqueFusionWithOpaqueLayer = function(layer, fusion, rect) {
                    var
                        h = rect.getHeight() | 0,
w = rect.getWidth() | 0,
yStride = ((layer.width - w) * BYTES_PER_PIXEL) | 0,
pixIndex = layer.offsetOfPixel(rect.left, rect.top) | 0;
                        
                    for (var y = 0 ; y < h; y++, pixIndex += yStride) {
                        for (var x = 0; x < w; x++, pixIndex += BYTES_PER_PIXEL) {
                            var
                                alpha1,
color2;
                            
                            alpha1 = layer.data[pixIndex + ALPHA_BYTE_OFFSET];
                            
                            
                    if (alpha1) {
                
                                
                var
                    invAlpha1 = alpha1 ^ 0xFF;

                        color2 = fusion.data[pixIndex];
                    
                    fusion.data[pixIndex] = 0xFF ^ (
                    (
                        (color2 ^ 0xFF) * invAlpha1
                        + (layer.data[pixIndex] ^ 0xFF) * (color2 ^ 0xFF) * alpha1 / 255
                    )
                    / 255
                );
                
                        color2 = fusion.data[pixIndex + 1];
                    
                    fusion.data[pixIndex + 1] = 0xFF ^ (
                    (
                        (color2 ^ 0xFF) * invAlpha1
                        + (layer.data[pixIndex + 1] ^ 0xFF) * (color2 ^ 0xFF) * alpha1 / 255
                    )
                    / 255
                );
                
                        color2 = fusion.data[pixIndex + 2];
                    
                    fusion.data[pixIndex + 2] = 0xFF ^ (
                    (
                        (color2 ^ 0xFF) * invAlpha1
                        + (layer.data[pixIndex + 2] ^ 0xFF) * (color2 ^ 0xFF) * alpha1 / 255
                    )
                    / 255
                );
                
            
                            
                    }
                
                        }
                    }
                };
            
                /**
 * Blend the given layer onto the fusion using the screen blending operator.
 * 
 * Fusion pixels must be opaque, and the fusion layer's opacity must be set to 100.
 */

                CPBlend.screenOntoOpaqueFusionWithTransparentLayer = function(layer, fusion, rect) {
                    var
                        h = rect.getHeight() | 0,
w = rect.getWidth() | 0,
yStride = ((layer.width - w) * BYTES_PER_PIXEL) | 0,
pixIndex = layer.offsetOfPixel(rect.left, rect.top) | 0;
                        
                    for (var y = 0 ; y < h; y++, pixIndex += yStride) {
                        for (var x = 0; x < w; x++, pixIndex += BYTES_PER_PIXEL) {
                            var
                                alpha1,
color2;
                            
                            alpha1 = (((layer.data[pixIndex + ALPHA_BYTE_OFFSET]) * layer.alpha / 100)  | 0);
                            
                            
                    if (alpha1) {
                
                                
                var
                    invAlpha1 = alpha1 ^ 0xFF;

                        color2 = fusion.data[pixIndex];
                    
                    fusion.data[pixIndex] = 0xFF ^ (
                    (
                        (color2 ^ 0xFF) * invAlpha1
                        + (layer.data[pixIndex] ^ 0xFF) * (color2 ^ 0xFF) * alpha1 / 255
                    )
                    / 255
                );
                
                        color2 = fusion.data[pixIndex + 1];
                    
                    fusion.data[pixIndex + 1] = 0xFF ^ (
                    (
                        (color2 ^ 0xFF) * invAlpha1
                        + (layer.data[pixIndex + 1] ^ 0xFF) * (color2 ^ 0xFF) * alpha1 / 255
                    )
                    / 255
                );
                
                        color2 = fusion.data[pixIndex + 2];
                    
                    fusion.data[pixIndex + 2] = 0xFF ^ (
                    (
                        (color2 ^ 0xFF) * invAlpha1
                        + (layer.data[pixIndex + 2] ^ 0xFF) * (color2 ^ 0xFF) * alpha1 / 255
                    )
                    / 255
                );
                
            
                            
                    }
                
                        }
                    }
                };
            
                /**
 * Blend the given layer onto the fusion using the screen blending operator.
 * 
 * The layer must have its layer alpha set to 100
 * 
 * Fusion can contain transparent pixels, but the fusion layer's opacity must be set to 100.
 */

                CPBlend.screenOntoTransparentFusionWithOpaqueLayer = function(layer, fusion, rect) {
                    var
                        h = rect.getHeight() | 0,
w = rect.getWidth() | 0,
yStride = ((layer.width - w) * BYTES_PER_PIXEL) | 0,
pixIndex = layer.offsetOfPixel(rect.left, rect.top) | 0;
                        
                    for (var y = 0 ; y < h; y++, pixIndex += yStride) {
                        for (var x = 0; x < w; x++, pixIndex += BYTES_PER_PIXEL) {
                            var
                                alpha1,
alpha2,
color1,
color2;
                            
                            alpha1 = layer.data[pixIndex + ALPHA_BYTE_OFFSET];
                            
                            
                    if (alpha1) {
                        alpha2 = fusion.data[pixIndex + ALPHA_BYTE_OFFSET];
                
                                
                var
                    newAlpha = (alpha1 + alpha2 - alpha1 * alpha2 / 255) | 0,

                    alpha12 = (alpha1 * alpha2 / 255) | 0,
                    alpha1n2 = (alpha1 * (alpha2 ^ 0xFF) / 255) | 0,
                    alphan12 = ((alpha1 ^ 0xFF) * alpha2 / 255) | 0;

                        color1 = layer.data[pixIndex];
                    
                        color2 = fusion.data[pixIndex];
                    
                    fusion.data[pixIndex] = 0xFF ^ (
                    (
                        (color1 ^ 0xFF) * alpha1n2
                        + (color2 ^ 0xFF) * alphan12
                        + (color1 ^ 0xFF) * (color2 ^ 0xFF) * alpha12 / 255
                    )
                    / newAlpha
                );
                
                        color1 = layer.data[pixIndex + 1];
                    
                        color2 = fusion.data[pixIndex + 1];
                    
                    fusion.data[pixIndex + 1] = 0xFF ^ (
                    (
                        (color1 ^ 0xFF) * alpha1n2
                        + (color2 ^ 0xFF) * alphan12
                        + (color1 ^ 0xFF) * (color2 ^ 0xFF) * alpha12 / 255
                    )
                    / newAlpha
                );
                
                        color1 = layer.data[pixIndex + 2];
                    
                        color2 = fusion.data[pixIndex + 2];
                    
                    fusion.data[pixIndex + 2] = 0xFF ^ (
                    (
                        (color1 ^ 0xFF) * alpha1n2
                        + (color2 ^ 0xFF) * alphan12
                        + (color1 ^ 0xFF) * (color2 ^ 0xFF) * alpha12 / 255
                    )
                    / newAlpha
                );

            fusion.data[pixIndex + ALPHA_BYTE_OFFSET] = newAlpha;
        
            
                            
                    }
                
                        }
                    }
                };
            
                /**
 * Blend the given layer onto the fusion using the screen blending operator.
 * 
 * Fusion can contain transparent pixels, but the fusion layer's opacity must be set to 100.
 */

                CPBlend.screenOntoTransparentFusionWithTransparentLayer = function(layer, fusion, rect) {
                    var
                        h = rect.getHeight() | 0,
w = rect.getWidth() | 0,
yStride = ((layer.width - w) * BYTES_PER_PIXEL) | 0,
pixIndex = layer.offsetOfPixel(rect.left, rect.top) | 0;
                        
                    for (var y = 0 ; y < h; y++, pixIndex += yStride) {
                        for (var x = 0; x < w; x++, pixIndex += BYTES_PER_PIXEL) {
                            var
                                alpha1,
alpha2,
color1,
color2;
                            
                            alpha1 = (((layer.data[pixIndex + ALPHA_BYTE_OFFSET]) * layer.alpha / 100)  | 0);
                            
                            
                    if (alpha1) {
                        alpha2 = fusion.data[pixIndex + ALPHA_BYTE_OFFSET];
                
                                
                var
                    newAlpha = (alpha1 + alpha2 - alpha1 * alpha2 / 255) | 0,

                    alpha12 = (alpha1 * alpha2 / 255) | 0,
                    alpha1n2 = (alpha1 * (alpha2 ^ 0xFF) / 255) | 0,
                    alphan12 = ((alpha1 ^ 0xFF) * alpha2 / 255) | 0;

                        color1 = layer.data[pixIndex];
                    
                        color2 = fusion.data[pixIndex];
                    
                    fusion.data[pixIndex] = 0xFF ^ (
                    (
                        (color1 ^ 0xFF) * alpha1n2
                        + (color2 ^ 0xFF) * alphan12
                        + (color1 ^ 0xFF) * (color2 ^ 0xFF) * alpha12 / 255
                    )
                    / newAlpha
                );
                
                        color1 = layer.data[pixIndex + 1];
                    
                        color2 = fusion.data[pixIndex + 1];
                    
                    fusion.data[pixIndex + 1] = 0xFF ^ (
                    (
                        (color1 ^ 0xFF) * alpha1n2
                        + (color2 ^ 0xFF) * alphan12
                        + (color1 ^ 0xFF) * (color2 ^ 0xFF) * alpha12 / 255
                    )
                    / newAlpha
                );
                
                        color1 = layer.data[pixIndex + 2];
                    
                        color2 = fusion.data[pixIndex + 2];
                    
                    fusion.data[pixIndex + 2] = 0xFF ^ (
                    (
                        (color1 ^ 0xFF) * alpha1n2
                        + (color2 ^ 0xFF) * alphan12
                        + (color1 ^ 0xFF) * (color2 ^ 0xFF) * alpha12 / 255
                    )
                    / newAlpha
                );

            fusion.data[pixIndex + ALPHA_BYTE_OFFSET] = newAlpha;
        
            
                            
                    }
                
                        }
                    }
                };
            
                /**
 * Blend the given layer onto the fusion using the lighten blending operator.
 * 
 * The layer must have its layer alpha set to 100
 * 
 * Fusion pixels must be opaque, and the fusion layer's opacity must be set to 100.
 */

                CPBlend.lightenOntoOpaqueFusionWithOpaqueLayer = function(layer, fusion, rect) {
                    var
                        h = rect.getHeight() | 0,
w = rect.getWidth() | 0,
yStride = ((layer.width - w) * BYTES_PER_PIXEL) | 0,
pixIndex = layer.offsetOfPixel(rect.left, rect.top) | 0;
                        
                    for (var y = 0 ; y < h; y++, pixIndex += yStride) {
                        for (var x = 0; x < w; x++, pixIndex += BYTES_PER_PIXEL) {
                            var
                                alpha1,
color1,
color2;
                            
                            alpha1 = layer.data[pixIndex + ALPHA_BYTE_OFFSET];
                            
                            
                    if (alpha1) {
                
                                
                var
                    invAlpha1 = alpha1 ^ 0xFF;

                        color1 = layer.data[pixIndex];
                    
                        color2 = fusion.data[pixIndex];
                    
                    fusion.data[pixIndex] = color2 >= color1 ? color2 : (color2 * invAlpha1 + color1 * alpha1) / 255;
                
                        color1 = layer.data[pixIndex + 1];
                    
                        color2 = fusion.data[pixIndex + 1];
                    
                    fusion.data[pixIndex + 1] = color2 >= color1 ? color2 : (color2 * invAlpha1 + color1 * alpha1) / 255;
                
                        color1 = layer.data[pixIndex + 2];
                    
                        color2 = fusion.data[pixIndex + 2];
                    
                    fusion.data[pixIndex + 2] = color2 >= color1 ? color2 : (color2 * invAlpha1 + color1 * alpha1) / 255;
                
            
                            
                    }
                
                        }
                    }
                };
            
                /**
 * Blend the given layer onto the fusion using the lighten blending operator.
 * 
 * Fusion pixels must be opaque, and the fusion layer's opacity must be set to 100.
 */

                CPBlend.lightenOntoOpaqueFusionWithTransparentLayer = function(layer, fusion, rect) {
                    var
                        h = rect.getHeight() | 0,
w = rect.getWidth() | 0,
yStride = ((layer.width - w) * BYTES_PER_PIXEL) | 0,
pixIndex = layer.offsetOfPixel(rect.left, rect.top) | 0;
                        
                    for (var y = 0 ; y < h; y++, pixIndex += yStride) {
                        for (var x = 0; x < w; x++, pixIndex += BYTES_PER_PIXEL) {
                            var
                                alpha1,
color1,
color2;
                            
                            alpha1 = (((layer.data[pixIndex + ALPHA_BYTE_OFFSET]) * layer.alpha / 100)  | 0);
                            
                            
                    if (alpha1) {
                
                                
                var
                    invAlpha1 = alpha1 ^ 0xFF;

                        color1 = layer.data[pixIndex];
                    
                        color2 = fusion.data[pixIndex];
                    
                    fusion.data[pixIndex] = color2 >= color1 ? color2 : (color2 * invAlpha1 + color1 * alpha1) / 255;
                
                        color1 = layer.data[pixIndex + 1];
                    
                        color2 = fusion.data[pixIndex + 1];
                    
                    fusion.data[pixIndex + 1] = color2 >= color1 ? color2 : (color2 * invAlpha1 + color1 * alpha1) / 255;
                
                        color1 = layer.data[pixIndex + 2];
                    
                        color2 = fusion.data[pixIndex + 2];
                    
                    fusion.data[pixIndex + 2] = color2 >= color1 ? color2 : (color2 * invAlpha1 + color1 * alpha1) / 255;
                
            
                            
                    }
                
                        }
                    }
                };
            
                /**
 * Blend the given layer onto the fusion using the lighten blending operator.
 * 
 * The layer must have its layer alpha set to 100
 * 
 * Fusion can contain transparent pixels, but the fusion layer's opacity must be set to 100.
 */

                CPBlend.lightenOntoTransparentFusionWithOpaqueLayer = function(layer, fusion, rect) {
                    var
                        h = rect.getHeight() | 0,
w = rect.getWidth() | 0,
yStride = ((layer.width - w) * BYTES_PER_PIXEL) | 0,
pixIndex = layer.offsetOfPixel(rect.left, rect.top) | 0;
                        
                    for (var y = 0 ; y < h; y++, pixIndex += yStride) {
                        for (var x = 0; x < w; x++, pixIndex += BYTES_PER_PIXEL) {
                            var
                                alpha1,
alpha2,
color1,
color2;
                            
                            alpha1 = layer.data[pixIndex + ALPHA_BYTE_OFFSET];
                            
                            
                    if (alpha1) {
                        alpha2 = fusion.data[pixIndex + ALPHA_BYTE_OFFSET];
                
                                
                var
                    newAlpha = (alpha1 + alpha2 - alpha1 * alpha2 / 255) | 0,

                // This alpha is used when color1 > color2
                    alpha12 = (alpha2 * (alpha1 ^ 0xFF) / newAlpha) | 0,
                    invAlpha12 = (alpha12 ^ 0xFF) | 0,

                // This alpha is used when color2 > color1
                    alpha21 = (alpha1 * (alpha2 ^ 0xFF) / newAlpha) | 0,
                    invAlpha21 = (alpha21 ^ 0xFF) | 0;

                        color1 = layer.data[pixIndex];
                    
                        color2 = fusion.data[pixIndex];
                    
                    fusion.data[pixIndex] = (((color2 >= color1) ? (color1 * alpha21 + color2 * invAlpha21) : (color2 * alpha12 + color1 * invAlpha12)) / 255) | 0;
                
                        color1 = layer.data[pixIndex + 1];
                    
                        color2 = fusion.data[pixIndex + 1];
                    
                    fusion.data[pixIndex + 1] = (((color2 >= color1) ? (color1 * alpha21 + color2 * invAlpha21) : (color2 * alpha12 + color1 * invAlpha12)) / 255) | 0;
                
                        color1 = layer.data[pixIndex + 2];
                    
                        color2 = fusion.data[pixIndex + 2];
                    
                    fusion.data[pixIndex + 2] = (((color2 >= color1) ? (color1 * alpha21 + color2 * invAlpha21) : (color2 * alpha12 + color1 * invAlpha12)) / 255) | 0;

            fusion.data[pixIndex + ALPHA_BYTE_OFFSET] = newAlpha;
        
            
                            
                    }
                
                        }
                    }
                };
            
                /**
 * Blend the given layer onto the fusion using the lighten blending operator.
 * 
 * Fusion can contain transparent pixels, but the fusion layer's opacity must be set to 100.
 */

                CPBlend.lightenOntoTransparentFusionWithTransparentLayer = function(layer, fusion, rect) {
                    var
                        h = rect.getHeight() | 0,
w = rect.getWidth() | 0,
yStride = ((layer.width - w) * BYTES_PER_PIXEL) | 0,
pixIndex = layer.offsetOfPixel(rect.left, rect.top) | 0;
                        
                    for (var y = 0 ; y < h; y++, pixIndex += yStride) {
                        for (var x = 0; x < w; x++, pixIndex += BYTES_PER_PIXEL) {
                            var
                                alpha1,
alpha2,
color1,
color2;
                            
                            alpha1 = (((layer.data[pixIndex + ALPHA_BYTE_OFFSET]) * layer.alpha / 100)  | 0);
                            
                            
                    if (alpha1) {
                        alpha2 = fusion.data[pixIndex + ALPHA_BYTE_OFFSET];
                
                                
                var
                    newAlpha = (alpha1 + alpha2 - alpha1 * alpha2 / 255) | 0,

                // This alpha is used when color1 > color2
                    alpha12 = (alpha2 * (alpha1 ^ 0xFF) / newAlpha) | 0,
                    invAlpha12 = (alpha12 ^ 0xFF) | 0,

                // This alpha is used when color2 > color1
                    alpha21 = (alpha1 * (alpha2 ^ 0xFF) / newAlpha) | 0,
                    invAlpha21 = (alpha21 ^ 0xFF) | 0;

                        color1 = layer.data[pixIndex];
                    
                        color2 = fusion.data[pixIndex];
                    
                    fusion.data[pixIndex] = (((color2 >= color1) ? (color1 * alpha21 + color2 * invAlpha21) : (color2 * alpha12 + color1 * invAlpha12)) / 255) | 0;
                
                        color1 = layer.data[pixIndex + 1];
                    
                        color2 = fusion.data[pixIndex + 1];
                    
                    fusion.data[pixIndex + 1] = (((color2 >= color1) ? (color1 * alpha21 + color2 * invAlpha21) : (color2 * alpha12 + color1 * invAlpha12)) / 255) | 0;
                
                        color1 = layer.data[pixIndex + 2];
                    
                        color2 = fusion.data[pixIndex + 2];
                    
                    fusion.data[pixIndex + 2] = (((color2 >= color1) ? (color1 * alpha21 + color2 * invAlpha21) : (color2 * alpha12 + color1 * invAlpha12)) / 255) | 0;

            fusion.data[pixIndex + ALPHA_BYTE_OFFSET] = newAlpha;
        
            
                            
                    }
                
                        }
                    }
                };
            
                /**
 * Blend the given layer onto the fusion using the darken blending operator.
 * 
 * The layer must have its layer alpha set to 100
 * 
 * Fusion pixels must be opaque, and the fusion layer's opacity must be set to 100.
 */

                CPBlend.darkenOntoOpaqueFusionWithOpaqueLayer = function(layer, fusion, rect) {
                    var
                        h = rect.getHeight() | 0,
w = rect.getWidth() | 0,
yStride = ((layer.width - w) * BYTES_PER_PIXEL) | 0,
pixIndex = layer.offsetOfPixel(rect.left, rect.top) | 0;
                        
                    for (var y = 0 ; y < h; y++, pixIndex += yStride) {
                        for (var x = 0; x < w; x++, pixIndex += BYTES_PER_PIXEL) {
                            var
                                alpha1,
color1,
color2;
                            
                            alpha1 = layer.data[pixIndex + ALPHA_BYTE_OFFSET];
                            
                            
                    if (alpha1) {
                
                                
                var
                    invAlpha1 = alpha1 ^ 0xFF;

                        color1 = layer.data[pixIndex];
                    
                        color2 = fusion.data[pixIndex];
                    
                    fusion.data[pixIndex] = color2 >= color1 ? (color2 * invAlpha1 + color1 * alpha1) / 255 : color2;
                
                        color1 = layer.data[pixIndex + 1];
                    
                        color2 = fusion.data[pixIndex + 1];
                    
                    fusion.data[pixIndex + 1] = color2 >= color1 ? (color2 * invAlpha1 + color1 * alpha1) / 255 : color2;
                
                        color1 = layer.data[pixIndex + 2];
                    
                        color2 = fusion.data[pixIndex + 2];
                    
                    fusion.data[pixIndex + 2] = color2 >= color1 ? (color2 * invAlpha1 + color1 * alpha1) / 255 : color2;
                
            
                            
                    }
                
                        }
                    }
                };
            
                /**
 * Blend the given layer onto the fusion using the darken blending operator.
 * 
 * Fusion pixels must be opaque, and the fusion layer's opacity must be set to 100.
 */

                CPBlend.darkenOntoOpaqueFusionWithTransparentLayer = function(layer, fusion, rect) {
                    var
                        h = rect.getHeight() | 0,
w = rect.getWidth() | 0,
yStride = ((layer.width - w) * BYTES_PER_PIXEL) | 0,
pixIndex = layer.offsetOfPixel(rect.left, rect.top) | 0;
                        
                    for (var y = 0 ; y < h; y++, pixIndex += yStride) {
                        for (var x = 0; x < w; x++, pixIndex += BYTES_PER_PIXEL) {
                            var
                                alpha1,
color1,
color2;
                            
                            alpha1 = (((layer.data[pixIndex + ALPHA_BYTE_OFFSET]) * layer.alpha / 100)  | 0);
                            
                            
                    if (alpha1) {
                
                                
                var
                    invAlpha1 = alpha1 ^ 0xFF;

                        color1 = layer.data[pixIndex];
                    
                        color2 = fusion.data[pixIndex];
                    
                    fusion.data[pixIndex] = color2 >= color1 ? (color2 * invAlpha1 + color1 * alpha1) / 255 : color2;
                
                        color1 = layer.data[pixIndex + 1];
                    
                        color2 = fusion.data[pixIndex + 1];
                    
                    fusion.data[pixIndex + 1] = color2 >= color1 ? (color2 * invAlpha1 + color1 * alpha1) / 255 : color2;
                
                        color1 = layer.data[pixIndex + 2];
                    
                        color2 = fusion.data[pixIndex + 2];
                    
                    fusion.data[pixIndex + 2] = color2 >= color1 ? (color2 * invAlpha1 + color1 * alpha1) / 255 : color2;
                
            
                            
                    }
                
                        }
                    }
                };
            
                /**
 * Blend the given layer onto the fusion using the darken blending operator.
 * 
 * The layer must have its layer alpha set to 100
 * 
 * Fusion can contain transparent pixels, but the fusion layer's opacity must be set to 100.
 */

                CPBlend.darkenOntoTransparentFusionWithOpaqueLayer = function(layer, fusion, rect) {
                    var
                        h = rect.getHeight() | 0,
w = rect.getWidth() | 0,
yStride = ((layer.width - w) * BYTES_PER_PIXEL) | 0,
pixIndex = layer.offsetOfPixel(rect.left, rect.top) | 0;
                        
                    for (var y = 0 ; y < h; y++, pixIndex += yStride) {
                        for (var x = 0; x < w; x++, pixIndex += BYTES_PER_PIXEL) {
                            var
                                alpha1,
alpha2,
color1,
color2;
                            
                            alpha1 = layer.data[pixIndex + ALPHA_BYTE_OFFSET];
                            
                            
                    if (alpha1) {
                        alpha2 = fusion.data[pixIndex + ALPHA_BYTE_OFFSET];
                
                                
                var
                    newAlpha = (alpha1 + alpha2 - alpha1 * alpha2 / 255) | 0,

                // This alpha is used when color1 > color2
                    alpha12 = (alpha1 * (alpha2 ^ 0xFF) / newAlpha) | 0,
                    invAlpha12 = (alpha12 ^ 0xFF) | 0,

                // This alpha is used when color2 > color1
                    alpha21 = (alpha2 * (alpha1 ^ 0xFF) / newAlpha) | 0,
                    invAlpha21 = (alpha21 ^ 0xFF) | 0;

                        color1 = layer.data[pixIndex];
                    
                        color2 = fusion.data[pixIndex];
                    
                    fusion.data[pixIndex] = (((color2 >= color1) ? (color2 * alpha21 + color1 * invAlpha21) : (color1 * alpha12 + color2 * invAlpha12)) / 255) | 0;
                
                        color1 = layer.data[pixIndex + 1];
                    
                        color2 = fusion.data[pixIndex + 1];
                    
                    fusion.data[pixIndex + 1] = (((color2 >= color1) ? (color2 * alpha21 + color1 * invAlpha21) : (color1 * alpha12 + color2 * invAlpha12)) / 255) | 0;
                
                        color1 = layer.data[pixIndex + 2];
                    
                        color2 = fusion.data[pixIndex + 2];
                    
                    fusion.data[pixIndex + 2] = (((color2 >= color1) ? (color2 * alpha21 + color1 * invAlpha21) : (color1 * alpha12 + color2 * invAlpha12)) / 255) | 0;

            fusion.data[pixIndex + ALPHA_BYTE_OFFSET] = newAlpha;
        
            
                            
                    }
                
                        }
                    }
                };
            
                /**
 * Blend the given layer onto the fusion using the darken blending operator.
 * 
 * Fusion can contain transparent pixels, but the fusion layer's opacity must be set to 100.
 */

                CPBlend.darkenOntoTransparentFusionWithTransparentLayer = function(layer, fusion, rect) {
                    var
                        h = rect.getHeight() | 0,
w = rect.getWidth() | 0,
yStride = ((layer.width - w) * BYTES_PER_PIXEL) | 0,
pixIndex = layer.offsetOfPixel(rect.left, rect.top) | 0;
                        
                    for (var y = 0 ; y < h; y++, pixIndex += yStride) {
                        for (var x = 0; x < w; x++, pixIndex += BYTES_PER_PIXEL) {
                            var
                                alpha1,
alpha2,
color1,
color2;
                            
                            alpha1 = (((layer.data[pixIndex + ALPHA_BYTE_OFFSET]) * layer.alpha / 100)  | 0);
                            
                            
                    if (alpha1) {
                        alpha2 = fusion.data[pixIndex + ALPHA_BYTE_OFFSET];
                
                                
                var
                    newAlpha = (alpha1 + alpha2 - alpha1 * alpha2 / 255) | 0,

                // This alpha is used when color1 > color2
                    alpha12 = (alpha1 * (alpha2 ^ 0xFF) / newAlpha) | 0,
                    invAlpha12 = (alpha12 ^ 0xFF) | 0,

                // This alpha is used when color2 > color1
                    alpha21 = (alpha2 * (alpha1 ^ 0xFF) / newAlpha) | 0,
                    invAlpha21 = (alpha21 ^ 0xFF) | 0;

                        color1 = layer.data[pixIndex];
                    
                        color2 = fusion.data[pixIndex];
                    
                    fusion.data[pixIndex] = (((color2 >= color1) ? (color2 * alpha21 + color1 * invAlpha21) : (color1 * alpha12 + color2 * invAlpha12)) / 255) | 0;
                
                        color1 = layer.data[pixIndex + 1];
                    
                        color2 = fusion.data[pixIndex + 1];
                    
                    fusion.data[pixIndex + 1] = (((color2 >= color1) ? (color2 * alpha21 + color1 * invAlpha21) : (color1 * alpha12 + color2 * invAlpha12)) / 255) | 0;
                
                        color1 = layer.data[pixIndex + 2];
                    
                        color2 = fusion.data[pixIndex + 2];
                    
                    fusion.data[pixIndex + 2] = (((color2 >= color1) ? (color2 * alpha21 + color1 * invAlpha21) : (color1 * alpha12 + color2 * invAlpha12)) / 255) | 0;

            fusion.data[pixIndex + ALPHA_BYTE_OFFSET] = newAlpha;
        
            
                            
                    }
                
                        }
                    }
                };
            
                /**
 * Blend the given layer onto the fusion using the dodge blending operator.
 * 
 * The layer must have its layer alpha set to 100
 * 
 * Fusion pixels must be opaque, and the fusion layer's opacity must be set to 100.
 */

                CPBlend.dodgeOntoOpaqueFusionWithOpaqueLayer = function(layer, fusion, rect) {
                    var
                        h = rect.getHeight() | 0,
w = rect.getWidth() | 0,
yStride = ((layer.width - w) * BYTES_PER_PIXEL) | 0,
pixIndex = layer.offsetOfPixel(rect.left, rect.top) | 0;
                        
                    for (var y = 0 ; y < h; y++, pixIndex += yStride) {
                        for (var x = 0; x < w; x++, pixIndex += BYTES_PER_PIXEL) {
                            var
                                alpha1,
color1,
color2;
                            
                            alpha1 = layer.data[pixIndex + ALPHA_BYTE_OFFSET];
                            
                            
                    if (alpha1) {
                
                                
                var
                    invAlpha1 = alpha1 ^ 0xFF;

                        color1 = layer.data[pixIndex];
                    
                        color2 = fusion.data[pixIndex];
                    
                    fusion.data[pixIndex] = (
                    (
                        color2 * invAlpha1
                        + alpha1 * (color1 == 255 ? 255 : Math.min(255, (255 * color2 / (color1 ^ 0xFF)) | 0))
                    ) / 255
                ) | 0;
                
                        color1 = layer.data[pixIndex + 1];
                    
                        color2 = fusion.data[pixIndex + 1];
                    
                    fusion.data[pixIndex + 1] = (
                    (
                        color2 * invAlpha1
                        + alpha1 * (color1 == 255 ? 255 : Math.min(255, (255 * color2 / (color1 ^ 0xFF)) | 0))
                    ) / 255
                ) | 0;
                
                        color1 = layer.data[pixIndex + 2];
                    
                        color2 = fusion.data[pixIndex + 2];
                    
                    fusion.data[pixIndex + 2] = (
                    (
                        color2 * invAlpha1
                        + alpha1 * (color1 == 255 ? 255 : Math.min(255, (255 * color2 / (color1 ^ 0xFF)) | 0))
                    ) / 255
                ) | 0;
                
            
                            
                    }
                
                        }
                    }
                };
            
                /**
 * Blend the given layer onto the fusion using the dodge blending operator.
 * 
 * Fusion pixels must be opaque, and the fusion layer's opacity must be set to 100.
 */

                CPBlend.dodgeOntoOpaqueFusionWithTransparentLayer = function(layer, fusion, rect) {
                    var
                        h = rect.getHeight() | 0,
w = rect.getWidth() | 0,
yStride = ((layer.width - w) * BYTES_PER_PIXEL) | 0,
pixIndex = layer.offsetOfPixel(rect.left, rect.top) | 0;
                        
                    for (var y = 0 ; y < h; y++, pixIndex += yStride) {
                        for (var x = 0; x < w; x++, pixIndex += BYTES_PER_PIXEL) {
                            var
                                alpha1,
color1,
color2;
                            
                            alpha1 = (((layer.data[pixIndex + ALPHA_BYTE_OFFSET]) * layer.alpha / 100)  | 0);
                            
                            
                    if (alpha1) {
                
                                
                var
                    invAlpha1 = alpha1 ^ 0xFF;

                        color1 = layer.data[pixIndex];
                    
                        color2 = fusion.data[pixIndex];
                    
                    fusion.data[pixIndex] = (
                    (
                        color2 * invAlpha1
                        + alpha1 * (color1 == 255 ? 255 : Math.min(255, (255 * color2 / (color1 ^ 0xFF)) | 0))
                    ) / 255
                ) | 0;
                
                        color1 = layer.data[pixIndex + 1];
                    
                        color2 = fusion.data[pixIndex + 1];
                    
                    fusion.data[pixIndex + 1] = (
                    (
                        color2 * invAlpha1
                        + alpha1 * (color1 == 255 ? 255 : Math.min(255, (255 * color2 / (color1 ^ 0xFF)) | 0))
                    ) / 255
                ) | 0;
                
                        color1 = layer.data[pixIndex + 2];
                    
                        color2 = fusion.data[pixIndex + 2];
                    
                    fusion.data[pixIndex + 2] = (
                    (
                        color2 * invAlpha1
                        + alpha1 * (color1 == 255 ? 255 : Math.min(255, (255 * color2 / (color1 ^ 0xFF)) | 0))
                    ) / 255
                ) | 0;
                
            
                            
                    }
                
                        }
                    }
                };
            
                /**
 * Blend the given layer onto the fusion using the dodge blending operator.
 * 
 * The layer must have its layer alpha set to 100
 * 
 * Fusion can contain transparent pixels, but the fusion layer's opacity must be set to 100.
 */

                CPBlend.dodgeOntoTransparentFusionWithOpaqueLayer = function(layer, fusion, rect) {
                    var
                        h = rect.getHeight() | 0,
w = rect.getWidth() | 0,
yStride = ((layer.width - w) * BYTES_PER_PIXEL) | 0,
pixIndex = layer.offsetOfPixel(rect.left, rect.top) | 0;
                        
                    for (var y = 0 ; y < h; y++, pixIndex += yStride) {
                        for (var x = 0; x < w; x++, pixIndex += BYTES_PER_PIXEL) {
                            var
                                alpha1,
alpha2,
color1,
color2;
                            
                            alpha1 = layer.data[pixIndex + ALPHA_BYTE_OFFSET];
                            
                            
                    if (alpha1) {
                        alpha2 = fusion.data[pixIndex + ALPHA_BYTE_OFFSET];
                
                                
                var
                    newAlpha = (alpha1 + alpha2 - alpha1 * alpha2 / 255) | 0,
                    alpha12 = (alpha1 * alpha2 / 255) | 0,
                    alpha1n2 = (alpha1 * (alpha2 ^ 0xFF) / 255) | 0,
                    alphan12 = ((alpha1 ^ 0xFF) * alpha2 / 255) | 0;

                        color1 = layer.data[pixIndex];
                    
                        color2 = fusion.data[pixIndex];
                    
                    fusion.data[pixIndex] = (
                    (
                        (color1 * alpha1n2)
                        + (color2 * alphan12)
                        + alpha12 * (color1 == 255 ? 255 : Math.min(255, (255 * color2 / (color1 ^ 0xFF)) | 0))
                    ) / newAlpha
                ) | 0;
                
                        color1 = layer.data[pixIndex + 1];
                    
                        color2 = fusion.data[pixIndex + 1];
                    
                    fusion.data[pixIndex + 1] = (
                    (
                        (color1 * alpha1n2)
                        + (color2 * alphan12)
                        + alpha12 * (color1 == 255 ? 255 : Math.min(255, (255 * color2 / (color1 ^ 0xFF)) | 0))
                    ) / newAlpha
                ) | 0;
                
                        color1 = layer.data[pixIndex + 2];
                    
                        color2 = fusion.data[pixIndex + 2];
                    
                    fusion.data[pixIndex + 2] = (
                    (
                        (color1 * alpha1n2)
                        + (color2 * alphan12)
                        + alpha12 * (color1 == 255 ? 255 : Math.min(255, (255 * color2 / (color1 ^ 0xFF)) | 0))
                    ) / newAlpha
                ) | 0;

            fusion.data[pixIndex + ALPHA_BYTE_OFFSET] = newAlpha;
        
            
                            
                    }
                
                        }
                    }
                };
            
                /**
 * Blend the given layer onto the fusion using the dodge blending operator.
 * 
 * Fusion can contain transparent pixels, but the fusion layer's opacity must be set to 100.
 */

                CPBlend.dodgeOntoTransparentFusionWithTransparentLayer = function(layer, fusion, rect) {
                    var
                        h = rect.getHeight() | 0,
w = rect.getWidth() | 0,
yStride = ((layer.width - w) * BYTES_PER_PIXEL) | 0,
pixIndex = layer.offsetOfPixel(rect.left, rect.top) | 0;
                        
                    for (var y = 0 ; y < h; y++, pixIndex += yStride) {
                        for (var x = 0; x < w; x++, pixIndex += BYTES_PER_PIXEL) {
                            var
                                alpha1,
alpha2,
color1,
color2;
                            
                            alpha1 = (((layer.data[pixIndex + ALPHA_BYTE_OFFSET]) * layer.alpha / 100)  | 0);
                            
                            
                    if (alpha1) {
                        alpha2 = fusion.data[pixIndex + ALPHA_BYTE_OFFSET];
                
                                
                var
                    newAlpha = (alpha1 + alpha2 - alpha1 * alpha2 / 255) | 0,
                    alpha12 = (alpha1 * alpha2 / 255) | 0,
                    alpha1n2 = (alpha1 * (alpha2 ^ 0xFF) / 255) | 0,
                    alphan12 = ((alpha1 ^ 0xFF) * alpha2 / 255) | 0;

                        color1 = layer.data[pixIndex];
                    
                        color2 = fusion.data[pixIndex];
                    
                    fusion.data[pixIndex] = (
                    (
                        (color1 * alpha1n2)
                        + (color2 * alphan12)
                        + alpha12 * (color1 == 255 ? 255 : Math.min(255, (255 * color2 / (color1 ^ 0xFF)) | 0))
                    ) / newAlpha
                ) | 0;
                
                        color1 = layer.data[pixIndex + 1];
                    
                        color2 = fusion.data[pixIndex + 1];
                    
                    fusion.data[pixIndex + 1] = (
                    (
                        (color1 * alpha1n2)
                        + (color2 * alphan12)
                        + alpha12 * (color1 == 255 ? 255 : Math.min(255, (255 * color2 / (color1 ^ 0xFF)) | 0))
                    ) / newAlpha
                ) | 0;
                
                        color1 = layer.data[pixIndex + 2];
                    
                        color2 = fusion.data[pixIndex + 2];
                    
                    fusion.data[pixIndex + 2] = (
                    (
                        (color1 * alpha1n2)
                        + (color2 * alphan12)
                        + alpha12 * (color1 == 255 ? 255 : Math.min(255, (255 * color2 / (color1 ^ 0xFF)) | 0))
                    ) / newAlpha
                ) | 0;

            fusion.data[pixIndex + ALPHA_BYTE_OFFSET] = newAlpha;
        
            
                            
                    }
                
                        }
                    }
                };
            
                /**
 * Blend the given layer onto the fusion using the burn blending operator.
 * 
 * The layer must have its layer alpha set to 100
 * 
 * Fusion pixels must be opaque, and the fusion layer's opacity must be set to 100.
 */

                CPBlend.burnOntoOpaqueFusionWithOpaqueLayer = function(layer, fusion, rect) {
                    var
                        h = rect.getHeight() | 0,
w = rect.getWidth() | 0,
yStride = ((layer.width - w) * BYTES_PER_PIXEL) | 0,
pixIndex = layer.offsetOfPixel(rect.left, rect.top) | 0;
                        
                    for (var y = 0 ; y < h; y++, pixIndex += yStride) {
                        for (var x = 0; x < w; x++, pixIndex += BYTES_PER_PIXEL) {
                            var
                                alpha1,
color1,
color2;
                            
                            alpha1 = layer.data[pixIndex + ALPHA_BYTE_OFFSET];
                            
                            
                    if (alpha1) {
                
                                
                var
                    invAlpha1 = alpha1 ^ 0xFF;

                        color1 = layer.data[pixIndex];
                    
                        color2 = fusion.data[pixIndex];
                    
                    fusion.data[pixIndex] = (
                    (
                        color2 * invAlpha1
                        + alpha1 * (color1 == 0 ? 0 : Math.min(255, 255 * (color2 ^ 0xFF) / color1) ^ 0xFF)
                    )
                    / 255
                ) | 0;
                
                        color1 = layer.data[pixIndex + 1];
                    
                        color2 = fusion.data[pixIndex + 1];
                    
                    fusion.data[pixIndex + 1] = (
                    (
                        color2 * invAlpha1
                        + alpha1 * (color1 == 0 ? 0 : Math.min(255, 255 * (color2 ^ 0xFF) / color1) ^ 0xFF)
                    )
                    / 255
                ) | 0;
                
                        color1 = layer.data[pixIndex + 2];
                    
                        color2 = fusion.data[pixIndex + 2];
                    
                    fusion.data[pixIndex + 2] = (
                    (
                        color2 * invAlpha1
                        + alpha1 * (color1 == 0 ? 0 : Math.min(255, 255 * (color2 ^ 0xFF) / color1) ^ 0xFF)
                    )
                    / 255
                ) | 0;
                
            
                            
                    }
                
                        }
                    }
                };
            
                /**
 * Blend the given layer onto the fusion using the burn blending operator.
 * 
 * Fusion pixels must be opaque, and the fusion layer's opacity must be set to 100.
 */

                CPBlend.burnOntoOpaqueFusionWithTransparentLayer = function(layer, fusion, rect) {
                    var
                        h = rect.getHeight() | 0,
w = rect.getWidth() | 0,
yStride = ((layer.width - w) * BYTES_PER_PIXEL) | 0,
pixIndex = layer.offsetOfPixel(rect.left, rect.top) | 0;
                        
                    for (var y = 0 ; y < h; y++, pixIndex += yStride) {
                        for (var x = 0; x < w; x++, pixIndex += BYTES_PER_PIXEL) {
                            var
                                alpha1,
color1,
color2;
                            
                            alpha1 = (((layer.data[pixIndex + ALPHA_BYTE_OFFSET]) * layer.alpha / 100)  | 0);
                            
                            
                    if (alpha1) {
                
                                
                var
                    invAlpha1 = alpha1 ^ 0xFF;

                        color1 = layer.data[pixIndex];
                    
                        color2 = fusion.data[pixIndex];
                    
                    fusion.data[pixIndex] = (
                    (
                        color2 * invAlpha1
                        + alpha1 * (color1 == 0 ? 0 : Math.min(255, 255 * (color2 ^ 0xFF) / color1) ^ 0xFF)
                    )
                    / 255
                ) | 0;
                
                        color1 = layer.data[pixIndex + 1];
                    
                        color2 = fusion.data[pixIndex + 1];
                    
                    fusion.data[pixIndex + 1] = (
                    (
                        color2 * invAlpha1
                        + alpha1 * (color1 == 0 ? 0 : Math.min(255, 255 * (color2 ^ 0xFF) / color1) ^ 0xFF)
                    )
                    / 255
                ) | 0;
                
                        color1 = layer.data[pixIndex + 2];
                    
                        color2 = fusion.data[pixIndex + 2];
                    
                    fusion.data[pixIndex + 2] = (
                    (
                        color2 * invAlpha1
                        + alpha1 * (color1 == 0 ? 0 : Math.min(255, 255 * (color2 ^ 0xFF) / color1) ^ 0xFF)
                    )
                    / 255
                ) | 0;
                
            
                            
                    }
                
                        }
                    }
                };
            
                /**
 * Blend the given layer onto the fusion using the burn blending operator.
 * 
 * The layer must have its layer alpha set to 100
 * 
 * Fusion can contain transparent pixels, but the fusion layer's opacity must be set to 100.
 */

                CPBlend.burnOntoTransparentFusionWithOpaqueLayer = function(layer, fusion, rect) {
                    var
                        h = rect.getHeight() | 0,
w = rect.getWidth() | 0,
yStride = ((layer.width - w) * BYTES_PER_PIXEL) | 0,
pixIndex = layer.offsetOfPixel(rect.left, rect.top) | 0;
                        
                    for (var y = 0 ; y < h; y++, pixIndex += yStride) {
                        for (var x = 0; x < w; x++, pixIndex += BYTES_PER_PIXEL) {
                            var
                                alpha1,
alpha2,
color1,
color2;
                            
                            alpha1 = layer.data[pixIndex + ALPHA_BYTE_OFFSET];
                            
                            
                    if (alpha1) {
                        alpha2 = fusion.data[pixIndex + ALPHA_BYTE_OFFSET];
                
                                
                var
                    newAlpha = (alpha1 + alpha2 - alpha1 * alpha2 / 255) | 0,

                    alpha12 = (alpha1 * alpha2 / 255) | 0,
                    alpha1n2 = (alpha1 * (alpha2 ^ 0xFF) / 255) | 0,
                    alphan12 = ((alpha1 ^ 0xFF) * alpha2 / 255) | 0;

                        color1 = layer.data[pixIndex];
                    
                        color2 = fusion.data[pixIndex];
                    
                    fusion.data[pixIndex] = (
                    (
                        color1 * alpha1n2
                        + color2 * alphan12
                        + alpha12 * (color1 == 0 ? 0 : Math.min(255, 255 * (color2 ^ 0xFF) / color1) ^ 0xFF)
                    )
                    / newAlpha
                ) | 0;
                
                        color1 = layer.data[pixIndex + 1];
                    
                        color2 = fusion.data[pixIndex + 1];
                    
                    fusion.data[pixIndex + 1] = (
                    (
                        color1 * alpha1n2
                        + color2 * alphan12
                        + alpha12 * (color1 == 0 ? 0 : Math.min(255, 255 * (color2 ^ 0xFF) / color1) ^ 0xFF)
                    )
                    / newAlpha
                ) | 0;
                
                        color1 = layer.data[pixIndex + 2];
                    
                        color2 = fusion.data[pixIndex + 2];
                    
                    fusion.data[pixIndex + 2] = (
                    (
                        color1 * alpha1n2
                        + color2 * alphan12
                        + alpha12 * (color1 == 0 ? 0 : Math.min(255, 255 * (color2 ^ 0xFF) / color1) ^ 0xFF)
                    )
                    / newAlpha
                ) | 0;

            fusion.data[pixIndex + ALPHA_BYTE_OFFSET] = newAlpha;
        
            
                            
                    }
                
                        }
                    }
                };
            
                /**
 * Blend the given layer onto the fusion using the burn blending operator.
 * 
 * Fusion can contain transparent pixels, but the fusion layer's opacity must be set to 100.
 */

                CPBlend.burnOntoTransparentFusionWithTransparentLayer = function(layer, fusion, rect) {
                    var
                        h = rect.getHeight() | 0,
w = rect.getWidth() | 0,
yStride = ((layer.width - w) * BYTES_PER_PIXEL) | 0,
pixIndex = layer.offsetOfPixel(rect.left, rect.top) | 0;
                        
                    for (var y = 0 ; y < h; y++, pixIndex += yStride) {
                        for (var x = 0; x < w; x++, pixIndex += BYTES_PER_PIXEL) {
                            var
                                alpha1,
alpha2,
color1,
color2;
                            
                            alpha1 = (((layer.data[pixIndex + ALPHA_BYTE_OFFSET]) * layer.alpha / 100)  | 0);
                            
                            
                    if (alpha1) {
                        alpha2 = fusion.data[pixIndex + ALPHA_BYTE_OFFSET];
                
                                
                var
                    newAlpha = (alpha1 + alpha2 - alpha1 * alpha2 / 255) | 0,

                    alpha12 = (alpha1 * alpha2 / 255) | 0,
                    alpha1n2 = (alpha1 * (alpha2 ^ 0xFF) / 255) | 0,
                    alphan12 = ((alpha1 ^ 0xFF) * alpha2 / 255) | 0;

                        color1 = layer.data[pixIndex];
                    
                        color2 = fusion.data[pixIndex];
                    
                    fusion.data[pixIndex] = (
                    (
                        color1 * alpha1n2
                        + color2 * alphan12
                        + alpha12 * (color1 == 0 ? 0 : Math.min(255, 255 * (color2 ^ 0xFF) / color1) ^ 0xFF)
                    )
                    / newAlpha
                ) | 0;
                
                        color1 = layer.data[pixIndex + 1];
                    
                        color2 = fusion.data[pixIndex + 1];
                    
                    fusion.data[pixIndex + 1] = (
                    (
                        color1 * alpha1n2
                        + color2 * alphan12
                        + alpha12 * (color1 == 0 ? 0 : Math.min(255, 255 * (color2 ^ 0xFF) / color1) ^ 0xFF)
                    )
                    / newAlpha
                ) | 0;
                
                        color1 = layer.data[pixIndex + 2];
                    
                        color2 = fusion.data[pixIndex + 2];
                    
                    fusion.data[pixIndex + 2] = (
                    (
                        color1 * alpha1n2
                        + color2 * alphan12
                        + alpha12 * (color1 == 0 ? 0 : Math.min(255, 255 * (color2 ^ 0xFF) / color1) ^ 0xFF)
                    )
                    / newAlpha
                ) | 0;

            fusion.data[pixIndex + ALPHA_BYTE_OFFSET] = newAlpha;
        
            
                            
                    }
                
                        }
                    }
                };
            
                /**
 * Blend the given layer onto the fusion using the overlay blending operator.
 * 
 * The layer must have its layer alpha set to 100
 * 
 * Fusion pixels must be opaque, and the fusion layer's opacity must be set to 100.
 */

                CPBlend.overlayOntoOpaqueFusionWithOpaqueLayer = function(layer, fusion, rect) {
                    var
                        h = rect.getHeight() | 0,
w = rect.getWidth() | 0,
yStride = ((layer.width - w) * BYTES_PER_PIXEL) | 0,
pixIndex = layer.offsetOfPixel(rect.left, rect.top) | 0;
                        
                    for (var y = 0 ; y < h; y++, pixIndex += yStride) {
                        for (var x = 0; x < w; x++, pixIndex += BYTES_PER_PIXEL) {
                            var
                                alpha1,
color1,
color2;
                            
                            alpha1 = layer.data[pixIndex + ALPHA_BYTE_OFFSET];
                            
                            
                    if (alpha1) {
                
                                
                var
                    invAlpha1 = alpha1 ^ 0xFF;

                        color1 = layer.data[pixIndex];
                    
                        color2 = fusion.data[pixIndex];
                    
                    fusion.data[pixIndex] = (
                    (
                        invAlpha1 * color2
                        + (
                            color2 <= 127
                                ? (alpha1 * 2 * color1 * color2 / 255)
                                : (alpha1 * ((2 * (color1 ^ 0xff) * (color2 ^ 0xff) / 255) ^ 0xff))
                        )
                    ) / 255
                ) | 0;
                
                        color1 = layer.data[pixIndex + 1];
                    
                        color2 = fusion.data[pixIndex + 1];
                    
                    fusion.data[pixIndex + 1] = (
                    (
                        invAlpha1 * color2
                        + (
                            color2 <= 127
                                ? (alpha1 * 2 * color1 * color2 / 255)
                                : (alpha1 * ((2 * (color1 ^ 0xff) * (color2 ^ 0xff) / 255) ^ 0xff))
                        )
                    ) / 255
                ) | 0;
                
                        color1 = layer.data[pixIndex + 2];
                    
                        color2 = fusion.data[pixIndex + 2];
                    
                    fusion.data[pixIndex + 2] = (
                    (
                        invAlpha1 * color2
                        + (
                            color2 <= 127
                                ? (alpha1 * 2 * color1 * color2 / 255)
                                : (alpha1 * ((2 * (color1 ^ 0xff) * (color2 ^ 0xff) / 255) ^ 0xff))
                        )
                    ) / 255
                ) | 0;
                
            
                            
                    }
                
                        }
                    }
                };
            
                /**
 * Blend the given layer onto the fusion using the overlay blending operator.
 * 
 * Fusion pixels must be opaque, and the fusion layer's opacity must be set to 100.
 */

                CPBlend.overlayOntoOpaqueFusionWithTransparentLayer = function(layer, fusion, rect) {
                    var
                        h = rect.getHeight() | 0,
w = rect.getWidth() | 0,
yStride = ((layer.width - w) * BYTES_PER_PIXEL) | 0,
pixIndex = layer.offsetOfPixel(rect.left, rect.top) | 0;
                        
                    for (var y = 0 ; y < h; y++, pixIndex += yStride) {
                        for (var x = 0; x < w; x++, pixIndex += BYTES_PER_PIXEL) {
                            var
                                alpha1,
color1,
color2;
                            
                            alpha1 = (((layer.data[pixIndex + ALPHA_BYTE_OFFSET]) * layer.alpha / 100)  | 0);
                            
                            
                    if (alpha1) {
                
                                
                var
                    invAlpha1 = alpha1 ^ 0xFF;

                        color1 = layer.data[pixIndex];
                    
                        color2 = fusion.data[pixIndex];
                    
                    fusion.data[pixIndex] = (
                    (
                        invAlpha1 * color2
                        + (
                            color2 <= 127
                                ? (alpha1 * 2 * color1 * color2 / 255)
                                : (alpha1 * ((2 * (color1 ^ 0xff) * (color2 ^ 0xff) / 255) ^ 0xff))
                        )
                    ) / 255
                ) | 0;
                
                        color1 = layer.data[pixIndex + 1];
                    
                        color2 = fusion.data[pixIndex + 1];
                    
                    fusion.data[pixIndex + 1] = (
                    (
                        invAlpha1 * color2
                        + (
                            color2 <= 127
                                ? (alpha1 * 2 * color1 * color2 / 255)
                                : (alpha1 * ((2 * (color1 ^ 0xff) * (color2 ^ 0xff) / 255) ^ 0xff))
                        )
                    ) / 255
                ) | 0;
                
                        color1 = layer.data[pixIndex + 2];
                    
                        color2 = fusion.data[pixIndex + 2];
                    
                    fusion.data[pixIndex + 2] = (
                    (
                        invAlpha1 * color2
                        + (
                            color2 <= 127
                                ? (alpha1 * 2 * color1 * color2 / 255)
                                : (alpha1 * ((2 * (color1 ^ 0xff) * (color2 ^ 0xff) / 255) ^ 0xff))
                        )
                    ) / 255
                ) | 0;
                
            
                            
                    }
                
                        }
                    }
                };
            
                /**
 * Blend the given layer onto the fusion using the overlay blending operator.
 * 
 * The layer must have its layer alpha set to 100
 * 
 * Fusion can contain transparent pixels, but the fusion layer's opacity must be set to 100.
 */

                CPBlend.overlayOntoTransparentFusionWithOpaqueLayer = function(layer, fusion, rect) {
                    var
                        h = rect.getHeight() | 0,
w = rect.getWidth() | 0,
yStride = ((layer.width - w) * BYTES_PER_PIXEL) | 0,
pixIndex = layer.offsetOfPixel(rect.left, rect.top) | 0;
                        
                    for (var y = 0 ; y < h; y++, pixIndex += yStride) {
                        for (var x = 0; x < w; x++, pixIndex += BYTES_PER_PIXEL) {
                            var
                                alpha1,
alpha2,
color1,
color2;
                            
                            alpha1 = layer.data[pixIndex + ALPHA_BYTE_OFFSET];
                            
                            
                    if (alpha1) {
                        alpha2 = fusion.data[pixIndex + ALPHA_BYTE_OFFSET];
                
                                
                var
                    newAlpha = (alpha1 + alpha2 - alpha1 * alpha2 / 255) | 0,
                    alpha12 = (alpha1 * alpha2 / 255) | 0,
                    alpha1n2 = (alpha1 * (alpha2 ^ 0xff) / 255) | 0,
                    alphan12 = ((alpha1 ^ 0xff) * alpha2 / 255) | 0;

                        color1 = layer.data[pixIndex];
                    
                        color2 = fusion.data[pixIndex];
                    
                    fusion.data[pixIndex] = (
                    (
                        alpha1n2 * color1
                        + alphan12 * color2
                        + (
                            color2 <= 127
                                ? (alpha12 * 2 * color1 * color2 / 255)
                                : (alpha12 * ((2 * (color1 ^ 0xff) * (color2 ^ 0xff) / 255) ^ 0xff))
                        )
                    ) / newAlpha
                ) | 0;
                
                        color1 = layer.data[pixIndex + 1];
                    
                        color2 = fusion.data[pixIndex + 1];
                    
                    fusion.data[pixIndex + 1] = (
                    (
                        alpha1n2 * color1
                        + alphan12 * color2
                        + (
                            color2 <= 127
                                ? (alpha12 * 2 * color1 * color2 / 255)
                                : (alpha12 * ((2 * (color1 ^ 0xff) * (color2 ^ 0xff) / 255) ^ 0xff))
                        )
                    ) / newAlpha
                ) | 0;
                
                        color1 = layer.data[pixIndex + 2];
                    
                        color2 = fusion.data[pixIndex + 2];
                    
                    fusion.data[pixIndex + 2] = (
                    (
                        alpha1n2 * color1
                        + alphan12 * color2
                        + (
                            color2 <= 127
                                ? (alpha12 * 2 * color1 * color2 / 255)
                                : (alpha12 * ((2 * (color1 ^ 0xff) * (color2 ^ 0xff) / 255) ^ 0xff))
                        )
                    ) / newAlpha
                ) | 0;

            fusion.data[pixIndex + ALPHA_BYTE_OFFSET] = newAlpha;
        
            
                            
                    }
                
                        }
                    }
                };
            
                /**
 * Blend the given layer onto the fusion using the overlay blending operator.
 * 
 * Fusion can contain transparent pixels, but the fusion layer's opacity must be set to 100.
 */

                CPBlend.overlayOntoTransparentFusionWithTransparentLayer = function(layer, fusion, rect) {
                    var
                        h = rect.getHeight() | 0,
w = rect.getWidth() | 0,
yStride = ((layer.width - w) * BYTES_PER_PIXEL) | 0,
pixIndex = layer.offsetOfPixel(rect.left, rect.top) | 0;
                        
                    for (var y = 0 ; y < h; y++, pixIndex += yStride) {
                        for (var x = 0; x < w; x++, pixIndex += BYTES_PER_PIXEL) {
                            var
                                alpha1,
alpha2,
color1,
color2;
                            
                            alpha1 = (((layer.data[pixIndex + ALPHA_BYTE_OFFSET]) * layer.alpha / 100)  | 0);
                            
                            
                    if (alpha1) {
                        alpha2 = fusion.data[pixIndex + ALPHA_BYTE_OFFSET];
                
                                
                var
                    newAlpha = (alpha1 + alpha2 - alpha1 * alpha2 / 255) | 0,
                    alpha12 = (alpha1 * alpha2 / 255) | 0,
                    alpha1n2 = (alpha1 * (alpha2 ^ 0xff) / 255) | 0,
                    alphan12 = ((alpha1 ^ 0xff) * alpha2 / 255) | 0;

                        color1 = layer.data[pixIndex];
                    
                        color2 = fusion.data[pixIndex];
                    
                    fusion.data[pixIndex] = (
                    (
                        alpha1n2 * color1
                        + alphan12 * color2
                        + (
                            color2 <= 127
                                ? (alpha12 * 2 * color1 * color2 / 255)
                                : (alpha12 * ((2 * (color1 ^ 0xff) * (color2 ^ 0xff) / 255) ^ 0xff))
                        )
                    ) / newAlpha
                ) | 0;
                
                        color1 = layer.data[pixIndex + 1];
                    
                        color2 = fusion.data[pixIndex + 1];
                    
                    fusion.data[pixIndex + 1] = (
                    (
                        alpha1n2 * color1
                        + alphan12 * color2
                        + (
                            color2 <= 127
                                ? (alpha12 * 2 * color1 * color2 / 255)
                                : (alpha12 * ((2 * (color1 ^ 0xff) * (color2 ^ 0xff) / 255) ^ 0xff))
                        )
                    ) / newAlpha
                ) | 0;
                
                        color1 = layer.data[pixIndex + 2];
                    
                        color2 = fusion.data[pixIndex + 2];
                    
                    fusion.data[pixIndex + 2] = (
                    (
                        alpha1n2 * color1
                        + alphan12 * color2
                        + (
                            color2 <= 127
                                ? (alpha12 * 2 * color1 * color2 / 255)
                                : (alpha12 * ((2 * (color1 ^ 0xff) * (color2 ^ 0xff) / 255) ^ 0xff))
                        )
                    ) / newAlpha
                ) | 0;

            fusion.data[pixIndex + ALPHA_BYTE_OFFSET] = newAlpha;
        
            
                            
                    }
                
                        }
                    }
                };
            
                /**
 * Blend the given layer onto the fusion using the hardLight blending operator.
 * 
 * The layer must have its layer alpha set to 100
 * 
 * Fusion pixels must be opaque, and the fusion layer's opacity must be set to 100.
 */

                CPBlend.hardLightOntoOpaqueFusionWithOpaqueLayer = function(layer, fusion, rect) {
                    var
                        h = rect.getHeight() | 0,
w = rect.getWidth() | 0,
yStride = ((layer.width - w) * BYTES_PER_PIXEL) | 0,
pixIndex = layer.offsetOfPixel(rect.left, rect.top) | 0;
                        
                    for (var y = 0 ; y < h; y++, pixIndex += yStride) {
                        for (var x = 0; x < w; x++, pixIndex += BYTES_PER_PIXEL) {
                            var
                                alpha1,
color1,
color2;
                            
                            alpha1 = layer.data[pixIndex + ALPHA_BYTE_OFFSET];
                            
                            
                    if (alpha1) {
                
                                
                var
                    invAlpha1 = alpha1 ^ 0xff;

                        color1 = layer.data[pixIndex];
                    
                        color2 = fusion.data[pixIndex];
                    
                    fusion.data[pixIndex] = (
                    (
                        invAlpha1 * color2
                        + (
                            color1 <= 127
                                ? (alpha1 * 2 * color1 * color2 / 255)
                                : (alpha1 * ((2 * (color1 ^ 0xff) * (color2 ^ 0xff) / 255) ^ 0xff))
                        )
                    ) / 255
                ) | 0;
                
                        color1 = layer.data[pixIndex + 1];
                    
                        color2 = fusion.data[pixIndex + 1];
                    
                    fusion.data[pixIndex + 1] = (
                    (
                        invAlpha1 * color2
                        + (
                            color1 <= 127
                                ? (alpha1 * 2 * color1 * color2 / 255)
                                : (alpha1 * ((2 * (color1 ^ 0xff) * (color2 ^ 0xff) / 255) ^ 0xff))
                        )
                    ) / 255
                ) | 0;
                
                        color1 = layer.data[pixIndex + 2];
                    
                        color2 = fusion.data[pixIndex + 2];
                    
                    fusion.data[pixIndex + 2] = (
                    (
                        invAlpha1 * color2
                        + (
                            color1 <= 127
                                ? (alpha1 * 2 * color1 * color2 / 255)
                                : (alpha1 * ((2 * (color1 ^ 0xff) * (color2 ^ 0xff) / 255) ^ 0xff))
                        )
                    ) / 255
                ) | 0;
                
            
                            
                    }
                
                        }
                    }
                };
            
                /**
 * Blend the given layer onto the fusion using the hardLight blending operator.
 * 
 * Fusion pixels must be opaque, and the fusion layer's opacity must be set to 100.
 */

                CPBlend.hardLightOntoOpaqueFusionWithTransparentLayer = function(layer, fusion, rect) {
                    var
                        h = rect.getHeight() | 0,
w = rect.getWidth() | 0,
yStride = ((layer.width - w) * BYTES_PER_PIXEL) | 0,
pixIndex = layer.offsetOfPixel(rect.left, rect.top) | 0;
                        
                    for (var y = 0 ; y < h; y++, pixIndex += yStride) {
                        for (var x = 0; x < w; x++, pixIndex += BYTES_PER_PIXEL) {
                            var
                                alpha1,
color1,
color2;
                            
                            alpha1 = (((layer.data[pixIndex + ALPHA_BYTE_OFFSET]) * layer.alpha / 100)  | 0);
                            
                            
                    if (alpha1) {
                
                                
                var
                    invAlpha1 = alpha1 ^ 0xff;

                        color1 = layer.data[pixIndex];
                    
                        color2 = fusion.data[pixIndex];
                    
                    fusion.data[pixIndex] = (
                    (
                        invAlpha1 * color2
                        + (
                            color1 <= 127
                                ? (alpha1 * 2 * color1 * color2 / 255)
                                : (alpha1 * ((2 * (color1 ^ 0xff) * (color2 ^ 0xff) / 255) ^ 0xff))
                        )
                    ) / 255
                ) | 0;
                
                        color1 = layer.data[pixIndex + 1];
                    
                        color2 = fusion.data[pixIndex + 1];
                    
                    fusion.data[pixIndex + 1] = (
                    (
                        invAlpha1 * color2
                        + (
                            color1 <= 127
                                ? (alpha1 * 2 * color1 * color2 / 255)
                                : (alpha1 * ((2 * (color1 ^ 0xff) * (color2 ^ 0xff) / 255) ^ 0xff))
                        )
                    ) / 255
                ) | 0;
                
                        color1 = layer.data[pixIndex + 2];
                    
                        color2 = fusion.data[pixIndex + 2];
                    
                    fusion.data[pixIndex + 2] = (
                    (
                        invAlpha1 * color2
                        + (
                            color1 <= 127
                                ? (alpha1 * 2 * color1 * color2 / 255)
                                : (alpha1 * ((2 * (color1 ^ 0xff) * (color2 ^ 0xff) / 255) ^ 0xff))
                        )
                    ) / 255
                ) | 0;
                
            
                            
                    }
                
                        }
                    }
                };
            
                /**
 * Blend the given layer onto the fusion using the hardLight blending operator.
 * 
 * The layer must have its layer alpha set to 100
 * 
 * Fusion can contain transparent pixels, but the fusion layer's opacity must be set to 100.
 */

                CPBlend.hardLightOntoTransparentFusionWithOpaqueLayer = function(layer, fusion, rect) {
                    var
                        h = rect.getHeight() | 0,
w = rect.getWidth() | 0,
yStride = ((layer.width - w) * BYTES_PER_PIXEL) | 0,
pixIndex = layer.offsetOfPixel(rect.left, rect.top) | 0;
                        
                    for (var y = 0 ; y < h; y++, pixIndex += yStride) {
                        for (var x = 0; x < w; x++, pixIndex += BYTES_PER_PIXEL) {
                            var
                                alpha1,
alpha2,
color1,
color2;
                            
                            alpha1 = layer.data[pixIndex + ALPHA_BYTE_OFFSET];
                            
                            
                    if (alpha1) {
                        alpha2 = fusion.data[pixIndex + ALPHA_BYTE_OFFSET];
                
                                
                var
                    newAlpha = (alpha1 + alpha2 - alpha1 * alpha2 / 255) | 0,
                    alpha12 = (alpha1 * alpha2 / 255) | 0,
                    alpha1n2 = (alpha1 * (alpha2 ^ 0xff) / 255) | 0,
                    alphan12 = ((alpha1 ^ 0xff) * alpha2 / 255) | 0;

                        color1 = layer.data[pixIndex];
                    
                        color2 = fusion.data[pixIndex];
                    
                    fusion.data[pixIndex] = (
                    (
                        alpha1n2 * color1
                        + alphan12 * color2
                        + (
                            color1 <= 127
                                ? (alpha12 * 2 * color1 * color2 / 255)
                                : (alpha12 * ((2 * (color1 ^ 0xff) * (color2 ^ 0xff) / 255) ^ 0xff))
                        )
                    ) / newAlpha
                ) | 0;
                
                        color1 = layer.data[pixIndex + 1];
                    
                        color2 = fusion.data[pixIndex + 1];
                    
                    fusion.data[pixIndex + 1] = (
                    (
                        alpha1n2 * color1
                        + alphan12 * color2
                        + (
                            color1 <= 127
                                ? (alpha12 * 2 * color1 * color2 / 255)
                                : (alpha12 * ((2 * (color1 ^ 0xff) * (color2 ^ 0xff) / 255) ^ 0xff))
                        )
                    ) / newAlpha
                ) | 0;
                
                        color1 = layer.data[pixIndex + 2];
                    
                        color2 = fusion.data[pixIndex + 2];
                    
                    fusion.data[pixIndex + 2] = (
                    (
                        alpha1n2 * color1
                        + alphan12 * color2
                        + (
                            color1 <= 127
                                ? (alpha12 * 2 * color1 * color2 / 255)
                                : (alpha12 * ((2 * (color1 ^ 0xff) * (color2 ^ 0xff) / 255) ^ 0xff))
                        )
                    ) / newAlpha
                ) | 0;

            fusion.data[pixIndex + ALPHA_BYTE_OFFSET] = newAlpha;
        
            
                            
                    }
                
                        }
                    }
                };
            
                /**
 * Blend the given layer onto the fusion using the hardLight blending operator.
 * 
 * Fusion can contain transparent pixels, but the fusion layer's opacity must be set to 100.
 */

                CPBlend.hardLightOntoTransparentFusionWithTransparentLayer = function(layer, fusion, rect) {
                    var
                        h = rect.getHeight() | 0,
w = rect.getWidth() | 0,
yStride = ((layer.width - w) * BYTES_PER_PIXEL) | 0,
pixIndex = layer.offsetOfPixel(rect.left, rect.top) | 0;
                        
                    for (var y = 0 ; y < h; y++, pixIndex += yStride) {
                        for (var x = 0; x < w; x++, pixIndex += BYTES_PER_PIXEL) {
                            var
                                alpha1,
alpha2,
color1,
color2;
                            
                            alpha1 = (((layer.data[pixIndex + ALPHA_BYTE_OFFSET]) * layer.alpha / 100)  | 0);
                            
                            
                    if (alpha1) {
                        alpha2 = fusion.data[pixIndex + ALPHA_BYTE_OFFSET];
                
                                
                var
                    newAlpha = (alpha1 + alpha2 - alpha1 * alpha2 / 255) | 0,
                    alpha12 = (alpha1 * alpha2 / 255) | 0,
                    alpha1n2 = (alpha1 * (alpha2 ^ 0xff) / 255) | 0,
                    alphan12 = ((alpha1 ^ 0xff) * alpha2 / 255) | 0;

                        color1 = layer.data[pixIndex];
                    
                        color2 = fusion.data[pixIndex];
                    
                    fusion.data[pixIndex] = (
                    (
                        alpha1n2 * color1
                        + alphan12 * color2
                        + (
                            color1 <= 127
                                ? (alpha12 * 2 * color1 * color2 / 255)
                                : (alpha12 * ((2 * (color1 ^ 0xff) * (color2 ^ 0xff) / 255) ^ 0xff))
                        )
                    ) / newAlpha
                ) | 0;
                
                        color1 = layer.data[pixIndex + 1];
                    
                        color2 = fusion.data[pixIndex + 1];
                    
                    fusion.data[pixIndex + 1] = (
                    (
                        alpha1n2 * color1
                        + alphan12 * color2
                        + (
                            color1 <= 127
                                ? (alpha12 * 2 * color1 * color2 / 255)
                                : (alpha12 * ((2 * (color1 ^ 0xff) * (color2 ^ 0xff) / 255) ^ 0xff))
                        )
                    ) / newAlpha
                ) | 0;
                
                        color1 = layer.data[pixIndex + 2];
                    
                        color2 = fusion.data[pixIndex + 2];
                    
                    fusion.data[pixIndex + 2] = (
                    (
                        alpha1n2 * color1
                        + alphan12 * color2
                        + (
                            color1 <= 127
                                ? (alpha12 * 2 * color1 * color2 / 255)
                                : (alpha12 * ((2 * (color1 ^ 0xff) * (color2 ^ 0xff) / 255) ^ 0xff))
                        )
                    ) / newAlpha
                ) | 0;

            fusion.data[pixIndex + ALPHA_BYTE_OFFSET] = newAlpha;
        
            
                            
                    }
                
                        }
                    }
                };
            
                /**
 * Blend the given layer onto the fusion using the softLight blending operator.
 * 
 * The layer must have its layer alpha set to 100
 * 
 * Fusion pixels must be opaque, and the fusion layer's opacity must be set to 100.
 */

                CPBlend.softLightOntoOpaqueFusionWithOpaqueLayer = function(layer, fusion, rect) {
                    var
                        h = rect.getHeight() | 0,
w = rect.getWidth() | 0,
yStride = ((layer.width - w) * BYTES_PER_PIXEL) | 0,
pixIndex = layer.offsetOfPixel(rect.left, rect.top) | 0;
                        
                    for (var y = 0 ; y < h; y++, pixIndex += yStride) {
                        for (var x = 0; x < w; x++, pixIndex += BYTES_PER_PIXEL) {
                            var
                                alpha1,
color1,
color2;
                            
                            alpha1 = layer.data[pixIndex + ALPHA_BYTE_OFFSET];
                            
                            
                    if (alpha1) {
                
                                
                var
                    invAlpha1 = alpha1 ^ 0xff;

                        color1 = layer.data[pixIndex];
                    
                        color2 = fusion.data[pixIndex];
                    
                    fusion.data[pixIndex] = (
                    (
                        invAlpha1 * color2
                        + alpha1 * (
                            color1 <= 127
                                ? ((2 * color1 - 255) * softLightLUTSquare[color2] / 255 + color2)
                                : ((2 * color1 - 255) * softLightLUTSquareRoot[color2] / 255 + color2)
                        )
                    ) / 255
                ) | 0;
                
                        color1 = layer.data[pixIndex + 1];
                    
                        color2 = fusion.data[pixIndex + 1];
                    
                    fusion.data[pixIndex + 1] = (
                    (
                        invAlpha1 * color2
                        + alpha1 * (
                            color1 <= 127
                                ? ((2 * color1 - 255) * softLightLUTSquare[color2] / 255 + color2)
                                : ((2 * color1 - 255) * softLightLUTSquareRoot[color2] / 255 + color2)
                        )
                    ) / 255
                ) | 0;
                
                        color1 = layer.data[pixIndex + 2];
                    
                        color2 = fusion.data[pixIndex + 2];
                    
                    fusion.data[pixIndex + 2] = (
                    (
                        invAlpha1 * color2
                        + alpha1 * (
                            color1 <= 127
                                ? ((2 * color1 - 255) * softLightLUTSquare[color2] / 255 + color2)
                                : ((2 * color1 - 255) * softLightLUTSquareRoot[color2] / 255 + color2)
                        )
                    ) / 255
                ) | 0;
                
            
                            
                    }
                
                        }
                    }
                };
            
                /**
 * Blend the given layer onto the fusion using the softLight blending operator.
 * 
 * Fusion pixels must be opaque, and the fusion layer's opacity must be set to 100.
 */

                CPBlend.softLightOntoOpaqueFusionWithTransparentLayer = function(layer, fusion, rect) {
                    var
                        h = rect.getHeight() | 0,
w = rect.getWidth() | 0,
yStride = ((layer.width - w) * BYTES_PER_PIXEL) | 0,
pixIndex = layer.offsetOfPixel(rect.left, rect.top) | 0;
                        
                    for (var y = 0 ; y < h; y++, pixIndex += yStride) {
                        for (var x = 0; x < w; x++, pixIndex += BYTES_PER_PIXEL) {
                            var
                                alpha1,
color1,
color2;
                            
                            alpha1 = (((layer.data[pixIndex + ALPHA_BYTE_OFFSET]) * layer.alpha / 100)  | 0);
                            
                            
                    if (alpha1) {
                
                                
                var
                    invAlpha1 = alpha1 ^ 0xff;

                        color1 = layer.data[pixIndex];
                    
                        color2 = fusion.data[pixIndex];
                    
                    fusion.data[pixIndex] = (
                    (
                        invAlpha1 * color2
                        + alpha1 * (
                            color1 <= 127
                                ? ((2 * color1 - 255) * softLightLUTSquare[color2] / 255 + color2)
                                : ((2 * color1 - 255) * softLightLUTSquareRoot[color2] / 255 + color2)
                        )
                    ) / 255
                ) | 0;
                
                        color1 = layer.data[pixIndex + 1];
                    
                        color2 = fusion.data[pixIndex + 1];
                    
                    fusion.data[pixIndex + 1] = (
                    (
                        invAlpha1 * color2
                        + alpha1 * (
                            color1 <= 127
                                ? ((2 * color1 - 255) * softLightLUTSquare[color2] / 255 + color2)
                                : ((2 * color1 - 255) * softLightLUTSquareRoot[color2] / 255 + color2)
                        )
                    ) / 255
                ) | 0;
                
                        color1 = layer.data[pixIndex + 2];
                    
                        color2 = fusion.data[pixIndex + 2];
                    
                    fusion.data[pixIndex + 2] = (
                    (
                        invAlpha1 * color2
                        + alpha1 * (
                            color1 <= 127
                                ? ((2 * color1 - 255) * softLightLUTSquare[color2] / 255 + color2)
                                : ((2 * color1 - 255) * softLightLUTSquareRoot[color2] / 255 + color2)
                        )
                    ) / 255
                ) | 0;
                
            
                            
                    }
                
                        }
                    }
                };
            
                /**
 * Blend the given layer onto the fusion using the softLight blending operator.
 * 
 * The layer must have its layer alpha set to 100
 * 
 * Fusion can contain transparent pixels, but the fusion layer's opacity must be set to 100.
 */

                CPBlend.softLightOntoTransparentFusionWithOpaqueLayer = function(layer, fusion, rect) {
                    var
                        h = rect.getHeight() | 0,
w = rect.getWidth() | 0,
yStride = ((layer.width - w) * BYTES_PER_PIXEL) | 0,
pixIndex = layer.offsetOfPixel(rect.left, rect.top) | 0;
                        
                    for (var y = 0 ; y < h; y++, pixIndex += yStride) {
                        for (var x = 0; x < w; x++, pixIndex += BYTES_PER_PIXEL) {
                            var
                                alpha1,
alpha2,
color1,
color2;
                            
                            alpha1 = layer.data[pixIndex + ALPHA_BYTE_OFFSET];
                            
                            
                    if (alpha1) {
                        alpha2 = fusion.data[pixIndex + ALPHA_BYTE_OFFSET];
                
                                
                var
                    newAlpha = (alpha1 + alpha2 - alpha1 * alpha2 / 255) | 0,

                    alpha12 = (alpha1 * alpha2 / 255) | 0,
                    alpha1n2 = (alpha1 * (alpha2 ^ 0xff) / 255) | 0,
                    alphan12 = ((alpha1 ^ 0xff) * alpha2 / 255) | 0;

                        color1 = layer.data[pixIndex];
                    
                        color2 = fusion.data[pixIndex];
                    
                    fusion.data[pixIndex] = (
                    (
                        alpha1n2 * color1
                        + alphan12 * color2
                        + (
                            color1 <= 127
                                ? alpha12 * ((2 * color1 - 255) * softLightLUTSquare[color2] / 255 + color2)
                                : alpha12 * ((2 * color1 - 255) * softLightLUTSquareRoot[color2] / 255 + color2)
                        )
                    ) / newAlpha
                ) | 0;
                
                        color1 = layer.data[pixIndex + 1];
                    
                        color2 = fusion.data[pixIndex + 1];
                    
                    fusion.data[pixIndex + 1] = (
                    (
                        alpha1n2 * color1
                        + alphan12 * color2
                        + (
                            color1 <= 127
                                ? alpha12 * ((2 * color1 - 255) * softLightLUTSquare[color2] / 255 + color2)
                                : alpha12 * ((2 * color1 - 255) * softLightLUTSquareRoot[color2] / 255 + color2)
                        )
                    ) / newAlpha
                ) | 0;
                
                        color1 = layer.data[pixIndex + 2];
                    
                        color2 = fusion.data[pixIndex + 2];
                    
                    fusion.data[pixIndex + 2] = (
                    (
                        alpha1n2 * color1
                        + alphan12 * color2
                        + (
                            color1 <= 127
                                ? alpha12 * ((2 * color1 - 255) * softLightLUTSquare[color2] / 255 + color2)
                                : alpha12 * ((2 * color1 - 255) * softLightLUTSquareRoot[color2] / 255 + color2)
                        )
                    ) / newAlpha
                ) | 0;

            fusion.data[pixIndex + ALPHA_BYTE_OFFSET] = newAlpha;
        
            
                            
                    }
                
                        }
                    }
                };
            
                /**
 * Blend the given layer onto the fusion using the softLight blending operator.
 * 
 * Fusion can contain transparent pixels, but the fusion layer's opacity must be set to 100.
 */

                CPBlend.softLightOntoTransparentFusionWithTransparentLayer = function(layer, fusion, rect) {
                    var
                        h = rect.getHeight() | 0,
w = rect.getWidth() | 0,
yStride = ((layer.width - w) * BYTES_PER_PIXEL) | 0,
pixIndex = layer.offsetOfPixel(rect.left, rect.top) | 0;
                        
                    for (var y = 0 ; y < h; y++, pixIndex += yStride) {
                        for (var x = 0; x < w; x++, pixIndex += BYTES_PER_PIXEL) {
                            var
                                alpha1,
alpha2,
color1,
color2;
                            
                            alpha1 = (((layer.data[pixIndex + ALPHA_BYTE_OFFSET]) * layer.alpha / 100)  | 0);
                            
                            
                    if (alpha1) {
                        alpha2 = fusion.data[pixIndex + ALPHA_BYTE_OFFSET];
                
                                
                var
                    newAlpha = (alpha1 + alpha2 - alpha1 * alpha2 / 255) | 0,

                    alpha12 = (alpha1 * alpha2 / 255) | 0,
                    alpha1n2 = (alpha1 * (alpha2 ^ 0xff) / 255) | 0,
                    alphan12 = ((alpha1 ^ 0xff) * alpha2 / 255) | 0;

                        color1 = layer.data[pixIndex];
                    
                        color2 = fusion.data[pixIndex];
                    
                    fusion.data[pixIndex] = (
                    (
                        alpha1n2 * color1
                        + alphan12 * color2
                        + (
                            color1 <= 127
                                ? alpha12 * ((2 * color1 - 255) * softLightLUTSquare[color2] / 255 + color2)
                                : alpha12 * ((2 * color1 - 255) * softLightLUTSquareRoot[color2] / 255 + color2)
                        )
                    ) / newAlpha
                ) | 0;
                
                        color1 = layer.data[pixIndex + 1];
                    
                        color2 = fusion.data[pixIndex + 1];
                    
                    fusion.data[pixIndex + 1] = (
                    (
                        alpha1n2 * color1
                        + alphan12 * color2
                        + (
                            color1 <= 127
                                ? alpha12 * ((2 * color1 - 255) * softLightLUTSquare[color2] / 255 + color2)
                                : alpha12 * ((2 * color1 - 255) * softLightLUTSquareRoot[color2] / 255 + color2)
                        )
                    ) / newAlpha
                ) | 0;
                
                        color1 = layer.data[pixIndex + 2];
                    
                        color2 = fusion.data[pixIndex + 2];
                    
                    fusion.data[pixIndex + 2] = (
                    (
                        alpha1n2 * color1
                        + alphan12 * color2
                        + (
                            color1 <= 127
                                ? alpha12 * ((2 * color1 - 255) * softLightLUTSquare[color2] / 255 + color2)
                                : alpha12 * ((2 * color1 - 255) * softLightLUTSquareRoot[color2] / 255 + color2)
                        )
                    ) / newAlpha
                ) | 0;

            fusion.data[pixIndex + ALPHA_BYTE_OFFSET] = newAlpha;
        
            
                            
                    }
                
                        }
                    }
                };
            
                /**
 * Blend the given layer onto the fusion using the vividLight blending operator.
 * 
 * The layer must have its layer alpha set to 100
 * 
 * Fusion pixels must be opaque, and the fusion layer's opacity must be set to 100.
 */

                CPBlend.vividLightOntoOpaqueFusionWithOpaqueLayer = function(layer, fusion, rect) {
                    var
                        h = rect.getHeight() | 0,
w = rect.getWidth() | 0,
yStride = ((layer.width - w) * BYTES_PER_PIXEL) | 0,
pixIndex = layer.offsetOfPixel(rect.left, rect.top) | 0;
                        
                    for (var y = 0 ; y < h; y++, pixIndex += yStride) {
                        for (var x = 0; x < w; x++, pixIndex += BYTES_PER_PIXEL) {
                            var
                                alpha1,
color1,
color2;
                            
                            alpha1 = layer.data[pixIndex + ALPHA_BYTE_OFFSET];
                            
                            
                    if (alpha1) {
                
                                
                var
                    invAlpha1 = alpha1 ^ 0xff;

                        color1 = layer.data[pixIndex];
                    
                        color2 = fusion.data[pixIndex];
                    
                    fusion.data[pixIndex] = (
                    (
                        invAlpha1 * color2
                        + (
                            color1 <= 127
                                ? (alpha1 * ((color1 == 0) ? 0 : 255 - Math.min(255, (255 - color2) * 255 / (2 * color1))))
                                : (alpha1 * (color1 == 255 ? 255 : Math.min(255, color2 * 255 / (2 * (255 - color1)))))
                        )
                    ) / 255
                ) | 0;
                
                        color1 = layer.data[pixIndex + 1];
                    
                        color2 = fusion.data[pixIndex + 1];
                    
                    fusion.data[pixIndex + 1] = (
                    (
                        invAlpha1 * color2
                        + (
                            color1 <= 127
                                ? (alpha1 * ((color1 == 0) ? 0 : 255 - Math.min(255, (255 - color2) * 255 / (2 * color1))))
                                : (alpha1 * (color1 == 255 ? 255 : Math.min(255, color2 * 255 / (2 * (255 - color1)))))
                        )
                    ) / 255
                ) | 0;
                
                        color1 = layer.data[pixIndex + 2];
                    
                        color2 = fusion.data[pixIndex + 2];
                    
                    fusion.data[pixIndex + 2] = (
                    (
                        invAlpha1 * color2
                        + (
                            color1 <= 127
                                ? (alpha1 * ((color1 == 0) ? 0 : 255 - Math.min(255, (255 - color2) * 255 / (2 * color1))))
                                : (alpha1 * (color1 == 255 ? 255 : Math.min(255, color2 * 255 / (2 * (255 - color1)))))
                        )
                    ) / 255
                ) | 0;
                
            
                            
                    }
                
                        }
                    }
                };
            
                /**
 * Blend the given layer onto the fusion using the vividLight blending operator.
 * 
 * Fusion pixels must be opaque, and the fusion layer's opacity must be set to 100.
 */

                CPBlend.vividLightOntoOpaqueFusionWithTransparentLayer = function(layer, fusion, rect) {
                    var
                        h = rect.getHeight() | 0,
w = rect.getWidth() | 0,
yStride = ((layer.width - w) * BYTES_PER_PIXEL) | 0,
pixIndex = layer.offsetOfPixel(rect.left, rect.top) | 0;
                        
                    for (var y = 0 ; y < h; y++, pixIndex += yStride) {
                        for (var x = 0; x < w; x++, pixIndex += BYTES_PER_PIXEL) {
                            var
                                alpha1,
color1,
color2;
                            
                            alpha1 = (((layer.data[pixIndex + ALPHA_BYTE_OFFSET]) * layer.alpha / 100)  | 0);
                            
                            
                    if (alpha1) {
                
                                
                var
                    invAlpha1 = alpha1 ^ 0xff;

                        color1 = layer.data[pixIndex];
                    
                        color2 = fusion.data[pixIndex];
                    
                    fusion.data[pixIndex] = (
                    (
                        invAlpha1 * color2
                        + (
                            color1 <= 127
                                ? (alpha1 * ((color1 == 0) ? 0 : 255 - Math.min(255, (255 - color2) * 255 / (2 * color1))))
                                : (alpha1 * (color1 == 255 ? 255 : Math.min(255, color2 * 255 / (2 * (255 - color1)))))
                        )
                    ) / 255
                ) | 0;
                
                        color1 = layer.data[pixIndex + 1];
                    
                        color2 = fusion.data[pixIndex + 1];
                    
                    fusion.data[pixIndex + 1] = (
                    (
                        invAlpha1 * color2
                        + (
                            color1 <= 127
                                ? (alpha1 * ((color1 == 0) ? 0 : 255 - Math.min(255, (255 - color2) * 255 / (2 * color1))))
                                : (alpha1 * (color1 == 255 ? 255 : Math.min(255, color2 * 255 / (2 * (255 - color1)))))
                        )
                    ) / 255
                ) | 0;
                
                        color1 = layer.data[pixIndex + 2];
                    
                        color2 = fusion.data[pixIndex + 2];
                    
                    fusion.data[pixIndex + 2] = (
                    (
                        invAlpha1 * color2
                        + (
                            color1 <= 127
                                ? (alpha1 * ((color1 == 0) ? 0 : 255 - Math.min(255, (255 - color2) * 255 / (2 * color1))))
                                : (alpha1 * (color1 == 255 ? 255 : Math.min(255, color2 * 255 / (2 * (255 - color1)))))
                        )
                    ) / 255
                ) | 0;
                
            
                            
                    }
                
                        }
                    }
                };
            
                /**
 * Blend the given layer onto the fusion using the vividLight blending operator.
 * 
 * The layer must have its layer alpha set to 100
 * 
 * Fusion can contain transparent pixels, but the fusion layer's opacity must be set to 100.
 */

                CPBlend.vividLightOntoTransparentFusionWithOpaqueLayer = function(layer, fusion, rect) {
                    var
                        h = rect.getHeight() | 0,
w = rect.getWidth() | 0,
yStride = ((layer.width - w) * BYTES_PER_PIXEL) | 0,
pixIndex = layer.offsetOfPixel(rect.left, rect.top) | 0;
                        
                    for (var y = 0 ; y < h; y++, pixIndex += yStride) {
                        for (var x = 0; x < w; x++, pixIndex += BYTES_PER_PIXEL) {
                            var
                                alpha1,
alpha2,
color1,
color2;
                            
                            alpha1 = layer.data[pixIndex + ALPHA_BYTE_OFFSET];
                            
                            
                    if (alpha1) {
                        alpha2 = fusion.data[pixIndex + ALPHA_BYTE_OFFSET];
                
                                
                var
                    newAlpha = (alpha1 + alpha2 - alpha1 * alpha2 / 255) | 0,

                    alpha12 = (alpha1 * alpha2 / 255) | 0,
                    alpha1n2 = (alpha1 * (alpha2 ^ 0xff) / 255) | 0,
                    alphan12 = ((alpha1 ^ 0xff) * alpha2 / 255) | 0;

                        color1 = layer.data[pixIndex];
                    
                        color2 = fusion.data[pixIndex];
                    
                    fusion.data[pixIndex] = (
                    (
                        alpha1n2 * color1
                        + alphan12 * color2
                        + (
                            color1 <= 127
                                ? (alpha12 * ((color1 == 0) ? 0 : 255 - Math.min(255, (255 - color2) * 255 / (2 * color1))))
                                : (alpha12 * (color1 == 255 ? 255 : Math.min(255, color2 * 255 / (2 * (255 - color1)))))
                        )
                    ) / newAlpha
                ) | 0;
                
                        color1 = layer.data[pixIndex + 1];
                    
                        color2 = fusion.data[pixIndex + 1];
                    
                    fusion.data[pixIndex + 1] = (
                    (
                        alpha1n2 * color1
                        + alphan12 * color2
                        + (
                            color1 <= 127
                                ? (alpha12 * ((color1 == 0) ? 0 : 255 - Math.min(255, (255 - color2) * 255 / (2 * color1))))
                                : (alpha12 * (color1 == 255 ? 255 : Math.min(255, color2 * 255 / (2 * (255 - color1)))))
                        )
                    ) / newAlpha
                ) | 0;
                
                        color1 = layer.data[pixIndex + 2];
                    
                        color2 = fusion.data[pixIndex + 2];
                    
                    fusion.data[pixIndex + 2] = (
                    (
                        alpha1n2 * color1
                        + alphan12 * color2
                        + (
                            color1 <= 127
                                ? (alpha12 * ((color1 == 0) ? 0 : 255 - Math.min(255, (255 - color2) * 255 / (2 * color1))))
                                : (alpha12 * (color1 == 255 ? 255 : Math.min(255, color2 * 255 / (2 * (255 - color1)))))
                        )
                    ) / newAlpha
                ) | 0;

            fusion.data[pixIndex + ALPHA_BYTE_OFFSET] = newAlpha;
        
            
                            
                    }
                
                        }
                    }
                };
            
                /**
 * Blend the given layer onto the fusion using the vividLight blending operator.
 * 
 * Fusion can contain transparent pixels, but the fusion layer's opacity must be set to 100.
 */

                CPBlend.vividLightOntoTransparentFusionWithTransparentLayer = function(layer, fusion, rect) {
                    var
                        h = rect.getHeight() | 0,
w = rect.getWidth() | 0,
yStride = ((layer.width - w) * BYTES_PER_PIXEL) | 0,
pixIndex = layer.offsetOfPixel(rect.left, rect.top) | 0;
                        
                    for (var y = 0 ; y < h; y++, pixIndex += yStride) {
                        for (var x = 0; x < w; x++, pixIndex += BYTES_PER_PIXEL) {
                            var
                                alpha1,
alpha2,
color1,
color2;
                            
                            alpha1 = (((layer.data[pixIndex + ALPHA_BYTE_OFFSET]) * layer.alpha / 100)  | 0);
                            
                            
                    if (alpha1) {
                        alpha2 = fusion.data[pixIndex + ALPHA_BYTE_OFFSET];
                
                                
                var
                    newAlpha = (alpha1 + alpha2 - alpha1 * alpha2 / 255) | 0,

                    alpha12 = (alpha1 * alpha2 / 255) | 0,
                    alpha1n2 = (alpha1 * (alpha2 ^ 0xff) / 255) | 0,
                    alphan12 = ((alpha1 ^ 0xff) * alpha2 / 255) | 0;

                        color1 = layer.data[pixIndex];
                    
                        color2 = fusion.data[pixIndex];
                    
                    fusion.data[pixIndex] = (
                    (
                        alpha1n2 * color1
                        + alphan12 * color2
                        + (
                            color1 <= 127
                                ? (alpha12 * ((color1 == 0) ? 0 : 255 - Math.min(255, (255 - color2) * 255 / (2 * color1))))
                                : (alpha12 * (color1 == 255 ? 255 : Math.min(255, color2 * 255 / (2 * (255 - color1)))))
                        )
                    ) / newAlpha
                ) | 0;
                
                        color1 = layer.data[pixIndex + 1];
                    
                        color2 = fusion.data[pixIndex + 1];
                    
                    fusion.data[pixIndex + 1] = (
                    (
                        alpha1n2 * color1
                        + alphan12 * color2
                        + (
                            color1 <= 127
                                ? (alpha12 * ((color1 == 0) ? 0 : 255 - Math.min(255, (255 - color2) * 255 / (2 * color1))))
                                : (alpha12 * (color1 == 255 ? 255 : Math.min(255, color2 * 255 / (2 * (255 - color1)))))
                        )
                    ) / newAlpha
                ) | 0;
                
                        color1 = layer.data[pixIndex + 2];
                    
                        color2 = fusion.data[pixIndex + 2];
                    
                    fusion.data[pixIndex + 2] = (
                    (
                        alpha1n2 * color1
                        + alphan12 * color2
                        + (
                            color1 <= 127
                                ? (alpha12 * ((color1 == 0) ? 0 : 255 - Math.min(255, (255 - color2) * 255 / (2 * color1))))
                                : (alpha12 * (color1 == 255 ? 255 : Math.min(255, color2 * 255 / (2 * (255 - color1)))))
                        )
                    ) / newAlpha
                ) | 0;

            fusion.data[pixIndex + ALPHA_BYTE_OFFSET] = newAlpha;
        
            
                            
                    }
                
                        }
                    }
                };
            
                /**
 * Blend the given layer onto the fusion using the linearLight blending operator.
 * 
 * The layer must have its layer alpha set to 100
 * 
 * Fusion pixels must be opaque, and the fusion layer's opacity must be set to 100.
 */

                CPBlend.linearLightOntoOpaqueFusionWithOpaqueLayer = function(layer, fusion, rect) {
                    var
                        h = rect.getHeight() | 0,
w = rect.getWidth() | 0,
yStride = ((layer.width - w) * BYTES_PER_PIXEL) | 0,
pixIndex = layer.offsetOfPixel(rect.left, rect.top) | 0;
                        
                    for (var y = 0 ; y < h; y++, pixIndex += yStride) {
                        for (var x = 0; x < w; x++, pixIndex += BYTES_PER_PIXEL) {
                            var
                                alpha1,
color2;
                            
                            alpha1 = layer.data[pixIndex + ALPHA_BYTE_OFFSET];
                            
                            
                    if (alpha1) {
                
                                
                var
                    invAlpha1 = alpha1 ^ 0xff;

                        color2 = fusion.data[pixIndex];
                    
                    fusion.data[pixIndex] = (
                    (
                        invAlpha1 * color2
                        + alpha1 * Math.min(255, Math.max(0, color2 + 2 * layer.data[pixIndex] - 255))
                    ) / 255
                ) | 0;
                
                        color2 = fusion.data[pixIndex + 1];
                    
                    fusion.data[pixIndex + 1] = (
                    (
                        invAlpha1 * color2
                        + alpha1 * Math.min(255, Math.max(0, color2 + 2 * layer.data[pixIndex + 1] - 255))
                    ) / 255
                ) | 0;
                
                        color2 = fusion.data[pixIndex + 2];
                    
                    fusion.data[pixIndex + 2] = (
                    (
                        invAlpha1 * color2
                        + alpha1 * Math.min(255, Math.max(0, color2 + 2 * layer.data[pixIndex + 2] - 255))
                    ) / 255
                ) | 0;
                
            
                            
                    }
                
                        }
                    }
                };
            
                /**
 * Blend the given layer onto the fusion using the linearLight blending operator.
 * 
 * Fusion pixels must be opaque, and the fusion layer's opacity must be set to 100.
 */

                CPBlend.linearLightOntoOpaqueFusionWithTransparentLayer = function(layer, fusion, rect) {
                    var
                        h = rect.getHeight() | 0,
w = rect.getWidth() | 0,
yStride = ((layer.width - w) * BYTES_PER_PIXEL) | 0,
pixIndex = layer.offsetOfPixel(rect.left, rect.top) | 0;
                        
                    for (var y = 0 ; y < h; y++, pixIndex += yStride) {
                        for (var x = 0; x < w; x++, pixIndex += BYTES_PER_PIXEL) {
                            var
                                alpha1,
color2;
                            
                            alpha1 = (((layer.data[pixIndex + ALPHA_BYTE_OFFSET]) * layer.alpha / 100)  | 0);
                            
                            
                    if (alpha1) {
                
                                
                var
                    invAlpha1 = alpha1 ^ 0xff;

                        color2 = fusion.data[pixIndex];
                    
                    fusion.data[pixIndex] = (
                    (
                        invAlpha1 * color2
                        + alpha1 * Math.min(255, Math.max(0, color2 + 2 * layer.data[pixIndex] - 255))
                    ) / 255
                ) | 0;
                
                        color2 = fusion.data[pixIndex + 1];
                    
                    fusion.data[pixIndex + 1] = (
                    (
                        invAlpha1 * color2
                        + alpha1 * Math.min(255, Math.max(0, color2 + 2 * layer.data[pixIndex + 1] - 255))
                    ) / 255
                ) | 0;
                
                        color2 = fusion.data[pixIndex + 2];
                    
                    fusion.data[pixIndex + 2] = (
                    (
                        invAlpha1 * color2
                        + alpha1 * Math.min(255, Math.max(0, color2 + 2 * layer.data[pixIndex + 2] - 255))
                    ) / 255
                ) | 0;
                
            
                            
                    }
                
                        }
                    }
                };
            
                /**
 * Blend the given layer onto the fusion using the linearLight blending operator.
 * 
 * The layer must have its layer alpha set to 100
 * 
 * Fusion can contain transparent pixels, but the fusion layer's opacity must be set to 100.
 */

                CPBlend.linearLightOntoTransparentFusionWithOpaqueLayer = function(layer, fusion, rect) {
                    var
                        h = rect.getHeight() | 0,
w = rect.getWidth() | 0,
yStride = ((layer.width - w) * BYTES_PER_PIXEL) | 0,
pixIndex = layer.offsetOfPixel(rect.left, rect.top) | 0;
                        
                    for (var y = 0 ; y < h; y++, pixIndex += yStride) {
                        for (var x = 0; x < w; x++, pixIndex += BYTES_PER_PIXEL) {
                            var
                                alpha1,
alpha2,
color1,
color2;
                            
                            alpha1 = layer.data[pixIndex + ALPHA_BYTE_OFFSET];
                            
                            
                    if (alpha1) {
                        alpha2 = fusion.data[pixIndex + ALPHA_BYTE_OFFSET];
                
                                
                var
                    newAlpha = (alpha1 + alpha2 - alpha1 * alpha2 / 255) | 0,

                    alpha12 = (alpha1 * alpha2 / 255) | 0,
                    alpha1n2 = (alpha1 * (alpha2 ^ 0xff) / 255) | 0,
                    alphan12 = ((alpha1 ^ 0xff) * alpha2 / 255) | 0;

                        color1 = layer.data[pixIndex];
                    
                        color2 = fusion.data[pixIndex];
                    
                    fusion.data[pixIndex] = (
                    (
                        alpha1n2 * color1
                        + alphan12 * color2
                        + alpha12 * Math.min(255, Math.max(0, color2 + 2 * color1 - 255))
                    ) / newAlpha
                ) | 0;
                
                        color1 = layer.data[pixIndex + 1];
                    
                        color2 = fusion.data[pixIndex + 1];
                    
                    fusion.data[pixIndex + 1] = (
                    (
                        alpha1n2 * color1
                        + alphan12 * color2
                        + alpha12 * Math.min(255, Math.max(0, color2 + 2 * color1 - 255))
                    ) / newAlpha
                ) | 0;
                
                        color1 = layer.data[pixIndex + 2];
                    
                        color2 = fusion.data[pixIndex + 2];
                    
                    fusion.data[pixIndex + 2] = (
                    (
                        alpha1n2 * color1
                        + alphan12 * color2
                        + alpha12 * Math.min(255, Math.max(0, color2 + 2 * color1 - 255))
                    ) / newAlpha
                ) | 0;

            fusion.data[pixIndex + ALPHA_BYTE_OFFSET] = newAlpha;
        
            
                            
                    }
                
                        }
                    }
                };
            
                /**
 * Blend the given layer onto the fusion using the linearLight blending operator.
 * 
 * Fusion can contain transparent pixels, but the fusion layer's opacity must be set to 100.
 */

                CPBlend.linearLightOntoTransparentFusionWithTransparentLayer = function(layer, fusion, rect) {
                    var
                        h = rect.getHeight() | 0,
w = rect.getWidth() | 0,
yStride = ((layer.width - w) * BYTES_PER_PIXEL) | 0,
pixIndex = layer.offsetOfPixel(rect.left, rect.top) | 0;
                        
                    for (var y = 0 ; y < h; y++, pixIndex += yStride) {
                        for (var x = 0; x < w; x++, pixIndex += BYTES_PER_PIXEL) {
                            var
                                alpha1,
alpha2,
color1,
color2;
                            
                            alpha1 = (((layer.data[pixIndex + ALPHA_BYTE_OFFSET]) * layer.alpha / 100)  | 0);
                            
                            
                    if (alpha1) {
                        alpha2 = fusion.data[pixIndex + ALPHA_BYTE_OFFSET];
                
                                
                var
                    newAlpha = (alpha1 + alpha2 - alpha1 * alpha2 / 255) | 0,

                    alpha12 = (alpha1 * alpha2 / 255) | 0,
                    alpha1n2 = (alpha1 * (alpha2 ^ 0xff) / 255) | 0,
                    alphan12 = ((alpha1 ^ 0xff) * alpha2 / 255) | 0;

                        color1 = layer.data[pixIndex];
                    
                        color2 = fusion.data[pixIndex];
                    
                    fusion.data[pixIndex] = (
                    (
                        alpha1n2 * color1
                        + alphan12 * color2
                        + alpha12 * Math.min(255, Math.max(0, color2 + 2 * color1 - 255))
                    ) / newAlpha
                ) | 0;
                
                        color1 = layer.data[pixIndex + 1];
                    
                        color2 = fusion.data[pixIndex + 1];
                    
                    fusion.data[pixIndex + 1] = (
                    (
                        alpha1n2 * color1
                        + alphan12 * color2
                        + alpha12 * Math.min(255, Math.max(0, color2 + 2 * color1 - 255))
                    ) / newAlpha
                ) | 0;
                
                        color1 = layer.data[pixIndex + 2];
                    
                        color2 = fusion.data[pixIndex + 2];
                    
                    fusion.data[pixIndex + 2] = (
                    (
                        alpha1n2 * color1
                        + alphan12 * color2
                        + alpha12 * Math.min(255, Math.max(0, color2 + 2 * color1 - 255))
                    ) / newAlpha
                ) | 0;

            fusion.data[pixIndex + ALPHA_BYTE_OFFSET] = newAlpha;
        
            
                            
                    }
                
                        }
                    }
                };
            
                /**
 * Blend the given layer onto the fusion using the pinLight blending operator.
 * 
 * The layer must have its layer alpha set to 100
 * 
 * Fusion pixels must be opaque, and the fusion layer's opacity must be set to 100.
 */

                CPBlend.pinLightOntoOpaqueFusionWithOpaqueLayer = function(layer, fusion, rect) {
                    var
                        h = rect.getHeight() | 0,
w = rect.getWidth() | 0,
yStride = ((layer.width - w) * BYTES_PER_PIXEL) | 0,
pixIndex = layer.offsetOfPixel(rect.left, rect.top) | 0;
                        
                    for (var y = 0 ; y < h; y++, pixIndex += yStride) {
                        for (var x = 0; x < w; x++, pixIndex += BYTES_PER_PIXEL) {
                            var
                                alpha1,
color1,
color2;
                            
                            alpha1 = layer.data[pixIndex + ALPHA_BYTE_OFFSET];
                            
                            
                    if (alpha1) {
                
                                
                var
                    invAlpha1 = alpha1 ^ 0xff;

                        color1 = layer.data[pixIndex];
                    
                        color2 = fusion.data[pixIndex];
                    
                    fusion.data[pixIndex] = (
                    (
                        invAlpha1 * color2
                        + alpha1 * ((color2 >= 2 * color1) ? (2 * color1) : (color2 <= 2 * color1 - 255) ? (2 * color1 - 255) : color2)
                    ) / 255
                ) | 0;
                
                        color1 = layer.data[pixIndex + 1];
                    
                        color2 = fusion.data[pixIndex + 1];
                    
                    fusion.data[pixIndex + 1] = (
                    (
                        invAlpha1 * color2
                        + alpha1 * ((color2 >= 2 * color1) ? (2 * color1) : (color2 <= 2 * color1 - 255) ? (2 * color1 - 255) : color2)
                    ) / 255
                ) | 0;
                
                        color1 = layer.data[pixIndex + 2];
                    
                        color2 = fusion.data[pixIndex + 2];
                    
                    fusion.data[pixIndex + 2] = (
                    (
                        invAlpha1 * color2
                        + alpha1 * ((color2 >= 2 * color1) ? (2 * color1) : (color2 <= 2 * color1 - 255) ? (2 * color1 - 255) : color2)
                    ) / 255
                ) | 0;
                
            
                            
                    }
                
                        }
                    }
                };
            
                /**
 * Blend the given layer onto the fusion using the pinLight blending operator.
 * 
 * Fusion pixels must be opaque, and the fusion layer's opacity must be set to 100.
 */

                CPBlend.pinLightOntoOpaqueFusionWithTransparentLayer = function(layer, fusion, rect) {
                    var
                        h = rect.getHeight() | 0,
w = rect.getWidth() | 0,
yStride = ((layer.width - w) * BYTES_PER_PIXEL) | 0,
pixIndex = layer.offsetOfPixel(rect.left, rect.top) | 0;
                        
                    for (var y = 0 ; y < h; y++, pixIndex += yStride) {
                        for (var x = 0; x < w; x++, pixIndex += BYTES_PER_PIXEL) {
                            var
                                alpha1,
color1,
color2;
                            
                            alpha1 = (((layer.data[pixIndex + ALPHA_BYTE_OFFSET]) * layer.alpha / 100)  | 0);
                            
                            
                    if (alpha1) {
                
                                
                var
                    invAlpha1 = alpha1 ^ 0xff;

                        color1 = layer.data[pixIndex];
                    
                        color2 = fusion.data[pixIndex];
                    
                    fusion.data[pixIndex] = (
                    (
                        invAlpha1 * color2
                        + alpha1 * ((color2 >= 2 * color1) ? (2 * color1) : (color2 <= 2 * color1 - 255) ? (2 * color1 - 255) : color2)
                    ) / 255
                ) | 0;
                
                        color1 = layer.data[pixIndex + 1];
                    
                        color2 = fusion.data[pixIndex + 1];
                    
                    fusion.data[pixIndex + 1] = (
                    (
                        invAlpha1 * color2
                        + alpha1 * ((color2 >= 2 * color1) ? (2 * color1) : (color2 <= 2 * color1 - 255) ? (2 * color1 - 255) : color2)
                    ) / 255
                ) | 0;
                
                        color1 = layer.data[pixIndex + 2];
                    
                        color2 = fusion.data[pixIndex + 2];
                    
                    fusion.data[pixIndex + 2] = (
                    (
                        invAlpha1 * color2
                        + alpha1 * ((color2 >= 2 * color1) ? (2 * color1) : (color2 <= 2 * color1 - 255) ? (2 * color1 - 255) : color2)
                    ) / 255
                ) | 0;
                
            
                            
                    }
                
                        }
                    }
                };
            
                /**
 * Blend the given layer onto the fusion using the pinLight blending operator.
 * 
 * The layer must have its layer alpha set to 100
 * 
 * Fusion can contain transparent pixels, but the fusion layer's opacity must be set to 100.
 */

                CPBlend.pinLightOntoTransparentFusionWithOpaqueLayer = function(layer, fusion, rect) {
                    var
                        h = rect.getHeight() | 0,
w = rect.getWidth() | 0,
yStride = ((layer.width - w) * BYTES_PER_PIXEL) | 0,
pixIndex = layer.offsetOfPixel(rect.left, rect.top) | 0;
                        
                    for (var y = 0 ; y < h; y++, pixIndex += yStride) {
                        for (var x = 0; x < w; x++, pixIndex += BYTES_PER_PIXEL) {
                            var
                                alpha1,
alpha2,
color1,
color2;
                            
                            alpha1 = layer.data[pixIndex + ALPHA_BYTE_OFFSET];
                            
                            
                    if (alpha1) {
                        alpha2 = fusion.data[pixIndex + ALPHA_BYTE_OFFSET];
                
                                
                var
                    newAlpha = (alpha1 + alpha2 - alpha1 * alpha2 / 255) | 0,

                    alpha12 = (alpha1 * alpha2 / 255) | 0,
                    alpha1n2 = (alpha1 * (alpha2 ^ 0xff) / 255) | 0,
                    alphan12 = ((alpha1 ^ 0xff) * alpha2 / 255) | 0;

                        color1 = layer.data[pixIndex];
                    
                        color2 = fusion.data[pixIndex];
                    
                    fusion.data[pixIndex] = (
                    (
                        alpha1n2 * color1
                        + alphan12 * color2
                        + alpha12 * ((color2 >= 2 * color1) ? (2 * color1) : (color2 <= 2 * color1 - 255) ? (2 * color1 - 255) : color2)
                    ) / newAlpha
                ) | 0;
                
                        color1 = layer.data[pixIndex + 1];
                    
                        color2 = fusion.data[pixIndex + 1];
                    
                    fusion.data[pixIndex + 1] = (
                    (
                        alpha1n2 * color1
                        + alphan12 * color2
                        + alpha12 * ((color2 >= 2 * color1) ? (2 * color1) : (color2 <= 2 * color1 - 255) ? (2 * color1 - 255) : color2)
                    ) / newAlpha
                ) | 0;
                
                        color1 = layer.data[pixIndex + 2];
                    
                        color2 = fusion.data[pixIndex + 2];
                    
                    fusion.data[pixIndex + 2] = (
                    (
                        alpha1n2 * color1
                        + alphan12 * color2
                        + alpha12 * ((color2 >= 2 * color1) ? (2 * color1) : (color2 <= 2 * color1 - 255) ? (2 * color1 - 255) : color2)
                    ) / newAlpha
                ) | 0;

            fusion.data[pixIndex + ALPHA_BYTE_OFFSET] = newAlpha;
        
            
                            
                    }
                
                        }
                    }
                };
            
                /**
 * Blend the given layer onto the fusion using the pinLight blending operator.
 * 
 * Fusion can contain transparent pixels, but the fusion layer's opacity must be set to 100.
 */

                CPBlend.pinLightOntoTransparentFusionWithTransparentLayer = function(layer, fusion, rect) {
                    var
                        h = rect.getHeight() | 0,
w = rect.getWidth() | 0,
yStride = ((layer.width - w) * BYTES_PER_PIXEL) | 0,
pixIndex = layer.offsetOfPixel(rect.left, rect.top) | 0;
                        
                    for (var y = 0 ; y < h; y++, pixIndex += yStride) {
                        for (var x = 0; x < w; x++, pixIndex += BYTES_PER_PIXEL) {
                            var
                                alpha1,
alpha2,
color1,
color2;
                            
                            alpha1 = (((layer.data[pixIndex + ALPHA_BYTE_OFFSET]) * layer.alpha / 100)  | 0);
                            
                            
                    if (alpha1) {
                        alpha2 = fusion.data[pixIndex + ALPHA_BYTE_OFFSET];
                
                                
                var
                    newAlpha = (alpha1 + alpha2 - alpha1 * alpha2 / 255) | 0,

                    alpha12 = (alpha1 * alpha2 / 255) | 0,
                    alpha1n2 = (alpha1 * (alpha2 ^ 0xff) / 255) | 0,
                    alphan12 = ((alpha1 ^ 0xff) * alpha2 / 255) | 0;

                        color1 = layer.data[pixIndex];
                    
                        color2 = fusion.data[pixIndex];
                    
                    fusion.data[pixIndex] = (
                    (
                        alpha1n2 * color1
                        + alphan12 * color2
                        + alpha12 * ((color2 >= 2 * color1) ? (2 * color1) : (color2 <= 2 * color1 - 255) ? (2 * color1 - 255) : color2)
                    ) / newAlpha
                ) | 0;
                
                        color1 = layer.data[pixIndex + 1];
                    
                        color2 = fusion.data[pixIndex + 1];
                    
                    fusion.data[pixIndex + 1] = (
                    (
                        alpha1n2 * color1
                        + alphan12 * color2
                        + alpha12 * ((color2 >= 2 * color1) ? (2 * color1) : (color2 <= 2 * color1 - 255) ? (2 * color1 - 255) : color2)
                    ) / newAlpha
                ) | 0;
                
                        color1 = layer.data[pixIndex + 2];
                    
                        color2 = fusion.data[pixIndex + 2];
                    
                    fusion.data[pixIndex + 2] = (
                    (
                        alpha1n2 * color1
                        + alphan12 * color2
                        + alpha12 * ((color2 >= 2 * color1) ? (2 * color1) : (color2 <= 2 * color1 - 255) ? (2 * color1 - 255) : color2)
                    ) / newAlpha
                ) | 0;

            fusion.data[pixIndex + ALPHA_BYTE_OFFSET] = newAlpha;
        
            
                            
                    }
                
                        }
                    }
                };
            
    
    CPBlend.LM_NORMAL = 0;
    CPBlend.LM_MULTIPLY = 1;
    CPBlend.LM_ADD = 2;
    CPBlend.LM_SCREEN = 3;
    CPBlend.LM_LIGHTEN = 4;
    CPBlend.LM_DARKEN = 5;
    CPBlend.LM_SUBTRACT = 6;
    CPBlend.LM_DODGE = 7;
    CPBlend.LM_BURN = 8;
    CPBlend.LM_OVERLAY = 9;
    CPBlend.LM_HARDLIGHT = 10;
    CPBlend.LM_SOFTLIGHT = 11;
    CPBlend.LM_VIVIDLIGHT = 12;
    CPBlend.LM_LINEARLIGHT = 13;
    CPBlend.LM_PINLIGHT = 14;

/**
 * Fuse the given layer on top of the given fusion layer, using the blending operation defined in the layer.
 *
 * @param {CPLayer} fusion - Layer to fuse on top of
 * @param {boolean} fusionHasTransparency - True if the fusion layer has alpha < 100, or any transparent pixels.
 * @param {CPLayer} layer - Layer that should be drawn on top of the fusion
 * @param {CPRect} rect - The rectangle of pixels that should be fused.
 */
CPBlend.fuseLayer = function (fusion, fusionHasTransparency, layer, rect) {
    if (layer.alpha <= 0) {
        return;
    }

    var
        funcName = BLEND_MODE_NAMES[layer.blendMode] + "Onto";

    if (fusion.alpha < 100) {
        throw "Fusion layer alpha < 100 not supported.";
    }

    if (fusionHasTransparency) {
        funcName += "TransparentFusion";
    } else {
        funcName += "OpaqueFusion";
    }

    if (layer.alpha == 100) {
        funcName += "WithOpaqueLayer";
    } else {
        funcName += "WithTransparentLayer";
    }

    fusion.getBounds().clip(rect);

    this[funcName](layer, fusion, rect);
};
function makeLookupTables() {
    // V - V^2 table
    for (var i = 0; i < 256; i++) {
        var
            v = i / 255;

        softLightLUTSquare[i] = ((v - v * v) * 255) | 0;
    }

    // sqrt(V) - V table
    for (var i = 0; i < 256; i++) {
        var
            v = i / 255;

        softLightLUTSquareRoot[i] = ((Math.sqrt(v) - v) * 255) | 0;
    }
}
makeLookupTables();
