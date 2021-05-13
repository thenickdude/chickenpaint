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

import CPArtwork from "./CPArtwork.js";
import CPImageLayer from "./CPImageLayer.js";
import CPColorBmp from "./CPColorBmp.js";
import ArrayDataStream from "../util/ArrayDataStream.js";
import CPLayerGroup from "./CPLayerGroup.js";
import CPGreyBmp from "./CPGreyBmp.js";
import CPBlend from "./CPBlend.js";

import pako from "pako";

/**
 * Concat two Uint8Arrays to make a new one and return it.
 *
 * Either one may be set to null. If either one is null, the other is returned. If both are null, null is
 * returned.
 */
function concatBuffers(one, two) {
    if (one === null || one.length === 0) {
        return two;
    }
    if (two === null || two.length === 0) {
        return one;
    }

    let
        result = new Uint8Array(one.length + two.length);

    result.set(one, 0);
    result.set(two, one.length);

    return result;
}

const
    OUR_MAJOR_VERSION = 0,
    OUR_MINOR_VERSION = 10,

	MAX_SUPPORTED_MAJOR_VERSION = OUR_MAJOR_VERSION,

	CHI_MAGIC = "CHIBIOEK",

    CHUNK_TAG_HEAD = "HEAD",
    CHUNK_TAG_LAYER = "LAYR",
    CHUNK_TAG_GROUP = "GRUP",
    CHUNK_TAG_END = "ZEND";

function CPChibiFileHeader(stream) {
    this.version = stream.readU32BE();
    this.width = stream.readU32BE();
    this.height = stream.readU32BE();
    this.layersNb = stream.readU32BE();
}

CPChibiFileHeader.FIXED_HEADER_LENGTH = 4 * 4;

function ChibiChunkHeader(stream) {
    let
        chunkType = new Array(4);

    for (let i = 0; i < chunkType.length; i++) {
        chunkType[i] = String.fromCharCode(stream.readByte());
    }

    this.chunkType = chunkType.join("");
    this.chunkSize = stream.readU32BE();

    if (stream.eof) {
        throw "Truncated chunk";
    }
}

ChibiChunkHeader.HEADER_LENGTH = 8;

const
    LAYER_FLAG_VISIBLE      = 1,
    LAYER_FLAG_CLIP         = 2,
    LAYER_FLAG_HAS_MASK     = 4,
    LAYER_FLAG_MASK_LINKED  = 8,
	LAYER_FLAG_MASK_VISIBLE = 16,
	LAYER_FLAG_EXPANDED     = 32,
    LAYER_FLAG_ALPHA_LOCKED = 64,
	// Set if the LM_MULTIPLY2 blend mode should be used instead of the LM_MULTIPLY noted in the layer's blend mode
    LAYER_FLAG_MULTIPLY2    = 128,

    LAYER_DECODE_STATE_FIXED_HEADER    = 0,
    LAYER_DECODE_STATE_VARIABLE_HEADER = 1,
    LAYER_DECODE_STATE_IMAGE_DATA      = 3,
    LAYER_DECODE_STATE_MASK_DATA       = 4,
    LAYER_DECODE_STATE_SKIP_TRAILING   = 5,
    LAYER_DECODE_STATE_COMPLETE        = 6;

class ChibiLayerDecoder {
    /**
     * @param {ChibiChunkHeader} chunkHeader - The header for the layer chunk to decode
     * @param {int} width - The width of the document
     * @param {int} height - The height of the document
     */
    constructor(chunkHeader, width, height) {
        this.chunkHeader = chunkHeader;
        this.width = width;
        this.height = height;
        
        this.state = LAYER_DECODE_STATE_FIXED_HEADER;
        this.payloadOffset = 0;
        this.skipBytes = 0;
        this.nameLength = 0;
        this.done = false;
        
        this.colorDecoder = null;
        this.maskDecoder = null;
    }
    
