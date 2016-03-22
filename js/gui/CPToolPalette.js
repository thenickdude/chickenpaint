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

export default function CPToolPalette(cpController) {
    CPPalette.call(this, cpController, "tool", "Tools");
    
    var 
        that = this,

        buttons = [
            {
                className: "chickenpaint-tool-rect-selection",
                command: "CPRectSelection",
                toolTip: "Marquee",
                shortcut: "m"
            },
            {
                className: "chickenpaint-tool-move",
                command: "CPMoveTool",
                toolTip: "Move tool",
                shortcut: "v"
            },
            {
                className: "chickenpaint-tool-flood-fill",
                command: "CPFloodFill",
                toolTip: "Flood fill",
                shortcut: "f"
            },
            {
                className: "chickenpaint-tool-gradient-fill",
                command: "CPGradientFill",
                toolTip: "Gradient fill",
                shortcut: "g"
            },
            {
                className: "chickenpaint-tool-color-picker",
                command: "CPColorPicker",
                toolTip: "Color picker",
                shortcut: "i"
            },
            {
                className: "chickenpaint-tool-rotate-canvas",
                command: "CPRotateCanvas",
                commandDoubleClick: "CPResetCanvasRotation",
                toolTip: "Rotate canvas"
            },
            {
                className: "chickenpaint-tool-pencil",
                command: "CPPencil",
                toolTip: "Pencil",
                
            },
            {
                className: "chickenpaint-tool-pen",
                command: "CPPen",
                toolTip: "Pen",
                selected: true // TODO a better mechanism for the controller to let us know the initial tool 
            },
            {
                className: "chickenpaint-tool-airbrush",
                command: "CPAirbrush",
                toolTip: "Airbrush"
            },
            {
                className: "chickenpaint-tool-water",
                command: "CPWater",
                toolTip: "Waterpaint"
            },
            {
                className: "chickenpaint-tool-eraser",
                command: "CPEraser",
                toolTip: "Eraser",
                shortcut: "e"
            },
            {
                className: "chickenpaint-tool-soft-eraser",
                command: "CPSoftEraser",
                toolTip: "Soft eraser"
            },
            {
                className: "chickenpaint-tool-smudge",
                command: "CPSmudge",
                toolTip: "Smudge"
            },
            {
                className: "chickenpaint-tool-blender",
                command: "CPBlender",
                toolTip: "Blender"
            },
            {
                className: "chickenpaint-tool-dodge",
                command: "CPDodge",
                toolTip: "Dodge",
                shortcut: "o"
            },
            {
                className: "chickenpaint-tool-burn",
                command: "CPBurn",
                toolTip: "Burn",
                shortcut: "p"
            },
            {
                className: "chickenpaint-tool-blur",
                command: "CPBlur",
                toolTip: "Blur"
            }
        ],
        listElem = document.createElement("ul");
    
    function buttonClicked(e) {
        if (this.nodeName == "LI") {
            var
                button = buttons[parseInt(this.getAttribute("data-buttonIndex"), 10)];
            
            $("li", listElem).removeClass("selected");
            $(this).addClass("selected");
            
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
    
    buildButtons();
}

CPToolPalette.prototype = Object.create(CPPalette.prototype);
CPToolPalette.prototype.constructor = CPToolPalette;
