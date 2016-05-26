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

import CPBlend from './CPBlend';
import CPLayer from './CPLayer';
import CPLayerGroup from './CPLayerGroup';
import CPColorBmp from "./CPColorBmp";
import CPImageLayer from "./CPImageLayer";
import CPRect from "../util/CPRect";

/**
 *
 * @param {int} width
 * @param {int} height
 * @param {(CPLayer|CPLayerGroup)} layer
 * @constructor
 */
function CPBlendNode(width, height, layer) {
	if (layer) {
		this.isGroup = layer instanceof CPLayerGroup;
		this.image = layer.image;
		this.blendMode = layer.blendMode;
		this.alpha = layer.alpha;
	} else {
		this.isGroup = true;
		this.image = null;
		this.blendMode = CPBlend.LM_PASSTHROUGH;
		this.alpha = 100;
	}

	/**
	 * For group nodes, this is the rectangle of data which is dirty (due to changes in child nodes) and needs to be re-merged
	 * @type {CPRect}
	 */
	this.dirtyRect = new CPRect(0, 0, width, height);
	this.layers = [];
	this.parent = null;

	// When true, we should clip the layers in this group to the bottom layer of the stack
	this.clip = false;
}

/**
 *
 * @param {CPBlendNode} child
 */
CPBlendNode.prototype.addChild = function(child) {
	if (child) {
		child.parent = this;
		this.layers.push(child);
	}
};

/**
 * Analyses a stack of layers in a CPLayerGroup and optimizes a drawing scheme for them. Then you can reuse that
 * scheme to blend all the layers together.
 *
 * @param {CPLayerGroup} drawingRootGroup - The root of the layer stack.
 * @param {int} width - Dimension of layers and final merge result.
 * @param {int} height
 * @param {boolean} requireOpaqueFusion - Set to true if the result must have alpha 100.
 *
 * @constructor
 */
