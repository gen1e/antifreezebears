describe("temporary variables", function() {
	'use strict';
	it("can be set and printed, when using the _ sigil", function() {
		expect("(set: _a to 1)(print: _a)").markupToPrint("1");
	});
	it("cannot be printed undeclared, and do not default to 0", function() {
		expect("(print: _a)").markupToError();
		expect("(set: _a to _a + 1)").markupToError();
	});
	it("forgets temporary variables when changing passages", function() {
		runPassage("(set: _a to 1)");
		expect("(print: _a)").markupToError();
	});
	it("forgets temporary variables when leaving hooks passages", function() {
		expect("|a>[(set: _a to 1)(print:_a)] (print:_a)").markupToError();
	});
	it("are correctly shadowed when using hooks", function() {
		expect("(set: _a to 2)|a>[(set: _a to 1)(print:_a)] (print:_a)").markupToPrint("1 2");
	});
	it("are correctly shadowed when using anonymous hooks", function() {
		expect("(set: _a to 2)[(set: _a to 1)(print:_a)] (print:_a)").markupToPrint("1 2");
	});
	it("are correctly shadowed when using (display:)", function() {
		createPassage("(set: _a to 1)(print:_a)", "grault");
		expect("(set: _a to 2)(display:'grault') (print:_a)").markupToPrint("1 2");
	});
	it("are correctly shadowed when referencing outer scope temporary variables", function() {
		expect("(set: _a to 2)|a>[(set: _a to _a + 2)(print:_a)] (print:_a)").markupToPrint("4 2");
	});
	it("are correctly shadowed when deeply modifying data structures", function() {
		expect("(set: _a to (a:2,1))|a>[(set: _a's 1st to _a's 1st + 2)(print:_a)] (print:_a)").markupToPrint("4,1 2,1");
		expect("(set: _a to (a:(a:2),1))|a>[(set: _a's 1st's 1st to _a's 1st's 1st + 2)(print:_a)] (print:_a)").markupToPrint("4,1 2,1");
	});
	it("can be used bare in passage text", function() {
		expect("(set: _a to 1)_a").markupToPrint("1");
		expect("(set: _a to 2)|a>[(set: _a to 1)_a] _a").markupToPrint("1 2");
	});
	it("can be attached to hooks in passage text", function() {
		expect("(set: _a to false)_a[Don't show]").markupToPrint("");
		expect("(set: _a to (font:'Skia'))_a[Show]").markupToPrint("Show");
	});
});
