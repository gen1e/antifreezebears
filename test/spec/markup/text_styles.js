describe("basic text style markup", function() {
	'use strict';
	
	[
		{
			name:   "bold markup",
			markup: ["''","''"],
			html:   ["<b>","</b>"],
		},
		{
			name:   "italic markup",
			markup: ["//","//"],
			html:   ["<i>","</i>"],
		},
		{
			name:   "superscript markup",
			markup: ["^^","^^"],
			html:   ["<sup>","</sup>"],
		},
		{
			name:   "strikethrough markup",
			markup: ["~~","~~"],
			html:   ["<s>","</s>"],
		},
	]
	.forEach(function(e) {
		describe(e.name, function() {
			it("wraps text enclosed in " + e.markup.join(" and ") +
				" with " + e.html.join(" and ") + " tags.", function() {
				expect(
					"A " + e.markup.join(" B ") + " C"
				).markupToBecome(
					"A " + e.html  .join(" B ") + " C"
				);
			});
			it("spans multiple lines", function() {
				expect(
					"A " + e.markup.join(" B\n ")   + " C"
				).markupToBecome(
					"A " + e.html  .join(" B<br> ") + " C"
				);
			});
			it("can't be nested", function() {
				expect(
					"A " + e.markup.join(e.markup.join(" B "))   + " C"
				).markupToBecome(
					"A  B  C"
				);
			});
			it("is ignored if there's no closing pair", function() {
				expect(
					"A " + e.markup[0] + " B"
				).markupToBecome(
					"A " + e.markup[0] + " B"
				);
			});
			it("works even when empty", function() {
				expect(
					"A" + e.markup.join("") + "B"
				).markupToBecome(
					"AB"
				);
			});
		});
	});
	
	describe("emphasis markup", function() {
		it("wraps text enclosed in single * " +
			" with <em> and </em> tags.", function() {
			expect(
				"A * B * C"
			).markupToBecome(
				"A <em> B </em> C"
			);
		});
		it("spans multiple lines (in a way that doesn't conflict with bulleted lists)", function() {
			expect(
				"A * B\n C * D"
			).markupToBecome(
				"A <em> B<br> C </em> D"
			);
		});
		it("is ignored if there's no closing pair", function() {
			expect(
				"A * B"
			).markupToBecome(
				"A * B"
			);
		});
	});
	
	describe("strong emphasis markup", function() {
		it("wraps text enclosed in double ** " +
			" with <strong> and </strong> tags.", function() {
			expect(
				"A ** B ** C"
			).markupToBecome(
				"A <strong> B </strong> C"
			);
		});
		it("spans multiple lines (in a way that doesn't conflict with bulleted lists)", function() {
			expect(
				"A ** B\n C ** D"
			).markupToBecome(
				"A <strong> B<br> C </strong> D"
			);
		});
		it("is ignored if there's no closing pair", function() {
			expect(
				"A ** B"
			).markupToBecome(
				"A ** B"
			);
		});
		it("works even when empty", function() {
			expect(
				"A****B"
			).markupToBecome(
				"AB"
			);
		});
		it("can combine with emphasis markup", function() {
			expect(
				"A *** B *** C"
			).markupToBecome(
				"A <strong><em> B </em></strong> C"
			);
		});
	});

	describe("nested markup", function() {
		it("exists", function() {
			expect(
				"''//bold italic//''."
			).markupToBecome(
				"<b><i>bold italic</i></b>."
			);
		});
		it("won't work unless it's correctly nested", function() {
			expect(
				"//''error//''"
			).markupToBecome(
				"<i>''error</i>''"
			);
		});
	});
});
