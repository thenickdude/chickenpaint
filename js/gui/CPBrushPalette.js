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

import ChickenPaint from "../ChickenPaint";

import CPPalette from "./CPPalette";
import CPCheckbox from "./CPCheckbox";
import CPColorSwatch from "./CPColorSwatch";
import CPSlider from "./CPSlider";
import {createCheckerboardPattern} from "./CPGUIUtils";

import CPLayer from "../engine/CPLayer";

import CPColor from "../util/CPColor";

const
    TIP_NAMES = ["Round Pixelated", "Round Hard Edge", "Round Soft", "Square Pixelated", "Square Hard Edge"],
    BRUSH_SIZES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 15, 20, 25, 30, 35, 40, 45, 50, 60, 70, 80, 90, 100, 125, 150, 175, 200];

function CPGradientPreview(controller) {
    var
        that = this,

        w = 150, h = 32,

        canvas = document.createElement("canvas"),
        canvasContext = canvas.getContext("2d"),

        checkerboard = createCheckerboardPattern(canvasContext),

        image = new CPLayer(w, h, ""),
        imageCanvas = document.createElement("canvas"),
        imageCanvasContext = imageCanvas.getContext("2d"),

        gradient = controller.getCurGradient();

    function paint() {
        image.gradient(image.getBounds(), 0, 0, image.width, 0, gradient, true);
        imageCanvasContext.putImageData(image.imageData, 0, 0, 0, 0, w, h);

        canvasContext.fillRect(0, 0, canvas.width, canvas.height);
        canvasContext.drawImage(imageCanvas, 0, 0);
    }

    this.getElement = function() {
        return canvas;
    };

    controller.on("gradientChange", function(_gradient) {
        gradient = _gradient;

        paint();
    });

    canvas.width = imageCanvas.width = w;
    canvas.height = imageCanvas.height = h;

    canvas.className = 'chickenpaint-gradient-preview';

    canvasContext.fillStyle = checkerboard;

    paint();
}

