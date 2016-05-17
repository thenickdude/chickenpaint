OSASCRIPT := $(shell command -v osascript 2> /dev/null)

all : resources/css/chickenpaint.css resources/js/chickenpaint.js
ifdef OSASCRIPT
	osascript -e 'display notification "Build successful" with title "ChickenPaint build complete"'
endif

min : resources/js/chickenpaint.min.js

resources/js/chickenpaint.min.js : resources/js/chickenpaint.js
	cd resources/js && ../../node_modules/.bin/uglifyjs --compress --mangle --screw-ie8 --source-map chickenpaint.min.js.map --source-map-url chickenpaint.min.js.map --output chickenpaint.min.js chickenpaint.js 

resources/js/chickenpaint.js : js/engine/* js/gui/* js/util/* js/ChickenPaint.js js/engine/CPBlend.js
	node_modules/.bin/browserify --standalone ChickenPaint --outfile $@ -d -e js/ChickenPaint.js -t babelify

.PHONY: test blending-bench blending-test

test: blending-bench blending-test

blending-bench: test/blending_bench/blending.js
blending-test: test/blending_test/blending.js

test/blending_test/blending.js : js/engine/CPBlend.js js/engine/CPBlend2.js test/blending_test/blending.es6.js
	node_modules/.bin/browserify --standalone BlendingTest --outfile $@ -d -e test/blending_test/blending.es6.js -t babelify

test/blending_bench/blending.js : js/engine/CPBlend.js js/engine/CPBlend2.js test/blending_bench/blending.es6.js
	node_modules/.bin/browserify --standalone BlendingBench --outfile $@ -d -e test/blending_bench/blending.es6.js -t babelify

js/engine/CPBlend.js : codegenerator/BlendGenerator.js
	node codegenerator/BlendGenerator.js > js/engine/CPBlend.js

js/engine/CPBlend2.js : codegenerator/BlendGenerator.js
	node codegenerator/BlendGenerator.js > js/engine/CPBlend2.js

clean :
	rm -f resources/css/chickenpaint.css resources/js/chickenpaint.js resources/js/chickenpaint.min.js resources/js/chickenpaint.min.js.map test/blending_bench/blending_test.js test/blending_bench/blending.js js/engine/CPBlend2.js
	rm -rf dist/*

resources/css/chickenpaint.css : resources/css/chickenpaint.less
	node_modules/.bin/lessc $< > $@