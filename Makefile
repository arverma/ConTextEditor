.DEFAULT_GOAL := all

.PHONY: all help install dev build preview test test-browser check typecheck verify clean

all: build ## Default target: build the website

help: ## Show this help message
	@echo "Usage: make [target]"
	@echo ""
	@echo "Available targets:"
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}' $(MAKEFILE_LIST)

install: ## Install root and test dependencies
	npm ci
	npm ci --prefix tests

dev: ## Start local Vite development server
	npm run dev

build: ## Build website into dist-editor/
	npm run build

preview: ## Build and preview production site locally
	npm run preview

test: ## Run unit and regression tests
	npm test

test-browser: ## Run browser end-to-end tests
	npm --prefix tests run test:browser

check: typecheck ## Run typecheck (alias for typecheck)

typecheck: ## Run TypeScript compiler checks without emitting files
	npx tsc --noEmit

verify: test typecheck build ## Run pre-PR checks (test, typecheck, build)

clean: ## Remove build artifacts
	rm -rf dist-editor
