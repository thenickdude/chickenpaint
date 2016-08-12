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

import CPBrushInfo from "./engine/CPBrushInfo";
import CPArtwork from "./engine/CPArtwork";
import CPResourceLoader from "./engine/CPResourceLoader";
import CPResourceSaver from "./engine/CPResourceSaver";

import CPSpashScreen from "./gui/CPSplashScreen.js";

import CPMainGUI from "./gui/CPMainGUI";

import CPAboutDialog from "./gui/CPAboutDialog";
import CPConfirmTransformDialog from "./gui/CPConfirmTransformDialog";
import CPShortcutsDialog from "./gui/CPShortcutsDialog";
import CPBoxBlurDialog from "./gui/CPBoxBlurDialog";
import CPTabletDialog from "./gui/CPTabletDialog";
import CPGridDialog from "./gui/CPGridDialog";
import CPSendDialog from "./gui/CPSendDialog";


import {isCanvasInterpolationSupported, isEventSupported, isCanvasSupported} from "./util/CPPolyfill";
import CPColor from "./util/CPColor";
import CPWacomTablet from "./util/CPWacomTablet";
import CPRect from "./util/CPRect";

function isBrowserSupported() {
    return isCanvasSupported() && "Uint8Array" in window;
}

function createDrawingTools() {
    var
        tools = new Array(ChickenPaint.T_MAX);

    tools[ChickenPaint.T_PENCIL] = new CPBrushInfo({
        toolNb: ChickenPaint.T_PENCIL,
        size: 16,
        alpha: 255,
        isAA: true,
        minSpacing: 0.5,
        spacing: 0.05,
        pressureSize: false,
        pressureAlpha: true,
        type: CPBrushInfo.B_ROUND_AA,
        paintMode: CPBrushInfo.M_PAINT
    });

    tools[ChickenPaint.T_ERASER] = new CPBrushInfo({
        toolNb: ChickenPaint.T_ERASER,
        size: 16,
        alpha: 255,
        isAA: true,
        minSpacing: 0.5,
        spacing: 0.05,
        pressureSize: false,
        pressureAlpha: false,
        type: CPBrushInfo.B_ROUND_AA,
        paintMode: CPBrushInfo.M_ERASE
    });

    tools[ChickenPaint.T_PEN] = new CPBrushInfo({
        toolNb: ChickenPaint.T_PEN,
        size: 2,
        alpha: 128,
        isAA: true,
        minSpacing: 0.5,
        spacing: 0.05,
        pressureSize: true,
        pressureAlpha: false,
        type: CPBrushInfo.B_ROUND_AA,
        paintMode: CPBrushInfo.M_PAINT
    });

    tools[ChickenPaint.T_SOFTERASER] = new CPBrushInfo({
        toolNb: ChickenPaint.T_SOFTERASER,
        size: 16,
        alpha: 64,
        isAA: false,
        isAirbrush: true,
        minSpacing: 0.5,
        spacing: 0.05,
        pressureSize: false,
        pressureAlpha: true,
        type: CPBrushInfo.B_ROUND_AIRBRUSH,
        paintMode: CPBrushInfo.M_ERASE
    });

    tools[ChickenPaint.T_AIRBRUSH] = new CPBrushInfo({
        toolNb: ChickenPaint.T_AIRBRUSH,
        size: 50,
        alpha: 32,
        isAA: false,
        isAirbrush: true,
        minSpacing: 0.5,
        spacing: 0.05,
        pressureSize: false,
        pressureAlpha: true,
        type: CPBrushInfo.B_ROUND_AIRBRUSH,
        paintMode: CPBrushInfo.M_PAINT
    });

    tools[ChickenPaint.T_DODGE] = new CPBrushInfo({
        toolNb: ChickenPaint.T_DODGE,
        size: 30,
        alpha: 32,
        isAA: false,
        isAirbrush: true,
        minSpacing: 0.5,
        spacing: 0.05,
        pressureSize: false,
        pressureAlpha: true,
        type: CPBrushInfo.B_ROUND_AIRBRUSH,
        paintMode: CPBrushInfo.M_DODGE
    });

    tools[ChickenPaint.T_BURN] = new CPBrushInfo({
        toolNb: ChickenPaint.T_BURN,
        size: 30,
        alpha: 32,
        isAA: false,
        isAirbrush: true,
        minSpacing: 0.5,
        spacing: 0.05,
        pressureSize: false,
        pressureAlpha: true,
        type: CPBrushInfo.B_ROUND_AIRBRUSH,
        paintMode: CPBrushInfo.M_BURN
    });

    tools[ChickenPaint.T_WATER] = new CPBrushInfo({
        toolNb: ChickenPaint.T_WATER,
        size: 30,
        alpha: 70,
        isAA: false,
        isAirbrush: true,
        minSpacing: 0.5,
        spacing: 0.02,
        pressureSize: false,
        pressureAlpha: true,
        type: CPBrushInfo.B_ROUND_AA,
        paintMode: CPBrushInfo.M_WATER,
        resat: 0.3,
        bleed: 0.6
    });

    tools[ChickenPaint.T_BLUR] = new CPBrushInfo({
        toolNb: ChickenPaint.T_BLUR,
        size: 20,
        alpha: 255,
        isAA: false,
        isAirbrush: true,
        minSpacing: 0.5,
        spacing: 0.05,
        pressureSize: false,
        pressureAlpha: true,
        type: CPBrushInfo.B_ROUND_PIXEL,
        paintMode: CPBrushInfo.M_BLUR
    });

    tools[ChickenPaint.T_SMUDGE] = new CPBrushInfo({
        toolNb: ChickenPaint.T_SMUDGE,
        size: 20,
        alpha: 128,
        isAA: false,
        isAirbrush: true,
        minSpacing: 0.5,
        spacing: 0.01,
        pressureSize: false,
        pressureAlpha: true,
        type: CPBrushInfo.B_ROUND_AIRBRUSH,
        paintMode: CPBrushInfo.M_SMUDGE,
        resat: 0.0,
        bleed: 1.0
    });

    tools[ChickenPaint.T_BLENDER] = new CPBrushInfo({
        toolNb: ChickenPaint.T_BLENDER,
        size: 20,
        alpha: 60,
        isAA: false,
        isAirbrush: true,
        minSpacing: 0.5,
        spacing: 0.1,
        pressureSize: false,
        pressureAlpha: true,
        type: CPBrushInfo.B_ROUND_AIRBRUSH,
        paintMode: CPBrushInfo.M_OIL,
        resat: 0.0,
        bleed: 0.07
    });

    return tools;
}

