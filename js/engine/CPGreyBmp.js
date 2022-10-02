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
import {createCanvas, createImageData} from "../util/Canvas.js";
import {getRotatedCanvas} from "./CPColorBmp.js";

/**
 * Create a new greyscale bitmap with the given parameters. The bitmap will be filled with black upon creation.
 *
 * @param {int} width
 * @param {int} height
 * @param {int} bitDepth - Bits per channel
 *
 * @constructor
 * @extends CPBitmap
 */
export default function CPGreyBmp(width, height, bitDepth) {
    CPBitmap.call(this, width, height);

    this.createBitmap(width, height, bitDepth);
}

CPGreyBmp.prototype = Object.create(CPBitmap.prototype);
CPGreyBmp.prototype.constructor = CPGreyBmp;

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

    result.copyPixelsFrom(this);

    return result;
};

/**
 * Creates a CPGreyBmp from a portion of this bitmap
 *
 * @param {CPRect} rect
 * @returns {CPGreyBmp}
 */
CPGreyBmp.prototype.cloneRect = function(rect) {
    var
        result = new CPGreyBmp(rect.getWidth(), rect.getHeight(), this.bitDepth);

    result.copyBitmapRect(this, 0, 0, rect);

    return result;
};

/**
 * Pixel access with friendly clipping.
 *
 * @returns {int} Pixel value
 */
CPGreyBmp.prototype.getPixel = function(x, y) {
    x = Math.max(0, Math.min(this.width - 1, x));
    y = Math.max(0, Math.min(this.height - 1, y));

    return this.data[this.offsetOfPixel(x, y)];
};

CPGreyBmp.prototype.clearAll = function(value) {
    this.data.fill(value);
};

/**
 * Fill the given rectangle with the given value
 *
 * @param {CPRect} rect
 * @param {int} value
 */
CPGreyBmp.prototype.clearRect = function(rect, value) {
    rect = this.getBounds().clipTo(rect);

    if (rect.equals(this.getBounds())) {
        this.clearAll(value);
    } else {
        let
            yStride = this.width,
            fillWidth = rect.right - rect.left,
            rowStartIndex = this.offsetOfPixel(rect.left, rect.top);

        for (let y = rect.top; y < rect.bottom; y++, rowStartIndex += yStride) {
            this.data.fill(value, rowStartIndex, rowStartIndex + fillWidth);
        }
    }
}

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
 * Flood fill the given color starting from the given point
 * @param {int} x
 * @param {int} y
 * @param {int} color
 */
CPGreyBmp.prototype.floodFill = function(x, y, color) {
    if (!this.isInside(x, y)) {
        return;
    }

    color = color & 0xFF;

    let
        oldColor = this.getPixel(x, y),

        stack = [],
        clip = this.getBounds(),

        data = this.data;

    stack.push({x1: x, x2: x, y: y, dy: -1});
    stack.push({x1: x, x2: x, y: y + 1, dy: 1});

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

        while (left >= clip.left && data[left + lineOffset] == oldColor) {
            data[left + lineOffset] = color;

            left--;
        }

        if (left >= line.x1) {
            while (left <= line.x2 && data[left + lineOffset] != oldColor) {
                left++;
            }
            next = left + 1;
            if (left > line.x2) {
                continue;
            }
        } else {
            left++;
            if (left < line.x1) {
                stack.push({x1: left, x2: line.x1 - 1, y: line.y - line.dy, dy: -line.dy});
            }
            next = line.x1 + 1;
        }

        do {
            data[left + lineOffset] = color;

            while (next < clip.right && data[next + lineOffset] == oldColor) {
                data[next + lineOffset] = color;

                next++;
            }
            stack.push({x1: left, x2: next - 1, y: line.y + line.dy, dy: line.dy});

            if (next - 1 > line.x2) {
                stack.push({x1: line.x2 + 1, x2: next - 1, y: line.y - line.dy, dy: -line.dy});
            }

            left = next + 1;
            while (left <= line.x2 && data[left + lineOffset] != oldColor) {
                left++;
            }

            next = left + 1;
        } while (left <= line.x2);
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
            for (let x = 0; x < this.width; x++, bufferIndex++, srcPixIndex += interpixelXByteSkip) {
                for (let x2 = 0; x2 < numSamples; x2++, srcPixIndex += intersampleXByteSpacing) {
                    rowBuffer[bufferIndex] += that.data[srcPixIndex];
                }
            }
        }

        // Now this thumbnail row is complete and we can write the buffer to the output
        bufferIndex = 0;
        for (let x = 0; x < this.width; x++, bufferIndex++, dstPixIndex++) {
            this.data[dstPixIndex] = rowBuffer[bufferIndex] / (numSamples * numSamples);
        }
    }
};

