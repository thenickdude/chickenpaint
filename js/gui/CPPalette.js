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
import EventEmitter from "wolfy87-eventemitter";
import {_} from "../languages/lang";

const
    DRAG_START_THRESHOLD = 5;

function distanceGreaterThan(a, b, threshold) {
    let 
        dist = (a.x - b.x) * (a.x - b.x) + (a.y - b.y)  * (a.y - b.y);
    
    return dist > threshold * threshold;
}

/**
 * 
 * @param {ChickenPaint} cpController
 * @param {String} className
 * @param {String} title
 * @param {Object} [options]
 * @param {boolean} options.resizeVert
 * @param {boolean} options.resizeHorz
 * @param {boolean} options.collapseDownwards
 * 
 * @constructor
 */
export default function CPPalette(cpController, className, title, options) {
    // Use a shorter version of the title if needed and one is available
    if (cpController.getSmallScreenMode() && _(title + " (shorter)") !== title + " (shorter)") {
        this.title = _(title + " (shorter)");
    } else {
        this.title = _(title);
    }
    
    options = options || {};
    
    this.name = className;
    this.resizeVert = options.resizeVert || false;
    this.resizeHorz = options.resizeHorz || false;
    
    let
        containerElement = document.createElement("div"),
        headElement = document.createElement("div"),
        collapseIcon = document.createElement("i"),
        closeButton = document.createElement("button"),
        bodyElement = document.createElement("div"),
        
        vertHandle = null,
        horzHandle = null,
        
        dragStartPos,
        dragAction,
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
    
    this.setCollapseDownwards = function(collapseDownwards) {
        options.collapseDownwards = collapseDownwards;
    };

    /**
     * @param {boolean} [collapse] True to collapse, false to uncollapse, omit to toggle state
     */
    this.toggleCollapse = function(collapse) {
        let 
            $containerElement = $(containerElement);
        
        if (collapse === undefined) {
            collapse = !$containerElement.hasClass("collapsed");
        } else {
            if ($containerElement.hasClass("collapsed") == collapse) {
                return;
            }
        }
        
        let
            windowHeight = $containerElement.parents(".chickenpaint").find(".chickenpaint-canvas").height(),
            oldHeight = this.getHeight(),
            oldBottom = this.getY() + oldHeight;
        
        $containerElement.toggleClass("collapsed", collapse);
        
        $(collapseIcon)
            .toggleClass("fa-angle-down", !collapse)
            .toggleClass("fa-angle-up", collapse);
        
        if (collapse) {
            // Move the header down to the old base position
            if (options.collapseDownwards) {
                this.setLocation(this.getX(), Math.min(oldBottom, windowHeight) - this.getHeight());
            }
        } else {
            let 
                thisHeight = this.getHeight();

            if (options.collapseDownwards) {
                this.setLocation(this.getX(), Math.max(oldBottom - thisHeight, 0));
            } else {
                // Keep palettes inside the window when uncollapsing
                if (this.getY() + thisHeight > windowHeight) {
                    this.setLocation(this.getX(), Math.max(windowHeight - thisHeight, 0));
                }
            }
        }
    };
    
    this.userIsDoneWithUs = function() {
        if (cpController.getSmallScreenMode()) {
            this.toggleCollapse(true);
        }  
    };

    function paletteHeaderPointerMove(e) {
        if ((dragAction === "dragStart" || dragAction === "dragging") && e.buttons !== 0) {
            let
                newX = e.pageX - dragOffset.x,
                newY = e.pageY - dragOffset.y
            
            if (dragAction == "dragStart") {
                if (distanceGreaterThan({x: newX, y: newY}, dragStartPos, DRAG_START_THRESHOLD)) {
                    // Recognise this as a drag rather than a clink
                    dragAction = "dragging";
                }
            }
            
            if (dragAction == "dragging") {
                that.setLocation(newX, newY);    
            }            
        }
    }
    
    function paletteHeaderPointerDown(e) {
        if (e.button == 0) {/* Left */
            e.stopPropagation();
            e.preventDefault(); // Avoid generating further legacy mouse events
            
            if (e.target.nodeName == "BUTTON") {
                // Close button was clicked
                that.emitEvent("paletteVisChange", [that, false]);
            } else {
                dragStartPos = {
                    x: parseInt(containerElement.style.left, 10) || 0,
                    y: parseInt(containerElement.style.top, 10) || 0,
                };
                dragOffset = {x: e.pageX - $(containerElement).position().left, y: e.pageY - $(containerElement).position().top};
                
                if (cpController.getSmallScreenMode()) {
                    // Wait for the cursor to move a certain amount before we classify this as a drag
                    dragAction = "dragStart";
                } else {
                    dragAction = "dragging";
                }
                
                e.target.setPointerCapture(e.pointerId);
            }
        }
    }

    function paletteHeaderPointerUp(e) {
        if (dragAction === "dragging" || dragAction === "dragStart") {
            if (dragAction === "dragStart") {
                // We clicked the header. Cancel the drag and toggle the palette instead
                e.stopPropagation();
                e.preventDefault();
                
                /* Don't move the dialog immediately, because otherwise a click event will be
                 * dispatched on the element which ends up under the cursor afterwards.
                 */
                setTimeout(() => {
                    that.setLocation(dragStartPos.x, dragStartPos.y);
                    that.toggleCollapse();
                }, 100);
            }

            dragAction = false;

            try {
                e.target.releasePointerCapture(e.pointerId);
            } catch (e) {
                // This can fail for a variety of reasons we don't care about and won't affect us
                console.error(e);
            }
        }
    }
    
    function vertHandlePointerMove(e) {
        if (dragAction == "vertResize") {
            that.setHeight(e.pageY - $(containerElement).offset().top);
        }
    }

    function vertHandlePointerUp(e) {
        vertHandle.releasePointerCapture(e.pointerId);
        dragAction = false;
    }
    
    function vertHandlePointerDown(e) {
        dragAction = "vertResize";
        vertHandle.setPointerCapture(e.pointerId);
    }
    
    function addVertResizeHandle() {
        vertHandle = document.createElement("div");
        
        vertHandle.className = "chickenpaint-resize-handle-vert";
        
        vertHandle.addEventListener("pointerdown", vertHandlePointerDown);
        vertHandle.addEventListener("pointermove", vertHandlePointerMove);
        vertHandle.addEventListener("pointerup", vertHandlePointerUp);
        
        containerElement.appendChild(vertHandle);
    }
    
    function horzHandlePointerMove(e) {
        if (dragAction == "horzResize") {
            that.setWidth(e.pageX - $(containerElement).offset().left);
        }
    }
    
    function horzHandlePointerUp(e) {
        horzHandle.releasePointerCapture(e.pointerId);
        dragAction = false;
    }
    
    function horzHandlePointerDown(e) {
        dragAction = "horzResize";
        horzHandle.setPointerCapture(e.pointerId);
    }
    
    function addHorzResizeHandle() {
        horzHandle = document.createElement("div");
        
        horzHandle.className = "chickenpaint-resize-handle-horz";
        
        horzHandle.addEventListener("pointerdown", horzHandlePointerDown);
        horzHandle.addEventListener("pointermove", horzHandlePointerMove);
        horzHandle.addEventListener("pointerup", horzHandlePointerUp);
        
        containerElement.appendChild(horzHandle);
    }

    collapseIcon.className = "collapse-icon fas fa-angle-down";
    
    closeButton.type = "button";
    closeButton.className = "close";
    closeButton.innerHTML = "&times;";
    
    containerElement.className = "chickenpaint-palette chickenpaint-palette-" + className;
    
    headElement.className = "chickenpaint-palette-head";
    headElement.setAttribute("touch-action", "none");

    let
        titleContainer = document.createElement("div"),
        titleElem = document.createElement("h5");

    titleContainer.className = 'modal-header';

    titleElem.className = 'modal-title';
    titleElem.appendChild(document.createTextNode(this.title));
    titleElem.appendChild(collapseIcon);

    titleContainer.appendChild(titleElem);
    titleContainer.appendChild(closeButton);

    headElement.appendChild(titleContainer);

    bodyElement.className = "chickenpaint-palette-body";

    containerElement.appendChild(headElement);
    containerElement.appendChild(bodyElement);

    if (this.resizeVert) {
        addVertResizeHandle();
    }
    
    if (this.resizeHorz) {
        addHorzResizeHandle();
    }
    
    headElement.addEventListener("pointerdown", paletteHeaderPointerDown);
    headElement.addEventListener("pointermove", paletteHeaderPointerMove);
    headElement.addEventListener("pointerup", paletteHeaderPointerUp);
}

CPPalette.prototype = Object.create(EventEmitter.prototype);
CPPalette.prototype.constructor = EventEmitter;