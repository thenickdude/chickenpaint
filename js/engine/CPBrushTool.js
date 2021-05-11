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

import CPColorBmp from "./CPColorBmp.js";
import CPGreyBmp from "./CPGreyBmp.js";
import CPBrushInfo from "./CPBrushInfo.js";

import CPColorFloat from "../util/CPColorFloat.js";

/**
 * @param {number[]} array
 * @returns {number}
 */
function average(array) {
	let
		accumulator = 0;

	for (let i = 0; i < array.length; i++) {
		accumulator += array[i];
	}

	return accumulator / array.length;
}

/**
 * @param {CPColorFloat[]} array
 * @returns {CPColorFloat}
 */
function averageColorFloat(array) {
	let
		average = new CPColorFloat(0, 0, 0);

	for (let i = 0; i < array.length; i++) {
		let
			sample = array[i];

		average.r += sample.r;
		average.g += sample.g;
		average.b += sample.b;
	}

	average.r /= array.length;
	average.g /= array.length;
	average.b /= array.length;

	return average;
}

function lerp(from, to, prop) {
	return from * (1 - prop) + to * prop;
}

export class CPBrushTool {

	/**
	 * @param {CPGreyBmp} strokeBuffer - A 32-bit image we can use for buffering paint operations to be merged later.
	 * @param {CPRect} strokedRegion - The area of the strokeBuffer we've painted on.
	 */
	constructor(strokeBuffer, strokedRegion) {
		this._strokeBuffer = strokeBuffer;
		this._strokedRegion = strokedRegion;

		/**
		 * Set to true if the brush wants to be able to sample its output
		 * from the layer as input for its next drawing operation (i.e. please merge the stroke buffer through to the
		 * layer before the next call).
		 *
		 * @type {boolean}
		 */
		this.wantsOutputAsInput = true;
	}

	/**
	 * @param {CPColorBmp|CPGreyBmp} destImage - Image to paint to (for those brushes not using the strokeBuffer)
	 * @param {CPRect} imageRect - The area on the canvas that will be painted to
	 * @param {CPBrushInfo} brushConfig - The current brush tip configuration
	 * @param {CPRect} brushRect - The rectangle from the dab which will be painted to the canvas
	 * @param {CPBrushDab} dab
	 * @param {CPColorBmp|CPGreyBmp} sampleImage - Image to sample from (either the current layer/mask or the fusion depending on user's
	 * choice of "sample all layers"
	 * @param {int} color - RGB current brush color
	 */
	paintDab(destImage, imageRect, sampleImage, brushConfig, brushRect, dab, color) {
		let
			alpha = Math.max(1, Math.ceil(dab.alpha * brushConfig.alphaScale));

		switch (brushConfig.paintMode) {
			case CPBrushInfo.PAINT_MODE_FLOW:
				this._paintFlow(brushRect, imageRect, dab.brush, dab.width, alpha);
			break;
			case CPBrushInfo.PAINT_MODE_OPACITY:
				this._paintOpacity(brushRect, imageRect, dab.brush, dab.width, alpha);
			break;
		}
	}

	/**
	 * Blends the brush data from the current stroke (strokeBuffer, strokedRegion) onto the original (pre-stroke)
	 * image data (from undoData) and stores the result in destImage.
	 *
	 * @param {CPColorBmp} destImage - The layer to draw onto
	 * @param {CPColorBmp} undoImage - The original pixels for the layer before the stroke began
	 * @param {int} color - RGB color of the current brush
	 */
	mergeOntoImage(destImage, undoImage, color) {
		let
			strokeData = this._strokeBuffer.data,
			strokedRegion = this._strokedRegion,

			undoData = undoImage.data,
			destData = destImage.data,

			red = (color >> 16) & 0xFF,
			green = (color >> 8) & 0xFF,
			blue = color & 0xFF,

			width = strokedRegion.getWidth() | 0,
			height = strokedRegion.getHeight() | 0,

			srcOffset = this._strokeBuffer.offsetOfPixel(strokedRegion.left, strokedRegion.top),
			dstOffset = destImage.offsetOfPixel(strokedRegion.left, strokedRegion.top),

			srcYStride = (this._strokeBuffer.width - width) | 0,
			dstYStride = ((destImage.width - width) * CPColorBmp.BYTES_PER_PIXEL) | 0;

		for (let y = 0; y < height; y++, srcOffset += srcYStride, dstOffset += dstYStride) {
			for (let x = 0; x < width; x++, srcOffset++, dstOffset += CPColorBmp.BYTES_PER_PIXEL) {
				let
					strokeAlpha = (strokeData[srcOffset] / 255 + 0.5) | 0; // Round nearest so it's easier to achieve 255 opacity

				if (strokeAlpha > 0) {
					let
						destAlpha = undoData[dstOffset + CPColorBmp.ALPHA_BYTE_OFFSET],

						newLayerAlpha = (strokeAlpha + destAlpha * (255 - strokeAlpha) / 255) | 0,
						realAlpha = (255 * strokeAlpha / newLayerAlpha) | 0,
						invAlpha = 255 - realAlpha;

					destData[dstOffset] = ((red * realAlpha + undoData[dstOffset] * invAlpha) / 255) & 0xff;
					destData[dstOffset + 1] = ((green * realAlpha + undoData[dstOffset + 1] * invAlpha) / 255) & 0xff;
					destData[dstOffset + 2] = ((blue * realAlpha + undoData[dstOffset + 2] * invAlpha) / 255) & 0xff;
					destData[dstOffset + 3] = newLayerAlpha;
				}
			}
		}
	}

	/**
	 * Uses the strokeBuffer as an alpha mask to paint the given color onto the original (pre-stroke) mask data (undoMask)
	 * and stores the result in destMask.
	 *
	 * @param {CPGreyBmp} destMask - The destination to write to
	 * @param {CPGreyBmp} undoMask - The original contents of the mask
	 * @param {int} color - Intensity to paint (0-255)
	 */
	mergeOntoMask(destMask, undoMask, color) {
		let
			strokeData = this._strokeBuffer.data,
			strokedRegion = this._strokedRegion,

			undoMaskData = undoMask.data,
			destMaskData = destMask.data,

			width = strokedRegion.getWidth() | 0,
			height = strokedRegion.getHeight() | 0,

			dstOffset = destMask.offsetOfPixel(strokedRegion.left, strokedRegion.top),
			srcOffset = this._strokeBuffer.offsetOfPixel(strokedRegion.left, strokedRegion.top),

			srcYStride = (this._strokeBuffer.width - width) | 0,
			dstYStride = (destMask.width - width) | 0;

		for (let y = 0; y < height; y++, srcOffset += srcYStride, dstOffset += dstYStride) {
			for (let x = 0; x < width; x++, srcOffset++, dstOffset++) {
				let
					strokeAlpha = (strokeData[srcOffset] / 255) | 0;

				if (strokeAlpha > 0) {
					let
						invAlpha = 255 - strokeAlpha;

					destMaskData[dstOffset] = (color * strokeAlpha + undoMaskData[dstOffset] * invAlpha) / 255;
				}
			}
		}
	}

	/**
	 * Paint the brush into the strokeBuffer at the given position.
	 *
	 * If the brush covers the same area multiple times, ink builds up until the area becomes opaque.
	 *
	 * @param {CPRect} brushRect - Rectangle from brushShape array to paint
	 * @param {CPRect} imageRect - Rectangle of the destination image that corresponds to brushRect
	 * @param {Uint8Array} brushShape - An opacity mask for the brush tip shape
	 * @param {int} brushWidth - Width of the brush buffer (bytes per row)
	 * @param {int} alpha - Alpha to apply to the brush (0-255)
	 */
	_paintFlow(brushRect, imageRect, brushShape, brushWidth, alpha) {
		let
			strokeData = this._strokeBuffer.data,

			brushOffset = brushRect.left + brushRect.top * brushWidth,
			strokeOffset = this._strokeBuffer.offsetOfPixel(imageRect.left, imageRect.top),

			dstHeight = imageRect.getHeight(),
			dstWidth = imageRect.getWidth(),

			srcYStride = brushWidth - dstWidth,
			dstYStride = this._strokeBuffer.width - dstWidth;

		this._strokedRegion.union(imageRect);

		for (let y = 0; y < dstHeight; y++, brushOffset += srcYStride, strokeOffset += dstYStride) {
			for (let x = 0; x < dstWidth; x++, brushOffset++, strokeOffset++) {
				let
					brushAlpha = brushShape[brushOffset] * alpha;

				if (brushAlpha != 0) {
					strokeData[strokeOffset] = Math.min(255 * 255, strokeData[strokeOffset] + (255 - strokeData[strokeOffset] / 255) * brushAlpha / 255);
				}
			}
		}
	}

