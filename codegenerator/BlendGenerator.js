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

"use strict";

var
    destColor = false, destAlpha = false, // Dummies to silence IDE warnings

    blendClassName = process.argv[2] || "CPBlend";

const
    BYTES_PER_PIXEL = 4,
    ALPHA_BYTE_OFFSET = 3,

    OPERATION_VARIANTS = [
        {
            name: "opaqueFusionWithOpaqueLayer",
            fusionHasTransparency: false,
            layerAlpha100: true,

            masked: false,

            fusionAlpha100: true
        },
        {
            name: "opaqueFusionWithTransparentLayer",
            fusionHasTransparency: false,
            layerAlpha100: false,

            masked: false,

            fusionAlpha100: true
        },
        {
            name: "transparentFusionWithOpaqueLayer",
            fusionHasTransparency: true,
            layerAlpha100: true,

            masked: false,

            fusionAlpha100: true
        },
        {
            name: "transparentFusionWithTransparentLayer",
            fusionHasTransparency: true,
            layerAlpha100: false,

            masked: false,

            fusionAlpha100: true
        }
    ],

/*
 * Our blending operations. We'll use .toString() on these blending functions to get their source code, then
 * use them as a kernel which reads pixels from two layers (into color1, alpha1, color2, alpha2) and writes to
 * the destination layer (through the magic variables destColor and destAlpha).
 *
 * Writes to destColor should write a single channel. The assignment will be duplicated to transform each of the
 * input channels in turn (with new color1/color2 values).
 */
    OPERATIONS = {
        // C = (A*aa*(1-ab) + B*ab*(1-aa) + A*B*aa*ab) / (aa + ab - aa*ab)
        multiply: {
            // Don't bother rounding alpha1/alpha2 before giving them to us:
            unroundedAlpha: true,
            ontoOpaque: function(color1, color2, alpha1) {
                destColor = (color2 - (color1 ^ 0xFF) * color2 * alpha1 / (255 * 255)) | 0;
            },
            ontoTransparent: function(color1, color2, alpha1, alpha2) {
                var
                    newAlpha = (alpha1 + alpha2 - alpha1 * alpha2 / 255) | 0,

                    alpha12 = (alpha1 * alpha2 / 255) | 0,
                    alpha1n2 = (alpha1 * (alpha2 ^ 0xFF) / 255) | 0,
                    alphan12 = ((alpha1 ^ 0xFF) * alpha2 / 255) | 0;

                destColor = ((color1 * alpha1n2 + color2 * alphan12 + color1 * color2 * alpha12 / 255) / newAlpha) | 0;
                destAlpha = newAlpha;
            }
        },

        // C = A*d + B*(1-d) and d = aa / (aa + ab - aa*ab)
        normal: {
            ontoOpaque: function(color1, color2, alpha1) {
                if (alpha1 == 255) {
                    destColor = color1;
                } else {
                    var
                        invAlpha1 = 255 - alpha1;

                    destColor = ((color1 * alpha1 + color2 * invAlpha1) / 255) | 0;
                }
            },
            ontoTransparent: function(color1, color2, alpha1, alpha2) {
                var
                    newAlpha = (alpha1 + alpha2 - alpha1 * alpha2 / 255) | 0,
                    realAlpha = (alpha1 * 255 / newAlpha) | 0,
                    invAlpha = 255 - realAlpha;

                destColor = (color1 * realAlpha + color2 * invAlpha) / 255;
                destAlpha = newAlpha;
            }
        },

        // Linear Dodge (Add) Mode
        // C = (aa * A + ab * B) / (aa + ab - aa*ab)
        add: {
            unroundedAlpha: true,
            ontoOpaque: function(color1, color2, alpha1) {
                destColor = (color2 + alpha1 * color1 / 255) | 0;
            },
            ontoTransparent: function(color1, color2, alpha1, alpha2) {
                var
                    newAlpha = (alpha1 + alpha2 - alpha1 * alpha2 / 255) | 0;

                // No need to clamp the color to 0...255 since we're writing to a clamped array anyway
                destColor = ((alpha2 * color2 + alpha1 * color1) / newAlpha) | 0;
                destAlpha = newAlpha;
            }
        },

        // Linear Burn (Sub) Mode
        // C = (aa * A + ab * B - aa*ab ) / (aa + ab - aa*ab)
        subtract: {
            unroundedAlpha: false,
            ontoOpaque: function(color1, color2, alpha1) {
                destColor = (color2 + alpha1 * color1 / 255 - alpha1) | 0;
            },
            ontoTransparent: function(color1, color2, alpha1, alpha2) {
                var
                    newAlpha = (alpha1 + alpha2 - alpha1 * alpha2 / 255) | 0,
                    alpha12 = alpha1 * alpha2;

                // No need to clamp the color to 255 since we're writing to a clamped array anyway
                destColor = ((alpha2 * color2 + alpha1 * color1 - alpha12) / newAlpha) | 0;
                destAlpha = newAlpha;
            }
        },

        // Same as Multiply except all color channels are inverted and the result too
        // C = 1 - (((1-A)*aa*(1-ab) + (1-B)*ab*(1-aa) + (1-A)*(1-B)*aa*ab) / (aa + ab - aa*ab))
        screen: {
            unroundedAlpha: false,
            ontoOpaque: function(color1, color2, alpha1) {
                var
                    invAlpha1 = alpha1 ^ 0xFF;

                destColor = 0xFF ^ (
                    (
                        (color2 ^ 0xFF) * invAlpha1
                        + (color1 ^ 0xFF) * (color2 ^ 0xFF) * alpha1 / 255
                    )
                    / 255
                );
            },
            ontoTransparent: function(color1, color2, alpha1, alpha2) {
                var
                    newAlpha = (alpha1 + alpha2 - alpha1 * alpha2 / 255) | 0,

                    alpha12 = (alpha1 * alpha2 / 255) | 0,
                    alpha1n2 = (alpha1 * (alpha2 ^ 0xFF) / 255) | 0,
                    alphan12 = ((alpha1 ^ 0xFF) * alpha2 / 255) | 0;

                destColor = 0xFF ^ (
                    (
                        (color1 ^ 0xFF) * alpha1n2
                        + (color2 ^ 0xFF) * alphan12
                        + (color1 ^ 0xFF) * (color2 ^ 0xFF) * alpha12 / 255
                    )
                    / newAlpha
                );
                destAlpha = newAlpha;
            }
        },

        // if B >= A: C = A*d + B*(1-d) and d = aa * (1-ab) / (aa + ab - aa*ab)
        // if A > B: C = B*d + A*(1-d) and d = ab * (1-aa) / (aa + ab - aa*ab)
        lighten: {
            unroundedAlpha: false,
            ontoOpaque: function(color1, color2, alpha1) {
                var
                    invAlpha1 = alpha1 ^ 0xFF;

                destColor = color2 >= color1 ? color2 : (color2 * invAlpha1 + color1 * alpha1) / 255;
            },
            ontoTransparent: function(color1, color2, alpha1, alpha2) {
                var
                    newAlpha = (alpha1 + alpha2 - alpha1 * alpha2 / 255) | 0,

                // This alpha is used when color1 > color2
                    alpha12 = (alpha2 * (alpha1 ^ 0xFF) / newAlpha) | 0,
                    invAlpha12 = (alpha12 ^ 0xFF) | 0,

                // This alpha is used when color2 > color1
                    alpha21 = (alpha1 * (alpha2 ^ 0xFF) / newAlpha) | 0,
                    invAlpha21 = (alpha21 ^ 0xFF) | 0;

                destColor = (((color2 >= color1) ? (color1 * alpha21 + color2 * invAlpha21) : (color2 * alpha12 + color1 * invAlpha12)) / 255) | 0;
                destAlpha = newAlpha;
            }
        },

        // if B >= A: C = B*d + A*(1-d) and d = ab * (1-aa) / (aa + ab - aa*ab)
        // if A > B: C = A*d + B*(1-d) and d = aa * (1-ab) / (aa + ab - aa*ab)
        darken: {
            unroundedAlpha: false,
            ontoOpaque: function(color1, color2, alpha1) {
                var
                    invAlpha1 = alpha1 ^ 0xFF;

                destColor = color2 >= color1 ? (color2 * invAlpha1 + color1 * alpha1) / 255 : color2;
            },
            ontoTransparent: function(color1, color2, alpha1, alpha2) {
                var
                    newAlpha = (alpha1 + alpha2 - alpha1 * alpha2 / 255) | 0,

                // This alpha is used when color1 > color2
                    alpha12 = (alpha1 * (alpha2 ^ 0xFF) / newAlpha) | 0,
                    invAlpha12 = (alpha12 ^ 0xFF) | 0,

                // This alpha is used when color2 > color1
                    alpha21 = (alpha2 * (alpha1 ^ 0xFF) / newAlpha) | 0,
                    invAlpha21 = (alpha21 ^ 0xFF) | 0;

                destColor = (((color2 >= color1) ? (color2 * alpha21 + color1 * invAlpha21) : (color1 * alpha12 + color2 * invAlpha12)) / 255) | 0;
                destAlpha = newAlpha;
            }
        },

        // C = (aa*(1-ab)*A + (1-aa)*ab*B + aa*ab*B/(1-A)) / (aa + ab - aa*ab)
        dodge: {
            unroundedAlpha: false,
            ontoOpaque: function(color1, color2, alpha1) {
                var
                    invAlpha1 = alpha1 ^ 0xFF;

                destColor = (
                    (
                        color2 * invAlpha1
                        + alpha1 * (color1 == 255 ? 255 : Math.min(255, (255 * color2 / (color1 ^ 0xFF)) | 0))
                    ) / 255
                ) | 0;
            },
            ontoTransparent: function(color1, color2, alpha1, alpha2) {
                var
                    newAlpha = (alpha1 + alpha2 - alpha1 * alpha2 / 255) | 0,
                    alpha12 = (alpha1 * alpha2 / 255) | 0,
                    alpha1n2 = (alpha1 * (alpha2 ^ 0xFF) / 255) | 0,
                    alphan12 = ((alpha1 ^ 0xFF) * alpha2 / 255) | 0;

                destColor = (
                    (
                        (color1 * alpha1n2)
                        + (color2 * alphan12)
                        + alpha12 * (color1 == 255 ? 255 : Math.min(255, (255 * color2 / (color1 ^ 0xFF)) | 0))
                    ) / newAlpha
                ) | 0;
                destAlpha = newAlpha;
            }
        },

        // C = (aa*(1-ab)*A + (1-aa)*ab*B + aa*ab*(1-(1-B)/A)) / (aa + ab - aa*ab)
        burn: {
            unroundedAlpha: false,
            ontoOpaque: function(color1, color2, alpha1) {
                var
                    invAlpha1 = alpha1 ^ 0xFF;

                destColor = (
                    (
                        color2 * invAlpha1
                        + alpha1 * (color1 == 0 ? 0 : Math.min(255, 255 * (color2 ^ 0xFF) / color1) ^ 0xFF)
                    )
                    / 255
                ) | 0;
            },
            ontoTransparent: function(color1, color2, alpha1, alpha2) {
                var
                    newAlpha = (alpha1 + alpha2 - alpha1 * alpha2 / 255) | 0,

                    alpha12 = (alpha1 * alpha2 / 255) | 0,
                    alpha1n2 = (alpha1 * (alpha2 ^ 0xFF) / 255) | 0,
                    alphan12 = ((alpha1 ^ 0xFF) * alpha2 / 255) | 0;

                destColor = (
                    (
                        color1 * alpha1n2
                        + color2 * alphan12
                        + alpha12 * (color1 == 0 ? 0 : Math.min(255, 255 * (color2 ^ 0xFF) / color1) ^ 0xFF)
                    )
                    / newAlpha
                ) | 0;
                destAlpha = newAlpha;
            }
        },

        // If B <= 0.5 C = (A*aa*(1-ab) + B*ab*(1-aa) + aa*ab*(2*A*B) / (aa + ab - aa*ab)
        // If B > 0.5 C = (A*aa*(1-ab) + B*ab*(1-aa) + aa*ab*(1 - 2*(1-A)*(1-B)) / (aa + ab - aa*ab)
        overlay: {
            unroundedAlpha: false,
            ontoOpaque: function(color1, color2, alpha1) {
                var
                    invAlpha1 = alpha1 ^ 0xFF;

                destColor = (
                    (
                        invAlpha1 * color2
                        + (
                            color2 <= 127
                                ? (alpha1 * 2 * color1 * color2 / 255)
                                : (alpha1 * ((2 * (color1 ^ 0xff) * (color2 ^ 0xff) / 255) ^ 0xff))
                        )
                    ) / 255
                ) | 0;
            },
            ontoTransparent: function(color1, color2, alpha1, alpha2) {
                var
                    newAlpha = (alpha1 + alpha2 - alpha1 * alpha2 / 255) | 0,
                    alpha12 = (alpha1 * alpha2 / 255) | 0,
                    alpha1n2 = (alpha1 * (alpha2 ^ 0xff) / 255) | 0,
                    alphan12 = ((alpha1 ^ 0xff) * alpha2 / 255) | 0;

                destColor = (
                    (
                        alpha1n2 * color1
                        + alphan12 * color2
                        + (
                            color2 <= 127
                                ? (alpha12 * 2 * color1 * color2 / 255)
                                : (alpha12 * ((2 * (color1 ^ 0xff) * (color2 ^ 0xff) / 255) ^ 0xff))
                        )
                    ) / newAlpha
                ) | 0;
                destAlpha = newAlpha;
            }
        },

        // Hard Light Mode (same as Overlay with A and B swapped)
        // If A <= 0.5 C = (A*aa*(1-ab) + B*ab*(1-aa) + aa*ab*(2*A*B) / (aa + ab - aa*ab)
        // If A > 0.5 C = (A*aa*(1-ab) + B*ab*(1-aa) + aa*ab*(1 - 2*(1-A)*(1-B)) / (aa + ab - aa*ab)
        hardLight: {
            unroundedAlpha: false,
            ontoOpaque: function(color1, color2, alpha1) {
                var
                    invAlpha1 = alpha1 ^ 0xff;

                destColor = (
                    (
                        invAlpha1 * color2
                        + (
                            color1 <= 127
                                ? (alpha1 * 2 * color1 * color2 / 255)
                                : (alpha1 * ((2 * (color1 ^ 0xff) * (color2 ^ 0xff) / 255) ^ 0xff))
                        )
                    ) / 255
                ) | 0;
            },
            ontoTransparent: function(color1, color2, alpha1, alpha2) {
                var
                    newAlpha = (alpha1 + alpha2 - alpha1 * alpha2 / 255) | 0,
                    alpha12 = (alpha1 * alpha2 / 255) | 0,
                    alpha1n2 = (alpha1 * (alpha2 ^ 0xff) / 255) | 0,
                    alphan12 = ((alpha1 ^ 0xff) * alpha2 / 255) | 0;

                destColor = (
                    (
                        alpha1n2 * color1
                        + alphan12 * color2
                        + (
                            color1 <= 127
                                ? (alpha12 * 2 * color1 * color2 / 255)
                                : (alpha12 * ((2 * (color1 ^ 0xff) * (color2 ^ 0xff) / 255) ^ 0xff))
                        )
                    ) / newAlpha
                ) | 0;

                destAlpha = newAlpha;
            }
        },

        // A < 0.5 => C = (2*A - 1) * (B - B^2) + B
        // A > 0.5 => C = (2*A - 1) * (sqrt(B) - B) + B
        softLight: {
            unroundedAlpha: false,
            ontoOpaque: function(color1, color2, alpha1) {
                var
                    invAlpha1 = alpha1 ^ 0xff;

                destColor = (
                    (
                        invAlpha1 * color2
                        + alpha1 * (
                            color1 <= 127
                                ? ((2 * color1 - 255) * softLightLUTSquare[color2] / 255 + color2)
                                : ((2 * color1 - 255) * softLightLUTSquareRoot[color2] / 255 + color2)
                        )
                    ) / 255
                ) | 0;
            },
            ontoTransparent: function(color1, color2, alpha1, alpha2) {
                var
                    newAlpha = (alpha1 + alpha2 - alpha1 * alpha2 / 255) | 0,

                    alpha12 = (alpha1 * alpha2 / 255) | 0,
                    alpha1n2 = (alpha1 * (alpha2 ^ 0xff) / 255) | 0,
                    alphan12 = ((alpha1 ^ 0xff) * alpha2 / 255) | 0;

                destColor = (
                    (
                        alpha1n2 * color1
                        + alphan12 * color2
                        + (
                            color1 <= 127
                                ? alpha12 * ((2 * color1 - 255) * softLightLUTSquare[color2] / 255 + color2)
                                : alpha12 * ((2 * color1 - 255) * softLightLUTSquareRoot[color2] / 255 + color2)
                        )
                    ) / newAlpha
                ) | 0;

                destAlpha = newAlpha;
            }
        },

        // A < 0.5 => C = 1 - (1-B) / (2*A)
        // A > 0.5 => C = B / (2*(1-A))
        vividLight: {
            unroundedAlpha: false,
            ontoOpaque: function(color1, color2, alpha1) {
                var
                    invAlpha1 = alpha1 ^ 0xff;

                destColor = (
                    (
                        invAlpha1 * color2
                        + (
                            color1 <= 127
                                ? (alpha1 * ((color1 == 0) ? 0 : 255 - Math.min(255, (255 - color2) * 255 / (2 * color1))))
                                : (alpha1 * (color1 == 255 ? 255 : Math.min(255, color2 * 255 / (2 * (255 - color1)))))
                        )
                    ) / 255
                ) | 0;
            },
            ontoTransparent: function(color1, color2, alpha1, alpha2) {
                var
                    newAlpha = (alpha1 + alpha2 - alpha1 * alpha2 / 255) | 0,

                    alpha12 = (alpha1 * alpha2 / 255) | 0,
                    alpha1n2 = (alpha1 * (alpha2 ^ 0xff) / 255) | 0,
                    alphan12 = ((alpha1 ^ 0xff) * alpha2 / 255) | 0;

                destColor = (
                    (
                        alpha1n2 * color1
                        + alphan12 * color2
                        + (
                            color1 <= 127
                                ? (alpha12 * ((color1 == 0) ? 0 : 255 - Math.min(255, (255 - color2) * 255 / (2 * color1))))
                                : (alpha12 * (color1 == 255 ? 255 : Math.min(255, color2 * 255 / (2 * (255 - color1)))))
                        )
                    ) / newAlpha
                ) | 0;
                destAlpha = newAlpha;
            }
        },

        // C = B + 2*A -1
        linearLight: {
            unroundedAlpha: false,
            ontoOpaque: function(color1, color2, alpha1) {
                var
                    invAlpha1 = alpha1 ^ 0xff;

                destColor = (
                    (
                        invAlpha1 * color2
                        + alpha1 * Math.min(255, Math.max(0, color2 + 2 * color1 - 255))
                    ) / 255
                ) | 0;
            },
            ontoTransparent: function(color1, color2, alpha1, alpha2) {
                var
                    newAlpha = (alpha1 + alpha2 - alpha1 * alpha2 / 255) | 0,

                    alpha12 = (alpha1 * alpha2 / 255) | 0,
                    alpha1n2 = (alpha1 * (alpha2 ^ 0xff) / 255) | 0,
                    alphan12 = ((alpha1 ^ 0xff) * alpha2 / 255) | 0;

                destColor = (
                    (
                        alpha1n2 * color1
                        + alphan12 * color2
                        + alpha12 * Math.min(255, Math.max(0, color2 + 2 * color1 - 255))
                    ) / newAlpha
                ) | 0;
                destAlpha = newAlpha;
            }
        },

        // B > 2*A => C = 2*A
        // B < 2*A-1 => C = 2*A-1
        // else => C = B
        pinLight: {
            unroundedAlpha: false,
            ontoOpaque: function(color1, color2, alpha1) {
                var
                    invAlpha1 = alpha1 ^ 0xff;

                destColor = (
                    (
                        invAlpha1 * color2
                        + alpha1 * ((color2 >= 2 * color1) ? (2 * color1) : (color2 <= 2 * color1 - 255) ? (2 * color1 - 255) : color2)
                    ) / 255
                ) | 0;
            },
            ontoTransparent: function(color1, color2, alpha1, alpha2) {
                var
                    newAlpha = (alpha1 + alpha2 - alpha1 * alpha2 / 255) | 0,

                    alpha12 = (alpha1 * alpha2 / 255) | 0,
                    alpha1n2 = (alpha1 * (alpha2 ^ 0xff) / 255) | 0,
                    alphan12 = ((alpha1 ^ 0xff) * alpha2 / 255) | 0;

                destColor = (
                    (
                        alpha1n2 * color1
                        + alphan12 * color2
                        + alpha12 * ((color2 >= 2 * color1) ? (2 * color1) : (color2 <= 2 * color1 - 255) ? (2 * color1 - 255) : color2)
                    ) / newAlpha
                ) | 0;
                destAlpha = newAlpha;
            }
        },
    };

