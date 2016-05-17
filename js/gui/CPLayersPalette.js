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
import CPLayerGroup from "../engine/CPLayerGroup";

export default function CPLayersPalette(controller) {
    CPPalette.call(this, controller, "layers", "Layers", true);
    
    const
        MODE_NAMES = [
              "Normal", "Multiply", "Add", "Screen", "Lighten", "Darken", "Subtract", "Dodge", "Burn",
              "Overlay", "Hard Light", "Soft Light", "Vivid Light", "Linear Light", "Pin Light"
        ];
    
    var
        palette = this,
        layerH = 32, eyeW = 24,

        artwork = controller.getArtwork(),
    
        // How many layers are expanded/visible right now?
        numLayersHigh = 0,

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
        const
            NOTIFICATION_HIDE_DELAY_MS_PER_CHAR = 70,
            NOTIFICATION_HIDE_DELAY_MIN = 3000;

        var 
            isDragging = false, isDraggingReally,
            layerDragIndex, layerDrag, layerDragY,
            
            container = document.createElement("div"),
            
            canvas = document.createElement("canvas"),
            canvasContext = canvas.getContext("2d"),

            oldApplyPlacement,
            notificationMessage = "",
            notificationLayer = null,
            notificationLayerIndex = -1,
            notificationLocation = "",

            dismissTimer = false,
            
            that = this;

        /**
         * Get the size of the component on screen in CSS pixels.
         */
        this.getCSSSize = function() {
            return {width: $(canvas).width(), height: $(canvas).height()};
        };
    
        function showRenameControl(displayIndex) {
            var
                d = that.getCSSSize(),
                layer = getLayerFromDisplayIndex(displayIndex);
        
            renameField.show(
                eyeW / window.devicePixelRatio,
                d.height - (displayIndex + 1) * layerH / window.devicePixelRatio,
                layer,
                layer.name
            );
        }

        function getLayerFromDisplayIndex(displayIndex) {
            return controller.getArtwork().getLayersRoot().getLinearizedLayerList(true)[displayIndex];
        }

        function getDisplayIndexFromLayer(layer) {
            return controller.getArtwork().getLayersRoot().getLinearizedLayerList(true).indexOf(layer);
        }

        function getDisplayIndexFromPoint(point) {
            var
                index = Math.floor((canvas.height - point.y / $(canvas).height() * canvas.height) / layerH);

            // We also return the index of the one-after-last layer for the sake of drag operations
            if (index < 0 || index > numLayersHigh) {
                return -1;
            }

            return index;
        }
        
        /**
         * Paint the given layer above the current translate position.
         *
         * @param {CPLayer} layer
         * @param {boolean} selected
         */
        function paintLayer(layer, selected) {
            var
                d = {width: canvas.width, height: canvas.height};

            canvasContext.translate(0, -layerH);

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
                canvasContext.arc(eyeW / 2, layerH / 2, 9 * window.devicePixelRatio, 0, Math.PI * 2);
                canvasContext.fill();
            } else {
                canvasContext.arc(eyeW / 2, layerH / 2, 9 * window.devicePixelRatio, 0, Math.PI * 2);
                canvasContext.stroke();
            }
        }
        
        function mouseUp(e) {
            if (e.button == 0) {
                var
                    offset = $(canvas).offset(),

                    mouseLoc = {x: e.pageX - offset.left, y: e.pageY - offset.top},
                    displayIndex = getDisplayIndexFromPoint(mouseLoc);

                if (isDraggingReally && displayIndex >= 0 && displayIndex <= numLayersHigh && displayIndex != layerDragIndex && displayIndex != layerDragIndex + 1) {
                    // Adding to the topmost position of the document
                    if (displayIndex == numLayersHigh) {
                        controller.actionPerformed({
                            action: "CPRelocateLayer",
                            layer: layerDrag,
                            toGroup: artwork.getLayersRoot(),
                            toIndex: artwork.getLayersRoot().layers.length
                        });
                    } else {
                        var
                            belowThisLayer = getLayerFromDisplayIndex(displayIndex),
                            targetGroup = belowThisLayer.parent;

                        controller.actionPerformed({
                            action: "CPRelocateLayer",
                            layer: layerDrag,
                            toGroup: targetGroup,
                            toIndex: targetGroup.indexOf(belowThisLayer)
                        });
                    }
                }

                // Do we need to repaint to erase draglines?
                if (isDraggingReally) {
                    isDraggingReally = false;
                    that.paint();
                }
                
                isDragging = false;
                
                window.removeEventListener("mousemove", mouseDragged);
                window.removeEventListener("mouseup", mouseUp);
            }
        }
    
        function mouseDown(e) {
            var
                offset = $(canvas).offset(),
                mouseLoc = {x: e.pageX - offset.left, y: e.pageY - offset.top};
        
            if (e.button == 0) { /* Left button */
                var
                    displayIndex = getDisplayIndexFromPoint(mouseLoc);
            
                if (displayIndex != -1) {
                    var
                        layer = getLayerFromDisplayIndex(displayIndex);
                
                    if (mouseLoc.x / $(canvas).width() * canvas.width < eyeW) {
                        controller.actionPerformed({action: "CPSetLayerVisibility", layer: layer, visible: !layer.visible});
                    } else if (artwork.getActiveLayer() != layer) {
                        controller.actionPerformed({action: "CPSetActiveLayer", layer: layer});
                    }
                
                    isDragging = true;
                    layerDragY = mouseLoc.y;
                    layerDrag = layer;
                    layerDragIndex = displayIndex;
                
                    window.addEventListener("mousemove", mouseDragged);
                    window.addEventListener("mouseup", mouseUp);
                }
            }
        }

        function mouseDragged(e) {
            if (isDragging) {
                isDraggingReally = true; // We actually moved the mouse from the starting position
                layerDragY = e.pageY - $(canvas).offset().top;
                that.paint();
            }
        }

        /**
         * Repaint just the specified layer
         */
        this.repaintLayer = function(layer) {
            var
                layerBottom = canvas.height - layerH * artwork.getLayersRoot().getLinearizedLayerList(true).indexOf(layer);
            
            canvasContext.save();

            // Skip any layers before ours to get to the right position
            canvasContext.translate(0, layerBottom);

            // Repaint the background color behind the layer to erase it
            canvasContext.fillStyle = '#606060';
            canvasContext.fillRect(0, -layerH, canvas.width, layerH);

            canvasContext.strokeStyle = 'black';

            paintLayer(layer, layer == artwork.getActiveLayer());
            
            canvasContext.restore();
        };
        
        function paintLayerGroupContents(layerGroup) {
            for (let layer of layerGroup.layers) {
                // The contents of the layer display below the group marker itself
                if (layer instanceof CPLayerGroup) {
                    paintLayerGroupContents(layer);
                }
                paintLayer(layer, layer == artwork.getActiveLayer());
            }
        }
        
        /**
         * Repaint the entire control
         */
        this.paint = function() {
            var
                layersRoot = artwork.getLayersRoot(),
                
                d = {width: canvas.width, height: canvas.height},
                
                canvasScaleFactor = canvas.height / $(canvas).height();

            canvasContext.save();
            
            canvasContext.fillStyle = '#606060';
            canvasContext.fillRect(0, 0, d.width, d.height - numLayersHigh * layerH);

            canvasContext.strokeStyle = 'black';

            // Draw the list of layers, with the first layer at the bottom of the control
            canvasContext.translate(0, d.height);
            
            paintLayerGroupContents(layersRoot);

            if (isDraggingReally) {
                var
                    allLayersDrawnHeight = numLayersHigh * layerH;

                // Get back to the bottom of the canvas
                canvasContext.translate(0, allLayersDrawnHeight);
                canvasContext.strokeRect(0, layerDragY * canvasScaleFactor - d.height -layerH / 2, d.width, layerH);

                var
                    overIndex = getDisplayIndexFromPoint({x: 0, y: layerDragY});

                // We offer to drop the layer below the layer the mouse is pointing at
                if (overIndex != -1 && overIndex != layerDragIndex && overIndex != layerDragIndex + 1) {
                    canvasContext.fillRect(0, -overIndex * layerH - 2, d.width, 4 * window.devicePixelRatio);
                }
            }

            canvasContext.restore();
        };

        this.resize = function() {
            var
                // Our parent container will act as our scrollbar clip area
                parent = $(canvas).parent(),
                parentHeight = parent.height(),
                parentWidth = parent.width(),
                
                newWidth, newHeight;
            
            layerH = 34 * window.devicePixelRatio;
            eyeW = 24 * window.devicePixelRatio;
            
            newWidth = parentWidth * window.devicePixelRatio;
            newHeight = Math.max(layerH * numLayersHigh, parentHeight * window.devicePixelRatio);
            
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
            this.dismissNotification();
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

                displayIndex = getDisplayIndexFromPoint(mouseLoc);

            if (displayIndex != -1) {
                if (mouseLoc.x * window.devicePixelRatio > eyeW) {
                    showRenameControl(displayIndex);
                }
            }
        });

        canvas.addEventListener("mousedown", mouseDown);

        /**
         * Scroll the layer widget until the layer with the given index is fully visible.
         *
         * @param {int} displayIndex
         */
        function revealLayer(displayIndex) {
            var
                layerWidgetPos = canvas.getBoundingClientRect(),

                scrollBoxPos = container.getBoundingClientRect(),
                scrollBoxHeight = scrollBoxPos.bottom - scrollBoxPos.top,

                layerHeight = layerH / window.devicePixelRatio,

                layerTop = layerWidgetPos.bottom - layerHeight * (displayIndex + 1),
                layerBottom = layerTop + layerHeight;

            container.scrollTop = Math.max(Math.min(Math.max(container.scrollTop, layerBottom - layerWidgetPos.top - scrollBoxHeight), layerTop - layerWidgetPos.top), 0);
        }

        this.dismissNotification = function() {
            $(canvas).popover('hide');
        };

        this.showNotification = function(layer, message, where) {
            notificationMessage = message;
            notificationLayer = layer;
            notificationLayerIndex = getDisplayIndexFromLayer(layer);

            if (artwork.getActiveLayer() == layer && where == "opacity") {
                notificationLocation = "opacity";
            } else {
                notificationLocation = "layer";
                revealLayer(notificationLayerIndex);
            }

            $(canvas).popover("show");

            if (dismissTimer) {
                clearTimeout(dismissTimer);
            }
            dismissTimer = setTimeout(function() {
                dismissTimer = false;
                that.dismissNotification()
            }, Math.max(Math.round(notificationMessage.length * NOTIFICATION_HIDE_DELAY_MS_PER_CHAR), NOTIFICATION_HIDE_DELAY_MIN));
        };

        /* Reposition the popover to the layer/location that the notification applies to */
        function applyNotificationPlacement(offset, placement) {
            oldApplyPlacement.call(this, offset, placement);

            var
                $tip = this.tip(),
                $arrow = this.arrow(),
                layerWidgetPos = canvas.getBoundingClientRect(),
                scrollBoxPos = container.getBoundingClientRect();

            switch (notificationLocation) {
                case "layer":
                    var
                        layerMiddle = layerWidgetPos.bottom - layerH / window.devicePixelRatio * (notificationLayerIndex + 0.5);

                    layerMiddle = Math.min(Math.max(layerMiddle, scrollBoxPos.top), scrollBoxPos.bottom);

                    $tip.offset({
                        top: layerMiddle + document.body.scrollTop - $tip.height() / 2,
                        left: layerWidgetPos.left - $tip.outerWidth() - $arrow.outerWidth()
                    });
                break;
                case "opacity":
                    var
                        alphaSliderPos = alphaSlider.getElement().getBoundingClientRect();

                    $tip.offset({
                        top: (alphaSliderPos.top + alphaSliderPos.bottom - $tip.height()) / 2 + document.body.scrollTop,
                        left: alphaSliderPos.left - $tip.outerWidth() - $arrow.outerWidth()
                    });
                break;
            }

            $arrow.css("top", "50%");
        }

        controller.on("layerNotification", this.showNotification.bind(this));

        $(canvas)
            .popover({
                html: false,
                content: function() {
                    return notificationMessage;
                },
                placement: "left",
                trigger: "manual",
                container: palette.getElement()
            });

        var
            popover = $(canvas).data('bs.popover');

        // Save the old positioning routine so we can call it later
        oldApplyPlacement = popover.applyPlacement;

        popover.applyPlacement = applyNotificationPlacement;
        
        if (!window.devicePixelRatio) {
            window.devicePixelRatio = 1.0;
        }

        canvasContext.strokeStyle = 'black';
        
        container.className = "chickenpaint-layers-widget";
        container.appendChild(canvas);
    }

	/**
     *
     * @param {?CPLayer} layer
     */
    function onChangeLayer(layer) {
        artwork = this;

        var
            activeLayer = artwork.getActiveLayer();

        if (activeLayer.getAlpha() != alphaSlider.value) {
            alphaSlider.setValue(activeLayer.getAlpha());
        }

        if (activeLayer.getBlendMode() != parseInt(blendCombo.value, 10)) {
            blendCombo.value = activeLayer.getBlendMode();
        }

        if (layer) {
            layerWidget.repaintLayer(layer);
        } else {
            // We may have added or removed layers, resize as appropriate
            numLayersHigh = artwork.getLayersRoot().getLinearizedLayerList(true).length;

            layerWidget.resize();
        }

        layerWidget.dismissNotification();
    }

    function CPRenameField() {
        var
            layer = null,
            textBox = document.createElement("input"),
            
            that = this;

        this.hide = function() {
            layer = null;
            textBox.style.display = 'none';
        };

        this.renameAndHide = function() {
            if (layer.name != textBox.value) {
                controller.actionPerformed({action: "CPSetLayerName", layer: layer, name: textBox.value});
            }

            this.hide();
        };

        this.isVisible = function() {
            return textBox.style.display != 'none';
        };
        
        this.setLocation = function(positionX, positionY) {
            textBox.style.left = positionX + "px";
            textBox.style.top = positionY + "px";
        };
        
        this.show = function(x, y, _layer, layerName) {
            layer = _layer;
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
            if (layer) {
                that.renameAndHide();
            }
        });
    }

    blendCombo.className = "form-control";
    blendCombo.title = "Layer blending mode";
    blendCombo.addEventListener("change", function(e) {
        controller.actionPerformed({action: "CPSetLayerBlendMode", blendMode: parseInt(blendCombo.value, 10)});
    });
    
    fillCombobox(blendCombo, MODE_NAMES);

    body.appendChild(blendCombo);
    
    alphaSlider.title = function(value) {
        return "Opacity: " + value + "%";
    };
    
    alphaSlider.on("valueChange", function(value) {
        controller.actionPerformed({action: "CPSetLayerAlpha", alpha: value});
    });
    
    body.appendChild(alphaSlider.getElement());

    cbSampleAllLayers.type = "checkbox";
    cbSampleAllLayers.addEventListener("click", function(e) {
        artwork.setSampleAllLayers(cbSampleAllLayers.checked);
    });
    
    body.appendChild(wrapCheckboxWithLabel(cbSampleAllLayers, "Sample all layers"));
    
    cbLockAlpha.type = "checkbox";
    cbLockAlpha.addEventListener("click", function(e) {
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
        controller.actionPerformed({action: "CPAddLayer"});
    });

    removeButton.className = 'chickenpaint-small-toolbar-button chickenpaint-remove-layer';
    removeButton.title = "Delete layer";
    removeButton.addEventListener("click", function() {
        controller.actionPerformed({action: "CPRemoveLayer"});
    });
    
    addRemoveContainer.appendChild(addButton);
    addRemoveContainer.appendChild(removeButton);

    body.appendChild(addRemoveContainer);
    
    artwork.on("changeLayer", onChangeLayer);

    // Set initial values
    onChangeLayer.call(artwork, null);
}

CPLayersPalette.prototype = Object.create(CPPalette.prototype);
CPLayersPalette.prototype.constructor = CPLayersPalette;