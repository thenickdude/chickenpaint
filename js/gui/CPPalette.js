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

export default function CPPalette(cpController, className, title, resizeVert) {
    this.title = title;
    this.name = className;
    this.resizeVert = resizeVert || false;
    
    var
        containerElement = document.createElement("div"),
        headElement = document.createElement("div"),
        closeButton = document.createElement("button"),
        bodyElement = document.createElement("div"),
        
        vertHandle = null,
        
        dragOffset,
        
        that = this;
    
    this.getElement = function() {
        return containerElement;
    };
    
    this.getBodyElement = function() {
        return bodyElement;
    };
    
    this.getWidth = function() {
        return $(containerElement).outerWidth();
    };
    
    this.getHeight = function() {
        return $(containerElement).outerHeight();
    };
    
    this.getX = function() {
        return parseInt(containerElement.style.left, 10) || 0;
    };
    
    this.getY = function() {
        return parseInt(containerElement.style.top, 10) || 0;
    };
    
    this.setLocation = function(x, y) {
        containerElement.style.left = x + "px";
        containerElement.style.top = y + "px";
    };
    
    this.setWidth = function(width) {
        containerElement.style.width = width + "px";
    };

    this.setHeight = function(height) {
        containerElement.style.height = height + "px";
    };
    
    this.setSize = function(width, height) {
        this.setWidth(width);
        this.setHeight(height);
    };
    
    function mouseDrag(e) {
        that.setLocation(e.pageX - dragOffset.x, e.pageY - dragOffset.y);
    }

    function mouseDragRelease(e) {
        window.removeEventListener("mousemove", mouseDrag);
        window.removeEventListener("mouseup", mouseDragRelease);
    }
    
    function vertHandleDrag(e) {
        that.setHeight(e.pageY - $(containerElement).offset().top);
    }

    function vertHandleRelease(e) {
        window.removeEventListener("mousemove", vertHandleDrag);
        window.removeEventListener("mouseup", vertHandleRelease);
    }
    
    function vertHandleMouseDown(e) {
        window.addEventListener("mousemove", vertHandleDrag);
        window.addEventListener("mouseup", vertHandleRelease);
    }
    
    function addVertResizeHandle() {
        vertHandle = document.createElement("div");
        
        vertHandle.className = "chickenpaint-resize-handle-vert";
        
        vertHandle.addEventListener("mousedown", vertHandleMouseDown);
        
        containerElement.appendChild(vertHandle);
    }

    closeButton.type = "button";
    closeButton.className = "close";
    closeButton.innerHTML = "&times;";
    
    containerElement.className = "chickenpaint-palette chickenpaint-palette-" + className;
    
    headElement.className = "chickenpaint-palette-head";

    var
        headTitle = document.createElement("h4");
    
    headTitle.className = 'modal-title';
    headTitle.appendChild(document.createTextNode(this.title))
    
    headElement.appendChild(closeButton);
    headElement.appendChild(headTitle);
    
    bodyElement.className = "chickenpaint-palette-body";
    
    containerElement.appendChild(headElement);
    containerElement.appendChild(bodyElement);

    if (this.resizeVert) {
        addVertResizeHandle();
    }

    headElement.addEventListener("mousedown", function(e) {
        if (e.button == 0) {/* Left */
            if (e.target.nodeName == "BUTTON") {
                that.emitEvent("paletteVisChange", [that, false]);
            } else {
                window.addEventListener("mousemove", mouseDrag);
                window.addEventListener("mouseup", mouseDragRelease);
                
                dragOffset = {x: e.pageX - $(containerElement).position().left, y: e.pageY - $(containerElement).position().top};
            }
        }
    });
}

CPPalette.prototype = Object.create(EventEmitter.prototype);
CPPalette.prototype.constructor = EventEmitter;