    readFixedHeader(stream) {
        this.payloadOffset = stream.readU32BE();
        
        this.blendMode = stream.readU32BE();
        this.alpha = stream.readU32BE();
        
        let
            layerFlags = stream.readU32BE();
        
        this.visible = (layerFlags & LAYER_FLAG_VISIBLE) != 0;
        this.clip = (layerFlags & LAYER_FLAG_CLIP) != 0;
        this.hasMask = (layerFlags & LAYER_FLAG_HAS_MASK) != 0;
        this.maskLinked = (layerFlags & LAYER_FLAG_MASK_LINKED) != 0;
	    this.maskVisible = (layerFlags & LAYER_FLAG_MASK_VISIBLE) != 0;
	    this.expanded = (layerFlags & LAYER_FLAG_EXPANDED) != 0;
        this.lockAlpha = (layerFlags & LAYER_FLAG_ALPHA_LOCKED) != 0;

        if (this.blendMode === CPBlend.LM_MULTIPLY && (layerFlags & LAYER_FLAG_MULTIPLY2) !== 0) {
            this.blendMode = CPBlend.LM_MULTIPLY2;
        }
        
        this.nameLength = stream.readU32BE();
    }
    
    getFixedHeaderLen() {
        return 5 * 4;
    }
    
    getVariableHeaderLen() {
        return this.nameLength;
    }
    
    readVariableSizeHeader(stream) {
        this.name = stream.readString(this.nameLength);
    }
    
    /**
     * Decode some layer data from the beginning of the given block. Returns any non-layer data
     * that was left over from that block, or null if the block was read completely.
     *
     * Keep calling with more data until the .done property is set to true.
     *
     * @param {Uint8Array} block
     * @returns {?Uint8Array}
     */
    decode(block) {
        let
            stream;
        
        // Dummy loop so we can re-enter the switch statement with "continue"
        while (true) {
            if (this.skipBytes > 0) {
                if (this.skipBytes >= block.length) {
                    this.skipBytes -= block.length;
                    return null;
                } else {
                    block = block.subarray(this.skipBytes);
                    this.skipBytes = 0;
                }
            }
            
            switch (this.state) {
                case LAYER_DECODE_STATE_FIXED_HEADER:
                    // Wait for first part of header to arrive
                    if (block.length < this.getFixedHeaderLen()) {
                        break;
                    }
                    
                    stream = new ArrayDataStream(block);
                    this.readFixedHeader(stream);
                    
                    block = block.subarray(stream.pos);
                    
                    this.state = LAYER_DECODE_STATE_VARIABLE_HEADER;
                    continue;
                
                case LAYER_DECODE_STATE_VARIABLE_HEADER:
                    // Wait for variable part of header to arrive
                    if (block.length < this.getVariableHeaderLen()) {
                        break;
                    }
                    
                    stream = new ArrayDataStream(block);
                    this.readVariableSizeHeader(stream);
                    
                    this.layer = this.createLayer();
                    
                    if (this.hasMask) {
                        this.layer.setMask(new CPGreyBmp(this.width, this.height, 8));
                        this.maskDecoder = new CPMaskDecoder(this.layer.mask);
                    }
                    
                    if (this.layer instanceof CPImageLayer) {
                        this.colorDecoder = new CPColorPixelsDecoder(this.layer.image);
                    }
                    
                    this.skipBytes = this.payloadOffset - this.getFixedHeaderLen();
                    
                    if (this.colorDecoder) {
                        this.state = LAYER_DECODE_STATE_IMAGE_DATA;
                    } else if (this.maskDecoder) {
                        this.state = LAYER_DECODE_STATE_MASK_DATA;
                    } else {
                        this.state = LAYER_DECODE_STATE_SKIP_TRAILING;
                    }
                    
                    continue;
                
                case LAYER_DECODE_STATE_IMAGE_DATA:
                    block = this.colorDecoder.decode(block);
                    
                    if (this.colorDecoder.done) {
                        if (this.maskDecoder) {
                            this.state = LAYER_DECODE_STATE_MASK_DATA;
                        } else {
                            this.state = LAYER_DECODE_STATE_SKIP_TRAILING;
                        }
                        continue;
                    }
                    break;
                
                case LAYER_DECODE_STATE_MASK_DATA:
                    block = this.maskDecoder.decode(block);
                    
                    if (this.maskDecoder.done) {
                        this.state = LAYER_DECODE_STATE_SKIP_TRAILING;
                        continue;
                    }
                    break;
                
                case LAYER_DECODE_STATE_SKIP_TRAILING:
                    let
                        bytesRead = this.payloadOffset;
                    
                    if (this.colorDecoder) {
                        bytesRead += this.colorDecoder.bytesTotal;
                    }
                    
                    if (this.maskDecoder) {
                        bytesRead += this.maskDecoder.bytesTotal;
                    }
                    
                    this.state = LAYER_DECODE_STATE_COMPLETE;
                    this.skipBytes = this.chunkHeader.chunkSize - bytesRead;
                    continue;
                
                case LAYER_DECODE_STATE_COMPLETE:
                    this.done = true;
            }
            break;
        }
        
        return block;
    }
}

