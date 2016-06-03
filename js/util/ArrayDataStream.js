/**
 * A tool for presenting a Uint8Array as a stream for reading and writing some simple data types.
 * 
 * By Nicholas Sherlock <n.sherlock@gmail.com> 2016, released under the WTFPL license.
 */

var EOF = -1;

function signExtend16Bit(word) {
    //If sign bit is set, fill the top bits with 1s to sign-extend
    return (word & 0x8000) ? (word | 0xFFFF0000) : word;
}

function signExtend8Bit(byte) {
    //If sign bit is set, fill the top bits with 1s to sign-extend
    return (byte & 0x80) ? (byte | 0xFFFFFF00) : byte;
}

/**
 * Create a stream on existing array of unsigned byte data (i.e. hopefully Uint8Array).
 * 
 * @param {Uint8Array} data - Array to stream data from
 * @param {int=} start - The index of the byte in the array that will be read first, or leave undefined to begin at the
 *              beginning of the array
 * @param {int=} end - The index of the end of the stream, or leave undefined to use the end of the array as the end of
 *            the stream.
 */
export default function ArrayDataStream(data, start, end) {
    this.data = data;
    this.eof = false;
    this.start = start === undefined ? 0 : start;
    this.end = end === undefined ? data.length : end;
    this.pos = this.start;
};

/**
 * Read a single byte from the stream and turn it into a JavaScript string (assuming ASCII).
 * 
 * @returns {String|number} String containing one character, or EOF if the end of file was reached (eof flag
 * is set).
 */
ArrayDataStream.prototype.readChar = function() {
    if (this.pos < this.end) {
        return String.fromCharCode(this.data[this.pos++]);
    }

    this.eof = true;
    return EOF;
};

/**
 * Read one unsigned byte from the stream
 * 
 * @returns {number} Unsigned byte, or EOF if the end of file was reached (eof flag is set).
 */
ArrayDataStream.prototype.readByte = function() {
    if (this.pos < this.end) {
        return this.data[this.pos++];
    }

    this.eof = true;
    return EOF;
};

//Synonym:
ArrayDataStream.prototype.readU8 = ArrayDataStream.prototype.readByte;

ArrayDataStream.prototype.readS8 = function() {
    return signExtend8Bit(this.readByte());
};

ArrayDataStream.prototype.unreadChar = function(c) {
    this.pos--;
};
    
ArrayDataStream.prototype.peekChar = function() {
    if (this.pos < this.end) {
        return String.fromCharCode(this.data[this.pos]);
    }

    this.eof = true;
    return EOF;
};

ArrayDataStream.prototype.readString = function(length) {
    var 
        chars = new Array(length),
        i;
    
    for (i = 0; i < length; i++) {
        chars[i] = this.readChar();
    }
    
    return chars.join("");
};

ArrayDataStream.prototype.readS16 = function() {
    var 
        b1 = this.readByte(),
        b2 = this.readByte();
    
    return signExtend16Bit((b1 << 8) | b2); 
};

ArrayDataStream.prototype.readU16BE = function() {
    var 
        b1 = this.readByte(),
        b2 = this.readByte();
    
    return (b1 << 8) | b2; 
};

ArrayDataStream.prototype.readU16LE = function() {
    var 
        b1 = this.readByte(),
        b2 = this.readByte();
    
    return (b2 << 8) | b1; 
};

ArrayDataStream.prototype.readU32BE = function() {
    var 
        b1 = this.readByte(),
        b2 = this.readByte(),
        b3 = this.readByte(),
        b4 = this.readByte();
    return ((b1 << 24) | (b2 << 16) | (b3 << 8) | b4) >>> 0; 
};

ArrayDataStream.prototype.readU32LE = function() {
    var 
        b1 = this.readByte(),
        b2 = this.readByte(),
        b3 = this.readByte(),
        b4 = this.readByte();
    return ((b4 << 24) | (b3 << 16) | (b2 << 8) | b1) >>> 0; 
};

ArrayDataStream.prototype.readBytes = function(count) {
    var
        result = this.data.subarray(this.pos, this.pos + count);
    
    this.pos += count;
    
    if (this.pos > this.end) {
        this.eof = true;
    }
    
    return result;
};

