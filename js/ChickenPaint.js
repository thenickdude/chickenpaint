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

// core-js Polyfills for the features we use
import "core-js/stable/symbol/index.js";
import "core-js/stable/promise/index.js";
import "core-js/stable/map/index.js";
import "core-js/stable/set/index.js";
import "core-js/stable/typed-array/slice.js";
import "core-js/stable/typed-array/fill.js";
import "core-js/stable/array/iterator.js";
import "core-js/stable/array/fill.js";
import "core-js/stable/string/ends-with.js";

import $ from "jquery";

import "bootstrap";

import "../lib/raf.js";

import CPBrushInfo from "./engine/CPBrushInfo.js";
import CPArtwork from "./engine/CPArtwork.js";
import CPResourceLoader from "./engine/CPResourceLoader.js";
import CPResourceSaver from "./engine/CPResourceSaver.js";

import CPSplashScreen from "./gui/CPSplashScreen.js";

import CPMainGUI from "./gui/CPMainGUI.js";

import CPAboutDialog from "./gui/CPAboutDialog.js";
import CPConfirmTransformDialog from "./gui/CPConfirmTransformDialog.js";
import CPShortcutsDialog from "./gui/CPShortcutsDialog.js";
import CPBoxBlurDialog from "./gui/CPBoxBlurDialog.js";
import CPTabletDialog from "./gui/CPTabletDialog.js";
import CPGridDialog from "./gui/CPGridDialog.js";
import CPSendDialog from "./gui/CPSendDialog.js";

import {isCanvasInterpolationSupported, isEventSupported, isCanvasSupported, isFlexboxSupported} from "./util/CPPolyfill.js";
import CPColor from "./util/CPColor.js";
import CPWacomTablet from "./util/CPWacomTablet.js";
import CPRect from "./util/CPRect.js";

import EventEmitter from "wolfy87-eventemitter";
import {currentLanguage, guessLanguage, setLanguage, _} from "./languages/lang.js";
import CPUserPreferences from "./gui/CPUserPreferences.js";

/* Check for native pointer event support before PEP adds its polyfill */
if (window.PointerEvent) {
    window.hasNativePointerEvents = true;
}

require("pepjs"); // Needs to use require() instead of import so we can run code before it

function checkBrowserSupport() {
    let
        supportsAPIs = isCanvasSupported() && "Uint8Array" in window;

    if (!supportsAPIs) {
        throw new ChickenPaint.UnsupportedBrowserException();
    }

    // iOS 8.0.0 Safari can't upload files
    let
        isIOS8_0_0 = (navigator.userAgent.indexOf("iPad") != -1 || navigator.userAgent.indexOf("iPod") != -1 || navigator.userAgent.indexOf("iPhone") != -1)
            && navigator.userAgent.indexOf(" OS 8_0 ") != -1,
        isSafari = navigator.userAgent.indexOf("CriOS") == -1 && navigator.userAgent.indexOf("Safari") != -1;

    if (isIOS8_0_0 && isSafari) {
        throw new ChickenPaint.UnsupportedBrowserException("You are using Safari 8.0.0, which is unable to upload drawings. That bug was fixed in the iOS 8.0.2 update, or in Chrome for iOS.");
    }

    return true;
}

function isSmallScreen() {
    return $(window).width() < 430 || $(window).height() < 430;
}