	/**
	 * The shape of the brush is combined with the alpha in the strokeBuffer with a simple max()
	 * operation. Effectively, the brush just sets the opacity of the buffer.
	 *
	 * Painting the same area multiple times during a single stroke does not increase the opacity.
	 *
	 * @param {CPRect} brushRect
	 * @param {CPRect} imageRect
	 * @param {Uint8Array} brush
	 * @param {int} brushWidth
	 * @param {int} alpha
	 */
	_paintOpacity(brushRect, imageRect, brush, brushWidth, alpha) {
		let
			strokeData = this._strokeBuffer.data,

			brushOffset = brushRect.left + brushRect.top * brushWidth,
			imageOffset = this._strokeBuffer.offsetOfPixel(imageRect.left, imageRect.top),

			imageWidth = imageRect.getWidth(),

			srcYStride = brushWidth - imageWidth,
			dstYStride = this._strokeBuffer.width - imageWidth;

		alpha = Math.min(255, alpha);

		this._strokedRegion.union(imageRect);

		for (let y = imageRect.top; y < imageRect.bottom; y++, brushOffset += srcYStride, imageOffset += dstYStride) {
			for (let x = 0; x < imageWidth; x++, brushOffset++, imageOffset++) {
				strokeData[imageOffset] = Math.max(brush[brushOffset] * alpha, strokeData[imageOffset]);
			}
		}
	}

	/**
	 * Allows setup to be performed when a stroke begins
	 */
	beginStroke() {
	}

	/**
	 * Allows teardown to be performed when a stroke ends
	 */
	endStroke() {
	}
}

export class CPBrushToolEraser extends CPBrushTool {
	/**
	 * @override
	 */
	mergeOntoImage(destImage, undoImage, color) {
		let
			strokeData = this._strokeBuffer.data,
			strokedRegion = this._strokedRegion,

			undoData = undoImage.data,
			destData = destImage.data;

		for (let y = strokedRegion.top; y < strokedRegion.bottom; y++) {
			let
				dstOffset = destImage.offsetOfPixel(strokedRegion.left, y) + CPColorBmp.ALPHA_BYTE_OFFSET,
				srcOffset = this._strokeBuffer.offsetOfPixel(strokedRegion.left, y);

			for (let x = strokedRegion.left; x < strokedRegion.right; x++, dstOffset += CPColorBmp.BYTES_PER_PIXEL) {
				let
					strokeAlpha = (strokeData[srcOffset++] / 255) | 0;

				if (strokeAlpha > 0) {
					let
						destAlpha = undoData[dstOffset];

					destData[dstOffset] = destAlpha * (255 - strokeAlpha) / 255;
				}
			}
		}
	}
}

export class CPBrushToolDodge extends CPBrushTool {
	/**
	 * Uses the opacity data in the strokeBuffer to brighten non-transparent pixels from the original image.
	 *
	 * @override
	 */
	mergeOntoImage(destImage, undoImage, color) {
		let
			strokeData = this._strokeBuffer.data,
			strokedRegion = this._strokedRegion,

			width = strokedRegion.getWidth(),
			height = strokedRegion.getHeight(),

			dstOffset = destImage.offsetOfPixel(strokedRegion.left, strokedRegion.top),
			srcOffset = this._strokeBuffer.offsetOfPixel(strokedRegion.left, strokedRegion.top),

			dstYSkip = (destImage.width - width) * CPColorBmp.BYTES_PER_PIXEL,
			srcYSkip = this._strokeBuffer.width - width,

			undoData = undoImage.data,
			destImageData = destImage.data;

		for (let y = 0; y < height; y++, srcOffset += srcYSkip, dstOffset += dstYSkip) {
			for (let x = 0; x < width; x++, srcOffset++, dstOffset += CPColorBmp.BYTES_PER_PIXEL) {
				let
					strokeAlpha = (strokeData[srcOffset] / 255) | 0;

				if (strokeAlpha > 0 && undoData[dstOffset + CPColorBmp.ALPHA_BYTE_OFFSET] != 0) {
					let
						scale = (strokeAlpha + 255) / 255;

					destImageData[dstOffset + CPColorBmp.RED_BYTE_OFFSET] = undoData[dstOffset + CPColorBmp.RED_BYTE_OFFSET] * scale;
					destImageData[dstOffset + CPColorBmp.GREEN_BYTE_OFFSET] = undoData[dstOffset + CPColorBmp.GREEN_BYTE_OFFSET] * scale;
					destImageData[dstOffset + CPColorBmp.BLUE_BYTE_OFFSET] = undoData[dstOffset + CPColorBmp.BLUE_BYTE_OFFSET] * scale;
				}
			}
		}
	}

	/**
	 * @override
	 */
	mergeOntoMask(destMask, undoMask, color) {
		let
			strokeData = this._strokeBuffer.data,
			strokedRegion = this._strokedRegion,

			width = strokedRegion.getWidth(),
			height = strokedRegion.getHeight(),

			dstOffset = destMask.offsetOfPixel(strokedRegion.left, strokedRegion.top),
			srcOffset = this._strokeBuffer.offsetOfPixel(strokedRegion.left, strokedRegion.top),

			dstYSkip = destMask.width - width,
			srcYSkip = this._strokeBuffer.width - width,

			undoMaskData = undoMask.data,
			destMaskData = destMask.data;

		for (let y = 0; y < height; y++, srcOffset += srcYSkip, dstOffset += dstYSkip) {
			for (let x = 0; x < width; x++, srcOffset++, dstOffset++) {
				let
					strokeAlpha = (strokeData[srcOffset] / 255) | 0;

				if (strokeAlpha > 0) {
					let
						scale = (strokeAlpha + 255) / 255;

					destMaskData[dstOffset] = Math.min(undoMaskData[dstOffset] * scale, 255);
				}
			}
		}
	}
}

const
	BURN_CONSTANT = 260;

export class CPBrushToolBurn extends CPBrushTool {
	/**
	 * Uses the opacity data in the strokeBuffer to brighten non-transparent pixels from the original image.
	 *
	 * @override
	 */
	mergeOntoImage(destImage, undoImage, color) {
		let
			strokeData = this._strokeBuffer.data,
			strokedRegion = this._strokedRegion,

			width = strokedRegion.getWidth(),
			height = strokedRegion.getHeight(),

			dstOffset = destImage.offsetOfPixel(strokedRegion.left, strokedRegion.top),
			srcOffset = this._strokeBuffer.offsetOfPixel(strokedRegion.left, strokedRegion.top),

			dstYSkip = (destImage.width - width) * CPColorBmp.BYTES_PER_PIXEL,
			srcYSkip = this._strokeBuffer.width - width,

			undoData = undoImage.data,
			destImageData = destImage.data;

		for (let y = 0; y < height; y++, srcOffset += srcYSkip, dstOffset += dstYSkip) {
			for (let x = 0; x < width; x++, srcOffset++, dstOffset += CPColorBmp.BYTES_PER_PIXEL) {
				let
					strokeAlpha = (strokeData[srcOffset] / 255) | 0;

				if (strokeAlpha > 0 && undoData[dstOffset + CPColorBmp.ALPHA_BYTE_OFFSET] != 0) {
					destImageData[dstOffset + CPColorBmp.RED_BYTE_OFFSET]   = (undoData[dstOffset + CPColorBmp.RED_BYTE_OFFSET]   - (BURN_CONSTANT - undoData[dstOffset + CPColorBmp.RED_BYTE_OFFSET])   * strokeAlpha / 255) | 0;
					destImageData[dstOffset + CPColorBmp.GREEN_BYTE_OFFSET] = (undoData[dstOffset + CPColorBmp.GREEN_BYTE_OFFSET] - (BURN_CONSTANT - undoData[dstOffset + CPColorBmp.GREEN_BYTE_OFFSET]) * strokeAlpha / 255) | 0;
					destImageData[dstOffset + CPColorBmp.BLUE_BYTE_OFFSET]  = (undoData[dstOffset + CPColorBmp.BLUE_BYTE_OFFSET]  - (BURN_CONSTANT - undoData[dstOffset + CPColorBmp.BLUE_BYTE_OFFSET])  * strokeAlpha / 255) | 0;
				}
			}
		}
	}

