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
 * An RGB color with floating point values for each channel (between 0.0 and 1.0)
 *
 * @param {number} r
 * @param {number} g
 * @param {number} b
 *
 * @constructor
 */
export default function CPColorFloat(r, g, b) {
    this.r = r;
    this.g = g;
    this.b = b;
}

CPColorFloat.prototype.toInt = function() {
    return (Math.max(0, Math.min(255, Math.round(this.r * 255))) << 16) 
        | (Math.max(0, Math.min(255, Math.round(this.g * 255))) << 8)
        | Math.max(0, Math.min(255, Math.round(this.b * 255)));
};

CPColorFloat.prototype.mixWith = function(color, alpha) {
    this.r = this.r * (1.0 - alpha) + color.r * alpha;
    this.g = this.g * (1.0 - alpha) + color.g * alpha;
    this.b = this.b * (1.0 - alpha) + color.b * alpha;
};

CPColorFloat.prototype.clone = function() {
    return new CPColorFloat(this.r, this.g, this.b);
};

CPColorFloat.createFromInt = function(color) {
    return new CPColorFloat(
        ((color >>> 16) & 0xff) / 255,
        ((color >>> 8) & 0xff) / 255,
        (color & 0xff) / 255
    );
};