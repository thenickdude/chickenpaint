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

import CPPalette from './CPPalette';
import ChickenPaint from '../ChickenPaint';

export default function CPToolPalette(cpController) {
    CPPalette.call(this, cpController, "tool", "Tools");
    
    var 
        that = this,

        buttons = [
            {
                className: "chickenpaint-tool-rect-selection",
                command: "CPRectSelection",
                toolTip: "Marquee",
                shortcut: "m",
                mode: ChickenPaint.M_RECT_SELECTION
            },
            {
                className: "chickenpaint-tool-move",
                command: "CPMoveTool",
                toolTip: "Move tool",
                shortcut: "v",
                mode: ChickenPaint.M_MOVE_TOOL
            },
            {
                className: "chickenpaint-tool-flood-fill",
                command: "CPFloodFill",
                toolTip: "Flood fill",
                shortcut: "f",
                mode: ChickenPaint.M_FLOODFILL
            },
            {
                className: "chickenpaint-tool-gradient-fill",
                command: "CPGradientFill",
                toolTip: "Gradient fill",
                shortcut: "g",
                mode: ChickenPaint.M_GRADIENTFILL
            },
            {
                className: "chickenpaint-tool-color-picker",
                command: "CPColorPicker",
                toolTip: "Color picker",
                shortcut: "i",
                mode: ChickenPaint.M_COLOR_PICKER
            },
            {
                className: "chickenpaint-tool-rotate-canvas",
                command: "CPRotateCanvas",
                commandDoubleClick: "CPResetCanvasRotation",
                toolTip: "Rotate canvas",
                mode: ChickenPaint.M_ROTATE_CANVAS
            },
            {
                className: "chickenpaint-tool-pencil",
                command: "CPPencil",
                toolTip: "Pencil",
                mode: ChickenPaint.M_DRAW,
                tool: ChickenPaint.T_PENCIL
            },
            {
                className: "chickenpaint-tool-pen",
                command: "CPPen",
                toolTip: "Pen",
                selected: true, // TODO a better mechanism for the controller to let us know the initial tool
                mode: ChickenPaint.M_DRAW,
                tool: ChickenPaint.T_PEN
            },
            {
                className: "chickenpaint-tool-airbrush",
                command: "CPAirbrush",
                toolTip: "Airbrush",
                mode: ChickenPaint.M_DRAW,
                tool: ChickenPaint.T_AIRBRUSH
            },
            {
                className: "chickenpaint-tool-water",
                command: "CPWater",
                toolTip: "Waterpaint",
                mode: ChickenPaint.M_DRAW,
                tool: ChickenPaint.T_WATER
            },
            {
                className: "chickenpaint-tool-eraser",
                command: "CPEraser",
                toolTip: "Eraser",
                shortcut: "e",
                mode: ChickenPaint.M_DRAW,
                tool: ChickenPaint.T_ERASER
            },
            {
                className: "chickenpaint-tool-soft-eraser",
                command: "CPSoftEraser",
                toolTip: "Soft eraser",
                mode: ChickenPaint.M_DRAW,
                tool: ChickenPaint.T_SOFTERASER
            },
            {
                className: "chickenpaint-tool-smudge",
                command: "CPSmudge",
                toolTip: "Smudge",
                mode: ChickenPaint.M_DRAW,
                tool: ChickenPaint.T_SMUDGE
            },
            {
                className: "chickenpaint-tool-blender",
                command: "CPBlender",
                toolTip: "Blender",
                mode: ChickenPaint.M_DRAW,
                tool: ChickenPaint.T_BLENDER
            },
            {
                className: "chickenpaint-tool-dodge",
                command: "CPDodge",
                toolTip: "Dodge",
                shortcut: "o",
                mode: ChickenPaint.M_DRAW,
                tool: ChickenPaint.T_DODGE
            },
            {
                className: "chickenpaint-tool-burn",
                command: "CPBurn",
                toolTip: "Burn",
                shortcut: "p",
                mode: ChickenPaint.M_DRAW,
                tool: ChickenPaint.T_BURN
            },
            {
                className: "chickenpaint-tool-blur",
                command: "CPBlur",
                toolTip: "Blur",
                mode: ChickenPaint.M_DRAW,
                tool: ChickenPaint.T_BLUR
            }
        ],
        listElem = document.createElement("ul");
    
    function buttonClicked(e) {
        if (this.nodeName == "LI") {
            var
                button = buttons[parseInt(this.getAttribute("data-buttonIndex"), 10)];

            cpController.actionPerformed({action: button.command});
        }
    }

    function buildButtons() {
        var
            body = that.getBodyElement();
        
        listElem.className = "chickenpaint-tools list-unstyled";
        
        for (var i in buttons) {
            (function(i) {
                var 
                    button = buttons[i],
                    buttonElem = document.createElement("li");
                
                buttonElem.className = "chickenpaint-toolbar-button " + button.className;
                buttonElem.setAttribute("data-buttonIndex", i);

                buttonElem.setAttribute('data-mode', button.mode);
                if (button.tool !== undefined) {
                    buttonElem.setAttribute('data-tool', button.tool);
                }
                
                buttonElem.title = button.toolTip;
                
                if (button.shortcut) {
                    buttonElem.title += " (" + button.shortcut.toUpperCase() + ")";
                    
                    key(button.shortcut, function() {
                        buttonClicked.call(buttonElem);
                        
                        return false;
                    });
                }
                
                if (button.selected) {
                    buttonElem.className = buttonElem.className + " selected";
                }
                
                listElem.appendChild(buttonElem);
            })(i);
        }
        
        $(listElem).on("click", "li", buttonClicked);
        
        listElem.addEventListener("dblclick", function(e) {
            if (this.nodeName == "LI") {
                var
                    button = buttons[parseInt(this.getAttribute("data-buttonIndex"), 10)];
                
                if (button.commandDoubleClick) {
                    cpController.actionPerformed({action: button.commandDoubleClick});
                }
            }
        });
        
        body.appendChild(listElem);
    }

    cpController.on("modeChange", function(newMode) {
        var
            body = that.getBodyElement();

        $("li", body).removeClass("selected");
        
        if (newMode == ChickenPaint.M_DRAW) {
            $("li[data-tool=" + cpController.getCurTool() + "]", body).addClass("selected");
        } else {
            $("li[data-mode=" + newMode + "]", body).addClass("selected");
        }
    });

    cpController.on("toolChange", function(newTool) {
        var
            body = that.getBodyElement();

        if (cpController.getCurMode() == ChickenPaint.M_DRAW) {
            $("li", body).removeClass("selected");

            $("li[data-tool=" + newTool + "]", body).addClass("selected");
        }
    });
    
    buildButtons();
}

CPToolPalette.prototype = Object.create(CPPalette.prototype);
CPToolPalette.prototype.constructor = CPToolPalette;
