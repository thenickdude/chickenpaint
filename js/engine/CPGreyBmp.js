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

import CPBitmap from "./CPBitmap";

/**
 * Create a new greyscale bitmap with the given parameters. The bitmap will be filled with black upon creation.
 *
 * @param {int} width
 * @param {int} height
 * @param {int} bitDepth
 *
 * @constructor
 * @extends CPBitmap
 */
export default function CPGreyBmp(width, height, bitDepth) {
    CPBitmap.call(this, width, height);

    this.createBitmap(width, height, bitDepth);
}

CPGreyBmp.prototype.createBitmap = function(width, height, bitDepth) {
    this.bitDepth = bitDepth;
    
    switch (bitDepth) {
        case 32:
            this.data = new Uint32Array(width * height);
            break;
        case 16:
            this.data = new Uint16Array(width * height);
            break;
        case 8:
        default:
            this.data = new Uint8Array(width * height);
    }
};

CPGreyBmp.prototype.clone = function() {
    var
        result = new CPGreyBmp(this.width, this.height, this.bitDepth);

    result.copyDataFrom(this);

    return result;
};

CPGreyBmp.prototype.clearAll = function(value) {
    if ("fill" in this.data) {
        this.data.fill(value);
    } else {
        for (var i = 0; i < this.data.length; i++) {
            this.data[i] = value;
        }
    }
};

CPGreyBmp.prototype.clearRect = function(rect, value) {
    rect = this.getBounds().clipTo(rect);

    var
        yStride = this.width - rect.getWidth(),
        pixIndex = this.offsetOfPixel(rect.left, rect.top);

    for (var y = rect.top; y < rect.bottom; y++, pixIndex += yStride) {
        for (var x = rect.left; x < rect.right; x++, pixIndex++) {
            this.data[pixIndex] = value;
        }
    }
};

/**
 * Use nearest-neighbor (subsampling) to scale that bitmap to replace the pixels of this one.
 *
 * @param {CPGreyBmp} that
 */
CPGreyBmp.prototype.copyScaledNearestNeighbor = function(that) {
    var
        destPixIndex = 0,

        xSkip = that.width / this.width,
        ySkip = that.height / this.height,
        srcRowStart;

    for (var y = 0, srcRow = 0; y < this.height; y++, srcRow += ySkip) {
        srcRowStart = that.offsetOfPixel(0, Math.round(srcRow));

        for (var x = 0, srcCol = 0; x < this.width; x++, destPixIndex++, srcCol += xSkip) {
            var
                srcPixIndex = srcRowStart + Math.round(srcCol);

            this.data[destPixIndex] = that.data[srcPixIndex];
        }
    }
};

/**
 * Replace the pixels in this image with a scaled down thumbnail of that image.
 *
 * @param {CPGreyBmp} that
 */
CPGreyBmp.prototype.createThumbnailFrom = function(that) {
    const
        MAX_SAMPLES_PER_OUTPUT_PIXEL = 3,

        numSamples = Math.min(Math.floor(that.width / this.width), MAX_SAMPLES_PER_OUTPUT_PIXEL);

    if (numSamples < 2) {
        // If we only take one sample per output pixel, there's no need for our filtering strategy
        this.copyScaledNearestNeighbor(that);
        return;
    }

    const
        rowBuffer = new Uint16Array(this.width),
        srcRowByteLength = that.width,

        sourceBytesBetweenOutputCols = Math.floor(that.width / this.width),
        intersampleXByteSpacing = Math.floor(that.width / this.width / numSamples),

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

    var
        srcPixIndex = 0, dstPixIndex = 0;

    // For each output thumbnail row...
    for (var y = 0; y < this.height; y++, srcPixIndex += interpixelYByteSkip) {
        var
            bufferIndex = 0;

        rowBuffer.fill(0);

        // Sum the contributions of the input rows that correspond to this output row
        for (var y2 = 0; y2 < numSamples; y2++, srcPixIndex += intersampleYByteSkip) {
            bufferIndex = 0;
            for (var x = 0; x < this.width; x++, bufferIndex++, srcPixIndex += interpixelXByteSkip) {
                for (var x2 = 0; x2 < numSamples; x2++, srcPixIndex += intersampleXByteSpacing) {
                    rowBuffer[bufferIndex] += that.data[srcPixIndex];
                }
            }
        }

        // Now this thumbnail row is complete and we can write the buffer to the output
        bufferIndex = 0;
        for (var x = 0; x < this.width; x++, bufferIndex++, dstPixIndex++) {
            this.data[dstPixIndex] = rowBuffer[bufferIndex] / (numSamples * numSamples);
        }
    }
};

CPGreyBmp.prototype.mirrorHorizontally = function() {
    var
        newData = new Uint8Array(width * height);

    for (var y = 0; y < height; y++) {
        for (var x = 0; x < width; x++) {
            newData[y * width + x] = this.data[y * width + width - x - 1];
        }
    }

    this.data = newData;
};

CPGreyBmp.prototype.applyLUT = function(lut) {
    for (var i = 0; i < this.data.length; i++) {
        this.data[i] = lut.table[this.data[i]];
    }
};

/**
 * Get the image as Canvas.
 *
 * @returns {HTMLCanvasElement}
 */
CPGreyBmp.prototype.getAsCanvas = function() {
    var
        imageData = this.getImageData(),

        canvas = document.createElement("canvas"),
        context = canvas.getContext("2d");

    canvas.width = this.width;
    canvas.height = this.height;

    context.putImageData(imageData, 0, 0);

    return canvas;
};

/**
 * Get the image as an opaque RGBA ImageData object.
 * @returns {ImageData}
 */
CPGreyBmp.prototype.getImageData = function() {
    var
        canvas = document.createElement("canvas"),
        context = canvas.getContext("2d"),
        imageData = context.createImageData(this.width, this.height),

        srcIndex = 0,
        dstIndex = 0;

    for (var y = 0; y < this.height; y++) {
        for (var x = 0; x < this.width; x++) {
            imageData.data[dstIndex++] = this.data[srcIndex];
            imageData.data[dstIndex++] = this.data[srcIndex];
            imageData.data[dstIndex++] = this.data[srcIndex];
            imageData.data[dstIndex++] = 0xFF;
            srcIndex++;
        }
    }

    return imageData;
};

/**
 * Copy pixels from that bitmap.
 *
 * @param {CPGreyBmp} bmp
 */
CPGreyBmp.prototype.copyDataFrom = function(bmp) {
    if (bmp.width != this.width || bmp.height != this.height || bmp.bitDepth != this.bitDepth) {
        if ("slice" in bmp.data) {
            this.data = bmp.data.slice(0);

            this.width = bmp.width;
            this.height = bmp.height;
            this.bitDepth = bmp.bitDepth;
        } else {
            // IE doesn't have slice()
            this.createBitmap(bmp.width, bmp.height, bmp.bitDepth);

            for (let i = 0; i < this.data.length; i++) {
                this.data[i] = bmp.data[i];
            }
        }
    } else {
        this.data.set(bmp.data);
    }
};

CPGreyBmp.prototype.offsetOfPixel = function(x, y) {
    return y * this.width + x;
};