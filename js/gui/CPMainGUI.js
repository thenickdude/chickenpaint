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

import CPCanvas from "./CPCanvas";
import CPPaletteManager from "./CPPaletteManager";

export default function CPMainGUI(controller, uiElem) {
    var
        lowerArea = document.createElement("div"),
        canvas = new CPCanvas(controller),
        paletteManager = new CPPaletteManager(controller),
        menuBar,
        
        keyboardShortcutActions,
        
        that = this;
    
    function recurseFillMenu(menuElem, entries) {
        for (var i = 0; i < entries.length; i++) {
            var 
                entry = entries[i],
                entryElem;

            if (entry.children) {
                entryElem = $(
                    '<li class="dropdown">'
                        + '<a href="#" class="dropdown-toggle" data-toggle="dropdown" role="button" aria-haspopup="true" aria-expanded="false">' + entry.name + ' <span class="caret"></span></a>'
                        + '<ul class="dropdown-menu">'
                        + '</ul>'
                    + '</li>'
                );
                
                recurseFillMenu($(".dropdown-menu", entryElem), entry.children);
            } else if (entry.name == '-') {
                entryElem = $('<li role="separator" class="divider"></li>');
            } else {
                entryElem = $('<li><a href="#" data-action="' + entry.action + '">' + entry.name + '</a></li>');
                
                if (entry.checkbox) {
                    $("a", entryElem)
                        .data("checkbox", true)
                        .toggleClass("selected", !!entry.checked);
                }
            }
            
            if (entry.title) {
                entryElem.attr('title', entry.title);
            }
            
            menuElem.append(entryElem);
        }
    }
    
    function createMainMenu(listener) {
        var
            menuEntries = [
                {
                    name: "File",
                    mnemonic: "F",
                    children: [
                        {
                            name: "Save as...",
                            action: "CPSave",
                            mnemonic: "S",
                            shortcut: "CTRL S"
                        },
                        {
                            name: "Save Oekaki", /* to the server */
                            action: "CPSend",
                            mnemonic: "S",
                            shortcut: "CTRL S"
                        },
                    ],
                },
                {
                    name: "Edit",
                    mnemonic: "E",
                    children: [
                        {
                            name: "Undo",
                            action: "CPUndo",
                            mnemonic: "U",
                            shortcut: "CTRL Z",
                            title: "Undoes the most recent action"
                        },
                        {
                            name: "Redo",
                            action: "CPRedo",
                            mnemonic: "R",
                            shortcut: "CTRL SHIFT Z",
                            title: "Redoes a previously undone action"
                        },
                        {
                            name: "Clear history",
                            action: "CPClearHistory",
                            mnemonic: "H",
                            title: "Removes all undo/redo information to regain memory"
                        },
                        {
                            name: "-",
                        },
                        {
                            name: "Cut",
                            action: "CPCut",
                            mnemonic: "T",
                            shortcut: "CTRL X"
                        },
                        {
                            name: "Copy",
                            action: "CPCopy",
                            mnemonic: "C",
                            shortcut: "CTRL C"
                        },
                        {
                            name: "Copy merged",
                            action: "CPCopyMerged",
                            mnemonic: "Y",
                            shortcut: "CTRL SHIFT C"
                        },
                        {
                            name: "Paste",
                            action: "CPPaste",
                            mnemonic: "P",
                            shortcut: "CTRL V"
                        },
                        {
                            name: "-"
                        },
                        {
                            name: "Select all",
                            action: "CPSelectAll",
                            mnemonic: "A",
                            shortcut: "CTRL A"
                        },
                        {
                            name: "Deselect",
                            action: "CPDeselectAll",
                            mnemonic: "D",
                            shortcut: "CTRL D"
                        }
                    ]
                },
                {
                    name: "Layers",
                    mnemonic: "L",
                    children: [
                        {
                            name: "Duplicate",
                            action: "CPLayerDuplicate",
                            mnemonic: "D",
                            shortcut: "CTRL SHIFT D",
                            title: "Creates a copy of the currently selected layer"
                        },
                        {
                            name: "-"
                        },
                        {
                            name: "Merge down",
                            action: "CPLayerMergeDown",
                            mnemonic: "E",
                            shortcut: "CTRL E",
                            title: "Merges the currently selected layer with the one directly below it"
                        },
                        {
                            name: "Merge all layers",
                            action: "CPLayerMergeAll",
                            mnemonic: "A",
                            shortcut: "CTRL S",
                            title: "Merges all the layers"
                        },
                    ],
                },
                {
                    name: "Effects",
                    mnemonic: "E",
                    children: [
                        {
                            name: "Clear",
                            action: "CPClear",
                            mnemonic: "D",
                            shortcut: "DEL",
                            title: "Clears the selected area"
                        },
                        {
                            name: "Fill",
                            action: "CPFill",
                            mnemonic: "F",
                            shortcut: "CTRL F",
                            title: "Fills the selected area with the current color"
                        },
                        {
                            name: "Flip horizontal",
                            action: "CPHFlip",
                            mnemonic: "H",
                            title: "Flips the current selected area horizontally"
                        },
                        {
                            name: "Flip vertical",
                            action: "CPVFlip",
                            mnemonic: "V",
                            title: "Flips the current selected area vertically"
                        },
                        {
                            name: "Invert",
                            action: "CPFXInvert",
                            mnemonic: "I",
                            title: "Invert the image colors"
                        },
                        {
                            name: "-"
                        },
                        {
                            name: "Box blur...",
                            action: "CPFXBoxBlur",
                            mnemonic: "B",
                            title: "Blur effect"
                        },
                        {
                            name: "-"
                        },
                        {
                            name: "Monochromatic noise",
                            action: "CPMNoise",
                            mnemonic: "M",
                            title: "Fills the selection with noise"
                        },
                        {
                            name: "Color noise",
                            action: "CPCNoise",
                            mnemonic: "C",
                            title: "Fills the selection with colored noise"
                        }
                    ],
                },
                {
                    name: "View",
                    mnemonic: "V",
                    children: [
                        {
                            name: "Zoom in",
                            action: "CPZoomIn",
                            mnemonic: "I",
                            shortcut: "CTRL +",
                            title: "Zooms in"
                        },
                        {
                            name: "Zoom out",
                            action: "CPZoomOut",
                            mnemonic: "O",
                            shortcut: "CTRL -",
                            title: "Zooms out"
                        },
                        {
                            name: "Zoom 100%",
                            action: "CPZoom100",
                            mnemonic: "1",
                            shortcut: "CTRL 0",
                            title: "Resets the zoom factor to 100%"
                        },
                        {
                            name: "-"
                        },
                        {
                            name: "Smooth-out zoomed canvas",
                            action: "CPLinearInterpolation",
                            mnemonic: "L",
                            title: "Linear interpolation is used to give a smoothed looked to the picture when zoomed in",
                            checkbox: true
                        },
                        {
                            name: "-"
                        },
                        {
                            name: "Show grid",
                            action: "CPToggleGrid",
                            mnemonic: "G",
                            shortcut: "CTRL G",
                            title: "Displays a grid over the image",
                            checkbox: true,
                            checked: false
                        },
                        {
                            name: "Grid options...",
                            action: "CPGridOptions",
                            mnemonic: "D",
                            title: "Shows the grid options dialog box",
                        }
                    ],
                },
                {
                    name: "Palettes",
                    mnemonic: "P",
                    children: [
                        {
                            name: "Rearrange",
                            action: "CPArrangePalettes",
                            title: "Rearrange the palette windows"
                        },
                        {
                            name: "Toggle palettes",
                            action: "CPTogglePalettes",
                            mnemonic: "P",
                            shortcut: "TAB",
                            title: "Hides or shows all palettes"
                        },
                        {
                            name: "-"
                        },
                        {
                            name: "Show brush",
                            action: "CPPalBrush",
                            mnemonic: "B",
                            checkbox: true,
                            checked: true
                        },
                        {
                            name: "Show color",
                            action: "CPPalColor",
                            mnemonic: "C",
                            checkbox: true,
                            checked: true
                        },
                        {
                            name: "Show layers",
                            action: "CPPalLayers",
                            mnemonic: "Y",
                            checkbox: true,
                            checked: true
                        },
                        {
                            name: "Show misc",
                            action: "CPPalMisc",
                            mnemonic: "M",
                            checkbox: true,
                            checked: true
                        },
                        {
                            name: "Show stroke",
                            action: "CPPalStroke",
                            mnemonic: "S",
                            checkbox: true,
                            checked: true
                        },
                        {
                            name: "Show swatches",
                            action: "CPPalSwatches",
                            mnemonic: "W",
                            checkbox: true,
                            checked: true
                        },
                        {
                            name: "Show textures",
                            action: "CPPalTextures",
                            mnemonic: "X",
                            checkbox: true,
                            checked: true
                        },
                        {
                            name: "Show tools",
                            action: "CPPalTool",
                            mnemonic: "T",
                            checkbox: true,
                            checked: true
                        }
                    ]
                },
                {
                    name: "Help",
                    mnemonic: "H",
                    children: [
                        {
                            name: "Tablet support",
                            mnemonic: "T",
                            action: "CPTabletSupport",
                            title: "Help with getting a drawing tablet working"
                        },
                        {
                            name: "-"
                        },
                        {
                            name: "About",
                            mnemonic: "A",
                            action: "CPAbout",
                            title: "Displays some information about ChickenPaint"
                        }
                    ]
                },
            ],
            
            bar = $(
                '<nav class="navbar navbar-default">'
                    + '<div class="container-fluid">'
                        + '<div class="navbar-header">'
                            + '<a class="navbar-brand" href="#">ChickenPaint</a>'
                        + '</div>'
                        + '<ul class="nav navbar-nav">'
                        + '</ul>'
                    + '</div>'
                + '</nav>'
            );
        
        recurseFillMenu($(".navbar-nav", bar), menuEntries);

        $(bar).on('click', 'a:not(.dropdown-toggle)', function(e) {
            var
                target = $(e.target),
                action = target.data('action'),
                checkbox = target.data('checkbox'),
                selected;
            
            if (checkbox) {
                target.toggleClass("selected");
                selected = target.hasClass("selected");
            } else {
                selected = false;
            }
            
            controller.actionPerformed({
                action: action,
                checkbox: checkbox,
                selected: selected
            });
            
            e.preventDefault();
        });
        
        return bar[0];
    }
    
    function onPaletteVisChange(paletteName, show) {
        var
            palMenuEntry = $('[data-action=\"CPPal' + paletteName.substring(0, 1).toUpperCase() + paletteName.substring(1) + '\"]', menuBar);
        
        palMenuEntry.toggleClass("selected", show);
    }
    
    function onKeyDown(e) {
        var 
            keyCode = e.keyCode || e.which,
            keyName;
        
        if (e.keyCode == 9) {
            keyName = "TAB";
        } else if (e.keyCode >= 32 && e.keyCode < 128) {
            keyName = String.fromCharCode(e.keyCode);
        } else {
            return;
        }
        
        if (e.shiftKey) {
            keyName = "SHIFT " + keyName;
        }
        if (e.ctrlKey) {
            keyName = "CTRL " + keyName;
        }

        if (e.keyCode == 9) {
            controller.actionPerformed({
                action: "CPTogglePalettes"
            });
            e.preventDefault();
        }
    }
    
    this.togglePalettes = function() {
        paletteManager.togglePalettes();
    };
    
    this.arrangePalettes = function() {
        // Give the browser a chance to do the sizing of the palettes before we try to rearrange them
        setTimeout(function() {
            paletteManager.arrangePalettes();
        }, 0);
    };

    this.constrainPalettes = function() {
        paletteManager.constrainPalettes();
    };
    
    this.showPalette = function(paletteName, show) {
        paletteManager.showPaletteByName(paletteName, show);
    };
    
    this.getSwatches = function() {
        return paletteManager.palettes.swatches.getSwatches();
    };

    this.setSwatches = function(swatches) {
        paletteManager.palettes.swatches.setSwatches(swatches);
    };

    paletteManager.on("paletteVisChange", onPaletteVisChange);
    
    window.addEventListener("resize", function() {
        that.constrainPalettes();
    });
    window.addEventListener("keydown", onKeyDown);

    menuBar = createMainMenu();
    
    uiElem.appendChild(menuBar);
    
    lowerArea.className = 'chickenpaint-main-section';
    
    lowerArea.appendChild(canvas.getElement());
    lowerArea.appendChild(paletteManager.getElement());
    
    uiElem.appendChild(lowerArea);
    
    setTimeout(function() {
        canvas.resize();
    }, 0);
}

CPMainGUI.prototype = Object.create(EventEmitter.prototype);
CPMainGUI.prototype.constructor = CPMainGUI;