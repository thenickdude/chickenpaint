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
import {_} from "../languages/lang.js";

export default function CPMiscPalette(cpController) {
    CPPalette.call(this, cpController, "misc", "Misc");
    
    let 
        that = this,

        buttons = [
            {
                className: "chickenpaint-tool-zoom-in",
                command: "CPZoomIn",
                toolTip: "Zoom in"
            },
            {
                className: "chickenpaint-tool-zoom-out",
                command: "CPZoomOut",
                toolTip: "Zoom out"
            },
            {
                className: "chickenpaint-tool-zoom-100",
                command: "CPZoom100",
                toolTip: "Zoom 100%"
            },
            {
                className: "chickenpaint-tool-undo",
                command: "CPUndo",
                toolTip: "Undo"
            },
            {
                className: "chickenpaint-tool-redo",
                command: "CPRedo",
                toolTip: "Redo"
            },
            {
                className: "chickenpaint-tool-send",
                command: "CPSend",
                toolTip: "Save Oekaki"
            }
        ];

    function buildButtons() {
        let
            body = that.getBodyElement(),
            listElem = document.createElement("ul");
        
        listElem.className = "chickenpaint-misc-tools list-unstyled";
        
        for (let i in buttons) {
            let 
                button = buttons[i],
                buttonElem = document.createElement("li"),
                buttonIcon = document.createElement("div");
            
            if (button.command == 'CPSend' && !cpController.isActionSupported("CPContinue")) {
                button.toolTip = "Post Oekaki";
                button.className = "chickenpaint-tool-send-and-end";
            }
            
            buttonElem.className = "chickenpaint-toolbar-button " + button.className;
            buttonElem.setAttribute("data-buttonIndex", i);
            buttonElem.setAttribute("title", _(button.toolTip));

            buttonIcon.className = "chickenpaint-toolbar-button-icon";
            buttonElem.appendChild(buttonIcon);

            listElem.appendChild(buttonElem);
        }
        
        $(listElem)
            .on("mousedown", "li", function(e) {
                $(this).addClass("selected");
            })
            .on("mouseup", "li", function(e) {
                $(this).removeClass("selected");
            })
            .on("click", "li", function(e) {
                let
                    button = buttons[parseInt(this.getAttribute("data-buttonIndex"), 10)];
                
                cpController.actionPerformed({action: button.command});
            });

        body.appendChild(listElem);
    }
    
    buildButtons();
}

CPMiscPalette.prototype = Object.create(CPPalette.prototype);
CPMiscPalette.prototype.constructor = CPMiscPalette;
