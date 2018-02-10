describe("twinescript literals", function() {
	'use strict';
	describe("numbers", function() {
		it("can consist of positive and negative integers", function() {
			expect("(print: 1234567890)").markupToPrint("1234567890");
			expect("(print: -1234567890)").markupToPrint("-1234567890");
			expect("(print: 00012)").markupToPrint("12");
			expect("(print: -00012)").markupToPrint("-12");
		});
		it("can consist of decimal fractions (with leading 0s omitted)", function() {
			expect("(print: .120)").markupToPrint("0.12");
			expect("(print: -.120)").markupToPrint("-0.12");
			expect("(print: 00.120)").markupToPrint("0.12");
			expect("(print: -00.120)").markupToPrint("-0.12");
			expect("(print: 1.000)").markupToPrint("1");
			expect("(print: -1.000)").markupToPrint("-1");
		});
		it("can consist of scientific notation", function() {
			expect("(print: 1e3)").markupToPrint("1000");
			expect("(print: 01e03)").markupToPrint("1000");
			expect("(print: 1e-03)").markupToPrint("0.001");
			expect("(print: 1.1e03)").markupToPrint("1100");
			expect("(print: 1.1e-03)").markupToPrint("0.0011");
		});
		it("can consist of CSS time values", function() {
			expect("(print: 0s)").markupToPrint("0");
			expect("(print: 0ms)").markupToPrint("0");
			expect("(print: 1ms)").markupToPrint("1");
			expect("(print: 1s)").markupToPrint("1000");
			expect("(print: 10ms)").markupToPrint("10");
			expect("(print: 10s)").markupToPrint("10000");
			expect("(print: 1.7ms)").markupToPrint("1.7");
			expect("(print: 1.7s)").markupToPrint("1700");
			expect("(print: -5ms)").markupToPrint("-5");
			expect("(print: -5s)").markupToPrint("-5000");
			expect("(print: 5 ms)").markupToJSError();
			expect("(print: 5 s)").markupToJSError();
		});
	});
	describe("booleans", function() {
		it("consist of true or false, in lowercase", function() {
			expect("(print: true)").markupToPrint("true");
			expect("(print: false)").markupToPrint("false");
			expect("(print: True)").markupToJSError();
			expect("(print: False)").markupToJSError();
		});
	});
	describe("strings", function() {
		it("can consist of zero or more characters enclosed in single-quotes", function() {
			expect("(print: 'Red')").markupToPrint("Red");
			expect("A(print: '')B").markupToPrint("AB");
		});
		it("can consist of zero or more characters enclosed in double-quotes", function() {
			expect('(print: "Red")').markupToPrint("Red");
			expect('A(print: "")B').markupToPrint("AB");
		});
		it("can contain line breaks", function() {
			expect('(print: "A\nB")').markupToPrint("A\nB");
			expect("(print: 'A\nB')").markupToPrint("A\nB");
		});
		it("can contain C-style backslash escapes", function() {
			expect('(print: "A\\B")').markupToPrint("AB");
			expect("(print: 'A\\B')").markupToPrint("AB");
			expect('(print: "A\\"B")').markupToPrint("A\"B");
			expect("(print: 'A\\'B')").markupToPrint("A'B");
		});
	});
	function expectColourToBe(str, colour) {
		expect(runPassage("(print:" + str + ")").find('tw-colour')).toHaveBackgroundColour(colour);
	}
	describe("RGB colours", function() {
		it("can consist of three case-insensitive hexadecimal digits preceded by #", function() {
			expectColourToBe("#000", "#000000");
			expectColourToBe("#103", "#110033");
			expectColourToBe("#fAb", "#FFAABB");
			expect("(print: #g00)").markupToJSError();
		});
		it("can consist of six case-insensitive hexadecimal digits preceded by #", function() {
			expectColourToBe("#000000", "#000000");
			expectColourToBe("#100009", "#100009");
			expectColourToBe("#abcDEf", "#ABCDEF");
			expect("(print: #bcdefg)").markupToJSError();
		});
		it("can only be six or three digits long", function() {
			expect("(print: #12)").markupToJSError();
			expect("(print: #1234)").markupToJSError();
			expect("(print: #12345)").markupToJSError();
			expect("(print: #1234567)").markupToJSError();
		});
	});
	describe("Harlowe colours", function() {
		it("consist of special case-insensitive keywords", function() {
			/*
				This should be the same mapping as in markup/markup.js
			*/
			var mapping = {
				"red"    : "e61919",
				"orange" : "e68019",
				"yellow" : "e5e619",
				"lime"   : "80e619",
				"green"  : "19e619",
				"cyan"   : "19e5e6",
				"aqua"   : "19e5e6",
				"blue"   : "197fe6",
				"navy"   : "1919e6",
				"purple" : "7f19e6",
				"fuchsia": "e619e5",
				"magenta": "e619e5",
				"white"  : "ffffff",
				"black"  : "000000",
				"gray"   : "888888",
				"grey"   : "888888",
			};
			Object.keys(mapping).forEach(function(colour) {
				expectColourToBe(colour, "#" + mapping[colour]);
				expectColourToBe(colour.toUpperCase(), "#" + mapping[colour]);
			});
		});
		it("can contain close-brackets", function() {
			expect('(print: ")")').markupToPrint(")");
		});
	});
});
