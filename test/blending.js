"use strict";

var suite = new Benchmark.Suite;

function createImageData(width, height) {
    //return new ImageData(width, height); // Doesn't work on old IE
     
    var
        canvas = document.createElement("canvas"),
        context = canvas.getContext("2d");
    
    return context.createImageData(width, height);
}

function CPRect(left, top, right, bottom) {
    this.left = left;
    this.top = top;
    this.right = right;
    this.bottom = bottom;
}

CPRect.prototype.getWidth = function() {
    return this.right - this.left;
};

CPRect.prototype.getHeight = function() {
    return this.bottom - this.top;
};

if (!Math.imul) {
    Math.imul = function(x, y) {
        return (x * y) | 0;
    };
}

function CPLayer(drawable) {
    this.width = 1024;
    this.height = 768;
    
    this.data = createImageData(this.width, this.height).data;

    var
        BYTES_PER_PIXEL = 4,
        
        RED_BYTE_OFFSET = 0,
        GREEN_BYTE_OFFSET = 1,
        BLUE_BYTE_OFFSET = 2,
        ALPHA_BYTE_OFFSET = 3;
    
    var
        that = this;
    
    this.fusionWithNormalNoAlphaOld = function(fusion, rect) {
        var 
            yStride = (that.width - rect.getWidth()) * BYTES_PER_PIXEL,
            pixIndex = that.offsetOfPixel(rect.left, rect.top);

        for (var y = rect.top; y < rect.bottom; y++, pixIndex += yStride) {
            for (var x = rect.left; x < rect.right; x++) {
                var 
                    alpha = that.data[pixIndex + ALPHA_BYTE_OFFSET];
                
                if (alpha == 0) {
                    pixIndex += BYTES_PER_PIXEL;
                } else if (alpha == 255) {
                    for (var i = 0; i < BYTES_PER_PIXEL; i++) {
                        fusion.data[pixIndex] = that.data[pixIndex];
                        pixIndex++;
                    }
                } else {
                    var 
                        invAlpha = 255 - alpha;

                    for (var i = 0; i < 3; i++, pixIndex++) {
                        fusion.data[pixIndex] = ((that.data[pixIndex] * alpha + fusion.data[pixIndex] * invAlpha) / 255) | 0;
                    }
                    pixIndex++; // Don't need to update the alpha because it started out as 100%
                }
            }
        }
    };
    
    this.fusionWithNormalNoAlphaUnroll1 = function(fusion, rect) {
        var 
            yStride = ((that.width - rect.getWidth()) * BYTES_PER_PIXEL) | 0,
            pixIndex = that.offsetOfPixel(rect.left, rect.top) | 0;

        for (var y = rect.top; y < rect.bottom; y++, pixIndex = (pixIndex + yStride) | 0) {
            for (var x = rect.left; x < rect.right; x++) {
                var 
                    alpha = that.data[(pixIndex + ALPHA_BYTE_OFFSET) | 0];
                
                if (alpha == 0) {
                    pixIndex = (pixIndex + BYTES_PER_PIXEL) | 0;
                } else if (alpha == 255) {
                    fusion.data[pixIndex] = that.data[pixIndex];
                    pixIndex++;
                    fusion.data[pixIndex] = that.data[pixIndex];
                    pixIndex++;
                    fusion.data[pixIndex] = that.data[pixIndex];
                    pixIndex++;
                    fusion.data[pixIndex] = that.data[pixIndex];
                    pixIndex++;
                } else {
                    var 
                        invAlpha = (255 - alpha) | 0;

                    fusion.data[pixIndex] = (((Math.imul(that.data[pixIndex], alpha) + Math.imul(fusion.data[pixIndex], invAlpha)) | 0) / 255) | 0;
                    pixIndex++;
                    fusion.data[pixIndex] = (((Math.imul(that.data[pixIndex], alpha) + Math.imul(fusion.data[pixIndex], invAlpha)) | 0) / 255) | 0;
                    pixIndex++;
                    fusion.data[pixIndex] = (((Math.imul(that.data[pixIndex], alpha) + Math.imul(fusion.data[pixIndex], invAlpha)) | 0) / 255) | 0;
                    pixIndex += 2;
                }
            }
        }
    };
    
    this.fusionWithNormalNoAlphaUnroll2 = function(fusion, rect) {
        var 
            yStride = ((that.width - rect.getWidth()) * BYTES_PER_PIXEL) | 0,
            pixIndex = that.offsetOfPixel(rect.left, rect.top) | 0,
            h = (rect.bottom - rect.top) | 0,
            w = (rect.right - rect.left) | 0;
    
        for (var y = 0 ; y < h; y = (y + 1) | 0, pixIndex = (pixIndex + yStride) | 0) {
            for (var x = 0; x < w; x = (x + 1) | 0) {
                var 
                    alpha = that.data[(pixIndex + ALPHA_BYTE_OFFSET) | 0];
                
                if (alpha > 0) {
                    if (alpha == 255) {
                        fusion.data[pixIndex] = that.data[pixIndex];
                        fusion.data[pixIndex + 1] = that.data[pixIndex + 1];
                        fusion.data[pixIndex + 2] = that.data[pixIndex + 2];
                        fusion.data[pixIndex + 3] = that.data[pixIndex + 3];
                    } else {
                        var 
                            invAlpha = (255 - alpha) | 0;
        
                        fusion.data[pixIndex] = (((Math.imul(that.data[pixIndex], alpha) + Math.imul(fusion.data[pixIndex], invAlpha)) | 0) / 255) | 0;
                        fusion.data[pixIndex + 1] = (((Math.imul(that.data[pixIndex + 1], alpha) + Math.imul(fusion.data[pixIndex + 1], invAlpha)) | 0) / 255) | 0;
                        fusion.data[pixIndex + 2] = (((Math.imul(that.data[pixIndex + 2], alpha) + Math.imul(fusion.data[pixIndex + 2], invAlpha)) | 0) / 255) | 0;
                    }
                }
                
                pixIndex = (pixIndex + BYTES_PER_PIXEL) | 0;
            }
        }
    };
    
    this.fusionWithNormalNoAlphaUnroll3 = function(fusion, rect) {
        var 
            yStride = ((that.width - rect.getWidth()) * BYTES_PER_PIXEL) | 0,
            pixIndex = that.offsetOfPixel(rect.left, rect.top) | 0,
            h = (rect.bottom - rect.top) | 0,
            w = (rect.right - rect.left) | 0;
    
        for (var y = 0 ; y < h; y = (y + 1) | 0, pixIndex = (pixIndex + yStride) | 0) {
            for (var x = 0; x < w; x = (x + 1) | 0) {
                var 
                    alpha = that.data[(pixIndex + ALPHA_BYTE_OFFSET) | 0],
                    invAlpha = (255 - alpha) | 0;

                fusion.data[pixIndex] = (((Math.imul(that.data[pixIndex], alpha) + Math.imul(fusion.data[pixIndex], invAlpha)) | 0) / 255) | 0;
                fusion.data[pixIndex + 1] = (((Math.imul(that.data[pixIndex + 1], alpha) + Math.imul(fusion.data[pixIndex + 1], invAlpha)) | 0) / 255) | 0;
                fusion.data[pixIndex + 2] = (((Math.imul(that.data[pixIndex + 2], alpha) + Math.imul(fusion.data[pixIndex + 2], invAlpha)) | 0) / 255) | 0;
                
                pixIndex = (pixIndex + BYTES_PER_PIXEL) | 0;
            }
        }
    };
    
    this.fusionWithNormalNoAlphaUnroll3a = function(fusion, rect) {
        var 
            yStride = ((that.width - rect.getWidth()) * BYTES_PER_PIXEL) | 0,
            pixIndex = that.offsetOfPixel(rect.left, rect.top) | 0,
            h = (rect.bottom - rect.top) | 0,
            w = (rect.right - rect.left) | 0;
    
        for (var y = 0 ; y < h; y = (y + 1) | 0, pixIndex = (pixIndex + yStride) | 0) {
            for (var x = 0; x < w; x = (x + 1) | 0) {
                var 
                    alpha = that.data[(pixIndex + ALPHA_BYTE_OFFSET) | 0],
                    invAlpha = 255 - alpha;

                fusion.data[pixIndex] = (((that.data[pixIndex] * alpha + fusion.data[pixIndex] * invAlpha) | 0) / 255) | 0;
                fusion.data[pixIndex + 1] = (((that.data[pixIndex + 1] * alpha + fusion.data[pixIndex + 1] * invAlpha) | 0) / 255) | 0;
                fusion.data[pixIndex + 2] = (((that.data[pixIndex + 2] * alpha + fusion.data[pixIndex + 2] * invAlpha) | 0) / 255) | 0;
                
                pixIndex = (pixIndex + BYTES_PER_PIXEL) | 0;
            }
        }
    };
    
    this.fusionWithNormalNoAlphaUnroll3b = function(fusion, rect) {
        var 
            yStride = ((that.width - rect.getWidth()) * BYTES_PER_PIXEL) | 0,
            pixIndex = that.offsetOfPixel(rect.left, rect.top) | 0,
            h = (rect.bottom - rect.top) | 0,
            w = (rect.right - rect.left) | 0;
    
        for (var y = 0 ; y < h; y++, pixIndex += yStride) {
            for (var x = 0; x < w; x++) {
                var 
                    alpha = that.data[pixIndex + 3],
                    invAlpha = 255 - alpha;

                fusion.data[pixIndex] = (((that.data[pixIndex] * alpha + fusion.data[pixIndex] * invAlpha) | 0) / 255) | 0;
                fusion.data[pixIndex + 1] = (((that.data[pixIndex + 1] * alpha + fusion.data[pixIndex + 1] * invAlpha) | 0) / 255) | 0;
                fusion.data[pixIndex + 2] = (((that.data[pixIndex + 2] * alpha + fusion.data[pixIndex + 2] * invAlpha) | 0) / 255) | 0;
                
                pixIndex += 4;
            }
        }
    };
    
    this.fusionWithNormalNoAlphaUnroll4 = function(fusion, rect) {
        var 
            yStride = ((that.width - rect.getWidth()) * BYTES_PER_PIXEL) | 0,
            pixIndex = that.offsetOfPixel(rect.left, rect.top) | 0,
            h = (rect.bottom - rect.top) | 0,
            w = ((rect.right - rect.left) / 2) | 0;
    
        for (var y = 0 ; y < h; y++, pixIndex += yStride) {
            for (var x = 0; x < w; x++) {
                var 
                    alpha = that.data[pixIndex + 3],
                    invAlpha = (255 - alpha) | 0;
        
                fusion.data[pixIndex] = (((Math.imul(that.data[pixIndex], alpha) + Math.imul(fusion.data[pixIndex], invAlpha)) | 0) / 255) | 0;
                fusion.data[pixIndex + 1] = (((Math.imul(that.data[pixIndex + 1], alpha) + Math.imul(fusion.data[pixIndex + 1], invAlpha)) | 0) / 255) | 0;
                fusion.data[pixIndex + 2] = (((Math.imul(that.data[pixIndex + 2], alpha) + Math.imul(fusion.data[pixIndex + 2], invAlpha)) | 0) / 255) | 0;
                
                alpha = that.data[pixIndex + 7];
                invAlpha = (255 - alpha) | 0;
                
                fusion.data[pixIndex + 4] = (((Math.imul(that.data[pixIndex + 4], alpha) + Math.imul(fusion.data[pixIndex + 4], invAlpha)) | 0) / 255) | 0;
                fusion.data[pixIndex + 5] = (((Math.imul(that.data[pixIndex + 5], alpha) + Math.imul(fusion.data[pixIndex + 5], invAlpha)) | 0) / 255) | 0;
                fusion.data[pixIndex + 6] = (((Math.imul(that.data[pixIndex + 6], alpha) + Math.imul(fusion.data[pixIndex + 6], invAlpha)) | 0) / 255) | 0;
                
                pixIndex += 8;
            }
        }
    };
    
    this.fusionWithNormalNoAlphaASMJSLike = function(fusion, rect) {
        var
            left = rect.left | 0,
            top = rect.top | 0,
            right = rect.right | 0,
            bottom = rect.bottom | 0,
            
            yStride = 0,
            pixIndex = 0,
            h = 0,
            w = 0,
            x = 0,
            y = 0,
            alpha = 0,
            invAlpha = 0,
            
            h = (bottom - top) | 0,
            w = (right - left) | 0,
            pixIndex = that.offsetOfPixel(left, top) | 0,
            yStride = (((that.width - w) | 0) * 4) | 0;
        
        for (y = 0 ; (y >>> 0) < h >>> 0; y = (y + 1) | 0, pixIndex = (pixIndex + yStride) | 0) {
            for (x = 0; (x >>> 0) < w >>> 0; x = (x + 1) | 0) {
                alpha = that.data[(pixIndex + ALPHA_BYTE_OFFSET) | 0] | 0,
                invAlpha = (255 - alpha) | 0;
    
                fusion.data[pixIndex] = (((Math.imul(that.data[pixIndex], alpha) + Math.imul(fusion.data[pixIndex], invAlpha)) | 0) / 255) | 0;
                fusion.data[(pixIndex + 1) | 0] = (((Math.imul(that.data[(pixIndex + 1) | 0], alpha) + Math.imul(fusion.data[(pixIndex + 1) | 0], invAlpha)) | 0) / 255) | 0;
                fusion.data[(pixIndex + 2) | 0] = (((Math.imul(that.data[(pixIndex + 2) | 0], alpha) + Math.imul(fusion.data[(pixIndex + 2) | 0], invAlpha)) | 0) / 255) | 0;
                
                pixIndex = (pixIndex + BYTES_PER_PIXEL) | 0;
            }
        }
    };
}