	/**
	 * @override
	 */
	mergeOntoMask(destMask, undoMask, color) {
		let
			strokeData = this._strokeBuffer.data,
			strokedRegion = this._strokedRegion,

			width = strokedRegion.getWidth(),
			height = strokedRegion.getHeight(),

			dstOffset = destMask.offsetOfPixel(strokedRegion.left, strokedRegion.top),
			srcOffset = this._strokeBuffer.offsetOfPixel(strokedRegion.left, strokedRegion.top),

			dstYSkip = destMask.width - width,
			srcYSkip = this._strokeBuffer.width - width,

			undoMaskData = undoMask.data,
			destMaskData = destMask.data;

		for (let y = 0; y < height; y++, srcOffset += srcYSkip, dstOffset += dstYSkip) {
			for (let x = 0; x < width; x++, srcOffset++, dstOffset++) {
				let
					strokeAlpha = (strokeData[srcOffset] / 255) | 0;

				if (strokeAlpha > 0) {
					destMaskData[dstOffset] = Math.max(undoMaskData[dstOffset] - (BURN_CONSTANT - undoMaskData[dstOffset]) * strokeAlpha / 255, 0);
				}
			}
		}
	}
}

const
	BLUR_MIN = 64,
	BLUR_MAX = 1;

/**
 * Blends a pixel with its nearest 4 neighbors using a weighted sum. The opacity accumulated in the stroke buffer decides
 * how much weight the central pixel should have in the sum (higher opacities cause the central pixel to have lower weight,
 * increasing the contribution of those on the edges)
 */
export class CPBrushToolBlur extends CPBrushTool {
	/**
	 * @override
	 */
	mergeOntoImage(destImage, undoImage, color) {
		let
			strokeData = this._strokeBuffer.data,
			strokedRegion = this._strokedRegion,

			undoData = undoImage.data,
			destImageData = destImage.data,

			width = strokedRegion.getWidth(),

			destYStride = undoImage.width * CPColorBmp.BYTES_PER_PIXEL,

			destOffset = undoImage.offsetOfPixel(strokedRegion.left, strokedRegion.top),
			srcOffset = this._strokeBuffer.offsetOfPixel(strokedRegion.left, strokedRegion.top),

			destYSkip = (undoImage.width - width) * CPColorBmp.BYTES_PER_PIXEL,
			srcYSkip = this._strokeBuffer.width - width,

			r, g, b, a,

			addSample = function(sampleOffset) {
				r += undoData[sampleOffset + CPColorBmp.RED_BYTE_OFFSET];
				g += undoData[sampleOffset + CPColorBmp.GREEN_BYTE_OFFSET];
				b += undoData[sampleOffset + CPColorBmp.BLUE_BYTE_OFFSET];
				a += undoData[sampleOffset + CPColorBmp.ALPHA_BYTE_OFFSET];
			};

		for (let y = strokedRegion.top; y < strokedRegion.bottom; y++, destOffset += destYSkip, srcOffset += srcYSkip) {
			for (let x = strokedRegion.left; x < strokedRegion.right; x++, destOffset += CPColorBmp.BYTES_PER_PIXEL, srcOffset++) {
				let
					strokeAlpha = (strokeData[srcOffset] / 255) | 0;

				if (strokeAlpha > 0) {
					let
						centralSampleWeight = (BLUR_MIN + (BLUR_MAX - BLUR_MIN) * strokeAlpha / 255) | 0,

						weightSum = centralSampleWeight + 4;

					// Center pixel has a custom weighting
					r = centralSampleWeight * undoData[destOffset + CPColorBmp.RED_BYTE_OFFSET];
					g = centralSampleWeight * undoData[destOffset + CPColorBmp.GREEN_BYTE_OFFSET];
					b = centralSampleWeight * undoData[destOffset + CPColorBmp.BLUE_BYTE_OFFSET];
					a = centralSampleWeight * undoData[destOffset + CPColorBmp.ALPHA_BYTE_OFFSET];

					// The other pixels have a unit weighting

					// x, y - 1
					addSample(y > 0 ? destOffset - destYStride : destOffset);
					// x, y + 1
					addSample(y < undoImage.height - 1 ? destOffset + destYStride : destOffset);
					// x - 1, y
					addSample(x > 0 ? destOffset - CPColorBmp.BYTES_PER_PIXEL : destOffset);
					// x + 1, y
					addSample(x < undoImage.width - 1 ? destOffset + CPColorBmp.BYTES_PER_PIXEL : destOffset);

					a /= weightSum;
					r /= weightSum;
					g /= weightSum;
					b /= weightSum;

					destImageData[destOffset + CPColorBmp.RED_BYTE_OFFSET] = r | 0;
					destImageData[destOffset + CPColorBmp.GREEN_BYTE_OFFSET] = g | 0;
					destImageData[destOffset + CPColorBmp.BLUE_BYTE_OFFSET] = b | 0;
					destImageData[destOffset + CPColorBmp.ALPHA_BYTE_OFFSET] = a | 0;
				}
			}
		}
	}

	/**
	 * @override
	 */
	mergeOntoMask(destMask, undoMask, color) {
		let
			strokeData = this._strokeBuffer.data,
			strokedRegion = this._strokedRegion,

			undoMaskData = undoMask.data,
			destMaskData = destMask.data,

			width = strokedRegion.getWidth(),

			destYStride = undoMask.width,

			destOffset = undoMask.offsetOfPixel(strokedRegion.left, strokedRegion.top),
			srcOffset = this._strokeBuffer.offsetOfPixel(strokedRegion.left, strokedRegion.top),

			destYSkip = undoMask.width - width,
			srcYSkip = this._strokeBuffer.width - width,

			sampleSum;

		for (let y = strokedRegion.top; y < strokedRegion.bottom; y++, destOffset += destYSkip, srcOffset += srcYSkip) {
			for (let x = strokedRegion.left; x < strokedRegion.right; x++, destOffset++, srcOffset++) {
				let
					strokeAlpha = (strokeData[srcOffset] / 255) | 0;

				if (strokeAlpha > 0) {
					let
						centralSampleWeight = (BLUR_MIN + (BLUR_MAX - BLUR_MIN) * strokeAlpha / 255) | 0,

						weightSum = centralSampleWeight + 4;

					// Center pixel has a custom weighting
					sampleSum = centralSampleWeight * undoMaskData[destOffset];

					// The other pixels have a unit weighting

					// x, y - 1
					sampleSum += undoMaskData[y > 0 ? destOffset - destYStride : destOffset];
					// x, y + 1
					sampleSum += undoMaskData[y < undoMask.height - 1 ? destOffset + destYStride : destOffset];
					// x - 1, y
					sampleSum += undoMaskData[x > 0 ? destOffset - 1 : destOffset];
					// x + 1, y
					sampleSum += undoMaskData[x < undoMask.width - 1 ? destOffset + 1 : destOffset];

					destMaskData[destOffset] = (sampleSum / weightSum) | 0;
				}
			}
		}
	}
}

