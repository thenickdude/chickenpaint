"use strict";

import CPColorBmp from "../js/engine/CPColorBmp.js";
import CPBlend from "../js/engine/CPBlend.js";
import "../js/engine/CPBlendAdditional.js";
import TestUtil from "./lib/TestUtil.js";

import {MersenneTwister19937, integer as randomInteger} from "random-js";

import assert from "assert";
import CPGreyBmp from "../js/engine/CPGreyBmp.js";

const
    IMAGE_DIMENSION = 256,

    [translucentRandomImageBottom, translucentRandomImageTop] = TestUtil.generateRandomImagePairForBlendTest(IMAGE_DIMENSION, IMAGE_DIMENSION, false, false, 1234567),
    [transparentRandomImageBottom, transparentRandomImageTop] = TestUtil.generateRandomImagePairForBlendTest(IMAGE_DIMENSION, IMAGE_DIMENSION, 0, 0, 7654321),

    opaqueRandomImageBottom = TestUtil.generateRandomImageForBlendTest(IMAGE_DIMENSION, IMAGE_DIMENSION, 255, 1283714),

    randomMask = generateRandomMask(IMAGE_DIMENSION, IMAGE_DIMENSION, 1234567),
    blackMask = new CPGreyBmp(IMAGE_DIMENSION, IMAGE_DIMENSION, 8),
    whiteMask = new CPGreyBmp(IMAGE_DIMENSION, IMAGE_DIMENSION, 8);

blackMask.clearAll(0);
whiteMask.clearAll(255);

function generateRandomMask(width, height, seed) {
    const
        mask = new CPGreyBmp(width, height, 8),
        random = MersenneTwister19937.seed(seed),
        byteDistribution = randomInteger(0, 255);

    for (let i = 0; i < mask.data.length; i ++) {
        mask.data[i] = byteDistribution(random);
    }

    return mask;
}

/**
 *
 * @param {boolean} fusionHasTransparency
 * @param {int} imageAlpha
 * @param {boolean} masked
 */
function testPassthroughBlendingOperation(fusionHasTransparency, imageAlpha, masked) {
    const
        fuse = function (bottom, top, mask) {
            bottom = bottom.clone();

            CPBlend.fuseImageOntoImage(
                bottom,
                fusionHasTransparency,
                top,
                imageAlpha,
                CPBlend.LM_PASSTHROUGH,
                top.getBounds(),
                mask
            );

            return bottom;
        };

    if (imageAlpha === 0) {
        it("equals the bottom layer if layer alpha==0", function () {
            let
                referenceImage = fusionHasTransparency ? translucentRandomImageBottom : opaqueRandomImageBottom;

            assert(TestUtil.bitmapsAreEqual(
                fuse(
                    referenceImage,
                    translucentRandomImageTop,
                    masked ? randomMask : null
                ),
                referenceImage
            ));
        });
    } else if (imageAlpha == 100) {
        it("equals the top layer if layer alpha==100", function () {
            assert(TestUtil.bitmapsAreEqual(
                fuse(
                    fusionHasTransparency ? translucentRandomImageBottom : opaqueRandomImageBottom,
                    translucentRandomImageTop,
                    masked ? whiteMask : null
                ),
                translucentRandomImageTop
            ));
        });
    }

    if (!fusionHasTransparency) {
        it("gives the same result using both opaque and transparent fusion routines if bottom pixels are effectively opaque", function () {
            let
                opaqueFusionResult,
                transparentFusionResult;

            opaqueFusionResult = fuse(
                opaqueRandomImageBottom,
                translucentRandomImageTop,
                masked ? randomMask : null
            );

            fusionHasTransparency = true;

            transparentFusionResult = fuse(
                opaqueRandomImageBottom,
                translucentRandomImageTop,
                masked ? randomMask : null
            );

            fusionHasTransparency = false;

            assert(TestUtil.bitmapsAreEqual(
                opaqueFusionResult,
                transparentFusionResult
            ));
        });
    }
}

/**
 *
 * @param {int} layerMode
 * @param {boolean} fusionHasTransparency
 * @param {int} imageAlpha
 * @param {boolean} masked
 */
