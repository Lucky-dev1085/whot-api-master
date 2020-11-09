# vim: set ft=make:

# This makefile is being included by the top-level application makefile. It is
# recommended to prefix variables or targets with this module's name, to avoid
# conflicts with makefiles from other modules.

# module directory:
#email_dir := $(patsubst %/,%,$(dir $(abspath $(lastword $(MAKEFILE_LIST)))))

# this is called by the parent Makefile when this module is installed:
_email-clone:
	@true

# this is called by the parent Makefile when this module is removed:
_email-remove:
	@true

# remove the leading _ to "unhide" this target:
_email-help:
	@echo "Targets provided by the \"email\" module:"
	@echo "  email-target       sample target"
	@echo ""