/**
 * Creates an instance of the ChickenPaint drawing app. Options is an object with these keys:
 *
 * uiElem       - DOM element to insert ChickenPaint into (required)
 * canvasWidth  - Width in pixels to use when creating blank canvases (defaults to 800)
 * canvasHeight - Height in pixels to use when creating blank canvases (defaults to 600)
 * rotation     - Integer from [0..3], number of 90 degree right rotations that should be applied to the canvas after
 *                loading
 *
 * saveUrl   - URL to POST the drawing to to save it
 * postUrl   - URL to navigate to after saving is successful and the user chooses to see/publish their finished product
 * exitUrl   - URL to navigate to after saving is successful and the user chooses to exit (optional)
 * testUrl   - URL that ChickenPaint can simulate a drawing upload to to test the user's permissions/connection (optional)
 *
 * loadImageUrl     - URL of PNG/JPEG image to load for editing (optional)
 * loadChibiFileUrl - URL of .chi file to load for editing (optional). Used in preference to loadImage.
 * loadSwatchesUrl  - URL of an .aco palette to load (optional)
 *
 * allowMultipleSends - Allow the drawing to be sent to the server multiple times (saving does not immediately end drawing session).
 * allowDownload - Allow the drawing to be saved to the user's computer
 * allowFullScreen - Allow the drawing tool to enter "full screen" mode, where the rest of the page contents will be hidden
 *
 * disableBootstrapAPI - Disable Bootstrap's data API on the root of the document. This speeds up things considerably.
 * 
 * resourcesRoot - URL to the directory that contains the gfx/css etc directories (relative to the page that 
 *                 ChickenPaint is loaded on)
 *
 * @throws ChickenPaint.UnsupportedBrowserException if the web browser does not support ChickenPaint
 */
