export default function CPSplashScreen(uiParent, loader, resourcesRoot) {
    const
        MAX_SMOOTHIE_OFFSET = 170;

    var
        canvas = document.createElement("canvas"),
        canvasContext = canvas.getContext("2d"),

        cup = new Image(),
        lid = new Image(),
        outlines = new Image(),
        text = new Image(),

        shading = new Image(),
        highlights = new Image(),
        smoothie = new Image(),

        images = [cup, lid, outlines, text, shading, highlights, smoothie],
        loadedCount = 0,

        cupComposite, smoothieComposite,
        cupCompositeContext, smoothieCompositeContext,

        progress = 0.0,
        message = "",

        fontHeight = 14;

    var imageRoot = resourcesRoot + "splash/";

    for (var i = 0; i < images.length; i++) {
        images[i].onload = function() {
            loadedCount++;

            if (loadedCount == images.length) {
                repaint();
            }
        }
    }

    cup.src = imageRoot + "cup.png";
    highlights.src = imageRoot + "highlights.png";
    lid.src = imageRoot + "lid.png";
    outlines.src = imageRoot + "lines.png";
    shading.src = imageRoot + "shading.png";
    smoothie.src = imageRoot + "smoothie.png";
    text.src = imageRoot + "text.png";

    function buildSmoothieComposite(imgWidth, imgHeight, progress) {
        if (!smoothieComposite) {
            smoothieComposite = document.createElement("canvas");

            smoothieComposite.width = imgWidth;
            smoothieComposite.height = imgHeight;

            smoothieCompositeContext = smoothieComposite.getContext("2d");
        }

        // First draw the smoothie in its mask position:
        smoothieCompositeContext.globalCompositeOperation = "copy";
        smoothieCompositeContext.drawImage(smoothie, 0, 0);

        // Now shift the smoothie downwards and use the original position as a mask
        smoothieCompositeContext.globalCompositeOperation = "source-in";
        smoothieCompositeContext.drawImage(smoothie, 0, Math.round(progress * MAX_SMOOTHIE_OFFSET));
    }

    function buildCupComposite(imgWidth, imgHeight, progress) {
        if (!cupComposite) {
            cupComposite = document.createElement("canvas");

            cupComposite.width = imgWidth;
            cupComposite.height = imgHeight;

            cupCompositeContext = cupComposite.getContext("2d");
        }

        cupCompositeContext.globalCompositeOperation = "copy";
        cupCompositeContext.drawImage(cup, 0, 0);

        buildSmoothieComposite(imgWidth, imgHeight, progress);

        cupCompositeContext.globalCompositeOperation = "source-over";
        cupCompositeContext.drawImage(smoothieComposite, 0, 0);

        cupCompositeContext.drawImage(lid, 0, 0);

        cupCompositeContext.globalCompositeOperation = "screen";
        cupCompositeContext.drawImage(highlights, 0, 0);

        cupCompositeContext.globalCompositeOperation = "multiply";
        cupCompositeContext.drawImage(shading, 0, 0);

        return cupComposite;
    }

    function repaint() {
        var
            centerX = canvas.width / 2,
            centerY = canvas.height / 2;

        canvasContext.fillStyle = 'white';
        canvasContext.fillRect(0, 0, canvas.width, canvas.height);

        if (loadedCount == images.length) {
            var
                imgWidth = text.width,
                imgHeight = text.height,
                left = Math.round(centerX - imgWidth / 2),
                top = Math.round(centerY - imgHeight / 2);

            canvasContext.drawImage(text, left, top);

            buildCupComposite(imgWidth, imgHeight, progress);

            //The whole cup composite is slightly transparent
            canvasContext.globalAlpha = 0.88;
            canvasContext.drawImage(cupComposite, left, top);

            canvasContext.globalAlpha = 1.0;

            canvasContext.drawImage(outlines, left, top);

            centerY = Math.round(centerY + imgHeight / 2 + 2);
        }

        if (message != "") {
            canvasContext.fillStyle = "black";

            var
                lines = message.split("\n");

            for (var i = 0; i < lines.length; i++) {
                var
                    line = lines[i],
                    lineWidth = canvasContext.measureText(line).width;

                centerY += fontHeight * 2;

                canvasContext.fillText(line, centerX - lineWidth / 2, centerY);
            }
        }
    }

    function resize() {
        // Use the canvas dimensions set by the CSS styles
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;

        canvasContext.font = fontHeight + "pt sans-serif";

        repaint();
    }

    loader.on("loadingProgress", function(_progress, _message) {
        progress = _progress;
        message = _message;

        repaint();
    });

    loader.on("loadingFailure", function(_message) {
        progress = 0;
        message = _message;

        repaint();
    });

    loader.on("loadingComplete", function() {
        window.removeEventListener("resize", resize);
        uiParent.removeChild(canvas);
    });

    window.addEventListener("resize", resize);

    canvas.className = "chickenpaint-splash-screen";

    uiParent.appendChild(canvas);

    resize();
}
