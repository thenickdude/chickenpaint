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

import CPBlend from './CPBlend.js';
import CPRect from '../util/CPRect.js';
import CPColorBmp from "./CPColorBmp.js";
import CPGreyBmp from "./CPGreyBmp.js";

const
	BYTES_PER_PIXEL = 4,
	ALPHA_BYTE_OFFSET = 3;

CPBlend.blendFunctionNameForParameters = function(fusionHasTransparency, imageAlpha, imageBlendMode, hasMask) {
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

    if (hasMask) {
        funcName += "Masked";
    }

    return funcName;
};

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

	let
		funcName = CPBlend.blendFunctionNameForParameters(fusionHasTransparency, imageAlpha, imageBlendMode, mask != null);

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
 * Multiplies the values from the mask, and the given overall alpha, into the alpha channel of the image.
 *
 * @param {CPColorBmp} image
 * @param {number} alpha
 * @param {CPGreyBmp} mask
 */
CPBlend.multiplyAlphaByMask = function(image, alpha, mask) {
	var
		scale = alpha / (100 * 255);
	
	for (var dstIndex = CPColorBmp.ALPHA_BYTE_OFFSET, srcIndex = 0; dstIndex < image.data.length; dstIndex += CPColorBmp.BYTES_PER_PIXEL, srcIndex++) {
		image.data[dstIndex] = Math.round(image.data[dstIndex] * mask.data[srcIndex] * scale);
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
