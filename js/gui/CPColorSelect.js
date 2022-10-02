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
import {setContrastingDrawStyle} from "./CPGUIUtils.js";

const
    CONTROL_WIDTH = 128,
    CONTROL_HEIGHT = 128,

    PIXEL_SCALE = (window.devicePixelRatio || 1),

    CANVAS_WIDTH = Math.round(CONTROL_WIDTH * PIXEL_SCALE),
    CANVAS_HEIGHT = Math.round(CONTROL_HEIGHT * PIXEL_SCALE);

/**
 *
 * @param controller
 * @param {CPColor} initialColor
 * @constructor
 */
export default class CPColorSelect {

    _controller;

    _canvas;
    _canvasContext;
    _imageData;

    _bitmapInvalid = true;
    _capturedMouse = false;
    _greyscale = false;

    color = new CPColor(0);

    constructor(controller, initialColor) {
        this._controller = controller;

        let
            canvas =  document.createElement("canvas");

        this._canvas = canvas;

        canvas.className = 'chickenpaint-colorpicker-select';
        canvas.setAttribute("touch-action", "none");

        canvas.width = CANVAS_WIDTH;
        canvas.height = CANVAS_HEIGHT;

        canvas.style.width = CONTROL_WIDTH + "px";
        canvas.style.height = CONTROL_HEIGHT + "px";

        this._canvasContext = canvas.getContext("2d");
        this._imageData = this._canvasContext.createImageData(CANVAS_WIDTH, CANVAS_HEIGHT);

        // Workaround for Chrome bug https://bugs.chromium.org/p/chromium/issues/detail?id=1350157:
        this._canvasContext.getImageData(0, 0, 1, 1);

        this._handleEndDrag = this._endDrag.bind(this);
        this._handleMousePickColor = this._mousePickColor.bind(this);

        canvas.addEventListener("pointerdown", e => this._startDrag(e));

        if (initialColor) {
            this.color.copyFrom(initialColor);
        }

        controller.on("colorChange", c => {
            this.color.copyFrom(c);

            this._bitmapInvalid = true;
            this.paint();
        });

        controller.on("colorModeChange", newMode => {
            this._greyscale = (newMode == "greyscale");

            this._bitmapInvalid = true;
            this.paint();
        });

        this.paint();
    }

    _makeBitmap() {
        if (!this._bitmapInvalid) {
            return;
        }

        let
            pixIndex = 0,
            data = this._imageData.data;

        if (this._greyscale) {
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
                col = this.color.clone();

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

        this._bitmapInvalid = false;
    }

    paint() {
        this._makeBitmap();

        this._canvasContext.putImageData(this._imageData, 0, 0);

        let
            cursorX = this.color.getSaturation() / 255 * (CANVAS_WIDTH - 1),
            cursorY = (255 - this.color.getValue()) / 255 * (CANVAS_HEIGHT - 1);

        setContrastingDrawStyle(this._canvasContext, "stroke");

        this._canvasContext.lineWidth = 1.5 * PIXEL_SCALE;

        this._canvasContext.beginPath();

        if (this._greyscale) {
            this._canvasContext.moveTo(0, cursorY);
            this._canvasContext.lineTo(CANVAS_WIDTH, cursorY);
        } else {
            this._canvasContext.arc(cursorX, cursorY, 5 * PIXEL_SCALE, 0, Math.PI * 2);
        }

        this._canvasContext.stroke();

        this._canvasContext.globalCompositeOperation = 'source-over';
    }

    _mousePickColor(e) {
        let
            x = e.pageX - $(this._canvas).offset().left,
            y = e.pageY - $(this._canvas).offset().top,

            value = Math.max(Math.min(255 - ~~(y * 255 / (CONTROL_HEIGHT - 1)), 255), 0);

        if (this._greyscale) {
            this.color.setGreyscale(value);
        } else {
            let
                sat = Math.max(Math.min(~~(x * 255 / (CONTROL_WIDTH - 1)), 255), 0);

            this.color.setHsv(this.color.getHue(), sat, value);
        }

        this.paint();
        this._controller.setCurColor(this.color);
    }

    _endDrag(e) {
        this._canvas.releasePointerCapture(e.pointerId);
        this._capturedMouse = false;
        this._canvas.removeEventListener("pointerup", this._handleEndDrag);
        this._canvas.removeEventListener("pointermove", this._handleMousePickColor);
    }

    _startDrag(e) {
        if (!this._capturedMouse) {
            this._capturedMouse = true;
            this._canvas.setPointerCapture(e.pointerId);
            this._canvas.addEventListener("pointerup", this._handleEndDrag);
            this._canvas.addEventListener("pointermove", this._handleMousePickColor);
        }

        this._handleMousePickColor(e);
    }

    setHue(hue) {
        if (this.color.getHue() != hue) {
            this.color.setHue(hue);
            this._controller.setCurColor(this.color);
        }
    }

    getElement() {
        return this._canvas;
    }
}