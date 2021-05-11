/**
 * Generate a random integer from [0...max)
 *
 * @param {int} max - Maximum integer (exclusive) to generate
 * @returns {int}
 */
import ChickenPaint from '../../js/ChickenPaint.js';
import CPColor from '../../js/util/CPColor.js';
import CPRect from '../../js/util/CPRect.js';
import CPLayerGroup from "../../js/engine/CPLayerGroup.js";
import CPTransform from "../../js/util/CPTransform.js";
import CPPolygon from "../../js/util/CPPolygon.js";
import CPBlend from "../../js/engine/CPBlend.js";

import {binaryStringToByteArray} from "../../js/engine/CPResourceSaver.js";
import {save as chiSave, load as chiLoad} from "../../js/engine/CPChibiFile.js";

import {MersenneTwister19937, Random, integer as randomInteger} from "random-js";
import $ from "jquery";
import FileSaver from "file-saver";

let
    pageURL = new URL(window.location),
    randomSeed = pageURL.searchParams.get("seed") ? (parseInt(pageURL.searchParams.get("seed"), 10) | 0) : Random.int32(Random.engines.browserCrypto),
    randomEngine = MersenneTwister19937.seed(randomSeed);

console.log("Using random seed " + randomSeed);

// [0..max)
function randInt(max) {
	return randomInteger(0, max - 1)(randomEngine);
}

function pick(list) {
	return list[randInt(list.length)]
}

function saveImage(image, name) {
	const
		flat = binaryStringToByteArray(image.getAsPNG(0)),
		flatBlob = new Blob([flat], {type: "image/png"});
	
	FileSaver.saveAs(flatBlob, name);
}

class Step {
	/**
	 *
	 * @param {Object} chickenPaintAction - An action that can be fed directly to ChickenPaint's actionPerformed routine
	 * @param {Object} stepParameters - Additional parameters if we need to call the action ourselves
	 */
	constructor(chickenPaintAction, stepParameters) {
		this.action = chickenPaintAction;
		this.parameters = stepParameters;
	}

	/**
     *  Perform the current step and return true if the step was completed (doesn't need to be run again to do more work)
     *
     *  @param {ChickenPaint} chickenPaint
     */
	perform(chickenPaint) {
		if (this.action) {
			chickenPaint.actionPerformed(this.action);
			return true;
		} else {
			const
				artwork = chickenPaint.getArtwork();
			
			switch (this.parameters.task) {
				case "paint":
					this.parameters.pointIndex = this.parameters.pointIndex || 0;
					
					if (this.parameters.pointIndex === 0) {
						if (!artwork.beginStroke(this.parameters.points[0].x, this.parameters.points[0].y, 1.0)) {
							return true;
						}
					} else {
						artwork.continueStroke(this.parameters.points[this.parameters.pointIndex].x, this.parameters.points[this.parameters.pointIndex].y, 1.0);
					}
					this.parameters.pointIndex++;
					
					if (this.parameters.pointIndex >= this.parameters.points.length) {
						artwork.endStroke();
						return true;
					}
					
					return false;
				
				case "history":
					this.parameters.actionIndex = this.parameters.actionIndex || 0;
					
					if (this.parameters.actionIndex === 0) {
						Object.defineProperty(this.parameters, "history", {
							value: [artwork.fusionLayers().clone()],
							enumerable: false, // Avoid JSON-serialization
							configurable: true
						});
						this.parameters.historyDepth = 0;
					}
					
					let
						action = this.parameters.actions[this.parameters.actionIndex];
					
					if (chickenPaint.isActionAllowed(action)) {
						chickenPaint.actionPerformed({action: action});
						
						this.parameters.historyDepth += action == "CPUndo" ? 1 : -1;
						
						if (this.parameters.historyDepth >= 0) {
							const
								currentImage = artwork.fusionLayers();
							
							// Have we been at this point in the history before?
							if (this.parameters.history[this.parameters.historyDepth]) {
								// Ensure that our image looks the same as it did last time we were at this point
								if (!currentImage.equals(this.parameters.history[this.parameters.historyDepth])) {
									saveImage(currentImage, "current-image.png");
									saveImage(this.parameters.history[this.parameters.historyDepth], "target-image.png");

									throw new Error("Failure for undo/redo to restore image correctly");
								}
							} else {
								// Remember this history step for the future
								this.parameters.history[this.parameters.historyDepth] = currentImage.clone();
							}
						}
					}
					
					this.parameters.actionIndex++;
					
					if (this.parameters.actionIndex >= this.parameters.actions.length) {
						delete this.parameters.history;
						
						return true;
					}
					
					return false;
				
				case "relocateLayer":
					let
						layers = artwork.getLayersRoot().getLinearizedLayerList(false);
					
					chickenPaint.actionPerformed({
						action: action,
						layer: layers[this.parameters.layerIndex],
						toGroup: layers[this.parameters.toGroupWithIndex],
						toIndex: this.parameters.toIndex
					});
					
					return true;
				
				case "setColor":
					chickenPaint.setCurColor(new CPColor(this.parameters.color));
					
					return true;
				
				case "setBrushSize":
					chickenPaint.setBrushSize(this.parameters.size);
					
					return true;
				
				case "setSelection":
					artwork.setSelection(new CPRect(this.parameters.left, this.parameters.top, this.parameters.right, this.parameters.bottom));
					
					return true;
				
				case "setActiveLayer":
					chickenPaint.actionPerformed({
						action: "CPSetActiveLayer",
						layer: artwork.getLayersRoot().getLinearizedLayerList(false)[this.parameters.layerIndex],
						mask: this.parameters.mask
					});
					
					return true;
				
				case "floodFill":
					artwork.floodFill(this.parameters.x, this.parameters.y);
					
					return true;
				
				case "boxBlur":
					artwork.boxBlur(this.parameters.radiusX, this.parameters.radiusY, this.parameters.iterations);
					
					return true;
				
				case "affineTransform":
					artwork.transformAffineBegin();
					
					let
						transform = new CPTransform();
					
					transform.m = this.parameters.transform;
					
					artwork.transformAffineAmend(transform);
					
					artwork.transformAffineFinish();
					
					return true;
			}
		}
		
		throw new Error("Failed to execute step");
	}
}