function getLayerAlphaExpressionForVariant(alphaExpression, variant) {
    var
        rounding = variant.unroundedAlpha ? "" : " | 0";

    if (variant.masked && !variant.layerAlpha100) {
        return `(((${alphaExpression}) * mask.data[maskIndex] * layer.alpha / 25500) ${rounding})`;
    } else if (variant.masked) {
        return `(((${alphaExpression}) * mask.data[maskIndex] / 255) ${rounding})`;
    } else if (!variant.layerAlpha100) {
        //return `(((${alphaExpression}) * layerAlphaScale) ${rounding})`;
        return `(((${alphaExpression}) * layer.alpha / 100) ${rounding})`;
    } else {
        return alphaExpression;
    }
}

function getFusionAlphaExpressionForVariant(alphaExpression, variant) {
    var
        rounding = variant.unroundedAlpha ? "" : " | 0";

    if (variant.fusionAlpha100) {
        return alphaExpression;
    } else {
        return `(((${alphaExpression}) * fusion.alpha / 100) ${rounding})`;
        //return `(((${alphaExpression}) * fusionAlphaScale) ${rounding})`;
    }
}

function applyVectorAssignmentSubstitutions(code, useColor1Var, useColor2Var) {

    /*
     * Transform assignments to destColor into a loop that evaluates the expression for each color channel
     * in the source and fusion colors, and assigns the result to the channels of the fusion.
     */
    code = code.replace(/^\s*destColor\s*=\s*([^;]+)\s*;/gm, function(match, destExpr) {
        var
            vectorCode = "",
            addI;

        if (destExpr == "color1") {
            // Special case where we just set the fusion to the layer's data with no changes
            for (var i = 0; i < 3; i++) {
                addI = i ? " + " + i : "";

                vectorCode += `
                    fusion.data[pixIndex${addI}] = layer.data[pixIndex${addI}];
                `;
            }
        } else {
            for (var i = 0; i < 3; i++) {
                addI = i ? " + " + i : "";

                var
                    thisLoopExpr = destExpr;

                if (useColor1Var) {
                    vectorCode += `
                        color1 = layer.data[pixIndex${addI}];
                    `;
                } else {
                    thisLoopExpr = thisLoopExpr.replace(/color1/g, `layer.data[pixIndex${addI}]`);
                }

                if (useColor2Var) {
                    vectorCode += `
                        color2 = fusion.data[pixIndex${addI}];
                    `;
                } else {
                    thisLoopExpr = thisLoopExpr.replace(/color2/g, `fusion.data[pixIndex${addI}]`);
                }

                vectorCode += `
                    fusion.data[pixIndex${addI}] = ${thisLoopExpr};
                `;
            }
        }

        return vectorCode;
    });

    code = code.replace(/^\s*destAlpha\s*=\s*([^;]+);/gm, function(match, destExpr) {
        return `
            fusion.data[pixIndex + ALPHA_BYTE_OFFSET] = ${destExpr};
        `;
    });

    return code;
}

