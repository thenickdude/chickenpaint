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

import assert from "assert";

import CPColorBmp from "../../js/engine/CPColorBmp.js";
import CPGreyBmp from "../../js/engine/CPGreyBmp.js";
import CPArtwork from "../../js/engine/CPArtwork.js";
import CPImageLayer from "../../js/engine/CPImageLayer.js";
import { MersenneTwister19937, integer as randomInteger } from "random-js";

export default function TestUtil() {
}

/**
 * Helps you test that an action is applied correctly to the artwork. The pre() handler is called before
 * applying the action so you can verify the preconditions, then the action() handler is called to apply the action,
 * then the post() handler is called.
 *
 * The same validation is repeated when calling undo() and redo() on the artwork, to ensure that the action can undo/redo
 * correctly.
 * 
 * Throw an exception if your pre/postconditions fail.
 *
 * @param {Object} test
 * @param {CPArtwork} test.artwork
 * @param {function} test.pre - Called when in the "before action" state
 * @param {function} test.action - Called for you to perform the action on the artwork
 * @param {function} test.post - Called when in the "after action" state
 * @param {boolean}  test.testCompact - Test undo/redo after .compact() is called as well
 */
TestUtil.artworkUndoRedo = function(test) {
	test.pre();

	test.action();

	test.post();

	test.artwork.undo();

	test.pre();

	test.artwork.redo();

	test.post();

	if (test.testCompact) {
		test.artwork.compactUndo();

		test.artwork.undo();

		test.pre();

		test.artwork.redo();

		test.post();
	}
};

/**
 *
 * @param {(CPColorBmp|CPGreyBmp)} bitmap1
 * @param {(CPColorBmp|CPGreyBmp)} bitmap2
 * @returns {boolean}
 */
TestUtil.bitmapsAreEqual = function(bitmap1, bitmap2) {
	return bitmap1.equals(bitmap2);
};

/**
 *
 * @param {CPColorBmp} bitmap1
 * @param {CPColorBmp} bitmap2
 * @returns {int}
 */
TestUtil.bitmapMaxDifference = function(bitmap1, bitmap2) {
	let
		max = 0;

	for (let pixIndex = 0; pixIndex < bitmap1.data.length; pixIndex += CPColorBmp.BYTES_PER_PIXEL) {
		for (let i = CPColorBmp.RED_BYTE_OFFSET; i <= CPColorBmp.GREEN_BYTE_OFFSET; i++) {
		    let
                difference = Math.abs(
                    bitmap1.data[pixIndex + CPColorBmp.ALPHA_BYTE_OFFSET] * bitmap1.data[pixIndex + i]
                    - bitmap2.data[pixIndex + CPColorBmp.ALPHA_BYTE_OFFSET] * bitmap2.data[pixIndex + i]
                );

			max = Math.max(max, difference);
        }
	}

    return max;
};

const
	COLOR_BITMAP_STRING_COLORS = {
		".": 0x00000000, // Opacity 0 black
		"X": 0xFF000000, // Opacity 100 black
		"O": 0xFFFFFFFF, // Opacity 100 white
		"~": 0x7FFFFFFF, // Opacity 50 white
		"R": 0xFFFF0000, // Opacity 100 red
		"G": 0xFF00FF00, // Opacity 100 green
		"B": 0xFF0000FF  // Opacity 100 blue
	},

	GREY_BITMAP_STRING_COLORS = {
		".": 0x00, // Black
		"~": 0x7F, // Grey
		"O": 0xFF // White
	};

/**
 *
 * @param {CPColorBmp} bitmap
 * @returns {string}
 */
TestUtil.colorBitmapAsString = function(bitmap) {
	let
		output = [],
		pixIndex = 0;
	
	for (let y = 0; y < bitmap.height; y++) {
		for (let x = 0; x < bitmap.width; x++, pixIndex += CPColorBmp.BYTES_PER_PIXEL) {
			let
				color =
					(
						(bitmap.data[pixIndex + CPColorBmp.ALPHA_BYTE_OFFSET] << 24)
						| (bitmap.data[pixIndex + CPColorBmp.RED_BYTE_OFFSET] << 16)
						| (bitmap.data[pixIndex + CPColorBmp.GREEN_BYTE_OFFSET] << 8)
						| bitmap.data[pixIndex + CPColorBmp.BLUE_BYTE_OFFSET]
					) >>> 0 /* Convert to unsigned 32-bit */,
				found = false;

			for (let string in COLOR_BITMAP_STRING_COLORS) {
				if (COLOR_BITMAP_STRING_COLORS[string] == color) {
					output.push(string);
					found = true;
					break;
				}
			}

			if (!found) {
				output.push("?");
			}
		}
		output.push("\n");
	}

	return output.join("");
};

