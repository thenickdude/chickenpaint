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

export function createCanvas(width, height) {
	var
		canvas = document.createElement("canvas");
	
	canvas.width = width;
	canvas.height = height;
	
	return canvas;
}

export function createImageData(width, height) {
	// return new ImageData(this.width, this.height); // Doesn't work on old IE
	var
		canvas = document.createElement("canvas"),
		context = canvas.getContext("2d");
	
	return context.createImageData(width, height);
}