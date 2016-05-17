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

/**
 *
 * @param x
 * @param y
 *
 * @constructor
 */
export default function CPVector(x, y) {
	this.x = x;
	this.y = y;
}

CPVector.prototype.getLength = function() {
	return Math.sqrt(this.x * this.x + this.y * this.y);
};

/**
 *
 * @returns {CPVector} This vector for chaining
 */
CPVector.prototype.normalize = function() {
	var
		length = this.getLength();

	this.x /= length;
	this.y /= length;

	return this;
};

/**
 *
 * @param {CPVector} that
 */
CPVector.prototype.getDotProduct = function(that) {
	return this.x * that.x + this.y * that.y;
};

/**
 *
 * @param {numeric} scaleFactor
 * @returns {CPVector} This vector for chaining
 */
CPVector.prototype.scale = function(scaleFactor) {
	this.x *= scaleFactor;
	this.y *= scaleFactor;

	return this;
};

CPVector.prototype.getScaled = function(scaleFactor) {
	var
		result = new CPVector(this.x, this.y);

	result.scale(scaleFactor);

	return result;
};

CPVector.prototype.getRounded = function() {
	return new CPVector(Math.round(this.x), Math.round(this.y));
};

CPVector.prototype.getTruncated = function() {
	return new CPVector(~~this.x, ~~this.y);
};

CPVector.prototype.getPerpendicular = function() {
	return new CPVector(-this.y, this.x);
};

/**
 * Add that vector to this one
 *
 * @param {CPVector} that
 * @returns {CPVector} This vector for chaining
 */
CPVector.prototype.add = function(that) {
	this.x += that.x;
	this.y += that.y;

	return this;
};

/**
 * Subtract that vector from this one
 *
 * @param {CPVector} that
 * @returns {CPVector} This vector for chaining
 */
CPVector.prototype.subtract = function(that) {
	this.x -= that.x;
	this.y -= that.y;

	return this;
};


/**
 * Get the sum of this vector and that one.
 *
 * @param {CPVector} that
 * @returns {CPVector}
 */
CPVector.prototype.getSum = function(that) {
	return new CPVector(this.x + that.x, this.y + that.y);
};

/**
 * Create a new vector by p1 - p2
 *
 * @param p1
 * @param p2
 *
 * @returns {CPVector}
 */
CPVector.subtractPoints = function(p1, p2) {
	return new CPVector(p1.x - p2.x, p1.y - p2.y);
};