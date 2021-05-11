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

import CPBlend from './CPBlend.js';
import './CPBlendAdditional.js';
import CPLayer from './CPLayer.js';
import CPLayerGroup from './CPLayerGroup.js';
import CPColorBmp from "./CPColorBmp.js";
import CPImageLayer from "./CPImageLayer.js";
import CPRect from "../util/CPRect.js";

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
		this.mask = layer.getEffectiveMask();
		this.layer = layer;
		this.blendMode = layer.blendMode;
		this.alpha = layer.alpha;
		this.visible = layer.visible;
	} else {
		this.isGroup = true;
		this.image = null;
		this.mask = null;
		this.layer = null;
		this.blendMode = CPBlend.LM_PASSTHROUGH;
		this.alpha = 100;
		this.visible = true;
	}

	/**
	 * For group nodes, this is the rectangle of data which is dirty (due to changes in child nodes) and needs to be re-merged
	 *
	 * @type {CPRect}
	 */
	this.dirtyRect = new CPRect(0, 0, width, height);
	
	/**
	 *
	 * @type {CPBlendNode[]}
	 */
	this.layers = [];
	
	/**
	 * @type {?CPBlendNode}
	 */
	this.parent = null;

	/**
	 * When true, we should clip the layers in this group to the bottom layer of the stack
	 *
	 * @type {boolean}
	 */
	this.clip = false;
}

/**
 * Add zero (null), one (CPBlendNode) or more (CPBlendNode[]) children to this node.
 *
 * @param {(?CPBlendNode|CPBlendNode[])} children
 */
CPBlendNode.prototype.addChildren = function(children) {
	if (children != null) {
		if (Array.isArray(children)) {
			children.forEach(child => (child.parent = this));

			this.layers = this.layers.concat(children);
		} else {
			let
				child = children;

			child.parent = this;

			this.layers.push(child);
		}
	}
};

/**
 * Analyses a stack of layers in a CPLayerGroup and optimizes a drawing scheme for them. Then you can reuse that
 * scheme to blend all the layers together.
 *
 * @param {CPLayerGroup} drawingRootGroup - The root of the layer stack.
 * @param {int} width - Dimension of layers and final merge result.
 * @param {int} height
 * @param {boolean} requireSimpleFusion - Set to true if the result must have alpha 100 and no mask.
 *
 * @constructor
 */
