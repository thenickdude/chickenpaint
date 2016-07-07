/**
 * Create a checkerboard HTML5 CanvasPattern (which can be used for fillStyle) using the given canvas context.
 * 
 * @param canvasContext
 * @returns {CanvasPattern}
 */
export function createCheckerboardPattern(canvasContext) {
    var
        checkerboardCanvas = document.createElement("canvas"),
        checkerboardContext = checkerboardCanvas.getContext("2d"),
        
        imageData = checkerboardContext.createImageData(64, 64),
        data = imageData.data,
        
        pixelOffset = 0;

    for (var j = 0; j < 64; j++) {
        for (var i = 0; i < 64; i++) {
            if ((i & 0x8) != 0 ^ (j & 0x8) != 0) {
                // White
                data[pixelOffset++] = 0xff;
                data[pixelOffset++] = 0xff;
                data[pixelOffset++] = 0xff;
                data[pixelOffset++] = 0xff;
            } else {
                // Grey
                data[pixelOffset++] = 0xcc;
                data[pixelOffset++] = 0xcc;
                data[pixelOffset++] = 0xcc;
                data[pixelOffset++] = 0xff;
            }
        }
    }

    checkerboardCanvas.width = 64;
    checkerboardCanvas.height = 64;
    checkerboardContext.putImageData(imageData, 0, 0);

    return canvasContext.createPattern(checkerboardCanvas, 'repeat');
}

/**
 * Set the globalCompositeOperation and fill/stroke color up to maximize contrast for the drawn items
 * against arbitrary backgrounds.
 *
 * @param {CanvasRenderingContext2D} canvasContext
 * @param {string} kind - "stroke" or "fill" depending on which colour you'd like to set
 */
export function setContrastingDrawStyle(canvasContext, kind) {
    kind = kind + "Style";
    canvasContext.globalCompositeOperation = 'exclusion';

    if (canvasContext.globalCompositeOperation == "exclusion") {
        // White + exclusion inverts the colors underneath, giving us good contrast
        canvasContext[kind] = 'white';
    } else {
        // IE Edge doesn't support Exclusion, so how about Difference with mid-grey instead
        // This is visible on black and white, but disappears on a grey background
        canvasContext.globalCompositeOperation = 'difference';
        canvasContext[kind] = '#888';

        // For super dumb browsers (only support source-over), at least don't make the cursor invisible on a white BG!
        if (canvasContext.globalCompositeOperation != "difference") {
            canvasContext[kind] = 'black';
        }
    }
}