export default function CPBlendTree(drawingRootGroup, width, height, requireOpaqueFusion) {
	const
		DEBUG = true;

	var
		/**
		 * @type {CPBlendNode}
		 */
		drawTree,

		/**
		 * Unused buffers we could re-use instead of allocating more memory.
		 *
 		 * @type {CPColorBmp[]}
		 */
		spareBuffers = [],

		/**
		 * @type {Map}
		 */
		nodeForLayer = new Map();

	function allocateBuffer() {
		if (spareBuffers.length > 0) {
			return spareBuffers.pop();
		}

		return new CPColorBmp(width, height);
	}

	/**
	 *
	 * @param {CPBlendNode} groupNode
	 * @returns {?CPBlendNode}
	 */
	function optimizeGroupNode(groupNode) {
		if (groupNode.layers.length == 0) {
			// Group was empty, so omit it

			return null;
		}

		if (groupNode.layers.length == 1) {
			// Replace this group with the layer it contains (combine the alpha of the two layers)
			var
				flattenedNode = groupNode.layers[0];

			flattenedNode.alpha = Math.round(groupNode.alpha * flattenedNode.alpha / 100);
			if (groupNode.blendMode != CPBlend.LM_PASSTHROUGH) {
				flattenedNode.blendMode = groupNode.blendMode;
			}

			return flattenedNode;
		}

		// Since our group has more than one child, our group needs a temporary buffer to merge its children into
		groupNode.image = allocateBuffer();

		return groupNode;
	}

	/**
	 *
	 * @param {CPImageLayer} layer
	 * @returns {CPBlendNode}
	 */
	function createNodeForLayer(layer) {
		var
			node = new CPBlendNode(width, height, layer);

		nodeForLayer.set(layer, node);

		return node;
	}

	/**
	 * Build a CPBlendNode for this CPLayerGroup and return it, or null if this group doesn't draw anything.
	 *
	 * This is achieved by the following algorithm:
	 *
	 * Perform an in-order traversal of layers
	 *   Convert layers which are in a clipping group into a group node
	 *   Drop hidden layers, hidden groups and their contents, pass-through groups
	 *   When leaving a group during traversal:
	 *     If no children remain, drop it
	 *     If there is only one child layer, replace the group with the layer (set blending to the group's and multiply alpha)
	 *   
	 *   We could:
	 *   If all the children are Normal blending and we are Normal at 100%, drop the group
	 *      - This is because blending C <- A, C <- B is the same as A <- B, C <- A
	 *      - We could probably do this for more blending modes too
	 *
	 * @param {CPLayerGroup} layerGroup
	 */
	function buildTreeInternal(layerGroup) {
		var
			treeNode = new CPBlendNode(width, height, layerGroup);

		for (let i = 0; i < layerGroup.layers.length; i++) {
			let
				childLayer = layerGroup.layers[i],
				nextChild = layerGroup.layers[i + 1];

			// Do we need to create a clipping group?
			if (childLayer instanceof CPImageLayer && nextChild && nextChild.clip) {
				let
					clippingGroupNode = new CPBlendNode(width, height),
					j;

				clippingGroupNode.blendMode = childLayer.blendMode;
				clippingGroupNode.alpha = 100;
				clippingGroupNode.clip = true;

				clippingGroupNode.addChild(createNodeForLayer(childLayer));

				for (j = i + 1; j < layerGroup.layers.length; j++) {
					if (layerGroup.layers[j].clip) {
						if (layerGroup.layers[j].getEffectiveAlpha() > 0) {
							clippingGroupNode.addChild(createNodeForLayer(layerGroup.layers[j]));
						}
					} else {
						break;
					}
				}

				if (childLayer.getEffectiveAlpha() > 0) {
					treeNode.addChild(optimizeGroupNode(clippingGroupNode));
				}

				// Skip the layers we just added
				i = j - 1;
				continue;
			}

			if (childLayer.getEffectiveAlpha() == 0) {
				continue;
			}
			if (childLayer instanceof CPLayerGroup) {
				let
					childGroupNode = buildTreeInternal(childLayer);

				// If the group ended up being non-empty...
				if (childGroupNode) {
					if (childGroupNode.blendMode == CPBlend.LM_PASSTHROUGH && childGroupNode.isGroup) {
						/*
						 * TODO what does PASSTHROUGH + alpha < 100 mean for the end-user? Can't figure out a meaning for
						 * that. At the moment we'll just treat it as alpha == 100
						 */

						/*
							Eliminate the pass-through group by adding its children to us instead
						 */
						for (let subLayer of childGroupNode.layers) {
							treeNode.addChild(subLayer);
						}
					} else {
						treeNode.addChild(childGroupNode);
					}
				}
			} else {
				// It's a layer, so we'll add it to our tree node
				treeNode.addChild(createNodeForLayer(childLayer));
			}
		}

		return optimizeGroupNode(treeNode);
	}

	/**
	 * @param {CPBlendNode} node
	 * @param {CPRect} rect
	 */
	function invalidateNodeRect(node, rect) {
		if (node) {
			node.dirtyRect.union(rect);

			invalidateNodeRect(node.parent, rect);
		}
	}

	/**
	 * Mark an area of a layer as updated (so next time fusion is called, it must be redrawn).
	 *
	 * @param {CPLayer} layer
	 * @param {CPRect} rect
	 */
	this.invalidateLayerRect = function(layer, rect) {
		var
			node = nodeForLayer.get(layer);

		// Don't bother invalidating the layer itself because its node will not be a blend group
		invalidateNodeRect(node.parent, rect);
	};

	/**
	 * Build and optimize the blend tree if it was not already built.
	 */
	this.buildTree = function() {
		if (!drawTree) {
			drawTree = buildTreeInternal(drawingRootGroup);

			if (!drawTree) {
				/*
				 * No layers in the image to draw, so clear a buffer to transparent and use that.
				 * This doesn't need to be fast because documents with no visible layers are not useful at all.
				 */
				drawTree = new CPBlendNode(width, height, {
					image: allocateBuffer(),
					blendMode: CPBlend.LM_NORMAL,
					alpha: 100
				});
				drawTree.image.clearAll(0);
			} else if (requireOpaqueFusion && drawTree.alpha < 100) {
				/* e.g. document only contains one layer and it is transparent. Caller needs fusion to be opaque, so add
				 * a group node to render the multiplied alpha version to. (The group node is used to hold a merge buffer
				 * for us).
				 */
				var
					oldNode = drawTree;

				drawTree = new CPBlendNode(width, height);
				drawTree.blendMode = oldNode.blendMode;
				drawTree.alpha = 100;
				drawTree.image = allocateBuffer();
				drawTree.addChild(oldNode);
			}

			/* Assume we'll have re-used most of the buffers we were ever going to, so we can trim our memory usage
			 * to fit now.
			 */
			spareBuffers = [];
		}
	};

	/**
	 * Give back temporary merge buffers to our buffer pool.
	 *
	 * @param {CPBlendNode} root
	 */
	function resetTreeInternal(root) {
		if (root.isGroup) {
			if (root.image) {
				spareBuffers.push(root.image);
			}

			for (let child of root.layers) {
				resetTreeInternal(child);
			}
		}
	}

	/**
	 * Clear the blend tree (so it can be re-built to reflect changes in the layer structure)
	 */
	this.resetTree = function() {
		if (drawTree) {
			resetTreeInternal(drawTree);
			drawTree = null;
			nodeForLayer.clear();
		}
	};

	/**
	 * Call when a property of the layer has changed (opacity, blendMode, visibility)
	 *
	 * @param {CPLayer} layer
	 */
	this.layerPropertyChanged = function(layer) {
		var
			layerNode = nodeForLayer.get(layer);

		/*
		 * If only the blendMode changed, we won't have to reconstruct our blend tree, since none of our
		 * tree structure depends on this (as long as it isn't "passthrough").
		 */
		if (!layerNode
				|| layerNode.visible != layer.visible || layerNode.alpha != layer.alpha || (layerNode.blendMode == CPBlend.LM_PASSTHROUGH) != (layer.blendMode == CPBlend.LM_PASSTHROUGH)) {
			this.resetTree();
		} else {
			layerNode.blendMode = layer.blendMode;
		}
	};

	/**
	 * Blend the given tree node and return the tree node that contains the resulting blend, or null if the tree is empty.
	 * 
	 * @param {?CPBlendNode} treeNode
	 * @param blendArea
	 */
	function blendTreeInternal(treeNode) {
		if (!treeNode || !treeNode.isGroup) {
			// Tree is empty, or it's just a layer and doesn't need further blending
			return treeNode;
		}

		let
			blendArea = treeNode.dirtyRect,
			groupIsEmpty = true,
			fusionHasTransparency = true;

		if (blendArea.isEmpty()) {
			// Nothing to draw!
			return treeNode;
		}

		// Avoid using an iterator here because Chrome refuses to optimize when a "finally" clause is present (caused by Babel iterator codegen)
		for (let i = 0; i < treeNode.layers.length; i++) {
			let
				child = treeNode.layers[i],
				childNode = blendTreeInternal(child);
			
			if (groupIsEmpty) {
				if (childNode.alpha == 100) {
					if (blendArea.getWidth() == treeNode.image.width && blendArea.getHeight() == treeNode.image.height) {
						/* If we're copying the whole image at alpha 100, we're just doing a linear byte copy.
						 * We have a fast version for that!
						 */
						if (DEBUG) {
							console.log("CPColorBmp.copyDataFrom(childNode.image);");
						}
						treeNode.image.copyDataFrom(childNode.image);
					} else {
						// Otherwise use the CPBlend version which only blends the specified rectangle
						if (DEBUG) {
							console.log(`CPBlend.replaceOntoFusionWithOpaqueLayer(treeNode.image, childNode.image, 100, ${blendArea});`);
						}
						CPBlend.replaceOntoFusionWithOpaqueLayer(treeNode.image, childNode.image, 100, blendArea);
					}
				} else {
					if (DEBUG) {
						console.log(`CPBlend.replaceOntoFusionWithTransparentLayer(treeNode.image, childNode.image, childNode.alpha == ${childNode.alpha}, ${blendArea});`);
					}
					CPBlend.replaceOntoFusionWithTransparentLayer(treeNode.image, childNode.image, childNode.alpha, blendArea);
				}
				groupIsEmpty = false;
			} else {
				fusionHasTransparency = fusionHasTransparency && treeNode.image.hasAlphaInRect(blendArea);

				if (DEBUG) {
					console.log(`CPBlend.fuseImageOntoImage(treeNode.image, fusionHasTransparency == ${fusionHasTransparency}, childNode.image, childNode.alpha == ${childNode.alpha}, childNode.blendMode == ${childNode.blendMode}, ${blendArea});`);
				}

				CPBlend.fuseImageOntoImage(treeNode.image, fusionHasTransparency, childNode.image, childNode.alpha, childNode.blendMode, blendArea);
				
				if (treeNode.clip) {
					// Need to restore the original alpha from the base layer we're clipping onto
					var
						baseLayer = treeNode.layers[0];

					if (baseLayer.alpha < 100) {
						if (DEBUG) {
							console.log(`CPBlend.replaceAlphaOntoFusionWithTransparentLayer(treeNode.image, baseLayer.image, treeNode.layers[0].alpha == ${treeNode.layers[0].alpha}, ${blendArea});`);
						}
						CPBlend.replaceAlphaOntoFusionWithTransparentLayer(treeNode.image, baseLayer.image, baseLayer.alpha, blendArea);
					} else {
						if (DEBUG) {
							console.log(`CPBlend.replaceAlphaOntoFusionWithOpaqueLayer(treeNode.image, baseLayer.image, 100, ${blendArea});`);
						}
						CPBlend.replaceAlphaOntoFusionWithOpaqueLayer(treeNode.image, baseLayer.image, 100, blendArea);
					}
				}
			}
		}

		treeNode.dirtyRect.makeEmpty();

		return treeNode;
	}
	
	/**
	 * Blend the layers in the tree and return the resulting image.
	 * 
	 * @returns An object with blendMode, alpha and image (CPColorBmp) properties.
	 */
	this.blendTree = function() {
		if (DEBUG) {
			console.log("Fusing layers...");
		}

		return blendTreeInternal(drawTree);
	};

}