function testRegularBlendingOperation(layerMode, fusionHasTransparency, imageAlpha, masked) {
    const
        fuse = function(bottom, top, mask) {
            bottom = bottom.clone();

            CPBlend.fuseImageOntoImage(
                bottom,
                fusionHasTransparency,
                top,
                imageAlpha,
                layerMode,
                top.getBounds(),
                mask
            );

            return bottom;
        };

    it("does not modify the bottom layer if the top layer (alpha " + imageAlpha + ") has effectively transparent pixels", function () {
        let
            referenceImage = fusionHasTransparency ? translucentRandomImageBottom : opaqueRandomImageBottom;

        assert(TestUtil.bitmapsAreEqual(
            fuse(
                referenceImage,
                imageAlpha === 0 ? translucentRandomImageTop : transparentRandomImageTop,
                masked ? randomMask : null
            ),
            referenceImage
        ));
    });

    if (masked && imageAlpha !== 0) {
        it("does not modify the bottom layer if the top layer (alpha " + imageAlpha + ") has a black mask", function () {
            let
                referenceImage = fusionHasTransparency ? translucentRandomImageBottom : opaqueRandomImageBottom;

            assert(TestUtil.bitmapsAreEqual(
                fuse(
                    referenceImage,
                    translucentRandomImageTop,
                    blackMask
                ),
                referenceImage
            ));
        });
    }

    if (!masked) {
        it("gives the same result when mask is white as when mask is absent (alpha " + imageAlpha + ")", function() {
            let
                whiteMaskResult,
                noMaskResult;

            noMaskResult = fuse(
                translucentRandomImageBottom,
                translucentRandomImageTop,
                null
            );

            masked = true;

            whiteMaskResult = fuse(
                translucentRandomImageBottom,
                translucentRandomImageTop,
                whiteMask
            );

            masked = false;

            assert(TestUtil.bitmapsAreEqual(
                whiteMaskResult,
                noMaskResult
            ));
        });
    }

    if (fusionHasTransparency && imageAlpha == 100) {
        // Using any blend mode onto a fully transparent layer, we should get the unmodified top layer back out of it
        it("results in the top layer if the bottom layer was fully transparent", function () {
            assert(TestUtil.bitmapsAreEqual(
                fuse(
                    transparentRandomImageBottom,
                    translucentRandomImageTop,
                    masked ? whiteMask : null
                ),
                translucentRandomImageTop
            ));
        });
    }

    if (!fusionHasTransparency && imageAlpha !== 0) {
        it("gives the same result using both opaque and transparent fusion routines if bottom pixels are effectively opaque", function() {
            let
                opaqueFusionResult,
                transparentFusionResult;

            /*
             * Blend has two variants, ontoOpaqueFusion for the special case where every pixel has alpha 255, and
             * ontoTransparentFusion for the general case where the pixel alpha can be anything. These two variants
             * should deliver identical results if the alpha is 255 for all pixels.
             */
            opaqueFusionResult = fuse(
                opaqueRandomImageBottom,
                translucentRandomImageTop,
                masked ? randomMask : null
            );

            fusionHasTransparency = true;

            transparentFusionResult = fuse(
                opaqueRandomImageBottom,
                translucentRandomImageTop,
                masked ? randomMask : null
            );

            fusionHasTransparency = false;

            let
                result = TestUtil.bitmapsAreEqual(
					opaqueFusionResult,
					transparentFusionResult
				);

            if (layerMode === CPBlend.LM_MULTIPLY) {
                // LM_MULTIPLY is broken in this way in the original ChibiPaint, so preserve the brokenness
                assert(!result);
            } else {
				assert(result);
			}
        });
    }
}

describe("CPBlend", function() {
    for (let layerMode = CPBlend.LM_FIRST; layerMode <= CPBlend.LM_LAST; layerMode++) {
        for (let fusionHasTransparency of [false, true]) {
            for (let topLayerOpaque of [false, true]) {
                for (let masked of [false, true]) {
                    describe("#" + CPBlend.blendFunctionNameForParameters(fusionHasTransparency, topLayerOpaque ? 100 : 50, layerMode, masked), function () {
                        for (let imageAlpha of (topLayerOpaque ? [100] : [23, 0])) {
                            if (layerMode === CPBlend.LM_PASSTHROUGH) {
                                testPassthroughBlendingOperation(fusionHasTransparency, imageAlpha, masked);
                            } else {
                                testRegularBlendingOperation(layerMode, fusionHasTransparency, imageAlpha, masked);
                            }
                        }
                    });
                }
            }
        }
    }
});
