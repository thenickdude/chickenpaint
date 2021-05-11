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
import CPColorBmp from "../js/engine/CPColorBmp.js";

import TestUtil from "./lib/TestUtil.js";
import CPRect from "../js/util/CPRect.js";

import assert from "assert";

import "core-js/stable/symbol/index.js";
import "core-js/stable/array/iterator.js";

const
	SELECT_IMAGE = 0,
	SELECT_MASK = 1,
	UNLINK_MASK = 0,
	LINK_MASK = 1,
	EXPECT_MASK_WONT_MOVE = 0,
	EXPECT_MASK_TO_MOVE = 1,
	EXPECT_CHILDREN_WONT_MOVE = 0,
	EXPECT_CHILDREN_TO_MOVE = 1;

function testMoveGroup(selectType, linkMask, expectGroupMaskToMove, expectChildrenToMove) {
	var
		artwork = new CPArtwork(4, 4),
		group, layer,
		beforeGroupMask = TestUtil.greyBitmapFromString(`
		     ....
		     .OO.
		     .O..
		     ....
		`),
		expectedGroupMask = expectGroupMaskToMove == EXPECT_MASK_TO_MOVE ? TestUtil.greyBitmapFromString(`
		     ...O
		     OO.O
		     O..O
		     ...O
		`) : beforeGroupMask.clone(),
		beforeImage = TestUtil.colorBitmapFromString(`
			....
			.OO.
			.OO.
			....
		`),
		expectedImage = expectChildrenToMove == EXPECT_CHILDREN_TO_MOVE ? TestUtil.colorBitmapFromString(`
			 ....
			 OO..
			 OO..
			 ....
		`) : beforeImage.clone(),
		beforeMask = TestUtil.greyBitmapFromString(`
		     ....
		     OOO.
		     ....
		     ....
		`),
		expectedMask = expectChildrenToMove == EXPECT_CHILDREN_TO_MOVE ? TestUtil.greyBitmapFromString(`
		     ...O
		     OO.O
		     ...O
		     ...O
		`) : beforeMask.clone();

	artwork.addLayer("group");
	group = artwork.getActiveLayer();
	artwork.addLayerMask();

	artwork.addLayer("layer");
	layer = artwork.getActiveLayer();
	assert(!artwork.isEditingMask());
	artwork.addLayerMask();

	artwork.setActiveLayer(group, selectType === SELECT_MASK);
	artwork.setLayerMaskLinked(linkMask == LINK_MASK);

	group.mask.copyPixelsFrom(beforeGroupMask);
	layer.image.copyPixelsFrom(beforeImage);
	layer.mask.copyPixelsFrom(beforeMask);

	TestUtil.artworkUndoRedo({
		artwork: artwork,
		pre: function () {
			assert(artwork.getLayersRoot().layers.length == 1);
			assert(group.layers.length == 1);
			assert(TestUtil.bitmapsAreEqual(group.mask, beforeGroupMask));
			assert(TestUtil.bitmapsAreEqual(layer.image, beforeImage));
			assert(TestUtil.bitmapsAreEqual(layer.mask, beforeMask));
		},
		action: function () {
			artwork.move(-1, 0, false);
		},
		post: function () {
			assert(artwork.getLayersRoot().layers.length == 1);
			assert(group.layers.length == 1);
			assert(TestUtil.bitmapsAreEqual(group.mask, expectedGroupMask));
			assert(TestUtil.bitmapsAreEqual(layer.image, expectedImage));
			assert(TestUtil.bitmapsAreEqual(layer.mask, expectedMask));
		},
		testCompact: true
	});
}

