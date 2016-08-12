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

export default function CPSendDialog(controller, parent, resourceSaver) {
    var
        dialog = 
            $(`<div class="modal fade" tabindex="-1" role="dialog">
                <div class="modal-dialog">
                
                    <div class="modal-content" data-stage="saving">
                        <div class="modal-header">
                            <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                                <span aria-hidden="true">&times;</span>
                            </button>
                            <h4 class="modal-title">Saving drawing...</h4>
                        </div>
                        <div class="modal-body">
                            <p class="chickenpaint-saving-progress-message">Preparing your drawing to be saved, please wait...</p>
                            <pre class="chickenpaint-saving-error-message pre-scrollable"></pre>
                            <div class="progress">
                                <div class="progress-bar" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100" style="width: 0%;"></div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-default chickenpaint-send-cancel" data-dismiss="modal">Cancel</button>
                        </div>
                    </div>
                    <div class="modal-content" data-stage="success-not-previously-posted" style="display:none">
                        <div class="modal-header">
                            <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                                <span aria-hidden="true">&times;</span>
                            </button>
                            <h4 class="modal-title">Drawing saved!</h4>
                        </div>
                        <div class="modal-body">
                            <p>Your drawing has been saved, would you like to post it to the forum now?</p>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-primary chickenpaint-post-drawing" data-dismiss="modal">Yes, post it now</button>
                            <button type="button" class="btn btn-default chickenpaint-continue-drawing" data-dismiss="modal">No, keep drawing</button>
                            <button type="button" class="btn btn-default chickenpaint-exit" data-dismiss="modal">No, quit and I'll finish it later</button>
                        </div>
                    </div>
                    <div class="modal-content" data-stage="success-already-posted" style="display:none">
                        <div class="modal-header">
                            <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                                <span aria-hidden="true">&times;</span>
                            </button>
                            <h4 class="modal-title">Drawing saved!</h4>
                        </div>
                        <div class="modal-body">
                            <p>Your drawing has been saved, would you like to view it on the forum now?</p>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-primary chickenpaint-post-drawing" data-dismiss="modal">Yes, view the post</button>
                            <button type="button" class="btn btn-default chickenpaint-continue-drawing" data-dismiss="modal">No, keep drawing</button>
                        </div>
                    </div>
                    <div class="modal-content" data-stage="success-redirect" style="display:none">
                        <div class="modal-header">
                            <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                                <span aria-hidden="true">&times;</span>
                            </button>
                            <h4 class="modal-title">Drawing saved!</h4>
                        </div>
                        <div class="modal-body">
                            <p>Your drawing has been saved, redirecting you to view your new post now...</p>
                        </div>
                    </div>
                </div>
            </div>
        `),
        progressMessageElem = $(".chickenpaint-saving-progress-message", dialog),
        progressError = $(".chickenpaint-saving-error-message", dialog),
        progressElem = $(".progress-bar", dialog),

        that = this;
    
    resourceSaver.on("savingProgress", function(progress, message) {
        progress *= 100;
        
        progressMessageElem.text(message);
        
        $(progressElem)
            .attr("aria-valuenow", progress)
            .css("width", progress + "%");
    });
 
    resourceSaver.on("savingComplete", function() {
        $(".modal-content[data-stage='saving']", dialog).hide();

        if (controller.isActionSupported("CPContinue")) {
            if (controller.isActionSupported("CPExit")) {
                $(".modal-content[data-stage='success-not-previously-posted']", dialog).show();
            } else {
                $(".modal-content[data-stage='success-already-posted']", dialog).show();
            }
        } else {
            $(".modal-content[data-stage='success-redirect']", dialog).show();
        }
    });

    resourceSaver.on("savingFailure", function(serverMessage) {
        progressElem.addClass("progress-bar-danger");
        
        var
            errorMessage = "Sorry, your drawing could not be saved, please try again later.";
        
        if (serverMessage) {
            serverMessage = serverMessage.replace(/^CHIBIERROR\s*/, "");
            
            if (serverMessage.length > 0) {
                errorMessage += "<br><br>The error returned from the server was:";
                
                progressError
                    .text(serverMessage)
                    .show();
            }
            
            progressMessageElem.html(errorMessage);
        }
        
    });
    
    $(".chickenpaint-post-drawing", dialog).click(function() {
        controller.actionPerformed({action: "CPPost"});
    });

    $(".chickenpaint-exit", dialog)
        .toggle(controller.isActionSupported("CPExit"))
        .click(function() {
            alert("When you want to come back and finish your drawing, just click the 'new drawing' button again and "
                + "you can choose to continue this drawing.");
            controller.actionPerformed({action: "CPExit"});
        });
    
    $(".chickenpaint-send-cancel", dialog).click(function() {
        resourceSaver.cancel();
    });
    
    // Destroy the modal upon close
    dialog.on("hidden.bs.modal", function(e) {
        dialog.remove();
    });
    
    dialog.modal({
        show: false
    });

    dialog.on('shown.bs.modal', function() {
        that.emitEvent("shown");
    });
    
    // Fix the backdrop location in the DOM by reparenting it to the chickenpaint container
    dialog.data("bs.modal").$body = $(parent);
    
    parent.appendChild(dialog[0]);

    this.show = function() {
        dialog.modal("show");
    };
}

CPSendDialog.prototype = Object.create(EventEmitter.prototype);
CPSendDialog.prototype.contructor = CPSendDialog;