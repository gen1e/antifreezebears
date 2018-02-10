describe("link macros", function() {
	'use strict';
	
	describe("(link-replace:)", function() {
		it("accepts exactly 1 non-empty string", function() {
			expect("(print:(link-replace:))").markupToError();
			expect("(print:(link-replace:''))").markupToError();
			expect("(print:(link-replace:'baz'))").not.markupToError();
			expect("(print:(link-replace:2))").markupToError();
			expect("(print:(link-replace:false))").markupToError();
			expect("(print:(link-replace:'baz', 'baz'))").markupToError();
		});
		it("errors when placed in passage prose while not attached to a hook", function() {
			expect("(link-replace:'A')").markupToError();
			expect("(link-replace:'A')[]").not.markupToError();
		});
		it("when attached to a hook, creates a link", function() {
			var link = runPassage("(link-replace:'A')[]").find('tw-link');
			expect(link.parent().is('tw-hook')).toBe(true);
			expect(link.tag()).toBe("tw-link");
		});
		it("when clicked, reveals the hook and removes itself", function() {
			var p = runPassage("(link-replace:'A')[B(set:$c to 12)]");
			p.find('tw-link').click();
			expect(p.text()).toBe("B");
			expect("$c").markupToPrint("12");
		});
		it("is aliased as (link:)", function() {
			var p = runPassage("(link:'A')[B(set:$c to 12)]");
			p.find('tw-link').click();
			expect(p.text()).toBe("B");
			expect("$c").markupToPrint("12");
		});
		it("can be concatenated", function() {
			var p = runPassage("(set: $x to (link:'a')+(link:'b'))$x[Hello]");
			expect(p.text()).toBe("b");
			p.find('tw-link').click();
			expect(p.text()).toBe("Hello");
		});
	});
	describe("(link-reveal:)", function() {
		it("accepts exactly 1 non-empty string", function() {
			expect("(print:(link-reveal:))").markupToError();
			expect("(print:(link-reveal:''))").markupToError();
			expect("(print:(link-reveal:'baz'))").not.markupToError();
			expect("(print:(link-reveal:2))").markupToError();
			expect("(print:(link-reveal:false))").markupToError();
			expect("(print:(link-reveal:'baz', 'baz'))").markupToError();
		});
		it("errors when placed in passage prose while not attached to a hook", function() {
			expect("(link-reveal:'A')").markupToError();
			expect("(link-reveal:'A')[]").not.markupToError();
		});
		it("when attached to a hook, creates a link", function() {
			var link = runPassage("(link-reveal:'A')[]").find('tw-link');
			expect(link.parent().is('tw-hook')).toBe(true);
			expect(link.tag()).toBe("tw-link");
		});
		it("when clicked, reveals the hook and becomes plain text", function() {
			var p = runPassage("(link-reveal:'A')[B(set:$c to 12)]");
			p.find('tw-link').click();
			expect(p.text()).toBe("AB");
			expect(p.find('tw-link').length).toBe(0);
			expect("$c").markupToPrint("12");
		});
	});
	describe("(link-repeat:)", function() {
		it("accepts exactly 1 non-empty string", function() {
			expect("(print:(link-repeat:))").markupToError();
			expect("(print:(link-repeat:''))").markupToError();
			expect("(print:(link-repeat:'baz'))").not.markupToError();
			expect("(print:(link-repeat:2))").markupToError();
			expect("(print:(link-repeat:false))").markupToError();
			expect("(print:(link-repeat:'baz', 'baz'))").markupToError();
		});
		it("errors when placed in passage prose while not attached to a hook", function() {
			expect("(link-repeat:'A')").markupToError();
			expect("(link-repeat:'A')[]").not.markupToError();
		});
		it("when attached to a hook, creates a link", function() {
			var link = runPassage("(link-repeat:'A')[]").find('tw-link');
			expect(link.parent().is('tw-hook')).toBe(true);
			expect(link.tag()).toBe("tw-link");
		});
		it("when clicked, reveals the hook and leaves the link as-is", function() {
			var p = runPassage("(link-repeat:'A')[B(set:$c to 12)]");
			p.find('tw-link').click();
			expect(p.text()).toBe("AB");
			expect("$c").markupToPrint("12");
			expect(p.find('tw-link').length).toBe(1);
		});
		it("the link can be clicked multiple times", function() {
			var p = runPassage("(set:$c to 0)(link-repeat:'A')[B(set:$c to it + 12)]");
			p.find('tw-link').click();
			p.find('tw-link').click();
			p.find('tw-link').click();
			expect("$c").markupToPrint("36");
		});
	});
	/*
		Though these are not changers, they are similar enough to the above in terms of API.
	*/
	describe("(link-goto:)", function() {
		it("renders to a <tw-link> element if the linked passage exists", function() {
			createPassage("","mire");
			var link = runPassage("(link-goto:'mire')").find('tw-link');
			
			expect(link.parent().is('tw-expression')).toBe(true);
			expect(link.tag()).toBe("tw-link");
			expect(link.attr("passage-name")).toBe("mire");
		});
		it("becomes a <tw-broken-link> if the linked passage is absent", function() {
			var link = runPassage("(link-goto: 'mire')").find('tw-broken-link');
			
			expect(link.parent().is('tw-expression')).toBe(true);
			expect(link.tag()).toBe("tw-broken-link");
			expect(link.html()).toBe("mire");
		});
		it("accepts 1 or 2 non-empty strings", function() {
			expect("(link-goto:)").markupToError();
			expect("(link-goto:'')").markupToError();
			expect("(link-goto:2)").markupToError();
			expect("(link-goto:true)").markupToError();

			expect("(link-goto:'s')").not.markupToError();
			expect("(link-goto:'s','s')").not.markupToError();
			expect("(link-goto:'s','s','s')").markupToError();
		});
		it("renders markup in the link text, and ignores it for discerning the passage name", function() {
			createPassage("","mire");
			var p = runPassage("(link-goto:'//glower//','//mire//')");
			expect(p.find('i').text()).toBe("glower");
			expect(p.find('tw-link').attr("passage-name")).toBe("mire");

			p = runPassage("(link-goto:'//mire//')");
			expect(p.find('i').text()).toBe("mire");
			expect(p.find('tw-link').attr("passage-name")).toBe("mire");
		});
		it("goes to the passage when clicked", function() {
			createPassage("<p>garply</p>","mire");
			var link = runPassage("(link-goto:'mire')").find('tw-link');
			link.click();
			expect($('tw-passage p').text()).toBe("garply");
		});
		it("can be focused", function() {
			createPassage("","mire");
			var link = runPassage("(link-goto:'mire')").find('tw-link');
			expect(link.attr("tabindex")).toBe("0");
		});
		it("behaves as if clicked when the enter key is pressed while it is focused", function() {
			createPassage("<p>garply</p>","mire");
			var link = runPassage("(link-goto:'mire')").find('tw-link');
			link.trigger($.Event('keydown', { which: 13 }));
			expect($('tw-passage p').text()).toBe("garply");
		});
	});
	describe("(link-undo:)", function() {
		it("accepts exactly 1 non-empty string", function() {
			expect("(link-undo:)").markupToError();
			expect("(link-undo:2)").markupToError();
			expect("(link-undo:'')").markupToError();
			expect("(link-undo:true)").markupToError();
			
			expect("(link-undo:'s')").not.markupToError();
			expect("(link-undo:'s','s')").markupToError();
			expect("(link-undo:'s','s','s')").markupToError();
		});
		it("errors when run in the first turn", function(){
			expect("(link-undo:'x')").markupToError();
		});
		it("renders to a <tw-link> element containing the link text", function() {
			runPassage("","grault");
			var link = runPassage("(link-undo:'mire')").find('tw-link');
			
			expect(link.parent().is('tw-expression')).toBe(true);
			expect(link.tag()).toBe("tw-link");
			expect(link.text()).toBe("mire");
			expect(link.is("[undo]")).toBe(true);
		});
		it("renders markup in the link text", function() {
			runPassage("","grault");
			var p = runPassage("(link-undo:'//glower//')");
			expect(p.find('i').text()).toBe("glower");
		});
		it("when clicked, undoes the current turn", function() {
			runPassage("(set: $a to 1)","one");
			runPassage("(set: $a to 2)(link-undo:'x')","two").find('tw-link').click();
			expect("(print: $a) (print:(history:)'s length)").markupToPrint("1 1");
		});
		it("can be focused", function() {
			runPassage("","grault");
			var link = runPassage("(link-undo:'mire')").find('tw-link');
			expect(link.attr("tabindex")).toBe("0");
		});
		it("behaves as if clicked when the enter key is pressed while it is focused", function() {
			runPassage("<p>garply</p>","grault");
			var link = runPassage("(link-undo:'mire')","corge").find('tw-link');
			link.trigger($.Event('keydown', { which: 13 }));
			expect($('tw-passage p').text()).toBe("garply");
		});
	});
});
