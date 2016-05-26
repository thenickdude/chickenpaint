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

function wrapWithElem(e, wrapWithName) {
    var
        parent = document.createElement(wrapWithName);

    parent.appendChild(e);

    return parent;
}

function createIcon(iconName) {
    var
        icon = document.createElement("span");

    icon.className = "fa " + iconName;

    return icon;
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

export default function CPLayersPalette(controller) {
    CPPalette.call(this, controller, "layers", "Layers", true);

    const
        BUTTON_PRIMARY = 0,
        BUTTON_WHEEL = 1,
        BUTTON_SECONDARY = 2;

    var
        palette = this,

        artwork = controller.getArtwork(),

        /**
         * An array of layers in display order, with the layers inside collapsed groups not present.
         *
         * @type {CPLayer[]}
         */
        linearizedLayers = null,

        body = this.getBodyElement(),

        positionRoot = this.getElement(),
        // This element will be responsible for positioning the BS dropdown
        dropdownParent = positionRoot,

        layerWidget = new CPLayerWidget(),
        alphaSlider = new CPSlider(0, 100),
        blendCombo = document.createElement("select"),
    
        renameField = new CPRenameField(),

        cbSampleAllLayers = document.createElement("input"),
        cbLockAlpha = document.createElement("input"),
        
        addLayerButton = document.createElement("li"),
        addFolderButton = document.createElement("li"),
        removeButton = document.createElement("li");

    /**
     *
     * @param {number} displayIndex
     * @returns {CPLayer}
     */
    function getLayerFromDisplayIndex(displayIndex) {
        return linearizedLayers[displayIndex];
    }

	/**
     *
     * @param {CPLayer} layer
     * @returns {int}
     */
    function getDisplayIndexFromLayer(layer) {
        return linearizedLayers.indexOf(layer);
    }

    function CPLayerWidget() {
        const
            NOTIFICATION_HIDE_DELAY_MS_PER_CHAR = 70,
            NOTIFICATION_HIDE_DELAY_MIN = 3000,
            LAYER_DRAG_START_THRESHOLD = 5, // Pixels we have to move a layer before it shows as "dragging"
            LAYER_IN_GROUP_INDENT = 16,

            CLASSNAME_LAYER_ACTIVE = "active",
            CLASSNAME_LAYER_VISIBLE = "chickenpaint-layer-visible",
            CLASSNAME_LAYER_HIDDEN = "chickenpaint-layer-hidden",
            CLASSNAME_LAYER_GROUP_EXPANDED = "chickenpaint-layer-group-expanded",
            CLASSNAME_LAYER_GROUP_COLLAPSED = "chickenpaint-layer-group-collapsed",
            CLASSNAME_LAYER_GROUP_TOGGLE = "chickenpaint-layer-group-toggle";

        var 
            isDragging = false, isDraggingReally = false,
            draggingLayerIndex,
	        /**
             * The image layer currently being dragged, or null if no drag is in progress.
             * @type {?CPLayer}
             */
            draggingLayer = null,

            /**
             * The element of the layer being dragged
             *
             * @type {HTMLElement}
             */
            draggingLayerElem,

	        /**
             * @type {number}
             */
            draggingX, draggingY,

            dropTarget,
            dropBetweenMarkerElem = null,
            draggingFrameElem = null,

            widgetContainer = document.createElement("div"),
            layerContainer = document.createElement("div"),

            oldApplyPlacement,
            notificationMessage = "",
            notificationLayer = null,
            notificationLayerIndex = -1,
            notificationLocation = "",

            dismissTimer = false,

            dropdownLayerMenu,
	        /**
             * @type {CPLayer}
             */
            dropdownLayer = null,

            that = this;

	    /**
         * Get the element that represents the layer with the given display index.
         *
         * @param {number} displayIndex
         * @returns {HTMLElement}
         */
        function getElemFromDisplayIndex(displayIndex) {
            var
                elems = $(".chickenpaint-layer", layerContainer);

            return elems.get(elems.length - 1 - displayIndex);
        }

        function getDisplayIndexFromElem(elem) {
            var
                layer = $(elem).closest(".chickenpaint-layer");

            if (layer.length) {
                var
                    elems = $(".chickenpaint-layer", layerContainer);

                return elems.length - 1 - elems.index(layer);
            } else {
                return -1;
            }
        }

        /**
         * @typedef CPDropTarget
         * @type Object
         * @property {int} displayIndex - The index of the layer to insert near
         * @property {CPLayer} layer - The layer to insert near
         * @property {string} direction - "under", "over" or "inside", the direction to insert relative to the target
         */

	    /**
         * Decides which drop target we should offer for the given mouse position.
         *
         * Returns null if no drop should be offered at the given position, otherwise returns an object with details
         * on the drop.
         *
         * @param {number} clientX
         * @param {number} clientY
         * @returns {?CPDropTarget}
	     */
        function getDropTargetFromClientPos(clientX, clientY) {
            var
                layerElems = $(".chickenpaint-layer", layerContainer),
                target = {layer: linearizedLayers[linearizedLayers.length - 1], displayIndex: linearizedLayers.length - 1, direction: "over"};

            for (var displayIndex = 0; displayIndex < layerElems.length; displayIndex++) {
                let
                    targetElem = layerElems[layerElems.length - 1 - displayIndex],
                    rect = targetElem.getBoundingClientRect();

                if (displayIndex == 0 && clientY > rect.bottom) {
                    // Special support for positioning after the last element to help us escape the bottom of a group
                    let
                        lastLayer = artwork.getLayersRoot().layers[0];

                    target = {layer: lastLayer, displayIndex: getDisplayIndexFromLayer(lastLayer), direction: "under"};
                    break;
                } else if (clientY >= rect.top) {
                    let
                        targetLayer = getLayerFromDisplayIndex(displayIndex),
                        targetHeight = rect.bottom - rect.top;

                    target = {layer: targetLayer, displayIndex: displayIndex};

                    if (targetLayer instanceof CPLayerGroup) {
                        if (clientY >= rect.top + targetHeight * 0.75) {
                            if (targetLayer.expanded && targetLayer.layers.length > 0) {
                                // Show the insert marker as above the top layer in the group
                                target.layer = targetLayer.layers[targetLayer.layers.length - 1];
                                target.displayIndex--;
                                target.direction = "over";
                            } else {
                                target.direction = "under";
                            }
                        } else if (clientY >= rect.top + targetHeight * 0.25) {
                            if (targetLayer.expanded && targetLayer.layers.length > 0) {
                                // Show the insert marker as above the top layer in the group rather than on top of the group
                                target.layer = targetLayer.layers[targetLayer.layers.length - 1];
                                target.displayIndex--;
                                target.direction = "over";
                            } else {
                                target.direction = "inside";
                            }
                        } else {
                            target.direction = "over";
                        }
                    } else {
                        if (clientY >= rect.top + targetHeight * 0.5) {
                            target.direction = "under";
                        } else {
                            target.direction = "over";
                        }
                    }
                    break;
                }
            }

            /*
             * If we're dropping into the same container, make sure we don't offer to drop the layer back to the
             * same position it was already in.
             */
            if (target.layer.parent == draggingLayer.parent && (target.direction == "over" || target.direction == "under")) {
                var
                    parentGroup = target.layer.parent,
                    targetIndex = parentGroup.indexOf(target.layer);

                if (target.direction == "over" && parentGroup.layers[targetIndex + 1] == draggingLayer
                        || target.direction == "under" && parentGroup.layers[targetIndex - 1] == draggingLayer
                        || target.layer == draggingLayer) {
                    return null;
                }
            }

            /*
             * Make sure we don't try to drop a group as a child of itself, no group-ception!
             */
            if (draggingLayer instanceof CPLayerGroup && (target.layer == draggingLayer && target.direction == "inside" || target.layer.hasAncestor(draggingLayer))) {
                return null;
            }

            return target;
        }

        function updateDropMarker() {
            if (isDraggingReally) {
                var
                    positionRootBounds = positionRoot.getBoundingClientRect(),
                    hideBetweenMarker = true,
                    hideIntoMarker = true;

                dropTarget = getDropTargetFromClientPos(draggingX, draggingY);

                if (dropTarget) {
                    var
                        targetElem = getElemFromDisplayIndex(dropTarget.displayIndex);

                    switch (dropTarget.direction) {
                        case "over":
                        case "under":
                            layerContainer.appendChild(dropBetweenMarkerElem);

                            let
                                layerRect,
                                markerDepth = dropTarget.layer.getDepth() - 1,
                                markerLeft,
                                layerBottom;

                            // Position the marker in the correct position between the layers, and indent it to match the layer
                            layerRect = targetElem.getBoundingClientRect();

                            // Are we dropping below the layers in an expanded group? Extend the rect to enclose them
                            if (dropTarget.direction == "under" && dropTarget.layer instanceof CPLayerGroup && dropTarget.layer.expanded) {
                                // Find the display index after this group
                                for (var childIndex = dropTarget.displayIndex - 1; childIndex >= 0; childIndex--) {
                                    if (!linearizedLayers[childIndex].hasAncestor(dropTarget.layer)) {
                                        break;
                                    }
                                }

                                layerBottom = getElemFromDisplayIndex(childIndex + 1).getBoundingClientRect().bottom;
                            } else {
                                layerBottom = layerRect.bottom;
                            }

                            markerLeft = layerRect.left - positionRootBounds.left + (markerDepth > 0 ? 26 + LAYER_IN_GROUP_INDENT * markerDepth : 0);

                            dropBetweenMarkerElem.style.left = markerLeft + "px";
                            dropBetweenMarkerElem.style.width = (layerRect.right - positionRootBounds.left - markerLeft) + "px";
                            dropBetweenMarkerElem.style.top = ((dropTarget.direction == "over" ? layerRect.top - 1 : layerBottom + 1) - positionRootBounds.top) + "px";

                            $(".chickenpaint-layer-drop-target", layerContainer).removeClass("chickenpaint-layer-drop-target");

                            hideBetweenMarker = false;
                        break;
                        case "inside":
                            var
                                layerElems = $(".chickenpaint-layer", layerContainer);

                            layerElems.each(function(index) {
                                $(this).toggleClass("chickenpaint-layer-drop-target", layerElems.length - 1 - index == dropTarget.displayIndex);
                            });

                            hideIntoMarker = false;
                        break;
                    }
                }

                if (hideIntoMarker) {
                    $(".chickenpaint-layer-drop-target", layerContainer).removeClass("chickenpaint-layer-drop-target");
                }

                if (hideBetweenMarker) {
                    $(dropBetweenMarkerElem).remove();
                }

                draggingFrameElem.style.top = (draggingY - positionRootBounds.top - parseInt(draggingFrameElem.style.height, 10) / 2) + "px";
            } else {
                $(dropBetweenMarkerElem).remove();
                $(draggingFrameElem).remove();
            }
        }

        /**
         * Create a DOM element for the given layer
         *
         * @param {CPLayer} layer
         * @param {boolean} selected
         */
        function buildLayer(index, layer) {
            var
                layerDiv = document.createElement("div"),
                eyeDiv = document.createElement("div"),
                mainDiv = document.createElement("div"),
                iconsDiv = document.createElement("div"),
                layerNameDiv = document.createElement("div"),
                blendDiv = document.createElement("div");

            layerDiv.className = "chickenpaint-layer list-group-item";

            if (layer == artwork.getActiveLayer()) {
                layerDiv.className += " " + CLASSNAME_LAYER_ACTIVE;
            }

            eyeDiv.className = "chickenpaint-layer-eye";
            if (!layer.ancestorsAreVisible()) {
                eyeDiv.className += " chickenpaint-layer-eye-hidden-ancestors";
            }
            
            if (layer.visible) {
                layerDiv.className += " " + CLASSNAME_LAYER_VISIBLE;
                eyeDiv.appendChild(createIcon("fa-eye"));
            } else {
                layerDiv.className += " " + CLASSNAME_LAYER_HIDDEN;
                eyeDiv.appendChild(createIcon("fa-eye-slash"));
            }

            mainDiv.className = "chickenpaint-layer-description";

            if (layer instanceof CPImageLayer) {
                if (layer.clip) {
                    layerDiv.className += " chickenpaint-layer-clipped";
                    iconsDiv.appendChild(createIcon("fa-level-down fa-flip-horizontal"))
                }
            } else if (layer instanceof CPLayerGroup) {
                layerDiv.className += " chickenpaint-layer-group";

                if (layer.expanded) {
                    layerDiv.className += " " + CLASSNAME_LAYER_GROUP_EXPANDED;
                    iconsDiv.appendChild(createIcon("fa-folder-open-o chickenpaint-layer-group-toggle"));
                } else {
                    layerDiv.className += " " + CLASSNAME_LAYER_GROUP_COLLAPSED;
                    iconsDiv.appendChild(createIcon("fa-folder-o chickenpaint-layer-group-toggle"));
                }
            }

            let
                layerName = (layer.name && layer.name.length > 0) ? layer.name : "(unnamed " + (layer instanceof CPLayerGroup ? "group" : "layer") + ")";

            layerNameDiv.innerText = layerName;
            layerNameDiv.setAttribute("title", layerName);
            layerNameDiv.className = "chickenpaint-layer-name";

            blendDiv.innerText = CPBlend.BLEND_MODE_DISPLAY_NAMES[layer.blendMode] + ": " + layer.alpha + "%";
            blendDiv.className = "chickenpaint-layer-blend";

            eyeDiv.style.marginRight = (2 + LAYER_IN_GROUP_INDENT * (layer.getDepth() - 1)) + "px";
            mainDiv.appendChild(layerNameDiv);
            mainDiv.appendChild(blendDiv);

            layerDiv.appendChild(eyeDiv);
            if (iconsDiv.childNodes.length) {
                iconsDiv.className = "chickenpaint-layer-icons";
                layerDiv.appendChild(iconsDiv);
            }
            layerDiv.appendChild(mainDiv);
            layerDiv.setAttribute("data-display-index", index);
            layerDiv.setAttribute("data-toggle", "dropdown");
            layerDiv.setAttribute("data-target", "#chickenpaint-layer-pop");

            return layerDiv;
        }

        function contextMenuShow(e) {
            e.preventDefault();

            var
                displayIndex = getDisplayIndexFromElem(e.target);

            if (displayIndex != -1) {
                var
                    layer = getLayerFromDisplayIndex(displayIndex);

                if (artwork.getActiveLayer() != layer) {
                    controller.actionPerformed({action: "CPSetActiveLayer", layer: layer});
                }

                dropdownLayer = layer;

                $(".chickenpaint-action-create-clipping-mask", dropdownLayerMenu).toggle(layer instanceof CPImageLayer && !layer.clip);
                $(".chickenpaint-action-release-clipping-mask", dropdownLayerMenu).toggle(layer instanceof CPImageLayer && !!layer.clip);

                $(getElemFromDisplayIndex(displayIndex))
                    .dropdown("toggle");
            }
        }

        function doubleClick(e) {
            // Make sure we didn't double-click on the layer eye...
            if ($(e.target).closest(".chickenpaint-layer-description").length > 0) {
                var
                    displayIndex = getDisplayIndexFromElem(e.target),
                    layer = getLayerFromDisplayIndex(displayIndex);

                renameField.show(
                    layer,
                    $(e.target).closest(".chickenpaint-layer")
                );

                e.preventDefault();
            }
        }

        function mouseDown(e) {
            if (e.button == BUTTON_PRIMARY) {
                var
                    layerElem = $(e.target).closest(".chickenpaint-layer")[0],
                    displayIndex = getDisplayIndexFromElem(layerElem);

                if (displayIndex != -1) {
                    var
                        layer = getLayerFromDisplayIndex(displayIndex);

                    if ($(e.target).closest(".chickenpaint-layer-eye").length) {
                        controller.actionPerformed({
                            action: "CPSetLayerVisibility",
                            layer: layer,
                            visible: !layer.visible
                        });
                    } else if (layer instanceof CPLayerGroup && $(e.target).closest("." + CLASSNAME_LAYER_GROUP_TOGGLE).length) {
                        controller.actionPerformed({
                            action: "CPExpandLayerGroup",
                            group: layer,
                            expand: !layer.expanded
                        });
                    } else {
                        if (artwork.getActiveLayer() != layer) {
                            controller.actionPerformed({action: "CPSetActiveLayer", layer: layer});
                        }
                        isDragging = true;
                        dropTarget = null;

                        draggingLayer = layer;
                        // We might have replaced the layer with a new element due to the CPSetActiveLayer, so fetch that again
                        draggingLayerElem = getElemFromDisplayIndex(displayIndex);
                        draggingLayerIndex = displayIndex;
                        draggingX = e.clientX;
                        draggingY = e.clientY;

                        window.addEventListener("mousemove", mouseDragged);
                        window.addEventListener("mouseup", mouseDragEnd);
                    }
                }
            }
        }

        function mouseClick(e) {
            if (e.button != BUTTON_SECONDARY) {
                // Don't pop up the popup menu for us (bootstrap calls toggle)
                e.stopPropagation();
                e.preventDefault();

                // Instead only allow the menu to *close*
                if ($(dropdownParent).hasClass("open")) {
                    $(dropdownParent).dropdown('toggle');
                }
            }
        }

        function mouseDragEnd(e) {
            if (e.button == BUTTON_PRIMARY) {
                isDragging = false;

                if (isDraggingReally) {
                    isDraggingReally = false;

                    $(draggingLayerElem).removeClass("chickenpaint-layer-dragging");

                    if (dropTarget) {
                        if (dropTarget.direction == "inside") {
                            controller.actionPerformed({
                                action: "CPRelocateLayer",
                                layer: draggingLayer,
                                toGroup: dropTarget.layer,
                                toIndex: dropTarget.layer.layers.length
                            });
                        } else {
                            controller.actionPerformed({
                                action: "CPRelocateLayer",
                                layer: draggingLayer,
                                toGroup: dropTarget.layer.parent,
                                toIndex: dropTarget.layer.parent.indexOf(dropTarget.layer) + (dropTarget.direction == "over" ? 1 : 0)
                            });
                        }
                    }

                    updateDropMarker();

                    dropTarget = null;
                }

                window.removeEventListener("mousemove", mouseDragged);
                window.removeEventListener("mouseup", mouseDragEnd);
            }
        }

        function startMouseDrag() {
            isDraggingReally = true; // We actually moved the mouse from the starting position

            draggingFrameElem = document.createElement("div");
            draggingFrameElem.className = "chickenpaint-layer-drag-frame";
            draggingFrameElem.style.width = $(draggingLayerElem).outerWidth(false) + "px";
            draggingFrameElem.style.height = $(draggingLayerElem).outerHeight(false) + "px";

            dropBetweenMarkerElem = document.createElement("div");
            dropBetweenMarkerElem.className = "chickenpaint-layer-drop-between-mark";

            draggingLayerElem.className += " chickenpaint-layer-dragging";

            layerContainer.appendChild(draggingFrameElem);
        }

        function mouseDragged(e) {
            if (isDragging) {
                var
                    newDragY = e.clientY;

                if (!isDraggingReally && Math.abs(newDragY - draggingY) > LAYER_DRAG_START_THRESHOLD) {
                    startMouseDrag();
                }

                if (isDraggingReally) {
                    draggingY = newDragY;
                    updateDropMarker();
                }
            }
        }

        /**
         * Rebuild all layer elements from the cached linearizedLayers list
         */
        this.buildLayers = function() {
            // Cache the details of the layer structure
            linearizedLayers = artwork.getLayersRoot().getLinearizedLayerList(true);

            var
                layerElems = linearizedLayers.map((layer, index) => buildLayer(index, layer)),

                layerFrag = document.createDocumentFragment();

            $(layerContainer).empty();

            for (var i = layerElems.length - 1; i >= 0; i--) {
                layerFrag.appendChild(layerElems[i]);
            }

            layerContainer.appendChild(layerFrag);

            updateDropMarker();
        };

	    /**
         * The properties of the given layer have changed, rebuild it.
         *
         * @param {CPLayer} layer
         */
        this.layerChanged = function(layer) {
            var
                index = getDisplayIndexFromLayer(layer),
                layerElem = $(getElemFromDisplayIndex(index));

            if (layer instanceof CPLayerGroup && (layer.expanded != $(layerElem).hasClass(CLASSNAME_LAYER_GROUP_EXPANDED) || layer.visible != $(layerElem).hasClass(CLASSNAME_LAYER_VISIBLE))) {
                // When these properties change, we might have to rebuild the group's children too, so just rebuild everything
                this.buildLayers();
            } else {
                layerElem.replaceWith(buildLayer(index, layer));
            }
        };

	    /**
         * Call when the selected layer changes.
         * 
         * @param {CPLayer} newLayer
         */
        this.activeLayerChanged = function(newLayer) {
            $(".chickenpaint-layer", layerContainer).removeClass(CLASSNAME_LAYER_ACTIVE);
            $(getElemFromDisplayIndex(getDisplayIndexFromLayer(newLayer))).addClass(CLASSNAME_LAYER_ACTIVE);
        };

        this.resize = function() {
            this.buildLayers();
            this.dismissNotification();
        };
        
        this.getElement = function() {
            return widgetContainer;
        };

        /**
         * Scroll the layer widget until the layer with the given index is fully visible.
         *
         * @param {int} displayIndex
         */
        function revealLayer(displayIndex) {
            let
                layerRect = getElemFromDisplayIndex(displayIndex).getBoundingClientRect(),
                containerRect = layerContainer.getBoundingClientRect();

            layerContainer.scrollTop =
                Math.max(
                    Math.min(
                        Math.max(
                            layerContainer.scrollTop,
                            // Scroll down to reveal the bottom of the layer
                            layerContainer.scrollTop + layerRect.bottom - containerRect.bottom
                        ),
                        layerContainer.scrollTop + layerRect.top - containerRect.top
                    ),
                    0
                );
        }

        this.dismissNotification = function() {
            $(widgetContainer).popover('hide');
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

            $(widgetContainer).popover("show");

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
                $arrow = this.arrow();

            switch (notificationLocation) {
                case "layer":
                    var
                        layerPos = getElemFromDisplayIndex(notificationLayerIndex).getBoundingClientRect();

                    $tip.offset({
                        top: document.body.scrollTop + (layerPos.top + layerPos.bottom - $tip.height()) / 2,
                        left: document.body.scrollLeft + (layerPos.left - $tip.outerWidth() - $arrow.outerWidth())
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

        function createLayerDropdownMenu() {
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

        dropdownParent.id = "chickenpaint-layer-pop";

        widgetContainer.className = "chickenpaint-layers-widget well";

        widgetContainer.addEventListener("dblclick", doubleClick);
        widgetContainer.addEventListener("mousedown", mouseDown);
        widgetContainer.addEventListener("click", mouseClick);
        widgetContainer.addEventListener("contextmenu", contextMenuShow);

        controller.on("layerNotification", this.showNotification.bind(this));

        $(widgetContainer)
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
            popover = $(widgetContainer).data('bs.popover');

        // Save the old positioning routine so we can call it later
        oldApplyPlacement = popover.applyPlacement;

        popover.applyPlacement = applyNotificationPlacement;

        layerContainer.className = "list-group";
        widgetContainer.appendChild(layerContainer);

        dropdownLayerMenu = createLayerDropdownMenu();
        widgetContainer.appendChild(dropdownLayerMenu);

        $(dropdownParent).on("show.bs.dropdown", function(e) {
            /* Instead of Bootstrap's extremely expensive data API, we'll only listen for dismiss clicks on the
             * document *while the menu is open!*
             */
            $(document).one("click", function() {
                if ($(dropdownParent).hasClass("open")) {
                    $(dropdownParent).dropdown("toggle");
                }
            });

            var
                layerElem = $(e.relatedTarget)[0],
                $dropdownElem = $(dropdownParent).find(".dropdown-menu"),

                layerPos = layerElem.getBoundingClientRect(),
                palettePos = palette.getElement().getBoundingClientRect();

            // Convert the offset to palette-relative coordinates (since that's its offset parent)
            $dropdownElem.css({
                left: (layerPos.left - palettePos.left) + "px",
                top: ((layerPos.top - $dropdownElem.outerHeight(true) / 2) - palettePos.top) + "px"
            });
        });
    }

    function updateActiveLayerControls() {
        var
            activeLayer = artwork.getActiveLayer();

        if (activeLayer.getAlpha() != alphaSlider.value) {
            alphaSlider.setValue(activeLayer.getAlpha());
        }

        if (activeLayer.getBlendMode() != parseInt(blendCombo.value, 10)) {
            blendCombo.value = activeLayer.getBlendMode();
        }
    }

    /**
     * Called when a layer has been added/removed.
     */
    function onChangeStructure() {
        artwork = this;

        // Fetch and rebuild all layers
        layerWidget.resize();

        updateActiveLayerControls();
    }

	/**
     * Called when the properties of one layer has been updated and we should rebuild/repaint it.
     *
     * @param {CPLayer} layer
     */
    function onChangeLayer(layer) {
        artwork = this;

        layerWidget.layerChanged(layer);
        layerWidget.dismissNotification();

        updateActiveLayerControls();
    }

	/**
     * Called when the selected layer changes.
     *
     * @param {CPLayer} oldLayer
     * @param {CPLayer} newLayer
     */
    function onChangeActiveLayer(oldLayer, newLayer) {
        layerWidget.activeLayerChanged(newLayer);
        updateActiveLayerControls();
    }

    function CPRenameField() {
        var
            layer = null,
            origName = "",

            textBox = document.createElement("input"),

            that = this;

        this.hide = function() {
            layer = null;

            var
                parentNameElem = $(textBox).parent();

            if (parentNameElem) {
                $(textBox).remove();
                parentNameElem.text(origName);
            }
        };

        this.renameAndHide = function() {
            if (layer.name != textBox.value) {
                controller.actionPerformed({action: "CPSetLayerName", layer: layer, name: textBox.value});
            }

            this.hide();
        };
        
        this.show = function(_layer, _layerElem) {
            layer = _layer;
            origName = layer.name;

            textBox.value = origName;

            $(".chickenpaint-layer-name", _layerElem).empty().append(textBox);
            textBox.select();
        };

        textBox.type = "text";
        textBox.className = "chickenpaint-layer-rename form-control input-sm";

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

    var
        parentSetSize = this.setSize,
        parentSetHeight = this.setHeight;

    this.setSize = function(w, h) {
        parentSetSize.call(this, w, h);

        layerWidget.dismissNotification();
        alphaSlider.resize();
    };

    this.setHeight = function(h) {
        parentSetHeight.call(this, h);

        layerWidget.resize();
    };

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

    body.appendChild(layerWidget.getElement());

    // Add/Remove layer buttons
    var
        addRemoveContainer = document.createElement("ul");
    
    addRemoveContainer.className = 'chickenpaint-layer-buttons list-unstyled';
    
    addLayerButton.className = 'chickenpaint-small-toolbar-button chickenpaint-add-layer';
    addLayerButton.title = 'Add layer';
    addLayerButton.appendChild(createIcon("fa-file"));
    addLayerButton.addEventListener("click", function() {
        controller.actionPerformed({action: "CPAddLayer"});
    });

    addFolderButton.className = 'chickenpaint-small-toolbar-button chickenpaint-add-layer';
    addFolderButton.title = 'Add group';
    addFolderButton.appendChild(createIcon("fa-folder"));
    addFolderButton.addEventListener("click", function() {
        controller.actionPerformed({action: "CPAddGroup"});
    });
    
    removeButton.className = 'chickenpaint-small-toolbar-button chickenpaint-remove-layer';
    removeButton.title = "Delete layer";
    removeButton.appendChild(createIcon("fa-trash"));
    removeButton.addEventListener("click", function() {
        controller.actionPerformed({action: "CPRemoveLayer"});
    });
    
    addRemoveContainer.appendChild(addLayerButton);
    addRemoveContainer.appendChild(addFolderButton);
    addRemoveContainer.appendChild(removeButton);

    body.appendChild(addRemoveContainer);

    artwork.on("changeActiveLayer", onChangeActiveLayer);
    artwork.on("changeLayer", onChangeLayer);
    artwork.on("changeStructure", onChangeStructure);

    // Set initial values
    onChangeStructure.call(artwork);
}

CPLayersPalette.prototype = Object.create(CPPalette.prototype);
CPLayersPalette.prototype.constructor = CPLayersPalette;