export default function CPBrushPalette(controller) {
    CPPalette.call(this, controller, "brush", "Tool options");

    var
        brushPanel = document.createElement("div"),

        tipCombo = document.createElement("select"),

        alphaCB = new CPCheckbox(false, "Control brush opacity with pen pressure"), 
        alphaSlider = new CPSlider(1, 255),
        
        sizeCB = new CPCheckbox(true, "Control brush size with pen pressure"), 
        sizeSlider = new CPSlider(1, 200, false, true),
        
        scatteringCB  = new CPCheckbox(false, "Control brush scattering with pen pressure"),
        scatteringSlider = new CPSlider(0, 1000, false, true),
    
        resatSlider = new CPSlider(0, 100, false, true),
        bleedSlider = new CPSlider(0, 100, false, true),
        spacingSlider = new CPSlider(0, 100, false, true),
        smoothingSlider = new CPSlider(0, 100, false, true),

        brushPreview = new CPBrushPalette.CPBrushPreview(controller),

        gradientPanel = document.createElement("div"),

        gradientPreview = new CPGradientPreview(controller),
        
        gradientStartSwatch = new CPColorSwatch(new CPColor(controller.getCurGradient()[0] & 0xFFFFFF)),
        gradientEndSwatch = new CPColorSwatch(new CPColor(controller.getCurGradient()[1] & 0xFFFFFF)),

        transformPanel = document.createElement("div"),

        transformAccept = document.createElement("button"),
        transformReject = document.createElement("button"),

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

    function buildBrushPanel() {
        alphaSlider.title = function (value) {
            return "Opacity: " + value;
        };

        alphaSlider.on('valueChange', function (value) {
            controller.setAlpha(value);
        });

        sizeSlider.title = function (value) {
            return "Brush size: " + value;
        }

        sizeSlider.on('valueChange', function (value) {
            controller.setBrushSize(value);
        });

        resatSlider.title = function (value) {
            return "Color: " + value + "%";
        };

        resatSlider.on('valueChange', function (value) {
            controller.getBrushInfo().resat = value / 100.0;
            controller.callToolListeners();
        });

        bleedSlider.title = function (value) {
            return "Blend: " + value + "%";
        };

        bleedSlider.on('valueChange', function (value) {
            controller.getBrushInfo().bleed = value / 100.0;
            controller.callToolListeners();
        });

        spacingSlider.title = function (value) {
            return "Spacing: " + value + "%";
        };

        spacingSlider.on('valueChange', function (value) {
            controller.getBrushInfo().spacing = value / 100.0;
            controller.callToolListeners();
        });

        scatteringSlider.title = function (value) {
            return "Scattering: " + value + "%";
        };

        scatteringSlider.on('valueChange', function (value) {
            controller.getBrushInfo().scattering = value / 100.0;
            controller.callToolListeners();
        });

        smoothingSlider.title = function (value) {
            return "Smoothing: " + value + "%";
        };

        smoothingSlider.on('valueChange', function (value) {
            controller.getBrushInfo().smoothing = value / 100.0;
            controller.callToolListeners();
        });

        scatteringCB.on('valueChange', function (state) {
            controller.getBrushInfo().pressureScattering = state;
            controller.callToolListeners();
        });

        alphaCB.on('valueChange', function (state) {
            controller.getBrushInfo().pressureAlpha = state;
            controller.callToolListeners();
        });

        sizeCB.on('valueChange', function (state) {
            controller.getBrushInfo().pressureSize = state;
            controller.callToolListeners();
        });

        tipCombo.addEventListener("change", function(e) {
            controller.getBrushInfo().type = parseInt(tipCombo.value, 10);
        });

        tipCombo.className = 'form-control';
        fillCombobox(tipCombo, TIP_NAMES);

        brushPanel.appendChild(tipCombo);

        brushPanel.appendChild(brushPreview.getElement());

        brushPanel.appendChild(sliderCheckboxGroup(sizeCB, sizeSlider));
        brushPanel.appendChild(sliderCheckboxGroup(alphaCB, alphaSlider));
        brushPanel.appendChild(resatSlider.getElement());
        brushPanel.appendChild(bleedSlider.getElement());
        brushPanel.appendChild(spacingSlider.getElement());
        brushPanel.appendChild(sliderCheckboxGroup(scatteringCB, scatteringSlider));
        brushPanel.appendChild(smoothingSlider.getElement());

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
    }

    function updateGradient() {
        var
            gradient = new Array(2);

        gradient[0] = (gradientStartSwatch.getAlpha() << 24) | gradientStartSwatch.getColorRgb();
        gradient[1] = (gradientEndSwatch.getAlpha() << 24) |  gradientEndSwatch.getColorRgb();

        controller.setCurGradient(gradient);
    }

    function buildGradientPanel() {
        gradientPanel.className = "chickenpaint-gradient-panel";
        gradientPanel.style.display = "none";

        gradientStartSwatch.on("colorChange", updateGradient);
        gradientStartSwatch.on("alphaChange", updateGradient);
        gradientEndSwatch.on("colorChange", updateGradient);
        gradientEndSwatch.on("alphaChange", updateGradient);

        var
            title, colorsGroup, colorGroup;

        title = document.createElement("p");
        title.innerHTML = "Gradient";

        gradientPanel.appendChild(title);
        gradientPanel.appendChild(gradientPreview.getElement());

        colorsGroup = document.createElement("div");
        colorsGroup.className = "chickenpaint-gradient-colors";

        colorGroup = document.createElement("div");
        colorGroup.className = "chickenpaint-gradient-start-color";
        
        colorGroup.appendChild(gradientStartSwatch.getElement());

        colorsGroup.appendChild(colorGroup);

        colorGroup = document.createElement("div");
        colorGroup.className = "chickenpaint-gradient-end-color";

        colorGroup.appendChild(gradientEndSwatch.getElement());

        colorsGroup.appendChild(colorGroup);

        gradientPanel.appendChild(colorsGroup);
    }

    function buildTransformPanel() {
        transformPanel.className = "chickenpaint-transform-panel";
        transformPanel.style.display = "none";

        transformAccept.type = "button";
        transformReject.type = "button";

        transformAccept.className = "btn btn-primary btn-block";
        transformReject.className = "btn btn-default btn-block";

        transformAccept.innerHTML = "Apply transform";
        transformReject.innerHTML = "Cancel";

        transformPanel.appendChild(transformAccept);
        transformPanel.appendChild(transformReject);

        transformAccept.addEventListener("click", function(e) {
            controller.actionPerformed({action: "CPTransformAccept"});
            e.preventDefault();
        });

        transformReject.addEventListener("click", function(e) {
            controller.actionPerformed({action: "CPTransformReject"});
            e.preventDefault();
        });
    }

    buildBrushPanel();
    body.appendChild(brushPanel);

    buildGradientPanel();
    body.appendChild(gradientPanel);

    buildTransformPanel();
    body.appendChild(transformPanel);

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

    controller.on('modeChange', function(mode) {
        brushPanel.style.display = "none";
        gradientPanel.style.display = "none";
        transformPanel.style.display = "none";

        switch (mode) {
            case ChickenPaint.M_GRADIENTFILL:
                gradientPanel.style.display = "block";
            break;
            case ChickenPaint.M_TRANSFORM:
                transformPanel.style.display = "block";
            break;
            default:
                brushPanel.style.display = "block";
            break;
       }
    });

    key("1,2,3,4,5,6,7,8,9,0", function(event, handler) {
        var
            shortcut = parseInt(handler.shortcut, 10);

        if (shortcut == 0) {
            shortcut = 10;
        }

        controller.setAlpha(Math.round(shortcut / 10 * 255));
    });

    key("{,[", function() {
        var
            size = controller.getBrushSize();

        for (var i = BRUSH_SIZES.length - 1; i >= 0; i--) {
            if (size > BRUSH_SIZES[i]) {
                controller.setBrushSize(BRUSH_SIZES[i]);
                break;
            }
        }
    });

    key("},]", function() {
        var
            size = controller.getBrushSize();

        for (var i = 0; i < BRUSH_SIZES.length; i++) {
            if (size < BRUSH_SIZES[i]) {
                controller.setBrushSize(BRUSH_SIZES[i]);
                break;
            }
        }
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
