import {load as chiLoad} from "../../js/engine/CPChibiFile";
import TestUtil from "../lib/TestUtil";
import CPColorBmp from "../../js/engine/CPColorBmp";

import pipe from "multipipe";

const
    path = require("path"),
    fs = require("fs"),

    PNG = require("node-png").PNG,

    testFilesDirectory = path.join(__dirname, "test-images");

/* Node Buffer instances have a .buffer property which is an ArrayBuffer (Node 4.x or newer). However, the Buffer
 * can actually refer to a portion of that buffer rather than the whole thing (this happened for me for files
 * smaller than 8kB).
 */
function nodeBufferToArrayBuffer(b) {
    return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
}

function compareChickenPaintChiRenderingAgainstPNGs(chiFiles) {
    let
        promise = Promise.resolve(),
        matches = 0, failures = 0;

    for (let chiName of chiFiles) {
        const
            chiPath = path.join(testFilesDirectory, chiName);

        promise = promise
            .then(() => {
                let
                    buffer = fs.readFileSync(chiPath);

                return chiLoad(nodeBufferToArrayBuffer(buffer));
            }).then(artwork => new Promise((resolve, reject) => {
                let
                    filenameRoot = chiPath.replace(/\.chi$/, ""),
                    // A .png version of the image should be available for us to compare against
                    pngStream = fs.createReadStream(filenameRoot + ".png");

                pngStream.pipe(new PNG()).on("parsed", function () {
                    let
                        fusion = artwork.fusionLayers(),
                        pngImage = new CPColorBmp(this.width, this.height);

                    // fs.writeFileSync(filenameRoot + ".raw", this.data, { defaultEncoding: null });

                    pngImage.data.set(this.data);

                    if (TestUtil.bitmapsAreEqual(fusion, pngImage)) {
                        console.log(chiName + " match");
                        matches++;

                        resolve();
                    } else {
                        let
                            maxDifference = TestUtil.bitmapMaxDifference(fusion, pngImage),
                            chickenPaintPNG = new PNG({
                                width: this.width,
                                height: this.height
                            });

                        console.log(chiName + " max difference " + maxDifference);
                        failures++;

                        chickenPaintPNG.data.set(fusion.data);

                        // fs.writeFileSync(filenameRoot + ".chickenpaint.raw", chickenPaintPNG.data, { defaultEncoding: null });

                        pipe(chickenPaintPNG.pack(), fs.createWriteStream(filenameRoot + ".chickenpaint.png", {defaultEncoding: null}), (err) => {
                            if (err) {
                                reject(err);
                            } else {
                                resolve();
                            }
                        });
                    }
                });
            }));
    }

    return promise.then(() => ({matches: matches, failures: failures}));
}

const
    testFiles = fs.readdirSync(testFilesDirectory),

    // chi files to test will be extensionless or end in .chi
    chiFiles = process.argv.length > 2 ? process.argv.slice(2) : testFiles.filter(filename => filename.match(/^[^.]+$|\.chi$/));

compareChickenPaintChiRenderingAgainstPNGs(chiFiles).then(
    result => {
        console.log(result.matches + "/" + (result.matches + result.failures) + " images matched perfectly.");
    },
    error => {
        console.error("Error!", error);
    }
);
