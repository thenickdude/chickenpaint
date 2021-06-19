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
import EventEmitter from "wolfy87-eventemitter";

import CPToolPalette from "./CPToolPalette.js";
import CPMiscPalette from "./CPMiscPalette.js";
import CPStrokePalette from "./CPStrokePalette.js";
import CPColorPalette from "./CPColorPalette.js";
import CPBrushPalette from "./CPBrushPalette.js";
import CPLayersPalette from "./CPLayersPalette.js";
import CPTexturePalette from "./CPTexturePalette.js";
import CPSwatchesPalette from "./CPSwatchesPalette.js";

export default function CPPaletteManager(cpController) {
    const
        palettes = {
            tool: new CPToolPalette(cpController),
            misc: new CPMiscPalette(cpController),
            stroke: new CPStrokePalette(cpController),
            color: new CPColorPalette(cpController),
            brush: new CPBrushPalette(cpController),
            layers: new CPLayersPalette(cpController),
            textures: new CPTexturePalette(cpController),
            swatches: new CPSwatchesPalette(cpController)
        },
        
        defaultCollapse = {
            tool: false,
            color: false,
            misc: false
        },
        
        collapseDownwards = {
            color: true,
            textures: true,
            layers: true
        },

        parentElem = document.createElement("div"),

        that = this;
    
    let
        paletteFrames = [],
        hiddenFrames = [];
    
    this.palettes = palettes;

    function getPaletteDisplayArea() {
        // Use the canvas as a positioning guide to avoid overlapping scrollbars
        let 
            canvas = $(parentElem).parents(".chickenpaint").find(".chickenpaint-canvas");
        
        return {width: canvas.width(), height: canvas.height()};
    }
    
    function showPalette(palette, show) {
        let
            palElement = palette.getElement();
        
        if (show) {
            parentElem.appendChild(palElement);
        } else {
            parentElem.removeChild(palElement);
        }
        that.emitEvent("paletteVisChange", [palette.name, show]);

        // FIXME: focus hack
        // controller.canvas.grabFocus(); TODO
    }
    
    this.showPaletteByName = function(paletteName, show) {
        let 
            palette = palettes[paletteName];
        
        if (palette) {
            showPalette(palette, show);
        }
    }

    this.togglePalettes = function() {
        if (hiddenFrames.length == 0) {
            $("> .chickenpaint-palette", parentElem).each(function() {
                that.showPaletteByName(this.getAttribute("data-paletteName"), false);
                hiddenFrames.push(this);
            });
        } else {
            for (let i = 0; i < hiddenFrames.length; i++) {
                let 
                    frame = hiddenFrames[i];
                
                that.showPaletteByName(frame.getAttribute("data-paletteName"), true);
            }
            hiddenFrames = [];
        }
    };

    /**
     * Pop palettes that are currently outside the visible area back into view.
     */
    this.constrainPalettes = function() {
        let
            windowDim = getPaletteDisplayArea();

        for (let i in palettes) {
            let palette = palettes[i];

            /* Move palettes that are more than half out of the frame back into it */
            if (palette.getX() + palette.getWidth() / 2 > windowDim.width) {
                palette.setLocation(windowDim.width - palette.getWidth(), palette.getY());
            }

            if (palette.getY() + palette.getHeight() / 2 > windowDim.height) {
                palette.setLocation(palette.getX(), windowDim.height - palette.getHeight());
            }
        }
        
        //Move small palettes to the front so that they aren't completely hidden
        //palettes.swatches.moveToFront();
        
        //Special handling for the swatches palette being under the brush palette:
        let
            widthToSpare = windowDim.width - palettes.tool.getWidth() - palettes.misc.getWidth() - palettes.stroke.getWidth() - palettes.color.getWidth() - palettes.brush.getWidth() - 15 > 0;

        if (palettes.swatches.getX() + palettes.swatches.getWidth() ==  palettes.brush.getX() + palettes.brush.getWidth() &&
                Math.abs(palettes.swatches.getY() - palettes.brush.getY()) < 20) {
            palettes.swatches.setLocation(palettes.brush.getX() - palettes.swatches.getWidth() - (widthToSpare ? 5 : 1), 0);
        }
        
        //Special handling for layers palette being too damn tall:
        if (palettes.layers.getY() + palettes.layers.getHeight() > windowDim.height) {
            palettes.layers.setHeight(Math.max(windowDim.height - palettes.layers.getY(), 200));
        }
    };
    
    /**
     * Rearrange the palettes from scratch into a useful arrangement.
     */
    this.arrangePalettes = function() {
        let
            windowDim = getPaletteDisplayArea(),

            haveWidthToSpare;

        if (cpController.getSmallScreenMode()) {
            palettes.tool.setLocation(0, 0);
            palettes.misc.setLocation(palettes.tool.getX() + palettes.tool.getWidth() + 1, 0);
            palettes.brush.setLocation(windowDim.width - palettes.brush.getWidth() - 15, palettes.misc.getY() + palettes.misc.getHeight() + 1);

            let 
                layersY = 330;

            palettes.textures.setWidth(windowDim.width - palettes.textures.getX());

            palettes.layers.setLocation(palettes.brush.getX() + palettes.brush.getWidth() - palettes.layers.getWidth(), palettes.textures.getY() - palettes.layers.getHeight());
            palettes.layers.setHeight(palettes.textures.getY() - layersY - 1);

            palettes.stroke.setLocation(palettes.misc.getX(), palettes.misc.getY() + palettes.misc.getHeight() + 1);
            palettes.swatches.setLocation(palettes.stroke.getX(), palettes.stroke.getY() + palettes.stroke.getHeight() + 1);
        } else {
            haveWidthToSpare = windowDim.width - palettes.tool.getWidth() - palettes.misc.getWidth() - palettes.stroke.getWidth() - palettes.color.getWidth() - palettes.brush.getWidth() - 15 > 0;

            palettes.brush.setLocation(windowDim.width - palettes.brush.getWidth() - 15, 0);

            let
                bottomOfBrush = palettes.brush.getY() + palettes.brush.getHeight(),
                layersY = windowDim.height - bottomOfBrush > 300 ? bottomOfBrush + 2 : bottomOfBrush;

            palettes.layers.setSize(palettes.brush.getWidth() + (haveWidthToSpare ? 30 : 0), windowDim.height - layersY);
            palettes.layers.setLocation(palettes.brush.getX() + palettes.brush.getWidth() - palettes.layers.getWidth(), layersY);

            palettes.tool.setLocation(0, 0);

            palettes.misc.setLocation(palettes.tool.getX() + palettes.tool.getWidth() + (haveWidthToSpare ? 5 : 1), 0);

            if (haveWidthToSpare) {
                palettes.stroke.setLocation(palettes.misc.getX() + palettes.misc.getWidth() + (haveWidthToSpare ? 5 : 1), 0);
            } else {
                palettes.stroke.setLocation(palettes.misc.getX(), palettes.misc.getY() + palettes.misc.getHeight() + 1);
            }

            palettes.swatches.setLocation(Math.max(palettes.brush.getX() - palettes.swatches.getWidth() - (haveWidthToSpare ? 5 : 1), palettes.tool.getX() + palettes.tool.getWidth()), 0);

            palettes.textures.setWidth(Math.min(palettes.layers.getX() - palettes.textures.getX(), 490));
        }

        palettes.textures.setLocation(palettes.color.getX() + palettes.color.getWidth() + 4, windowDim.height - palettes.textures.getHeight());

        palettes.color.setLocation(0, Math.max(palettes.tool.getY() + palettes.tool.getHeight(), windowDim.height - palettes.color.getHeight()));
    };
    
    cpController.on("smallScreen", function(smallScreenMode) {
        if (smallScreenMode) {
            for (let paletteName in palettes) {
                let
                    palette = palettes[paletteName];

                palette.toggleCollapse(smallScreenMode && (!(paletteName in defaultCollapse) || defaultCollapse[paletteName]));
            }
        }
    });
    
    this.getElement = function() {
        return parentElem;
    };

    parentElem.className = "chickenpaint-palettes";

    for (let paletteName in palettes) {
        let
            palette = palettes[paletteName],
            palElement = palette.getElement();
        
        palette.on("paletteVisChange", function() {
            showPalette(this, false);
        });
        
        if (paletteName in collapseDownwards) {
            palette.setCollapseDownwards(true);
        }
        
        palElement.setAttribute("data-paletteName", paletteName);
        paletteFrames.push(palElement);
    }
    
    for (let paletteName in palettes) {
        let
            palElement = palettes[paletteName].getElement();

        parentElem.appendChild(palElement);
    }
}

CPPaletteManager.prototype = Object.create(EventEmitter.prototype);
CPPaletteManager.prototype.constructor = CPPaletteManager;