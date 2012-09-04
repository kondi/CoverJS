/**
 * A very hacky AMD plugin to instrument the parameter module using CoverJS.
 * Working only with RequireJS loader and for same-origin JS files.
 * There is no support for optimized builds currently as this plugin is
 * intented to be used for unit testing in development environment.
 * 
 * Requirements:
 *   text! plugin: https://raw.github.com/requirejs/text/master/text.js
 *   CoverJS:      http://kondi.github.com/CoverJS/dist/cover.js
 */
define(["cover"], function(coverjs) {

	var instrument = function(code, name) {
		return new coverjs.Instrument(code, name).instrument();
	};

	return {
		load: function(name, req, onLoad, config) {
			// Load the source code of the module using the text! plugin.
			req(["text!" + name + ".js"], function(code) {
				// Instrument the source code.
				code = instrument(code, name + ".js");
				// Save the original load function as we are going to replace it with
				// a pathed one.
				var originalLoad = require.load;
				require.load = function(context, moduleName) {
					if (name !== moduleName) {
						// Use the original load for all the dependencies.
						return originalLoad.apply(this, arguments);
					} else {
						// Reset the load function to the original one.
						require.load = originalLoad;
						// Replace the document.createElement temporarily to return
						// a script tag (node) having an overridden addEventListener
						// to be able to fire fake load events on it.
						var onScriptLoad, node;
						var originalCreateElement = document.createElement;
						document.createElement = function() {
							// Restore the original createElement.
							document.createElement = originalCreateElement;
							// Create the element using the original createElement.
							node = originalCreateElement.apply(this, arguments);
							// Override the addEventListener to catch the latter
							// registered load listener.
							node.addEventListener = function(name, listener) {
								// Replace the already set type of script tag
								// to plain text to not download and evaluate
								// it by the browser.
								node.type = "text/plain";
								if (name === "load") {
									onScriptLoad = listener;
								}
							};
							return node;
						};
						// Call the original load function which will create a script
						// element, register a load event listener and append it to
						// the document.
						var result = originalLoad.apply(this, arguments);
						if (!node || !onScriptLoad) {
							throw new Error(
								"This version of RequireJS is not supported by " +
								"covered! plugin."
							);
						}
						(function() {
							// Evaluate the instrumented code in the global context.
							eval.call(this, code);
						})();
						// Emit a fake load event by calling the caught event listener
						// passing the created script node as event target.
						onScriptLoad({
							type: "load",
							currentTarget: node
						});
						return result;
					}
				};
				// Ask RequireJS to load the module while our patched load is serving.
				// By using the plain unmodified module name we can ensure that shim
				// dependencies are processed as well. 
				req([name], onLoad);
			});
		}
	};

});