class ChibiImageLayerDecoder extends ChibiLayerDecoder {
    /**
     * Create a layer using the properties previously read into this decoder.
     *
     * @returns {CPImageLayer}
     */
    createLayer() {
        let
            layer = new CPImageLayer(this.width, this.height, this.name);
        
        layer.setBlendMode(this.blendMode);
        layer.setAlpha(this.alpha);
        
        layer.setVisible(this.visible);
        layer.setClip(this.clip);
        
        layer.setMaskLinked(this.maskLinked);
        layer.setMaskVisible(this.maskVisible);
        layer.setLockAlpha(this.lockAlpha);
        
        return layer;
    }
}

class ChibiLayerGroupDecoder extends ChibiLayerDecoder {
    constructor(chunkHeader, width, height) {
        super(chunkHeader, width, height);
        
        this.childLayers = 0;
    }
    
    readFixedHeader(stream) {
        super.readFixedHeader.call(this, stream);
        
        this.childLayers = stream.readU32BE();
    }
    
    getFixedHeaderLen() {
        return super.getFixedHeaderLen.call(this) + 4;
    }
    
    /**
     * Create a group using the properties previously read into this decoder.
     *
     * @returns {CPLayerGroup}
     */
    createLayer() {
        let
            group = new CPLayerGroup(this.name, this.blendMode);
        
        group.setAlpha(this.alpha);
        
        group.setVisible(this.visible);
        group.setExpanded(this.expanded);
        
        group.setMaskLinked(this.maskLinked);
        group.setMaskVisible(this.maskVisible);
        
        return group;
    }
}

/**
 * Write the RGBA pixels of the given bitmap to the stream in ARGB order to match the Chibi specs.
 *
 * @param {ArrayDataStream} stream
 * @param {CPColorBmp} bitmap
 */
function writeColorBitmapToStream(stream, bitmap) {
    let
        pos = stream.pos,
        buffer = stream.data,
        bitmapData = bitmap.data;
    
    for (let i = 0; i < bitmapData.length; i += CPColorBmp.BYTES_PER_PIXEL) {
        buffer[pos++] = bitmapData[i + CPColorBmp.ALPHA_BYTE_OFFSET];
        buffer[pos++] = bitmapData[i + CPColorBmp.RED_BYTE_OFFSET];
        buffer[pos++] = bitmapData[i + CPColorBmp.GREEN_BYTE_OFFSET];
        buffer[pos++] = bitmapData[i + CPColorBmp.BLUE_BYTE_OFFSET];
    }
    
    stream.pos = pos;
}

/**
 * Write the 8-bit greyscale pixels of the given bitmap to the stream.
 *
 * @param {ArrayDataStream} stream
 * @param {CPGreyBmp} bitmap
 */
function writeMaskToStream(stream, bitmap) {
    stream.data.set(bitmap.data, stream.pos);
    stream.pos += bitmap.data.length;
}

class CPColorPixelsDecoder {
    /**
     * @param {CPColorBmp} destImage - Image to decode into.
     */
    constructor(destImage) {
        this.bytesRead = 0;
        this.bytesTotal = destImage.width * destImage.height * CPColorBmp.BYTES_PER_PIXEL;
        this.output = destImage.data;
        this.done = false;
    }
    
