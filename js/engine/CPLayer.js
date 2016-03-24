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
 * Replace the pixels in the given rect with the given horizontal gradient.
 *
 * @param rect CPRect
 * @param fromX int
 * @param toX int
 * @param gradientPoints int[]
 */
CPLayer.prototype.gradientHorzReplace = function(rect, fromX, toX, gradientPoints) {
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
 * @param rect CPRect
 * @param fromY int
 * @param toY int
 * @param gradientPoints int[]
 */
CPLayer.prototype.gradientVertReplace = function(rect, fromY, toY, gradientPoints) {
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
        w = (rect.right - rect.left) | 0;

    if (toY < fromY) {
        var
            temp = toY;
        toY = fromY;
        fromY = temp;

        temp = fromColor;
        fromColor = toColor;
        toColor = temp;
    }

    var
        y = rect.top;

    // The solid color section before the start of the gradient
    for (var yEnd = Math.min(rect.bottom, fromY) | 0; y < yEnd; y++, pixIndex += yStride) {
        for (var x = 0; x < w; x++, pixIndex += CPColorBmp.BYTES_PER_PIXEL) {
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

    for (var yEnd = Math.min(rect.bottom, toY) | 0; y < yEnd; y++, pixIndex += yStride) {
        for (var x = 0; x < w; x++, pixIndex += CPColorBmp.BYTES_PER_PIXEL) {
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
        for (var x = 0; x < w; x++, pixIndex += CPColorBmp.BYTES_PER_PIXEL) {
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
CPLayer.prototype.gradientReplace = function(rect, fromX, fromY, toX, toY, gradientPoints) {
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
CPLayer.prototype.gradientAlpha = function(rect, fromX, fromY, toX, toY, gradientPoints) {
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

                alpha2 = this.data[pixIndex + ALPHA_BYTE_OFFSET],
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
 * pixels in the layer.
 *
 * @param gradientPoints Array with gradient colors (ARGB integers)
 * @param rect CPRect
 * @param replace Set to true to replace the pixels in the layer rather than blending the gradient on top of them.
 */
CPLayer.prototype.gradient = function(rect, fromX, fromY, toX, toY, gradientPoints, replace) {
    rect = this.getBounds().clip(rect);

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