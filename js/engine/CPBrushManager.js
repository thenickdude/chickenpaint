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

import CPBrushInfo from "./CPBrushInfo";

export default function CPBrushManager() {
    const
        MAX_SQUEEZE = 10,
        BRUSH_MAX_DIM = 201,
        BRUSH_AA_MAX_DIM = 202;
    
    /*CPBrushDab {
        // the brush
        Uint8Array brush;
        int width, height;
        
        // and where and how to apply it
        int x, y, alpha;
    }*/
    
    var
        brush = new Uint8Array(BRUSH_MAX_DIM * BRUSH_MAX_DIM),
        brushAA = new Uint8Array(BRUSH_AA_MAX_DIM * BRUSH_AA_MAX_DIM),

        cacheBrush = null,
        cacheSize, cacheSqueeze, cacheAngle,
        cacheType,

        that = this; 

    /**
     * Shift a brush by a positive sub-pixel amount (dx, dy) [0..1), and return the new brush. 
     * 
     * The resulting brush array is 1 pixel larger than the original one in both dimensions.
     */
    function getBrushWithAA(brushInfo, dx, dy) {
        var
            nonAABrush = getBrush(brushInfo),

            intSize = Math.ceil(brushInfo.curSize),
            intSizeAA = Math.ceil(brushInfo.curSize) + 1;
        
        for (var x = 0; x < intSizeAA * intSizeAA; x++) {
            brushAA[x] = 0;
        }
        
        var
            invdx_invdy = (1 - dx) * (1 - dy),
            dx_invdy = dx * (1 - dy),
            dx_dy = dx * dy,
            invdx_dy = (1 - dx) * dy,
            
            srcIndex = 0,
            dstIndex = 0;
        
        for (var y = 0; y < intSize; y++) {
            for (var x = 0; x < intSize; x++) {
                var 
                    brushAlpha = nonAABrush[srcIndex];

                /* 
                 * Use a weighted sum to shift the source pixels's position by a sub-pixel amount dx, dy and accumulate
                 * it into the final brushAA array.
                 */
                brushAA[dstIndex] += ~~(brushAlpha * invdx_invdy);
                brushAA[dstIndex + 1] += ~~(brushAlpha * dx_invdy);
                brushAA[dstIndex + 1 + intSizeAA] += ~~(brushAlpha * dx_dy);
                brushAA[dstIndex + intSizeAA] += ~~(brushAlpha * invdx_dy);
                
                srcIndex++;
                dstIndex++;
            }
            dstIndex += intSizeAA - intSize;
        }

        return brushAA;
    }

    function buildBrush(brush, brushInfo) {
        var
            intSize = Math.ceil(brushInfo.curSize),
            
            center = intSize / 2.0,
            sqrRadius = (brushInfo.curSize / 2) * (brushInfo.curSize / 2),
    
            xFactor = 1.0 + brushInfo.curSqueeze * MAX_SQUEEZE,
            cosA = Math.cos(brushInfo.curAngle),
            sinA = Math.sin(brushInfo.curAngle),
    
            offset = 0;
        
        for (var j = 0; j < intSize; j++) {
            for (var i = 0; i < intSize; i++) {
                var 
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

        return brush;
    }

    function buildBrushAA(brush, brushInfo) {
        var
            intSize = Math.ceil(brushInfo.curSize),
            
            center = intSize / 2.0,
            sqrRadius = (brushInfo.curSize / 2) * (brushInfo.curSize / 2),
            sqrRadiusInner = ((brushInfo.curSize - 2) / 2) * ((brushInfo.curSize - 2) / 2),
            sqrRadiusOuter = ((brushInfo.curSize + 2) / 2) * ((brushInfo.curSize + 2) / 2),

            xFactor = 1.0 + brushInfo.curSqueeze * MAX_SQUEEZE,
            cosA = Math.cos(brushInfo.curAngle),
            sinA = Math.sin(brushInfo.curAngle),

            offset = 0;
        
        for (var j = 0; j < intSize; j++) {
            for (var i = 0; i < intSize; i++) {
                var 
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
                    var 
                        count = 0;
                    
                    for (var oy = 0; oy < 4; oy++) {
                        for (var ox = 0; ox < 4; ox++) {
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

        return brush;
    }

    function buildBrushSquare(brush, brushInfo) {
        var
            intSize = Math.ceil(brushInfo.curSize),
            center = intSize / 2.0,

            size = brushInfo.curSize * Math.sin(Math.PI / 4),
            sizeX = (size / 2) / (1.0 + brushInfo.curSqueeze * MAX_SQUEEZE),
            sizeY = (size / 2),

            cosA = Math.cos(brushInfo.curAngle),
            sinA = Math.sin(brushInfo.curAngle),

            offset = 0;
        
        for (var j = 0; j < intSize; j++) {
            for (var i = 0; i < intSize; i++) {
                var 
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

        return brush;
    }

    function buildBrushSquareAA(brush, brushInfo) {
        var
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
        
        for (var j = 0; j < intSize; j++) {
            for (var i = 0; i < intSize; i++) {
                var 
                    x = (i + 0.5 - center),
                    y = (j + 0.5 - center),
                    dx = Math.abs(x * cosA - y * sinA),
                    dy = Math.abs(y * cosA + x * sinA);

                if (dx <= sizeXInner && dy <= sizeYInner) {
                    brush[offset++] = 0xFF;
                } else if (dx > sizeXOuter || dy > sizeYOuter) {
                    brush[offset++] = 0;
                } else {
                    var
                        count = 0;
                    
                    for (var oy = 0; oy < 4; oy++) {
                        for (var ox = 0; ox < 4; ox++) {
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

        return brush;
    }

    function buildBrushSoft(brush, brushInfo) {
        var
            intSize = Math.ceil(brushInfo.curSize),
            center = intSize / 2.0,
            sqrRadius = (brushInfo.curSize / 2) * (brushInfo.curSize / 2),

            xFactor = 1.0 + brushInfo.curSqueeze * MAX_SQUEEZE,
            cosA = Math.cos(brushInfo.curAngle),
            sinA = Math.sin(brushInfo.curAngle),

            offset = 0;
        
        for (var j = 0; j < intSize; j++) {
            for (var i = 0; i < intSize; i++) {
                var 
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

        return brush;
    } 
    
    /**
     * Build and return a brush that conforms to the given brush settings.
     * 
     * @returns a Uint8Array
     */ 
    function getBrush(brushInfo) {
        if (cacheBrush != null && brushInfo.curSize == cacheSize && brushInfo.curSqueeze == cacheSqueeze
                && brushInfo.curAngle == cacheAngle && brushInfo.type == cacheType) {
            return cacheBrush;
        }
        
        switch (brushInfo.type) {
            case CPBrushInfo.B_ROUND_AIRBRUSH:
                brush = buildBrushSoft(brush, brushInfo);
            break;
            case CPBrushInfo.B_ROUND_AA:
                brush = buildBrushAA(brush, brushInfo);
            break;
            case CPBrushInfo.B_ROUND_PIXEL:
                brush = buildBrush(brush, brushInfo);
            break;
            case CPBrushInfo.B_SQUARE_AA:
                brush = buildBrushSquareAA(brush, brushInfo);
            break;
            case CPBrushInfo.B_SQUARE_PIXEL:
                brush = buildBrushSquare(brush, brushInfo);
            break;
        }

        cacheBrush = brush;
        cacheSize = brushInfo.curSize;
        cacheType = brushInfo.type;
        cacheSqueeze = brushInfo.curSqueeze;
        cacheAngle = brushInfo.curAngle;

        return brush;
    }
    
    function applyTexture(dab, textureAmount) {
        var 
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
        
        for (var y = 0; y < dab.height; y++) {
            texturePos = textureY * texture.width + textureX;
            textureEOL = textureY * texture.width + texture.width;
            
            for (var x = 0; x < dab.width; x++) {
                var 
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
     * @param x float
     * @param y float
     * brushInfo - a CPBrushInfo object
     */
    this.getDab = function(x, y, brushInfo) {
        var 
            dab = {
                alpha: brushInfo.curAlpha,
                width: Math.ceil(brushInfo.curSize),
                height: Math.ceil(brushInfo.curSize)
            };

        // FIXME: I don't like this special case for ROUND_PIXEL
        // it would be better to have brush presets for working with pixels
        var useAA = brushInfo.isAA && brushInfo.type != CPBrushInfo.B_ROUND_PIXEL;

        if (useAA) {
            dab.width++;
            dab.height++;
        }

        var
            nx = x - dab.width / 2.0 + 0.5,
            ny = y - dab.height / 2.0 + 0.5;

        // this is necessary as Java uses convert towards zero float to int conversion
        if (nx < 0) {
            nx -= 1;
        }
        if (ny < 0) {
            ny -= 1;
        }

        if (useAA) {
            var
                dx = Math.abs(nx - ~~nx),
                dy = Math.abs(ny - ~~ny);
            
            dab.brush = getBrushWithAA(brushInfo, dx, dy);
        } else {
            dab.brush = getBrush(brushInfo);
        }

        dab.x = ~~nx;
        dab.y = ~~ny;

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
    }

    this.setTexture = function(texture) {
        this.texture = texture;
    }
}
