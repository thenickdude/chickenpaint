"use strict";

function CPRect(left, top, right, bottom) {
    // TODO remove me
    if ((left !== undefined || top !== undefined) && (right === undefined || bottom === undefined)) {
        throw "Bad args to CPRect";
    }
    
    this.left = ~~left;
    this.top = ~~top;
    this.right = ~~right;
    this.bottom = ~~bottom;
}

CPRect.prototype.makeEmpty = function() {
    this.left = 0;
    this.top = 0;
    this.right = 0;
    this.bottom = 0;
}

CPRect.prototype.union = function(that) {
    if (this.isEmpty()) {
        this.set(that);
    } else {
        this.left = Math.min(this.left, that.left);
        this.top = Math.min(this.top, that.top);
        this.right = Math.max(this.right, that.right);
        this.bottom = Math.max(this.bottom, that.bottom);
    }
}

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
}

CPRect.prototype.isInside = function(that) {
    return this.left >= that.left && this.top >= that.top && this.right <= that.right && this.bottom <= that.bottom;
}

// First makes dstRect the same width and height (not modifying its top/left)
// Clips the dstRect with this rectangle and changes the srcRect so that
// it corresponds to the new clipped rectangle

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