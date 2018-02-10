describe("hooks", function () {
	'use strict';
	describe("anonymous hooks", function () {
		it("consist of text inside single square brackets, which become <tw-hook> elements", function (){
			runPassage("Hey[foo]Whoa!");
			expect($('tw-passage').find('tw-hook').text()).toBe("foo");
		});
		it("hooks can nest if they don't interfere with the link syntax", function (){
			runPassage("[foo[bar]]");
			expect($('tw-passage').find('tw-hook > tw-hook').text()).toBe("bar");
			runPassage("[[foo]bar]");
			expect($('tw-passage').find('tw-hook > tw-hook').text()).toBe("foo");
		});
		it("<tw-hook> elements have no name attributes", function (){
			runPassage("[foo]");
			expect($('tw-passage').find('tw-hook').is('[name]')).toBe(false);
		});
	});
	describe("named hooks", function () {
		it("consist of a |, a name, and a >, attached to a hook", function (){
			expect("|hook>[foo]").markupToPrint("foo");
		});
		it("may also alternatively have a mirrored nametag on the other side", function (){
			expect("[foo]<hook|").markupToPrint("foo");
		});
		it("names may not be empty", function (){
			expect("|>[foo]").markupToPrint("|>foo");
		});
		it("names may not contain whitespace", function (){
			expect("|hook >[foo]").markupToPrint("|hook >foo");
		});
		it("names may contain only underscores or numbers", function() {
			expect("|2_>[foo]").markupToPrint("foo");
			expect("|_2>[foo]").markupToPrint("foo");
			expect("|_>[foo]").markupToPrint("foo");
			expect("|2>[foo]").markupToPrint("foo");
		});
		it("can be nested", function (){
			expect("[[Hello!]<b|]<a|").markupToPrint("Hello!");
			expect("[|b>[Hello!]]<a|").markupToPrint("Hello!");
			expect("|a>[|b>[Hello!]]").markupToPrint("Hello!");
			expect("|a>[[Hello!]<b|]").markupToPrint("Hello!");
		});
		it("become <tw-hook> elements", function (){
			runPassage("[foo]<hook|");
			expect($('tw-passage').find('tw-hook').text()).toBe('foo');
		});
		it("<tw-hook> elements have name attributes", function (){
			runPassage("[foo]<grault|");
			expect($('tw-passage').find('tw-hook').attr('name')).toBe('grault');
		});
		it("names are insensitive", function() {
			var p = runPassage("[foo]<GRAULT| ");
			expect(p.find('tw-hook').attr('name')).toBe('grault');
			p = runPassage("[foo]<_gra_u-lt| ");
			expect(p.find('tw-hook').attr('name')).toBe('grault');
		});
	});
	describe("changer macro attached hooks", function () {
		it("consist of a macro, then a hook", function (){
			expect("(if:true)[foo]").markupToPrint("foo");
		});
		it("will error if the macro doesn't produce a command or boolean", function (){
			expect("(either:'A')[Hey]").markupToError();
			expect("(either:1)[Hey]").markupToError();
			expect("(a:)[Hey]").markupToError();
			expect("(datamap:)[Hey]").markupToError();
			expect("(dataset:)[Hey]").markupToError();
			expect("(set:$x to 1)[Hey]").not.markupToError(); // The (set:) command doesn't attach
			expect("(either:(if:true))[Hey]").not.markupToError();
		});
		it("may have any amount of whitespace between the macro and the hook", function (){
			expect("(if:true) [foo]").markupToPrint("foo");
			expect("(if:true)\n[foo]").markupToPrint("foo");
			expect("(if:true) \n \n [foo]").markupToPrint("foo");
		});
		it("may have a nametag on the left side", function (){
			expect("(if:true)|hook>[foo]").not.markupToError();
		});
		it("may have a mirrored nametag on the right side", function (){
			expect("(if:true)[foo]<hook|").not.markupToError();
			expect("(a:1)[foo]<hook|").markupToError();
		});
		it("will error if the hook has no closing bracket", function (){
			expect("(if:true)[(if:true)[Good golly]", 2).markupToError();
		});
		it("can chain changers with +", function (){
			expect("(text-color:#639)+(text-style:'bold')[foo]").markupToPrint("foo");
		});
		it("can chain changers with any amount of whitespace around the +", function (){
			expect("(text-color:#639)  +  (text-style:'bold')    [foo]").markupToPrint("foo");
			expect("(text-color:#639)\n+(text-style:'bold')\n[foo]").markupToPrint("foo");
		});
		it("won't initiate chains with non-changer values", function (){
			expect("(either:7)+(text-style:'bold')[foo]").markupToPrint("7+foo");
		});
		it("will error when chaining with non-changers", function (){
			expect("(text-style:'bold')+(either:7,8)+(text-style:'italic')[foo]").markupToError();
		});
	});
	describe("changer variable attached hooks", function () {
		beforeEach(function(){
			runPassage('(set: $foo to (if:true))');
		});
		it("consist of a variable, then a hook", function (){
			expect("$foo[foo]").markupToPrint("foo");
		});
		it("will error if the variable doesn't contain a changer command or boolean", function (){
			runPassage('(set: $str to "A")'
				+ '(set: $num to 2)'
				+ '(set: $arr to (a:))'
				+ '(set: $dm to (datamap:))'
				+ '(set: $ds to (dataset:))');
			expect("$str[Hey]").markupToError();
			expect("$num[Hey]").markupToError();
			expect("$arr[Hey]").markupToError();
			expect("$dm[Hey]").markupToError();
			expect("$ds[Hey]").markupToError();
		});
		it("may have any amount of whitespace between the macro and the hook", function (){
			expect("$foo [foo]").markupToPrint("foo");
			expect("$foo\n[foo]").markupToPrint("foo");
			expect("$foo \n \n [foo]").markupToPrint("foo");
		});
		it("may have a nametag on the left side", function (){
			expect("$foo|hook>[foo]").not.markupToError();
			expect("$bar|hook>[foo]").markupToError();
		});
		it("may have a mirrored nametag on the right side", function (){
			expect("$foo[foo]<hook|").not.markupToError();
			expect("$bar[foo]<hook|").markupToError();
		});
		it("will error if the hook has no closing bracket", function (){
			expect("$foo[$foo[Good golly]", 2).markupToError();
		});
		it("can chain changers", function (){
			runPassage("(set: $bar to (text-color:#639))(set: $baz to (text-style:'bold'))");
			expect("$bar+$baz[foo]").markupToPrint("foo");
		});
		it("can chain changers with any amount of whitespace", function (){
			runPassage("(set: $bar to (text-color:#639))(set: $baz to (text-style:'bold'))");
			expect("$bar  \n+  $baz    [foo]").markupToPrint("foo");
			expect("$bar  +\n  $baz    [foo]").markupToPrint("foo");
		});
		it("won't initiate chains with non-changer values", function (){
			runPassage("(set: $bar to 7)(set: $baz to (text-style:'bold'))");
			expect("$bar+$baz[foo]").markupToPrint("7+foo");
		});
		it("will error when chaining with non-changers", function (){
			runPassage("(set: $bar to 7)(set: $baz to (text-style:'bold'))");
			expect("$bar+$baz+$bar[foo]").markupToError();
		});
	});
	describe("hidden named hooks", function () {
		it("are named hooks with the square bracket replaced with a parenthesis", function (){
			runPassage("|hook)[foo]");
			expect($('tw-story').find('tw-hook').attr('name')).toBe('hook');
			runPassage("[foo](hook|");
			expect($('tw-story').find('tw-hook').attr('name')).toBe('hook');
		});
		it("are hidden when the passage initially renders", function (){
			expect("[foo](hook|").markupToPrint("");
		});
		it("are not revealed if (if:) is attached", function (){
			expect("(if:true)[foo](hook|").markupToPrint("");
		});
		it("are not revealed if true is attached", function (){
			expect("(set:$a to true)$a[foo](hook|").markupToPrint("");
		});
	});
});