ArrayDataStream.prototype.skip = function(numBytes) {
    this.pos += numBytes;
    
    if (this.pos > this.end) {
        this.eof = true;
    }
};

ArrayDataStream.prototype.seek = function(offset) {
    this.pos = offset;
};

ArrayDataStream.prototype.writeBytes = function(arr) {
    for (var i = 0; i < arr.length; i++) {
        this.data[this.pos++] = arr[i];
    }
};

ArrayDataStream.prototype.writeByte = function(b) {
    this.data[this.pos++] = b;
};

//Synonym:
ArrayDataStream.prototype.writeU8 = ArrayDataStream.prototype.writeByte;

ArrayDataStream.prototype.writeU16LE = function(u) {
    this.data[this.pos++] = u;
    this.data[this.pos++] = u >> 8;
};

ArrayDataStream.prototype.writeU16BE = function(u) {
    this.data[this.pos++] = u >> 8;
    this.data[this.pos++] = u;
};

ArrayDataStream.prototype.writeU32BE = function(u) {
    this.data[this.pos++] = u >> 24;
    this.data[this.pos++] = u >> 16;
    this.data[this.pos++] = u >> 8;
    this.data[this.pos++] = u;
};

ArrayDataStream.prototype.writeU32LE = function(u) {
    this.data[this.pos++] = u;
    this.data[this.pos++] = u >> 8;
    this.data[this.pos++] = u >> 16;
    this.data[this.pos++] = u >> 24;
};

ArrayDataStream.prototype.writeDoubleBE = function(d) {
    var 
        bytes = new Uint8Array(new Float64Array([d]).buffer);
    
    for (var i = bytes.length - 1; i >= 0; i--) {
        this.writeByte(bytes[i]);
    }
};

ArrayDataStream.prototype.writeFloatBE = function(d) {
    var 
        bytes = new Uint8Array(new Float32Array([d]).buffer);
    
    for (var i = bytes.length - 1; i >= 0; i--) {
        this.writeByte(bytes[i]);
    }
};

/**
 * Write an ASCII string to the stream
 */
ArrayDataStream.prototype.writeString = function(s) {
    for (var i = 0; i < s.length; i++) {
        this.data[this.pos++] = s.charCodeAt(i);
    }
};

/**
 * Write the given unsigned 32-bit integer to the stream in big-endian order using the given byte width.
 * No error checking is performed to ensure that the supplied width is correct for the integer.
 * 
 * Omit the width parameter to have it determined automatically for you.
 * 
 * @param u Unsigned integer to be written
 * @param width Number of bytes to write to the stream
 */
ArrayDataStream.prototype.writeUnsignedIntBE = function(u, width) {
    if (width === undefined) {
        width = this.measureUnsignedInt(u);
    }
    
    // Each case falls through:
    //noinspection FallThroughInSwitchStatementJS
    switch (width) {
        case 5:
            this.writeU8(Math.floor(u / 4294967296)); // Need to use division to access >32 bits of floating point var
        case 4:
            this.writeU8(u >> 24);
        case 3:
            this.writeU8(u >> 16);
        case 2:
            this.writeU8(u >> 8);
        case 1:
            this.writeU8(u);
        break;
        default:
            throw "Bad UINT size " + width;
    }
};

/**
 * Return the number of bytes needed to hold the non-zero bits of the given unsigned integer.
 */
ArrayDataStream.prototype.measureUnsignedInt = function(val) {
    // Force to 32-bit unsigned integer
    if (val < (1 << 8)) {
        return 1;
    } else if (val < (1 << 16)) {
        return 2;
    } else if (val < (1 << 24)) {
        return 3;
    } else if (val < 4294967296) {
        return 4;
    } else {
        return 5;
    }
};

/**
 * Return a view on the portion of the buffer from the beginning to the current seek position as a Uint8Array.
 */
ArrayDataStream.prototype.getAsDataArray = function() {
    if (this.pos < this.data.byteLength) {
        return this.data.subarray(0, this.pos);
    } else if (this.pos == this.data.byteLength) {
        return this.data;
    } else {
        throw "ArrayDataStream's pos lies beyond end of buffer"; 
        // Chance is pretty good that you overflowed the end of the buffer during writing and your file is trash 
    }
};

ArrayDataStream.prototype.EOF = EOF;