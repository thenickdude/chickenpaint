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

import CPColorBmp from "../../js/engine/CPColorBmp.js";
import CPImageLayer from "../../js/engine/CPImageLayer.js";

import $ from "jquery";

function createThumbUsingCPLayer(sourceLayer) {
	let
		thumbBitmap,
		thumbCanvas,
		resultDiv = document.createElement("div");

	sourceLayer.thumbnail = null;
	thumbBitmap = sourceLayer.getImageThumbnail();

	thumbCanvas = thumbBitmap.getAsCanvas();
	thumbCanvas.className = "thumbnail";

	resultDiv.appendChild(document.createTextNode("CPLayer.getImageThumbnail()"));
	resultDiv.appendChild(thumbCanvas);

	return resultDiv;
}

/* In our real app, we can allocate these buffers once in the app and share over many invocations, so
 * separate them out here too.
 */
let
	tempFullSize = document.createElement("canvas"),
	tempFullSizeContext = tempFullSize.getContext("2d"),
	tempThumb = document.createElement("canvas"),
	tempThumbContext = tempThumb.getContext("2d");

function createThumbUsingCanvas(sourceLayer) {
	var
		imageData = sourceLayer.image.getImageData(),
		resultDiv = document.createElement("div");

	tempFullSizeContext.putImageData(imageData, 0, 0);
	tempThumbContext.globalCompositeOperation = "copy";
	// Stretch down to the thumb size
	tempThumbContext.drawImage(tempFullSize, 0, 0, tempFullSize.width, tempFullSize.height, 0, 0, tempThumb.width, tempThumb.height);

	resultDiv.appendChild(document.createTextNode("Canvas.drawImage()"));
	resultDiv.appendChild(tempThumb);

	return resultDiv;
}

function performTest(resultDiv, sourceImage) {
	var
		sourceLayer = new CPImageLayer(0, 0, "");

	sourceLayer.image = CPColorBmp.createFromImage(sourceImage);

	tempFullSize.width = sourceLayer.image.width;
	tempFullSize.height = sourceLayer.image.height;
	tempThumb = document.createElement("canvas");
	tempThumb.className = "thumbnail";
	tempThumb.width = 75;
	tempThumb.height = Math.round(sourceLayer.image.height / sourceLayer.image.width * 75);
	tempThumbContext = tempThumb.getContext("2d");

	resultDiv.appendChild(createThumbUsingCPLayer(sourceLayer));
	resultDiv.appendChild(createThumbUsingCanvas(sourceLayer));
}

export default function ThumbnailTest() {
	$(document).ready(function() {
		var
			tests = $(".test");
		
		tests.each(function(index, testElem) {
			let
				resultDiv = $(".test-result", testElem)[0],
				/**
				 * @type HTMLImageElement
				 */
				lineArt = $(".test-original", testElem)[0],

				perform = performTest.bind(undefined, resultDiv, lineArt);

			if (lineArt.complete) {
				perform();
			} else {
				lineArt.onload = perform;
			}
		});
	});
}
