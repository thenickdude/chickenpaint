// Modifications by Nicholas Sherlock. Original docs below:

// Last updated November 2011
// By Simon Sarris
// www.simonsarris.com
// sarris@acm.org
//
// Free to use and distribute at will
// So long as you are nice to people, etc

// Simple class for keeping track of the current transformation matrix

// For instance:
//    var t = new Transform();
//    t.rotate(5);
//    var m = t.m;
//    ctx.setTransform(m[0], m[1], m[2], m[3], m[4], m[5]);

// Is equivalent to:
//    ctx.rotate(5);

// But now you can retrieve it :)

// Remember that this does not account for any CSS transforms applied to the canvas

export default function CPTransform() {
    this.setToIdentity();
}

CPTransform.prototype.setToIdentity = function() {
    /* Matrix components are stored in this order in 'm':
     * [0 2 4]
     * [1 3 5]
     * [x x x]
     *
     * Last row is always 0, 0, 1 so we don't store it.
     */
    this.m = [ 1, 0, 0, 1, 0, 0 ];
};

/**
 * Multiply this matrix with the given transformation one like so:
 *
 * [this] = [this] * [matrix]
 *
 * @param {CPTransform} matrix
 */
CPTransform.prototype.multiply = function(matrix) {
    var 
        m11 = this.m[0] * matrix.m[0] + this.m[2] * matrix.m[1],
        m12 = this.m[1] * matrix.m[0] + this.m[3] * matrix.m[1],

        m21 = this.m[0] * matrix.m[2] + this.m[2] * matrix.m[3],
        m22 = this.m[1] * matrix.m[2] + this.m[3] * matrix.m[3],

        dx = this.m[0] * matrix.m[4] + this.m[2] * matrix.m[5] + this.m[4],
        dy = this.m[1] * matrix.m[4] + this.m[3] * matrix.m[5] + this.m[5];

    this.m[0] = m11;
    this.m[1] = m12;
    this.m[2] = m21;
    this.m[3] = m22;
    this.m[4] = dx;
    this.m[5] = dy;
};

/**
 * Multiply this matrix with the given transformation one like so:
 *
 * [this] = [matrix] * [this]
 *
 * @param {CPTransform} matrix
 */
CPTransform.prototype.preMultiply = function(matrix) {
    var
        m11 = matrix.m[0] * this.m[0] + matrix.m[2] * this.m[1],
        m12 = matrix.m[1] * this.m[0] + matrix.m[3] * this.m[1],

        m21 = matrix.m[0] * this.m[2] + matrix.m[2] * this.m[3],
        m22 = matrix.m[1] * this.m[2] + matrix.m[3] * this.m[3],

        dx = matrix.m[0] * this.m[4] + matrix.m[2] * this.m[5] + matrix.m[4],
        dy = matrix.m[1] * this.m[4] + matrix.m[3] * this.m[5] + matrix.m[5];

    this.m[0] = m11;
    this.m[1] = m12;
    this.m[2] = m21;
    this.m[3] = m22;
    this.m[4] = dx;
    this.m[5] = dy;
};

CPTransform.prototype.invert = function() {
    var 
        d = 1 / (this.m[0] * this.m[3] - this.m[1] * this.m[2]),
        m0 = this.m[3] * d,
        m1 = -this.m[1] * d,
        m2 = -this.m[2] * d,
        m3 = this.m[0] * d,
        m4 = d * (this.m[2] * this.m[5] - this.m[3] * this.m[4]),
        m5 = d * (this.m[1] * this.m[4] - this.m[0] * this.m[5]);
    
    this.m[0] = m0;
    this.m[1] = m1;
    this.m[2] = m2;
    this.m[3] = m3;
    this.m[4] = m4;
    this.m[5] = m5;
};

CPTransform.prototype.getInverted = function() {
    var
        result = new CPTransform();
    
    result.m[0] = this.m[0];
    result.m[1] = this.m[1];
    result.m[2] = this.m[2];
    result.m[3] = this.m[3];
    result.m[4] = this.m[4];
    result.m[5] = this.m[5];
    
    result.invert();
    
    return result;
};

/**
 * Multiply this transform by a rotation matrix for the given angle:
 *
 * [ cos(a) -sin(a) 0]
 * [ sin(a)  cos(a) 0]
 * [   0       0    1]
 */
