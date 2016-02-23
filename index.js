$(document).ready(function() {

    function loadChibi(file) {
        var reader = new FileReader();

        reader.onload = function(e) {
            var 
                bytes = new Uint8Array(e.target.result);

            var chickenPaint = new ChickenPaint(document.getElementById("chickenpaint-parent"), bytes);
        };

        reader.readAsArrayBuffer(file);
    }
    
    $(".file-open").change(function(e) {
        var 
            files = e.target.files,
            i;
        
        for (i = 0; i < files.length; i++) {
            loadChibi(files[i]);
        }
    });
    
    //var chickenPaint = new ChickenPaint(document.getElementById("chickenpaint-parent"));
});