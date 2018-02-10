describe("primitive value macros", function() {
	'use strict';
	describe("the (number:) macro", function() {
		it("accepts exactly 1 string argument", function() {
			expect("(number:)").markupToError();
			expect("(number:'1')").markupToPrint('1');
			expect("(number:'1','1')").markupToError();
		});
		it("converts string arguments to a number", function() {
			expect("(number: '2.' + '5')").markupToPrint("2.5");
		});
		it("shows an error if it does not succeed", function() {
			expect("(number: 'Dogs')").markupToError();
		});
		it("is aliased as (num:)", function() {
			expect("(num: '2')").markupToPrint("2");
		});
	});
	describe("the (text:) macro", function() {
		it("accepts 0 or more arguments of any primitive type", function() {
			["1", "'X'", "true"].forEach(function(e) {
				for(var i = 0; i < 10; i += 1) {
					expect("(text:" + (e + ",").repeat(i) + ")").not.markupToError();
				}
			});
			expect("|a>[](text: ?a)").markupToError();
		});
		it("converts number arguments to a string", function() {
			expect("(text: 2)").markupToPrint("2");
		});
		it("converts boolean arguments to a string", function() {
			expect("(text: 3 is 4)").markupToPrint("false");
		});
		it("joins string arguments", function() {
			expect("(text: 'gar', 'ply')").markupToPrint("garply");
		});
		it("refuses object arguments", function() {
			expect("(text: (text-style:'shadow'))").markupToError();
			expect("(text: (datamap:))").markupToError();
		});
		it("is aliased as (string:)", function() {
			expect("(string: 2)").markupToPrint("2");
		});
	});
	describe("the (random:) macro", function() {
		it("accepts 1 or 2 whole numbers", function() {
			expect("(random:)").markupToError();
			["0.1", "'X'", "true"].forEach(function(e) {
				expect("(random:" + e + ")").markupToError();
				expect("(random:" + e + ",1)").markupToError();
				expect("(random:1," + e + ")").markupToError();
			});
			expect("(random:1,1,1)").markupToError();
			expect("(random:1,1)").not.markupToError();
			expect("(random:1)").not.markupToError();
		});
		it("returns a random number between each value, inclusive", function() {
			for(var j = 0; j < 5; j += 1) {
				for(var k = 1; k < 6; k += 1) {
					var val = +runPassage("(random:" + j + "," + k + ")").text();
					expect(val).not.toBeLessThan(Math.min(j,k));
					expect(val).not.toBeGreaterThan(Math.max(j,k));
				}
			}
		});
	});
	describe("the maths macros", function() {
		[
			["min","(min: 2, -5, 2, 7, 0.1)",       "-5"],
			["max","(max: 2, -5, 2, 7, 0.1)",        "7"],
			["abs","(abs: -4)",                      "4"],
			["sign","(sign: -4)",                   "-1"],
			["sin","(sin: 3.14159265 / 2)",          "1"],
			["cos","(cos: 3.14159265)",             "-1"],
			["tan","(round:(tan: 3.14159265 / 4))",  "1"],
			["floor","(floor: 1.99)",                "1"],
			["round","(round: 1.5)",                 "2"],
			["ceil","(ceil: 1.1)",                   "2"],
			["pow","(pow: 2, 8)",                  "256"],
			["exp","(round:(exp: 6))",             "403"],
			["sqrt","(sqrt: 25)",                    "5"],
			["log","(log: (exp:5))",                 "5"],
			["log10","(log10: 100)",                 "2"],
			["log2","(log2: 256)",                   "8"],
		].forEach(function(p){
			var name = p[0], code = p[1], res = p[2];
			it("(" + name + ":) produces values as documented", function() {
				expect("(print: " + code + " + 0)").markupToPrint(res);
			});
		});
	});
	describe("the (substring:) macro", function() {
		it("accepts 1 string argument, then two number arguments", function() {
			expect("(substring:)").markupToError();
			expect("(substring: '1')").markupToError();
			expect("(substring: 'red', 1.1, 2)").markupToError();
			expect("(substring: 'red', 1, 2)").markupToPrint('re');
		});
		it("returns the substring specified by the two 1-indexed start and end indices", function() {
			expect("(substring: 'garply', 2, 4)").markupToPrint("arp");
		});
		it("reverses the indices if the second exceeds the first", function() {
			expect("(substring: 'garply', 4, 2)").markupToPrint("arp");
		});
		it("accepts negative indices", function() {
			expect("(substring: 'garply', 2, -1)").markupToPrint("arply");
			expect("(substring: 'garply', -2, 1)").markupToPrint("garpl");
			expect("(substring: 'garply', -1, -3)").markupToPrint("ply");
		});
		it("refuses zero and NaN indices", function() {
			expect("(substring: 'garply', 0, 2)").markupToError();
			expect("(substring: 'garply', 2, NaN)").markupToError();
		});
	});
	['lower','upper'].forEach(function(level, i) {
		describe("the (" + level + "case:) macro", function() {
			it("accepts 1 string argument", function() {
				expect("(" + level + "case:)").markupToError();
				expect("(" + level + "case: 1)").markupToError();
				expect("(" + level + "case: 'a')").not.markupToError();
				expect("(" + level + "case: 'red', 'blue')").markupToError();
			});
			it("returns the " + level + "case version of the string", function() {
				expect("(" + level + "case: '𐌎mêlÉE')").markupToPrint(i === 0 ? "𐌎mêlée" : "𐌎MÊLÉE");
			});
		});
		describe("the (" + level + "first:) macro", function() {
			it("accepts 1 string argument", function() {
				expect("(" + level + "first:)").markupToError();
				expect("(" + level + "first: 1)").markupToError();
				expect("(" + level + "first: 'a')").not.markupToError();
				expect("(" + level + "first: 'red', 'blue')").markupToError();
			});
			it("returns the string with the first non-whitespace character in " + level + "case", function() {
				expect("(" + level + "first: ' mell')").markupToPrint(i === 0 ? " mell" : " Mell");
				expect("(" + level + "first: ' Mell')").markupToPrint(i === 0 ? " mell" : " Mell");
			});
			it("doesn't affect strings whose first non-whitespace character is uncased", function() {
				expect("(" + level + "first: '2d')(" + level + "first: '𐌎d')").markupToPrint("2d𐌎d");
				expect("(" + level + "first: ' 2d')(" + level + "first: ' 𐌎d')").markupToPrint(" 2d 𐌎d");
			});
		});
	});
	describe("the (words:) macro", function() {
		it("accepts 1 string argument", function() {
			expect("(words:)").markupToError();
			expect("(words: 1)").markupToError();
			expect("(words: 'a')").not.markupToError();
			expect("(words: 'red', 'blue')").markupToError();
		});
		it("returns an array of words in the string, split by whitespace", function() {
			expect("(words: ' good  -gre𐌎t\n\texcellent: ')").markupToPrint("good,-gre𐌎t,excellent:");
		});
		it("returns a blank array if the string contains only whitespace", function() {
			expect("(print: (words: ' \n\t')'s length)").markupToPrint("0");
		});
		it("returns an array containing the original string, if the string contains no whitespace", function() {
			expect("(print: (words: 'Golly')'s 1st is 'Golly')").markupToPrint('true');
		});
	});
});
