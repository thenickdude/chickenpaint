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

import CPBrushInfo from "./CPBrushInfo.js";

const
    MAX_SQUEEZE = 10;

/**
 *
 * @param {Uint8Array} brush
 * @param {CPBrushInfo} brushInfo
 */
function buildBrush(brush, brushInfo) {
    let
        intSize = Math.ceil(brushInfo.curSize),

        center = intSize / 2.0,
        sqrRadius = (brushInfo.curSize / 2) * (brushInfo.curSize / 2),

        xFactor = 1.0 + brushInfo.curSqueeze * MAX_SQUEEZE,
        cosA = Math.cos(brushInfo.curAngle),
        sinA = Math.sin(brushInfo.curAngle),

        offset = 0;

    for (let j = 0; j < intSize; j++) {
        for (let i = 0; i < intSize; i++) {
            let
                x = (i + 0.5 - center),
                y = (j + 0.5 - center),
                dx = (x * cosA - y * sinA) * xFactor,
                dy = (y * cosA + x * sinA),

                sqrDist = dx * dx + dy * dy;

            if (sqrDist <= sqrRadius) {
                brush[offset++] = 0xFF;
            } else {
                brush[offset++] = 0;
            }
        }
    }
}

/**
 * @param {Uint8Array} brush
 * @param {CPBrushInfo} brushInfo
 */
function buildBrushAA(brush, brushInfo) {
    let
        intSize = Math.ceil(brushInfo.curSize),

        center = intSize / 2.0,
        sqrRadius = (brushInfo.curSize / 2) * (brushInfo.curSize / 2),
        sqrRadiusInner = ((brushInfo.curSize - 2) / 2) * ((brushInfo.curSize - 2) / 2),
        sqrRadiusOuter = ((brushInfo.curSize + 2) / 2) * ((brushInfo.curSize + 2) / 2),

        xFactor = 1.0 + brushInfo.curSqueeze * MAX_SQUEEZE,
        cosA = Math.cos(brushInfo.curAngle),
        sinA = Math.sin(brushInfo.curAngle),

        offset = 0;

    for (let j = 0; j < intSize; j++) {
        for (let i = 0; i < intSize; i++) {
            let
                x = (i + 0.5 - center),
                y = (j + 0.5 - center),
                dx = (x * cosA - y * sinA) * xFactor,
                dy = (y * cosA + x * sinA),

                sqrDist = dx * dx + dy * dy;

            if (sqrDist <= sqrRadiusInner) {
                brush[offset++] = 0xFF;
            } else if (sqrDist > sqrRadiusOuter) {
                brush[offset++] = 0;
            } else {
                let
                    count = 0;

                for (let oy = 0; oy < 4; oy++) {
                    for (let ox = 0; ox < 4; ox++) {
                        x = i + ox * (1.0 / 4.0) - center;
                        y = j + oy * (1.0 / 4.0) - center;
                        dx = (x * cosA - y * sinA) * xFactor;
                        dy = (y * cosA + x * sinA);

                        sqrDist = dx * dx + dy * dy;
                        if (sqrDist <= sqrRadius) {
                            count += 1;
                        }
                    }
                }
                brush[offset++] = Math.min(count * 16, 255);
            }
        }
    }
}

/**
 * @param {Uint8Array} brush
 * @param {CPBrushInfo} brushInfo
 */
function buildBrushSquare(brush, brushInfo) {
    let
        intSize = Math.ceil(brushInfo.curSize),
        center = intSize / 2.0,

        size = brushInfo.curSize * Math.sin(Math.PI / 4),
        sizeX = (size / 2) / (1.0 + brushInfo.curSqueeze * MAX_SQUEEZE),
        sizeY = (size / 2),

        cosA = Math.cos(brushInfo.curAngle),
        sinA = Math.sin(brushInfo.curAngle),

        offset = 0;

    for (let j = 0; j < intSize; j++) {
        for (let i = 0; i < intSize; i++) {
            let
                x = (i + 0.5 - center),
                y = (j + 0.5 - center),
                dx = Math.abs(x * cosA - y * sinA),
                dy = Math.abs(y * cosA + x * sinA);

            if (dx <= sizeX && dy <= sizeY) {
                brush[offset++] = 0xFF;
            } else {
                brush[offset++] = 0;
            }
        }
    }
}

