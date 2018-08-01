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

/**
 * @param {Object} properties - Non-default properties to set on the brush
 *
 * @property {int} alpha - The user-chosen alpha of this brush
 * @property {float} alphaScale - A scale factor applied to curAlpha before drawing
 * @property {int} curAlpha - The current alpha after pen pressure etc. has been applied
 *
 * @property {int} spacing
 * @property {int} minSpacing
 * 
 * @property {int} size - The user-chosen size of this brush
 * @property {int} curSize - The current size of the brush after pen pressure has been applied
 *
 * @property {int} brushMode - Selects the CPBrushTool that will be used to render the brush (CPBrushInfo.BRUSH_MODE_*)
 * @property {int} paintMode - Controls how paint builds up on the canvas during painting (for brush modes that don't
 * override the default paintDab() function). (CPBrushInfo.PAINT_MODE_*)
 * @property {int} strokeMode - How stroke points will be connected during drawing (CPBrushInfo.STROKE_MODE_*)
 * @property {int} tip - Kind of brush tip to be used (CPBrushInfo.TIP_*)
 *
 * @property {number} scattering
 * @property {number} curScattering
 * @property {number} angle
 * @property {number} resat - 0-1.0, controls how much of the user's selected paint color is mixed into the brush while painting.
 * @property {number} bleed - 0-1.0, controls how much of the color from the canvas is picked up by the brush.
 *
 * @property {boolean} isAA
 *
 * @constructor
 */
export default function CPBrushInfo(properties) {
    var
        propName;

    // Set brush setting fields with default values, then apply the supplied 'properties' on top
    for (propName in CPBrushInfo.DEFAULTS) {
        if (CPBrushInfo.DEFAULTS.hasOwnProperty(propName)) {
            this[propName] = CPBrushInfo.DEFAULTS[propName];
        }
    }
    
    for (propName in properties) {
        if (properties.hasOwnProperty(propName)) {
            this[propName] = properties[propName];
        }
    }
}

// Stroke modes
CPBrushInfo.STROKE_MODE_FREEHAND = 0;
CPBrushInfo.STROKE_MODE_LINE = 1;
CPBrushInfo.STROKE_MODE_BEZIER = 2;

// Brush dab types
CPBrushInfo.TIP_ROUND_PIXEL = 0;
CPBrushInfo.TIP_ROUND_AA = 1;
CPBrushInfo.TIP_ROUND_AIRBRUSH = 2;
CPBrushInfo.TIP_SQUARE_PIXEL = 3;
CPBrushInfo.TIP_SQUARE_AA = 4;

CPBrushInfo.BRUSH_MODE_PAINT = 0;
CPBrushInfo.BRUSH_MODE_ERASE = 1;
CPBrushInfo.BRUSH_MODE_DODGE = 2;
CPBrushInfo.BRUSH_MODE_BURN = 3;
CPBrushInfo.BRUSH_MODE_WATER = 4;
CPBrushInfo.BRUSH_MODE_BLUR = 5;
CPBrushInfo.BRUSH_MODE_SMUDGE = 6;
CPBrushInfo.BRUSH_MODE_OIL = 7;

CPBrushInfo.PAINT_MODE_OPACITY = 0;
CPBrushInfo.PAINT_MODE_FLOW = 1;

CPBrushInfo.DEFAULTS = {
    isAA: false,
    minSpacing: 0, spacing: 0,
    
    pressureSize: true,
    pressureAlpha: false,
    pressureScattering: false,
    alphaScale: 1.0,
    
    tip: CPBrushInfo.TIP_ROUND_PIXEL,
    brushMode: CPBrushInfo.BRUSH_MODE_PAINT, 
    paintMode: CPBrushInfo.PAINT_MODE_OPACITY,
    strokeMode: CPBrushInfo.STROKE_MODE_FREEHAND,
    resat: 1.0, bleed: 0.0,

    texture: 1.0,
    
    // "cur" values are current brush settings (once tablet pressure and stuff is applied)
    size: 0, curSize: 0,
    alpha: 0, curAlpha: 0,
    scattering: 0.0, curScattering: 0,
    squeeze: 0.0, curSqueeze: 0,
    angle: Math.PI, curAngle: 0,
    
    smoothing: 0.0
};

CPBrushInfo.prototype.applyPressure = function(pressure) {
    // FIXME: no variable size for smudge and oil :(
    if (this.pressureSize && this.brushMode != CPBrushInfo.BRUSH_MODE_SMUDGE && this.brushMode != CPBrushInfo.BRUSH_MODE_OIL) {
        this.curSize = Math.max(0.1, this.size * pressure);
    } else {
        this.curSize = Math.max(0.1, this.size);
    }

    // FIXME: what is the point of doing that?
    if (this.curSize > 16) {
        this.curSize = Math.floor(this.curSize);
    }

    // Don't allow brush size to exceed that supported by CPBrushManager
    this.curSize = Math.min(this.curSize, 400);

    this.curAlpha = this.pressureAlpha ? Math.floor(this.alpha * Math.min(pressure, 1.0)) : this.alpha;
    this.curSqueeze = this.squeeze;
    this.curAngle = this.angle;
    this.curScattering = this.scattering * this.curSize * (this.pressureScattering ? pressure : 1.0);
};

CPBrushInfo.prototype.clone = function() {
    return new CPBrushInfo(this);
};
