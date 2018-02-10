describe("hook references", function() {
	'use strict';
	//TODO: add more syntax tests
	it("can refer to a hook using astral characters", function() {
		expect("|A𐌎B>[foo](replace: ?A𐌎B)[bar]").markupToPrint("bar");
	});
	it("are insensitive", function() {
		expect("(print: ?_A is ?a and ?a_ is ?A)").markupToPrint("true");
		expect("|A_>[foo] |_A>[bar] |_a_>[baz] |a>[qux](replace:?a_)[garply]").markupToPrint("garply garply garply garply");
		expect("|A_>[foo] |_A>[bar] |_a_>[baz] |a>[qux](replace:?_a)[garply]").markupToPrint("garply garply garply garply");
		expect("|A_>[foo] |_A>[bar] |_a_>[baz] |a>[qux](replace:?_A_)[garply]").markupToPrint("garply garply garply garply");
		expect("|A_>[foo] |_A>[bar] |_a_>[baz] |a>[qux](replace:?A)[garply]").markupToPrint("garply garply garply garply");
	});
	describe("bare hook references in passage text", function() {
		it("are printed literally", function() {
			expect("|a>[Golly] ?a").markupToPrint("Golly ?a");
		});
	});
});
