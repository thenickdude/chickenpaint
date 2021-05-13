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

import CPBitmap from "./CPBitmap.js";
import CPRect from "../util/CPRect.js";
import {createCanvas} from "../util/Canvas.js";
import {createImageData} from "../util/Canvas.js";

/**
 * A 32bpp bitmap class (one byte per channel in RGBA order)
 *
 * @param {(ImageData|int)} width - The width of the bitmap, or the ImageData object to use by reference
 * @param {?int} height - The height of the bitmap
 *
 * @constructor
 *
 * @property {int} width
 * @property {int} height
 * @property {CanvasPixelArray} data - The bitmap data array (one byte per channel in RGBA order). We'd prefer this to
 *                                     be Uint8ClampedArray, but IE 10 doesn't support it
 * @property {ImageData} imageData
 */
export default function CPColorBmp(width, height) {
    if (typeof width == "number") {
        CPBitmap.call(this, width, height);

        this.imageData = createImageData(this.width, this.height);
    } else {
        var
            imageData = width;

        CPBitmap.call(this, imageData.width, imageData.height);

        this.imageData = imageData;
    }

    this.data = this.imageData.data;
}

CPColorBmp.prototype = Object.create(CPBitmap.prototype);
CPColorBmp.prototype.constructor = CPColorBmp;

CPColorBmp.BYTES_PER_PIXEL = 4;
CPColorBmp.RED_BYTE_OFFSET = 0;
CPColorBmp.GREEN_BYTE_OFFSET = 1;
CPColorBmp.BLUE_BYTE_OFFSET = 2;
CPColorBmp.ALPHA_BYTE_OFFSET = 3;

/**
 * Create an independent copy of this bitmap.
 *
 * @returns {CPColorBmp}
 */
CPColorBmp.prototype.clone = function() {
    return this.cloneRect(this.getBounds());
};

/**
 * Creates a CPColorBmp from a portion of this bitmap
 *
 * @param {CPRect} rect
 * @returns {CPColorBmp}
 */
CPColorBmp.prototype.cloneRect = function(rect) {
    var
        result = new CPColorBmp(rect.getWidth(), rect.getHeight());
    
    result.copyBitmapRect(this, 0, 0, rect);
    
    return result;
};

/**
 * Pixel access with friendly clipping.
 *
 * @returns {int} 32-bit integer in ARGB format
 */
CPColorBmp.prototype.getPixel = function(x, y) {
    x = Math.max(0, Math.min(this.width - 1, x));
    y = Math.max(0, Math.min(this.height - 1, y));

    var
        pixIndex = this.offsetOfPixel(x, y);
    
    return (this.data[pixIndex + CPColorBmp.ALPHA_BYTE_OFFSET] << 24) 
        | (this.data[pixIndex + CPColorBmp.RED_BYTE_OFFSET]    << 16) 
        | (this.data[pixIndex + CPColorBmp.GREEN_BYTE_OFFSET]  << 8) 
        | this.data[pixIndex + CPColorBmp.BLUE_BYTE_OFFSET];
};

/**
 * Get an r,g,b,a array of the xor of this bitmap and the given one, within the given rectangle
 *
 * @param {CPColorBmp} bmp
 * @param {CPRect} rect
 *
 * @returns {Uint8Array}
 */
CPColorBmp.prototype.copyRectXOR = function(bmp, rect) {
    rect = this.getBounds().clipTo(rect);
    
    var 
        w = rect.getWidth(),
        h = rect.getHeight(),
        
        buffer = new Uint8Array(w * h * CPColorBmp.BYTES_PER_PIXEL),
        
        outputIndex = 0,
        bmp1Index = this.offsetOfPixel(rect.left, rect.top), 
        bmp2Index = bmp.offsetOfPixel(rect.left, rect.top),
        
        bmp1YSkip = (this.width - w) * CPColorBmp.BYTES_PER_PIXEL,
        bmp2YSkip = (bmp.width - w) * CPColorBmp.BYTES_PER_PIXEL,
        
        widthBytes = w * CPColorBmp.BYTES_PER_PIXEL;
    
    for (var y = rect.top; y < rect.bottom; y++, bmp1Index += bmp1YSkip, bmp2Index += bmp2YSkip) {
        for (var x = 0; x < widthBytes; x++, outputIndex++, bmp1Index++, bmp2Index++) {
            buffer[outputIndex] = this.data[bmp1Index] ^ bmp.data[bmp2Index];
        }
    }

    return buffer;
};

CPColorBmp.prototype.setRectXOR = function(buffer, rect) {
    rect = this.getBounds().clipTo(rect);
    
    var 
        w = rect.getWidth(),
        h = rect.getHeight(),
        
        bmp1Index = this.offsetOfPixel(rect.left, rect.top),
        bufferIndex = 0,
        
        bmp1YSkip = (this.width - w) * CPColorBmp.BYTES_PER_PIXEL,
        
        widthBytes = w * CPColorBmp.BYTES_PER_PIXEL;
    
    for (var y = 0; y < h; y++) {
        for (var x = 0; x < widthBytes; x++) {
            this.data[bmp1Index++] ^= buffer[bufferIndex++];
        }
        bmp1Index += bmp1YSkip;
    }
};

/** 
 * Copy the rectangle at srcRect from bmp onto this image at (dstX, dstY).
 *
 * @param {CPColorBmp} bmp
 * @param {int} dstX
 * @param {int} dstY
 * @param {CPRect} srcRect
 */ 
CPColorBmp.prototype.copyBitmapRect = function(bmp, dstX, dstY, srcRect) {
    var
        dstRect = new CPRect(dstX, dstY, 0, 0);

    srcRect = srcRect.clone();

    this.getBounds().clipSourceDest(srcRect, dstRect);

    var 
        w = dstRect.getWidth() | 0,
        h = dstRect.getHeight() | 0;

    // Are we just trying to duplicate the bitmap?
    if (dstRect.left == 0 && dstRect.top == 0 && w == this.width && h == this.height && w == bmp.width && h == bmp.height) {
        this.copyPixelsFrom(bmp);
    } else {
        var
            dstIndex = this.offsetOfPixel(dstRect.left, dstRect.top),
            dstYSkip = (this.width - w) * CPColorBmp.BYTES_PER_PIXEL,

            srcIndex = bmp.offsetOfPixel(srcRect.left, srcRect.top),
            srcYSkip = (bmp.width - w) * CPColorBmp.BYTES_PER_PIXEL;

        for (var y = 0; y < h; y++, srcIndex += srcYSkip, dstIndex += dstYSkip) {
            for (var x = 0; x < w; x++, srcIndex += CPColorBmp.BYTES_PER_PIXEL, dstIndex += CPColorBmp.BYTES_PER_PIXEL) {
                this.data[dstIndex] = bmp.data[srcIndex];
                this.data[dstIndex + 1] = bmp.data[srcIndex + 1];
                this.data[dstIndex + 2] = bmp.data[srcIndex + 2];
                this.data[dstIndex + 3] = bmp.data[srcIndex + 3];
            }
        }
    }
};

//
// Copies the Alpha channel from another bitmap. Assumes both bitmaps are the same width.
//
CPColorBmp.prototype.copyAlphaFrom = function(bmp, rect) {
    rect = this.getBounds().clipTo(rect);

    var 
        w = rect.getWidth() | 0,
        h = rect.getHeight() | 0,
        
        pixIndex = (this.offsetOfPixel(rect.left, rect.top) + CPColorBmp.ALPHA_BYTE_OFFSET) | 0 /* Apply offset here so we don't have to do it per-pixel*/,
        ySkip = ((this.width - w) * CPColorBmp.BYTES_PER_PIXEL) | 0;
    
    for (var y = 0; y < h; y++, pixIndex += ySkip) {
        for (var x = 0; x < w; x++, pixIndex += CPColorBmp.BYTES_PER_PIXEL) {
            this.data[pixIndex] = bmp.data[pixIndex];
        }
    }
};

