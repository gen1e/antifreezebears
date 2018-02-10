describe("verbatim syntax", function() {
	'use strict';
	it("suppresses all other syntax between ` and `", function() {
		expect(
			"`A''B''   //C//`"
		).markupToBecome(
			"<tw-verbatim>A''B''   //C//</tw-verbatim>"
		);
	});
	it("preserves whitespace", function() {
		expect(
			"`        `"
		).markupToBecome(
			"<tw-verbatim>        </tw-verbatim>"
		);
	});
	it("spans multiple lines", function() {
		expect(
			"`A\n\n''B''`"
		).markupToBecome(
			"<tw-verbatim>A<br><br>''B''</tw-verbatim>"
		);
	});
	it("cannot be nested with just single `s", function() {
		expect(
			"`''A''`''B''`C"
		).markupToBecome(
			"<tw-verbatim>''A''</tw-verbatim><b>B</b>`C"
		);
	});
	it("can enclose a single ` with additional ``s", function() {
		expect(
			"``''A''`''B''``C"
		).markupToBecome(
			"<tw-verbatim>''A''`''B''</tw-verbatim>C"
		);
	});
	it("can enclose closing hook syntax", function() {
		expect(
			runPassage("[`]`]").find('tw-verbatim').text()
		).toBe("]");
	});
	it("can enclose closing style syntax", function() {
		["''","//","^^","~~"].forEach(function(e) {
			expect(
				runPassage(e + "`" + e + "`" + e).find('tw-verbatim').text()
			).toBe(e);
		});
	});
	it("can enclose closing collapsing syntax", function() {
		expect(
			runPassage("{`}`}").find('tw-verbatim').text()
		).toBe("}");
	});
});