class Test {
	constructor(chickenPaint) {
		this.chickenPaint = chickenPaint;
	}
	
	peekNextStep() {
	}
	
	performNextStep() {
	}
	
	done() {
		return false;
	}
}

class RandomTest extends Test {
	constructor(chickenPaint) {
		super(chickenPaint);
		
		/**
		 *
		 * @type {Step}
		 */
		this.currentStep = null;
	}
	
	peekNextStep() {
		if (this.currentStep === null) {
			this.currentStep = this.generateStep();
		}
		
		return this.currentStep;
	}
	
	performNextStep() {
		this.peekNextStep();
		
		// Hold on to the step if it signals that it needs to run again
		if (this.currentStep.perform(this.chickenPaint)) {
			this.currentStep = null;
		}
	}
	
	/**
	 * @returns {Step}
	 */
	generateStep() {
		const
			chickenPaint = this.chickenPaint,
			artwork = chickenPaint.getArtwork(),
			
			stepGenerators = [
				function () {
					return null;
					
					let
						action = pick([
							"CPZoom100",
							"CPZoomIn",
							"CPZoomOut"
						]);
					
					return new Step({action: action}, {});
				},
				function () {
					let
						action = pick([
							"CPFill",
							"CPClear",
							"CPSelectAll",
							"CPDeselectAll",
							"CPHFlip",
							"CPVFlip",
							"CPMNoise",
							"CPCNoise",
							"CPFXInvert",
							"CPFloodFill",
							"CPFXBoxBlur"
						]);
					
					switch (action) {
						case "CPFloodFill":
							let
								x = Random.real(-50, artwork.width + 50)(randomEngine),
								y = Random.real(-50, artwork.height + 50)(randomEngine);
							
							return new Step(null, {task: "floodFill", x, y});
						
						case "CPFXBoxBlur":
							return new Step(null, {
								task: "boxBlur",
								radiusX: randInt(20) + 1,
								radiusY: randInt(20) + 1,
								iterations: randInt(3) + 1
							});
						
						default:
							return new Step({action: action}, {});
						
					}
				},
				function () {
					let
						points = [],
						numPoints = randInt(20) + 1,
                        x = Random.real(-50, artwork.width + 50)(randomEngine),
                        y = Random.real(-50, artwork.height + 50)(randomEngine),
                        dist = Random.real(-0.1, 0.1);
					
					for (let i = 0; i < numPoints; i++) {
						points.push({
							x: x, y: y
						});
						
						x += dist(randomEngine) * artwork.width;
						y += dist(randomEngine) * artwork.width;
					}
					
					return new Step(null, {task: "paint", points: points, pointIndex: 0});
				},
				function () {
					let
						actions = [],
						numSteps = randInt(5) + 1;
					
					for (let i = 0; i < numSteps; i++) {
						actions.push(pick(["CPUndo", "CPRedo"]));
					}
					
					return new Step(null, {task: "history", actions: actions, actionIndex: 0});
				},
				function () {
					switch (pick(["setColor", "setBrushSize"])) {
						case "setColor":
							return new Step(null, {task: "setColor", color: Random.int32(randomEngine)});
						
						case "setBrushSize":
							return new Step(null, {task: "setBrushSize", size: randInt(100) + 1});
					}
				},
				() => new Step({
					action: pick(["CPPencil", "CPPen", "CPEraser", "CPSoftEraser", "CPAirbrush", "CPDodge", "CPBurn",
						"CPWater", "CPBlur", "CPSmudge", "CPBlender"])
				}),
				function () {
					const
                        x = Random.real(-50, artwork.width + 50)(randomEngine),
                        y = Random.real(-50, artwork.height + 50)(randomEngine),
						width = Random.real(0, artwork.width * 1.1)(randomEngine),
                        height = Random.real(0, artwork.height * 1.1)(randomEngine);
					
					return new Step(null, {
						task: "setSelection",
						left: x,
						top: y,
						right: x + width,
						bottom: y + height
					});
				},
				function () {
					const
						selectionCenter = new CPPolygon(artwork.getSelectionAutoSelect().toPoints()).getCenter(),
						transform = new CPTransform(),
						hScale = Random.real(0.05, 3)(randomEngine),
						vScale = Random.real(0.05, 3)(randomEngine);
					
					transform.translate(Random.real(-150, 150)(randomEngine), Random.real(-150, 150)(randomEngine));
					transform.rotateAroundPoint(Random.real(-2 * Math.PI, 2 * Math.PI)(randomEngine), selectionCenter.x, selectionCenter.y);
					transform.scale(hScale, vScale);
					
					return new Step(null, {task: "affineTransform", transform: transform.m});
				},
				function() {
					const
						action = pick(["CPSetLayerLockAlpha", "CPSetLayerAlpha", "CPSetLayerBlendMode"]);

					switch (action) {
						case "CPSetLayerLockAlpha":
							return new Step({action: action, lock: Random.bool(randomEngine)}, {});

						case "CPSetLayerAlpha":
							let
								alphaMode = randInt(3),
								alpha;

							// Bias heavily towards edge cases (0 and 100 alpha)
							if (alphaMode === 0) {
								alpha = 0;
							} else if (alphaMode == 1) {
								alpha = 100;
							} else {
								alpha = randInt(99) + 1;
							}

							return new Step({action: action, alpha: alpha}, {});

						case "CPSetLayerBlendMode":
							return new Step({action: action, blendMode: randInt(CPBlend.LM_LAST + 1)}, {});
					}
				},
				function () {
					const
						action = pick(["CPRemoveLayer", "CPAddLayer", "CPSetActiveLayer", "CPAddGroup", "CPRelocateLayer", "CPAddLayerMask", "CPApplyLayerMask", "CPRemoveLayerMask"]),
						layers = artwork.getLayersRoot().getLinearizedLayerList(false);
					
					if ((action == "CPAddLayer" || action == "CPAddGroup") && layers.length > 5
						|| action == "CPSetActiveLayer" && layers.length == 1
						|| !chickenPaint.isActionAllowed(action)) {
						return null;
					}
					
					switch (action) {
						case "CPSetActiveLayer":
							return new Step(null, {
								task: "setActiveLayer",
								layerIndex: randInt(layers.length),
								mask: randInt(2) == 0
							});
						
						case "CPRelocateLayer":
							const
								layer = pick(layers),
								targetBelow = pick(layers);
							
							// If target is a layer group, add a chance of dropping onto that group (allows layers to be moved as the only member of the group)
							if (targetBelow instanceof CPLayerGroup && randInt(2) == 0) {
								return new Step({}, {
									task: action,
									layerIndex: layers.indexOf(layer),
									toGroupWithIndex: layers.indexOf(targetBelow.parent),
									toIndex: targetBelow.parent.layers.length
								});
							}
							
							return new Step({}, {
								task: action,
								layerIndex: layers.indexOf(layer),
								toGroupWithIndex: layers.indexOf(targetBelow.parent),
								toIndex: targetBelow.parent.indexOf(targetBelow)
							});
						
						default:
							return new Step({action: action});
					}
				}
			];
		
		let
			step;
		
		do {
			step = pick(stepGenerators)();
		} while (step === null);
		
		return step;
	}
}

