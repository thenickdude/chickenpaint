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

import CPPalette from './CPPalette';

import CPColor from '../util/CPColor';
import AdobeColorTable from '../util/AdobeColorTable';

function padLeft(string, padding, len) {
    while (string.length < len) {
        string = padding + string;
    }
    return string;
}

function wrapWithElem(e, wrapWithName) {
    var
        parent = document.createElement(wrapWithName);
    
    parent.appendChild(e);
    
    return parent;
}

function fileAPIsSupported() {
    return window.File && window.FileReader && window.FileList && window.Blob;
}

export default function CPSwatchesPalette(controller) {
    CPPalette.call(this, controller, "swatches", "Color swatches");
    
    var
        INIT_COLORS = [0xffffff, 0x000000, 0xff0000, 0x00ff00, 0x0000ff, 0xffff00],
        
        modified = false,
        swatchPanel = document.createElement("ul"),
        buttonPanel = document.createElement("div"),
        
        fileInput,
        
        that = this;

    function CPColorSwatch(color) {
        var
            wrapper = document.createElement("div"),
            swatchElem = document.createElement("a"),
            swatchMenu = document.createElement("ul"),
            
            mnuRemove = document.createElement("a"),
            mnuSetToCurrent = document.createElement("a"),
            
            that = this;
        
        this.getElement = function() {
            return wrapper;
        };
        
        this.setColor = function(color) {
            swatchElem.setAttribute("data-color", color);
            swatchElem.style.backgroundColor = '#' + padLeft("" + Number(color).toString(16), "0", 6);
        };

        this.setColor(color);
        
        swatchElem.href = "#";
        swatchElem.className = "chickenpaint-color-swatch dropdown-toggle";
        swatchElem.setAttribute("data-toggle", "dropdown");
        
        mnuRemove.href = "#";
        mnuRemove.innerHTML = "Remove";
        
        mnuRemove.addEventListener("click", function(e) {
            e.preventDefault();
            $(wrapper).remove();

            modified = true;
        });
            
        mnuSetToCurrent.href = "#";
        mnuSetToCurrent.innerHTML = "Replace with current color";
        
        mnuSetToCurrent.addEventListener("click", function(e) {
            e.preventDefault();
            
            that.setColor(controller.getCurColor().getRgb());
            
            modified = true;
        });
        
        swatchMenu.className = "dropdown-menu";
        
        swatchMenu.appendChild(wrapWithElem(mnuRemove, "li"));
        swatchMenu.appendChild(wrapWithElem(mnuSetToCurrent, "li"));
        
        wrapper.className = "chickenpaint-color-swatch-wrapper";
        wrapper.appendChild(swatchElem);
        wrapper.appendChild(swatchMenu);
        
        $(wrapper).on("show.bs.dropdown", function() {
            var 
                $btnDropDown = $(this).find(".dropdown-toggle"),
                $listHolder = $(this).find(".dropdown-menu");
            
            $listHolder.css({
                "top": ($btnDropDown.position().top + $btnDropDown.outerHeight(true)) + "px",
                "left": $btnDropDown.position().left + "px"
            });
        });
    }
    
    function clearSwatches() {
        while (swatchPanel.lastChild) {
            swatchPanel.removeChild(swatchPanel.lastChild);
        }
    }

    function addSwatch(color) {
        var
            swatch = new CPColorSwatch(color);

        swatchPanel.appendChild(swatch.getElement());
    }
    
    /**
     * Returns an array of colors in RGB 32-bit integer format
     */
    this.getSwatches = function() {
        var
            swatches = $(".chickenpaint-color-swatch", swatchPanel),
            colors = new Array(swatches.length);

        for (var i = 0; i < swatches.length; i++) {
            colors[i] = parseInt(swatches.get(i).getAttribute("data-color"), 10);
        }

        return colors;
    };

    this.setSwatches = function(swatches) {
        clearSwatches();

        for (var i = 0; i < swatches.length; i++) {
            addSwatch(swatches[i]);
        }
        
        modified = true;
    };
    
    this.isModified = function() {
        return modified;
    };
    
    function loadSwatches() {
        fileInput.onchange = function() {
            var 
                fileList = this.files;
            
            if (fileList.length < 1)
                return;
            
            var
                file = fileList[0],
                reader = new FileReader();
            
            reader.onload = function() {
                var
                    swatches = new AdobeColorTable().read(this.result);
                
                if (swatches != null && swatches.length > 0) {
                    that.setSwatches(swatches);
                } else {
                    alert("The swatches could not be read, did you select an .aco file?");
                }
            };
            
            reader.readAsArrayBuffer(file);
        }
        
        fileInput.click();
    }
    
    function saveSwatches() {
        var
            aco = new AdobeColorTable().write(that.getSwatches()),
            blob = new Blob([aco], {type: "application/octet-stream"});
        
        window.saveAs(blob, "oekakiswatches.aco");
    }
    
    function initSwatchPanel() {
        swatchPanel.className = "chickenpaint-color-swatches list-unstyled";
        
        for (var i = 0; i < INIT_COLORS.length; i++) {
            swatchPanel.appendChild(new CPColorSwatch(INIT_COLORS[i]).getElement());
        }
        
        swatchPanel.addEventListener("click", function(e) {
            var
                swatch = e.target;
            
            if (!/chickenpaint-color-swatch/.test(swatch.className)) {
                return;
            }
            
            if (e.button == 0 /* Left */ && swatch.getAttribute("data-color") !== undefined) {
                controller.setCurColor(new CPColor(parseInt(swatch.getAttribute("data-color"), 10)));
                e.stopPropagation();
                e.preventDefault();
            }
        });
        
        swatchPanel.addEventListener("contextmenu", function(e) {
            var
                swatch = e.target;
            
            if (!/chickenpaint-color-swatch/.test(swatch.className)) {
                return;
            }
            
            e.preventDefault();
            
            $(swatch)
                .dropdown("toggle")
                .off("click.bs.dropdown"); // Remove Bootstrap's left-click handler installed by toggle
        });
    }
    
    function initButtonsPanel() {
        var
            btnSettings = document.createElement("div"), 
            btnAdd = document.createElement("div"),
            
            settingsMenu = document.createElement("ul"),
            
            mnuSave = document.createElement("a"),
            mnuLoad  = document.createElement("a");
        
        btnAdd.title = "Add the current brush color as a new swatch";
        btnAdd.className = "chickenpaint-small-toolbar-button chickenpaint-color-swatch-add";
        
        btnSettings.className = "chickenpaint-small-toolbar-button chickenpaint-color-swatch-settings";
        btnSettings.setAttribute("data-toggle", "dropdown");
        $(btnSettings).dropdown();

        mnuSave.href = "#";
        mnuSave.innerHTML = "Save swatches to your computer...";
        mnuSave.addEventListener("click", function(e) {
            e.preventDefault();
            
            saveSwatches();
        });
            
        mnuLoad.href = "#";
        mnuLoad.innerHTML = "Load swatches from your computer...";
        mnuLoad.addEventListener("click", function(e) {
            e.preventDefault();
            
            loadSwatches();
        });
        
        settingsMenu.className = "dropdown-menu dropdown-menu-right";
        
        settingsMenu.appendChild(wrapWithElem(mnuSave, "li"));
        settingsMenu.appendChild(wrapWithElem(mnuLoad, "li"));
        
        var
            btnSettingsContainer = document.createElement("div");
        
        btnSettingsContainer.className = 'dropdown';
        btnSettingsContainer.appendChild(btnSettings);
        btnSettingsContainer.appendChild(settingsMenu);

        $(btnSettingsContainer).on("show.bs.dropdown", function() {
            /* Instead of Bootstrap's extremely expensive data API, we'll only listen for dismiss clicks on the
             * document *while the menu is open!*
             */
            $(document).one("click", function() {
                if ($(btnSettingsContainer).hasClass("open")) {
                    $(btnSettings).dropdown("toggle");
                }
            });
        });

        btnAdd.addEventListener("click", function(e) {
            addSwatch(controller.getCurColor().getRgb());
            modified = true;
        });
        
        buttonPanel.className = 'chickenpaint-color-swatches-buttons';
        
        // Don't offer to load/save swatches if we don't have the file API needed for reading them
        if (fileAPIsSupported()) {
            fileInput = document.createElement("input");
            
            fileInput.type = "file";
            fileInput.multiple = false;
            fileInput.style.display = "none";
                
            buttonPanel.appendChild(btnSettingsContainer);
            buttonPanel.appendChild(fileInput);
        }
        
        buttonPanel.appendChild(btnAdd);
    }
    
    initSwatchPanel();
    this.getBodyElement().appendChild(swatchPanel);

    initButtonsPanel();
    this.getBodyElement().appendChild(buttonPanel);
}

CPSwatchesPalette.prototype = Object.create(CPPalette.prototype);
CPSwatchesPalette.prototype.constructor = CPSwatchesPalette;