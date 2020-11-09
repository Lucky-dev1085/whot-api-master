# vim: set ft=make:

# This makefile is being included by the top-level application makefile. It is
# recommended to prefix variables or targets with this module's name, to avoid
# conflicts with makefiles from other modules.

# module directory:
SEQUELIZE_MODULE_DIR := $(patsubst %/,%,$(dir $(abspath $(lastword $(MAKEFILE_LIST)))))
SEQUELIZE_DATETIME = `date +%Y%m%d%H%M%S`
SEQUELIZE_DIR := db/sequelize

# this is called by the parent Makefile when this module is installed:
_sequelize-clone:

# this is called by the parent Makefile when this module is removed:
_sequelize-remove:

# remove the leading _ to "unhide" this target:
dbhelp:
	@echo "Targets provided by the \"sequelize\" module:"
	@echo ""
	@echo "  dbinit                                             initialize database from available models"
	@echo "  dbshell                                            open a database shell"
	@echo "  dbup                                               run pending migrations"
	@echo "  dbundo                                             revert the last migration"
	@echo "  dbseed [name=...]                                  run custom seeder or all init seeders"
	@echo "  dbunseed [name=...]                                revert custom seeder or all init seeders"
	@echo "  dbmigration [name|table|auto=...] [file=...]       create a migration"
	@echo "  dbseeder custom|init=...                           create a seeder"
	@echo "  dbreset                                            reset database to initial state"
	@echo "  dbdrop                                             drop all tables"
	@echo "  dbdump [only=data|structure]                       dump database data and/or structure"
	@echo "  dbinfo                                             show database info"
	@echo ""

# initialize database from available models:
dbinit:
	@$(call utils_sh_confirm,$(strip This will delete your database and migration files, are you sure?))
	@$(MAKE) dbdrop autoconfirm=y
	@rm -rf $(SEQUELIZE_DIR)/migrations
	@$(MAKE) dbmigration file=00000000000000-init.js
	@$(MAKE) dbup
	@$(MAKE) dbseed

# create a migration:
dbmigration: NAME = $(and $(or $(name),$(table)),$(if $(table),create_$(table)_table,$(name)))
dbmigration: SKEL = $(and $(or $(name),$(table)),$(if $(table),table.js,migration.js))
dbmigration: FILE = $(SEQUELIZE_DIR)/migrations/$(or $(file),$(SEQUELIZE_DATETIME)$(if $(auto),-$(auto),$(and $(NAME),-$(NAME))).js)
dbmigration:
	@mkdir -p $(SEQUELIZE_DIR)/migrations
	@true \
		&& if [ -z "$(NAME)" ] \
		; then true \
		&& LAST_MIGRATION=$$(find $(ROOT_DIR)/$(SEQUELIZE_DIR)/migrations -type f | sort -r | head -1) \
		&& DATA=$$(node $(SEQUELIZE_MODULE_DIR)/scripts/migration.js $$LAST_MIGRATION) \
		&& if [ -z "$$DATA" ] \
		; then true \
		&& echo "Database is already up to date." \
		&& exit 0 \
		; else true \
		&& echo "$$DATA" > $(FILE) \
		; fi \
		; else true \
		&& cp $(SEQUELIZE_MODULE_DIR)/skel/$(SKEL) $(FILE) \
		&& sed -e "s/TABLE/$(table)/g" $(FILE) > $(FILE).tmp && mv $(FILE).tmp $(FILE) \
		; fi \
		&& if [ -z "$(file)" ]; then vim $(FILE); fi

