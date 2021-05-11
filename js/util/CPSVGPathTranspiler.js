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

import CPVector from './CPVector.js';

/**
 * Convert a SVG path (within a fairly restricted subset of SVG commands) into a JS function which draws that path
 * to a canvas.
 *
 * @param {string} path
 */
export default function CPSVGPathTranspiler(path) {
	var
		lines = [],
		cursorX = 0, cursorY = 0,
		bezierStartX, bezierStartY, bezierControlX, bezierControlY, bezierEndX, bezierEndY;

	while (path.length > 0) {
		var
			command = path.match(/\s*([a-zA-Z])((?:\s*(-?\d+(?:\.\d+)?)*)*)/),
			argument;

		if (!command)
			break;

		argument = command[2].split(/\s+/).map(s => parseFloat(s));

		switch (command[1]) {
			case 'M':
				cursorX = argument[0];
				cursorY = argument[1];
				lines.push(`
					context.moveTo(${cursorX}, ${cursorY});
				`);
			break;
			case 'h':
				cursorX += argument[0];
				lines.push(`
					context.lineTo(${cursorX}, ${cursorY});
				`);
			break;
			case 'v':
				cursorY += argument[0];
				lines.push(`
					context.lineTo(${cursorX}, ${cursorY});
				`);
			break;
			case 'l':
				cursorX += argument[0];
				cursorY += argument[1];
				lines.push(`
					context.lineTo(${cursorX}, ${cursorY});
				`);
			break;
			case 'q':
				bezierStartX = cursorX;
				bezierStartY = cursorY;

				bezierControlX = bezierStartX + argument[0];
				bezierControlY = bezierStartY + argument[1];

				bezierEndX = bezierStartX + argument[2];
				bezierEndY = bezierStartY + argument[3];

				lines.push(`
					context.quadraticCurveTo(${bezierControlX}, ${bezierControlY}, ${bezierEndX}, ${bezierEndY});
				`);

				cursorX = bezierEndX;
				cursorY = bezierEndY;
			break;
			case 't':
				var
					oldBezierStart = {x: bezierStartX, y: bezierStartY},
					oldControlPoint = {x: bezierControlX, y: bezierControlY},
					oldControlVector = CPVector.subtractPoints(oldControlPoint, oldBezierStart),

					normal = CPVector.subtractPoints({x: cursorX, y: cursorY}, oldBezierStart).getPerpendicular().normalize(),
					reflectedControlVector = oldControlVector.subtract(normal.getScaled(2 * oldControlVector.getDotProduct(normal)));

				bezierStartX = cursorX;
				bezierStartY = cursorY;

				bezierControlX = bezierStartX + reflectedControlVector.x;
				bezierControlY = bezierStartY + reflectedControlVector.y;

				bezierEndX = bezierStartX + argument[0];
				bezierEndY = bezierStartY + argument[1];

				lines.push(`
					context.quadraticCurveTo(${bezierControlX}, ${bezierControlY}, ${bezierEndX}, ${bezierEndY});
				`);

				cursorX = bezierEndX;
				cursorY = bezierEndY;
			break;
			case 'z':
				lines.push("context.fill()");
			break;
			default:
				console.log("Unsupported SVG command " + command[0]);
		}

		path = path.substring(command[0].length);
	}

	return new Function("context", lines.join("\n"));
}