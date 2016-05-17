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

import CPRect from "../../js/util/CPRect";
import CPLayer from "../../js/engine/CPLayer";

import CPBlend from "../../js/engine/CPBlend";
import CPBlend2 from "../../js/engine/CPBlend2";

function checkLayersAreSimilar(fusion1, fusion2) {
    for (var pix = 0; pix < fusion1.width * fusion1.height * 4; pix++) {
        var
            delta = fusion1.data[pix] - fusion2.data[pix];

        if (delta != 0) {
            return false;
        }
    }

    return true;
}

function getLayerAsCanvas(layer) {
    var
        result = document.createElement("canvas");

    result.width = layer.width;
    result.height = layer.height;

    var
        context = result.getContext("2d");

    context.putImageData(layer.imageData, 0, 0);

    return result;
}

export default function BlendingBench() {
    const 
        TEST_WIDTH = 1024,
        TEST_HEIGHT = 768;
    
    var
        fusion1 = new CPLayer(TEST_WIDTH, TEST_HEIGHT, "fusion1"),
        fusion2 = new CPLayer(TEST_WIDTH, TEST_HEIGHT, "fusion2"),
        layer = new CPLayer(TEST_WIDTH, TEST_HEIGHT, "layer");

    function initializeTestData() {
        var
            pixIndex = 0;

        for (var x = 0; x < TEST_WIDTH * TEST_HEIGHT; x++) {
            var
                r = Math.random();

            if (x % 128 < 64) {
                layer.data[pixIndex++] = 255;
                layer.data[pixIndex++] = 255;
                layer.data[pixIndex++] = 255;
                layer.data[pixIndex++] = 0;
            } else if (x % 128 < 96) {
                // Quarter is fully opaque
                layer.data[pixIndex++] = ~~(Math.random() * 255);
                layer.data[pixIndex++] = ~~(Math.random() * 255);
                layer.data[pixIndex++] = ~~(Math.random() * 255);
                layer.data[pixIndex++] = 255;
            } else {
                // Rest is semi-transparent
                layer.data[pixIndex++] = ~~(Math.random() * 255);
                layer.data[pixIndex++] = ~~(Math.random() * 255);
                layer.data[pixIndex++] = ~~(Math.random() * 255);
                layer.data[pixIndex++] = ~~(Math.random() * 255);
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

            testRect = layer.getBounds(),
            backgroundColor = 0x44882277,

            suite = new Benchmark.Suite();

        fusion1.clearAll(backgroundColor);
        fusion2.clearAll(backgroundColor);

        suite
            .on('cycle', function (event) {
                statusElem.appendChild(createLogMessage(String(event.target)));
            })
            .on('complete', function () {
                statusElem.appendChild(createLogMessage('<strong>Fastest is ' + this.filter('fastest').map('name') + '</strong>'));

                // We've finished profiling, but add one more test to check the results from both functions agree
                fusion1.clearAll(backgroundColor);
                fusion2.clearAll(backgroundColor);

                func1(layer, fusion1, testRect);
                func2(layer, fusion2, testRect);

                if (!checkLayersAreSimilar(fusion1, fusion2)) {
                    statusElem.appendChild(createLogMessage("Failed to match results"));
                    statusElem.appendChild(getLayerAsCanvas(fusion1));
                    statusElem.appendChild(getLayerAsCanvas(fusion2));
                }

                runTest(funcIndex + 1);
            })
            .on('error', function (e) {
                console.log(e);
            })

            .add('CPBlend#' + funcName + '-largeRect', function () {
                func1(layer, fusion1, testRect);
            })
            .add('CPBlend2#' + funcName + '-largeRect', function () {
                func2(layer, fusion2, testRect);
            })

            .run({
                'async': true
            });
    }

    runTest(0);
}