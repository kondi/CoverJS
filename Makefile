all: convert-amd build build-compress

build: convert-amd
	@node_modules/.bin/r.js -o build.js

build-compress: convert-amd
	@node_modules/.bin/r.js -o build-compress.js

convert-amd:
	@bash ./bin/convert-amd.sh
