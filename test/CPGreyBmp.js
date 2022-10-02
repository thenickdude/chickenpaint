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

import CPRect from "../js/util/CPRect.js";

import assert from "assert";
import CPGreyBmp from "../js/engine/CPGreyBmp.js";

function assertBitmapFilledWith(bitmap, fillValue) {
    for (let y = 0; y < bitmap.height; y++) {
        for (let x = 0; x < bitmap.width; x++) {
            assert(bitmap.getPixel(x, y) === fillValue);
        }
    }
}

describe("CPGreyBmp", function() {
    describe("#clearAll", function() {
        it("should fill the whole bitmap with the specified 32-bit value", function() {
            const
                bmp = new CPGreyBmp(13, 7, 32),
                fillValue = 0x98765432;

            bmp.clearAll(fillValue);
            assertBitmapFilledWith(bmp, fillValue);
        });
    });

    describe("#clearRect", function() {
        it("should fill the whole bitmap if the specified rectangle would cover it all", function() {
            const
                bmp = new CPGreyBmp(13, 7, 32),
                fillValue = 0x98765432;

            bmp.clearRect(new CPRect(-2, -5, 15, 10), fillValue);
            assertBitmapFilledWith(bmp, fillValue);
        });

        it("should fill the just the specified rectangle", function() {
            const
                bitmap = new CPGreyBmp(13, 7, 8),
                fillRect = new CPRect(1, 1, 5, 5),
                fillValue = 0xFF;

            bitmap.clearRect(fillRect, fillValue);

            for (let y = 0; y < bitmap.height; y++) {
                for (let x = 0; x < bitmap.width; x++) {
                    let
                        insideRect = fillRect.containsPoint({x, y});

                    assert(bitmap.getPixel(x, y) === (insideRect ? fillValue : 0x00));
                }
            }
        });
    });

    describe("#clearAll", function() {
        it("should fill the whole bitmap", function() {
            const
                bmp = new CPGreyBmp(13, 7, 32),
                fillValue = 0x98765432;

            bmp.clearAll(fillValue);
            assertBitmapFilledWith(bmp, fillValue);
        });
    });
});
