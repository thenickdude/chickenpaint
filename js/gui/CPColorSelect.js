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

export default function CPColorSelect(cpController, initialColor) {
    var
        w = 128, h = 128,

        canvas = document.createElement("canvas"),
        canvasContext = canvas.getContext("2d"),

        imageData = canvasContext.createImageData(w, h),
        data = imageData.data,
        color = new CPColor(),

        needRefresh = true,

        capturedMouse = false;

    function makeBitmap() {
        var
            col = color.clone(),
            pixIndex = 0;

        for (var y = 0; y < h; y++) {
            col.setValue(255 - (y * 255) / h);

            for (var x = 0; x < w; x++) {
                col.setSaturation((x * 255) / w);

                data[pixIndex + CPColorBmp.RED_BYTE_OFFSET] = (col.rgb >> 16) & 0xFF;
                data[pixIndex + CPColorBmp.GREEN_BYTE_OFFSET] = (col.rgb >> 8) & 0xFF
                data[pixIndex + CPColorBmp.BLUE_BYTE_OFFSET] = col.rgb & 0xFF
                data[pixIndex + CPColorBmp.ALPHA_BYTE_OFFSET] = 0xFF;

                pixIndex += CPColorBmp.BYTES_PER_PIXEL;
            }
        }

        needRefresh = false;
    }

    function paint() {
        if (needRefresh) {
            makeBitmap();
        }

        canvasContext.putImageData(imageData, 0, 0, 0, 0, w, h);

        var
            x = color.getSaturation() * w / 255,
            y = (255 - color.getValue()) * h / 255;

        canvasContext.globalCompositeOperation = 'exclusion';
        canvasContext.strokeStyle = 'white';
        canvasContext.lineWidth = 1.5;

        canvasContext.beginPath();
        canvasContext.arc(x, y, 5, 0, Math.PI * 2);
        canvasContext.stroke();

        canvasContext.globalCompositeOperation = 'source-over';
    }

    function mousePickColor(e) {
        var
            x = e.pageX - $(canvas).offset().left,
            y = e.pageY - $(canvas).offset().top,

            sat = x * 255 / w,
            value = 255 - y * 255 / h;

        color.setSaturation(Math.max(0, Math.min(255, sat)));
        color.setValue(Math.max(0, Math.min(255, value)));

        paint();
        cpController.setCurColor(color);
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
            cpController.setCurColor(color);
        }
    };

    this.getElement = function() {
        return canvas;
    };

    cpController.on("colorChange", function(c) {
        color.copyFrom(c);

        needRefresh = true;
        paint();
    });

    canvas.addEventListener("pointerdown", startDrag);

    canvas.className = 'chickenpaint-colorpicker-select';
    canvas.setAttribute("touch-action", "none");

    canvas.width = w;
    canvas.height = h;

    if (initialColor) {
        color.copyFrom(initialColor);
    }

    paint();
}