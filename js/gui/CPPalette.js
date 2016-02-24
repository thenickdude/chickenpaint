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

function CPPalette(cpController, className, title) {
    "use strict";
    
    this.cpController = cpController;
    this.title = title;
    
    var
        containerElement = document.createElement("div"),
        headElement = document.createElement("div"),
        bodyElement = document.createElement("div");
    
    containerElement.className = "chickenpaint-palette chickenpaint-palette-" + className;
    
    headElement.className = "chickenpaint-palette-head";
    headElement.textContent = this.title;
    
    bodyElement.className = "chickenpaint-palette-body";
    
    containerElement.appendChild(headElement);
    containerElement.appendChild(bodyElement);
    
    this.getContainer = function() {
        return containerElement;
    };
    
    this.getBodyElement = function() {
        return bodyElement;
    };
    
    this.getWidth = function() {
        return $(containerElement).width();
    };
    
    this.getHeight = function() {
        return $(containerElement).height();
    };
    
    this.getX = function() {
        return parseInt(containerElement.style.left, 10);
    };
    
    this.getY = function() {
        return parseInt(containerElement.style.top, 10);
    };
    
    this.setLocation = function(x, y) {
        containerElement.style.left = x + "px";
        containerElement.style.top = y + "px";
    };
    
    this.setSize = function(width, height) {
        containerElement.style.width = width + "px";
        containerElement.style.height = height + "px";
    }
}