# vim: set ft=make:

# This makefile is being included by the top-level application makefile. It is
# recommended to prefix variables or targets with this module's name, to avoid
# conflicts with makefiles from other modules.

# module directory:
#feathers-validation_dir := $(patsubst %/,%,$(dir $(abspath $(lastword $(MAKEFILE_LIST)))))

# this is called by the parent Makefile when this module is installed:
_feathers-validation-clone:

# this is called by the parent Makefile when this module is removed:
_feathers-validation-remove:

# remove the leading _ to "unhide" this target:
_feathers-validation-help:
	@echo "Usage: make [target]"
	@echo ""
	@echo "Targets:"
	@echo "  feathers-validation-help       this help"
	@echo ""

# add additional targets below...
