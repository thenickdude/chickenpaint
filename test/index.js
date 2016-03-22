$(document).ready(function() {
    new ChickenPaint({
        uiElem: document.getElementById("chickenpaint-parent"),
        //loadImageUrl: "./uploaded.png",
        loadChibiFileUrl: "./2387995.chi",
        saveUrl: "save.php",
        postUrl: "posting.php",
        exitUrl: "forum.php",
        allowSave: true,
        resourcesRoot: "../resources/"
    });
});
