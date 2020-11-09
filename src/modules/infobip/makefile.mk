# This makefile is being included by the top-level application makefile. It is
# recommended to prefix variables or targets with this module's name, to avoid
# conflicts with makefiles from other modules.

# module directory:
#node-module-infobip_dir := $(patsubst %/,%,$(dir $(abspath $(lastword $(MAKEFILE_LIST)))))

# this is called by the parent Makefile when this module is installed:
_node-module-infobip-clone:
	@true

# this is called by the parent Makefile when this module is removed:
_node-module-infobip-remove:
	@true

# remove the leading _ to "unhide" this target:
_node-module-infobip-help:
	@echo "Targets provided by the \"node-module-infobip\" module:"
	@echo ""
	@echo "  node-module-infobip-target       sample target"
	@echo ""

