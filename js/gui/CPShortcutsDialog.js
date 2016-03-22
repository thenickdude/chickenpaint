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

export default function CPShortcutsDialog(parent) {
    var
        dialog = 
            $(`<div class="modal fade chickenpaint-shortcuts-dialog" tabindex="-1" role="dialog">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                                <span aria-hidden="true">&times;</span>
                            </button>
                            <h4 class="modal-title">Shortcuts</h4>
                        </div>
                        <div class="modal-body">
                            <p>
                                Many of the menu options and painting tools have their own keyboard shortcuts, which are
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
                                                    <span class="shortcut"><span class="fa fa-mouse-pointer"></span> Left click</span>
                                                </dt>
                                                <dd>
                                                    Use as the drawing color
                                                </dd>
                                                <dt>
                                                    <span class="shortcut"><span class="shortcut"><span class="fa fa-mouse-pointer"></span> Right click</span>
                                                </dt>
                                                <dd>
                                                    Remove or replace a color swatch
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
                                                    <span class="shortcut"><span class="fa fa-mouse-pointer"></span> Middle-button drag</span> or <span class="shortcut"><span class="chickenpaint-shortcut-key">Space</span> + drag</span>
                                                </dt>
                                                <dd>
                                                    Move the canvas around
                                                </dd>
                                                <dt>
                                                    <span class="shortcut"><span class="fa fa-mouse-pointer"></span> Right click</span>
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
                                                    <span class="shortcut"><span class="shortcut"><span class="fa fa-mouse-pointer"></span> Double click</span>
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