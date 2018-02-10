describe("the (move:) macro", function() {
	'use strict';
	it("requires one or more 'into' assignment requests", function() {
		expect("(move: 1)").markupToError();
		expect("(move: 'A')").markupToError();
		expect("(move: false)").markupToError();
		expect("(move: $a)").markupToError();
		expect("(move:)").markupToError();
		expect("(move: $b into $a)").not.markupToError();
		expect("(move: $b into $a, $c into $b)").not.markupToError();
		expect("(move: $a to 1)").markupToError();
		expect("(move: $a to $b)").markupToError();
	});
	it("when given variable assignment requests, moves one variable's value into the other", function() {
		expect("(set: $a to 1)(move: $a into $b)$b $a").markupToPrint("1 0");
	});
	it("when given multiple requests, performs them in order", function() {
		expect("(set: $a to 2, $c to 3)(move: $a into $b, $c into $a, $b into $d)$d $a").markupToPrint("2 3");
	});
	it("runs on evaluation, but can't be assigned or used as a value", function() {
		runPassage("(set: $a to 3)");
		expect("(print: (move: $a into $b))").markupToError();
		expect("(print: (a:(move: $b into $c)))").markupToError();
		expect("(print: $c)").markupToPrint("3");
	});
	it("cannot alter a hook", function() {
		expect("|a>[Gee] |b>[Wow](move: ?a into ?b)").markupToError();
	});
	it("can replace array properties", function() {
		runPassage("(set: $a to (a:3,1))(set: $b to 2)(move: $b into $a's last)");
		expect("$b").markupToPrint("0");
		expect("(print:$a)").markupToPrint("3,2");
	});
	it("can remove array properties", function() {
		runPassage("(set: $a to (a:3,2))(move: $a's last into $b)");
		expect("$b").markupToPrint("2");
		expect("(print:$a's last)").markupToPrint("3");
	});
	it("can remove array slices", function() {
		runPassage("(set: $a to (a:1,2,3,4,5,6))(move: $a's (a:2,3) into $b)");
		expect("$b").markupToPrint("2,3");
		expect("$a").markupToPrint("1,4,5,6");
	});
	it("can remove string properties", function() {
		runPassage("(set: $a to \"Bol𐌎\")(move: $a's last into $b)");
		expect("$b").markupToPrint("𐌎");
		expect("(print:$a's last)").markupToPrint("l");
	});
	it("can remove string slices", function() {
		runPassage("(set: $a to \"Bol𐌎\")(move: $a's (a:2,3) into $b)");
		expect("$b").markupToPrint("ol");
		expect("$a").markupToPrint("B𐌎");
	});
	it("can insert datamap properties", function() {
		runPassage("(set: $d to (datamap:))(set: $b to 3)(move: $b into $d's A)");
		expect("$b").markupToPrint("0");
		expect("(print:$d's A)").markupToPrint("3");
	});
	it("can replace datamap properties", function() {
		runPassage("(set: $d to (datamap:'B',2))(set: $b to 3)(move: $b into $d's B)");
		expect("$b").markupToPrint("0");
		expect("(print:$d's B)").markupToPrint("3");
	});
	it("can remove datamap properties", function() {
		runPassage("(set: $d to (datamap:'A',2,'B',3))(move: $d's A into $b)");
		expect("$b").markupToPrint("2");
		expect("(print:$d's A)").markupToError();
	});
	describe("doesn't pollute past turns", function() {
		it("when replacing array properties", function() {
			runPassage("(set: $a to (a:0,1))(set: $b to 2)","one");
			runPassage("(move: $b into $a's last)(set: $b to 3)","two");
			runPassage("(move: $b into $a's last)(set: $b to 4)","three");
			Engine.goBack();
			expect("$b").markupToPrint("3");
			expect("(print:$a)").markupToPrint("0,2");
		});
		it("when removing array properties", function() {
			runPassage("(set: $a to (a:0,1,2))","one");
			runPassage("(move: $a's last into $b)","two");
			runPassage("(move: $a's last into $b)","three");
			Engine.goBack();
			expect("$b").markupToPrint("2");
			expect("(print:$a)").markupToPrint("0,1");
		});
		it("when inserting datamap properties", function() {
			runPassage("(set: $d to (datamap:))(set: $b to 3)","one");
			runPassage("(move: $b into $d's A)(set: $b to 2)","two");
			runPassage("(move: $b into $d's B)(set: $b to 1)","three");
			Engine.goBack();
			expect("$b").markupToPrint("2");
			expect("(print:$d's A)").markupToPrint("3");
			expect("(print:$d's B)").markupToError();
		});
		it("when replacing datamap properties", function() {
			runPassage("(set: $d to (datamap:'A',3))(set: $b to 2)","one");
			runPassage("(move: $b into $d's B)(set: $b to 1)","two");
			runPassage("(move: $b into $d's C)","three");
			Engine.goBack();
			expect("$b").markupToPrint("1");
			expect("(print:$d's B)").markupToPrint("2");
			expect("(print:$d's C)").markupToError();
		});
		it("when removing datamap properties", function() {
			runPassage("(set: $d to (datamap:'A',2,'B',3))","one");
			runPassage("(move: $d's A into $b)","two");
			runPassage("(move: $d's B into $b)","three");
			Engine.goBack();
			expect("$b").markupToPrint("2");
			expect("(print:$d's A)").markupToError();
			expect("(print:$d's B)").markupToPrint("3");
		});
	});
	it("can't mutate an unassigned collection", function() {
		expect("(move: 1 into (a:2)'s 1st)").markupToError();
		expect("(move: \"r\" into \"red\"'s 1st)").markupToError();
		expect("(move: 1 into (datamap:)'s 'E')").markupToError();
	});
});
