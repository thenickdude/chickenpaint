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

import CPRect from "../util/CPRect.js";
import CPColorBmp from "./CPColorBmp.js";
import CPGreyBmp from "./CPGreyBmp.js";

import EventEmitter from "wolfy87-eventemitter";

/**
 * Copy the rectangle from the single-channel `greyscale` to the RGBA `imageData` as greyscale pixels with full alpha.
 * Both images must be the same size.
 *
 * @param {ImageData} imageData
 * @param {CPGreyBmp} greyscale
 * @param {CPRect} rect
 */
function copyGreyscaleRectToImageData(imageData, greyscale, rect) {
	var
		srcIndex = rect.top * greyscale.width + rect.left,
		dstIndex = srcIndex * CPColorBmp.BYTES_PER_PIXEL,

		width = rect.getWidth(),
		height = rect.getHeight(),

		srcYSkip = greyscale.width - width,
		dstYSkip = srcYSkip * CPColorBmp.BYTES_PER_PIXEL;

	for (let y = 0; y < height; y++, srcIndex += srcYSkip, dstIndex += dstYSkip) {
		for (let x = 0; x < width; x++, srcIndex++, dstIndex += CPColorBmp.BYTES_PER_PIXEL) {
			imageData.data[dstIndex + CPColorBmp.RED_BYTE_OFFSET] = greyscale.data[srcIndex];
			imageData.data[dstIndex + CPColorBmp.GREEN_BYTE_OFFSET] = greyscale.data[srcIndex];
			imageData.data[dstIndex + CPColorBmp.BLUE_BYTE_OFFSET] = greyscale.data[srcIndex];
			imageData.data[dstIndex + CPColorBmp.ALPHA_BYTE_OFFSET] = 0xFF;
		}
	}
}

/**
 * Allows a ImageData-view to be created of a layer's mask, with the artwork able to change the target of the view
 * when needed, and keep the pixels up to date.
 *
 * Emits a "changeLayer" event if the mask view attaches to a different target layer.
 */
export default class CPMaskView extends EventEmitter {
	
	/**
	 * @param {CPLayer} layer
	 * @param {function} prepareMask
	 */
	constructor(layer, prepareMask) {
		super();

		this.layer = layer;
		this.buffer = layer.mask.getImageData(0, 0, layer.mask.width, layer.mask.height);
		this.invalidRect = new CPRect(0, 0, 0, 0); // Buffer starts off valid

		/**
		 * Routine that must be called before the pixels in the mask will be valid.
		 *
		 * @type {Function}
		 */
		this.prepareMask = prepareMask;
	}

	close() {
		this.buffer = null;
		this.layer = null;

		this.emitEvent("changeLayer");
	}

	setLayer(layer) {
		this.layer = layer;
		this.invalidRect = layer.getBounds();

		this.emitEvent("changeLayer");
	}

	isOpen() {
		return this.layer != null;
	}

	/**
	 * Mark a rectangle as changed (the mask has been painted on)
	 *
	 * @param {CPRect} rect
	 */
	invalidateRect(rect) {
		this.invalidRect.union(rect);
	}

	/**
	 * Get the pixels of the mask as an ImageData object, or null if this view has already been closed.
	 *
	 * @returns {ImageData}
	 */
	getImageData() {
		this.prepareMask();

		if (!this.invalidRect.isEmpty() && this.layer && this.layer.mask) {
			copyGreyscaleRectToImageData(this.buffer, this.layer.mask, this.invalidRect);

			this.invalidRect.makeEmpty();
		}

		return this.buffer;
	}
}