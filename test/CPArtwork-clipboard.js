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

import TestUtil from "./lib/TestUtil.js";
import CPRect from "../js/util/CPRect.js";

import assert from "assert";

import "core-js/stable/symbol/index.js";
import "core-js/stable/array/iterator.js";
import CPClip from "../js/engine/CPClip.js";

describe("CPArtwork", function() {
	describe("#cutSelection", function() {
		it("should do nothing if nothing is selected", function () {
			var
				artwork = new CPArtwork(100, 100);

			artwork.addLayer("layer");

			artwork.clearHistory();
			
			assert(!artwork.isUndoAllowed());
			
			artwork.cutSelection();
			
			assert(!artwork.isUndoAllowed());
		});
		
		it("should clear the selection", function () {
			const
				artwork = new CPArtwork(100, 100),
				testSelection = new CPRect(0, 0, 50, 50);
			
			artwork.addLayer("layer");
			
			artwork.setSelection(testSelection);
			
			TestUtil.artworkUndoRedo({
				artwork: artwork,
				pre: function () {
					assert(artwork.getSelection().equals(testSelection));
				},
				action: function () {
					artwork.cutSelection();
				},
				post: function () {
					assert(artwork.getSelection().isEmpty());
				}
			});
		});
		
		{
			let
				testSelection = new CPRect(0, 0, 2, 2),
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
				pre = function() {
					this.setSelection(testSelection);
				},
				operation = function() {
					this.cutSelection();
				},
				expectImage = `
					....
					..O.
					.OO.
					....
				`,
				expectMask = `
				     ....
				     ..O.
				     ....
				     ....
				`,
				expectImageClipboard = TestUtil.colorBitmapFromString( `
					..
					.O
				`),
				expectMaskClipboard = TestUtil.greyBitmapFromString(`
					..
					OO
				`);
			
			it("should fill the clipboard with cut image data and clear the image to transparent", function () {
				TestUtil.testLayerPaintOperation({
					beforeImage, beforeMask, expectImage, expectMask, operation,
					select: "image",
					linkMask: true,

					expectImageToChange: true,
					expectMaskToChange: false,
					
					pre,
					post: function() {
						assert(TestUtil.bitmapsAreEqual(this.getClipboard().bmp, expectImageClipboard));
						assert(this.getClipboard().x === 0);
						assert(this.getClipboard().y === 0);
					}
				});
			});

			it("should fill the clipboard with cut mask data and clear the mask to black", function () {
				TestUtil.testLayerPaintOperation({
					beforeImage, beforeMask, expectImage, expectMask, operation,
					select: "mask",
					linkMask: true,
					
					expectImageToChange: false,
					expectMaskToChange: true,
					
					pre,
					post: function() {
						assert(TestUtil.bitmapsAreEqual(this.getClipboard().bmp, expectMaskClipboard));
						assert(this.getClipboard().x === 0);
						assert(this.getClipboard().y === 0);
					}
				});
			});
		}
	});
	
	describe("#copySelection", function() {
		it("should do nothing if nothing is selected", function () {
			var
				artwork = new CPArtwork(100, 100);
			
			artwork.addLayer("layer");
			
			assert(artwork.getClipboard() === null);
			
			artwork.copySelection();
			
			assert(artwork.getClipboard() === null);
		});
		
		it("should not be undo-able", function () {
			var
				artwork = new CPArtwork(100, 100);
			
			artwork.addLayer("layer");
			artwork.clearHistory();
			
			artwork.copySelection();
			
			assert(artwork.isUndoAllowed() === false);
		});
		
		it("should not change the selection", function () {
			const
				artwork = new CPArtwork(100, 100),
				testSelection = new CPRect(0, 0, 50, 50);
			
			artwork.addLayer("layer");
			
			artwork.setSelection(testSelection);
			
			artwork.copySelection();
			
			assert(artwork.getSelection().equals(testSelection));
		});
		
		{
			let
				testSelection = new CPRect(1, 1, 3, 3),
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
				expectImageClipboard = TestUtil.colorBitmapFromString( `
					OO
					OO
				`),
				expectMaskClipboard = TestUtil.greyBitmapFromString(`
					OO
					..
				`);
			
			it("should fill the clipboard with copied image data and not modify the image", function () {
				let
					artwork = new CPArtwork(beforeImage.width, beforeImage.height);
				
				artwork.addLayer("layer");
				
				let
					layer = artwork.getActiveLayer();
				
				artwork.addLayerMask();
				artwork.setActiveLayer(layer, false); // Select the image rather than the mask
				
				layer.image.copyPixelsFrom(beforeImage);
				layer.mask.copyPixelsFrom(beforeMask);
				
				artwork.setSelection(testSelection);
				
				artwork.copySelection();

				assert(TestUtil.bitmapsAreEqual(layer.image, beforeImage));
				assert(TestUtil.bitmapsAreEqual(layer.mask, beforeMask));
				
				assert(TestUtil.bitmapsAreEqual(artwork.getClipboard().bmp, expectImageClipboard));
				assert(artwork.getClipboard().x === 1);
				assert(artwork.getClipboard().y === 1);
			});
			
			it("should fill the clipboard with copied mask data and not modify the mask", function () {
				let
					artwork = new CPArtwork(beforeImage.width, beforeImage.height);
				
				artwork.addLayer("layer");
				artwork.addLayerMask();
				
				let
					layer = artwork.getActiveLayer();
				
				artwork.setActiveLayer(layer, true);
				
				layer.image.copyPixelsFrom(beforeImage);
				layer.mask.copyPixelsFrom(beforeMask);
				
				artwork.setSelection(testSelection);
				
				artwork.copySelection();
				
				assert(TestUtil.bitmapsAreEqual(layer.image, beforeImage));
				assert(TestUtil.bitmapsAreEqual(layer.mask, beforeMask));
				assert(TestUtil.bitmapsAreEqual(artwork.getClipboard().bmp, expectMaskClipboard));
				assert(artwork.getClipboard().x === 1);
				assert(artwork.getClipboard().y === 1);
			});
		}
	});
	
	describe("#pasteSelection", function() {
		it("should do nothing if the clipboard is empty", function () {
			var
				artwork = new CPArtwork(100, 100);
			
			artwork.addLayer("layer");
			artwork.clearHistory();
			
			assert(!artwork.isPasteClipboardAllowed());
			
			artwork.pasteClipboard();
			
			assert(!artwork.isUndoAllowed());
		});
		
		it("should clear the selection", function () {
			const
				artwork = new CPArtwork(100, 100),
				testSelection = new CPRect(0, 0, 50, 50);
			
			artwork.addLayer("layer");
			
			artwork.setSelection(testSelection);
			
			artwork.copySelection();
			
			TestUtil.artworkUndoRedo({
				artwork: artwork,
				pre: function () {
					assert(artwork.getSelection().equals(testSelection));
				},
				action: function () {
					artwork.pasteClipboard();
				},
				post: function () {
					assert(artwork.getSelection().isEmpty());
				}
			});
		});
		
		{
			let
				beforeImageClipboard = new CPClip(TestUtil.colorBitmapFromString( `
					..
					.O
				`), 1, 1),
				beforeMaskClipboard = new CPClip(TestUtil.greyBitmapFromString(`
					..
					OO
				`), 1, 1),
				expectImage = TestUtil.colorBitmapFromString(`
					....
					....
					..O.
					....
				`),
				expectMask = TestUtil.colorBitmapFromString(`
				     ....
				     .XX.
				     .OO.
				     ....
				`);
			
			it("should paste an image from the clipboard as a new layer and select it", function() {
				let
					artwork = new CPArtwork(4, 4),
					oldLayer;
				
				artwork.addLayer("layer");
				artwork.addLayerMask();
				artwork.setClipboard(beforeImageClipboard);
				
				oldLayer = artwork.getActiveLayer();
				
				// Select the mask just to check that this selection is restored upon undo
				artwork.setActiveLayer(oldLayer, true);
				
				TestUtil.artworkUndoRedo({
					artwork,
					pre: function() {
						assert(artwork.getLayersRoot().layers.length == 1);
						assert(artwork.isEditingMask());
					},
					action: function() {
						artwork.pasteClipboard();
					},
					post: function() {
						assert(artwork.getLayersRoot().layers.length == 2);
						assert(artwork.getActiveLayer() != oldLayer);
						assert(!artwork.isEditingMask());
						
						assert(TestUtil.bitmapsAreEqual(artwork.getActiveLayer().image, expectImage));
					}
				})
			});
			
			it("should paste a mask from the clipboard as a new layer's image and select it", function() {
				let
					artwork = new CPArtwork(4, 4),
					oldLayer;
				
				artwork.addLayer("layer");
				artwork.addLayerMask();
				artwork.setClipboard(beforeMaskClipboard);
				
				oldLayer = artwork.getActiveLayer();
				
				artwork.setActiveLayer(oldLayer, false);
				
				TestUtil.artworkUndoRedo({
					artwork,
					pre: function() {
						assert(artwork.getLayersRoot().layers.length == 1);
						assert(!artwork.isEditingMask());
					},
					action: function() {
						artwork.pasteClipboard();
					},
					post: function() {
						assert(artwork.getLayersRoot().layers.length == 2);
						assert(artwork.getActiveLayer() != oldLayer);
						assert(!artwork.isEditingMask());
						
						assert(TestUtil.bitmapsAreEqual(artwork.getActiveLayer().image, expectMask));
					}
				})
			});
		}
	});
});