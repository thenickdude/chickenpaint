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
import CPTransform from "../js/util/CPTransform.js";

const
	SELECT_IMAGE = 0,
	SELECT_MASK = 1,
	UNLINK_MASK = 0,
	LINK_MASK = 1,
	EXPECT_MASK_WONT_MOVE = 0,
	EXPECT_MASK_TO_MOVE = 1,
	EXPECT_CHILDREN_WONT_MOVE = 0,
	EXPECT_CHILDREN_TO_MOVE = 1;

function testTransformGroup(selectType, linkMask, expectGroupMaskToMove, expectChildrenToMove) {
	let
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
			let
				transform = new CPTransform();
			
			transform.translate(-1, 0);
			
			artwork.transformAffineBegin();
			artwork.transformAffineAmend(transform);
			artwork.transformAffineFinish();
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
	describe("#transformAffine", function() {
		const
			boxImage = TestUtil.colorBitmapFromString(`
			   .....
			   .OOO.
			   .OOO.
			   .....
			`),
			
			boxImageShifted = TestUtil.colorBitmapFromString(`
			   .....
			   ..OOO
			   ..OOO
			   .....
			`);
		
		it("should not modify the image if the matrix is identity", function () {
			let
				artwork = new CPArtwork(5, 5),
				layer;

			artwork.addLayer("layer");
			
			layer = artwork.getActiveLayer();

			layer.image.copyPixelsFrom(boxImage);
			
			assert(artwork.transformAffineBegin());
			
			artwork.transformAffineAmend(new CPTransform());
			
			artwork.transformAffineFinish();
			
			assert(TestUtil.bitmapsAreEqual(layer.image, boxImage));
		});
		
		it("should call updateRegion() with the modified rectangle during redo (full layer)", function () {
			let
				artwork = new CPArtwork(5, 5),
				layer,
				updatedRegion = new CPRect(0, 0, 0, 0),
				transform = new CPTransform();
			
			artwork.addLayer("layer");
			
			layer = artwork.getActiveLayer();
			
			layer.image.copyPixelsFrom(boxImage);
			
			artwork.on("updateRegion", function(rect) {
				updatedRegion.union(rect);
			});
			
			assert(artwork.transformAffineBegin());
			
			transform.translate(1, 0);
			artwork.transformAffineAmend(transform);
			
			artwork.transformAffineFinish();
			
			// The non-transparent pixels in the source and destination regions should be updated
			assert(updatedRegion.equals(new CPRect(1, 1, 5, 3)));
			
			assert(TestUtil.bitmapsAreEqual(layer.image, boxImageShifted));
		});
		
		it("should call updateRegion() with the modified rectangle during undo (full layer)", function () {
			let
				artwork = new CPArtwork(5, 5),
				layer,
				updatedRegion = new CPRect(0, 0, 0, 0),
				transform = new CPTransform();
			
			artwork.addLayer("layer");
			
			layer = artwork.getActiveLayer();
			
			layer.image.copyPixelsFrom(boxImage);
			
			assert(artwork.transformAffineBegin());
			
			transform.translate(1, 0);
			artwork.transformAffineAmend(transform);
			
			artwork.transformAffineFinish();
			
			artwork.on("updateRegion", function(rect) {
				updatedRegion.union(rect);
			});
			
			artwork.undo();
			
			assert(updatedRegion.equals(new CPRect(1, 1, 5, 3)));
			
			assert(TestUtil.bitmapsAreEqual(layer.image, boxImage));
		});
		
		it("should call updateRegion() with the modified rectangle during redo (selection)", function () {
			let
				artwork = new CPArtwork(5, 5),
				layer,
				updatedRegion = new CPRect(0, 0, 0, 0),
				transform = new CPTransform();
			
			artwork.addLayer("layer");
			
			layer = artwork.getActiveLayer();
			
			layer.image.copyPixelsFrom(boxImage);
			
			artwork.setSelection(new CPRect(0, 0, 2, 2));
			
			artwork.on("updateRegion", function(rect) {
				updatedRegion.union(rect);
			});
			
			assert(artwork.transformAffineBegin());
			
			transform.translate(0, -1);
			artwork.transformAffineAmend(transform);
			
			artwork.transformAffineFinish();
			
			assert(updatedRegion.equals(new CPRect(1, 0, 2, 2)));
			
			assert(TestUtil.bitmapsAreEqual(layer.image, TestUtil.colorBitmapFromString(`
			   .O...
			   ..OO.
			   .OOO.
			   .....
			`)));
		});
		
		it("should call updateRegion() with the modified rectangle during undo (selection)", function () {
			let
				artwork = new CPArtwork(5, 5),
				layer,
				updatedRegion = new CPRect(0, 0, 0, 0),
				transform = new CPTransform();
			
			artwork.addLayer("layer");
			
			layer = artwork.getActiveLayer();
			
			layer.image.copyPixelsFrom(boxImage);
			
			artwork.setSelection(new CPRect(0, 0, 2, 2));
			
			assert(artwork.transformAffineBegin());
			
			transform.translate(0, -1);
			artwork.transformAffineAmend(transform);
			
			artwork.transformAffineFinish();
			
			artwork.on("updateRegion", function(rect) {
				updatedRegion.union(rect);
			});
			
			artwork.undo();
			
			assert(updatedRegion.equals(new CPRect(1, 0, 2, 2)));
			
			assert(TestUtil.bitmapsAreEqual(layer.image, TestUtil.colorBitmapFromString(`
			   .....
			   .OOO.
			   .OOO.
			   .....
			`)));
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
					let
						transform = new CPTransform();
					
					transform.translate(-1, 0);
				
					this.transformAffineBegin();
					this.transformAffineAmend(transform);
					this.transformAffineFinish();
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
					let
						transform = new CPTransform();
					
					transform.translate(-1, -1);
					
					this.transformAffineBegin();
					this.transformAffineAmend(transform);
					this.transformAffineFinish();
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
		
		{
			const
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
					let
						transform = new CPTransform();
					
					transform.translate(-5, 0);
					
					this.transformAffineBegin();
					this.transformAffineAmend(transform);
					this.transformAffineFinish();
				},
				expectImage = `
					 ....
					 ....
					 ....
					 ....
				`,
				expectMask = `
				     OOOO
				     OOOO
				     OOOO
				     OOOO
				`;
			
			it("should perform correctly if the destination lies completely outside the canvas", function () {
				TestUtil.testLayerPaintOperation({
					beforeImage, beforeMask, expectImage, expectMask, operation,
					select: "image",
					linkMask: true,
					
					expectImageToChange: true,
					expectMaskToChange: true
				});
			});
		}

		it("should move a group's mask and its children if the group has a linked mask, and the group's mask is selected", function () {
			testTransformGroup(SELECT_MASK, LINK_MASK, EXPECT_MASK_TO_MOVE, EXPECT_CHILDREN_TO_MOVE);
		});

		it("should move a group's mask and its children if the group has a linked mask, and the group's image is selected", function () {
			testTransformGroup(SELECT_IMAGE, LINK_MASK, EXPECT_MASK_TO_MOVE, EXPECT_CHILDREN_TO_MOVE);
		});

		it("should move a group's mask if the group doesn't link its mask, and the group's mask is selected", function () {
			testTransformGroup(SELECT_MASK, UNLINK_MASK, EXPECT_MASK_TO_MOVE, EXPECT_CHILDREN_WONT_MOVE);
		});

		it("should move a group's children if the group doesn't link its mask, and the group's image is selected", function () {
			testTransformGroup(SELECT_IMAGE, UNLINK_MASK, EXPECT_MASK_WONT_MOVE, EXPECT_CHILDREN_TO_MOVE);
		});
	});
});