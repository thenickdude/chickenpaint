/*
	ChibiPaint
    Copyright (c) 2006-2008 Marc Schefer

    This file is part of ChibiPaint.

    ChibiPaint is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    ChibiPaint is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with ChibiPaint. If not, see <http://www.gnu.org/licenses/>.

 */

function CPPaletteManager(cpController) {
	var
	    palettes = {
	        tool: new CPToolPalette(cpController),
	        misc: new CPMiscPalette(cpController),
	        stroke: new CPStrokePalette(cpController),
	        color: new CPColorPalette(cpController)
	    },
	    
	    paletteFrames = [],
	    hiddenFrames = [],
	    
	    parentElem = document.createElement("div");
	    parentElem.className = "chickenpaint-palettes";
	
	    for (var paletteName in palettes) {
	        var 
	            palFrame = palettes[paletteName].getContainer();
	        
	        palFrame.dataset.paletteName = paletteName;
	        
	        paletteFrames.push(palFrame);
	        parentElem.appendChild(palFrame);
	    }
	
	    /*
		desktop.addContainerListener(this);

		// Brush Palette

		palBrush = new CPBrushPalette(controller);
		{
			palettes.put("brush", palBrush);

			CPPaletteFrame frame = new CPPaletteFrame(palBrush);
			paletteFrames.add(frame);

			frame.pack();
			desktop.add(frame);
		}

		// Layers Palette

		palLayers = new CPLayersPalette(controller);
		{
			palettes.put("layers", palLayers);

			CPPaletteFrame frame = new CPPaletteFrame(palLayers);
			paletteFrames.add(frame);

			frame.pack();
			frame.setSize(170, 300);
			desktop.add(frame);
		}

		// Swatches Palette
/*
		palSwatches = new CPSwatchesPalette(controller);
		{
			palettes.put("swatches", palSwatches);

			CPPaletteFrame frame = new CPPaletteFrame(palSwatches);
			paletteFrames.add(frame);

			frame.pack();
			desktop.add(frame);
		}

		// Textures Palette

		palTextures = new CPTexturePalette(controller);
		{
			palettes.put("textures", palTextures);

			CPPaletteFrame frame = new CPPaletteFrame(palTextures);
			paletteFrames.add(frame);
			
			frame.pack();

			desktop.add(frame);
		}*/

	this.showPaletteByName = function(paletteName, show) {
		var 
		    palette = palettes[paletteName];
		
		if (palette) {
		    showPalette(palette, show);
		}
	}

	this.showPalette = function(palette, show) {
		var
		    frame = palette.getContainer();
		
		if (show) {
			$(parentElement).add(frame);
		} else {
            $(frame).remove();
		}
		
		// controller.getMainGUI().setPaletteMenuItem(palette.title, show); TODO

		// FIXME: focus hack
		// controller.canvas.grabFocus(); TODO
	}

	/*
	public void componentRemoved(ContainerEvent e) {
		if (e.getChild() instanceof CPPaletteFrame) {
			CPPaletteFrame frame = (CPPaletteFrame) e.getChild();
			for (CPPalette palette : frame.getPalettesList()) {
				controller.getMainGUI().setPaletteMenuItem(palette.title, false);
			}
		}
	}
*/
	this.togglePalettes = function() {
		if (hiddenFrames.length == 0) {
		    $(".chickenpaint-palette", parentElem).each(function() {
		        showPalette(this.dataset.paletteName, false);
		        hiddenFrames.add(this);
		    });
		} else {
			for (var i = 0; i < hiddenFrames.length; i++) {
			    var 
			        frame = hiddenFrames[i];
			    
                showPalette(frame.dataset.paletteName, true);
			}
			hiddenFrames = [];
		}
	};

	/**
	 * Pop palettes that are currently outside the visible area back into view.
	 */
	/*public void constrainPalettes() {
		int windowWidth = jdp.getWidth();
		int windowHeight = jdp.getHeight();

		for (CPPalette palette : palettes.values()) {
			ICPPaletteContainer container = palette.getContainer();
			
			/* Move palettes that are more than half out of the frame back into it *//*
			if (container.getX() + container.getWidth() / 2 > windowWidth) {
				container.setLocation(windowWidth - container.getWidth(), container.getY());
			}

			if (container.getY() + container.getHeight() / 2 > windowHeight) {
				container.setLocation(container.getX(), windowHeight - container.getHeight());
			}
		}
		
		//Move small palettes to the front so that they aren't completely hidden
		((JInternalFrame) palSwatches.container).moveToFront();
		
		//Special handling for the swatches palette being under the brush palette:
		boolean widthToSpare = windowWidth - palTool.getSize().width - palMisc.getWidth() - palStroke.getWidth() - palColor.getWidth() - palBrush.getWidth() - 15 > 0;

		if (palSwatches.getContainer().getX() + palSwatches.getContainer().getWidth() == 
				palBrush.getContainer().getX() + palBrush.getContainer().getWidth() &&
				Math.abs(palSwatches.getContainer().getY() - palBrush.getContainer().getY()) < 20) {
			palSwatches.getContainer().setLocation(palBrush.getContainer().getX() - palSwatches.getContainer().getWidth() - (widthToSpare ? 5 : 1), 0);
		}
		
		//Special handling for layers palette being too damn tall:
		if (palLayers.getContainer().getY() + palLayers.getContainer().getHeight() > windowHeight)
			palLayers.getContainer().setSize(palLayers.getContainer().getWidth(), Math.max(windowHeight - palLayers.getContainer().getY(), 200));
	}*/
	
	/**
	 * Rearrange the palettes from scratch into a useful arrangement.
	 */
	this.arrangePalettes = function() {
        var
            windowWidth = $(parentElem).parents(".chickenpaint-main-section").width(),
            windowHeight = $(parentElem).parents(".chickenpaint-main-section").height()
        
	    palettes.tool.setLocation(0, 0);
	    palettes.misc.setLocation(palettes.tool.getX() + palettes.tool.getWidth() + 1, 0);
	    palettes.stroke.setLocation(palettes.misc.getX(), palettes.misc.getY() + palettes.misc.getHeight() + 1);
        palettes.color.setLocation(0, Math.max(palettes.tool.getY() + palettes.tool.getHeight(), windowHeight - palettes.color.getHeight()));

	    return; //TODO erase this line and the ones above
	    
        var
            windowWidth = $(parentElem).parents(".chickenpaint-main-section").width(),
            windowHeight = $(parentElem).parents(".chickenpaint-main-section").height(),
	        
		    haveWidthToSpare = windowWidth - palettes.tool.getWidth() - palettes.misc.getWidth() - palettes.stroke.getWidth() - palettes.color.getWidth() - palettes.brush.getWidth() - 15 > 0;

		palettes.brush.setLocation(windowWidth - palettes.brush.getWidth() - 15, 0);

		var 
		    bottomOfBrush = palettes.brush.getY() + palettes.brush.getHeight();

		palettes.layers.setLocation(palettes.brush.getX(), windowHeight - bottomOfBrush > 300 ? bottomOfBrush + 5 : bottomOfBrush);

		palettes.layers.setSize(palettes.brush.getWidth(), windowHeight - palettes.layers.getY());

		palettes.tool.setLocation(0, 0);
		
		palettes.misc.setLocation(palettes.tool.getX() + palettes.tool.getWidth() + (haveWidthToSpare ? 5 : 1), 0);
		
		if (haveWidthToSpare) {
			palettes.stroke.setLocation(palettes.misc.getX() + palettes.misc.getWidth() + (haveWidthToSpare ? 5 : 1), 0);
		} else {
			palettes.stroke.setLocation(palettes.misc.getX(), palettes.misc.getY() + palettes.misc.getHeight() + 1);
		}
		
		palettes.swatches.setLocation(palettes.brush.getX() - palettes.swatches.getWidth() - (haveWidthToSpare ? 5 : 1), 0);

		palettes.textures.setSize(Math.min(palettes.layers.getX() - palettes.textures.getX(), 480), palettes.textures.getHeight());
		
		palettes.textures.setLocation(palettes.color.getX() + palettes.color.getWidth() + 4, windowHeight - palettes.textures.getHeight());

		palettes.color.setLocation(0, Math.max(palettes.tool.getY() + palettes.tool.getHeight(), windowHeight - palettes.color.getHeight()));
	};
	
	this.getElement = function() {
	    return parentElem;
	}
}
