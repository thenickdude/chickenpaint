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

import CPColorBmp from './CPColorBmp';
import CPBlend from './CPBlend';

/**
 * Note layer image data is not cleared to any specific values upon creation, use layer.image.clearAll().
 *
 * @param {int} width
 * @param {int} height
 * @param {String} name
 *
 * @constructor
 */
export default function CPLayer(width, height, name) {
    this.image = new CPColorBmp(width, height);
    
    this.name = name || "";
    
    this.alpha = 100;
    this.visible = true;
    this.blendMode = CPBlend.LM_NORMAL;

    this.parent = null;
}

/**
 * Returns an independent copy of this layer.
 *
 * @returns {CPLayer}
 */
CPLayer.prototype.clone = function() {
    var
        result = new CPLayer(this.image.width, this.image.height, this.name);

    result.copyFrom(this);

    return result;
};

CPLayer.prototype.copyFrom = function(layer) {
    this.name = layer.name;
    this.blendMode = layer.blendMode;
    this.alpha = layer.alpha;
    this.visible = layer.visible;
    this.parent = layer.parent;

    this.image.copyDataFrom(layer.image);
};

/**
 * Do we have any non-opaque pixels in the entire layer?
 */
CPLayer.prototype.hasAlpha = function() {
    if (this.alpha != 100) {
        return true;
    }

    return this.image.hasAlpha();
};

/**
 * Do we have any semi-transparent pixels in the given rectangle?
 *
 * @param {CPRect} rect
 * @returns {boolean}
 */
CPLayer.prototype.hasAlphaInRect = function(rect) {
    if (this.alpha != 100) {
        return true;
    }

    return this.image.hasAlphaInRect(rect);
};

CPLayer.prototype.setAlpha = function(alpha) {
    this.alpha = alpha;
};

CPLayer.prototype.getAlpha = function() {
    return this.alpha;
};

/**
 * Get the alpha of this layer, or zero if this layer is hidden.
 * 
 * @returns {number}
 */
CPLayer.prototype.getEffectiveAlpha = function() {
    if (this.visible) {
        return this.alpha;
    }
    return 0;
};

CPLayer.prototype.setName = function(name) {
    this.name = name;
};

CPLayer.prototype.getName = function() {
    return name;
};

CPLayer.prototype.setBlendMode = function(blendMode) {
    this.blendMode = blendMode;
};

CPLayer.prototype.getBlendMode = function() {
    return this.blendMode;
};

CPLayer.prototype.setVisible = function(visible) {
    this.visible = visible;
};

CPLayer.prototype.getVisible = function() {
    return this.visible;
};

CPLayer.prototype.isVisible = CPLayer.prototype.getVisible;

/**
 *
 * @param {CPColorBmp} that
 */
CPLayer.prototype.copyImageFrom = function(that) {
    this.image.copyDataFrom(that);
};

/**
 * Get a rectangle that encloses any non-transparent pixels in the layer within the given initialBounds (or an empty
 * rect if the pixels inside the given bounds are 100% transparent).
 *
 * @param {CPRect} initialBounds - The rect to search within
 *
 * @returns {CPRect}
 */
CPLayer.prototype.getNonTransparentBounds = function(initialBounds) {
    return this.image.getNonTransparentBounds(initialBounds);
};

// TODO we can certainly do better than this, create a CPImageLayer so CPLayerGroup doesn't inherit from an image layer
CPLayer.prototype.isImageLayer = function() {
    return true;
};

CPLayer.prototype.getMemoryUsed = function() {
    return this.image ? this.image.getMemorySize() : 0;
};
