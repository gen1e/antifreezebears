describe("twinescript operators", function () {
	'use strict';
	describe("the + operator", function () {
		it("adds numbers", function (){
			expect("(print: 3 + 5)").markupToPrint("8");
		});
		it("can be unary", function (){
			expect("(print: + 5)").markupToPrint("5");
		});
		it("has correct precedence", function () {
			expect("(print: 3 + 5 * 2)").markupToPrint("13");
			expect("(print: 5 * 2 + 3)").markupToPrint("13");
		});
		it("can be used to concatenate strings", function () {
			expect("(print: '15' + '2')").markupToPrint("152");
		});
		it("can be used to concatenate arrays", function () {
			expect("(print: (a:1) + (a:2))").markupToPrint("1,2");
			expect("(print: (a:1,3) + (a:2,4))").markupToPrint("1,3,2,4");
		});
		it("can be used to concatenate datasets", function () {
			expect("(print: (ds:1) + (ds:2))").markupToPrint("1,2");
			expect("(print: (ds:1,4,3) + (ds:2,3,4))").markupToPrint("1,2,3,4");
		});
		it("compares objects by value when concatenating datasets", function() {
			runPassage("(set: $a to (a:))(set:$ds to (ds:))"
				+ "(set:$ds to it + (ds:$a))");
			expect("(print:$ds's length)").markupToPrint('1');
			runPassage("(set:$a2 to $a)"
				+ "(set:$ds to it + (ds:$a2))");
			expect("(print:$ds's length)").markupToPrint('1');
		});
		it("cannot concatenate hook references and strings", function () {
			expect("[]<a|(print: ?a + '2')").markupToError();
		});
	});
	describe("the - operator", function () {
		it("subtracts numbers", function (){
			expect("(print: 3 - 5)").markupToPrint("-2");
		});
		it("can be unary", function (){
			expect("(print: - 5)").markupToPrint("-5");
		});
		it("has correct precedence", function () {
			expect("(print: 3 - 5 * 2)").markupToPrint("-7");
			expect("(print: 5 * 2 - 3)").markupToPrint("7");
		});
		it("works correctly in the absence of surrounding whitespace", function () {
			expect("(print: 3-5*2)").markupToPrint("-7");
			expect("(print: 5*2-3)").markupToPrint("7");
		});
		it("can be used on strings", function () {
			expect("(print: '51' - '5')").markupToPrint("1");
			expect("(print: 'reeeed' - 'e')").markupToPrint("rd");
		});
		it("can't be used on booleans", function () {
			expect("(print: false - true)").markupToError("1");
		});
		it("can be used on arrays", function () {
			expect("(print: (a:1,3,5,3) - (a:3))").markupToPrint("1,5");
		});
		it("can be used on datasets", function () {
			expect("(print: (ds:1,3,5) - (ds:3))").markupToPrint("1,5");
		});
		it("compares objects by value when subtracting datasets", function() {
			expect("(set:$ds to (ds:(a:),(a:1)))"
				+ "(set:$ds to $ds - (ds:(a:)))").not.markupToError();
			expect("(print:$ds's length)").markupToPrint('1');
			expect("(set:$ds to it - (ds:(a:1)))").not.markupToError();
			expect("(print:$ds's length)").markupToPrint('0');
		});
		it("compares objects by value when subtracting arrays", function() {
			expect("(set:$a to (a:(a:),(a:1)))"
				+ "(set:$a to it - (a:(a:)))").not.markupToError();
			expect("(print:$a's length)").markupToPrint('1');
			expect("(set:$a to it - (a:(a:1)))").not.markupToError();
			expect("(print:$a's length)").markupToPrint('0');
		});
	});
	describe("the * operator", function () {
		it("multiplies numbers", function (){
			expect("(print: 3 * 5)").markupToPrint("15");
		});
		it("can't be used on other types", function () {
			expect("(print: '15' * '2')").markupToError();
			expect("(print: (a:2) * (a:2))").markupToError();
			expect("(print: true * true)").markupToError();
		});
	});
	describe("the / operator", function () {
		it("divides numbers", function (){
			expect("(print: 15 / 5)").markupToPrint("3");
		});
		it("can't be used on other types", function () {
			expect("(print: '15' / '2')").markupToError();
			expect("(print: (a:2) / (a:2))").markupToError();
			expect("(print: true / true)").markupToError();
		});
		it("can't divide by zero", function () {
			expect("(print: 15 / 0)").markupToError();
		});
	});
	describe("the % operator", function () {
		it("remainders numbers", function (){
			expect("(print: 31 % 10)").markupToPrint("1");
		});
		it("can't be used on other types", function () {
			expect("(print: '15' * '2')").markupToError();
			expect("(print: true * true)").markupToError();
			expect("(print: (a:2) * (a:2))").markupToError();
		});
		it("can't divide by zero", function (){
			expect("(print: 15 % 0)").markupToError();
		});
	});
	describe("the < operator", function () {
		it("performs 'less than' on two numbers", function (){
			expect("(print: 31 < 10)").markupToPrint("false");
			expect("(print: 1 < 10)").markupToPrint("true");
			expect("(print: -10 < 1)").markupToPrint("true");
			expect("(print: 1 < 1)").markupToPrint("false");
		});
		it("can't be used on other types", function () {
			expect("(print: '15' < '2')").markupToError();
			expect("(print: true < true)").markupToError();
			expect("(print: (a:2) < (a:2))").markupToError();
		});
		it("can also be written as 'is <'", function (){
			expect("(print: 31 is < 10)").markupToPrint("false");
			expect("(print: 1 is < 10)").markupToPrint("true");
			expect("(print: -10 is < 1)").markupToPrint("true");
			expect("(print: 1 is < 1)").markupToPrint("false");
		});
		it("can also be written as 'is not >='", function (){
			expect("(print: 31 is not >= 10)").markupToPrint("false");
			expect("(print: 1 is not >= 10)").markupToPrint("true");
			expect("(print: -10 is not >= 1)").markupToPrint("true");
			expect("(print: 1 is not >= 1)").markupToPrint("false");
		});
		it("has correct order of operations with 'to' and 'into'", function (){
			expect("(set: $a to 1 < 2)(print:$a)").markupToPrint("true");
			expect("(put: 1 < 2 into $a)(print:$a)").markupToPrint("true");
			expect("(set: $a to 4 < 3)(print:$a)").markupToPrint("false");
			expect("(put: 4 < 3 into $a)(print:$a)").markupToPrint("false");
		});
		it("can compare variables as the subject of 'to' and 'into'", function (){
			runPassage("(set:$a to 1)");
			expect("(set: $b to $a < $a)(print:$b)").markupToPrint("false");
			expect("(put: $a < $a into $b)(print:$b)").markupToPrint("false");
		});
	});
	describe("the > operator", function () {
		it("performs 'less than' on two numbers", function (){
			expect("(print: 31 > 10)").markupToPrint("true");
			expect("(print: 1 > 10)").markupToPrint("false");
			expect("(print: -10 > 1)").markupToPrint("false");
			expect("(print: 1 > 1)").markupToPrint("false");
		});
		it("can't be used on other types", function () {
			expect("(print: '15' > '2')").markupToError();
			expect("(print: true > true)").markupToError();
			expect("(print: (a:2) > (a:2))").markupToError();
		});
		it("can also be written as 'is >'", function (){
			expect("(print: 31 is > 10)").markupToPrint("true");
			expect("(print: 1 is > 10)").markupToPrint("false");
			expect("(print: -10 is > 1)").markupToPrint("false");
			expect("(print: 1 is > 1)").markupToPrint("false");
		});
		it("can also be written as 'is not <='", function (){
			expect("(print: 31 is not <= 10)").markupToPrint("true");
			expect("(print: 1 is not <= 10)").markupToPrint("false");
			expect("(print: -10 is not <= 1)").markupToPrint("false");
			expect("(print: 1 is not <= 1)").markupToPrint("false");
		});
		it("has correct order of operations with 'to' and 'into'", function (){
			expect("(set: $a to 1 > 2)(print:$a)").markupToPrint("false");
			expect("(put: 1 > 2 into $a)(print:$a)").markupToPrint("false");
			expect("(set: $a to 4 > 3)(print:$a)").markupToPrint("true");
			expect("(put: 4 > 3 into $a)(print:$a)").markupToPrint("true");
		});
		it("can compare variables as the subject of 'to' and 'into'", function (){
			runPassage("(set:$a to 1)");
			expect("(set: $b to $a > $a)(print:$b)").markupToPrint("false");
			expect("(put: $a > $a into $b)(print:$b)").markupToPrint("false");
		});
	});
	describe("the <= operator", function () {
		it("performs 'less than' on two numbers", function (){
			expect("(print: 31 <= 10)").markupToPrint("false");
			expect("(print: 1 <= 10)").markupToPrint("true");
			expect("(print: -10 <= 1)").markupToPrint("true");
			expect("(print: 1 <= 1)").markupToPrint("true");
		});
		it("can't be used on other types", function () {
			expect("(print: '15' <= '2')").markupToError();
			expect("(print: true <= true)").markupToError();
			expect("(print: (a:2) <= (a:2))").markupToError();
		});
		it("can also be written as 'is <'", function (){
			expect("(print: 31 is <= 10)").markupToPrint("false");
			expect("(print: 1 is <= 10)").markupToPrint("true");
			expect("(print: -10 is <= 1)").markupToPrint("true");
			expect("(print: 1 is <= 1)").markupToPrint("true");
		});
		it("can also be written as 'is not >'", function (){
			expect("(print: 31 is not > 10)").markupToPrint("false");
			expect("(print: 1 is not > 10)").markupToPrint("true");
			expect("(print: -10 is not > 1)").markupToPrint("true");
			expect("(print: 1 is not > 1)").markupToPrint("true");
		});
		it("has correct order of operations with 'to' and 'into'", function (){
			expect("(set: $a to 1 <= 2)(print:$a)").markupToPrint("true");
			expect("(put: 1 <= 2 into $a)(print:$a)").markupToPrint("true");
			expect("(set: $a to 4 <= 3)(print:$a)").markupToPrint("false");
			expect("(put: 4 <= 3 into $a)(print:$a)").markupToPrint("false");
		});
		it("can compare variables as the subject of 'to' and 'into'", function (){
			runPassage("(set:$a to 1)");
			expect("(set: $b to $a <= $a)(print:$b)").markupToPrint("true");
			expect("(put: $a <= $a into $b)(print:$b)").markupToPrint("true");
		});
	});
	describe("the >= operator", function () {
		it("performs 'less than' on two numbers", function (){
			expect("(print: 31 >= 10)").markupToPrint("true");
			expect("(print: 1 >= 10)").markupToPrint("false");
			expect("(print: -10 >= 1)").markupToPrint("false");
			expect("(print: 1 >= 1)").markupToPrint("true");
		});
		it("can't be used on other types", function () {
			expect("(print: '15' >= '2')").markupToError();
			expect("(print: true >= true)").markupToError();
			expect("(print: (a:2) >= (a:2))").markupToError();
		});
		it("can also be written as 'is >='", function (){
			expect("(print: 31 is >= 10)").markupToPrint("true");
			expect("(print: 1 is >= 10)").markupToPrint("false");
			expect("(print: -10 is >= 1)").markupToPrint("false");
			expect("(print: 1 is >= 1)").markupToPrint("true");
		});
		it("can also be written as 'is not <'", function (){
			expect("(print: 31 is not < 10)").markupToPrint("true");
			expect("(print: 1 is not < 10)").markupToPrint("false");
			expect("(print: -10 is not < 1)").markupToPrint("false");
			expect("(print: 1 is not < 1)").markupToPrint("true");
		});
		it("has correct order of operations with 'to' and 'into'", function (){
			expect("(set: $a to 1 >= 2)(print:$a)").markupToPrint("false");
			expect("(put: 1 >= 2 into $a)(print:$a)").markupToPrint("false");
			expect("(set: $a to 4 >= 3)(print:$a)").markupToPrint("true");
			expect("(put: 4 >= 3 into $a)(print:$a)").markupToPrint("true");
		});
		it("can compare variables as the subject of 'to' and 'into'", function (){
			runPassage("(set:$a to 1)");
			expect("(set: $b to $a >= $a)(print:$b)").markupToPrint("true");
			expect("(put: $a >= $a into $b)(print:$b)").markupToPrint("true");
		});
	});
	describe("the 'and' operator", function () {
		it("ANDs booleans", function (){
			expect("(print: true and true)").markupToPrint("true");
			expect("(print: true and false)").markupToPrint("false");
			expect("(print: false and true)").markupToPrint("false");
			expect("(print: false and false)").markupToPrint("false");
			expect("(print: true and true and true and true)").markupToPrint("true");
		});
		it("has correct precedence", function () {
			expect("(print: 2 is 2 and true)").markupToPrint("true");
		});
		it("can't be used on non-booleans", function () {
			expect("(print: true and 2)").markupToError();
			expect("(print: true and '2')").markupToError();
			expect("(print: true and (a:))").markupToError();
			expect("(print: true is (3 and 4))").markupToError();
		});
		it("can infer elided comparison operators", function () {
			expect("(print: 3 < 4 and 5)").markupToPrint("true");
			expect("(print: 3 and 4 < 5)").markupToPrint("true");
			expect("(print: 3 > 2 and 4)").markupToPrint("false");
			expect("(print: 3 and 5 < 5)").markupToPrint("false");
			expect("(print: 'a' is 'a' and 'a')").markupToPrint("true");
			expect("(print: 'ab' contains 'b' and 'a')").markupToPrint("true");
			expect("(print: 'b' is in 'ab' and 'bc')").markupToPrint("true");
			expect("(print: 'a' is 'a' and 'b')").markupToPrint("false");
			expect("(print: 'ab' contains 'c' and 'a')").markupToPrint("false");
			expect("(print: 'b' is in 'ac' and 'bc')").markupToPrint("false");
		});
		it("can infer multiple elisions", function () {
			expect("(print: 3 < 4 and 5 and 6)").markupToPrint("true");
			expect("(print: 3 and 4 and 2 < 5)").markupToPrint("true");
			expect("(print: 3 > 2 and 2 and 5)").markupToPrint("false");
			expect("(print: 3 and 3 and 6 < 5)").markupToPrint("false");
			expect("(print: 'a' is 'a' and 'a' and 'a')").markupToPrint("true");
			expect("(print: 'ab' contains 'b' and 'a' and 'ab')").markupToPrint("true");
			expect("(print: 'b' is in 'ab' and 'bc' and 'bd')").markupToPrint("true");
			expect("(print: 'a' is 'a' and 'b' and 'c')").markupToPrint("false");
			expect("(print: 'ab' contains 'c' and 'a' and 'b')").markupToPrint("false");
			expect("(print: 'b' is in 'ac' and 'bc' and 'dc')").markupToPrint("false");
			expect("(print: 3 < 4 and 5 and 6 and 7 and 8 and 9)").markupToPrint("true");
			expect("(print: 4 and 5 and 6 and 7 and 8 and 9 > 3)").markupToPrint("true");
		});
		it("won't infer ambiguous elisions", function() {
			expect("(print: 'a' is not 'b' and 'a')").markupToError();
			expect("(print: 'a' and 'b' is not 'c')").markupToError();
		});
		it("infers with correct precedence", function () {
			expect("(print: 2 is 1 + 1 and 2 * 1)").markupToPrint("true");
			expect("(print: 2 is (3 + 1) / 2 and 3 - 1)").markupToPrint("true");
		});
		it("doesn't infer elided comparison operators when a boolean is in the elision branch", function () {
			expect("(print: 2 < 3 and true)").markupToPrint("true");
		});
	});
	describe("the 'or' operator", function () {
		it("ORs booleans", function (){
			expect("(print: true or true)").markupToPrint("true");
			expect("(print: true or false)").markupToPrint("true");
			expect("(print: false or true)").markupToPrint("true");
			expect("(print: false or false)").markupToPrint("false");
			expect("(print: false or false or true or false)").markupToPrint("true");
		});
		it("has correct precedence", function () {
			expect("(print: 2 is 2 or false)").markupToPrint("true");
		});
		it("can't be used on non-booleans", function () {
			expect("(print: true or 2)").markupToError();
			expect("(print: true or '2')").markupToError();
			expect("(print: true or (a:))").markupToError();
			expect("(print: true is (3 or 4))").markupToError();
		});
		it("can infer elided comparison operators", function () {
			expect("(print: 3 < 4 or 2)").markupToPrint("true");
			expect("(print: 3 or 4 < 4)").markupToPrint("true");
			expect("(print: 3 > 5 or 4)").markupToPrint("false");
			expect("(print: 6 or 5 < 5)").markupToPrint("false");
			expect("(print: 'a' is 'a' or 'b')").markupToPrint("true");
			expect("(print: 'ab' contains 'b' or 'c')").markupToPrint("true");
			expect("(print: 'b' is in 'ac' or 'bc')").markupToPrint("true");
			expect("(print: 'a' is 'c' or 'b')").markupToPrint("false");
			expect("(print: 'ab' contains 'c' or 'd')").markupToPrint("false");
			expect("(print: 'b' is in 'ad' or 'cd')").markupToPrint("false");
		});
		it("can infer multiple elisions", function () {
			expect("(print: 3 < 4 or 2 or 1)").markupToPrint("true");
			expect("(print: 3 or 4 or 5 < 4)").markupToPrint("true");
			expect("(print: 3 > 5 or 4 or 6)").markupToPrint("false");
			expect("(print: 6 or 5 or 7 < 5)").markupToPrint("false");
			expect("(print: 'a' is 'c' or 'b' or 'a')").markupToPrint("true");
			expect("(print: 'ab' contains 'b' or 'c' or 'd')").markupToPrint("true");
			expect("(print: 'b' is in 'ac' or 'bc' or 'cd')").markupToPrint("true");
			expect("(print: 'a' is 'c' or 'b' or 'e')").markupToPrint("false");
			expect("(print: 'ab' contains 'e' or 'd' or 'c')").markupToPrint("false");
			expect("(print: 'b' is in 'ad' or 'cd')").markupToPrint("false");
			expect("(print: 3 < 1 or 0 or -1 or 2 or -2 or 4)").markupToPrint("true");
			expect("(print: 1 or 0 or -1 or 2 or -2 or 4 > 3)").markupToPrint("true");
		});
		it("won't infer ambiguous elisions", function() {
			expect("(print: 'a' is not 'b' or 'a')").markupToError();
			expect("(print: 'a' or 'b' or 'c' is not 'a')").markupToError();
		});
		it("infers with correct precedence", function () {
			expect("(print: 2 is 1 + 1 or 3 * 1)").markupToPrint("true");
			expect("(print: 2 is (3 + 2) / 2 or 3 - 1)").markupToPrint("true");
		});
		it("doesn't infer elided comparison operators when a boolean is in the elision branch", function () {
			expect("(print: 2 < 3 or false)").markupToPrint("true");
		});
	});
	describe("the 'not' operator", function () {
		it("performs unary NOT on booleans", function (){
			expect("(print: not true)").markupToPrint("false");
			expect("(print: not false)").markupToPrint("true");
			expect("(print: not not not false)").markupToPrint("true");
		});
		it("has correct precedence", function () {
			expect("(print: not true is false)").markupToPrint("true");
		});
		it("can't be used on non-booleans", function () {
			expect("(print: not 2)").markupToError();
			expect("(print: not '2')").markupToError();
			expect("(print: not (a:))").markupToError();
		});
	});
	describe("the 'is' operator", function () {
		it("compares primitives by value", function (){
			expect("(print: 2 is 2)").markupToPrint("true");
			expect("(print: '2' is '2')").markupToPrint("true");
			expect("(print: true is true)").markupToPrint("true");
			expect("(print: 2 is 1)").markupToPrint("false");
			expect("(print: '3' is '2')").markupToPrint("false");
			expect("(print: true is false)").markupToPrint("false");
		});
		it("doesn't coerce values", function (){
			expect("(print: 2 is '2')").markupToPrint("false");
			expect("(print: 1 is true)").markupToPrint("false");
		});
		it("can be used as an expression", function (){
			expect("(print: 2 is '2' is true)").markupToPrint("false");
			expect("(print: 1 is true is false)").markupToPrint("false");
		});
		it("compares arrays by value and order", function (){
			expect("(print: (a:) is (a:))").markupToPrint("true");
			expect("(print: (a:2,3,4) is (a:2,3,4))").markupToPrint("true");
			expect("(print: (a:2,3,4) is (a:2,3,5))").markupToPrint("false");
			expect("(print: (a:2,3,4) is (a:2,4,3))").markupToPrint("false");
			expect("(print: (a:(a:)) is (a:(a:)))").markupToPrint("true");
		});
		it("compares datamaps by value", function (){
			expect("(print: (datamap:) is (datamap:))").markupToPrint("true");
			expect("(print: (datamap:'a',2,'b',4) is (datamap:'b',4,'a',2))").markupToPrint("true");
			expect("(print: (datamap:) is (datamap:1,2))").markupToPrint("false");
			expect("(print: (datamap:'a',2,'b',4) is (datamap:'b',4,'a',3))").markupToPrint("false");
		});
		it("compares datasets by value", function (){
			expect("(print: (dataset:) is (dataset:))").markupToPrint("true");
			expect("(print: (dataset:2,3,4) is (dataset:2,3,4))").markupToPrint("true");
			expect("(print: (dataset:2,3,4) is (dataset:2,3,4,5))").markupToPrint("false");
		});
		it("compares hooksets by selectors and properties", function (){
			expect("(print: ?red is ?red)").markupToPrint("true");
			expect("(print: ?red is ?blue)").markupToPrint("false");
			expect("(print: ?red's 1st is ?red's 1st)").markupToPrint("true");
			expect("(print: ?red is ?red's 1st)").markupToPrint("false");
			expect("(print: ?red's (a:1,3,5) is ?red's (a:1,3,5))").markupToPrint("true");
			expect("(print: ?red's (a:1,3,5) is ?red's (a:3,5,1))").markupToPrint("false");
			expect("(print: ?red's (a:1,3,5) is ?red's (a:1,2,3,5))").markupToPrint("false");
			expect("(print: ?red's 1st + ?blue's 2nd is ?red's 1st + ?blue's 2nd)").markupToPrint("true");
			expect("(print: ?red + ?blue is ?blue + ?red)").markupToPrint("true");
		});
		it("won't be matched from within text", function (){
			expect("(print: typeof xxisxx)").markupToPrint("undefined");
		});
	});
	describe("the 'is not' operator", function () {
		it("compares primitives by value", function (){
			expect("(print: 2 is not 2)").markupToPrint("false");
			expect("(print: '2' is not '2')").markupToPrint("false");
			expect("(print: true is not true)").markupToPrint("false");
			expect("(print: 2 is not 1)").markupToPrint("true");
			expect("(print: '3' is not '2')").markupToPrint("true");
			expect("(print: true is not false)").markupToPrint("true");
		});
		it("doesn't coerce values", function (){
			expect("(print: 2 is not '2')").markupToPrint("true");
			expect("(print: 1 is not true)").markupToPrint("true");
		});
		it("can be used as an expression", function (){
			expect("(print: 2 is not '2' is not true)").markupToPrint("true");
			expect("(print: true is not true is not false)").markupToPrint("false");
		});
		it("compares arrays by value and order", function (){
			expect("(print: (a:) is not (a:))").markupToPrint("false");
			expect("(print: (a:2,3,4) is not (a:2,3,4))").markupToPrint("false");
			expect("(print: (a:2,3,4) is not (a:2,3,5))").markupToPrint("true");
			expect("(print: (a:2,3,4) is not (a:2,4,3))").markupToPrint("true");
			expect("(print: (a:(a:)) is not (a:(a:)))").markupToPrint("false");
		});
		it("compares datamaps by value", function (){
			expect("(print: (datamap:) is not (datamap:))").markupToPrint("false");
			expect("(print: (datamap:'a',2,'b',4) is not (datamap:'b',4,'a',2))").markupToPrint("false");
			expect("(print: (datamap:) is not (datamap:1,2))").markupToPrint("true");
			expect("(print: (datamap:'a',2,'b',4) is not (datamap:'b',4,'a',3))").markupToPrint("true");
		});
		it("compares datasets by value", function (){
			expect("(print: (dataset:) is not (dataset:))").markupToPrint("false");
			expect("(print: (dataset:2,3,4) is not (dataset:2,3,4))").markupToPrint("false");
			expect("(print: (dataset:2,3,4) is not (dataset:2,3,4,5))").markupToPrint("true");
		});
		it("won't be matched from within text", function (){
			expect("(print: typeof xxisxx)").markupToPrint("undefined");
		});
	});
	describe("the 'contains' operator", function () {
		it("errors when used on non-string primitives", function() {
			expect("(print: 1 contains 1)").markupToError();
			expect("(print: true contains true)").markupToError();
			expect("(set: $a to 0)(print: $a contains 1)").markupToError();
			expect("(set: $a to true)(print: $a contains true)").markupToError();
		});
		it("checks for substrings in strings", function (){
			expect("(print: 'Bee' contains 'Be')").markupToPrint("true");
			expect("(print: 'Bee' contains 'Bee')").markupToPrint("true");
			expect("(print: 'Bee' contains 'eeB')").markupToPrint("false");
		});
		it("checks for elements in arrays", function (){
			expect("(print: (a:'Bee') contains 'Bee')").markupToPrint("true");
			expect("(print: (a: 2) contains 2)").markupToPrint("true");
			expect("(print: (a:'Bee') contains 'eeB')").markupToPrint("false");
		});
		it("checks for keys in datamaps", function (){
			expect("(print: (datamap:'Bee',1) contains 'Bee')").markupToPrint("true");
			expect("(print: (datamap:'Bee',1) contains 1)").markupToPrint("false");
		});
		it("checks for elements in datasets", function (){
			expect("(print: (dataset:'Bee','Boo') contains 'Bee')").markupToPrint("true");
			expect("(print: (dataset:'Bee','Boo') contains 'ooB')").markupToPrint("false");
		});
		it("can be used as an expression", function (){
			expect("(print: 'Bee' contains 'Be' is true)").markupToPrint("true");
			expect("(print: 'Bee' contains 'eeB' is false)").markupToPrint("true");
		});
		it("compares nested arrays by value", function (){
			expect("(print: (a:(a:)) contains (a:))").markupToPrint("true");
			expect("(print: (a:(a:2,3,4)) contains (a:2,3,4))").markupToPrint("true");
		});
		it("compares nested datamaps by value", function (){
			expect("(print: (a:(datamap:)) contains (datamap:))").markupToPrint("true");
			expect("(print: (a:(datamap:'a',2,'b',4)) contains (datamap:'b',4,'a',2))").markupToPrint("true");
		});
		it("compares nested datasets by value", function (){
			expect("(print: (a:(dataset:)) contains (dataset:))").markupToPrint("true");
			expect("(print: (a:(dataset:2,3,4)) contains (dataset:2,3,4))").markupToPrint("true");
		});
		it("won't be matched from within text", function (){
			expect("(print: typeof xxcontainsxx)").markupToPrint("undefined");
		});
		it("has correct order of operations with 'to' and 'into'", function (){
			expect("(set: $a to 'a' contains 'b')(print:$a)").markupToPrint("false");
			expect("(put: 'a' contains 'b' into $a)(print:$a)").markupToPrint("false");
			expect("(set: $a to 'bc' contains 'b')(print:$a)").markupToPrint("true");
			expect("(put: 'bc' contains 'b' into $a)(print:$a)").markupToPrint("true");
		});
		it("can compare variables as the subject of 'to' and 'into'", function (){
			runPassage("(set:$a to 'a')");
			expect("(set: $b to $a contains $a)(print:$b)").markupToPrint("true");
			expect("(put: $a contains $a into $b)(print:$b)").markupToPrint("true");
		});
	});
	describe("the 'is in' operator", function () {
		it("errors when used on non-string primitives", function() {
			expect("(print: 1 is in 1)").markupToError();
			expect("(print: true is in true)").markupToError();
			expect("(set: $a to 0)(print: $a is in 1)").markupToError();
			expect("(set: $a to true)(print: $a is in true)").markupToError();
		});
		it("checks for substrings in strings", function (){
			expect("(print: 'Be' is in 'Bee')").markupToPrint("true");
			expect("(print: 'Bee' is in 'Bee')").markupToPrint("true");
			expect("(print: 'Bee' is in 'eeB')").markupToPrint("false");
		});
		it("checks for elements in arrays", function (){
			expect("(print: 'Bee' is in (a:'Bee'))").markupToPrint("true");
			expect("(print: 2 is in (a: 2))").markupToPrint("true");
			expect("(print: 'eeB' is in (a:'Bee'))").markupToPrint("false");
		});
		it("checks for keys in datamaps", function (){
			expect("(print: (datamap:'Bee',1) contains 'Bee')").markupToPrint("true");
			expect("(print: (datamap:'Bee',1) contains 1)").markupToPrint("false");
		});
		it("checks for elements in datasets", function (){
			expect("(print: 'Bee' is in (dataset:'Bee','Boo'))").markupToPrint("true");
			expect("(print: 'ooB' is in (dataset:'Bee','Boo'))").markupToPrint("false");
		});
		it("can be used as an expression", function (){
			expect("(print: true is 'Be' is in 'Bee')").markupToPrint("true");
			expect("(print: false is 'Bee' is in 'eeB')").markupToPrint("true");
		});
		it("compares nested arrays by value", function (){
			expect("(print: (a:) is in (a:(a:)))").markupToPrint("true");
			expect("(print: (a:2,3,4) is in (a:(a:2,3,4)))").markupToPrint("true");
		});
		it("compares nested datamaps by value", function (){
			expect("(print: (datamap:) is in (a:(datamap:)))").markupToPrint("true");
			expect("(print: (datamap:'b',4,'a',2) is in (a:(datamap:'a',2,'b',4)))").markupToPrint("true");
		});
		it("compares nested datasets by value", function (){
			expect("(print: (dataset:) is in (a:(dataset:)))").markupToPrint("true");
			expect("(print: (dataset:2,3,4) is in (a:(dataset:2,3,4)))").markupToPrint("true");
		});
		it("won't be matched from within text", function (){
			expect("(print: typeof xxis in Object)").markupToPrint("false");
		});
		it("has correct order of operations with 'to' and 'into'", function (){
			expect("(set: $a to 'a' is in 'b')(print:$a)").markupToPrint("false");
			expect("(put: 'a' is in 'b' into $a)(print:$a)").markupToPrint("false");
			expect("(set: $a to 'b' contains 'bc')(print:$a)").markupToPrint("false");
			expect("(put: 'b' is in 'bc' into $a)(print:$a)").markupToPrint("true");
		});
		it("can compare variables as the subject of 'to' and 'into'", function (){
			runPassage("(set:$a to 'a')");
			expect("(set: $b to $a is in $a)(print:$b)").markupToPrint("true");
			expect("(put: $a is in $a into $b)(print:$b)").markupToPrint("true");
		});
	});
	describe("the '...' operator", function () {
		it("spreads strings into positional macro arguments, as characters", function (){
			expect("(a: ...'ABC')").markupToPrint("A,B,C");
		});
		it("spreads arrays into positional macro arguments, as elements", function (){
			expect("(a: ...(a:1,2,'ABC'))").markupToPrint("1,2,ABC");
		});
		it("spreads datasets into positional macro arguments, as elements", function (){
			expect("(print: (a: ...(dataset:1,2,2,'ABC'))'s last)").markupToPrint("ABC");
		});
		it("fails for non-sequential data types", function (){
			expect("(a: ...1)").markupToError();
			expect("(a: ...true)").markupToError();
			expect("(a: ...(datamap:1,'A'))").markupToError();
			expect("|a>[1]|a>[1](replace: ...?a)[2]").markupToError();
		});
		it("works with variables", function (){
			expect("(set:$a to (a:1,2,3))(a: ...$a)").markupToPrint("1,2,3");
		});
		it("works with other positional arguments", function (){
			expect("(a: 1, ...(a:2,3))").markupToPrint("1,2,3");
			expect("(a: ...(a:1, 2),3)").markupToPrint("1,2,3");
			expect("(a: 1, ...(a:2),3)").markupToPrint("1,2,3");
		});
	});
	it("common incorrect operators produce an error", function () {
		["=>","=<","gte","lte","gt","lt","eq","isnot","neq","are","x"].forEach(function(op){
			expect("(print:1 " + op + " 2)").markupToError();
		});
	});
});
