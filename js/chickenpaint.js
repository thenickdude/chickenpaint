function ChickenPaint(uiElem, arrayBuffer) {
    "use strict";
    
    var
        //
        // Definition of all the standard tools available
        //
        T_PENCIL = 0,
        T_ERASER = 1,
        T_PEN = 2,
        T_SOFTERASER = 3,
        T_AIRBRUSH = 4,
        T_DODGE = 5,
        T_BURN = 6,
        T_WATER = 7,
        T_BLUR = 8,
        T_SMUDGE = 9,
        T_BLENDER = 10,
        T_MAX = 11,
        
        //
        // Definition of all the modes available
        //
        M_DRAW = 0,
        M_FLOODFILL = 1,
        M_RECT_SELECTION = 2,
        M_MOVE_TOOL = 3,
        M_ROTATE_CANVAS = 4,
        M_COLOR_PICKER = 5;
    
    var
        that = this,
        
        canvas,
        
        curColor = new CPColor(),
    
        curBrush = T_PENCIL,
        curMode = M_DRAW,
        
        tools = [];
    
    function createTools() {
        tools = new Array(T_MAX);
        
        tools[T_PENCIL] = new CPBrushInfo({
            toolNb: T_PENCIL,
            size: 16,
            alpha: 255,
            isAA: true,
            minSpacing: 0.5,
            spacing: 0.05,
            pressureSize: false,
            pressureAlpha: true,
            brushType: CPBrushInfo.B_ROUND_AA,
            paintMode: CPBrushInfo.M_PAINT
        });
        
        tools[T_ERASER] = new CPBrushInfo({
            toolNb: T_ERASER,
            size: 16,
            alpha: 255,
            isAA: true,
            minSpacing: 0.5,
            spacing: 0.05,
            pressureSize: false,
            pressureAlpha: false,
            brushType: CPBrushInfo.B_ROUND_AA,
            paintMode: CPBrushInfo.M_ERASE
        });
        
        tools[T_PEN] = new CPBrushInfo({
            toolNb: T_PEN,
            size: 2,
            alpha: 128,
            isAA: true,
            minSpacing: 0.5,
            spacing: 0.05,
            pressureSize: true,
            pressureAlpha: false,
            brushType: CPBrushInfo.B_ROUND_AA,
            paintMode: CPBrushInfo.M_PAINT
        });
        
        tools[T_SOFTERASER] = new CPBrushInfo({
            toolNb: T_SOFTERASER,
            size: 16,
            alpha: 64,
            isAA: false,
            isAirbrush: true,
            minSpacing: 0.5,
            spacing: 0.05,
            pressureSize: false,
            pressureAlpha: true,
            brushType: CPBrushInfo.B_ROUND_AIRBRUSH,
            paintMode: CPBrushInfo.M_ERASE
        });
        
        tools[T_AIRBRUSH] = new CPBrushInfo({
            toolNb: T_AIRBRUSH,
            size: 50,
            alpha: 32,
            isAA: false,
            isAirbrush: true,
            minSpacing: 0.5,
            spacing: 0.05,
            pressureSize: false,
            pressureAlpha: true,
            brushType: CPBrushInfo.B_ROUND_AIRBRUSH,
            paintMode: CPBrushInfo.M_PAINT
        });
        
        tools[T_DODGE] = new CPBrushInfo({
            toolNb: T_DODGE,
            size: 30,
            alpha: 32,
            isAA: false,
            isAirbrush: true,
            minSpacing: 0.5,
            spacing: 0.05,
            pressureSize: false,
            pressureAlpha: true,
            brushType: CPBrushInfo.B_ROUND_AIRBRUSH,
            paintMode: CPBrushInfo.M_DODGE
        });
        
        tools[T_BURN] = new CPBrushInfo({
            toolNb: T_BURN,
            size: 30,
            alpha: 32,
            isAA: false,
            isAirbrush: true,
            minSpacing: 0.5,
            spacing: 0.05,
            pressureSize: false,
            pressureAlpha: true,
            brushType: CPBrushInfo.B_ROUND_AIRBRUSH,
            paintMode: CPBrushInfo.M_BURN
        });
        
        tools[T_WATER] = new CPBrushInfo({
            toolNb: T_WATER,
            size: 30,
            alpha: 70,
            isAA: false,
            isAirbrush: true,
            minSpacing: 0.5,
            spacing: 0.02,
            pressureSize: false,
            pressureAlpha: true,
            brushType: CPBrushInfo.B_ROUND_AA,
            paintMode: CPBrushInfo.M_WATER,
            resat: 0.3,
            bleed: 0.6
        });
        
        tools[T_BLUR] = new CPBrushInfo({
            toolNb: T_BLUR,
            size: 20,
            alpha: 255,
            isAA: false,
            isAirbrush: true,
            minSpacing: 0.5,
            spacing: 0.05,
            pressureSize: false,
            pressureAlpha: true,
            brushType: CPBrushInfo.B_ROUND_PIXEL,
            paintMode: CPBrushInfo.M_BLUR
        });
        
        tools[T_SMUDGE] = new CPBrushInfo({
            toolNb: T_SMUDGE,
            size: 20,
            alpha: 128,
            isAA: false,
            isAirbrush: true,
            minSpacing: 0.5,
            spacing: 0.01,
            pressureSize: false,
            pressureAlpha: true,
            brushType: CPBrushInfo.B_ROUND_AIRBRUSH,
            paintMode: CPBrushInfo.M_SMUDGE,
            resat: 0.0,
            bleed: 1.0
        });
        
        tools[T_BLENDER] = new CPBrushInfo({
            toolNb: T_BLENDER,
            size: 20,
            alpha: 60,
            isAA: false,
            isAirbrush: true,
            minSpacing: 0.5,
            spacing: 0.1,
            pressureSize: false,
            pressureAlpha: true,
            brushType: CPBrushInfo.B_ROUND_AIRBRUSH,
            paintMode: CPBrushInfo.M_OIL,
            resat: 0.0,
            bleed: 0.07
        });
    }
    
    function callToolListeners() {
        that.emitEvent('toolChange', [curBrush, tools[curBrush]]);
    }
    
    function callModeListeners() {
        that.emitEvent('modeChange', [curMode]);
    }

    function callViewListeners(viewInfo) {
        that.emitEvent('viewChange', [viewInfo]);
    }

    curColor.setRgb(0);
    
    createTools();
    
    if (arrayBuffer) {
        var 
            chibiReader = new CPChibiFile();
        
        this.artwork = chibiReader.read(arrayBuffer);
    }
    
    if (!this.artwork) {
        this.artwork = new CPArtwork(800, 600);
        this.artwork.addEmptyLayer();
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

    function setMode(mode) {
        curMode = mode;
        callModeListeners();
    }
    
    function setTool(tool) {
        setMode(M_DRAW);
        curBrush = tool;
        that.artwork.setBrush(tools[tool]);
        callToolListeners();
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
                setTool(T_PENCIL);
            break;
            case "CPPen":
                setTool(T_PEN);
            break;
            case "CPEraser":
                setTool(T_ERASER);
            break;
            case "CPSoftEraser":
                setTool(T_SOFTERASER);
            break;
            case "CPAirbrush":
                setTool(T_AIRBRUSH);
            break;
            case "CPDodge":
                setTool(T_DODGE);
            break;
            case "CPBurn":
                setTool(T_BURN);
            break;
            case "CPWater":
                setTool(T_WATER);
            break;
            case "CPBlur":
                setTool(T_BLUR);
            break;
            case "CPSmudge":
                setTool(T_SMUDGE);
            break;
            case "CPBlender":
                setTool(T_BLENDER);
            break;
    
            // Modes
    
            case "CPFloodFill":
                setMode(M_FLOODFILL);
            break;
            case "CPRectSelection":
                setMode(M_RECT_SELECTION);
            break;
            case "CPMoveTool":
                setMode(M_MOVE_TOOL);
            break;
            case "CPRotateCanvas":
                setMode(M_ROTATE_CANVAS);
            break;
            case "CPColorPicker":
                setMode(M_COLOR_PICKER);
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
                alert("ChibiPaint by Codexus\n" + "Version "
                        + VERSION_STRING + "\n\n" + "Copyright (c) 2006-2008 Marc Schefer. All Rights Reserved.\n"
                        + "Modifications by Nicholas Sherlock\n"
                        + "Includes icons from the Tango Desktop Project\n"
                        + "ChibiPaint is free software: you can redistribute it and/or modify\n"
                        + "it under the terms of the GNU General Public License as published by\n"
                        + "the Free Software Foundation, either version 3 of the License, or\n"
                        + "(at your option) any later version.\n\n"
    
                        + "ChibiPaint is distributed in the hope that it will be useful,\n"
                        + "but WITHOUT ANY WARRANTY; without even the implied warranty of\n"
                        + "MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the\n"
                        + "GNU General Public License for more details.\n\n"
    
                        + "You should have received a copy of the GNU General Public License\n"
                        + "along with ChibiPaint. If not, see <http://www.gnu.org/licenses/>.\n");
            break;
            case "CPTest":
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
                canvas.repaint();
            break;
            case "CPDeselectAll":
                this.artwork.rectangleSelection(new CPRect());
                canvas.repaint();
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
        }
        
        // callCPEventListeners(); TODO
    };
    
    this.gui = new CPMainGUI(this, uiElem);
    
    if (canvas) {
        canvas.paint();
    }
    
    this.gui.arrangePalettes();
}

ChickenPaint.prototype = Object.create(EventEmitter.prototype);
ChickenPaint.prototype.constructor = ChickenPaint;