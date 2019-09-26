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

export default function CPBezier() {

    // How to use this class:
    //
    // 1 - set the 4 points coordinates (x0-3, y0-3)
    // two options:
    // 2a - call init() with desired dt then read the current coordinate (Bx, By) and use nextPoint() to compute the
    // next point
    // 2b - use one of the "compute" methods to compute the values for the whole curve in one step

    // The 4 points coordinates
    this.x0 = this.y0 = this.x1 = this.y1 = this.x2 = this.y2 = this.x3 = this.y3 = 0.0;

    // used to compute the Bezier curve with the forward differences method
    let
        Bx, dBx, ddBx, dddBx,
        By, dBy, ddBy, dddBy;

    const init = (dt) => {
        // Implements a fast degree-3 Bezier curve using the forward differences method
        //
        // Reference for this algorithm:
        // "Curves and Surfaces for Computer Graphics" by David Salomon, page 189
        let
            q1 = 3.0 * dt,
            q2 = q1 * dt,
            q3 = dt * dt * dt,
            q4 = 2.0 * q2,
            q5 = 6.0 * q3,
            q6x = this.x0 - 2.0 * this.x1 + this.x2,
            q6y = this.y0 - 2.0 * this.y1 + this.y2,
            q7x = 3.0 * (this.x1 - this.x2) - this.x0 + this.x3,
            q7y = 3.0 * (this.y1 - this.y2) - this.y0 + this.y3;

        Bx = this.x0;
        By = this.y0;

        dBx = (this.x1 - this.x0) * q1 + q6x * q2 + q7x * q3;
        dBy = (this.y1 - this.y0) * q1 + q6y * q2 + q7y * q3;

        ddBx = q6x * q4 + q7x * q5;
        ddBy = q6y * q4 + q7y * q5;

        dddBx = q7x * q5;
        dddBy = q7y * q5;
    };

    /**
     * Fill the given x,y arrays with a series of points on the curve.
     * 
     * @param {Number[]} x
     * @param {Number[]} y
     *
     * @param {int} elements Count of elements to fill x and y arrays
     */
    this.compute = (x, y, elements) => {
        init(1.0 / elements);

        x[0] = Bx;
        y[0] = By;
        
        for (let i = 1; i < elements; i++) {
            Bx += dBx;
            By += dBy;
            dBx += ddBx;
            dBy += ddBy;
            ddBx += dddBx;
            ddBy += dddBy;

            x[i] = Bx;
            y[i] = By;
        }
    };
}