"use strict";

function CPMainGUI(controller, uiElem) {
    var
        canvas = new CPCanvas(controller),
        paletteManager = new CPPaletteManager(controller);
    
    uiElem.appendChild(canvas.getElement());
    uiElem.appendChild(paletteManager.getElement());
    
    this.arrangePalettes = function() {
        // Give the browser a chance to do the sizing of the palettes before we try to rearrange them
        setTimeout(function() {
            paletteManager.arrangePalettes();
        }, 0);
    }

    this.constrainPalettes = function() {
        paletteManager.constrainPalettes();
    }
}