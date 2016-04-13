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
import CPRect from "../util/CPRect";

function createImageData(width, height) {
    // return new ImageData(this.width, this.height); // Doesn't work on old IE
    var
        canvas = document.createElement("canvas"),
        context = canvas.getContext("2d");
    
    return context.createImageData(width, height);
}

//
// A 32bpp bitmap class (one byte per channel in RGBA order)
//

export default function CPColorBmp(width, height) {
    CPBitmap.call(this, width, height);

    // The ImageData object that holds the image data
    this.imageData = createImageData(this.width, this.height);
    
    // The bitmap data array (one byte per channel in RGBA order)
    this.data = this.imageData.data;
}

CPColorBmp.prototype = Object.create(CPBitmap.prototype);
CPColorBmp.prototype.constructor = CPColorBmp;

CPColorBmp.BYTES_PER_PIXEL = 4;
CPColorBmp.RED_BYTE_OFFSET = 0;
CPColorBmp.GREEN_BYTE_OFFSET = 1;
CPColorBmp.BLUE_BYTE_OFFSET = 2;
CPColorBmp.ALPHA_BYTE_OFFSET = 3;

// Creates a CPBitmap from a portion of this bitmap
CPColorBmp.prototype.cloneRect = function(rect) {
    var
        result = new CPColorBmp(rect.getWidth(), rect.getHeight());
    
    result.copyBitmapRect(this, 0, 0, rect);
    
    return result;
};

//
// Pixel access with friendly clipping. Pixel will be 32-bit integer in ARGB format
//
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
 * @returns {Uint8Array}
 */
