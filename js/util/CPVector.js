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

export default function CPVector(x, y) {
	this.x = x;
	this.y = y;
}

CPVector.prototype.getLength = function() {
	return Math.sqrt(this.x * this.x + this.y * this.y);
};

CPVector.prototype.normalize = function() {
	var
		length = this.getLength();

	this.x /= length;
	this.y /= length;
};

/**
 *
 * @param {CPVector} vec
 */
CPVector.prototype.getDotProduct = function(that) {
	return this.x * that.x + this.y * that.y;
};

CPVector.prototype.scale = function(scaleFactor) {
	this.x *= scaleFactor;
	this.y *= scaleFactor;
};

CPVector.prototype.getScaled = function(scaleFactor) {
	var
		result = new CPVector(this.x, this.y);

	result.scale(scaleFactor);

	return result;
};

CPVector.prototype.getPerpendicular = function() {
	return new CPVector(-this.y, this.x);
};