/**
 * Resize this bitmap to be the same size as that one
 *
 * @param {CPBitmap} bmp
 */
CPColorBmp.prototype.setToSize = function(bmp) {
    if (bmp.width != this.width || bmp.height != this.height) {
        this.width = bmp.width;
        this.height = bmp.height;

        this.imageData = createImageData(this.width, this.height);
        this.data = this.imageData.data;
    }
};

/**
 *
 * @param {CPColorBmp} bmp
 */
CPColorBmp.prototype.copyPixelsFrom = function(bmp) {
    this.setToSize(bmp);

    if ("set" in this.data) {
        this.data.set(bmp.data);
    } else {
        // IE doesn't use Uint8ClampedArray for ImageData, so set() isn't available
        for (var i = 0; i < this.data.length; i++) {
            this.data[i] = bmp.data[i];
        }
    }
};

CPColorBmp.prototype.copyPixelsFromGreyscale = function(bmp) {
    var
        srcIndex,
        dstIndex = 0,
        pixels = bmp.width * bmp.height;

    this.setToSize(bmp);

    for (srcIndex = 0; srcIndex < pixels; srcIndex++, dstIndex += CPColorBmp.BYTES_PER_PIXEL) {
        this.data[dstIndex + CPColorBmp.RED_BYTE_OFFSET] = bmp.data[srcIndex];
        this.data[dstIndex + CPColorBmp.GREEN_BYTE_OFFSET] = bmp.data[srcIndex];
        this.data[dstIndex + CPColorBmp.BLUE_BYTE_OFFSET] = bmp.data[srcIndex];
        this.data[dstIndex + CPColorBmp.ALPHA_BYTE_OFFSET] = 0xFF;
    }
};

/**
 * Use nearest-neighbor (subsampling) to scale that bitmap to replace the pixels of this one.
 *
 * @param {CPColorBmp} that
 */
CPColorBmp.prototype.copyScaledNearestNeighbor = function(that) {
    var
        destPixIndex = 0,

        xSkip = that.width / this.width,
        ySkip = that.height / this.height,
        srcRowStart;

    for (var y = 0, srcRow = 0; y < this.height; y++, srcRow += ySkip) {
        srcRowStart = that.offsetOfPixel(0, Math.round(srcRow));

        for (var x = 0, srcCol = 0; x < this.width; x++, destPixIndex += CPColorBmp.BYTES_PER_PIXEL, srcCol += xSkip) {
            var
                srcPixIndex = srcRowStart + Math.round(srcCol) * CPColorBmp.BYTES_PER_PIXEL;

            this.data[destPixIndex] = that.data[srcPixIndex];
            this.data[destPixIndex + 1] = that.data[srcPixIndex + 1];
            this.data[destPixIndex + 2] = that.data[srcPixIndex + 2];
            this.data[destPixIndex + CPColorBmp.ALPHA_BYTE_OFFSET] = that.data[srcPixIndex + CPColorBmp.ALPHA_BYTE_OFFSET];
        }
    }
};

/**
 * Replace the pixels in this image with a scaled down thumbnail of that image.
 *
 * The thumbnail will attempt to exaggerate the contribution of thin opaque strokes on a transparent background, in order
 * to make lineart layers more visible.
 *
 * @param {CPColorBmp} that
 */
CPColorBmp.prototype.createThumbnailFrom = function(that) {
    const
        MAX_SAMPLES_PER_OUTPUT_PIXEL = 3,

        numSamples = Math.min(Math.floor(that.width / this.width), MAX_SAMPLES_PER_OUTPUT_PIXEL);

    if (numSamples < 2) {
        // If we only take one sample per output pixel, there's no need for our filtering strategy
        this.copyScaledNearestNeighbor(that);
        return;
    }

    const
        // Uint16 means we can have up to 16 (since 16*16 ~= 65535/255) times scale reduction without overflow
        rowBuffer = new Uint16Array(this.width * 5 /* 4 bytes of RGBA plus one to record the max alpha of the samples */),
        srcRowByteLength = that.width * CPColorBmp.BYTES_PER_PIXEL,

        sourceBytesBetweenOutputCols = Math.floor(that.width / this.width) * CPColorBmp.BYTES_PER_PIXEL,
        intersampleXByteSpacing = Math.floor(that.width / this.width / numSamples) * CPColorBmp.BYTES_PER_PIXEL,

    /* Due to the floor() in intersampleXByteSkip, it's likely that the gap between the last sample for an output pixel
     * and the start of the sample for the next pixel will be higher than the intersample gap. So we'll add this between
     * pixels if needed.
     */
        interpixelXByteSkip = sourceBytesBetweenOutputCols - intersampleXByteSpacing * numSamples,

    // Now we do the same for rows...
        sourceRowsBetweenOutputRows = Math.floor(that.height / this.height),
        intersampleYRowsSpacing = Math.floor(that.height / this.height / numSamples),

        intersampleYByteSkip = intersampleYRowsSpacing * srcRowByteLength - sourceBytesBetweenOutputCols * this.width,
        interpixelYByteSkip = (sourceRowsBetweenOutputRows - intersampleYRowsSpacing * numSamples) * srcRowByteLength;

    let
        srcPixIndex = 0, dstPixIndex = 0;

    // For each output thumbnail row...
    for (let y = 0; y < this.height; y++, srcPixIndex += interpixelYByteSkip) {
        let
            bufferIndex = 0;

        rowBuffer.fill(0);

        // Sum the contributions of the input rows that correspond to this output row
        for (let y2 = 0; y2 < numSamples; y2++, srcPixIndex += intersampleYByteSkip) {
            bufferIndex = 0;
            for (let x = 0; x < this.width; x++, bufferIndex += 5, srcPixIndex += interpixelXByteSkip) {
                for (let x2 = 0; x2 < numSamples; x2++, srcPixIndex += intersampleXByteSpacing) {
                    let
                        sourceAlpha = that.data[srcPixIndex + CPColorBmp.ALPHA_BYTE_OFFSET],
                        sourceAlphaScale = sourceAlpha / 255;

                    // Accumulate the pre-multiplied pixels in the sample area
                    rowBuffer[bufferIndex]     += that.data[srcPixIndex] * sourceAlphaScale;
                    rowBuffer[bufferIndex + 1] += that.data[srcPixIndex + 1] * sourceAlphaScale;
                    rowBuffer[bufferIndex + 2] += that.data[srcPixIndex + 2] * sourceAlphaScale;
                    rowBuffer[bufferIndex + CPColorBmp.ALPHA_BYTE_OFFSET] += sourceAlpha;

                    // And keep track of the highest alpha we see
                    rowBuffer[bufferIndex + 4] = Math.max(rowBuffer[bufferIndex + 4], sourceAlpha);
                }
            }
        }

        // Now this thumbnail row is complete and we can write the buffer to the output
        bufferIndex = 0;
        for (let x = 0; x < this.width; x++, bufferIndex += 5, dstPixIndex += CPColorBmp.BYTES_PER_PIXEL) {
            let
                maxAlphaForSample = rowBuffer[bufferIndex + 4];

            if (maxAlphaForSample == 0) {
                this.data[dstPixIndex + CPColorBmp.ALPHA_BYTE_OFFSET] = 0;
            } else {
                // Undo the premultiplication of the pixel data, scaling it to the max() alpha we want
                let
                    sampleAlphaScale = maxAlphaForSample / rowBuffer[bufferIndex + CPColorBmp.ALPHA_BYTE_OFFSET];

                this.data[dstPixIndex]     = rowBuffer[bufferIndex]     * sampleAlphaScale;
                this.data[dstPixIndex + 1] = rowBuffer[bufferIndex + 1] * sampleAlphaScale;
                this.data[dstPixIndex + 2] = rowBuffer[bufferIndex + 2] * sampleAlphaScale;

                this.data[dstPixIndex + CPColorBmp.ALPHA_BYTE_OFFSET] = maxAlphaForSample;
            }
        }
    }
};

