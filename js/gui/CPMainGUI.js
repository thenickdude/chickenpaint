"use strict";

function CPMainGUI(controller, uiElem) {
    var
        canvas = new CPCanvas(controller),
        paletteManager = new CPPaletteManager(controller);
    
    uiElem.appendChild(canvas.getElement());
    uiElem.appendChild(paletteManager.getElement());
    
    this.arrangePalettes = function() {
        paletteManager.arrangePalettes();
    }

    this.constrainPalettes = function() {
        paletteManager.constrainPalettes();
    }
}