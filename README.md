Fork details
===============

Forked from the [original CoverJS](https://github.com/arian/CoverJS) by
[Pusztai Tibor](https://github.com/kondi) to have a
[Makefile](https://github.com/kondi/CoverJS/blob/master/Makefile) and build process for
[AMD-compliant distribution files](https://github.com/kondi/CoverJS/tree/gh-pages/dist).

CoverJS (alpha)
===============

Make sure all your code is tested, don't miss anything.
CoverJS intruments your code. Using the instrumented code with your tests
will result in a nice object, which can be passed through one of the reporters
to create a nice graphical output of your code.

Instead of instrumenting lines (like JSCoverage), CoverJS will instrument
statements, which should result in a more precise result.

### Dependencies

- [Esprima](https://github.com/ariya/esprima) a wonderful JavaScript parser
- [Escodegen](https://github.com/Constellation/escodegen)
- [Prime](https://github.com/mootools/prime) awesome little OOP library
- [r.js](https://github.com/jrburke/r.js) optimizer to build the distribution files

### Reporters

 - HTML
 - Text

### CLI Usage

To instrument the code, CoverJS comes with a CLI tool:

	coverjs --output cov/ file.js test/*

### Reporting

The instrumented code should be executed to count the number of calls for each statement.
Usually your tests will try to cover each statement.

An example code that will capture the output and generate a HTML report would look like:

```js

var HTMLReporter = require('../lib/reporters/HTMLReporter');

require('../test-cov/test/fixture.js');

var reporter = new HTMLReporter(global.__$coverObject);
console.log(reporter.report());
```

The output stream can be redirected to a file using

	node test.js > report.html

so the result can be viewed in a browser

#### Build distribution

To build the files into dist folder:

	npm install
	cd ..
	git clone https://github.com/mootools/prime.git
	cd prime
	make convert-amd
	cd ../CoverJS
	make

#### Screenshot

![Screenshot](http://i.imgur.com/lxGpb.png)
