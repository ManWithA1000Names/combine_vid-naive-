all: build

build:
	mkdir -p out
	deno compile -A main.ts
	mv some_js-deno ./out/

release: build

run:
	deno run -A main.ts

run-release: run

test:
	deno test
