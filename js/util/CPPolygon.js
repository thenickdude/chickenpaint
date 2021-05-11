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

import CPTransform from './CPTransform.js';

export default function CPPolygon(points) {
	this.points = points || [];
}

CPPolygon.prototype.clone = function() {
	var
		result = new CPPolygon(new Array(this.points.length));

	for (var i = 0; i < this.points.length; i++) {
		// Deep clone
		result.points[i] = {x : this.points[i].x, y : this.points[i].y};
	}

	return result;
};

/**
 * Get a new polygon which is the result of transforming the points of this polygon with the given affine transform.
 *
 * @param {CPTransform} affineTransform
 * @returns {CPPolygon}
 */
CPPolygon.prototype.getTransformed = function(affineTransform) {
	var
		result = new CPPolygon(new Array(this.points.length));

	for (var i = 0; i < this.points.length; i++) {
		result.points[i] = affineTransform.getTransformedPoint(this.points[i]);
	}

	return result;
};

/**
 * Get the average of all the points in the polygon (the "center").
 *
 * @returns {{x: number, y: number}}
 */
CPPolygon.prototype.getCenter = function() {
	var
		centerX = this.points[0].x,
		centerY = this.points[0].y;

	for (var i = 1; i < this.points.length; i++) {
		centerX += this.points[i].x;
		centerY += this.points[i].y;
	}

	return {x: centerX / this.points.length, y: centerY / this.points.length};
};

/**
 * From https://www.ecse.rpi.edu/Homepages/wrf/Research/Short_Notes/pnpoly.html
 *
 * @param point
 * @returns {boolean}
 */
CPPolygon.prototype.containsPoint = function(point) {
	var i, j, contained = false;

	for (i = 0, j = this.points.length - 1; i < this.points.length; j = i++) {
		if (((this.points[i].y > point.y) != (this.points[j].y > point.y)) &&
				(point.x < (this.points[j].x - this.points[i].x) * (point.y - this.points[i].y) / (this.points[j].y - this.points[i].y) + this.points[i].x)) {
			contained = !contained;
		}
	}

	return contained;
};