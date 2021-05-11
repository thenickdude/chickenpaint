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

import CPColorBmp from './CPColorBmp.js';
import CPLayer from './CPLayer.js';
import CPRect from "../util/CPRect.js";

/**
 * Note layer image data is not cleared to any specific values upon creation, use layer.image.clearAll().
 *
 * @param {int} width - Width of the bitmap, or zero to start the bitmap out empty (if you're planning to call copyFrom())
 * @param {int} height
 * @param {String} name
 *
 * @constructor
 * @extends CPLayer
 */
export default function CPImageLayer(width, height, name) {
	CPLayer.call(this, name);

	if (width > 0 && height > 0) {
		this.image = new CPColorBmp(width, height);
	} else {
		this.image = null;
	}

	/**
	 * True if this layer should be clipped onto the CPImageLayer beneath it.
	 *
	 * @type {boolean}
	 */
	this.clip = false;

	/**
	 *
	 * @type {?CPColorBmp}
	 */
	this.imageThumbnail = null;
}

CPImageLayer.prototype = Object.create(CPLayer.prototype);
CPImageLayer.prototype.constructor = CPImageLayer;

CPImageLayer.createFromImage = function(image, name) {
	let
		result = new CPImageLayer(0, 0, name);

	result.image = image;

	return result;
};

/**
 * Returns an independent copy of this layer.
 *
 * @returns {CPImageLayer}
 */
CPImageLayer.prototype.clone = function() {
	var
		result = new CPImageLayer(0, 0, this.name);

	result.copyFrom(this);

	return result;
};

/**
 *
 * @param {CPImageLayer} layer
 */
CPImageLayer.prototype.copyFrom = function(layer) {
	CPLayer.prototype.copyFrom.call(this, layer);

	this.clip = layer.clip;

	if (!this.image) {
		this.image = layer.image.clone();
	} else {
		this.image.copyPixelsFrom(layer.image);
	}
};

/**
 * Do we have any non-opaque pixels in the entire layer?
 */
CPImageLayer.prototype.hasAlpha = function() {
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
CPImageLayer.prototype.hasAlphaInRect = function(rect) {
	if (this.alpha != 100) {
		return true;
	}

	return this.image.hasAlphaInRect(rect);
};

/**
 *
 * @param {CPColorBmp} that
 */
CPImageLayer.prototype.copyImageFrom = function(that) {
	this.image.copyPixelsFrom(that);
};

/**
 * If this layer is clipped, return the layer that this layer is clipped to, otherwise return null.
 *
 * @returns {CPImageLayer}
 */
CPImageLayer.prototype.getClippingBase = function() {
	if (this.clip && this.parent) {
		for (var i = this.parent.indexOf(this) - 1; i >= 0; i--) {
			if (this.parent.layers[i] instanceof CPImageLayer) {
				if (!this.parent.layers[i].clip) {
					return this.parent.layers[i];
				}
			} else {
				// We can't clip to non-image layers, so something went wrong here...
				break;
			}
		}
	}
	return null;

};

/**
 *
 * @returns {boolean}
 */
CPImageLayer.prototype.getClip = function() {
	return this.clip;
};

/**
 *
 * @param {boolean} clip
 */
CPImageLayer.prototype.setClip = function(clip) {
	this.clip = clip;
};

/**
 * Get a rectangle that encloses any non-transparent pixels in the layer within the given initialBounds (or an empty
 * rect if the pixels inside the given bounds are 100% transparent).
 *
 * Ignores the layer alpha and visibility properties, you may want to check .getEffectiveAlpha() > 0 before calling.
 *
 * @param {CPRect} initialBounds - The rect to search within
 *
 * @returns {CPRect}
 */
CPImageLayer.prototype.getNonTransparentBounds = function(initialBounds) {
	return this.image.getNonTransparentBounds(initialBounds);
};

/**
 * @returns {CPRect}
 */
CPImageLayer.prototype.getBounds = function() {
	return new CPRect(0, 0, this.image.width, this.image.height);
};

/**
 * Get an approximation of the number of bytes of memory used by this layer.
 *
 * @returns {number}
 */
CPImageLayer.prototype.getMemoryUsed = function() {
	return this.image ? this.image.getMemorySize() : 0;
};

/**
 * Recreate the image thumbnail for this layer.
 */
CPImageLayer.prototype.rebuildImageThumbnail = function() {
	if (!this.imageThumbnail) {
		var
			scaleDivider = Math.ceil(Math.max(this.image.width / CPLayer.LAYER_THUMBNAIL_WIDTH, this.image.height / CPLayer.LAYER_THUMBNAIL_HEIGHT));

		this.imageThumbnail = new CPColorBmp(Math.floor(this.image.width / scaleDivider), Math.floor(this.image.height / scaleDivider));
	}

	this.imageThumbnail.createThumbnailFrom(this.image);
};

/**
 * Get the image thumbnail for this layer (or build one if one was not already built)
 *
 * @returns {CPColorBmp}
 */
CPImageLayer.prototype.getImageThumbnail = function() {
	if (!this.imageThumbnail) {
		this.rebuildImageThumbnail();
	}

	return this.imageThumbnail;
};
