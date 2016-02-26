all : styles/chickenpaint.css

clean :
	rm -f styles/chickenpaint.css

styles/chickenpaint.css : styles/chickenpaint.less
	lessc $< > $@