/**
 *
 * @param {CPGreyBmp} bitmap
 * @returns {string}
 */
TestUtil.greyBitmapAsString = function(bitmap) {
	let
		output = [],
		pixIndex = 0;

	for (let y = 0; y < bitmap.height; y++) {
		for (let x = 0; x < bitmap.width; x++, pixIndex++) {
			let
				color = bitmap.data[pixIndex],
				found = false;

			for (let string in GREY_BITMAP_STRING_COLORS) {
				if (GREY_BITMAP_STRING_COLORS[string] == color) {
					output.push(string);
					found = true;
					break;
				}
			}

			if (!found) {
				output.push("?");
			}
		}
		output.push("\n");
	}

	return output.join("");
};


TestUtil.bitmapAsString = function(bitmap) {
	if (bitmap instanceof CPColorBmp) {
		return TestUtil.colorBitmapAsString(bitmap);
	} else {
		return TestUtil.greyBitmapAsString(bitmap);
	}
};

/**
 * Create a color image from a string representation of the pixels of the image. Newlines begin a new row of pixels.
 * Leading or trailing whitespace on lines is not significant.
 *
 * See the COLOR_BITMAP_STRING_COLORS map for supported pixel character values.
 *
 * @param {string} text
 * @returns {CPColorBmp}
 */
TestUtil.colorBitmapFromString = function(text) {
	let
		lines = text.match(/^\s*([^\s]+)\s*$/gm).map(line => line.replace(/\s/g, "")),
		image,
		imageWidth, imageHeight = lines.length,
		pixIndex = 0;

	assert(imageHeight > 0);

	imageWidth = lines[0].length;

	assert(!lines.some(line => line.length != imageWidth));

	image = new CPColorBmp(imageWidth, imageHeight);

	for (let y = 0; y < imageHeight; y++) {
		let
			line = lines[y];

		for (let x = 0; x < imageWidth; x++, pixIndex += CPColorBmp.BYTES_PER_PIXEL) {
			let
				color = COLOR_BITMAP_STRING_COLORS[line.charAt(x)];

			assert(color !== undefined);

			image.data[pixIndex + CPColorBmp.RED_BYTE_OFFSET] = (color >> 16) & 0xFF;
			image.data[pixIndex + CPColorBmp.GREEN_BYTE_OFFSET] = (color >> 8) & 0xFF;
			image.data[pixIndex + CPColorBmp.BLUE_BYTE_OFFSET] = color & 0xFF;
			image.data[pixIndex + CPColorBmp.ALPHA_BYTE_OFFSET] = (color >> 24) & 0xFF;
		}
	}

	return image;
};

/**
 * Create a greyscale image from a string representation of the pixels of the image. Newlines begin a new row of pixels.
 * Leading or trailing whitespace on lines is not significant.
 *
 * See the GREY_BITMAP_STRING_COLORS map for supported pixel character values.
 *
 * @param {string} text
 * @returns {CPGreyBmp}
 */
TestUtil.greyBitmapFromString = function(text) {
	let
		lines = text.match(/^\s*([^\s]+)\s*$/gm).map(line => line.replace(/\s/g, "")),
		image,
		imageWidth, imageHeight,
		pixIndex = 0;

	imageHeight = lines.length;

	assert(imageHeight > 0);

	imageWidth = lines[0].length;

	assert(!lines.some(line => line.length != imageWidth));

	image = new CPGreyBmp(imageWidth, imageHeight, 8);

	for (let y = 0; y < imageHeight; y++) {
		let
			line = lines[y];

		for (let x = 0; x < imageWidth; x++, pixIndex++) {
			let
				char = line.charAt(x),
				color = GREY_BITMAP_STRING_COLORS[char];

			assert(color !== undefined);

			image.data[pixIndex] = color;
		}
	}

	return image;
};

