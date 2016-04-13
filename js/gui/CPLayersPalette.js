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

import CPPalette from "./CPPalette";
import CPSlider from "./CPSlider";

export default function CPLayersPalette(controller) {
    CPPalette.call(this, controller, "layers", "Layers", true);
    
    const
        MODE_NAMES = [
              "Normal", "Multiply", "Add", "Screen", "Lighten", "Darken", "Subtract", "Dodge", "Burn",
              "Overlay", "Hard Light", "Soft Light", "Vivid Light", "Linear Light", "Pin Light"
        ];
    
    var
        layerH = 32, eyeW = 24,
        
        body = this.getBodyElement(),

        layerWidget = new CPLayerWidget(),
        alphaSlider = new CPSlider(0, 100),
        blendCombo = document.createElement("select"),
    
        renameField = new CPRenameField(),
    
        cbSampleAllLayers = document.createElement("input"),
        cbLockAlpha = document.createElement("input"),
        
        addButton = document.createElement("li"),
        removeButton = document.createElement("li");
    
    function fillCombobox(combo, optionNames) {
        for (var i = 0; i < optionNames.length; i++) {
            var 
                option = document.createElement("option");
            
            option.appendChild(document.createTextNode(optionNames[i]));
            option.value = i;
            
            combo.appendChild(option);
        }
    }
    
    function wrapCheckboxWithLabel(checkbox, title) {
        var
            div = document.createElement("div"),
            label = document.createElement("label");

        div.className = "checkbox";
        
        label.appendChild(checkbox);
        label.appendChild(document.createTextNode(title));
        
        div.appendChild(label);
        
        return div;
    }

    function showRenameControl(layerIndex) {
        var
            d = layerWidget.getCSSSize(),
            artwork = controller.getArtwork(),
            layer = artwork.getLayer(layerIndex);

        renameField.show(
            eyeW / window.devicePixelRatio, 
            d.height - (layerIndex + 1) * layerH / window.devicePixelRatio,
            layerIndex,
            layer.name
       );
    }
    
    var
        parentSetSize = this.setSize,
        parentSetHeight = this.setHeight;
    
    this.setSize = function(w, h) {
        parentSetSize.call(this, w, h);
        
        layerWidget.resize();
        alphaSlider.resize();
    };

    this.setHeight = function(h) {
        parentSetHeight.call(this, h);
        
        layerWidget.resize();
    };

    function CPLayerWidget() {
        var 
            layerDrag, layerDragReally,
            layerDragIndex, layerDragY,
            
            container = document.createElement("div"),
            
            canvas = document.createElement("canvas"),
            canvasContext = canvas.getContext("2d"),
            
            that = this;

        /**
         * Get the size of the component on screen in CSS pixels.
         */
        this.getCSSSize = function() {
            return {width: $(canvas).width(), height: $(canvas).height()};
        }
        
        function getLayerIndex(point) {
            return Math.floor((canvas.height - point.y / $(canvas).height() * canvas.height) / layerH);
        }
        
        /**
         * @param layer CPLayer
         * @param selected boolean
         */
        function drawLayer(layer, selected) {
            var
                d = {width: canvas.width, height: canvas.height};

            if (selected) {
                canvasContext.fillStyle = '#B0B0C0';
            } else {
                canvasContext.fillStyle = 'white';
            }
            canvasContext.fillRect(0, 0, d.width, layerH);

            canvasContext.beginPath();
            
            canvasContext.moveTo(0, 0);
            canvasContext.lineTo(d.width, 0);
            
            canvasContext.moveTo(eyeW, 0);
            canvasContext.lineTo(eyeW, layerH);

            canvasContext.moveTo(eyeW + 6 * window.devicePixelRatio, layerH / 2);
            canvasContext.lineTo(d.width - 6 * window.devicePixelRatio, layerH / 2);
            
            canvasContext.stroke();

            canvasContext.fillStyle = 'black';
            
            canvasContext.fillText(layer.name, eyeW + 6 * window.devicePixelRatio, 12 * window.devicePixelRatio);
            canvasContext.fillText(MODE_NAMES[layer.blendMode] + ": " + layer.alpha + "%", eyeW + 6 * window.devicePixelRatio, layerH - 5 * window.devicePixelRatio);

            canvasContext.beginPath();
            if (layer.visible) {
                canvasContext.arc(eyeW / 2, layerH / 2, 10 * window.devicePixelRatio, 0, Math.PI * 2);
                canvasContext.fill();
            } else {
                canvasContext.arc(eyeW / 2, layerH / 2, 10 * window.devicePixelRatio, 0, Math.PI * 2);
                canvasContext.stroke();
            }
        }
        
        function mouseUp(e) {
            if (e.button == 0) {
                var
                    offset = $(canvas).offset(),
                    
                    artwork = controller.getArtwork(),
                    layers = artwork.getLayers(),
                    
                    mouseLoc = {x: e.pageX - offset.left, y: e.pageY - offset.top},
                    layerOver = getLayerIndex(mouseLoc);

                //layerDragY = e.pageY - offset.top;
                
                if (layerOver >= 0 && layerOver <= layers.length && layerOver != layerDragIndex && layerOver != layerDragIndex + 1) {
                    artwork.moveLayer(layerDragIndex, layerOver);
                }

                // Do we need to repaint to erase draglines?
                if (layerDragReally) {
                    layerDragReally = false;
                    that.paint();
                }
                
                layerDrag = false;
                
                window.removeEventListener("mousemove", mouseDragged);
                window.removeEventListener("mouseup", mouseUp);
            }
        }

        function mouseDragged(e) {
            if (layerDrag) {
                layerDragReally = true;
                layerDragY = e.pageY - $(canvas).offset().top;
                that.paint();
            }
        }

        /**
         * Repaint just the layer with the specified index
         */
        this.paintLayer = function(layerIndex) {
            var
                layer = artwork.getLayer(layerIndex),
                layerTop = canvas.height - layerH * (layerIndex + 1);
            
            canvasContext.save();
            
            canvasContext.fillStyle = '#606060';
            canvasContext.fillRect(0, layerTop, canvas.width, layerH);

            canvasContext.strokeStyle = 'black';
            
            canvasContext.translate(0, layerTop);
            drawLayer(layer, layerIndex == artwork.getActiveLayerIndex());
            
            canvasContext.restore();
        };
        
        /**
         * Repaint the entire control
         */
        this.paint = function() {
            var
                artwork = controller.getArtwork(),
                layers = artwork.getLayers(),
                
                d = {width: canvas.width, height: canvas.height},
                
                canvasScaleFactor = canvas.height / $(canvas).height();

            canvasContext.save();
            
            canvasContext.fillStyle = '#606060';
            canvasContext.fillRect(0, 0, d.width, d.height - layers.length * layerH);

            canvasContext.strokeStyle = 'black';

            // Draw the list of layers, with the first layer at the bottom of the control
            canvasContext.translate(0, d.height - layerH);
            
            for (var i = 0; i < layers.length; i++) {
                drawLayer(layers[i], i == artwork.getActiveLayerIndex());
                canvasContext.translate(0, -layerH);
            }

            if (layerDragReally) {
                canvasContext.translate(0, layers.length * layerH - (d.height - layerH));
                canvasContext.strokeRect(0, layerDragY * canvasScaleFactor  - layerH / 2, d.width, layerH);

                var
                    layerOver = getLayerIndex({x: 0, y: layerDragY});
                
                if (layerOver <= layers.length && layerOver != layerDragIndex && layerOver != layerDragIndex + 1) {
                    canvasContext.fillRect(0, d.height - layerOver * layerH - 2, d.width, 4 * window.devicePixelRatio);
                }
            }
            
            canvasContext.restore();
        }

        this.resize = function() {
            var
                artwork = controller.getArtwork(),

                // Our parent container will act as our scrollbar clip area
                parent = $(canvas).parent(),
                parentHeight = parent.height(),
                parentWidth = parent.width(),
                
                newWidth, newHeight;
            
            layerH = 34 * window.devicePixelRatio;
            eyeW = 24 * window.devicePixelRatio;
            
            newWidth = parentWidth * window.devicePixelRatio;
            newHeight = Math.max(layerH * artwork.getLayerCount(), parentHeight * window.devicePixelRatio);
            
            // Should we trigger a scrollbar to appear?
            if (newHeight > parentHeight * window.devicePixelRatio) {
                // Take the scrollbar width into account in our width
                newWidth -= 15 * window.devicePixelRatio;
                parent[0].style.overflowY = 'scroll';
            } else {
                parent[0].style.overflowY = 'hidden';
            }

            canvas.width = newWidth;
            canvas.height = newHeight;

            canvas.style.width = (newWidth / window.devicePixelRatio) + "px";
            canvas.style.height = (newHeight / window.devicePixelRatio) + "px";

            canvasContext.font = (layerH * 0.25) + "pt sans-serif";
            
            this.paint();
        };
        
        this.getElement = function() {
            return container;
        };
        
        canvas.addEventListener("click", function(e) {
            if (renameField.isVisible()) {
                renameField.renameAndHide();
            }
        });
        
        canvas.addEventListener("dblclick", function(e) {
            var 
                offset = $(canvas).offset(),
                mouseLoc = {x: e.pageX - offset.left, y: e.pageY - offset.top},
                
                layerIndex = getLayerIndex(mouseLoc);

            if (mouseLoc.x * window.devicePixelRatio > eyeW && layerIndex >= 0 && layerIndex < artwork.getLayerCount()) {
                showRenameControl(layerIndex);
            }
        });

        canvas.addEventListener("mousedown", function(e) {
            var
                offset = $(canvas).offset(),
                mouseLoc = {x: e.pageX - offset.left, y: e.pageY - offset.top};

            /* Click, moved from mouseClicked due to problems with focus and stuff */
            if (e.button == 0) { /* Left button */
                var
                    artwork = controller.getArtwork(),
                    layers = artwork.getLayers(),
                    
                    layerIndex = getLayerIndex(mouseLoc);
                
                if (layerIndex >= 0 && layerIndex < artwork.getLayerCount()) {
                    var
                        layer = artwork.getLayer(layerIndex);
                    
                    if (mouseLoc.x / $(canvas).width() * canvas.width < eyeW) {
                        artwork.setLayerVisibility(layerIndex, !layer.visible);
                    } else {
                        artwork.setActiveLayerIndex(layerIndex);
                        // Since this is a slow GUI operation, this is a good chance to get the canvas ready for drawing
                        artwork.performIdleTasks();
                    }
                }
                
                if (layerIndex < layers.length) {
                    layerDrag = true;
                    layerDragY = mouseLoc.y;
                    layerDragIndex = layerIndex;
                    
                    window.addEventListener("mousemove", mouseDragged);
                    window.addEventListener("mouseup", mouseUp);
                }
            }
        });
        
        if (!window.devicePixelRatio) {
            window.devicePixelRatio = 1.0;
        }
        
        canvasContext.strokeStyle = 'black';
        
        container.className = "chickenpaint-layers-widget";
        container.appendChild(canvas);
    }

    function CPRenameField() {
        var
            layerIndex = -1,
            textBox = document.createElement("input"),
            
            that = this;

        this.hide = function() {
            layerIndex = -1;
            textBox.style.display = 'none';
        };

        this.renameAndHide = function() {
            var 
                artwork = controller.getArtwork();

            artwork.setLayerName(layerIndex, textBox.value);

            this.hide();
        };

        this.isVisible = function() {
            return textBox.style.display != 'none';
        };
        
        this.setLocation = function(positionX, positionY) {
            textBox.style.left = positionX + "px";
            textBox.style.top = positionY + "px";
        };
        
        this.show = function(x, y, _layerIndex, layerName) {
            layerIndex = _layerIndex;
            textBox.value = layerName;
            this.setLocation(x, y);
            
            textBox.style.display = 'block';
            textBox.select();
        };
        
        this.getElement = function() {
            return textBox;
        };
        
        textBox.type = "text";
        textBox.className = "chickenpaint-layer-new-name form-control input-sm";
        textBox.style.display = 'none';

        textBox.addEventListener("keydown", function(e) {
            // Prevent other keyhandlers (CPCanvas) from getting their grubby hands on the input
            e.stopPropagation();
        });

        textBox.addEventListener("keypress", function(e) {
            if (e.keyCode == 13) { // Enter
                that.renameAndHide();
            }
            e.stopPropagation();
        });

        textBox.addEventListener("keyup", function(e) {
            if (e.keyCode == 27) { // Escape
                that.hide();
            }
            e.stopPropagation();
        });

        textBox.addEventListener("blur", function(e) {
            that.renameAndHide();
        });
    }
    
    blendCombo.className = "form-control";
    blendCombo.title = "Layer blending mode";
    blendCombo.addEventListener("change", function(e) {
        var
            artwork = controller.getArtwork();
        
        artwork.setLayerBlendMode(artwork.getActiveLayerIndex(), parseInt(blendCombo.value, 10));
    });
    
    fillCombobox(blendCombo, MODE_NAMES);

    body.appendChild(blendCombo);
    
    alphaSlider.title = function(value) {
        return "Opacity: " + value + "%";
    };
    
    alphaSlider.on("valueChange", function(value) {
        var
            artwork = controller.getArtwork();
        
        artwork.setLayerAlpha(artwork.getActiveLayerIndex(), value);
    });
    
    body.appendChild(alphaSlider.getElement());

    cbSampleAllLayers.type = "checkbox";
    cbSampleAllLayers.addEventListener("click", function(e) {
        var
            artwork = controller.getArtwork();
        
        artwork.setSampleAllLayers(cbSampleAllLayers.checked);
    });
    
    body.appendChild(wrapCheckboxWithLabel(cbSampleAllLayers, "Sample all layers"));
    
    cbLockAlpha.type = "checkbox";
    cbLockAlpha.addEventListener("click", function(e) {
        var
            artwork = controller.getArtwork();
        
       artwork.setLockAlpha(cbLockAlpha.checked);
    });
        
    body.appendChild(wrapCheckboxWithLabel(cbLockAlpha, "Lock alpha"));

    layerWidget.getElement().appendChild(renameField.getElement());

    body.appendChild(layerWidget.getElement());

    // Add/Remove layer buttons
    var
        addRemoveContainer = document.createElement("ul");
    
    addRemoveContainer.className = 'chickenpaint-layer-add-remove list-unstyled';
    
    addButton.className = 'chickenpaint-small-toolbar-button chickenpaint-add-layer';
    addButton.title = 'Add layer';
    addButton.addEventListener("click", function() {
        controller.getArtwork().addLayer();
    });

    removeButton.className = 'chickenpaint-small-toolbar-button chickenpaint-remove-layer';
    removeButton.title = "Delete layer";
    removeButton.addEventListener("click", function() {
        if (!controller.getArtwork().removeLayer()) {
            alert("Error: You can't remove the last remaining layer in the drawing.");
        }
    });
    
    addRemoveContainer.appendChild(addButton);
    addRemoveContainer.appendChild(removeButton);

    body.appendChild(addRemoveContainer);
    
    // Set initial values
    var
        artwork = controller.getArtwork();
    
    alphaSlider.setValue(artwork.getActiveLayer().getAlpha());
    blendCombo.value = artwork.getActiveLayer().getBlendMode();

    // add listeners
    controller.getArtwork().on("changeLayer", function(layerIndex) {
        var
            artwork = this;
        
        if (artwork.getActiveLayer().getAlpha() != alphaSlider.value) {
            alphaSlider.setValue(artwork.getActiveLayer().getAlpha());
        }

        if (artwork.getActiveLayer().getBlendMode() != parseInt(blendCombo.value, 10)) {
            blendCombo.value = artwork.getActiveLayer().getBlendMode();
        }

        if (layerIndex !== undefined) {
            layerWidget.paintLayer(layerIndex);
        } else {
            // We may have added or removed layers, resize as appropriate
            layerWidget.resize();
        }
    });
}

CPLayersPalette.prototype = Object.create(CPPalette.prototype);
CPLayersPalette.prototype.constructor = CPLayersPalette;