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

function CPBrushManager() {
    "use strict";
    
    var 
        MAX_SQUEEZE = 10;
    
    /*CPBrushDab {
        // the brush
        Uint8Array brush;
        int width, height;
        
        // and where and how to apply it
        int x, y, alpha;
    }*/
    
    var
        brush = new Uint8Array(201 * 201),
        brushAA = new Uint8Array(202 * 202),

	    cacheBrush,
	    cacheSize, cacheSqueeze, cacheAngle,
	    cacheType,

	    texture; // A CPGreyBmp

    function getBrushWithAA(brushInfo, dx, dy) {
        var
            nonAABrush = getBrush(brushInfo);

        var 
            intSize = Math.ceil(brushInfo.curSize),
            intSizeAA = Math.ceil(brushInfo.curSize) + 1;

        for (var y = 0; y < intSizeAA; y++) {
            for (var x = 0; x < intSizeAA; x++) {
                brushAA[y * intSizeAA + x] = 0;
            }
        }

        for (var y = 0; y < intSize; y++) {
            for (var x = 0; x < intSize; x++) {
                var 
                    brushAlpha = nonAABrush[y * intSize + x];

                brushAA[y * intSizeAA + x] += ~~(brushAlpha * (1 - dx) * (1 - dy));
                brushAA[y * intSizeAA + (x + 1)] += ~~(brushAlpha * dx * (1 - dy));
                brushAA[(y + 1) * intSizeAA + x + 1] += ~~(brushAlpha * dx * dy);
                brushAA[(y + 1) * intSizeAA + x] += ~~(brushAlpha * (1 - dx) * dy);
            }
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
                    x = (u + 0.5 - center),
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
            offset = 0;
        
        for (var y = 0; y < dab.height; y++) {
            for (var x = 0; x < dab.width; x++) {
                var 
                    brushValue = dab.brush[offset],
                    textureX = (x + dab.x) % texture.width;
                
                if (textureX < 0) {
                    textureX += texture.width;
                }

                var 
                    textureY = (y + dab.y) % texture.height;
                
                if (textureY < 0) {
                    textureY += texture.height;
                }

                var 
                    textureValue = texture.data[textureX + textureY * texture.width];
                
                dab.brush[offset] = ~~(brushValue * ((textureValue * amount / 255) ^ 0xff) / 255);
                offset++;
            }
        }
    }
    
    /**
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

		if (brushInfo.texture > 0.0 && texture != null) {
			// we need a brush bitmap that can be modified everytime
			// the one in "brush" can be kept in cache so if we are using it, make a copy
			if (dab.brush == brush) {
			    for (var i = 0; i < dab.width * dab.height; i++) {
			        brushAA[i] = brush[i];
			    }
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
