function CPGridDialog(parent, canvas) {
    var
        dialog = $(`
            <div class="modal fade" tabindex="-1" role="dialog">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                                <span aria-hidden="true">&times;</span>
                            </button>
                            <h4 class="modal-title">Grid options</h4>
                        </div>
                        <div class="modal-body">
                            <form>
                                <div class="form-group">
                                    <label>Grid size</label>
                                    <input type="text" class="form-control chickenpaint-grid-size" value="" autofocus>
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button type="submit" class="btn btn-default" data-dismiss="modal">Cancel</button>
                            <button type="submit" class="btn btn-primary chickenpaint-apply-grid-settings" data-dismiss="modal">Ok</button>
                        </div>
                    </div>
                </div>
            </div>
        `),
        
        gridSizeElem = $(".chickenpaint-grid-size", dialog);
    
    gridSizeElem.val(canvas.getGridSize());
    
    $(".chickenpaint-apply-grid-settings", dialog).click(function(e) {
        var
            gridSize = parseInt(gridSizeElem.val(), 10);
        
        canvas.setGridSize(gridSize);
    });
 
    dialog.on('shown.bs.modal', function() {
        gridSizeElem.focus();
    });
    
    parent.appendChild(dialog[0]);
 
    this.show = function() {
        dialog.modal("show");
    };
}