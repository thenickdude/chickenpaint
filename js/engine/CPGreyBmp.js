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

export default function CPGreyBmp(width, height, bitDepth) {

    CPBitmap.call(this, width, height);

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

    this.clone = function() {
        var
            result = new CPGreyBmp(this.width, this.height, this.bitDepth);
        
        result.data.set(this.data);
        
        return result;
    };
    
    this.clearAll = function(value) {
        for (var i = 0; i < this.data.length; i++) {
            this.data[i] = value;
        }
    };
    
    this.clearRect = function(rect, value) {
        var
            rect = this.getBounds().clip(rect),
            yStride = this.width - rect.getWidth(),
            pixIndex = this.offsetOfPixel(rect.left, rect.top);
        
        for (var y = rect.top; y < rect.bottom; y++, pixIndex += yStride) {
            for (var x = rect.left; x < rect.right; x++, pixIndex++) {
                this.data[pixIndex] = value;
            }
        }
    };

    this.mirrorHorizontally = function() {
        var
            newData = new Uint8Array(width * height);

        for (var y = 0; y < height; y++) {
            for (var x = 0; x < width; x++) {
                newData[y * width + x] = this.data[y * width + width - x - 1];
            }
        }

        this.data = newData;
    };

    this.applyLUT = function(lut) {
        for (var i = 0; i < this.data.length; i++) {
            this.data[i] = lut.table[this.data[i]];
        }
    };
    
    this.toCanvas = function() {
        var
            imageData = this.toImageData(),
            
            canvas = document.createElement("canvas"),
            context = canvas.getContext("2d");
        
        canvas.width = this.width;
        canvas.height = this.height;
        
        context.putImageData(imageData, 0, 0);
        
        return canvas;
    };
    
    this.toImageData = function() {
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
}

CPGreyBmp.prototype.offsetOfPixel = function(x, y) {
    return y * this.width + x;
}