/**
 * Flood fill the given color starting from the given point
 * @param x int
 * @param y int
 * @param color int
 */
CPColorBmp.prototype.floodFill = function(x, y, color) {
    if (!this.isInside(x, y)) {
        return;
    }

    let
        oldColor = this.getPixel(x, y),
        
        oldAlpha = (oldColor >> 24) & 0xFF,
        oldRed = (oldColor >> 16) & 0xFF,
        oldGreen = (oldColor >> 8) & 0xFF,
        oldBlue = oldColor & 0xFF,
        
        colorAlpha = (color >> 24) & 0xFF,
        colorRed = (color >> 16) & 0xFF,
        colorGreen = (color >> 8) & 0xFF,
        colorBlue = color & 0xFF,
        
        stack = [],
        clip = this.getBounds(),
        
        data = this.data;
    
    // Change the left and right bounds from pixel indexes into byte indexes for easy clipping
    clip.left *= CPColorBmp.BYTES_PER_PIXEL;
    clip.right *= CPColorBmp.BYTES_PER_PIXEL;
    
    stack.push({x1: x * CPColorBmp.BYTES_PER_PIXEL, x2: x * CPColorBmp.BYTES_PER_PIXEL, y: y, dy: -1});
    stack.push({x1: x * CPColorBmp.BYTES_PER_PIXEL, x2: x * CPColorBmp.BYTES_PER_PIXEL, y: y + 1, dy: 1});
    
    /* 
     * If we are filling 100% transparent areas then we need to ignore the residual color information
     * (it would also be possible to clear it when erasing, but then the performance impact would be on the eraser 
     * rather than on this low importance flood fill)
     */
    if (oldAlpha == 0) {
        if (colorAlpha == 0) {
            return;
        }
        
        while (stack.length > 0) {
            let
                line = stack.pop();
    
            if (line.y < clip.top || line.y >= clip.bottom) {
                continue;
            }
    
            let
                lineOffset = this.offsetOfPixel(0, line.y),
    
                left = line.x1, next;
            
            while (
                left >= clip.left 
                && data[left + lineOffset + CPColorBmp.ALPHA_BYTE_OFFSET] == 0
            ) {
                data[left + lineOffset + CPColorBmp.RED_BYTE_OFFSET] = colorRed;
                data[left + lineOffset + CPColorBmp.GREEN_BYTE_OFFSET] = colorGreen;
                data[left + lineOffset + CPColorBmp.BLUE_BYTE_OFFSET] = colorBlue;
                data[left + lineOffset + CPColorBmp.ALPHA_BYTE_OFFSET] = colorAlpha;
                
                left -= CPColorBmp.BYTES_PER_PIXEL;
            }
            
            if (left >= line.x1) {
                while (
                    left <= line.x2 
                    && data[left + lineOffset + CPColorBmp.ALPHA_BYTE_OFFSET] != oldAlpha
                ) {
                    left += CPColorBmp.BYTES_PER_PIXEL;
                }
                next = left + CPColorBmp.BYTES_PER_PIXEL;
                if (left > line.x2) {
                    continue;
                }
            } else {
                left += CPColorBmp.BYTES_PER_PIXEL;
                if (left < line.x1) {
                    stack.push({x1: left, x2: line.x1 - CPColorBmp.BYTES_PER_PIXEL, y: line.y - line.dy, dy: -line.dy});
                }
                next = line.x1 + CPColorBmp.BYTES_PER_PIXEL;
            }
    
            do {
                data[left + lineOffset + CPColorBmp.RED_BYTE_OFFSET] = colorRed;
                data[left + lineOffset + CPColorBmp.GREEN_BYTE_OFFSET] = colorGreen;
                data[left + lineOffset + CPColorBmp.BLUE_BYTE_OFFSET] = colorBlue;
                data[left + lineOffset + CPColorBmp.ALPHA_BYTE_OFFSET] = colorAlpha;
                
                while (
                    next < clip.right 
                    && data[next + lineOffset + CPColorBmp.ALPHA_BYTE_OFFSET] == oldAlpha
                ) {
                    data[next + lineOffset + CPColorBmp.RED_BYTE_OFFSET] = colorRed;
                    data[next + lineOffset + CPColorBmp.GREEN_BYTE_OFFSET] = colorGreen;
                    data[next + lineOffset + CPColorBmp.BLUE_BYTE_OFFSET] = colorBlue;
                    data[next + lineOffset + CPColorBmp.ALPHA_BYTE_OFFSET] = colorAlpha;
                    
                    next += CPColorBmp.BYTES_PER_PIXEL;
                }
                stack.push({x1: left, x2: next - CPColorBmp.BYTES_PER_PIXEL, y: line.y + line.dy, dy: line.dy});
    
                if (next - CPColorBmp.BYTES_PER_PIXEL > line.x2) {
                    stack.push({x1: line.x2 + CPColorBmp.BYTES_PER_PIXEL, x2: next - CPColorBmp.BYTES_PER_PIXEL, y: line.y - line.dy, dy: -line.dy});
                }
    
                left = next + CPColorBmp.BYTES_PER_PIXEL;
                while (
                    left <= line.x2 && data[left + lineOffset + CPColorBmp.ALPHA_BYTE_OFFSET] != oldAlpha
                ) {
                    left += CPColorBmp.BYTES_PER_PIXEL;
                }
    
                next = left + CPColorBmp.BYTES_PER_PIXEL;
            } while (left <= line.x2);
        }
    } else {
        if (color == oldColor) {
            return;
        }

        while (stack.length > 0) {
            let
                line = stack.pop();

            if (line.y < clip.top || line.y >= clip.bottom) {
                continue;
            }

            let
                lineOffset = this.offsetOfPixel(0, line.y),

                left = line.x1, next;
            
            while (
                left >= clip.left 
                && data[left + lineOffset + CPColorBmp.RED_BYTE_OFFSET] == oldRed
                && data[left + lineOffset + CPColorBmp.GREEN_BYTE_OFFSET] == oldGreen
                && data[left + lineOffset + CPColorBmp.BLUE_BYTE_OFFSET] == oldBlue
                && data[left + lineOffset + CPColorBmp.ALPHA_BYTE_OFFSET] == oldAlpha
            ) {
                data[left + lineOffset + CPColorBmp.RED_BYTE_OFFSET] = colorRed;
                data[left + lineOffset + CPColorBmp.GREEN_BYTE_OFFSET] = colorGreen;
                data[left + lineOffset + CPColorBmp.BLUE_BYTE_OFFSET] = colorBlue;
                data[left + lineOffset + CPColorBmp.ALPHA_BYTE_OFFSET] = colorAlpha;
                
                left -= CPColorBmp.BYTES_PER_PIXEL;
            }
            
            if (left >= line.x1) {
                while (
                    left <= line.x2 
                    && !(
                        data[left + lineOffset + CPColorBmp.RED_BYTE_OFFSET] == oldRed
                        && data[left + lineOffset + CPColorBmp.GREEN_BYTE_OFFSET] == oldGreen
                        && data[left + lineOffset + CPColorBmp.BLUE_BYTE_OFFSET] == oldBlue
                        && data[left + lineOffset + CPColorBmp.ALPHA_BYTE_OFFSET] == oldAlpha
                    )
                ) {
                    left += CPColorBmp.BYTES_PER_PIXEL;
                }
                next = left + CPColorBmp.BYTES_PER_PIXEL;
                if (left > line.x2) {
                    continue;
                }
            } else {
                left += CPColorBmp.BYTES_PER_PIXEL;
                if (left < line.x1) {
                    stack.push({x1: left, x2: line.x1 - CPColorBmp.BYTES_PER_PIXEL, y: line.y - line.dy, dy: -line.dy});
                }
                next = line.x1 + CPColorBmp.BYTES_PER_PIXEL;
            }

            do {
                data[left + lineOffset + CPColorBmp.RED_BYTE_OFFSET] = colorRed;
                data[left + lineOffset + CPColorBmp.GREEN_BYTE_OFFSET] = colorGreen;
                data[left + lineOffset + CPColorBmp.BLUE_BYTE_OFFSET] = colorBlue;
                data[left + lineOffset + CPColorBmp.ALPHA_BYTE_OFFSET] = colorAlpha;
                
                while (
                    next < clip.right 
                    && data[next + lineOffset + CPColorBmp.RED_BYTE_OFFSET] == oldRed
                    && data[next + lineOffset + CPColorBmp.GREEN_BYTE_OFFSET] == oldGreen
                    && data[next + lineOffset + CPColorBmp.BLUE_BYTE_OFFSET] == oldBlue
                    && data[next + lineOffset + CPColorBmp.ALPHA_BYTE_OFFSET] == oldAlpha
                ) {
                    data[next + lineOffset + CPColorBmp.RED_BYTE_OFFSET] = colorRed;
                    data[next + lineOffset + CPColorBmp.GREEN_BYTE_OFFSET] = colorGreen;
                    data[next + lineOffset + CPColorBmp.BLUE_BYTE_OFFSET] = colorBlue;
                    data[next + lineOffset + CPColorBmp.ALPHA_BYTE_OFFSET] = colorAlpha;
                    
                    next += CPColorBmp.BYTES_PER_PIXEL;
                }
                stack.push({x1: left, x2: next - CPColorBmp.BYTES_PER_PIXEL, y: line.y + line.dy, dy: line.dy});

                if (next - CPColorBmp.BYTES_PER_PIXEL > line.x2) {
                    stack.push({x1: line.x2 + CPColorBmp.BYTES_PER_PIXEL, x2: next - CPColorBmp.BYTES_PER_PIXEL, y: line.y - line.dy, dy: -line.dy});
                }

                left = next + CPColorBmp.BYTES_PER_PIXEL;
                while (
                    left <= line.x2 && !(
                        data[left + lineOffset + CPColorBmp.RED_BYTE_OFFSET] == oldRed
                        && data[left + lineOffset + CPColorBmp.GREEN_BYTE_OFFSET] == oldGreen
                        && data[left + lineOffset + CPColorBmp.BLUE_BYTE_OFFSET] == oldBlue
                        && data[left + lineOffset + CPColorBmp.ALPHA_BYTE_OFFSET] == oldAlpha
                    )
                ) {
                    left += CPColorBmp.BYTES_PER_PIXEL;
                }

                next = left + CPColorBmp.BYTES_PER_PIXEL;
            } while (left <= line.x2);
        }
    }
};

