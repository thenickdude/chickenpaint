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
import {_} from "../languages/lang.js";

export default function CPGridDialog(parent, canvas) {
    var
        dialog = 
            $(`<div class="modal fade" tabindex="-1" role="dialog">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">${_("Grid options")}</h5>
                            <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                                <span aria-hidden="true">&times;</span>
                            </button>
                        </div>
                        <div class="modal-body">
                            <form>
                                <div class="form-group">
                                    <label>${_("Grid size")}</label>
                                    <input type="text" class="form-control chickenpaint-grid-size" value="" autofocus>
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-light" data-dismiss="modal">${_("Cancel")}</button>
                            <button type="button" class="btn btn-primary chickenpaint-apply-grid-settings" data-dismiss="modal">${_("Ok")}</button>
                        </div>
                    </div>
                </div>
            </div>
        `),
        
        gridSizeElem = $(".chickenpaint-grid-size", dialog),
        applyButton = $(".chickenpaint-apply-grid-settings", dialog);
    
    gridSizeElem.val(canvas.getGridSize());
    
    $(".chickenpaint-apply-grid-settings", dialog).on('click',function(e) {
        var
            gridSize = parseInt(gridSizeElem.val(), 10);
        
        canvas.setGridSize(gridSize);
    });
 
    dialog
        .modal({
            show: false
        })
        .on('shown.bs.modal', function() {
            gridSizeElem.trigger('focus');
        }).on('keypress', function(e) {
            if (e.key === "Enter") {
                applyButton.trigger('click');
            }
        });
    
    // Fix the backdrop location in the DOM by reparenting it to the chickenpaint container
    dialog.data("bs.modal").$body = $(parent);
    
    parent.appendChild(dialog[0]);
    
    this.show = function() {
        dialog.modal("show");
    };
}