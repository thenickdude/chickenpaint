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

import CPArtwork from "../js/engine/CPArtwork.js";
import CPBlend from "../js/engine/CPBlend.js";

import assert from "assert";
import TestUtil from "./lib/TestUtil.js";
import CPImageLayer from "../js/engine/CPImageLayer.js";

/**
 * @type CPArtwork
 */
function selectWholeCanvas() {
	this.setSelection(this.getBounds());
}

describe("CPArtwork", function() {
	describe("#invert", function() {
		let
			beforeImage = `
				OOOO
				OXXO
				OOXO
				OOOO
			`,
			beforeMask = `
				....
				.OO.
				..O.
				....
			`,
			operation = function() {
				this.invert();
			},
			expectImage = `
				XXXX
				XOOX
				XXOX
				XXXX
			`,
			expectMask = `
				OOOO
				O..O
				OO.O
				OOOO
			`;
			
		it("should invert the selected image", function () {
			TestUtil.testLayerPaintOperation({
				beforeImage, beforeMask, operation, expectImage, expectMask,

				select: "image",
				linkMask: true,

				expectImageToChange: true
			});
		});

		it("should invert the selected mask", function () {
			TestUtil.testLayerPaintOperation({
				beforeImage, beforeMask, operation, expectImage, expectMask,

				select: "mask",
				linkMask: true,

				expectMaskToChange: true
			});
		});
	});

	describe("#hFlip", function() {
		let
			beforeImage = `
				OOOO
				OXXO
				OOXO
				OOOO
			`,
			beforeMask = `
				....
				.OO.
				..O.
				....
			`,
			operation = function() {
				this.hFlip();
			},
			expectImage = `
				OOOO
				OXXO
				OXOO
				OOOO
			`,
			expectMask = `
				....
				.OO.
				.O..
				....
			`;

		it("should flip the whole image and linked mask horizontally", function () {
			TestUtil.testLayerPaintOperation({
				beforeImage, beforeMask, operation, expectImage, expectMask,

				select: "image",
				linkMask: true,

				expectImageToChange: true,
				expectMaskToChange: true
			});
		});

		it("should flip just the selected mask rectangle horizontally", function () {
			TestUtil.testLayerPaintOperation({
				pre: selectWholeCanvas,
				beforeImage, beforeMask, operation, expectImage, expectMask,

				select: "mask",
				linkMask: true,

				expectMaskToChange: true
			});
		});

		it("should flip just the selected image rectangle horizontally", function () {
			TestUtil.testLayerPaintOperation({
				pre: selectWholeCanvas,
				beforeImage, beforeMask, operation, expectImage, expectMask,

				select: "image",
				linkMask: true,

				expectImageToChange: true
			});
		});
	});

	describe("#vFlip", function() {
		let
			beforeImage = `
				OOOO
				OXXO
				OOXO
				OOOO
			`,
			beforeMask = `
				....
				.OO.
				..O.
				....
			`,
			operation = function() {
				this.vFlip();
			},
			expectImage = `
				OOOO
				OOXO
				OXXO
				OOOO
			`,
			expectMask = `
				....
				..O.
				.OO.
				....
			`;

		it("should flip the whole image and linked mask vertically", function () {
			TestUtil.testLayerPaintOperation({
				beforeImage, beforeMask, operation, expectImage, expectMask,

				select: "image",
				linkMask: true,

				expectImageToChange: true,
				expectMaskToChange: true
			});
		});

		it("should flip just the selected mask rectangle vertically", function () {
			TestUtil.testLayerPaintOperation({
				pre: selectWholeCanvas,
				beforeImage, beforeMask, operation, expectImage, expectMask,

				select: "mask",
				linkMask: true,

				expectMaskToChange: true
			});
		});

		it("should flip just the selected image rectangle vertically", function () {
			TestUtil.testLayerPaintOperation({
				pre: selectWholeCanvas,
				beforeImage, beforeMask, operation, expectImage, expectMask,

				select: "image",
				linkMask: true,

				expectImageToChange: true
			});
		});
	});

	describe("#clear", function() {
		let
			beforeImage = `
				OOOO
				OXXO
				OOXO
				OOOO
			`,
			beforeMask = `
				....
				.OO.
				..O.
				....
			`,
			operation = function() {
				this.clear();
			},
			expectImage = `
				....
				....
				....
				....
			`,
			expectMask = `
				....
				....
				....
				....
			`;

		it("should clear the selected image to transparent white", function () {
			TestUtil.testLayerPaintOperation({
				beforeImage, beforeMask, operation, expectImage, expectMask,

				select: "image",
				linkMask: true,

				expectImageToChange: true
			});
		});

		it("should clear the selected mask to black", function () {
			TestUtil.testLayerPaintOperation({
				beforeImage, beforeMask, operation, expectImage, expectMask,

				select: "mask",
				linkMask: true,

				expectMaskToChange: true
			});
		});
	});
});