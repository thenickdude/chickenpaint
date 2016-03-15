$(document).ready(function() {
    new ChickenPaint({
        uiElem: document.getElementById("chickenpaint-parent"),
        loadChibiFileUrl: "./uploaded.chi",
        saveUrl: "post.php?session_id=1",
        postUrl: "posting.php",
        exitUrl: "forum.php",
        allowSave: false,
        resourcesRoot: "../resources/"
    });
});