CPLayer.prototype.offsetOfPixel = function(x, y) {
    return (y * this.width + x) * 4;
};

function BlendModule(stdlib, foreign, heapArrayBuffer) {
    "use asm";

    // Variable Declarations
    var 
        imul = stdlib.Math.imul,
        
        heap = new stdlib.Uint8Array(heapArrayBuffer),
        
        BYTES_PER_PIXEL = 4,
        ALPHA_BYTE_OFFSET = 3;
    
    function offsetOfPixel(imageWidth, x, y) {
        imageWidth = imageWidth | 0;
        x = x | 0;
        y = y | 0;
        
        return (x + imul(y, imageWidth)) | 0;
    }

    function fusionRectNormalNoAlpha(imageWidth, imageHeight, left, top, right, bottom) {
        imageWidth = imageWidth | 0;
        imageHeight = imageHeight | 0;
        left = left | 0;
        top = top | 0;
        right = right | 0;
        bottom = bottom | 0;
        
        var 
            yStride = 0,
            dstIndex = 0,
            srcIndex = 0,
            h = 0,
            w = 0,
            x = 0,
            y = 0,
            alpha = 0,
            invAlpha = 0;
        
        h = (bottom - top) | 0;
        w = (right - left) | 0;
        dstIndex = offsetOfPixel(imageWidth, left, top) | 0;
        srcIndex = (dstIndex + imul(imageWidth, imageHeight)) | 0;
        yStride = (((imageWidth - ((right - left) | 0)) | 0) * 4) | 0
    
        for (y = 0 ; (y >>> 0) < h >>> 0; y = (y + 1) | 0, srcIndex = (srcIndex + yStride) | 0, dstIndex = (dstIndex + yStride) | 0) {
            for (x = 0; (x >>> 0) < w >>> 0; x = (x + 1) | 0) {
                alpha = heap[(srcIndex + ALPHA_BYTE_OFFSET) | 0] | 0,
                invAlpha = (255 - alpha) | 0;
    
                heap[dstIndex] = (((imul(heap[srcIndex], alpha) + imul(heap[dstIndex], invAlpha)) | 0) / 255) | 0;
                heap[(dstIndex + 1) | 0] = (((imul(heap[(srcIndex + 1) | 0], alpha) + imul(heap[(dstIndex + 1) | 0], invAlpha)) | 0) / 255) | 0;
                heap[(dstIndex + 2) | 0] = (((imul(heap[(srcIndex + 2) | 0], alpha) + imul(heap[(dstIndex + 2) | 0], invAlpha)) | 0) / 255) | 0;
                
                dstIndex = (dstIndex + BYTES_PER_PIXEL) | 0;
                srcIndex = (srcIndex + BYTES_PER_PIXEL) | 0;
            }
        }
    }

    return { fusionRectNormalNoAlpha: fusionRectNormalNoAlpha };
}


