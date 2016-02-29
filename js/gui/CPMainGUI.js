"use strict";

function CPMainGUI(controller, uiElem) {
    var
        lowerArea = document.createElement("div"),
        canvas = new CPCanvas(controller),
        paletteManager = new CPPaletteManager(controller),
        menuBar;
    
    function recurseFillMenu(menuElem, entries) {
        for (var i = 0; i < entries.length; i++) {
            var 
                entry = entries[i];

            if (entry.children) {
                var
                    parent = $(
                        '<li class="dropdown">'
                            + '<a href="#" class="dropdown-toggle" data-toggle="dropdown" role="button" aria-haspopup="true" aria-expanded="false">' + entry.name + ' <span class="caret"></span></a>'
                            + '<ul class="dropdown-menu">'
                            + '</ul>'
                        + '</li>'
                    );
                
                menuElem.append(parent);
                
                recurseFillMenu($(".dropdown-menu", parent), entry.children);
            } else if (entry.name == '-') {
                menuElem.append('<li role="separator" class="divider"></li>');
            } else {
                menuElem.append('<li><a href="#" data-action="' + entry.action + '">' + entry.name + '</a></li>');
            }
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
                            action: "CPDuplicate",
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
                            name: "Use linear interpolation",
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
                            checkbox: true
                        },
                        {
                            name: "Grid options...",
                            action: "CPGridOptions",
                            mnemonic: "D",
                            title: "Shows the grid options dialog box",
                            checkbox: true
                        },
                        {
                            name: "-"
                        },
                        {
                            name: "Palettes",
                            mnemonic: "P",
                            children: [
                                {
                                    name: "Box blur...",
                                    action: "CPFXBoxBlur",
                                    mnemonic: "B",
                                    title: "Blur effect"
                                }
                            ]
                        },
                        {
                            name: "Noise",
                            mnemonic: "N",
                            children: [
                                {
                                    name: "Render monochromatic",
                                    action: "CPMNoise",
                                    mnemonic: "M",
                                    title: "Fills the selection with noise"
                                },
                                {
                                    name: "Render color",
                                    action: "CPCNoise",
                                    mnemonic: "C",
                                    title: "Fills the selection with colored noise"
                                }
                            ]
                        },
                    ],
                },
                {
                    name: "Help",
                    mnemonic: "H",
                    children: [
                        {
                            name: "About...",
                            mnemonic: "A",
                            action: "CPAbout",
                            title: "Displays some information about ChickenPaint"
                        }
                    ]
                }
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
            controller.actionPerformed({
                "action": ($(e.target).data('action'))
            });
            
            e.preventDefault();
        });
        
        /*
        menuItem = new JMenuItem("Rearrange");
        menuItem.getAccessibleContext().setAccessibleDescription(
                "Rearrange the palette windows");
        menuItem.setActionCommand("CPArrangePalettes");
        menuItem.addActionListener(listener);
        submenu.add(menuItem);

        menuItem = new JMenuItem("Toggle Palettes", KeyEvent.VK_P);
        menuItem.getAccessibleContext().setAccessibleDescription(
                "Hides or shows all palettes");
        menuItem.setAccelerator(KeyStroke.getKeyStroke(KeyEvent.VK_TAB, 0));
        menuItem.setActionCommand("CPTogglePalettes");
        menuItem.addActionListener(listener);
        submenu.add(menuItem);

        submenu.add(new JSeparator());

        menuItem = new JCheckBoxMenuItem("Show Brush", true);
        menuItem.setMnemonic(KeyEvent.VK_B);
        menuItem.setActionCommand("CPPalBrush");
        menuItem.addActionListener(listener);
        submenu.add(menuItem);
        paletteItems.put("Brush", (JCheckBoxMenuItem) menuItem);

        menuItem = new JCheckBoxMenuItem("Show Color", true);
        menuItem.setMnemonic(KeyEvent.VK_C);
        menuItem.setActionCommand("CPPalColor");
        menuItem.addActionListener(listener);
        submenu.add(menuItem);
        paletteItems.put("Color", (JCheckBoxMenuItem) menuItem);

        menuItem = new JCheckBoxMenuItem("Show Layers", true);
        menuItem.setMnemonic(KeyEvent.VK_Y);
        menuItem.setActionCommand("CPPalLayers");
        menuItem.addActionListener(listener);
        submenu.add(menuItem);
        paletteItems.put("Layers", (JCheckBoxMenuItem) menuItem);

        menuItem = new JCheckBoxMenuItem("Show Misc", true);
        menuItem.setMnemonic(KeyEvent.VK_M);
        menuItem.setActionCommand("CPPalMisc");
        menuItem.addActionListener(listener);
        submenu.add(menuItem);
        paletteItems.put("Misc", (JCheckBoxMenuItem) menuItem);

        menuItem = new JCheckBoxMenuItem("Show Stroke", true);
        menuItem.setMnemonic(KeyEvent.VK_S);
        menuItem.setActionCommand("CPPalStroke");
        menuItem.addActionListener(listener);
        submenu.add(menuItem);
        paletteItems.put("Stroke", (JCheckBoxMenuItem) menuItem);

        menuItem = new JCheckBoxMenuItem("Show Swatches", true);
        menuItem.setMnemonic(KeyEvent.VK_W);
        menuItem.setActionCommand("CPPalSwatches");
        menuItem.addActionListener(listener);
        submenu.add(menuItem);
        paletteItems.put("Color Swatches", (JCheckBoxMenuItem) menuItem);

        menuItem = new JCheckBoxMenuItem("Show Textures", true);
        menuItem.setMnemonic(KeyEvent.VK_X);
        menuItem.setActionCommand("CPPalTextures");
        menuItem.addActionListener(listener);
        submenu.add(menuItem);
        paletteItems.put("Textures", (JCheckBoxMenuItem) menuItem);

        menuItem = new JCheckBoxMenuItem("Show Tools", true);
        menuItem.setMnemonic(KeyEvent.VK_T);
        menuItem.setActionCommand("CPPalTool");
        menuItem.addActionListener(listener);
        submenu.add(menuItem);
        paletteItems.put("Tools", (JCheckBoxMenuItem) menuItem);

        menu.add(submenu);
*/
        
        return bar[0];
    }
    
    this.arrangePalettes = function() {
        // Give the browser a chance to do the sizing of the palettes before we try to rearrange them
        setTimeout(function() {
            paletteManager.arrangePalettes();
        }, 0);
    }

    this.constrainPalettes = function() {
        paletteManager.constrainPalettes();
    }

    menuBar = createMainMenu();
    
    uiElem.appendChild(menuBar);
    
    lowerArea.className = 'chickenpaint-main-section';
    
    lowerArea.appendChild(canvas.getElement());
    lowerArea.appendChild(paletteManager.getElement());
    
    uiElem.appendChild(lowerArea);
}