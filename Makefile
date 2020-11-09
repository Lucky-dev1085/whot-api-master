## Configuration
#

MODULES_GIT = $(shell cat package.json | jq -r '.settings.modules.git')
MODULES_DIR = $(shell cat package.json | jq -r '.settings.modules.dir')
MODULES_TPL = $(shell cat package.json | jq -r '.settings.modules.tpl // empty')
MODULES_PFX = node-module-

# application rootdir, to be used by module makefiles:
ROOT_DIR := $(patsubst %/,%,$(dir $(abspath $(lastword $(MAKEFILE_LIST)))))

## Application Specific Targets
#

default:
	@[ ! -d "node_modules" ] && npm i || true
	@sh -c "trap 'npm run dev' EXIT; exit 0"

app-help:
	@echo "Application specific targets:"
	@echo "  [default]       start app in development mode"
	@echo "  prod            start app in production mode"
	@echo "  build-image     build a docker image with the api code"
	@echo "  build-quickly     build a docker image by overwriting the app code over the latest image"
	@echo "  publish-image   publish the docker image to gcr.io/intelia_hosting"
	@echo ""

prod:
	@[ ! -d "node_modules" ] && npm i || true
	@rm -rf dist
	@npm run build
	@sh -c "trap 'npm run prod' EXIT; exit 0"

## Deployment Targets
#

build-image:
	@echo "Building from scratch: whot-api-${shell git rev-parse --abbrev-ref HEAD}"
	@docker build -f Dockerfile -t whot-api-${shell git rev-parse --abbrev-ref HEAD} .
	@echo "Done! use 'make publish-image' to push new image"

build-quickly:
	@echo "Building quickly: whot-api-${shell git rev-parse --abbrev-ref HEAD}"
	@docker build -f build-quick.Dockerfile -t whot-api-${shell git rev-parse --abbrev-ref HEAD} .
	@echo "Done! use "make publish-image" to push new image"

publish-image:
	@docker tag whot-api-${shell git rev-parse --abbrev-ref HEAD} gcr.io/intelia_hosting/whot-api-${shell git rev-parse --abbrev-ref HEAD}:${shell git rev-parse --short HEAD}
	@docker push gcr.io/intelia_hosting/whot-api-${shell git rev-parse --abbrev-ref HEAD}:${shell git rev-parse --short HEAD}
	@echo "Done: gcr.io/intelia_hosting/whot-api-${shell git rev-parse --abbrev-ref HEAD}:${shell git rev-parse --short HEAD}"

## Bootstrap
#

include src/modules/bootstrap/init.mk

## Module Configuration
#

# merge module default config into the app's config:
module-cfgadd:
	@true \
		&& $(call module_sh_installed,$(name)) \
		&& if [ -f "$(MODULES_DIR)/$$MODULE_DIR/defaults.json" ]; then cat $(MODULES_DIR)/$$MODULE_DIR/defaults.json config/default.json | jq --arg DIR "$$MODULE_DIR" --slurp '.[1].modules[$$DIR] = .[0] * (.[1].modules[$$DIR] // {}) | .[1]' > config/default.json.tmp && mv config/default.json.tmp config/default.json; fi

# remove module config from the app config:
module-cfgrem:
	@true \
		&& $(call module_sh_identifiers,$(name)) \
		&& cat config/default.json | jq --arg DIR "$$MODULE_DIR" 'del(.modules[$$DIR])' > config/default.json.tmp && mv config/default.json.tmp config/default.json
