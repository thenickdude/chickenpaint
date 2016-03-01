"use strict"

function CPChibiFile() {
    
    function CPChibiHeader(stream, chunk) {
        this.version = stream.readU32();
        this.width = stream.readU32();
        this.height = stream.readU32();
        this.layersNb = stream.readU32();

        stream.skip(chunk.chunkSize - 16);
     }

     function CPChibiChunk(stream) {
         this.chunkType = new Array(4);

         for (var i = 0; i < this.chunkType.length; i++) {
             this.chunkType[i] = stream.readByte();
         }
         
         this.chunkSize = stream.readU32();

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
    
/*
    static public boolean write(OutputStream os, CPArtwork a) {
        try {
            writeMagic(os);
            os.flush();

            Deflater def = new Deflater(7);
            DeflaterOutputStream dos = new DeflaterOutputStream(os, def);
            // OutputStream dos = os;

            writeHeader(dos, a);

            for (CPLayer l : a.layers) {
                writeLayer(dos, l);
            }

            writeEnd(dos);

            dos.flush();
            dos.close();
            return true;
        } catch (IOException e) {
            return false;
        }
    }

    static public void writeMagic(OutputStream os) throws IOException {
        os.write(CHI_MAGIC);
    }

    static public void writeEnd(OutputStream os) throws IOException {
        os.write(ZEND);
        writeInt(os, 0);
    }

    static public void writeHeader(OutputStream os, CPArtwork a) throws IOException {
        os.write(HEAD); // Chunk ID
        writeInt(os, 16); // ChunkSize

        writeInt(os, 0); // Current Version: Major: 0 Minor: 0
        writeInt(os, a.width);
        writeInt(os, a.height);
        writeInt(os, a.getLayersNb());
    }

    static public void writeLayer(OutputStream os, CPLayer l) throws IOException {
        byte[] title = l.name.getBytes("UTF-8");

        os.write(LAYR); // Chunk ID
        writeInt(os, 20 + l.data.length * 4 + title.length); // ChunkSize

        writeInt(os, 20 + title.length); // Data offset from start of header
        writeInt(os, l.blendMode); // layer blend mode
        writeInt(os, l.alpha); // layer opacity
        writeInt(os, l.visible ? 1 : 0); // layer visibility and future flags

        writeInt(os, title.length);
        os.write(title);

        writeIntArray(os, l.data);
    }
*/
    function readLayer(stream, chunk, artwork) {
        var
            layer = new CPLayer(artwork.width, artwork.height),

            payloadOffset = stream.readU32();
        
        layer.blendMode = stream.readU32();
        layer.alpha = stream.readU32();
        layer.visible = (stream.readU32() & 1) != 0;

        var
            titleLength = stream.readU32();
        
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
    
    this.read = function(arrayBuffer) {
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

            return artwork;
        } catch (e) {
            console.log(e);
            return null;
        }
    };
}
