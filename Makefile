all : styles/css/chickenpaint.css dist/chickenpaint.js

dist/chickenpaint.js : js/engine/* js/gui/* js/util/* js/ChickenPaint.js
	browserify --standalone ChickenPaint --outfile dist/chickenpaint.js -d -e js/ChickenPaint.js -t babelify

clean :
	rm -f styles/css/chickenpaint.css
	rm -f dist/chickenpaint.js

styles/css/chickenpaint.css : styles/css/chickenpaint.less
	lessc $< > $@