/**
 * Brushes derived from this class use the strokeBuffer as a ARGB or AG (greyscale) layer.
 *
 * The undoBuffer (pre-stroke image data) is restored to the layer, then the pixels from strokeBuffer are blended
 * on top of that.
 */
class CPBrushToolDirectBrush extends CPBrushTool {
	/**
	 * @override
	 */
	mergeOntoImage(destImage, undoImage, color) {
		let
			strokeData = this._strokeBuffer.data,
			strokedRegion = this._strokedRegion,

			undoData = undoImage.data,
			destImageData = destImage.data,

			srcOffset = this._strokeBuffer.offsetOfPixel(strokedRegion.left, strokedRegion.top),
			dstOffset = destImage.offsetOfPixel(strokedRegion.left, strokedRegion.top),

			width = strokedRegion.getWidth() | 0,
			height = strokedRegion.getHeight() | 0,

			srcYStride = (this._strokeBuffer.width - width) | 0,
			dstYStride = ((destImage.width - width) * CPColorBmp.BYTES_PER_PIXEL) | 0;

		for (let y = 0; y < height; y++, srcOffset += srcYStride, dstOffset += dstYStride) {
			for (let x = 0; x < width; x++, srcOffset++, dstOffset += CPColorBmp.BYTES_PER_PIXEL) {
				let
					color1 = strokeData[srcOffset],
					alpha1 = color1 >>> 24;

				if (alpha1 > 0) {
					let
						alpha2 = undoData[dstOffset + CPColorBmp.ALPHA_BYTE_OFFSET],
						newAlpha = (alpha1 + alpha2 - alpha1 * alpha2 / 255) | 0,

						realAlpha = (alpha1 * 255 / newAlpha) | 0,
						invAlpha = 255 - realAlpha;

					destImageData[dstOffset] = ((((color1 >> 16) & 0xFF) * realAlpha + undoData[dstOffset] * invAlpha) / 255) | 0;
					destImageData[dstOffset + 1] = ((((color1 >> 8) & 0xFF) * realAlpha + undoData[dstOffset + 1] * invAlpha) / 255) | 0;
					destImageData[dstOffset + 2] = (((color1 & 0xFF) * realAlpha + undoData[dstOffset + 2] * invAlpha) / 255) | 0;
					destImageData[dstOffset + 3] = newAlpha;
				}
			}
		}
	}

	/**
	 * @override
	 */
	mergeOntoMask(destMask, undoMask, color) {
		let
			strokeData = this._strokeBuffer.data,
			strokedRegion = this._strokedRegion,
			undoMaskData = undoMask.data,
			destMaskData = destMask.data,

			srcOffset = this._strokeBuffer.offsetOfPixel(strokedRegion.left, strokedRegion.top),
			dstOffset = destMask.offsetOfPixel(strokedRegion.left, strokedRegion.top),

			width = strokedRegion.getWidth() | 0,
			height = strokedRegion.getHeight() | 0,

			srcYStride = (this._strokeBuffer.width - width) | 0,
			dstYStride = (destMask.width - width) | 0;

		for (let y = 0; y < height; y++, srcOffset += srcYStride, dstOffset += dstYStride) {
			for (let x = 0; x < width; x++, srcOffset++, dstOffset++) {
				let
					color1 = strokeData[srcOffset],
					alpha1 = color1 >> 8;

				if (alpha1 > 0) {
					let
						invAlpha = 255 - alpha1;

					destMaskData[dstOffset] = (((color1 & 0xFF) * alpha1 + undoMaskData[dstOffset] * invAlpha) / 255) | 0;
				}
			}
		}
	}
}

const
	WATERCOLOR_NUM_SAMPLES = 50,
	WATERCOLOR_SAMPLE_RADIUS = 64,
	WATERCOLOR_SPREAD_FACTOR = 2 / 6;

export class CPBrushToolWatercolor extends CPBrushToolDirectBrush {

	constructor(strokeBuffer, strokedRegion) {
		super(strokeBuffer, strokedRegion);

		this.wantsOutputAsInput = true;
	}

	/**
	 * Average out a bunch of samples from around the given pixel.
	 *
	 * @param {CPGreyBmp} mask
	 * @param {number} x - Center of sample
	 * @param {number} y
	 * @param {number} dx - Spread of samples from center
	 * @param {number} dy
	 *
	 * @returns {number}
	 */
	static _sampleGrey(mask, x, y, dx, dy) {
		x = x | 0;
		y = y | 0;

		let
			samples = [
				{x: x, y: y}
			];

		for (let r = 0.25; r < 1.001; r += .25) {
			Array.prototype.push.apply(samples, [
				{x: ~~(x + r * dx), y: y},
				{x: ~~(x - r * dx), y: y},
				{x: x, y: ~~(y + r * dy)},
				{x: x, y: ~~(y - r * dy)},

				{x: ~~(x + r * 0.7 * dx), y: ~~(y + r * 0.7 * dy)},
				{x: ~~(x + r * 0.7 * dx), y: ~~(y - r * 0.7 * dy)},
				{x: ~~(x - r * 0.7 * dx), y: ~~(y + r * 0.7 * dy)},
				{x: ~~(x - r * 0.7 * dx), y: ~~(y - r * 0.7 * dy)}
			]);
		}

		return average(samples.map(coord => mask.getPixel(coord.x, coord.y)));
	}

	/**
	 * Average out a bunch of samples from around the given pixel.
	 *
	 * @param {CPColorBmp} image
	 * @param {number} x - Center of sample
	 * @param {number} y
	 * @param {number} dx - Spread of samples from center
	 * @param {number} dy
	 *
	 * @returns {CPColorFloat}
	 */
	static _sampleRGB(image, x, y, dx, dy) {
		x = x | 0;
		y = y | 0;

		let
			samples = [
				{x: x, y: y}
			];

		for (let r = 0.25; r < 1.001; r += .25) {
			Array.prototype.push.apply(samples, [
				{x: ~~(x + r * dx), y: y},
				{x: ~~(x - r * dx), y: y},
				{x: x, y: ~~(y + r * dy)},
				{x: x, y: ~~(y - r * dy)},

				{x: ~~(x + r * 0.7 * dx), y: ~~(y + r * 0.7 * dy)},
				{x: ~~(x + r * 0.7 * dx), y: ~~(y - r * 0.7 * dy)},
				{x: ~~(x - r * 0.7 * dx), y: ~~(y + r * 0.7 * dy)},
				{x: ~~(x - r * 0.7 * dx), y: ~~(y - r * 0.7 * dy)}
			]);
		}

		return averageColorFloat(samples.map(coord => CPColorFloat.createFromInt(image.getPixel(coord.x, coord.y))));
	}

	/**
	 * Blend the brush stroke with full color into the strokeBuffer
	 *
	 * @param {CPRect} brushRect
	 * @param {CPRect} imageRect
	 * @param {Uint8Array} brushShape
	 * @param {int} brushWidth
	 * @param {int} alpha
	 * @param {int} color1 - RGB brush color
	 */
	_paintToColorStrokeBuffer(brushRect, imageRect, brushShape, brushWidth, alpha, color1) {
		let
			strokeData = this._strokeBuffer.data,

			width = imageRect.getWidth(),
			height = imageRect.getHeight(),

			imageYSkip = this._strokeBuffer.width - width,
			brushYSkip = brushWidth - width,

			brushOffset = brushRect.left + brushRect.top * brushWidth,
			imageOffset = this._strokeBuffer.offsetOfPixel(imageRect.left, imageRect.top);

		this._strokedRegion.union(imageRect);

		for (let y = 0; y < height; y++, brushOffset += brushYSkip, imageOffset += imageYSkip) {
			for (let x = 0; x < width; x++, brushOffset++, imageOffset++) {
				let
					alpha1 = (brushShape[brushOffset] * alpha / 255) | 0;

				if (alpha1 > 0) {
					let
						color2 = strokeData[imageOffset],
						alpha2 = color2 >>> 24,

						newAlpha = (alpha1 + alpha2 - alpha1 * alpha2 / 255) | 0,
						realAlpha = (alpha1 * 255 / newAlpha) | 0,
						invAlpha = 255 - realAlpha;

					// The usual alpha blending formula C = A * alpha + B * (1 - alpha)
					// has to rewritten in the form C = A + (1 - alpha) * B - (1 - alpha) *A
					// that way the rounding up errors won't cause problems
					strokeData[imageOffset] = (newAlpha << 24)
						| ((color1 >> 16 & 0xff) + (((color2 >> 16 & 0xff) * invAlpha - (color1 >> 16 & 0xff) * invAlpha) / 255)) << 16
						| ((color1 >> 8 & 0xff) + (((color2 >> 8 & 0xff) * invAlpha - (color1 >> 8 & 0xff) * invAlpha) / 255)) << 8
						| ((color1 & 0xff) + (((color2 & 0xff) * invAlpha - (color1 & 0xff) * invAlpha) / 255))
				}
			}
		}
	}

