function CPCanvas(controller) {
    var
        container = document.createElement("div"),
        canvas = document.createElement("canvas"),
        
        canvasContext = canvas.getContext("2d"),
        
        artwork = controller.getArtwork(),
        
        // We'll need to refresh the whole thing at least once
        updateRegion = new CPRect(0, 0, artwork.width, artwork.height);
    
    canvas.width = artwork.width;
    canvas.height = artwork.height;
    canvas.className = "chickenpaint-canvas";
    
    container.appendChild(canvas);
    container.className = "chickenpaint-canvas-container";
    
    controller.setCanvas(this);
    
    // Get the DOM element for the canvas
    this.getElement = function() {
        return container;
    };
    
    this.paint = function() {
        canvasContext.clearRect(0, 0, canvas.width, canvas.height);
        
        if (!updateRegion.isEmpty()) {
            var
                imageData = artwork.fusionLayers();
            
            canvasContext.putImageData(
                imageData, updateRegion.left, updateRegion.top, 
                updateRegion.left, updateRegion.top, updateRegion.getWidth(), updateRegion.getHeight()
            );
            
            updateRegion.makeEmpty();
        }
    };
}