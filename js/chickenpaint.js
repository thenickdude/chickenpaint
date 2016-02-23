"use strict";

function ChickenPaint(uiElem, arrayBuffer) {
    var
        that = this,
        
        canvas;
    
    if (arrayBuffer) {
        var 
            chibiReader = new CPChibiFile();
        
        this.artwork = chibiReader.read(arrayBuffer);
    }
    
    if (!this.artwork) {
        this.artwork = new CPArtwork(800, 600);
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