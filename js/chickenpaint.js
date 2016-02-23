"use strict";

function ChickenPaint(uiElem) {
    var
        that = this,
        
        canvas;

    this.artwork = new CPArtwork(800, 600);
    
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