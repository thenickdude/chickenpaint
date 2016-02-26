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

function CPStrokePalette(cpController) {
    "use strict";
    
    CPPalette.call(this, cpController, "stroke", "Stroke");
    
	var 
	    that = this,

	    buttons = [
	        {
	            className: "chickenpaint-tool-freehand",
	            command: "CPFreeHand",
	            toolTip: "Free-hand"
	        },
            {
                className: "chickenpaint-tool-line",
                command: "CPLine",
                toolTip: "Straight line"
            },
            {
                className: "chickenpaint-tool-bezier",
                command: "CPBezier",
                toolTip: "Bezier curve"
            }
        ];

	function buildButtons() {
	    var
	        body = that.getBodyElement(),
	        listElem = document.createElement("ul");
	    
	    listElem.className = "chickenpaint-stroke-tools list-unstyled";
	    
	    for (var i in buttons) {
	        var 
	            button = buttons[i],
	            buttonElem = document.createElement("li");
	        
	        buttonElem.className = "chickenpaint-toolbar-button " + button.className;
	        buttonElem.dataset.buttonIndex = i;
	        
	        listElem.appendChild(buttonElem);
	    }
	    
	    listElem.addEventListener("click", function(e) {
	        if (e.target && e.target.nodeName == "LI") {
	            var
	                button = buttons[parseInt(e.target.dataset.buttonIndex, 10)];
	            
	            $("li", listElem).removeClass("selected");
	            $(e.target).addClass("selected");
	            
	            cpController.actionPerformed({action: button.command});
	        }
	    });
	    
	    body.appendChild(listElem);
	}
	
	buildButtons();
	
	cpController.on("toolChange", function(tool, toolInfo) {
	    $("chickenpaint-tool-freehand").toggleClass("selected", toolInfo.strokeMode == CPBrushInfo.SM_FREEHAND);
	    $("chickenpaint-tool-line").toggleClass("selected", toolInfo.strokeMode == CPBrushInfo.SM_LINE);
	    $("chickenpaint-tool-bezier").toggleClass("selected", toolInfo.strokeMode == CPBrushInfo.SM_BEZIER);
	});
}

CPStrokePalette.prototype = Object.create(CPPalette.prototype);
CPStrokePalette.prototype.constructor = CPStrokePalette;
