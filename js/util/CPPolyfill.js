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

import {createCanvas} from "./Canvas.js";

function getCanvasInterpolationPropName(canvasContext) {
	var
		browserProperties = [
			"imageSmoothingEnabled", "mozImageSmoothingEnabled", "webkitImageSmoothingEnabled",
			"msImageSmoothingEnabled"
		];

	for (var i = 0; i < browserProperties.length; i++) {
		if (browserProperties[i] in canvasContext) {
			return browserProperties[i];
		}
	}

	return null;
}

export function isCanvasInterpolationSupported() {
	var
		canvas = createCanvas(0, 0),
		canvasContext = canvas.getContext("2d");

	return !!getCanvasInterpolationPropName(canvasContext);
}

export function setCanvasInterpolation(canvasContext, enabled) {
	var
		propName = getCanvasInterpolationPropName(canvasContext);

	if (propName) {
		canvasContext[propName] = enabled;
	}
}

export function isEventSupported(eventName) {
	var
		isSupported = eventName in window;

	if (!isSupported) {
		var
			el = document.createElement('div');
		el.setAttribute(eventName, 'return;');

		isSupported = typeof el[eventName] == 'function';
	}

	return isSupported;
}

export function isCanvasSupported(){
	var
		elem = createCanvas(0, 0);
	
	return !!(elem.getContext && elem.getContext('2d'));
}

export function isFlexboxSupported() {
	return (typeof document.body.style.flexBasis == "string" || typeof document.body.style.msFlexDirection == "string") && !/Presto/.test(navigator.userAgent);
}