"use strict";
define(['utils', 'markup', 'twinescript/compiler', 'twinescript/environ'], function(Utils, TwineMarkup, Compiler, Environ) {
	/*
		REPL
		These are debugging functions, used in the browser console to inspect the output of
		TwineMarkup and the TwineScript compiler.
	*/
	window.REPL = function(a) {
	  var r = Compiler(TwineMarkup.lex("(print:" + a + ")"));
	  console.log(r);
	  var result = Environ({}).eval(r);
	  return result.TwineScript_Print ? result.TwineScript_Print() : result;
	};
	window.LEX = function(a) {
	  var r = TwineMarkup.lex(a);
	  return (r.length === 1 ? r[0] : r);
	};
});
