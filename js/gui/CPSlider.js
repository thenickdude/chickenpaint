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

function CPSlider(minValue, maxValue, centerMode) {
    var 
        canvas = document.createElement("canvas"),
        canvasContext = canvas.getContext("2d"),
        
        minValue = 0, 
        maxValue = maxValue,
        
        valueRange = maxValue - minValue,
        
        dragNormal = false, dragPrecise = false,
        dragPreciseX,
        
        that = this;
    
    this.value = undefined;
    this.title = "";
    
    centerMode = centerMode || false;

	function paint() {
	    var
	        width = canvas.width,
	        height = canvas.height;
	    
		if (centerMode) {
		    // TODO
			/*if (that.value >= valueRange / 2) {
				g.drawString(this.title, 2, 14);

				g.fillRect(width / 2, 0, (that.value - valueRange / 2) * width / valueRange, height);
				
				g.setColor(Color.WHITE);
				
				g.setClip(width / 2, 0, (that.value - valueRange / 2) * width / valueRange, height);
				g.drawString(title, 2, 14);
			} else {
				g.drawString(title, 2, 14);

				g.fillRect(that.value * width / valueRange, 0, (valueRange/2 - that.value) * width / valueRange, height);

				g.setColor(Color.WHITE);
				
				g.setClip(that.value * width / valueRange, 0, (valueRange/2 - that.value) * width / valueRange, height);
				g.drawString(title, 2, 14);
			}*/
		} else {
	        canvasContext.save();
	        canvasContext.save();

		    canvasContext.fillStyle = 'black';
		    
		    canvasContext.beginPath();
		    canvasContext.rect(0, 0, that.value * width / valueRange, height);
		    canvasContext.fill();
		    
		    canvasContext.clip();
		    
		    canvasContext.fillStyle = 'white';
			canvasContext.fillText(that.title, 2, 14);
			
			// Remove the clip region
			canvasContext.restore();
			
		    canvasContext.fillStyle = 'white';

			canvasContext.beginPath();
			canvasContext.rect(that.value * width / valueRange, 0, width, height);
			canvasContext.fill();
			
			canvasContext.clip();
			
	        canvasContext.fillStyle = 'black';
            canvasContext.fillText(that.title, 2, 14);
			
	        canvasContext.restore();
		}
	}

	function mouseSelect(e) {
		var 
		    width = $(canvas).width(),
		    left = $(canvas).offset().left;

		that.setValue((e.pageX - left) * valueRange / width);
	}
		
    function mouseDragged(e) {
        if (dragNormal) {
            mouseSelect(e);
        } else if (dragPrecise) {
            var
                diff = (e.pageX - dragPreciseX) / 4;
            
            if (diff != 0) {
                that.setValue(that.value + diff);
                dragPreciseX = e.pageX;
            }
        }
    }

    function mouseUp(e) {
        if (dragNormal && e.button == 0) {
            dragNormal = false;
        } else if (dragPrecise && e.button == 2) {
            dragPrecise = false;
        } else {
            return;
        }
        
        document.body.removeEventListener("mouseup", mouseUp);
        document.body.removeEventListener("mousemove", mouseDragged);
    }
    
    this.setValue = function(_value) {
        _value = ~~Math.max(minValue, Math.min(maxValue, _value));
        
        if (this.value != _value) {
            this.value = _value;
            this.emitEvent('valueChange', [this.value]);
        
            paint();
        }
    }
    
    /**
     * Get the DOM element for the slider component.
     */
    this.getElement = function() {
        return canvas;
    }
	
	canvas.addEventListener("mousedown", function(e) {
		var 
		    dragging = dragNormal || dragPrecise;
		
		if (!dragging) {
    		switch (e.button) {
    		    case 0: // Left
        			dragNormal = true;
        			mouseSelect(e);
        		break;
    		    case 2: // Right
        			dragPrecise = true;
        			dragPreciseX = e.pageX;
        		break;
        		default:
        		    return;
    		}
    		
    		document.body.addEventListener("mouseup", mouseUp);
    		document.body.addEventListener("mousemove", mouseDragged);
		}
	});
	
	canvas.addEventListener("contextmenu", function(e) {
	    e.preventDefault()
	});;
	
	canvas.className = 'chickenpaint-slider';
	
    canvas.width = 150;
    canvas.height = 20;
    
    canvasContext.font = '9pt sans-serif';
}

CPSlider.prototype = Object.create(EventEmitter.prototype);
CPSlider.prototype.constructor = CPSlider;