function capitalizeFirst(string) {
    return string.substring(0, 1).toUpperCase() + string.substring(1);
}

function getFunctionBody(func) {
    var
        source = Function.prototype.toString.call(func);

    // Strip the enclosing function() {} declaration to just get the body
    source = source.replace(/^\s*function\s*([^{]*)\([^)]*\)\s*\{([\s\S]+)\}\s*$/, '$2');

    return source;
}

function presentVarList(vars) {
    var
        addComma = false,
        varString = "";

    for (let varName in vars) {
        let value = vars[varName];

        if (addComma) {
            varString += ",\n";
        } else {
            addComma = true;
        }

        if (value) {
            varString += varName + " = " + value;
        } else {
            varString += varName;
        }
    }
    return varString;
}

function formatBlockComment(comment) {
    var
        result = "/**\n";

    for (let line of comment.split("\n")) {
        result += " * " + line + "\n";
    }

    result += " */\n";

    return result;
}

function docCommentForVariant(opName, variant) {
    var
        comment = `Blend the given layer onto the fusion using the ${opName} blending operator.\n\n`;

    if (variant.layerAlpha100) {
        comment += "The layer must have its layer alpha set to 100\n\n";
    }

    if (variant.fusionHasTransparency) {
        comment += "Fusion can contain transparent pixels, ";
    } else {
        comment += "Fusion pixels must be opaque, ";
    }

    if (variant.fusionAlpha100) {
        if (variant.fusionHasTransparency) {
            comment += "but ";
        } else {
            comment += "and ";
        }
        comment += "the fusion layer's opacity must be set to 100.";
    } else {
        comment += "with any fusion layer opacity.";
    }

    if (variant.masked) {
        comment += "\n\nThe given alpha mask will be multiplied with the layer alpha before blending.";
    }

    return formatBlockComment(comment);
}

