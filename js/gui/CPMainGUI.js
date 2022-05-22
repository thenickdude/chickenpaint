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

import $ from "jquery";

import CPCanvas from "./CPCanvas.js";
import CPPaletteManager from "./CPPaletteManager.js";
import CPMainMenu from "./CPMainMenu.js";

import EventEmitter from "wolfy87-eventemitter";

export default function CPMainGUI(controller, uiElem) {
    let
        lowerArea = document.createElement("div"),
        canvas = new CPCanvas(controller),
        paletteManager = new CPPaletteManager(controller),
        menuBar,

        fullScreenMode = false,
        
        that = this;
    
    this.togglePalettes = function() {
        paletteManager.togglePalettes();
    };
    
    this.arrangePalettes = function() {
        // Give the browser a chance to do the sizing of the palettes before we try to rearrange them
        setTimeout(paletteManager.arrangePalettes.bind(paletteManager), 0);
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

    /**
     *
     * @param {int} rotation - in 90 degree increments
     */
    this.setRotation90 = function(rotation) {
        canvas.setRotation(rotation * Math.PI / 2);
        paletteManager.palettes.layers.setRotation90(rotation);
    };

    this.setFullScreenMode = function(value) {
        if (fullScreenMode !== value) {
            fullScreenMode = value;

            that.resize();
            that.arrangePalettes();
        }
    };

    this.resize = function() {
        let
            newHeight;

        let
            windowHeight = $(window).height(),
            menuBarHeight = $(menuBar.getElement()).outerHeight();

        if (fullScreenMode) {
            newHeight = windowHeight - menuBarHeight;
        } else {
            newHeight = Math.min(Math.max((windowHeight - menuBarHeight - 65), 500), 850);
        }

        canvas.resize(newHeight, false);
        that.constrainPalettes();
    };

    menuBar = new CPMainMenu(controller, this);

    uiElem.appendChild(menuBar.getElement());

    lowerArea.className = 'chickenpaint-main-section';
    
    lowerArea.appendChild(canvas.getElement());
    lowerArea.appendChild(paletteManager.getElement());
    
    uiElem.appendChild(lowerArea);

    canvas.on("canvasRotated90", function(newAngle) {
        paletteManager.palettes.layers.setRotation90(newAngle);
    });

    window.addEventListener("resize", this.resize.bind(this));

    controller.on("fullScreen", fullscreen => this.setFullScreenMode(fullscreen));
    
    controller.on("toolbarStyleChange", newStyle => {
       $(uiElem).toggleClass("chickenpaint-toolbar-style-old", newStyle === "old"); 
    });
    
    controller.on("unsavedChanges", unsaved => {
        $(uiElem).toggleClass("chickenpaint-unsaved", unsaved);
    })
    
    setTimeout(this.resize.bind(this), 0);
}

CPMainGUI.prototype = Object.create(EventEmitter.prototype);
CPMainGUI.prototype.constructor = CPMainGUI;