describe("variables", function() {
	'use strict';
	describe("the (set:) macro", function() {
		it("requires one or more assignment requests", function() {
			expect("(set: 1)").markupToError();
			expect("(set: 'A')").markupToError();
			expect("(set: false)").markupToError();
			expect("(set: $a)").markupToError();
			expect("(set:)").markupToError();
			expect("(set: $a to 1)").not.markupToError();
			expect("(set: $a to 1, $b to 2)").not.markupToError();
			expect("(set: $a to 1, 2)").markupToError();
			expect("(set: $a into $b)").markupToError();
		});
		it("when given a variable assignment request, sets the variable to a value", function() {
			expect("(set: $a to 1)$a").markupToPrint("1");
		});
		it("can set variables to values in other variables", function() {
			expect("(set: $b to 1)(set: $a to $b)$a").markupToPrint("1");
			expect("(set: $b to 1)(set: $a to $b + 1)$a").markupToPrint("2");
			expect("(set: $b to 1)(set: $c to 1)(set: $a to (either:$b,$c))$a").markupToPrint("1");
			expect("(set: $b to 1)(set: $c to 1)(set: $a to (either:$b,$c)+1)$a").markupToPrint("2");
		});
		it("can set a lot of variables", function() {
			expect(Object.keys($).reduce(function(a, e, i) {
				return a + "(set: $" + e + " to " +
					(i % 3 === 0 ? '"' + String.fromCodePoint(i/3+0x1D4D0) + '"'
					: i % 3 === 1 ? 'false'
					: (Math.random()*1000|1)) + ")";
			}, "")).not.markupToError();
		});
		it("when given multiple requests, performs them in order", function() {
			expect("(set: $a to 2, $b to 3, $c to 4, $d to $b)$d $c $a").markupToPrint("3 4 2");
		});
		it("can name a variable using astral characters", function() {
			expect("(set: $A𐌎B to 1)(print: $A𐌎B)").markupToPrint("1");
		});
		it("runs on evaluation, but can't be assigned or used as a value", function() {
			expect("(print: (set: $a to 1))").markupToError();
			expect("(print: (a:(set: $b to 2)))").markupToError();
			expect("(print: $a + $b)").markupToPrint("3");
		});
		it("cannot assign to a hook reference", function() {
			expect("|a>[Gee] |a>[Wow](set: ?a to '//Golly//')").markupToError();
			expect("|a>[Gee] |a>[Wow](set: ?a to false)").markupToError();
			expect("|a>[Gee] |a>[Wow](set: ?a to (a:1,2,3))").markupToError();
		});
		it("cannot assign a hook reference to a variable", function() {
			expect("|a>[Gee] |a>[Wow](set: $a to ?a)(click:$a)[]").markupToError();
			expect("|a>[Gee] |a>[Wow](set: $a to ?a's 1st)(click:$a)[]").markupToError();
		});
		it("assignment requests can't be assigned", function() {
			expect("(set: $wordy to ($wordy to 2)) ").markupToError();
			expect("(set: $wordy to (a: $wordy to 2)) ").markupToError();
		});
		it("doesn't pollute past turns", function() {
			runPassage("(set: $a to 1)","one");
			runPassage("(set: $a to 2)","two");
			Engine.goBack();
			expect("(print: $a)").markupToPrint("1");
		});
		it("doesn't pollute past turns, even when deeply modifying arrays", function() {
			runPassage("(set: $a to (a:(a:1),1))","one");
			runPassage("(set: $a's 1st's 1st to 2)","two");
			runPassage("(set: $a's 1st's 1st to 3)","three");
			Engine.goBack();
			expect("(print: $a)").markupToPrint("2,1");

			runPassage("(set:$deep to (a:(a:1),1))(set: $a to $deep)","one");
			runPassage("(set:$a's 1st's 1st to 2)","two");
			Engine.goBack();
			expect("(print: $deep)").markupToPrint("1,1");
		});
		it("doesn't pollute past turns, even when deeply modifying datamaps", function() {
			runPassage("(set: $dm to (dm:'a',(dm:'a',1)))","one");
			runPassage("(set: $dm's a's a to 2)","two");
			runPassage("(set: $dm's a's a to 3)","three");
			Engine.goBack();
			expect("(print: $dm's a's a)").markupToPrint("2");

			runPassage("(set:$deep to (dm:'a',(dm:'a',1)))(set: $dm to $deep)","one");
			runPassage("(set:$dm's a's a to 2)","two");
			Engine.goBack();
			expect("(print: $deep's a's a)").markupToPrint("1");
		});
		it("doesn't pollute past turns, even when deeply modifying datasets", function() {
			runPassage("(set:$deep to (ds:(dm:'a',1)))(set: $ds to $deep)","one");
			runPassage("(set:(a:...$ds)'s 1st's a to 2)","two");
			Engine.goBack();
			expect("(print: (a:...$ds)'s 1st's a)").markupToPrint("1");
		});
		it("can't mutate an unassigned collection", function() {
			expect("(set: (a:2)'s 1st to 1)").markupToError();
			expect("(set: \"red\"'s 1st to \"r\")").markupToError();
			expect("(set: (datamap:)'s 'E' to 1)").markupToError();
		});
	});
	describe("the (put:) macro", function() {
		//TODO: Add more of the above tests.
		it("can't mutate an unassigned collection", function() {
			expect("(put: 1 into (a:2)'s 1st)").markupToError();
			expect("(put: \"r\" into \"red\"'s 1st)").markupToError();
			expect("(put: 1 into (datamap:)'s 'E')").markupToError();
		});
	});
	describe("bare variables in passage text", function() {
		it("for numbers, prints the number", function() {
			runPassage("(set:$x to 0.125)");
			expect("$x").markupToPrint("0.125");
			runPassage("(set:$y to 0)");
			expect("$y").markupToPrint("0");
		});
		it("for strings, renders the string", function() {
			runPassage("(set:$x to '//italic//')");
			expect("$x").markupToPrint("italic");
			runPassage("(set:$y to '')");
			expect("$y").markupToPrint("");
		});
		it("for booleans, renders nothing", function() {
			runPassage("(set:$x to true)");
			expect("$x").markupToPrint("");
			runPassage("(set:$y to false)");
			expect("$y").markupToPrint("");
		});
		it("for arrays, prints the array", function() {
			runPassage("(set:$x to (a:1,2))");
			expect("$x").markupToPrint("1,2");
			runPassage("(set:$y to (a:))");
			expect("$y").markupToPrint("");
		});
		it("names cannot contain just underscores or numbers", function() {
			expect("$_").markupToPrint("$_");
			expect("$2").markupToPrint("$2");
			expect("$2_").markupToPrint("$2_");
			expect("$_2").markupToPrint("$_2");
		});
	});
});
