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

import CPCanvas from "./CPCanvas";
import CPPaletteManager from "./CPPaletteManager";
import CPMainMenu from "./CPMainMenu";

export default function CPMainGUI(controller, uiElem) {
    var
        lowerArea = document.createElement("div"),
        canvas = new CPCanvas(controller),
        paletteManager = new CPPaletteManager(controller),
        menuBar,
        
        that = this;
    
    this.togglePalettes = function() {
        paletteManager.togglePalettes();
    };
    
    this.arrangePalettes = function() {
        // Give the browser a chance to do the sizing of the palettes before we try to rearrange them
        setTimeout(function() {
            paletteManager.arrangePalettes();
        }, 0);
    };

    this.constrainPalettes = function() {
        paletteManager.constrainPalettes();
    };
    
    this.showPalette = function(paletteName, show) {
        paletteManager.showPaletteByName(paletteName, show);
    };
    
    this.getSwatches = function() {
        return paletteManager.palettes.swatches.getSwatches();
    };

    this.setSwatches = function(swatches) {
        paletteManager.palettes.swatches.setSwatches(swatches);
    };
    
    this.getPaletteManager = function() {
        return paletteManager;
    };
    
    this.setRotation = function(rotation) {
        canvas.setRotation(rotation);
    };

    menuBar = new CPMainMenu(controller, this)
    
    window.addEventListener("resize", function() {
        that.constrainPalettes();
    });
    
    uiElem.appendChild(menuBar.getElement());
    
    lowerArea.className = 'chickenpaint-main-section';
    
    lowerArea.appendChild(canvas.getElement());
    lowerArea.appendChild(paletteManager.getElement());
    
    uiElem.appendChild(lowerArea);
   
    setTimeout(function() {
        canvas.resize();
    }, 0);
}

CPMainGUI.prototype = Object.create(EventEmitter.prototype);
CPMainGUI.prototype.constructor = CPMainGUI;