describe("collapsing whitespace syntax", function() {
	'use strict';
	
	it("eliminates runs of whitespace between { and }", function() {
		expect(
			"A{   \n   }B"
		).markupToPrint(
			"AB"
		);
	});
	it("produces a <tw-collapsed> element", function() {
		expect(
			"{A}"
		).markupToBecome(
			"<tw-collapsed>A</tw-collapsed>"
		);
	});
	it("works on whitespace enclosed in elements", function() {
		expect(
			"A{ '' '' // // }B"
		).markupToPrint(
			"AB"
		);
	});
	it("reduces whitespace between non-whitespace to single spaces", function() {
		expect(
			"A { A  \n  B } B"
		).markupToPrint(
			"A A B B"
		);
		expect(
			"A{ C }B"
		).markupToPrint(
			"ACB"
		);
	});
	it("leaves other syntax as is", function() {
		var p = runPassage("{   ''A ''   } B");
		expect(p.text()).toBe("A B");
		expect(p.find('b').length).toBe(1);
		
		expect(
			"{A '' B''}"
		).markupToPrint(
			"A B"
		);
		expect(
			"{''B '' C}"
		).markupToPrint(
			"B C"
		);
	});
	it("leaves raw HTML <br> tags as is", function() {
		var p = runPassage("{\nA<br>\n<br>B\n}");
		expect(p.find('br').length).toBe(2);
	});
	it("collapses runs of whitespace between non-whitespace down to a single space", function() {
		expect(
			"{   A   B   }"
		).markupToPrint(
			"A B"
		);
		expect(
			"{   A B   }"
		).markupToPrint(
			"A B"
		);
		expect(
			"X{   A   B   }Y"
		).markupToPrint(
			"XA BY"
		);
		expect(
			"G{   A  }{ B   }H"
		).markupToPrint(
			"GA BH"
		);
	});
	it("can be nested", function() {
		expect(
			"{{   ''A''   }}  B  C"
		).markupToPrint(
			"A  B  C"
		);
		expect(
			"{  A {   ''B''   }} C"
		).markupToPrint(
			"A B C"
		);
	});
	it("can collapse spaces in empty elements", function() {
		expect(
			"{A '' '' B}"
		).markupToPrint(
			"A B"
		);
	});
	it("collapses through invisible expressions", function() {
		expect(
			"{ (set: $r to 1)\n(set: $r to 2) }"
		).markupToPrint(
			""
		);
		expect(
			"{A(set: $r to 1)B}"
		).markupToPrint(
			"AB"
		);
	});
	it("works with expressions", function() {
		expect("(set: $a to '')(set: $b to 'B'){A  $a $b $a C}").markupToPrint("A B C");
		expect("(set: $a to '')(set: $b to 'B')A{ $a $b $a }C").markupToPrint("ABC");
		expect("A{ (print:'') (print:'B') (print:'') }C").markupToPrint("ABC");
	});
	it("works inside (display:)", function() {
		createPassage("{B\nC}", "grault");
		expect(runPassage("A\n(display:'grault')").find('tw-expression br').length).toBe(0);
	});
	it("won't affect text inside HTML tags", function() {
		var p = runPassage("{<span title='   '> </span>}");
		expect(p.find('span').attr('title')).toBe("   ");
		expect(p.text()).toBe("");
	});
	it("won't affect text inside macros", function() {
		expect("{(print:'Red   Blue''s length)}").markupToPrint("10");
	});
	it("won't affect text outputted by expressions", function() {
		expect("{(set: $a to 'Red   Blue')(print:$a)}").markupToPrint("Red   Blue");
	});
	it("won't affect text outputted by (display:)", function() {
		createPassage("B\nC", "grault");
		expect(runPassage("A\n{(display:'grault')}").find('tw-expression br').length).toBe(1);
	});
	it("...unless the (display:)ed text itself contains the syntax", function() {
		createPassage("{B\nC}", "grault");
		expect(runPassage("A\n{(display:'grault')}").find('tw-expression br').length).toBe(0);
	});
	it("won't affect text inside verbatim guards", function() {
		var p = runPassage("{   `   `   }");
		expect(p.text()).toBe("   ");
		p = runPassage("{   `  A C  `   }");
		expect(p.text()).toBe("  A C  ");
		p = runPassage("{A`   `B}");
		expect(p.text()).toBe("A   B");
		p = runPassage("{A `   ` B}");
		expect(p.text()).toBe("A     B");
	});
	it("will affect text inside nested hooks", function() {
		expect("{ A(if:true)[      ]B }").markupToPrint("A B");
		expect("{ X(if:false)[      ]Y }").markupToPrint("XY");
		expect("{ C (if:true)[    ] D }").markupToPrint("C D");
		expect("{ E (if:true)[  F  ] G }").markupToPrint("E F G");
		expect("{ H (if:true)[  I  J ] K }").markupToPrint("H I J K");
	});
	it("doesn't needlessly eliminate preceding and trailing spaces in nested hooks", function() {
		expect(
			"{A[ A]<1| [B ]<1|B}"
		).markupToPrint(
			"A A B B"
		);
		expect(
			"{E['' ''E]<1| [B'' '']<1|B}"
		).markupToPrint(
			"E E B B"
		);
		expect(
			"{''C''[ ''C'']<1| [''D'' ]<1|''D''}"
		).markupToPrint(
			"C C D D"
		);
		expect(
			"{E [ E]<1| [F ]<1| F}"
		).markupToPrint(
			"E E F F"
		);
		expect(
			"{''G'' [ ''G'']<1| [''H'' ]<1| ''H''}"
		).markupToPrint(
			"G G H H"
		);
		expect(
			"{I'' ''['' ''I]<1| [J'' '']<1|'' ''J}"
		).markupToPrint(
			"I I J J"
		);
	});
	it("works with (replace:) inserting text across collapsed regions", function() {
		expect("{[]<1|(replace:?1)[Good     golly!]}").markupToPrint("Good golly!");
		expect("{[]<1|}{(replace:?1)[Good     golly!]}").markupToPrint("Good golly!");
	});
	it("works with (replace:) inserting text into and out of collapsed regions", function() {
		expect("{[]<1|}(replace:?1)[Good     golly!]").markupToPrint("Good     golly!");
		expect("[]<2|{(replace:?2)[Good     golly!]}").markupToPrint("Good golly!");
		expect("(replace:?1)[Good     golly?]{[]<1|}").markupToPrint("Good     golly?");
		expect("{(replace:?2)[Good     golly?]}[]<2|").markupToPrint("Good golly?");
	});
	it("works with links in nested hooks", function() {
		expect("{A[ [[B]]]<1|}").markupToPrint("A B");
		expect("{[[[D]] ]<1|C}").markupToPrint("D C");
		expect("{E[ [[F]] ]<1|G}").markupToPrint("E F G");
	});
	it("will not affect text inside verbatim guards inside nested hooks", function() {
		var p = runPassage("{ A (if:true)[`    `] B }");
		expect(p.text()).toBe("A      B");
		p = runPassage("{ C (if:true)[ ` `B` ` ] D }");
		expect(p.text()).toBe("C  B  D");
	});
	it("works even when empty", function() {
		expect("A{}B").markupToPrint("AB");
	});
});
