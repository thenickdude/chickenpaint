/*
	ChibiPaint
    Copyright (c) 2006-2008 Marc Schefer

    This file is part of ChibiPaint.

    ChibiPaint is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    ChibiPaint is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with ChibiPaint. If not, see <http://www.gnu.org/licenses/>.

 */

function CPToolPalette(cpController) {
    "use strict";
    
    CPPalette.call(this, cpController, "tool", "Tools");
    
	var 
	    that = this,

	    buttons = [
	        {
	            className: "chickenpaint-tool-rect-selection",
	            command: "CPRectSelection",
	            toolTip: "Marquee"
	        },
            {
                className: "chickenpaint-tool-move",
                command: "CPMoveTool",
                toolTip: "Move tool"
            },
            {
                className: "chickenpaint-tool-flood-fill",
                command: "CPFloodFill",
                toolTip: "Flood fill"
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
                toolTip: "Pencil"
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
                toolTip: "Eraser"
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
                toolTip: "Dodge"
            },
            {
                className: "chickenpaint-tool-burn",
                command: "CPBurn",
                toolTip: "Burn"
            },
            {
                className: "chickenpaint-tool-blur",
                command: "CPBlur",
                toolTip: "Blur"
            },
            {
                className: "chickenpaint-tool-color-picker",
                command: "CPColorPicker",
                toolTip: "Color picker"
            },
        ];

	function buildButtons() {
	    var
	        body = that.getBodyElement(),
	        listElem = document.createElement("ul");
	    
	    listElem.className = "chickenpaint-tools list-unstyled";
	    
	    for (var i in buttons) {
	        var 
	            button = buttons[i],
	            buttonElem = document.createElement("li");
	        
	        buttonElem.className = "chickenpaint-toolbar-button " + button.className;
	        buttonElem.setAttribute("data-buttonIndex", i);
	        buttonElem.title = button.toolTip;
	        
	        if (button.selected) {
	            buttonElem.className = buttonElem.className + " selected";
	        }
	        
	        listElem.appendChild(buttonElem);
	    }
	    
	    listElem.addEventListener("click", function(e) {
	        if (e.target && e.target.nodeName == "LI") {
	            var
	                button = buttons[parseInt(e.target.getAttribute("data-buttonIndex"), 10)];
	            
	            $("li", listElem).removeClass("selected");
	            $(e.target).addClass("selected");
	            
	            cpController.actionPerformed({action: button.command});
	        }
	    });
	    
       listElem.addEventListener("dblclick", function(e) {
            if (e.target && e.target.nodeName == "LI") {
                var
                    button = buttons[parseInt(e.target.getAttribute("data-buttonIndex"), 10)];
                
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
