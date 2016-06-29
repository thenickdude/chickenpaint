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

import EventEmitter from "wolfy87-eventemitter";

export default function CPCheckbox(state, title) {
    var
        canvas = document.createElement('canvas'),
        canvasContext = canvas.getContext('2d'),
        
        that = this;
    
    this.state = state || false;
    
    function paint() {
        var 
            width = canvas.width,
            height = canvas.height;

        canvasContext.clearRect(0, 0, width, height);
        
        canvasContext.beginPath();
        canvasContext.arc(width / 2 + 1, width / 2 + 1, Math.max(width / 2, 1) - 2, 0, Math.PI * 2);
        
        if (that.state) {
            canvasContext.fill();
        } else {
            canvasContext.stroke();
        }
    }

    this.setValue = function(b) {
        if (this.state != b) {
            this.state = b;
            
            this.emitEvent('valueChange', [b]);
            
            paint();
        }
    };
    
    this.getElement = function() {
        return canvas;
    };
    
    canvas.addEventListener("mousedown", function(e) {
        that.setValue(!that.state);
    });
    
    canvas.title = title || "";
    canvas.className = 'chickenpaint-checkbox';
    
    canvas.width = 20;
    canvas.height = 20;
    
    canvas.fillStyle = 'black';
    canvas.strokeStyle = 'black';
    
    paint();
};

CPCheckbox.prototype = Object.create(EventEmitter.prototype);
CPCheckbox.prototype.constructor = CPCheckbox;