CPGreyBmp.prototype.mirrorHorizontally = function() {
    let
        width = this.width,
        height = this.height,
        newData = new Uint8Array(width * height),
        dstOffset = 0,
        srcOffset = width;

    for (let y = 0; y < height; y++, srcOffset += width + width) {
        for (let x = 0; x < width; x++) {
            newData[dstOffset++] = this.data[--srcOffset];
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
 * @param {int?} imageRotation - 90 degree clockwise rotations to apply to image
 * @returns {HTMLCanvasElement}
 */
CPGreyBmp.prototype.getAsCanvas = function(imageRotation) {
    var
        imageData = this.getImageData(0, 0, this.width, this.height),

        canvas = createCanvas(this.width, this.height),
        context = canvas.getContext("2d");

    context.putImageData(imageData, 0, 0);

    return getRotatedCanvas(canvas, imageRotation || 0);
};

/**
 * Get the image data within the given rectangle as an opaque RGBA ImageData object.
 *
 * @param {int} x
 * @param {int} y
 * @param {int} width
 * @param {int} height
 *
 * @returns {ImageData}
 */
CPGreyBmp.prototype.getImageData = function(x, y, width, height) {
    let
        imageData = createImageData(width, height),

        srcIndex = this.offsetOfPixel(x, y),
        dstIndex = 0,

        ySkip = this.width - width;

    for (let y = 0; y < height; y++, srcIndex += ySkip) {
        for (let x = 0; x < width; x++, srcIndex++) {
            imageData.data[dstIndex++] = this.data[srcIndex];
            imageData.data[dstIndex++] = this.data[srcIndex];
            imageData.data[dstIndex++] = this.data[srcIndex];
            imageData.data[dstIndex++] = 0xFF;
        }
    }

    return imageData;
};

/**
 * Replace the pixels at the given coordinates with the red channel from the given image data.
 *
 * @param {ImageData} imageData
 * @param {int} x
 * @param {int} y
 */
CPGreyBmp.prototype.pasteImageData = function(imageData, x, y) {
    let
        srcIndex = 0,
        dstIndex = this.offsetOfPixel(x, y),

        ySkip = this.width - imageData.width;

    for (let y = 0; y < imageData.height; y++, dstIndex += ySkip) {
        for (let x = 0; x < imageData.width; x++, srcIndex += 4, dstIndex++) {
            this.data[dstIndex] = imageData.data[srcIndex]; // Use the first (red) channel as the intensity
        }
    }

    return imageData;
};

/**
 * Copy pixels from that bitmap.
 *
 * @param {CPGreyBmp} bmp
 */
CPGreyBmp.prototype.copyPixelsFrom = function(bmp) {
    if (bmp.width != this.width || bmp.height != this.height || bmp.bitDepth != this.bitDepth) {
        this.data = bmp.data.slice(0);

        this.width = bmp.width;
        this.height = bmp.height;
        this.bitDepth = bmp.bitDepth;
    } else {
        this.data.set(bmp.data);
    }
};


/**
 * Get a pixel array of the xor of this bitmap and the given one, within the given rectangle
 *
 * @param {CPGreyBmp} bmp
 * @param {CPRect} rect
 *
 * @returns {Uint8Array}
 */
CPGreyBmp.prototype.copyRectXOR = function(bmp, rect) {
    rect = this.getBounds().clipTo(rect);

    var
        w = rect.getWidth(),
        h = rect.getHeight(),

        buffer = new Uint8Array(w * h),

        outputIndex = 0,
        bmp1Index = this.offsetOfPixel(rect.left, rect.top),
        bmp2Index = bmp.offsetOfPixel(rect.left, rect.top),

        bmp1YSkip = this.width - w,
        bmp2YSkip = bmp.width - w;

    for (var y = rect.top; y < rect.bottom; y++, bmp1Index += bmp1YSkip, bmp2Index += bmp2YSkip) {
        for (var x = 0; x < w; x++, outputIndex++, bmp1Index++, bmp2Index++) {
            buffer[outputIndex] = this.data[bmp1Index] ^ bmp.data[bmp2Index];
        }
    }

    return buffer;
};

CPGreyBmp.prototype.setRectXOR = function(buffer, rect) {
    rect = this.getBounds().clipTo(rect);

    var
        w = rect.getWidth(),
        h = rect.getHeight(),

        bmp1Index = this.offsetOfPixel(rect.left, rect.top),
        bufferIndex = 0,

        bmp1YSkip = this.width - w;

    for (var y = 0; y < h; y++) {
        for (var x = 0; x < w; x++) {
            this.data[bmp1Index++] ^= buffer[bufferIndex++];
        }
        bmp1Index += bmp1YSkip;
    }
};

/**
 * Copy the rectangle at srcRect from bmp onto this image at (dstX, dstY).
 *
 * @param {CPGreyBmp} bmp
 * @param {int} dstX
 * @param {int} dstY
 * @param {CPRect} srcRect
 */
CPGreyBmp.prototype.copyBitmapRect = function(bmp, dstX, dstY, srcRect) {
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
            dstYSkip = this.width - w,

            srcIndex = bmp.offsetOfPixel(srcRect.left, srcRect.top),
            srcYSkip = bmp.width - w;

        for (var y = 0; y < h; y++, srcIndex += srcYSkip, dstIndex += dstYSkip) {
            for (var x = 0; x < w; x++, srcIndex++, dstIndex++) {
                this.data[dstIndex] = bmp.data[srcIndex];
            }
        }
    }
};

/**
 * @param rect CPRect
 * @param source CPColorBmp
 */
CPGreyBmp.prototype.copyRegionHFlip = function(rect, source) {
    rect = this.getBounds().clipTo(rect);

    for (var y = rect.top; y < rect.bottom; y++) {
        var
            dstOffset = this.offsetOfPixel(rect.left, y),
            srcOffset = source.offsetOfPixel(rect.right - 1, y);

        for (var x = rect.left; x < rect.right; x++, srcOffset -= 2) {
            this.data[dstOffset++] = source.data[srcOffset++];
        }
    }
};

/**
 * @param rect CPRect
 * @param source CPColorBmp
 */
CPGreyBmp.prototype.copyRegionVFlip = function(rect, source) {
    rect = this.getBounds().clipTo(rect);

    var
        width = rect.getWidth();

    for (var y = rect.top; y < rect.bottom; y++) {
        var
            dstOffset = this.offsetOfPixel(rect.left, y),
            srcOffset = source.offsetOfPixel(rect.left, rect.bottom - 1 - (y - rect.top));

        for (var x = 0; x < width; x++) {
            this.data[dstOffset++] = source.data[srcOffset++];
        }
    }
};

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
        pixelCount = 0, pixelSum = 0,
        dstIndex;

    for (let i = 0; i < radius && i < len; i++) {
        pixelSum += src[i];
        pixelCount++;
    }

    dstIndex = 0;
    for (let i = 0; i < len; i++) {
        // New pixel joins the window at the right
        if (i + radius < len) {
            pixelSum += src[i + radius];
            pixelCount++;
        }

        dst[dstIndex++] = Math.round(pixelSum / pixelCount);

        // Old pixel leaves the window at the left
        if (i - radius >= 0) {
            pixelSum -= src[i - radius];
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
 * @param {TypedArray} buffer Pixel array
 */
CPGreyBmp.prototype.copyPixelColumnToArray = function(x, y, len, buffer) {
    var
        yJump = this.width,
        dstOffset = 0,
        srcOffset = this.offsetOfPixel(x, y);

    for (var i = 0; i < len; i++) {
        buffer[dstOffset] = this.data[srcOffset];

        srcOffset += yJump;
        dstOffset++;
    }
};

/**
 * Copy the pixels from the buffer to a column of pixels in the bitmap.
 *
 * @param {int} x X-coordinate of column
 * @param {int} y Y-coordinate of top of column to copy
 * @param {int} len Number of pixels to copy
 * @param {TypedArray} buffer Pixel array to copy from
 */
CPGreyBmp.prototype.copyArrayToPixelColumn = function(x, y, len, buffer) {
    var
        yJump = this.width,
        srcOffset = 0,
        dstOffset = this.offsetOfPixel(x, y);

    for (var i = 0; i < len; i++) {
        this.data[dstOffset] = buffer[srcOffset];

        dstOffset += yJump;
        srcOffset++;
    }
};

CPGreyBmp.prototype.boxBlur = function(rect, radiusX, radiusY) {
    rect = this.getBounds().clipTo(rect);

    let
        rectWidth = rect.getWidth(),
        rectHeight = rect.getHeight(),
        rectLength = Math.max(rectWidth, rectHeight),

        src = new this.data.constructor(rectLength),
        dst = new this.data.constructor(rectLength);

    for (let y = rect.top; y < rect.bottom; y++) {
        var
            pixOffset = this.offsetOfPixel(rect.left, y);

        for (let x = 0; x < rectWidth; x++) {
            src[x] = this.data[pixOffset++];
        }

        boxBlurLine(src, dst, rectWidth, radiusX);

        pixOffset = this.offsetOfPixel(rect.left, y);

        for (let x = 0; x < rectWidth; x++) {
            this.data[pixOffset++] = dst[x];
        }
    }

    for (let x = rect.left; x < rect.right; x++) {
        this.copyPixelColumnToArray(x, rect.top, rectHeight, src);

        boxBlurLine(src, dst, rectHeight, radiusY);

        this.copyArrayToPixelColumn(x, rect.top, rectHeight, dst);
    }
};

CPGreyBmp.prototype.offsetOfPixel = function(x, y) {
    return y * this.width + x;
};

/**
 * @param {CPRect} rect
 */
CPGreyBmp.prototype.fillWithNoise = function(rect) {
    rect = this.getBounds().clipTo(rect);

    var
        yStride = this.width - rect.getWidth(),
        pixIndex = this.offsetOfPixel(rect.left, rect.top);

    for (var y = rect.top; y < rect.bottom; y++, pixIndex += yStride) {
        for (var x = rect.left; x < rect.right; x++, pixIndex++) {
            this.data[pixIndex] = (Math.random() * 0x100) | 0; // TODO we might usefully support bitmaps > 8 bits/channel here?
        }
    }
};

/**
 * @param {CPRect} rect
 */
CPGreyBmp.prototype.invert = function(rect) {
    rect = this.getBounds().clipTo(rect);

    var
        yStride = this.width - rect.getWidth(),

        pixIndex = this.offsetOfPixel(rect.left, rect.top);

    for (var y = rect.top; y < rect.bottom; y++, pixIndex += yStride) {
        for (var x = rect.left; x < rect.right; x++, pixIndex++) {
            this.data[pixIndex] = ~this.data[pixIndex];
        }
    }
};

/**
 * Get a rectangle that encloses pixels in the bitmap which don't match the given value within the given initialBounds
 * (or an empty rect if all pixels inside the given bounds match the value).
 *
 * This can be used to find a rectangle which encloses the non-white pixels of a mask.
 *
 * @param {CPRect} initialBounds - The rect to search within (pass getBounds() to search the whole bitmap)
 * @param {int} value
 *
 * @returns {CPRect}
 */
CPGreyBmp.prototype.getValueBounds = function(initialBounds, value) {
    var
        pixIndex,
        result = initialBounds.clone(),
        x, y,
        yStride,
        found;

    // Find the first non-matching row
    yStride = this.width - result.getWidth();
    pixIndex = this.offsetOfPixel(result.left, result.top);

    for (y = result.top; y < result.bottom; y++, pixIndex += yStride) {
        found = false;

        for (x = result.left; x < result.right; x++, pixIndex++) {
            if (this.data[pixIndex] != value) {
                found = true;
                break;
            }
        }

        if (found) {
            break;
        }
    }

    result.top = y;

    if (result.top == result.bottom) {
        // Rect is empty, no opaque pixels in the initialBounds
        return result;
    }

    // Now the last non-matching row
    pixIndex = this.offsetOfPixel(result.right - 1, result.bottom - 1);
    for (y = result.bottom - 1; y >= result.top; y--, pixIndex -= yStride) {
        found = false;
        for (x = result.right - 1; x >= result.left; x--, pixIndex--) {
            if (this.data[pixIndex] != value) {
                found = true;
                break;
            }
        }

        if (found) {
            break;
        }
    }

    result.bottom = y + 1; /* +1 since the bottom/right edges of the rect are exclusive */

    // Now columns from the left
    yStride = this.width;
    for (x = result.left; x < result.right; x++) {
        pixIndex = this.offsetOfPixel(x, result.top);

        found = false;
        for (y = result.top; y < result.bottom; y++, pixIndex += yStride) {
            if (this.data[pixIndex] != value) {
                found = true;
                break;
            }
        }

        if (found) {
            break;
        }
    }

    result.left = x;

    // And columns from the right
    for (x = result.right - 1; x >= result.left; x--) {
        pixIndex = this.offsetOfPixel(x, result.top);

        found = false;
        for (y = result.top; y < result.bottom; y++, pixIndex += yStride) {
            if (this.data[pixIndex] != value) {
                found = true;
                break;
            }
        }

        if (found) {
            break;
        }
    }

    result.right = x + 1;

    return result;
};

/**
 * Replace the pixels in the given rect with the given horizontal gradient.
 *
 * @param rect CPRect
 * @param fromX int
 * @param toX int
 * @param gradientPoints int[]
 */
CPGreyBmp.prototype.gradientHorzReplace = function(rect, fromX, toX, gradientPoints) {
    var
        fromColor = gradientPoints[0] & 0xFF,
        toColor = gradientPoints[1] & 0xFF,

        yStride = this.width - rect.getWidth(),
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
        colorStep = (toColor - fromColor) / gradientRange,

        jump = Math.max(rect.left - fromX, 0);

    for (var y = 0; y < h; y++, pixIndex += yStride) {
        // The solid color section before the gradient
        var
            x = rect.left;

        for (var xEnd = Math.min(fromX, rect.right) | 0; x < xEnd; x++, pixIndex++) {
            this.data[pixIndex] = fromColor;
        }

        // In the gradient
        var
            color1 = fromColor + colorStep * jump;

        for (xEnd = Math.min(toX, rect.right) | 0; x < xEnd; x++, pixIndex++) {
            this.data[pixIndex] = color1;

            color1 += colorStep;
        }

        // The section after the end of the gradient
        for (; x < rect.right; x++, pixIndex++) {
            this.data[pixIndex] = toColor;
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
CPGreyBmp.prototype.gradientVertReplace = function(rect, fromY, toY, gradientPoints) {
    let
        fromColor = gradientPoints[0] & 0xFF,
        toColor = gradientPoints[1] & 0xFF,

        yStride = this.width - rect.getWidth(),
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
        for (let x = 0; x < w; x++, pixIndex++) {
            this.data[pixIndex] = fromColor;
        }
    }

    // Inside the gradient
    var
        gradientRange = (toY - fromY) | 0,
        colorStep = (toColor - fromColor) / gradientRange,

        jump = Math.max(y - fromY, 0),
        color1 = fromColor + colorStep * jump;

    for (let yEnd = Math.min(rect.bottom, toY) | 0; y < yEnd; y++, pixIndex += yStride) {
        for (let x = 0; x < w; x++, pixIndex++) {
            this.data[pixIndex] = color1;
        }

        color1 += colorStep;
    }

    // The section after the end of the gradient
    for (; y < rect.bottom; y++, pixIndex += yStride) {
        for (let x = 0; x < w; x++, pixIndex++) {
            this.data[pixIndex] = toColor;
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
CPGreyBmp.prototype.gradientReplace = function(rect, fromX, fromY, toX, toY, gradientPoints) {
    var
        yStride = this.width - rect.getWidth(),
        pixIndex = this.offsetOfPixel(rect.left, rect.top) | 0,
        w = (rect.right - rect.left) | 0,

        fromColor = gradientPoints[0] & 0xFF,
        toColor = gradientPoints[1] & 0xFF,

    // How many pixels vertically does the gradient sequence complete over (+infinity for horizontal gradients!)
        vertRange = (toY - fromY) + ((toX - fromX) * (toX - fromX)) / (toY - fromY),
    // Same for horizontal
        horzRange = (toX - fromX) + ((toY - fromY) * (toY - fromY)) / (toX - fromX),
        horzStep = 1 / horzRange;

    for (var y = rect.top; y < rect.bottom; y++, pixIndex += yStride) {
        var
        // The position the row starts at in the gradient [0.0 ... 1.0)
            prop = (rect.left - fromX) / horzRange + (y - fromY) / vertRange;

        for (var x = 0; x < w; x++, pixIndex++) {
            var
                propClamped = Math.min(Math.max(prop, 0.0), 1.0),
                invPropClamped = 1 - propClamped;

            this.data[pixIndex] = fromColor * invPropClamped + toColor * propClamped;

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
CPGreyBmp.prototype.gradientAlpha = function(rect, fromX, fromY, toX, toY, gradientPoints) {
    var
        yStride = this.width - rect.getWidth(),
        pixIndex = this.offsetOfPixel(rect.left, rect.top) | 0,
        w = (rect.right - rect.left) | 0,

        fromColor = {
            c: gradientPoints[0] & 0xFF,
            a: (gradientPoints[0] >> 24) & 0xFF
        },
        toColor = {
            c: gradientPoints[1] & 0xFF,
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

        for (var x = 0; x < w; x++, pixIndex++) {
            var
                propClamped = Math.min(Math.max(prop, 0.0), 1.0),
                invPropClamped = 1 - propClamped,

            // The gradient color to draw
                color1 = fromColor.c * invPropClamped + toColor.c * propClamped,
                alpha1 = fromColor.a * invPropClamped + toColor.a * propClamped;

            var
                invAlpha = 255 - alpha1;

            this.data[pixIndex] = ((color1 * alpha1 + this.data[pixIndex] * invAlpha) / 255) | 0;

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
CPGreyBmp.prototype.gradient = function(rect, fromX, fromY, toX, toY, gradientPoints, replace) {
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

CPGreyBmp.prototype.equals = function(that) {
	if (this.width != that.width || this.height != that.height) {
		return false;
	}

	for (let pixIndex = 0; pixIndex < this.data.length; pixIndex++) {
		if (this.data[pixIndex] != that.data[pixIndex]) {
			return false;
		}
	}

	return true;
};