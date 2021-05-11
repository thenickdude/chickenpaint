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

import CPColor from '../util/CPColor.js';

import CPSlider from './CPSlider.js';
import CPColorSelect from './CPColorSelect.js';
import CPColorSlider from './CPColorSlider.js';

import EventEmitter from "wolfy87-eventemitter";

export default function CPColorSwatch(initialColor, initialAlpha, containerElement) {
    let
        that = this,
        color = new CPColor(0),
        alpha = 255,

        element = document.createElement("div");

    function padLeft(string, padding, len) {
        while (string.length < len) {
            string = padding + string;
        }
        return string;
    }

    function paint() {
        element.style.backgroundColor = '#' + padLeft(Number(color.getRgb()).toString(16), "0", 6);
    }

    this.getElement = function() {
        return element;
    };

    this.setColor = function(_color) {
        if (!color.isEqual(_color)) {
            color.copyFrom(_color);

            paint();

            this.emitEvent("colorChange", [color]);
        }
    };

    this.setAlpha = function(_alpha) {
        if (_alpha != alpha) {
            alpha = _alpha;

            paint();

            this.emitEvent("alphaChange", [alpha]);
        }
    };

    this.getColorRgb = function() {
        return color.getRgb();
    };

    this.getAlpha = function() {
        return alpha;
    };

    this.setCurColor = this.setColor;

    function buildColorEditPanel() {
        const
            panel = document.createElement("div"),
            group = document.createElement("div"),
            select = new CPColorSelect(that, color),
            slider = new CPColorSlider(that, select, color.getHue()),
            alphaSlider = new CPSlider(0, 255);

        panel.className = "chickenpaint-color-pick-panel";

        group.className = "chickenpaint-colorpicker-top";

        group.appendChild(select.getElement());
        group.appendChild(slider.getElement());

        panel.appendChild(group);

        alphaSlider.value = alpha;
        alphaSlider.title = function(alpha) {
            return "Opacity: " + alpha;
        };
        alphaSlider.on("valueChange", function(alpha) {
            that.setAlpha(alpha);
        });

        panel.appendChild(alphaSlider.getElement());

        setTimeout(function() {
            alphaSlider.resize();
        }, 0);

        return panel;
    }

    element.className = 'chickenpaint-color-pick-swatch';


    if (initialColor) {
        color.copyFrom(initialColor);
    }

    if (initialAlpha) {
        alpha = initialAlpha;
    }

    // Clicking outside the popover will dismiss it
    const closeClickHandler = function(e) {
        if ($(e.target).closest(".popover").length == 0 && $(e.target).closest(".chickenpaint-color-pick-swatch")[0] != element) {
            $(element).popover("hide");
        }
    };

    $(element)
        .popover({
            html: true,
            content: function() {
                window.addEventListener("mousedown", closeClickHandler);

                return buildColorEditPanel();
            },
            trigger: "manual",
            placement: "bottom",
            container: containerElement || false // Popover requires boolean for empty, not "undefined"
        })
        .on("click", function(e) {
            e.preventDefault();
            $(this).popover("toggle");
        })
        .on("hidden.bs.popover", function() {
            window.removeEventListener("mousedown", closeClickHandler);
        });

    paint();
}

CPColorSwatch.prototype = Object.create(EventEmitter.prototype);
CPColorSwatch.prototype.constructor = CPColorSwatch;