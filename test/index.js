$(document).ready(function() {
    new ChickenPaint({
        uiElem: document.getElementById("chickenpaint-parent"),
        //loadImageUrl: "./uploaded.png",
        //loadChibiFileUrl: "./uploaded.chi",
        saveUrl: "save.php",
        postUrl: "posting.php",
        exitUrl: "forum.php",
        allowSave: true,
        allowMultipleSends: true,
        resourcesRoot: "../resources/"
    });
});
