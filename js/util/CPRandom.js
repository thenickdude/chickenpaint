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

export default function CPRandom() {
    var 
        nextNextGaussian, 
        haveNextNextGaussian = false;

    /**
     * Definition from Java, mean of 0.0 and standard deviation 1.0.
     */
    this.nextGaussian = function() {
        if (haveNextNextGaussian) {
            haveNextNextGaussian = false;
            return nextNextGaussian;
        } else {
            
            var
                v1, v2, s;
            
            do {
                v1 = 2 * Math.random() - 1; // between -1.0 and 1.0
                v2 = 2 * Math.random() - 1; // between -1.0 and 1.0
                s = v1 * v1 + v2 * v2;
            } while (s >= 1 || s == 0);
            
            var
                multiplier = Math.sqrt(-2 * Math.log(s) / s);
            
            nextNextGaussian = v2 * multiplier;
            haveNextNextGaussian = true;
            
            return v1 * multiplier;
        }
    };
};