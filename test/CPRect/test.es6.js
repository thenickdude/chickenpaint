import CPRect from '../../js/util/CPRect.js';

function makeRandomRects(numRects, maxRight, maxBottom) {
	var
		result = new Array(numRects);

	for (let i = 0; i < numRects; i++) {
		var
			left = Math.round(Math.random() * maxRight),
			top = Math.round(Math.random() * maxBottom),
			width = Math.min(Math.round(left + Math.random() * 20), maxRight - left),
			height = Math.min(Math.round(top + Math.random() * 20), maxBottom - top);

		result[i] = new CPRect(left, top, left + width, top + height);
	}

	return result;
}

/**
 * Render the rectangles out into an array with 1 for areas where the rects are present and 0 elsewhere.
 *
 * @param {CPRect[]} rects
 * @param {int} width
 * @param {int} height
 * @returns Uint8Array
 */
function renderRectsAtBitmap(rects, width, height) {
	var
		result = new Uint8Array(width * height);

	for (let rect of rects) {
		for (let y = rect.top; y < rect.bottom; y++) {
			for (let x = rect.left; x < rect.right; x++) {
				result[y * width + x] = 1;
			}
		}
	}

	return result;
}

/**
 * Return a bitmap which is b1, but with zero wherever b2 is one.
 *
 * @param b1
 * @param b2
 * @returns {Uint8Array}
 */
function subtractBitmaps(b1, b2) {
	var
		result = new Uint8Array(b1.length);

	for (let i = 0; i < b1.length; i++) {
		result[i] = b2[i] == 1 ? 0 : b1[i];
	}

	return result;
}

function areBitmapsEqual(b1, b2) {
	if (b1.length != b2.length) {
		return false;
	}

	for (let i = 0; i < b1.length; i++) {
		if (b1[i] != b2[i]) {
			return false;
		}
	}

	return true;
}

function printBitmap(bitmap, width, height) {
	for (let y = 0; y < height; y++) {
		let line = "";

		for (let x = 0; x < width; x++) {
			line += bitmap[y * width + x] ? "O" : ".";
		}

		console.log(line);
	}
	console.log("");
}

function testFull() {
	const
		NUM_TEST_RECTS = 40,
		TEST_AREA_SIZE = 400;

	let
		setA = makeRandomRects(NUM_TEST_RECTS, TEST_AREA_SIZE, TEST_AREA_SIZE),
		setB = makeRandomRects(NUM_TEST_RECTS, TEST_AREA_SIZE, TEST_AREA_SIZE),
		setASubB = CPRect.subtract(setA, setB),

		// Compare our rectangle subtraction against a bitmap-based one
		imageA = renderRectsAtBitmap(setA, TEST_AREA_SIZE, TEST_AREA_SIZE),
		imageB = renderRectsAtBitmap(setB, TEST_AREA_SIZE, TEST_AREA_SIZE),

		imageASubB = subtractBitmaps(imageA, imageB),
		setASubBAsImage = renderRectsAtBitmap(setASubB, TEST_AREA_SIZE, TEST_AREA_SIZE);

	return areBitmapsEqual(imageASubB, setASubBAsImage);
}

/**
 * Breaks at the first problem and prints the rectangles involved.
 *
 * @returns {boolean}
 */
function testIterative() {
	const
		NUM_TEST_RECTS = 20,
		TEST_AREA_WIDTH = 120,
		TEST_AREA_HEIGHT = 40;

	let
		setA = [],
		setB = [];

	for (let i = 0; i < NUM_TEST_RECTS; i++) {
		var
			newARect = makeRandomRects(1, TEST_AREA_WIDTH, TEST_AREA_HEIGHT),
			newBRect = makeRandomRects(1, TEST_AREA_WIDTH, TEST_AREA_HEIGHT);

		setA = setA.concat(newARect);
		setB = setB.concat(newBRect);

		let
			setASubB = CPRect.subtract(setA, setB),

		// Compare our rectangle subtraction against a bitmap-based one
			imageA = renderRectsAtBitmap(setA, TEST_AREA_WIDTH, TEST_AREA_HEIGHT),
			imageB = renderRectsAtBitmap(setB, TEST_AREA_WIDTH, TEST_AREA_HEIGHT),

			imageASubB = subtractBitmaps(imageA, imageB),
			setASubBAsImage = renderRectsAtBitmap(setASubB, TEST_AREA_WIDTH, TEST_AREA_HEIGHT);

		if (!areBitmapsEqual(imageASubB, setASubBAsImage)) {
			console.log(setA);
			console.log(setB);
			console.log(setASubB);

			printBitmap(imageA, TEST_AREA_WIDTH, TEST_AREA_HEIGHT);
			printBitmap(imageB, TEST_AREA_WIDTH, TEST_AREA_HEIGHT);
			printBitmap(imageASubB, TEST_AREA_WIDTH, TEST_AREA_HEIGHT);
			printBitmap(setASubBAsImage, TEST_AREA_WIDTH, TEST_AREA_HEIGHT);

			return false;
		}
	}

	return true;
}

// Enable me for debugging
if (false) {
	if (testIterative()) {
		console.log("CPRect: Test passed");
	} else {
		console.log("CPRect: Test FAIL");
	}
}

if (testFull()) {
	console.log("CPRect: Test passed");
} else {
	console.log("CPRect: Test FAIL");
}