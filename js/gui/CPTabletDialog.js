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

import $ from "jquery";

import CPWacomTablet from "../util/CPWacomTablet.js";

export default function CPTabletDialog(parent) {
    let
        dialog = 
            $(`<div class="modal fade" tabindex="-1" role="dialog">
                <div class="modal-dialog" role="document">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Drawing tablet support</h5>
                            <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                                <span aria-hidden="true">&times;</span>
                            </button>
                        </div>
                        <div class="modal-body">
                            <p class="chickenpaint-tablet-there-are-two-options">
                                There are two ways you could use your tablet's pen pressure support with ChickenPaint.
                            </p>
                            <div class="chickenpaint-tablet-support chickenpaint-wacom-support">
                                <h5>
                                    Plugin for Wacom tablets
                                </h5>
                                <div class="chickenpaint-supported-browsers">
                                    <div class="chickenpaint-supported-browser">
                                        <span class="fab fa-internet-explorer"></span>
                                        IE 10, 11
                                    </div>
                                    <div class="chickenpaint-supported-browser">
                                        <span class="fab fa-firefox"></span>
                                        Firefox (32-bit only)
                                    </div>
                                    <div class="chickenpaint-supported-browser">
                                        <span class="fab fa-safari"></span>
                                        Safari
                                    </div>
                                        <div class="chickenpaint-supported-browser">
                                        <span class="fab fa-opera"></span>
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
                                <h5>
                                    Built-in support for most tablets.
                                    <small>macOS, Windows 8 or newer</small>
                                </h5>
                                <div class="chickenpaint-supported-browsers">
                                    <div class="chickenpaint-supported-browser">
                                        <span class="fab fa-internet-explorer"></span>
                                        IE (Windows 8)
                                    </div>
                                        <div class="chickenpaint-supported-browser">
                                        <span class="fab fa-edge"></span>
                                        Edge (Windows 10)
                                    </div>
                                    <div class="chickenpaint-supported-browser">
                                        <span class="fab fa-firefox"></span>
                                        Firefox (<a href="https://github.com/thenickdude/chickenpaint/blob/master/help/Firefox pressure support.md" target="_blank">help <i class="fa fa-external-link-alt"></i></a>)
                                    </div>
                                    <div class="chickenpaint-supported-browser">
                                        <span class="fab fa-chrome"></span>
                                        Chrome
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
    
    let
        wacomSupportElem = $(".chickenpaint-wacom-support", dialog),
        peSupportElem = $(".chickenpaint-pointerevents-support", dialog),
        bothOptionsElem = $(".chickenpaint-tablet-there-are-two-options", dialog),
        
        wacomPresent = CPWacomTablet.getRef().isTabletPresent(),
        peSupported = !!window.hasNativePointerEvents;
    
    wacomSupportElem.toggleClass("supported", wacomPresent);
    
    if (wacomPresent) {
        // Don't bother displaying info about Pointer Events if we have the Wacom plugin installed
        peSupportElem.hide();
        bothOptionsElem.hide();
    } else {
        // Chrome has dropped NPAPI support, so the Wacom plugin cannot be installed
        if (/Chrome/i.test(navigator.userAgent) && !/OPR/.test(navigator.userAgent)
                || /iPad/.test(navigator.userAgent) || /iPhone/.test(navigator.userAgent)) {
            wacomSupportElem.addClass("not-supported");
        }
        
        // Don't bother showing the Wacom plugin details if this browser supports pointer events
        if (peSupported) {
            wacomSupportElem.hide();
            bothOptionsElem.hide();
        }
    }
    
    peSupportElem.toggleClass("supported", peSupported);
    peSupportElem.toggleClass("not-supported", !peSupported);

    dialog.modal({
        show: false
    });
    
    // Fix the backdrop location in the DOM by reparenting it to the chickenpaint container
    dialog.data("bs.modal").$body = $(parent);
    
    parent.appendChild(dialog[0]);

    this.show = function() {
        dialog.modal("show");
    };
}