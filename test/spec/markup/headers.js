describe("headers and rules", function() {
	'use strict';
	describe("header markup", function() {
		[1,2,3,4,5,6].forEach(function(i) {
			it("wraps a line starting with " + "#".repeat(i) + " with a <h" + i + "> element", function() {
				expect(
					"#".repeat(i) + "Haruyasumi natsuyasumi akiyasumi fuyuyasumi"
				).markupToBecome(
					"<h" + i + ">Haruyasumi natsuyasumi akiyasumi fuyuyasumi</h" + i + ">"
				);
				expect(
					"#".repeat(i) + "Haruyasumi natsuyasumi akiyasumi fuyuyasumi\n"
				).markupToBecome(
					"<h" + i + ">Haruyasumi natsuyasumi akiyasumi fuyuyasumi</h" + i + ">"
				);
			});
		});
		it("won't work if it's preceded by text", function() {
			expect(
				"A B #C"
			).markupToBecome(
				"A B #C"
			);
			expect(
				"\nA B #C"
			).markupToBecome(
				"<br>A B #C"
			);
		});
		it("does not consume preceding line breaks", function() {
			[1,2,3,4].forEach(function(i) {
				expect(
					"A" + "\n".repeat(i) + "#A"
				).markupToBecome(
					"A" + "<br>".repeat(i) + "<h1>A</h1>"
				);
			});
		});
		it("does not create a <br> afterward", function() {
			expect(
				"#A\nB"
			).markupToBecome(
				"<h1>A</h1>B"
			);
		});
		it("(unlike Markdown) permits whitespace between the start of the line and #", function() {
			expect(
				" \f\v\t#A"
			).markupToBecome(
				"<h1>A</h1>"
			);
		});
	});

	describe("horizontal rules", function() {
		it("turns 3 or more hyphens solely occupying a single line into a <hr>", function() {
			[3,4,5,8,16].forEach(function(i) {
				expect(
					"-".repeat(i)
				).markupToBecome(
					"<hr>"
				);
			});
		});
		it("works consecutively", function() {
			expect(
				"---\n".repeat(3)
			).markupToBecome(
				"<hr><hr><hr>"
			);
		});
		it("won't work if it's preceded by text", function() {
			expect(
				"A ---"
			).markupToBecome(
				"A ---"
			);
			expect(
				"\nA B ---"
			).markupToBecome(
				"<br>A B ---"
			);
		});
		it("ignores preceding and trailing whitespace", function() {
			expect(
				"   ---   \ngarply"
			).markupToBecome(
				"<hr>garply"
			);
		});
		it("does not consume preceding line breaks", function() {
			[1,2,3,4].forEach(function(i) {
				expect(
					"A" + "\n".repeat(i) + "---"
				).markupToBecome(
					"A" + "<br>".repeat(i) + "<hr>"
				);
			});
		});
		it("won't create <br> elements afterward", function() {
			expect(
				"---\ngarply"
			).markupToBecome(
				"<hr>garply"
			);
		});
		it("(unlike Markdown) permits whitespace between the start of the line and ---", function() {
			expect(
				" \t---"
			).markupToBecome(
				"<hr>"
			);
		});
	});
});
