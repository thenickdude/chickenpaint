import EventEmitter from "wolfy87-eventemitter";

const 
    DEFAULTS = {
        toolbarStyle: "new"
    },

    LOCAL_STORAGE_KEY_NAME = "chickenpaint-prefs";

export default class CPUserPreferences extends EventEmitter {
    /**
     * Either "new" or "old"
     */
    toolbarStyle;
    
    constructor() {
        super();

        this.setDefaults();
    }
    
    setDefaults() {
        for (let propertyName in DEFAULTS) {
            if (DEFAULTS.hasOwnProperty(propertyName)) {
                this.set(propertyName, DEFAULTS[propertyName]);
            }
        }
    }
    
    load() {
        let
            parsed = {};
        
        try {
            parsed = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY_NAME))
        } catch (e) {
            console.error(e);
        }
        
        if (!parsed || typeof parsed !== "object") {
            parsed = {};
        }

        for (let propertyName in DEFAULTS) {
            if (DEFAULTS.hasOwnProperty(propertyName)) {
                // Emit an event for every property even if we only load the default for this prop:
                try {
                    this.set(propertyName, parsed.hasOwnProperty(propertyName) ? parsed[propertyName] : DEFAULTS[propertyName]);
                } catch (e) {
                    console.error(e);
                }
            }
        }
    }
    
    save() {
        try {
            let 
                differsFromDefaults = false;

            for (let propertyName in DEFAULTS) {
                if (DEFAULTS.hasOwnProperty(propertyName)) {
                    if (this[propertyName] != DEFAULTS[propertyName]) {
                        differsFromDefaults = true;
                        break;
                    }
                }
            }
            
            if (differsFromDefaults) {
                localStorage.setItem(LOCAL_STORAGE_KEY_NAME, JSON.stringify({
                    toolbarStyle: this.toolbarStyle
                }));
            } else {
                localStorage.removeItem(LOCAL_STORAGE_KEY_NAME);
            }
        } catch (e) {
            // Can't do anything about it if user has LocalStorage disabled
            console.error(e);
        }
    }
    
    set(name, value) {
        this[name] = value;
        this.emitEvent(name, [value]);
    }
    
    get(name) {
        return this[name];
    }
}
