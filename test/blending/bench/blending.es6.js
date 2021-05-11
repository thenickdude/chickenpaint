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

/*
 * Benchmark two blending engines against each other, and check them for consistency.
 */

import CPImageLayer from "../../../js/engine/CPImageLayer.js";

import CPBlend from "../../../js/engine/CPBlend.js";
import CPBlend2 from "../../../js/engine/CPBlend2.js";

function checkImagesAreSimilar(fusion1, fusion2) {
    for (var pix = 0; pix < fusion1.width * fusion1.height * 4; pix++) {
        var
            delta = fusion1.data[pix] - fusion2.data[pix];

        if (delta != 0) {
            return false;
        }
    }

    return true;
}

/**
 *
 * @param {CPColorBmp} image
 * @returns {Element}
 */
function getImageAsCanvas(image) {
    var
        result = document.createElement("canvas"),
        context = result.getContext("2d");

    result.width = image.width;
    result.height = image.height;

    context.putImageData(image.imageData, 0, 0);

    return result;
}

export default function BlendingBench() {
    const 
        TEST_WIDTH = 1024,
        TEST_HEIGHT = 768;
    
    var
        fusion1 = new CPImageLayer(TEST_WIDTH, TEST_HEIGHT, "fusion1"),
        fusion2 = new CPImageLayer(TEST_WIDTH, TEST_HEIGHT, "fusion2"),
        layer = new CPImageLayer(TEST_WIDTH, TEST_HEIGHT, "layer");

    function initializeTestData() {
        var
            layerData = layer.image.data,
            pixIndex = 0;

        for (var x = 0; x < TEST_WIDTH * TEST_HEIGHT; x++) {
            var
                r = Math.random();

            if (x % 128 < 64) {
                layerData[pixIndex++] = 255;
                layerData[pixIndex++] = 255;
                layerData[pixIndex++] = 255;
                layerData[pixIndex++] = 0;
            } else if (x % 128 < 96) {
                // Quarter is fully opaque
                layerData[pixIndex++] = ~~(Math.random() * 255);
                layerData[pixIndex++] = ~~(Math.random() * 255);
                layerData[pixIndex++] = ~~(Math.random() * 255);
                layerData[pixIndex++] = 255;
            } else {
                // Rest is semi-transparent
                layerData[pixIndex++] = ~~(Math.random() * 255);
                layerData[pixIndex++] = ~~(Math.random() * 255);
                layerData[pixIndex++] = ~~(Math.random() * 255);
                layerData[pixIndex++] = ~~(Math.random() * 255);
            }
        }
    }

    function createLogMessage(message) {
        var
            result = document.createElement("p");

        result.innerHTML = message;

        return result;
    }

    initializeTestData();

    var
        functionsToTest = [],
        statusElem = document.getElementById("benchResults");

    for (let funcName in CPBlend2) {
        if (funcName.match(/Onto/) && !funcName.match(/mask/i) && (funcName in CPBlend)) {
            functionsToTest.push(funcName);
        }
    }

    //functionsToTest = ["fusionWithMultiplyFullAlpha"];

    function runTest(funcIndex) {
        if (funcIndex >= functionsToTest.length) {
            return;
        }

        var
            funcName = functionsToTest[funcIndex],
            func1 = CPBlend[funcName],
            func2 = CPBlend2[funcName],

            testRect = layer.image.getBounds(),
            backgroundColor = 0x44882277,

            suite = new Benchmark.Suite();

        fusion1.image.clearAll(backgroundColor);
        fusion2.image.clearAll(backgroundColor);

        suite
            .on('cycle', function (event) {
                statusElem.appendChild(createLogMessage(String(event.target)));
            })
            .on('complete', function () {
                statusElem.appendChild(createLogMessage('<strong>Fastest is ' + this.filter('fastest').map('name') + '</strong>'));

                // We've finished profiling, but add one more test to check the results from both functions agree
                fusion1.image.clearAll(backgroundColor);
                fusion2.image.clearAll(backgroundColor);

                func1(fusion1.image, layer.image, 100, testRect);
                func1(fusion2.image, layer.image, 100, testRect);

                if (!checkImagesAreSimilar(fusion1.image, fusion2.image)) {
                    statusElem.appendChild(createLogMessage("Failed to match results"));
                    statusElem.appendChild(getImageAsCanvas(fusion1.image));
                    statusElem.appendChild(getImageAsCanvas(fusion2.image));
                }

                runTest(funcIndex + 1);
            })
            .on('error', function (e) {
                console.log(e);
            })

            .add('CPBlend#' + funcName + '-largeRect', function () {
                func1(fusion1.image, layer.image, 100, testRect);
            })
            .add('CPBlend2#' + funcName + '-largeRect', function () {
                func2(fusion2.image, layer.image, 100, testRect);
            })

            .run({
                'async': true
            });
    }

    runTest(0);
}