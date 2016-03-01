"use strict";

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

function CPBrushPalette(controller) {
    CPPalette.call(this, controller, "brush", "Brush");

	var
	    alphaCB = new CPBrushPalette.CPCheckBox(), 
	    alphaSlider = new CPSlider(1, 255),
	    
	    sizeCB = new CPBrushPalette.CPCheckBox(), 
	    sizeSlider = new CPSlider(1, 200),
	    
	    scatteringCB  = new CPBrushPalette.CPCheckBox(),
	    scatteringSlider = new CPSlider(0, 100), 
	
        resatSlider = new CPSlider(0, 100), 
        bleedSlider = new CPSlider(0, 100), 
        spacingSlider = new CPSlider(0, 100), 
        smoothingSlider = new CPSlider(0, 100),

        brushPreview = new CPBrushPalette.CPBrushPreview(controller),
	
        tipCombo = document.createElement("select"),
        TIP_NAMES = ["Round Pixelated", "Round Hard Edge", "Round Soft", "Square Pixelated", "Square Hard Edge"],
        
        body = this.getBodyElement();

	function sliderCheckboxGroup(checkbox, slider) {
	    var
	    group = document.createElement("div");
	    
	    group.className = "chickenpaint-checkbox-slider-group";
	    
	    group.appendChild(checkbox.getElement());
	    group.appendChild(slider.getElement());
	    
	    return group;
	}
	
	function fillCombobox(combo, optionNames) {
	    for (var i = 0; i < optionNames.length; i++) {
	        var 
	            option = document.createElement("option");
	        
	        option.appendChild(document.createTextNode(optionNames[i]));
	        option.value = i;
	        
	        combo.appendChild(option);
	    }
	}
	
	alphaSlider.on('valueChange', function(value) {
        controller.setAlpha(this.value);
        this.title = "Opacity: " + this.value;
	});

    sizeSlider.on('valueChange', function(value) {
        controller.setBrushSize(value);
        this.title = "Brush size: " + value;
    });
	
	resatSlider.on('valueChange', function(value) {
		controller.getBrushInfo().resat = value / 100.0;
		controller.callToolListeners();
		this.title = "Color: " + value + "%";
	});

	bleedSlider.on('valueChange', function(value) {
		controller.getBrushInfo().bleed = value / 100.0;
		controller.callToolListeners();
		this.title = "Blend: " + value + "%";
	});

	spacingSlider.on('valueChange', function(value) {
		controller.getBrushInfo().spacing = value / 100.0;
		controller.callToolListeners();
		this.title = "Spacing: " + value + "%";
	});

	scatteringCB.on('valueChange', function(state) {
		controller.getBrushInfo().pressureScattering = state;
		controller.callToolListeners();
	});

	scatteringSlider.on('valueChange', function(value) {
		controller.getBrushInfo().scattering = value / 100.0;
		controller.callToolListeners();
		this.title = "Scattering: " + value + "%";
	});

	smoothingSlider.on('valueChange', function(value) {
		controller.getBrushInfo().smoothing = value / 100.0;
		controller.callToolListeners();
		this.title = "Smoothing: " + value + "%";
	});
	
	alphaCB.on('valueChange', function(state) {
        controller.getBrushInfo().pressureAlpha = state;
        controller.callToolListeners();
	});
	
	sizeCB.on('valueChange', function(state) {
        controller.getBrushInfo().pressureSize = state;
        controller.callToolListeners();
	});
	
	tipCombo.className = 'form-control';
	fillCombobox(tipCombo, TIP_NAMES);
	
	body.appendChild(tipCombo);
    
    body.appendChild(brushPreview.getElement());
    
    body.appendChild(sliderCheckboxGroup(sizeCB, sizeSlider));
    body.appendChild(sliderCheckboxGroup(alphaCB, alphaSlider));
    body.appendChild(resatSlider.getElement());
    body.appendChild(bleedSlider.getElement());
    body.appendChild(spacingSlider.getElement());
    body.appendChild(sliderCheckboxGroup(scatteringCB, scatteringSlider));
    body.appendChild(smoothingSlider.getElement());

	alphaCB.setValue(controller.getBrushInfo().pressureAlpha);
	alphaSlider.setValue(controller.getAlpha());
	
	sizeCB.setValue(controller.getBrushInfo().pressureSize);
	sizeSlider.setValue(controller.getBrushSize());
	
	scatteringCB.setValue(controller.getBrushInfo().pressureScattering);
	scatteringSlider.setValue(~~(controller.getBrushInfo().scattering * 100));
	
	tipCombo.value = controller.getBrushInfo().type;

	resatSlider.setValue(~~(controller.getBrushInfo().resat * 100));
	bleedSlider.setValue(~~(controller.getBrushInfo().bleed * 100));
	spacingSlider.setValue(~~(controller.getBrushInfo().spacing * 100));
	smoothingSlider.setValue(~~(controller.getBrushInfo().smoothing * 100));
	
    controller.on('toolChange', function(tool, toolInfo) {
		alphaSlider.setValue(toolInfo.alpha);
		sizeSlider.setValue(toolInfo.size);
		sizeCB.setValue(toolInfo.pressureSize);
		alphaCB.setValue(toolInfo.pressureAlpha);
		tipCombo.value = toolInfo.type;
		scatteringCB.setValue(toolInfo.pressureScattering);

		if (~~(toolInfo.resat * 100.0) != resatSlider.value) {
			resatSlider.setValue(~~(toolInfo.resat * 100.0));
		}

		if (~~(toolInfo.bleed * 100.0) != bleedSlider.value) {
			bleedSlider.setValue(~~(toolInfo.bleed * 100.0));
		}

		if (~~(toolInfo.spacing * 100.0) != spacingSlider.value) {
			spacingSlider.setValue(~~(toolInfo.spacing * 100.0));
		}

		if (~~(toolInfo.scattering * 100.0) != scatteringSlider.value) {
			scatteringSlider.setValue(~~(toolInfo.scattering * 100.0));
		}

		if (~~(toolInfo.smoothing * 100.0) != smoothingSlider.value) {
			smoothingSlider.setValue(~~(toolInfo.smoothing * 100.0));
		}
	});
    
    tipCombo.addEventListener("change", function(e) {
        controller.getBrushInfo().type = parseInt(tipCombo.value, 10);
    });
}

