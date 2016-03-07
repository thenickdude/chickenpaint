// An RGB color with floating point values for each channel (between 0.0 and 1.0)
export default function CPColorFloat(r, g, b) {
    this.r = r;
    this.g = g;
    this.b = b;
}

CPColorFloat.prototype.toInt = function() {
    return (Math.max(0, Math.min(255, Math.round(this.r * 255))) << 16) 
        | (Math.max(0, Math.min(255, Math.round(this.g * 255))) << 8)
        | Math.max(0, Math.min(255, Math.round(this.b * 255)));
};

CPColorFloat.prototype.mixWith = function(color, alpha) {
    this.r = this.r * (1.0 - alpha) + color.r * alpha;
    this.g = this.g * (1.0 - alpha) + color.g * alpha;
    this.b = this.b * (1.0 - alpha) + color.b * alpha;
};

CPColorFloat.prototype.clone = function() {
    return new CPColorFloat(this.r, this.g, this.b);
};

CPColorFloat.createFromInt = function(color) {
    return new CPColorFloat(
        ((color >>> 16) & 0xff) / 255,
        ((color >>> 8) & 0xff) / 255,
        (color & 0xff) / 255
    );
};