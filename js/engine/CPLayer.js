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

import CPBlend from './CPBlend';

/**
 * @param {String} name
 *
 * @constructor
 */
export default function CPLayer(name) {
    this.name = name || "";
    this.parent = null;
    this.alpha = 100;
    this.visible = true;
    this.blendMode = CPBlend.LM_NORMAL;
}

CPLayer.prototype.copyFrom = function(layer) {
    this.name = layer.name;
    this.blendMode = layer.blendMode;
    this.alpha = layer.alpha;
    this.visible = layer.visible;
    this.parent = layer.parent;
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

CPLayer.prototype.getMemoryUsed = function() {
    return 0;
};
