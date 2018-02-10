describe("basic command macros", function() {
	'use strict';
	
	describe("the (print:) macro", function() {
		it("requires exactly 1 argument of any type", function() {
			expect("(print:)").markupToError();
			expect("(print:1,2)").markupToError();
		});
		it("prints the text equivalent of number expressions", function() {
			expect("(print:2+0)").markupToPrint("2");
		});
		it("prints the text equivalent of string expressions", function() {
			expect("(print: 'gar' + 'ply')").markupToPrint("garply");
		});
		it("prints twinemarkup in strings", function() {
			var expr = runPassage("(print: '//gar' + 'ply//')").find('tw-expression');

			expect(expr.text()).toBe("garply");
			expect(expr.children().is('i')).toBe(true);
		});
		it("prints the text equivalent of boolean expressions", function() {
			expect("(print: true)").markupToPrint("true");
		});
		it("prints the text equivalent of arrays", function() {
			expect("(print: (a: 2,4))").markupToPrint("2,4");
			expect("(print: (a: (a:2,4)))").markupToPrint("2,4");
		});
		it("prints the text equivalent of datasets", function() {
			expect("(print: (dataset: 2,4))").markupToPrint("2,4");
			expect("(print: (dataset: (dataset:2,4)))").markupToPrint("2,4");
		});
		it("can be run with (print:)", function() {
			expect("(print:(print:'Golly molly'))").markupToPrint("Golly molly");
		});
		it("evaluates to a command object that can't be +'d", function() {
			expect("(print: (print:1) + (print:1))").markupToError();
		});
		it("commands inside (print:) aren't executed until it is executed", function() {
			spyOn(window,'open');
			runPassage("(set: $x to (print:(open-url:'http://example.org')))");
			expect(window.open).not.toHaveBeenCalled();
			runPassage("$x");
			expect(window.open).toHaveBeenCalledWith('http://example.org','');
		});
		it("can be (set:) into a variable", function() {
			var expr = runPassage("(set: $x to (print:'//grault//'))$x").find('tw-expression:last-child');

			expect(expr.text()).toBe("grault");
			expect(expr.children().is('i')).toBe(true);
		});
		it("stores its expression in its PrintCommand", function() {
			expect('(set: $name to "Dracula")'
				+ '(set: $p to (print: "Count " + $name))'
				+ '(set: $name to "Alucard")'
				+ '$p'
			).markupToPrint("Count Dracula");
		});
		it("will error if an infinite regress is created", function() {
			expect("(set: $x to '$x')(print: $x)").markupToError();
		});
	});
	describe("the (display:) macro", function() {
		it("requires exactly 1 string argument", function() {
			expect("(display:)").markupToError();
			expect("(display: 1)").markupToError();
			expect("(display:'A','B')").markupToError();
		});
		it("when placed in a passage, prints out the markup of another passage", function() {
			createPassage("''Red''", "grault");
			var expr = runPassage("(display: 'grault')").find('tw-expression');

			expect(expr.text()).toBe("Red");
			expect(expr.children().is('b')).toBe(true);
		});
		it("macros in the displayed passage affect the host passage", function() {
			createPassage("(replace:'Big')[Small]", "grault");
			var expr = runPassage("Big(display: 'grault')");

			expect(expr.text()).toBe("Small");
		});
		it("can be run with (print:)", function() {
			createPassage("Red", "grault");
			expect("(print:(display:'grault'))").markupToPrint("Red");
		});
		it("evaluates to a command object that can't be +'d", function() {
			expect("(print: (display:'grault') + (display:'grault'))").markupToError();
		});
		it("can be (set:) into a variable", function() {
			createPassage("''Red''", "grault");
			var expr = runPassage("(set: $x to (display:'grault'))$x").find('tw-expression:last-child');

			expect(expr.text()).toBe("Red");
			expect(expr.children().is('b')).toBe(true);
		});
		it("produces an error if the passage doesn't exist", function() {
			expect("(display: 'grault')").markupToError();
		});
		it("will error if an infinite regress is created", function() {
			createPassage("(display: 'grault')", "grault");
			expect("(display: 'grault')").markupToError();
		});
	});
	describe("the (go-to:) macro", function() {
		
		function waitForGoto(callback) {
			setTimeout(function f() {
				if($('tw-passage:last-of-type tw-expression[name=go-to]').length > 0) {
					return setTimeout(f, 20);
				}
				callback();
			}, 20);
		}
		
		it("requires exactly 1 string argument", function() {
			expect("(go-to:)").markupToError();
			expect("(go-to: 1)").markupToError();
			expect("(go-to:'A','B')").markupToError();
		});
		it("when placed in a passage, navigates the player to another passage", function(done) {
			createPassage("''Red''", "croak");
			runPassage("(go-to: 'croak')");
			waitForGoto(function() {
				var expr = $('tw-passage:last-child').find('b');
				expect(expr.text()).toBe("Red");
				done();
			});
		});
		it("will count as a new turn in the session history", function(done) {
			createPassage("", "grault");
			runPassage("(go-to: 'grault')","garply");
			waitForGoto(function() {
				expect('(print:(history:))').markupToPrint('garply,grault');
				done();
			});
		});
		it("prevents macros after it from running", function(done) {
			createPassage("", "flunk");
			runPassage("(set:$a to 1)(go-to:'flunk')(set:$a to 2)");
			expect("$a").markupToPrint("1");
			waitForGoto(done);
		});
		it("prevents macros even outside of its home hook", function(done) {
			createPassage("", "flunk");
			runPassage("(set:$a to 1)(if:true)[(go-to:'flunk')](set:$a to 2)");
			expect("$a").markupToPrint("1");
			waitForGoto(done);
		});
		it("can be run with (print:)", function(done) {
			createPassage("''Red''", "croak");
			runPassage("(print:(go-to: 'croak'))");
			waitForGoto(function() {
				expect($('tw-passage:last-child').find('b').text()).toBe("Red");
				done();
			});
		});
		it("evaluates to a command object that can't be +'d", function() {
			expect("(print: (go-to:'crepax') + (go-to:'crepax'))").markupToError();
		});
		it("can be (set:) into a variable", function(done) {
			createPassage("''Red''", "waldo");
			runPassage("(set: $x to (go-to:'waldo'))$x");
			waitForGoto(function() {
				var expr = $('tw-passage:last-child').find('b');
				expect(expr.text()).toBe("Red");
				done();
			});
		});
		it("produces an error if the passage doesn't exist", function() {
			expect("(go-to: 'freek')").markupToError();
		});
		it("transitions out the preceding <tw-passage> when stretchtext is off", function(done) {
			createPassage("''Red''", "waldo");
			runPassage("(set: $x to (go-to:'waldo'))$x");
			waitForGoto(function() {
				expect($('tw-passage').length).toBe(1);
				done();
			});
		});
	});
	describe("the (alert:) macro", function() {
		it("requires exactly 1 string argument", function() {
			expect("(alert:)").markupToError();
			expect("(alert:1)").markupToError();
			expect("(alert:'e','f')").markupToError();
		});
		it("produces a command which calls window.alert", function() {
			spyOn(window,'alert');
			runPassage("(alert:'Gooball')");
			expect(window.alert).toHaveBeenCalledWith('Gooball');
		});
		it("evaluates to a command object that can't be +'d", function() {
			expect("(print: (alert:'a') + (alert:'b'))").markupToError();
		});
		it("can be (set:) into a variable", function() {
			spyOn(window,'alert');
			runPassage("(set: $x to (alert:'Gooball'))");
			expect(window.alert).not.toHaveBeenCalled();
			runPassage("$x");
			expect(window.alert).toHaveBeenCalledWith('Gooball');
		});
	});

	describe("the (open-url:) macro", function() {
		it("requires exactly 1 string argument", function() {
			expect("(open-url:)").markupToError();
			expect("(open-url:1)").markupToError();
			expect("(open-url:'e','f')").markupToError();
		});
		it("produces a command which calls window.open and prints nothing", function() {
			spyOn(window,'open');
			var p = runPassage("foo(open-url:'http://example.org')bar");
			expect(p.text()).toBe("foobar");
			expect(window.open).toHaveBeenCalledWith('http://example.org','');
		});
		it("evaluates to a command object that can't be +'d", function() {
			expect("(print: (alert:'a') + (alert:'b'))").markupToError();
		});
		it("can be (set:) into a variable", function() {
			spyOn(window,'open');
			runPassage("(set: $x to (open-url:'http://example.org'))");
			expect(window.open).not.toHaveBeenCalled();
			runPassage("$x");
			expect(window.open).toHaveBeenCalledWith('http://example.org','');
		});
	});

	describe("the (reload:) macro", function() {
		// window.location.reload cannot be spied on, as it and window.location are non-configurable
		it("takes no arguments", function() {
			expect("(set: $x to (reload:1))").markupToError();
			expect("(set: $x to (reload:'e'))").markupToError();
		});
		it("evaluates to a command object that can't be +'d", function() {
			expect("(print: (reload:) + (reload:))").markupToError();
		});
		it("can be (set:) into a variable", function() {
			expect("(set: $x to (reload:))").not.markupToError();
		});
		it("can't be used in the first passage", function() {
			expect("(reload:)").markupToError();
		});
	});

	describe("the (goto-url:) macro", function() {
		// window.location.assign cannot be spied on, as it and window.location are non-configurable
		it("requires exactly 1 string argument", function() {
			expect("(set: $x to (goto-url:))").markupToError();
			expect("(set: $x to (goto-url:1))").markupToError();
			expect("(set: $x to (goto-url:'http://example.org','http://example.org'))").markupToError();
			expect("(set: $x to (goto-url:false))").markupToError();
		});
		it("evaluates to a command object that can't be +'d", function() {
			expect("(print: (goto-url:'http://example.org') + (goto-url:'http://example.org'))").markupToError();
		});
		it("can be (set:) into a variable", function() {
			expect("(set: $x to (goto-url:'http://example.org'))").not.markupToError();
		});
	});
	describe("the (undo:) macro", function() {

		function waitForUndo(callback) {
			setTimeout(function f() {
				if($('tw-passage:last-of-type tw-expression[name=undo]').length > 0) {
					return setTimeout(f, 20);
				}
				callback();
			}, 20);
		}

		it("takes no arguments", function() {
			expect("(set: $x to (undo:1))").markupToError();
			expect("(set: $x to (undo:'e'))").markupToError();
		});
		it("when run, undoes the current turn", function(done) {
			runPassage("(set: $a to 1)","one");
			runPassage("(set: $a to 2)(undo:)","two");
			waitForUndo(function() {
				expect("(print: $a) (print:(history:)'s length)").markupToPrint("1 1");
				done();
			});
		});
		it("errors when run in the first turn", function(){
			expect("(undo:)").markupToError();
		});
		it("prevents macros after it from running", function(done) {
			runPassage("");
			runPassage("(set:$a to 1)(undo:)(set:$a to 2)");
			expect("$a").markupToPrint("1");
			waitForUndo(done);
		});
		it("evaluates to a command object that can't be +'d", function() {
			expect("(print: (undo:) + (undo:))").markupToError();
		});
		it("can be (set:) into a variable", function(done) {
			runPassage("''Red''","one");
			runPassage("(set: $x to (undo:))$x");
			waitForUndo(function() {
				var expr = $('tw-passage:last-child').find('b');
				expect(expr.text()).toBe("Red");
				done();
			});
		});
	});
});