	/**
	 * Blend a brush stroke into the strokeBuffer
	 *
	 * @param {CPRect} brushRect
	 * @param {CPRect} imageRect
	 * @param {Uint8Array} brushShape - Defines the shape of the brush tip
	 * @param {int} brushWidth - Width of the brushShape array
	 * @param {int} alpha - 0 - 255 alpha of the brush stroke
	 * @param {int} color1 - Greyscale intensity (0 - 255)
	 */
	_paintToGreyscaleStrokeBuffer(brushRect, imageRect, brushShape, brushWidth, alpha, color1) {
		let
			strokeData = this._strokeBuffer.data;

		this._strokedRegion.union(imageRect);

		for (let destY = imageRect.top, brushY = brushRect.top; destY < imageRect.bottom; destY++, brushY++) {
			let
				srcOffset = brushRect.left + brushY * brushWidth,
				dstOffset = this._strokeBuffer.offsetOfPixel(imageRect.left, destY);

			for (let destX = imageRect.left; destX < imageRect.right; destX++, srcOffset++, dstOffset++) {
				let
					alpha1 = (brushShape[srcOffset] * alpha / 255) | 0;

				if (alpha1 <= 0) {
					continue;
				}

				let
					color2 = strokeData[dstOffset],
					alpha2 = color2 >> 8,

					newAlpha = (alpha1 + alpha2 - alpha1 * alpha2 / 255) | 0;

				if (newAlpha > 0) {
					let
						realAlpha = (alpha1 * 255 / newAlpha) | 0,
						invAlpha = 255 - realAlpha;

					// The usual alpha blending formula C = A * alpha + B * (1 - alpha)
					// has to rewritten in the form C = A + (1 - alpha) * B - (1 - alpha) *A
					// that way the rounding up errors won't cause problems

					strokeData[dstOffset] =
						(newAlpha << 8)
						| (color1 + (((color2 & 0xFF) * invAlpha - color1 * invAlpha) / 255));
				}
			}
		}
	}

	/**
	 * @override
	 */
	beginStroke() {
		this._previousSamples = null;
	}

	/**
	 * @override
	 */
	paintDab(destImage, imageRect, sampleImage, brushConfig, brushRect, dab, color) {
		var
			paintAlpha = Math.max(1, dab.alpha / 4),
			sampleX = (imageRect.left + imageRect.right) / 2,
			sampleY = (imageRect.top + imageRect.bottom) / 2,
			dx = Math.max(1, Math.min(WATERCOLOR_SAMPLE_RADIUS, imageRect.getWidth() * WATERCOLOR_SPREAD_FACTOR)),
			dy = Math.max(1, Math.min(WATERCOLOR_SAMPLE_RADIUS, imageRect.getHeight() * WATERCOLOR_SPREAD_FACTOR));

		if (sampleImage instanceof CPGreyBmp) {
			// Mask editing
			if (this._previousSamples == null) {
				// Seed the previousSamples list to capacity with a bunch of copies of one sample to get us started
				this._previousSamples = new Array(WATERCOLOR_NUM_SAMPLES);

				this._previousSamples.fill(CPBrushToolWatercolor._sampleGrey(
					sampleImage,
					sampleX, sampleY,
					dx, dy
				));
			}

			let
				wcColor = average(this._previousSamples),
				newColor;

			// resaturation
			wcColor = lerp(wcColor, color & 0xFF, brushConfig.resat * brushConfig.resat);

			newColor = wcColor;

			// bleed
			wcColor = lerp(wcColor, CPBrushToolWatercolor._sampleGrey(
				sampleImage,
				sampleX, sampleY,
				dx, dy
			), brushConfig.bleed);

			this._previousSamples.push(wcColor);
			this._previousSamples.shift();

			this._paintToGreyscaleStrokeBuffer(brushRect, imageRect, dab.brush, dab.width, paintAlpha, Math.round(newColor));
		} else {
			if (this._previousSamples == null) {
				// Seed the previousSamples list to capacity with a bunch of copies of one sample to get us started
				this._previousSamples = new Array(WATERCOLOR_NUM_SAMPLES);

				this._previousSamples.fill(CPBrushToolWatercolor._sampleRGB(
					sampleImage,
					sampleX, sampleY,
					dx, dy
				));
			}

			let
				wcColor = averageColorFloat(this._previousSamples);

			// resaturation - add the brush's color to the mixture
			wcColor.mixWith(CPColorFloat.createFromInt(color), brushConfig.resat * brushConfig.resat);

			let
				newColor = wcColor.toInt();

			// bleed
			wcColor.mixWith(
				CPBrushToolWatercolor._sampleRGB(
					sampleImage,
					sampleX, sampleY,
					dx, dy
				),
				brushConfig.bleed
			);

			this._previousSamples.push(wcColor);
			this._previousSamples.shift();

			this._paintToColorStrokeBuffer(brushRect, imageRect, dab.brush, dab.width, paintAlpha, newColor);
		}
	}
}

export class CPBrushToolOil extends CPBrushToolDirectBrush {

	constructor(strokeBuffer, strokedRegion) {
		super(strokeBuffer, strokedRegion);

		this.wantsOutputAsInput = true;
	}

	/**
	 * Sample intensities from the image and mix them into the brush.
	 *
	 * @param {CPColorBmp} maskToSample
	 * @param {CPRect} brushRect
	 * @param {CPRect} imageRect
	 * @param {int} alpha1 - 0-255 controls how much paint is picked up from the image
	 */
	_accumulatePaintFromMask(maskToSample, brushRect, imageRect, alpha1) {
		let
			brushData = this._brushBuffer.data,
			sampleData = maskToSample.data,

			width = imageRect.getWidth(),
			height = imageRect.getHeight(),

			srcOffset = brushRect.left + brushRect.top * this._brushBuffer.width,
			dstOffset = maskToSample.offsetOfPixel(imageRect.left, imageRect.top),

			srcYSkip = this._brushBuffer.width - width,
			dstYSkip = maskToSample.width - width;

		if (alpha1 <= 0) {
			return;
		}

		for (let y = 0; y < height; y++, srcOffset += srcYSkip, dstOffset += dstYSkip) {
			for (let x = 0; x < width; x++, srcOffset++, dstOffset++) {
				let
					grey1 = sampleData[dstOffset],

					grey2 = brushData[srcOffset],
					alpha2 = grey2 >> 8,

					newAlpha = (alpha1 + alpha2 - alpha1 * alpha2 / 255) | 0,

					realAlpha = (alpha1 * 255 / newAlpha) | 0,
					invAlpha = 255 - realAlpha;

				brushData[srcOffset] = (newAlpha << 8) | (grey1 + ((grey2 & 0xff) * invAlpha - grey1 * invAlpha) / 255);
			}
		}
	}

