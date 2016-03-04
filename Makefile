all : styles/css/chickenpaint.css

clean :
	rm -f styles/css/chickenpaint.css

styles/css/chickenpaint.css : styles/css/chickenpaint.less
	lessc $< > $@