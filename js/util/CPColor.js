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

export default function CPColor(rgb) {
    var
        that = this;
    
    this.rgb = 0; // in RGB byte order
    
    this.hue = 0;
    this.saturation = 0;
    this.value = 0;
    
    function rgbToHsv() {
        var
            r = (that.rgb >> 16) & 0xff,
            g = (that.rgb >> 8) & 0xff,
            b = that.rgb & 0xff;

        // Value
        that.value = Math.max(r, Math.max(g, b));

        // Saturation
        var 
            mini = Math.min(r, Math.min(g, b));
        
        if (that.value == 0) {
            that.saturation = 0;
        } else {
            that.saturation = ~~((that.value - mini) / that.value * 255);
        }

        // Hue
        if (that.saturation == 0) {
            that.hue = 0;
        } else {
            var 
                cr = (that.value - r) / (that.value - mini),
                cg = (that.value - g) / (that.value - mini),
                cb = (that.value - b) / (that.value - mini);

            var 
                _hue = 0;
            
            if (that.value == r) {
                _hue = cb - cg;
            }
            if (that.value == g) {
                _hue = 2 + cr - cb;
            }
            if (that.value == b) {
                _hue = 4 + cg - cr;
            }

            _hue *= 60;
            if (_hue < 0) {
                _hue += 360;
            }

            that.hue = ~~_hue;
        }
    }

    function hsvToRgb() {
        // no saturation means it's just a shade of grey
        if (that.saturation == 0) {
            that.rgb = (that.value << 16) | (that.value << 8) | that.value;
        } else {
            var 
                f = that.hue / 60;
            
            f = f - Math.floor(f);
    
            var 
                s = that.saturation / 255,
                m = ~~(that.value * (1 - s)),
                n = ~~(that.value * (1 - s * f)),
                k = ~~(that.value * (1 - s * (1 - f)));
    
            switch (~~(that.hue / 60)) {
            case 0:
                that.rgb = (that.value << 16) | (k << 8) | m;
                break;
            case 1:
                that.rgb = (n << 16) | (that.value << 8) | m;
                break;
            case 2:
                that.rgb = (m << 16) | (that.value << 8) | k;
                break;
            case 3:
                that.rgb = (m << 16) | (n << 8) | that.value;
                break;
            case 4:
                that.rgb = (k << 16) | (m << 8) | that.value;
                break;
            case 5:
                that.rgb = (that.value << 16) | (m << 8) | n;
                break;
            default:
                that.rgb = 0; // invalid hue
                break;
            }
        }
    }

    this.getRgb = function() {
        return this.rgb;
    };
    
    this.getSaturation = function() {
        return this.saturation;
    };

    this.getHue = function() {
        return this.hue;
    };
    
    this.getValue = function() {
        return this.value;
    };
    
    this.setRgbComponents = function(r, g, b) {
        this.setRgb((r << 16) | (g << 8) | b);
    }
    
    this.setRgb = function(rgb) {
        this.rgb = rgb;
        rgbToHsv();
    };

    this.setHsv = function(hue, value, saturation) {
        this.hue = hue;
        this.saturation = saturation;
        this.value = value;

        hsvToRgb();
    };

    this.setHue = function(hue) {
        this.hue = hue;
        hsvToRgb();
    };

    this.setSaturation = function(saturation) {
        this.saturation = saturation;
        hsvToRgb();
    };

    this.setValue = function(value) {
        this.value = value;
        hsvToRgb();
    };

    this.clone = function() {
        var 
            result = new CPColor();
        
        result.copyFrom(this);
        
        return result;
    };

    this.copyFrom = function(c) {
        this.rgb = c.rgb;
        this.hue = c.hue;
        this.saturation = c.saturation;
        this.value = c.value;
    };

    this.isEqual = function(color) {
        return this.rgb == color.rgb && this.hue == color.hue && this.saturation == color.saturation && this.value == color.value;
    };
    
    this.setRgb(rgb || 0);
}