/**
 * Premultiply the RGB channels in the given R,G,B,A channel buffer with the alpha channel.
 * 
 * @param {Uint8Array} buffer - buffer R,G,B,A channel array
 * @param {int} len - Number of pixels in buffer to modify
 */
function multiplyAlpha(buffer, len) {
    var
        pixIndex = 0;
    
    for (var i = 0; i < len; i++) {
        var
            alpha = buffer[pixIndex + CPColorBmp.ALPHA_BYTE_OFFSET];
        
        // Multiply the RGB channels by alpha
        for (var j = 0; j < 3; j++, pixIndex++) {
            buffer[pixIndex] = Math.round(buffer[pixIndex] * alpha / 255);
        }
        pixIndex++; // Don't modify alpha channel
    }
}

/**
 * Inverse of multiplyAlpha()
 */
function separateAlpha(buffer, len) {
    var
        pixIndex = 0;
    
    for (var i = 0; i < len; i++) {
        var
            alpha = buffer[pixIndex + CPColorBmp.ALPHA_BYTE_OFFSET];
        
        if (alpha != 0) {
            var
                invAlpha = 255 / alpha;
            
            for (var j = 0; j < 3; j++, pixIndex++) {
                buffer[pixIndex] = Math.min(Math.round(buffer[pixIndex] * invAlpha), 255);
            }
            // Don't modify alpha channel
            pixIndex++;
        } else {
            pixIndex += CPColorBmp.BYTES_PER_PIXEL;
        }
    }
}

/**
 * Blur the first `len` pixels in the src array by `radius` pixels, and store the result in the `dst` array.
 *
 * @param {Uint8Array} src
 * @param {Uint8Array} dst
 * @param {int} len
 * @param {int} radius - Number of pixels that will be averaged either side of a target pixel.
 */
function boxBlurLine(src, dst, len, radius) {
    var
        pixelCount = 0, channelSums = [0, 0, 0, 0],
        pixIndex, dstIndex;

    pixIndex = 0;
    for (let i = 0; i < radius && i < len; i++) {
        for (let j = 0; j < CPColorBmp.BYTES_PER_PIXEL; j++) {
            channelSums[j] += src[pixIndex++];
        }
        pixelCount++;
    }
    
    dstIndex = 0;
    for (let i = 0; i < len; i++) {
        // New pixel joins the window at the right
        if (i + radius < len) {
            pixIndex = (i + radius) * CPColorBmp.BYTES_PER_PIXEL;
            
            for (let j = 0; j < CPColorBmp.BYTES_PER_PIXEL; j++) {
                channelSums[j] += src[pixIndex++];
            }
            pixelCount++;
        }

        for (let j = 0; j < CPColorBmp.BYTES_PER_PIXEL; j++) {
            dst[dstIndex++] = Math.round(channelSums[j] / pixelCount);
        }

        // Old pixel leaves the window at the left
        if (i - radius >= 0) {
            pixIndex = (i - radius) * CPColorBmp.BYTES_PER_PIXEL;
            
            for (let j = 0; j < CPColorBmp.BYTES_PER_PIXEL; j++) {
                channelSums[j] -= src[pixIndex++];
            }
            pixelCount--;
        }
    }
}

/**
 * Copy a column of pixels in the bitmap to the given R,G,B,A buffer.
 * 
 * @param {int} x X-coordinate of column
 * @param {int} y Y-coordinate of top of column to copy
 * @param {int} len Number of pixels to copy
 * @param {Uint8Array} buffer R,G,B,A array
 */
CPColorBmp.prototype.copyPixelColumnToArray = function(x, y, len, buffer) {
    var
        yJump = (this.width - 1) * CPColorBmp.BYTES_PER_PIXEL,
        dstOffset = 0,
        srcOffset = this.offsetOfPixel(x, y);
    
    for (var i = 0; i < len; i++) {
        for (var j = 0; j < CPColorBmp.BYTES_PER_PIXEL; j++) {
            buffer[dstOffset++] = this.data[srcOffset++];
        }
        
        srcOffset += yJump;
    }
};

/**
 * Copy the pixels from the given R,G,B,A buffer to a column of pixels in the bitmap.
 * 
 * @param {int} x X-coordinate of column
 * @param {int} y Y-coordinate of top of column to copy
 * @param {int} len Number of pixels to copy
 * @param {Uint8Array} buffer R,G,B,A array to copy from
 */
CPColorBmp.prototype.copyArrayToPixelColumn = function(x, y, len, buffer) {
    var
        yJump = (this.width - 1) * CPColorBmp.BYTES_PER_PIXEL,
        srcOffset = 0,
        dstOffset = this.offsetOfPixel(x, y);
    
    for (var i = 0; i < len; i++) {
        for (var j = 0; j < CPColorBmp.BYTES_PER_PIXEL; j++) {
            this.data[dstOffset++] = buffer[srcOffset++];
        }
        
        dstOffset += yJump;
    }
};