export default function ChickenPaint(options) {
    var
        that = this,

        uiElem = options.uiElem,

        canvas,
        mainGUI,

        curColor = new CPColor(0),
        curBrush = ChickenPaint.T_PENCIL,
        curMode = ChickenPaint.M_DRAW,
        preTransformMode = curMode,
        curGradient = [0xFF000000, 0xFFFFFFFF],

        fullScreenMode = false,

        tools = createDrawingTools(),

        boxBlurDialog, gridDialog,

        actions = {
            // GUI actions

            CPFullScreen: {
                action: function () {
                    fullScreenMode = !fullScreenMode;

                    $("body").toggleClass("chickenpaint-full-screen", fullScreenMode);
                    $(uiElem).toggleClass("chickenpaint-full-screen", fullScreenMode);

                    setTimeout(function () {
                        mainGUI.setFullScreenMode(fullScreenMode);
                    }, 200);
                },
                isSupported: function() {
                    return options.allowFullScreen !== false;
                },
                modifies: {gui: true}
            },
            CPZoomIn: {
                action: function () {
                    canvas.zoomIn();
                },
                modifies: {gui: true}
            },
            CPZoomOut: {
                action: function () {
                    canvas.zoomOut();
                },
                modifies: {gui: true}
            },
            CPZoom100: {
                action: function () {
                    canvas.zoom100();
                },
                modifies: {gui: true}
            },

            // History actions

            CPUndo: {
                action: function () {
                    that.artwork.undo();
                },
                modifies: {document: true}
            },
            CPRedo: {
                action: function () {
                    that.artwork.redo();
                },
                modifies: {document: true}
            },
            CPClearHistory: {
                action: function () {
                    if (confirm("You're about to clear the current Undo/Redo history.\nThis operation cannot be undone, are you sure you want to do that?")) {
                        that.artwork.clearHistory();
                    }
                },
                modifies: {document: true}
            },

            // Drawing tools

            CPPencil:     new ToolChangeAction(ChickenPaint.T_PENCIL),
            CPPen:        new ToolChangeAction(ChickenPaint.T_PEN),
            CPEraser:     new ToolChangeAction(ChickenPaint.T_ERASER),
            CPSoftEraser: new ToolChangeAction(ChickenPaint.T_SOFTERASER),
            CPAirbrush  : new ToolChangeAction(ChickenPaint.T_AIRBRUSH),
            CPDodge:      new ToolChangeAction(ChickenPaint.T_DODGE),
            CPBurn:       new ToolChangeAction(ChickenPaint.T_BURN),
            CPWater:      new ToolChangeAction(ChickenPaint.T_WATER),
            CPBlur:       new ToolChangeAction(ChickenPaint.T_BLUR),
            CPSmudge:     new ToolChangeAction(ChickenPaint.T_SMUDGE),
            CPBlender:    new ToolChangeAction(ChickenPaint.T_BLENDER),

            // Modes

            CPFloodFill:     new ModeChangeAction(ChickenPaint.M_FLOODFILL),
            CPGradientFill:  new ModeChangeAction(ChickenPaint.M_GRADIENTFILL),
            CPRectSelection: new ModeChangeAction(ChickenPaint.M_RECT_SELECTION),
            CPMoveTool:      new ModeChangeAction(ChickenPaint.M_MOVE_TOOL),
            CPRotateCanvas:  new ModeChangeAction(ChickenPaint.M_ROTATE_CANVAS),
            CPColorPicker:   new ModeChangeAction(ChickenPaint.M_COLOR_PICKER),

            // Layer transform

            CPTransform: {
                action: function () {
                    var
                        layer = that.artwork.getActiveLayer(),
                        layerIndex = that.artwork.getActiveLayerIndex();
                    
                    if (!layer.visible) {
                        that.showLayerNotification(layerIndex, "Whoops! This layer is currently hidden", "layer");
                    } else if (layer.alpha == 0) {
                        that.showLayerNotification(layerIndex, "Whoops! This layer's opacity is currently 0%", "opacity");
                    } else if (that.artwork.transformAffineBegin() == null) {
                        that.showLayerNotification(layerIndex, "Whoops! All of the selected pixels are transparent!", "layer");
                    } else {
                        setMode(ChickenPaint.M_TRANSFORM);
                    }
                },
                modifies: {mode: true}
            },
            CPTransformAccept: {
                action: function () {
                    if (curMode == ChickenPaint.M_TRANSFORM) {
                        that.artwork.transformAffineFinish();
                        setMode(preTransformMode);
                    }
                },
                modifies: {mode: true}
            },
            CPTransformReject: {
                action: function () {
                    if (curMode == ChickenPaint.M_TRANSFORM) {
                        that.artwork.transformAffineAbort();
                        setMode(preTransformMode);
                    }
                },
                modifies: {document: true, mode: true}
            },

            // Stroke modes

            CPFreeHand: {
                action: function () {
                    tools[curBrush].strokeMode = CPBrushInfo.SM_FREEHAND;
                    callToolListeners();
                },
                modifies: {tool: true}
            },
            CPLine: {
                action: function () {
                    tools[curBrush].strokeMode = CPBrushInfo.SM_LINE;
                    callToolListeners();
                },
                modifies: {tool: true}
            },
            CPBezier: {
                action: function () {
                    tools[curBrush].strokeMode = CPBrushInfo.SM_BEZIER;
                    callToolListeners();
                },
                modifies: {tool: true}
            },

            // Help dialogs

            CPAbout: {
                action: function () {
                    new CPAboutDialog(uiElem).show();
                },
                modifies: {}
            },
            CPShortcuts: {
                action: function () {
                    new CPShortcutsDialog(uiElem).show();
                },
                modifies: {}
            },
            CPTabletSupport: {
                action: function () {
                    new CPTabletDialog(uiElem).show();
                },
                modifies: {}
            },

            // Layer actions

            CPLayerDuplicate: {
                action: function () {
                    that.artwork.duplicateLayer();
                },
                modifies: {document: true}
            },
            CPLayerMergeDown: {
                action: function () {
                    that.artwork.mergeDown(true);
                },
                modifies: {document: true}
            },
            CPLayerMergeAll: {
                action: function () {
                    that.artwork.mergeAllLayers(true);
                },
                modifies: {document: true}
            },
            CPFill: {
                action: function () {
                    that.artwork.fill(that.getCurColorRgb() | 0xff000000);
                },
                modifies: {document: true}
            },
            CPClear: {
                action: function () {
                    that.artwork.clear();
                },
                modifies: {document: true}
            },
            CPSelectAll: {
                action: function () {
                    that.artwork.rectangleSelection(that.artwork.getBounds());
                    canvas.repaintAll();
                },
                modifies: {document: true}
            },
            CPDeselectAll: {
                action: function () {
                    that.artwork.rectangleSelection(new CPRect(0, 0, 0, 0));
                    canvas.repaintAll();
                },
                modifies: {document: true}
            },
            CPHFlip: {
                action: function () {
                    that.artwork.hFlip();
                },
                modifies: {document: true}
            },
            CPVFlip: {
                action: function () {
                    that.artwork.vFlip();
                },
                modifies: {document: true}
            },
            CPMNoise: {
                action: function () {
                    that.artwork.monochromaticNoise();
                },
                modifies: {document: true}
            },
            CPCNoise: {
                action: function () {
                    that.artwork.colorNoise();
                },
                modifies: {document: true}
            },
            CPFXBoxBlur: {
                action: function () {
                    showBoxBlurDialog();
                },
                modifies: {document: true}
            },
            CPFXInvert: {
                action: function () {
                    that.artwork.invert();
                },
                modifies: {document: true}
            },

            CPCut: {
                action: function () {
                    that.artwork.cutSelection(true);
                },
                modifies: {document: true}
            },
            CPCopy: {
                action: function () {
                    that.artwork.copySelection();
                },
                modifies: {document: true}
            },
            CPCopyMerged: {
                action: function () {
                    that.artwork.copySelectionMerged();
                },
                modifies: {document: true}
            },
            CPPaste: {
                action: function () {
                    that.artwork.pasteClipboard(true);
                },
                modifies: {document: true}
            },

            CPToggleGrid: {
                action: function(e) {
                    canvas.showGrid(e.selected);
                },
                modifies: {gui: true}
            },
            CPGridOptions: {
                action: function () {
                    showGridOptionsDialog();
                },
                modifies: {gui: true}
            },

            CPLinearInterpolation: {
                action: function(e) {
                    canvas.setInterpolation(e.selected);
                },
                modifies: {gui: true},
                isSupported: function() {
                    return isCanvasInterpolationSupported();
                }
            },
            CPResetCanvasRotation: {
                action: function () {
                    canvas.resetRotation();
                },
                modifies: {gui: true}
            },

            // Layer palette

            CPAddLayer: {
                action: function() {
                    that.artwork.addLayer();
                },
                modifies: {document: true}
            },
            CPRemoveLayer: {
                action: function() {
                    if (!that.artwork.removeLayer()) {
                        alert("Sorry, you can't remove the last remaining layer in the drawing.");
                    }
                },
                modifies: {document: true}
            },
            CPMoveLayer: {
                action: function(e) {
                    that.artwork.moveLayer(e.fromIndex, e.toIndex);
                },
                modifies: {document: true}
            },
            CPSetActiveLayerIndex: {
                action: function(e) {
                    that.artwork.setActiveLayerIndex(e.layerIndex);

                    // Since this is a slow GUI operation, this is a good chance to get the canvas ready for drawing
                    that.artwork.performIdleTasks();
                },
                modifies: {document: true}
            },
            CPSetLayerVisibility: {
                action: function(e) {
                    that.artwork.setLayerVisibility(e.layerIndex, e.visible);
                },
                modifies: {layerProp: true}
            },
            CPSetLayerName: {
                action: function(e) {
                    that.artwork.setLayerName(e.layerIndex, e.name);
                },
                modifies: {layerProp: true}
            },
            CPSetLayerBlendMode: {
                action: function(e) {
                    that.artwork.setLayerBlendMode(e.layerIndex, e.blendMode);
                },
                modifies: {layerProp: true}
            },
            CPSetLayerAlpha: {
                action: function(e) {
                    that.artwork.setLayerAlpha(e.layerIndex, e.alpha);
                },
                modifies: {layerProp: true}
            },

            // Palettes

            CPPalColor: new PaletteToggleAction("color"),
            CPPalBrush: new PaletteToggleAction("brush"),
            CPPalLayers: new PaletteToggleAction("layers"),
            CPPalStroke: new PaletteToggleAction("stroke"),
            CPPalSwatches: new PaletteToggleAction("swatches"),
            CPPalTool: new PaletteToggleAction("tool"),
            CPPalMisc: new PaletteToggleAction("misc"),
            CPPalTextures: new PaletteToggleAction("textures"),

            CPTogglePalettes: {
                action: function () {
                    mainGUI.togglePalettes();
                },
                modifies: {gui: true}
            },
            CPArrangePalettes: {
                action: function () {
                    mainGUI.arrangePalettes();
                },
                modifies: {gui: true}
            },

            // Saving

            CPSave: {
                action: function () {
                    saveDrawing();
                },
                isSupported: function() {
                    return options.allowDownload !== false;
                },
                modifies: {document: true}
            },
            CPSend: {
                action: function () {
                    sendDrawing();
                },
                isSupported: function() {
                    return !!options.saveUrl;
                },
                modifies: {document: true}
            },
            CPPost: {
                action: function () {
                    window.location = options.postUrl;
                },
                isSupported: function() {
                    return !!options.postUrl;
                },
                modifies: {document: true}
            },
            CPContinue: {
                action: function() {
                },
                isSupported: function() {
                    return !!options.allowMultipleSends;
                }
            },
            CPExit: {
                action: function () {
                    // Exit the drawing session without posting the drawing to the forum
                    window.location = options.exitUrl;
                },
                isSupported: function() {
                    return !!options.exitUrl;
                },
                modifies: {}
            }
        };

    function PaletteToggleAction(palName) {
        this.palName = palName;
    }

    PaletteToggleAction.prototype.action = function(e) {
        mainGUI.showPalette(this.palName, e.selected);
    };
    PaletteToggleAction.prototype.modifies = {gui: true};

    function ToolChangeAction(toolNum) {
        this.toolNum = toolNum;
    }

    ToolChangeAction.prototype.action = function() {
        setTool(this.toolNum);
    };

    ToolChangeAction.prototype.modifies = {mode: true, tool: true};

    function ModeChangeAction(modeNum) {
        this.modeNum = modeNum;
    }

    ModeChangeAction.prototype.action = function() {
        setMode(this.modeNum);
    };
    ModeChangeAction.prototype.modifies = {mode: true};

    function showBoxBlurDialog() {
        if (!boxBlurDialog) {
            boxBlurDialog = new CPBoxBlurDialog(uiElem, that);
        }

        boxBlurDialog.show();
    }

    function showGridOptionsDialog() {
        if (!gridDialog) {
            gridDialog = new CPGridDialog(uiElem, canvas);
        }

        gridDialog.show();
    }

    function callToolListeners() {
        that.emitEvent('toolChange', [curBrush, tools[curBrush]]);
    }

    // TODO make me private
    this.callToolListeners = function() {
        callToolListeners();
    };

    function callModeListeners() {
        that.emitEvent('modeChange', [curMode]);
    }

    function callViewListeners(viewInfo) {
        that.emitEvent('viewChange', [viewInfo]);
    }
    
    this.getMainGUI = function() {
        return mainGUI;
    };

    this.getArtwork = function() {
        return this.artwork;
    };

    this.setCanvas = function(_canvas) {
        canvas = _canvas;
    };
	
	/**
     * Change the interpolation mode used by Free Transform operations
     * 
     * @param {string} interpolation - Either "sharp" or "smooth"
     */
    this.setTransformInterpolation = function(interpolation) {
        this.artwork.setTransformInterpolation(interpolation);
    };
    
    this.setCurColor = function(color) {
        if (!curColor.isEqual(color)) {
            this.artwork.setForegroundColor(color.getRgb());

            curColor.copyFrom(color);

            this.emitEvent('colorChange', [color]);
        }
    };

    this.getCurColor = function() {
        return curColor.clone();
    };

    this.getCurColorRgb = function() {
        return curColor.getRgb();
    };

    this.setCurColorRgb = function(color) {
        this.setCurColor(new CPColor(color));
    };

    this.setCurGradient = function(gradient) {
        curGradient = gradient.slice(0); // Clone

        this.emitEvent('gradientChange', [curGradient]);
    };

    this.getCurGradient = function() {
        return curGradient.slice(0); // Clone
    };

    this.setBrushSize = function(size) {
        tools[curBrush].size = Math.max(1, Math.min(200, size));
        callToolListeners();
    };

    this.getBrushSize = function() {
        return tools[curBrush].size;
    };

    this.setAlpha = function(alpha) {
        tools[curBrush].alpha = alpha;
        callToolListeners();
    };

    this.getAlpha = function() {
        return tools[curBrush].alpha;
    };

    this.getCurMode = function() {
        return curMode;
    };

    function setMode(newMode) {
        if (curMode != newMode) {
            if (newMode == ChickenPaint.M_TRANSFORM) {
                preTransformMode = curMode;
            }
            curMode = newMode;
            callModeListeners();
        }
    }

    this.getCurTool = function() {
        return curBrush;
    };

    function setTool(tool) {
        setMode(ChickenPaint.M_DRAW);
        curBrush = tool;
        that.artwork.setBrush(tools[tool]);
        callToolListeners();
    }

    this.getBrushInfo = function() {
        return tools[curBrush];
    };
    
    function saveDrawing() {
        var
            saver = new CPResourceSaver({
                artwork: that.getArtwork(),
                rotation: canvas.getRotation90(),
                swatches: mainGUI.getSwatches()
            });
        
        saver.on("savingComplete", function() {
            that.artwork.setHasUnsavedChanges(false);
        });
        
        saver.on("savingFailure", function() {
            alert("An error occured while trying to save your drawing! Please try again!");
        });
        
        saver.save();
    }
    
    function sendDrawing() {
        if (!that.isActionSupported("CPContinue") && !confirm('Are you sure you want to send your drawing to the server and finish drawing now?')) {
            return;
        }
        
        var
            saver = new CPResourceSaver({
                artwork: that.getArtwork(),
                rotation: canvas.getRotation90(),
                swatches: mainGUI.getSwatches(),
                url: options.saveUrl
            }),
            sendDialog = new CPSendDialog(that, uiElem, saver);
        
        saver.on("savingComplete", function() {
            that.artwork.setHasUnsavedChanges(false);
            
            // If we're not allowed to keep editing, we can only go straight to viewing the new post
            if (!that.isActionSupported("CPContinue") && that.isActionSupported("CPPost")) {
                that.actionPerformed({action: "CPPost"});
            }
        });

        // Allow the dialog to show before we begin serialization
        sendDialog.on("shown", function() {
            saver.save();
        });

        sendDialog.show();
    }

    /**
     * Not all saving actions will be supported (depending on what options we're configured with). Use this function
     * to check for support for a given action.
     */
    this.isActionSupported = function(actionName) {
        if (actions[actionName]) {
            var
                supportedType = typeof actions[actionName].isSupported;

            if (supportedType == "function") {
                return actions[actionName].isSupported();
            } else if (supportedType == "undefined") {
                // If not otherwise specified, an action defaults to supported
                return true;
            } else {
                return actions[actionName].isSupported;
            }
        }

        return false;
    };

    this.showLayerNotification = function(layerIndex, message, where) {
        this.emitEvent("layerNotification", [layerIndex, message, where]);
    };
    
    this.actionPerformed = function(e) {
        if (this.artwork == null || canvas == null) {
            return; // this shouldn't happen, but just in case
        }

        var
            action = actions[e.action];

        if (action) {
            if (curMode == ChickenPaint.M_TRANSFORM && (action.modifies.document || action.modifies.mode)
                    && ["CPTransformAccept", "CPTransformReject"].indexOf(e.action) == -1) {
                if (e.action == "CPUndo") {
                    actions.CPTransformReject.action();
                } else if (e.action == "CPTransform") {
                    // You're already transforming the selection!
                } else {
                    // Prompt the user to finish their transform before starting something else
                    var
                        dialog = new CPConfirmTransformDialog(uiElem, this);

                    /* If they decide to finish up with the transform, we can apply the original action they
                     * attempted afterwards.
                     */
                    dialog.on("accept", this.actionPerformed.bind(this, e));
                    dialog.on("reject", this.actionPerformed.bind(this, e));

                    dialog.show();
                }
            } else {
                action.action(e);
            }
        }

        // callCPEventListeners(); TODO
    };

    function installUnsavedWarning() {
        if (isEventSupported("onbeforeunload")) {
            window.addEventListener("beforeunload", function(e) {
                if (that.artwork.getHasUnsavedChanges()) {
                    var
                        confirmMessage = "Your drawing has unsaved changes!";
                    e.returnValue = confirmMessage;
                    return confirmMessage;
                }
            });
        } else {
            // Fall back to just catching links
            $("a").click(function(e) {
                if (this.getAttribute("href") != "#" && that.artwork.getHasUnsavedChanges()) {
                    return confirm("Your drawing has unsaved changes! Are you sure to want to navigate away?");
                }
            });
        }
    }
    
    function startMainGUI(swatches, initialRotation90) {
        mainGUI = new CPMainGUI(that, uiElem);

        setTool(ChickenPaint.T_PEN);
        mainGUI.arrangePalettes();
        
        if (swatches) {
            mainGUI.setSwatches(swatches);
        }
        
        if (initialRotation90) {
            mainGUI.setRotation(initialRotation90 * Math.PI / 2);
        }
        
        CPWacomTablet.getRef().detectTablet();
        
        installUnsavedWarning();
    }
    
    this.getResourcesRoot = function() {
        return options.resourcesRoot;
    };

    if (!isBrowserSupported()) {
        throw new ChickenPaint.UnsupportedBrowserException();
    }

    if (typeof document.body.style.flexBasis != "string" && typeof document.body.style.msFlexDirection != "string" || /Presto/.test(navigator.userAgent)) {
        uiElem.className += " no-flexbox";
    }

    uiElem.className += " chickenpaint";

    options.resourcesRoot = options.resourcesRoot || "chickenpaint/";

    if (options.disableBootstrapAPI) {
        $(document).off('.data-api');
    }

    if (options.loadImageUrl || options.loadChibiFileUrl) {
        var
            loader = new CPResourceLoader(options);
        
        new CPSpashScreen(uiElem, loader, options.resourcesRoot);

        loader.on("loadingComplete", function(resources) {
            that.artwork = resources.layers || resources.flat;
            
            startMainGUI(resources.swatches, options.rotation);
        });

        loader.load();
    } else {
        this.artwork = new CPArtwork(options.canvasWidth || 800, options.canvasHeight || 600);
        this.artwork.addBackgroundLayer();
        
        startMainGUI();
    }
}

