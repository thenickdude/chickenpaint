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

/**
 * Extra functions for CPBlend that don't need to be generated dynamically.
 */

import CPBlend from './CPBlend';
import CPRect from '../util/CPRect';
import CPColorBmp from "./CPColorBmp";
import CPGreyBmp from "./CPGreyBmp";

const
	BYTES_PER_PIXEL = 4,
	ALPHA_BYTE_OFFSET = 3;

/**
 * Blends the given image on top of the fusion.
 *
 * @param {CPColorBmp} fusion - Image to fuse on top of
 * @param {boolean} fusionHasTransparency - True if the fusion layer has alpha < 100, or any transparent pixels.
 * @param {CPColorBmp} image - Image that should be drawn on top of the fusion
 * @param {int} imageAlpha - Alpha [0...100] to apply to the image
 * @param {int} imageBlendMode - Blending mode (CPBlend.LM_*) to apply to the image
 * @param {CPRect} rect - The rectangle of pixels that should be fused.
 * @param {?CPGreyBmp} mask - An optional mask to apply to the image
 */
CPBlend.fuseImageOntoImage = function (fusion, fusionHasTransparency, image, imageAlpha, imageBlendMode, rect, mask) {
	if (imageAlpha <= 0) {
		return;
	}

	var
		funcName = CPBlend.BLEND_MODE_CODENAMES[imageBlendMode] + "Onto";

	if (fusionHasTransparency) {
		funcName += "TransparentFusion";
	} else {
		funcName += "OpaqueFusion";
	}

	if (imageAlpha == 100) {
		funcName += "WithOpaqueLayer";
	} else {
		funcName += "WithTransparentLayer";
	}

	if (mask) {
		funcName += "Masked";
	}

	rect = fusion.getBounds().clipTo(rect);

	this[funcName](fusion, image, imageAlpha, rect, mask);
};

CPBlend.normalFuseImageOntoImageAtPosition = function(fusion, image, destX, destY, sourceRect) {
	var
		sourceRectCopy = sourceRect.clone(),
		destRect = new CPRect(destX, destY, 0, 0);

	fusion.getBounds().clipSourceDest(sourceRectCopy, destRect);

	this._normalFuseImageOntoImageAtPosition(fusion, image, 100, sourceRectCopy, destRect.left, destRect.top);
};

/**
 * Multiplies the given alpha into the alpha of the individual pixels of the image.
 *
 * @param {CPColorBmp} image
 * @param {int} alpha - [0...100] alpha to apply
 */
CPBlend.multiplyAlphaBy = function (image, alpha) {
	if (alpha < 100) {
		if (alpha == 0) {
			image.clearAll(0);
		} else {
			var
				imageData = image.data;

			for (var pixIndex = ALPHA_BYTE_OFFSET; pixIndex < imageData.length; pixIndex += BYTES_PER_PIXEL) {
				imageData[pixIndex] = Math.round(imageData[pixIndex] * alpha / 100);
			}
		}
	}
};

/**
 * Multiplies the given alpha into the alpha of the individual pixels of the image and stores the
 * resulting pixels into the specified image.
 *
 * @param {CPColorBmp} dest
 * @param {CPColorBmp} image
 * @param {int} alpha - [0...100] alpha to apply
 * @param {CPRect} rect
 */
CPBlend.copyAndMultiplyAlphaBy = function (dest, image, alpha, rect) {
	if (alpha == 100) {
		dest.copyBitmapRect(image, rect.left, rect.top, rect);
	} else if (alpha == 0) {
		dest.clearRect(rect, 0);
	} else {
		var
			imageData = image.data;

		for (var pixIndex = 0; pixIndex < imageData.length; pixIndex += BYTES_PER_PIXEL) {
			imageData[pixIndex] = imageData[pixIndex];
			imageData[pixIndex + 1] = imageData[pixIndex + 1];
			imageData[pixIndex + 2] = imageData[pixIndex + 2];

			imageData[pixIndex + ALPHA_BYTE_OFFSET] = Math.round(imageData[pixIndex + ALPHA_BYTE_OFFSET] * alpha / 100);
		}
	}
};

/**
 * Fuse the given layer on top of the given fusion layer, using the blending operation defined in the layer.
 *
 * @param {CPLayer} fusion - Layer to fuse on top of
 * @param {boolean} fusionHasTransparency - True if the fusion layer has alpha < 100, or any transparent pixels.
 * @param {CPLayer} layer - Layer that should be drawn on top of the fusion
 * @param {CPRect} rect - The rectangle of pixels that should be fused.
 */
CPBlend.fuseLayerOntoLayer = function (fusion, fusionHasTransparency, layer, rect) {
	if (layer.getEffectiveAlpha() == 0) {
		return;
	}

	// Our blending operators don't support fusion with alpha < 100, so ensure that first
	this.multiplyAlphaBy(fusion.image, fusion.alpha);

	this.fuseImageOntoImage(fusion.image, fusionHasTransparency, layer.image, layer.alpha, layer.blendMode, rect);
};
