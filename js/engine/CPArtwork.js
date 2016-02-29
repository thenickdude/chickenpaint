function CPArtwork(_width, _height) {
    "use strict";
    
    _width = _width | 0;
    _height = _height | 0;
    
    var
        MAX_UNDO = 30,
        EMPTY_CANVAS_COLOR = 0xFFFFFFFF,
        
        BURN_CONSTANT = 260,
        BLUR_MIN = 64,
        BLUR_MAX = 1;
    
    var
        layers = [],
        curLayer,
        
        hasUnsavedChanges,
        
        curSelection = new CPRect(),
        
        fusion = new CPLayer(_width, _height), 
        undoBuffer = new CPLayer(_width, _height),
        
        /* 
         * We use this buffer so we can accurately accumulate small changes to layer opacity during a brush stroke.
         */
        opacityBuffer = new CPGreyBmp(_width, _height, 32),
        
        fusionArea = new CPRect(0, 0, _width, _height), 
        undoArea = new CPRect(), opacityArea = new CPRect(),
        
        rnd = new CPRandom(),
        
        clipBoard = null,
        undoList = [], redoList = [],
        
        curBrush = null,
        
        brushManager = new CPBrushManager(),
        
        lastX = 0.0, lastY = 0.0, lastPressure = 0.0,
        brushBuffer = null,
        
        sampleAllLayers = false,
        lockAlpha = false,
        
        curColor = 0,
        
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

    function callListenersLayerChange() {
        that.emit("changeLayer");
    }
    
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

    /**
     * Gets the current selection rect
     * 
     * @returns CPRect
     */ 
    this.getSelection = function() {
        return curSelection.clone();
    };

    function setSelection(r) {
        curSelection.set(r);
        curSelection.clip(getBounds());
    }

    function setSelection() {
        curSelection.makeEmpty();
    }
    
    function invalidateFusionRect(rect) {
        fusionArea.union(rect);
        
        callListenersUpdateRegion(rect);
    };

    function invalidateFusion() {
        invalidateFusionRect(new CPRect(0, 0, that.width, that.height));
    };
    
    function CPBrushToolBase() {
    }
    
    CPBrushToolBase.prototype.beginStroke = function(x, y, pressure) {
        undoBuffer.copyFrom(curLayer);
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
        if (!undoArea.isEmpty()) {
            mergeOpacityBuffer(curColor, false);
            addUndo(new CPUndoPaint());
        }
        brushBuffer = null;
    };

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
            
            colorComponents = [
                (color >> 16) & 0xFF, 
                (color >> 8) & 0xFF,
                color & 0xFF,
            ];

        for (var y = dstRect.top; y < dstRect.bottom; y++) {
            var
                dstOffset = curLayer.offsetOfPixel(dstRect.left, y),
                srcOffset = opacityBuffer.offsetOfPixel(dstRect.left, y);
            
            for (var x = dstRect.left; x < dstRect.right; x++) {
                var
                    opacityAlpha = (opacityData[srcOffset++] / 255) | 0;
                
                if (opacityAlpha > 0) {
                    var
                        destAlpha = undoData[dstOffset + CPColorBmp.ALPHA_BYTE_OFFSET],
                    
                        newLayerAlpha = (opacityAlpha + destAlpha * (255 - opacityAlpha) / 255) | 0,
                        realAlpha = (255 * opacityAlpha / newLayerAlpha) | 0,
                        invAlpha = 255 - realAlpha;
                    
                    for (var i = 0; i < 3; i++) {
                        var
                            destChannel = undoData[dstOffset]; 
                        
                        curLayer.data[dstOffset++] = ((colorComponents[i] * realAlpha + destChannel * invAlpha) / 255) & 0xff;
                    }
                    curLayer.data[dstOffset++] = newLayerAlpha;
                } else {
                    dstOffset += CPColorBmp.BYTES_PER_PIXEL;
                }
            }
        }
    };

    CPBrushToolSimpleBrush.prototype.paintOpacity = function(srcRect, dstRect, brush, brushWidth, alpha) {
        var 
            opacityData = opacityBuffer.data,
            
            by = srcRect.top;
        
        for (var y = dstRect.top; y < dstRect.bottom; y++, by++) {
            var 
                srcOffset = srcRect.left + by * brushWidth,
                dstOffset = dstRect.left + y * that.width;
            
            for (var x = dstRect.left; x < dstRect.right; x++, srcOffset++, dstOffset++) {
                var 
                    brushAlpha = brush[srcOffset] * alpha;
                
                if (brushAlpha != 0) {
                    var 
                        opacityAlpha = opacityData[dstOffset];
                    
                    if (brushAlpha > opacityAlpha) {
                        opacityData[dstOffset] = brushAlpha;
                    }
                }

            }
        }
    };

    CPBrushToolSimpleBrush.prototype.paintFlow = function(srcRect, dstRect, brush, brushWidth, alpha) {
        var 
            opacityData = opacityBuffer.data,

            by = srcRect.top;
        
        for (var y = dstRect.top; y < dstRect.bottom; y++, by++) {
            var 
                srcOffset = srcRect.left + by * brushWidth,
                dstOffset = opacityBuffer.offsetOfPixel(dstRect.left, y);
            
            for (var x = dstRect.left; x < dstRect.right; x++, srcOffset++, dstOffset++) {
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

    CPBrushToolSimpleBrush.prototype.paintOpacityFlow = function(srcRect, dstRect, brush, brushWidth, opacity, flow) {
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
    };

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
            
            srcYStride = opacityBuffer.width,
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
            undoData = undoBuffer.data;
    
        for (var y = dstRect.top; y < dstRect.bottom; y++) {
            var
                dstOffset = curLayer.offsetOfPixel(dstRect.left, y),
                srcOffset = opacityBuffer.offsetOfPixel(dstRect.left, y);
            
            for (var x = dstRect.left; x < dstRect.right; x++, srcOffset++, dstOffset += CPColorBmp.BYTES_PER_PIXEL) {
                var
                    color1 = opacityData[srcOffset],
                    alpha1 = (color1 >>> 24);
                
                if (alpha1 <= 0) {
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

                    for (var i = 0; i < 3; i++) {
                        var 
                            channel1 = (opacityData[srcOffset] >> (16 - 8 * i)) & 0xFF,
                            channel2 = undoData[dstOffset + i];
                        
                        curLayer.data[dstOffset + i] = ((channel1 * realAlpha + channel2 * invAlpha) / 255) | 0;
                    }
                    curLayer.data[dstOffset + i] = newAlpha;
                }
            }
        }
    };
    
    function CPBrushToolWatercolor() {
        var 
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

            samples.push(createCPColorFloatFromInt(layerToSample.getPixel(x, y)));

            for (var r = 0.25; r < 1.001; r += .25) {
                samples.push(createCPColorFloatFromInt(layerToSample.getPixel(~~(x + r * dx), y)));
                samples.push(createCPColorFloatFromInt(layerToSample.getPixel(~~(x - r * dx), y)));
                samples.push(createCPColorFloatFromInt(layerToSample.getPixel(x, ~~(y + r * dy))));
                samples.push(createCPColorFloatFromInt(layerToSample.getPixel(x, ~~(y - r * dy))));

                samples.push(createCPColorFloatFromInt(layerToSample.getPixel(~~(x + r * 0.7 * dx), ~~(y + r * 0.7 * dy))));
                samples.push(createCPColorFloatFromInt(layerToSample.getPixel(~~(x + r * 0.7 * dx), ~~(y - r * 0.7 * dy))));
                samples.push(createCPColorFloatFromInt(layerToSample.getPixel(~~(x - r * 0.7 * dx), ~~(y + r * 0.7 * dy))));
                samples.push(createCPColorFloatFromInt(layerToSample.getPixel(~~(x - r * 0.7 * dx), ~~(y - r * 0.7 * dy))));
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
                        alpha2 = (color2 >>> 24),

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
            wcColor.mixWith(createCPColorFloatFromInt(curColor), curBrush.resat * curBrush.resat);

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
                fusionLayers();
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
                fusionLayers();
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
                undoData = undoBuffer.data,

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
                fusionLayers();
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

    function getDefaultLayerName() {
        return "Layer 1"; //TODO
    }
    
    function restoreAlpha(rect) {
        this.getActiveLayer().copyAlphaFrom(undoBuffer, rect);
    }
    
    /**
     * Merge the opacity buffer from the current drawing operation to the 
     */
    function mergeOpacityBuffer(color, clear) {
        if (!opacityArea.isEmpty()) {
            if (curBrush.paintMode != CPBrushInfo.M_ERASE || !lockAlpha) {
                paintingModes[curBrush.paintMode].mergeOpacityBuf(opacityArea, color);
            } else {
                // FIXME: it would be nice to be able to set the paper color
                paintingModes[CPBrushInfo.M_PAINT].mergeOpacityBuf(opacityArea, 0x00ffffff);
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
    
    this.addEmptyLayer = function() {
        var
            layer = new CPLayer(that.width, that.height, getDefaultLayerName());
        
        layer.clearAll(EMPTY_CANVAS_COLOR);
        
        this.addLayer(layer);
    };

    /**
     * Merge together the visible layers and return the resulting ImageData for display to the screen.
     * 
     * The image is cached, so repeat calls are cheap.
     */
    this.fusionLayers = function() {
        // Is there anything to update from last call?
        if (!fusionArea.isEmpty()) {
            mergeOpacityBuffer(curColor, false);
            
            fusion.clearRect(fusionArea, 0x00FFFFFF);
            
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
        }
        
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
    
    this.getLayer = function(i) {
        return layers[i];
    };
    
    this.getActiveLayer = function() {
        return curLayer;
    };
    
    //
    // Undo / Redo
    //

    function canUndo() {
        return undoList.length > 0;
    }

    function canRedo() {
        return redoList.length > 0;
    }
    
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

    function addUndo(undo) {
        hasUnsavedChanges = true;
        
        if (undoList.length == 0 || !undoList[undoList.length - 1].merge(undo)) {
            if (undoList.length >= MAX_UNDO) {
                undoList.unshift();
            }
            undoList.push(undo);
        } else {
            // Two merged changes can mean no change at all
            // don't leave a useless undo in the list
            if (undoList[undoList.length - 1].noChange()) {
                undoList.pop();
            }
        }
        if (redoList.length > 0) {
            redoList = [];
        }
    }

    this.clearHistory = function() {
        undoList = [];
        redoList = [];
    };
    
    this.colorPicker = function(x, y) {
        // not really necessary and could potentially the repaint
        // of the canvas to miss that area
        // fusionLayers();

        return fusion.getPixel(~~x, ~~y) & 0xFFFFFF;
    }

    // Gets the current selection rect
    this.getSelection = function() {
        return curSelection.clone();
    };

    this.setSelection = function(rect) {
        curSelection.set(rect);
        curSelection.clip(this.getBounds());
    };

    this.emptySelection = function() {
        curSelection.makeEmpty();
    }
    
    this.addLayer = function(layer) {
        layers.push(layer);
        
        if (layers.length == 1) {
            curLayer = layers[0];
        }
    };
    
    this.floodFill = function(x, y) {
        undoBuffer.copyFrom(curLayer);
        undoArea = this.getBounds();

        curLayer.floodFill(~~x, ~~y, curColor | 0xff000000);

        addUndo(new CPUndoPaint());
        invalidateFusion();
    };

    this.fill = function(color) {
        var
            r = this.getSelectionAutoSelect();

        undoBuffer.copyFrom(curLayer);
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

        undoBuffer.copyFrom(curLayer);
        undoArea = r;

        curLayer.copyRegionHFlip(r, undoBuffer);

        addUndo(new CPUndoPaint());
        invalidateFusion();
    };

    this.vFlip = function() {
        var
            r = this.getSelectionAutoSelect();

        undoBuffer.copyFrom(curLayer);
        undoArea = r;

        curLayer.copyRegionVFlip(r, undoBuffer);

        addUndo(new CPUndoPaint());
        invalidateFusion();
    };

    this.monochromaticNoise = function() {
        var
            r = this.getSelectionAutoSelect();

        undoBuffer.copyFrom(curLayer);
        undoArea = r;

        curLayer.fillWithNoise(r);

        addUndo(new CPUndoPaint());
        invalidateFusion();
    };

    this.colorNoise = function() {
        var
            r = this.getSelectionAutoSelect();

        undoBuffer.copyFrom(curLayer);
        undoArea = r;

        curLayer.fillWithColorNoise(r);

        addUndo(new CPUndoPaint());
        invalidateFusion();
    };
    
    this.invert = function() {
        var
            r = this.getSelectionAutoSelect();

        undoBuffer.copyFrom(curLayer);
        undoArea = r;

        curLayer.invert(r);

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
    
    // temp awful hack
    var
        moveInitSelect = null, // CPRect
        movePrevX, movePrevY, movePrevX2, movePrevY2,
        moveModeCopy, prevModeCopy;
    
    this.beginPreviewMode = function(copy) {
        // !!!! awful awful hack !!! will break as soon as CPMultiUndo is used for other things
        // FIXME: ASAP!
        if (!copy && undoList.length > 0 && redoList.length == 0 && undoList[undoList.length - 1] instanceof CPMultiUndo
                && undoList[undoList.length - 1].undoes[0] instanceof CPUndoPaint
                && undoList[undoList.length - 1].undoes[0].layer == this.getActiveLayerIndex()) {
            this.undo();
            copy = prevModeCopy;
        } else {
            movePrevX = 0;
            movePrevY = 0;

            undoBuffer.copyFrom(curLayer);
            undoArea.makeEmpty();

            opacityBuffer.clearAll();
            opacityArea.makeEmpty();
        }

        moveInitSelect = null;
        moveModeCopy = copy;
    }

    this.endPreviewMode = function() {
        var 
            undo = new CPUndoPaint(),
            undoArray;
        
        if (moveInitSelect != null) {
            undoArray = [undo, new CPUndoRectangleSelection(moveInitSelect, this.getSelection())];
            
            undo = new CPMultiUndo(undoArray);
        } else {
            // !!!!!!
            // FIXME: this is required just to make the awful move hack work
            undoArray = [undo];
            undo = new CPMultiUndo(undoArray);
        }
        
        addUndo(undo);

        moveInitSelect = null;
        movePrevX = movePrevX2;
        movePrevY = movePrevY2;
        prevModeCopy = moveModeCopy;
    };

    this.move = function(offsetX, offsetY) {
        var
            srcRect;

        offsetX += movePrevX;
        offsetY += movePrevY;

        if (moveInitSelect == null) {
            srcRect = this.getSelectionAutoSelect();
            if (!this.getSelection().isEmpty()) {
                moveInitSelect = this.getSelection();
            }
        } else {
            srcRect = moveInitSelect.clone();
        }
        curLayer.copyFrom(undoBuffer);

        if (!moveModeCopy) {
            curLayer.clearRect(srcRect, 0);
        }

        curLayer.pasteAlphaRect(undoBuffer, srcRect, srcRect.left + offsetX, srcRect.top + offsetY);

        undoArea = new CPRect();
        if (!moveModeCopy) {
            undoArea.union(srcRect);
        }
        srcRect.translate(offsetX, offsetY);
        undoArea.union(srcRect);

        invalidateFusion();

        if (moveInitSelect != null) {
            var
                sel = moveInitSelect.clone();
            sel.translate(offsetX, offsetY);
            this.setSelection(sel);
        }

        // this is a really bad idea :D
        movePrevX2 = offsetX;
        movePrevY2 = offsetY;
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
    
    // ////////////////////////////////////////////////////
    // Undo classes

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

        that.getMemoryUsed = function(undone, param) {
            return undoBuffer.getMemorySize();
        };
    }
    
    CPUndoPaint.prototype = Object.create(CPUndo.prototype);
    CPUndoPaint.prototype.constructor = CPUndoPaint;
    
    /**
     * @param from CPRect
     * @param to CPRect
     */
    function CPUndoRectangleSelection(from, to) {
        from = from.clone();
        to = to.clone();

        this.undo = function() {
            that.setSelection(from);
        };

        this.redo = function() {
            that.setSelection(to);
        };

        this.noChange = function() {
            return from.equals(to);
        };
    }
    
    CPUndoRectangleSelection.prototype = Object.create(CPUndo.prototype);
    CPUndoRectangleSelection.prototype.constructor = CPUndoRectangleSelection;
    
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
};

CPArtwork.prototype = Object.create(EventEmitter.prototype);
CPArtwork.prototype.constructor = CPArtwork;

CPArtwork.prototype.getBounds = function() {
    return new CPRect(0, 0, this.width, this.height);
}

CPArtwork.prototype.isPointWithin = function(x, y) {
    return x >= 0 && y >= 0 && x < this.width && y < this.height;
};
