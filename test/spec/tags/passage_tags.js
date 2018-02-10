describe("author-defined passage tags", function() {
	'use strict';
	it("are present as an attribute on the <tw-passage> element", function() {
		runPassage("", "X", ["garply", "grault", "azure"]);
		expect($("tw-passage").attr('tags')).toBe("garply grault azure");
	});
	it("are also present as an attribute on the <tw-story> element", function() {
		runPassage("", "X", ["garply", "grault", "azure"]);
		expect($("tw-story").attr('tags')).toBe("garply grault azure");
	});
	it("on the <tw-story> element, only reflect the most recent passage", function() {
		runPassage("", "Y", ["foo", "baz", "qux"]);
		runPassage("", "X", ["garply", "grault", "azure"]);
		expect($("tw-story").attr('tags')).toBe("garply grault azure");
		runPassage("", "Z", []);
		expect($("tw-story").attr('tags')).toBe("");
	});
	it("on the <tw-story> element, even adhere to rewinding", function() {
		runPassage("", "Y", ["foo", "baz", "qux"]);
		runPassage("", "X", ["garply", "grault", "azure"]);
		expect($("tw-story").attr('tags')).toBe("garply grault azure");
		Engine.goBack();
		expect($("tw-story").attr('tags')).toBe("foo baz qux");
	});
});
