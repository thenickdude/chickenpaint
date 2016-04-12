import CPChibiFile from "./CPChibiFile";
import CPArtwork from "./CPArtwork";
import AdobeColorTable from "../util/AdobeColorTable";

/**
 * We generally can't do much with binary strings because various methods will try to UTF-8 mangle them.
 * This function converts such a string to a Uint8Array instead.
 */
function binaryStringToByteArray(s) {
    var
        result = new Uint8Array(s.length);

    for (var i = 0; i < s.length; i++) {
        result[i] = s.charCodeAt(i);
    }

    return result;
}

/**
 * Saves ChickenPaint resources to a remote server or to the disk and emits progress events.
 *
 * Options:
 *     url - URL to send to. If omitted, will save to the disk instead.
 *     artwork - Artwork to send
 *     rotation - Integer [0..3] of the number of 90 degree rotation steps that should be applied to canvas upon opening.
 *     swatches - Array of ARGB integer colors to save as the image swatches (optional)
 */
export default function CPResourceSaver(options) {
    var
        that = this,
        
        cancelled = false;
    
    options.rotation = options.rotation || 0;
    
    function reportProgress(progress) {
        if (progress === null) {
            that.emitEvent("savingProgress", [1.0, "Saving your drawing to the server..."]);
        } else {
            that.emitEvent("savingProgress", [progress, "Saving your drawing to the server...  (" + Math.round(progress * 100) + "%)"]);
        }
    }
    
    function reportFatal(serverMessage) {
        that.emitEvent("savingFailure", [serverMessage]);
    }
    
    function postDrawing(formData) {
        var
            xhr = new XMLHttpRequest();
    
        xhr.upload.addEventListener("progress", function(evt) {
            var
                progress;
            
            if (evt.lengthComputable) {
                progress = evt.loaded / evt.total;
            } else {
                progress = null;
            }
            
            reportProgress(progress);
        }, false);
    
        xhr.addEventListener("load", function(evt) {
            reportProgress(1.0);
            
            if (this.status == 200 && /^CHIBIOK/.test(this.response)) {
                that.emitEvent("savingComplete");
            } else {
                reportFatal(this.response);
            }
        }, false);
    
        xhr.addEventListener("error", function() {
            reportFatal(this.response);
        }, false);
    
        reportProgress(0);
    
        xhr.open("POST", options.url, true);
        
        xhr.responseType = "text";
        
        xhr.send(formData);
    }
    
    /**
     * Begin saving the data provided in the constructor. Returns immediately, and fires these events to report the
     * saving progress:
     * 
     * savingProgress(progress) - Progress is [0.0 ... 1.0] and reports how much has uploaded so far, or null if the 
     *                            total progress could not be determined.
     * savingFailure(error)     - When saving fails, along with a string error message to display to the user. 
     * savingComplete()         - When saving completes succesfully
     */
    this.save = function() {
        var
            flat,
            flatBlob,
            swatchesBlob;

        flat = binaryStringToByteArray(options.artwork.getFlatPNG(options.rotation));
        flatBlob = new Blob([flat], {type: "image/png"});
        flat = null; // Don't need this any more
        
        var
            serializeLayers;

        if (options.artwork.isSimpleDrawing()) {
            serializeLayers = Promise.resolve(null);
        } else {
            serializeLayers = (new CPChibiFile()).serialize(options.artwork);
        }
        
        serializeLayers.then(function(chibiBlob) {
            if (cancelled) {
                that.emitEvent("savingFailure");
                return;
            }
            
            if (options.swatches) {
                var
                    aco = new AdobeColorTable();
                
                swatchesBlob = new Blob([aco.write(options.swatches)], {type: "application/octet-stream"});
            } else {
                swatchesBlob = null;
            }
             
            if (options.url) {
                var
                    marker = "This marker ensures the upload wasn't truncated",
                    formData = new FormData();

                formData.append("beginMarker", marker);
                
                formData.append("picture", flatBlob);
                flatBlob = null;
                
                if (chibiBlob) {
                    formData.append("chibifile", chibiBlob);
                    chibiBlob = null;

                    // Layers will need to be rotated upon opening
                    formData.append("rotation", "" + options.rotation);
                } else {
                    /*
                     * Because the image is a flat PNG, we rotate it before we saved it and it doesn't need further
                     * rotation upon opening.
                     */
                    formData.append("rotation", "0");
                }
                
                if (swatchesBlob) {
                    formData.append("swatches", swatchesBlob);
                    swatchesBlob = null;
                }

                formData.append("endMarker", marker);

                postDrawing(formData);
            } else {
                window.saveAs(flatBlob, "oekaki.png");
                
                if (chibiBlob) {
                    window.saveAs(chibiBlob, "oekaki.chi");
                }
                if (swatchesBlob) {
                    window.saveAs(swatchesBlob, "oekaki.aco");
                }
            }
        });
    };
    
    this.cancel = function() {
        cancelled = true;
    };
}

CPResourceSaver.prototype = Object.create(EventEmitter.prototype);
CPResourceSaver.prototype.constructor = CPResourceSaver;
