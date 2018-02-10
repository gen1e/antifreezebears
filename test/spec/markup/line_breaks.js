describe("line break syntax", function() {
	'use strict';

	describe("line breaks", function() {
		it("turn into <br> elements", function() {
			expect(
				"Hey\nhi\nhello"
			).markupToBecome(
				"Hey<br>hi<br>hello"
			);
		});
		it("become <br> elements even in the absence of other text", function() {
			expect(
				"\n".repeat(4)
			).markupToBecome(
				"<br>".repeat(4)
			);
		});
	});

	describe("escaped line syntax", function() {
		it("eliminates the following line break when a \\ ends a line", function() {
			expect(
				"A\\\nB"
			).markupToPrint(
				"AB"
			);
		});
		it("eliminates the preceding line break when a \\ starts a line", function() {
			expect(
				"A\n\\B"
			).markupToPrint(
				"AB"
			);
		});
		it("still works if both backslashes are used", function() {
			expect(
				"A\\\n\\B"
			).markupToPrint(
				"AB"
			);
		});
		it("works to extend the heading syntax", function() {
			expect(
				"#A\n\\B"
			).markupToBecome(
				"<h1>AB</h1>"
			);
			expect(
				"#A\\\nB"
			).markupToBecome(
				"<h1>AB</h1>"
			);
		});
		it("works to extend the bulleted list syntax", function() {
			expect(
				"* A\n\\B"
			).markupToBecome(
				"<ul><li>AB</li></ul>"
			);
			expect(
				"* A\\\nB"
			).markupToBecome(
				"<ul><li>AB</li></ul>"
			);
		});
		it("works to extend the numbered list syntax", function() {
			expect(
				"0. A\n\\B"
			).markupToBecome(
				"<ol><li>AB</li></ol>"
			);
			expect(
				"0. A\\\nB"
			).markupToBecome(
				"<ol><li>AB</li></ol>"
			);
		});
	});
});
