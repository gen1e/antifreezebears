describe("macro calls", function() {
	'use strict';
	it("consist of a (, the name, a :, arguments, and )", function() {
		expect("(a:)").markupToPrint("");
		expect("(a:1)").markupToPrint("1");
		expect("(a:1,1)").markupToPrint("1,1");

		expect("(a 1,1)").markupToPrint("(a 1,1)");
		expect("(a:1,1").markupToPrint("(a:1,1");
	});
	it("can have whitespace between the :, each argument, and )", function() {
		expect("(a: \n )").markupToPrint("");
		expect("(a:\n1 )").markupToPrint("1");
		expect("(a:\n 1\n ,\n 1\n )").markupToPrint("1,1");
	});
	it("cannot have whitespace between the name and :", function() {
		expect("(a : )").markupToPrint("(a : )");
	});
	it("cannot have whitespace between the ( and name", function() {
		expect("( a: )").markupToPrint("( a: )");
	});
	it("cannot have a forward slash following the :", function() {
		expect("(http://example.org)").markupToPrint("(http://example.org)");
	});
	it("can have a trailing , after the final argument", function() {
		expect("(a:\n 1\n ,\n 1\n, )").markupToPrint("1,1");
	});
});