function makeBlendOperations(objectName) {
    let
        functionStrings = [];

    for (var opName in OPERATIONS) {
        let
            operation = OPERATIONS[opName];

        // Default unroundedAlpha to false if not supplied
        operation.unroundedAlpha = !!operation.unroundedAlpha;

        for (let variant of OPERATION_VARIANTS) {
            let
                functionName = opName + "Onto" + capitalizeFirst(variant.name),
                outerVars, kernel, kernelPre, kernelPost, parameters, innerVars, innerVarString,
                useColor1Var, useColor2Var;

            parameters = "layer, fusion, rect";

            if (variant.masked) {
                parameters += ", mask";
            }

            outerVars = {
                h: "rect.getHeight() | 0",
                w: "rect.getWidth() | 0",
                yStride: "((layer.width - w) * BYTES_PER_PIXEL) | 0",
                pixIndex: "layer.offsetOfPixel(rect.left, rect.top) | 0"
            };

            /*if (!variant.layerAlpha100) {
                outerVars.layerAlphaScale = "layer.alpha / 100";
            }

            if (!variant.fusionAlpha100) {
                outerVars.fusionAlphaScale = "fusion.alpha / 100";
            }*/

            innerVars = {
                alpha1: null
            };

            if (variant.masked) {
                outerVars.yStrideMask = "(mask.width - w) | 0";
                outerVars.maskIndex = "mask.offsetOfPixel(rect.left, rect.top) | 0";
            }

            if (variant.fusionHasTransparency) {
                if (!variant.fusionAlpha100) {
                    throw "Fusion with alpha < 100 not yet supported";
                    /*
                     * Note that our blending operators produce a fusion with alpha == 100. If fusion alpha < 100 to
                     * begin with, we'd need to blend every pixel even if alpha1 == 0.
                     *
                     * ChickenPaint doesn't need this anyway, so don't implement yet.
                     */
                }

                innerVars.alpha2 = null;

                // We'll only affect the fusion if the layer's alpha is more than nothing
                kernelPre = `
                    if (alpha1) {
                        alpha2 = ${getFusionAlphaExpressionForVariant("fusion.data[pixIndex + ALPHA_BYTE_OFFSET]", variant)};
                `;

                kernel = getFunctionBody(operation.ontoTransparent);

                kernelPost = `
                    }
                `;
            } else {
                // We'll only affect the fusion if the layer's alpha is more than nothing
                kernelPre = `
                    if (alpha1) {
                `;

                kernel = getFunctionBody(operation.ontoOpaque);

                kernelPost = `
                    }
                ` ;
            }

            useColor1Var = kernel.match(/(\W|^)color1(\W|$)/g).length > 1;
            useColor2Var = kernel.match(/(\W|^)color2(\W|$)/g).length > 1;

            if (useColor1Var) {
                innerVars.color1 = null;
            }

            if (useColor2Var) {
                innerVars.color2 = null;
            }

            innerVarString = presentVarList(innerVars);

            kernel = applyVectorAssignmentSubstitutions(kernel, useColor1Var, useColor2Var);

            functionStrings.push(`
                ${docCommentForVariant(opName, variant)}
                ${objectName}.${functionName} = function(${parameters}) {
                    var
                        ${presentVarList(outerVars)};
                        
                    for (var y = 0 ; y < h; y++, pixIndex += yStride${variant.masked ? ", maskIndex += yStrideMask" : ""}) {
                        for (var x = 0; x < w; x++, pixIndex += BYTES_PER_PIXEL${variant.masked ? ", maskIndex++" : ""}) {
                            var
                                ${presentVarList(innerVars)};
                            
                            alpha1 = ${getLayerAlphaExpressionForVariant("layer.data[pixIndex + ALPHA_BYTE_OFFSET]", variant)};
                            
                            ${kernelPre}
                                ${kernel}
                            ${kernelPost}
                        }
                    }
                };
            `);
        }
    }

    return functionStrings.join("");
}

