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

/**
 *
 * @param {(CPLayer|CPLayerGroup)} layer
 * @constructor
 */
function CPBlendNode(layer) {
	this.isGroup = layer instanceof CPLayerGroup;
	this.image = layer.image;
	this.blendMode = layer.blendMode;
	this.alpha = layer.alpha;
	this.layers = [];
}

CPBlendNode.prototype.addChild = function(child) {
	this.layers.push(child);
};

/**
 * Analyses a stack of layers in a CPLayerGroup and optimizes a drawing scheme for them. Then you can reuse that
 * scheme to blend all the layers together.
 *
 * @constructor
 */
export default function CPBlendTree() {

	var
		/**
		 * @type {CPLayerGroup}
		 */
		drawingRootGroup,
		
		/**
		 * @type {CPBlendNode}
		 */
		drawTree;

	/**
	 * Build a CPBlendNode for this CPLayerGroup and return it, or null if this group doesn't draw anything.
	 *
	 * This is achieved by the following algorithm:
	 *
	 * Perform in-order traversal of layers
	 * Drop hidden layers, hidden groups and their contents, pass-through groups
	 * When leaving a group during traversal:
	 *   If no children remain, drop it
	 *   If there is only one child layer, replace the group with the layer (set blending to the group's and multiply alpha)
	 *   
	 *   We could:
	 *   If all the children are Normal blending and we are Normal at 100%, drop the group
	 *      - This is because blending C <- A, C <- B is the same as A <- B, C <- A
	 *      - We could probably do this for more blending modes too
	 */
	function buildTreeInternal(layerGroup) {
		var
			treeNode = new CPBlendNode(layerGroup);

		for (let child of layerGroup.layers) {
			if (child.getEffectiveAlpha() == 0) {
				continue;
			}
			if (child instanceof CPLayerGroup) {
				if (child.blendMode == CPBlend.LM_PASSTHROUGH) {
					/*
					 * TODO what does PASSTHROUGH + alpha < 100 mean for the end-user? Can't figure out a meaning for
					 * that. At the moment we'll just treat it as alpha == 100
					 */

					// Eliminate the pass-through group
					var
						passthroughNode = buildTreeInternal(child);

					// If the group ended up being non-empty...
					if (passthroughNode) {
						if (passthroughNode.isGroup) {
							// Add its children to us instead
							for (let subLayer of passthroughNode.layers) {
								treeNode.addChild(subLayer);
							}
						} else {
							// The pass-through group got reduced to a single layer, so just add that
							treeNode.addChild(passthroughNode);
						}
					}
				} else {
					var
						groupNode = buildTreeInternal(child);

					if (groupNode) {
						// Group ended up being non-empty
						treeNode.addChild(groupNode);
					}
				}
			} else {
				// It's a layer, so we'll add it to our tree node
				treeNode.addChild(new CPBlendNode(child));
			}
		}

		if (treeNode.layers.length == 0) {
			// Group was empty, so omit it
			return null;
		}
		if (treeNode.layers.length == 1) {
			// Replace this group with the layer it contains (combine the alpha of the two layers)
			var
				flattenedNode = new CPBlendNode(treeNode.layers[0]);

			flattenedNode.alpha = Math.round(treeNode.alpha * flattenedNode.alpha / 100);

			return flattenedNode;
		}

		return treeNode;
	}

	/**
	 * Build and optimize a drawing tree for the given CPLayerGroup. The group's alpha must be 100 and blending
	 * mode LM_NORMAL.
	 *
	 * @param {CPLayerGroup} rootGroup
	 */
	this.buildTree = function(rootGroup) {
		drawingRootGroup = rootGroup;
		drawTree = buildTreeInternal(rootGroup);
	};
	
	/**
	 * Blend the given tree node and return the tree node that contains the resulting blend, or null if the tree is empty.
	 * 
	 * @param {?CPBlendNode} treeNode
	 * @param blendArea
	 */
	function blendTreeInternal(treeNode, blendArea) {
		if (!treeNode) {
			return null;
		}
		if (!treeNode.isGroup) {
			return treeNode;
		}
		
		var 
			groupIsEmpty = true,
			fusionHasTransparency = true;
		
		for (let child of treeNode.layers) {
			var 
				childNode = blendTreeInternal(child, blendArea);
			
			if (groupIsEmpty) {
				if (childNode.alpha == 100) {
					if (blendArea.getWidth() == treeNode.image.width && blendArea.getHeight() == treeNode.image.height) {
						/* If we're copying the whole image at alpha 100, we're just doing a linear byte copy.
						 * We have a fast version for that!
						 */
						//console.log("CPColorBmp.copyDataFrom(childNode.image);");
						treeNode.image.copyDataFrom(childNode.image);
					} else {
						// Otherwise use the CPBlend version which only blends the specified rectangle
						//console.log("CPBlend.replaceOntoFusionWithOpaqueLayer(treeNode.image, childNode.image, 100, blendArea);");
						CPBlend.replaceOntoFusionWithOpaqueLayer(treeNode.image, childNode.image, 100, blendArea);
					}
				} else {
					//console.log(`CPBlend.replaceOntoFusionWithTransparentLayer(treeNode.image, childNode.image, childNode.alpha == ${childNode.alpha}, blendArea);`);
					CPBlend.replaceOntoFusionWithTransparentLayer(treeNode.image, childNode.image, childNode.alpha, blendArea);
				}
				groupIsEmpty = false;
			} else {
				fusionHasTransparency = fusionHasTransparency && treeNode.image.hasAlphaInRect(blendArea);

				//console.log(`CPBlend.fuseImageOntoImage(treeNode.image, fusionHasTransparency == ${fusionHasTransparency}, childNode.image, childNode.alpha == ${childNode.alpha}, childNode.blendMode == ${childNode.blendMode}, blendArea);`);
				CPBlend.fuseImageOntoImage(treeNode.image, fusionHasTransparency, childNode.image, childNode.alpha, childNode.blendMode, blendArea);
			}
		}

		return treeNode;
	}
	
	/**
	 * Blend the layers in the tree within the given rectangle and return the resulting image.
	 * 
	 * @param {CPRect} blendArea - Rectangle to blend within
	 * @returns CPColorBmp
	 */
	this.blendTree = function(blendArea) {
		var
			fusion = blendTreeInternal(drawTree, blendArea);
		
		if (fusion) {
			if (fusion.alpha == 100) {
				return fusion.image;
			} else {
				/* 
				 * We need the final fusion to have alpha 100, so multiply the alpha out and copy it into a buffer
				 * we know we can touch (the root group's buffer)
				 */
				//console.log(`CPBlend.replaceOntoFusionWithTransparentLayer(drawingRootGroup.image, fusion.image, fusion.alpha == ${fusion.alpha}, blendArea);`);
				CPBlend.replaceOntoFusionWithTransparentLayer(drawingRootGroup.image, fusion.image, fusion.alpha, blendArea);

				return drawingRootGroup.image;
			}
		} else {
			/* 
			 * No layers to draw, so clear a buffer to transparent and return that. This doesn't need to be fast
			 * because documents with no visible layers are not useful at all.
			 */
			//console.log(`drawingRootGroup.image.clearRect(blendArea, 0x00FFFFFF);`);
			drawingRootGroup.image.clearRect(blendArea, 0x00FFFFFF); // Transparent white
			
			return drawingRootGroup.image;
		}
	};

}