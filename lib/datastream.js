/**
 * Big-endian stream for reading from an UInt8Array.
 * 
 * By Nicholas Sherlock n.sherlock@gmail.com 2016, released under the WTFPL license.
 */

"use strict";

var ArrayDataStream;

(function(){
    var EOF = -1;
    
    function signExtend16Bit(word) {
        //If sign bit is set, fill the top bits with 1s to sign-extend
        return (word & 0x8000) ? (word | 0xFFFF0000) : word;
    }

    function signExtend8Bit(byte) {
        //If sign bit is set, fill the top bits with 1s to sign-extend
        return (byte & 0x80) ? (byte | 0xFFFFFF00) : byte;
    }
    
    /*
     * Take an array of unsigned byte data and present it as a stream with various methods
     * for reading data in different formats.
     */
    ArrayDataStream = function(data, start, end) {
        this.data = data;
        this.eof = false;
        this.start = start === undefined ? 0 : start;
        this.end = end === undefined ? data.length : end;
        this.pos = this.start;
    };
    
    /**
     * Read a single byte from the string and turn it into a JavaScript string (assuming ASCII).
     * 
     * @returns String containing one character, or EOF if the end of file was reached (eof flag
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
     * @returns Unsigned byte, or EOF if the end of file was reached (eof flag is set).
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
    
    ArrayDataStream.prototype.readU16 = function() {
        var 
            b1 = this.readByte(),
            b2 = this.readByte();
        
        return (b1 << 8) | b2; 
    };
    
    ArrayDataStream.prototype.readU32 = function() {
        var 
            b1 = this.readByte(),
            b2 = this.readByte(),
            b3 = this.readByte(),
            b4 = this.readByte();
        return (b1 << 24) | (b2 << 16) | (b3 << 8) | b4; 
    };
    
    ArrayDataStream.prototype.readBytes = function(count) {
        var
            result = this.data.subarray(this.pos, this.pos + count);
        
        this.pos += count;
        
        if (this.pos > this.end) {
            this.eof = true;
        }
        
        return result;
    }
    
    ArrayDataStream.prototype.skip = function(numBytes) {
        this.pos += numBytes;
        
        if (this.pos > this.end) {
            this.eof = true;
        }
    };
    
    ArrayDataStream.prototype.EOF = EOF;
}());