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

import CPPalette from './CPPalette.js';
import CPColorSelect from './CPColorSelect.js';
import CPColorSlider from './CPColorSlider.js';
import CPColor from "../util/CPColor.js";
import {_} from "../languages/lang";

export default function CPColorPalette(cpController) {
    CPPalette.call(this, cpController, "color", "Color (picker)");
    
    let
        colorSelect = new CPColorSelect(cpController),
        colorSlider = new CPColorSlider(cpController, colorSelect),
        colorShow = new CPColorShow(cpController),
    
        body = this.getBodyElement(),
        topSection = document.createElement("div");
    
    topSection.className = 'chickenpaint-colorpicker-top';
    
    topSection.appendChild(colorSelect.getElement());
    topSection.appendChild(colorSlider.getElement());
    
    body.appendChild(topSection);
    body.appendChild(colorShow.getElement());
}

function CPColorShow(controller) {
    let
        color = 0,
        
        element = document.createElement("div");

    function padLeft(string, padding, len) {
        while (string.length < len) {
            string = padding + string;
        }
        return string;
    }
    
    function paint() {
        element.style.backgroundColor = '#' + padLeft(Number(color).toString(16), "0", 6);
    }
    
    function mouseClick(e) {
        e.preventDefault();
        
        let
            colHex = "#" + padLeft(Number(color).toString(16), "0", 6);

        colHex = window.prompt(_("Please enter a color in hex format"), colHex);
        
        if (colHex != null) {
            try {
                if (colHex.match(/^#/) || colHex.match(/^$/)) {
                    colHex = colHex.substring(1);
                }

                let
                    newColor = parseInt(colHex, 16);

                controller.setCurColor(new CPColor(newColor));
            } catch (e) {
            }
        }
    }
    
    this.getElement = function() {
        return element;
    };
    
    controller.on("colorChange", function(_color) {
        color = _color.getRgb();
        paint();
    });
    
    element.className = 'chickenpaint-colorpicker-show';
    
    element.addEventListener("click", mouseClick);

    paint();
}

CPColorPalette.prototype = Object.create(CPPalette.prototype);
CPColorPalette.prototype.constructor = CPColorPalette;
