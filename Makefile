# Drives every sub-build.  Inputs are staged *into* each sub-build; the
# sub-builds never reach back out into the tree.

VENDOR_DIR := web/vendor
DEPS := web/deps.txt
TONE_DIR := third_party/tone.js
TONE_BUILD := $(TONE_DIR)/build/Tone.js
ANDROID_ASSETS := android/app/src/main/assets
GRADLE_WRAPPER := android/gradle/wrapper/gradle-wrapper.jar
DEBUG_APK := $(CURDIR)/android/app/build/outputs/apk/debug/app-debug.apk

ADB ?= adb
ADB_SERIAL ?=
ADB_TARGET = $(if $(ADB_SERIAL),-s $(ADB_SERIAL))

# Dependencies downloaded and hash-verified, per web/deps.txt.
FETCHED := $(addprefix $(VENDOR_DIR)/,\
	$(shell awk '!/^#/ && NF { print $$1 }' $(DEPS)))
VENDOR := $(FETCHED) $(VENDOR_DIR)/Tone.js

.PHONY: vendor
vendor: $(VENDOR)

$(FETCHED): $(VENDOR_DIR)/%: $(DEPS) scripts/fetch-dep.sh
	sh scripts/fetch-dep.sh $(DEPS) $@

$(VENDOR_DIR)/Tone.js: $(TONE_BUILD)
	mkdir -p $(@D)
	cp $< $@

# Tone is TypeScript built with npm + webpack.  We do not adopt its build
# system, we invoke it.  The upstream `build` script also increments the
# version, which would dirty the pinned submodule, so the two real build
# steps are run directly instead.
$(TONE_BUILD): $(TONE_DIR)/package.json
	cd $(TONE_DIR) && npm ci && npm run ts:build && npm run webpack:build

$(TONE_DIR)/package.json:
	git submodule update --init $(TONE_DIR)

.PHONY: dist
dist: vendor
	rm -rf dist
	mkdir -p dist/vendor
	cp web/*.html web/*.js web/*.css web/*.svg dist/
	cp $(VENDOR_DIR)/* dist/vendor/

$(GRADLE_WRAPPER): android/deps.txt scripts/fetch-dep.sh
	sh scripts/fetch-dep.sh android/deps.txt $@

# Gradle stays dumb: it compiles whatever is sitting in the assets dir.
.PHONY: apk-debug
apk-debug: dist $(GRADLE_WRAPPER)
	rm -rf $(ANDROID_ASSETS)
	mkdir -p $(ANDROID_ASSETS)
	cp -r dist/. $(ANDROID_ASSETS)/
	cd android && ./gradlew assembleDebug

# Deliberately does not depend on `apk-debug`.  The build needs a JDK and
# the Android SDK, while installing needs adb and a device, and those are
# not usually the same machine; the APK is built in the build environment
# and installed from wherever the device is plugged in.
.PHONY: install-debug-apk
install-debug-apk:
	@test -f "$(DEBUG_APK)" || { \
		echo "Debug APK not found: $(DEBUG_APK)" >&2; \
		echo "Run 'make apk-debug' in the build environment and keep its android/app/build output with this repository." >&2; \
		exit 1; \
	}
	$(ADB) $(ADB_TARGET) install -r "$(DEBUG_APK)"

.PHONY: clean
clean:
	rm -rf dist $(ANDROID_ASSETS)

# Separate from `clean` because refetching and rebuilding vendored
# dependencies needs the network and is slow.
.PHONY: clean-vendor
clean-vendor:
	rm -rf $(VENDOR_DIR) $(TONE_DIR)/build $(GRADLE_WRAPPER)

.PHONY: format
format:
	prettier -w web
