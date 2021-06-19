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

/**
 * @param vertical boolean
 */
export default function CPScrollbar(vertical) {
    let
        bar = document.createElement("div"),
        handle = document.createElement("div"),
        handleInner = document.createElement("div"),
        
        min = 0, max = 1, offset = 0, visibleRange = 1,
        
        blockIncrement = 10, unitIncrement = 1,
        
        valueIsAdjusting = false,
        
        handleSize = 1,
        
        dragging = false,
        dragLastOffset,
        
        that = this;
    
    function updateBar() {
        let
            longDimension = vertical ? $(bar).height() : $(bar).width();
                    
            /* As the size of the document approaches the size of the container, handle size grows to fill the 
             * whole track:
             */
        handleSize = visibleRange / (max - min) * longDimension; 
        
        let
            handleOffset = (offset - min) / (max - min) * (longDimension - handleSize);
        
        handleInner.style[vertical ? "height" : "width"] = handleSize + "px";
        handle.style[vertical ? "height" : "width"] = handleSize + "px";
        
        handle.style[vertical ? "top" : "left"] = handleOffset + "px";
    }
    
    this.setValues = function(_offset, _visibleRange, _min, _max) {
        offset = _offset;
        visibleRange = _visibleRange;
        min = _min;
        max = _max;
        
        updateBar();
    };
    
    this.setBlockIncrement = function(increment) {
        blockIncrement = increment;
    };
    
    this.setUnitIncrement = function(increment) {
        unitIncrement = increment;
    };
    
    this.getElement = function() {
        return bar;
    };
    
    this.getValueIsAdjusting = function() {
        return valueIsAdjusting;
    };
    
    function onBarClick(e) {
        if (this == bar) {
            let
                clickPos = vertical ? e.pageY - $(bar).offset().top : e.pageX - $(bar).offset().left,
                barPos = parseInt(handle.style[vertical ? "top" : "left"], 10);
            
            if (clickPos < barPos) {
                offset -= blockIncrement;
            } else {
                offset += blockIncrement;
            }
            
            that.emitEvent("valueChanged", [offset]);
            updateBar();
        }
    }
    
    function onHandlePress(e) {
        e.stopPropagation();

        dragLastOffset = vertical ? e.pageY - $(bar).offset().top : e.pageX - $(bar).offset().left;

        handle.setPointerCapture(e.pointerId);

        $(handle).addClass("dragging");
        dragging = true;
    }
    
    function onHandleClick(e) {
        e.stopPropagation();
    }
    
    function onHandleDrag(e) {
        if (dragging) {
            valueIsAdjusting = true;

            let
                longDimension = vertical ? $(bar).height() : $(bar).width(),
                mouseOffset = vertical ? e.pageY - $(bar).offset().top : e.pageX - $(bar).offset().left;

            offset = offset + (mouseOffset - dragLastOffset) * (max - min) / (longDimension - handleSize);

            offset = Math.min(Math.max(offset, min), max);

            dragLastOffset = mouseOffset;

            that.emitEvent("valueChanged", [offset]);
            updateBar();

            valueIsAdjusting = false;
        }
    }
    
    function onHandleRelease(e) {
        e.stopPropagation();

        if (dragging) {
            try {
                handle.releasePointerCapture(e.pointerId);
            } catch (e) {
            }

            $(handle).removeClass("dragging");
            dragging = false;
        }
    }
    
    bar.className = "chickenpaint-scrollbar "  + (vertical ? "chickenpaint-scrollbar-vertical" : "chickenpaint-scrollbar-horizontal");
    handle.className = "chickenpaint-scrollbar-handle";
    handle.setAttribute("touch-action", "none");
    handleInner.className = "chickenpaint-scrollbar-handle-inner";
    
    handle.appendChild(handleInner);
    bar.appendChild(handle);
    
    handle.addEventListener("pointerdown", onHandlePress);
    handle.addEventListener("pointermove", onHandleDrag);
    handle.addEventListener("pointerup", onHandleRelease);

    handle.addEventListener("click", onHandleClick);
    
    bar.addEventListener("click", onBarClick);
}

CPScrollbar.prototype = Object.create(EventEmitter.prototype);
CPScrollbar.prototype.constructor = CPScrollbar;