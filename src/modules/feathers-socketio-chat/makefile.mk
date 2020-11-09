# This makefile is being included by the top-level application makefile. It is
# recommended to prefix variables or targets with this module's name, to avoid
# conflicts with makefiles from other modules.

# module directory:
#node-module-feathers-socketio-chat_dir := $(patsubst %/,%,$(dir $(abspath $(lastword $(MAKEFILE_LIST)))))

# this is called by the parent Makefile when this module is installed:
_node-module-feathers-socketio-chat-clone:
	@true

# this is called by the parent Makefile when this module is removed:
_node-module-feathers-socketio-chat-remove:
	@true

# remove the leading _ to "unhide" this target:
_node-module-feathers-socketio-chat-help:
	@echo "Targets provided by the \"node-module-feathers-socketio-chat\" module:"
	@echo ""
	@echo "  node-module-feathers-socketio-chat-target       sample target"
	@echo ""

