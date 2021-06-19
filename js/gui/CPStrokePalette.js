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

import CPPalette from './CPPalette.js';
import CPBrushInfo from '../engine/CPBrushInfo.js';
import {_} from "../languages/lang";

export default function CPStrokePalette(cpController) {
    CPPalette.call(this, cpController, "stroke", "Stroke");
    
    let 
        that = this,

        buttons = [
            {
                className: "chickenpaint-tool-freehand",
                command: "CPFreeHand",
                toolTip: _("Free-hand"),
                selected: true
            },
            {
                className: "chickenpaint-tool-line",
                command: "CPLine",
                toolTip: _("Straight line")
            },
            {
                className: "chickenpaint-tool-bezier",
                command: "CPBezier",
                toolTip: _("Bezier curve")
            }
        ],

        body = that.getBodyElement();

    function buildButtons() {
        let
            listElem = document.createElement("ul");
        
        listElem.className = "chickenpaint-stroke-tools list-unstyled";
        
        for (let i in buttons) {
            let
                button = buttons[i],
                buttonElem = document.createElement("li"),
                buttonIcon = document.createElement("div");
            
            buttonElem.className = "chickenpaint-toolbar-button " + button.className;
            buttonElem.setAttribute("data-buttonIndex", i);
            buttonElem.setAttribute("title", button.toolTip);
            
            if (button.selected) {
                buttonElem.className = buttonElem.className + " selected";
            }

            buttonIcon.className = "chickenpaint-toolbar-button-icon";
            buttonElem.appendChild(buttonIcon);

            listElem.appendChild(buttonElem);
        }

        $(listElem)
            .on("click", "li", function(e) {
                let
                    button = buttons[parseInt(this.getAttribute("data-buttonIndex"), 10)];
                
                $("li", listElem).removeClass("selected");
                $(this).addClass("selected");
                
                cpController.actionPerformed({action: button.command});
                that.userIsDoneWithUs();
            });

        body.appendChild(listElem);
    }
    
    buildButtons();
    
    cpController.on("toolChange", function(tool, toolInfo) {
        $(".chickenpaint-tool-freehand", body).toggleClass("selected", toolInfo.strokeMode == CPBrushInfo.STROKE_MODE_FREEHAND);
        $(".chickenpaint-tool-line", body).toggleClass("selected", toolInfo.strokeMode == CPBrushInfo.STROKE_MODE_LINE);
        $(".chickenpaint-tool-bezier", body).toggleClass("selected", toolInfo.strokeMode == CPBrushInfo.STROKE_MODE_BEZIER);
    });
}

CPStrokePalette.prototype = Object.create(CPPalette.prototype);
CPStrokePalette.prototype.constructor = CPStrokePalette;