CPColorBmp.prototype.boxBlur = function(rect, radiusX, radiusY) {
    rect = this.getBounds().clipTo(rect);

    let
        rectWidth = rect.getWidth(),
        rectWidthBytes = rectWidth * CPColorBmp.BYTES_PER_PIXEL,
        rectHeight = rect.getHeight(),
        rectLength = Math.max(rectWidth, rectHeight),

        src = new Uint8Array(rectLength * CPColorBmp.BYTES_PER_PIXEL),
        dst = new Uint8Array(rectLength * CPColorBmp.BYTES_PER_PIXEL);

    for (let y = rect.top; y < rect.bottom; y++) {
        var
            pixOffset = this.offsetOfPixel(rect.left, y);
        
        for (let x = 0; x < rectWidthBytes; x++) {
            src[x] = this.data[pixOffset++];
        }
        
        multiplyAlpha(src, rectWidth);
        boxBlurLine(src, dst, rectWidth, radiusX);
        
        pixOffset = this.offsetOfPixel(rect.left, y);
        
        for (let x = 0; x < rectWidthBytes; x++) {
            this.data[pixOffset++] = dst[x];
        }
    }
    
    for (let x = rect.left; x < rect.right; x++) {
        this.copyPixelColumnToArray(x, rect.top, rectHeight, src);
        
        boxBlurLine(src, dst, rectHeight, radiusY);
        separateAlpha(dst, rectHeight);
        
        this.copyArrayToPixelColumn(x, rect.top, rectHeight, dst);
    }
};

CPColorBmp.prototype.offsetOfPixel = function(x, y) {
    return ((y * this.width + x) * 4) | 0;
};

CPColorBmp.prototype.getMemorySize = function() {
    return this.data.length;
};

CPColorBmp.prototype.getImageData = function() {
    return this.imageData;
};

/**
 * Replace the image data with the provided ImageData object (i.e. use it by reference).
 *
 * @param imageData {ImageData}
 */
CPColorBmp.prototype.setImageData = function(imageData) {
    this.width = imageData.width;
    this.height = imageData.height;
    this.imageData = imageData;
    this.data = imageData.data;
};

CPColorBmp.prototype.clearAll = function(color) {
    if (color == 0 && "fill" in this.data) {
        this.data.fill(0);
    } else {
        var
            a = (color >> 24) & 0xFF,
            r = (color >> 16) & 0xFF,
            g = (color >> 8) & 0xFF,
            b = color & 0xFF;

        for (var i = 0; i < this.width * this.height * CPColorBmp.BYTES_PER_PIXEL;) {
            this.data[i++] = r;
            this.data[i++] = g;
            this.data[i++] = b;
            this.data[i++] = a;
        }
    }
};

/**
 *
 * @param {CPRect} rect
 * @param {int} color
 */
CPColorBmp.prototype.clearRect = function(rect, color) {
    rect = this.getBounds().clipTo(rect);

    var
        a = (color >> 24) & 0xFF,
        r = (color >> 16) & 0xFF,
        g = (color >> 8) & 0xFF,
        b = color & 0xFF,

        yStride = (this.width - rect.getWidth()) * CPColorBmp.BYTES_PER_PIXEL,

        pixIndex = this.offsetOfPixel(rect.left, rect.top);

    for (var y = rect.top; y < rect.bottom; y++, pixIndex += yStride) {
        for (var x = rect.left; x < rect.right; x++) {
            this.data[pixIndex++] = r;
            this.data[pixIndex++] = g;
            this.data[pixIndex++] = b;
            this.data[pixIndex++] = a;
        }
    }
};

/**
 * @param rect CPRect
 * @param source CPColorBmp
 */
CPColorBmp.prototype.copyRegionHFlip = function(rect, source) {
    rect = this.getBounds().clipTo(rect);

    for (var y = rect.top; y < rect.bottom; y++) {
        var
            dstOffset = this.offsetOfPixel(rect.left, y),
            srcOffset = source.offsetOfPixel(rect.right - 1, y);

        for (var x = rect.left; x < rect.right; x++, srcOffset -= CPColorBmp.BYTES_PER_PIXEL * 2) {
            for (var i = 0; i < CPColorBmp.BYTES_PER_PIXEL; i++) {
                this.data[dstOffset++] = source.data[srcOffset++];
            }
        }
    }
};

/**
 * @param rect CPRect
 * @param source CPColorBmp
 */
CPColorBmp.prototype.copyRegionVFlip = function(rect, source) {
    rect = this.getBounds().clipTo(rect);

    var
        widthBytes = rect.getWidth() * CPColorBmp.BYTES_PER_PIXEL;

    for (var y = rect.top; y < rect.bottom; y++) {
        var
            dstOffset = this.offsetOfPixel(rect.left, y),
            srcOffset = source.offsetOfPixel(rect.left, rect.bottom - 1 - (y - rect.top));

        for (var x = 0; x < widthBytes; x++) {
            this.data[dstOffset++] = source.data[srcOffset++];
        }
    }
};

/**
 * @param {CPRect} rect
 */
CPColorBmp.prototype.fillWithNoise = function(rect) {
    rect = this.getBounds().clipTo(rect);

    var
        value,
        yStride = (this.width - rect.getWidth()) * CPColorBmp.BYTES_PER_PIXEL,

        pixIndex = this.offsetOfPixel(rect.left, rect.top);

    for (var y = rect.top; y < rect.bottom; y++, pixIndex += yStride) {
        for (var x = rect.left; x < rect.right; x++, pixIndex += CPColorBmp.BYTES_PER_PIXEL) {
            value = (Math.random() * 0x100) | 0;

            this.data[pixIndex + CPColorBmp.RED_BYTE_OFFSET] = value;
            this.data[pixIndex + CPColorBmp.GREEN_BYTE_OFFSET] = value;
            this.data[pixIndex + CPColorBmp.BLUE_BYTE_OFFSET] = value;
            this.data[pixIndex + CPColorBmp.ALPHA_BYTE_OFFSET] = 0xFF;
        }
    }
};

/**
 * Replace the pixels in the given rect with the given horizontal gradient.
 *
 * @param rect CPRect
 * @param fromX int
 * @param toX int
 * @param gradientPoints int[]
 */
CPColorBmp.prototype.gradientHorzReplace = function(rect, fromX, toX, gradientPoints) {
    var
        fromColor = {
            r: (gradientPoints[0] >> 16) & 0xFF,
            g: (gradientPoints[0] >> 8) & 0xFF,
            b: gradientPoints[0] & 0xFF,
            a: (gradientPoints[0] >> 24) & 0xFF
        },
        toColor = {
            r: (gradientPoints[1] >> 16) & 0xFF,
            g: (gradientPoints[1] >> 8) & 0xFF,
            b: gradientPoints[1] & 0xFF,
            a: (gradientPoints[1] >> 24) & 0xFF
        },

        yStride = (this.width - rect.getWidth()) * CPColorBmp.BYTES_PER_PIXEL,
        pixIndex = this.offsetOfPixel(rect.left, rect.top) | 0,
        h = (rect.bottom - rect.top) | 0;

    if (toX < fromX) {
        var
            temp = toX;
        toX = fromX;
        fromX = temp;

        temp = fromColor;
        fromColor = toColor;
        toColor = temp;
    }

    var
        gradientRange = (toX - fromX) | 0,
        rStep = (toColor.r - fromColor.r) / gradientRange,
        gStep = (toColor.g - fromColor.g) / gradientRange,
        bStep = (toColor.b - fromColor.b) / gradientRange,
        aStep = (toColor.a - fromColor.a) / gradientRange,

        jump = Math.max(rect.left - fromX, 0);

    for (var y = 0; y < h; y++, pixIndex += yStride) {
        // The solid color section before the gradient
        var
            x = rect.left;

        for (var xEnd = Math.min(fromX, rect.right) | 0; x < xEnd; x++, pixIndex += CPColorBmp.BYTES_PER_PIXEL) {
            this.data[pixIndex + CPColorBmp.RED_BYTE_OFFSET] = fromColor.r;
            this.data[pixIndex + CPColorBmp.GREEN_BYTE_OFFSET] = fromColor.g;
            this.data[pixIndex + CPColorBmp.BLUE_BYTE_OFFSET] = fromColor.b;
            this.data[pixIndex + CPColorBmp.ALPHA_BYTE_OFFSET] = fromColor.a;
        }

        // In the gradient
        var
            r = fromColor.r + rStep * jump,
            g = fromColor.g + gStep * jump,
            b = fromColor.b + bStep * jump,
            a = fromColor.a + aStep * jump;

        for (xEnd = Math.min(toX, rect.right) | 0; x < xEnd; x++, pixIndex += CPColorBmp.BYTES_PER_PIXEL) {
            this.data[pixIndex + CPColorBmp.RED_BYTE_OFFSET] = r;
            this.data[pixIndex + CPColorBmp.GREEN_BYTE_OFFSET] = g;
            this.data[pixIndex + CPColorBmp.BLUE_BYTE_OFFSET] = b;
            this.data[pixIndex + CPColorBmp.ALPHA_BYTE_OFFSET] = a;

            r += rStep;
            g += gStep;
            b += bStep;
            a += aStep;
        }

        // The section after the end of the gradient
        for (; x < rect.right; x++, pixIndex += CPColorBmp.BYTES_PER_PIXEL) {
            this.data[pixIndex + CPColorBmp.RED_BYTE_OFFSET] = toColor.r;
            this.data[pixIndex + CPColorBmp.GREEN_BYTE_OFFSET] = toColor.g;
            this.data[pixIndex + CPColorBmp.BLUE_BYTE_OFFSET] = toColor.b;
            this.data[pixIndex + CPColorBmp.ALPHA_BYTE_OFFSET] = toColor.a;
        }
    }
};

