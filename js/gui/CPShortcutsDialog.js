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

export default function CPShortcutsDialog(parent) {
    var
        dialog = 
            $(`<div class="modal fade chickenpaint-shortcuts-dialog" tabindex="-1" role="dialog">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Shortcuts</h5>
                            <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                                <span aria-hidden="true">&times;</span>
                            </button>
                        </div>
                        <div class="modal-body">
                            <p>
                                Many of the menu options and painting tools have keyboard shortcuts which are
                                written next to them or appear when you hover.
                            </p>
                            <p>
                                Here are some other shortcuts which are not as obvious!
                            </p>
                            <div class="chickenpaint-shortcuts-sections">
                                <div class="chickenpaint-shortcuts-section">
                                    <h5>Color swatches palette</h5>
                                    <ul class="chickenpaint-shortcuts-list list-unstyled">
                                        <li>
                                            <dl>
                                                <dt>
                                                    <span class="chickenpaint-shortcut"><span class="fa fa-mouse-pointer"></span> Left</span>
                                                </dt>
                                                <dd>
                                                    Use as the drawing color
                                                </dd>
                                                <dt>
                                                    <span class="chickenpaint-shortcut"><span class="fa fa-mouse-pointer"></span> Right</span>
                                                </dt>
                                                <dd>
                                                    Remove or replace a color swatch
                                                </dd>
                                             </dl>
                                        </li>
                                    </ul>
                                </div>
                                <div class="chickenpaint-shortcuts-section">
                                    <h5>Line drawing mode</h5>
                                    <ul class="chickenpaint-shortcuts-list list-unstyled">
                                        <li>
                                            <dl>
                                                <dt>
                                                    <span class="chickenpaint-shortcut"><span class="chickenpaint-shortcut-key">Shift</span> + <span class="fa fa-mouse-pointer"></span> Left</span>
                                                </dt>
                                                <dd>
                                                    Snap line to nearest 45 degrees
                                                </dd>
                                             </dl>
                                        </li>
                                    </ul>
                                </div>
                                <div class="chickenpaint-shortcuts-section">
                                    <h5>Painting tools</h5>
                                    <ul class="chickenpaint-shortcuts-list list-unstyled">
                                        <li>
                                            <dl>
                                                <dt>
                                                    <span class="chickenpaint-shortcut"><span class="chickenpaint-shortcut-key">1</span> - <span class="chickenpaint-shortcut-key">9</span> , <span class="chickenpaint-shortcut-key">0</span></span>
                                                </dt>
                                                <dd>
                                                    Change brush opacity
                                                </dd>
                                                <dt>
                                                    <span class="chickenpaint-shortcut"><span class="chickenpaint-shortcut-key">[</span> , <span class="chickenpaint-shortcut-key">]</span></span>
                                                </dt>
                                                <dd>
                                                    Change brush size
                                                </dd>
                                            </dl>
                                        </li>
                                    </ul>
                                </div>
                                <div class="chickenpaint-shortcuts-section">
                                    <h5>Brush palette</h5>
                                    <ul class="chickenpaint-shortcuts-list list-unstyled">
                                        <li>
                                            <dl>
                                                <dt>
                                                    <span class="chickenpaint-shortcut"><span class="fa fa-mouse-pointer"></span> Right drag</span>
                                                </dt>
                                                <dd>
                                                    Adjust brush sliders more precisely
                                                </dd>
                                            </dl>
                                        </li>
                                    </ul>
                                </div>
                                <div class="chickenpaint-shortcuts-section">
                                    <h5>Drawing canvas</h5>
                                    <ul class="chickenpaint-shortcuts-list list-unstyled">
                                        <li>
                                            <dl>
                                                <dt>
                                                    <span class="chickenpaint-shortcut"><span class="fa fa-mouse-pointer"></span> Middle</span> <span class="chickenpaint-shortcut-alternate">or</span> <span class="chickenpaint-shortcut"><span class="chickenpaint-shortcut-key">Space</span> + <span class="fa fa-mouse-pointer"></span> Left</span>
                                                </dt>
                                                <dd>
                                                    Move the canvas around
                                                </dd>
                                                <dt>
                                                    <span class="chickenpaint-shortcut"><span class="chickenpaint-shortcut-key">R</span> + <span class="fa fa-mouse-pointer"></span> Left</span>
                                                </dt>
                                                <dd>
                                                    Rotate the canvas
                                                </dd>
                                                <dt>
                                                    <span class="chickenpaint-shortcut"><span class="fa fa-mouse-pointer"></span> Right</span> <span class="chickenpaint-shortcut-alternate">or</span> <span class="chickenpaint-shortcut"><span class="chickenpaint-shortcut-key">Alt</span> + <span class="fa fa-mouse-pointer"></span> Left</span>
                                                </dt>
                                                <dd>
                                                    Sample the color under the cursor
                                                </dd>
                                             </dl>
                                        </li>
                                    </ul>
                                </div>
                                <div class="chickenpaint-shortcuts-section">
                                    <h5>Layers palette</h5>
                                    <ul class="chickenpaint-shortcuts-list list-unstyled">
                                        <li>
                                            <dl>
                                                <dt>
                                                    <span class="chickenpaint-shortcut"><span class="fa fa-mouse-pointer"></span> Double click</span>
                                                </dt>
                                                <dd>
                                                    Rename layer
                                                </dd>
                                             </dl>
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `);
    
    // Destroy the modal upon close
    dialog.on("hidden.bs.modal", function(e) {
        dialog.remove();
    });
    
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