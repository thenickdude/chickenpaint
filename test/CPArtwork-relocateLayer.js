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

import CPArtwork from '../js/engine/CPArtwork.js';

import assert from 'assert';
import TestUtil from './lib/TestUtil.js';

describe("CPArtwork", function() {
	describe("#relocateLayer", function() {
		it("should correctly reorder layers in the positive direction", function () {
			var
				artwork = new CPArtwork(100, 100),
				group = artwork.getLayersRoot(),
				layer0, layer1, layer2;

			artwork.addLayer("layer");
			layer0 = artwork.getActiveLayer();

			artwork.addLayer("layer");
			layer1 = artwork.getActiveLayer();

			artwork.addLayer("layer");
			layer2 = artwork.getActiveLayer();

			TestUtil.artworkUndoRedo({
				artwork: artwork,
				pre: function() {
					assert(group.layers[0] == layer0);
					assert(group.layers[1] == layer1);
					assert(group.layers[2] == layer2);
				},
				action: function() {
					artwork.relocateLayer(layer0, group, 2);
				},
				post: function() {
					assert(group.layers[0] == layer1);
					assert(group.layers[1] == layer0);
					assert(group.layers[2] == layer2);
				}
			});
		});

		it("should correctly reorder layers in the negative direction", function () {
			var
				artwork = new CPArtwork(100, 100),
				group = artwork.getLayersRoot(),
				layer0, layer1, layer2;

			artwork.addLayer("layer");
			layer0 = artwork.getActiveLayer();

			artwork.addLayer("layer");
			layer1 = artwork.getActiveLayer();

			artwork.addLayer("layer");
			layer2 = artwork.getActiveLayer();

			TestUtil.artworkUndoRedo({
				artwork: artwork,
				pre: function() {
					assert(group.layers[0] == layer0);
					assert(group.layers[1] == layer1);
					assert(group.layers[2] == layer2);
				},
				action: function() {
					artwork.relocateLayer(layer2, group, 0);
				},
				post: function() {
					assert(group.layers[0] == layer2);
					assert(group.layers[1] == layer0);
					assert(group.layers[2] == layer1);
				}
			});
		});

		it("should not allow a group to be moved into itself", function () {
			var
				artwork = new CPArtwork(100, 100);

			artwork.addLayer("group");

			assert(artwork.isUndoAllowed());

			artwork.clearHistory();

			assert(!artwork.isUndoAllowed());

			artwork.relocateLayer(artwork.getActiveLayer(), artwork.getActiveLayer(), 0);

			assert(!artwork.isUndoAllowed());
		});

		it("should not allow a group to be moved into one of its descendants", function () {
			var
				artwork = new CPArtwork(100, 100),
				parent, child;

			artwork.addLayer("group");

			parent = artwork.getActiveLayer();

			artwork.addLayer("group");

			child = artwork.getActiveLayer();

			assert(parent != null && child != null);

			assert(child.parent == parent);

			assert(artwork.isUndoAllowed());

			artwork.clearHistory();

			assert(!artwork.isUndoAllowed());

			artwork.relocateLayer(parent, child, 0);

			assert(!artwork.isUndoAllowed());
		});

		it("should add a layer to a clipping group if it is moved inside it", function () {
			var
				artwork = new CPArtwork(100, 100),
				movingLayer,
				group;

			artwork.addLayer("group");

			group = artwork.getActiveLayer();

			artwork.addLayer("layer");

			movingLayer = artwork.getActiveLayer();
			assert(movingLayer.clip == false);

			artwork.addLayer("layer");

			artwork.addLayer("layer");
			artwork.createClippingMask();

			artwork.addLayer("layer");
			artwork.createClippingMask();

			TestUtil.artworkUndoRedo({
				artwork: artwork,
				pre: function() {
					assert(!group.layers[0].clip);
					assert(!group.layers[1].clip);
					assert(group.layers[2].clip);
					assert(group.layers[3].clip);
				},
				action: function() {
					// Move the layer to underneath the first clipped layer
					artwork.relocateLayer(movingLayer, movingLayer.parent, 2);
				},
				post: function() {
					assert(!group.layers[0].clip);
					assert(group.layers[1].clip);
					assert(group.layers[2].clip);
					assert(group.layers[3].clip);
				}
			});
		});

		it("should release the clip of the layers above if we move a group into the middle of a clipping group", function () {
			var
				artwork = new CPArtwork(100, 100),
				group;

			artwork.addLayer("layer");

			artwork.addLayer("layer");
			artwork.createClippingMask();

			artwork.addLayer("layer");
			artwork.createClippingMask();

			artwork.addLayer("layer");

			artwork.addLayer("layer");
			artwork.createClippingMask();

			artwork.addLayer("group");

			group = artwork.getActiveLayer();

			TestUtil.artworkUndoRedo({
				artwork: artwork,
				pre: function() {
					assert(artwork.getLayersRoot().layers[0].clip == false);
					assert(artwork.getLayersRoot().layers[1].clip == true);
					assert(artwork.getLayersRoot().layers[2].clip == true);
					assert(artwork.getLayersRoot().layers[3].clip == false);
					assert(artwork.getLayersRoot().layers[4].clip == true);
					// Group is in index 5
				},
				action: function() {
					// Move the group into the middle of the clipping group
					artwork.relocateLayer(group, group.parent, 1);
				},
				post: function() {
					assert(artwork.getLayersRoot().indexOf(group) == 1);
					assert(artwork.getLayersRoot().layers[0].clip == false);
					// Group is in index 1
					assert(artwork.getLayersRoot().layers[2].clip == false);
					assert(artwork.getLayersRoot().layers[3].clip == false);
					assert(artwork.getLayersRoot().layers[4].clip == false);
					assert(artwork.getLayersRoot().layers[5].clip == true);
				}
			});
		});

		it("should release the clip of a layer in a clipping group if it is moved out of it", function () {
			var
				artwork = new CPArtwork(100, 100),
				topLayer, group;

			artwork.addLayer("group");

			group = artwork.getActiveLayer();

			artwork.addLayer("layer");
			artwork.addLayer("layer");
			artwork.createClippingMask();

			artwork.addLayer("layer");

			topLayer = artwork.getActiveLayer();

			artwork.createClippingMask();

			TestUtil.artworkUndoRedo({
				artwork: artwork,
				pre: function() {
					assert(topLayer.parent == group);
					assert(topLayer.parent.indexOf(topLayer) == 2);
					assert(topLayer.clip == true);
				},
				action: function() {
					// Move to the bottom of the document
					artwork.relocateLayer(topLayer, artwork.getLayersRoot(), 0);
				},
				post: function() {
					assert(topLayer.parent == artwork.getLayersRoot());
					assert(topLayer.parent.indexOf(topLayer) == 0);
					assert(topLayer.clip == false);
				}
			});
		});

		it("should release the clip of the layers above when moving a clipping root out of its group", function () {
			var
				artwork = new CPArtwork(100, 100),
				clipRoot, group;

			artwork.addLayer("group");

			group = artwork.getActiveLayer();

			artwork.addLayer("layer");

			clipRoot = artwork.getActiveLayer();

			artwork.addLayer("layer");
			artwork.createClippingMask();

			artwork.addLayer("layer");
			artwork.createClippingMask();

			artwork.addLayer("layer");

			artwork.addLayer("layer");
			artwork.createClippingMask();

			TestUtil.artworkUndoRedo({
				artwork: artwork,
				pre: function() {
					assert(!clipRoot.parent.layers[0].clip);
					assert(clipRoot.parent.layers[1].clip);
					assert(clipRoot.parent.layers[2].clip);
					assert(!clipRoot.parent.layers[3].clip);
					assert(clipRoot.parent.layers[4].clip);
				},
				action: function() {
					// Move to the top of the clipping group
					artwork.relocateLayer(clipRoot, group, 3);
				},
				post: function() {
					assert(!clipRoot.parent.layers[0].clip);
					assert(!clipRoot.parent.layers[1].clip);
					assert(!clipRoot.parent.layers[2].clip);
					assert(!clipRoot.parent.layers[3].clip);
					assert(clipRoot.parent.layers[4].clip);
				}
			});
		});
	});
});