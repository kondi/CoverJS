
define('lib/Instrument',['require','exports','module','esprima','escodegen'],function(require, exports, module){



var esprima   = require('esprima');
var escodegen = require('escodegen');

// create coverage line

var id = 0;

var Instrument = function(code, name){

	if (!name) name = (id++).toString(36);

	this.code = code + '';
	this.name = name + '';

	var quotedName = this.quotedName = JSON.stringify(this.name);
	var quotedCode = this.quotedCode = JSON.stringify(this.code);

	this.ranges = [];

	this.headCode = ''+
		'if (typeof __$coverObject === "undefined"){\n' +
		'	if (typeof window !== "undefined") window.__$coverObject = {};\n' +
		'	else if (typeof global !== "undefined") global.__$coverObject = {};\n' +
		'	else throw new Error("cannot find the global scope");\n' +
		'}\n' +
		'__$coverObject[' + quotedName + '] = {};\n' +
		'__$coverObject[' + quotedName + '].__code = ' + quotedCode + ';\n';

	this.rangesCode = '';

	this.tailCode = '';

};

Instrument.prototype = {

	// Short method to instrument the code

	instrument: function(){
		this.parse();
		this.walk();
		return this.generate();
	},

	// generate AST with esprima

	parse: function(){
		return (this.ast = esprima.parse(this.code, {
			range: true
		}));
	},

	// generate new instrumented code from AST

	generate: function(){
		this._generateInitialRanges();
		return this.headCode + this.rangesCode + escodegen.generate(this.ast) + this.tailCode;
	},

	_generateInitialRanges: function(){
		for (var i = 0, l = this.ranges.length; i < l; i++){
			var range = this.ranges[i];
			this.rangesCode += '__$coverObject[' + this.quotedName + ']["' + range[0] + ':' + range[1] + '"] = 0;\n';
		}
	},

	// Modify AST by injecting extra instrumenting code

	walk: function(){
		this._walk(this.ast);
		return this.ast;
	},

	_walk: function(ast, index, parent){

		// iterator variables
		var i, l, k;

		switch (index){
			case 'body':
			case 'consequent':
				if (Array.isArray(ast)){
					for (i = 0, l = ast.length; i < l; i++){
						var range = ast[i * 2].range;
						ast.splice(i * 2, 0, this._statementCallAST(range));
						this.ranges.push(range);
					}
				}
				break;
		}

		// recurse through the AST

		if (Array.isArray(ast)){

			for (i = 0, l = ast.length; i < l; i++) this._walk(ast[i], i, parent);

		} else if (typeof ast === 'object'){

			for (k in ast) this._walk(ast[k], k, parent);

		}

	},

	_statementCallAST: function(range){

		return {
			"type": "ExpressionStatement",
			"expression": {
				"type": "UpdateExpression",
				"operator": "++",
				"argument": {
					"type": "MemberExpression",
					"computed": true,
					"object": {
						"type": "MemberExpression",
						"computed": true,
						"object": {
							"type": "Identifier",
							"name": "__$coverObject"
						},
						"property": {
							"type": "Literal",
							"value": this.name
						}
					},
					"property": {
						"type": "Literal",
						"value": range[0] + ":" + range[1]
					}
				},
				"prefix": false
			}
		};

	}

};

module.exports = Instrument;
});