/**
 * @param {Uint8Array} brush
 * @param {CPBrushInfo} brushInfo
 */
function buildBrushSquareAA(brush, brushInfo) {
    let
        intSize = Math.ceil(brushInfo.curSize),
        center = intSize / 2.0,

        size = brushInfo.curSize * Math.sin(Math.PI / 4),
        sizeX = (size / 2) / (1.0 + brushInfo.curSqueeze * MAX_SQUEEZE),
        sizeY = (size / 2),

        sizeXInner = sizeX - 1,
        sizeYInner = sizeY - 1,

        sizeXOuter = sizeX + 1,
        sizeYOuter = sizeY + 1,

        cosA = Math.cos(brushInfo.curAngle),
        sinA = Math.sin(brushInfo.curAngle),

        offset = 0;

    for (let j = 0; j < intSize; j++) {
        for (let i = 0; i < intSize; i++) {
            let
                x = (i + 0.5 - center),
                y = (j + 0.5 - center),
                dx = Math.abs(x * cosA - y * sinA),
                dy = Math.abs(y * cosA + x * sinA);

            if (dx <= sizeXInner && dy <= sizeYInner) {
                brush[offset++] = 0xFF;
            } else if (dx > sizeXOuter || dy > sizeYOuter) {
                brush[offset++] = 0;
            } else {
                let
                    count = 0;

                for (let oy = 0; oy < 4; oy++) {
                    for (let ox = 0; ox < 4; ox++) {
                        x = i + ox * (1.0 / 4.0) - center;
                        y = j + oy * (1.0 / 4.0) - center;
                        dx = Math.abs(x * cosA - y * sinA);
                        dy = Math.abs(y * cosA + x * sinA);

                        if (dx <= sizeX && dy <= sizeY) {
                            count++;
                        }
                    }
                }
                brush[offset++] = Math.min(count * 16, 255);
            }
        }
    }
}

/**
 *
 * @param {Uint8Array} brush
 * @param {CPBrushInfo} brushInfo
 */
function buildBrushSoft(brush, brushInfo) {
    let
        intSize = Math.ceil(brushInfo.curSize),
        center = intSize / 2.0,
        sqrRadius = (brushInfo.curSize / 2) * (brushInfo.curSize / 2),

        xFactor = 1.0 + brushInfo.curSqueeze * MAX_SQUEEZE,
        cosA = Math.cos(brushInfo.curAngle),
        sinA = Math.sin(brushInfo.curAngle),

        offset = 0;

    for (let j = 0; j < intSize; j++) {
        for (let i = 0; i < intSize; i++) {
            let
                x = (i + 0.5 - center),
                y = (j + 0.5 - center),
                dx = (x * cosA - y * sinA) * xFactor,
                dy = (y * cosA + x * sinA),

                sqrDist = dx * dx + dy * dy;

            if (sqrDist <= sqrRadius) {
                brush[offset++] = ~~(255 * (1 - (sqrDist / sqrRadius)));
            } else {
                brush[offset++] = 0;
            }
        }
    }
}


/**
 * A brush spot
 *
 * @typedef {Object} CPBrushDab
 *
 * @property {Uint8Array} brush - The brush image mask
 * @property {int} width - The size of the brush image (note, it need not occupy the entire brush array).
 * @property {int} height
 * @property {int} x - Pixel in the document where the brush will be applied
 * @property {int} y
 * @property {int} alpha
 */

/**
 * Creates and holds one cached brush at a time, with the given parameters.
 *
 * @constructor
 */
