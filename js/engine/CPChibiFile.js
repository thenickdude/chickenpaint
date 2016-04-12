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

import CPArtwork from "./CPArtwork";
import CPLayer from "./CPLayer";
import CPColorBmp from "./CPColorBmp";
import ArrayDataStream from "../util/ArrayDataStream";

export default function CPChibiFile() {

    function CPChibiHeader(stream, chunk) {
        this.version = stream.readU32BE();
        this.width = stream.readU32BE();
        this.height = stream.readU32BE();
        this.layersNb = stream.readU32BE();
    }
    
    CPChibiHeader.FIXED_HEADER_LENGTH = 4 * 4;

    function CPChibiChunkHeader(stream) {
        var
            chunkType = new Array(4);

        for (var i = 0; i < chunkType.length; i++) {
            chunkType[i] = String.fromCharCode(stream.readByte());
        }
        
        this.chunkType = chunkType.join("");
        this.chunkSize = stream.readU32BE();

        if (stream.eof) {
            throw "Truncated chunk";
        }
    }
    
    function CPChibiLayerChunkHeader() {
        var
            payloadOffset,
            titleLength;
        
        this.readFixedHeader = function(stream) {
            payloadOffset = stream.readU32BE();
    
            this.blendMode = stream.readU32BE();
            this.alpha = stream.readU32BE();
            this.visible = (stream.readU32BE() & 1) != 0;
    
            titleLength = stream.readU32BE();
        };
        
        /* 
         * After reading the fixed header, use this function to find out how many more bytes of header
         * need to be read.
         */
        this.getVariableHeaderLen = function() {
            return payloadOffset - CPChibiLayerChunkHeader.FIXED_HEADER_LENGTH;
        };
        
        this.getTotalHeaderLen = function() {
            return CPChibiLayerChunkHeader.FIXED_HEADER_LENGTH + this.getVariableHeaderLen();
        };
        
        this.readVariableHeader = function(stream) {
            this.name = stream.readString(titleLength);
            
            // Skip to the pixel data (allows additional header fields to be added that we don't yet support)
            stream.skip(payloadOffset - titleLength - CPChibiLayerChunkHeader.FIXED_HEADER_LENGTH);
        };
    }
    
    // The size of the initial, fixed-length portion of the header
    CPChibiLayerChunkHeader.FIXED_HEADER_LENGTH = 4 * 5;

    const
        CHI_MAGIC = "CHIBIOEK",

        CHUNK_TAG_HEAD = "HEAD",
        CHUNK_TAG_LAYER = "LAYR",
        CHUNK_TAG_END = "ZEND",
        
        BYTES_PER_PIXEL = CPColorBmp.BYTES_PER_PIXEL,
        ALPHA_BYTE_OFFSET = CPColorBmp.ALPHA_BYTE_OFFSET,
        RED_BYTE_OFFSET = CPColorBmp.RED_BYTE_OFFSET,
        GREEN_BYTE_OFFSET = CPColorBmp.GREEN_BYTE_OFFSET,
        BLUE_BYTE_OFFSET = CPColorBmp.BLUE_BYTE_OFFSET;

    function serializeEndChunk() {
        var
            buffer = new Uint8Array(CHUNK_TAG_END.length + 4),
            stream = new ArrayDataStream(buffer);

        stream.writeString(CHUNK_TAG_END);
        stream.writeU32BE(0);

        return stream.getAsDataArray();
    }

    function serializeHeaderChunk(artwork) {
        var
            buffer = new Uint8Array(CHUNK_TAG_HEAD.length + 4 * 5),
            stream = new ArrayDataStream(buffer);

        stream.writeString(CHUNK_TAG_HEAD);
        stream.writeU32BE(16); // ChunkSize

        stream.writeU32BE(0); // Current Version: Major: 0 Minor: 0
        stream.writeU32BE(artwork.width);
        stream.writeU32BE(artwork.height);
        stream.writeU32BE(artwork.getLayerCount());

        return stream.getAsDataArray();
    }

    function serializeLayerChunk(layer) {
        var
            chunkSize = 20 + layer.name.length + layer.data.length,

            buffer = new Uint8Array(CHUNK_TAG_LAYER.length + 4 + chunkSize),
            stream = new ArrayDataStream(buffer),
            pos;

        stream.writeString(CHUNK_TAG_LAYER); // Chunk ID
        stream.writeU32BE(chunkSize); // ChunkSize

        stream.writeU32BE(20 + layer.name.length); // Offset to layer data from start of header

        stream.writeU32BE(layer.blendMode);
        stream.writeU32BE(layer.alpha);
        stream.writeU32BE(layer.visible ? 1 : 0); // layer visibility and future flags

        stream.writeU32BE(layer.name.length);
        stream.writeString(layer.name);

        // Convert layer bytes from RGBA to ARGB order to match the Chibi specs
        pos = stream.pos;
        for (var i = 0; i < layer.data.length; i += BYTES_PER_PIXEL) {
            buffer[pos++] = layer.data[i + ALPHA_BYTE_OFFSET];
            buffer[pos++] = layer.data[i + RED_BYTE_OFFSET];
            buffer[pos++] = layer.data[i + GREEN_BYTE_OFFSET];
            buffer[pos++] = layer.data[i + BLUE_BYTE_OFFSET];
        }

        return buffer;
    }

    /**
     * Serialize the given artwork to Chibifile format. Returns a promise which resolves to the serialized Blob.
     */
    this.serialize = function(artwork) {
        return new Promise(function(resolve, reject) {
            var
                deflator = new window.pako.Deflate({
                    level: 7
                }),
                blobParts = [],
                magic = new Uint8Array(CHI_MAGIC.length);
    
            // The magic file signature is not ZLIB compressed:
            for (var i = 0; i < CHI_MAGIC.length; i++) {
                magic[i] = CHI_MAGIC.charCodeAt(i);
            }
            blobParts.push(magic);
    
            // The rest gets compressed
            deflator.push(serializeHeaderChunk(artwork), false);
    
            var
                layers = artwork.getLayers(),
                i = 0;
            
            // Insert a settimeout between each serialized layer, so we can maintain browser responsiveness
            
            function serializeLayer() {
                if (i == layers.length) {
                    deflator.push(serializeEndChunk(artwork), true);
                    
                    blobParts.push(deflator.result);
                    
                    resolve(new Blob(blobParts, {type: "application/octet-stream"}));
                } else {
                    deflator.push(serializeLayerChunk(layers[i++]), false);
                    
                    setTimeout(serializeLayer, 10);
                }
            }
            
            setTimeout(serializeLayer, 10);
        });
    };

    function hasChibiMagicMarker(array) {
        for (var i = 0; i < CHI_MAGIC.length; i++) {
            if (array[i] != CHI_MAGIC.charCodeAt(i)) {
                return false;
            }
        }

        return true;
    }

    /**
     * Concat two Uint8Arrays to make a new one and return it.
     * 
     * Either one may be set to null. If either one is null, the other is returned. If both are null, null is
     * returned.
     */
    function concatBuffers(one, two) {
        if (one == null || one.length == 0) {
            return two;
        }
        if (two == null || two.length == 0) {
            return one;
        }
        
        var
            result = new Uint8Array(one.length + two.length);
        
        result.set(one, 0);
        result.set(two, one.length);
        
        return result;
    }
    
    /**
     * Attempt to load a chibifile from the given arraybuffer.
     *
     * @returns A CPArtwork on success, or null on failure.
     */
    this.read = function(arrayBuffer) {
        const
            STATE_WAIT_FOR_CHUNK               = 0,
            STATE_DECODE_IMAGE_HEADER          = 1,
            STATE_DECODE_LAYER_HEADER_FIXED    = 2,
            STATE_DECODE_LAYER_HEADER_VARIABLE = 3,
            STATE_DECODE_LAYER                 = 4,
            STATE_SKIP_TRAILING_CHUNK_BYTES    = 5,
            STATE_SUCCESS                      = 6,
            STATE_FATAL                        = 10;
        
        var
            pako = new window.pako.Inflate({}),
            state = STATE_WAIT_FOR_CHUNK,
            artwork = null,
            layerHeader, layer, 
            layerBytesRead, layerBytesTotal, skipCount,
            headerChunk = null, header = null,
            chunk = null,
            buffer = null;
        
        /**
         * Decode A,R,G,B pixels from the given buffer into the R,G,B,A pixel array given by layerPix.
         * 
         * The layerBytesRead and layerBytesTotal variables are used to keep track of the decode process and to 
         * limit the number of bytes read, respectively.
         * 
         * Returns the buffer with the read bytes removed from the front, or null if the buffer was read in its entirety.
         */
        function decodePixels(buffer, layerPix) {
            var
                subpixel = layerBytesRead % BYTES_PER_PIXEL,
                dstPixelStartOffset = layerBytesRead - subpixel,
                bufferPos = 0,
                
                // Map from source channel order to CPLayer's dest order
                channelMap = [
                    ALPHA_BYTE_OFFSET, RED_BYTE_OFFSET, GREEN_BYTE_OFFSET, BLUE_BYTE_OFFSET
                ];
            
            // The first pixel might be a partial one since we might be continuing a pixel split over buffers
            for (; subpixel < BYTES_PER_PIXEL && bufferPos < buffer.length; subpixel++) {
                layerPix[dstPixelStartOffset + channelMap[subpixel]] = buffer[bufferPos];
                layerBytesRead++;
                bufferPos++;
            }
            
            // How many more pixels are we to read in this buffer?
            var
                bytesRemain = Math.min(buffer.length - bufferPos, layerBytesTotal - layerBytesRead) | 0,
                fullPixelsRemain = (bytesRemain / BYTES_PER_PIXEL) | 0,
                subpixelsRemain = bytesRemain % BYTES_PER_PIXEL;
            
            for (var i = 0; i < fullPixelsRemain; i++) {
                layerPix[layerBytesRead + ALPHA_BYTE_OFFSET] = buffer[bufferPos];
                layerPix[layerBytesRead + RED_BYTE_OFFSET] = buffer[bufferPos + 1];
                layerPix[layerBytesRead + GREEN_BYTE_OFFSET] = buffer[bufferPos + 2];
                layerPix[layerBytesRead + BLUE_BYTE_OFFSET] = buffer[bufferPos + 3];
                layerBytesRead += BYTES_PER_PIXEL;
                bufferPos += BYTES_PER_PIXEL;
            }
            
            // Read a fractional pixel at the end of the buffer
            dstPixelStartOffset = layerBytesRead;
            for (subpixel = 0; subpixel < subpixelsRemain; subpixel++) {
                layerPix[dstPixelStartOffset + channelMap[subpixel]] = buffer[bufferPos];
                layerBytesRead++;
                bufferPos++;
            }
            
            if (bufferPos < buffer.length) {
                // Layer was completed before the end of the buffer, there is buffer left over for someone else to use
                return buffer.subarray(bufferPos);
            } else {
                // Buffer exhausted
                return null;
            }
        }
        
        function processBlock(block) {
            var 
                stream;
            
            // Add a loop here so we can re-enter the switch with 'continue'
            while (true) {
                switch (state) {
                    case STATE_WAIT_FOR_CHUNK:
                        buffer = concatBuffers(buffer, block);
                        block = null;
                        
                        // Wait for whole chunk header to become available
                        if (buffer.length < 8) {
                            break;
                        }
                        
                        // Decode chunk header
                        stream = new ArrayDataStream(buffer);
                        chunk = new CPChibiChunkHeader(stream);
                        
                        // Remove the chunk header from the start of the buffer
                        buffer = buffer.subarray(stream.pos);
                        
                        if (headerChunk) {
                            if (chunk.chunkType == CHUNK_TAG_END) {
                                state = STATE_SUCCESS;
                                break;
                            } else if (chunk.chunkType == CHUNK_TAG_LAYER) {
                                state = STATE_DECODE_LAYER_HEADER_FIXED;
                            } else {
                                console.log("Unknown chunk type '" + chunk.chunkType + "', attempting to skip...");
                                
                                block = buffer;
                                buffer = null;
                                
                                skipCount = chunk.chunkSize;
                                state = STATE_SKIP_TRAILING_CHUNK_BYTES;
                            }
                        } else if (chunk.chunkType == CHUNK_TAG_HEAD) {
                            headerChunk = chunk;
                            
                            // Try to decode the header
                            state = STATE_DECODE_IMAGE_HEADER;
                            continue;
                        } else {
                            // File didn't start with image header chunk
                            state = STATE_FATAL;
                        }
                    break;
                    case STATE_DECODE_IMAGE_HEADER:
                        buffer = concatBuffers(buffer, block);
                        block = null;
                        
                        // Wait for whole chunk to be available
                        if (buffer.length < headerChunk.chunkSize) {
                            break;
                        }
                        
                        stream = new ArrayDataStream(buffer);
                        header = new CPChibiHeader(stream, headerChunk);
                        
                        if ((header.version >>> 16) > 0) {
                            state = STATE_FATAL; // the file version is higher than what we can deal with, bail out
                            break;
                        }
                        
                        artwork = new CPArtwork(header.width, header.height);
                        
                        block = buffer;
                        buffer = null;
                        
                        skipCount = headerChunk.chunkSize; // Skip the header chunk along with any trailing bytes
                        state = STATE_SKIP_TRAILING_CHUNK_BYTES;
                        continue;
                    break;
                    case STATE_DECODE_LAYER_HEADER_FIXED:
                        buffer = concatBuffers(buffer, block);
                        block = null;
                        
                        // Wait for first part of header to arrive
                        if (buffer.length < CPChibiLayerChunkHeader.FIXED_HEADER_LENGTH) {
                            break;
                        }
                        
                        layerHeader = new CPChibiLayerChunkHeader();
                        
                        stream = new ArrayDataStream(buffer);
                        layerHeader.readFixedHeader(stream);
                        
                        buffer = buffer.subarray(stream.pos);
                        
                        state = STATE_DECODE_LAYER_HEADER_VARIABLE
                        continue;
                    break;
                    case STATE_DECODE_LAYER_HEADER_VARIABLE:
                        buffer = concatBuffers(buffer, block);
                        block = null;
                        
                        // Wait for variable part of header to arrive
                        if (buffer.length < layerHeader.getVariableHeaderLen()) {
                            break;
                        }
                        
                        stream = new ArrayDataStream(buffer);
                        layerHeader.readVariableHeader(stream);
                        
                        buffer = buffer.subarray(stream.pos);
                        
                        layer = new CPLayer(header.width, header.height, layerHeader.name);
                        layer.blendMode = layerHeader.blendMode;
                        layer.alpha = layerHeader.alpha;
                        layer.visible = layerHeader.visible;
                        
                        layerBytesRead = 0;
                        layerBytesTotal = header.width * header.height * BYTES_PER_PIXEL;
                        
                        /* 
                         * While decoding layers, we won't keep a persistent buffer around, so if we have any
                         * bytes left over, provide them to the next state as if they were a newly inflated block.
                         */
                        block = buffer;
                        buffer = null;
                        
                        state = STATE_DECODE_LAYER;
                        continue;
                    break;
                    case STATE_DECODE_LAYER:
                        /* 
                         * When decoding layer data, we never concat blocks together, we are capable of decoding
                         * partial pixels that get split over block boundaries. So we don't use 'buffer' to accumulate
                         * data, and only read from incoming 'block's.
                         */ 
                        if (block != null) {
                            block = decodePixels(block, layer.data);
                            
                            if (layerBytesRead >= layerBytesTotal) {
                                artwork.addLayerObject(layer);
                                
                                // Skip any trailing bytes in the layer chunk
                                skipCount = chunk.chunkSize - layerHeader.getTotalHeaderLen() - layerBytesTotal;
                                state = STATE_SKIP_TRAILING_CHUNK_BYTES;
                                continue;
                            }
                        }
                    break;
                    case STATE_SKIP_TRAILING_CHUNK_BYTES:
                        if (block) {
                            if (skipCount < block.length) {
                                block = block.subarray(skipCount);
                                skipCount = 0;
                            } else {
                                skipCount -= block.length;
                                block = null;
                            }
                        }
                        
                        if (skipCount == 0) {
                            state = STATE_WAIT_FOR_CHUNK;
                            continue;
                        }
                    break;
                }
                
                break;
            }
        }
        
        arrayBuffer = new Uint8Array(arrayBuffer);

        if (!hasChibiMagicMarker(arrayBuffer)) {
            return null; // not a ChibiPaint file
        }
        
        // Remove the magic header
        arrayBuffer = arrayBuffer.subarray(CHI_MAGIC.length);
        
        pako.onData = processBlock;
        
        pako.onEnd = function(status) {
            if (status === 0 && state == STATE_SUCCESS) {
                artwork.setActiveLayerIndex(artwork.getTopmostVisibleLayer());
                
                this.result = artwork;
            } else {
                console.log("Fatal error decoding ChibiFile");
                
                this.result = null;
            }
        };

        // Begin decompression/decoding
        pako.push(arrayBuffer);
        
        return pako.result;
    };
}
