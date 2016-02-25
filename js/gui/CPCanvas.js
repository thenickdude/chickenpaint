function CPCanvas(controller) {
    "use strict";
    
    var
        BUTTON_PRIMARY = 0,
        BUTTON_SECONDARY = 1,
        BUTTON_WHEEL = 2,
        
        that = this,
    
        container = document.createElement("div"),
        canvas = document.createElement("canvas"),
        
        canvasContext = canvas.getContext("2d"),
        
        artwork = controller.getArtwork(),

        spacePressed = false,
        
        // canvas transformations
        zoom = 1, minZoom = 0.05, maxZoom = 16.0,
        offsetX = 0, offsetY = 0,
        canvasRotation = 0.0,
//        AffineTransform transform = new AffineTransform();
        interpolation = false,
        
        mouseX = 0, mouseY = 0,
        
        brushPreview = false,
        oldPreviewRect = null,
        
        defaultCursor = "auto", moveCursor = "grabbing", crossCursor = "crosshair",
        mouseIn = false, mouseDown = false,
        
        dontStealFocus = false,
        
        // We'll need to refresh the whole thing at least once
        updateRegion = new CPRect(0, 0, artwork.width, artwork.height),
        
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

    //
    // Default UI Mode when not doing anything: used to start the other modes
    //

    function CPDefaultMode() {
    }
    
    CPDefaultMode.prototype.mousePressed = function(e) {
        // FIXME: replace the moveToolMode hack by a new and improved system
        if (!spacePressed && e.button == BUTTON_PRIMARY
                && (!e.altKey || curSelectedMode == moveToolMode)) {

            if (!artwork.getActiveLayer().visible && curSelectedMode != rotateCanvasMode
                    && curSelectedMode != rectSelectionMode) {
                return; // don't draw on a hidden layer
            }
            repaintBrushPreview();

            activeMode = curSelectedMode;
            activeMode.mousePressed(e);
        } else if (!spacePressed
                && (e.button == BUTTON_SECONDARY || e.button == BUTTON_PRIMARY && e.altKey)) {
            repaintBrushPreview();

            activeMode = colorPickerMode;
            activeMode.mousePressed(e);
        } else if ((e.button == BUTTON_WHEEL || spacePressed) && !e.altKey) {
            repaintBrushPreview();

            activeMode = moveCanvasMode;
            activeMode.mousePressed(e);
        } else if ((e.button == BUTTON_WHEEL || spacePressed) && e.altKey) {
            repaintBrushPreview();

            activeMode = rotateCanvasMode;
            activeMode.mousePressed(e);
        }
    };

    CPDefaultMode.prototype.mouseMoved = function(e) {
        if (!spacePressed) {
            brushPreview = true;

            var 
                r = getBrushPreviewOval();
            
            r.grow(2, 2);
            
            if (oldPreviewRect != null) {
                r.union(oldPreviewRect);
                oldPreviewRect = null;
            }

            var 
                pf = coordToDocument({x: e.pageX, y: e.pageY});
            
            if (artwork.isPointWithin(pf.x, pf.y)) {
                setCursor(defaultCursor); // FIXME find a cursor that everyone likes
            } else {
                setCursor(defaultCursor);
            }

            repaintRegion(r.left, r.top, r.getWidth(), r.getHeight());
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
    
    CPFreehandMode.prototype.mousePressed = function(e) {
        if (!this.dragLeft && e.button == BUTTON_PRIMARY) {
            var 
                pf = coordToDocument({x: e.pageX, y: e.pageY});

            this.dragLeft = true;
            artwork.beginStroke(pf.x, pf.y, CPTablet.getRef().getPressure());

            this.smoothMouse = pf;
        }
    };

    CPFreehandMode.prototype.mouseDragged = function(e) {
        var 
            pf = coordToDocument({x: e.pageX, y: e.pageY}),
            smoothing = Math.min(0.999, Math.pow(controller.getBrushInfo().smoothing, 0.3));

        this.smoothMouse.x = (1.0 - smoothing) * pf.x + smoothing * this.smoothMouse.x;
        this.smoothMouse.y = (1.0 - smoothing) * pf.y + smoothing * this.smoothMouse.y;

        if (this.dragLeft) {
            artwork.continueStroke(this.smoothMouse.x, this.smoothMouse.y, CPTablet.getRef().getPressure());
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
    

    function CPLineMode() {}
    function CPBezierMode() {}
    function CPColorPickerMode() {}
    function CPRectSelectionMode() {}
    function CPMoveCanvasMode() {}
    function CPFloodFillMode() {}
    function CPRectSelectionMode() {}
    function CPMoveToolMode() {}
    function CPRotateCanvasMode() {}
    
    /*
    function CPLineMode() {
        var
            dragLine = false,
            dragLineFrom, dragLineTo;

        public void mousePressed(MouseEvent e) {
            if (!dragLine && e.button == BUTTON_PRIMARY) {
                Point p = e.getPoint();

                dragLine = true;
                dragLineFrom = dragLineTo = (Point) p.clone();
            }
        }

        public void mouseDragged(MouseEvent e) {
            Point p = e.getPoint();

            Rectangle r = new Rectangle(Math.min(dragLineFrom.x, dragLineTo.x), Math.min(dragLineFrom.y, dragLineTo.y),
                    Math.abs(dragLineFrom.x - dragLineTo.x) + 1, Math.abs(dragLineFrom.y - dragLineTo.y) + 1);
            r.union(new Rectangle(Math.min(dragLineFrom.x, p.x), Math.min(dragLineFrom.y, p.y), Math
                    .abs(dragLineFrom.x - p.x) + 1, Math.abs(dragLineFrom.y - p.y) + 1));
            dragLineTo = (Point) p.clone();
            repaintRegion(r.x, r.y, r.width, r.height);
        }

        public void mouseReleased(MouseEvent e) {
            if (dragLine && e.button == BUTTON_PRIMARY) {
                Point p = e.getPoint();
                Point2D.Float pf = coordToDocument(p);

                dragLine = false;

                Point2D.Float from = coordToDocument(dragLineFrom);
                artwork.beginStroke(from.x, from.y, 1);
                artwork.continueStroke(pf.x, pf.y, 1);
                artwork.endStroke();

                Rectangle r = new Rectangle(Math.min(dragLineFrom.x, dragLineTo.x), Math.min(dragLineFrom.y,
                        dragLineTo.y), Math.abs(dragLineFrom.x - dragLineTo.x) + 1, Math.abs(dragLineFrom.y
                        - dragLineTo.y) + 1);
                repaintRegion(r.x, r.y, r.width, r.height);

                activeMode = defaultMode; // yield control to the default mode
            }
        }

        public void paint(Graphics2D g2d) {
            if (dragLine) {
                g2d.drawLine(dragLineFrom.x, dragLineFrom.y, dragLineTo.x, dragLineTo.y);
            }
        }
    }

    function CPBezierMode() {

        // bezier drawing
        var 
            BEZIER_POINTS = 500,
            BEZIER_POINTS_PREVIEW = 100,

            dragBezier = false,
            dragBezierMode = 0, // 0 Initial drag, 1 first control point, 2 second point
            dragBezierP0, dragBezierP1, dragBezierP2, dragBezierP3;

        public void mousePressed(MouseEvent e) {
            Point2D.Float p = coordToDocument(e.getPoint());

            if (!dragBezier && !spacePressed && e.button == BUTTON_PRIMARY) {
                dragBezier = true;
                dragBezierMode = 0;
                dragBezierP0 = dragBezierP1 = dragBezierP2 = dragBezierP3 = (Point2D.Float) p.clone();
            }
        }

        public void mouseDragged(MouseEvent e) {
            Point2D.Float p = coordToDocument(e.getPoint());

            if (dragBezier && dragBezierMode == 0) {
                dragBezierP2 = dragBezierP3 = (Point2D.Float) p.clone();
                repaint();
            }
        }

        public void mouseReleased(MouseEvent e) {
            if (dragBezier && e.button == BUTTON_PRIMARY) {
                if (dragBezierMode == 0) {
                    dragBezierMode = 1;
                } else if (dragBezierMode == 1) {
                    dragBezierMode = 2;
                } else if (dragBezierMode == 2) {
                    dragBezier = false;

                    Point2D.Float p0 = dragBezierP0;
                    Point2D.Float p1 = dragBezierP1;
                    Point2D.Float p2 = dragBezierP2;
                    Point2D.Float p3 = dragBezierP3;

                    CPBezier bezier = new CPBezier();
                    bezier.x0 = p0.x;
                    bezier.y0 = p0.y;
                    bezier.x1 = p1.x;
                    bezier.y1 = p1.y;
                    bezier.x2 = p2.x;
                    bezier.y2 = p2.y;
                    bezier.x3 = p3.x;
                    bezier.y3 = p3.y;

                    float x[] = new float[BEZIER_POINTS];
                    float y[] = new float[BEZIER_POINTS];

                    bezier.compute(x, y, BEZIER_POINTS);

                    artwork.beginStroke(x[0], y[0], 1);
                    for (int i = 1; i < BEZIER_POINTS; i++) {
                        artwork.continueStroke(x[i], y[i], 1);
                    }
                    artwork.endStroke();
                    repaint();

                    activeMode = defaultMode; // yield control to the default mode
                }
            }
        }

        public void mouseMoved(MouseEvent e) {
            Point2D.Float p = coordToDocument(e.getPoint());

            if (dragBezier && dragBezierMode == 1) {
                dragBezierP1 = (Point2D.Float) p.clone();
                repaint(); // FIXME: repaint only the bezier region
            }

            if (dragBezier && dragBezierMode == 2) {
                dragBezierP2 = (Point2D.Float) p.clone();
                repaint(); // FIXME: repaint only the bezier region
            }
        }

        public void paint(Graphics2D g2d) {
            if (dragBezier) {
                CPBezier bezier = new CPBezier();

                Point2D.Float p0 = coordToDisplay(dragBezierP0);
                Point2D.Float p1 = coordToDisplay(dragBezierP1);
                Point2D.Float p2 = coordToDisplay(dragBezierP2);
                Point2D.Float p3 = coordToDisplay(dragBezierP3);

                bezier.x0 = p0.x;
                bezier.y0 = p0.y;
                bezier.x1 = p1.x;
                bezier.y1 = p1.y;
                bezier.x2 = p2.x;
                bezier.y2 = p2.y;
                bezier.x3 = p3.x;
                bezier.y3 = p3.y;

                int x[] = new int[BEZIER_POINTS_PREVIEW];
                int y[] = new int[BEZIER_POINTS_PREVIEW];
                bezier.compute(x, y, BEZIER_POINTS_PREVIEW);

                g2d.drawPolyline(x, y, BEZIER_POINTS_PREVIEW);
                g2d.drawLine((int) p0.x, (int) p0.y, (int) p1.x, (int) p1.y);
                g2d.drawLine((int) p2.x, (int) p2.y, (int) p3.x, (int) p3.y);
            }
        }
    }

    function CPColorPickerMode() {

        var mouseButton;

        public void mousePressed(MouseEvent e) {
            Point p = e.getPoint();
            Point2D.Float pf = coordToDocument(p);

            mouseButton = e.button;

            if (artwork.isPointWithin(pf.x, pf.y)) {
                controller.setCurColorRgb(artwork.colorPicker(pf.x, pf.y));
            }

            setCursor(crossCursor);
        }

        public void mouseDragged(MouseEvent e) {
            Point p = e.getPoint();
            Point2D.Float pf = coordToDocument(p);

            if (artwork.isPointWithin(pf.x, pf.y)) {
                controller.setCurColorRgb(artwork.colorPicker(pf.x, pf.y));
            }
        }

        public void mouseReleased(MouseEvent e) {
            if (e.button == mouseButton) {
                setCursor(defaultCursor);
                activeMode = defaultMode; // yield control to the default mode
            }
        }
    }

    function CPMoveCanvasMode() {
        var
            dragMiddle = false,
            dragMoveX, dragMoveY,
            dragMoveOffset,
            dragMoveButton;

        public void mousePressed(MouseEvent e) {
            Point p = e.getPoint();

            if (!dragMiddle && (e.button == BUTTON_WHEEL || spacePressed)) {
                repaintBrushPreview();

                dragMiddle = true;
                dragMoveButton = e.button;
                dragMoveX = p.x;
                dragMoveY = p.y;
                dragMoveOffset = getOffset();
                setCursor(moveCursor);
            }
        }

        public void mouseDragged(MouseEvent e) {
            if (dragMiddle) {
                Point p = e.getPoint();

                setOffset(dragMoveOffset.x + p.x - dragMoveX, offsetY = dragMoveOffset.y + p.y - dragMoveY);
                repaint();
            }
        }

        public void mouseReleased(MouseEvent e) {
            if (dragMiddle && e.button == dragMoveButton) {
                dragMiddle = false;
                setCursor(defaultCursor);

                activeMode = defaultMode; // yield control to the default mode
            }
        }
    }

    function CPFloodFillMode() {
        public void mousePressed(MouseEvent e) {
            Point p = e.getPoint();
            Point2D.Float pf = coordToDocument(p);

            if (artwork.isPointWithin(pf.x, pf.y)) {
                artwork.floodFill(pf.x, pf.y);
                repaint();
            }

            activeMode = defaultMode; // yield control to the default mode
        }
    }

    function CPRectSelectionMode() {

        var
            firstClick,
            curRect = new CPRect();

        public void mousePressed(MouseEvent e) {
            Point p = coordToDocumentInt(e.getPoint());

            curRect.makeEmpty();
            firstClick = p;

            repaint();
        }

        public void mouseDragged(MouseEvent e) {
            Point p = coordToDocumentInt(e.getPoint());
            boolean square = e.isShiftDown();
            int squareDist = Math.max(Math.abs(p.x - firstClick.x), Math.abs(p.y - firstClick.y));

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

            repaint();
        }

        public void mouseReleased(MouseEvent e) {
            artwork.rectangleSelection(curRect);

            activeMode = defaultMode; // yield control to the default mode
            repaint();
        }

        public void paint(Graphics2D g2d) {
            if (!curRect.isEmpty()) {
                g2d.draw(coordToDisplay(curRect));
            }
        }
    }

    function CPMoveToolMode() {

        var firstClick;

        public void mousePressed(MouseEvent e) {
            Point p = coordToDocumentInt(e.getPoint());
            firstClick = p;

            artwork.beginPreviewMode(e.isAltDown());

            // FIXME: The following hack avoids a slight display glitch
            // if the whole move tool mess is fixed it probably won't be necessary anymore
            artwork.move(0, 0);
        }

        public void mouseDragged(MouseEvent e) {
            Point p = coordToDocumentInt(e.getPoint());
            artwork.move(p.x - firstClick.x, p.y - firstClick.y);
            repaint();
        }

        public void mouseReleased(MouseEvent e) {
            artwork.endPreviewMode();
            activeMode = defaultMode; // yield control to the default mode
            repaint();
        }
    }

    function CPRotateCanvasMode() {

        var 
            firstClick,
            initAngle = 0.0,
            initTransform,
            dragged = false;

        public void mousePressed(MouseEvent e) {
            Point p = e.getPoint();
            firstClick = (Point) p.clone();

            initAngle = getRotation();
            initTransform = new AffineTransform(transform);

            dragged = false;

            repaintBrushPreview();
        }

        public void mouseDragged(MouseEvent e) {
            dragged = true;

            Point p = e.getPoint();
            Dimension d = getSize();
            Point2D.Float center = new Point2D.Float(d.width / 2.f, d.height / 2.f);

            float deltaAngle = (float) Math.atan2(p.y - center.y, p.x - center.x)
                    - (float) Math.atan2(firstClick.y - center.y, firstClick.x - center.x);

            AffineTransform rotTrans = new AffineTransform();
            rotTrans.rotate(deltaAngle, center.x, center.y);

            rotTrans.concatenate(initTransform);

            setRotation(initAngle + deltaAngle);
            setOffset((int) rotTrans.getTranslateX(), (int) rotTrans.getTranslateY());
            repaint();
        }

        /**
         * When the mouse is released after rotation, we might want to snap our angle to the nearest 90 degree mark.
         *//*
        private void finishRotation() {
            double ROTATE_SNAP_DEGREES = 5;
            
            double nearest90 = Math.round(canvasRotation / (Math.PI / 2)) * Math.PI / 2;
            
            if (Math.abs(canvasRotation - nearest90) < ROTATE_SNAP_DEGREES / 180 * Math.PI) {
                float deltaAngle = (float) (nearest90 - initAngle);
                
                Dimension d = getSize();
                
                Point2D.Float center = new Point2D.Float(d.width / 2.f, d.height / 2.f);

                AffineTransform rotTrans = new AffineTransform();
                rotTrans.rotate(deltaAngle, center.x, center.y);

                rotTrans.concatenate(initTransform);

                setRotation(initAngle + deltaAngle);
                setOffset((int) rotTrans.getTranslateX(), (int) rotTrans.getTranslateY());
                
                repaint();
            }
        }
        
        public void mouseReleased(MouseEvent e) {
            if (dragged) {
                finishRotation();
            } else {
                resetRotation();
            }

            activeMode = defaultMode; // yield control to the default mode
        }
    }*/
    
    // Grid options
    // FIXME: these shouldn't be public
    this.gridSize = 32;
    this.showGrid = false;
    
    function requestFocusInWindow() {
        // TODO
    }
    
    function setCursor(cursor) {
        canvas.style.cursor = cursor;
    }
    
    function repaintRegion(x, y, width, height) {
        that.paint(); //TODO
    };
    
    // Get the DOM element for the drawing area
    this.getElement = function() {
        return container;
    };
    
    this.paint = function() {
        canvasContext.clearRect(0, 0, canvas.width, canvas.height);
        
        var
            imageData = artwork.fusionLayers();
        
        if (!updateRegion.isEmpty()) {
            updateRegion.makeEmpty();
        }
        
        canvasContext.putImageData(
            imageData, 0, 0, 0, 0, canvas.width, canvas.height
        );
        
        canvasContext.globalCompositeOperation = 'exclusion';
        canvasContext.strokeStyle = 'white';
        canvasContext.lineWidth = 1.5;
        
        activeMode.paint(canvasContext);
        
        canvasContext.globalCompositeOperation = 'source-over';
    };
    
    function coordToDisplay(p) {
        return p;
    }

    function coordToDisplayInt(p) {
        return {x: ~~p.x, y: ~~p.y};
    }
    
    function getRefreshArea(r) {
        var
            p1 = coordToDisplayInt({x: r.left - 1, y: r.top - 1}),
            p2 = coordToDisplayInt({x: r.left - 1, y: r.bottom}),
            p3 = coordToDisplayInt({x: r.right, y: r.top - 1}),
            p4 = coordToDisplayInt({x: r.right, y: r.bottom}),

            r2 = new CPRect();

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
            repaintRegion(r.x, r.y, r.width, r.height);
        }
    }

    function getBrushPreviewOval() {
        var brushSize = ~~(controller.getBrushSize() * zoom);
        
        return new CPRect(
            mouseX - brushSize / 2, 
            mouseY - brushSize / 2, 
            mouseX + brushSize / 2, 
            mouseY + brushSize / 2
        );
    }
    
    /**
     * Convert an {x: pageX, y: pageY} pair from a mouse event into document coordinates.
     */
    function coordToDocument(coord) {
        var
            canvasOffset =  $(canvas).offset();
    
        return {x: coord.x - canvasOffset.left, y: coord.y - canvasOffset.top};
    }
    
    controller.on("toolChange", function(tool, toolInfo) {
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
                rect = rect.union(oldPreviewRect);
                oldPreviewRect = null;
            }

            repaintRegion(r.left, r.top, r.getWidth(), r.getHeight());
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
    
    canvas.width = artwork.width;
    canvas.height = artwork.height;
    canvas.className = "chickenpaint-canvas";
    
    container.appendChild(canvas);
    container.className = "chickenpaint-canvas-container";
    
    controller.setCanvas(this);
    
    container.addEventListener("mouseenter", function() {
        mouseIn = true;
    });
    
    container.addEventListener("mouseleave", function() {
        mouseIn = false;
        that.paint();
    });
    
    function handleMouseUp(e) {
        mouseDown = false;
        activeMode.mouseReleased(e);
        
        document.body.removeEventListener("mouseup", handleMouseUp);
    }
    
    container.addEventListener("mousedown", function(e) {
        if (!mouseDown) {
            mouseDown = true;
            
            requestFocusInWindow();
            activeMode.mousePressed(e);
            
            document.body.addEventListener("mouseup", handleMouseUp);
        }
    });
    

    container.addEventListener("mousemove", function(e) {
        var
            canvasOffset =  $(canvas).offset();
        
        mouseX = e.pageX - canvasOffset.left;
        mouseY = e.pageY - canvasOffset.top;
        
        if (!dontStealFocus) {
            requestFocusInWindow();
        }

        if (mouseDown) {
            activeMode.mouseDragged(e);
        } else {
            activeMode.mouseMoved(e);
        }
        
        CPTablet.getRef().mouseDetect();
    });
    
    artwork.on("updateRegion", function(region) {
        updateRegion.union(region);
        
        var r = getRefreshArea(region);
        
        repaintRegion(r.left, r.top, r.getWidth(), r.getHeight());
    });
}