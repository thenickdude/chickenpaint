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

export default function CPBrushInfo(properties) {
    // Set brush setting fields with default values, then apply the supplied 'properties' on top
    for (var propName in CPBrushInfo.DEFAULTS) {
        if (CPBrushInfo.DEFAULTS.hasOwnProperty(propName)) {
            this[propName] = CPBrushInfo.DEFAULTS[propName];
        }
    }
    
    for (var propName in properties) {
        if (properties.hasOwnProperty(propName)) {
            this[propName] = properties[propName];
        }
    }
}

// Stroke modes
CPBrushInfo.SM_FREEHAND = 0;
CPBrushInfo.SM_LINE = 1;
CPBrushInfo.SM_BEZIER = 2;

// Brush dab types
CPBrushInfo.B_ROUND_PIXEL = 0;
CPBrushInfo.B_ROUND_AA = 1;
CPBrushInfo.B_ROUND_AIRBRUSH = 2;
CPBrushInfo.B_SQUARE_PIXEL = 3;
CPBrushInfo.B_SQUARE_AA = 4;

// painting modes
CPBrushInfo.M_PAINT = 0;
CPBrushInfo.M_ERASE = 1;
CPBrushInfo.M_DODGE = 2;
CPBrushInfo.M_BURN = 3;
CPBrushInfo.M_WATER = 4;
CPBrushInfo.M_BLUR = 5;
CPBrushInfo.M_SMUDGE = 6;
CPBrushInfo.M_OIL = 7;

CPBrushInfo.DEFAULTS = {
    isAA: false, isAirbrush: false,
    minSpacing: 0, spacing: 0,
    
    pressureSize: true,
    pressureAlpha: false,
    pressureScattering: false,
    
    type: 0, paintMode: 0,
    strokeMode: CPBrushInfo.SM_FREEHAND,
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
    if (this.pressureSize && this.paintMode != CPBrushInfo.M_SMUDGE && this.paintMode != CPBrushInfo.M_OIL) {
        this.curSize = Math.max(0.1, this.size * pressure);
    } else {
        this.curSize = Math.max(0.1, this.size);
    }

    // FIXME: what is the point of doing that?
    if (this.curSize > 16) {
        this.curSize = Math.floor(this.curSize);
    }

    this.curAlpha = this.pressureAlpha ? Math.floor(this.alpha * Math.min(pressure, 1.0)) : this.alpha;
    this.curSqueeze = this.squeeze;
    this.curAngle = this.angle;
    this.curScattering = this.scattering * this.curSize * (this.pressureScattering ? pressure : 1.0);
};

CPBrushInfo.prototype.clone = function() {
    return new CPBrushInfo(this);
};
