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

import CPRect from "../util/CPRect";
import CPTransform from "../util/CPTransform";
import CPWacomTablet from "../util/CPWacomTablet";
import CPBezier from "../util/CPBezier";

import CPBrushInfo from "../engine/CPBrushInfo";

import {createCheckerboardPattern} from "./CPGUIUtils";
import CPScrollbar from "./CPScrollbar";

export default function CPCanvas(controller) {
    const
        BUTTON_PRIMARY = 0,
        BUTTON_WHEEL = 1,
        BUTTON_SECONDARY = 2,

        MIN_ZOOM = 0.10,
        MAX_ZOOM = 16.0;

    var
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
        
        brushPreview = false,
        
        /* The last rectangle we dirtied with a brush preview circle, or null if one hasn't been drawn yet */
        oldPreviewRect = null,
        
        defaultCursor = "default", moveCursor = "grab", movingCursor = "grabbing", crossCursor = "crosshair",
        mouseIn = false, mouseDown = false, wacomPenDown = false,
        
        dontStealFocus = false,
        
        /* The area of the document that should have its layers fused and repainted to the screen
         * (i.e. an area modified by drawing tools). 
         * 
         * Initially set to the size of the artwork so we can repaint the whole thing.
         */
        artworkUpdateRegion = new CPRect(0, 0, artwork.width, artwork.height),
        
        /**
         * The area of the canvas that should be repainted to the screen during the next repaint internal (in canvas
         * coordinates).
         */
        repaintRegion = new CPRect(0, 0, 0, 0),
        scheduledRepaint = false,
        
        //
        // Modes system: modes control the way the GUI is reacting to the user input
        // All the tools are implemented through modes
        //
        
        defaultMode,
        colorPickerMode,
        moveCanvasMode,
        rotateCanvasMode,
        floodFillMode,
        gradientFillMode,
        rectSelectionMode,
        moveToolMode,

        // this must correspond to the stroke modes defined in CPToolInfo
        drawingModes = [],

        curDrawMode, curSelectedMode, activeMode,
        
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
    
    CPMode.prototype.keyDown = function(e) {
        if (e.keyCode == 32 /* Space */) {
            // Stop the page from scrolling in modes that don't care about space
            e.preventDefault();
        }
    };
    
    CPMode.prototype.mouseMoved = CPMode.prototype.paint = CPMode.prototype.mousePressed 
        = CPMode.prototype.mouseDragged = CPMode.prototype.mouseReleased 
        = CPMode.prototype.keyUp = function() {};
    
    //
    // Default UI Mode when not doing anything: used to start the other modes
    //

    function CPDefaultMode() {
    }
    
    CPDefaultMode.prototype = Object.create(CPMode.prototype);
    CPDefaultMode.prototype.constructor = CPDefaultMode;
    
    CPDefaultMode.prototype.mousePressed = function(e, pressure) {
        var
            spacePressed = key.isPressed("space");
        
        // FIXME: replace the moveToolMode hack by a new and improved system
        if (!spacePressed && e.button == BUTTON_PRIMARY
                && (!e.altKey || curSelectedMode == moveToolMode)) {

            if (!artwork.getActiveLayer().visible && curSelectedMode != rotateCanvasMode
                    && curSelectedMode != rectSelectionMode) {
                return; // don't draw on a hidden layer
            }
            
            /* Switch to the new mode before trying to repaint the brush preview (the new mode
             * might want to erase it!
             */
            activeMode = curSelectedMode;
            
            repaintBrushPreview();

            activeMode.mousePressed(e, pressure);
        } else if (!spacePressed
                && (e.button == BUTTON_SECONDARY || e.button == BUTTON_PRIMARY && e.altKey)) {
            repaintBrushPreview();

            activeMode = colorPickerMode;
            activeMode.mousePressed(e, pressure);
        } else if ((e.button == BUTTON_WHEEL || spacePressed) && !e.altKey) {
            repaintBrushPreview();

            activeMode = moveCanvasMode;
            activeMode.mousePressed(e, pressure);
        } else if ((e.button == BUTTON_WHEEL || spacePressed) && e.altKey) {
            repaintBrushPreview();

            activeMode = rotateCanvasMode;
            activeMode.mousePressed(e, pressure);
        }
    };

    CPDefaultMode.prototype.mouseMoved = function(e, pressure) {
        var
            spacePressed = key.isPressed("space");
        
        if (!spacePressed && curSelectedMode == curDrawMode) {
            brushPreview = true;

            var 
                //pf = coordToDocument(mouseCoordToCanvas({x: e.pageX, y: e.pageY})),
                r = getBrushPreviewOval();
            
            r.grow(2, 2);
            
            // If a brush preview was drawn previously, stretch the repaint region to remove that old copy
            if (oldPreviewRect != null) {
                r.union(oldPreviewRect);
                oldPreviewRect = null;
            }
            
/*            if (artwork.isPointWithin(pf.x, pf.y)) {
                setCursor(defaultCursor); // FIXME find a cursor that everyone likes
            } else { */
                setCursor(defaultCursor);
            //}

            repaintRect(r);
        }
    };
    
    CPDefaultMode.prototype.keyDown = function(e) {
        if (e.keyCode == 32 /* Space */) {
            if (e.altKey) {
                activeMode = rotateCanvasMode;
            } else {
                activeMode = moveCanvasMode;
            }
            activeMode.keyDown(e);
        }
    };
    
    CPDefaultMode.prototype.paint = function() {
        if (brushPreview && curSelectedMode == curDrawMode) {
            brushPreview = false;

            var
                r = getBrushPreviewOval();
            
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
            
            if (oldPreviewRect == null) {
                oldPreviewRect = r;
            } else {
                oldPreviewRect.union(r);
            }
        }
    };
    
    function CPFreehandMode() {
        this.dragLeft = false,
        this.smoothMouse = {x:0.0, y:0.0};
    }
    
    CPFreehandMode.prototype = Object.create(CPMode.prototype);
    CPFreehandMode.prototype.constructor = CPFreehandMode;
    
    CPFreehandMode.prototype.mousePressed = function(e, pressure) {
        if (!this.dragLeft && e.button == BUTTON_PRIMARY) {
            var 
                pf = coordToDocument({x: mouseX, y:mouseY});

            this.dragLeft = true;
            artwork.beginStroke(pf.x, pf.y, pressure);

            this.smoothMouse = pf;
        }
    };

    CPFreehandMode.prototype.mouseDragged = function(e, pressure) {
        var 
            pf = coordToDocument({x: mouseX, y: mouseY}),
            smoothing = Math.min(0.999, Math.pow(controller.getBrushInfo().smoothing, 0.3));

        this.smoothMouse.x = (1.0 - smoothing) * pf.x + smoothing * this.smoothMouse.x;
        this.smoothMouse.y = (1.0 - smoothing) * pf.y + smoothing * this.smoothMouse.y;

        if (this.dragLeft) {
            artwork.continueStroke(this.smoothMouse.x, this.smoothMouse.y, pressure);
        }
    };

    CPFreehandMode.prototype.mouseReleased = function(e) {
        if (this.dragLeft && e.button == BUTTON_PRIMARY) {
            this.dragLeft = false;
            artwork.endStroke();

            activeMode = defaultMode; // yield control to the default mode
        }
    };
        
    CPFreehandMode.prototype.mouseMoved = CPFreehandMode.prototype.paint = function(e) {
    };
    
    function CPLineMode() {
        var
            dragLine = false,
            dragLineFrom, dragLineTo,
            LINE_PREVIEW_WIDTH = 1;

        this.mousePressed = function(e) {
            if (!dragLine && e.button == BUTTON_PRIMARY) {
                dragLine = true;
                dragLineFrom = dragLineTo = {x: mouseX + 0.5, y: mouseY + 0.5};
            }
        };

        this.mouseDragged = function(e) {
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
        };

        this.mouseReleased = function(e) {
            if (dragLine && e.button == BUTTON_PRIMARY) {
                var
                    from = coordToDocument(dragLineFrom),
                    to = coordToDocument(dragLineTo);

                dragLine = false;

                this.drawLine(from, to);

                var
                    invalidateRect = new CPRect(
                        Math.min(dragLineFrom.x, dragLineTo.x) - LINE_PREVIEW_WIDTH - 1,
                        Math.min(dragLineFrom.y, dragLineTo.y) - LINE_PREVIEW_WIDTH - 1,
                        Math.max(dragLineFrom.x, dragLineTo.x) + LINE_PREVIEW_WIDTH + 1 + 1,
                        Math.max(dragLineFrom.y, dragLineTo.y) + LINE_PREVIEW_WIDTH + 1 + 1
                    );
                
                repaintRect(invalidateRect);

                activeMode = defaultMode; // yield control to the default mode
            }
        };

        this.paint = function() {
            if (dragLine) {
                canvasContext.lineWidth = LINE_PREVIEW_WIDTH;
                canvasContext.beginPath();
                canvasContext.moveTo(dragLineFrom.x, dragLineFrom.y);
                canvasContext.lineTo(dragLineTo.x, dragLineTo.y);
                canvasContext.stroke();
            }
        };
    }
    
    CPLineMode.prototype = Object.create(CPMode.prototype);
    CPLineMode.prototype.constructor = CPLineMode;

    CPLineMode.prototype.drawLine = function(from, to) {
        artwork.beginStroke(from.x, from.y, 1);
        artwork.continueStroke(to.x, to.y, 1);
        artwork.endStroke();
    };

    function CPBezierMode() {
        const
            BEZIER_POINTS = 500,
            BEZIER_POINTS_PREVIEW = 100;

        var
            dragBezier = false,
            dragBezierMode = 0, // 0 Initial drag, 1 first control point, 2 second point
            dragBezierP0, dragBezierP1, dragBezierP2, dragBezierP3;
            

        this.mousePressed = function(e) {
            var 
                spacePressed = key.isPressed("space"),
                p = coordToDocument(mouseCoordToCanvas({x: e.pageX, y: e.pageY}));

            if (!dragBezier && !spacePressed && e.button == BUTTON_PRIMARY) {
                dragBezier = true;
                dragBezierMode = 0;
                dragBezierP0 = dragBezierP1 = dragBezierP2 = dragBezierP3 = p;
            }
        };

        this.mouseDragged = function(e) {
            var
                p = coordToDocument(mouseCoordToCanvas({x: e.pageX, y: e.pageY}));

            if (dragBezier && dragBezierMode == 0) {
                dragBezierP2 = dragBezierP3 = p;
                that.repaintAll();
            }
        };

        this.mouseReleased = function(e) {
            if (dragBezier && e.button == BUTTON_PRIMARY) {
                if (dragBezierMode == 0) {
                    dragBezierMode = 1;
                } else if (dragBezierMode == 1) {
                    dragBezierMode = 2;
                } else if (dragBezierMode == 2) {
                    dragBezier = false;

                    var 
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

                    var 
                        x = new Array(BEZIER_POINTS),
                        y = new Array(BEZIER_POINTS);

                    bezier.compute(x, y, BEZIER_POINTS);

                    artwork.beginStroke(x[0], y[0], 1);
                    for (var i = 1; i < BEZIER_POINTS; i++) {
                        artwork.continueStroke(x[i], y[i], 1);
                    }
                    artwork.endStroke();
                    that.repaintAll();

                    activeMode = defaultMode; // yield control to the default mode
                }
            }
        };

        this.mouseMoved = function(e) {
            var
                p = coordToDocument(mouseCoordToCanvas({x: e.pageX, y: e.pageY}));

            if (dragBezier) {
                if (dragBezierMode == 1) {
                    dragBezierP1 = p;
                } else if (dragBezierMode == 2) {
                    dragBezierP2 = p;
                }
                that.repaintAll(); // FIXME: repaint only the bezier region
            }
        };

        this.paint = function() {
            if (dragBezier) {
                var
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

                var
                    x = new Array(BEZIER_POINTS_PREVIEW),
                    y = new Array(BEZIER_POINTS_PREVIEW);
                    
                bezier.compute(x, y, BEZIER_POINTS_PREVIEW);

                canvasContext.beginPath();
                
                canvasContext.moveTo(x[0], y[0]);
                for (var i = 1; i < BEZIER_POINTS_PREVIEW; i++) {
                    canvasContext.lineTo(x[i], y[i]);
                }
                
                canvasContext.moveTo(~~p0.x, ~~p0.y);
                canvasContext.lineTo(~~p1.x, ~~p1.y);
                
                canvasContext.moveTo(~~p2.x, ~~p2.y);
                canvasContext.lineTo(~~p3.x, ~~p3.y);
                
                canvasContext.stroke();
            }
        };
    }
    
    CPBezierMode.prototype = Object.create(CPMode.prototype);
    CPBezierMode.prototype.constructor = CPBezierMode;

    function CPColorPickerMode() {
        var 
            mouseButton;

        this.mousePressed = function(e) {
            mouseButton = e.button;

            setCursor(crossCursor);
            
            this.mouseDragged(e);
        };

        this.mouseDragged = function(e) {
            var pf = coordToDocument(mouseCoordToCanvas({x: e.pageX, y: e.pageY}));

            if (artwork.isPointWithin(pf.x, pf.y)) {
                controller.setCurColorRgb(artwork.colorPicker(pf.x, pf.y));
            }
        };

        this.mouseReleased = function(e) {
            if (e.button == mouseButton) {
                setCursor(defaultCursor);
                activeMode = defaultMode; // yield control to the default mode
            }
        };
    }
    
    CPColorPickerMode.prototype = Object.create(CPMode.prototype);
    CPColorPickerMode.prototype.constructor = CPColorPickerMode;

    function CPMoveCanvasMode() {
        var
            dragMiddle = false,
            dragMoveX, dragMoveY,
            dragMoveOffset,
            dragMoveButton;

        this.keyDown = function(e) {
            if (e.keyCode == 32 /* Space */) {
                if (!dragMiddle) {
                    setCursor(moveCursor);
                }
                e.preventDefault();
            }
        };

        this.keyUp = function(e) {
            if (!dragMiddle && e.keyCode == 32 /* Space */) {
                setCursor(defaultCursor);
                activeMode = defaultMode; // yield control to the default mode
            }
        };

        this.mousePressed = function(e) {
            var
                p = {x: e.pageX, y: e.pageY},
                spacePressed = key.isPressed("space");

            if (!dragMiddle && (e.button == BUTTON_WHEEL || spacePressed)) {
                repaintBrushPreview();

                dragMiddle = true;
                dragMoveButton = e.button;
                dragMoveX = p.x;
                dragMoveY = p.y;
                dragMoveOffset = that.getOffset();
                setCursor(movingCursor);
            }
        };

        this.mouseDragged = function(e) {
            if (dragMiddle) {
                var
                    p = {x: e.pageX, y: e.pageY};

                that.setOffset(dragMoveOffset.x + p.x - dragMoveX, dragMoveOffset.y + p.y - dragMoveY);
                that.repaintAll();
            }
        };

        this.mouseReleased = function(e) {
            if (dragMiddle && e.button == dragMoveButton) {
                dragMiddle = false;
                setCursor(defaultCursor);

                activeMode = defaultMode; // yield control to the default mode
            }
        };
    }
    
    CPMoveCanvasMode.prototype = Object.create(CPMode.prototype);
    CPMoveCanvasMode.prototype.constructor = CPFloodFillMode;

    function CPFloodFillMode() {
    }
    
    CPFloodFillMode.prototype = Object.create(CPMode.prototype);
    CPFloodFillMode.prototype.constructor = CPFloodFillMode;

    CPFloodFillMode.prototype.mousePressed = function(e) {
        var 
            pf = coordToDocument(mouseCoordToCanvas({x: e.pageX, y: e.pageY}));
    
        if (artwork.isPointWithin(pf.x, pf.y)) {
            artwork.floodFill(pf.x, pf.y);
            that.repaintAll();
        }
    
        activeMode = defaultMode; // yield control to the default mode
    };

    function CPRectSelectionMode() {
        var
            firstClick,
            curRect = new CPRect(0, 0, 0, 0);

        this.mousePressed = function (e) {
            var
                p = coordToDocumentInt(mouseCoordToCanvas({x: e.pageX, y: e.pageY}));

            curRect.makeEmpty();
            firstClick = p;

            that.repaintAll();
        };

        this.mouseDragged = function(e) {
            var
                p = coordToDocumentInt(mouseCoordToCanvas({x: e.pageX, y: e.pageY})),
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
        };

        this.mouseReleased = function (e) {
            artwork.rectangleSelection(curRect);
            curRect.makeEmpty();
            
            activeMode = defaultMode; // yield control to the default mode
            that.repaintAll();
        };

        this.paint = function() {
            if (!curRect.isEmpty()) {
                canvasContext.lineWidth = 1;
                plotSelectionRect(canvasContext, curRect);
            }
        };
    };

    CPRectSelectionMode.prototype = Object.create(CPMode.prototype);
    CPRectSelectionMode.prototype.constructor = CPRectSelectionMode;

    function CPMoveToolMode() {
        var 
            firstClick;

        this.mousePressed = function(e) {
            var
                p = coordToDocument(mouseCoordToCanvas({x: e.pageX, y: e.pageY}));
            
            firstClick = p;

            artwork.beginPreviewMode(e.altKey);

            // FIXME: The following hack avoids a slight display glitch
            // if the whole move tool mess is fixed it probably won't be necessary anymore
            artwork.move(0, 0);
        };

        this.mouseDragged = function(e) {
            var
                p = coordToDocument(mouseCoordToCanvas({x: e.pageX, y: e.pageY}));
            
            artwork.move(Math.round(p.x - firstClick.x), Math.round(p.y - firstClick.y));
            
            that.repaintAll();
        };

        this.mouseReleased = function(e) {
            artwork.endPreviewMode();
            
            activeMode = defaultMode; // yield control to the default mode
            that.repaintAll();
        };
    }
    
    CPMoveToolMode.prototype = Object.create(CPMode.prototype);
    CPMoveToolMode.prototype.constructor = CPMoveToolMode;

    function CPRotateCanvasMode() {
        var 
            firstClick,
            initAngle = 0.0,
            initTransform,
            dragged = false;

        this.mousePressed = function(e) {
            firstClick = {x: e.pageX - $(canvas).offset().left, y: e.pageY - $(canvas).offset().top};

            initAngle = that.getRotation();
            initTransform = transform.clone();

            dragged = false;

            repaintBrushPreview();
        };

        this.mouseDragged = function(e) {
            dragged = true;

            var
                p = {x: e.pageX - $(canvas).offset().left, y: e.pageY - $(canvas).offset().top},
            
                displayCenter = {x: $(canvas).width() / 2, y: $(canvas).height() / 2},
                canvasCenter = {x: canvas.width / 2, y: canvas.height / 2},

                deltaAngle = Math.atan2(p.y - displayCenter.y, p.x - displayCenter.x) - Math.atan2(firstClick.y - displayCenter.y, firstClick.x - displayCenter.x),

                rotTrans = new CPTransform();
            
            rotTrans.rotateAroundPoint(deltaAngle, canvasCenter.x, canvasCenter.y);

            rotTrans.multiply(initTransform);

            that.setRotation(initAngle + deltaAngle);
            that.setOffset(~~rotTrans.getTranslateX(), ~~rotTrans.getTranslateY());
            that.repaintAll();
        };

        /**
         * When the mouse is released after rotation, we might want to snap our angle to the nearest 90 degree mark.
         */
        function finishRotation() {
            const
                ROTATE_SNAP_DEGREES = 5;
            
            var 
                nearest90 = Math.round(canvasRotation / (Math.PI / 2)) * Math.PI / 2;
            
            if (Math.abs(canvasRotation - nearest90) < ROTATE_SNAP_DEGREES / 180 * Math.PI) {
                var 
                    deltaAngle = nearest90 - initAngle,
                
                    center = {x: canvas.width / 2, y: canvas.height / 2},

                    rotTrans = new CPTransform();
                
                rotTrans.rotateAroundPoint(deltaAngle, center.x, center.y);

                rotTrans.multiply(initTransform);

                that.setRotation(initAngle + deltaAngle);
                that.setOffset(~~rotTrans.getTranslateX(), ~~rotTrans.getTranslateY());
                
                that.repaintAll();
            }
        }
        
        this.mouseReleased = function (e) {
            if (dragged) {
                finishRotation();
            } else {
                that.resetRotation();
            }

            activeMode = defaultMode; // yield control to the default mode
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

    function requestFocusInWindow() {
        // TODO
    }
    
    function setCursor(cursor) {
        if (canvas.getAttribute("data-cursor") != cursor) {
            canvas.setAttribute("data-cursor", cursor);
        }
    }
    
    /**
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
     * Convert a canvas-relative coordinate into document coordinates.
     */
    function coordToDocument(coord) {
        // TODO cache inverted transform
        return transform.getInverted().transformPoint(coord.x, coord.y);
    }
    
    /**
     * Convert a canvas-relative coordinate into document coordinates.
     */
    function coordToDocumentInt(coord) {
        // TODO cache inverted transform
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
        return transform.transformPoint(p.x, p.y);
    }

    function coordToDisplayInt(p) {
        var
            result = coordToDisplay(p);
        
        result.x = Math.round(result.x);
        result.y = Math.round(result.y);
        
        return result;
    }

    /**
     * Stroke a selection rectangle that encloses the pixels in the given rectangle (in document co-ordinates).
     */
    function plotSelectionRect(context, rect) {
        context.beginPath();

        var
            center = coordToDisplay({x: (rect.left + rect.right) / 2, y: (rect.top + rect.bottom) / 2}),
            coords = [
                {x: rect.left, y: rect.top},
                {x: rect.right, y: rect.top},
                {x: rect.right, y: rect.bottom},
                {x: rect.left, y: rect.bottom},
            ];

        for (var i = 0; i < coords.length; i++) {
            coords[i] = coordToDisplayInt(coords[i]);

            // Need to inset the co-ordinates by 0.5 display pixels for the line to pass through the middle of the display pixel
            coords[i].x +=  Math.sign(center.x - coords[i].x) * 0.5;
            coords[i].y +=  Math.sign(center.y - coords[i].y) * 0.5;
        }

        context.moveTo(coords[0].x, coords[0].y);
        for (var i = 1; i < coords.length; i++) {
            context.lineTo(coords[i].x, coords[i].y);
        }
        context.lineTo(coords[0].x, coords[0].y);

        context.stroke();
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
     * Repaint the area of the canvas that was last occupied by the brush preview circle (useful for erasing
     * the brush preview when switching drawing modes to one that won't be using a preview).
     */
    function repaintBrushPreview() {
        if (oldPreviewRect != null) {
            var r = oldPreviewRect;
            oldPreviewRect = null;
            repaintRect(r);
        }
    }

    /**
     * Get a rectangle that encloses the preview brush, in screen coordinates.
     */
    function getBrushPreviewOval() {
        var 
            brushSize = controller.getBrushSize() * zoom;
        
        return new CPRect(
            mouseX - brushSize / 2,
            mouseY - brushSize / 2,
            mouseX + brushSize / 2,
            mouseY + brushSize / 2
        );
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
        
        var
            browserProperties = [
                 "imageSmoothingEnabled", "mozImageSmoothingEnabled", "webkitImageSmoothingEnabled",
                 "msImageSmoothingEnabled"
            ];
        
        for (var i = 0; i < browserProperties.length; i++) {
            if (browserProperties[i] in canvasContext) {
                canvasContext[browserProperties[i]] = enabled;
                break;
            }
        }

        this.repaintAll();
    };

    this.setRotation = function(angle) {
        canvasRotation = angle % (2 * Math.PI);
        updateTransform();
    };

    /**
     * Get canvas rotation in radians.
     * 
     * @return float
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
            height = $(canvas).height()
            
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
    };
    
    /**
     * Add the pointer pressure field to the given pointer event.
     */
    function getPointerPressure(e) {
        // Use Wacom pressure in preference to pointer event pressure (if present)
        if (wacomPenDown) {
            return tablet.getPressure();
        } else {
            /* In the Pointer Events API, mice have a default pressure of 0.5, but we want 1.0. Since we can't 
             * distinguish between mice and pens at this point, we don't have any better options:
             */
            return e.pressure * 2;
        }
    }

    var
        mouseWheelDebounce = false;

    function handleMouseWheel(e) {
        if (e.deltaY != 0) {
            if (!mouseWheelDebounce || Math.abs(e.deltaY) > 20) {
                var
                    factor;

                if (e.deltaY > 0) {
                    factor = 1 / 1.15;
                } else {
                    factor = 1.15;
                }

                var
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

    var
        canvasClientRect;

    function handlePointerMove(e) {
        // Use the cached position of the canvas on the page if possible
        if (!canvasClientRect) {
            canvasClientRect = canvas.getBoundingClientRect();
        }

        var
            mousePos = {x: e.clientX - canvasClientRect.left, y: e.clientY - canvasClientRect.top};
        
        // Store these globally for the event handlers to refer to
        mouseX = mousePos.x;
        mouseY = mousePos.y;

        if (!dontStealFocus) {
            requestFocusInWindow();
        }

        if (mouseDown) {
            activeMode.mouseDragged(e, getPointerPressure(e));
        } else {
            activeMode.mouseMoved(e, getPointerPressure(e));
        }
    }
    
    function handlePointerUp(e) {
        mouseDown = false;
        wacomPenDown = false;
        activeMode.mouseReleased(e);
        canvas.releasePointerCapture(e.pointerId);
    }
    
    function handlePointerDown(e) {
        canvas.setPointerCapture(e.pointerId);

        canvasClientRect = canvas.getBoundingClientRect();

        var
            mousePos = {x: e.clientX - canvasClientRect.left, y: e.clientY - canvasClientRect.top};

        // Store these globally for the event handlers to refer to
        mouseX = mousePos.x;
        mouseY = mousePos.y;

        if (!mouseDown) {
            mouseDown = true;
            wacomPenDown = tablet.isPen();
            
            requestFocusInWindow();
            activeMode.mousePressed(e, getPointerPressure(e));
        }
    }
    
    function handleKeyDown(e) {
        activeMode.keyDown(e);
    }
    
    function handleKeyUp(e) {
        activeMode.keyUp(e);
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
    };
    
    this.paint = function() {
        var
            drawingWasClipped = false;
        
        scheduledRepaint = false;
        
        /* Clip drawing to the area of the screen we want to repaint */
        if (!repaintRegion.isEmpty()) {
            canvasContext.save();
            
            if (canvasContext.clip) {
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
            var
                imageData = artwork.fusionLayers();
            
            artworkCanvasContext.putImageData(
                imageData, 0, 0, artworkUpdateRegion.left, artworkUpdateRegion.top, artworkUpdateRegion.right - artworkUpdateRegion.left, artworkUpdateRegion.bottom - artworkUpdateRegion.top
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
        
        canvasContext.globalCompositeOperation = 'exclusion';
        
        if (canvasContext.globalCompositeOperation == "exclusion") {
            // White + exclusion inverts the colors underneath, giving us good contrast
            canvasContext.strokeStyle = 'white';
        } else {
            // IE Edge doesn't support Exclusion, so how about Difference with mid-grey instead
            // This is visible on black and white, but disappears on a grey background
            canvasContext.globalCompositeOperation = 'difference';
            canvasContext.strokeStyle = '#888';
            
            // For super dumb browsers (only support source-over), at least don't make the cursor invisible on a white BG!
            if (canvasContext.globalCompositeOperation != "difference") {
                canvasContext.strokeStyle = 'black';
            }
        }
        canvasContext.lineWidth = 1.0;
        
        // Draw selection
        if (!artwork.getSelection().isEmpty()) {
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
                for (var i = gridSize - 1; i < bounds.right; i += gridSize) {
                    var
                        p1 = coordToDisplay({x: i, y: bounds.top}),
                        p2 = coordToDisplay({x: i, y: bounds.bottom});
                    
                    canvasContext.moveTo(p1.x + 0.5, p1.y + 0.5);
                    canvasContext.lineTo(p2.x + 0.5, p2.y + 0.5);
                }
    
                // Horizontal lines
                for (var i = gridSize - 1; i < bounds.bottom; i += gridSize) {
                    var
                        p1 = coordToDisplay({x: 0, y: i}),
                        p2 = coordToDisplay({x: bounds.right, y: i});
                        
                    canvasContext.moveTo(p1.x + 0.5, p1.y + 0.5);
                    canvasContext.lineTo(p2.x + 0.5, p2.y + 0.5);
                }
    
                canvasContext.stroke();
            }
        }
        
        // Additional drawing by the current mode
        activeMode.paint(canvasContext);
        
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
     * @param height New canvas area height in pixels
     */
    this.resize = function(height) {
        // Leave room for the bottom scrollbar
        height -= $(canvasContainerBottom).outerHeight();

        $(canvas).css('height', height + "px");

        canvas.width = $(canvas).width();
        canvas.height = height;

        canvasClientRect = null;

        centerCanvas();

        // Interpolation property gets reset when canvas resizes
        this.setInterpolation(interpolation);

        this.repaintAll();
    };

    controller.on("toolChange", function(tool, toolInfo) {
        var
            spacePressed = key.isPressed("space");

        if (curSelectedMode == curDrawMode) {
            curSelectedMode = drawingModes[toolInfo.strokeMode];
        }
        curDrawMode = drawingModes[toolInfo.strokeMode];

        if (!spacePressed && mouseIn) {
            brushPreview = true;

            var 
                rect = getBrushPreviewOval();
            
            rect.grow(2, 2);
            
            if (oldPreviewRect != null) {
                rect.union(oldPreviewRect);
                oldPreviewRect = null;
            }

            repaintRect(rect);
        }
    });
    
    controller.on("modeChange", function(mode) {
        switch (mode) {
            case ChickenPaint.M_DRAW:
                curSelectedMode = curDrawMode;
                break;
    
            case ChickenPaint.M_FLOODFILL:
                curSelectedMode = floodFillMode;
                break;

            case ChickenPaint.M_GRADIENTFILL:
                curSelectedMode = gradientFillMode;
                break;

            case ChickenPaint.M_RECT_SELECTION:
                curSelectedMode = rectSelectionMode;
                break;
    
            case ChickenPaint.M_MOVE_TOOL:
                curSelectedMode = moveToolMode;
                break;
    
            case ChickenPaint.M_ROTATE_CANVAS:
                curSelectedMode = rotateCanvasMode;
                break;
    
            case ChickenPaint.M_COLOR_PICKER:
                curSelectedMode = colorPickerMode;
                break;
        }
    });
    
    //
    // Modes system: modes control the way the GUI is reacting to the user input
    // All the tools are implemented through modes
    //
    
    defaultMode = new CPDefaultMode();
    colorPickerMode = new CPColorPickerMode();
    moveCanvasMode = new CPMoveCanvasMode();
    rotateCanvasMode = new CPRotateCanvasMode();
    floodFillMode = new CPFloodFillMode();
    gradientFillMode = new CPGradientFillMode();
    rectSelectionMode = new CPRectSelectionMode();
    moveToolMode = new CPMoveToolMode();

    // this must correspond to the stroke modes defined in CPToolInfo
    drawingModes = [new CPFreehandMode(), new CPLineMode(), new CPBezierMode()];

    curDrawMode = drawingModes[CPBrushInfo.SM_FREEHAND];
    curSelectedMode = curDrawMode;
    activeMode = defaultMode;
    
    artworkCanvas.width = artwork.width;
    artworkCanvas.height = artwork.height;
    
    canvas.width = 800;
    canvas.height = 900;
    canvas.className = "chickenpaint-canvas";
    canvas.setAttribute("touch-action", "none");
    
    if (!canvasContext.setLineDash) { 
        canvasContext.setLineDash = function () {} // For IE 10 and older
    }
    
    canvas.addEventListener("contextmenu", function(e) {
        e.preventDefault();
    });
    
    canvas.addEventListener("mouseenter", function() {
        mouseIn = true;
    });
    
    canvas.addEventListener("mouseleave", function() {
        mouseIn = false;
        
        if (!mouseDown) {
            that.repaintAll();
        }
    });
    
    canvas.addEventListener("pointerdown", handlePointerDown);
    canvas.addEventListener("pointermove", handlePointerMove);
    canvas.addEventListener("pointerup", handlePointerUp);
    canvas.addEventListener("wheel", handleMouseWheel)
    
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

        that.resize(oldHeight);
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