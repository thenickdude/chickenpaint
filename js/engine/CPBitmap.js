function CPBitmap(width, height) {
    width = width | 0;
    height = height | 0;

    this.width = width;
    this.height = height;
}

CPBitmap.prototype.getBounds = function() {
    return new CPRect(0, 0, this.width, this.height);
};