/**
 * Replace the pixels in the given rect with the given vertical gradient.
 *
 * @param {CPRect} rect
 * @param fromY int
 * @param toY int
 * @param gradientPoints int[]
 */
CPColorBmp.prototype.gradientVertReplace = function(rect, fromY, toY, gradientPoints) {
    let
        fromColor = {
            r: (gradientPoints[0] >> 16) & 0xFF,
            g: (gradientPoints[0] >> 8) & 0xFF,
            b: gradientPoints[0] & 0xFF,
            a: (gradientPoints[0] >> 24) & 0xFF
        },
        toColor = {
            r: (gradientPoints[1] >> 16) & 0xFF,
            g: (gradientPoints[1] >> 8) & 0xFF,
            b: gradientPoints[1] & 0xFF,
            a: (gradientPoints[1] >> 24) & 0xFF
        },

        yStride = (this.width - rect.getWidth()) * CPColorBmp.BYTES_PER_PIXEL,
        pixIndex = this.offsetOfPixel(rect.left, rect.top) | 0,
        w = (rect.right - rect.left) | 0;

    if (toY < fromY) {
        let
            temp = toY;
        toY = fromY;
        fromY = temp;

        temp = fromColor;
        fromColor = toColor;
        toColor = temp;
    }

    let
        y = rect.top;

    // The solid color section before the start of the gradient
    for (let yEnd = Math.min(rect.bottom, fromY) | 0; y < yEnd; y++, pixIndex += yStride) {
        for (let x = 0; x < w; x++, pixIndex += CPColorBmp.BYTES_PER_PIXEL) {
            this.data[pixIndex + CPColorBmp.RED_BYTE_OFFSET] = fromColor.r;
            this.data[pixIndex + CPColorBmp.GREEN_BYTE_OFFSET] = fromColor.g;
            this.data[pixIndex + CPColorBmp.BLUE_BYTE_OFFSET] = fromColor.b;
            this.data[pixIndex + CPColorBmp.ALPHA_BYTE_OFFSET] = fromColor.a;
        }
    }

    // Inside the gradient
    var
        gradientRange = (toY - fromY) | 0,
        rStep = (toColor.r - fromColor.r) / gradientRange,
        gStep = (toColor.g - fromColor.g) / gradientRange,
        bStep = (toColor.b - fromColor.b) / gradientRange,
        aStep = (toColor.a - fromColor.a) / gradientRange,

        jump = Math.max(y - fromY, 0),
        r = fromColor.r + rStep * jump,
        g = fromColor.g + gStep * jump,
        b = fromColor.b + bStep * jump,
        a = fromColor.a + aStep * jump;

    for (let yEnd = Math.min(rect.bottom, toY) | 0; y < yEnd; y++, pixIndex += yStride) {
        for (let x = 0; x < w; x++, pixIndex += CPColorBmp.BYTES_PER_PIXEL) {
            this.data[pixIndex + CPColorBmp.RED_BYTE_OFFSET] = r;
            this.data[pixIndex + CPColorBmp.GREEN_BYTE_OFFSET] = g;
            this.data[pixIndex + CPColorBmp.BLUE_BYTE_OFFSET] = b;
            this.data[pixIndex + CPColorBmp.ALPHA_BYTE_OFFSET] = a;
        }

        r += rStep;
        g += gStep;
        b += bStep;
        a += aStep;
    }

    // The section after the end of the gradient
    for (; y < rect.bottom; y++, pixIndex += yStride) {
        for (let x = 0; x < w; x++, pixIndex += CPColorBmp.BYTES_PER_PIXEL) {
            this.data[pixIndex + CPColorBmp.RED_BYTE_OFFSET] = toColor.r;
            this.data[pixIndex + CPColorBmp.GREEN_BYTE_OFFSET] = toColor.g;
            this.data[pixIndex + CPColorBmp.BLUE_BYTE_OFFSET] = toColor.b;
            this.data[pixIndex + CPColorBmp.ALPHA_BYTE_OFFSET] = toColor.a;
        }
    }
};

/**
 * Replace the pixels in the given rect with the given gradient.
 *
 * @param rect CPRect
 * @param fromX int
 * @param fromY int
 * @param toX int
 * @param toY int
 * @param gradientPoints int[]
 */
CPColorBmp.prototype.gradientReplace = function(rect, fromX, fromY, toX, toY, gradientPoints) {
    var
        yStride = (this.width - rect.getWidth()) * CPColorBmp.BYTES_PER_PIXEL,
        pixIndex = this.offsetOfPixel(rect.left, rect.top) | 0,
        w = (rect.right - rect.left) | 0,

        fromColor = {
            r: (gradientPoints[0] >> 16) & 0xFF,
            g: (gradientPoints[0] >> 8) & 0xFF,
            b: gradientPoints[0] & 0xFF,
            a: (gradientPoints[0] >> 24) & 0xFF
        },
        toColor = {
            r: (gradientPoints[1] >> 16) & 0xFF,
            g: (gradientPoints[1] >> 8) & 0xFF,
            b: gradientPoints[1] & 0xFF,
            a: (gradientPoints[1] >> 24) & 0xFF
        },

    // How many pixels vertically does the gradient sequence complete over (+infinity for horizontal gradients!)
        vertRange = (toY - fromY) + ((toX - fromX) * (toX - fromX)) / (toY - fromY),
    // Same for horizontal
        horzRange = (toX - fromX) + ((toY - fromY) * (toY - fromY)) / (toX - fromX),
        horzStep = 1 / horzRange;

    for (var y = rect.top; y < rect.bottom; y++, pixIndex += yStride) {
        var
        // The position the row starts at in the gradient [0.0 ... 1.0)
            prop = (rect.left - fromX) / horzRange + (y - fromY) / vertRange;

        for (var x = 0; x < w; x++, pixIndex += CPColorBmp.BYTES_PER_PIXEL) {
            var
                propClamped = Math.min(Math.max(prop, 0.0), 1.0),
                invPropClamped = 1 - propClamped;

            this.data[pixIndex + CPColorBmp.RED_BYTE_OFFSET] = fromColor.r * invPropClamped + toColor.r * propClamped;
            this.data[pixIndex + CPColorBmp.GREEN_BYTE_OFFSET] = fromColor.g * invPropClamped + toColor.g * propClamped;
            this.data[pixIndex + CPColorBmp.BLUE_BYTE_OFFSET] = fromColor.b * invPropClamped + toColor.b * propClamped;
            this.data[pixIndex + CPColorBmp.ALPHA_BYTE_OFFSET] = fromColor.a * invPropClamped + toColor.a * propClamped;

            prop += horzStep;
        }
    }
};

