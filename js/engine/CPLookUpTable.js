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

export default function CPLookUpTable() {
    this.table = new Uint8Array(256);

    this.loadIdentity = function() {
        for (var i = 0; i < 256; i++) {
            this.table[i] = i;
        }
    };

    this.loadBrightnessContrast = function(brightness, contrast) {
        var 
            slope = contrast > 0.0 ? (1.0 / (1.0001 - contrast)): 1.0 + contrast,
            offset = 0.5 - slope * 0.5 + brightness;
            
        for (var i = 0; i < 256; i++) {
            var 
                x = i / 255.0,
                y = x * slope + offset;

            this.table[i] = Math.min(255, Math.max(~~(y * 255.0), 0));
        }
    };

    this.invert = function() {
        for (var i = 0; i < 256; i++) {
            this.table[i] = 255 - this.table[i];
        }
    };
}
