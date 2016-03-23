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

import CPBrushInfo from '../engine/CPBrushInfo';

export default function CPStrokePalette(cpController) {
    CPPalette.call(this, cpController, "stroke", "Stroke");
    
    var 
        that = this,

        buttons = [
            {
                className: "chickenpaint-tool-freehand",
                command: "CPFreeHand",
                toolTip: "Free-hand",
                selected: true
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
        ],

        body = that.getBodyElement();

    function buildButtons() {
        var
            listElem = document.createElement("ul");
        
        listElem.className = "chickenpaint-stroke-tools list-unstyled";
        
        for (var i in buttons) {
            var 
                button = buttons[i],
                buttonElem = document.createElement("li");
            
            buttonElem.className = "chickenpaint-toolbar-button " + button.className;
            buttonElem.setAttribute("data-buttonIndex", i);
            
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
        
        body.appendChild(listElem);
    }
    
    buildButtons();
    
    cpController.on("toolChange", function(tool, toolInfo) {
        $(".chickenpaint-tool-freehand", body).toggleClass("selected", toolInfo.strokeMode == CPBrushInfo.SM_FREEHAND);
        $(".chickenpaint-tool-line", body).toggleClass("selected", toolInfo.strokeMode == CPBrushInfo.SM_LINE);
        $(".chickenpaint-tool-bezier", body).toggleClass("selected", toolInfo.strokeMode == CPBrushInfo.SM_BEZIER);
    });
}

CPStrokePalette.prototype = Object.create(CPPalette.prototype);
CPStrokePalette.prototype.constructor = CPStrokePalette;