export default function CPBrushManager() {
    const
        BRUSH_MAX_DIM = 401,
        BRUSH_AA_MAX_DIM = 402;
    
    let
        brush = new Uint8Array(BRUSH_MAX_DIM * BRUSH_MAX_DIM),
        brushAA = new Uint8Array(BRUSH_AA_MAX_DIM * BRUSH_AA_MAX_DIM),
        brushAARows = [new Float32Array(BRUSH_AA_MAX_DIM), new Float32Array(BRUSH_AA_MAX_DIM)],

        cacheBrush = null,
        cacheSize, cacheSqueeze, cacheAngle, cacheTip,

        that = this;

    /**
     * Shift a brush by a positive sub-pixel amount (dx, dy) [0..1), and return the new brush.
     *
     * The resulting brush array is 1 pixel larger than the original one in both dimensions.
     *
     * @param {CPBrushInfo} brushInfo
     * @param {number} dx
     * @param {number} dy
     *
     * @returns {Uint8Array}
     */
    function createSubpixelShiftedBrush(brushInfo, dx, dy) {
        let
            nonAABrush = getBrush(brushInfo),

            intSize = Math.ceil(brushInfo.curSize),
            intSizeAA = Math.ceil(brushInfo.curSize) + 1;

        let
            invdx_invdy = (1 - dx) * (1 - dy),
            dx_invdy = dx * (1 - dy),
            dx_dy = dx * dy,
            invdx_dy = (1 - dx) * dy,

            srcIndex = 0,
            dstIndex = 0,

            curRow = brushAARows[0],
            nextRow = brushAARows[1],
            swap;

        curRow.fill(0); // Since it will be dirty from a previous call

        for (let y = 0; y < intSize; y++) {
            let x;

            nextRow[0] = 0; // We overwrite all the subsequent values in the loop, but we do need to clear this one for the first iteration's benefit

            // For all the source pixels in the row:
            for (x = 0; x < intSize; x++, srcIndex++, dstIndex++) {
                let
                    brushAlpha = nonAABrush[srcIndex];

                /*
                 * Use a weighted sum to shift the source pixels's position by a sub-pixel amount dx, dy and accumulate
                 * it into the final brushAA array.
                 */

                // We have the contribution from our previous 3 neighbours now so we can complete this output pixel
                brushAA[dstIndex] = (curRow[x] + (brushAlpha * invdx_invdy) + 0.5) | 0;

                curRow[x + 1]  += brushAlpha * dx_invdy;
                nextRow[x]     += brushAlpha * invdx_dy;
                nextRow[x + 1] = brushAlpha * dx_dy; // We're the first iteration that writes to this pixel so we needn't +=
            }

            // The final output pixel of the row doesn't have a source pixel of its own (it just gets the contribution from the previous ones)
            brushAA[dstIndex++] = (curRow[x] + 0.5) | 0;

            swap = curRow;
            curRow = nextRow;
            nextRow = swap;
        }

        // Output final residual row
        for (let x = 0; x < intSizeAA; x++, dstIndex++) {
            brushAA[dstIndex] = (curRow[x] + 0.5) | 0;
        }

        return brushAA;
    }

    /**
     * Build and return a brush that conforms to the given brush settings.
     *
     * @param {CPBrushInfo} brushInfo
     *
     * @returns {Uint8Array}
     */ 
    function getBrush(brushInfo) {
        if (cacheBrush != null && brushInfo.curSize == cacheSize && brushInfo.curSqueeze == cacheSqueeze
                && brushInfo.curAngle == cacheAngle && brushInfo.tip == cacheTip) {
            return cacheBrush;
        }
        
        switch (brushInfo.tip) {
            case CPBrushInfo.TIP_ROUND_AIRBRUSH:
                buildBrushSoft(brush, brushInfo);
            break;
            case CPBrushInfo.TIP_ROUND_AA:
                buildBrushAA(brush, brushInfo);
            break;
            case CPBrushInfo.TIP_ROUND_PIXEL:
                buildBrush(brush, brushInfo);
            break;
            case CPBrushInfo.TIP_SQUARE_AA:
                buildBrushSquareAA(brush, brushInfo);
            break;
            case CPBrushInfo.TIP_SQUARE_PIXEL:
                buildBrushSquare(brush, brushInfo);
            break;
        }

        cacheBrush = brush;
        cacheSize = brushInfo.curSize;
        cacheTip = brushInfo.tip;
        cacheSqueeze = brushInfo.curSqueeze;
        cacheAngle = brushInfo.curAngle;

        return brush;
    }

	/**
     *
     * @param {CPBrushDab} dab
     * @param {float} textureAmount
     */
    function applyTexture(dab, textureAmount) {
        let
            amount = Math.floor(textureAmount * 255),
            texture = that.texture,
            
            textureX = dab.x % texture.width,
            textureY = dab.y % texture.height,
            
            brushPos = 0,
            texturePos, textureEOL;

        if (textureX < 0) {
            textureX += texture.width;
        }

        if (textureY < 0) {
            textureY += texture.height;
        }
        
        for (let y = 0; y < dab.height; y++) {
            texturePos = textureY * texture.width + textureX;
            textureEOL = textureY * texture.width + texture.width;
            
            for (let x = 0; x < dab.width; x++) {
                let
                    brushValue = dab.brush[brushPos],
                    textureValue = texture.data[texturePos];
                
                dab.brush[brushPos] = ~~(brushValue * ((textureValue * amount / 255) ^ 0xff) / 255);
                
                brushPos++;
                
                texturePos++;
                if (texturePos == textureEOL) {
                    // Wrap to left side of texture
                    texturePos -= texture.width;
                }
            }
            
            textureY++;
            if (textureY == texture.height) {
                textureY = 0;
            }
        }
    }
    
    /**
     * Create a paint dab using the given brush at the given image co-ordinates.
     *
     * @param {number} x - Image coordinate of center of brush dab
     * @param {number} y - Image coordinate of center of brush dab
     * @param {CPBrushInfo} brushInfo - Brush appearance parameters
     *
     * @returns {CPBrushDab}
     */
    this.getDab = function(x, y, brushInfo) {
        let
            dab = {
                alpha: brushInfo.curAlpha,
                width: Math.ceil(brushInfo.curSize),
                height: Math.ceil(brushInfo.curSize)
            };

        // FIXME: I don't like this special case for ROUND_PIXEL
        // it would be better to have brush presets for working with pixels
        let
            useSubpixelShift = brushInfo.isAA && brushInfo.tip != CPBrushInfo.TIP_ROUND_PIXEL;

        if (useSubpixelShift) {
            dab.width++;
            dab.height++;
        }

        let
            // The top left corner of the brush dab
            dabX = x - dab.width / 2.0 + 0.5,
            dabY = y - dab.height / 2.0 + 0.5,

            // The pixel the top left corner lies in
            dabXInt = Math.floor(dabX),
            dabYInt = Math.floor(dabY);

        if (useSubpixelShift) {
            let
                subpixelX = dabX - dabXInt,
                subpixelY = dabY - dabYInt;
            
            dab.brush = createSubpixelShiftedBrush(brushInfo, subpixelX, subpixelY);
        } else {
            dab.brush = getBrush(brushInfo);
        }

        dab.x = dabXInt;
        dab.y = dabYInt;

        if (brushInfo.texture > 0.0 && this.texture != null) {
            // we need a brush bitmap that can be modified everytime
            // the one in "brush" can be kept in cache so if we are using it, make a copy
            if (dab.brush == brush) {
                brushAA.set(brush);
                dab.brush = brushAA;
            }
            applyTexture(dab, brushInfo.texture);
        }
        
        return dab;
    };

    this.setTexture = function(texture) {
        this.texture = texture;
    }
}
