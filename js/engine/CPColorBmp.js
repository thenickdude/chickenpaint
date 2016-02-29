/*
	ChibiPaint
    Copyright (c) 2006-2008 Marc Schefer

    This file is part of ChibiPaint.

    ChibiPaint is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    ChibiPaint is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with ChibiPaint. If not, see <http://www.gnu.org/licenses/>.

 */

//
// A 32bpp bitmap class (one byte per channel in RGBA order)
//

function CPColorBmp(width, height) {
    "use strict";
    
    CPBitmap.call(this, width, height);

    // The ImageData object that holds the image data
    this.imageData = new ImageData(this.width, this.height);
    
    // The bitmap data array (one byte per channel in RGBA order)
    this.data = this.imageData.data;

    // Creates a CPBitmap from a portion of this bitmap
    this.cloneRect = function(rect) {
        var
            result = new CPColorBbmp(this.width, this.height);
        
        result.setFromBitmapRect(this, rect);
        
        return result;
	};

	//
	// Pixel access with friendly clipping. Pixel will be 32-bit integer in ARGB format
	//
	this.getPixel = function(x, y) {
		x = Math.max(0, Math.min(this.width - 1, x));
		y = Math.max(0, Math.min(this.height - 1, y));

		var
		    pixIndex = this.offsetOfPixel(x, y);
		
		return (this.data[pixIndex + CPColorBmp.ALPHA_BYTE_OFFSET] << 24) 
		    | (this.data[pixIndex + CPColorBmp.RED_BYTE_OFFSET]    << 16) 
		    | (this.data[pixIndex + CPColorBmp.GREEN_BYTE_OFFSET]  << 8) 
		    | this.data[pixIndex + CPColorBmp.BLUE_BYTE_OFFSET];
	}

	//
	// Get an r,g,b,a array of the xor of this bitmap and the given one, within the given rectangle
	//
	this.copyRectXOR = function(bmp, rect) {
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
	}

	this.setRectXOR = function(buffer, rect) {
	    rect = this.getBounds().clip(rect);
        
        var 
            w = rect.getWidth(),
            h = rect.getHeight(),
            
            bmp1Index = this.offsetOfPixel(rect.left, rect.top),
            bufferIndex = 0,
            
            bmp1YSkip = (this.width - w) * CPColorBmp.BYTES_PER_PIXEL,
            
            widthBytes = w * CPColorBmp.BYTES_PER_PIXEL;
        
        for (var y = rect.top; y < rect.bottom; y++) {
            for (var x = 0; x < widthBytes; x++) {
                this.data[bmp1Index++] ^= buffer[bufferIndex++];
            }
            bmp1Index += bmp1YSkip;
        }
	};

	//
	// Copy another bitmap into this one using alpha blending
	//
	this.pasteAlphaRect = function(bmp, srcRect, x, y) {
		var
		    srcRectCpy = srcRect.clone(),
		    dstRect = new CPRect(x, y, 0, 0);
		
		this.getBounds().clipSourceDest(srcRectCpy, dstRect);

        var
            srcYStride = (bmp.width - dstRect.getWidth()) * CPColorBmp.BYTES_PER_PIXEL,
            dstYStride = (this.width - dstRect.getWidth()) * CPColorBmp.BYTES_PER_PIXEL,
            
            srcOffset = bmp.offsetOfPixel(srcRectCpy.left, srcRectCpy.top)
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
                        this.data[dstOffset++] = that.data[srcOffset++];
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
    
                    for (var i = 0; i < 3; i++, dstIndex++, srcIndex++) {
                        this.data[dstIndex] = (bmp.data[srcIndex] + (this.data[dstIndex] * invAlpha - bmp.data[srcIndex] * invAlpha) / 255) | 0;
                    }
                    this.data[dstIndex++] = newAlpha;
                    srcIndex++;
                } else {
                    dstIndex += CPColorBmp.BYTES_PER_PIXEL;
                    srcIndex += CPColorBmp.BYTES_PER_PIXEL;
                }
            }
        }
	}

	// Sets the content at the origin of this CPBitmap using a rect from another bitmap
	this.setFromBitmapRect = function(bmp, rect) {
        var 
            w = rect.getWidth(),
            h = rect.getHeight(),
            
            dstIndex = 0, // Set at the top left position in the destination
            srcIndex = bmp.offsetOfPixel(rect.left, rect.top),
            
            dstYSkip = (this.width - w) * CPColorBmp.BYTES_PER_PIXEL,
            srcYSkip = (bmp.width - w) * CPColorBmp.BYTES_PER_PIXEL,
            
            widthBytes = w * CPColorBmp.BYTES_PER_PIXEL;
        
        for (var y = 0; y < h; y++) {
            for (var x = 0; x < widthBytes; x++) {
                this.data[dstIndex++] = bmp.data[srcIndex++];
            }
            srcIndex += srcYSkip;
            dstIndex += dstYSkip;
        }
	}

	this.pasteBitmap = function(bmp, x, y) {
		var
		    srcRect = bmp.getBounds(),
		    dstRect = new CPRect(x, y, 0, 0);
		
		getBounds().clipSourceDest(srcRect, dstRect);

        var 
            w = srcRect.getWidth(),
            h = srcRect.getHeight(),
            
            dstIndex = bmp.offsetOfPixel(dstRect.left, dstRect.top),
            srcIndex = bmp.offsetOfPixel(srcRect.left, srcRect.top),
            
            dstYSkip = (this.width - w) * CPColorBmp.BYTES_PER_PIXEL,
            srcYSkip = (bmp.width - w) * CPColorBmp.BYTES_PER_PIXEL,
            
            widthBytes = w * CPColorBmp.BYTES_PER_PIXEL;
        
        for (var y = 0; y < h; y++) {
            for (var x = 0; x < widthBytes; x++) {
                this.data[dstIndex++] = bmp.data[srcIndex++];
            }
            srcIndex += srcYSkip;
            dstIndex += dstYSkip;
        }
	};

	//
	// Copies the Alpha channel from another bitmap. Assumes both bitmaps are the same width.
	//
	this.copyAlphaFrom = function(bmp, rect) {
	    rect.clip(this.getBounds());

        var 
            w = rect.getWidth(),
            h = rect.getHeight(),
            
            pixIndex = this.offsetOfPixel(rect.left, rect.top),
            ySkip = (this.width - w) * CPColorBmp.BYTES_PER_PIXEL;
        
        for (var y = 0; y < h; y++) {
            for (var x = 0; x < w; x++) {
                this.data[pixIndex + CPColorBmp.ALPHA_BYTE_INDEX] = bmp.data[pixIndex + CPColorBmp.ALPHA_BYTE_INDEX];
                pixIndex += CPColorBmp.BYTES_PER_PIXEL;
            }
            pixIndex += ySkip;
        }
	};

	this.copyDataFrom = function(bmp) {
		if (bmp.width != this.width || bmp.height != this.height) {
			this.width = bmp.width;
			this.height = bmp.height;
			
			this.imageData = new ImageData(this.width, this.height);
			this.data = this.imageData.data;
		}

		for (var i = 0; i < this.data.length; i++) { 
		    this.data[i] = bmp.data[i];
		}
	};

	/**
	 * Flood fill the given color starting from the given point
	 * @param x int
	 * @param y int
	 * @param color int
	 */
	this.floodFill = function(x, y, color) {
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
	}

	/*
    this.boxBlur = function(r, radiusX, radiusY) {
        r = this.getBounds().clip(r);

		int w = rect.getWidth();
		int h = rect.getHeight();
		int l = Math.max(w, h);

		int[] src = new int[l];
		int[] dst = new int[l];

		for (int j = rect.top; j < rect.bottom; j++) {
			System.arraycopy(data, rect.left + j * width, src, 0, w);
			multiplyAlpha(src, w);
			boxBlurLine(src, dst, w, radiusX);
			System.arraycopy(dst, 0, data, rect.left + j * width, w);
		}

		for (int i = rect.left; i < rect.right; i++) {
			copyColumnToArray(i, rect.top, h, src);
			boxBlurLine(src, dst, h, radiusY);
			separateAlpha(dst, h);
			copyArrayToColumn(i, rect.top, h, dst);
		}
	}

	public void multiplyAlpha(int[] buffer, int len) {
		for (int i = 0; i < len; i++) {
			buffer[i] = buffer[i] & 0xff000000 | ((buffer[i] >>> 24) * (buffer[i] >>> 16 & 0xff) / 255) << 16
					| ((buffer[i] >>> 24) * (buffer[i] >>> 8 & 0xff) / 255) << 8 | (buffer[i] >>> 24)
					* (buffer[i] & 0xff) / 255;
		}
	}

	public void separateAlpha(int[] buffer, int len) {
		for (int i = 0; i < len; i++) {
			if ((buffer[i] & 0xff000000) != 0) {
				buffer[i] = buffer[i] & 0xff000000
						| Math.min((buffer[i] >>> 16 & 0xff) * 255 / (buffer[i] >>> 24), 255) << 16
						| Math.min((buffer[i] >>> 8 & 0xff) * 255 / (buffer[i] >>> 24), 255) << 8
						| Math.min((buffer[i] & 0xff) * 255 / (buffer[i] >>> 24), 255);
			}
		}
	}

	public void boxBlurLine(int[] src, int dst[], int len, int radius) {
		int s, ta, tr, tg, tb;
		s = ta = tr = tg = tb = 0;
		int pix;

		for (int i = 0; i < radius && i <= len; i++) {
			pix = src[i];
			ta += pix >>> 24;
			tr += (pix >>> 16) & 0xff;
			tg += (pix >>> 8) & 0xff;
			tb += pix & 0xff;
			s++;
		}
		for (int i = 0; i < len; i++) {
			if (i + radius < len) {
				pix = src[i + radius];
				ta += pix >>> 24;
				tr += (pix >>> 16) & 0xff;
				tg += (pix >>> 8) & 0xff;
				tb += pix & 0xff;
				s++;
			}

			dst[i] = (ta / s << 24) | (tr / s << 16) | (tg / s << 8) | tb / s;

			if (i - radius >= 0) {
				pix = src[i - radius];
				ta -= pix >>> 24;
				tr -= (pix >>> 16) & 0xff;
				tg -= (pix >>> 8) & 0xff;
				tb -= pix & 0xff;
				s--;
			}
		}
	}

	public void copyColumnToArray(int x, int y, int len, int[] buffer) {
		for (int i = 0; i < len; i++) {
			buffer[i] = data[x + (i + y) * width];
		}
	}

	public void copyArrayToColumn(int x, int y, int len, int[] buffer) {
		for (int i = 0; i < len; i++) {
			data[x + (i + y) * width] = buffer[i];
		}
	}*/
}

CPColorBmp.BYTES_PER_PIXEL = 4;
CPColorBmp.RED_BYTE_OFFSET = 0;
CPColorBmp.GREEN_BYTE_OFFSET = 1;
CPColorBmp.BLUE_BYTE_OFFSET = 2;
CPColorBmp.ALPHA_BYTE_OFFSET = 3;

CPColorBmp.prototype = Object.create(CPBitmap.prototype);
CPColorBmp.prototype.constructor = CPColorBmp;

CPColorBmp.prototype.offsetOfPixel = function(x, y) {
    return (y * this.width + x) * CPColorBmp.BYTES_PER_PIXEL;
};

CPColorBmp.prototype.getMemorySize = function() {
    return this.data.length;
};