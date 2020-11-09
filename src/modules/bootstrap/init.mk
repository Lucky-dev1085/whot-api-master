BOOTSTRAP_DIR := $(patsubst %/,%,$(dir $(abspath $(lastword $(MAKEFILE_LIST)))))

## Common Targets
#

help: help_targets = $(filter-out app-help module-help,$(filter %help,$(call utils_targets,true)))
help:
	@echo "Usage: make [target]"
	@echo ""
	@$(MAKE) app-help
	@echo "Common targets:"
	@echo ""
	@echo "  init [name=...]       automate the initial commit for this app"
	@echo "  release               release a new version"
	@echo "  clean                 clean working directory"
	@echo "  help                  this help"
	@echo ""
	@$(MAKE) module-help
	@for t in $(help_targets); do $(MAKE) $$t; done

# automate the initial commit for this app:
init:
	@$(call utils_sh_confirm,$(strip This will reset the .git directory, are you sure?))
	@true \
		&& NAME=$$([ ! -z "$(name)" ] && echo $(name) || echo $$($(call utils_sh_input,$(strip Application name:),$(shell basename `pwd`)))) \
		&& REPO=$$([ ! -z "$(repo)" ] && echo $(repo) || echo $$($(call utils_sh_input,$(strip GIT repository:),$(MODULES_GIT)/$$NAME))) \
		&& cat package.json | jq --arg NAME "$$NAME" --arg REPO "$$REPO" '.name = $$NAME | .version = "1.0.0" | .description = "" | .repository.url = $$REPO' > package.json.tmp && mv package.json.tmp package.json \
		&& if [ -f README-app.md ]; then NAME=$$NAME REPO=$$REPO envsubst < README-app.md > README.md && rm README-app.md; fi \
		&& rm -rf .git \
		&& git init \
		&& git add . \
		&& git commit -m "temp: initial commit" \
		&& find $(MODULES_DIR) -type f -name .gitrepo -maxdepth 2 -exec sh -c 'HASH=`git rev-parse HEAD` && sed -e "s/parent =.*$$/parent = $$HASH/" {} > {}.tmp && mv {}.tmp {}' \; \
		&& git commit -m "temp: configure git-subrepo for pre-installed modules" -a \
		&& git subrepo pull --all \
		&& rm -rf .git \
		&& git init \
		&& git add . \
		&& git commit -m "build: initial commit" \
		&& find $(MODULES_DIR) -type f -name .gitrepo -maxdepth 2 -exec sh -c 'HASH=`git rev-parse HEAD` && sed -e "s/parent =.*$$/parent = $$HASH/" {} > {}.tmp && mv {}.tmp {}' \; \
		&& git commit -m "build: configure git-subrepo for pre-installed modules" -a \
		&& echo "" && echo 'Happy coding! :)' && echo ""

# release a new version:
release:
	@standard-version $$( [ -f CHANGELOG.md ] && echo "" || echo "--first-release")

# clean working directory:
clean:
	@rm -rf dist
	@find . -name node_modules -type d -prune -exec rm -rf '{}' +

## CLI
#

include $(MODULES_DIR)/cli/init.mk
