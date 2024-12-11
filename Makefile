dist: *.html *.js *.css *.svg
	rm -rf dist
	mkdir dist
	cp *.{html,js,css,svg} dist/

.PHONY: clean
clean:
	rm -rf dist

.PHONY: format
format:
	prettier -w *
