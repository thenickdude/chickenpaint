"use strict";

function CPUndo() {
}

CPUndo.prototype.merge = function(undo) {
    return false;
};

CPUndo.prototype.noChange = function() {
    return false;
};

CPUndo.prototype.getMemoryUsed = function(undone, param) {
    return 0;
}
