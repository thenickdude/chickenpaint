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

import CPColorBmp from './CPColorBmp';
import CPBlend from './CPBlend';

/**
 * Note layer is not cleared to any specific values upon initial creation, use clearAll().
 */
export default function CPLayer(width, height, name) {
    // Super-constructor
    CPColorBmp.call(this, width, height);
    
    this.name = name || "";
    
    this.alpha = 100;
    this.visible = true;
    this.blendMode = CPLayer.LM_NORMAL;
}

CPLayer.prototype = Object.create(CPColorBmp.prototype);
CPLayer.prototype.constructor = CPLayer;

const
    BYTES_PER_PIXEL = 4,
    
    RED_BYTE_OFFSET = 0,
    GREEN_BYTE_OFFSET = 1,
    BLUE_BYTE_OFFSET = 2,
    ALPHA_BYTE_OFFSET = 3,
    
    blend = new CPBlend();

CPLayer.prototype.fusionWith = function(fusion, rect) {
    if (this.alpha <= 0) {
        return;
    }
    
    rect = this.getBounds().clip(rect);
    
    switch (this.blendMode) {
        case CPLayer.LM_NORMAL:
            if (this.alpha >= 100) {
                blend.fusionWithNormalNoAlpha(this, fusion, rect);
            } else {
                blend.fusionWithNormal(this, fusion, rect);
            }
            break;
        
        case CPLayer.LM_MULTIPLY:
            blend.fusionWithMultiply(this, fusion, rect);
            break;

        case CPLayer.LM_ADD:
            blend.fusionWithAdd(this, fusion, rect);
            break;

        case CPLayer.LM_SCREEN:
            blend.fusionWithScreen(this, fusion, rect);
            break;

        case CPLayer.LM_LIGHTEN:
            blend.fusionWithLighten(this, fusion, rect);
            break;

        case CPLayer.LM_DARKEN:
            blend.fusionWithDarken(this, fusion, rect);
            break;

        case CPLayer.LM_SUBTRACT:
            blend.fusionWithSubtract(this, fusion, rect);
            break;

        case CPLayer.LM_DODGE:
            blend.fusionWithDodge(this, fusion, rect);
            break;

        case CPLayer.LM_BURN:
            blend.fusionWithBurn(this, fusion, rect);
            break;

        case CPLayer.LM_OVERLAY:
            blend.fusionWithOverlay(this, fusion, rect);
            break;

        case CPLayer.LM_HARDLIGHT:
            blend.fusionWithHardLightFullAlpha(this, fusion, rect);
            break;

        case CPLayer.LM_SOFTLIGHT:
            blend.fusionWithSoftLightFullAlpha(this, fusion, rect);
            break;

        case CPLayer.LM_VIVIDLIGHT:
            blend.fusionWithVividLightFullAlpha(this, fusion, rect);
            break;

        case CPLayer.LM_LINEARLIGHT:
            blend.fusionWithLinearLightFullAlpha(this, fusion, rect);
            break;

        case CPLayer.LM_PINLIGHT:
            blend.fusionWithPinLightFullAlpha(this, fusion, rect);
            break;
    }
};

