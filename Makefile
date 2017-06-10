.PHONY: test blending-bench blending-test

ENGINE_SOURCE = js/engine/* js/util/*

OSASCRIPT := $(shell command -v osascript 2> /dev/null)

all : resources/css/chickenpaint.css resources/js/chickenpaint.js

ifdef OSASCRIPT
	osascript -e 'display notification "Build successful" with title "ChickenPaint build complete"'
endif

min : resources/js/chickenpaint.min.js

resources/css/chickenpaint.css : resources/css/chickenpaint.less resources/fonts/ChickenPaint-Symbols.less
	node_modules/.bin/lessc $< > $@

resources/js/chickenpaint.min.js : resources/js/chickenpaint.js
	cd resources/js && ../../node_modules/.bin/uglifyjs --compress --mangle --screw-ie8 --source-map chickenpaint.min.js.map --source-map-url chickenpaint.min.js.map --output chickenpaint.min.js chickenpaint.js 

resources/js/chickenpaint.js : js/engine/* js/gui/* js/util/* js/ChickenPaint.js js/engine/CPBlend.js
	node_modules/.bin/browserify --standalone ChickenPaint --outfile $@ -d -e js/ChickenPaint.js -t babelify

resources/fonts/ChickenPaint-Symbols.less : resources/fonts/chickenpaint-symbols-source/*
	node_modules/.bin/icomoon-build -p "resources/fonts/chickenpaint-symbols-source/ChickenPaint Symbols.json" --less resources/fonts/ChickenPaint-Symbols.less --fonts resources/fonts

test: thumbnail-test integration-test blending-test

tools: blending-bench blending-compare

blending-bench: test/blending/bench/blending.js
blending-compare: test/blending/test/blending.js

thumbnail-test: test/thumbnail_test/thumbnail.js
integration-test: test/integration_test/integration.js

test/blending/compare/blending.js : js/engine/CPBlend.js js/engine/CPBlend2.js test/blending/compare/blending.es6.js $(ENGINE_SOURCE)
	node_modules/.bin/browserify --standalone BlendingTest --outfile $@ -d -e test/blending/compare/blending.es6.js -t babelify

test/blending/bench/blending.js : js/engine/CPBlend.js js/engine/CPBlend2.js test/blending/bench/blending.es6.js $(ENGINE_SOURCE)
	node_modules/.bin/browserify --standalone BlendingBench --outfile $@ -d -e test/blending/bench/blending.es6.js -t babelify

test/thumbnail_test/thumbnail.js : js/engine/CPImageLayer.js js/engine/CPColorBmp.js test/thumbnail_test/thumbnail.es6.js $(ENGINE_SOURCE)
	node_modules/.bin/browserify --standalone ThumbnailTest --outfile $@ -d -e test/thumbnail_test/thumbnail.es6.js -t babelify

test/integration_test/integration.js : test/integration_test/integration.es6.js $(ENGINE_SOURCE)
	node_modules/.bin/browserify --standalone IntegrationTest --outfile $@ -d -e test/integration_test/integration.es6.js -t babelify

js/engine/CPBlend2.js :
	touch js/engine/CPBlend2.js

js/engine/CPBlend.js : codegenerator/BlendGenerator.js
	node codegenerator/BlendGenerator.js > js/engine/CPBlend.js

clean :
	rm -f resources/css/chickenpaint.css resources/js/chickenpaint.js resources/js/chickenpaint.min.js resources/js/chickenpaint.min.js.map
	rm -f test/blending_bench/blending_test.js test/blending_bench/blending.js test/integration_test/integration.js js/engine/CPBlend.js
	rm -f resources/fonts/ChickenPaint-Symbols.{less,ttf,woff,eot}
	rm -rf dist/*