    /**
     * Decode A,R,G,B pixels from the given buffer into the R,G,B,A destination image.
     *
     * Returns the buffer with the read bytes removed from the front, or null if the buffer was read in its entirety.
     *
     * @param {Uint8Array} buffer
     */
    decode(buffer) {
        if (buffer == null) {
            return null;
        }
        
        let
            subpixel = this.bytesRead % CPColorBmp.BYTES_PER_PIXEL,
            dstPixelStartOffset = this.bytesRead - subpixel,
            bufferPos = 0,
            
            // Map from source channel order to CPLayer's dest order
            channelMap = [
                CPColorBmp.ALPHA_BYTE_OFFSET,
                CPColorBmp.RED_BYTE_OFFSET,
                CPColorBmp.GREEN_BYTE_OFFSET,
                CPColorBmp.BLUE_BYTE_OFFSET
            ];
        
        // The first pixel might be a partial one, since we might be continuing a pixel split over buffers
        for (; subpixel < CPColorBmp.BYTES_PER_PIXEL && bufferPos < buffer.length; subpixel++) {
            this.output[dstPixelStartOffset + channelMap[subpixel]] = buffer[bufferPos];
            bufferPos++;
        }
        
        this.bytesRead += bufferPos;
        
        // How many more pixels are we to read in this buffer?
        let
            bytesRemain = Math.min(buffer.length - bufferPos, this.bytesTotal - this.bytesRead) | 0,
            fullPixelsRemain = (bytesRemain / CPColorBmp.BYTES_PER_PIXEL) | 0,
            subpixelsRemain = bytesRemain % CPColorBmp.BYTES_PER_PIXEL;
        
        for (let i = 0; i < fullPixelsRemain; i++) {
            this.output[this.bytesRead + CPColorBmp.ALPHA_BYTE_OFFSET] = buffer[bufferPos];
            this.output[this.bytesRead + CPColorBmp.RED_BYTE_OFFSET] = buffer[bufferPos + 1];
            this.output[this.bytesRead + CPColorBmp.GREEN_BYTE_OFFSET] = buffer[bufferPos + 2];
            this.output[this.bytesRead + CPColorBmp.BLUE_BYTE_OFFSET] = buffer[bufferPos + 3];
            this.bytesRead += CPColorBmp.BYTES_PER_PIXEL;
            bufferPos += CPColorBmp.BYTES_PER_PIXEL;
        }
        
        // Read a fractional pixel at the end of the buffer
        dstPixelStartOffset = this.bytesRead;
        for (subpixel = 0; subpixel < subpixelsRemain; subpixel++) {
            this.output[dstPixelStartOffset + channelMap[subpixel]] = buffer[bufferPos];
            bufferPos++;
        }
        
        this.bytesRead += subpixelsRemain;
        
        if (this.bytesRead >= this.bytesTotal) {
            this.done = true;
        }
        
        if (bufferPos < buffer.length) {
            // Layer was completed before the end of the buffer, there is buffer left over for someone else to use
            return buffer.subarray(bufferPos);
        } else {
            // Buffer exhausted
            return null;
        }
    }
}

class CPMaskDecoder {
    /**
     *
     * @param {CPGreyBmp} mask - The destination to decode pixels into, must already be the correct size.
     */
    constructor(mask) {
        this.bytesRead = 0;
        this.bytesTotal = mask.width * mask.height;
        this.output = mask.data;
        this.done = false;
    }
    
    /**
     * Read 8-bit greyscale pixels from the given buffer into destination pixel array.
     *
     * Returns the buffer with the read bytes removed from the front, or null if the buffer was read in its entirety.
     *
     * @param {Uint8Array} buffer
     */
    decode(buffer) {
        if (buffer == null) {
            return null;
        }
        
        let
            // How many more pixels are we to read from this buffer?
            bytesRemain = Math.min(buffer.length, this.bytesTotal - this.bytesRead) | 0,
            dstIndex = this.bytesRead,
            srcIndex;
        
        for (srcIndex = 0; srcIndex < bytesRemain; srcIndex++, dstIndex++) {
            this.output[dstIndex] = buffer[srcIndex];
        }
        
        this.bytesRead = dstIndex;
        
        if (this.bytesRead >= this.bytesTotal) {
            this.done = true;
        }
        
        if (srcIndex < buffer.length) {
            // Layer was completed before the end of the buffer, there is buffer left over for someone else to use
            return buffer.subarray(srcIndex);
        } else {
            // Buffer exhausted
            return null;
        }
    }
}

