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

/*
 * Compare two blending engines against each other visually.
 */

import {binaryStringToByteArray} from "../../../js/engine/CPResourceSaver.js";

import {save as chiSave} from "../../../js/engine/CPChibiFile.js";
import CPColorBmp from "../../../js/engine/CPColorBmp.js";
import CPArtwork from "../../../js/engine/CPArtwork.js";
import CPImageLayer from "../../../js/engine/CPImageLayer.js";

import CPBlend from "../../../js/engine/CPBlend.js";
import CPBlend2 from "../../../js/engine/CPBlend2.js";

import FileSaver from "file-saver";

// HSV (1978) = H: Hue / S: Saturation / V: Value
var Color = {
	HSV_RGB: function (o) {
		var H = o.H / 360,
			S = o.S / 100,
			V = o.V / 100,
			R, G, B;
		var A, B, C, D;
		if (S == 0) {
			R = G = B = Math.round(V * 255);
		} else {
			if (H >= 1) H = 0;
			H = 6 * H;
			D = H - Math.floor(H);
			A = Math.round(255 * V * (1 - S));
			B = Math.round(255 * V * (1 - (S * D)));
			C = Math.round(255 * V * (1 - (S * (1 - D))));
			V = Math.round(255 * V);
			switch (Math.floor(H)) {
				case 0:
					R = V;
					G = C;
					B = A;
					break;
				case 1:
					R = B;
					G = V;
					B = A;
					break;
				case 2:
					R = A;
					G = V;
					B = C;
					break;
				case 3:
					R = A;
					G = B;
					B = V;
					break;
				case 4:
					R = C;
					G = A;
					B = V;
					break;
				case 5:
					R = V;
					G = A;
					B = B;
					break;
			}
		}
		return {
			R: R,
			G: G,
			B: B
		}
	}
};

function checkLayersAreSimilar(fusion1, fusion2) {
	for (var pix = 0; pix < fusion1.width * fusion1.height * 4; pix++) {
		var
			delta = fusion1.data[pix] - fusion2.data[pix];

		if (delta != 0) {
			return false;
		}
	}

	return true;
}

/**
 *
 * @param {CPColorBmp} image
 * @returns {Element}
 */
function getImageAsCanvas(image) {
	var
		result = document.createElement("canvas"),
		context = result.getContext("2d");

	result.width = image.width;
	result.height = image.height;

	context.putImageData(image.imageData, 0, 0);

	return result;
}

function createColorSphereCanvas(width, height) {
	var
		canvas = document.createElement("canvas"),
		ctx = canvas.getContext("2d"),
		halfWidth = width / 2,
		rotate = (1 / 360) * Math.PI * 2; // per degree

	canvas.width = width;
	canvas.height = height;

	for (var n = 0; n <= 359; n++) {
		var
			gradient = ctx.createLinearGradient(halfWidth, 0, halfWidth, halfWidth),
			color = Color.HSV_RGB({H: (n + 300) % 360, S: 100, V: 100});

		gradient.addColorStop(0, "rgba(0,0,0,0)");
		gradient.addColorStop(0.7, "rgba(" + color.R + "," + color.G + "," + color.B + ",1)");
		gradient.addColorStop(1, "rgba(255,255,255,1)");

		ctx.beginPath();
		ctx.moveTo(halfWidth, 0);
		ctx.lineTo(halfWidth, halfWidth);
		ctx.lineTo(halfWidth + 6, 0);
		ctx.fillStyle = gradient;
		ctx.fill();

		ctx.translate(halfWidth, halfWidth);
		ctx.rotate(rotate);
		ctx.translate(-halfWidth, -halfWidth);
	}

	ctx.beginPath();
	ctx.fillStyle = "#00f";
	ctx.fillRect(15, 15, 30, 30);
	ctx.fill();

	return canvas;
}

function createLightMixCanvas(width, height) {
	var
		canvas = document.createElement("canvas"),
		ctx = canvas.getContext("2d");

	canvas.width = width;
	canvas.height = height;

	ctx.save();
	ctx.translate(10, 10);
	ctx.globalCompositeOperation = "lighter";
	ctx.beginPath();
	ctx.fillStyle = "rgba(255,0,0,1)";
	ctx.arc(100, 200, 100, Math.PI * 2, 0, false);
	ctx.fill();
	ctx.beginPath();
	ctx.fillStyle = "rgba(0,0,255,1)";
	ctx.arc(220, 200, 100, Math.PI * 2, 0, false);
	ctx.fill();
	ctx.beginPath();
	ctx.fillStyle = "rgba(0,255,0,1)";
	ctx.arc(160, 100, 100, Math.PI * 2, 0, false);
	ctx.fill();
	ctx.restore();
	ctx.beginPath();
	ctx.fillStyle = "#f00";
	ctx.fillRect(0, 0, 30, 30);
	ctx.fill();

	return canvas;
}

