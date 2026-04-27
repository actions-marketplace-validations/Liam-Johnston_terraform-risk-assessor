.PHONY: build install typecheck clean

install:
	bun install

build: install
	bun run build

typecheck: install
	bun run typecheck

clean:
	rm -rf dist node_modules
