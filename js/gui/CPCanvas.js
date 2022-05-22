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
import $ from "jquery";
import key from "../../lib/keymaster.js";

import CPRect from "../util/CPRect.js";
import CPTransform from "../util/CPTransform.js";
import CPWacomTablet from "../util/CPWacomTablet.js";
import CPBezier from "../util/CPBezier.js";
import {throttle} from "../util/throttle-debounce";
import CPPolygon from "../util/CPPolygon.js";
import {setCanvasInterpolation} from "../util/CPPolyfill.js";
import CPVector from "../util/CPVector.js";

import ChickenPaint from "../ChickenPaint.js";

import CPBrushInfo from "../engine/CPBrushInfo.js";
import CPLayerGroup from "../engine/CPLayerGroup.js";
import CPMaskView from "../engine/CPMaskView.js";

import {createCheckerboardPattern} from "./CPGUIUtils.js";
import CPScrollbar from "./CPScrollbar.js";
import CPColor from "../util/CPColor.js";
import {setContrastingDrawStyle} from "./CPGUIUtils.js";

function CPModeStack() {
    this.modes = [];
}

/* We have two distinguished mode indexes which correspond to the CPDefaultMode and the mode that the user has selected
 * in the tool palette (the global drawing mode). On top of that are other transient modes.
 */
CPModeStack.MODE_INDEX_DEFAULT = 0;
CPModeStack.MODE_INDEX_USER = 1;

CPModeStack.prototype.setMode = function(index, newMode) {
    var
        oldMode = this.modes[index];

    if (oldMode == newMode) {
        return;
    }

    if (oldMode) {
        oldMode.leave();
    }

    this.modes[index] = newMode;
    newMode.enter();
};

CPModeStack.prototype.setDefaultMode = function(newMode) {
    newMode.transient = false;
    newMode.capture = false;

    this.setMode(CPModeStack.MODE_INDEX_DEFAULT, newMode);
};

CPModeStack.prototype.setUserMode = function(newMode) {
    // Leave any transient modes that were on top of the user mode
    for (var i = this.modes.length - 1; i > CPModeStack.MODE_INDEX_USER; i--) {
        this.modes[i].leave();
        this.modes.splice(i, 1);
    }

    newMode.transient = false;
    newMode.capture = false;

    this.setMode(CPModeStack.MODE_INDEX_USER, newMode);
};

/**
 * Deliver the event with the given name and array of parameters to the mode stack.
 *
 * @param event
 * @param params
 * @returns {boolean} True if any mode captured the event
 */
CPModeStack.prototype.deliverEvent = function(event, params) {
    for (var i = this.modes.length - 1; i >= 0; i--) {
        var
            mode = this.modes[i];

        if (mode[event].apply(mode, params) || mode.capture && event != "paint") {
            /* If the event was handled, don't try to deliver it to anything further up the stack */
            return true;
        }
    }

    return false;
};

// We can call these routines to deliver events that bubble up the mode stack
for (let eventName of ["mouseDown", "mouseUp"]) {
    CPModeStack.prototype[eventName] = function (e, button, pressure) {
        this.deliverEvent(eventName, [e, button, pressure]);
    };
}

for (let eventName of ["mouseDrag", "mouseMove"]) {
    CPModeStack.prototype[eventName] = function (e, pressure) {
        this.deliverEvent(eventName, [e, pressure]);
    };
}

for (let eventName of ["keyDown", "keyUp"]) {
    CPModeStack.prototype[eventName] = function (e) {
        if (this.deliverEvent(eventName, [e])) {
            // Swallow handled keypresses
            e.preventDefault();
        }
    };
}

CPModeStack.prototype.paint = function(context) {
    this.deliverEvent("paint", [context]);
};

/**
 * Add a mode to the top of the mode stack.
 *
 * @param mode {CPMode}
 * @param transient {boolean} Set to true if the mode is expected to remove itself from stack upon completion.
 */
CPModeStack.prototype.push = function(mode, transient) {
    var
        previousTop = this.peek();

    if (previousTop) {
        previousTop.suspend();
    }

    mode.transient = transient;
    mode.capture = false;

    mode.enter();

    this.modes.push(mode);
};

CPModeStack.prototype.peek = function() {
    if (this.modes.length > 0) {
        return this.modes[this.modes.length - 1];
    } else {
        return null;
    }
};

/**
 * Remove the node at the top of the stack and return the new top of the stack.
 *
 * @returns {*}
 */
CPModeStack.prototype.pop = function() {
    var
        outgoingMode = this.modes.pop(),
        newTop = this.peek();

    if (outgoingMode) {
        outgoingMode.leave();
    }

    if (newTop) {
        newTop.resume();
    }

    return newTop;
};

