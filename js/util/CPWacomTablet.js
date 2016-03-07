"use strict";

function CPWacomTablet() {
    var 
        tabletOK = false,

        pressure = 0, 
        pressureExtent = 1,
        
        pluginObject;

    this.getPressure = function() {
        if (tabletOK) {
            var
                penAPI = pluginObject.penAPI;
            
            if (penAPI && penAPI.pointerType == 1 /* Pen */) {
                return penAPI.pressure;
            }
        }
        
        return 1.0;
    };
    
    this.pluginLoaded = function() {
        console.log("Wacom tablet support loaded!");
        tabletOK = true;
    };
    
    this.isTabletPresent = function() {
        return tabletOK;
    };

    /**
     * Call after the document body is ready (needs DOM to be ready for loading the Wacom plugin).
     */
    this.detectTablet = function() {
        console.log("Loading Wacom tablet support...");
        
        pluginObject = document.createElement("object");
        
        if ("classid" in pluginObject) { // IE
            pluginObject.classid = "CLSID:092dfa86-5807-5a94-bf3b-5a53ba9e5308";
        } else {
            var
            param = document.createElement("param");
            param.name = "onload";
            param.value = "onWacomPluginLoaded";
            
            pluginObject.appendChild(param);
            
            pluginObject.type = "application/x-wacomtabletplugin";
        }
        
        pluginObject.style.position = "absolute";
        pluginObject.style.visibility = "hidden";
        pluginObject.onload = "onWacomPluginLoaded";
        
        document.body.appendChild(pluginObject);
    };
}

CPWacomTablet.getRef = function() {
    if (CPWacomTablet.instance == null) {
        CPWacomTablet.instance = new CPWacomTablet();
    }
    return CPWacomTablet.instance;
}

window.onWacomPluginLoaded = function() {
    CPWacomTablet.getRef().pluginLoaded();
}