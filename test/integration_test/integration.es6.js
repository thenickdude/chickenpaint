/**
 * Generate a random integer from [0...max)
 *
 * @param {int} max - Maximum integer (exclusive) to generate
 * @returns {int}
 */
import ChickenPaint from '../../js/ChickenPaint.js';
import CPColor from '../../js/util/CPColor.js';
import CPRect from '../../js/util/CPRect.js';
import CPLayerGroup from "../../js/engine/CPLayerGroup";
import CPTransform from "../../js/util/CPTransform";
import CPPolygon from "../../js/util/CPPolygon";

import {binaryStringToByteArray} from "../../js/engine/CPResourceSaver";

function randInt(max) {
	return Math.floor(Math.random() * max);
}

function pick(list) {
	return list[randInt(list.length)]
}

function saveImage(image, name) {
	const
		flat = binaryStringToByteArray(image.getAsPNG(0)),
		flatBlob = new Blob([flat], {type: "image/png"});
	
	window.saveAs(flatBlob, name);
}

class Step {
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
					
					if (this.parameters.pointIndex == 0) {
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
					
					if (this.parameters.actionIndex == 0) {
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
			test.currentStep = null;
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
								x = Math.random() * (artwork.width + 100) - 50,
								y = Math.random() * (artwork.height + 100) - 50;
							
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
						x = Math.random() * (artwork.width + 100) - 50,
						y = Math.random() * (artwork.height + 100) - 50;
					
					for (let i = 0; i < numPoints; i++) {
						points.push({
							x: x, y: y
						});
						
						x += (Math.random() - 0.5) * artwork.width * 0.2;
						y += (Math.random() - 0.5) * artwork.width * 0.2;
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
							return new Step(null, {task: "setColor", color: randInt(4294967296)});
						
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
						x = Math.random() * (artwork.width + 100) - 50,
						y = Math.random() * (artwork.height + 100) - 50,
						width = Math.random() * artwork.width + 10,
						height = Math.random() * artwork.height + 10;
					
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
						hScale = Math.random() * 2 + 0.05,
						vScale = Math.random() * 2 + 0.05;
					
					transform.translate(Math.random() * 300, Math.random() * 300);
					transform.rotateAroundPoint(Math.random() * 2 * Math.PI, selectionCenter.x, selectionCenter.y);
					transform.scale(hScale, vScale);
					
					return new Step(null, {task: "affineTransform", transform: transform.m});
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

export default function IntegrationTest() {
	let
		chickenPaint,
		test;
	
	function continueTest() {
		if (test.done()) {
			console.log("Test complete");
		} else {
			let
				step = test.peekNextStep();

			// console.log(JSON.stringify(step));
			
			test.performNextStep(chickenPaint);
			
			let
				wasPaintOperation = step.parameters && step.parameters.task == "paint";
			
			setTimeout(continueTest, wasPaintOperation ? 10 : 100);
		}
	}
	
	function startTests() {
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
			allowSave: true,
			resourcesRoot: "../../resources/",
			onLoaded: startTests
		});
	});
}