# vim: set ft=make:

# This makefile is being included by the top-level application makefile. It is
# recommended to prefix variables or targets with this module's name, to avoid
# conflicts with makefiles from other modules.

# module directory:
email-templates_dir := $(patsubst %/,%,$(dir $(abspath $(lastword $(MAKEFILE_LIST)))))

# this is called by the parent Makefile when this module is installed:
_email-templates-clone:

# this is called by the parent Makefile when this module is removed:
_email-templates-remove:

email-templates-help:
	@echo "Targets provided by the \"email-templates\" module:"
	@echo ""
	@echo "  email-templates-init           initialize email templates"
	@echo "  email-templates                compile templates"
	@echo "  email-templates-preview        preview templates"
	@echo "  email-templates-s3upload       compile, then upload assets to S3 and update paths in dist/"
	@echo ""

email-templates-init:
	@if [ -d "email-templates" ]; then echo "Email templates already initialized."; exit 1; fi
	@mkdir email-templates
	@cp -r $(email-templates_dir)/.grunt-email-workflow/src email-templates/
	@cp $(email-templates_dir)/gitignore email-templates/.gitignore
	@echo "Email templates initialized in \"./email-templates\"."

email-templates:
	@if [ ! -d "$(email-templates_dir)/.grunt-email-workflow/node_modules" ]; then cd $(email-templates_dir)/.grunt-email-workflow && npm i; fi
	@cd $(email-templates_dir)/.grunt-email-workflow && ../node_modules/.bin/grunt --force

email-templates-preview:
	@if [ ! -d "$(email-templates_dir)/.grunt-email-workflow/node_modules" ]; then cd $(email-templates_dir)/.grunt-email-workflow && npm i; fi
	@cd $(email-templates_dir)/.grunt-email-workflow && ../node_modules/.bin/grunt serve --force
	
email-templates-s3upload:
	@if [ ! -d "$(email-templates_dir)/.grunt-email-workflow/node_modules" ]; then cd $(email-templates_dir)/.grunt-email-workflow && npm i; fi
	@cd $(email-templates_dir)/.grunt-email-workflow && ../node_modules/.bin/grunt s3upload

.PHONY: email-templates