	/**
	 * Add some of the given grey value back into the brush.
	 *
	 * @param {CPRect} brushRect
	 * @param {int} alpha1 - Strength of resaturation (0-255)
	 * @param {int} grey1 - Intensity to resaturate brush tip with
	 */
	_resaturateBrushWithGrey(brushRect, alpha1, grey1) {
		if (alpha1 <= 0) {
			return;
		}

		let
			brushData = this._brushBuffer.data,

			width = brushRect.getWidth(),
			height = brushRect.getHeight(),

			brushOffset = brushRect.left + brushRect.top * this._brushBuffer.width,
			brushYSkip = this._brushBuffer.width - width;

		for (let y = 0; y < height; y++, brushOffset += brushYSkip) {
			for (let x = 0; x < width; x++, brushOffset++) {
				let
					grey2 = brushData[brushOffset],
					alpha2 = grey2 >> 8,

					newAlpha = (alpha1 + alpha2 - alpha1 * alpha2 / 255) | 0,

					realAlpha = (alpha1 * 255 / newAlpha) | 0,
					invAlpha = 255 - realAlpha;

				brushData[brushOffset] = (newAlpha << 8) | (grey1 + ((grey2 & 0xff) * invAlpha - grey1 * invAlpha) / 255);
			}
		}
	}

	/**
	 * Mixes the paint on the current brush with the pixels of the layer, and writes the result into the
	 * AG strokeBuffer.
	 *
	 * @param {CPGreyBmp} destImage - Image that is being drawn onto
	 * @param {CPRect} brushRect
	 * @param {CPRect} imageRect
	 * @param {Uint8Array} brushShape - Brush opacity map which defines its shape, of the same width as brushBuffer
	 * @param {int} alpha 0-255 brush alpha
	 */
	_paintToGreyscaleStrokeBuffer(destImage, brushRect, imageRect, brushShape, alpha) {
		let
			strokeData = this._strokeBuffer.data,
			brushData = this._brushBuffer.data,
			destImageData = destImage.data;

		this._strokedRegion.union(imageRect);

		for (let y = imageRect.top, brushY = brushRect.top; y < imageRect.bottom; y++, brushY++) {
			let
				bufferOffset = this._brushBuffer.offsetOfPixel(brushRect.left, brushY),
				strokeOffset = this._strokeBuffer.offsetOfPixel(imageRect.left, y),
				layerOffset = destImage.offsetOfPixel(imageRect.left, y);

			for (let x = imageRect.left; x < imageRect.right; x++, bufferOffset++, layerOffset++, strokeOffset++) {
				let
					grey1 = brushData[bufferOffset],
					alpha1 = ((grey1 >> 8) * brushShape[bufferOffset] * alpha / (255 * 255)) | 0;

				if (alpha1 > 0) {
					let
						grey2 = destImageData[layerOffset],
						invAlpha = 255 - alpha1;

					strokeData[strokeOffset] = (255 << 8) | ((grey1 & 0xff) + ((grey2 * invAlpha - (grey1 & 0xff) * invAlpha) / 255));
				}
			}
		}
	}

	/**
	 * Sample colors from the image and mix them into the brush.
	 *
	 * @param {CPColorBmp} imageToSample
	 * @param {CPRect} brushRect
	 * @param {CPRect} imageRect
	 * @param {int} alpha - 0-255 controls how much paint is picked up from the image
	 */
	_accumulatePaintFromImage(imageToSample, brushRect, imageRect, alpha) {
		let
			brushData = this._brushBuffer.data,
			sampleData = imageToSample.data,

			width = imageRect.getWidth(),
			height = imageRect.getHeight(),

			srcOffset = brushRect.left + brushRect.top * this._brushBuffer.width,
			dstOffset = imageToSample.offsetOfPixel(imageRect.left, imageRect.top),

			srcYSkip = this._brushBuffer.width - width,
			dstYSkip = (imageToSample.width - width) * CPColorBmp.BYTES_PER_PIXEL;

		for (let y = 0; y < height; y++, srcOffset += srcYSkip, dstOffset += dstYSkip) {
			for (let x = 0; x < width; x++, srcOffset++, dstOffset += CPColorBmp.BYTES_PER_PIXEL) {
				let
					alpha1 = (sampleData[dstOffset + CPColorBmp.ALPHA_BYTE_OFFSET] * alpha / 255) | 0;

				if (alpha1 > 0) {
					let
						color2 = brushData[srcOffset],
						alpha2 = color2 >>> 24,

						newAlpha = (alpha1 + alpha2 - alpha1 * alpha2 / 255) | 0,

						realAlpha = (alpha1 * 255 / newAlpha) | 0,
						invAlpha = 255 - realAlpha,

						color1Red = sampleData[dstOffset + CPColorBmp.RED_BYTE_OFFSET],
						color1Green = sampleData[dstOffset + CPColorBmp.GREEN_BYTE_OFFSET],
						color1Blue = sampleData[dstOffset + CPColorBmp.BLUE_BYTE_OFFSET];

					brushData[srcOffset] = newAlpha << 24
						| (color1Red + (((color2 >> 16 & 0xff) * invAlpha - color1Red * invAlpha) / 255)) << 16
						| (color1Green + (((color2 >> 8 & 0xff) * invAlpha - color1Green * invAlpha) / 255)) << 8
						| (color1Blue + (((color2 & 0xff) * invAlpha - color1Blue * invAlpha) / 255));
				}
			}
		}
	}

	/**
	 * Add some of the given color back into the brush.
	 *
	 * @param {CPRect} brushRect
	 * @param {int} alpha1 - Strength of resaturation (0-255)
	 * @param {int} color1 - RGB color to resaturate brush tip with
	 */
	_resaturateBrushWithColor(brushRect, alpha1, color1) {
		if (alpha1 <= 0) {
			return;
		}

		let
			brushData = this._brushBuffer.data,

			width = brushRect.getWidth(),
			height = brushRect.getHeight(),

			brushOffset = brushRect.left + brushRect.top * this._brushBuffer.width,
			brushYSkip = this._brushBuffer.width - width;

		for (let y = 0; y < height; y++, brushOffset += brushYSkip) {
			for (let x = 0; x < width; x++, brushOffset++) {
				let
					color2 = brushData[brushOffset],
					alpha2 = (color2 >>> 24),

					newAlpha = (alpha1 + alpha2 - alpha1 * alpha2 / 255) | 0,

					realAlpha = (alpha1 * 255 / newAlpha) | 0,
					invAlpha = 255 - realAlpha;

				brushData[brushOffset] = newAlpha << 24
					| ((color1 >>> 16 & 0xff) + (((color2 >>> 16 & 0xff) * invAlpha - (color1 >>> 16 & 0xff) * invAlpha) / 255)) << 16
					| ((color1 >>> 8 & 0xff) + (((color2 >>> 8 & 0xff) * invAlpha - (color1 >>> 8 & 0xff) * invAlpha) / 255)) << 8
					| ((color1 & 0xff) + (((color2 & 0xff) * invAlpha - (color1 & 0xff) * invAlpha) / 255));
			}
		}
	}