export default function CPCanvas(controller) {
    const
        BUTTON_PRIMARY = 0,
        BUTTON_WHEEL = 1,
        BUTTON_SECONDARY = 2,

        MIN_ZOOM = 0.10,
        MAX_ZOOM = 16.0,

        CURSOR_DEFAULT = "default", CURSOR_PANNABLE = "grab", CURSOR_PANNING = "grabbing", CURSOR_CROSSHAIR = "crosshair",
        CURSOR_MOVE = "move", CURSOR_NESW_RESIZE = "nesw-resize", CURSOR_NWSE_RESIZE = "nwse-resize",
        CURSOR_NS_RESIZE = "ns-resize", CURSOR_EW_RESIZE = "ew-resize";

    let
        that = this,
    
        canvasContainer = document.createElement("div"),
        canvasContainerTop = document.createElement("div"),
        canvasContainerBottom = document.createElement("div"),
        
        // Our canvas that fills the entire screen
        canvas = document.createElement("canvas"),
        canvasContext = canvas.getContext("2d"),
        
        // Our cache of the artwork's fusion to be drawn onto our main canvas using our current transform
        artworkCanvas = document.createElement("canvas"),
        artworkCanvasContext = artworkCanvas.getContext("2d"),
        
        checkerboardPattern = createCheckerboardPattern(canvasContext),
        
        artwork = controller.getArtwork(),

        // Canvas transformations
        zoom = 1,
        offsetX = 0, offsetY = 0,
        canvasRotation = 0.0,
        transform = new CPTransform(),
        interpolation = false,

        // Grid options
        showGrid = false,
        gridSize = 32,
        
        mouseX = 0, mouseY = 0,
        mouseIn = false, mouseDown = [false, false, false] /* Track each button independently */, wacomPenDown = false,

        sawPen = false,
        sawTouchWithPressure = false,

        /* The area of the document that should have its layers fused and repainted to the screen
         * (i.e. an area modified by drawing tools). 
         * 
         * Initially set to the size of the artwork so we can repaint the whole thing.
         */
        artworkUpdateRegion = artwork.getBounds(),
        
        /**
         * The area of the canvas that should be repainted to the screen during the next repaint internal (in canvas
         * coordinates).
         */
        repaintRegion = new CPRect(0, 0, 0, 0),
        scheduledRepaint = false,

	    /**
         * If we're viewing a single mask on its own instead of the document fusion, we store that view here.
         *
         * @type {CPMaskView}
         */
        maskView,
        
        //
        // Modes system: modes control the way the GUI is reacting to the user input
        // All the tools are implemented through modes
        //
        
        defaultMode,
        colorPickerMode,
        panMode,
        rotateCanvasMode,
        floodFillMode,
        gradientFillMode,
        rectSelectionMode,
        moveToolMode,
        transformMode,

        // this must correspond to the stroke modes defined in CPToolInfo
        drawingModes = [],

        modeStack = new CPModeStack(),

        curDrawMode,
        
        horzScroll = new CPScrollbar(false), 
        vertScroll = new CPScrollbar(true),
        
        tablet = CPWacomTablet.getRef();

    Math.sign = Math.sign || function(x) {
        x = +x; // convert to a number
        if (x === 0 || isNaN(x)) {
            return x;
        }
        return x > 0 ? 1 : -1;
    };

    // Parent class with empty event handlers for those drawing modes that don't need every event
    function CPMode() {
    }

	/**
     * True if this mode will be exiting the mode stack as soon as the current interation is complete.
     *
     * @type {boolean}
     */
    CPMode.prototype.transient = false;

	/**
     * If true, no input events will be sent to any modes underneath this one (event stream is captured).
     *
     * Painting events will continue to bubble.
     *
     * @type {boolean}
     */
    CPMode.prototype.capture = false;
    
    CPMode.prototype.enter = function() {
        setCursor(CURSOR_DEFAULT);
    };

    CPMode.prototype.leave = function() {
        this.capture = false;
    };

    CPMode.prototype.mouseMove = CPMode.prototype.paint = CPMode.prototype.mouseDown
        = CPMode.prototype.mouseDrag = CPMode.prototype.mouseUp = CPMode.prototype.keyDown
        = CPMode.prototype.suspend = CPMode.prototype.resume = CPMode.prototype.keyUp = function() {};

    //
    // Default UI Mode when not doing anything: used to start the other modes
    //

    function CPDefaultMode() {
    }
    
    CPDefaultMode.prototype = Object.create(CPMode.prototype);
    CPDefaultMode.prototype.constructor = CPDefaultMode;
    
    CPDefaultMode.prototype.mouseDown = function(e, button, pressure) {
        var
            spacePressed = key.isPressed("space");
        
        if (!spacePressed
                && (button == BUTTON_SECONDARY || button == BUTTON_PRIMARY && e.altKey)) {
            modeStack.push(colorPickerMode, true);
            // Avoid infinite recursion by only delivering the event to the new mode (don't let it bubble back to us!)
            modeStack.peek().mouseDown(e, button, pressure);
        } else if (button == BUTTON_WHEEL || spacePressed && button == BUTTON_PRIMARY) {
            if (e.altKey) {
                modeStack.push(rotateCanvasMode, true);
                modeStack.peek().mouseDown(e, button, pressure);
            } else {
                modeStack.push(panMode, true);
                modeStack.peek().mouseDown(e, button, pressure);
            }
        }
    };
    
    CPDefaultMode.prototype.keyDown = function(e) {
        if (e.keyCode == 32 /* Space */) {
            if (e.altKey) {
                modeStack.push(rotateCanvasMode, true);
                modeStack.peek().keyDown(e);
            } else {
                // We can start the pan mode before the mouse button is even pressed, so that the "grabbable" cursor appears
                modeStack.push(panMode, true);
                modeStack.peek().keyDown(e);
            }
            return true;
        }
    };

	/**
     * A base for the three drawing modes, so they can all share the same brush-preview-circle drawing behaviour.
     *
     * @constructor
     */
    function CPDrawingMode() {
        this.shouldPaintBrushPreview = false;

        /* The last rectangle we dirtied with a brush preview circle, or null if one hasn't been drawn yet */
        this.oldPreviewRect = null;
    }

    CPDrawingMode.prototype = Object.create(CPMode.prototype);
    CPDrawingMode.prototype.constructor = CPDrawingMode;

    /**
     * Get a rectangle that encloses the preview brush, in screen coordinates.
     */
    CPDrawingMode.prototype.getBrushPreviewOval = function() {
        var
            brushSize = controller.getBrushSize() * zoom;

        return new CPRect(
            mouseX - brushSize / 2,
            mouseY - brushSize / 2,
            mouseX + brushSize / 2,
            mouseY + brushSize / 2
        );
    };

    /**
     * Queues up the brush preview oval to be drawn.
     */
    CPDrawingMode.prototype.queueBrushPreview = function() {
        /* If we're not the top-most mode, it's unlikely that left clicking will drawing for us, so don't consider
         * painting the brush preview
         */
        if (modeStack.peek() != this) {
            return;
        }

        this.shouldPaintBrushPreview = true;

        var
            rect = this.getBrushPreviewOval();

        rect.grow(2, 2);

        // If a brush preview was drawn previously, stretch the repaint region to remove that old copy
        if (this.oldPreviewRect != null) {
            rect.union(this.oldPreviewRect);
            this.oldPreviewRect = null;
        }

        repaintRect(rect);
    };

	/**
     * Erase the brush preview if one had been drawn
     */
    CPDrawingMode.prototype.eraseBrushPreview = function() {
        this.shouldPaintBrushPreview = false;

        if (this.oldPreviewRect != null) {
            repaintRect(this.oldPreviewRect);
            this.oldPreviewRect = null;
        }
    };

    CPDrawingMode.prototype.mouseMove = function(e, pressure) {
        this.queueBrushPreview();
    };

    CPDrawingMode.prototype.enter = function() {
        CPMode.prototype.enter.call(this);

        if (mouseIn) {
            this.queueBrushPreview();
        }
    };

    CPDrawingMode.prototype.leave = function() {
        CPMode.prototype.leave.call(this);
        this.eraseBrushPreview();
    };

    CPDrawingMode.prototype.suspend = CPDrawingMode.prototype.leave;
    CPDrawingMode.prototype.resume = CPDrawingMode.prototype.enter;

    CPDrawingMode.prototype.paint = function() {
        if (this.shouldPaintBrushPreview) {
            this.shouldPaintBrushPreview = false;

            var
                r = this.getBrushPreviewOval();

            canvasContext.beginPath();

            canvasContext.arc(
                (r.left + r.right) / 2,
                (r.top + r.bottom) / 2,
                r.getWidth() / 2,
                0,
                Math.PI * 2
            );

            canvasContext.stroke();

            r.grow(2, 2);

            if (this.oldPreviewRect == null) {
                this.oldPreviewRect = r;
            } else {
                this.oldPreviewRect.union(r);
            }
        }
    };

    function CPFreehandMode() {
        CPDrawingMode.call(this);

        this.smoothMouse = {x:0.0, y:0.0};
    }
    
    CPFreehandMode.prototype = Object.create(CPDrawingMode.prototype);
    CPFreehandMode.prototype.constructor = CPFreehandMode;
    
    CPFreehandMode.prototype.mouseDown = function(e, button, pressure) {
        if (!this.capture && button == BUTTON_PRIMARY && !e.altKey && !key.isPressed("space") && shouldDrawToThisLayer()) {
            var
                pf = coordToDocument({x: mouseX, y:mouseY});

            this.eraseBrushPreview();
	
	        if (artwork.beginStroke(pf.x, pf.y, pressure)) {
		        this.capture = true;
		
		        this.smoothMouse = pf;
		
		        return true;
	        }
        }
    };

    CPFreehandMode.prototype.mouseDrag = function(e, pressure) {
        if (this.capture) {
            var
                pf = coordToDocument({x: mouseX, y: mouseY}),
                smoothing = Math.min(0.999, Math.pow(controller.getBrushInfo().smoothing, 0.3));

            this.smoothMouse.x = (1.0 - smoothing) * pf.x + smoothing * this.smoothMouse.x;
            this.smoothMouse.y = (1.0 - smoothing) * pf.y + smoothing * this.smoothMouse.y;

            artwork.continueStroke(this.smoothMouse.x, this.smoothMouse.y, pressure);

            return true;
        } else {
            this.mouseMove(e);
        }
    };

    CPFreehandMode.prototype.mouseUp = function(e, button, pressure) {
        if (this.capture) {
            if (button == BUTTON_PRIMARY) {
                this.capture = false;
                artwork.endStroke();
            }
            return true;
        }
    };
        
    function CPLineMode() {
        var
            dragLineFrom, dragLineTo,
            LINE_PREVIEW_WIDTH = 1;

        this.mouseDown = function(e, button, pressure) {
            if (!this.capture && button == BUTTON_PRIMARY && !e.altKey && !key.isPressed("space") && shouldDrawToThisLayer()) {
                this.capture = true;
                dragLineFrom = dragLineTo = {x: mouseX + 0.5, y: mouseY + 0.5};

                this.eraseBrushPreview();

                return true;
            }
        };

        this.mouseDrag = function(e) {
            if (this.capture) {
                var
                // The old line position that we'll invalidate for redraw
                    invalidateRect = new CPRect(
                        Math.min(dragLineFrom.x, dragLineTo.x) - LINE_PREVIEW_WIDTH - 1,
                        Math.min(dragLineFrom.y, dragLineTo.y) - LINE_PREVIEW_WIDTH - 1,
                        Math.max(dragLineFrom.x, dragLineTo.x) + LINE_PREVIEW_WIDTH + 1 + 1,
                        Math.max(dragLineFrom.y, dragLineTo.y) + LINE_PREVIEW_WIDTH + 1 + 1
                    );

                dragLineTo = {x: mouseX + 0.5, y: mouseY + 0.5}; // Target centre of pixel

                if (e.shiftKey) {
                    // Snap to nearest 45 degrees
                    var
                        snap = Math.PI / 4,
                        angle = Math.round(Math.atan2(dragLineTo.y - dragLineFrom.y, dragLineTo.x - dragLineFrom.x) / snap);

                    switch (angle) {
                        case 0:
                        case 4:
                            dragLineTo.y = dragLineFrom.y;
                            break;

                        case 2:
                        case 6:
                            dragLineTo.x = dragLineFrom.x;
                            break;

                        default:
                            angle *= snap;

                            var
                                length = Math.sqrt((dragLineTo.y - dragLineFrom.y) * (dragLineTo.y - dragLineFrom.y) + (dragLineTo.x - dragLineFrom.x) * (dragLineTo.x - dragLineFrom.x));

                            dragLineTo.x = dragLineFrom.x + length * Math.cos(angle);
                            dragLineTo.y = dragLineFrom.y + length * Math.sin(angle);
                    }
                }

                // The new line position
                invalidateRect.union(new CPRect(
                    Math.min(dragLineFrom.x, dragLineTo.x) - LINE_PREVIEW_WIDTH - 1,
                    Math.min(dragLineFrom.y, dragLineTo.y) - LINE_PREVIEW_WIDTH - 1,
                    Math.max(dragLineFrom.x, dragLineTo.x) + LINE_PREVIEW_WIDTH + 1 + 1,
                    Math.max(dragLineFrom.y, dragLineTo.y) + LINE_PREVIEW_WIDTH + 1 + 1
                ));

                repaintRect(invalidateRect);

                return true;
            } else {
                this.mouseMove.call(this, e);
            }
        };

        this.mouseUp = function(e, button, pressure) {
            if (this.capture && button == BUTTON_PRIMARY) {
                var
                    from = coordToDocument(dragLineFrom),
                    to = coordToDocument(dragLineTo);

                this.capture = false;

                this.drawLine(from, to);

                var
                    invalidateRect = new CPRect(
                        Math.min(dragLineFrom.x, dragLineTo.x) - LINE_PREVIEW_WIDTH - 1,
                        Math.min(dragLineFrom.y, dragLineTo.y) - LINE_PREVIEW_WIDTH - 1,
                        Math.max(dragLineFrom.x, dragLineTo.x) + LINE_PREVIEW_WIDTH + 1 + 1,
                        Math.max(dragLineFrom.y, dragLineTo.y) + LINE_PREVIEW_WIDTH + 1 + 1
                    );
                
                repaintRect(invalidateRect);

                return true;
            }
        };

        this.paint = function() {
            if (this.capture) {
                canvasContext.lineWidth = LINE_PREVIEW_WIDTH;
                canvasContext.beginPath();
                canvasContext.moveTo(dragLineFrom.x, dragLineFrom.y);
                canvasContext.lineTo(dragLineTo.x, dragLineTo.y);
                canvasContext.stroke();
            } else {
                // Draw the regular brush preview circle
                CPDrawingMode.prototype.paint.call(this);
            }
        };

        CPDrawingMode.call(this);
    }
    
    CPLineMode.prototype = Object.create(CPDrawingMode.prototype);
    CPLineMode.prototype.constructor = CPLineMode;

    CPLineMode.prototype.drawLine = function(from, to) {
        artwork.beginStroke(from.x, from.y, 1);
        artwork.continueStroke(to.x, to.y, 1);
        artwork.endStroke();
    };

    function CPBezierMode() {
        const
            BEZIER_POINTS = 500,
            BEZIER_POINTS_PREVIEW = 100,

            BEZIER_STATE_INITIAL = 0,
            BEZIER_STATE_POINT_1 = 1,
            BEZIER_STATE_POINT_2 = 2;

        let
            dragBezierMode = BEZIER_STATE_INITIAL,
            dragBezierP0, dragBezierP1, dragBezierP2, dragBezierP3;

        this.mouseDown = function(e, button, pressure) {
            if (!this.capture && button == BUTTON_PRIMARY && !e.altKey && !key.isPressed("space") && shouldDrawToThisLayer()) {
                let
                    p = coordToDocument({x: mouseX, y: mouseY});

                dragBezierMode = BEZIER_STATE_INITIAL;
                dragBezierP0 = dragBezierP1 = dragBezierP2 = dragBezierP3 = p;
                this.capture = true;

                this.eraseBrushPreview();

                return true;
            }
        };

        // Handles the first part of the Bezier where the user drags out a straight line
        this.mouseDrag = function(e) {
            if (this.capture && dragBezierMode === BEZIER_STATE_INITIAL) {
                let
                    p = coordToDocument({x: mouseX, y: mouseY});

                dragBezierP2 = dragBezierP3 = p;

                that.repaintAll();

                return true;
            } else {
                this.mouseMove.call(this, e);
            }
        };

        this.mouseUp = function(e, button, pressure) {
            if (this.capture && button == BUTTON_PRIMARY) {
                switch (dragBezierMode) {
                    case BEZIER_STATE_INITIAL:
                        dragBezierMode = BEZIER_STATE_POINT_1;
                        break;
                    case BEZIER_STATE_POINT_1:
                        dragBezierMode = BEZIER_STATE_POINT_2;
                        break;
                    case BEZIER_STATE_POINT_2:
                        this.capture = false;

                        let
                            p0 = dragBezierP0,
                            p1 = dragBezierP1,
                            p2 = dragBezierP2,
                            p3 = dragBezierP3,

                            bezier = new CPBezier();

                        bezier.x0 = p0.x;
                        bezier.y0 = p0.y;
                        bezier.x1 = p1.x;
                        bezier.y1 = p1.y;
                        bezier.x2 = p2.x;
                        bezier.y2 = p2.y;
                        bezier.x3 = p3.x;
                        bezier.y3 = p3.y;

                        let
                            x = new Array(BEZIER_POINTS),
                            y = new Array(BEZIER_POINTS);

                        bezier.compute(x, y, BEZIER_POINTS);

                        artwork.beginStroke(x[0], y[0], 1);
                        for (let i = 1; i < BEZIER_POINTS; i++) {
                            artwork.continueStroke(x[i], y[i], 1);
                        }
                        artwork.endStroke();
                        that.repaintAll();
                }

                return true;
            }
        };

        this.mouseMove = function(e, pressure) {
            if (this.capture) {
                let
                    p = coordToDocument({x: mouseX, y: mouseY});

                if (dragBezierMode == BEZIER_STATE_POINT_1) {
                    dragBezierP1 = p;
                } else if (dragBezierMode == BEZIER_STATE_POINT_2) {
                    dragBezierP2 = p;
                }
                that.repaintAll(); // FIXME: repaint only the bezier region

                return true;
            } else {
                // Draw the normal brush preview while not in the middle of a bezier operation
                CPDrawingMode.prototype.mouseMove.call(this, e, pressure);
            }
        };

        this.paint = function() {
            if (this.capture) {
                let
                    bezier = new CPBezier(),

                    p0 = coordToDisplay(dragBezierP0),
                    p1 = coordToDisplay(dragBezierP1),
                    p2 = coordToDisplay(dragBezierP2),
                    p3 = coordToDisplay(dragBezierP3);

                bezier.x0 = p0.x;
                bezier.y0 = p0.y;
                bezier.x1 = p1.x;
                bezier.y1 = p1.y;
                bezier.x2 = p2.x;
                bezier.y2 = p2.y;
                bezier.x3 = p3.x;
                bezier.y3 = p3.y;

                let
                    x = new Array(BEZIER_POINTS_PREVIEW),
                    y = new Array(BEZIER_POINTS_PREVIEW);
                    
                bezier.compute(x, y, BEZIER_POINTS_PREVIEW);

                canvasContext.beginPath();
                
                canvasContext.moveTo(x[0], y[0]);
                for (let i = 1; i < BEZIER_POINTS_PREVIEW; i++) {
                    canvasContext.lineTo(x[i], y[i]);
                }
                
                canvasContext.moveTo(~~p0.x, ~~p0.y);
                canvasContext.lineTo(~~p1.x, ~~p1.y);
                
                canvasContext.moveTo(~~p2.x, ~~p2.y);
                canvasContext.lineTo(~~p3.x, ~~p3.y);
                
                canvasContext.stroke();
            } else {
                // Paint the regular brush preview
                CPDrawingMode.prototype.paint.call(this);
            }
        };

        CPDrawingMode.call(this);
    }
    
    CPBezierMode.prototype = Object.create(CPDrawingMode.prototype);
    CPBezierMode.prototype.constructor = CPBezierMode;

    function CPColorPickerMode() {
        var 
            mouseButton;

        this.mouseDown = function(e, button, pressure) {
            if (this.capture) {
                return true;
            } else if (!key.isPressed("space") && (button == BUTTON_PRIMARY && (!this.transient || e.altKey) || button == BUTTON_SECONDARY)) {
                mouseButton = button;
                this.capture = true;

                setCursor(CURSOR_CROSSHAIR);

                this.mouseDrag(e);

                return true;
            } else if (this.transient) {
                // If we're not sampling and we get a button not intended for us, we probably shouldn't be on the stack
                modeStack.pop();
            }
        };

        this.mouseDrag = function(e) {
            if (this.capture) {
                var
                    pf = coordToDocument({x: mouseX, y: mouseY});

                if (artwork.isPointWithin(pf.x, pf.y)) {
                    controller.setCurColor(new CPColor(artwork.colorPicker(pf.x, pf.y)));
                }

                return true;
            }
        };

        this.mouseUp = function(e, button, pressure) {
            if (this.capture && button == mouseButton) {
                mouseButton = -1;
                this.capture = false;
                setCursor(CURSOR_DEFAULT);

                if (this.transient) {
                    modeStack.pop();
                }

                return true;
            }
        };

        this.enter = function() {
            CPMode.prototype.enter.call(this);
            mouseButton = -1;
        };
    }
    
    CPColorPickerMode.prototype = Object.create(CPMode.prototype);
    CPColorPickerMode.prototype.constructor = CPColorPickerMode;

    function CPPanCanvasMode() {
        var
            panningX, panningY,
            panningOffset,
            panningButton;

        this.keyDown = function(e) {
            if (e.keyCode == 32 /* Space */) {
                // If we're not already panning, then advertise that a left-click would pan
                if (!this.capture) {
                    setCursor(CURSOR_PANNABLE);
                }

                return true;
            }
        };

        this.keyUp = function(e) {
            if (this.transient && panningButton != BUTTON_WHEEL && e.keyCode == 32 /* Space */) {
                setCursor(CURSOR_DEFAULT);

                modeStack.pop(); // yield control to the default mode

                return true;
            }
        };

        this.mouseDown = function(e, button, pressure) {
            if (this.capture) {
                return true;
            } else if (button == BUTTON_WHEEL || key.isPressed("space") && button == BUTTON_PRIMARY
                    || !this.transient && button == BUTTON_PRIMARY) {
                this.capture = true;
                panningButton = button;
                panningX = e.pageX;
                panningY = e.pageY;
                panningOffset = that.getOffset();
                setCursor(CURSOR_PANNING);

                return true;
            } else if (this.transient) {
                // If we're not panning and we get a button not intended for us, we probably shouldn't be on the stack
                modeStack.pop();
            }
        };

        this.mouseDrag = function(e) {
            if (this.capture) {
                that.setOffset(panningOffset.x + e.pageX - panningX, panningOffset.y + e.pageY - panningY);

                return true;
            }
        };

        this.mouseUp = function(e, button, pressure) {
            if (this.capture && button == panningButton) {
                panningButton = -1;
                this.capture = false;

                if (this.transient && !key.isPressed("space")) {
                    setCursor(CURSOR_DEFAULT);

                    modeStack.pop();
                }

                return true;
            }
        };

        this.enter = function() {
            setCursor(CURSOR_PANNABLE);
        };
    }
    
    CPPanCanvasMode.prototype = Object.create(CPMode.prototype);
    CPPanCanvasMode.prototype.constructor = CPPanCanvasMode;

    function CPFloodFillMode() {
    }
    
    CPFloodFillMode.prototype = Object.create(CPMode.prototype);
    CPFloodFillMode.prototype.constructor = CPFloodFillMode;

    CPFloodFillMode.prototype.mouseDown = function(e, button, pressure) {
        if (button == BUTTON_PRIMARY && !e.altKey && !key.isPressed("space") && shouldDrawToThisLayer()) {
            var
                pf = coordToDocument({x: mouseX, y: mouseY});

            if (artwork.isPointWithin(pf.x, pf.y)) {
                artwork.floodFill(pf.x, pf.y);
                that.repaintAll();
            }

            return true;
        }
    };

    function CPRectSelectionMode() {
        var
            firstClick,
            curRect = new CPRect(0, 0, 0, 0),
            selectingButton = -1;

        this.mouseDown = function (e, button, pressure) {
            if (!this.capture && button == BUTTON_PRIMARY && !e.altKey && !key.isPressed("space")) {
                var
                    p = coordToDocumentInt({x: mouseX, y: mouseY});

                selectingButton = button;

                curRect.makeEmpty();
                firstClick = p;

                that.repaintAll();

                this.capture = true;

                return true;
            }
        };

        this.mouseDrag = function(e) {
            if (!this.capture)
                return false;

            var
                p = coordToDocumentInt({x: mouseX, y: mouseY}),
                square = e.shiftKey,
                
                squareDist = ~~Math.max(Math.abs(p.x - firstClick.x), Math.abs(p.y - firstClick.y));

            if (p.x >= firstClick.x) {
                curRect.left = firstClick.x;
                curRect.right = (square ? firstClick.x + squareDist : p.x) + 1;
            } else {
                curRect.left = square ? firstClick.x - squareDist : p.x;
                curRect.right = firstClick.x + 1;
            }

            if (p.y >= firstClick.y) {
                curRect.top = firstClick.y;
                curRect.bottom = (square ? firstClick.y + squareDist : p.y) + 1;
            } else {
                curRect.top = square ? firstClick.y - squareDist : p.y;
                curRect.bottom = firstClick.y + 1;
            }

            that.repaintAll();

            return true;
        };

        this.mouseUp = function (e, button, pressure) {
            if (this.capture && button == selectingButton) {
                artwork.rectangleSelection(curRect);
                curRect.makeEmpty();

                that.repaintAll();

                this.capture = false;
                selectingButton = -1;

                return true;
            }
        };

        this.paint = function() {
            if (!curRect.isEmpty()) {
                canvasContext.lineWidth = 1;
                plotSelectionRect(canvasContext, curRect);
            }
        };
    }

    CPRectSelectionMode.prototype = Object.create(CPMode.prototype);
    CPRectSelectionMode.prototype.constructor = CPRectSelectionMode;

    function CPMoveToolMode() {
        var 
            lastPoint,
            copyMode,
            firstMove = false;

        this.mouseDown = function(e, button, pressure) {
            if (!this.capture && button == BUTTON_PRIMARY && !key.isPressed("space") && checkCurrentLayerIsVisible()) {
                lastPoint = coordToDocument({x: mouseX, y: mouseY});

                copyMode = e.altKey;
                firstMove = true;
                this.capture = true;

                return true;
            }
        };

        this.mouseDrag = throttle(25, function(e) {
            if (this.capture) {
                var
                    p = coordToDocument({x: mouseX, y: mouseY}),

                    moveFloat = {x: p.x - lastPoint.x, y: p.y - lastPoint.y},
                    moveInt = {x: ~~moveFloat.x, y: ~~moveFloat.y}; // Round towards zero

                if (moveInt.x != 0 || moveInt.y != 0) {
                    artwork.move(moveInt.x, moveInt.y, copyMode && firstMove);
                    firstMove = false;
                }

                /*
                 * Nudge the last point by the remainder we weren't able to move this iteration (due to move() only
                 * accepting integer offsets). This'll carry that fractional part of the move over for next iteration.
                 */
                lastPoint.x = p.x - (moveFloat.x - moveInt.x);
                lastPoint.y = p.y - (moveFloat.y - moveInt.y);

                return true;
            }
        });

        this.mouseUp = function(e, button, pressure) {
            if (this.capture && button == BUTTON_PRIMARY) {
                this.capture = false;
                if (this.transient) {
                    modeStack.pop();
                }
                return true;
            }
        };
    }

    CPMoveToolMode.prototype = Object.create(CPMode.prototype);
    CPMoveToolMode.prototype.constructor = CPMoveToolMode;

    CPMoveToolMode.prototype.mouseMove = function(e) {
        if (!key.isPressed("space") && !e.altKey) {
            setCursor(CURSOR_MOVE);
            return true;
        }
    };

    CPMoveToolMode.prototype.enter = function() {
        setCursor(CURSOR_MOVE);
    };

    function CPTransformMode() {
        const
            HANDLE_RADIUS = 3,

            DRAG_NONE = -1,
            DRAG_ROTATE = -2,
            DRAG_MOVE = -3,
            DRAG_NW_CORNER = 0,
            DRAG_N_EDGE = 1,
            DRAG_NE_CORNER = 2,
            DRAG_E_EDGE = 3,
            DRAG_SE_CORNER = 4,
            DRAG_S_EDGE = 5,
            DRAG_SW_CORNER = 6,
            DRAG_W_EDGE = 7;

        var
            /** @type {CPTransform} The current transformation */
            affine,
            /** @type {CPRect} The initial document rectangle to transform */
            srcRect,
            /** @type {CPPolygon} The initial transform rect */
            origCornerPoints,
            /** @type {CPPolygon} The current corners of the transform rect in document space */
            cornerPoints,

            draggingMode = DRAG_NONE,

            lastDragPointDisplay,
            lastDragPointDoc,

            // Keep track of how many degrees we've rotated so far during this transformation
            rotationAccumulator;

		/**
         * Get the polygon that represents the current transform result area in display coordinates.
         *
         * @returns {CPPolygon}
         */
        function cornersToDisplayPolygon() {
            return cornerPoints.getTransformed(transform);
        }

        function averagePoints(p1, p2) {
            return {x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2};
        }

        function roundPoint(p) {
            return {x : Math.round(p.x), y: Math.round(p.y)};
        }

		/**
         * Decide which drag action should be taken if our mouse was pressed in the given position.
         *
         * @param {CPPolygon} corners - The corners of the current transform area
         * @param mouse - The mouse point
         * @returns {number} A DRAG_* constant
         */
        function classifyDragAction(corners, mouse) {
            const
                HANDLE_CAPTURE_RADIUS = 7,
                HANDLE_CAPTURE_RADIUS_SQR = HANDLE_CAPTURE_RADIUS * HANDLE_CAPTURE_RADIUS,
                EDGE_CAPTURE_RADIUS = HANDLE_CAPTURE_RADIUS,
                EDGE_CAPTURE_RADIUS_SQR = EDGE_CAPTURE_RADIUS * EDGE_CAPTURE_RADIUS;

            // Are we dragging a corner?
            for (let i = 0; i < corners.points.length; i++) {
                if ((mouse.x - corners.points[i].x) * (mouse.x - corners.points[i].x) + (mouse.y - corners.points[i].y) * (mouse.y - corners.points[i].y) <= HANDLE_CAPTURE_RADIUS_SQR) {
                    return i * 2;
                }
            }

            // Are we dragging an edge?
            for (let i = 0; i < corners.points.length; i++) {
                var
                    edgeP1 = corners.points[i],
                    edgeP2 = corners.points[(i + 1) % corners.points.length],

                    vEdge = new CPVector(edgeP2.x - edgeP1.x, edgeP2.y - edgeP1.y),
                    vMouse = new CPVector(mouse.x - edgeP1.x, mouse.y - edgeP1.y),
                    
                    vEdgeLen = vEdge.getLength(),

                    vEdgeScaled = vEdge.getScaled(1 / vEdgeLen),
                    vMouseScaled = vMouse.getScaled(1 / vEdgeLen),

                    mousePropOnLine = vEdgeScaled.getDotProduct(vMouseScaled);

                // If we're within the ends of the line (perpendicularly speaking)
                if (mousePropOnLine >= 0.0 && mousePropOnLine <= 1.0) {
                    // This gives us the point on the line closest to the mouse
                    vEdge.scale(mousePropOnLine);
                    
                    if ((vEdge.x - vMouse.x) * (vEdge.x - vMouse.x) + (vEdge.y - vMouse.y) * (vEdge.y - vMouse.y) <= EDGE_CAPTURE_RADIUS_SQR) {
                        return i * 2 + 1;
                    }
                }
            }

            if (corners.containsPoint(mouse)) {
                return DRAG_MOVE;
            }

            return DRAG_ROTATE;
        }

        function setCursorForHandles() {
            var
                corners = cornersToDisplayPolygon(),
                mouse = {x: mouseX, y: mouseY},
                dragAction = classifyDragAction(corners, mouse);

            switch (dragAction) {
                case DRAG_NW_CORNER:
                case DRAG_NE_CORNER:
                case DRAG_SE_CORNER:
                case DRAG_SW_CORNER:
                    // Choose a cursor for a 45-degree resize from this corner
                    let
                        cornerIndex = ~~(dragAction / 2),
                        cornerBefore = corners.points[(cornerIndex + 3) % 4],
                        corner = corners.points[cornerIndex],
                        cornerAfter = corners.points[(cornerIndex + 1) % 4],

                    // Get a vector which points 45 degrees toward the center of the box, this'll do for cursor direction
                        v45 = CPVector.subtractPoints(cornerBefore, corner).normalize().add(CPVector.subtractPoints(cornerAfter, corner).normalize());

                    setResizeCursorForVector(v45);
                    break;
                case DRAG_N_EDGE:
                case DRAG_E_EDGE:
                case DRAG_S_EDGE:
                case DRAG_W_EDGE:
                    // Resizing from here will move edge perpendicularly
                    let
                        corner1 = corners.points[~~(dragAction / 2)],
                        corner2 = corners.points[(~~(dragAction / 2) + 1) % 4],
                        vPerp = CPVector.subtractPoints(corner2, corner1).getPerpendicular();

                    setResizeCursorForVector(vPerp);
                    break;
                case DRAG_MOVE:
                    setCursor(CURSOR_MOVE);
                    break;
                case DRAG_ROTATE:
                    setCursor(CURSOR_DEFAULT); // TODO add a custom rotation cursor
                    break;
                default:
                    setCursor(CURSOR_DEFAULT);
            }
        }

        this.mouseDown = function(e, button, pressure) {
            if (!this.capture && button == BUTTON_PRIMARY && !e.altKey && !key.isPressed("space")) {
                var
                    corners = cornersToDisplayPolygon();

                draggingMode = classifyDragAction(corners, {x: mouseX, y: mouseY});

                lastDragPointDisplay = {x: mouseX, y: mouseY};
                lastDragPointDoc = coordToDocument(lastDragPointDisplay);

                this.capture = true;

                setCursorForHandles();

                return true;
            }
        };

        this.mouseDrag = throttle(40, function(e) {
            const
                MIN_SCALE = 0.001;

            if (this.capture) {
                var
                    dragPointDisplay = {x: mouseX, y: mouseY};

                switch (draggingMode) {
                    case DRAG_MOVE:
                        let
                            dragPointDoc = roundPoint(coordToDocument(dragPointDisplay)),

                            translation = CPVector.subtractPoints(dragPointDoc, lastDragPointDoc),

                            // Only translate in whole-pixel increments (in document space not canvas space)
                            translationRounded = translation.getTruncated(),

                            translationRemainder = translation.subtract(translationRounded),

                            translateInstance = new CPTransform();

                        /*
                         * Apply the translate *after* the current affine is applied.
                         */
                        translateInstance.translate(translationRounded.x, translationRounded.y);

                        affine.preMultiply(translateInstance);

                        // Accumulate the fractional move that we didn't apply for next time
                        lastDragPointDoc = CPVector.subtractPoints(dragPointDoc, translationRemainder);
                    break;
                    case DRAG_ROTATE:
                        const
                            DRAG_ROTATE_SNAP_ANGLE = Math.PI / 4;

                        let
                            centerDoc = cornerPoints.getCenter(),
                            centerDisplay = coordToDisplay(centerDoc),

                            oldMouseAngle = Math.atan2(lastDragPointDisplay.y - centerDisplay.y, lastDragPointDisplay.x - centerDisplay.x),
                            newMouseAngle = Math.atan2(dragPointDisplay.y - centerDisplay.y, dragPointDisplay.x - centerDisplay.x),
                            deltaMouseAngle = newMouseAngle - oldMouseAngle,

                            rotateAngle,
                            rotateInstance = new CPTransform();

                        rotationAccumulator += deltaMouseAngle;

                        if (e.shiftKey) {
                            /*
                             * The rotation in the decomposition was made about the origin. We want to rotate about the
                             * center of the selection, so first rotate the selection to square it up with the axes,
                             * then we'll pivot the selection about its center to the new angle.
                             */
                            rotateAngle = -affine.decompose().rotate + Math.round(rotationAccumulator / DRAG_ROTATE_SNAP_ANGLE) * DRAG_ROTATE_SNAP_ANGLE;
                        } else {
                            rotateAngle = deltaMouseAngle;
                        }

                        /* Apply the rotation *after* the current affine instead of before it, so that we don't
                         * end up scaling on top of the rotated selection later (which would cause an unwanted shear)
                         */
                        rotateInstance.rotateAroundPoint(rotateAngle, centerDoc.x, centerDoc.y);

                        affine.preMultiply(rotateInstance);

                        lastDragPointDisplay = dragPointDisplay;
                    break;
                    case DRAG_NW_CORNER:
                    case DRAG_NE_CORNER:
                    case DRAG_SE_CORNER:
                    case DRAG_SW_CORNER:
                    {
                        let
                            draggingCorner = ~~(draggingMode / 2),

                            oldCorner = origCornerPoints.points[draggingCorner],
                        // The corner we dragged will move into its new position
                            newCorner = affine.getInverted().getTransformedPoint(roundPoint(coordToDocument(dragPointDisplay))),

                        // The opposite corner to the one we dragged must not move
                            fixCorner = origCornerPoints.points[(draggingCorner + 2) % 4],

                        /* Now we can see how much we'd need to scale the original rectangle about the fixed corner
                         * for the other corner to reach the new position.
                         */
                            scaleX = (newCorner.x - fixCorner.x) / (oldCorner.x - fixCorner.x),
                            scaleY = (newCorner.y - fixCorner.y) / (oldCorner.y - fixCorner.y);

                        /*
                         * If the user resized it until it was zero-sized, just ignore that position and assume they'll move
                         * past it in a msec.
                         */
                        if (Math.abs(scaleX) < MIN_SCALE || Math.abs(scaleY) < MIN_SCALE || isNaN(scaleX) || isNaN(scaleY)) {
                            return true;
                        }

                        // Does user want proportional resize?
                        if (e.shiftKey) {
                            var
                                largestScale = Math.max(scaleX, scaleY);

                            scaleX = largestScale;
                            scaleY = largestScale;
                        }

                        // The transform we do here will be performed first before any of the other transforms (scale, rotate, etc)
                        affine.scaleAroundPoint(scaleX, scaleY, fixCorner.x, fixCorner.y);
                    }
                    break;
                    case DRAG_N_EDGE:
                    case DRAG_S_EDGE:
                    case DRAG_E_EDGE:
                    case DRAG_W_EDGE:
                    {
                        let
                            cornerIndex = ~~(draggingMode / 2),

                            oldHandle = averagePoints(origCornerPoints.points[cornerIndex], origCornerPoints.points[(cornerIndex + 1) % 4]),

                        // The handle we dragged will move into its new position
                            newHandle = affine.getInverted().getTransformedPoint(roundPoint(coordToDocument(dragPointDisplay))),

                        // The opposite handle to the one we dragged must not move
                            fixHandle = averagePoints(origCornerPoints.points[(cornerIndex + 2) % 4], origCornerPoints.points[(cornerIndex + 3) % 4]),

                            scaleX, scaleY,

                            oldVector = CPVector.subtractPoints(oldHandle, fixHandle),
                            newVector = CPVector.subtractPoints(newHandle, fixHandle),

                            oldLength = oldVector.getLength(),
                        // We only take the length in the perpendicular direction to the transform edge:
                            newLength = oldVector.getDotProduct(newVector) / oldLength,

                            newScale = newLength / oldLength;

                        /*
                         * If the user resized it until it was zero-sized, just ignore that position and assume they'll move
                         * past it in a msec.
                         */
                        if (Math.abs(newScale) < MIN_SCALE || isNaN(newScale)) {
                            return true;
                        }

                        if (draggingMode == DRAG_N_EDGE || draggingMode == DRAG_S_EDGE) {
                            scaleX = 1.0;
                            scaleY = newScale;
                        } else {
                            scaleX = newScale;
                            scaleY = 1.0;
                        }

                        affine.scaleAroundPoint(scaleX, scaleY, fixHandle.x, fixHandle.y);
                    }
                    break;
                }

                cornerPoints = origCornerPoints.getTransformed(affine);

                artwork.transformAffineAmend(affine);

                // TODO make me more specific
                that.repaintAll();

                return true;
            }
        });

        this.mouseUp = function(e, button, pressure) {
            if (this.capture && button == BUTTON_PRIMARY) {
                this.capture = false;
                draggingMode = DRAG_NONE;
                return true;
            }
        };

        /*
         * Set an appropriate resize cursor for the specified vector from the center to the handle.
         */
        function setResizeCursorForVector(v) {
            let
                angle = Math.atan2(-v.y, v.x),
            /*
                 * Slice up into 45 degrees slices so that there are +-22.5 degrees centered around each corner,
                 * and a 45 degree segment for each edge
                 */
                slice = Math.floor(angle / (Math.PI / 4) + 0.5),
                cursor;

            // Wrap angles below the x-axis wrap to positive ones...
            if (slice < 0) {
                slice += 4;
            }

            switch (slice) {
                case 0:
                default:
                    cursor = CURSOR_EW_RESIZE;
                break;
                case 1:
                    cursor = CURSOR_NESW_RESIZE;
                break;
                case 2:
                    cursor = CURSOR_NS_RESIZE;
                break;
                case 3:
                    cursor = CURSOR_NWSE_RESIZE;
                break;
            }

            setCursor(cursor);
        }

        this.mouseMove = function() {
            // We want to stick with our choice of cursor throughout the drag operation
            if (!this.capture) {
                setCursorForHandles();
            }
        };

        this.paint = function() {
            var
                corners = cornersToDisplayPolygon().points,
                handles = new Array(corners.length * 2);

            // Collect the positions of the edge and corner handles...
            for (let i = 0; i < corners.length; i++) {
                handles[i] = corners[i];
            }

            for (let i = 0; i < corners.length; i++) {
                var
                    edgeP1 = corners[i],
                    edgeP2 = corners[(i + 1) % corners.length],

                    midWay = {x: (edgeP1.x + edgeP2.x) / 2, y: (edgeP1.y + edgeP2.y) / 2};

                handles[i + corners.length] = midWay;
            }

            setContrastingDrawStyle(canvasContext, "fill");
            for (let i = 0; i < handles.length; i++) {
                canvasContext.fillRect(handles[i].x - HANDLE_RADIUS, handles[i].y - HANDLE_RADIUS, HANDLE_RADIUS * 2 + 1, HANDLE_RADIUS * 2 + 1);
            }

            strokePolygon(canvasContext, corners);
        };

        this.keyDown = function(e) {
            if (e.keyCode == 13 /* Enter */) {
                controller.actionPerformed({action: "CPTransformAccept"});

                return true;
            } else if (e.keyCode == 27 /* Escape */) {
                controller.actionPerformed({action: "CPTransformReject"});

                return true;
            }
        };

        this.enter = function() {
            CPMode.prototype.enter.call(this);

            // Start off with the identity transform
            var
                initial = artwork.transformAffineBegin(),
                initialSelection;

            affine = initial.transform;
            srcRect = initial.rect;

            // Decide on the rectangle we'll show as the boundary of the transform area
            initialSelection = initial.selection;

            /* If the user didn't have anything selected, we'll use the actual shrink-wrapped transform area instead. */
            if (initialSelection.isEmpty()) {
                initialSelection = initial.rect.clone();
            }

            origCornerPoints = new CPPolygon(initialSelection.toPoints());
            cornerPoints = origCornerPoints.getTransformed(affine);

            draggingMode = -1;
            rotationAccumulator = 0;

            that.repaintAll();
        };

        this.leave = function() {
            CPMode.prototype.leave.call(this);
            that.repaintAll();
        };
    }

    CPTransformMode.prototype = Object.create(CPMode.prototype);
    CPTransformMode.prototype.constructor = CPTransformMode;

    function CPRotateCanvasMode() {
        var 
            firstClick,
            initAngle = 0.0,
            initTransform,
            dragged = false,

            rotateButton = -1;

        this.mouseDown = function(e, button, pressure) {
            if (this.capture) {
                return true;
            } else if (!this.transient && button == BUTTON_PRIMARY && !e.altKey && !key.isPressed("space")
                    || e.altKey && (button == BUTTON_WHEEL || button == BUTTON_PRIMARY && key.isPressed("space"))) {
                firstClick = {x: mouseX, y: mouseY};

                initAngle = that.getRotation();
                initTransform = transform.clone();

                dragged = false;

                this.capture = true;
                rotateButton = button;

                return true;
            } else if (this.transient) {
                modeStack.pop();
            }
        };

        this.mouseDrag = function(e) {
            if (this.capture) {
                var
                    p = {x: mouseX, y: mouseY},

                    displayCenter = {x: $(canvas).width() / 2, y: $(canvas).height() / 2},
                    canvasCenter = {x: canvas.width / 2, y: canvas.height / 2},

                    deltaAngle = Math.atan2(p.y - displayCenter.y, p.x - displayCenter.x) - Math.atan2(firstClick.y - displayCenter.y, firstClick.x - displayCenter.x),

                    rotTrans = new CPTransform();

                rotTrans.rotateAroundPoint(deltaAngle, canvasCenter.x, canvasCenter.y);

                rotTrans.multiply(initTransform);

                that.setRotation(initAngle + deltaAngle);
                that.setOffset(~~rotTrans.getTranslateX(), ~~rotTrans.getTranslateY());

                dragged = true;

                return true;
            }
        };

        /**
         * When the mouse is released after rotation, we might want to snap our angle to the nearest 90 degree mark.
         */
        function finishRotation() {
            const
                ROTATE_SNAP_DEGREES = 5;
            
            let
                nearest90 = Math.round(canvasRotation / (Math.PI / 2)) * Math.PI / 2;
            
            if (Math.abs(canvasRotation - nearest90) < ROTATE_SNAP_DEGREES / 180 * Math.PI) {
                let
                    deltaAngle = nearest90 - initAngle,

                    center = {x: canvas.width / 2, y: canvas.height / 2},

                    rotTrans = new CPTransform();

                rotTrans.rotateAroundPoint(deltaAngle, center.x, center.y);

                rotTrans.multiply(initTransform);

                that.setRotation(initAngle + deltaAngle);
                that.setOffset(~~rotTrans.getTranslateX(), ~~rotTrans.getTranslateY());
                
                that.repaintAll();
            }

            that.emitEvent("canvasRotated90", [that.getRotation90()]);
        }
        
        this.mouseUp = function(e, button, pressure) {
            if (this.capture && button == rotateButton) {
                if (dragged) {
                    finishRotation();
                } else {
                    that.resetRotation();
                }

                this.capture = false;

                if (this.transient && !(key.isPressed("space") && key.alt)) {
                    modeStack.pop();
                }

                return true;
            }
        };

        this.keyUp = function(e) {
            if (this.transient && rotateButton != BUTTON_WHEEL && e.keyCode == 32 /* Space */) {
                setCursor(CURSOR_DEFAULT);

                modeStack.pop(); // yield control to the default mode

                return true;
            }
        };

        this.keyDown = function(e) {
            if (e.keyCode == 32 /* Space */ && e.altKey) {
                // That's our hotkey, so stay in this mode (don't forward to CPDefaultMode)
                return true;
            }
        };
    }
    
    CPRotateCanvasMode.prototype = Object.create(CPMode.prototype);
    CPRotateCanvasMode.prototype.constructor = CPRotateCanvasMode;

    function CPGradientFillMode() {
        // Super constructor
        CPLineMode.call(this);
    }
    
    CPGradientFillMode.prototype = Object.create(CPLineMode.prototype);
    CPGradientFillMode.prototype.constructor = CPGradientFillMode;

    CPGradientFillMode.prototype.drawLine = function(from, to) {
        artwork.gradientFill(Math.round(from.x), Math.round(from.y), Math.round(to.x), Math.round(to.y), controller.getCurGradient());
    };

    CPGradientFillMode.prototype.queueBrushPreview = function() {
        //Suppress the drawing of the brush preview (inherited from CPDrawingMode)
    };

    function setCursor(cursor) {
        if (canvas.getAttribute("data-cursor") != cursor) {
            canvas.setAttribute("data-cursor", cursor);
        }
    }

    function checkCurrentLayerIsVisible() {
        var
            activeLayer = artwork.getActiveLayer();

        if (!(activeLayer.visible && activeLayer.ancestorsAreVisible())) {
            controller.showLayerNotification(activeLayer, "Whoops! This layer is currently hidden", "layer");

            return false;
        } else if (activeLayer.alpha == 0) {
            controller.showLayerNotification(activeLayer, "Whoops! This layer's opacity is currently 0%", "opacity");

            return false;
        }

        return true;
    }

	/**
     * Check that we should be drawing to the current layer, and let the user know if they are being blocked by the
     * layer settings.
     *
     * @returns {boolean} True if we should draw to the current layer
     */
    function shouldDrawToThisLayer() {
        var
            activeLayer = artwork.getActiveLayer();

        if (activeLayer instanceof CPLayerGroup && !artwork.isEditingMask()) {
            controller.showLayerNotification(activeLayer, "Whoops! You can't draw on a group", "layer");

            return false;
        }

        return checkCurrentLayerIsVisible();
    }

    /**
     * Update the scrollbar's range/position to match the current view settings for the document.
     *
     * @param scrollbar {CPScrollbar}
     * @param visMin The smallest coordinate in this axis in which the drawing appears
     * @param visWidth The extent of the drawing in this axis
     * @param viewSize The extent of the screen canvas in this axis
     * @param offset The present pixel offset of the drawing in this axis
     */
    function updateScrollBar(scrollbar, visMin, visWidth, viewSize, offset) {
        var
            xMin = visMin - viewSize - offset + visWidth / 4,
            xMax = visMin + visWidth - offset - visWidth / 4;
        
        scrollbar.setValues(-offset, viewSize, xMin, xMax);
        
        scrollbar.setBlockIncrement(Math.max(1, ~~(viewSize * .66)));
        scrollbar.setUnitIncrement(Math.max(1, ~~(viewSize * .05)));
    }
    
    function updateScrollBars() {
        if (horzScroll == null || vertScroll == null
                || horzScroll.getValueIsAdjusting() || vertScroll.getValueIsAdjusting() ) {
           return;
       }

       var
           visibleRect = getRefreshArea(new CPRect(0, 0, artworkCanvas.width, artworkCanvas.height));

       updateScrollBar(horzScroll, visibleRect.left, visibleRect.getWidth(), $(canvas).width(), that.getOffset().x);
       updateScrollBar(vertScroll, visibleRect.top, visibleRect.getHeight(), $(canvas).height(), that.getOffset().y);
    }

    function updateTransform() {
        transform.setToIdentity();
        transform.translate(offsetX, offsetY);
        transform.scale(zoom, zoom);
        transform.rotate(canvasRotation);

        updateScrollBars();
        that.repaintAll();
    }
    
    /**
     * Convert a canvas-relative coordinate into document coordinates and return the new coordinate.
     */
    function coordToDocument(coord) {
        // TODO cache inverted transform
        return transform.getInverted().getTransformedPoint(coord);
    }
    
    /**
     * Convert a canvas-relative coordinate into document coordinates.
     */
    function coordToDocumentInt(coord) {
        var
            result = coordToDocument(coord);
        
        result.x = Math.floor(result.x);
        result.y = Math.floor(result.y);
        
        return result;
    }
    
    /**
     * Convert a {x: pageX, y: pageY} co-ordinate pair from a mouse event to canvas-relative coordinates.
     */
    function mouseCoordToCanvas(coord) {
        var
            rect = canvas.getBoundingClientRect();

        return {x: coord.x - rect.left - window.pageXOffset, y: coord.y - rect.top - window.pageYOffset};
    }
    
    function coordToDisplay(p) {
        return transform.getTransformedPoint(p);
    }

    function coordToDisplayInt(p) {
        var
            result = coordToDisplay(p);
        
        result.x = Math.round(result.x);
        result.y = Math.round(result.y);
        
        return result;
    }
    
	/**
     * Convert a rectangle that encloses the given document pixels into a rectangle in display coordinates.
     *
     * @param rect {CPRect}
     * @returns {*[]}
     */
    function rectToDisplay(rect) {
        var
            center = coordToDisplay({x: (rect.left + rect.right) / 2, y: (rect.top + rect.bottom) / 2}),
            coords = rect.toPoints();

        for (var i = 0; i < coords.length; i++) {
            coords[i] = coordToDisplayInt(coords[i]);

            // Need to inset the co-ordinates by 0.5 display pixels for the line to pass through the middle of the display pixel
            coords[i].x +=  Math.sign(center.x - coords[i].x) * 0.5;
            coords[i].y +=  Math.sign(center.y - coords[i].y) * 0.5;
        }

        return coords;
    }

    function strokePolygon(context, coords) {
        context.beginPath();

        context.moveTo(coords[0].x, coords[0].y);
        for (var i = 1; i < coords.length; i++) {
            context.lineTo(coords[i].x, coords[i].y);
        }
        context.lineTo(coords[0].x, coords[0].y);

        context.stroke();
    }

    /**
     * Stroke a selection rectangle that encloses the pixels in the given rectangle (in document co-ordinates).
     */
    function plotSelectionRect(context, rect) {
        strokePolygon(context, rectToDisplay(rect));
    }

    /**
     * Take a CPRect of document coordinates and return a CPRect of canvas coordinates to repaint for that region.
     */
    function getRefreshArea(r) {
        var
            p1 = coordToDisplayInt({x: r.left - 1, y: r.top - 1}),
            p2 = coordToDisplayInt({x: r.left - 1, y: r.bottom}),
            p3 = coordToDisplayInt({x: r.right, y: r.top - 1}),
            p4 = coordToDisplayInt({x: r.right, y: r.bottom}),

            r2 = new CPRect(
                Math.min(Math.min(p1.x, p2.x), Math.min(p3.x, p4.x)),
                Math.min(Math.min(p1.y, p2.y), Math.min(p3.y, p4.y)),
                Math.max(Math.max(p1.x, p2.x), Math.max(p3.x, p4.x)) + 1,
                Math.max(Math.max(p1.y, p2.y), Math.max(p3.y, p4.y)) + 1
            );

        r2.grow(2, 2); // to be sure to include everything

        return r2;
    }

    /**
     * Adjust the current offset to bring the center of the artwork to the center of the canvas
     */
    function centerCanvas() {
        var
            width = canvas.width,
            height = canvas.height,
        
            artworkCenter = coordToDisplay({x: artwork.width / 2, y: artwork.height / 2});
        
        that.setOffset(
            Math.round(offsetX + width / 2.0 - artworkCenter.x),
            Math.round(offsetY + height / 2.0 - artworkCenter.y)
        );
    }
    
    this.setZoom = function(_zoom) {
        zoom = _zoom;
        updateTransform();
    };

    this.getZoom = function() {
        return zoom;
    };
    
    this.setGridSize = function(_gridSize) {
        gridSize = Math.max(Math.round(_gridSize), 1);
        this.repaintAll();
    };

    this.getGridSize = function() {
        return gridSize;
    };

    this.setOffset = function(x, y) {
        if (isNaN(x) || isNaN(y)) {
            console.log("Bad offset");
        } else {
            offsetX = x;
            offsetY = y;
            updateTransform();
        }
    };

    this.getOffset = function() {
        return {x: offsetX, y: offsetY};
    };
    
    this.setInterpolation = function(enabled) {
        interpolation = enabled;

        setCanvasInterpolation(canvasContext, enabled);

        this.repaintAll();
    };

    this.setRotation = function(angle) {
        canvasRotation = angle % (2 * Math.PI);
        updateTransform();
    };

    /**
     * Get canvas rotation in radians.
     * 
     * @return {number}
     */
    this.getRotation = function() {
        return canvasRotation;
    };
    
    /**
     * Get the rotation as the nearest number of whole 90 degree clockwise rotations ([0..3])
     */
    this.getRotation90 = function() {
        var
            rotation = Math.round(this.getRotation() / Math.PI * 2);
        
        // Just in case:
        rotation %= 4;
        
        // We want [0..3] as output
        if (rotation < 0) {
            rotation += 4;
        }
        
        return rotation;
    };

    /**
     *
     * @param zoom float
     * @param centerX float X co-ordinate in the canvas space
     * @param centerY float Y co-ordinate in the canvas space
     */
    function zoomOnPoint(zoom, centerX, centerY) {
        zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom));
        
        if (that.getZoom() != zoom) {
            var 
                offset = that.getOffset();
            
            that.setOffset(
                offset.x + ~~((centerX - offset.x) * (1 - zoom / that.getZoom())), 
                offset.y + ~~((centerY - offset.y) * (1 - zoom / that.getZoom()))
            );
            
            that.setZoom(zoom);

            /*CPController.CPViewInfo viewInfo = new CPController.CPViewInfo();
            viewInfo.zoom = zoom;
            viewInfo.offsetX = offsetX;
            viewInfo.offsetY = offsetY;
            controller.callViewListeners(viewInfo); TODO */

            that.repaintAll();
        }
    }
    
    // More advanced zoom methods
    function zoomOnCenter(zoom) {
        var 
            width = $(canvas).width(),
            height = $(canvas).height();
            
        zoomOnPoint(zoom, width / 2, height / 2);
    }

    this.zoomIn = function() {
        zoomOnCenter(this.getZoom() * 2);
    };

    this.zoomOut = function() {
        zoomOnCenter(this.getZoom() * 0.5);
    };

    this.zoom100 = function() {
        zoomOnCenter(1);
        centerCanvas();
    };

    this.resetRotation = function() {
        var
            center = {x: canvas.width / 2, y: canvas.height / 2},

            rotTrans = new CPTransform();
        
        rotTrans.rotateAroundPoint(-this.getRotation(), center.x, center.y);
        rotTrans.multiply(transform);

        this.setOffset(~~rotTrans.getTranslateX(), ~~rotTrans.getTranslateY());
        this.setRotation(0);
        that.emitEvent("canvasRotated90", [0]);
    };
    
    /**
     * Get the current pen pressure, given a pointer event.
     * 
     * @param {PointerEvent} e
     * 
     * @return {Number}
     */
    function getPointerPressure(e) {
        // Use Wacom pressure in preference to pointer event pressure (if present)
        if (wacomPenDown) {
            return tablet.getPressure();
        }
        
        // Safari fails to set pressure = 0.5 for mouse button down like it is supposed to
        if (e.pointerType === "mouse" && e.buttons !== 0 && e.pressure === 0) {
            return 1;
        }
        
        if (e.pointerType === "touch") {
            /* Some devices like iOS set pressure = 0 for all touch events, so detect that absence of pressure
             * and override to use a pressure of 1.0.
             * 
             * Android provides useful pressure based on the finger's contact area with the screen (Pixel 4A).
             */
            if (e.pressure !== 0) {
                sawTouchWithPressure = true;
            }

            if (sawTouchWithPressure) {
                return e.pressure * 2;
            }
            
            return 1.0;
        }
        
        /* In the Pointer Events API, mice have a default pressure of 0.5, but we want 1.0. Since we can't 
         * reliably distinguish between mice and pens, we don't have any better options:
         */
        return e.pressure * 2;
    }

    let
        mouseWheelDebounce = false;

    function handleMouseWheel(e) {
        if (e.deltaY != 0) {
            if (!mouseWheelDebounce || Math.abs(e.deltaY) > 20) {
                let
                    factor;

                if (e.deltaY > 0) {
                    factor = 1 / 1.15;
                } else {
                    factor = 1.15;
                }

                let
                    canvasPoint = mouseCoordToCanvas({x: e.pageX, y: e.pageY}),
                    docPoint = coordToDocument(canvasPoint);

                if (artwork.isPointWithin(docPoint.x, docPoint.y)) {
                    zoomOnPoint(
                        that.getZoom() * factor,
                        canvasPoint.x,
                        canvasPoint.y
                    );
                } else {
                    zoomOnPoint(
                        that.getZoom() * factor,
                        offsetX + ~~(artwork.width * zoom / 2),
                        offsetY + ~~(artwork.height * zoom / 2)
                    );
                }

                mouseWheelDebounce = mouseWheelDebounce || setTimeout(function() {
                    mouseWheelDebounce = false;
                }, 50);
            }

            e.preventDefault();
        }
    }

    let
        canvasClientRect;

    function handlePointerMove(e) {
        // Use the cached position of the canvas on the page if possible
        if (!canvasClientRect) {
            canvasClientRect = canvas.getBoundingClientRect();
        }
        
        if (sawPen && e.pointerType === "touch") {
            // Palm rejection for devices that support pens
            return;
        }

        /* Store these globally for the event handlers to refer to (we'd write to the event itself but some browsers
         * don't enjoy that)
         */
        mouseX = e.clientX - canvasClientRect.left;
        mouseY = e.clientY - canvasClientRect.top;

        const
            // Flags used by e.buttons:
            FLAG_PRIMARY = 1,
            FLAG_SECONDARY = 2,
            FLAG_WHEEL = 4,
            
            isDragging = e.buttons !== 0,
            pressure = isDragging ? getPointerPressure(e) : 0;
        
		// Did any of our buttons change state?
        if (((e.buttons & FLAG_PRIMARY) !== 0) != mouseDown[BUTTON_PRIMARY]) {
            if (e.mozPressure === 0.5) {
                /* We received a Mozilla "click" level of pressure (0.5) as a pointer-move
                 * before we received the actual mouseDown event (which carries the correct pressure).
                 *
                 * Observed on Firefox 56 on macOS High Sierra
                 */
                return; // Ignore!
            }

            mouseDown[BUTTON_PRIMARY] = !mouseDown[BUTTON_PRIMARY];

            if (mouseDown[BUTTON_PRIMARY]) {
                modeStack.mouseDown(e, BUTTON_PRIMARY, pressure);
            } else {
                modeStack.mouseUp(e, BUTTON_PRIMARY, pressure);
            }
        }

        if (((e.buttons & FLAG_SECONDARY) !== 0) != mouseDown[BUTTON_SECONDARY]) {
            mouseDown[BUTTON_SECONDARY] = !mouseDown[BUTTON_SECONDARY];

            if (mouseDown[BUTTON_SECONDARY]) {
                modeStack.mouseDown(e, BUTTON_SECONDARY, pressure);
            } else {
                modeStack.mouseUp(e, BUTTON_SECONDARY, pressure);
            }
        }

        if (((e.buttons & FLAG_WHEEL) !== 0) != mouseDown[BUTTON_WHEEL]) {
            mouseDown[BUTTON_WHEEL] = !mouseDown[BUTTON_WHEEL];

            if (mouseDown[BUTTON_WHEEL]) {
                modeStack.mouseDown(e, BUTTON_WHEEL, pressure);
            } else {
                modeStack.mouseUp(e, BUTTON_WHEEL, pressure);
            }
        }

        if (isDragging) {
            modeStack.mouseDrag(e, pressure);
        } else {
            modeStack.mouseMove(e, pressure);
        }
        
        if (!sawPen && e.pointerType === "pen") {
            sawPen = true;
        }
    }

    // Called when all mouse/pointer buttons are released
    function handlePointerUp(e) {
        mouseDown[BUTTON_PRIMARY] = false;
        mouseDown[BUTTON_SECONDARY] = false;
        mouseDown[BUTTON_WHEEL] = false;

        wacomPenDown = false;
        modeStack.mouseUp(e, e.button, 0.0);
        canvas.releasePointerCapture(e.pointerId);
    }

    // Called when the first button on the pointer is depressed / pen touches the surface
    function handlePointerDown(e) {
        if (sawPen && e.pointerType === "touch") {
            // Palm rejection for devices that support pens
            return;
        }

        canvas.setPointerCapture(e.pointerId);

        canvasClientRect = canvas.getBoundingClientRect();

        // Store these globally for the event handlers to refer to
        mouseX = e.clientX - canvasClientRect.left;
        mouseY = e.clientY - canvasClientRect.top;

        wacomPenDown = tablet.isPen();

        mouseDown[BUTTON_PRIMARY] = false;
        mouseDown[BUTTON_SECONDARY] = false;
        mouseDown[BUTTON_WHEEL] = false;

        mouseDown[e.button] = true;

        modeStack.mouseDown(e, e.button, getPointerPressure(e));
    }
    
    function handleKeyDown(e) {
        modeStack.keyDown(e);
    }
    
    function handleKeyUp(e) {
        modeStack.keyUp(e);
    }
    
    // Get the DOM element for the canvas area
    this.getElement = function() {
        return canvasContainer;
    };
    
    /**
     * Schedule a repaint for the current repaint region.
     */
    function repaint() {
        if (!scheduledRepaint) {
            scheduledRepaint = true;
            window.requestAnimationFrame(function() {
                that.paint();
            });
        }
    }
    
    /**
     * Schedule a repaint for the entire screen.
     */
    this.repaintAll = function() {
        repaintRegion.left = 0;
        repaintRegion.top = 0;
        repaintRegion.right = canvas.width;
        repaintRegion.bottom = canvas.height;
        
        repaint();
    };
    
    /**
     * Schedule a repaint for an area of the screen for later.
     * 
     * @param rect CPRect Region that should be repainted using display coordinates
     */
    function repaintRect(rect) {
        repaintRegion.union(rect);
        
        repaint();
    }
    
    this.paint = function() {
        var
            drawingWasClipped = false;
        
        scheduledRepaint = false;
        
        /* Clip drawing to the area of the screen we want to repaint */
        if (!repaintRegion.isEmpty()) {
            canvasContext.save();
            
            if (canvasContext.clipTo) {
                canvasContext.beginPath();

                repaintRegion.left = repaintRegion.left | 0; 
                repaintRegion.top = repaintRegion.top | 0;
                
                canvasContext.rect(
                    repaintRegion.left,
                    repaintRegion.top,
                    Math.ceil(repaintRegion.getWidth()),
                    Math.ceil(repaintRegion.getHeight())
                );

                canvasContext.clip();
            }
            
            drawingWasClipped = true;
        }
        
        /* Copy pixels that changed in the document into our local fused image cache */
        if (!artworkUpdateRegion.isEmpty()) {
            let
                imageData;

            if (maskView && maskView.isOpen()) {
                imageData = maskView.getImageData();
            } else {
                imageData = artwork.fusionLayers().getImageData();
            }

            artworkCanvasContext.putImageData(
                imageData, 0, 0, artworkUpdateRegion.left, artworkUpdateRegion.top, artworkUpdateRegion.getWidth(), artworkUpdateRegion.getHeight()
            );

            artworkUpdateRegion.makeEmpty();
        }

        canvasContext.fillStyle = '#606060';
        canvasContext.fillRect(0, 0, canvas.width, canvas.height);
        
        // Transform the coordinate system to bring the document into the right position on the screen (translate/zoom/etc)
        canvasContext.save();
        {
            canvasContext.setTransform(transform.m[0], transform.m[1], transform.m[2], transform.m[3], transform.m[4], transform.m[5]);
            
            canvasContext.fillStyle = checkerboardPattern;
            canvasContext.fillRect(0, 0, artwork.width, artwork.height);
            
            canvasContext.drawImage(
                artworkCanvas, 0, 0, artworkCanvas.width, artworkCanvas.height
            );
        }
        canvasContext.restore();
        
        // The rest of the drawing happens using the original screen coordinate system
        setContrastingDrawStyle(canvasContext, "stroke");

        canvasContext.lineWidth = 1.0;
        
        // Draw the artwork selection so long as we're not in the middle of selecting a new rectangle
        if (!artwork.getSelection().isEmpty() && !(modeStack.peek() instanceof CPRectSelectionMode && modeStack.peek().capture)) {
            canvasContext.setLineDash([3, 2]);
            
            plotSelectionRect(canvasContext, artwork.getSelection());
            
            canvasContext.setLineDash([]);
        }
        
        // Draw grid
        if (showGrid) {
            var
                bounds = artwork.getBounds(),
                
                gridVisualPitch = zoom * gridSize;
            
            /* If the grid is going to be miniscule on the screen (basically just covering/inverting the entire artwork,
             * do not paint it.
             */
            if (gridVisualPitch > 2) {
                canvasContext.beginPath();
                
                // Vertical lines
                for (let i = gridSize - 1; i < bounds.right; i += gridSize) {
                    let
                        p1 = coordToDisplay({x: i, y: bounds.top}),
                        p2 = coordToDisplay({x: i, y: bounds.bottom});
                    
                    canvasContext.moveTo(p1.x + 0.5, p1.y + 0.5);
                    canvasContext.lineTo(p2.x + 0.5, p2.y + 0.5);
                }
    
                // Horizontal lines
                for (let i = gridSize - 1; i < bounds.bottom; i += gridSize) {
                    let
                        p1 = coordToDisplay({x: 0, y: i}),
                        p2 = coordToDisplay({x: bounds.right, y: i});
                        
                    canvasContext.moveTo(p1.x + 0.5, p1.y + 0.5);
                    canvasContext.lineTo(p2.x + 0.5, p2.y + 0.5);
                }
    
                canvasContext.stroke();
            }
        }
        
        // Additional drawing by the current mode
        modeStack.paint(canvasContext);
        
        canvasContext.globalCompositeOperation = 'source-over';
        
        if (drawingWasClipped) {
            repaintRegion.makeEmpty();
            
            canvasContext.restore();
        }
    };
    
    this.showGrid = function(show) {
        showGrid = show;
        this.repaintAll();
    };

    /**
     * Resize the canvas area to the given height (in pixels)
     *
     * @param {int} height New canvas area height in CSS pixels
     * @param {boolean} skipCenter True if the canvas should not be re-centered
     */
    this.resize = function(height, skipCenter) {
        // Leave room for the bottom scrollbar
        height -= $(canvasContainerBottom).outerHeight();

        $(canvas).css('height', height + "px");

        canvas.width = $(canvas).width();
        canvas.height = height;

        canvasClientRect = null;

        if (!skipCenter) {
            centerCanvas();
        }

        // Interpolation property gets reset when canvas resizes
        this.setInterpolation(interpolation);

        this.repaintAll();
    };

    controller.on("toolChange", function(tool, toolInfo) {
        var
            newMode = drawingModes[toolInfo.strokeMode];

        // If we currently have any drawing modes active, switch them to the drawing mode of the new tool
        for (var i = 0; i < modeStack.modes.length; i++) {
            if (modeStack.modes[i] instanceof CPDrawingMode) {
                modeStack.modes[i].leave();
                modeStack.modes[i] = newMode;
                modeStack.modes[i].enter();

                break;
            }
        }

        curDrawMode = newMode;
    });
    
    controller.on("modeChange", function(mode) {
        var
            newMode;

        switch (mode) {
            case ChickenPaint.M_DRAW:
                newMode = curDrawMode;
                break;
    
            case ChickenPaint.M_FLOODFILL:
                newMode = floodFillMode;
                break;

            case ChickenPaint.M_GRADIENTFILL:
                newMode = gradientFillMode;
                break;

            case ChickenPaint.M_RECT_SELECTION:
                newMode = rectSelectionMode;
                break;
    
            case ChickenPaint.M_MOVE_TOOL:
                newMode = moveToolMode;
                break;
    
            case ChickenPaint.M_ROTATE_CANVAS:
                newMode = rotateCanvasMode;
                break;

            case ChickenPaint.M_PAN_CANVAS:
                newMode = panMode;
                break;

            case ChickenPaint.M_COLOR_PICKER:
                newMode = colorPickerMode;
                break;

            case ChickenPaint.M_TRANSFORM:
                newMode = transformMode;
                break;
        }

        modeStack.setUserMode(newMode);
    });

    function onMaskViewChangeLayer() {
        artworkUpdateRegion = artwork.getBounds();
        that.repaintAll();
    }

    controller.on("maskViewOpened", function(newMaskView) {
        if (maskView) {
            maskView.off("changeLayer", onMaskViewChangeLayer);
        }

        maskView = newMaskView;

        maskView.on("changeLayer", onMaskViewChangeLayer);

        onMaskViewChangeLayer();
    });
    
    //
    // Modes system: modes control the way the GUI is reacting to the user input
    // All the tools are implemented through modes
    //
    
    defaultMode = new CPDefaultMode();
    colorPickerMode = new CPColorPickerMode();
    panMode = new CPPanCanvasMode();
    rotateCanvasMode = new CPRotateCanvasMode();
    floodFillMode = new CPFloodFillMode();
    gradientFillMode = new CPGradientFillMode();
    rectSelectionMode = new CPRectSelectionMode();
    moveToolMode = new CPMoveToolMode();
    transformMode = new CPTransformMode();

    // this must correspond to the stroke modes defined in CPToolInfo
    drawingModes = [new CPFreehandMode(), new CPLineMode(), new CPBezierMode()];

    curDrawMode = drawingModes[CPBrushInfo.STROKE_MODE_FREEHAND];

    // The default mode will handle the events that no other modes are interested in
    modeStack.setDefaultMode(defaultMode);
    modeStack.setUserMode(curDrawMode);

    artworkCanvas.width = artwork.width;
    artworkCanvas.height = artwork.height;
    
    canvas.width = 800;
    canvas.height = 900;
    canvas.className = "chickenpaint-canvas";
    canvas.setAttribute("touch-action", "none");
    
    if (!canvasContext.setLineDash) { 
        canvasContext.setLineDash = function () {}; // For IE 10 and older
    }
    
    canvas.addEventListener("contextmenu", function(e) {
        e.preventDefault();
    });
    
    canvas.addEventListener("mouseenter", function() {
        mouseIn = true;
    });
    
    canvas.addEventListener("mouseleave", function() {
        mouseIn = false;
        
        if (!mouseDown[BUTTON_PRIMARY] && !mouseDown[BUTTON_SECONDARY] && !mouseDown[BUTTON_WHEEL]) {
            that.repaintAll();
        }
    });
    
    canvas.addEventListener("pointerdown", handlePointerDown);
    canvas.addEventListener("pointermove", handlePointerMove);
    canvas.addEventListener("pointerup", handlePointerUp);
    canvas.addEventListener("wheel", handleMouseWheel);
    
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);

    /* Workaround for Chrome Mac bug that causes canvas to be disposed and never recreated when tab is switched into the 
     * background https://bugs.chromium.org/p/chromium/issues/detail?id=588434
     */
    document.addEventListener("visibilitychange", function() {
        var
            oldHeight = canvas.height + $(canvasContainerBottom).outerHeight();

        canvas.width = 1;
        canvas.height = 1;

        that.resize(oldHeight, true);
    }, false);
    
    window.addEventListener("scroll", function() {
        canvasClientRect = null;
    });
    
    canvas.addEventListener("mousedown", function(e) {
        if (e.button == BUTTON_WHEEL) {
            // Prevent middle-mouse scrolling in Firefox
            e.preventDefault();
        }
    });

    artwork.on("changeSelection", function() {
        // We could keep track of our last-painted selection rect and only invalidate that here
        that.repaintAll();
    });
    
    artwork.on("updateRegion", function(region) {
        artworkUpdateRegion.union(region);
        
        repaintRect(getRefreshArea(artworkUpdateRegion));
    });
    
    horzScroll.on("valueChanged", function(value) {
        var 
            p = that.getOffset();
        
        that.setOffset(-value, p.y);
    });
    
    vertScroll.on("valueChanged", function(value) {
        var 
            p = that.getOffset();
        
        that.setOffset(p.x, -value);
    });
    
    this.setInterpolation(false);

    var
        canvasSpacingWrapper = document.createElement("div");
    
    canvasSpacingWrapper.className = 'chickenpaint-canvas-container-wrapper';
    canvasSpacingWrapper.appendChild(canvas);
    
    canvasContainerTop.className = 'chickenpaint-canvas-container-top';
    canvasContainerTop.appendChild(canvasSpacingWrapper);
    canvasContainerTop.appendChild(vertScroll.getElement());
    
    canvasContainerBottom.className = 'chickenpaint-canvas-container-bottom';
    canvasContainerBottom.appendChild(horzScroll.getElement());
    
    canvasContainer.appendChild(canvasContainerTop);
    canvasContainer.appendChild(canvasContainerBottom);
    
    controller.setCanvas(this);
}

CPCanvas.prototype = Object.create(EventEmitter.prototype);
CPCanvas.prototype.constructor = CPCanvas;
