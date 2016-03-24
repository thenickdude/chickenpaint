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