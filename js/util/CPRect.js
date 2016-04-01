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

export default function CPRect(left, top, right, bottom) {
    /*
    if (left === undefined || top === undefined || right === undefined || bottom === undefined) {
        throw "Bad rect";
    }
    
    if (~~left !== left || ~~top !== top || ~~right !== right || ~~bottom !== bottom) {
        throw "Bad rect";
    }
    */
    
    this.left = left;
    this.top = top;
    this.right = right;
    this.bottom = bottom;
}

CPRect.prototype.makeEmpty = function() {
    this.left = 0;
    this.top = 0;
    this.right = 0;
    this.bottom = 0;
};

CPRect.prototype.union = function(that) {
    if (this.isEmpty()) {
        this.set(that);
    } else {
        this.left = Math.min(this.left, that.left);
        this.top = Math.min(this.top, that.top);
        this.right = Math.max(this.right, that.right);
        this.bottom = Math.max(this.bottom, that.bottom);
    }
};

/**
 * Clip this rectangle to fit within `that`.
 * 
 * @returns a refence to this rectangle for chaining 
 */
CPRect.prototype.clip = function(that) {
    if (!this.isEmpty()) {
        if (that.isEmpty()) {
            this.makeEmpty();
        } else {
            this.left = Math.max(this.left, that.left);
            this.top = Math.max(this.top, that.top);
            this.right = Math.min(this.right, that.right);
            this.bottom = Math.min(this.bottom, that.bottom);
        }
    }
    
    return this;
};

CPRect.prototype.isInside = function(that) {
    return this.left >= that.left && this.top >= that.top && this.right <= that.right && this.bottom <= that.bottom;
};

/**
 * Use this rectangle as bounds to clip the placement of the area of srcRect at the position of dstRect inside
 * our bounds.
 *
 * dstRect has its right and bottom set by this operation to match the area that would be copied from the source.
 * srcRect has its coordinates tweaked to match the area that will be copied.
 */
CPRect.prototype.clipSourceDest = function(srcRect, dstRect) {
    dstRect.right = dstRect.left + srcRect.getWidth();
    dstRect.bottom = dstRect.top + srcRect.getHeight();

    if (this.isEmpty() || dstRect.left >= this.right || dstRect.top >= this.bottom || dstRect.right <= this.left || dstRect.bottom <= this.top) {
        srcRect.makeEmpty();
        dstRect.makeEmpty();
    } else {
        // bottom/right
        if (dstRect.right > this.right) {
            srcRect.right -= dstRect.right - this.right;
            dstRect.right = this.right;
        }
    
        if (dstRect.bottom > this.bottom) {
            srcRect.bottom -= dstRect.bottom - this.bottom;
            dstRect.bottom = this.bottom;
        }
    
        // top/left
        if (dstRect.left < this.left) {
            srcRect.left += this.left - dstRect.left;
            dstRect.left = this.left;
        }
    
        if (dstRect.top < this.top) {
            srcRect.top += this.top - dstRect.top;
            dstRect.top = this.top;
        }
    }
};

CPRect.prototype.getWidth = function() {
    return this.right - this.left;
};

CPRect.prototype.getHeight = function() {
    return this.bottom - this.top;
};

CPRect.prototype.isEmpty = function() {
    return this.right <= this.left || this.bottom <= this.top;
};

CPRect.prototype.set = function(r) {
    this.left = r.left;
    this.top = r.top;
    this.right = r.right;
    this.bottom = r.bottom;
};

CPRect.prototype.clone = function() {
    return new CPRect(this.left, this.top, this.right, this.bottom);
};

CPRect.prototype.translate = function(x, y) {
    this.left += x;
    this.right += x;
    this.top += y;
    this.bottom += y;
};

CPRect.prototype.moveTo = function(x, y) {
    this.translate(x - this.left, y - this.top);
};

CPRect.prototype.equals = function(that) {
    return this.left == that.left && this.right == that.right && this.top == that.top && this.bottom == that.bottom;
};

/**
 * Add h pixels to both the left and right sides of the rectangle, and v pixels to both the top and bottom sides.
 *  
 * @param h
 * @param v
 */
CPRect.prototype.grow = function(h, v) {
    // TODO checks for rectangles with zero-extent
    this.left -= h;
    this.right += h;
    this.top -= v;
    this.bottom += v;
};

CPRect.prototype.toString = function() {
    return "(" + this.left + "," + this.top + "," + this.right + "," + this.bottom + ")";
};

/* 
 * Chrome is initially eager to optimize CPRect and users assuming that all the fields are SMIs, then later on decides
 * that they should be tagged numbers after all. This causes all the blending operation functions to be reoptimized
 * a couple of times. 
 * 
 * Avoid that mess by starting things off with floats in the members.  
 */
window.cpRectGarbage = new CPRect(1.5, 2.5, 3.5, 4.5);