/**
 * Make a 32-bit Chibi file-version value for storing in the file header.
 *
 * @param {int} major
 * @param {int} minor
 * @returns {int}
 */
function makeChibiVersion(major, minor) {
    return (major << 16) | minor;
}

function decomposeChibiVersion(version) {
    return {major: (version >> 16) & 0xFFFF, minor: version & 0xFFFF};
}

function chibiVersionToString(version) {
    let
        decomposed = decomposeChibiVersion(version);

    if (decomposed.major === 0 && decomposed.minor === 0) {
        return "ChibiPaint v0.0";
    } else {
        return "ChickenPaint v" + decomposed.major + "." + decomposed.minor;
    }
}

/**
 * Decides which Chibi file version will be required to support the features used by the given artwork, and returns
 * the corresponding version number header.
 *
 * @param {CPArtwork} artwork
 * @returns {int}
 */
function minimumVersionForArtwork(artwork) {
    for (let layer of artwork.getLayersRoot().getLinearizedLayerList(false)) {
        if (layer instanceof CPLayerGroup || layer.mask || layer.clip || layer.blendMode > CPBlend.LM_LAST_CHIBIPAINT || layer.blendMode === CPBlend.LM_MULTIPLY) {
            /*
             * We'll claim to be compatible with ChibiPaint (by not incrementing the major version number), since
             * ChibiPaint will at least be able to open the file, even though it'll lose information in doing so.
             */
            return makeChibiVersion(OUR_MAJOR_VERSION, OUR_MINOR_VERSION);
        }
    }
    
    return makeChibiVersion(0, 0); // The version used by the original ChibiPaint
}

function writeChunkHeader(stream, tag, chunkSize) {
    stream.writeString(tag);
    stream.writeU32BE(chunkSize);
}

/**
 * Allocate a fixed-size buffer to represent the chunk with the given tag and size, and return a stream which
 * points to the body of the chunk (with the chunk header already written).
 *
 * @param {string} chunkTag
 * @param {int} chunkBodySize
 * @returns {ArrayDataStream}
 */
function allocateChunkStream(chunkTag, chunkBodySize) {
    let
        buffer = new Uint8Array(ChibiChunkHeader.HEADER_LENGTH + chunkBodySize),
        stream = new ArrayDataStream(buffer);

    writeChunkHeader(stream, chunkTag, chunkBodySize);

    return stream;
}

/**
 * @param {CPArtwork} artwork
 * @param {int} version
 * @param {int} numLayers
 *
 * @returns Uint8Array
 */
function serializeFileHeaderChunk(artwork, version, numLayers) {
    let
        stream = allocateChunkStream(CHUNK_TAG_HEAD, CPChibiFileHeader.FIXED_HEADER_LENGTH);
    
    stream.writeU32BE(version);
    stream.writeU32BE(artwork.width);
    stream.writeU32BE(artwork.height);
    stream.writeU32BE(numLayers);

    return stream.getAsDataArray();
}

/**
 * @returns {Uint8Array}
 */
function serializeEndChunk() {
    return allocateChunkStream(CHUNK_TAG_END, 0).getAsDataArray();
}

/**
 * Serialize an layer's header and image data into a byte array buffer, and return it.
 *
 * @param {CPImageLayer|CPLayerGroup} layer
 */
