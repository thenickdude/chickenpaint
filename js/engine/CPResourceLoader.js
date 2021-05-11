import {load as chiLoad} from "../../js/engine/CPChibiFile.js";
import CPArtwork from "./CPArtwork.js";
import CPColorBmp from "./CPColorBmp.js";
import CPImageLayer from "./CPImageLayer.js";
import AdobeColorTable from "../util/AdobeColorTable.js";

import EventEmitter from "wolfy87-eventemitter";

/**
 * Loads ChickenPaint resources from a remote server and emits progress events.
 *
 * loadImageURL - URL of PNG/JPEG image to load for editing (optional)
 * loadChibiFileURL - URL of .chi file to load for editing (optional). Used in preference to loadImage.
 * loadSwatchesURL - URL of an .aco palette to load (optional)
 */
export default function CPResourceLoader(options) {
    var
        resources = [],
        completed = {},
        that = this;

    if (options.loadChibiFileUrl && ("" + options.loadChibiFileUrl).length > 0) {
        resources.push({
            url: options.loadChibiFileUrl,
            friendly: "drawing layers",
            name: "layers",
            required: true
        });
    } else {
        if (options.loadImageUrl && ("" + options.loadImageUrl).length > 0) {
            resources.push({
                url: options.loadImageUrl,
                friendly: "drawing",
                name: "flat",
                required: true
            });
        }
    }
    
    if (options.loadSwatchesUrl) {
        resources.push({
            url: options.loadSwatchesUrl,
            friendly: "color swatches",
            name: "swatches",
            required: false,
            noProgress: true // So short that we may as well keep the smoothie drained
        });
    }

    /**
     *
     * @param resource
     * @param resourceData
     * @returns {Promise}
     */
    function decodeResource(resource, resourceData) {
        switch (resource.name) {
            case "flat":
                return new Promise(function(resolve, reject) {
                    let
                        blob = new Blob([resourceData], {type: "image/png"}),
                        imageUrl = window.URL.createObjectURL(blob);

                    if (imageUrl) {
                        let
                            image = new Image();

                        image.onload = function () {
                            let
                                artwork = new CPArtwork(this.width, this.height),
                                layer = new CPImageLayer(0, 0, "Layer 1");

                            layer.image = CPColorBmp.createFromImage(image);
                            artwork.addLayerObject(artwork.getLayersRoot(), layer);

                            image = null;
                            window.URL.revokeObjectURL(imageUrl);

                            resolve(artwork);
                        };

                        image.src = imageUrl;
                    } else {
                        reject(null);
                    }
                });

            case "swatches":
                let
                    reader = new AdobeColorTable(),
                    colors = reader.read(resourceData);

                if (colors) {
                    return Promise.resolve(colors);
                } else {
                    return Promise.reject(null);
                }

            case "layers":
                return chiLoad(resourceData);

            default:
                return Promise.reject("Unexpected resource type '" + resource.name + "'");
        }
    }

    function reportProgress(resource, progress) {
        if (progress === null) {
            that.emitEvent("loadingProgress", [1.0, "Loading your " + resource.friendly + "..."]);
        } else {
            that.emitEvent("loadingProgress", [progress, "Loading your " + resource.friendly + " (" + Math.round(progress * 100) + "%)..."]);
        }
    }
    
    this.load = function() {
        if (resources.length == 0) {
            that.emitEvent("loadingComplete", [completed]);
            return;
        }

        var
            resource = resources.shift(),
            xhr = new XMLHttpRequest();

        xhr.addEventListener("progress", function(evt) {
            var
                progress;
            
            if (evt.lengthComputable && !resource.noProgress) {
                progress = evt.loaded / evt.total;
            } else {
                progress = null;
            }
            
            reportProgress(resource, progress);
        }, false);

        function handleFatal() {
            if (resource.required) {
                that.emitEvent("loadingFailure", ["Failed to load your " + resource.friendly + ", please try again later."]);
            } else {
                // Skip unimportant resources
                that.load();
            }
        }
        
        xhr.addEventListener("load", function(evt) {
            if (this.status == 200) {
                let
                    response = this.response;
                
                that.emitEvent("loadingProgress", [1.0, "Starting ChickenPaint..."]);
    
                // Yield to the DOM to give it a chance to paint the loaded message before we begin decoding
                setTimeout(
                    function() {
                        decodeResource(resource, response).then(
                            function(decoded) {
                                completed[resource.name] = decoded;

                                // Move on to the next file
                                that.load();
                            },
                            function() {
                                that.emitEvent("loadingFailure", ["Failed to read your " + resource.friendly]);
                            }
                        );
                    },
                    0
                );
            } else {
                handleFatal();
            }
        }, false);

        xhr.addEventListener("error", handleFatal);

        reportProgress(resource, resource.noProgress ? null : 0.0);

        xhr.open("GET", resource.url, true);
        
        xhr.responseType = 'arraybuffer';

        xhr.send();
    }
}

CPResourceLoader.prototype = Object.create(EventEmitter.prototype);
CPResourceLoader.prototype.constructor = CPResourceLoader;
