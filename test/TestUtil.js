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

import TestUtil from "./lib/TestUtil.js";

import assert from "assert";

// Here we actually test our test helper routines themselves!

describe("TestUtil", function() {
	describe("#colorBitmapFromString", function() {
		it("should correctly create a bitmap with the specified values", function () {
			var
				testImage = TestUtil.colorBitmapFromString(`
					..
					OO
				`);

			for (let i = 0; i < 8; i++) {
				assert(testImage.data[i] == 0x00);
			}

			for (let i = 8; i < 16; i++) {
				assert(testImage.data[i] == 0xFF);
			}
		});
	});

	describe("#greyBitmapFromString", function() {
		it("should correctly create a bitmap with the specified values", function () {
			var
				testImage = TestUtil.greyBitmapFromString(`
					..
					OO
				`);

			for (let i = 0; i < 2; i++) {
				assert(testImage.data[i] == 0x00);
			}

			for (let i = 2; i < 4; i++) {
				assert(testImage.data[i] == 0xFF);
			}
		});
	});

	describe("#bitmapsAreSimilar", function() {
		it("should correctly match two identical color bitmaps", function () {
			var
				testImage = TestUtil.colorBitmapFromString(`
					..
					OO
				`),
				testImage2 = testImage.clone();

			assert(TestUtil.bitmapsAreEqual(testImage, testImage2));
		});

		it("should correctly reject two different color bitmaps", function () {
			var
				testImage = TestUtil.colorBitmapFromString(`
					..
					OO
				`),
				testImage2 = TestUtil.colorBitmapFromString(`
					.O
					OO
				`);

			assert(!TestUtil.bitmapsAreEqual(testImage, testImage2));
		});

		it("should correctly match two identical grey bitmaps", function () {
			var
				testImage = TestUtil.greyBitmapFromString(`
					..
					OO
				`),
				testImage2 = testImage.clone();

			assert(TestUtil.bitmapsAreEqual(testImage, testImage2));
		});

		it("should correctly reject two different grey bitmaps", function () {
			var
				testImage = TestUtil.greyBitmapFromString(`
					..
					OO
				`),
				testImage2 = TestUtil.greyBitmapFromString(`
					.O
					OO
				`);

			assert(!TestUtil.bitmapsAreEqual(testImage, testImage2));
		});
	})
});