CPLayer.prototype.fusionWithFullAlpha = function(fusion, rect) {
    if (this.alpha <= 0) {
        return;
    }
    
    rect = this.getBounds().clip(rect);

    switch (this.blendMode) {
        case CPLayer.LM_NORMAL:
            blend.fusionWithNormalFullAlpha(this, fusion, rect);
            break;
        
        case CPLayer.LM_MULTIPLY:
            blend.fusionWithMultiplyFullAlpha(this, fusion, rect);
            break;

        case CPLayer.LM_ADD:
            blend.fusionWithAddFullAlpha(this, fusion, rect);
            break;
            
        case CPLayer.LM_SCREEN:
            blend.fusionWithScreenFullAlpha(this, fusion, rect);
            break;

        case CPLayer.LM_LIGHTEN:
            blend.fusionWithLightenFullAlpha(this, fusion, rect);
            break;

        case CPLayer.LM_DARKEN:
            blend.fusionWithDarkenFullAlpha(this, fusion, rect);
            break;

        case CPLayer.LM_SUBTRACT:
            blend.fusionWithSubtractFullAlpha(this, fusion, rect);
            break;
            
        case CPLayer.LM_DODGE:
            blend.fusionWithDodgeFullAlpha(this, fusion, rect);
            break;

        case CPLayer.LM_BURN:
            blend.fusionWithBurnFullAlpha(this, fusion, rect);
            break;

        case CPLayer.LM_OVERLAY:
            blend.fusionWithOverlayFullAlpha(this, fusion, rect);
            break;

        case CPLayer.LM_HARDLIGHT:
            blend.fusionWithHardLightFullAlpha(this, fusion, rect);
            break;

        case CPLayer.LM_SOFTLIGHT:
            blend.fusionWithSoftLightFullAlpha(this, fusion, rect);
            break;

        case CPLayer.LM_VIVIDLIGHT:
            blend.fusionWithVividLightFullAlpha(this, fusion, rect);
            break;

        case CPLayer.LM_LINEARLIGHT:
            blend.fusionWithLinearLightFullAlpha(this, fusion, rect);
            break;

        case CPLayer.LM_PINLIGHT:
            blend.fusionWithPinLightFullAlpha(this, fusion, rect);
            break;
    }
};

CPLayer.prototype.clearAll = function(color) {
    var
        a = (color >> 24) & 0xFF,
        r = (color >> 16) & 0xFF,
        g = (color >> 8) & 0xFF,
        b = color & 0xFF;
    
    for (var i = 0; i < this.width * this.height * BYTES_PER_PIXEL; ) {
        this.data[i++] = r;
        this.data[i++] = g;
        this.data[i++] = b;
        this.data[i++] = a;
    }
};

