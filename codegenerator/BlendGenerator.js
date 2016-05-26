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
	destColor = false, destAlpha = false, softLightLUTSquare, softLightLUTSquareRoot; // Dummies to silence IDE warnings

const
	CPRect = function() {}, // Dummy to silence IDE warnings

	BYTES_PER_PIXEL = 4,
	ALPHA_BYTE_OFFSET = 3,

/*
 * Our blending operations. We'll use .toString() on these blending functions to get their source code, then
 * use them as a kernel which reads pixels from two layers (into color1, alpha1, color2, alpha2) and writes to
 * the destination layer (through the magic variables destColor and destAlpha).
 *
 * Writes to destColor should write a single channel. The assignment will be duplicated to transform each of the
 * input channels in turn (with new color1/color2 values).
 */
	STANDARD_BLEND_OPS = {
		// C = (A*aa*(1-ab) + B*ab*(1-aa) + A*B*aa*ab) / (aa + ab - aa*ab)
		multiply: {
			displayName: "multiply",
			// Don't bother rounding alpha1/alpha2 before giving them to us:
			unroundedAlpha: true,
			ontoOpaque: function (color1, color2, alpha1) {
				destColor = (color2 - (color1 ^ 0xFF) * color2 * alpha1 / (255 * 255)) | 0;
			},
			ontoTransparent: function (color1, color2, alpha1, alpha2) {
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
			displayName: "normal",
			ontoOpaque: function (color1, color2, alpha1) {
				if (alpha1 == 255) {
					destColor = color1;
				} else {
					var
						invAlpha1 = 255 - alpha1;
					
					destColor = ((color1 * alpha1 + color2 * invAlpha1) / 255) | 0;
				}
			},
			ontoTransparent: function (color1, color2, alpha1, alpha2) {
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
			displayName: "add",
			unroundedAlpha: true,
			ontoOpaque: function (color1, color2, alpha1) {
				destColor = (color2 + alpha1 * color1 / 255) | 0;
			},
			ontoTransparent: function (color1, color2, alpha1, alpha2) {
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
			displayName: "subtract",
			unroundedAlpha: false,
			ontoOpaque: function (color1, color2, alpha1) {
				destColor = (color2 + alpha1 * color1 / 255 - alpha1) | 0;
			},
			ontoTransparent: function (color1, color2, alpha1, alpha2) {
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
			displayName: "screen",
			unroundedAlpha: false,
			ontoOpaque: function (color1, color2, alpha1) {
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
			ontoTransparent: function (color1, color2, alpha1, alpha2) {
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
			displayName: "lighten",
			unroundedAlpha: false,
			ontoOpaque: function (color1, color2, alpha1) {
				var
					invAlpha1 = alpha1 ^ 0xFF;
				
				destColor = color2 >= color1 ? color2 : (color2 * invAlpha1 + color1 * alpha1) / 255;
			},
			ontoTransparent: function (color1, color2, alpha1, alpha2) {
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
			displayName: "darken",
			unroundedAlpha: false,
			ontoOpaque: function (color1, color2, alpha1) {
				var
					invAlpha1 = alpha1 ^ 0xFF;
				
				destColor = color2 >= color1 ? (color2 * invAlpha1 + color1 * alpha1) / 255 : color2;
			},
			ontoTransparent: function (color1, color2, alpha1, alpha2) {
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
			displayName: "dodge",
			unroundedAlpha: false,
			ontoOpaque: function (color1, color2, alpha1) {
				var
					invAlpha1 = alpha1 ^ 0xFF;
				
				destColor = (
						(
							color2 * invAlpha1
							+ alpha1 * (color1 == 255 ? 255 : Math.min(255, (255 * color2 / (color1 ^ 0xFF)) | 0))
						) / 255
					) | 0;
			},
			ontoTransparent: function (color1, color2, alpha1, alpha2) {
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
			displayName: "burn",
			unroundedAlpha: false,
			ontoOpaque: function (color1, color2, alpha1) {
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
			ontoTransparent: function (color1, color2, alpha1, alpha2) {
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
			displayName: "overlay",
			unroundedAlpha: false,
			ontoOpaque: function (color1, color2, alpha1) {
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
			ontoTransparent: function (color1, color2, alpha1, alpha2) {
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
			displayName: "hard light",
			unroundedAlpha: false,
			ontoOpaque: function (color1, color2, alpha1) {
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
			ontoTransparent: function (color1, color2, alpha1, alpha2) {
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
			displayName: "soft light",
			unroundedAlpha: false,
			ontoOpaque: function (color1, color2, alpha1) {
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
			ontoTransparent: function (color1, color2, alpha1, alpha2) {
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
			displayName: "vivid light",
			unroundedAlpha: false,
			ontoOpaque: function (color1, color2, alpha1) {
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
			ontoTransparent: function (color1, color2, alpha1, alpha2) {
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
			displayName: "linear light",
			unroundedAlpha: false,
			ontoOpaque: function (color1, color2, alpha1) {
				var
					invAlpha1 = alpha1 ^ 0xff;
				
				destColor = (
						(
							invAlpha1 * color2
							+ alpha1 * Math.min(255, Math.max(0, color2 + 2 * color1 - 255))
						) / 255
					) | 0;
			},
			ontoTransparent: function (color1, color2, alpha1, alpha2) {
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
			displayName: "pin light",
			unroundedAlpha: false,
			ontoOpaque: function (color1, color2, alpha1) {
				var
					invAlpha1 = alpha1 ^ 0xff;
				
				destColor = (
						(
							invAlpha1 * color2
							+ alpha1 * ((color2 >= 2 * color1) ? (2 * color1) : (color2 <= 2 * color1 - 255) ? (2 * color1 - 255) : color2)
						) / 255
					) | 0;
			},
			ontoTransparent: function (color1, color2, alpha1, alpha2) {
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
		}
	},

	REPLACE_OPERATION = {
		displayName: "replace",
		ignoresFusion: true,
		ontoTransparent: function (color1, color2, alpha1, alpha2) {
			destColor = color1;
			destAlpha = alpha1;
		}
	},

	REPLACE_ALPHA_OPERATION = {
		displayName: "replaceAlpha",
		ignoresFusion: true,
		ontoTransparent: function (color1, color2, alpha1, alpha2) {
			destAlpha = alpha1;
		}
	};

function getLayerAlphaExpressionForVariant(alphaExpression, variant) {
	var
		rounding = variant.unroundedAlpha ? "" : " | 0";
	
	if (variant.masked && !variant.layerAlpha100) {
		return `(((${alphaExpression}) * mask.data[maskIndex] * layerAlpha / 25500) ${rounding})`;
	} else if (variant.masked) {
		return `(((${alphaExpression}) * mask.data[maskIndex] / 255) ${rounding})`;
	} else if (!variant.layerAlpha100) {
		//return `(((${alphaExpression}) * layerAlphaScale) ${rounding})`;
		return `(((${alphaExpression}) * layerAlpha / 100) ${rounding})`;
	} else {
		return alphaExpression;
	}
}

function getFusionAlphaExpressionForVariant(alphaExpression, variant) {
	return alphaExpression;
}

function applyVectorAssignmentSubstitutions(code, useColor1Var, useColor2Var, destPixIndexVar) {
	
	/*
	 * Transform assignments to destColor into a loop that evaluates the expression for each color channel
	 * in the source and fusion colors, and assigns the result to the channels of the fusion.
	 */
	code = code.replace(/^\s*destColor\s*=\s*([^;]+)\s*;/gm, function (match, destExpr) {
		var
			vectorCode = "",
			addI;
		
		if (destExpr == "color1") {
			// Special case where we just set the fusion to the layer's data with no changes
			for (var i = 0; i < 3; i++) {
				addI = i ? " + " + i : "";
				
				vectorCode += `
                    fusion.data[${destPixIndexVar}${addI}] = layer.data[pixIndex${addI}];
                `;
			}
		} else {
			for (var i = 0; i < 3; i++) {
				addI = i ? " + " + i : "";
				
				var
					thisLoopExpr = destExpr,
					layerPixelExpr = `layer.data[pixIndex${addI}]`,
					fusionPixelExpr = `fusion.data[${destPixIndexVar}${addI}]`;
				
				if (useColor1Var) {
					vectorCode += `
                        color1 = ${layerPixelExpr};
                    `;
				} else {
					thisLoopExpr = thisLoopExpr.replace(/color1/g, layerPixelExpr);
				}

				if (useColor2Var) {
					vectorCode += `
                        color2 = ${fusionPixelExpr};
                    `;
				} else {
					thisLoopExpr = thisLoopExpr.replace(/color2/g, fusionPixelExpr);
				}
				
				vectorCode += `
                    ${fusionPixelExpr} = ${thisLoopExpr};
                `;
			}
		}
		
		return vectorCode;
	});
	
	code = code.replace(/^\s*destAlpha\s*=\s*([^;]+);/gm, function (match, destExpr) {
		return `
            fusion.data[${destPixIndexVar} + ALPHA_BYTE_OFFSET] = ${destExpr};
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

function docCommentForVariant(operationDisplayName, variant, parameters) {
	var
		comment = `Blend the given layer onto the fusion using the ${operationDisplayName} blending operator.\n\n`;
	
	if (variant.layerAlpha100) {
		comment += "The layer must have its layer alpha set to 100\n\n";
	}

	if (!variant.ignoresFusion) {
		if (variant.fusionHasTransparency) {
			comment += "Fusion can contain transparent pixels, ";
		} else {
			comment += "Fusion pixels must be opaque, ";
		}

		if (variant.fusionHasTransparency) {
			comment += "but ";
		} else {
			comment += "and ";
		}
		comment += "the fusion layer's opacity must be set to 100.\n\n";
	}

	if (variant.masked) {
		comment += "The given alpha mask will be multiplied with the layer alpha before blending.\n\n";
	}

	if (variant.fusionDifferentSize) {
		comment += "The destination's top left will be at destX, destY. The fusion can be a different size to\n"
		"the layer.\n\n";
	} else {
		comment += "The destination co-ordinates will be the same as the source ones, so both fusion and layer\n" +
		"must be the same dimensions.\n\n";
	}

	for (let parameter of parameters) {
		comment += `@param {${parameter.type}} ${parameter.name}\n`;
	}
	
	return formatBlockComment(comment);
}

function makeBlendOperation(functionName, operation, variant) {
	let
		outerVars, kernel, kernelPre, kernelPost, parameters, innerVars,
		useColor1Var, useColor2Var, destPixIndexVar, matches;

	parameters = [
		{
			name: "fusion",
			type: "CPColorBmp"
		},
		{
			name: "layer",
			type: "CPColorBmp"
		},
		{
			name: "layerAlpha",
			type: "int"
		},
		{
			name: "srcRect",
			type: "CPRect"
		}
	];

	if (variant.fusionDifferentSize) {
		parameters.push({
			name: "destX",
			type: "int"
		});
		parameters.push({
			name: "destY",
			type: "int"
		});
	}

	if (variant.masked) {
		parameters.push({
			name: "mask",
			type: "CPGreyBmp"
		});
	}

	outerVars = {
		h: "srcRect.getHeight() | 0",
		w: "srcRect.getWidth() | 0",
		yStride: "((layer.width - w) * BYTES_PER_PIXEL) | 0",
		pixIndex: "layer.offsetOfPixel(srcRect.left, srcRect.top) | 0"
	};

	if (variant.fusionDifferentSize) {
		outerVars.yStrideDest = "((fusion.width - w) * BYTES_PER_PIXEL) | 0";
		outerVars.pixIndexDest = "fusion.offsetOfPixel(destX, destY) | 0";
		destPixIndexVar = "pixIndexDest";
	} else {
		destPixIndexVar = "pixIndex";
	}

	if (variant.masked) {
		outerVars.yStrideMask = "(mask.width - w) | 0";
		outerVars.maskIndex = "mask.offsetOfPixel(rect.left, rect.top) | 0";
	}

	innerVars = {
		alpha1: null
	};

	if (variant.ignoresFusion) {
		kernelPre = "";
		kernel = getFunctionBody(operation.ontoTransparent);
		kernelPost = "";
	} else {
		if (variant.fusionHasTransparency) {
			innerVars.alpha2 = null;

			// We'll only affect the fusion if the layer's alpha is more than nothing
			kernelPre = `
	            if (alpha1) {
	                alpha2 = ${getFusionAlphaExpressionForVariant(`fusion.data[${destPixIndexVar} + ALPHA_BYTE_OFFSET]`, variant)};
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
	        `;
		}
	}

	matches = kernel.match(/(\W|^)color1(\W|$)/g);
	useColor1Var = matches && matches.length > 1;

	matches = kernel.match(/(\W|^)color2(\W|$)/g);
	useColor2Var = matches && matches.length > 1;

	if (useColor1Var) {
		innerVars.color1 = null;
	}

	if (useColor2Var) {
		innerVars.color2 = null;
	}

	kernel = applyVectorAssignmentSubstitutions(kernel, useColor1Var, useColor2Var, destPixIndexVar);

	let
		yIncrements = ["y++", "pixIndex += yStride"],
		xIncrements = ["x++", "pixIndex += BYTES_PER_PIXEL"];

	if (variant.masked) {
		yIncrements.push("maskIndex += yStrideMask");
		xIncrements.push("maskIndex++");
	}

	if (variant.fusionDifferentSize) {
		yIncrements.push("pixIndexDest += yStrideDest");
		xIncrements.push("pixIndexDest += BYTES_PER_PIXEL");
	}

	return `
        ${docCommentForVariant(operation.displayName, variant, parameters)}
        CPBlend.${functionName} = function(${parameters.map(p => p.name).join(", ")}) {
            var
                ${presentVarList(outerVars)};
                
            for (var y = 0 ; y < h; ${yIncrements.join(", ")}) {
                for (var x = 0; x < w; ${xIncrements.join(", ")}) {
                    var
                        ${presentVarList(innerVars)};
                    
                    alpha1 = ${getLayerAlphaExpressionForVariant("layer.data[pixIndex + ALPHA_BYTE_OFFSET]", variant)};
                    
                    ${kernelPre}
                        ${kernel}
                    ${kernelPost}
                }
            }
        };
    `;
}

function makeBlendOperations() {
	let
		functionStrings = [];

	const
		OPERATION_VARIANTS = [
			{
				name: "opaqueFusionWithOpaqueLayer",
				fusionHasTransparency: false,
				layerAlpha100: true,

				masked: false
			},
			{
				name: "opaqueFusionWithTransparentLayer",
				fusionHasTransparency: false,
				layerAlpha100: false,

				masked: false,
			},
			{
				name: "transparentFusionWithOpaqueLayer",
				fusionHasTransparency: true,
				layerAlpha100: true,

				masked: false
			},
			{
				name: "transparentFusionWithTransparentLayer",
				fusionHasTransparency: true,
				layerAlpha100: false,

				masked: false
			}
		];

	for (var opName in STANDARD_BLEND_OPS) {
		let
			operation = STANDARD_BLEND_OPS[opName];
		
		// Default unroundedAlpha to false if not supplied
		operation.unroundedAlpha = !!operation.unroundedAlpha;
		
		for (let variant of OPERATION_VARIANTS) {
			let
				functionName = opName + "Onto" + capitalizeFirst(variant.name);

			functionStrings.push(makeBlendOperation(functionName, operation, variant));
		}
	}
	
	return functionStrings.join("");
}

console.log(`// This file is generated, please see codegenerator/BlendGenerator.js!
    
    import CPColorBmp from './CPColorBmp';
    import CPGreyBmp from './CPGreyBmp';
    import CPLayer from './CPLayer';
    import CPRect from '../util/CPRect';
    
    export default function CPBlend() {
    }
    
    const
        BYTES_PER_PIXEL = 4,
        ALPHA_BYTE_OFFSET = 3,
        
        BLEND_MODE_CODENAMES = [
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
            "pinLight",
            "passthrough"
        ],
        
        softLightLUTSquare = new Array(256),
        softLightLUTSquareRoot = new Array(256);
    
    ${makeBlendOperations()}
    
    CPBlend.LM_NORMAL = 0;
    CPBlend.LM_MULTIPLY = 1;
    CPBlend.LM_ADD = 2;
    CPBlend.LM_SCREEN = 3;
    CPBlend.LM_LIGHTEN = 4;
    CPBlend.LM_DARKEN = 5;
    CPBlend.LM_SUBTRACT = 6;
    CPBlend.LM_DODGE = 7;
    CPBlend.LM_BURN = 8;
    CPBlend.LM_OVERLAY = 9;
    CPBlend.LM_HARDLIGHT = 10;
    CPBlend.LM_SOFTLIGHT = 11;
    CPBlend.LM_VIVIDLIGHT = 12;
    CPBlend.LM_LINEARLIGHT = 13;
    CPBlend.LM_PINLIGHT = 14;
    CPBlend.LM_PASSTHROUGH = 15;
    
    CPBlend.BLEND_MODE_DISPLAY_NAMES = [
          "Normal", "Multiply", "Add", "Screen", "Lighten", "Darken", "Subtract", "Dodge", "Burn",
          "Overlay", "Hard Light", "Soft Light", "Vivid Light", "Linear Light", "Pin Light", "Passthrough"
    ];

    /**
     * Blends the given image on top of the fusion.
     *
     * @param {CPColorBmp} fusion - Image to fuse on top of
     * @param {boolean} fusionHasTransparency - True if the fusion layer has alpha < 100, or any transparent pixels.
     * @param {CPColorBmp} image - Image that should be drawn on top of the fusion
     * @param {int} imageAlpha - Alpha [0...100] to apply to the image
     * @param {int} imageBlendMode - Blending mode (CPBlend.LM_*) to apply to the image
     * @param {CPRect} rect - The rectangle of pixels that should be fused.
     */
    CPBlend.fuseImageOntoImage = ` + Function.prototype.toString.call(function (fusion, fusionHasTransparency, image, imageAlpha, imageBlendMode, rect) {
		if (imageAlpha <= 0) {
			return;
		}
		
		var
			funcName = BLEND_MODE_CODENAMES[imageBlendMode] + "Onto";
		
		if (fusionHasTransparency) {
			funcName += "TransparentFusion";
		} else {
			funcName += "OpaqueFusion";
		}
		
		if (imageAlpha == 100) {
			funcName += "WithOpaqueLayer";
		} else {
			funcName += "WithTransparentLayer";
		}
		
		rect = fusion.getBounds().clipTo(rect);
		
		this[funcName](fusion, image, imageAlpha, rect);
	}) + `;
	
	${makeBlendOperation("replaceOntoFusionWithTransparentLayer", REPLACE_OPERATION, {
		fusionHasTransparency: false,
		layerAlpha100: false,
		ignoresFusion: true
	})}
		
	${makeBlendOperation("replaceOntoFusionWithOpaqueLayer", REPLACE_OPERATION, {
		layerAlpha100: true,
		ignoresFusion: true
	})}
	
	${makeBlendOperation("replaceAlphaOntoFusionWithTransparentLayer", REPLACE_ALPHA_OPERATION, {
		layerAlpha100: false,
		ignoresFusion: true
	})}
		
	${makeBlendOperation("replaceAlphaOntoFusionWithOpaqueLayer", REPLACE_ALPHA_OPERATION, {
		layerAlpha100: true,
		ignoresFusion: true
	})}
	
	${makeBlendOperation("_normalFuseImageOntoImageAtPosition", STANDARD_BLEND_OPS.normal, {
		layerAlpha100: true,
		fusionDifferentSize: true,
		fusionHasTransparency: true
	})}
	
	CPBlend.normalFuseImageOntoImageAtPosition = ` + Function.prototype.toString.call(function(fusion, image, sourceRect, destX, destY) {
		var
			sourceRectCopy = sourceRect.clone(),
			destRect = new CPRect(destX, destY, 0, 0);

		fusion.getBounds().clipSourceDest(sourceRectCopy, destRect);

		this._normalFuseImageOntoImageAtPosition(fusion, image, 100, sourceRectCopy, destRect.left, destRect.top);
	}) + `;
    
    /**
     * Multiplies the given alpha into the alpha of the individual pixels of the image.
     *
     * @param {CPColorBmp} image
     * @param {int} alpha - [0...100] alpha to apply
     */
    CPBlend.multiplyAlphaBy = ` + Function.prototype.toString.call(function (image, alpha) {
		if (alpha < 100) {
			if (alpha == 0) {
				image.clearAll(0);
			} else {
				var
					imageData = image.data;
				
				for (var pixIndex = ALPHA_BYTE_OFFSET; pixIndex < imageData.length; pixIndex += BYTES_PER_PIXEL) {
					imageData[pixIndex] = Math.round(imageData[pixIndex] * alpha / 100);
				}
			}
		}
	}) + `;
    
    /**
     * Multiplies the given alpha into the alpha of the individual pixels of the image and stores the
     * resulting pixels into the specified image.
     *
     * @param {CPColorBmp} dest
     * @param {CPColorBmp} image
     * @param {int} alpha - [0...100] alpha to apply
     * @param {CPRect} rect
     */
    CPBlend.copyAndMultiplyAlphaBy = ` + Function.prototype.toString.call(function (dest, image, alpha, rect) {
		if (alpha == 100) {
			dest.copyBitmapRect(image, rect.left, rect.top, rect);
		} else if (alpha == 0) {
			dest.clearRect(rect, 0);
		} else {
			var
				imageData = image.data;
			
			for (var pixIndex = 0; pixIndex < imageData.length; pixIndex += BYTES_PER_PIXEL) {
				imageData[pixIndex] = imageData[pixIndex];
				imageData[pixIndex + 1] = imageData[pixIndex + 1];
				imageData[pixIndex + 2] = imageData[pixIndex + 2];
				
				imageData[pixIndex + ALPHA_BYTE_OFFSET] = Math.round(imageData[pixIndex + ALPHA_BYTE_OFFSET] * alpha / 100);
			}
		}
	}) + `;
	
    /**
     * Fuse the given layer on top of the given fusion layer, using the blending operation defined in the layer.
     *
     * @param {CPLayer} fusion - Layer to fuse on top of
     * @param {boolean} fusionHasTransparency - True if the fusion layer has alpha < 100, or any transparent pixels.
     * @param {CPLayer} layer - Layer that should be drawn on top of the fusion
     * @param {CPRect} rect - The rectangle of pixels that should be fused.
     */
    CPBlend.fuseLayerOntoLayer = ` + Function.prototype.toString.call(function (fusion, fusionHasTransparency, layer, rect) {
		if (layer.getEffectiveAlpha() == 0) {
			return;
		}
		
		// Our blending operators don't support fusion with alpha < 100, so ensure that first
		this.multiplyAlphaBy(fusion.image, fusion.alpha);
		
		this.fuseImageOntoImage(fusion.image, fusionHasTransparency, layer.image, layer.alpha, layer.blendMode, rect);
	}) + `;
    
    ` + Function.prototype.toString.call(function makeLookupTables() {
		// V - V^2 table
		for (let i = 0; i < 256; i++) {
			let
				v = i / 255;
			
			softLightLUTSquare[i] = ((v - v * v) * 255) | 0;
		}
		
		// sqrt(V) - V table
		for (let i = 0; i < 256; i++) {
			let
				v = i / 255;
			
			softLightLUTSquareRoot[i] = ((Math.sqrt(v) - v) * 255) | 0;
		}
	}) + `
    
    makeLookupTables();
`);
