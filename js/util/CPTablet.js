"use strict";

function CPTablet() {
    var 
        tabletOK = false,

        pressure = 0, 
        pressureExtent = 1,
        
        pluginObject = document.createElement("object");

    function getTabletInfo() {
        // TODO
    }

    this.getPressure = function() {
        if (tabletOK) {
            var
                penAPI = pluginObject.penAPI;
            
            if (penAPI) {
                return penAPI.pressure;
            }
        }
        
        return 1.0;
    };
    
    this.pluginLoaded = function() {
        console.log("Wacom tablet support loaded!");
        tabletOK = true;
    };

    this.mouseDetect = function() {
        pressure = pressureExtent = 1;
        getTabletInfo();
    };
    
    console.log("Loading Wacom tablet support...");

    if ("classid" in pluginObject) { // IE
        pluginObject.classid = "CLSID:092dfa86-5807-5a94-bf3b-5a53ba9e5308";
    } else {
        var
            param = document.createElement("param");
        param.name = "onload";
        param.value = "wacomPluginLoaded";
        
        pluginObject.appendChild(param);
        
        pluginObject.type = "application/x-wacomtabletplugin";
    }
    
    pluginObject.style.position = "absolute";
    pluginObject.style.visibility = "hidden";
    pluginObject.onload = "wacomPluginLoaded";
    
    document.body.appendChild(pluginObject);
}

CPTablet.getRef = function() {
    if (CPTablet.instance == null) {
        CPTablet.instance = new CPTablet();
    }
    return CPTablet.instance;
}

window.wacomPluginLoaded = function() {
    CPTablet.getRef().pluginLoaded();
}