export default function CPBlendTree(drawingRootGroup, width, height, requireSimpleFusion) {
	const
		DEBUG = false;

	let
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
	 * @returns {?CPBlendNode|CPBlendNode[]}
	 */
	function optimizeGroupNode(groupNode) {
		if (groupNode.layers.length == 0) {
			// Group was empty, so omit it

			return null;
		}

		if (groupNode.layers.length == 1 && (groupNode.mask == null || groupNode.layers[0].mask == null)) {
			/*
			 * Replace this group with the layer it contains (combine the alpha of the two layers)
			 * At most one of the two layers may have a mask, so that we can use that mask for both of them.
			 */
			let
				flattenedNode = groupNode.layers[0];

			flattenedNode.alpha = Math.round(groupNode.alpha * flattenedNode.alpha / 100);
			if (groupNode.blendMode != CPBlend.LM_PASSTHROUGH) {
				flattenedNode.blendMode = groupNode.blendMode;
			}

			flattenedNode.mask = groupNode.mask || flattenedNode.mask;

			/* However, make sure that if someone invalidates the group node (i.e. draws on its mask) we invalidate this
			 * new merged node too.
			 */
			if (groupNode.layer) {
				nodeForLayer.set(groupNode.layer, flattenedNode);
			}

			return flattenedNode;
		}

		// Replace logically-transparent pass-through groups with their contents
		if (groupNode.blendMode == CPBlend.LM_PASSTHROUGH && groupNode.alpha == 100 && groupNode.mask == null) {
			return groupNode.layers;
		}

		// Since we didn't fall into any of the optimized cases, our group must need a temporary buffer to merge its children into
		groupNode.image = allocateBuffer();

		return groupNode;
	}

	/**
	 *
	 * @param {CPLayer} layer
	 * @returns {CPBlendNode}
	 */
	function createNodeForLayer(layer) {
		let
			node = new CPBlendNode(width, height, layer);

		nodeForLayer.set(layer, node);

		return node;
	}

	/**
	 * Build a CPBlendNode for this CPLayerGroup and return it, or null if this group doesn't draw anything.
	 *
	 * @param {CPLayerGroup} layerGroup
	 * @returns {?CPBlendNode|CPBlendNode[]}
	 */
	function buildTreeInternal(layerGroup) {
		if (layerGroup.getEffectiveAlpha() == 0) {
			return null;
		}

		let
			treeNode = createNodeForLayer(layerGroup);

		for (let i = 0; i < layerGroup.layers.length; i++) {
			let
				childLayer = layerGroup.layers[i],
				nextChild = layerGroup.layers[i + 1];

			// Do we need to create a clipping group?
			if (childLayer instanceof CPImageLayer && nextChild && nextChild.clip) {
				let
					clippingGroupNode = new CPBlendNode(width, height, null),
					j;

				clippingGroupNode.blendMode = childLayer.blendMode;
				clippingGroupNode.alpha = 100;
				clippingGroupNode.clip = true;

				clippingGroupNode.addChildren(createNodeForLayer(childLayer));

				// All the contiguous layers above us with "clip" set will become the children of the new group
				for (j = i + 1; j < layerGroup.layers.length; j++) {
					if (layerGroup.layers[j].clip) {
						if (layerGroup.layers[j].getEffectiveAlpha() > 0) {
							clippingGroupNode.addChildren(createNodeForLayer(layerGroup.layers[j]));
						}
					} else {
						break;
					}
				}

				// If the clipping base is invisible, so will the children be (so drop them here by not adding them anywhere)
				if (childLayer.getEffectiveAlpha() > 0) {
					treeNode.addChildren(optimizeGroupNode(clippingGroupNode));
				}

				// Skip the layers we just added
				i = j - 1;
			} else if (childLayer instanceof CPLayerGroup) {
				treeNode.addChildren(buildTreeInternal(childLayer));
			} else if (childLayer.getEffectiveAlpha() > 0) {
				treeNode.addChildren(createNodeForLayer(childLayer));
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
		let
			node = nodeForLayer.get(layer);

		invalidateNodeRect(node, rect);
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
					alpha: 100,
					getEffectiveMask: () => null,
					visible: true
				});
				drawTree.image.clearAll(0);
			} else {
				/*
				 * Caller wants fusion to be a single opaque node, so add a group node as a wrapper if needed (to hold
				 * a buffer for the merged children).
				 */
				if (Array.isArray(drawTree) || requireSimpleFusion && (drawTree.alpha < 100 || drawTree.mask)) {
					let
						oldNode = drawTree;

					drawTree = new CPBlendNode(width, height);
					drawTree.blendMode = Array.isArray(oldNode) ? CPBlend.LM_NORMAL : oldNode.blendMode;
					drawTree.alpha = 100;
					drawTree.image = allocateBuffer();
					drawTree.addChildren(oldNode);
				}
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
	 * @param {string} propertyName
	 */
	this.layerPropertyChanged = function(layer, propertyName) {
		let
			layerNode = nodeForLayer.get(layer);

		/*
		 * If only the blendMode changed, we won't have to reconstruct our blend tree, since none of our
		 * tree structure depends on this (as long as it isn't "passthrough").
		 */
		if (!layerNode
				|| layerNode.visible != layer.visible || layerNode.alpha != layer.alpha || (layerNode.mask == null) != (layer.getEffectiveMask() == null)
				|| (layerNode.blendMode == CPBlend.LM_PASSTHROUGH) != (layer.blendMode == CPBlend.LM_PASSTHROUGH)
				|| propertyName === "clip") {
			this.resetTree();
		} else {
			layerNode.blendMode = layer.blendMode;
			invalidateNodeRect(layerNode, new CPRect(0, 0, width, height));
		}
	};

	/**
	 *
	 * @param {CPColorBmp} dest
	 * @param {CPColorBmp} source
	 * @param {CPRect} rect
	 */
	function copyOpaqueImageRect(dest, source, rect) {
		if (rect.getWidth() == dest.width && rect.getHeight() == dest.height) {
			/*
			 * If we're copying the whole image at alpha 100, we're just doing a linear byte copy.
			 * We have a fast version for that!
			 */
			if (DEBUG) {
				console.log("CPColorBmp.copyDataFrom(source);");
			}
			dest.copyPixelsFrom(source);
		} else {
			// Otherwise use the CPBlend version which only blends the specified rectangle
			if (DEBUG) {
				console.log(`CPBlend.replaceOntoFusionWithOpaqueLayer(dest, source, 100, ${rect});`);
			}
			CPBlend.replaceOntoFusionWithOpaqueLayer(dest, source, 100, rect);
		}
	}

	/**
	 *
	 * @param {CPColorBmp} dest
	 * @param {CPColorBmp} source
	 * @param {int} sourceAlpha
	 * @param {CPRect} rect
	 * @param {?CPGreyBmp} mask
	 */
	function copyImageRect(dest, source, sourceAlpha, rect, mask) {
		// Use a plain copy if possible
		if (sourceAlpha == 100 && !mask && rect.getWidth() == dest.width && rect.getHeight() == dest.height) {
			if (DEBUG) {
				console.log("CPColorBmp.copyDataFrom(source);");
			}
			dest.copyPixelsFrom(source);
		} else {
			// Otherwise do some blending
			let
				routineName = "replaceOntoFusionWith";

			if (sourceAlpha == 100) {
				routineName += "OpaqueLayer";
			} else {
				routineName += "TransparentLayer";
			}

			if (mask) {
				routineName += "Masked";
			}

			if (DEBUG) {
				console.log(`CPBlend.${routineName}(dest, source, sourceAlpha = ${sourceAlpha}, rect = ${rect}, mask = ${mask});`);
			}

			CPBlend[routineName](dest, source, sourceAlpha, rect, mask);
		}
	}

	/**
	 * Blend the given tree node and return the tree node that contains the resulting blend, or null if the tree is empty.
	 * 
	 * @param {?CPBlendNode} treeNode
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

		if (treeNode.blendMode == CPBlend.LM_PASSTHROUGH && treeNode.parent) {
			/* With passthrough blending, the contents of the group are also dependent on the fusion it sits on top of,
			 * so invalidating the parent must invalidate the passthrough child.
			 */
			blendArea.union(treeNode.parent.dirtyRect);
		}

		if (blendArea.isEmpty()) {
			// Nothing to draw!
			return treeNode;
		}
		
		if (treeNode.blendMode == CPBlend.LM_PASSTHROUGH && treeNode.parent) {
			// We need to fuse our children layers onto a copy of our parents fusion, so make that copy now
			groupIsEmpty = false;

			copyOpaqueImageRect(treeNode.image, treeNode.parent.image, blendArea);
		}

		// Avoid using an iterator here because Chrome refuses to optimize when a "finally" clause is present (caused by Babel iterator codegen)
		for (let i = 0; i < treeNode.layers.length; i++) {
            let
                child = treeNode.layers[i],
                childNode = blendTreeInternal(child);

            if (groupIsEmpty) {
                // If the fusion is currently empty then there's nothing to blend, replace the fusion with the contents of the bottom layer instead

                copyImageRect(treeNode.image, childNode.image, childNode.alpha, blendArea, childNode.mask);
                groupIsEmpty = false;
            } else {
                fusionHasTransparency = fusionHasTransparency && treeNode.image.hasAlphaInRect(blendArea);

                if (DEBUG) {
                    console.log(`CPBlend.fuseImageOntoImage(treeNode.image, fusionHasTransparency == ${fusionHasTransparency}, childNode.image, childNode.alpha == ${childNode.alpha}, childNode.blendMode == ${childNode.blendMode}, ${blendArea}, ${childNode.mask});`);
                }

                CPBlend.fuseImageOntoImage(treeNode.image, fusionHasTransparency, childNode.image, childNode.alpha, childNode.blendMode, blendArea, childNode.mask);
            }
        }

		if (treeNode.clip) {
			// Need to restore the original alpha from the base layer we're clipping onto
			let
				baseLayer = treeNode.layers[0];

			if (baseLayer.alpha < 100) {
				if (baseLayer.mask) {
                    if (DEBUG) {
                        console.log(`CPBlend.replaceAlphaOntoFusionWithTransparentLayerMasked(treeNode.image, baseLayer.image, treeNode.layers[0].alpha == ${treeNode.layers[0].alpha}, ${blendArea});`);
                    }
                    CPBlend.replaceAlphaOntoFusionWithTransparentLayerMasked(treeNode.image, baseLayer.image, baseLayer.alpha, blendArea, baseLayer.mask);
				} else {
                    if (DEBUG) {
                        console.log(`CPBlend.replaceAlphaOntoFusionWithTransparentLayer(treeNode.image, baseLayer.image, treeNode.layers[0].alpha == ${treeNode.layers[0].alpha}, ${blendArea});`);
                    }
                    CPBlend.replaceAlphaOntoFusionWithTransparentLayer(treeNode.image, baseLayer.image, baseLayer.alpha, blendArea);
                }
			} else {
				if (baseLayer.mask) {
                    if (DEBUG) {
                        console.log(`CPBlend.replaceAlphaOntoFusionWithOpaqueLayerMasked(treeNode.image, baseLayer.image, 100, ${blendArea});`);
                    }
                    CPBlend.replaceAlphaOntoFusionWithOpaqueLayerMasked(treeNode.image, baseLayer.image, 100, blendArea, baseLayer.mask);
                } else {
                    if (DEBUG) {
                        console.log(`CPBlend.replaceAlphaOntoFusionWithOpaqueLayer(treeNode.image, baseLayer.image, 100, ${blendArea});`);
                    }
                    CPBlend.replaceAlphaOntoFusionWithOpaqueLayer(treeNode.image, baseLayer.image, 100, blendArea);
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