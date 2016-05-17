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

import CPLayer from './CPLayer';
import CPBlend from './CPBlend';

export default function CPLayerGroup(width, height, name, parent, blendMode) {
	// Super constructor
	CPLayer.call(this, width, height, name, parent);

	/**
	 * @type {CPLayer[]}
	 */
	this.layers = [];
	this.expanded = true;
	this.blendMode = blendMode;
}

CPLayerGroup.prototype = Object.create(CPLayer.prototype);
CPLayerGroup.prototype.constructor = CPLayerGroup;

/**
 * Returns an array of layers in this group in display order, excluding this group itself.
 *
 * @param {boolean} respectCollapse - Set to true to omit the children of collapsed groups
 * @param {?CPLayer[]} list
 * @returns {*|Array}
 */
CPLayerGroup.prototype.getLinearizedLayerList = function(respectCollapse, list) {
	list = list || [];

	for (let layer of this.layers) {
		if (layer instanceof CPLayerGroup && (layer.expanded || !respectCollapse)) {
			layer.getLinearizedLayerList(respectCollapse, list);
		}
		list.push(layer);
	}

	return list;
};

CPLayerGroup.prototype.clearLayers = function() {
	this.layers = [];
};

CPLayerGroup.prototype.addLayer = function(layer) {
	layer.parent = this;
	this.layers.push(layer);
};

CPLayerGroup.prototype.insertLayer = function(index, layer) {
	layer.parent = this;
	this.layers.splice(index, 0, layer);
};

CPLayerGroup.prototype.removeLayer = function(layer) {
	var
		index = this.layers.indexOf(layer);

	if (index > -1) {
		this.layers.splice(index, 1);
	}
};

CPLayerGroup.prototype.removeLayerAtIndex = function(index) {
	var
		layer = this.layers[index];

	if (layer) {
		this.layers.splice(index, 1);
	}

	return layer;
};

/**
 * Get the index of the given layer in this group, or -1 if the layer is not in the group.
 * 
 * @param {CPLayer} layer
 * @returns {int}
 */
CPLayerGroup.prototype.indexOf = function(layer) {
	return this.layers.indexOf(layer);
};

CPLayerGroup.prototype.isImageLayer = function() {
	return false;
};