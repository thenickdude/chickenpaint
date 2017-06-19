"use strict";

import CPBlend from "../../js/engine/CPBlend";
import CPArtwork from "../../js/engine/CPArtwork";
import CPImageLayer from "../../js/engine/CPImageLayer";
import CPColorBmp from "../../js/engine/CPColorBmp";
import {save as saveChi} from "../../js/engine/CPChibiFile";

import Random from "random-js";

const
    assert = require("assert"),
    path = require("path"),
    fs = require("fs"),

    outputDirectory = path.join(__dirname, "test-images");

function buildTestImagesForMode(blendMode) {
    const
        testImageSize = 256,
        pixelChannelEdgeCases = [
            0, 1, 2, 127, 128, 129, 253, 254, 255
        ],

        randomSeed = 32752905,
        randomByte = Random.integer(0, 255);

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

                bottomLayer = new CPImageLayer(testImageSize, testImageSize, "base"),
                topLayer = new CPImageLayer(testImageSize, testImageSize, "layer"),

                randomEngine = Random.engines.mt19937().seed(randomSeed),

                pixIndex = 0;

            topLayer.blendMode = blendMode;
            topLayer.alpha = layerAlpha;

            // Try every combination of edge cases for the top/bottom color/alpha:
            assert(Math.pow(pixelChannelEdgeCases.length, 4) <= testImageSize * testImageSize);

            for (let bottomColor of pixelChannelEdgeCases) {
                for (let bottomAlpha of fusionOpaque ? [255] : pixelChannelEdgeCases) {
                    for (let topColor of pixelChannelEdgeCases) {
                        for (let topAlpha of pixelChannelEdgeCases) {
                            /*
                             * Our blending operators treat each colour channel independently, so we can just use the same
                             * value for all colour channels
                             */
                            bottomLayer.image.data[pixIndex + CPColorBmp.ALPHA_BYTE_OFFSET] = bottomAlpha;
                            bottomLayer.image.data[pixIndex + CPColorBmp.RED_BYTE_OFFSET]   = bottomColor;
                            bottomLayer.image.data[pixIndex + CPColorBmp.GREEN_BYTE_OFFSET] = bottomColor;
                            bottomLayer.image.data[pixIndex + CPColorBmp.BLUE_BYTE_OFFSET]  = bottomColor;

                            topLayer.image.data[pixIndex + CPColorBmp.ALPHA_BYTE_OFFSET] = topAlpha;
                            topLayer.image.data[pixIndex + CPColorBmp.RED_BYTE_OFFSET]   = topColor;
                            topLayer.image.data[pixIndex + CPColorBmp.GREEN_BYTE_OFFSET] = topColor;
                            topLayer.image.data[pixIndex + CPColorBmp.BLUE_BYTE_OFFSET]  = topColor;

                            pixIndex += CPColorBmp.BYTES_PER_PIXEL;
                        }
                    }
                }
            }

            // Fill any remaining space in the layers with random pixels:
            for (; pixIndex < bottomLayer.image.data.length; pixIndex += CPColorBmp.BYTES_PER_PIXEL) {
                bottomLayer.image.data[pixIndex + CPColorBmp.ALPHA_BYTE_OFFSET] = fusionOpaque ? 255 : randomByte(randomEngine);
                bottomLayer.image.data[pixIndex + CPColorBmp.RED_BYTE_OFFSET]   = randomByte(randomEngine);
                bottomLayer.image.data[pixIndex + CPColorBmp.GREEN_BYTE_OFFSET] = randomByte(randomEngine);
                bottomLayer.image.data[pixIndex + CPColorBmp.BLUE_BYTE_OFFSET]  = randomByte(randomEngine);

                topLayer.image.data[pixIndex + CPColorBmp.ALPHA_BYTE_OFFSET] = randomByte(randomEngine);
                topLayer.image.data[pixIndex + CPColorBmp.RED_BYTE_OFFSET]   = randomByte(randomEngine);
                topLayer.image.data[pixIndex + CPColorBmp.GREEN_BYTE_OFFSET] = randomByte(randomEngine);
                topLayer.image.data[pixIndex + CPColorBmp.BLUE_BYTE_OFFSET]  = randomByte(randomEngine);
            }

            artwork.addLayerObject(artwork.getLayersRoot(), bottomLayer);
            artwork.addLayerObject(artwork.getLayersRoot(), topLayer);

            promises.push(saveChi(artwork).then(uint8Array => {
                fs.writeFileSync(path.join(outputDirectory, filename), new Buffer(uint8Array));
            }));
        }
    }

    return Promise.all(promises);
}

function buildSingleLayerTests() {
    const
        testImageSize = 256,

        pixelChannelEdgeCases = [
            0, 1, 2, 127, 128, 129, 253, 254, 255
        ],
        
        randomSeed = 32752905,
        randomByte = Random.integer(0, 255);

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

            fusion = new CPImageLayer(testImageSize, testImageSize, "layer"),

            randomEngine = Random.engines.mt19937().seed(randomSeed),

            pixIndex = 0;

        fusion.blendMode = CPBlend.LM_NORMAL;
        fusion.alpha = fusionAlpha;

        for (let color of pixelChannelEdgeCases) {
            for (let alpha of pixelChannelEdgeCases) {
                fusion.image.data[pixIndex + CPColorBmp.ALPHA_BYTE_OFFSET] = alpha;
                fusion.image.data[pixIndex + CPColorBmp.RED_BYTE_OFFSET] = color;
                fusion.image.data[pixIndex + CPColorBmp.GREEN_BYTE_OFFSET] = color;
                fusion.image.data[pixIndex + CPColorBmp.BLUE_BYTE_OFFSET] = color;

                pixIndex += CPColorBmp.BYTES_PER_PIXEL;
            }
        }

        // Fill any remaining space in the layer with random pixels:
        for (; pixIndex < fusion.image.data.length; pixIndex += CPColorBmp.BYTES_PER_PIXEL) {
            fusion.image.data[pixIndex + CPColorBmp.ALPHA_BYTE_OFFSET] = randomByte(randomEngine);
            fusion.image.data[pixIndex + CPColorBmp.RED_BYTE_OFFSET] = randomByte(randomEngine);
            fusion.image.data[pixIndex + CPColorBmp.GREEN_BYTE_OFFSET] = randomByte(randomEngine);
            fusion.image.data[pixIndex + CPColorBmp.BLUE_BYTE_OFFSET] = randomByte(randomEngine);
        }

        artwork.addLayerObject(artwork.getLayersRoot(), fusion);

        promises.push(saveChi(artwork).then(uint8Array => {
            fs.writeFileSync(path.join(outputDirectory, filename), new Buffer(uint8Array));
        }));
    }

    return Promise.all(promises);
}

try {
    fs.mkdirSync(outputDirectory);
} catch (e) {}

let
    promises = [];

for (let blendMode = CPBlend.LM_FIRST; blendMode <= CPBlend.LM_LAST; blendMode++) {
    if (blendMode !== CPBlend.LM_PASSTHROUGH) {
        promises.push(buildTestImagesForMode(blendMode));
    }
}

promises.push(buildSingleLayerTests());

Promise.all(promises).catch(err => {
    console.error(err);
    process.exitCode = 1;
});