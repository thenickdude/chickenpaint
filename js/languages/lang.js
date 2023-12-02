import * as en from "./en.json";
import * as ja from "./ja.json";

const
    languages = {
        ja,
        en
    };

let
    currentLang = en,
    currentLangName = "en";

export function setLanguage(languageCode) {
	languageCode = languageCode.split(/[-_]/, 1)[0].toLowerCase();

    if (languageCode in languages) {
        currentLang = languages[languageCode];
        currentLangName = languageCode;
    } else {
        currentLang = en;
        currentLangName = "en";
    }
}

export function currentLanguage() {
    return currentLangName;
}

export function guessLanguage() {
    try {
        if (typeof navigator !== "undefined") {
            let
                navLanguages = navigator.languages;

            if (!Array.isArray(navLanguages)) {
                navLanguages = [navLanguages];
            }
            
            for (let language of navLanguages) {
                let
                    matches = /^(..)([-_].+)?$/.exec(language);
                
                if (matches) {
                    matches[1] = matches[1].toLowerCase();
                    
                    if (matches[1] in languages) {
                        setLanguage(language);

                        return;
                    }
                    
                    if (matches[1] === "en") {
                        setLanguage("en");
                        
                        return;
                    } 
                }
            }
        }
    } catch (e) {
        // We don't care about failures here because we're only doing this as a best-effort anyway
        console.error(e);
    }
}

export function _(originalText) {
    if (originalText in currentLang) {
        return currentLang[originalText];
    } 
    
    return originalText;
}