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

describe("CPArtwork", function() {
	describe("#mergeAllLayers", function() {
		it("should result in a single layer with alpha 100 and blendmode normal", function () {
			var
				artwork = new CPArtwork(100, 100);

			artwork.addLayer("layer");
			artwork.addLayer("layer");

			TestUtil.artworkUndoRedo({
				artwork: artwork,
				pre: function () {
					assert(artwork.getLayersRoot().layers.length == 2);
				},
				action: function () {
					artwork.mergeAllLayers();
				},
				post: function () {
					assert(artwork.getLayersRoot().layers.length == 1);

					var
						merged = artwork.getLayersRoot().layers[0];

					assert(merged == artwork.getActiveLayer());

					assert(merged.alpha == 100);
					assert(merged.blendMode == CPBlend.LM_NORMAL);
				}
			});
		});

		it("should preserve layer identity over undo/redo", function () {
			var
				artwork = new CPArtwork(100, 100),
				layer1,
				layer2,
				merged = null;

			artwork.addLayer("layer");
			layer1 = artwork.getActiveLayer();

			artwork.addLayer("layer");
			layer2 = artwork.getActiveLayer();

			TestUtil.artworkUndoRedo({
				artwork: artwork,
				pre: function () {
					assert(artwork.getLayersRoot().layers.length == 2);
					assert(artwork.getLayersRoot().layers[0] == layer1);
					assert(artwork.getLayersRoot().layers[1] == layer2);
				},
				action: function () {
					artwork.mergeAllLayers();

					if (!merged) {
						// Ensure that the merged layer's identity stays the same over multiple redo()s
						merged = artwork.getActiveLayer();
					}
				},
				post: function () {
					assert(artwork.getLayersRoot().layers.length == 1);
					assert(artwork.getLayersRoot().layers[0] == merged);
				}
			});
		});
	});


	describe("#mergeDown", function() {
		it("should result in an image layer with the same name and blendmode of the lower layer, but with alpha 100 (due to blending technicalities) and mask removed (to preserve appearance)", function () {
			var
				artwork = new CPArtwork(100, 100),
				layer1;

			layer1 = artwork.addLayer("layer");

			artwork.setLayerAlpha(50);
			artwork.setLayerBlendMode(CPBlend.LM_MULTIPLY);
			artwork.setLayerName(layer1, "Bottom");
			artwork.addLayerMask();

			artwork.addLayer("layer");

			TestUtil.artworkUndoRedo({
				artwork: artwork,
				pre: function () {
					assert(layer1.alpha == 50);
					assert(layer1.blendMode == CPBlend.LM_MULTIPLY);
					assert(layer1.mask);
				},
				action: function () {
					artwork.mergeDown();
				},
				post: function () {
					var
						merged = artwork.getLayersRoot().layers[0];

					assert(merged.alpha == 100);
					assert(merged.blendMode == CPBlend.LM_MULTIPLY);
					assert(!merged.mask);
					assert(merged.name == "Bottom");
				}
			});
		});

		it("should preserve layer identity over undo/redo", function () {
			var
				artwork = new CPArtwork(100, 100),
				layer1, layer2, merged;

			layer1 = artwork.addLayer("layer");
			layer2 = artwork.addLayer("layer");

			TestUtil.artworkUndoRedo({
				artwork: artwork,
				pre: function () {
					assert(artwork.getLayersRoot().layers[0] == layer1);
					assert(artwork.getLayersRoot().layers[1] == layer2);
				},
				action: function () {
					artwork.mergeDown();
				},
				post: function () {
					assert(artwork.getLayersRoot().layers.length == 1);

					if (merged == null) {
						merged = artwork.getLayersRoot().layers[0];
					}

					assert(merged == artwork.getLayersRoot().layers[0]);
					assert(merged != null && merged != layer1 && merged != layer2);
				}
			});
		});
	});

	describe("#mergeGroup", function() {
		it("should result in an image layer with the same name, alpha, blendmode and mask of the group", function () {
			var
				artwork = new CPArtwork(100, 100),
				group;

			artwork.addLayer("group");

			group = artwork.getActiveLayer();

			artwork.setLayerAlpha(50);
			artwork.setLayerBlendMode(CPBlend.LM_MULTIPLY);
			artwork.addLayerMask();
			artwork.setLayerName(group, "Group");

			artwork.addLayer("layer");

			artwork.setActiveLayer(group, false);

			TestUtil.artworkUndoRedo({
				artwork: artwork,
				pre: function () {
					assert(group.alpha == 50);
					assert(group.blendMode == CPBlend.LM_MULTIPLY);
					assert(group.mask);
				},
				action: function () {
					artwork.mergeGroup();
				},
				post: function () {
					var
						merged = artwork.getLayersRoot().layers[0];

					assert(merged instanceof CPImageLayer);
					assert(merged.alpha == 50);
					assert(merged.blendMode == CPBlend.LM_MULTIPLY);
					assert(merged.mask);
					assert(merged.name == "Group");
				}
			});
		});

		it("should preserve layer identity over undo/redo", function () {
			var
				artwork = new CPArtwork(100, 100),
				group, child, merged;

			artwork.addLayer("group");

			group = artwork.getActiveLayer();

			artwork.addLayer("layer");

			child = group.layers[0];

			artwork.setActiveLayer(group, false);

			TestUtil.artworkUndoRedo({
				artwork: artwork,
				pre: function () {
					assert(artwork.getLayersRoot().layers[0] == group);
					assert(group.layers[0] == child);
				},
				action: function () {
					artwork.mergeGroup();
				},
				post: function () {
					assert(artwork.getLayersRoot().layers.length == 1);

					if (!merged) {
						merged = artwork.getLayersRoot().layers[0];
					}
					assert(merged);
					assert(merged == artwork.getActiveLayer());
				}
			});
		});

		it("should convert groups with blendmode 'passthrough' to 'normal'", function () {
			var
				artwork = new CPArtwork(100, 100),
				group;

			artwork.addLayer("group");

			group = artwork.getActiveLayer();

			artwork.setLayerBlendMode(CPBlend.LM_PASSTHROUGH);
			artwork.addLayerMask();

			artwork.addLayer("layer");
			artwork.addLayerMask(); // Make sure the group can't be elided during blend tree build

			artwork.setActiveLayer(group, false);

			TestUtil.artworkUndoRedo({
				artwork: artwork,
				pre: function () {
					assert(group.blendMode == CPBlend.LM_PASSTHROUGH);
				},
				action: function () {
					artwork.mergeGroup();
				},
				post: function () {
					var
						merged = artwork.getLayersRoot().layers[0];

					assert(merged.blendMode == CPBlend.LM_NORMAL);
				}
			});
		});
	});
});