var createInterlace = function (size, color1, color2) {
	var proto = document.createElement("canvas").getContext("2d");
	proto.canvas.width = size * 2;
	proto.canvas.height = size * 2;
	proto.fillStyle = color1; // top-left
	proto.fillRect(0, 0, size, size);
	proto.fillStyle = color2; // top-right
	proto.fillRect(size, 0, size, size);
	proto.fillStyle = color2; // bottom-left
	proto.fillRect(0, size, size, size);
	proto.fillStyle = color1; // bottom-right
	proto.fillRect(size, size, size, size);
	var pattern = proto.createPattern(proto.canvas, "repeat");
	pattern.data = proto.canvas.toDataURL();
	return pattern;
};

function capitalizeFirst(string) {
	return string.substring(0, 1).toUpperCase() + string.substring(1);
}

function saveTestFiles(colorSphereLayer, lightMixLayer) {
	//Save the test layers to disk so we can try them in Photoshop
	FileSaver.saveAs(new Blob([binaryStringToByteArray(colorSphereLayer.getAsPNG(0))], {type: "image/png"}), "under.png");
	FileSaver.saveAs(new Blob([binaryStringToByteArray(lightMixLayer.getAsPNG(0))], {type: "image/png"}), "over.png");

	var
		artwork = new CPArtwork(colorSphereLayer.width, colorSphereLayer.height);

	artwork.addLayerObject(colorSphereLayer);
	artwork.addLayerObject(lightMixLayer);

	chiSave(artwork).then((result) => {
		FileSaver.saveAs(result.bytes, "blendtest.chi");
	});
}

export default function BlendingTest() {
	const
		TEST_WIDTH = 340,
		TEST_HEIGHT = 340;

	var
		colorSphereCanvas = createColorSphereCanvas(TEST_WIDTH, TEST_HEIGHT),
		colorSphereLayer = new CPImageLayer(TEST_WIDTH, TEST_HEIGHT, "layer"),
		colorSphereImageData = colorSphereCanvas.getContext("2d").getImageData(0, 0, TEST_WIDTH, TEST_HEIGHT),

		lightMixCanvas = createLightMixCanvas(TEST_WIDTH, TEST_HEIGHT),
		lightMixLayer = new CPImageLayer(TEST_WIDTH, TEST_HEIGHT, "layer"),

		fusion1 = new CPImageLayer(TEST_WIDTH, TEST_HEIGHT, "fusion1"),
		fusion2 = new CPImageLayer(TEST_WIDTH, TEST_HEIGHT, "fusion2");

	colorSphereLayer.image.setImageData(colorSphereCanvas.getContext("2d").getImageData(0, 0, TEST_WIDTH, TEST_HEIGHT));
	lightMixLayer.image.setImageData(lightMixCanvas.getContext("2d").getImageData(0, 0, TEST_WIDTH, TEST_HEIGHT));

	//saveTestFiles(colorSphereLayer, lightMixLayer);

	var
		blendingModesToTest = ["normal", "add", "multiply", "screen", "overlay", "darken", "lighten", "dodge", "burn", "hardLight", "softLight", "linearLight", "pinLight", "vividLight", "subtract"],
		displayElem = document.getElementById("display");

	for (let blendingMode of blendingModesToTest) {
		var
			funcName = blendingMode + "OntoTransparentFusionWithTransparentLayer",

			func1 = CPBlend[funcName],
			func2 = CPBlend2[funcName],

			testRect = lightMixLayer.image.getBounds(),

			row = document.createElement("div"),
			label = document.createElement("span");

		fusion1.copyImageFrom(colorSphereImageData);
		fusion2.copyImageFrom(colorSphereImageData);

		func1(fusion1.image, lightMixLayer.image, 100, testRect);
		func2(fusion2.image, lightMixLayer.image, 100, testRect);

		row.appendChild(getImageAsCanvas(colorSphereLayer.image));
		row.appendChild(getImageAsCanvas(lightMixLayer.image));

		row.appendChild(getImageAsCanvas(fusion1.image));
		row.appendChild(getImageAsCanvas(fusion2.image));

		label.innerHTML = blendingMode;

		row.appendChild(label);

		displayElem.appendChild(row);
	}
}
