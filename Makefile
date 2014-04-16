.PHONY: test
test: check mocha

.PHONY: mocha
mocha:
	mocha test/

.PHONY: check
check: jshint jscs

.PHONY: jshint
jshint:
	jshint lib/ test/

.PHONY: jscs
jscs:
	jscs lib/ test/
