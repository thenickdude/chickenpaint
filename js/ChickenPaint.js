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
import CPChibiFile from "./engine/CPChibiFile";
import CPArtwork from "./engine/CPArtwork";

import CPMainGUI from "./gui/CPMainGUI";
import CPAboutDialog from "./gui/CPAboutDialog";
import CPBoxBlurDialog from "./gui/CPBoxBlurDialog";
import CPTabletDialog from "./gui/CPTabletDialog";
import CPGridDialog from "./gui/CPTabletDialog";

import CPColor from "./util/CPColor";
import CPWacomTablet from "./util/CPWacomTablet";

export default function ChickenPaint(uiElem, arrayBuffer) {
    var
        VERSION_STRING = "0.1.0";
    
    var
        that = this,
        
        canvas,
        mainGUI,
        
        curColor = new CPColor(0),
    
        curBrush = ChickenPaint.T_PENCIL,
        curMode = ChickenPaint.M_DRAW,
        
        tools = [],
        
        boxBlurDialog, gridDialog;
    
    function createTools() {
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
    }
    
    function showAboutDialog() {
        new CPAboutDialog(uiElem).show();
    }

    function showTabletDialog() {
        new CPTabletDialog(uiElem).show();
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
    }
    
    function callModeListeners() {
        that.emitEvent('modeChange', [curMode]);
    }

    function callViewListeners(viewInfo) {
        that.emitEvent('viewChange', [viewInfo]);
    }

    this.getArtwork = function() {
        return this.artwork;
    };
    
    this.setCanvas = function(_canvas) {
        canvas = _canvas;
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

    function setMode(mode) {
        curMode = mode;
        callModeListeners();
    }
    
    function setTool(tool) {
        setMode(ChickenPaint.M_DRAW);
        curBrush = tool;
        that.artwork.setBrush(tools[tool]);
        callToolListeners();
    }
    
    this.getBrushInfo = function() {
        return tools[curBrush];
    }
    
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
    
    function saveDrawing() {
        var
            rotation = Math.round(canvas.getRotation() / Math.PI * 2);

        // Just in case:
        rotation %= 4;

        // We want [0..3] as output
        if (rotation < 0) {
            rotation += 4;
        }
        
        var
            png = binaryStringToByteArray(that.artwork.getFlatPNG(rotation)),

            blob = new Blob([png], {type: "image/png"});
        
        window.saveAs(blob, "oekaki.png");
        
        if (!that.artwork.isSimpleDrawing()) {
            var
                chibiFile = new CPChibiFile();
            
            blob = chibiFile.serialize(that.artwork);
            
            window.saveAs(blob, "oekaki.chi");
        }
    }
    
    this.actionPerformed = function(e) {
        if (this.artwork == null || canvas == null) {
            return; // this shouldn't happen but just in case
        }

        switch (e.action) {
            case "CPZoomIn":
                canvas.zoomIn();
            break;
            case "CPZoomOut":
                canvas.zoomOut();
            break;
            case "CPZoom100":
                canvas.zoom100();
            break;
            case "CPUndo":
                this.artwork.undo();
            break;
            case "CPRedo":
                this.artwork.redo();
            break;
            case "CPClearHistory":
                if (confirm("You're about to clear the current Undo/Redo history.\nThis operation cannot be undone, are you sure you want to do that?")) {
                    this.artwork.clearHistory();
                }
            break;
            case "CPPencil":
                setTool(ChickenPaint.T_PENCIL);
            break;
            case "CPPen":
                setTool(ChickenPaint.T_PEN);
            break;
            case "CPEraser":
                setTool(ChickenPaint.T_ERASER);
            break;
            case "CPSoftEraser":
                setTool(ChickenPaint.T_SOFTERASER);
            break;
            case "CPAirbrush":
                setTool(ChickenPaint.T_AIRBRUSH);
            break;
            case "CPDodge":
                setTool(ChickenPaint.T_DODGE);
            break;
            case "CPBurn":
                setTool(ChickenPaint.T_BURN);
            break;
            case "CPWater":
                setTool(ChickenPaint.T_WATER);
            break;
            case "CPBlur":
                setTool(ChickenPaint.T_BLUR);
            break;
            case "CPSmudge":
                setTool(ChickenPaint.T_SMUDGE);
            break;
            case "CPBlender":
                setTool(ChickenPaint.T_BLENDER);
            break;
    
            // Modes
    
            case "CPFloodFill":
                setMode(ChickenPaint.M_FLOODFILL);
            break;
            case "CPRectSelection":
                setMode(ChickenPaint.M_RECT_SELECTION);
            break;
            case "CPMoveTool":
                setMode(ChickenPaint.M_MOVE_TOOL);
            break;
            case "CPRotateCanvas":
                setMode(ChickenPaint.M_ROTATE_CANVAS);
            break;
            case "CPColorPicker":
                setMode(ChickenPaint.M_COLOR_PICKER);
            break;
    
            // Stroke modes
    
            case "CPFreeHand":
                tools[curBrush].strokeMode = CPBrushInfo.SM_FREEHAND;
                callToolListeners();
            break;
            case "CPLine":
                tools[curBrush].strokeMode = CPBrushInfo.SM_LINE;
                callToolListeners();
            break;
            case "CPBezier":
                tools[curBrush].strokeMode = CPBrushInfo.SM_BEZIER;
                callToolListeners();
            break;
    
            case "CPAbout":
                showAboutDialog();
            break;
            case "CPTabletSupport":
                showTabletDialog();
            break;
    
            // Layers actions
    
            case "CPLayerDuplicate":
                this.artwork.duplicateLayer();
            break;
            case "CPLayerMergeDown":
                this.artwork.mergeDown(true);
            break;
            case "CPLayerMergeAll":
                this.artwork.mergeAllLayers(true);
            break;
            case "CPFill":
                this.artwork.fill(getCurColorRgb() | 0xff000000);
            break;
            case "CPClear":
                this.artwork.clear();
            break;
            case "CPSelectAll":
                this.artwork.rectangleSelection(this.artwork.getSize());
                canvas.repaintAll();
            break;
            case "CPDeselectAll":
                this.artwork.rectangleSelection(new CPRect());
                canvas.repaintAll();
            break;
            case "CPHFlip":
                this.artwork.hFlip();
            break;
            case "CPVFlip":
                this.artwork.vFlip();
            break;
            case "CPMNoise":
                this.artwork.monochromaticNoise();
            break;
            case "CPCNoise":
                this.artwork.colorNoise();
            break;
            case "CPFXBoxBlur":
                showBoxBlurDialog();
            break;
            case "CPFXInvert":
                this.artwork.invert();
            break;
            case "CPCut":
                this.artwork.cutSelection(true);
            break;
            case "CPCopy":
                this.artwork.copySelection();
            break;
            case "CPCopyMerged":
                this.artwork.copySelectionMerged();
            break;
            case "CPPaste":
                this.artwork.pasteClipboard(true);
            break;
            case "CPLinearInterpolation":
                canvas.setInterpolation(e.selected);
            break;
            case "CPToggleGrid":
                canvas.showGrid(e.selected);
            break;
            case "CPGridOptions":
                showGridOptionsDialog();
            break;
            case "CPResetCanvasRotation":
                canvas.resetRotation();
            break;
            case "CPPalColor":
                mainGUI.showPalette("color", e.selected);
            break;
            case "CPPalBrush":
                mainGUI.showPalette("brush", e.selected);
            break;
            case "CPPalLayers":
                mainGUI.showPalette("layers", e.selected);
            break;
            case "CPPalStroke":
                mainGUI.showPalette("stroke", e.selected);
            break;
            case "CPPalSwatches":
                mainGUI.showPalette("swatches", e.selected);
            break;
            case "CPPalTool":
                mainGUI.showPalette("tool", e.selected);
            break;    
            case "CPPalMisc":
                mainGUI.showPalette("misc", e.selected);
            break;
            case "CPPalTextures":
                mainGUI.showPalette("textures", e.selected);
            break;
            case "CPTogglePalettes":
                mainGUI.togglePalettes();
            break;
            case "CPArrangePalettes":
                mainGUI.arrangePalettes();
            break;
            case "CPSave":
                saveDrawing();
            break;
        }
        
        // callCPEventListeners(); TODO
    };
    
    createTools();
    
    if (arrayBuffer) {
        var 
            chibiReader = new CPChibiFile();
        
        this.artwork = chibiReader.read(arrayBuffer);
    }
    
    if (!this.artwork) {
        this.artwork = new CPArtwork(800, 600);
        this.artwork.addBackgroundLayer();
    }
    
    mainGUI = new CPMainGUI(this, uiElem);
    
    setTool(ChickenPaint.T_PEN);
    
    mainGUI.arrangePalettes();
    
    CPWacomTablet.getRef().detectTablet();
}

ChickenPaint.prototype = Object.create(EventEmitter.prototype);
ChickenPaint.prototype.constructor = ChickenPaint;

//
// Definition of all the modes available
//

ChickenPaint.M_DRAW = 0;
ChickenPaint.M_FLOODFILL = 1;
ChickenPaint.M_RECT_SELECTION = 2;
ChickenPaint.M_MOVE_TOOL = 3;
ChickenPaint.M_ROTATE_CANVAS = 4;
ChickenPaint.M_COLOR_PICKER = 5;

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