	/**
	 * Mixes the paint on the current brush with the pixels of the layer, and writes the result into the
	 * strokeBuffer.
	 *
	 * @param {CPColorBmp} destImage - Image that is being drawn onto
	 * @param {CPRect} brushRect
	 * @param {CPRect} imageRect
	 * @param {Uint8Array} brushShape - Brush opacity map which defines its shape, of the same width as brushBuffer
	 * @param {int} alpha 0-255 brush alpha
	 */
	_paintToColorStrokeBuffer(destImage, brushRect, imageRect, brushShape, alpha) {
		let
			strokeData = this._strokeBuffer.data,
			brushData = this._brushBuffer.data,
			destImageData = destImage.data;

		this._strokedRegion.union(imageRect);

		for (let y = imageRect.top, brushY = brushRect.top; y < imageRect.bottom; y++, brushY++) {
			let
				bufferOffset = this._brushBuffer.offsetOfPixel(brushRect.left, brushY),
				strokeOffset = this._strokeBuffer.offsetOfPixel(imageRect.left, y),
				layerOffset = destImage.offsetOfPixel(imageRect.left, y);

			for (let x = imageRect.left; x < imageRect.right; x++, bufferOffset++, layerOffset += CPColorBmp.BYTES_PER_PIXEL, strokeOffset++) {
				let
					color1 = brushData[bufferOffset],
					alpha1 = ((color1 >>> 24) * brushShape[bufferOffset] * alpha / (255 * 255)) | 0;

				if (alpha1 > 0) {
					let
						alpha2 = destImageData[layerOffset + CPColorBmp.ALPHA_BYTE_OFFSET],

						newAlpha = (alpha1 + alpha2 - alpha1 * alpha2 / 255) | 0,

						color2Red = destImageData[layerOffset + CPColorBmp.RED_BYTE_OFFSET],
						color2Green = destImageData[layerOffset + CPColorBmp.GREEN_BYTE_OFFSET],
						color2Blue = destImageData[layerOffset + CPColorBmp.BLUE_BYTE_OFFSET],

						realAlpha = (alpha1 * 255 / newAlpha) | 0,
						invAlpha = 255 - realAlpha;

					strokeData[strokeOffset] =
						newAlpha << 24
						| ((color1 >> 16 & 0xff) + ((color2Red * invAlpha - (color1 >> 16 & 0xff) * invAlpha) / 255)) << 16
						| ((color1 >> 8 & 0xff) + ((color2Green * invAlpha - (color1 >> 8 & 0xff) * invAlpha) / 255)) << 8
						| ((color1 & 0xff) + ((color2Blue * invAlpha - (color1 & 0xff) * invAlpha) / 255));
				}
			}
		}
	}

	/**
	 * @override
	 */
	paintDab(destImage, imageRect, sampleImage, brushConfig, brushRect, dab, color) {
		if (destImage instanceof CPColorBmp) {
			if (this._brushBuffer == null) {
				// TODO this means we can't have pressure sensitive tip sizes for Oil (see CPBrushInfo.applyPressure)
				this._brushBuffer = new CPGreyBmp(dab.width, dab.height, 32); // Initialized to 0 for us by the browser

				this._accumulatePaintFromImage(sampleImage, brushRect, imageRect, 255);
			} else {
				this._resaturateBrushWithColor(brushRect, ~~((brushConfig.resat <= 0.0) ? 0 : Math.max(1, (brushConfig.resat * brushConfig.resat) * 255)), color & 0xFFFFFF);
				this._paintToColorStrokeBuffer(destImage, brushRect, imageRect, dab.brush, dab.alpha);
				this._accumulatePaintFromImage(sampleImage, brushRect, imageRect, ~~(brushConfig.bleed * 255));
			}
		} else {
			if (this._brushBuffer == null) {
				this._brushBuffer = new CPGreyBmp(dab.width, dab.height, 16); // Initialized to 0 for us by the browser

				this._accumulatePaintFromMask(sampleImage, brushRect, imageRect, 255);
			} else {
				this._resaturateBrushWithGrey(brushRect, ~~((brushConfig.resat <= 0.0) ? 0 : Math.max(1, (brushConfig.resat * brushConfig.resat) * 255)), color & 0xFF);
				this._paintToGreyscaleStrokeBuffer(destImage, brushRect, imageRect, dab.brush, dab.alpha);
				this._accumulatePaintFromMask(sampleImage, brushRect, imageRect, ~~(brushConfig.bleed * 255));
			}
		}
	}

	endStroke() {
		this._brushBuffer = null;
	}
}

/**
 * Spread the image pixels within the given rectangle outwards to fill the image with pixels.
 *
 * @param {CPGreyBmp} image
 * @param {CPRect} rect
 */
function stretchRectToFillBuffer(image, rect) {
	const
		imageData = image.data;

	// First stretch the source rect pixels out horizontally to fill W and E areas
	if (rect.left > 0) {
		for (let y = rect.top; y < rect.bottom; y++) {
			let
				rowStartOffset = y * image.width,

				dstOffset = rowStartOffset,
				fillColor = imageData[rowStartOffset + rect.left];

			for (let x = 0; x < rect.left; x++, dstOffset++) {
				imageData[dstOffset] = fillColor;
			}
		}
	}

	if (rect.right < image.width) {
		for (let y = rect.top; y < rect.bottom; y++) {
			let
				rowStartOffset = y * image.width,

				dstOffset = rowStartOffset + rect.right,
				fillColor = imageData[dstOffset - 1];

			for (let x = rect.right; x < image.width; x++, dstOffset++) {
				imageData[dstOffset] = fillColor;
			}
		}
	}

	// Then stretch those rows upwards and downwards (to fill NW, N, NE, SW, S, SE areas)
	let
		dstOffset = 0;

	for (let y = 0; y < rect.top; y++) {
		let
			srcOffset = rect.top * image.width;

		for (let x = 0; x < image.width; x++, srcOffset++, dstOffset++) {
			imageData[dstOffset] = imageData[srcOffset];
		}
	}

	dstOffset = rect.bottom * image.width;

	for (let y = rect.bottom; y < image.width; y++) {
		let
			srcOffset = (rect.bottom - 1) * image.width;

		for (let x = 0; x < image.width; x++, srcOffset++, dstOffset++) {
			imageData[dstOffset] = imageData[srcOffset];
		}
	}
}

export class CPBrushToolSmudge extends CPBrushToolDirectBrush {

	constructor(strokeBuffer, strokedRegion) {
		super(strokeBuffer, strokedRegion);

		this._brushBuffer = null;
		this.wantsOutputAsInput = true;
		this.noMergePhase = true;
	}

	/**
	 * Pick up paint from the given image and store into the AG brush buffer.
	 *
	 * @param {CPGreyBmp} sampleMask - Mask to sample from
	 * @param {CPRect} maskRect - Rectangle of the canvas that our brush covers
	 * @param {CPRect} brushRect - The corresponding rectangle within the brush buffer
	 * @param {int} alpha - Alpha of brush (0-255)
	 */
	_sampleFromMask(sampleMask, brushRect, maskRect, alpha) {
		let
			brushData = this._brushBuffer.data,

			width = brushRect.getWidth(),
			height = brushRect.getHeight(),

			brushOffset = this._brushBuffer.offsetOfPixel(brushRect.left, brushRect.top),
			maskOffset = sampleMask.offsetOfPixel(maskRect.left, maskRect.top),

			brushYSkip = this._brushBuffer.width - width,
			maskYSkip = sampleMask.width - width,

			invAlpha = 255 - alpha;

		if (alpha == 255) {
			// Brush doesn't sample from the image
			return;
		}

		// Blend pixels (in the area where the brush overlaps the canvas) into the brush buffer
		for (let y = 0; y < height; y++, brushOffset += brushYSkip, maskOffset += maskYSkip) {
			for (let x = 0; x < width; x++, brushOffset++, maskOffset++) {
				let
					sampleGrey = sampleMask.data[maskOffset],

					oldBrushColor = brushData[brushOffset],
					newBrushGrey = ((sampleGrey * invAlpha + (oldBrushColor & 0xff) * alpha) / 255),

					newBrushColor =
						((255 * invAlpha + (oldBrushColor >> 8) * alpha) / 255) << 8
						| newBrushGrey;

				/* If low-alpha rounding caused us to not even update the brush color, take a 1-unit step
				 * in the direction of the sample color.
				 */
				if (newBrushColor == oldBrushColor) {
					if (sampleGrey > newBrushGrey) {
						newBrushColor++;
					} else if (sampleGrey < newBrushGrey) {
						newBrushColor--;
					}
				}

				brushData[brushOffset] = newBrushColor;
			}
		}

		/*
		 * The areas of the brush buffer that lay outside the canvas haven't been filled yet. Stretch the pixels
		 * around the edge of the area we did sample to fill in the gaps.
		 */
		stretchRectToFillBuffer(this._brushBuffer, brushRect);
	}