CPBrushPalette.prototype = Object.create(CPPalette.prototype);
CPBrushPalette.prototype.constructor = CPBrushPalette;

CPBrushPalette.CPBrushPreview = function(controller) {
    var 
        size = 16,
        
        canvas = document.createElement("canvas"),
        canvasContext = canvas.getContext("2d"),
        
        mouseCaptured = false;
    
	function paint() {
	    canvasContext.clearRect(0, 0, canvas.width, canvas.height);
	    
	    canvasContext.beginPath();
	    canvasContext.arc(canvas.width / 2, canvas.height / 2, size / 2 * window.devicePixelRatio, 0, Math.PI * 2);
	    canvasContext.stroke();
	}
	
    function handleMouseDrag(e) {
        var 
            offset = $(canvas).offset(),
            
            pt = {x: e.pageX - offset.left, y: e.pageY - offset.top},
        
            x = pt.x - $(canvas).width() / 2,
            y = pt.y - $(canvas).height() / 2,

            newSize = Math.round(Math.sqrt(x * x + y * y) * 2);
        
        size = Math.max(1, Math.min(200, newSize));

        paint();
        controller.setBrushSize(size);
    }
    
	function handleMouseUp(e) {
	    if (mouseCaptured) {
    	    mouseCaptured = false;
    	    window.removeEventListener('mouseup', handleMouseUp);
    	    window.removeEventListener('mousemove', handleMouseDrag);
	    }
	}
	
	this.getElement = function() {
	    return canvas;
	};
	
	canvas.addEventListener('mousedown', function(e) {
	    if (!mouseCaptured) {
	        mouseCaptured = true;
	        
	        window.addEventListener('mouseup', handleMouseUp);
	        window.addEventListener('mousemove', handleMouseDrag);
	        
	        handleMouseDrag(e);
	    }
	});
	
	controller.on("toolChange", function(tool, toolInfo) {
		if (toolInfo.size != size) {
			size = toolInfo.size;
			paint();
		}
	});
	
    canvas.width = 64; 
    canvas.height = 64;
    
    if (window.devicePixelRatio > 1) {
        canvas.style.width = canvas.width + 'px';
        canvas.style.height = canvas.height + 'px';
        
        canvas.width = canvas.width * window.devicePixelRatio;
        canvas.height = canvas.height * window.devicePixelRatio;
    }
	
	canvas.className = 'chickenpaint-brush-preview';

    canvasContext.strokeStyle = 'black';
    canvasContext.lineWidth = 1.0 * window.devicePixelRatio;
    
	paint();
}

CPBrushPalette.CPCheckBox = function() {
    var
        canvas = document.createElement('canvas'),
        canvasContext = canvas.getContext('2d'),
        
        that = this;
    
	this.state = false;
	
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
		this.state = b;
		
		this.emitEvent('valueChanged', [b]);
		
		paint();
	};
	
	this.getElement = function() {
	    return canvas;
	}
	
	canvas.addEventListener("mousedown", function(e) {
	    that.setValue(!that.state);
	});
	
	canvas.className = 'chickenpaint-checkbox';
	
	canvas.width = 20;
	canvas.height = 20;
	
	canvas.fillStyle = 'black';
	canvas.strokeStyle = 'black';
	
	paint();
};

CPBrushPalette.CPCheckBox.prototype = Object.create(EventEmitter.prototype);
CPBrushPalette.CPCheckBox.prototype.constructor = CPBrushPalette.CPCheckBox;
