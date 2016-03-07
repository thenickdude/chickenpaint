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

export default function CPWacomTablet() {
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
        console.log("Attempting to load Wacom tablet support...");
        
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