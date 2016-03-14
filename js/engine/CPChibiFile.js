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

        stream.skip(chunk.chunkSize - 16);
     }

     function CPChibiChunk(stream) {
         this.chunkType = new Array(4);

         for (var i = 0; i < this.chunkType.length; i++) {
             this.chunkType[i] = stream.readByte();
         }

         this.chunkSize = stream.readU32BE();

         if (stream.eof) {
             throw "Truncated chunk";
         }

         this.is = function(chunkTagString) {
             for (var i = 0; i < this.chunkType.length; i++) {
                 if (this.chunkType[i] != chunkTagString.charCodeAt(i)) {
                     return false;
                 }
             }

             return true;
         };
     }

    var
        CHI_MAGIC = "CHIBIOEK",

        CHUNK_TAG_HEAD = "HEAD",
        CHUNK_TAG_LAYER = "LAYR",
        CHUNK_TAG_END = "ZEND";


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
        for (var i = 0; i < layer.data.length; i += CPColorBmp.BYTES_PER_PIXEL) {
            buffer[pos++] = layer.data[i + CPColorBmp.ALPHA_BYTE_OFFSET];
            buffer[pos++] = layer.data[i + CPColorBmp.RED_BYTE_OFFSET];
            buffer[pos++] = layer.data[i + CPColorBmp.GREEN_BYTE_OFFSET];
            buffer[pos++] = layer.data[i + CPColorBmp.BLUE_BYTE_OFFSET];
        }

        return buffer;
    }

    /**
     * Serialize the given artwork to Chibifile format. Returns a promise which resolves to the serialized Blob.
     */
    this.serialize = function(artwork) {
        return new Promise(function(resolve, reject) {
            var
                deflator = new pako.Deflate({
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
                    
                    resolve(new Blob(blobParts, {type: "application/octect-stream"}));
                } else {
                    deflator.push(serializeLayerChunk(layers[i++]), false);
                    
                    setTimeout(serializeLayer, 10);
                }
            }
            
            setTimeout(serializeLayer, 10);
        });
    };

    function readLayer(stream, chunk, artwork) {
        var
            layer = new CPLayer(artwork.width, artwork.height),

            payloadOffset = stream.readU32BE();

        layer.blendMode = stream.readU32BE();
        layer.alpha = stream.readU32BE();
        layer.visible = (stream.readU32BE() & 1) != 0;

        var
            titleLength = stream.readU32BE();

        layer.name = stream.readString(titleLength);

        // Skip to the pixel data (allows additional header fields to be added that we don't yet support)
        stream.skip(payloadOffset - 20 - titleLength);

        layer.loadFromARGB(stream.readBytes(layer.width * layer.height * 4));

        artwork.addLayerObject(layer);

        // Skip any trailing data to reach the end of the chunk
        stream.skip(chunk.chunkSize - payloadOffset - layer.width * layer.height * 4);
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
     * Attempt to load a chibifile from the given arraybuffer.
     *
     * @returns A CPArtwork on success, or null on failure.
     */
    this.read = function(arrayBuffer) {
        arrayBuffer = new Uint8Array(arrayBuffer);

        try {
            if (!hasChibiMagicMarker(arrayBuffer)) {
                return null; // not a ChibiPaint file
            }

            var
                // Remove the magic header and decompress the rest of the file
                decompressed = pako.inflate(arrayBuffer.subarray(CHI_MAGIC.length)),

                stream = new ArrayDataStream(decompressed),

                headChunk = new CPChibiChunk(stream);

            if (!headChunk.is(CHUNK_TAG_HEAD)) {
                return null; // not a valid file
            }

            var
                header = new CPChibiHeader(stream, headChunk);

            if ((header.version >>> 16) > 0) {
                return null; // the file version is higher than what we can deal with, bail out
            }

            var
                artwork = new CPArtwork(header.width, header.height),
                chunkNum = 0;

            try {
                while (true) {
                    var
                        chunk = new CPChibiChunk(stream);

                    if (chunk.is(CHUNK_TAG_END)) {
                        break;
                    } else if (chunk.is(CHUNK_TAG_LAYER)) {
                        readLayer(stream, chunk, artwork);
                    } else {
                        console.log("Chunk #" + chunkNum + " has unknown chunk type, attempting to skip...");
                        stream.skip(chunk.chunkSize);
                    }

                    chunkNum++;
                }
            } catch (e) {
                //Attempt to load corrupted CHI files by ignoring unexpected EOF
                console.log(e);
            }

            artwork.setActiveLayerIndex(artwork.getTopmostVisibleLayer());

            return artwork;
        } catch (e) {
            console.log(e);
            return null;
        }
    };
}