function createDrawingTools() {
    let
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
        tip: CPBrushInfo.TIP_ROUND_AA,
        brushMode: CPBrushInfo.BRUSH_MODE_PAINT,
        paintMode: CPBrushInfo.PAINT_MODE_OPACITY
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
        tip: CPBrushInfo.TIP_ROUND_AA,
        brushMode: CPBrushInfo.BRUSH_MODE_ERASE,
        paintMode: CPBrushInfo.PAINT_MODE_OPACITY
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
        tip: CPBrushInfo.TIP_ROUND_AA,
        brushMode: CPBrushInfo.BRUSH_MODE_PAINT,
        paintMode: CPBrushInfo.PAINT_MODE_FLOW,
        alphaScale: 1 / 2
    });

    tools[ChickenPaint.T_SOFTERASER] = new CPBrushInfo({
        toolNb: ChickenPaint.T_SOFTERASER,
        size: 16,
        alpha: 64,
        isAA: false,
        minSpacing: 0.5,
        spacing: 0.05,
        pressureSize: false,
        pressureAlpha: true,
        tip: CPBrushInfo.TIP_ROUND_AIRBRUSH,
        brushMode: CPBrushInfo.BRUSH_MODE_ERASE,
        paintMode: CPBrushInfo.PAINT_MODE_FLOW,
        alphaScale: 1 / 8
    });

    tools[ChickenPaint.T_AIRBRUSH] = new CPBrushInfo({
        toolNb: ChickenPaint.T_AIRBRUSH,
        size: 50,
        alpha: 32,
        isAA: false,
        minSpacing: 0.5,
        spacing: 0.05,
        pressureSize: false,
        pressureAlpha: true,
        tip: CPBrushInfo.TIP_ROUND_AIRBRUSH,
        brushMode: CPBrushInfo.BRUSH_MODE_PAINT,
        paintMode: CPBrushInfo.PAINT_MODE_FLOW,
        alphaScale: 1 / 8
    });

    tools[ChickenPaint.T_DODGE] = new CPBrushInfo({
        toolNb: ChickenPaint.T_DODGE,
        size: 30,
        alpha: 32,
        isAA: false,
        minSpacing: 0.5,
        spacing: 0.05,
        pressureSize: false,
        pressureAlpha: true,
        tip: CPBrushInfo.TIP_ROUND_AIRBRUSH,
        brushMode: CPBrushInfo.BRUSH_MODE_DODGE,
        paintMode: CPBrushInfo.PAINT_MODE_FLOW,
        alphaScale: 1 / 8
    });

    tools[ChickenPaint.T_BURN] = new CPBrushInfo({
        toolNb: ChickenPaint.T_BURN,
        size: 30,
        alpha: 32,
        isAA: false,
        minSpacing: 0.5,
        spacing: 0.05,
        pressureSize: false,
        pressureAlpha: true,
        tip: CPBrushInfo.TIP_ROUND_AIRBRUSH,
        brushMode: CPBrushInfo.BRUSH_MODE_BURN,
        paintMode: CPBrushInfo.PAINT_MODE_FLOW,
        alphaScale: 1 / 8
    });

    tools[ChickenPaint.T_WATER] = new CPBrushInfo({
        toolNb: ChickenPaint.T_WATER,
        size: 30,
        alpha: 70,
        isAA: false,
        minSpacing: 0.5,
        spacing: 0.02,
        pressureSize: false,
        pressureAlpha: true,
        tip: CPBrushInfo.TIP_ROUND_AA,
        brushMode: CPBrushInfo.BRUSH_MODE_WATER,
        paintMode: CPBrushInfo.PAINT_MODE_FLOW,
        alphaScale: 1 / 8,
        resat: 0.3,
        bleed: 0.6
    });

    tools[ChickenPaint.T_BLUR] = new CPBrushInfo({
        toolNb: ChickenPaint.T_BLUR,
        size: 20,
        alpha: 255,
        isAA: false,
        minSpacing: 0.5,
        spacing: 0.05,
        pressureSize: false,
        pressureAlpha: true,
        tip: CPBrushInfo.TIP_ROUND_PIXEL,
        brushMode: CPBrushInfo.BRUSH_MODE_BLUR,
        paintMode: CPBrushInfo.PAINT_MODE_FLOW,
        alphaScale: 1 / 8
    });

    tools[ChickenPaint.T_SMUDGE] = new CPBrushInfo({
        toolNb: ChickenPaint.T_SMUDGE,
        size: 20,
        alpha: 128,
        isAA: false,
        minSpacing: 0.5,
        spacing: 0.01,
        pressureSize: false,
        pressureAlpha: true,
        tip: CPBrushInfo.TIP_ROUND_AIRBRUSH,
        brushMode: CPBrushInfo.BRUSH_MODE_SMUDGE,
        paintMode: CPBrushInfo.PAINT_MODE_FLOW,
        alphaScale: 1 / 8,
        resat: 0.0,
        bleed: 1.0
    });

    tools[ChickenPaint.T_BLENDER] = new CPBrushInfo({
        toolNb: ChickenPaint.T_BLENDER,
        size: 20,
        alpha: 60,
        isAA: false,
        minSpacing: 0.5,
        spacing: 0.1,
        pressureSize: false,
        pressureAlpha: true,
        tip: CPBrushInfo.TIP_ROUND_AIRBRUSH,
        brushMode: CPBrushInfo.BRUSH_MODE_OIL,
        paintMode: CPBrushInfo.PAINT_MODE_FLOW,
        alphaScale: 1 / 8,
        resat: 0.0,
        bleed: 0.07
    });

    return tools;
}