var
    fusion = new CPLayer(),
    layer = new CPLayer();
    
var
    pixIndex = 0;

for (var x = 0; x < 1024 * 768; x++) {
    var
        r = Math.random();
    
    if (r < 0.5) {
        // Quarter of the image is transparent
        layer.data[pixIndex++] = 255;
        layer.data[pixIndex++] = 255;
        layer.data[pixIndex++] = 255;
        layer.data[pixIndex++] = 0;
    } else if (r < 0.75) {
        // Quarter is fully opaque
        layer.data[pixIndex++] = ~~(Math.random() * 255);
        layer.data[pixIndex++] = ~~(Math.random() * 255);
        layer.data[pixIndex++] = ~~(Math.random() * 255);
        layer.data[pixIndex++] = 255;
    } else {
        // Rest is semi-transparent
        layer.data[pixIndex++] = ~~(Math.random() * 255);
        layer.data[pixIndex++] = ~~(Math.random() * 255);
        layer.data[pixIndex++] = ~~(Math.random() * 255);
        layer.data[pixIndex++] = ~~(Math.random() * 255);
    }
}

/*
var
    blendBuffer = new ArrayBuffer(0x800000),
    blendHeap = new Uint8Array(blendBuffer),
    blend = new BlendModule(window, null, blendBuffer);

// The fusion occupies the low bytes of the heap
blendHeap.set(fusion.data, 0);
*/