/**
 * Alpha blend the given gradient onto the pixels in the given rect.
 *
 * @param rect CPRect
 * @param fromX int
 * @param fromY int
 * @param toX int
 * @param toY int
 * @param gradientPoints int[]
 */
CPColorBmp.prototype.gradientAlpha = function(rect, fromX, fromY, toX, toY, gradientPoints) {
    var
        yStride = (this.width - rect.getWidth()) * CPColorBmp.BYTES_PER_PIXEL,
        pixIndex = this.offsetOfPixel(rect.left, rect.top) | 0,
        w = (rect.right - rect.left) | 0,

        fromColor = {
            r: (gradientPoints[0] >> 16) & 0xFF,
            g: (gradientPoints[0] >> 8) & 0xFF,
            b: gradientPoints[0] & 0xFF,
            a: (gradientPoints[0] >> 24) & 0xFF
        },
        toColor = {
            r: (gradientPoints[1] >> 16) & 0xFF,
            g: (gradientPoints[1] >> 8) & 0xFF,
            b: gradientPoints[1] & 0xFF,
            a: (gradientPoints[1] >> 24) & 0xFF
        },

    // How many pixels vertically does the gradient sequence complete over (+infinity for horizontal gradients!)
        vertRange = (toY - fromY) + ((toX - fromX) * (toX - fromX)) / (toY - fromY),
    // Same for horizontal
        horzRange = (toX - fromX) + ((toY - fromY) * (toY - fromY)) / (toX - fromX),
        horzStep = 1 / horzRange;

    for (var y = rect.top; y < rect.bottom; y++, pixIndex += yStride) {
        var
        // The position the row starts at in the gradient [0.0 ... 1.0)
            prop = (rect.left - fromX) / horzRange + (y - fromY) / vertRange;

        for (var x = 0; x < w; x++, pixIndex += CPColorBmp.BYTES_PER_PIXEL) {
            var
                propClamped = Math.min(Math.max(prop, 0.0), 1.0),
                invPropClamped = 1 - propClamped,

            // The gradient color to draw
                r = fromColor.r * invPropClamped + toColor.r * propClamped,
                g = fromColor.g * invPropClamped + toColor.g * propClamped,
                b = fromColor.b * invPropClamped + toColor.b * propClamped,
                a = fromColor.a * invPropClamped + toColor.a * propClamped,

                alpha2 = this.data[pixIndex + CPColorBmp.ALPHA_BYTE_OFFSET],
                newAlpha = (a + alpha2 - a * alpha2 / 255) | 0;

            if (newAlpha > 0) {
                var
                    realAlpha = (a * 255 / newAlpha) | 0,
                    invAlpha = 255 - realAlpha;

                this.data[pixIndex + CPColorBmp.RED_BYTE_OFFSET] =   ((r * realAlpha + this.data[pixIndex + CPColorBmp.RED_BYTE_OFFSET] * invAlpha) / 255) | 0;
                this.data[pixIndex + CPColorBmp.GREEN_BYTE_OFFSET] = ((g * realAlpha + this.data[pixIndex + CPColorBmp.GREEN_BYTE_OFFSET] * invAlpha) / 255) | 0;
                this.data[pixIndex + CPColorBmp.BLUE_BYTE_OFFSET] =  ((b * realAlpha + this.data[pixIndex + CPColorBmp.BLUE_BYTE_OFFSET] * invAlpha) / 255) | 0;
                this.data[pixIndex + CPColorBmp.ALPHA_BYTE_OFFSET] = newAlpha;
            }

            prop += horzStep;
        }
    }
};

/**
 * Draw a gradient which begins at fromX, fromY and ends at toX, toY, clipped to the given rect, on top of the
 * pixels in the bitmap.
 *
 * @param {CPRect} rect
 * @param {Object[]} gradientPoints Array with gradient colors (ARGB integers)
 * @param {int} fromX
 * @param {int} fromY
 * @param {int} toX
 * @param {int} toY
 * @param {boolean} replace - True if the contents of the destination should be ignored (opaque blend)
 */
CPColorBmp.prototype.gradient = function(rect, fromX, fromY, toX, toY, gradientPoints, replace) {
    rect = this.getBounds().clipTo(rect);

    // Degenerate case
    if (fromX == toX && fromY == toY) {
        return;
    }

    // Opaque blend if possible
    if (replace || gradientPoints[0] >>> 24 == 255 && gradientPoints[1] >>> 24 == 255) {
        if (fromX == toX) {
            this.gradientVertReplace(rect, fromY, toY, gradientPoints);
        } else if (fromY == toY) {
            this.gradientHorzReplace(rect, fromX, toX, gradientPoints);
        } else {
            this.gradientReplace(rect, fromX, fromY, toX, toY, gradientPoints);
        }
    } else {
        this.gradientAlpha(rect, fromX, fromY, toX, toY, gradientPoints);
    }
};

/**
 * @param {CPRect} rect
 */
CPColorBmp.prototype.fillWithColorNoise = function(rect) {
    rect = this.getBounds().clipTo(rect);

    var
        value,
        yStride = (this.width - rect.getWidth()) * CPColorBmp.BYTES_PER_PIXEL,

        pixIndex = this.offsetOfPixel(rect.left, rect.top);

    for (var y = rect.top; y < rect.bottom; y++, pixIndex += yStride) {
        for (var x = rect.left; x < rect.right; x++, pixIndex += CPColorBmp.BYTES_PER_PIXEL) {
            value = (Math.random() * 0x1000000) | 0;

            this.data[pixIndex + CPColorBmp.RED_BYTE_OFFSET] = (value >> 16) & 0xFF;
            this.data[pixIndex + CPColorBmp.GREEN_BYTE_OFFSET] = (value >> 8) & 0xFF;
            this.data[pixIndex + CPColorBmp.BLUE_BYTE_OFFSET] = value & 0xFF;
            this.data[pixIndex + CPColorBmp.ALPHA_BYTE_OFFSET] = 0xFF;
        }
    }
};

/**
 * @param {CPRect} rect
 */
CPColorBmp.prototype.invert = function(rect) {
    rect = this.getBounds().clipTo(rect);

    var
        yStride = (this.width - rect.getWidth()) * CPColorBmp.BYTES_PER_PIXEL,

        pixIndex = this.offsetOfPixel(rect.left, rect.top);

    for (var y = rect.top; y < rect.bottom; y++, pixIndex += yStride) {
        for (var x = rect.left; x < rect.right; x++, pixIndex += CPColorBmp.BYTES_PER_PIXEL) {
            this.data[pixIndex + CPColorBmp.RED_BYTE_OFFSET] ^= 0xFF;
            this.data[pixIndex + CPColorBmp.GREEN_BYTE_OFFSET] ^= 0xFF;
            this.data[pixIndex + CPColorBmp.BLUE_BYTE_OFFSET] ^= 0xFF;
        }
    }
};

/**
 * Get a rectangle that encloses any non-transparent pixels in the bitmap within the given initialBounds (or an empty
 * rect if the pixels inside the given bounds are 100% transparent).
 *
 * @param {CPRect} initialBounds - The rect to search within (pass getBounds() to search the whole bitmap)
 *
 * @returns {CPRect}
 */