console.log(`// This file is generated, please see codegenerator/BlendGenerator.js!

    export default function ${blendClassName}() {
    }
    
    const
        BYTES_PER_PIXEL = 4,
        ALPHA_BYTE_OFFSET = 3,
        
        BLEND_MODE_NAMES = [
            "normal",
            "multiply",
            "add",
            "screen",
            "lighten",
            "darken",
            "subtract",
            "dodge",
            "burn",
            "overlay",
            "hardLight",
            "softLight",
            "vividLight",
            "linearLight",
            "pinLight"
        ],
        
        softLightLUTSquare = new Array(256),
        softLightLUTSquareRoot = new Array(256);
    
    ${makeBlendOperations(blendClassName)}
    
    ${blendClassName}.LM_NORMAL = 0;
    ${blendClassName}.LM_MULTIPLY = 1;
    ${blendClassName}.LM_ADD = 2;
    ${blendClassName}.LM_SCREEN = 3;
    ${blendClassName}.LM_LIGHTEN = 4;
    ${blendClassName}.LM_DARKEN = 5;
    ${blendClassName}.LM_SUBTRACT = 6;
    ${blendClassName}.LM_DODGE = 7;
    ${blendClassName}.LM_BURN = 8;
    ${blendClassName}.LM_OVERLAY = 9;
    ${blendClassName}.LM_HARDLIGHT = 10;
    ${blendClassName}.LM_SOFTLIGHT = 11;
    ${blendClassName}.LM_VIVIDLIGHT = 12;
    ${blendClassName}.LM_LINEARLIGHT = 13;
    ${blendClassName}.LM_PINLIGHT = 14;
`);

