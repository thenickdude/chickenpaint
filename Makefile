.PHONY: test blending-bench blending-test dist all min tools

ENGINE_SOURCE = js/engine/* js/util/*

# Excluding the Gradient tool which has dedicated dark/light variants
TOOLBAR_ICONS = \
	Airbrush.svg \
	Bezier_Curve.svg \
	Blend.svg \
	Blur.svg \
	Brush.svg \
	Bucket_Fill.svg \
	Burn.svg \
	Circle_Draw.svg \
	Circular_Selection.svg \
	Colour_Picker.svg \
	Dodge.svg \
	Eraser_Hard.svg \
	Eraser_Soft.svg \
	Free-hand_Stroke.svg \
	Free_Selection.svg \
	Grabbing_Hand_1.svg \
	Grabbing_Hand_2.svg \
	Hand.svg \
	Magic_Wand_1.svg \
	Magic_Wand_2.svg \
	Move.svg \
	Pen.svg \
	Pencil.svg \
	Post_Pic.svg \
	Rectangle_Draw.svg \
	Rectangular_Selection.svg \
	Redo.svg \
	Rotate.svg \
	Rotate_Canvas.svg \
	Save.svg \
	Select.svg \
	Smudge.svg \
	Straight_Line.svg \
	Undo.svg \
	Watercolour.svg \
	Zoom.svg \
	Zoom_100.svg \
	Zoom_In.svg \
	Zoom_Out.svg

ICON_DARK_COLOUR = \#333
ICON_LIGHT_COLOUR = \#e3e3e3

OSASCRIPT := $(shell command -v osascript 2> /dev/null)

CAIROSVG := $(shell command -v cairosvg 2> /dev/null)

all : resources/css/chickenpaint.css resources/js/chickenpaint.js \
	resources/gfx/icons-dark-32.png resources/gfx/icons-dark-64.png \
	resources/gfx/icons-light-32.png resources/gfx/icons-light-64.png

dist: all min chickenpaint.zip

ifdef OSASCRIPT
	osascript -e 'display notification "Build successful" with title "ChickenPaint build complete"'
endif

min : resources/js/chickenpaint.min.js

chickenpaint.zip: resources/css/chickenpaint.css resources/js/chickenpaint.js resources/js/chickenpaint.min.js resources/js/chickenpaint.min.js.map js/engine/CPBlend.js
	rm -f $@
	git archive -o $@ HEAD
	zip $@ $^

# node_modules/.bin/sass node_modules/.bin/browserify node_modules/.bin/icomoon-build :
# 	npm install

resources/css/chickenpaint.css : resources/css/chickenpaint.scss resources/fonts/ChickenPaint-Symbols.scss node_modules/.bin/sass
	node_modules/.bin/sass $< > $@
	node_modules/.bin/postcss --replace $@

resources/js/chickenpaint.min.js resources/js/chickenpaint.min.js.map : resources/js/chickenpaint.js
	cd resources/js && ../../node_modules/.bin/uglifyjs --compress --mangle \
		--source-map "content='chickenpaint.js.map',filename='chickenpaint.min.js.map',url='chickenpaint.min.js.map',root='./'" --output chickenpaint.min.js -- chickenpaint.js

resources/js/chickenpaint.js : js/engine/* js/gui/* js/util/* js/languages/* js/ChickenPaint.js js/engine/CPBlend.js lib/*
	mkdir -p resources/js
	node_modules/.bin/browserify --standalone ChickenPaint --debug --entry js/ChickenPaint.js --transform babelify | node_modules/.bin/exorcist $@.map > $@

# resources/fonts/ChickenPaint-Symbols.scss : resources/fonts/chickenpaint-symbols-source/*
# 	node_modules/.bin/icomoon-build -p "resources/fonts/chickenpaint-symbols-source/ChickenPaint Symbols.json" --scss resources/fonts/ChickenPaint-Symbols.scss --fonts resources/fonts

ifdef CAIROSVG
# Render icons with CairoSVG (https://cairosvg.org/) - Preferred since results are much sharper at 32px size 
resources/gfx/icons-dark-%.png : resources/gfx/icons-source/dark/Gradient_Dark.svg $(foreach icon,$(TOOLBAR_ICONS),resources/gfx/icons-source/dark/$(icon))
	for input in $^; do cairosvg --output-width $* --output-height $* --output $$input.png $$input; done
	montage -background none $(addsuffix .png,$^) -tile 8x5 -geometry $*x$*+0+0 -depth 8 $@
	-optipng $@

resources/gfx/icons-light-%.png : resources/gfx/icons-source/dark/Gradient_Light.svg $(foreach icon,$(TOOLBAR_ICONS),resources/gfx/icons-source/light/$(icon))
	for input in $^; do cairosvg --output-width $* --output-height $* --output $$input.png $$input; done
	montage -background none $(addsuffix .png,$^) -tile 8x5 -geometry $*x$*+0+0 -depth 8 $@
	-optipng $@
else
# Render icons with ImageMagick
# ImageMagick needs to be built with rsvg2 support enabled to render gradients properly 
resources/gfx/icons-dark-%.png : resources/gfx/icons-source/dark/Gradient_Dark.svg $(foreach icon,$(TOOLBAR_ICONS),resources/gfx/icons-source/dark/$(icon))
	montage -background none $^ -tile 8x5 -geometry $*x$*+0+0 -depth 8 $@
	-optipng $@

resources/gfx/icons-light-%.png : resources/gfx/icons-source/dark/Gradient_Light.svg $(foreach icon,$(TOOLBAR_ICONS),resources/gfx/icons-source/light/$(icon))
	montage -background none $^ -tile 8x5 -geometry $*x$*+0+0 -depth 8 $@
	-optipng $@
endif

resources/gfx/icons-source/dark/%.svg : resources/gfx/icons-source/%.svg
	mkdir -p resources/gfx/icons-source/dark
	sed 's/fill: *#33*/fill: $(ICON_DARK_COLOUR)/g' $< > $@

resources/gfx/icons-source/light/%.svg : resources/gfx/icons-source/%.svg
	mkdir -p resources/gfx/icons-source/light
	sed 's/fill: *#33*/fill: $(ICON_LIGHT_COLOUR)/g' $< > $@

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
	rm -f resources/css/chickenpaint.css resources/js/chickenpaint{.js,.js.map} resources/js/chickenpaint.min{.js,.js.map}
	rm -f test/blending_bench/blending_test.js test/blending_bench/blending.js test/integration_test/integration.js js/engine/CPBlend.js
	rm -f resources/fonts/ChickenPaint-Symbols.{scss,ttf,woff,eot}
	rm -f chickenpaint.zip
	rm -rf resources/gfx/icons-source/dark resources/gfx/icons-source/light
