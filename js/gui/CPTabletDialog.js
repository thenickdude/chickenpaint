import CPWacomTablet from "../util/CPWacomTablet";

export default function CPTabletDialog(parent) {
    var
        dialog = $(`
            <div class="modal fade" tabindex="-1" role="dialog">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                                <span aria-hidden="true">&times;</span>
                            </button>
                            <h4 class="modal-title">Drawing tablet pressure support</h4>
                        </div>
                        <div class="modal-body">
                            <div class="chickenpaint-tablet-support chickenpaint-wacom-support">
                                <h4>
                                    Plugin for Wacom tablets
                                </h4>
                                <div class="chickenpaint-supported-browsers">
                                    <div class="chickenpaint-supported-browser">
                                        <span class="fa fa-internet-explorer"></span>
                                        IE 10, 11
                                    </div>
                                    <div class="chickenpaint-supported-browser">
                                        <span class="fa fa-firefox"></span>
                                        Firefox (32-bit version only)
                                    </div>
                                    <div class="chickenpaint-supported-browser">
                                        <span class="fa fa-safari"></span>
                                        Safari
                                    </div>
                                        <div class="chickenpaint-supported-browser">
                                        <span class="fa fa-opera"></span>
                                        Opera
                                    </div>
                                </div>
                                <p class="chickenpaint-not-installed">
                                    The plugin for Wacom tablets doesn't seem to be installed in your browser yet.
                                </p>
                                <p class="chickenpaint-not-installed">
                                    Please make sure that you've installed the latest drivers for your tablet from the 
                                    <a href="http://www.wacom.com/en-us/support/product-support/drivers" target="_blank">Wacom drivers page</a>,
                                    then restart your browser.
                                </p>
                                <p class="chickenpaint-not-supported">
                                    Your browser doesn't support the Wacom tablet plugin, please 
                                    try one of the browsers listed above instead.
                                </p>
                                <p class="chickenpaint-supported alert alert-success">
                                    The Wacom tablet plugin is installed and working.
                                </p>
                            </div>
                            <div class="chickenpaint-tablet-support chickenpaint-pointerevents-support">
                                <h4>
                                    Built-in tablet support
                                </h4>
                                <div class="chickenpaint-supported-browsers">
                                    <div class="chickenpaint-supported-browser">
                                        <span class="fa fa-internet-explorer"></span>
                                        IE 10, 11, Edge
                                    </div>
                                    <div class="chickenpaint-supported-browser">
                                        <span class="fa fa-firefox"></span>
                                        Firefox (coming soon)
                                    </div>
                                    <div class="chickenpaint-supported-browser">
                                        <span class="fa fa-chrome"></span>
                                        Chrome (coming soon)
                                    </div>
                                </div>
                                <p class="chickenpaint-not-supported">
                                    Your browser doesn't have built-in support for drawing tablets, please try
                                    one of the other browsers listed above.
                                </p>
                                <p class="chickenpaint-supported alert alert-success">
                                    Your browser has built-in support for drawing tablets!
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
       `);
    
    var
        wacomSupportElem = $(".chickenpaint-wacom-support", dialog),
        peSupportElem = $(".chickenpaint-pointerevents-support", dialog),
        
        wacomPresent = CPWacomTablet.getRef().isTabletPresent(),
        peSupported = !!window.hasNativePointerEvents;
    
    wacomSupportElem.toggleClass("supported", wacomPresent);
    
    if (wacomPresent) {
        // Don't bother displaying info about Pointer Events if we have the Wacom plugin installed
        peSupportElem.hide();
    } else {
        if (/Chrome/i.test(navigator.userAgent) && !/OPR/.test(navigator.userAgent)) {
            wacomSupportElem.addClass("not-supported");
        }
        
        // Don't bother showing the Wacom plugin details if this browser supports pointer events
        if (peSupported) {
            wacomSupportElem.hide();
        }
    }
    
    peSupportElem.toggleClass("supported", peSupported);
    peSupportElem.toggleClass("not-supported", !peSupported);
    
    parent.appendChild(dialog[0]);
    
    this.show = function() {
        dialog.modal("show");
    };
}