ChickenPaint.prototype = Object.create(EventEmitter.prototype);
ChickenPaint.prototype.constructor = ChickenPaint;

ChickenPaint.UnsupportedBrowserException = function() {
};

ChickenPaint.UnsupportedBrowserException.prototype.toString = function() {
    return "Sorry, your web browser does not support ChickenPaint. Please try a modern browser like Chrome, Safari, Firefox, or Edge";
};

//
// Definition of all the modes available
//

ChickenPaint.M_DRAW = 0;
ChickenPaint.M_FLOODFILL = 1;
ChickenPaint.M_RECT_SELECTION = 2;
ChickenPaint.M_MOVE_TOOL = 3;
ChickenPaint.M_ROTATE_CANVAS = 4;
ChickenPaint.M_COLOR_PICKER = 5;
ChickenPaint.M_GRADIENTFILL = 6;
ChickenPaint.M_TRANSFORM = 7;

//
// Definition of all the standard tools available
//
ChickenPaint.T_PENCIL = 0;
ChickenPaint.T_ERASER = 1;
ChickenPaint.T_PEN = 2;
ChickenPaint.T_SOFTERASER = 3;
ChickenPaint.T_AIRBRUSH = 4;
ChickenPaint.T_DODGE = 5;
ChickenPaint.T_BURN = 6;
ChickenPaint.T_WATER = 7;
ChickenPaint.T_BLUR = 8;
ChickenPaint.T_SMUDGE = 9;
ChickenPaint.T_BLENDER = 10;
ChickenPaint.T_MAX = 11;