CPColorBmp.prototype.copyRectXOR = function(bmp, rect) {
    rect = this.getBounds().clip(rect);
    
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
    rect = this.getBounds().clip(rect);
    
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

//
// Copy another bitmap into this one using alpha blending
//
CPColorBmp.prototype.pasteAlphaRect = function(bmp, srcRect, x, y) {
    var
        srcRectCpy = srcRect.clone(),
        dstRect = new CPRect(x, y, 0, 0);
    
    this.getBounds().clipSourceDest(srcRectCpy, dstRect);

    var
        srcYStride = (bmp.width - dstRect.getWidth()) * CPColorBmp.BYTES_PER_PIXEL,
        dstYStride = (this.width - dstRect.getWidth()) * CPColorBmp.BYTES_PER_PIXEL,
        
        srcOffset = bmp.offsetOfPixel(srcRectCpy.left, srcRectCpy.top),
        dstOffset = this.offsetOfPixel(dstRect.left, dstRect.top);

    for (var y = dstRect.top; y < dstRect.bottom; y++, srcOffset += srcYStride, dstOffset += dstYStride) {
        for (var x = dstRect.left; x < dstRect.right; x++) {
            var 
                alpha1 = bmp.data[srcOffset + CPColorBmp.ALPHA_BYTE_OFFSET];

            if (alpha1 <= 0) {
                dstOffset += CPColorBmp.BYTES_PER_PIXEL;
                srcOffset += CPColorBmp.BYTES_PER_PIXEL;
                continue;
            }

            if (alpha1 == 255) {
                for (var i = 0; i < CPColorBmp.BYTES_PER_PIXEL; i++) {
                    this.data[dstOffset++] = bmp.data[srcOffset++];
                }
                continue;
            }

            var
                alpha2 = this.data[dstOffset + CPColorBmp.ALPHA_BYTE_OFFSET],
                newAlpha = (alpha1 + alpha2 - alpha1 * alpha2 / 255) | 0;
            
            if (newAlpha > 0) {
                var 
                    realAlpha = (alpha1 * 255 / newAlpha) | 0,
                    invAlpha = 255 - realAlpha;

                for (var i = 0; i < 3; i++, dstOffset++, srcOffset++) {
                    this.data[dstOffset] = (bmp.data[srcOffset] + (this.data[dstOffset] * invAlpha - bmp.data[srcOffset] * invAlpha) / 255) | 0;
                }
                this.data[dstOffset++] = newAlpha;
                srcOffset++;
            } else {
                dstOffset += CPColorBmp.BYTES_PER_PIXEL;
                srcOffset += CPColorBmp.BYTES_PER_PIXEL;
            }
        }
    }
};

/** 
 * Copy the rectangle at srcRect from bmp onto this image at (dstX, dstY).
 */ 
CPColorBmp.prototype.copyBitmapRect = function(bmp, dstX, dstY, srcRect) {
    var
        srcRect = srcRect.clone(),
        dstRect = new CPRect(dstX, dstY, 0, 0);

    this.getBounds().clipSourceDest(srcRect, dstRect);

    var 
        w = dstRect.getWidth() | 0,
        h = dstRect.getHeight() | 0;

    // Are we just trying to duplicate the bitmap?
    if (dstRect.left == 0 && dstRect.top == 0 && w == this.width && h == this.height && w == bmp.width && h == bmp.height) {
        this.copyDataFrom(bmp);
    } else {
        var
            dstIndex = this.offsetOfPixel(dstRect.left, dstRect.top),
            srcIndex = bmp.offsetOfPixel(srcRect.left, srcRect.top),

            dstYSkip = (this.width - w) * CPColorBmp.BYTES_PER_PIXEL,
            srcYSkip = (bmp.width - w) * CPColorBmp.BYTES_PER_PIXEL;

        for (var y = 0; y < h; y++) {
            for (var x = 0; x < w; x++) {
                this.data[dstIndex] = bmp.data[srcIndex];
                this.data[dstIndex + 1] = bmp.data[srcIndex + 1];
                this.data[dstIndex + 2] = bmp.data[srcIndex + 2];
                this.data[dstIndex + 3] = bmp.data[srcIndex + 3];
                dstIndex += 4;
                srcIndex += 4;
            }
            srcIndex += srcYSkip;
            dstIndex += dstYSkip;
        }
    }
};

//
// Copies the Alpha channel from another bitmap. Assumes both bitmaps are the same width.
//
CPColorBmp.prototype.copyAlphaFrom = function(bmp, rect) {
    rect = this.getBounds().clip(rect);

    var 
        w = rect.getWidth(),
        h = rect.getHeight(),
        
        pixIndex = this.offsetOfPixel(rect.left, rect.top) + CPColorBmp.ALPHA_BYTE_OFFSET /* Apply offset here so we don't have to do it per-pixel*/,
        ySkip = (this.width - w) * CPColorBmp.BYTES_PER_PIXEL;
    
    for (var y = 0; y < h; y++) {
        for (var x = 0; x < w; x++) {
            this.data[pixIndex] = bmp.data[pixIndex];
            pixIndex += CPColorBmp.BYTES_PER_PIXEL;
        }
        pixIndex += ySkip;
    }
};

CPColorBmp.prototype.copyDataFrom = function(bmp) {
    if (bmp.width != this.width || bmp.height != this.height) {
        this.width = bmp.width;
        this.height = bmp.height;
        
        this.imageData = createImageData(this.width, this.height);
        this.data = this.imageData.data;
    }

    if ("set" in this.data) {
        this.data.set(bmp.data);
    } else {
        // IE doesn't use Uint8ClampedArray for ImageData, so set() isn't available
        for (var i = 0; i < this.data.length; i++) {
            this.data[i] = bmp.data[i];
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

    var
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
            var
                line = stack.pop();
    
            if (line.y < clip.top || line.y >= clip.bottom) {
                continue;
            }
    
            var
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
            var
                line = stack.pop();

            if (line.y < clip.top || line.y >= clip.bottom) {
                continue;
            }

            var
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
 * @param buffer R,G,B,A channel array
 * @param len Number of pixels in buffer to modify
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

function boxBlurLine(src, dst, len, radius) {
    var
        totalPixels = 0, totalChannels = [0, 0, 0, 0],
        pixIndex, dstIndex;
    
    pixIndex = 0;
    for (var i = 0; i < radius && i < len; i++) {
        for (var j = 0; j < CPColorBmp.BYTES_PER_PIXEL; j++) {
            totalChannels[j] += src[pixIndex++];
        }
        totalPixels++;
    }
    
    dstIndex = 0;
    for (var i = 0; i < len; i++) {
        // New pixel joins the window at the right
        if (i + radius < len) {
            pixIndex = (i + radius) * CPColorBmp.BYTES_PER_PIXEL;
            
            for (var j = 0; j < CPColorBmp.BYTES_PER_PIXEL; j++) {
                totalChannels[j] += src[pixIndex++];
            }
            totalPixels++;
        }

        for (var j = 0; j < CPColorBmp.BYTES_PER_PIXEL; j++) {
            dst[dstIndex++] = Math.round(totalChannels[j] / totalPixels);
        }

        // Old pixel leaves the window at the left
        if (i - radius >= 0) {
            pixIndex = (i - radius) * CPColorBmp.BYTES_PER_PIXEL;
            
            for (var j = 0; j < CPColorBmp.BYTES_PER_PIXEL; j++) {
                totalChannels[j] -= src[pixIndex++];
            }
            totalPixels--;
        }
    }
}

/**
 * Copy a column of pixels in the bitmap to the given R,G,B,A buffer.
 * 
 * @param x X-coordinate of column
 * @param y Y-coordinate of top of column to copy
 * @param len Number of pixels to copy
 * @param buffer R,G,B,A array
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
}

/**
 * Copy the pixels from the given R,G,B,A buffer to a column of pixels in the bitmap.
 * 
 * @param x X-coordinate of column
 * @param y Y-coordinate of top of column to copy
 * @param len Number of pixels to copy
 * @param buffer R,G,B,A array to copy from
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
}

CPColorBmp.prototype.boxBlur = function(rect, radiusX, radiusY) {
    rect = this.getBounds().clip(rect);

    var
        rectWidth = rect.getWidth(),
        rectWidthBytes = rectWidth * CPColorBmp.BYTES_PER_PIXEL,
        rectHeight = rect.getHeight(),
        rectLength = Math.max(rectWidth, rectHeight),

        src = new Uint8Array(rectLength * CPColorBmp.BYTES_PER_PIXEL),
        dst = new Uint8Array(rectLength * CPColorBmp.BYTES_PER_PIXEL);

    for (var y = rect.top; y < rect.bottom; y++) {
        var
            pixOffset = this.offsetOfPixel(rect.left, y);
        
        for (var x = 0; x < rectWidthBytes; x++) {
            src[x] = this.data[pixOffset++];
        }
        
        multiplyAlpha(src, rectWidth);
        boxBlurLine(src, dst, rectWidth, radiusX);
        
        pixOffset = this.offsetOfPixel(rect.left, y);
        
        for (var x = 0; x < rectWidthBytes; x++) {
            this.data[pixOffset++] = dst[x];
        }
    }
    
    for (var x = rect.left; x < rect.right; x++) {
        this.copyPixelColumnToArray(x, rect.top, rectHeight, src);
        
        boxBlurLine(src, dst, rectHeight, radiusY);
        separateAlpha(dst, rectHeight);
        
        this.copyArrayToPixelColumn(x, rect.top, rectHeight, dst);
    }
};

CPColorBmp.prototype.offsetOfPixel = function(x, y) {
    return ((y * this.width + x) * CPColorBmp.BYTES_PER_PIXEL) | 0;
};

CPColorBmp.prototype.getMemorySize = function() {
    return this.data.length;
};

// Load from a loaded HTML Image object
CPColorBmp.prototype.loadFromImage = function(image) {
    var
        imageCanvas = document.createElement("canvas"),
        imageContext = imageCanvas.getContext("2d");

    imageCanvas.width = image.width;
    imageCanvas.height = image.height;
    
    imageContext.globalCompositeOperation = "copy";
    imageContext.drawImage(image, 0, 0);
    
    this.imageData = imageContext.getImageData(0, 0, this.width, this.height);
    this.data = this.imageData.data;
};

CPColorBmp.prototype.getImageData = function() {
    return this.imageData;
};

/**
 * Replace the image data with the provided ImageData object.
 *
 * @param imageData {ImageData}
 */
CPColorBmp.prototype.setImageData = function(imageData) {
    this.width = imageData.width;
    this.height = imageData.height;
    this.imageData = imageData;
    this.data = imageData.data;
};