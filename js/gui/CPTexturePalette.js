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

import $ from "jquery";
import EventEmitter from "wolfy87-eventemitter";

import CPGreyBmp from '../engine/CPGreyBmp.js';
import CPLookUpTable from '../engine/CPLookUpTable.js';

import CPPalette from './CPPalette.js';
import CPSlider from './CPSlider.js';

import {_} from "../languages/lang";

/**
 *
 * @param {HTMLInputElement} checkbox - Must have a unique ID set
 * @param {string} title
 *
 * @returns {HTMLElement}
 */
function wrapBootstrapCheckbox(checkbox, title) {
    let
        div = document.createElement("div"),
        label = document.createElement("label");

    div.className = "form-check";

    checkbox.className = "form-check-input";

    label.className = "form-check-label";
    label.setAttribute("for", checkbox.id);

    label.appendChild(checkbox);
    label.appendChild(document.createTextNode(title));

    div.appendChild(checkbox);
    div.appendChild(label);

    return div;
}

function loadTextures(textureFilename, width, height, textureCount, then) {
    let
        img = new Image(),
        textures = [];
    
    img.onload = function() {
        let
            canvas = document.createElement("canvas"),
            canvasContext = canvas.getContext("2d",{
				willReadFrequently: true,
			});
        
        canvas.width = img.width;
        canvas.height = img.height;
        
        for (let i = 0; i < textureCount; i++) {
            canvasContext.drawImage(img, 0, i * height, width, height, 0, 0, width, height);
            
            try {
                let
                    imageData = canvasContext.getImageData(0, 0, width, height),
                    texture = new CPGreyBmp(width, height, 8);
                
                // Take just the red channel from the image to form the new grayscale texture
                for (let j = 0; j < width * height; j++) {
                    texture.data[j] = imageData.data[j * 4];
                }
                
                textures.push(texture);
            } catch (e) {
                // Quietly ignore errors that occur while loading the image (e.g. cross-origin security failures)
                console.log(e);
            }
        }
        
        then(textures);
    };
    
    img.src = textureFilename;
}

