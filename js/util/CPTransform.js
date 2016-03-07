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
    this.m = [ 1, 0, 0, 1, 0, 0 ];
};

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

CPTransform.prototype.translate = function(x, y) {
    this.m[4] += this.m[0] * x + this.m[2] * y;
    this.m[5] += this.m[1] * x + this.m[3] * y;
};

CPTransform.prototype.scale = function(sx, sy) {
    this.m[0] *= sx;
    this.m[1] *= sx;
    this.m[2] *= sy;
    this.m[3] *= sy;
};

CPTransform.prototype.transformPoint = function(px, py) {
    var 
        x = px,
        y = py;
    
    px = x * this.m[0] + y * this.m[2] + this.m[4];
    py = x * this.m[1] + y * this.m[3] + this.m[5];
    
    return {x: px, y: py};
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