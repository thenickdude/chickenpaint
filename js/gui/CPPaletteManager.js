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

import CPToolPalette from "./CPToolPalette";
import CPMiscPalette from "./CPMiscPalette";
import CPStrokePalette from "./CPStrokePalette";
import CPColorPalette from "./CPColorPalette";
import CPBrushPalette from "./CPBrushPalette";
import CPLayersPalette from "./CPLayersPalette";
import CPTexturePalette from "./CPTexturePalette";
import CPSwatchesPalette from "./CPSwatchesPalette";

export default function CPPaletteManager(cpController) {
    var
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
        
        paletteFrames = [],
        hiddenFrames = [],
        
        parentElem = document.createElement("div"),
        
        that = this;
    
    this.palettes = palettes;

    function showPalette(palette, show) {
        var
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
        var 
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
            for (var i = 0; i < hiddenFrames.length; i++) {
                var 
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
        var
            windowWidth = $(parentElem).parents(".chickenpaint-main-section").width(),
            windowHeight = $(parentElem).parents(".chickenpaint-main-section").height();

        for (var i in palettes) {
            var palette = palettes[i];
            
            /* Move palettes that are more than half out of the frame back into it */
            if (palette.getX() + palette.getWidth() / 2 > windowWidth) {
                palette.setLocation(windowWidth - palette.getWidth(), palette.getY());
            }

            if (palette.getY() + palette.getHeight() / 2 > windowHeight) {
                palette.setLocation(palette.getX(), windowHeight - palette.getHeight());
            }
        }
        
        //Move small palettes to the front so that they aren't completely hidden
        //palettes.swatches.moveToFront();
        
        //Special handling for the swatches palette being under the brush palette:
        var
            widthToSpare = windowWidth - palettes.tool.getWidth() - palettes.misc.getWidth() - palettes.stroke.getWidth() - palettes.color.getWidth() - palettes.brush.getWidth() - 15 > 0;

        if (palettes.swatches.getX() + palettes.swatches.getWidth() ==  palettes.brush.getX() + palettes.brush.getWidth() &&
                Math.abs(palettes.swatches.getY() - palettes.brush.getY()) < 20) {
            palettes.swatches.setLocation(palettes.brush.getX() - palettes.swatches.getWidth() - (widthToSpare ? 5 : 1), 0);
        }
        
        //Special handling for layers palette being too damn tall:
        if (palettes.layers.getY() + palettes.layers.getHeight() > windowHeight) {
            palettes.layers.setHeight(Math.max(windowHeight - palettes.layers.getY(), 200));
        }
    };
    
    /**
     * Rearrange the palettes from scratch into a useful arrangement.
     */
    this.arrangePalettes = function() {
        var
            windowWidth = $(parentElem).parents(".chickenpaint-main-section").width(),
            windowHeight = $(parentElem).parents(".chickenpaint-main-section").height(),
            
            haveWidthToSpare = windowWidth - palettes.tool.getWidth() - palettes.misc.getWidth() - palettes.stroke.getWidth() - palettes.color.getWidth() - palettes.brush.getWidth() - 15 > 0;

        palettes.brush.setLocation(windowWidth - palettes.brush.getWidth() - 15, 0);

        var 
            bottomOfBrush = palettes.brush.getY() + palettes.brush.getHeight();

        palettes.layers.setLocation(palettes.brush.getX(), windowHeight - bottomOfBrush > 300 ? bottomOfBrush + 2 : bottomOfBrush);
        palettes.layers.setSize(palettes.brush.getWidth(), windowHeight - palettes.layers.getY());

        palettes.tool.setLocation(0, 0);
        
        palettes.misc.setLocation(palettes.tool.getX() + palettes.tool.getWidth() + (haveWidthToSpare ? 5 : 1), 0);
        
        if (haveWidthToSpare) {
            palettes.stroke.setLocation(palettes.misc.getX() + palettes.misc.getWidth() + (haveWidthToSpare ? 5 : 1), 0);
        } else {
            palettes.stroke.setLocation(palettes.misc.getX(), palettes.misc.getY() + palettes.misc.getHeight() + 1);
        }
        
        palettes.swatches.setLocation(palettes.brush.getX() - palettes.swatches.getWidth() - (haveWidthToSpare ? 5 : 1), 0);

        palettes.textures.setWidth(Math.min(palettes.layers.getX() - palettes.textures.getX(), 490));
        palettes.textures.setLocation(palettes.color.getX() + palettes.color.getWidth() + 4, windowHeight - palettes.textures.getHeight());

        palettes.color.setLocation(0, Math.max(palettes.tool.getY() + palettes.tool.getHeight(), windowHeight - palettes.color.getHeight()));
    };
    
    this.getElement = function() {
        return parentElem;
    };

    parentElem.className = "chickenpaint-palettes";

    for (var paletteName in palettes) {
        var 
            palette = palettes[paletteName],
            palElement = palette.getElement();
        
        palette.on("paletteVisChange", function() {
            showPalette(this, false);
        });
        
        palElement.setAttribute("data-paletteName", paletteName);
        paletteFrames.push(palElement);
    }
    
    for (var paletteName in palettes) {
        var 
            palElement = palettes[paletteName].getElement();

        parentElem.appendChild(palElement);
    }
}

CPPaletteManager.prototype = Object.create(EventEmitter.prototype);
CPPaletteManager.prototype.constructor = CPPaletteManager;