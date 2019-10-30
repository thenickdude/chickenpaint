document.addEventListener("DOMContentLoaded", function() {
    new ChickenPaint({
        uiElem: document.getElementById("chickenpaint-parent"),
        //loadImageUrl: "./uploaded.png",
        //loadChibiFileUrl: "./uploaded.chi",
        saveUrl: "save.php",
        postUrl: "posting.php",
        exitUrl: "forum.php",
        allowDownload: true,
        resourcesRoot: "../resources/",
        disableBootstrapAPI: true
    });
});
