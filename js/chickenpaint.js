"use strict";

function ChickenPaint(uiElem, arrayBuffer) {
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
            spacing: .05,
            pressureSize: false,
            pressureAlpha: true,
            brushType: CPBrushInfo.B_ROUND_AA,
            paintMode: CPBrushInfo.M_PAINT,
        });
        
        tools[T_ERASER] = new CPBrushInfo({
            toolNb: T_ERASER,
            size: 16,
            alpha: 255,
            isAA: true,
            minSpacing: 0.5,
            spacing: .05,
            pressureSize: false,
            pressureAlpha: false,
            brushType: CPBrushInfo.B_ROUND_AA,
            paintMode: CPBrushInfo.M_ERASE,
        });
        
        tools[T_PEN] = new CPBrushInfo({
            toolNb: T_PEN,
            size: 2,
            alpha: 128,
            isAA: true,
            minSpacing: 0.5,
            spacing: .05,
            pressureSize: true,
            pressureAlpha: false,
            brushType: CPBrushInfo.B_ROUND_AA,
            paintMode: CPBrushInfo.M_PAINT,
        });
        
        tools[T_SOFTERASER] = new CPBrushInfo({
            toolNb: T_SOFTERASER,
            size: 16,
            alpha: 64,
            isAA: false,
            isAirbrush: true,
            minSpacing: 0.5,
            spacing: .05,
            pressureSize: false,
            pressureAlpha: true,
            brushType: CPBrushInfo.B_ROUND_AIRBRUSH,
            paintMode: CPBrushInfo.M_ERASE,
        });
        
        tools[T_AIRBRUSH] = new CPBrushInfo({
            toolNb: T_AIRBRUSH,
            size: 50,
            alpha: 32,
            isAA: false,
            isAirbrush: true,
            minSpacing: 0.5,
            spacing: .05,
            pressureSize: false,
            pressureAlpha: true,
            brushType: CPBrushInfo.B_ROUND_AIRBRUSH,
            paintMode: CPBrushInfo.M_PAINT,
        });
        
        tools[T_DODGE] = new CPBrushInfo({
            toolNb: T_DODGE,
            size: 30,
            alpha: 32,
            isAA: false,
            isAirbrush: true,
            minSpacing: 0.5,
            spacing: .05,
            pressureSize: false,
            pressureAlpha: true,
            brushType: CPBrushInfo.B_ROUND_AIRBRUSH,
            paintMode: CPBrushInfo.M_DODGE,
        });
        
        tools[T_BURN] = new CPBrushInfo({
            toolNb: T_BURN,
            size: 30,
            alpha: 32,
            isAA: false,
            isAirbrush: true,
            minSpacing: 0.5,
            spacing: .05,
            pressureSize: false,
            pressureAlpha: true,
            brushType: CPBrushInfo.B_ROUND_AIRBRUSH,
            paintMode: CPBrushInfo.M_BURN,
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
            spacing: .05,
            pressureSize: false,
            pressureAlpha: true,
            brushType: CPBrushInfo.B_ROUND_PIXEL,
            paintMode: CPBrushInfo.M_BLUR,
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
            spacing: .1,
            pressureSize: false,
            pressureAlpha: true,
            brushType: CPBrushInfo.B_ROUND_AIRBRUSH,
            paintMode: CPBrushInfo.M_OIL,
            resat: 0.0,
            bleed: 0.07
        });
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
    
    this.gui = new CPMainGUI(this, uiElem);
    
    if (canvas) {
        canvas.paint();
    }
};