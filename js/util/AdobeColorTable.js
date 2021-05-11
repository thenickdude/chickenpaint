/* 
 * By Nicholas Sherlock <n.sherlock@gmail.com>
 * 
 * Released under the WTFPLv2 https://en.wikipedia.org/wiki/WTFPL
 */

import ArrayDataStream from "./ArrayDataStream.js";

var 
    ACO_COLORSPACE_RGB = 0,
    ACO_COLORSPACE_HSB = 1,
    ACO_COLORSPACE_CMYK = 2,
    ACO_COLORSPACE_LAB = 7,
    ACO_COLORSPACE_GRAYSCALE = 8;

export default function AdobeColorTable() {
}

/**
 * Read an .aco (Adobe COlor) swatches file and return an array of RGB colors.
 * 
 * Supports version 1 palettes, only RGB format.
 * 
 * @param {Uint8Array} input - The .aco file contents
 * @return {?Object[]} An array of colours, or null if the file was not supported.
 */
AdobeColorTable.prototype.read = function(input) {
    if (input == null) {
        return null;
    }
    
    var
        stream = new ArrayDataStream(new Uint8Array(input)),
        version, count,
        result = [];

    version = stream.readU16BE();
    if (version != 1) {
        return null;
    }
    count = stream.readU16BE();

    for (var i = 0; i < count; i++) {
        var
            colorSpace = stream.readU16BE();

        if (colorSpace != ACO_COLORSPACE_RGB) {
            continue; // Drop unsupported colours silently
        }

        // Scale back down from 16-bit to 8-bit
        var
            r = (stream.readU16BE() * 255) / 65535,
            g = (stream.readU16BE() * 255) / 65535,
            b = (stream.readU16BE() * 255) / 65535;
        
        stream.readU16BE(); // third value unused

        result.push(r << 16 | g << 8 | b);
    }

    return result;
};

/**
 * Write an .aco (Adobe COlor) swatches file of the given array of RGB colours (colors are integers with the
 * blue channel in the least-significant position).
 */
AdobeColorTable.prototype.write = function(colours) {
    var
        buffer = new Uint8Array(2 * 2 + colours.length * 10),
        stream = new ArrayDataStream(buffer);
    
    stream.writeU16BE(1); // Version 1
    stream.writeU16BE(colours.length); // Number of colours
    
    for (var i = 0; i < colours.length; i++) {
        var
            colour = colours[i];
        
        stream.writeU16BE(ACO_COLORSPACE_RGB);

        // Scale up colours to 16-bits (65535/255 = 257)
        stream.writeU16BE(((colour >> 16) & 0xFF) * 257);
        stream.writeU16BE(((colour >> 8) & 0xFF) * 257);
        stream.writeU16BE((colour & 0xFF) * 257);
        stream.writeU16BE(0);
    }
    
    return stream.getAsDataArray();
};