CPTransform.prototype.rotate = function(rad) {
    var 
        c = Math.cos(rad),
        s = Math.sin(rad),

        m11 = this.m[0] * c + this.m[2] * s,
        m12 = this.m[1] * c + this.m[3] * s,
        m21 = this.m[0] * -s + this.m[2] * c,
        m22 = this.m[1] * -s + this.m[3] * c;
    
    this.m[0] = m11;
    this.m[1] = m12;
    this.m[2] = m21;
    this.m[3] = m22;
};

CPTransform.prototype.rotateAroundPoint = function(rad, x, y) {
    this.translate(x, y);
    this.rotate(rad);
    this.translate(-x, -y);
};

/**
 * Multiply this transform by a translation matrix:
 *
 * [1  0  x]
 * [0  1  y]
 * [0  0  1]
 *
 * @param x
 * @param y
 */
CPTransform.prototype.translate = function(x, y) {
    this.m[4] += this.m[0] * x + this.m[2] * y;
    this.m[5] += this.m[1] * x + this.m[3] * y;
};

/**
 * Multiply this transform by a scale matrix:
 *
 * [sx 0  0]
 * [0  sy 0]
 * [0  0  1]
 *
 * @param sx
 * @param sy
 */
CPTransform.prototype.scale = function(sx, sy) {
    this.m[0] *= sx;
    this.m[1] *= sx;
    this.m[2] *= sy;
    this.m[3] *= sy;
};

CPTransform.prototype.scaleAroundPoint = function(sx, sy, px, py) {
    this.translate(px, py);
    this.scale(sx, sy);
    this.translate(-px, -py);
};

/**
 * Multiply this transform by a shear matrix:
 *
 * [1  sx 0]
 * [sy 1  0]
 * [0  0  1]
 *
 * @param {number} x
 * @param {number} y
 */
CPTransform.prototype.shear = function(x, y) {
  var
      m11 = this.m[0] + this.m[2] * y,
      m12 = this.m[1] + this.m[3] * y,
      m21 = this.m[2] + this.m[0] * x,
      m22 = this.m[3] + this.m[1] * x;

    this.m[0] = m11;
    this.m[1] = m12;
    this.m[2] = m21;
    this.m[3] = m22;
};

CPTransform.prototype.getTransformedPoint = function(p) {
    return {
        x: p.x * this.m[0] + p.y * this.m[2] + this.m[4],
        y: p.x * this.m[1] + p.y * this.m[3] + this.m[5]
    };
};

CPTransform.prototype.transformPoints = function(points) {
    for (var i = 0; i < points.length; i++) {
        points[i] = this.getTransformedPoint(points[i]);
    }
};

CPTransform.prototype.getTranslateX = function() {
    return this.m[4];
};

CPTransform.prototype.getTranslateY = function() {
    return this.m[5];
};

CPTransform.prototype.clone = function() {
    var
        result = new CPTransform();
    
    result.m[0] = this.m[0];
    result.m[1] = this.m[1];
    result.m[2] = this.m[2];
    result.m[3] = this.m[3];
    result.m[4] = this.m[4];
    result.m[5] = this.m[5];
    
    return result;
};

CPTransform.prototype.getDeterminant = function() {
    return this.m[0] * this.m[3] - this.m[1] * this.m[2];
};

/**
 * Break down the matrix into a translation, scale, rotation, then shear operation.
 *
 * x or y scale must not be zero.
 *
 * http://www.maths-informatique-jeux.com/blog/frederic/?post/2013/12/01/Decomposition-of-2D-transform-matrices
 */
CPTransform.prototype.decompose = function() {
    var
        determinant = this.getDeterminant(),
        r = Math.sqrt(this.m[0] * this.m[0] + this.m[1] * this.m[1]);

    return {
        translate: {x: this.m[4], y: this.m[5]},
        rotate: Math.sign(this.m[1]) * Math.acos(this.m[0] / r),
        scale: {x: r, y: determinant / r},
        shear: {x: Math.atan((this.m[0] * this.m[2] + this.m[1] * this.m[3]) / (r * r)), y: 0}
    };
};

CPTransform.prototype.toString = function() {
    const
        PLACES = 2;

    return ("[" + this.m[0].toFixed(PLACES) + " " + this.m[2].toFixed(PLACES) + " " + this.m[4].toFixed(PLACES) + "]\n" +
           "[" + this.m[1].toFixed(PLACES) + " " + this.m[3].toFixed(PLACES) + " " + this.m[5].toFixed(PLACES) + "]\n" +
           "[0.00 0.00 1.00]");
};

Math.sign = Math.sign || function(x) {
    x = +x; // convert to a number
    if (x === 0 || isNaN(x)) {
        return x;
    }
    return x > 0 ? 1 : -1;
};