	/**
	 * Replace the destination mask with the smudge buffer within the shape of the brush tip.
	 *
	 * @param {CPGreyBmp} destMask
	 * @param {CPRect} brushRect
	 * @param {CPRect} imageRect
	 * @param {Uint8Array} brushShape - Of the same width as this._brushBuffer
	 */
	_paintToMask(destMask, brushRect, imageRect, brushShape) {
		let
			width = brushRect.getWidth(),
			height = brushRect.getHeight(),

			srcOffset = this._brushBuffer.offsetOfPixel(brushRect.left, brushRect.top),
			dstOffset = destMask.offsetOfPixel(imageRect.left, imageRect.top),

			srcYSkip = this._brushBuffer.width - width,
			dstYSkip = destMask.width - width,

			destMaskData = destMask.data,
			brushPaintData = this._brushBuffer.data;

		for (let y = 0; y < height; y++, dstOffset += dstYSkip, srcOffset += srcYSkip) {
			for (let x = 0; x < width; x++, srcOffset++, dstOffset++) {
				let
					paintValue = brushPaintData[srcOffset],

					strokeAlpha = ((paintValue >> 8) * brushShape[srcOffset] / 255) | 0,
					strokeColor = paintValue & 0xff;

				if (strokeAlpha > 0) {
					destMaskData[dstOffset] = strokeColor;
				}
			}
		}
	}

	/**
	 * Pick up paint from the given image and store into the brush buffer.
	 *
	 * @param {CPColorBmp} sampleImage - Image to sample from
	 * @param {CPRect} imageRect - Rectangle of the canvas that our brush covers
	 * @param {CPRect} brushRect - The corresponding rectangle within the brush buffer
	 * @param {int} alpha - Alpha of brush (0-255)
	 */
	_sampleFromImage(sampleImage, brushRect, imageRect, alpha) {
		let
			brushData = this._brushBuffer.data,

			width = brushRect.getWidth(),
			height = brushRect.getHeight(),

			brushOffset = this._brushBuffer.offsetOfPixel(brushRect.left, brushRect.top),
			imageOffset = sampleImage.offsetOfPixel(imageRect.left, imageRect.top),

			brushYSkip = this._brushBuffer.width - width,
			imageYSkip = (sampleImage.width - width) * CPColorBmp.BYTES_PER_PIXEL,

			invAlpha = 255 - alpha;

		if (alpha == 255) {
			// Brush doesn't sample from the image
			return;
		}

		// Blend pixels (in the area where the brush overlaps the canvas) into the brush buffer
		for (let y = 0; y < height; y++, brushOffset += brushYSkip, imageOffset += imageYSkip) {
			for (let x = 0; x < width; x++, brushOffset++, imageOffset += CPColorBmp.BYTES_PER_PIXEL) {
				let
					sampleRed = sampleImage.data[imageOffset + CPColorBmp.RED_BYTE_OFFSET],
					sampleGreen = sampleImage.data[imageOffset + CPColorBmp.GREEN_BYTE_OFFSET],
					sampleBlue = sampleImage.data[imageOffset + CPColorBmp.BLUE_BYTE_OFFSET],
					sampleAlpha = sampleImage.data[imageOffset + CPColorBmp.ALPHA_BYTE_OFFSET],

					oldBrushColor = brushData[brushOffset],

					newBrushColor =
						((sampleAlpha * invAlpha + (oldBrushColor >> 24 & 0xff) * alpha) / 255) << 24 & 0xff000000
						| ((sampleRed * invAlpha + (oldBrushColor >> 16 & 0xff) * alpha) / 255) << 16 & 0xff0000
						| ((sampleGreen * invAlpha + (oldBrushColor >> 8 & 0xff) * alpha) / 255) << 8 & 0xff00
						| ((sampleBlue * invAlpha + (oldBrushColor & 0xff) * alpha) / 255) & 0xff;

				/* If low-alpha rounding caused us to not even update the brush color, take a 1-unit step
				 * in the direction of the sample color.
				 */
				if (newBrushColor == oldBrushColor) {
					let
						newBrushRed   = (newBrushColor & 0xff0000) >> 16,
						newBrushGreen = (newBrushColor & 0x00ff00) >> 8,
						newBrushBlue  =  newBrushColor & 0x0000ff;

					if (sampleRed > newBrushRed) {
						newBrushColor += 1 << 16;
					} else if (sampleRed < newBrushRed) {
						newBrushColor -= 1 << 16;
					}

					if (sampleGreen > newBrushGreen) {
						newBrushColor += 1 << 8;
					} else if (sampleGreen < newBrushGreen) {
						newBrushColor -= 1 << 8;
					}

					if (sampleBlue > newBrushBlue) {
						newBrushColor += 1;
					} else if (sampleBlue < newBrushBlue) {
						newBrushColor -= 1;
					}
				}

				brushData[brushOffset] = newBrushColor;
			}
		}

		/*
		 * The areas of the brush buffer that lay outside the canvas haven't been filled yet. Stretch the pixels
		 * around the edge of the area we did sample to fill in the gaps.
		 */
		stretchRectToFillBuffer(this._brushBuffer, brushRect);
	}

	/**
	 * Replace the layer's image with the smudge buffer within the shape of the brush tip.
	 *
	 * @param {CPColorBmp} destImage
	 * @param {CPRect} brushRect
	 * @param {CPRect} imageRect
	 * @param {Uint8Array} brushShape - Of the same width as this._brushBuffer
	 */
	 _paintToImage(destImage, brushRect, imageRect, brushShape) {
		let
			width = brushRect.getWidth(),
			height = brushRect.getHeight(),

			srcOffset = this._brushBuffer.offsetOfPixel(brushRect.left, brushRect.top),
			dstOffset = destImage.offsetOfPixel(imageRect.left, imageRect.top),

			srcYSkip = this._brushBuffer.width - width,
			dstYSkip = (destImage.width - width) * CPColorBmp.BYTES_PER_PIXEL,

			destImageData = destImage.data,
			brushPaintData = this._brushBuffer.data;

		for (let y = 0; y < height; y++, dstOffset += dstYSkip, srcOffset += srcYSkip) {
			for (let x = 0; x < width; x++, srcOffset++, dstOffset += CPColorBmp.BYTES_PER_PIXEL) {
				let
					paintColor = brushPaintData[srcOffset],
					strokeAlpha = ((paintColor >>> 24) * brushShape[srcOffset] / 255) | 0;

				if (strokeAlpha > 0) {
					destImageData[dstOffset + CPColorBmp.RED_BYTE_OFFSET] = (paintColor >> 16) & 0xff;
					destImageData[dstOffset + CPColorBmp.GREEN_BYTE_OFFSET] = (paintColor >> 8) & 0xff;
					destImageData[dstOffset + CPColorBmp.BLUE_BYTE_OFFSET] = paintColor & 0xff;
					destImageData[dstOffset + CPColorBmp.ALPHA_BYTE_OFFSET] = (paintColor >> 24) & 0xff;
				}
			}
		}
	}

	/**
	 * @override
	 */
	paintDab(destImage, imageRect, sampleImage, brushConfig, brushRect, dab, color) {
		if (destImage instanceof CPColorBmp) {
			if (this._brushBuffer == null) {
				this._brushBuffer = new CPGreyBmp(dab.width, dab.height, 32);
				this._sampleFromImage(sampleImage, brushRect, imageRect, 0);
			} else {
				this._sampleFromImage(sampleImage, brushRect, imageRect, dab.alpha);
				this._paintToImage(destImage, brushRect, imageRect, dab.brush);
			}
		} else {
			if (this._brushBuffer == null) {
				this._brushBuffer = new CPGreyBmp(dab.width, dab.height, 16);
				this._sampleFromMask(sampleImage, brushRect, imageRect, 0);
			} else {
				this._sampleFromMask(sampleImage, brushRect, imageRect, dab.alpha);
				this._paintToMask(destImage, brushRect, imageRect, dab.brush);
			}
		}
	}

	/**
	 * A no-op since our paint implementation paints directly to the underlying image during the stroke.
	 *
	 * @override
	 */
	mergeOntoImage(destImage, undoImage, color) {
	}

	mergeOntoMask(destMask, undoMask, color) {
	}

	/**
	 * @override
	 */
	beginStroke() {
		this._brushBuffer = null;
	}

	/**
	 * @override
	 */
	endStroke() {
		this._brushBuffer = null;
	}
}
