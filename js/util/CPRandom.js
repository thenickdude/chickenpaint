export default function CPRandom() {
    var 
        nextNextGaussian, 
        haveNextNextGaussian = false;

    /**
     * Definition from Java, mean of 0.0 and standard deviation 1.0.
     */
    this.nextGaussian = function() {
        if (haveNextNextGaussian) {
            haveNextNextGaussian = false;
            return nextNextGaussian;
        } else {
            
            var
                v1, v2, s;
            
            do {
                v1 = 2 * Math.random() - 1; // between -1.0 and 1.0
                v2 = 2 * Math.random() - 1; // between -1.0 and 1.0
                s = v1 * v1 + v2 * v2;
            } while (s >= 1 || s == 0);
            
            var
                multiplier = Math.sqrt(-2 * Math.log(s) / s);
            
            nextNextGaussian = v2 * multiplier;
            haveNextNextGaussian = true;
            
            return v1 * multiplier;
        }
    };
};