function serializeLayerChunk(layer) {
	const
        isImageLayer = layer instanceof CPImageLayer,

		FIXED_HEADER_LENGTH = 4 * (isImageLayer ? 5 : 6),
        VARIABLE_HEADER_LENGTH = layer.name.length,
        COMBINED_HEADER_LENGTH = FIXED_HEADER_LENGTH + VARIABLE_HEADER_LENGTH,

        PAYLOAD_LENGTH = (isImageLayer ? layer.image.data.length : 0) + (layer.mask ? layer.mask.data.length : 0),

		stream = allocateChunkStream(
		    isImageLayer ? CHUNK_TAG_LAYER : CHUNK_TAG_GROUP,
            FIXED_HEADER_LENGTH + VARIABLE_HEADER_LENGTH + PAYLOAD_LENGTH
        );

	let
        layerFlags = 0,
        blendMode;

	if (layer.visible) {
		layerFlags |= LAYER_FLAG_VISIBLE;
	}
	if (isImageLayer && layer.clip) {
		layerFlags |= LAYER_FLAG_CLIP;
	}
	if (layer.mask) {
		layerFlags |= LAYER_FLAG_HAS_MASK;
	}
	if (layer.maskLinked) {
		layerFlags |= LAYER_FLAG_MASK_LINKED;
	}
	if (layer.maskVisible) {
		layerFlags |= LAYER_FLAG_MASK_VISIBLE;
	}
	if (layer.lockAlpha) {
		layerFlags |= LAYER_FLAG_ALPHA_LOCKED;
	}
	if (!isImageLayer && layer.expanded) {
		layerFlags |= LAYER_FLAG_EXPANDED;
	}

	if (layer.blendMode === CPBlend.LM_MULTIPLY2) {
	    /* So that ChibiPaint can still open files that use our new blending routine, re-label it as the original
	     * multiply mode, but add a flag so that we know it's supposed to use the new version.
	     */
	    blendMode = CPBlend.LM_MULTIPLY;
	    layerFlags |= LAYER_FLAG_MULTIPLY2;
    } else {
	    blendMode = layer.blendMode;
    }

	// Fixed length header portion
	stream.writeU32BE(COMBINED_HEADER_LENGTH); // Offset to layer data from start of header

	stream.writeU32BE(blendMode);
	stream.writeU32BE(layer.alpha);

	stream.writeU32BE(layerFlags);
	stream.writeU32BE(layer.name.length);

	if (!isImageLayer) {
		stream.writeU32BE(layer.layers.length);
	}

	// Variable length header portion
	stream.writeString(layer.name);

	// Payload:
    if (isImageLayer) {
		writeColorBitmapToStream(stream, layer.image);
    }

	if (layer.mask) {
		writeMaskToStream(stream, layer.mask);
	}

	return stream.getAsDataArray();
}

/**
 *
 * @param {Uint8Array} array
 * @returns {boolean}
 */
function hasChibiMagicMarker(array) {
	for (let i = 0; i < CHI_MAGIC.length; i++) {
		if (array[i] != CHI_MAGIC.charCodeAt(i)) {
			return false;
		}
	}
	
	return true;
}

/**
 * @typedef {Object} SerializeResult
 * @property {(Blob|Uint8Array)} SerializeResult.bytes - A Blob when called in the browser, or a Uint8Array in Node.
 * @property {String} SerializeResult.version - Version string of created artwork, "ChibiPaint v0.0" or "ChickenPaint v0.10"
 */

/**
 * Serialize the given artwork to Chibifile format.
 *
 * @param {CPArtwork} artwork
 * @param {?Object} options
 * @param {boolean} options.forceOldVersion - Mark this as a version 0.0 (ChibiPaint) drawing even if it uses new features
 *
 * @returns {Promise.<SerializeResult>}
 */
