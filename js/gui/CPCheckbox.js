"use strict";

function CPCheckBox(state, title) {
    var
        canvas = document.createElement('canvas'),
        canvasContext = canvas.getContext('2d'),
        
        that = this;
    
    this.state = state || false;
    
    function paint() {
        var 
            width = canvas.width,
            height = canvas.height;

        canvasContext.clearRect(0, 0, width, height);
        
        canvasContext.beginPath();
        canvasContext.arc(width / 2 + 1, width / 2 + 1, Math.max(width / 2, 1) - 2, 0, Math.PI * 2);
        
        if (that.state) {
            canvasContext.fill();
        } else {
            canvasContext.stroke();
        }
    }

    this.setValue = function(b) {
        this.state = b;
        
        this.emitEvent('valueChanged', [b]);
        
        paint();
    };
    
    this.getElement = function() {
        return canvas;
    }
    
    canvas.addEventListener("mousedown", function(e) {
        that.setValue(!that.state);
    });
    
    canvas.title = title || "";
    canvas.className = 'chickenpaint-checkbox';
    
    canvas.width = 20;
    canvas.height = 20;
    
    canvas.fillStyle = 'black';
    canvas.strokeStyle = 'black';
    
    paint();
};

CPCheckBox.prototype = Object.create(EventEmitter.prototype);
CPCheckBox.prototype.constructor = CPCheckBox;