/**
 * @typedef {Object} ChickenPaintOptions
 *
 * @property {Element} uiElem   - DOM element to insert ChickenPaint into
 *
 * @property {Function} [onLoaded] - Callback to call when artwork loading completes
 *
 * @property {int} [canvasWidth]  - Width in pixels to use when creating blank canvases (defaults to 800)
 * @property {int} [canvasHeight] - Height in pixels to use when creating blank canvases (defaults to 600)
 * @property {int} [rotation]     - Integer from [0..3], number of 90 degree right rotations that should be applied to
 *                                the canvas after loading
 *
 * @property {string} [saveUrl]   - URL to POST the drawing to to save it
 * @property {string} [postUrl]   - URL to navigate to after saving is successful and the user chooses to see/publish
 *                                their finished product
 * @property {string} [exitUrl]   - URL to navigate to after saving is successful and the user chooses to exit (optional)
 * @property {string} [testUrl]   - URL that ChickenPaint can simulate a drawing upload to to test the user's
 *                                permissions/connection (optional)
 *
 * @property {string} [loadImageUrl]     - URL of PNG/JPEG image to load for editing (optional)
 * @property {string} [loadChibiFileUrl] - URL of .chi file to load for editing (optional). Used in preference to loadImage.
 * @property {string} [loadSwatchesUrl]  - URL of an .aco palette to load (optional)
 * @property {CPArtwork} [artwork]       - Artwork to load into ChickenPaint (if you've already created one)
 *
 * @property {boolean} [allowMultipleSends] - Allow the drawing to be sent to the server multiple times (saving does not
 *                                          immediately end drawing session).
 * @property {boolean} [allowDownload]      - Allow the drawing to be saved to the user's computer
 *
 * @property {"allow"|"auto"|"force"|"disable"} [fullScreenMode] - Control the behaviour of the full screen option:
 *                                              allow - Don't automatically enter full screen mode, but allow it to be
 *                                                      chosen manually (default)
 *                                              auto - Automatically enter full screen mode on startup on small screens
 *                                              force - Enter full screen mode at startup and do not provide option to leave
 *                                              disable - Don't allow full screen mode at all
 *
 * @property {boolean} [disableBootstrapAPI] - Disable Bootstrap's data API on the root of the document. This speeds up
 *                                           things considerably.
 *
 * @property {string} resourcesRoot - URL to the directory that contains the gfx/css etc directories (relative to the
 *                                    page that ChickenPaint is loaded on)
 *                                    
 * @property {string} [language] - Provide an explicit ISO language code here (e.g. "ja_JP") to override the guessed browser language
 *                               Unsupported languages will fall back to English.
 *                               Currently only "en" and "ja" are available.
 */