class JSONTest extends Test {
	constructor(chickenPaint, steps) {
		super(chickenPaint);
		
		this.steps = steps;
		this.stepIndex = 0;
	}
	
	peekNextStep() {
		const
			step = this.steps[this.stepIndex];
		
		return new Step(step.action, step.parameters);
	}
	
	performNextStep() {
		if (this.peekNextStep().perform(this.chickenPaint)) {
			this.stepIndex++;
		}
	}
	
	done() {
		return this.stepIndex >= this.steps.length;
	}
}

function clone(x) {
	// obviously only for a very limited subset of objects
	return JSON.parse(JSON.stringify(x));
}

function stepFromJSON(json) {
	return new Step(json.action ? clone(json.action) : null, json.parameters ? clone(json.parameters) : null);
}

/**
 * Take an array of drawing operations which causes an exception to be thrown when the final action is applied, and attempt
 * to reduce it to a series of trailing operations from the array that will trigger the exception when applied to a
 * saved/loaded drawing created from the prefix.
 *
 * @param {Object[]} steps - JSON array of step descriptions
 */
function minifyTestcase(steps) {
	if (steps.length === 0) {
		return steps;
	}
	
	let
		minPrefixLength = 0,
		maxPrefixLength = steps.length - 1, // We want at least 1 operation in the suffix
		mid,
        lastException,
		
		attempt = function() {
            // Find the longest prefix we can use that still triggers the exception
			let
                chickenPaint = new ChickenPaint({});

            if (minPrefixLength < maxPrefixLength) {
				mid = Math.ceil((minPrefixLength + maxPrefixLength) / 2);
				
				let
					prefixSteps = steps.slice(0, mid).map(stepFromJSON),
					postfixSteps = steps.slice(mid).map(stepFromJSON);
				
				if (postfixSteps.length === 0) {
					throw "Postfix is empty";
				}
				
				try {
					for (let prefixStep of prefixSteps) {
						prefixStep.perform(chickenPaint);
                        chickenPaint.getArtwork().fusionLayers();
                    }
				} catch (e) {
					throw "We received an error when evaluating a prefix of the operations, this shouldn't happen. " + e;
				}
				
				return chiSave(chickenPaint.getArtwork())
					.then(result => chiLoad(result.bytes))
					.then(
						artwork => {
							try {
								let
									newChickenPaint = new ChickenPaint({
										artwork: artwork
									});

                                for (let postfixStep of postfixSteps) {
                                    postfixStep.perform(newChickenPaint);
                                    artwork.fusionLayers();
                                }
                                /* We didn't get an exception, so the suffix needs to be longer to include the trigger
                                 * for the fault (prefix has to be shorter)
                                 */
                                maxPrefixLength = mid - 1;
							} catch (e) {
							    console.error(e);
								// This suffix size successfully caused an exception, so the prefix can be at least this long
								minPrefixLength = mid;
								lastException = e;
							}
                        },
                        err => {
							throw "Failed to save/reload the artwork " + err;
						}
					)
					.then(attempt);
			} else {
                let
                    prefixSteps = steps.slice(0, minPrefixLength).map(stepFromJSON),
                    postfixSteps = steps.slice(minPrefixLength);

                if (postfixSteps.length === 0) {
                    throw "Postfix is empty";
                }

                try {
                    for (let prefixStep of prefixSteps) {
                        prefixStep.perform(chickenPaint);
                        chickenPaint.getArtwork().fusionLayers();
                    }
                } catch (e) {
                    throw "We received an error when evaluating a prefix of the operations, this shouldn't happen.";
                }

                return chiSave(chickenPaint.getArtwork())
					.then(chibiResult => {
						console.log("Testcase reduced from " + steps.length + " steps to " + postfixSteps.length + " steps, to be applied to saved drawing testcase.chi");
						FileSaver.saveAs(chibiResult.bytes, "testcase.chi");
						FileSaver.saveAs(new Blob([JSON.stringify(postfixSteps)], {type: "text/plain;charset=utf-8"}), "testcase.json");
						console.log("Exception generated by the last step was ", lastException);
					});
			}
		};
	
	return Promise.resolve().then(attempt);
}

