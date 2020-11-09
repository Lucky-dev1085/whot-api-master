# This makefile is being included by the top-level application makefile. It is
# recommended to prefix variables or targets with this module's name, to avoid
# conflicts with makefiles from other modules.

# module directory:
#node-module-bulksmsnigeria_dir := $(patsubst %/,%,$(dir $(abspath $(lastword $(MAKEFILE_LIST)))))

# this is called by the parent Makefile when this module is installed:
_node-module-bulksmsnigeria-clone:
	@true

# this is called by the parent Makefile when this module is removed:
_node-module-bulksmsnigeria-remove:
	@true

# remove the leading _ to "unhide" this target:
_node-module-bulksmsnigeria-help:
	@echo "Targets provided by the \"node-module-bulksmsnigeria\" module:"
	@echo ""
	@echo "  node-module-bulksmsnigeria-target       sample target"
	@echo ""

