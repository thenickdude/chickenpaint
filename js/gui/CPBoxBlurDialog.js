function CPBoxBlurDialog(parent, controller) {
    var
        dialog = `
            <div class="modal fade" tabindex="-1" role="dialog">
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
                                  <label for="bluramount">Blur amount</label>
                                  <input type="text" class="form-control" id="bluramount" value="3">
                                </div>
                                <div class="form-group">
                                  <label for="bluriterations">Iterations</label>
                                  <input type="text" class="form-control" id="bluriterations" value="1">
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button type="submit" class="btn btn-default" data-dismiss="modal">Cancel</button>
                            <button type="submit" class="btn btn-primary chickenpaint-apply-box-blur" data-dismiss="modal">Ok</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>`;

    dialog = $(dialog);
    
    $(".chickenpaint-apply-box-blur", dialog).click(function(e) {
        var
            blur = parseInt($("#bluramount").val(), 10),
            iterations = parseInt($("#bluriterations").val(), 10);
        
        controller.getArtwork().boxBlur(blur, blur, iterations);
    });
    
    parent.appendChild(dialog[0]);
    
    this.show = function() {
        dialog.modal("show");
    };
    
    /* TODO
    panel.add(new JLabel("Blur amount:"));
    SpinnerModel blurXSM = new SpinnerNumberModel(3, 1, 100, 1);
    
    panel.add(new JLabel("Iterations:"));
    SpinnerModel iterSM = new SpinnerNumberModel(1, 1, 8, 1);
    */
}