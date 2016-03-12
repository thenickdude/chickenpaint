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

/**
 * Stroke the polygon represented by the array of `points` (x:?, y:?} to the given canvas context. 
 * 
 * @param offset Added to each point before plotting (suggest 0.5 offset for a line to center on the middle of a pixel) 
 */
function plotPolygon(context, points, offset) {
    offset = offset || 0.0;
    
    context.beginPath();
    
    context.moveTo(points[0].x + offset, points[0].y + offset);
    
    for (var i = 1; i < points.length; i++) {
        context.lineTo(points[i].x + offset, points[i].y + offset);
    }
    
    // Close the polygon
    context.lineTo(points[0].x + offset, points[0].y + offset);
    
    context.stroke();
}

export default function CPCanvas(controller) {
    const
        BUTTON_PRIMARY = 0,
        BUTTON_WHEEL = 1,
        BUTTON_SECONDARY = 2;
    
    var
        that = this,
    
        canvas = document.createElement("canvas"),
        canvasContext = canvas.getContext("2d"),
        
        artworkCanvas = document.createElement("canvas"),
        artworkCanvasContext = artworkCanvas.getContext("2d"),
        
        checkerboardPattern = createCheckerboardPattern(),
        
        artwork = controller.getArtwork(),

        // Canvas transformations
        zoom = 1, minZoom = 0.05, maxZoom = 16.0,
        offsetX = 0, offsetY = 0,
        canvasRotation = 0.0,
        transform = new CPTransform(),
        interpolation = false,
        
        // Grid options
        showGrid = false,
        gridSize = 32,
        
        mouseX = 0, mouseY = 0,
        
        brushPreview = false,
        oldPreviewRect = null,
        
        defaultCursor = "auto", moveCursor = "grab", movingCursor = "grabbing", crossCursor = "crosshair",
        mouseIn = false, mouseDown = false,
        
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
        rectSelectionMode,
        moveToolMode,

        // this must correspond to the stroke modes defined in CPToolInfo
        drawingModes = [],

        curDrawMode, curSelectedMode, activeMode;

    // Parent class with empty event handlers for those drawing modes that don't need every event
    function CPMode() {
    };
    
    CPMode.prototype.keyDown = function(e) {
        if (e.keyCode == 32 /* Space */) {
            // Stop the page from scrolling in modes that don't care about space
            e.preventDefault();
        }
    }
    
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
                pf = coordToDocument(mouseCoordToCanvas({x: e.pageX, y: e.pageY})),
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
            canvasContext.arc((r.left + r.right) / 2, (r.top + r.bottom) / 2, r.getWidth() / 2, 0, Math.PI * 2);
            canvasContext.stroke();

            r.grow(2, 2);
            oldPreviewRect = oldPreviewRect != null ? r.union(oldPreviewRect) : r;
        }
    };

    function CPFreehandMode() {
        this.dragLeft = false,
        this.smoothMouse = {x:0.0, y:0.0};
    }
    
    CPFreehandMode.prototype.mousePressed = function(e, pressure) {
        if (!this.dragLeft && e.button == BUTTON_PRIMARY) {
            var 
                pf = coordToDocument(mouseCoordToCanvas({x: e.pageX, y: e.pageY}));

            this.dragLeft = true;
            artwork.beginStroke(pf.x, pf.y, pressure);

            this.smoothMouse = pf;
        }
    };

    CPFreehandMode.prototype.mouseDragged = function(e, pressure) {
        var 
            pf = coordToDocument(mouseCoordToCanvas({x: e.pageX, y: e.pageY})),
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
                dragLineFrom = dragLineTo = mouseCoordToCanvas({x: e.pageX, y: e.pageY});
            }
        };

        this.mouseDragged = function(e) {
            var
                p = mouseCoordToCanvas({x: e.pageX, y: e.pageY}),

                // The old line position that we'll invalidate for redraw
                r = new CPRect(
                    Math.min(dragLineFrom.x, dragLineTo.x) - LINE_PREVIEW_WIDTH, 
                    Math.min(dragLineFrom.y, dragLineTo.y) - LINE_PREVIEW_WIDTH,
                    Math.max(dragLineFrom.x, dragLineTo.x) + LINE_PREVIEW_WIDTH + 1, 
                    Math.max(dragLineFrom.y, dragLineTo.y) + LINE_PREVIEW_WIDTH + 1
                );
                
            // The new line position
            r.union(new CPRect(
                Math.min(dragLineFrom.x, p.x) - LINE_PREVIEW_WIDTH, 
                Math.min(dragLineFrom.y, p.y) - LINE_PREVIEW_WIDTH, 
                Math.max(dragLineFrom.x, p.x) + LINE_PREVIEW_WIDTH + 1, 
                Math.max(dragLineFrom.y, p.y) + LINE_PREVIEW_WIDTH + 1
            ));
            
            dragLineTo = p;
            
            repaintRect(r);
        };

        this.mouseReleased = function(e) {
            if (dragLine && e.button == BUTTON_PRIMARY) {
                var 
                    pf = coordToDocument(mouseCoordToCanvas({x: e.pageX, y: e.pageY})),
                    from = coordToDocument(dragLineFrom);

                dragLine = false;

                artwork.beginStroke(from.x, from.y, 1);
                artwork.continueStroke(pf.x, pf.y, 1);
                artwork.endStroke();

                var
                    r = new CPRect(
                        Math.min(dragLineFrom.x, dragLineTo.x) - LINE_PREVIEW_WIDTH, 
                        Math.min(dragLineFrom.y, dragLineTo.y) - LINE_PREVIEW_WIDTH, 
                        Math.max(dragLineFrom.x, dragLineTo.x) + LINE_PREVIEW_WIDTH + 1, 
                        Math.max(dragLineFrom.y, dragLineTo.y) + LINE_PREVIEW_WIDTH + 1
                    );
                
                repaintRect(r);

                activeMode = defaultMode; // yield control to the default mode
            }
        };

        this.paint = function() {
            if (dragLine) {
                canvasContext.strokeWidth = LINE_PREVIEW_WIDTH;
                canvasContext.beginPath();
                canvasContext.moveTo(dragLineFrom.x, dragLineFrom.y);
                canvasContext.lineTo(dragLineTo.x, dragLineTo.y);
                canvasContext.stroke();
            }
        };
    }

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
        }
    }

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
                curRect.right = square ? firstClick.x + squareDist : p.x;
            } else {
                curRect.left = square ? firstClick.x - squareDist : p.x;
                curRect.right = firstClick.x;
            }

            if (p.y >= firstClick.y) {
                curRect.top = firstClick.y;
                curRect.bottom = square ? firstClick.y + squareDist : p.y;
            } else {
                curRect.top = square ? firstClick.y - squareDist : p.y;
                curRect.bottom = firstClick.y;
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
                canvas.lineWidth = 1;
                plotPolygon(canvasContext, rectToDisplay(curRect), 0.5);
            }
        };
    };

    function CPMoveToolMode() {
        var 
            firstClick;

        this.mousePressed = function (e) {
            var
                p = coordToDocument(mouseCoordToCanvas({x: e.pageX, y: e.pageY}));
            
            firstClick = p;

            artwork.beginPreviewMode(e.altKey);

            // FIXME: The following hack avoids a slight display glitch
            // if the whole move tool mess is fixed it probably won't be necessary anymore
            artwork.move(0, 0);
        }

        this.mouseDragged = function (e) {
            var
                p = coordToDocument(mouseCoordToCanvas({x: e.pageX, y: e.pageY}));
            
            artwork.move(p.x - firstClick.x, p.y - firstClick.y);
            
            that.repaintAll();
        };

        this.mouseReleased = function (e) {
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
                resetRotation();
            }

            activeMode = defaultMode; // yield control to the default mode
        };
    }
    
    CPRotateCanvasMode.prototype = Object.create(CPMode.prototype);
    CPRotateCanvasMode.prototype.constructor = CPRotateCanvasMode;
    
    function requestFocusInWindow() {
        // TODO
    }
    
    function setCursor(cursor) {
        if (canvas.getAttribute("data-cursor") != cursor) {
            canvas.setAttribute("data-cursor", cursor);
        }
    }
    
    function updateScrollBars() {
        //TODO
    }

    function updateTransform() {
        transform.setToIdentity();
        transform.translate(offsetX, offsetY);
        transform.scale(zoom, zoom);
        transform.rotate(canvasRotation);

        updateScrollBars();
        that.repaintAll();
    }
    
    function rectToDisplay(rect) {
        var
            points = [];

        points.push(coordToDisplay({x: rect.left, y: rect.top}));
        points.push(coordToDisplay({x: rect.right - 1, y: rect.top}));
        points.push(coordToDisplay({x: rect.right - 1, y: rect.bottom - 1}));
        points.push(coordToDisplay({x: rect.left, y: rect.bottom - 1}));
        
        return points;
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
        
        result.x = Math.round(result.x);
        result.y = Math.round(result.y);
        
        return result;
    }
    
    /**
     * Convert a {x: pageX, y: pageY} co-ordinate pair from a mouse event to canvas-relative coordinates.
     */
    function mouseCoordToCanvas(coord) {
        var
            canvasOffset =  $(canvas).offset();

        return {x: coord.x - canvasOffset.left, y: coord.y - canvasOffset.top};
    }
    
    function coordToDisplay(p) {
        return transform.transformPoint(p.x, p.y);
    }

    function coordToDisplayInt(p) {
        var
            result = coordToDisplay(p);
        
        result.x = result.x | 0;
        result.y = result.y | 0;
        
        return result;
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

            r2 = new CPRect(0, 0, 0, 0);

        r2.left = Math.min(Math.min(p1.x, p2.x), Math.min(p3.x, p4.x));
        r2.top = Math.min(Math.min(p1.y, p2.y), Math.min(p3.y, p4.y));
        r2.right = Math.max(Math.max(p1.x, p2.x), Math.max(p3.x, p4.x)) + 1;
        r2.bottom = Math.max(Math.max(p1.y, p2.y), Math.max(p3.y, p4.y)) + 1;

        r2.grow(2, 2); // to be sure to include everything

        return r2;
    }
    
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
            Math.round(mouseX - brushSize / 2),
            Math.round(mouseY - brushSize / 2),
            Math.round(mouseX + brushSize / 2),
            Math.round(mouseY + brushSize / 2)
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
        offsetX = x;
        offsetY = y;
        updateTransform();
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
    
    function zoomOnPoint(zoom, centerX, centerY) {
        zoom = Math.max(minZoom, Math.min(maxZoom, zoom));
        
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
        rotTrans.concatenate(transform);

        this.setOffset(~~rotTrans.getTranslateX(), ~~rotTrans.getTranslateY());
        this.setRotation(0);
    };
    
    function createCheckerboardPattern() {
        var
            checkerboardCanvas = document.createElement("canvas"),
        
            checkerboardContext = checkerboardCanvas.getContext("2d"),
            imageData = checkerboardContext.createImageData(64, 64),
            data = imageData.data,
            pixelOffset = 0;
        
        for (var j = 0; j < 64; j++) {
            for (var i = 0; i < 64; i++) {
                if ((i & 0x8) != 0 ^ (j & 0x8) != 0) {
                    // White
                    data[pixelOffset++] = 0xff;
                    data[pixelOffset++] = 0xff;
                    data[pixelOffset++] = 0xff;
                    data[pixelOffset++] = 0xff;
                } else {
                    // Grey
                    data[pixelOffset++] = 0xcc;
                    data[pixelOffset++] = 0xcc;
                    data[pixelOffset++] = 0xcc;
                    data[pixelOffset++] = 0xff;
                }
            }
        }
        
        checkerboardCanvas.width = 64;
        checkerboardCanvas.height = 64;
        checkerboardContext.putImageData(imageData, 0, 0);
        
        return canvasContext.createPattern(checkerboardCanvas, 'repeat');
    }
    
    /**
     * Add the pointer pressure field to the given pointer event.
     */
    function getPointerPressure(e) {
        var
            tablet = CPWacomTablet.getRef();
        
        // Use Wacom pressure in preference to pointer event pressure (if present)
        if (tablet.isTabletPresent()) {
            return tablet.getPressure();
        } else {
            /* Mice have a default pressure of 0.5, but we want 1.0. Since we can't distinguish between
             * mice and pens at this point, we don't have any better options:
             */
            return e.pressure * 2;
        }
    }
    
    function handlePointerMove(e) {
        var
            offset = $(canvas).offset();
        
        mouseX = e.pageX - offset.left;
        mouseY = e.pageY - offset.top;
        
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
        activeMode.mouseReleased(e);
    }
    
    function handlePointerDown(e) {
        canvas.setPointerCapture(e.pointerId);
        
        if (!mouseDown) {
            mouseDown = true;
            
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
    
    // Get the DOM element for the drawing area
    this.getElement = function() {
        return canvas;
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
                canvasContext.rect(repaintRegion.left, repaintRegion.top, repaintRegion.getWidth(), repaintRegion.getHeight());
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
            
            // Ensure the selection line fills a complete pixel by offsetting the midpoint to the middle of the pixel
            plotPolygon(canvasContext, rectToDisplay(artwork.getSelection()), 0.5);
            
            canvasContext.setLineDash([]);
        }
        
        // Draw grid
        if (showGrid) {
            var
                bounds = artwork.getBounds();
            
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
                    p2 = coordToDisplay({x: bounds.right - 1, y: i});
                    
                canvasContext.moveTo(p1.x + 0.5, p1.y + 0.5);
                canvasContext.lineTo(p2.x + 0.5, p2.y + 0.5);
            }

            canvasContext.stroke();
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
    
    this.resize = function() {
        canvas.width = $(canvas).width();
        canvas.height = $(canvas).height();
        
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
    
    if (!canvasContext.setLineDash) { 
        canvasContext.setLineDash = function () {} // For IE 10 and older
    }
    
    canvas.addEventListener("contextmenu", function(e) {
        e.preventDefault();
    })
    
    canvas.addEventListener("mouseenter", function() {
        mouseIn = true;
    });
    
    canvas.addEventListener("mouseleave", function() {
        mouseIn = false;
        that.repaintAll();
    });
    
    canvas.addEventListener("pointerdown", handlePointerDown);
    canvas.addEventListener("pointermove", handlePointerMove);
    canvas.addEventListener("pointerup", handlePointerUp);
    
    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);


    // Workaround Chrome Mac bug that causes canvas to be disposed and never recreated when switched into the background
    document.addEventListener("visibilitychange", function() {
        canvas.width = 1;
        canvas.height = 1;
        that.resize();
    }, false);
    
    window.addEventListener("resize", function() {
        that.resize();
    });
    
    artwork.on("updateRegion", function(region) {
        artworkUpdateRegion.union(region);
        
        repaintRect(getRefreshArea(artworkUpdateRegion));
    });
    
    this.setInterpolation(false);

    controller.setCanvas(this);
}