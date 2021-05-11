"use strict";

import CPBlend from "../../js/engine/CPBlend.js";
import CPArtwork from "../../js/engine/CPArtwork.js";
import CPImageLayer from "../../js/engine/CPImageLayer.js";
import {save as saveChi} from "../../js/engine/CPChibiFile.js";
import TestUtil from "../lib/TestUtil.js";

const
    assert = require("assert"),
    path = require("path"),
    fs = require("fs"),

    outputDirectory = path.join(__dirname, "test-images");

function buildTestImagesForMode(blendMode) {
    const
        testImageSize = 256,

        randomSeed = 32752905;

    let
        promises = [];

    for (let fusionOpaque of [false, true]) {
        for (let layerAlpha of [73, 100]) {
            let
                filename = "blend-test";

            filename += "-" + CPBlend.BLEND_MODE_CODENAMES[blendMode];
            filename += fusionOpaque ? "-opaque-fusion" : "-transparent-fusion";
            filename += "-layer-alpha-" + layerAlpha;
            filename += ".chi";

            if (fs.existsSync(filename)) {
                continue;
            }

            let
                artwork = new CPArtwork(testImageSize, testImageSize),

                [bottomImage, topImage] = TestUtil.generateRandomImagePairForBlendTest(testImageSize, testImageSize, fusionOpaque ? 255 : false, false, randomSeed),

                bottomLayer = CPImageLayer.createFromImage(bottomImage, "fusion"),
				topLayer = CPImageLayer.createFromImage(topImage, "layer");

            topLayer.blendMode = blendMode;
            topLayer.alpha = layerAlpha;

            artwork.addLayerObject(artwork.getLayersRoot(), bottomLayer);
            artwork.addLayerObject(artwork.getLayersRoot(), topLayer);

            promises.push(saveChi(artwork, {forceOldVersion: true}).then(uint8Array => {
                fs.writeFileSync(path.join(outputDirectory, filename), new Buffer(uint8Array));

                console.log(filename);
            }));
        }
    }

    return Promise.all(promises);
}

function buildSingleLayerTests() {
    const
        testImageSize = 256,

        randomSeed = 32752905;

    let
        promises = [];

    for (let fusionAlpha of [0, 1, 2, 49, 50, 51, 98, 99, 100]) {
        let
            filename = "blend-test";

        filename += "-normal";
        filename += "-fusion-alpha-" + fusionAlpha;
        filename += ".chi";

        if (fs.existsSync(filename)) {
            continue;
        }

        let
            artwork = new CPArtwork(testImageSize, testImageSize),

            image = TestUtil.generateRandomImageForBlendTest(testImageSize, testImageSize, false, randomSeed),

            fusion = CPImageLayer.createFromImage(image, "layer");

        fusion.blendMode = CPBlend.LM_NORMAL;
        fusion.alpha = fusionAlpha;

        artwork.addLayerObject(artwork.getLayersRoot(), fusion);

        promises.push(saveChi(artwork).then(result => {
            fs.writeFileSync(path.join(outputDirectory, filename), new Buffer(result.bytes));
            console.log(filename);
        }));
    }

    return Promise.all(promises);
}

try {
    fs.mkdirSync(outputDirectory);
} catch (e) {}

let
    promises = [];

for (let blendMode = CPBlend.LM_FIRST; blendMode <= CPBlend.LM_LAST_CHIBIPAINT; blendMode++) {
    promises.push(buildTestImagesForMode(blendMode));
}

promises.push(buildSingleLayerTests());

Promise.all(promises).catch(err => {
    console.error(err);
    process.exitCode = 1;
});