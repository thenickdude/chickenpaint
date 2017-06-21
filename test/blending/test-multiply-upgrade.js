/* This test checks that the "multiplyUpgrade" operation produces the correct results for upgrading the
 * multiplyOntoOpaque operator to the new version.
 */

function intDiv(a, b) {
    return (a / b) | 0;
}

function ontoOpaqueOrig(color1, color2, alpha1, alpha2) {
    return color2 - intDiv((color1 ^ 0xFF) * color2 * alpha1, 255 * 255);
}

function ontoOpaqueProposal(color1, color2, alpha1, alpha2) {
    return color2 - Math.ceil(((color1 ^ 0xFF) * color2 * alpha1) / (255 * 255));
}

// For every combination of pixels we might try to blend (for an opaque fusion)...
for (let alpha1 = 0; alpha1 < 256; alpha1++) {
    for (let color1 = 0; color1 < 256; color1++) {
        for (let color2 = 0; color2 < 256; color2++) {
            let
                oldResult = Math.min(Math.max(ontoOpaqueOrig(color1, color2, alpha1), 0), 255),

                correctedColor1 = Math.min(Math.max(color1 + Math.ceil((((255 - color1) * color2 * alpha1) % (255 * 255)) / (color2 * alpha1)), 0), 255),

                newResult = Math.min(Math.max(ontoOpaqueProposal(correctedColor1, color2, alpha1), 0), 255);

            if (oldResult !== newResult) {
                throw "Failure";
            }
        }
    }
}

console.log("Success");