/**
 * Creates an instance of the ChickenPaint drawing app with the specified options.
 *
 * @param {ChickenPaintOptions} options
 *
 * @throws ChickenPaint.UnsupportedBrowserException if the web browser does not support ChickenPaint
 */
export default function ChickenPaint(options) {
    guessLanguage();

    if (options.language) {
        setLanguage(options.language);
    }
    
    let
        that = this,

        uiElem = options.uiElem,

	    /**
         * @type {CPCanvas}
         */
        canvas,

	    /**
         * @type {CPMainGUI}
         */
        mainGUI,

	    /**
         *
         * @type {CPColor}
         */
        curColor = new CPColor(0),
        curMaskColor = 0xFF,

        colorMode = ChickenPaint.COLOR_MODE_RGB,

        curBrush = ChickenPaint.T_PENCIL,
        curMode = ChickenPaint.M_DRAW,
        preTransformMode = curMode,
        curGradient = [0xFF000000, 0xFFFFFFFF],

        smallScreenMode = false,
        isFullScreen = false,

        tools = createDrawingTools(),
        
        preferences = new CPUserPreferences(),

        boxBlurDialog, gridDialog,

        actions = {
            // GUI actions

            CPFullScreen: {
                action: function () {
                    that.setFullScreen(!isFullScreen);
                },
                isSupported: function() {
                    return !(
                        options.fullScreenMode === "disable" || options.fullScreenMode === "force" 
                        || options.allowFullScreen === false /* For backwards compat */
                    );
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
            CPToolbarStyle: {
                action: function() {
                    that.setToolbarStyle(preferences.toolbarStyle === "new" ? "old" : "new");
                },
                modifies: {gui: true}
            },

            // History actions

            CPUndo: {
                action: function () {
                    that.artwork.undo();
                },
                modifies: {document: true},
                allowed: "isUndoAllowed"
            },
            CPRedo: {
                action: function () {
                    that.artwork.redo();
                },
                modifies: {document: true},
                allowed: "isRedoAllowed"
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
            CPPanCanvas:     new ModeChangeAction(ChickenPaint.M_PAN_CANVAS),
            CPColorPicker:   new ModeChangeAction(ChickenPaint.M_COLOR_PICKER),

            // Layer transform

            CPTransform: {
                action: function () {
                    let
                        layer = that.artwork.getActiveLayer();

                    if (!layer.visible) {
                        that.showLayerNotification(layer, "Whoops! This layer is currently hidden", "layer");
                    } else if (layer.alpha == 0) {
                        that.showLayerNotification(layer, "Whoops! This layer's opacity is currently 0%", "opacity");
                    } else if (that.artwork.transformAffineBegin() == null) {
                        that.showLayerNotification(layer, "Whoops! All of the selected pixels are transparent!", "layer");
                    } else {
                        setMode(ChickenPaint.M_TRANSFORM);
                    }
                },
                modifies: {mode: true},
                allowed: function() {
                    return that.artwork.getActiveLayer().getEffectiveAlpha() != 0;
                }
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
                    tools[curBrush].strokeMode = CPBrushInfo.STROKE_MODE_FREEHAND;
                    callToolListeners();
                },
                modifies: {tool: true}
            },
            CPLine: {
                action: function () {
                    tools[curBrush].strokeMode = CPBrushInfo.STROKE_MODE_LINE;
                    callToolListeners();
                },
                modifies: {tool: true}
            },
            CPBezier: {
                action: function () {
                    tools[curBrush].strokeMode = CPBrushInfo.STROKE_MODE_BEZIER;
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
                    that.artwork.mergeDown();
                },
                modifies: {document: true},
                allowed: "isMergeDownAllowed"
            },
            CPGroupMerge: {
                action: function () {
                    that.artwork.mergeGroup();
                },
                modifies: {document: true},
                allowed: "isMergeGroupAllowed"
            },
            CPLayerMergeAll: {
                action: function () {
                    that.artwork.mergeAllLayers();
                },
                modifies: {document: true},
                allowed: "isMergeAllLayersAllowed"
            },
            CPExpandLayerGroup: {
                action: function (e) {
                    that.artwork.expandLayerGroup(e.group, e.expand);
                },
                modifies: {document: true}
            },
            CPFill: {
                action: function () {
                    that.artwork.fill(that.getCurColor().getRgb() | 0xff000000);
                },
                modifies: {document: true},
                requiresDrawable: true
            },
            CPClear: {
                action: function () {
                    that.artwork.clear();
                },
                modifies: {document: true},
                requiresDrawable: true
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
                modifies: {document: true},
                requiresDrawable: true // TODO
            },
            CPVFlip: {
                action: function () {
                    that.artwork.vFlip();
                },
                modifies: {document: true},
                requiresDrawable: true //TODO
            },
            CPMNoise: {
                action: function () {
                    that.artwork.monochromaticNoise();
                },
                modifies: {document: true},
                requiresDrawable: true
            },
            CPCNoise: {
                action: function () {
                    that.artwork.colorNoise();
                },
                modifies: {document: true},
                allowed: "isColorNoiseAllowed"
            },
            CPFXBoxBlur: {
                action: function () {
                    showBoxBlurDialog();
                },
                modifies: {document: true},
                requiresDrawable: true
            },
            CPFXInvert: {
                action: function () {
                    that.artwork.invert();
                },
                modifies: {document: true},
                requiresDrawable: true
            },

            CPCut: {
                action: function () {
                    that.artwork.cutSelection();
                },
                modifies: {document: true},
                requiresDrawable: true,
                allowed: "isCutSelectionAllowed"
            },
            CPCopy: {
                action: function () {
                    that.artwork.copySelection();
                },
                modifies: {document: true},
                requiresDrawable: true,
                allowed: "isCopySelectionAllowed"
            },
            CPCopyMerged: {
                action: function () {
                    that.artwork.copySelectionMerged();
                },
                modifies: {document: true},
                allowed: "isCopySelectionMergedAllowed"
            },
            CPPaste: {
                action: function () {
                    that.artwork.pasteClipboard();
                },
                modifies: {document: true},
                allowed: "isPasteClipboardAllowed"
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
                    that.artwork.addLayer("layer");
                },
                modifies: {document: true}
            },
            CPAddGroup: {
                action: function() {
                    that.artwork.addLayer("group");
                },
                modifies: {document: true}
            },
            CPAddLayerMask: {
                action: function() {
                    that.artwork.addLayerMask();
                },
                modifies: {document: true},
                allowed: "isAddLayerMaskAllowed"
            },
            CPApplyLayerMask: {
                action: function() {
                    that.artwork.applyLayerMask(true);
                },
                modifies: {document: true},
                allowed: "isApplyLayerMaskAllowed"
            },
            CPRemoveLayerMask: {
                action: function() {
                    that.artwork.removeLayerMask(false);
                },
                modifies: {document: true},
                allowed: "isRemoveLayerMaskAllowed"
            },
            CPRemoveLayer: {
                action: function() {
                    if (!that.artwork.removeLayer()) {
                        alert("Sorry, you can't remove the last remaining layer in the drawing.");
                    }
                },
                modifies: {document: true},
                allowed: "isRemoveLayerAllowed"
            },
            CPCreateClippingMask: {
                action: function() {
                    that.artwork.createClippingMask();
                },
                modifies: {document: true},
                allowed: "isCreateClippingMaskAllowed"
            },
            CPReleaseClippingMask: {
                action: function() {
                    that.artwork.releaseClippingMask();
                },
                modifies: {document: true},
                allowed: "isReleaseClippingMaskAllowed"
            },
            CPRelocateLayer: {
                action: function(e) {
                    that.artwork.relocateLayer(e.layer, e.toGroup, e.toIndex);
                },
                modifies: {document: true}
            },
            CPSetActiveLayer: {
                action: function(e) {
                    // Enable disabled layer masks when clicked on
                    if (e.mask && e.layer.mask && !e.layer.maskVisible) {
                        that.artwork.setLayerMaskVisible(e.layer, true);
                    }

                    that.artwork.setActiveLayer(e.layer, e.mask);

                    // Since this is a slow GUI operation, this is a good chance to get the canvas ready for drawing
                    that.artwork.performIdleTasks();
                },
                modifies: {document: true}
            },
            CPToggleMaskView: {
                action: function() {
                    let
                        newView = that.artwork.toggleMaskView();

                    if (newView) {
                        that.emitEvent("maskViewOpened", [newView]);
                    }
                },
                modifies: {gui: true}
            },
	        CPSetMaskVisible: {
		        action: function(e) {
			        that.artwork.setLayerMaskVisible(e.layer, e.visible);
		        },
		        modifies: {layerProp: true}
	        },
            CPSetLayerVisibility: {
                action: function(e) {
                    that.artwork.setLayerVisibility(e.layer, e.visible);
                },
                modifies: {layerProp: true}
            },
            CPSetLayerName: {
                action: function(e) {
                    that.artwork.setLayerName(e.layer, e.name);
                },
                modifies: {layerProp: true}
            },
            CPSetLayerBlendMode: {
                action: function(e) {
                    that.artwork.setLayerBlendMode(e.blendMode);
                },
                modifies: {layerProp: true}
            },
            CPSetLayerAlpha: {
                action: function(e) {
                    that.artwork.setLayerAlpha(e.alpha);
                },
                modifies: {layerProp: true}
            },
            CPSetLayerLockAlpha: {
                action: function(e) {
                    that.artwork.setLayerLockAlpha(e.lock);
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

    ToolChangeAction.prototype.requiresDrawable = true;

    function ModeChangeAction(modeNum) {
        this.modeNum = modeNum;
    }

    ModeChangeAction.prototype.action = function() {
        setMode(this.modeNum);
    };
    ModeChangeAction.prototype.modifies = {mode: true};

    function onEditModeChanged(newMode) {
        colorMode = (newMode == CPArtwork.EDITING_MODE_IMAGE ? ChickenPaint.COLOR_MODE_RGB : ChickenPaint.COLOR_MODE_GREYSCALE);

        that.emitEvent("colorModeChange", [newMode == CPArtwork.EDITING_MODE_IMAGE ? "rgb" : "greyscale"]);

        let
            newColor;

        switch (colorMode) {
            case ChickenPaint.COLOR_MODE_RGB:
                newColor = curColor.clone();
            break;
            case ChickenPaint.COLOR_MODE_GREYSCALE:
                newColor = new CPColor(CPColor.greyToRGB(curMaskColor));
            break;
        }

        that.artwork.setForegroundColor(newColor.getRgb());
        that.emitEvent('colorChange', [newColor]);
    }

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

	/**
     * @returns {CPArtwork}
     */
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

	/**
     *
     * @param {CPColor} color
     */
    this.setCurColor = function(color) {
        switch (colorMode) {
            case ChickenPaint.COLOR_MODE_RGB:
                if (!curColor.isEqual(color)) {
                    curColor.copyFrom(color);

                    this.artwork.setForegroundColor(color.getRgb());

                    this.emitEvent('colorChange', [color]);
                }
            break;
            case ChickenPaint.COLOR_MODE_GREYSCALE:
                let
                    grey = color.getValue();

                if (curMaskColor != grey) {
                    let
                        greyRGB = CPColor.greyToRGB(grey);

                    this.artwork.setForegroundColor(greyRGB);
            
                    curMaskColor = grey;

                    this.emitEvent('colorChange', [new CPColor(greyRGB)]);
                }
            break;
        }
    };

	/**
     * @returns {CPColor}
     */
    this.getCurColor = function() {
        switch (colorMode) {
            case ChickenPaint.COLOR_MODE_RGB:
                return curColor.clone();
            case ChickenPaint.COLOR_MODE_GREYSCALE:
                return new CPColor(CPColor.greyToRGB(curMaskColor));
        }
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
        let
            saver = new CPResourceSaver({
                artwork: that.getArtwork(),
                rotation: canvas.getRotation90(),
                swatches: mainGUI.getSwatches()
            });

        saver.on("savingComplete", function() {
            that.artwork.setHasUnsavedChanges(false);
        });
        
        saver.on("savingFailure", function() {
            alert(_("Sorry, your drawing could not be saved, please try again later."));
        });
        
        saver.save();
    }
    
    function sendDrawing() {
        if (!that.isActionSupported("CPContinue") && !confirm(_('Are you sure you want to send your drawing to the server and finish drawing now?'))) {
            return;
        }

        let
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

        saver.on("savingFailure", function() {
            alert(_("Sorry, your drawing could not be saved, please try again later."));
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
     *
     * @param {string} actionName
     * @returns {boolean}
     */
    this.isActionSupported = function(actionName) {
        if (actions[actionName]) {
            let
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

	/**
     * Check if a given action is allowed at the moment (e.g. in the current mode and with the current layer selected).
     *
     * @param actionName
     */
    this.isActionAllowed = function(actionName) {
        let
            action = actions[actionName];

        if (!action) {
            return false;
        } else if (typeof action.allowed == "function") {
            return action.allowed();
        } else if (typeof action.allowed == "string") {
            return this.artwork[action.allowed]();
        } else {
            return !action.requiresDrawable || this.artwork.isActiveLayerDrawable();
        }
    };

    this.showLayerNotification = function(layer, message, where) {
        this.emitEvent("layerNotification", [layer, message, where]);
    };
    
    this.actionPerformed = function(e) {
        if (this.artwork == null || canvas == null) {
            return; // this shouldn't happen, but just in case
        }

        let
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
                    let
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
    
    this.setSmallScreenMode = function(small) {
        if (smallScreenMode !== small) {
            smallScreenMode = small;

            $(uiElem).toggleClass("chickenpaint-small-screen", smallScreenMode);
            that.emitEvent("smallScreen", [smallScreenMode]);
        }
    };
    
    this.getSmallScreenMode = function() {
        return smallScreenMode;
    };

    this.setFullScreen = function(newVal) {
        if (isFullScreen !== newVal) {
            isFullScreen = newVal;

            $("body").toggleClass("chickenpaint-full-screen", isFullScreen);
            $(uiElem).toggleClass("chickenpaint-full-screen", isFullScreen);

            if (isFullScreen && $("head meta[name=viewport]").length === 0) {
                // Reset page zoom to zero if the host page didn't already set a viewport
                $("head").append('<meta name="viewport" content="width=device-width,user-scalable=no">');
                
                // Give the browser time to adjust the viewport before we adapt to the new size
                setTimeout(() => that.emitEvent("fullScreen", [isFullScreen]), 200);
            } else {
                that.emitEvent("fullScreen", [isFullScreen]);
            }
        }
    };
    
    this.isFullScreen = function() {
        return isFullScreen;
    }
    
    this.setToolbarStyle = function(styleName) {
        preferences.set("toolbarStyle", styleName);
        preferences.save(); // Eager save, so we don't lose it upon a crash
    };
    
    this.getToolbarStyle = function() {
        return preferences.get("toolbarStyle");
    };
    
    function installUnsavedWarning() {
        if (isEventSupported("onbeforeunload")) {
            window.addEventListener("beforeunload", function(e) {
                if (that.artwork.getHasUnsavedChanges()) {
                    let
                        confirmMessage = "Your drawing has unsaved changes!";
                    e.returnValue = confirmMessage;
                    return confirmMessage;
                }
            });
        } else {
            // Fall back to just catching links
            $("a").on('click',function(e) {
                if (this.getAttribute("href") != "#" && that.artwork.getHasUnsavedChanges()) {
                    return confirm("Your drawing has unsaved changes! Are you sure to want to navigate away?");
                }
            });
        }
    }
    
    function startMainGUI(swatches, initialRotation90) {
        if (!uiElem) {
            return;
        }

        // Prevent double-click iOS page zoom events
        uiElem.addEventListener("dblclick", function(e){ 
            e.preventDefault(); 
            e.stopPropagation();
        });

        that.artwork.on("editModeChanged", onEditModeChanged);

        mainGUI = new CPMainGUI(that, uiElem);
        
        that.emitEvent("fullScreen", [isFullScreen]);
        that.emitEvent("smallScreen", [smallScreenMode]);
        
        preferences.load();
        
        setTool(ChickenPaint.T_PEN);
        mainGUI.arrangePalettes();
        
        if (swatches) {
            mainGUI.setSwatches(swatches);
        }
        
        if (initialRotation90) {
            mainGUI.setRotation90(initialRotation90);
        }
        
        CPWacomTablet.getRef().detectTablet();
        
        installUnsavedWarning();

        that.artwork.on("unsavedChanges", unsavedChanges => {
            // Only bug users to save if they can actually save multiple times per session.
            // Otherwise they'll save when they're done with their drawing and not before:
            if (options.allowMultipleSends) {
                that.emitEvent("unsavedChanges", [unsavedChanges])
            }
        });
    }
    
    this.getResourcesRoot = function() {
        return options.resourcesRoot;
    };

    checkBrowserSupport();

    if (uiElem) {
        if (!isFlexboxSupported()) {
            uiElem.className += " no-flexbox";
        }

        uiElem.className += " chickenpaint chickenpaint-lang-" + currentLanguage();
    }

    options.resourcesRoot = options.resourcesRoot || "chickenpaint/";

    if (options.disableBootstrapAPI) {
        $(document).off('.data-api');
    }
    
    this.setSmallScreenMode(isSmallScreen());
    
    switch (options.fullScreenMode) {
        case "force":
            this.setFullScreen(true);
            break;
        case "auto":
            this.setFullScreen(smallScreenMode);
            break;
    }
    
    preferences.on("toolbarStyle", newStyle => this.emitEvent("toolbarStyleChange", [newStyle]));

    if (options.loadImageUrl || options.loadChibiFileUrl) {
        let
            loader = new CPResourceLoader(options);

        new CPSplashScreen(uiElem, loader, options.resourcesRoot);

        loader.on("loadingComplete", function(resources) {
            that.artwork = resources.layers || resources.flat;
            
            startMainGUI(resources.swatches, options.rotation);
            if (options.onLoaded) {
                options.onLoaded(this);
            }
        });

        loader.load();
    } else {
        if (options.artwork) {
            this.artwork = options.artwork;
        } else {
            this.artwork = new CPArtwork(options.canvasWidth || 800, options.canvasHeight || 600);
            this.artwork.addBackgroundLayer();
        }

        startMainGUI();
        
        if (options.onLoaded) {
            options.onLoaded(this);
        }
    }
}

ChickenPaint.prototype = Object.create(EventEmitter.prototype);
ChickenPaint.prototype.constructor = ChickenPaint;

ChickenPaint.UnsupportedBrowserException = function(message) {
    this.message = message;
};

ChickenPaint.UnsupportedBrowserException.prototype.toString = function() {
    let
        msg = "Sorry, your web browser does not support ChickenPaint.";

    if (this.message) {
        msg += " " + this.message;
    } else {
        msg += " Please try a modern browser like Chrome, Safari, Firefox, or Edge.";
    }
    
    return msg;
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
ChickenPaint.M_PAN_CANVAS = 8;

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

ChickenPaint.COLOR_MODE_RGB = 0;
ChickenPaint.COLOR_MODE_GREYSCALE = 1;