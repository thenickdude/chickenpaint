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

import $ from "jquery";

import CPColor from "../util/CPColor.js";
import CPColorBmp from "../engine/CPColorBmp.js";

export default function CPColorSlider(controller, selecter, initialHue) {
    const
        WIDTH = 24, HEIGHT = 128;

    var
        that = this,

        canvas = document.createElement("canvas"),
        canvasContext = canvas.getContext("2d"),

        imageData = canvasContext.createImageData(WIDTH, HEIGHT),
        data = imageData.data,

        capturedMouse = false,

        hue = initialHue || 0;

    function makeBitmap() {
        let
            color = new CPColor(0x00FFFF),
            pixIndex = 0;

        for (let y = 0; y < HEIGHT; y++) {
            color.setHue((y * 359) / HEIGHT);

            for (let x = 0; x < WIDTH; x++) {
                data[pixIndex + CPColorBmp.RED_BYTE_OFFSET] = (color.rgb >> 16) & 0xFF;
                data[pixIndex + CPColorBmp.GREEN_BYTE_OFFSET] = (color.rgb >> 8) & 0xFF;
                data[pixIndex + CPColorBmp.BLUE_BYTE_OFFSET] = color.rgb & 0xFF;
                data[pixIndex + CPColorBmp.ALPHA_BYTE_OFFSET] = 0xFF;

                pixIndex += CPColorBmp.BYTES_PER_PIXEL;
            }
        }
    }

    function paint() {
        canvasContext.putImageData(imageData, 0, 0, 0, 0, WIDTH, HEIGHT);

        var
            y = (hue * HEIGHT) / 360;

        canvasContext.globalCompositeOperation = 'exclusion';
        canvasContext.strokeStyle = 'white';
        canvasContext.lineWidth = 1.5;

        canvasContext.beginPath();
        canvasContext.moveTo(0, y);
        canvasContext.lineTo(WIDTH, y);
        canvasContext.stroke();

        canvasContext.globalCompositeOperation = 'source-over';
    }

    function mousePickColor(e) {
        var
            y = e.pageY - $(canvas).offset().top,

            _hue = ~~(y * 360 / HEIGHT);

        hue = Math.max(0, Math.min(359, _hue));
        paint();

        if (selecter != null) {
            selecter.setHue(hue);
        }
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

    this.getElement = function() {
        return canvas;
    };

    this.setHue = function(h) {
        hue = h;
        paint();
    };

    controller.on("colorChange", function(color) {
        that.setHue(color.getHue());
    });

    controller.on("colorModeChange", function(mode) {
        canvas.style.display = (mode == "greyscale" ? "none" : "block");
    });

    canvas.setAttribute("touch-action", "none");

    canvas.addEventListener("pointerdown", startDrag);

    canvas.width = WIDTH;
    canvas.height = HEIGHT;

    canvas.className = 'chickenpaint-colorpicker-slider';

    makeBitmap();
    paint();
}