CPColorBmp.prototype.getNonTransparentBounds = function(initialBounds) {
    var
        pixIndex,
        result = initialBounds.clone(),
        x, y,
        alphaOred,
        yStride;

    // Find the first non-transparent row
    yStride = (this.width - result.getWidth()) * CPColorBmp.BYTES_PER_PIXEL;
    pixIndex = this.offsetOfPixel(result.left, result.top) + CPColorBmp.ALPHA_BYTE_OFFSET;

    for (y = result.top; y < result.bottom; y++, pixIndex += yStride) {
        alphaOred = 0x00;

        for (x = result.left; x < result.right; x++, pixIndex += CPColorBmp.BYTES_PER_PIXEL) {
            alphaOred |= this.data[pixIndex];
        }

        // Only check once per row in order to reduce branching in the inner loop
        if (alphaOred != 0x00) {
            break;
        }
    }

    result.top = y;

    if (result.top == result.bottom) {
        // Rect is empty, no opaque pixels in the initialBounds
        return result;
    }

    // Now the last non-transparent row
    pixIndex = this.offsetOfPixel(result.right - 1, result.bottom - 1) + CPColorBmp.ALPHA_BYTE_OFFSET;
    for (y = result.bottom - 1; y >= result.top; y--, pixIndex -= yStride) {
        alphaOred = 0x00;

        for (x = result.right - 1; x >= result.left; x--, pixIndex -= CPColorBmp.BYTES_PER_PIXEL) {
            alphaOred |= this.data[pixIndex];
        }

        // Only check once per row in order to reduce branching in the inner loop
        if (alphaOred != 0x00) {
            break;
        }
    }

    result.bottom = y + 1; /* +1 since the bottom/right edges of the rect are exclusive */

    // Now columns from the left
    yStride = CPColorBmp.BYTES_PER_PIXEL * this.width;
    for (x = result.left; x < result.right; x++) {
        pixIndex = this.offsetOfPixel(x, result.top) + CPColorBmp.ALPHA_BYTE_OFFSET;
        alphaOred = 0x00;

        for (y = result.top; y < result.bottom; y++, pixIndex += yStride) {
            alphaOred |= this.data[pixIndex];
        }

        if (alphaOred != 0x00) {
            break;
        }
    }

    result.left = x;

    // And columns from the right
    for (x = result.right - 1; x >= result.left; x--) {
        pixIndex = this.offsetOfPixel(x, result.top) + CPColorBmp.ALPHA_BYTE_OFFSET;
        alphaOred = 0x00;

        for (y = result.top; y < result.bottom; y++, pixIndex += yStride) {
            alphaOred |= this.data[pixIndex];
        }

        if (alphaOred != 0x00) {
            break;
        }
    }

    result.right = x + 1;

    return result;
};

/**
 * Returns a new canvas with a rotated version of the given canvas.
 *
 * @param {HTMLCanvasElement} canvas
 * @param {int} rotation - [0..3], selects a multiple of 90 degrees of clockwise rotation to be applied.
 */
export function getRotatedCanvas(canvas, rotation) {
    rotation = rotation % 4;

    if (rotation == 0) {
        return canvas;
    }

    let
        rotatedCanvas = createCanvas(0, 0),
        rotatedCanvasContext = rotatedCanvas.getContext("2d");

    if (rotation % 2 == 0) {
        rotatedCanvas.width = canvas.width;
        rotatedCanvas.height = canvas.height;
    } else {
        //noinspection JSSuspiciousNameCombination
        rotatedCanvas.width = canvas.height;
        //noinspection JSSuspiciousNameCombination
        rotatedCanvas.height = canvas.width;
    }

    switch (rotation) {
        case 1:
            // 90 degree clockwise:
            rotatedCanvasContext.rotate(Math.PI / 2);
            rotatedCanvasContext.drawImage(canvas, 0, -canvas.height);
            break;
        case 2:
            rotatedCanvasContext.rotate(Math.PI);
            rotatedCanvasContext.drawImage(canvas, -canvas.width, -canvas.height);
            break;
        case 3:
            // 90 degree counter-clockwise:
            rotatedCanvasContext.rotate(-Math.PI / 2);
            rotatedCanvasContext.drawImage(canvas, -canvas.width, 0);
            break;
        case 0:
        default:
            return canvas;
    }

    return rotatedCanvas;
}

function decodeBase64PNGDataURL(url) {
    if (typeof url !== "string" || !url.match(/^data:image\/png;base64,/i)) {
        return false;
    }

    return window.atob(url.substring("data:image\/png;base64,".length));
}

/**
 * Get the image as Canvas.
 *
 * Rotation is [0..3] and selects a multiple of 90 degrees of clockwise rotation to be applied, or 0 to leave
 * unrotated.
 *
 * @returns {HTMLCanvasElement}
 */
CPColorBmp.prototype.getAsCanvas = function(rotation) {
    var
        canvas = createCanvas(this.imageData.width, this.imageData.height),
        canvasContext = canvas.getContext("2d");

    canvasContext.putImageData(this.imageData, 0, 0);

    // Rotate it if needed
    return getRotatedCanvas(canvas, rotation || 0);
};

/**
 * Get the image as a PNG image.
 *
 * Rotation is [0..3] and selects a multiple of 90 degrees of clockwise rotation to be applied, or 0 to leave
 * unrotated.
 *
 * @returns {string} - "Binary string" representation of the PNG file
 */
CPColorBmp.prototype.getAsPNG = function(rotation) {
    let
        canvas = this.getAsCanvas(rotation);

    return decodeBase64PNGDataURL(canvas.toDataURL('image/png'));
};


/**
 * Get the image as a PNG image.
 *
 * Rotation is [0..3] and selects a multiple of 90 degrees of clockwise rotation to be applied, or 0 to leave
 * unrotated.
 *
 * @returns {Buffer}
 */
CPColorBmp.prototype.getAsPNGBuffer = function(rotation) {
    let
        canvas = this.getAsCanvas(rotation);

    // API provided by node-canvas for running on Node (browsers don't support this)
    return canvas.toBuffer('image/png');
};

/**
 * Returns true if any of the pixels in the given rectangle are not opaque.
 *
 * @param {CPRect} rect
 * @returns {boolean}
 */
CPColorBmp.prototype.hasAlphaInRect = function(rect) {
    rect = this.getBounds().clipTo(rect);

    var
        yStride = (this.width - rect.getWidth()) * CPColorBmp.BYTES_PER_PIXEL,
        pixIndex = this.offsetOfPixel(rect.left, rect.top) + CPColorBmp.ALPHA_BYTE_OFFSET;

    for (var y = rect.top; y < rect.bottom; y++, pixIndex += yStride) {
        var
            alphaAnded = 0xFF;

        for (var x = rect.left; x < rect.right; x++, pixIndex += CPColorBmp.BYTES_PER_PIXEL) {
            alphaAnded &= this.data[pixIndex];
        }

        // Only check once per row in order to reduce branching in the inner loop
        if (alphaAnded != 0xFF) {
            return true;
        }
    }

    return false;
};

/**
 * Returns true if there are any transparent pixels in this image.
 * 
 * @returns {boolean}
 */
CPColorBmp.prototype.hasAlpha = function() {
    return this.hasAlphaInRect(this.getBounds());
};

/**
 * Create from a loaded HTML Image object
 *
 * @param {HTMLImageElement} image
 */
CPColorBmp.createFromImage = function(image) {
    var
        imageCanvas = createCanvas(image.width, image.height),
        imageContext = imageCanvas.getContext("2d");

    imageContext.globalCompositeOperation = "copy";
    imageContext.drawImage(image, 0, 0);

    return new CPColorBmp(imageContext.getImageData(0, 0, image.width, image.height));
};

/**
 * Are all the pixels in this image identical to those of that?
 *
 * @param {CPColorBmp} that
 */
CPColorBmp.prototype.equals = function(that) {
    if (this.width != that.width || this.height != that.height) {
        return false;
    }
	
	for (let pixIndex = 0; pixIndex < this.data.length; pixIndex += CPColorBmp.BYTES_PER_PIXEL) {
		// Fully transparent pixels don't need their color channels compared
		if (this.data[pixIndex + CPColorBmp.ALPHA_BYTE_OFFSET] != 0 || that.data[pixIndex + CPColorBmp.ALPHA_BYTE_OFFSET] != 0) {
			if (this.data[pixIndex] != that.data[pixIndex]
                || this.data[pixIndex + 1] != that.data[pixIndex + 1]
                || this.data[pixIndex + 2] != that.data[pixIndex + 2]
                || this.data[pixIndex + 3] != that.data[pixIndex + 3]) {
                return false;
            }
		}
	}
    
    return true;
};