export function save(artwork, options) {
    options = options || {};

    return Promise.resolve().then(() => {
        const
            deflator = new pako.Deflate({
                level: 7
            }),
            /**
             * The fragments that make up the completed .chi file:
             * @type {Uint8Array[]}
             */
            blobParts = [],
            magic = new Uint8Array(CHI_MAGIC.length),
            layers = artwork.getLayersRoot().getLinearizedLayerList(false),
			version = options.forceOldVersion ? makeChibiVersion(0, 0) : minimumVersionForArtwork(artwork),
            versionString = chibiVersionToString(version);

        let
            layerWritePromise = Promise.resolve();

		deflator.onData = function(chunk) {
			blobParts.push(chunk);
		};

        // The magic file signature is not ZLIB compressed:
        for (let i = 0; i < CHI_MAGIC.length; i++) {
            magic[i] = CHI_MAGIC.charCodeAt(i);
        }
        blobParts.push(magic);

        // The rest gets compressed
        deflator.push(serializeFileHeaderChunk(artwork, version, layers.length), false);

        for (let layer of layers) {
            layerWritePromise = layerWritePromise.then(() => new Promise(function(resolve) {
                deflator.push(serializeLayerChunk(layer), false);

                // Insert a setTimeout between each serialized layer, so we can maintain browser responsiveness
                setTimeout(resolve, 10);
            }));
        }

        return layerWritePromise.then(() => new Promise((resolve, reject) => {
            deflator.onEnd = function(status) {
                if (status === 0) {
					if (typeof Blob !== "undefined") {
						// In the browser
						resolve({bytes: new Blob(blobParts, {type: "application/octet-stream"}), version: versionString});
					} else {
						// In Node.js
						let
							totalSize = blobParts.map(part => part.byteLength).reduce((total, size) => {
								return total + size;
							}, 0),

							buffer = new Uint8Array(totalSize),
							offset = 0;

						for (let part of blobParts) {
							buffer.set(part, offset);
							offset += part.byteLength;
						}

						resolve({bytes: buffer, version: versionString});
					}
				} else {
                    reject(status);
                }
            };

            deflator.push(serializeEndChunk(), true);
        }));
    });
}

/**
 * Attempt to load a chibifile from the given source.
 *
 * @param {ArrayBuffer|Blob} source
 * @param {?Object}        options
 * @param {boolean|string} options.upgradeMultiplyLayers - false to leave all multiply layers alone, "bake" to modify
 *                                                         pixel values to use LM_MULTIPLY2 blending. Anything else to
 *                                                         set blendMode to LM_MULTIPLY or LM_MULTIPLY2 as needed.
 *
 * @returns {Promise.<CPArtwork>}
 */