CPLayer.prototype.clearRect = function(rect, color) {
    var
        a = (color >> 24) & 0xFF,
        r = (color >> 16) & 0xFF,
        g = (color >> 8) & 0xFF,
        b = color & 0xFF;
    
    var
        rect = this.getBounds().clip(rect),
        yStride = (this.width - rect.getWidth()) * BYTES_PER_PIXEL,
        
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
 * @param source CPLayer
 */
CPLayer.prototype.copyRegionHFlip = function(rect, source) {
    rect = this.getBounds().clip(rect);

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
 * @param source CPLayer
 */
CPLayer.prototype.copyRegionVFlip = function(rect, source) {
    rect = this.getBounds().clip(rect);
    
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
}

/**
 * @param r CPRect
 */
CPLayer.prototype.fillWithNoise = function(rect) {
    rect = this.getBounds().clip(rect);

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
 * @param r CPRect
 */
CPLayer.prototype.fillWithColorNoise = function(rect) {
    rect = this.getBounds().clip(rect);

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
 * @param r CPRect
 */
CPLayer.prototype.invert = function(rect) {
    rect = this.getBounds().clip(rect);

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

CPLayer.prototype.getAlpha = function() {
    return this.alpha;
};

CPLayer.prototype.getBlendMode = function() {
    return this.blendMode;
};

CPLayer.prototype.copyFrom = function(layer) {
    this.name = layer.name;
    this.blendMode = layer.blendMode;
    this.alpha = layer.alpha;
    this.visible = layer.visible;

    this.copyDataFrom(layer);
};

// Do we have any non-opaque pixels in the entire layer?
CPLayer.prototype.hasAlpha = function() {
    if (this.alpha != 100) {
        return true;
    }
    
    var 
        pixIndex = ALPHA_BYTE_OFFSET;
    
    for (var y = 0; y < height; y++) {
        var
            alphaAnded = 0xFF;
        
        for (var x = 0; x < this.width; x++, pixIndex += BYTES_PER_PIXEL) {
            alphaAnded &= this.data[pixIndex];
        }
        
        // Only check once per row in order to reduce branching in the inner loop
        if (alphaAnded != 0xFF) {
            return true;
        }
    }
    
    return false;
};

// Do we have any semi-transparent pixels in the given rectangle?
CPLayer.prototype.hasAlphaInRect = function(rect) {
    if (this.alpha != 100) {
        return true;
    }

    rect = this.getBounds().clip(rect);

    var 
        yStride = (this.width - rect.getWidth()) * BYTES_PER_PIXEL,
        pixIndex = this.offsetOfPixel(rect.left, rect.top) + ALPHA_BYTE_OFFSET;
    
    for (var y = rect.top; y < rect.bottom; y++, pixIndex += yStride) {
        var
            alphaAnded = 0xFF;
        
        for (var x = rect.left; x < rect.right; x++, pixIndex += BYTES_PER_PIXEL) {
            alphaAnded &= this.data[pixIndex];
        }
        
        // Only check once per row in order to reduce branching in the inner loop
        if (alphaAnded != 0xFF) {
            return true;
        }
    }
    
    return false;
};

// Return the canvas ImageData that backs this layer
CPLayer.prototype.getImageData = function() {
    return this.imageData;
};

CPLayer.LM_NORMAL = 0;
CPLayer.LM_MULTIPLY = 1;
CPLayer.LM_ADD = 2;
CPLayer.LM_SCREEN = 3;
CPLayer.LM_LIGHTEN = 4;
CPLayer.LM_DARKEN = 5;
CPLayer.LM_SUBTRACT = 6;
CPLayer.LM_DODGE = 7;
CPLayer.LM_BURN = 8;
CPLayer.LM_OVERLAY = 9;
CPLayer.LM_HARDLIGHT = 10;
CPLayer.LM_SOFTLIGHT = 11;
CPLayer.LM_VIVIDLIGHT = 12;
CPLayer.LM_LINEARLIGHT = 13;
CPLayer.LM_PINLIGHT = 14;

CPLayer.prototype.makeLookUpTables = function() {
    // V - V^2 table
    CPLayer.prototype.softLightLUTSquare = new Array(256);
    
    for (var i = 0; i < 256; i++) {
        var 
            v = i / 255.;
        
        CPLayer.prototype.softLightLUTSquare[i] = ((v - v * v) * 255.) | 0;
    }

    // sqrt(V) - V table
    CPLayer.prototype.softLightLUTSquareRoot = new Array(256);
    for (var i = 0; i < 256; i++) {
        var
            v = i / 255.;
        
        CPLayer.prototype.softLightLUTSquareRoot[i] = ((Math.sqrt(v) - v) * 255.) | 0;
    }
};

CPLayer.prototype.setAlpha = function(alpha) {
    this.alpha = alpha;
};

CPLayer.prototype.setBlendMode = function(blendMode) {
    this.blendMode = blendMode;
};

CPLayer.prototype.getAlpha = function() {
    return this.alpha;
};

CPLayer.prototype.getBlendMode = function() {
    return this.blendMode;
};

/**
 * Returns a new canvas with a rotated version of the given canvas.
 * 
 * Rotation is [0..3] and selects a multiple of 90 degrees of clockwise rotation to be applied.
 */
function getRotatedCanvas(canvas, rotation) {
    rotation = rotation % 4;
    
    if (rotation == 0) {
        return canvas;
    }
    
    var
        rotatedCanvas = document.createElement("canvas"),
        rotatedCanvasContext = rotatedCanvas.getContext("2d");

    if (rotation % 2 == 0) {
        rotatedCanvas.width = canvas.width;
        rotatedCanvas.height = canvas.height;
    } else {
        rotatedCanvas.width = canvas.height;
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
 * Get the layer as a PNG image.
 * 
 * Rotation is [0..3] and selects a multiple of 90 degrees of clockwise rotation to be applied, or 0 to leave
 * unrotated.
 */
CPLayer.prototype.getAsPNG = function(rotation) {
    var
        canvas = document.createElement("canvas"),
        canvasContext = canvas.getContext("2d");
    
    // First draw our image data onto a canvas...
    canvas.width = this.imageData.width;
    canvas.height = this.imageData.height;
    
    canvasContext.putImageData(this.imageData, 0, 0);
    
    // Rotate it if needed
    canvas = getRotatedCanvas(canvas, rotation || 0);
    
    return decodeBase64PNGDataURL(canvas.toDataURL('image/png'));
};

CPLayer.prototype.makeLookUpTables();