console.log(`/**
 * Fuse the given layer on top of the given fusion layer, using the blending operation defined in the layer.
 *
 * @param {CPLayer} fusion - Layer to fuse on top of
 * @param {boolean} fusionHasTransparency - True if the fusion layer has alpha < 100, or any transparent pixels.
 * @param {CPLayer} layer - Layer that should be drawn on top of the fusion
 * @param {CPRect} rect - The rectangle of pixels that should be fused.
 */
${blendClassName}.fuseLayer = ` + Function.prototype.toString.call(function(fusion, fusionHasTransparency, layer, rect) {
    if (layer.alpha <= 0) {
        return;
    }

    var
        funcName = BLEND_MODE_NAMES[layer.blendMode] + "Onto";

    if (fusion.alpha < 100) {
        throw "Fusion layer alpha < 100 not supported.";
    }

    if (fusionHasTransparency) {
        funcName += "TransparentFusion";
    } else {
        funcName += "OpaqueFusion";
    }

    if (layer.alpha == 100) {
        funcName += "WithOpaqueLayer";
    } else {
        funcName += "WithTransparentLayer";
    }

    fusion.getBounds().clip(rect);

    this[funcName](layer, fusion, rect);
}) + ";");

console.log(Function.prototype.toString.call(function makeLookupTables() {
    // V - V^2 table
    for (var i = 0; i < 256; i++) {
        var
            v = i / 255;

        softLightLUTSquare[i] = ((v - v * v) * 255) | 0;
    }

    // sqrt(V) - V table
    for (var i = 0; i < 256; i++) {
        var
            v = i / 255;

        softLightLUTSquareRoot[i] = ((Math.sqrt(v) - v) * 255) | 0;
    }
}));

console.log("makeLookupTables();");
