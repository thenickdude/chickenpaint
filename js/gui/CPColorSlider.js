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
    WIDTH = 24,
    HEIGHT = 128;

/**
 * @param {ImageData} imageData
 */
function makeSliderBitmap(imageData) {
    let
        color = new CPColor(0x00FFFF),
        pixIndex = 0,
        data = imageData.data;

    for (let y = 0; y < imageData.height; y++) {
        color.setHue((y * 359) / imageData.height);

        for (let x = 0; x < imageData.width; x++) {
            data[pixIndex + CPColorBmp.RED_BYTE_OFFSET] = (color.rgb >> 16) & 0xFF;
            data[pixIndex + CPColorBmp.GREEN_BYTE_OFFSET] = (color.rgb >> 8) & 0xFF;
            data[pixIndex + CPColorBmp.BLUE_BYTE_OFFSET] = color.rgb & 0xFF;
            data[pixIndex + CPColorBmp.ALPHA_BYTE_OFFSET] = 0xFF;

            pixIndex += CPColorBmp.BYTES_PER_PIXEL;
        }
    }
}

export default class CPColorSlider {

    hue;
    selecter;

    _canvas;
    _canvasContext;
    _imageData;

    _capturedMouse = false;

    constructor(controller, selecter, initialHue) {
        this.selecter = selecter;
        this.hue = initialHue || 0;

        let
            canvas = document.createElement("canvas");

        this._canvas = canvas;

        controller.on("colorChange", color => {
            this.setHue(color.getHue());
        });

        controller.on("colorModeChange", mode => {
            canvas.style.display = (mode == "greyscale" ? "none" : "block");
        });

        canvas.setAttribute("touch-action", "none");

        canvas.addEventListener("pointerdown", e => this._startDrag(e));

        canvas.width = WIDTH;
        canvas.height = HEIGHT;

        canvas.className = 'chickenpaint-colorpicker-slider';

        this._canvasContext = canvas.getContext("2d");
        this._imageData = this._canvasContext.createImageData(WIDTH, HEIGHT);

        // Workaround for Chrome bug https://bugs.chromium.org/p/chromium/issues/detail?id=1350157:
        this._canvasContext.getImageData(0, 0, 1, 1);

        this._handleEndDrag = this._endDrag.bind(this);
        this._handleMousePickColor = this._mousePickColor.bind(this);

        makeSliderBitmap(this._imageData);

        this.paint();
    }

    paint() {
        this._canvasContext.putImageData(this._imageData, 0, 0);

        let
            y = (this.hue * HEIGHT) / 360;

        setContrastingDrawStyle(this._canvasContext, "stroke");

        this._canvasContext.lineWidth = 1.5;

        this._canvasContext.beginPath();
        this._canvasContext.moveTo(0, y);
        this._canvasContext.lineTo(WIDTH, y);
        this._canvasContext.stroke();

        this._canvasContext.globalCompositeOperation = 'source-over';
    }

    _mousePickColor(e) {
        let
            y = e.pageY - $(this._canvas).offset().top,

            _hue = ~~(y * 360 / HEIGHT);

        this.hue = Math.max(0, Math.min(359, _hue));
        this.paint();

        if (this.selecter) {
            this.selecter.setHue(this.hue);
        }
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

    getElement() {
        return this._canvas;
    }

    setHue(h) {
        this.hue = h;

        this.paint();
    }
}