describe("the (hook:) macro", function () {
	'use strict';
	it("requires exactly 1 string argument", function() {
		expect("(print:(hook:))").markupToError();
		expect("(print:(hook:1))").markupToError();
		expect("(print:(hook:'A','B'))").markupToError();
		expect("(print:(hook:'A'))").not.markupToError();
	});
	it("errors when placed in passage prose while not attached to a hook", function() {
		expect("(hook:'A')").markupToError();
		expect("(hook:'A')[]").not.markupToError();
	});
	it("gives a name to the hook", function (){
		runPassage("(hook:'grault')[foo]");
		expect($('tw-passage').find('tw-hook').attr('name')).toBe('grault');
	});
});
