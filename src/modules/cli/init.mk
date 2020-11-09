CLI_DIR := $(patsubst %/,%,$(dir $(abspath $(lastword $(MAKEFILE_LIST)))))

include $(CLI_DIR)/utils.mk
include $(CLI_DIR)/module.mk

# add targets defined in modules:
include $(wildcard $(MODULES_DIR)/*/makefile.mk)
include $(wildcard $(MODULES_DIR)/*/makefile.inc)
