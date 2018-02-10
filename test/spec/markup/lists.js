describe("list markup", function() {
	'use strict';
	
	describe("bulleted lists", function() {
		it("wraps 1 or more adjacent lines starting with, * plus whitespace, in <ul><li>", function() {
			expect(
				"* A"
			).markupToBecome(
				"<ul><li>A</li></ul>"
			);
			expect(
				"* A\n* B"
			).markupToBecome(
				"<ul><li>A</li><li>B</li></ul>"
			);
		});
		it("won't work unless it's at the start of a line", function() {
			expect(
				"A B * C"
			).markupToBecome(
				"A B * C"
			);
			expect(
				"\nA B * C"
			).markupToBecome(
				"<br>A B * C"
			);
		});
		it("won't work unless whitespace follows the *", function() {
			expect(
				"*Red"
			).markupToBecome(
				"*Red"
			);
			expect(
				" *Red"
			).markupToBecome(
				" *Red"
			);
		});
		it("does not consume preceding line breaks", function() {
			[1,2,3,4].forEach(function(i) {
				expect(
					"A" + "\n".repeat(i) + "* A"
				).markupToBecome(
					"A" + "<br>".repeat(i) + "<ul><li>A</li></ul>"
				);
			});
		});
		it("won't create <br> elements afterward", function() {
			expect(
				"* A\nB"
			).markupToBecome(
				"<ul><li>A</li></ul>B"
			);
		});
		xit("work inside hooks", function() {
			expect(
				" |x>[\n* A\n* B]\n"
			).markupToBecome(
				" <tw-hook name=\"x\" title=\"Hook: ?x\"><br><ul><li>A</li><li>B</li></ul></tw-hook><br>"
			);
		});
		it("(unlike Markdown) allows nested lists by the addition of more consecutive *'s", function() {
			expect(
				"* A\n** B\n** C\n* D"
			).markupToBecome(
				"<ul><li>A</li><ul><li>B</li><li>C</li></ul><li>D</li></ul>"
			);
			expect(
				"* A\n*** B\n*** C\n* D"
			).markupToBecome(
				"<ul><li>A</li><ul><ul><li>B</li><li>C</li></ul></ul><li>D</li></ul>"
			);
			expect(
				"*** A\n*** B"
			).markupToBecome(
				"<ul><ul><ul><li>A</li><li>B</li></ul></ul></ul>"
			);
			expect(
				"*** A\n* B\n*** C"
			).markupToBecome(
				"<ul><ul><ul><li>A</li></ul></ul><li>B</li><ul><ul><li>C</li></ul></ul></ul>"
			);
		});
		it("(unlike Markdown) permits whitespace between the start of the line and *", function() {
			expect(
				" \t* A"
			).markupToBecome(
				"<ul><li>A</li></ul>"
			);
			expect(
				"   * A   \n   * B   "
			).markupToBecome(
				"<ul><li>A   </li><li>B   </li></ul>"
			);
		});
	});

	describe("numbered lists", function() {
		it("wraps 1 or more adjacent lines starting with 0., plus whitespace, in <ul><li>", function() {
			expect(
				"0. A"
			).markupToBecome(
				"<ol><li>A</li></ol>"
			);
			expect(
				"0. A\n0. B"
			).markupToBecome(
				"<ol><li>A</li><li>B</li></ol>"
			);
			expect(
				"0.A"
			).markupToBecome(
				"0.A"
			);
		});
		it("won't work unless it's at the start of a line", function() {
			expect(
				"A B 0.C"
			).markupToBecome(
				"A B 0.C"
			);
			expect(
				"00. \n"
			).markupToBecome(
				"00. <br>"
			);
			expect(
				"\nA B 0.C"
			).markupToBecome(
				"<br>A B 0.C"
			);
		});
		it("does not consume preceding line breaks", function() {
			[1,2,3,4].forEach(function(i) {
				expect(
					"A" + "\n".repeat(i) + "0. A"
				).markupToBecome(
					"A" + "<br>".repeat(i) + "<ol><li>A</li></ol>"
				);
			});
		});
		it("won't create <br> elements afterward", function() {
			expect(
				"0. A\nB"
			).markupToBecome(
				"<ol><li>A</li></ol>B"
			);
		});
		xit("work inside hooks", function() {
			expect(
				" |x>[\n0. A\n0. B]\n"
			).markupToBecome(
				" <tw-hook name=\"x\" title=\"Hook: ?x\"><br><ol><li>A</li><li>B</li></ol></tw-hook><br>"
			);
		});
		it("(unlike Markdown) allows nested lists by the addition of more consecutive *'s", function() {
			expect(
				"0. A\n0.0. B\n0.0. C\n0. D"
			).markupToBecome(
				"<ol><li>A</li><ol><li>B</li><li>C</li></ol><li>D</li></ol>"
			);
			expect(
				"0. A\n0.0.0. B\n0.0.0. C\n0. D"
			).markupToBecome(
				"<ol><li>A</li><ol><ol><li>B</li><li>C</li></ol></ol><li>D</li></ol>"
			);
			expect(
				"0.0.0. A\n0.0.0. B"
			).markupToBecome(
				"<ol><ol><ol><li>A</li><li>B</li></ol></ol></ol>"
			);
			expect(
				"0.0.0. A\n0. B\n0.0.0. C"
			).markupToBecome(
				"<ol><ol><ol><li>A</li></ol></ol><li>B</li><ol><ol><li>C</li></ol></ol></ol>"
			);
		});
		it("(unlike Markdown) permits whitespace between the start of the line and 0.", function() {
			expect(
				" \t0. A"
			).markupToBecome(
				"<ol><li>A</li></ol>"
			);
			expect(
				"   0. A   \n   0. B   "
			).markupToBecome(
				"<ol><li>A   </li><li>B   </li></ol>"
			);
		});
	});
});