define('lib/reporters/Reporter',['require','exports','module','prime'],function(require, exports, module){


var prime = require('prime');

var Reporter = prime({

	constructor: function(object){
		this.object = object;

		this.error = 0;
		this.pass  = 0;
		this.total = 0;

	},

	report: function(){
		var result = '';
		for (var file in this.object){

			var fileReporter = new FileReporter(this.object[file], '<<<', '>>>');

			var fileReport = fileReporter.report();
			var percentage = fileReporter.pass / fileReporter.total * 100;

			this.error += fileReporter.error;
			this.pass  += fileReporter.pass;
			this.total += fileReporter.total;

			result += '+++  ' + result + ' (' + Math.round(percentage) + ') +++ \n\n';
			result += fileReport;
			result += '\n\n\n\n';
		}
		return result;
	}

});

var FileReporter = prime({

	constructor: function(object, open, close){

		this.object = object;
		this.open   = open;
		this.close  = close;

		this.error = 0;
		this.pass  = 0;
		this.total = 0;

	},

	// substitute credits: MooTools
	substitute: function(string, object){
		return string.replace(/\\?\{([^{}]+)\}/g, function(match, name){
			if (match.charAt(0) == '\\') return match.slice(1);
			return (object[name] !== null) ? object[name] : '';
		});
	},

	generateOpen: function(count){
		return this.substitute(this.open, {
			count: count
		});
	},

	generateClose: function(count){
		return this.substitute(this.close, {
			count: count
		});
	},

	report: function(){

		var i, l, k;

		var code = this.object.__code;

		// generate array of all tokens
		var codez = [];
		for (i = 0, l = code.length; i < l; i++){
			codez.push({
				pos: i,
				value: code.slice(i, i + 1)
			});
		}

		// insert new strings that wrap the statements
		for (k in this.object){
			if (k == '__code') continue;

			var count = this.object[k];
			var range = k.split(':');

			this.total++;
			if (count) this.pass++;
			else this.error++;

			for (i = 0, l = codez.length; i < l; i++){

				if (codez[i].pos == range[0]){
					codez.splice(i, 0, {
						pos: -1,
						value: this.generateOpen(count)
					});
					i++;
					continue;
				}

				if (codez[i].pos == range[1]){
					codez.splice(i + 1, 0, {
						pos: -1,
						value: this.generateClose(count)
					});
					i++;
					continue;
				}

			}

		}

		var result = '';
		for (i = 0, l = codez.length; i < l; i++){
			result += codez[i].value;
		}

		return result;

	}

});

Reporter.FileReporter = FileReporter;
module.exports = Reporter;
});

define('lib/reporters/HTMLReporter',['require','exports','module','./Reporter','prime'],function(require, exports, module){


var Reporter = require('./Reporter');
var prime    = require('prime');

var HTMLReporter = prime({

	inherits: Reporter,

	constructor: function(object){
		HTMLReporter.parent.constructor(object);

		// TODO would be cool to use some nicer templating solution for this
		this.head = '' +
			'<!DOCTYPE html>\n' +
			'<html>\n<head>\n' +
			'<meta charset="utf-8">\n' +
			'<title>Coverate Results</title>\n' +
			'<style>\n' +
			'	.error { background: #F8D5D8 }\n' +
			'	.count { font-weight: bold; border-radius: 3px }\n' +
			'	.pass .count { background: #BFFFBF;}' +
			'	.error .count { background: #F8D5D8; color: red}' +
			'</style>\n' +
			'</head>\n<body>\n';

		this.tail = '\n</body>\n</html>';

	},

	report: function(){

		var result = this.head;

		for (var file in this.object){
			var fileReporter = new HTMLFileReporter(this.object[file]);

			var fileReport = fileReporter.report();
			var percentage = fileReporter.pass / fileReporter.total * 100;

			this.error += fileReporter.error;
			this.pass  += fileReporter.pass;
			this.total += fileReporter.total;

			result += '<h1>' + file + ' (' + Math.round(percentage) + '%)</h1>\n\n';
			result += '<pre>' + fileReport + '</pre>';
		}

		return result + this.tail;

	}

});

var HTMLFileReporter = prime({

	inherits: Reporter.FileReporter,

	constructor: function(object){

		var open  = '<span class="{class}" data-count="{count}"><span class="count">{count}</span>';
		var close = '</span>';

		HTMLFileReporter.parent.constructor(object, open, close);

	},

	generateOpen: function(count){
		return this.substitute(this.open, {
			'count': count,
			'class': count ? 'pass' : 'error'
		});
	}

});

HTMLReporter.FileReporter = HTMLFileReporter;
module.exports = HTMLReporter;
});

define('cover',['require','exports','module','./lib/Instrument','./lib/reporters/HTMLReporter','./lib/reporters/Reporter'],function(require, exports, module){

exports.Instrument = require('./lib/Instrument');

exports.reporters = {
	HTMLReporter: require('./lib/reporters/HTMLReporter'),
	Reporter:     require('./lib/reporters/Reporter')
};
});
