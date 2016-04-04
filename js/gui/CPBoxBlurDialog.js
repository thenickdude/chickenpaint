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

export default function CPBoxBlurDialog(parent, controller) {
    var
        dialog = 
            $(`<div class="modal fade" tabindex="-1" role="dialog">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                                <span aria-hidden="true">&times;</span>
                            </button>
                            <h4 class="modal-title">Box blur</h4>
                        </div>
                        <div class="modal-body">
                            <form>
                                <div class="form-group">
                                    <label>Blur amount (pixels)</label>
                                    <input type="text" class="form-control chickenpaint-blur-amount" value="3">
                                </div>
                                <div class="form-group">
                                    <label>Iterations (1-8, larger gives smoother blur)</label>
                                    <input type="text" class="form-control chickenpaint-blur-iterations" value="1">
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-default" data-dismiss="modal">Cancel</button>
                            <button type="button" class="btn btn-primary chickenpaint-apply-box-blur" data-dismiss="modal">Ok</button>
                        </div>
                    </div>
                </div>
            </div>
        `),
        
        blurAmountElem = $(".chickenpaint-blur-amount", dialog),
        blurIterationsElem = $(".chickenpaint-blur-iterations", dialog),
        applyButton = $(".chickenpaint-apply-box-blur", dialog);

    this.show = function() {
        dialog.modal("show");
    };
    
    applyButton.click(function(e) {
        var
            blur = Math.max(parseInt(blurAmountElem.val(), 10), 1),
            iterations = Math.min(Math.max(parseInt(blurIterationsElem.val(), 10), 1), 8);
        
        controller.getArtwork().boxBlur(blur, blur, iterations);
    });
    
    dialog
        .modal({
            show: false
        })
        .on('shown.bs.modal', function() {
            blurAmountElem.focus();
        })
        .on('keypress', function(e) {
            if (e.keyCode == 13) {
                applyButton.click();
            }
        });
    
    // Fix the backdrop location in the DOM by reparenting it to the chickenpaint container
    dialog.data("bs.modal").$body = $(parent);
    
    parent.appendChild(dialog[0]);
    
    /* TODO
    panel.add(new JLabel("Blur amount:"));
    SpinnerModel blurXSM = new SpinnerNumberModel(3, 1, 100, 1);
    
    panel.add(new JLabel("Iterations:"));
    SpinnerModel iterSM = new SpinnerNumberModel(1, 1, 8, 1);
    */
}