/**
 * Test a painting operation on a single image layer. This gives an easy way to make sure that the operation only
 * affects the image/mask that it should, given which of the two was selected for the operation.
 *
 * @param {Object} test
 * @param {?function} test.pre - Routine to call after the layer has been configured, but before the test, called with the artwork as `this`.
 * @param {?function} test.post - Routine to call after the test, called with the artwork as `this`.
 * @param {function} test.operation - Routine to execute to perform the paint, called with the artwork as `this`.
 * @param {(string|CPColorBmp)} test.beforeImage
 * @param {(string|CPColorBmp)} test.expectImage
 * @param {(string|CPGreyBmp)} test.beforeMask
 * @param {(string|CPGreyBmp)} test.expectMask
 * @param {string} test.select - Which part of the layer should be selected, "layer" or "mask"? Default "layer"
 * @param {boolean} test.linkMask
 * @param {?boolean} test.expectImageToChange - Should the final image match expectImage rather than beforeImage? Default false
 * @param {?boolean} test.expectMaskToChange - Should the final mask match expectMask rather than beforeMask? Default false
 * @param {?boolean} test.testCompact - Should we test the effect of .undoCompact()? Defaults to false
 */
TestUtil.testLayerPaintOperation = function(test) {
	var
		beforeImage = typeof test.beforeImage == "string" ? TestUtil.colorBitmapFromString(test.beforeImage) : test.beforeImage,
		beforeMask = typeof test.beforeMask == "string" ? TestUtil.greyBitmapFromString(test.beforeMask) : test.beforeMask,

		expectImage = typeof test.expectImage == "string" ? TestUtil.colorBitmapFromString(test.expectImage) : test.expectImage,
		expectMask = typeof test.expectMask == "string" ? TestUtil.greyBitmapFromString(test.expectMask) : test.expectMask,

		artwork = new CPArtwork(beforeImage.width, beforeImage.height),
		layer;

	expectImage = test.expectImageToChange ? expectImage : beforeImage.clone();
	expectMask = test.expectMaskToChange ? expectMask : beforeMask.clone();

	artwork.addLayer("layer");
	artwork.addLayerMask();
	artwork.setLayerMaskLinked(test.linkMask);

	layer = artwork.getActiveLayer();

	layer.image.copyPixelsFrom(beforeImage);
	layer.mask.copyPixelsFrom(beforeMask);

	artwork.setActiveLayer(layer, test.select == "mask");

	if (test.pre) {
		test.pre.call(artwork);
	}

	TestUtil.artworkUndoRedo({
		artwork: artwork,
		pre: function () {
			assert(TestUtil.bitmapsAreEqual(layer.image, beforeImage));
			assert(TestUtil.bitmapsAreEqual(layer.mask, beforeMask));
		},
		action: function () {
			test.operation.call(artwork);
		},
		post: function () {
			assert(TestUtil.bitmapsAreEqual(layer.image, expectImage));
			assert(TestUtil.bitmapsAreEqual(layer.mask, expectMask));
			
			if (test.post) {
				test.post.call(artwork);
			}
		},
		testCompact: !!test.testCompact
	});
};

/**
 * Generate a pair of images with the given dimensions that are filled with random pixels for testing
 * blending routines.
 *
 * @param {int} width
 * @param {int} height
 * @param {int|boolean} setAlpha - The alpha to set in the pixels, or false to generate a random alpha.
 * @param {int} seed
 * @returns {CPColorBmp}
 */
TestUtil.generateRandomImageForBlendTest = function(width, height, setAlpha, seed) {
    const
        pixelChannelEdgeCases = [
            0, 1, 2, 127, 128, 129, 253, 254, 255
        ],

		image = new CPColorBmp(width, height),

        randomByte = randomInteger(0, 255),
        randomEngine = MersenneTwister19937.seed(seed);

    let
		pixIndex = 0;

    assert(Math.pow(pixelChannelEdgeCases.length, 4) <= width * height);

    // Make sure we have some good "edge case" pixels for certain:
	for (let color of pixelChannelEdgeCases) {
		for (let alpha of setAlpha === false ? pixelChannelEdgeCases : [setAlpha]) {
			image.data[pixIndex + CPColorBmp.ALPHA_BYTE_OFFSET] = alpha;
			image.data[pixIndex + CPColorBmp.RED_BYTE_OFFSET] = color;
			image.data[pixIndex + CPColorBmp.GREEN_BYTE_OFFSET] = color;
			image.data[pixIndex + CPColorBmp.BLUE_BYTE_OFFSET] = color;

			pixIndex += CPColorBmp.BYTES_PER_PIXEL;
		}
	}

	// Fill any remaining space in the layer with random pixels:
	for (; pixIndex < image.data.length; pixIndex += CPColorBmp.BYTES_PER_PIXEL) {
		image.data[pixIndex + CPColorBmp.ALPHA_BYTE_OFFSET] = setAlpha === false ? randomByte(randomEngine) : setAlpha;
		image.data[pixIndex + CPColorBmp.RED_BYTE_OFFSET] = randomByte(randomEngine);
		image.data[pixIndex + CPColorBmp.GREEN_BYTE_OFFSET] = randomByte(randomEngine);
		image.data[pixIndex + CPColorBmp.BLUE_BYTE_OFFSET] = randomByte(randomEngine);
	}

	return image;
};

