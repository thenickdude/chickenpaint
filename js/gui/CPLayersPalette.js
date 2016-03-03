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

function CPLayersPalette(controller) {
    CPPalette.call(this, controller, "layers", "Layers");
    
    var
        MODE_NAMES = [
              "Normal", "Multiply", "Add", "Screen", "Lighten", "Darken", "Subtract", "Dodge", "Burn",
              "Overlay", "Hard Light", "Soft Light", "Vivid Light", "Linear Light", "Pin Light"
        ],
        
        layerH = 32, eyeW = 24;
    
    var
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
            d = layerWidget.getSize(),
            artwork = controller.getArtwork(),
            layers = artwork.getLayers();

        renameField.setEnabled(true);
        renameField.setVisible(true);
        renameField.requestFocus();

        renameField.setLocation(eyeW, d.height - (layerIndex + 1) * layerH);

        renameField.setText(layers[layerIndex].name);
        renameField.selectAll();

        renameField.layerIndex = layerIndex;
    }
    
    var
        parentSetSize = this.setSize;
    
    this.setSize = function(w, h) {
        parentSetSize.call(this, w, h);
        
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
         * Get the actual size of the component on screen in pixels.
         */
        function getRealSize() {
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
            canvasContext.stroke();
            
            canvasContext.beginPath();
            canvasContext.moveTo(eyeW, 0);
            canvasContext.lineTo(eyeW, layerH);
            canvasContext.stroke();

            canvasContext.fillStyle = 'black';
            canvasContext.fillText(layer.name, eyeW + 6 * window.devicePixelRatio, 12 * window.devicePixelRatio);
            
            canvasContext.beginPath();
            canvasContext.moveTo(eyeW + 6 * window.devicePixelRatio, layerH / 2);
            canvasContext.lineTo(d.width - 6 * window.devicePixelRatio, layerH / 2);
            canvasContext.stroke();

            canvasContext.fillText(MODE_NAMES[layer.blendMode] + ": " + layer.alpha + "%", eyeW + 6 * window.devicePixelRatio, 27 * window.devicePixelRatio);

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
                    d = {width: canvas.width, height: canvas.height},
                    offset = $(canvas).offset(),
                    
                    artwork = controller.getArtwork(),
                    layers = artwork.getLayers(),
                    
                    mouseLoc = {x: e.pageX - offset.left, y: e.pageY - offset.top},
                    layerOver = getLayerIndex(mouseLoc);

                //layerDragY = e.pageY - offset.top;
                
                if (layerOver >= 0 && layerOver <= layers.length && layerOver != layerDragIndex && layerOver != layerDragIndex + 1) {
                    artwork.moveLayer(layerDragIndex, layerOver);
                }

                layerDrag = false;
                layerDragReally = false;
                that.paint();
                
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

        this.paint = function() {
            var
                artwork = controller.getArtwork(),
                layers = artwork.getLayers(),
                
                d = {width: canvas.width, height: canvas.height},
                
                canvasScaleFactor = canvas.height / $(canvas).height();

            canvasContext.save();
            
            canvasContext.font = (layerH * 0.25) + "pt sans-serif";

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
                    canvasContext.fillRect(0, d.height - layerOver * layerH - 2, d.width, 4);
                }
            }
            
            canvasContext.restore();
        }

        this.resize = function() {
            var
                artwork = controller.getArtwork(),
                
                parentHeight = $(canvas).parent().height(),
                parentWidth = $(canvas).parent().width();
            
            layerH = 32;
            eyeW = 24;
            
            canvas.width = parentWidth;
            canvas.height = Math.max(layerH * artwork.getLayerCount(), parentHeight);
            
            if (!window.devicePixelRatio) {
                window.devicePixelRatio = 1.0;
            }
            
            // Did we trigger a scrollbar to appear?
            if (canvas.height > parentHeight) {
                // Take the scrollbar width into account in our width
                canvas.width = canvas.width - 15;
            }
            
            if (window.devicePixelRatio > 1) {
                canvas.width = canvas.width * window.devicePixelRatio;
                canvas.height = canvas.height * window.devicePixelRatio;
                
                layerH *= window.devicePixelRatio;
                eyeW *= window.devicePixelRatio;
            }
            
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
        
        canvas.addEventListener("ondblclick", function(e) {
            var 
                offset = $(canvas).offset(),
                mouseLoc = {x: e.pageX - offset.left, y: e.pageY - offset.top},
                
                layerIndex = getLayerIndex(mouseLoc);

            showRenameControl(layerIndex);
        });

        canvas.addEventListener("mousedown", function(e) {
            var
                offset = $(canvas).offset(),
                mouseLoc = {x: e.pageX - offset.left, y: e.pageY - offset.top};

            // click, moved from mouseClicked due
            // to problems with focus and stuff
            if (e.button == 0) { /* Left button */
                var
                    d = {width: canvas.width, height: canvas.height},
                    
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
                    }
                }
                
                if (layerIndex < layers.length) {
                    layerDrag = true;
                    layerDragY = mouseLoc.y;
                    layerDragIndex = layerIndex;
                    that.paint();
                    
                    window.addEventListener("mousemove", mouseDragged);
                    window.addEventListener("mouseup", mouseUp);
                }
            }
        });
        
        canvasContext.strokeStyle = 'black';
        
        container.className = "chickenpaint-layers-widget";
        container.appendChild(canvas);
    }

    function CPRenameField() {
        var
            layerIndex = -1,
            textBox = document.createElement("input");

        this.renameAndHide = function() {
            var 
                artwork = controller.getArtwork();

            if (layerIndex >= 0 && layerIndex < artwork.getLayerCount()) {
                artwork.setLayerName(layerIndex, textBox.value);
            }

            layerIndex = -1;
            textBox.style.display = 'none';
        }

        this.isVisible = function() {
            return textBox.style.display == 'none';
        };
        
        textBox.style.display = 'none';

        textBox.addEventListener("keypress", function(e) {
            if (e.characterCode == 13) {// Enter
                renameAndHide();
            }
        });
        
        textBox.addEventListener("focus", function(e) {
            // FIXME: hack to avoid losing the focus to the main canvas
            controller.canvas.dontStealFocus = true;
        });
        
        textBox.addEventListener("blur", function(e) {
            controller.canvas.dontStealFocus = false;
            renameAndHide();
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
    
    alphaSlider.on("valueChange", function(value) {
        var
            artwork = controller.getArtwork();
        
        artwork.setLayerAlpha(artwork.getActiveLayerIndex(), value);
        
        this.title = "Opacity: " + value + "%";
    });
    
    body.appendChild(alphaSlider.getElement());

    /*renameField = new CPRenameField();
    layerWidget.add(renameField);*/
    
    
    cbSampleAllLayers.type = "checkbox";
    cbSampleAllLayers.addEventListener("click", function(e) { // TODO correct event name?
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
        controller.getArtwork().removeLayer();
    });
    
    addRemoveContainer.appendChild(addButton);
    addRemoveContainer.appendChild(removeButton);

    body.appendChild(addRemoveContainer);
    
    // Set initial values
    var
        artwork = controller.getArtwork();
    
    alphaSlider.setValue(artwork.getActiveLayer().getAlpha());

    // add listeners
    controller.getArtwork().on("changeLayer", function() {
        var
            artwork = this;
        
        if (artwork.getActiveLayer().getAlpha() != alphaSlider.value) {
            alphaSlider.setValue(artwork.getActiveLayer().getAlpha());
        }

        if (artwork.getActiveLayer().getBlendMode() != parseInt(blendCombo.value, 10)) {
            blendCombo.value = artwork.getActiveLayer().getBlendMode();
        }

        layerWidget.resize();
    });
}

CPLayersPalette.prototype = Object.create(CPPalette.prototype);
CPLayersPalette.prototype.constructor = CPLayersPalette;