# create a seeder:
dbseeder: NAME = $(and $(or $(custom),$(init)),$(if $(init),init/$(SEQUELIZE_DATETIME)-$(init),custom/$(custom)))
dbseeder: FILE = $(SEQUELIZE_DIR)/seeders/$(NAME).js
dbseeder:
	@$(call utils_sh_required,$(NAME),$(strip Missing seeder name. Try \'make dbhelp\' for syntax.))
	@[ -f "$(FILE)" ] && echo "ERROR: This seeder already exists." && exit 1 || true
	@mkdir -p $(dir $(FILE))
	@cp $(SEQUELIZE_MODULE_DIR)/skel/seeder.js $(FILE)
	@vim $(FILE)

# run pending migrations:
dbup:
	@mkdir -p $(SEQUELIZE_DIR)/migrations
	@cd $(SEQUELIZE_MODULE_DIR) && ./node_modules/.bin/sequelize db:migrate

# revert the last migrations:
dbundo:
	@mkdir -p $(SEQUELIZE_DIR)/migrations
	@cd $(SEQUELIZE_MODULE_DIR) && ./node_modules/.bin/sequelize db:migrate:undo

# run custom seeder or all init seeders:
dbseed:
	@true \
		&& if [ -z "$(name)" ] \
		; then true \
		&& mkdir -p $(SEQUELIZE_DIR)/seeders/init \
		&& cd $(SEQUELIZE_MODULE_DIR) && ./node_modules/.bin/sequelize db:seed:all \
		; else true \
		&& mkdir -p $(SEQUELIZE_DIR)/seeders/custom \
		&& cd $(SEQUELIZE_MODULE_DIR) && SEEDER_STORAGE=none ./node_modules/.bin/sequelize db:seed --seeders-path $(ROOT_DIR)/$(SEQUELIZE_DIR)/seeders/custom --seed $(name).js \
		; fi

# revert custom seeder or all init seeders:
dbunseed:
	@true \
		&& if [ -z "$(name)" ] \
		; then true \
		&& mkdir -p $(SEQUELIZE_DIR)/seeders/init \
		&& cd $(SEQUELIZE_MODULE_DIR) && ./node_modules/.bin/sequelize db:seed:undo:all \
		; else true \
		&& mkdir -p $(SEQUELIZE_DIR)/seeders/custom \
		&& cd $(SEQUELIZE_MODULE_DIR) && SEEDER_STORAGE=none ./node_modules/.bin/sequelize db:seed:undo --seeders-path $(ROOT_DIR)/$(SEQUELIZE_DIR)/seeders/custom --seed $(name).js \
		; fi

# reset database to initial state:
dbreset:
	@$(MAKE) dbdrop
	@$(MAKE) dbup
	@$(MAKE) dbseed

# db information:
DB_CODE = require('./bootstrap'); var o = require('url').parse(config.get('modules.sequelize.url'));
DB_NAME = $(shell node -e "$(DB_CODE) console.log(o.pathname.slice(1));")
DB_USER = $(shell node -e "$(DB_CODE) console.log(o.auth.split(':')[0] || '');")
DB_PASS = $(shell node -e "$(DB_CODE) console.log(o.auth.split(':')[1] || '');")
DB_HOST = $(shell node -e "$(DB_CODE) console.log(o.host.split(':')[0]);")
DB_PORT = $(shell node -e "$(DB_CODE) console.log(o.port || '');")
DB_KIND = $(shell node -e "$(DB_CODE) console.log(o.protocol.replace(':', ''));")

# shortcuts:
DB_ARGS_MYSQL = -u$(DB_USER) $(if $(DB_PASS),-p$(DB_PASS)) -h$(DB_HOST) -P$(or $(DB_PORT),3306)
DB_ARGS_POSTGRES = -U $(DB_USER) -h $(DB_HOST) -p $(or $(DB_PORT),5432)

# open a database shell:
dbshell:
	@$(MAKE) _dbshell-$(DB_KIND)

# open MySQL shell:
_dbshell-mysql:
	@mysql --default-character-set=utf8mb4 $(DB_ARGS_MYSQL) $(DB_NAME)

# open Postgres shell:
_dbshell-postgres:
	@PGPASSWORD=$(DB_PASS) psql $(DB_ARGS_POSTGRES) $(DB_NAME)

# drop all tables:
dbdrop:
	@$(call utils_sh_confirm,$(strip This will delete your database, are you sure?))
	@$(MAKE) _dbdrop-$(DB_KIND)

_dbdrop-mysql:
	@mysqldump --add-drop-table --no-data $(DB_ARGS_MYSQL) $(DB_NAME) \
		| grep 'DROP TABLE' | echo "SET FOREIGN_KEY_CHECKS = 0; $$(cat -)" \
		| mysql $(DB_ARGS_MYSQL) $(DB_NAME)

_dbdrop-postgres:
	@echo "Not yet supported for Postgres."

_dbdrop-postgresql:
	@echo "Not yet supported for Postgres."

# dump database:
dbdump:
	@$(MAKE) _dbdump-$(DB_KIND)

_dbdump-mysql:
	@mysqldump $(DB_ARGS_MYSQL) --complete-insert $(if $(call eq,$(only),data),--no-create-info --ignore-table=$(DB_NAME).SequelizeMeta --ignore-table=$(DB_NAME).SequelizeData) $(if $(call eq,$(only),structure),--no-data) $(DB_NAME)

_dbdump-postgres:
	@echo "Not yet supported for Postgres."

# show database info:
dbinfo:
	@$(MAKE) _dbinfo-$(DB_KIND)

_dbinfo-mysql:
	@echo "mysql --default-character-set=utf8mb4 $(DB_ARGS_MYSQL) $(DB_NAME)"

_dbinfo-postgres:
	@echo "PGPASSWORD=$(DB_PASS) psql $(DB_ARGS_POSTGRES) $(DB_NAME)"
