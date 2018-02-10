describe("setup passages", function() {
	'use strict';
	[false,true].forEach(function headerFooterTests(debug) {
		var header = debug ? "debug-header" : "header";
		var footer = debug ? "debug-footer" : "footer";
		var startup = debug ? "debug-startup" : "startup";
		
		describe("the '" + header + "' tag", function() {
			it("makes the passage's source run before any other passage is run", function() {
				createPassage("(set: $red to $red + 1)","header",[header]);
				expect("$red").markupToPrint("1");
				expect("$red").markupToPrint("2");
				expect("$red").markupToPrint("3");
			});
			it("prepends the passage's source to every passage at runtime", function() {
				createPassage("Gee","header",[header]);
				expect("wow").markupToPrint("Geewow");
			});
			it("creates proper <tw-include> elements", function() {
				createPassage("Gee","header",[header]);
				var p = runPassage("wow");
				expect(p.find('tw-include').text()).toBe("Gee");
				expect(p.text()).toBe("Geewow");
			});
			it("tagged passages run in alphabetical order", function() {
				createPassage("(set: $red to 'A')","header1",[header]);
				createPassage("(set: $red to $red + 'B')","header2",[header]);
				expect("$red").markupToPrint("AB");
			});
			it("affects hooks inside the passage", function() {
				createPassage("(click: ?red)[]","header",[header]);
				expect(runPassage("|red>[Hmm]","1").find('tw-enchantment').length).toBe(1);
			});
			it("won't lead to infinite regress if it is displayed itself", function() {
				createPassage("Hey","header",[header]);
				expect(goToPassage("header").text()).toBe("HeyHey");
			});
			if (debug) {
				it("tagged passages run after ordinary header passages", function() {
					createPassage("(set: $red to 'A')","setup2",["header"]);
					createPassage("(set: $red to $red + 'B')","setup1",[header]);
					expect("$red").markupToPrint("AB");
				});
			}
		});
		describe("the '" + footer + "' tag", function() {
			it("makes the passage's source run after any other passage is run", function() {
				createPassage("(set: $red to $red + 1)","footer",[footer]);
				expect("$red").markupToPrint("0");
				expect("$red").markupToPrint("1");
				expect("$red").markupToPrint("2");
			});
			it("appends the passage's source to every passage at runtime", function() {
				createPassage("gee","footer",[footer]);
				expect("Wow").markupToPrint("Wowgee");
			});
			it("creates proper <tw-include> elements", function() {
				createPassage("wow","footer",[footer]);
				var p = runPassage("Gee");
				expect(p.find('tw-include').text()).toBe("wow");
				expect(p.text()).toBe("Geewow");
			});
			it("tagged passages run in alphabetical order", function() {
				createPassage("(set: $red to 'A')","footer1",[footer]);
				createPassage("(set: $red to $red + 'B')","footer2",[footer]);
				runPassage('');
				expect("$red").markupToPrint("AB");
			});
			it("affects hooks inside the passage", function() {
				createPassage("(click: ?red)[]","footer",[footer]);
				expect(runPassage("|red>[Hmm]","1").find('tw-enchantment').length).toBe(1);
			});
			it("won't lead to infinite regress if it is displayed itself", function() {
				createPassage("Hey","footer",[footer]);
				expect(goToPassage("footer").text()).toBe("HeyHey");
			});
			if (debug) {
				it("tagged passages run after ordinary footer passages", function() {
					createPassage("(set: $red to 'A')","setup2",["footer"]);
					createPassage("(set: $red to $red + 'B')","setup1",[footer]);
					runPassage('');
					expect("$red").markupToPrint("AB");
				});
			}
		});
		describe("the '" + startup + "' tag", function() {
			it("makes the passage's source run before the very first passage is run", function() {
				createPassage("(set: $red to $red + 1)","setup",[startup]);
				expect("$red").markupToPrint("1");
				expect("$red").markupToPrint("1");
			});
			it("creates proper <tw-include> elements", function() {
				createPassage("Gee","setup",[startup]);
				var p = runPassage("wow");
				expect(p.find('tw-include').text()).toBe("Gee");
				expect(p.text()).toBe("Geewow");
			});
			it("tagged passages run in alphabetical order", function() {
				createPassage("(set: $red to 'A')","setup1",[startup]);
				createPassage("(set: $red to $red + 'B')","setup2",[startup]);
				expect("$red").markupToPrint("AB");
			});
			it("tagged passages run before header passages", function() {
				createPassage("(set: $red to 'A')","setup2",[startup]);
				createPassage("(set: $red to $red + 'B')","setup1",[header]);
				expect("$red").markupToPrint("AB");
			});
			it("affects hooks inside the passage", function() {
				createPassage("(click: ?red)[]","setup",[startup]);
				expect(runPassage("|red>[Hmm]","1").find('tw-enchantment').length).toBe(1);
			});
		});
	});
});
