## Variables
#

MODULE_CACHE_DIR = $(ROOT_DIR)/.git/tmp/modules

## Macros
#

# determine a module's repo:
# $1 - module identifier
define module_sh_repo
$(call utils_sh_required,$1,$(strip Missing module name. Run \"make module-help\" for syntax.)) && SH_RES=$$((echo $1 | grep -i -e '^http' -e '^git@') || ([ -f $(MODULES_DIR)/$$(echo $1 | sed 's/^$(MODULES_PFX)//')/.gitrepo ] && cat $(MODULES_DIR)/$$(echo $1 | sed 's/^$(MODULES_PFX)//')/.gitrepo | grep remote | awk '{print $$3}') || ([ -f $(MODULES_DIR)/$$(echo $1 | sed 's/^$(MODULES_PFX)//')/.repourl ] && cat $(MODULES_DIR)/$$(echo $1 | sed 's/^$(MODULES_PFX)//')/.repourl) || (echo $(MODULES_GIT)/$$((echo "$1" | grep -i -e '^$(MODULES_PFX)') || ($$($(call utils_sh_confirm,$(strip Did you mean '$(MODULES_PFX)$1'?),y)) && echo "$(MODULES_PFX)$1" || echo "$1"))))
endef

# determine a module's name:
# $1 - module identifier
define module_sh_name
$(call module_sh_repo,$1) && SH_RES=`basename $$SH_RES .git`
endef

# determine a module's dir:
# $1 - module identifier
define module_sh_dir
$(call module_sh_name,$1) && SH_RES=`echo $$SH_RES | sed 's/^$(MODULES_PFX)//'`
endef

# get a module's identifiers as shell variables REPO, NAME, DIR:
# $1 - module identifier
define module_sh_identifiers
$(call module_sh_repo,$1) && MODULE_REPO=$$SH_RES && $(call module_sh_name,$$MODULE_REPO) && MODULE_NAME=$$SH_RES && $(call module_sh_dir,$$MODULE_REPO) && MODULE_DIR=$$SH_RES && MODULE_SUBREPO=$(MODULES_DIR)/$$MODULE_DIR
endef

# ensure a module is installed:
# $1 - module identifier
# $2 - custom error message
define module_sh_installed
$(call module_sh_identifiers,$1) && if [ ! -d "$(MODULES_DIR)/$$MODULE_DIR" ]; then echo ERROR: $(or $2,"Module \"$$MODULE_NAME\" is not installed.") && false; fi
endef

# ensure a module is not installed:
# $1 - module identifier
# $2 - custom error message
define module_sh_not_installed
$(call module_sh_identifiers,$1) && if [ -d "$(MODULES_DIR)/$$MODULE_DIR" ]; then echo ERROR: $(or $2,"Module \"$$MODULE_NAME\" is already installed.") && false; fi
endef

# get details about a subrepo:
# $1 - subrepo path
define module_sh_subrepo_info
SUBREPO_URL=$$(git subrepo status $1 | grep "Remote URL" | awk '{print $$3}') && SUBREPO_PULLED_COMMIT=$$(git subrepo status $1 | grep "Pulled Commit" | awk '{print $$3}') && SUBREPO_VERSION=$$(git subrepo status $1 | grep "Tracking Branch" | awk '{print $$3}' | sed -e 's/^v//')
endef

# determine a subrepo's local status compared to its upstream:
# $1 - subrepo path
define module_sh_subrepo_status
$(call module_sh_subrepo_info,$1) && if [ ! -z "$$SUBREPO_PULLED_COMMIT" ]; then git subrepo branch --fetch --force --quiet $1 && SUBREPO_BRANCH=$$(git subrepo status $1 | grep "Subrepo Branch" | awk '{print $$3}') && COMMIT=$$(git rev-parse --short $$SUBREPO_BRANCH) && AHEAD=$$(git rev-list --count FETCH_HEAD..$$COMMIT) && BEHIND=$$(git rev-list --count $$COMMIT..FETCH_HEAD); elif [ ! -z "$$SUBREPO_URL" ]; then git subrepo branch --force --quiet $1 && SUBREPO_BRANCH=$$(git subrepo status $1 | grep "Subrepo Branch" | awk '{print $$3}') && COMMIT=$$(git rev-parse --short $$SUBREPO_BRANCH) && AHEAD=$$(git rev-list --count ..$$COMMIT) && BEHIND=0; else AHEAD=0 && BEHIND=0; fi
endef

# clone/update a module's GIT repository and optionally checkout a branch:
# $1 - module identifier
# $2 - branch
define module_sh_update_repo
$(call module_sh_identifiers,$1) && $(call module_sh_subrepo_info,$$MODULE_SUBREPO) && if [ ! -z "$$SUBREPO_PULLED_COMMIT" ] || [ ! -d "$(MODULES_DIR)/$$MODULE_DIR" ]; then mkdir -p $(MODULE_CACHE_DIR) && cd $(MODULE_CACHE_DIR) && if [ -d $$MODULE_NAME ]; then cd $$MODULE_NAME && git fetch --quiet && cd ..; else git clone --quiet $$MODULE_REPO 2>/dev/null || true; fi && if [ ! -z "$2" ] && [ -d $$MODULE_NAME ]; then cd $$MODULE_NAME && git checkout --quiet $2; fi && cd $(ROOT_DIR); fi
endef

# get a module's versions:
# $1 - module identifier
# $2 - version prefix
# $3 - branch
define module_sh_get_versions
$(call module_sh_update_repo,$1,$3) && if [ -d $(MODULE_CACHE_DIR)/$$MODULE_NAME ]; then cd $(MODULE_CACHE_DIR)/$$MODULE_NAME && MODULE_VERSIONS=$$(git branch -r | grep -e '^  origin/v' | sed -e 's;  origin/v;;' | sort -rV) && if [ ! -z "$2" ]; then PREFIX=$$(echo "$2" | sed 's/\.[^.]*$$//') && MODULE_VERSIONS_PREFIXED=$$(git branch -r | grep -e "^  origin/v$$PREFIX" | sed -e 's;  origin/v;;' | sort -rV); else MODULE_VERSIONS_PREFIXED=MODULE_VERSIONS; fi && cd $(ROOT_DIR); else MODULE_VERSIONS=$$SUBREPO_VERSION && MODULE_VERSIONS_PREFIXED=$$SUBREPO_VERSION; fi
endef

# get a module's latest version:
# $1 - module identifier
# $2 - version prefix
# $3 - branch
define module_sh_latest_version
$(call module_sh_get_versions,$1,$2,$3) && MODULE_LATEST_VERSION=$$(echo $$MODULE_VERSIONS | tr " " "\n" | sort -rV | head -1) && MODULE_LATEST_VERSION_PREFIXED=$$(echo $$MODULE_VERSIONS_PREFIXED | tr " " "\n" | sort -rV | head -1)
endef

# get the declared version from any meta-information file, such as package.json, in the current directory:
define module_sh_get_declared_version
if [ -f package.json ]; then DECLARED_VERSION=$$(cat package.json | jq -r '.version' | sed 's/\.[^.]*$$//' | sed 's/\.0$$//'); else DECLARED_VERSION=$$((git describe --tags || echo 1) | sed 's/^v//' | sed 's/\.[^.]*$$//' | sed 's/\.0$$//'); fi
endef

## Targets
#

_module-debug:
	@true \
		&& $(call module_sh_identifiers,$(name)) \
		&& echo MODULE_REPO = $$MODULE_REPO \
		&& echo MODULE_NAME = $$MODULE_NAME \
		&& echo MODULE_DIR = $$MODULE_DIR \
		&& echo MODULE_SUBREPO = $$MODULE_SUBREPO \
		&& $(call module_sh_subrepo_info,$$MODULE_SUBREPO) \
		&& echo SUBREPO_URL = $$SUBREPO_URL \
		&& echo SUBREPO_PULLED_COMMIT = $$SUBREPO_PULLED_COMMIT \
		&& echo SUBREPO_VERSION = $$SUBREPO_VERSION \
		&& $(call module_sh_subrepo_status,$$MODULE_SUBREPO) \
		&& echo SUBREPO_BRANCH = $$SUBREPO_BRANCH \
		&& echo AHEAD = $$AHEAD \
		&& echo BEHIND = $$BEHIND \
		&& $(call module_sh_latest_version,$$MODULE_REPO,$$SUBREPO_VERSION) \
		&& echo MODULE_VERSIONS = $$MODULE_VERSIONS \
		&& echo MODULE_VERSIONS_PREFIXED = $$MODULE_VERSIONS_PREFIXED \
		&& echo MODULE_LATEST_VERSION = $$MODULE_LATEST_VERSION \
		&& echo MODULE_LATEST_VERSION_PREFIXED = $$MODULE_LATEST_VERSION_PREFIXED \
		&& echo ""

module-help:
	@echo "Module system targets:"
	@echo ""
	@echo "  module name=...                        create a new module"
	@echo "  module-clone name=... [v=latest]       add an existing module to this app"
	@echo "  module-pull name=...                   update an installed module"
	@echo "  module-push name=...                   push module changes upstream"
	@echo "  module-pullall                         update all installed modules"
	@echo "  module-pushall                         push all module changes upstream"
	@echo "  module-log name=...                    show module commit logs"
	@echo "  module-cfgadd name=...                 merge module default config into the app config"
	@echo "  module-cfgrem name=...                 remove module config from the app config"
	@echo "  module-remove name=...                 remove a module from this app"
	@echo "  module-status [name=...]               status information for one or all modules"
	@echo "  module-info [name=...]                 detailed information for one or all modules"
	@echo ""

# create a new module:
module:
	@true \
		&& $(call module_sh_not_installed,$(name)) \
		&& TPL=$$($(call utils_sh_input,$(strip Module template:),$(MODULES_TPL))) \
		&& $(call utils_sh_git_stash) \
		&& mkdir -p $(MODULES_DIR) \
		&& if [ ! -z "$$TPL" ]; then if [ -d "$(MODULES_DIR)/.$$TPL" ]; then cp -r $(MODULES_DIR)/.$$TPL $(MODULES_DIR)/$$MODULE_DIR; else git clone $(MODULES_GIT)/$$TPL $(MODULES_DIR)/$$MODULE_DIR && rm -rf $(MODULES_DIR)/$$MODULE_DIR/.git; fi; else mkdir $(MODULES_DIR)/$$MODULE_DIR && echo "$$MODULE_REPO" > $(MODULES_DIR)/$$MODULE_DIR/.repourl; fi \
		&& find $(MODULES_DIR)/$$MODULE_DIR -type f -exec sh -c "REPO=$$MODULE_REPO NAME=$$MODULE_NAME DIR=$$MODULE_DIR envsubst < {} > {}.tmp && mv {}.tmp {}" \; \
		&& if [ -d .git ]; then git add $(MODULES_DIR)/$$MODULE_DIR && git commit -m "Created module \"$$MODULE_NAME\"." $(MODULES_DIR)/$$MODULE_DIR; git subrepo init $(MODULES_DIR)/$$MODULE_DIR -r $$MODULE_REPO -b v1; fi \
		&& $(call utils_sh_git_unstash) \
		&& echo "Module \"$$MODULE_NAME\" created in \"$(MODULES_DIR)/$$MODULE_DIR\"."

# add an existing module to this app:
module-clone:
	@true \
		&& $(call utils_sh_git_required) \
		&& $(call module_sh_identifiers,$(name)) \
		&& $(call module_sh_latest_version,$$MODULE_REPO) \
		&& $(call utils_sh_git_stash) \
		&& git subrepo clone $$MODULE_REPO -b v$(or $v,$$MODULE_LATEST_VERSION) $$([ -d "$(MODULES_DIR)/$$MODULE_DIR" ] && echo "-f") $(MODULES_DIR)/$$MODULE_DIR \
		&& cd $(MODULES_DIR)/$$MODULE_DIR && npm i && cd $(ROOT_DIR) \
		&& ($(MAKE) _$$MODULE_NAME-clone 2>/dev/null || true) \
		&& $(MAKE) module-cfgadd name=$$MODULE_NAME \
		&& (git diff --quiet || git add . && git commit --amend --no-edit) \
		&& $(call utils_sh_git_unstash) \
		&& echo "Module \"$$MODULE_NAME\" cloned in \"$(MODULES_DIR)/$$MODULE_DIR\"."

# update an installed module:
module-pull:
	@true \
		&& $(call utils_sh_git_required_clean) \
		&& $(call module_sh_installed,$(name)) \
		&& git subrepo pull $(MODULES_DIR)/$$MODULE_DIR \
		&& cd $(MODULES_DIR)/$$MODULE_DIR && npm i

# push module changes upstream:
module-push:
	@true \
		&& $(call utils_sh_git_required) \
		&& $(call module_sh_installed,$(name)) \
		&& $(call utils_sh_git_stash) \
		&& $(call module_sh_identifiers,$(name)) \
		&& $(call module_sh_subrepo_status,$$MODULE_SUBREPO) \
		&& if [ $$AHEAD -gt 0 ] && [ $$BEHIND -eq 0 ] \
		; then true \
		&& CURRENT_SUBREPO_VERSION=$$SUBREPO_VERSION \
		&& APP_CURRENT_BRANCH=$$(git branch | sed -n '/\* /s///p') \
		&& APP_TMP_BRANCH=tmp_$$(cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w 4 | head -n 1) \
		&& git checkout -q -b $$APP_TMP_BRANCH \
		&& if [ -z "$$SUBREPO_PULLED_COMMIT" ]; then TMP_BRANCH=v1; else TMP_BRANCH=tmp_$$(cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w 4 | head -n 1); fi \
		&& if [ ! -f "$$MODULE_SUBREPO/.gitrepo" ]; then git subrepo init $$MODULE_SUBREPO -r $$MODULE_REPO -b $$TMP_BRANCH; fi \
		&& git subrepo push $$MODULE_SUBREPO -b $$TMP_BRANCH -q \
		&& $(call module_sh_latest_version,$$MODULE_REPO,$$CURRENT_SUBREPO_VERSION,$$TMP_BRANCH) \
		&& if [ -d $(MODULE_CACHE_DIR)/$$MODULE_NAME ] \
		; then true \
		&& cd $(MODULE_CACHE_DIR)/$$MODULE_NAME \
		&& RELEASE_TYPE=patch \
		&& if standard-version --dry-run | grep -q "### BREAKING CHANGES" \
		; then true \
		&& BREAKING_CHANGE=yes \
		&& $(call module_sh_get_declared_version) \
		&& if [ "$$DECLARED_VERSION" == "$$MODULE_LATEST_VERSION" ]; then RELEASE_TYPE=major; elif [ "$$DECLARED_VERSION" == "$$MODULE_LATEST_VERSION_PREFIXED" ]; then RELEASE_TYPE=minor; fi \
		; fi \
		&& REVERT=no \
		&& if [ "$$BREAKING_CHANGE" == "yes" ] && [ "$$RELEASE_TYPE" == "patch" ] \
		; then true \
		&& echo "" \
		&& echo "ATTENTION: It seems you are making a breaking change to a version of the module which cannot have its major/minor version increased. If you push your changes upstream, you also need to ensure that all applications using this version of the module can handle the changes." \
		&& echo "" \
		&& REVERT=$$($(call utils_sh_confirm,$(strip Are you sure you want to continue with the push?)) && echo no || echo yes) \
		; fi \
		&& if [ "$$REVERT" == "no" ] \
		; then true \
		&& standard-version -r $$RELEASE_TYPE $$([ ! -f CHANGELOG.md ] && echo "-f") --silent \
		&& $(call module_sh_get_declared_version) \
		&& if [ "$$TMP_BRANCH" != "v$$DECLARED_VERSION" ] \
		; then true \
		&& git checkout -q $$([ "$$RELEASE_TYPE" != "patch" ] && echo -b) v$$DECLARED_VERSION \
		&& if [ "$$RELEASE_TYPE" == "patch" ]; then git pull -q; fi \
		&& git merge -q $$TMP_BRANCH \
		; fi \
		&& git push -u -q --follow-tags origin v$$DECLARED_VERSION > /dev/null \
		&& if [ "$$TMP_BRANCH" != "v$$DECLARED_VERSION" ]; then git push -q origin :$$TMP_BRANCH && git branch -q -D $$TMP_BRANCH; fi \
		&& cd $(ROOT_DIR) \
		&& git checkout -q $$APP_CURRENT_BRANCH \
		&& git subrepo clone $$MODULE_REPO $$MODULE_SUBREPO -b v$$DECLARED_VERSION -f -q \
		; else true \
		&& git checkout -q v$$DECLARED_VERSION \
		&& git push -q origin :$$TMP_BRANCH \
		&& git branch -q -D $$TMP_BRANCH \
		&& cd $(ROOT_DIR) \
		&& git checkout -q $$APP_CURRENT_BRANCH \
		; fi \
		&& git branch -q -D $$APP_TMP_BRANCH \
		; else true \
		&& echo "Something went wrong." \
		; fi \
		; elif [ $$BEHIND -gt 0 ] \
		; then true \
		&& echo "Module \"$$MODULE_NAME\" is behind upstream. Pull before pushing." \
		; else true \
		&& echo "Module \"$$MODULE_NAME\" has no commits ahead." \
		; fi \
		&& $(call utils_sh_git_unstash) \
		&& git subrepo clean $$MODULE_SUBREPO --quiet

# update all installed modules:
module-pullall:
	@$(call utils_sh_git_required_clean)
	@git subrepo pull --all
	@npm i

# push all module changes upstream:
module-pushall:
	@$(call utils_sh_git_required_clean)
	@true \
		&& for subrepo in $$(git subrepo status --quiet) \
		; do true \
		&& $(MAKE) module-push name=$$(basename $$subrepo) \
		; done

# show module commit logs:
module-log:
	@true \
		&& $(call module_sh_installed,$(name)) \
		&& git subrepo clean $(MODULES_DIR)/$$MODULE_DIR --quiet \
		&& git subrepo fetch $(MODULES_DIR)/$$MODULE_DIR \
		&& git log refs/subrepo/$(MODULES_DIR)/$$MODULE_DIR/fetch

# remove a module from this app:
module-remove:
	@true \
		&& $(call module_sh_installed,$(name)) \
		&& if [ -f "$(MODULES_DIR)/$$MODULE_DIR/.gitrepo" ]; then git subrepo clean $(MODULES_DIR)/$$MODULE_DIR --quiet; fi \
		&& ($(MAKE) _$$MODULE_NAME-remove 2>/dev/null || true) \
		&& if [ -d .git ]; then rm -rf $(MODULES_DIR)/$$MODULE_DIR && git add $(MODULES_DIR)/$$MODULE_DIR && git commit -m "Removed module \"$$MODULE_NAME\"." $(MODULES_DIR)/$$MODULE_DIR/*; fi \
		&& echo "Module \"$$MODULE_NAME\" removed."

# status information for one or all modules:
module-status:
	@true \
		&& $(call utils_sh_git_required_clean) \
		&& echo "Ahead / Behind     Module" \
		&& $(if $(name),$(call module_sh_installed,$(name)),true) \
		&& for subrepo in $$(git subrepo status $(if $(name),$(MODULES_DIR)/$$MODULE_DIR) --quiet) \
		; do true \
		&& $(call module_sh_subrepo_status,$$subrepo) \
		&& $(call module_sh_identifiers,$$SUBREPO_URL) \
		&& printf %5s $$AHEAD && printf " / " && printf %-11s $$BEHIND && echo "$$MODULE_DIR (v$$SUBREPO_VERSION)" \
		; done \
		&& git subrepo clean --all --quiet

# detailed information for one or all modules:
module-info: s := -17
module-info:
	@true \
		&& $(call utils_sh_git_required_clean) \
		&& $(if $(name),$(call module_sh_installed,$(name)),true) \
		&& for subrepo in $$(git subrepo status $(if $(name),$(MODULES_DIR)/$$MODULE_DIR) --quiet) \
		; do true \
		&& $(call module_sh_subrepo_status,$$subrepo) \
		&& $(call module_sh_identifiers,$$SUBREPO_URL) \
		&& echo "Module \"$$MODULE_NAME\":" \
		&& $(call utils_sh_print,$s,"  Repo URL:") && echo $$MODULE_REPO \
		&& if [ -z "$$SUBREPO_PULLED_COMMIT" ] \
		; then true \
		&& $(call utils_sh_print,$s,"  Versions:") && echo [$$SUBREPO_VERSION] \
		&& $(call utils_sh_print,$s,"  Diff Status:") && echo "$$AHEAD ahead, $$BEHIND behind (local module)" \
		; else true \
		&& $(call module_sh_latest_version,$$MODULE_REPO) \
		&& $(call utils_sh_print,$s,"  Versions:") && echo $$MODULE_VERSIONS | sed -E "s/(^|[[:space:]])$$SUBREPO_VERSION([[:space:]]|$$)/\1[$$SUBREPO_VERSION]\2/g" \
		&& $(call utils_sh_print,$s,"  Diff Status:") && echo "$$AHEAD ahead, $$BEHIND behind" \
		&& if [ $$AHEAD -gt 0 ]; then echo && echo "  Commits ahead:" && git log --pretty=format:%s FETCH_HEAD..$$COMMIT | awk '{print "    "$$0}'; fi \
		&& if [ $$BEHIND -gt 0 ]; then echo && echo "  Commits behind:" && git log --pretty=format:%s $$COMMIT..FETCH_HEAD | awk '{print "    "$$0}'; fi \
		; fi \
		&& $(if $(name),true,echo && echo) \
		; done \
		&& git subrepo clean --all --quiet

