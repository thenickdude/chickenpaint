"use strict";

function CPMainGUI(controller, uiElem) {
    var
        canvas = new CPCanvas(controller);
    
    uiElem.appendChild(canvas.getElement());
}