export default function IntegrationTest() {
	let
		chickenPaint,
		test,
		stepsJSON = [],
		lastStep = null;
	
	function continueTest() {
		if (test.done()) {
			console.log("Test complete");
		} else {
			let
				step = test.peekNextStep();

			if (step !== lastStep) {
				stepsJSON.push(clone(step));
				lastStep = step;
			}
			
			try {
				test.performNextStep(chickenPaint);
			} catch (e) {
				console.error("Test failed with error: " + e);
                console.log(JSON.stringify(stepsJSON, null, 2));
				throw e;

				// console.error("Attempting to reduce testcase size...");
				// minifyTestcase(stepsJSON);
			}
			
			let
				wasPaintOperation = step.parameters && step.parameters.task == "paint";
			
			setTimeout(continueTest, wasPaintOperation ? 10 : 100);
		}
	}
	
	function startTests(_chickenPaint) {
		chickenPaint = _chickenPaint;
		
		test = new RandomTest(chickenPaint);
		
		// test = new JSONTest(chickenPaint, randomTestSeries);
		
		continueTest();
	}
	
	$(document).ready(function () {
		new ChickenPaint({
			uiElem: document.getElementById("chickenpaint-parent"),
			saveUrl: "save.php",
			postUrl: "posting.php",
			exitUrl: "forum.php",
			allowDownload: true,
			resourcesRoot: "../../resources/",
			onLoaded: startTests
		});
	});
}