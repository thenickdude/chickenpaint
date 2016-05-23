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
import CPBlend from "../engine/CPBlend";
import CPSlider from "./CPSlider";
import CPLayerGroup from "../engine/CPLayerGroup";
import CPImageLayer from "../engine/CPImageLayer";
import SVGPathTranspiler from "../util/CPSVGPathTranspiler";
import CPSVGPathTranspiler from "../util/CPSVGPathTranspiler";

export default function CPLayersPalette(controller) {
    CPPalette.call(this, controller, "layers", "Layers", true);

    const
        BUTTON_PRIMARY = 0,
        BUTTON_WHEEL = 1,
        BUTTON_SECONDARY = 2;

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
        
        addLayerButton = document.createElement("li"),
        addFolderButton = document.createElement("li"),
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

	        /**
             * The canvas for the entire layer widget area.
             *
             * @type {HTMLCanvasElement}
             */
            canvas = document.createElement("canvas"),
            canvasContext = canvas.getContext("2d"),

            oldApplyPlacement,
            notificationMessage = "",
            notificationLayer = null,
            notificationLayerIndex = -1,
            notificationLocation = "",

            dismissTimer = false,

            layerMenu,
            dropdownLayer = null,
            dropdownLayerDisplayIndex = -1,

            drawDownArrow = CPSVGPathTranspiler(`
                M32 1280h704q13 0 22.5 -9.5t9.5 -23.5v-863h192q40 0 58 -37t-9 -69l-320 -384q-18 -22 -49 -22
                t-49 22l-320 384q-26 31 -9 69q18 37 58 37h192v640h-320q-14 0 -25 11l-160 192q-13 14 -4 34
                q9 19 29 19z`
            ),

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
            const
                SELECTED_LAYER_BG_COLOR = '#C0C0D0',
                LAYER_BG_COLOR = 'white';

            var
                d = {width: canvas.width, height: canvas.height},
                textLeft = eyeW + 6 * window.devicePixelRatio;

            // Bring the origin of the coordinates to the top left corner of the layer
            canvasContext.translate(0, -layerH);

            if (selected) {
                canvasContext.fillStyle = SELECTED_LAYER_BG_COLOR;
            } else {
                canvasContext.fillStyle = LAYER_BG_COLOR;
            }
            canvasContext.fillRect(0, 0, d.width, layerH);

            canvasContext.beginPath();

            // Horizontal line on the bottom of the layer
            canvasContext.moveTo(0, 0.5); // Half-pixel offset so we fill the whole pixel
            canvasContext.lineTo(d.width, 0.5);

            // Vertical line next to the eye
            canvasContext.moveTo(eyeW + 0.5, 0);
            canvasContext.lineTo(eyeW + 0.5, layerH);

            canvasContext.stroke();

            canvasContext.fillStyle = 'black';

            if (layer instanceof CPImageLayer) {
                if (layer.clip) {
                    canvasContext.save();

                    canvasContext.translate(textLeft + 9 * window.devicePixelRatio, layerH * 0.67);
                    canvasContext.scale(-0.01 * window.devicePixelRatio, -0.01 * window.devicePixelRatio);

                    drawDownArrow(canvasContext);

                    canvasContext.restore();

                    textLeft += 13 * window.devicePixelRatio;
                }
            }

            canvasContext.fillText(layer.name, textLeft, 12 * window.devicePixelRatio);
            canvasContext.fillText(CPBlend.BLEND_MODE_DISPLAY_NAMES[layer.blendMode] + ": " + layer.alpha + "%", textLeft, layerH - 5 * window.devicePixelRatio);

            // Draw the visibility eye
            canvasContext.beginPath();
            canvasContext.arc(eyeW / 2, layerH / 2, 9 * window.devicePixelRatio, 0, Math.PI * 2);
            if (layer.visible) {
                canvasContext.fill();
            } else {
                canvasContext.stroke();
            }
        }
        
        function mouseUp(e) {
            if (e.button == BUTTON_PRIMARY) {
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

        function contextMenuShow(e) {
            e.preventDefault();

            var
                offset = $(canvas).offset(),
                mouseLoc = {x: e.pageX - offset.left, y: e.pageY - offset.top},

                displayIndex = getDisplayIndexFromPoint(mouseLoc);

            if (displayIndex > -1 && displayIndex < numLayersHigh) {
                var
                    layer = getLayerFromDisplayIndex(displayIndex);

                if (artwork.getActiveLayer() != layer) {
                    controller.actionPerformed({action: "CPSetActiveLayer", layer: layer});
                }

                dropdownLayer = layer;
                dropdownLayerDisplayIndex = displayIndex;

                $(".chickenpaint-action-create-clipping-mask", layerMenu).toggle(layer instanceof CPImageLayer && !layer.clip);
                $(".chickenpaint-action-release-clipping-mask", layerMenu).toggle(layer instanceof CPImageLayer && !!layer.clip);

                $(this)
                    .dropdown("toggle")
                    .off("click.bs.dropdown"); // Remove Bootstrap's left-click handler installed by toggle
            }
        }
    
        function mouseDown(e) {
            if (e.button == BUTTON_PRIMARY) {
                var
                    offset = $(canvas).offset(),
                    mouseLoc = {x: e.pageX - offset.left, y: e.pageY - offset.top},

                    displayIndex = getDisplayIndexFromPoint(mouseLoc);

                if (displayIndex > -1 && displayIndex < numLayersHigh) {
                    var
                        layer = getLayerFromDisplayIndex(displayIndex);

                    if (mouseLoc.x / $(canvas).width() * canvas.width < eyeW) {
                        controller.actionPerformed({
                            action: "CPSetLayerVisibility",
                            layer: layer,
                            visible: !layer.visible
                        });
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

        function mouseClick(e) {
            if (e.button != BUTTON_SECONDARY) {
                // Don't pop up the popup menu for us
                e.stopPropagation();
                e.preventDefault();
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

            canvasContext.clearRect(0, -layerH, canvas.width, layerH);

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
            
            canvasContext.clearRect(0, 0, d.width, d.height - numLayersHigh * layerH);

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

	    /**
         * Get the {left,top} viewport-relative offset of the middle of the left edge of the specified layer (clipped to
         * the layer widget scroll area).
         *
         * To get a document-relative offset, just add document.body.scrollTop to the top.
         *
         * @param {int} displayIndex
         */
        function getViewportOffsetOfLayer(displayIndex) {
            var
                layerWidgetPos = canvas.getBoundingClientRect(),
                scrollBoxPos = container.getBoundingClientRect(),
                layerMiddle = layerWidgetPos.bottom - layerH / window.devicePixelRatio * (displayIndex + 0.5);

            return {left: layerWidgetPos.left, top: Math.min(Math.max(layerMiddle, scrollBoxPos.top), scrollBoxPos.bottom)};
        }

        /* Reposition the popover to the layer/location that the notification applies to */
        function applyNotificationPlacement(offset, placement) {
            oldApplyPlacement.call(this, offset, placement);

            var
                $tip = this.tip(),
                $arrow = this.arrow();

            switch (notificationLocation) {
                case "layer":
                    var
                        layerMiddle = getViewportOffsetOfLayer(notificationLayerIndex);

                    $tip.offset({
                        top: layerMiddle + document.body.scrollTop - $tip.height() / 2,
                        left: layerMiddle.left - $tip.outerWidth() - $arrow.outerWidth()
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

        function wrapWithElem(e, wrapWithName) {
            var
                parent = document.createElement(wrapWithName);

            parent.appendChild(e);

            return parent;
        }

        function createLayerMenu() {
            var
                menu = document.createElement("ul"),
                mnuDeleteLayer = document.createElement("a"),
                mnuCreateClippingMask  = document.createElement("a"),
                mnuReleaseClippingMask  = document.createElement("a");

            mnuDeleteLayer.href = "#";
            mnuDeleteLayer.innerHTML = "Delete layer";
            mnuDeleteLayer.addEventListener("click", function(e) {
                e.preventDefault();

                if (dropdownLayer) {
                    controller.actionPerformed({action: "CPSetActiveLayer", layer: dropdownLayer});
                    controller.actionPerformed({action: "CPRemoveLayer"});
                }
            });

            mnuCreateClippingMask.className = "chickenpaint-action-create-clipping-mask";
            mnuCreateClippingMask.href = "#";
            mnuCreateClippingMask.innerHTML = "Clip to the layer below";
            mnuCreateClippingMask.addEventListener("click", function(e) {
                e.preventDefault();

                if (dropdownLayer) {
                    controller.actionPerformed({action: "CPSetActiveLayer", layer: dropdownLayer});
                    controller.actionPerformed({action: "CPCreateClippingMask"});
                }
            });

            mnuReleaseClippingMask.className = "chickenpaint-action-release-clipping-mask";
            mnuReleaseClippingMask.href = "#";
            mnuReleaseClippingMask.innerHTML = "Release the clipping mask";
            mnuReleaseClippingMask.addEventListener("click", function(e) {
                e.preventDefault();

                if (dropdownLayer) {
                    controller.actionPerformed({action: "CPSetActiveLayer", layer: dropdownLayer});
                    controller.actionPerformed({action: "CPReleaseClippingMask"});
                }
            });

            menu.className = "dropdown-menu";
            menu.appendChild(wrapWithElem(mnuDeleteLayer, "li"));
            menu.appendChild(wrapWithElem(mnuCreateClippingMask, "li"));
            menu.appendChild(wrapWithElem(mnuReleaseClippingMask, "li"));

            return menu;
        }

        canvas.setAttribute("data-toggle", "dropdown");

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

            if (displayIndex > -1 && displayIndex < numLayersHigh) {
                if (mouseLoc.x * window.devicePixelRatio > eyeW) {
                    showRenameControl(displayIndex);
                }
            }
        });

        canvas.addEventListener("mousedown", mouseDown);
        canvas.addEventListener("click", mouseClick);
        canvas.addEventListener("contextmenu", contextMenuShow);

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
        
        container.className = "chickenpaint-layers-widget well";
        container.appendChild(canvas);

        layerMenu = createLayerMenu();
        container.appendChild(layerMenu);

        $(container).on("show.bs.dropdown", function() {
            /* Instead of Bootstrap's extremely expensive data API, we'll only listen for dismiss clicks on the
             * document *while the menu is open!*
             */
            $(document).one("click", function() {
                if ($(container).hasClass("open")) {
                    $(container).dropdown("toggle");
                }
            });

            var
                $dropdownElem = $(this).find(".dropdown-menu"),
                dropdownOffset = getViewportOffsetOfLayer(dropdownLayerDisplayIndex),
                paletteOffset = $(palette.getElement()).offset();

            dropdownOffset.top -= $dropdownElem.outerHeight(true) / 2;

            // Convert the offset to palette-relative coordinates (since that's its offset parent)
            $dropdownElem.css({
                left: (dropdownOffset.left + document.body.scrollLeft - paletteOffset.left) + "px",
                top: (dropdownOffset.top + document.body.scrollTop - paletteOffset.top) + "px"
            });
        });
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

    function createIcon(iconName) {
        var
            icon = document.createElement("span");

        icon.className = "fa fa-" + iconName;

        return icon;
    }

    blendCombo.className = "form-control";
    blendCombo.title = "Layer blending mode";
    blendCombo.addEventListener("change", function(e) {
        controller.actionPerformed({action: "CPSetLayerBlendMode", blendMode: parseInt(blendCombo.value, 10)});
    });
    
    fillCombobox(blendCombo, CPBlend.BLEND_MODE_DISPLAY_NAMES);

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
    
    addRemoveContainer.className = 'chickenpaint-layer-buttons list-unstyled';
    
    addLayerButton.className = 'chickenpaint-small-toolbar-button chickenpaint-add-layer';
    addLayerButton.title = 'Add layer';
    addLayerButton.appendChild(createIcon("file"));
    addLayerButton.addEventListener("click", function() {
        controller.actionPerformed({action: "CPAddLayer"});
    });

    addFolderButton.className = 'chickenpaint-small-toolbar-button chickenpaint-add-layer';
    addFolderButton.title = 'Add group';
    addFolderButton.appendChild(createIcon("folder"));
    addFolderButton.addEventListener("click", function() {
        controller.actionPerformed({action: "CPAddGroup"});
    });
    
    removeButton.className = 'chickenpaint-small-toolbar-button chickenpaint-remove-layer';
    removeButton.title = "Delete layer";
    removeButton.appendChild(createIcon("trash"));
    removeButton.addEventListener("click", function() {
        controller.actionPerformed({action: "CPRemoveLayer"});
    });
    
    addRemoveContainer.appendChild(addLayerButton);
    addRemoveContainer.appendChild(addFolderButton);
    addRemoveContainer.appendChild(removeButton);

    body.appendChild(addRemoveContainer);

    artwork.on("changeLayer", onChangeLayer);

    // Set initial values
    onChangeLayer.call(artwork, null);
}

CPLayersPalette.prototype = Object.create(CPPalette.prototype);
CPLayersPalette.prototype.constructor = CPLayersPalette;