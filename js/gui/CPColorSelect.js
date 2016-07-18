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

import CPColor from "../util/CPColor";
import CPColorBmp from "../engine/CPColorBmp";
import {setContrastingDrawStyle} from "./CPGUIUtils";

/**
 *
 * @param controller
 * @param {CPColor} initialColor
 * @constructor
 */
export default function CPColorSelect(controller, initialColor) {
    const
        CONTROL_WIDTH = 128,
        CONTROL_HEIGHT = 128,

        PIXEL_SCALE = (window.devicePixelRatio || 1),

        CANVAS_WIDTH = Math.round(CONTROL_WIDTH * PIXEL_SCALE),
        CANVAS_HEIGHT = Math.round(CONTROL_HEIGHT * PIXEL_SCALE);

    const
        canvas = document.createElement("canvas"),
        canvasContext = canvas.getContext("2d"),

        imageData = canvasContext.createImageData(CANVAS_WIDTH, CANVAS_HEIGHT),
        data = imageData.data,
        color = new CPColor(0);

    var
        bitmapInvalid = true,
        capturedMouse = false,
        greyscale = false;

    function makeBitmap() {
        let
            pixIndex = 0;

        if (greyscale) {
            for (let y = 0; y < CANVAS_HEIGHT; y++) {
                let
                    col = 255 - Math.round(y / (CANVAS_HEIGHT - 1) * 255);

                for (let x = 0; x < CANVAS_WIDTH; x++) {
                    data[pixIndex + CPColorBmp.RED_BYTE_OFFSET] = col;
                    data[pixIndex + CPColorBmp.GREEN_BYTE_OFFSET] = col;
                    data[pixIndex + CPColorBmp.BLUE_BYTE_OFFSET] = col;
                    data[pixIndex + CPColorBmp.ALPHA_BYTE_OFFSET] = 0xFF;

                    pixIndex += CPColorBmp.BYTES_PER_PIXEL;
                }
            }
        } else {
            let
                col = color.clone();

            for (let y = 0; y < CANVAS_HEIGHT; y++) {
                col.setValue(255 - ~~(y / (CANVAS_HEIGHT - 1) * 255));

                for (let x = 0; x < CANVAS_WIDTH; x++) {
                    col.setSaturation(Math.round(x / (CANVAS_WIDTH - 1) * 255));

                    data[pixIndex + CPColorBmp.RED_BYTE_OFFSET] = (col.rgb >> 16) & 0xFF;
                    data[pixIndex + CPColorBmp.GREEN_BYTE_OFFSET] = (col.rgb >> 8) & 0xFF;
                    data[pixIndex + CPColorBmp.BLUE_BYTE_OFFSET] = col.rgb & 0xFF;
                    data[pixIndex + CPColorBmp.ALPHA_BYTE_OFFSET] = 0xFF;

                    pixIndex += CPColorBmp.BYTES_PER_PIXEL;
                }
            }
        }

        bitmapInvalid = false;
    }

    function paint() {
        if (bitmapInvalid) {
            makeBitmap();
        }

        canvasContext.putImageData(imageData, 0, 0, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        var
            cursorX = color.getSaturation() / 255 * (CANVAS_WIDTH - 1),
            cursorY = (255 - color.getValue()) / 255 * (CANVAS_HEIGHT - 1);

        setContrastingDrawStyle(canvasContext, "stroke");

        canvasContext.lineWidth = 1.5 * PIXEL_SCALE;

        canvasContext.beginPath();

        if (greyscale) {
            canvasContext.moveTo(0, cursorY);
            canvasContext.lineTo(CANVAS_WIDTH, cursorY);
        } else {
            canvasContext.arc(cursorX, cursorY, 5 * PIXEL_SCALE, 0, Math.PI * 2);
        }

        canvasContext.stroke();

        canvasContext.globalCompositeOperation = 'source-over';
    }

    function mousePickColor(e) {
        var
            x = e.pageX - $(canvas).offset().left,
            y = e.pageY - $(canvas).offset().top,

            value = Math.max(Math.min(255 - ~~(y * 255 / (CONTROL_HEIGHT - 1)), 255), 0);

        if (greyscale) {
            color.setGreyscale(value);
        } else {
            var
                sat = Math.max(Math.min(~~(x * 255 / (CONTROL_WIDTH - 1)), 255), 0);

            color.setHsv(color.getHue(), sat, value);
        }

        paint();
        controller.setCurColor(color);
    }

    function continueDrag(e) {
        mousePickColor(e);
    }

    function endDrag(e) {
        canvas.releasePointerCapture(e.pointerId);
        capturedMouse = false;
        canvas.removeEventListener("pointerup", endDrag);
        canvas.removeEventListener("pointermove", continueDrag);
    }

    function startDrag(e) {
        if (!capturedMouse) {
            capturedMouse = true;
            canvas.setPointerCapture(e.pointerId);
            canvas.addEventListener("pointerup", endDrag);
            canvas.addEventListener("pointermove", continueDrag);
        }

        mousePickColor(e);
    }

    this.setHue = function(hue) {
        if (color.getHue() != hue) {
            color.setHue(hue);
            controller.setCurColor(color);
        }
    };

    this.getElement = function() {
        return canvas;
    };

    controller.on("colorChange", function(c) {
        color.copyFrom(c);

        bitmapInvalid = true;
        paint();
    });

    controller.on("colorModeChange", function(newMode) {
        greyscale = (newMode == "greyscale");

        bitmapInvalid = true;
        paint();
    });

    canvas.addEventListener("pointerdown", startDrag);

    canvas.className = 'chickenpaint-colorpicker-select';
    canvas.setAttribute("touch-action", "none");

    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;

    canvas.style.width = CONTROL_WIDTH + "px";
    canvas.style.height = CONTROL_HEIGHT + "px";

    if (initialColor) {
        color.copyFrom(initialColor);
    }

    paint();
}