// add tests
suite
    /*.add('CPLayer#fusionWithNormalNoAlpha-old-smallRect', function() {
        layer.fusionWithNormalNoAlphaOld(fusion, new CPRect(200, 200, 210, 210));
    })
    .add('CPLayer#fusionWithNormalNoAlpha-unroll1-smallRect', function() {
        layer.fusionWithNormalNoAlphaUnroll1(fusion, new CPRect(200, 200, 210, 210));
    })
    .add('CPLayer#fusionWithNormalNoAlpha-unroll2-smallRect', function() {
        layer.fusionWithNormalNoAlphaUnroll2(fusion, new CPRect(200, 200, 210, 210));
    })
    .add('CPLayer#fusionWithNormalNoAlpha-unroll3-smallRect', function() {
        layer.fusionWithNormalNoAlphaUnroll3(fusion, new CPRect(200, 200, 210, 210));
    })
    .add('CPLayer#fusionWithNormalNoAlpha-unroll3a-smallRect', function() {
        layer.fusionWithNormalNoAlphaUnroll3a(fusion, new CPRect(200, 200, 210, 210));
    })
    .add('CPLayer#fusionWithNormalNoAlpha-unroll4-smallRect', function() {
        layer.fusionWithNormalNoAlphaUnroll4(fusion, new CPRect(200, 200, 210, 210));
    })*/
    /*.add('CPLayer#fusionWithNormalNoAlpha-asmjs-largeRect', function() {
        blendHeap.set(layer.data, 1024 * 768 * 4);
        
        blend.fusionRectNormalNoAlpha(1024, 768, 0, 0, 1024, 768);
        
        for (var i = 0; i < 1024 * 768 * 4; i++) {
            fusion.data[i] = blendHeap[i];
        }
    })*/
    .add('CPLayer#fusionWithNormalNoAlpha-ASMJSLike-largeRect', function() {
        layer.fusionWithNormalNoAlphaASMJSLike(fusion, new CPRect(0, 0, 1024, 768));
    })
    .add('CPLayer#fusionWithNormalNoAlpha-old-largeRect', function() {
        layer.fusionWithNormalNoAlphaOld(fusion, new CPRect(0, 0, 1024, 768));
    })
    .add('CPLayer#fusionWithNormalNoAlpha-unroll1-largeRect', function() {
        layer.fusionWithNormalNoAlphaUnroll1(fusion, new CPRect(0, 0, 1024, 768));
    })
    .add('CPLayer#fusionWithNormalNoAlpha-unroll2-largeRect', function() {
        layer.fusionWithNormalNoAlphaUnroll2(fusion, new CPRect(0, 0, 1024, 768));
    })
    .add('CPLayer#fusionWithNormalNoAlpha-unroll3-largeRect', function() {
        layer.fusionWithNormalNoAlphaUnroll3(fusion, new CPRect(0, 0, 1024, 768));
    })
    .add('CPLayer#fusionWithNormalNoAlpha-unroll3a-largeRect', function() {
        layer.fusionWithNormalNoAlphaUnroll3a(fusion, new CPRect(0, 0, 1024, 768));
    })
    .add('CPLayer#fusionWithNormalNoAlpha-unroll3b-largeRect', function() {
        layer.fusionWithNormalNoAlphaUnroll3b(fusion, new CPRect(0, 0, 1024, 768));
    })
    .add('CPLayer#fusionWithNormalNoAlpha-unroll4-largeRect', function() {
        layer.fusionWithNormalNoAlphaUnroll4(fusion, new CPRect(0, 0, 1024, 768));
    })
    
    .on('cycle', function(event) {
        document.getElementById("benchResults").innerHTML += String(event.target) + "<br>";
    })
    .on('complete', function() {
        document.getElementById("benchResults").innerHTML += '<p><strong>Fastest is ' + this.filter('fastest').map('name') + '</strong></p>';
    })
    .on('error', function(e) {
        console.log(e);
    })
    
    .run({
        'async' : true
    });