describe("CPArtwork", function() {
	describe("#move", function() {
		it("should do nothing if the offset is 0, 0", function () {
			var
				artwork = new CPArtwork(100, 100);

			artwork.addLayer("layer");

			artwork.clearHistory();
			
			assert(!artwork.isUndoAllowed());
			
			artwork.move(0, 0, false);
			
			assert(!artwork.isUndoAllowed());
			
			artwork.move(0, 0, true);
			
			assert(!artwork.isUndoAllowed());
			
			artwork.move(0.4, -0.4, true);
			
			assert(!artwork.isUndoAllowed());
		});
		
		it("should call updateRegion() with the modified rectangle during redo (full layer)", function () {
			var
				artwork = new CPArtwork(4, 4),
				updatedRegion = new CPRect(0, 0, 0, 0);
			
			artwork.addLayer("layer");
			
			// Non-transparent so the selection will transform all pixels
			artwork.getActiveLayer().image.clearAll(0xFFFFFFFF);
			
			artwork.on("updateRegion", function(rect) {
				updatedRegion.union(rect);
			});
			
			artwork.move(1, 0, false);
			
			assert(updatedRegion.equals(new CPRect(0, 0, 4, 4)));
		});
		
		it("should call updateRegion() with the modified rectangle during undo (full layer)", function () {
			var
				artwork = new CPArtwork(4, 4),
				updatedRegion = new CPRect(0, 0, 0, 0);
			
			artwork.addLayer("layer");
			
			// Non-transparent so the selection will transform all pixels
			artwork.getActiveLayer().image.clearAll(0xFFFFFFFF);
			
			artwork.move(1, 0, false);
			
			artwork.on("updateRegion", function(rect) {
				updatedRegion.union(rect);
			});
			
			artwork.undo();
			
			assert(updatedRegion.equals(new CPRect(0, 0, 4, 4)));
		});
		
		it("should call updateRegion() with the modified rectangle during redo (selection)", function () {
			var
				artwork = new CPArtwork(4, 4),
				updatedRegion = new CPRect(0, 0, 0, 0);
			
			artwork.addLayer("layer");
			
			artwork.getActiveLayer().image.clearAll(0xFFFFFFFF);
			
			artwork.setSelection(new CPRect(0, 0, 1, 1));
			
			artwork.on("updateRegion", function(rect) {
				updatedRegion.union(rect);
			});
			
			artwork.move(1, 0, false);
			
			assert(updatedRegion.equals(new CPRect(0, 0, 2, 1)));
		});
		
		it("should call updateRegion() with the modified rectangle during undo (selection)", function () {
			var
				artwork = new CPArtwork(4, 4),
				updatedRegion = new CPRect(0, 0, 0, 0);
			
			artwork.addLayer("layer");
			
			artwork.getActiveLayer().image.clearAll(0xFFFFFFFF);
			
			artwork.setSelection(new CPRect(0, 0, 1, 1));
			
			artwork.move(1, 0, false);
			
			artwork.on("updateRegion", function(rect) {
				updatedRegion.union(rect);
			});
			
			artwork.undo();
			
			assert(updatedRegion.equals(new CPRect(0, 0, 2, 1)));
		});
		
		{
			let
				beforeImage = `
					....
					.OO.
					.OO.
					....
				`,
				beforeMask = `
				     ....
				     OOO.
				     ....
				     ....
				`,
				operation = function() {
					this.move(-1, 0, false);
				},
				expectImage = `
					 ....
					 OO..
					 OO..
					 ....
				`,
				expectMask = `
				     ...O
				     OO.O
				     ...O
				     ...O
				`;
			
			it("should move the layer and mask if no selection is present, new image pixels should be transparent and new mask pixels should be white", function () {
				TestUtil.testLayerPaintOperation({
					beforeImage, beforeMask, expectImage, expectMask, operation,
					select: "image",
					linkMask: true,

					expectImageToChange: true,
					expectMaskToChange: true
				});
			});

			it("should move only the mask if the mask is selected and mask is unlinked", function () {
				TestUtil.testLayerPaintOperation({
					beforeImage, beforeMask, expectImage, expectMask, operation,
					select: "mask",
					linkMask: false,

					expectMaskToChange: true
				});
			});

			it("should move only the image if the image is selected and mask is unlinked", function () {
				TestUtil.testLayerPaintOperation({
					beforeImage, beforeMask, expectImage, expectMask, operation,
					select: "image",
					linkMask: false,

					expectImageToChange: true
				});
			});
		}

		{
			let
				beforeImage = `
					....
					.OO.
					.OO.
					....
				`,
				beforeMask = `
				     ....
				     OOO.
				     ....
				     ....
				`,
				operation = function() {
					this.move(-1, 0, false);
					this.move(-1, 0, false);
				},
				expectImage = `
					 ....
					 O...
					 O...
					 ....
				`,
				expectMask = `
				     ..OO
				     O.OO
				     ..OO
				     ..OO
				`;
			
			it("should support amend()", function () {
				TestUtil.testLayerPaintOperation({
					beforeImage, beforeMask, expectImage, expectMask, operation,
					select: "image",
					linkMask: true,
					
					expectImageToChange: true,
					expectMaskToChange: true
				});
			});
			
			it("should support amend() after compact()", function () {
				TestUtil.testLayerPaintOperation({
					beforeImage, beforeMask, expectImage, expectMask,
					
					operation: function() {
						this.move(-1, 0, false);
						this.compactUndo();
						this.move(-1, 0, false);
					},
					select: "image",
					linkMask: true,
					
					expectImageToChange: true,
					expectMaskToChange: true
				});
			});
		}
		
		{
			let
				pre = function() {
					this.setSelection(new CPRect(1, 1, 2, 2));
				},
				beforeImage = `
					....
					.OO.
					.OO.
					....
				`,
				beforeMask = `
				     ....
				     OOO.
				     ....
				     ....
				`,
				operation = function() {
					this.move(-1, -1, false);
				},
				expectImage = `
					O...
					..O.
					.OO.
					....
				`,
				expectMask = `
				     O...
				     O.O.
				     ....
				     ....
				`;

			it("should move the selected image pixels only, new pixels should be transparent", function () {
				TestUtil.testLayerPaintOperation({
					beforeImage, beforeMask, expectImage, expectMask, pre, operation,
					select: "image",
					linkMask: true,

					expectImageToChange: true
				});
			});

			it("should move the selected mask pixels only, new pixels should be black", function () {
				TestUtil.testLayerPaintOperation({
					beforeImage, beforeMask, expectImage, expectMask, pre, operation,
					select: "mask",
					linkMask: true,

					expectMaskToChange: true
				});
			});
		}

		it("should allow the whole layer to be copied while moving", function() {
			var
				artwork = new CPArtwork(4, 4),
				layer,
				beforeImage = TestUtil.colorBitmapFromString(`
					....
					.OO.
					.OO.
					....
				`),
				beforeMask = TestUtil.greyBitmapFromString(`
				     ....
				     OOO.
				     ....
				     ....
				`),
				expectImage = TestUtil.colorBitmapFromString(`
					 ....
					 OOO.
					 OOO.
					 ....
				`),
				expectMask = TestUtil.greyBitmapFromString(`
				     ....
				     OO..
				     ....
				     ....
				`);

			artwork.addLayer("layer");
			layer = artwork.getActiveLayer();
			artwork.addLayerMask();

			layer.image.copyPixelsFrom(beforeImage);
			layer.mask.copyPixelsFrom(beforeMask);

			TestUtil.artworkUndoRedo({
				artwork: artwork,
				pre: function () {
					assert(artwork.getLayersRoot().layers.length == 1);
					assert(TestUtil.bitmapsAreEqual(layer.image, beforeImage));
					assert(TestUtil.bitmapsAreEqual(layer.mask, beforeMask));
				},
				action: function () {
					artwork.move(-1, 0, true);
				},
				post: function () {
					assert(artwork.getLayersRoot().layers.length == 1);
					assert(TestUtil.bitmapsAreEqual(layer.image, expectImage));
					assert(TestUtil.bitmapsAreEqual(layer.mask, expectMask));
				},
				testCompact: true
			});
		});

		it("should move a group's mask and its children if the group has a linked mask, and the group's mask is selected", function () {
			testMoveGroup(SELECT_MASK, LINK_MASK, EXPECT_MASK_TO_MOVE, EXPECT_CHILDREN_TO_MOVE);
		});

		it("should move a group's mask and its children if the group has a linked mask, and the group's image is selected", function () {
			testMoveGroup(SELECT_IMAGE, LINK_MASK, EXPECT_MASK_TO_MOVE, EXPECT_CHILDREN_TO_MOVE);
		});

		it("should move a group's mask if the group doesn't link its mask, and the group's mask is selected", function () {
			testMoveGroup(SELECT_MASK, UNLINK_MASK, EXPECT_MASK_TO_MOVE, EXPECT_CHILDREN_WONT_MOVE);
		});

		it("should move a group's children if the group doesn't link its mask, and the group's image is selected", function () {
			testMoveGroup(SELECT_IMAGE, UNLINK_MASK, EXPECT_MASK_WONT_MOVE, EXPECT_CHILDREN_TO_MOVE);
		});
	});
});