export function load(source, options) {
    options = options || {};

	const
		STATE_WAIT_FOR_CHUNK = 0,
		
		STATE_DECODE_FILE_HEADER = 1,
		
		STATE_DECODE_LAYER = 2,
		STATE_DECODE_GROUP = 3,
		
		STATE_SUCCESS = 45,
		STATE_FATAL = 5;
	
	let
		inflator = new pako.Inflate({}),
		state = STATE_WAIT_FOR_CHUNK,
		
		/**
		 * Destination artwork
		 *
		 * @type {CPArtwork}
		 */
		artwork = null,
		
		/**
		 * Group we're currently loading layers into
		 *
		 * @type {CPLayerGroup}
		 */
		destGroup = null,
		
		/**
		 * Decoder we're currently using to read a layer.
		 *
		 * @type {ChibiLayerDecoder}
		 */
		layerDecoder,
		
		/**
		 * Number of bytes we should skip in the stream before resuming decoding.
		 *
		 * @type {int}
		 */
		skipCount = 0,
		
		/**
		 * The overall file descriptor
		 *
		 * @type {CPChibiFileHeader}
		 */
		fileHeader = null,
		
		/**
		 *
		 * @type {ChibiChunkHeader}
		 */
		curChunkHeader = null,
		
		/**
		 * Here we store data that we weren't able to process in previous iterations due to not enough
		 * data being available at once.
		 *
		 * @type {Uint8Array}
		 */
		accumulator = null;
	
	/**
	 * Called by the Pako Zlib decompressor each time a block of data is ready for processing.
	 *
	 * @param {Uint8Array} block
	 */
	function processBlock(block) {
		let
			stream;
		
		accumulator = concatBuffers(accumulator, block);
		block = null;
		
		// Add a loop here so we can re-enter the switch with 'continue'
		while (true) {
			if (accumulator) {
				if (skipCount < accumulator.length) {
					accumulator = accumulator.subarray(skipCount);
					skipCount = 0;
				} else {
					skipCount -= accumulator.length;
					accumulator = null;
					break;
				}
			} else {
				break;
			}
			
			// Decode some data from the accumulator
			switch (state) {
				case STATE_WAIT_FOR_CHUNK:
					// Wait for whole chunk header to become available
					if (accumulator.length < ChibiChunkHeader.HEADER_LENGTH) {
						break;
					}
					
					// Decode chunk header
					stream = new ArrayDataStream(accumulator);
					curChunkHeader = new ChibiChunkHeader(stream);
					
					// Remove the chunk header from the start of the accumulator
					accumulator = accumulator.subarray(stream.pos);
					
					if (fileHeader) {
						if (curChunkHeader.chunkType == CHUNK_TAG_END) {
							state = STATE_SUCCESS;
						} else if (curChunkHeader.chunkType == CHUNK_TAG_LAYER) {
							state = STATE_DECODE_LAYER;
							layerDecoder = new ChibiImageLayerDecoder(curChunkHeader, fileHeader.width, fileHeader.height);
							continue;
						} else if (curChunkHeader.chunkType == CHUNK_TAG_GROUP) {
							state = STATE_DECODE_GROUP;
							layerDecoder = new ChibiLayerGroupDecoder(curChunkHeader, fileHeader.width, fileHeader.height);
							continue;
						} else {
							console.log("Unknown chunk type '" + curChunkHeader.chunkType + "', attempting to skip...");
							
							skipCount = curChunkHeader.chunkSize;
							continue;
						}
					} else if (curChunkHeader.chunkType == CHUNK_TAG_HEAD) {
						state = STATE_DECODE_FILE_HEADER;
						continue;
					} else {
						// File didn't start with image header chunk
						state = STATE_FATAL;
					}
					break;
				
				case STATE_DECODE_FILE_HEADER:
					// Wait for whole chunk to be available
					if (accumulator.length < curChunkHeader.chunkSize) {
						break;
					}
					
					stream = new ArrayDataStream(accumulator);
					fileHeader = new CPChibiFileHeader(stream);
					
					if (decomposeChibiVersion(fileHeader.version).major > MAX_SUPPORTED_MAJOR_VERSION) {
						state = STATE_FATAL; // the file version is higher than what we can deal with, bail out
						break;
					}
					
					artwork = new CPArtwork(fileHeader.width, fileHeader.height);
					destGroup = artwork.getLayersRoot();
					
					// Skip the header chunk along with any trailing bytes
					skipCount = curChunkHeader.chunkSize;
					state = STATE_WAIT_FOR_CHUNK;
					continue;
				
				case STATE_DECODE_LAYER:
					accumulator = layerDecoder.decode(accumulator);
					
					if (layerDecoder.done) {
						artwork.addLayerObject(destGroup, layerDecoder.layer);
						state = STATE_WAIT_FOR_CHUNK;
						continue;
					}
					break;
				
				case STATE_DECODE_GROUP:
					accumulator = layerDecoder.decode(accumulator);
					
					if (layerDecoder.done) {
						artwork.addLayerGroupObject(destGroup, layerDecoder.layer, layerDecoder.childLayers);
						
						state = STATE_WAIT_FOR_CHUNK;
						continue;
					}
					break;
			}
			
			break;
		}
	}
	
	return new Promise(function(resolve) {
		if (source instanceof ArrayBuffer) {
			resolve(source);
		} else {
		    // Assume source is a Blob
			let
				reader = new FileReader();
			
			reader.onload = function() {
			    resolve(this.result);
			};
			
			reader.readAsArrayBuffer(source);
        }
    }).then(arrayBuffer => new Promise(function(resolve, reject) {
        let
            byteArray = new Uint8Array(arrayBuffer);
        
		if (!hasChibiMagicMarker(byteArray)) {
			reject("This doesn't appear to be a ChibiPaint layers file, is it damaged?");
			return;
		}
		
		// Remove the magic header
		byteArray = byteArray.subarray(CHI_MAGIC.length);
		
		inflator.onData = processBlock;
		
		inflator.onEnd = function (status) {
			if (status === 0 && state == STATE_SUCCESS) {
			    if (options.upgradeMultiplyLayers !== false && fileHeader.version < makeChibiVersion(OUR_MAJOR_VERSION, OUR_MINOR_VERSION)) {
					artwork.upgradeMultiplyLayers(options.upgradeMultiplyLayers);
                }

				artwork.selectTopmostVisibleLayer();
				
				resolve(artwork);
			} else {
				reject("Fatal error decoding ChibiFile: " + status);
			}
		};

		// Begin decompression/decoding
		inflator.push(byteArray, true);
	}));
}
