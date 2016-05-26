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
	/**
     *
     * @type {String}
     */
    this.name = name || "";

	/**
     * The parent of this layer, if this node is in a layer group.
     *
     * @type {?CPLayerGroup}
     */
    this.parent = null;

	/**
     * The opacity of this layer (0 = transparent, 100 = opaque)
     *
     * @type {int}
     */
    this.alpha = 100;

	/**
     * True if this layer and its children should be drawn.
     *
     * @type {boolean}
     */
    this.visible = true;

	/**
     * One of the CMBlend.LM_* constants.
     *
     * @type {int}
     */
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

CPLayer.prototype.getDepth = function() {
    if (this.parent == null) {
        return 0;
    }
    return this.parent.getDepth() + 1;
};

CPLayer.prototype.ancestorsAreVisible = function() {
    return this.parent == null || this.parent.visible && this.parent.ancestorsAreVisible();
};

/**
 * Returns true if this layer has the given group as one of its ancestors.
 *
 * @param {CPLayerGroup} group
 * @returns {boolean}
 */
CPLayer.prototype.hasAncestor = function(group) {
    return this.parent == group || this.parent && this.parent.hasAncestor(group);
};

CPLayer.prototype.clone = function() {
    throw "Pure virtual CPLayer.clone() call";
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
    return new CPRect(0, 0, 0, 0);
};
