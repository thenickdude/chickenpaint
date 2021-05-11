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
	describe("#removeLayer", function() {
		it("should not allow the only image layer to be removed", function () {
			var
				artwork = new CPArtwork(100, 100);

			artwork.addLayer("image");

			assert(artwork.isUndoAllowed());

			artwork.clearHistory();

			assert(!artwork.isUndoAllowed());

			artwork.removeLayer();

			assert(!artwork.isUndoAllowed());
		});

		it("should not allow the only group containing an image layer to be removed", function () {
			var
				artwork = new CPArtwork(100, 100),
				group;

			artwork.addLayer("group");
			group = artwork.getActiveLayer();

			artwork.addLayer("image");

			artwork.setActiveLayer(group, false);

			assert(artwork.isUndoAllowed());

			artwork.clearHistory();

			assert(!artwork.isUndoAllowed());

			artwork.removeLayer();

			assert(!artwork.isUndoAllowed());
		});

		it("should preserve layer identity over remove", function () {
			var
				artwork = new CPArtwork(100, 100),
				layer;

			artwork.addLayer("layer");
			artwork.addLayer("layer");

			layer = artwork.getActiveLayer();

			TestUtil.artworkUndoRedo({
				artwork: artwork,
				pre: function () {
					assert(artwork.getLayersRoot().layers[1] == layer);
				},
				action: function () {
					// Move the layer to underneath the first clipped layer
					artwork.removeLayer();
				},
				post: function () {
					assert(artwork.getLayersRoot().layers.length == 1);
				}
			});
		});

		it("should release the clip of the layers above if the deleted layer was a clipping root", function () {
			var
				artwork = new CPArtwork(100, 100),
				layer,
				group = artwork.getLayersRoot();

			artwork.addLayer("layer");

			layer = artwork.getActiveLayer();

			artwork.addLayer("layer");
			artwork.createClippingMask();

			artwork.addLayer("layer");
			artwork.createClippingMask();

			artwork.setActiveLayer(layer, false);

			TestUtil.artworkUndoRedo({
				artwork: artwork,
				pre: function () {
					assert(group.layers[0] == layer);
					assert(!group.layers[0].clip);
					assert(group.layers[1].clip);
					assert(group.layers[2].clip);
				},
				action: function () {
					artwork.removeLayer();
				},
				post: function () {
					assert(group.layers.length == 2);
					assert(!group.layers[0].clip);
					assert(!group.layers[1].clip);
				}
			});
		});
	});
});