/**
 * Generate a pair of images with the given dimensions that are filled with random pixels for testing
 * blending routines.
 *
 * @param {int} width
 * @param {int} height
 * @param {int|boolean} setAlphaBottom - Pass an integer to force the alpha in this image, or false to use random values
 * @param {int|boolean} setAlphaTop - Pass an integer to force the alpha in this image, or false to use random values
 * @param {int} seed
 * @returns {[CPColorBmp,CPColorBmp]} - An array [bottomImage, topImage]
 */
TestUtil.generateRandomImagePairForBlendTest = function(width, height, setAlphaBottom, setAlphaTop, seed) {
    const
		pixelChannelEdgeCases = [
			0, 1, 2, 127, 128, 129, 253, 254, 255
		],
		
		randomByte = randomInteger(0, 255),
        randomEngine = MersenneTwister19937.seed(seed),

		bottomImage = new CPColorBmp(width, height),
		topImage = new CPColorBmp(width, height);

    let
		pixIndex = 0;

    assert(Math.pow(pixelChannelEdgeCases.length, 4) <= width * height);

    for (let bottomColor of pixelChannelEdgeCases) {
        for (let bottomAlpha of setAlphaBottom === false ? pixelChannelEdgeCases : [setAlphaBottom]) {
            for (let topColor of pixelChannelEdgeCases) {
                for (let topAlpha of setAlphaTop === false ? pixelChannelEdgeCases : [setAlphaTop]) {
					/*
					 * Our blending operators treat each colour channel independently, so we can just use the same
					 * value for all colour channels
					 */
                    bottomImage.data[pixIndex + CPColorBmp.ALPHA_BYTE_OFFSET] = bottomAlpha;
                    bottomImage.data[pixIndex + CPColorBmp.RED_BYTE_OFFSET]   = bottomColor;
                    bottomImage.data[pixIndex + CPColorBmp.GREEN_BYTE_OFFSET] = bottomColor;
                    bottomImage.data[pixIndex + CPColorBmp.BLUE_BYTE_OFFSET]  = bottomColor;

                    topImage.data[pixIndex + CPColorBmp.ALPHA_BYTE_OFFSET] = topAlpha;
                    topImage.data[pixIndex + CPColorBmp.RED_BYTE_OFFSET]   = topColor;
                    topImage.data[pixIndex + CPColorBmp.GREEN_BYTE_OFFSET] = topColor;
                    topImage.data[pixIndex + CPColorBmp.BLUE_BYTE_OFFSET]  = topColor;

                    pixIndex += CPColorBmp.BYTES_PER_PIXEL;
                }
            }
        }
    }

    // Fill any remaining space in the layers with random pixels:
    for (; pixIndex < bottomImage.data.length; pixIndex += CPColorBmp.BYTES_PER_PIXEL) {
        bottomImage.data[pixIndex + CPColorBmp.ALPHA_BYTE_OFFSET] = setAlphaBottom === false ? randomByte(randomEngine) : setAlphaBottom;
        bottomImage.data[pixIndex + CPColorBmp.RED_BYTE_OFFSET]   = randomByte(randomEngine);
        bottomImage.data[pixIndex + CPColorBmp.GREEN_BYTE_OFFSET] = randomByte(randomEngine);
        bottomImage.data[pixIndex + CPColorBmp.BLUE_BYTE_OFFSET]  = randomByte(randomEngine);

        topImage.data[pixIndex + CPColorBmp.ALPHA_BYTE_OFFSET] = setAlphaTop === false ? randomByte(randomEngine) : setAlphaTop;
        topImage.data[pixIndex + CPColorBmp.RED_BYTE_OFFSET]   = randomByte(randomEngine);
        topImage.data[pixIndex + CPColorBmp.GREEN_BYTE_OFFSET] = randomByte(randomEngine);
        topImage.data[pixIndex + CPColorBmp.BLUE_BYTE_OFFSET]  = randomByte(randomEngine);
    }

    return [bottomImage, topImage];
};