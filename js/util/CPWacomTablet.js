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
        penAPI = null,
        pluginObject,
        
        that = this;

    /**
     * Is the pen currently interacting with the tablet surface?
     */
    this.isPen = function() {
        var
            pointerType;

        if (penAPI) {
            pointerType = penAPI.pointerType;

            return pointerType == 1 /* Pen */ || pointerType == 3 /* Eraser */;
        }
        
        return false;
    };
    
    this.getPressure = function() {
        if (penAPI) {
            return penAPI.pressure;
        }
        
        return 1.0;
    };
    
    this.pluginLoaded = function() {
        console.log("Wacom tablet support loaded!");

        penAPI = pluginObject.penAPI;
    };
    
    this.isTabletPresent = function() {
        return !!penAPI;
    };

    /**
     * Call after the document body is ready (needs DOM to be ready for loading the Wacom plugin).
     */
    this.detectTablet = function() {
        // Chrome has dropped NPAPI support, so the Wacom plugin cannot be installed
        if (/Chrome/i.test(navigator.userAgent) && !/OPR/.test(navigator.userAgent)) {
            // Prevent an ugly "this page has tried to load a plugin which is not supported" error message
            console.log("Not attempting to load Wacom tablet plugin, since this is Chrome");
            return;
        }
        
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
        
        setTimeout(function() {
            if (!that.isTabletPresent()) {
                console.log("Looks like the Wacom plugin isn't installed, or failed to load.");
            }
        }, 5000);
    };
}

CPWacomTablet.getRef = function() {
    if (CPWacomTablet.instance == null) {
        CPWacomTablet.instance = new CPWacomTablet();
    }
    return CPWacomTablet.instance;
};

window.onWacomPluginLoaded = function() {
    CPWacomTablet.getRef().pluginLoaded();
};