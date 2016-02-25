function CPTablet() {
    var 
        tabletOK = false,

        pressure = 0, 
        pressureExtent = 1;

    function getTabletInfo() {
        // TODO
    }

    this.getPressure = function() {
        if (!tabletOK) {
            return 1.0;
        } else {
            getTabletInfo();
            //return (float) pressure / pressureExtent;
        }
    };

    this.mouseDetect = function() {
        pressure = pressureExtent = 1;
        getTabletInfo();
    };
}

CPTablet.getRef = function() {
    if (CPTablet.instance == null) {
        CPTablet.instance = new CPTablet();
    }
    return CPTablet.instance;
}