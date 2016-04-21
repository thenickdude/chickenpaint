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
export default function CPConfirmTransformDialog(parent, controller) {
	var
		dialog =
			$(`<div class="modal fade" tabindex="-1" role="dialog">
	            <div class="modal-dialog">
	                <div class="modal-content">
	                    <div class="modal-header">
	                        <button type="button" class="close" data-dismiss="modal" aria-label="Close">
	                            <span aria-hidden="true">&times;</span>
	                        </button>
	                        <h4 class="modal-title">Complete transform</h4>
	                    </div>
	                    <div class="modal-body">
	                        <p>
	                            You need to finish transforming this layer before you can do that. What would you like to do with the transform?
							</p>
	                    </div>
	                    <div class="modal-footer">
	                        <button type="button" class="btn btn-default" data-dismiss="modal">Cancel</button>
	                        <button type="button" class="btn btn-default chickenpaint-reject-transform" data-dismiss="modal">Undo transform</button>
	                        <button type="button" class="btn btn-primary chickenpaint-accept-transform" data-dismiss="modal">Apply transform</button>
	                    </div>
	                </div>
	            </div>
	        </div>
	    `),

		that = this,

		applyButton = $(".chickenpaint-accept-transform", dialog),
		rejectButton = $(".chickenpaint-reject-transform", dialog);

	applyButton.click(function(e) {
		controller.actionPerformed({action: "CPTransformAccept"});
		that.emitEvent("accept");
	});

	rejectButton.click(function(e) {
		controller.actionPerformed({action: "CPTransformReject"});
		that.emitEvent("reject");
	});

	dialog
		.modal({
			show: false
		})
		.on('shown.bs.modal', function() {
			applyButton.focus();
		})
		.on("hidden.bs.modal", function(e) {
			// Destroy the modal upon close
			dialog.remove();
		})
		.on('keypress', function(e) {
			if (e.keyCode == 13) {
				applyButton.click();
			}
		});

	// Fix the backdrop location in the DOM by reparenting it to the chickenpaint container
	dialog.data("bs.modal").$body = $(parent);

	parent.appendChild(dialog[0]);

	this.show = function() {
		dialog.modal("show");
	};
}

CPConfirmTransformDialog.prototype = Object.create(EventEmitter.prototype);
CPConfirmTransformDialog.prototype.constructor = CPConfirmTransformDialog;