export default function CPTexturePalette(controller) {
    CPPalette.call(this, controller, "textures", "Textures");
    
    let
        TEXTURE_PREVIEW_SIZE = 64,
        TEXTURE_SWATCH_BUTTON_SIZE = 32,

        /**
         * @type {CPGreyBmp}
         */
        selectedTexture,

        /**
         * @type {CPGreyBmp}
         */
        processedTexture,

        mirror = false, inverse = false,
        
        brightness = 0.0, contrast = 0.0,
        optionsPanel,
        texturesPanel = document.createElement("div"),
        
        body = this.getBodyElement();

    /**
     * Add an array of textures to the global texture list, and add swatches for them to the UI.
     */
    function addTextures(newTextures) {
        for (let i = 0; i < newTextures.length; i++) {
            let
                texture = newTextures[i],
                button = new CPTextureSwatch(texture, TEXTURE_SWATCH_BUTTON_SIZE, TEXTURE_SWATCH_BUTTON_SIZE);
            
            button.on("click", function() {
                selectedTexture = this.texture;
                updateSelectedTexture();
            });
            
            texturesPanel.appendChild(button.getElement());
        }
    }
    
    /**
     * Generate and return an array of procedurally-generated textures
     * 
     * @returns CPGreyBmp[]
     */
    function makeProceduralTextures() {
        let
            result = [null];
        
        let
            texture = new CPGreyBmp(2, 2, 8);
        texture.data[0] = 0xFF;
        texture.data[3] = 0xFF;
        result.push(texture);

        result.push(makeDotTexture(2));
        result.push(makeDotTexture(3));
        result.push(makeDotTexture(4));
        result.push(makeDotTexture(6));
        result.push(makeDotTexture(8));

        result.push(makeVertLinesTexture(1, 2));
        result.push(makeVertLinesTexture(2, 4));

        result.push(makeHorizLinesTexture(1, 2));
        result.push(makeHorizLinesTexture(2, 4));

        result.push(makeCheckerBoardTexture(2));
        result.push(makeCheckerBoardTexture(4));
        result.push(makeCheckerBoardTexture(8));
        result.push(makeCheckerBoardTexture(16));
        
        return result;
    }

    /**
     * @param size int
     * 
     * @returns CPGreyBmp
     */
    function makeDotTexture(size) {
        let
            texture = new CPGreyBmp(size, size, 8);
        
        for (let i = 1; i < size * size; i++) {
            texture.data[i] = 0xFF;
        }
        return texture;
    }

    /**
     * Make a checkerboard texture of the given dimensions.
     * 
     * @param size int
     * 
     * @returns CPGreyBmp
     */
    function makeCheckerBoardTexture(size) {
        let
            textureSize = 2 * size,
            texture = new CPGreyBmp(textureSize, textureSize, 8);
        
        for (let i = 0; i < textureSize; i++) {
            for (let j = 0; j < textureSize; j++) {
                texture.data[i + j * textureSize] = ((~~(i / size) + ~~(j / size)) % 2 == 0) ? 0 : 0xFF;
            }
        }
        
        return texture;
    }

     /**
      * Make a texture consisting of a series of evenly-spaced vertical lines
      * 
      * @param lineSize int
      * @param size int
      * 
      * @returns CPGreyBmp
      */
     function makeVertLinesTexture(lineSize, size) {
        let
            texture = new CPGreyBmp(size, size, 8);
        
        for (let i = 0; i < size * size; i++) {
            if (~~(i % size) >= lineSize) {
                texture.data[i] = 0xFF;
            }
        }
        
        return texture;
    }

     /**
      * Make a texture consisting of a series of evenly-spaced horizontal lines
      *
      * @param lineSize int
      * @param size int
      * 
      * @returns CPGreyBmp
      */
    function makeHorizLinesTexture(lineSize, size) {
        let
            texture = new CPGreyBmp(size, size, 8);
        
        for (let i = 0; i < size * size; i++) {
            if (i / size >= lineSize) {
                texture.data[i] = 0xFF;
            }
        }
        
        return texture;
    }

    function updateSelectedTexture() {
        if (selectedTexture != null) {
            processedTexture = selectedTexture.clone();

            if (mirror) {
                processedTexture.mirrorHorizontally();
            }

            let
                lut = new CPLookUpTable();
            
            lut.loadBrightnessContrast(brightness, contrast);
            
            if (inverse) {
                lut.invert();
            }

            processedTexture.applyLUT(lut);
        } else {
            processedTexture = null;
        }

        controller.getArtwork().setBrushTexture(processedTexture);
        
        if (optionsPanel != null) {
            optionsPanel.updateTexture();
        }
    }
    
    function CPTextureOptionsPanel() {
        let
            panel = document.createElement("div"),
        
            cbInverse = document.createElement("input"),
            cbMirror = document.createElement("input"),
            
            slBrightness = new CPSlider(0, 200, true),
            slContrast = new CPSlider(0, 200, true),
            
            sampleSwatch = new CPTextureSwatch(null, TEXTURE_PREVIEW_SIZE, TEXTURE_PREVIEW_SIZE),
            btnCustomize = document.createElement("button"),
            
            textureControlsPanel;
        
        function updatePopoverControls() {
            cbInverse.checked = inverse;
            cbMirror.checked = mirror;
            
            slBrightness.setValue(brightness * 100 + 100);
            slContrast.setValue(contrast * 100 + 100);
        }
        
        function buildTextureControlsPanel() {
            let
                panel = document.createElement("div");

            panel.className = "chickenpaint-texture-controls";

            cbInverse.id = "chickenpaint-chk-texture-invert";
            cbInverse.type = "checkbox";
            cbInverse.addEventListener("click", function(e) {
                inverse = this.checked;
                updateSelectedTexture();
            });
            
            panel.appendChild(wrapBootstrapCheckbox(cbInverse, _("Inverse")));

            cbMirror.id = "chickenpaint-chk-texture-mirror";
            cbMirror.type = "checkbox";
            cbMirror.addEventListener("click", function(e) {
                mirror = this.checked;
                updateSelectedTexture();
            });
            
            panel.appendChild(wrapBootstrapCheckbox(cbMirror, _("Mirror")));

            slBrightness.title = function(value) {
                return _("Brightness") + ": " + (value - 100) + "%";
            };
            
            slBrightness.on("valueChange", function(value) {
                brightness = (value - 100) / 100.0;
                
                updateSelectedTexture();
            });

            panel.appendChild(slBrightness.getElement());

            slContrast.title = function(value) {
                return _("Contrast") + ": " + (value - 100) + "%";
            };
            
            slContrast.on("valueChange", function(value) {
                contrast = (value - 100) / 100;
                
                updateSelectedTexture();
            });

            panel.appendChild(slContrast.getElement());

            let
                okayButton = document.createElement("button"),
                resetButton = document.createElement("button");
            
            okayButton.innerHTML = "Ok";
            okayButton.className = "btn btn-primary btn-sm";
            okayButton.type = "button";
            
            okayButton.addEventListener("click", function(e) {
                $(btnCustomize).popover('hide');
            });
            
            panel.appendChild(okayButton);
            panel.appendChild(document.createTextNode(" "));
            
            resetButton.innerHTML = "Reset";
            resetButton.className = "btn btn-secondary btn-sm";
            resetButton.type = "button";

            resetButton.addEventListener("click", function(e) {
                brightness = 0;
                contrast = 0;
                mirror = false;
                inverse = false;
                
                updatePopoverControls();
                updateSelectedTexture();
            });

            panel.appendChild(resetButton);
            
            updatePopoverControls();
            
            return panel;
        }
        
        // TODO use events instead
        this.updateTexture = function() {
            btnCustomize.disabled = (processedTexture == null);
            sampleSwatch.setTexture(processedTexture);
        };
        
        this.getElement = function() {
            return panel;
        };

        panel.className = "chickenpaint-texture-options";
        panel.appendChild(sampleSwatch.getElement());

        btnCustomize.type = "button";
        btnCustomize.className = "btn btn-light btn-sm";
        btnCustomize.innerHTML = _("Customize");

        textureControlsPanel = buildTextureControlsPanel();
        
        $(btnCustomize)
            .popover({
                html: true,
                content: () => textureControlsPanel,
                trigger: "manual",
                container: body
            }).
            on("click", function() {
                $(this).popover("toggle");
            });
        
        panel.appendChild(btnCustomize);
        
        this.updateTexture();
    }

	/**
     *
     * @param {CPGreyBmp} texture
     * @param {int} width
     * @param {int} height
     * @constructor
     */
    function CPTextureSwatch(texture, width, height) {
        let
            canvas = document.createElement("canvas"),
            canvasContext = canvas.getContext("2d"),
            
            that = this;

	    /**
         * @param {CPGreyBmp} texture
         */
        this.setTexture = function(texture) {
            this.texture = texture;

            this.paint();
        };
        
        this.getElement = function() {
            return canvas;
        };
        
        this.paint = function()  {
            if (this.texture != null) {
                canvasContext.fillStyle = canvasContext.createPattern(this.texture.getAsCanvas(), "repeat");
            } else {
                canvasContext.fillStyle = 'white';
            }
            canvasContext.fillRect(0, 0, canvas.width, canvas.height);
        };
        
        canvas.addEventListener("click", function() {
            that.emit("click");
        });
        
        canvas.width = width;
        canvas.height = height;
        
        this.setTexture(texture);
    }
    
    CPTextureSwatch.prototype = Object.create(EventEmitter.prototype);
    CPTextureSwatch.prototype.constructor = CPTextureSwatch;
    
    optionsPanel = new CPTextureOptionsPanel();
    
    body.appendChild(optionsPanel.getElement());

    texturesPanel.className = 'chickenpaint-texture-swatches';

    body.appendChild(texturesPanel);
    
    addTextures(makeProceduralTextures());
    
    loadTextures(controller.getResourcesRoot() + "gfx/textures32.png", 32, 32, 2, function(loadedTextures) {
        addTextures(loadedTextures);
    });
}

CPTexturePalette.prototype = Object.create(CPPalette.prototype);
CPTexturePalette.prototype.constructor = CPTexturePalette;
