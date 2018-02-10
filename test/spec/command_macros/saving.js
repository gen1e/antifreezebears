describe("save macros", function() {
	'use strict';
	
	function retrieveStoredState(itemName) {
		var storedItem = localStorage.getItem(itemName);
		
		expect(function() {
			storedItem = JSON.parse(storedItem);
		}).not.toThrow();
		expect(storedItem).not.toBe(null);
		return storedItem;
	}
	/*
		This should be identical to the internal function in macrolib/commands.js
	*/
	function storagePrefix(text) {
		return "(" + text + " " + Engine.options.ifid + ") ";
	}

	describe("the (savegame:) macro", function() {
		it("accepts 1 or 2 strings", function() {
			expect("(savegame:'1')").not.markupToError();
			expect("(savegame:'1','A')").not.markupToError();
			expect("(savegame:)").markupToError();
			expect("(savegame:2)").markupToError();
			expect("(savegame:true)").markupToError();
			expect("(savegame:'1','1','1')").markupToError();
		});
		it("saves the game in localStorage in JSON format", function() {
			runPassage("(set:$foo to 1)", "corge");
			expect("(savegame:'1','Filename')").not.markupToError();
			
			retrieveStoredState(storagePrefix('Saved Game') + "1");
		});
		it("can save collection variables", function() {
			runPassage(
				"(set:$arr to (a:2,4))" +
				"(set:$dm to (datamap:'HP',4))" +
				"(set:$ds to (dataset:2,4))",
				"corge"
			);
			expect("(savegame:'1')").not.markupToError();
		});
		it("can save changer command variables", function() {
			runPassage(
				"(set:$c1 to (font:'Skia'))" +
				"(set:$c2 to $c1 + (align:'==>'))" +
				"(set:$c3 to (a:$c2 + (if: true)))",
				"corge"
			);
			expect("(savegame:'1')").not.markupToError();
			runPassage(
				"(set:$c4 to (hover-style:(font:'Skia')))" +
				"(set:$c5 to $c4 + (align:'==>'))",
				"grault"
			);
			expect("(savegame:'1')").not.markupToError();
		});
		it("works from the start of the game", function() {
			expect("(savegame:'1','Filename')", "qux").not.markupToError();
			
			retrieveStoredState(storagePrefix('Saved Game') + "1");
		});
		it("stores lots of data", function() {
			Array(1000).join().split(',').forEach(function(_, e) {
				runPassage("(set:$V" + e + " to " + e + ")","P"+e);
			});
			expect("(savegame:'1','Filename')").not.markupToError();
			
			retrieveStoredState(storagePrefix('Saved Game') + "1");
		});
		it("stores the save file's name", function() {
			runPassage("(set:$foo to 1)", "corge");
			expect("(savegame:'1','Quux')").not.markupToError();
			
			var storedItem = localStorage.getItem(storagePrefix('Saved Game Filename') + "1");
			expect(storedItem).toBe("Quux");
		});
		it("alters the (savedgames:) datamap", function() {
			expect("(print: (savedgames:) contains 'A')").markupToPrint('false');
			expect("(savegame:'A','Filename')").not.markupToError();
			expect("(print: (savedgames:)'s A)").markupToPrint('Filename');
		});
	});
	describe("the (loadgame:) macro", function() {
		it("accepts 1 string", function() {
			runPassage("(savegame:'1','Filename')");
			expect("(loadgame:)").markupToError();
			expect("(loadgame:2)").markupToError();
			expect("(loadgame:true)").markupToError();
			expect("(loadgame:'1','1')").markupToError();
		});
		it("loads a saved game, restoring the game history and navigating to the saved passage", function(done) {
			runPassage("uno", "uno");
			runPassage("dos(savegame:'1','Filename')", "dos");
			runPassage("tres", "tres");
			expect("cuatro(loadgame:'1')").not.markupToError();
			requestAnimationFrame(function() {
				expect($("tw-passage").last().text()).toMatch("dos");
				expect("(history:)").markupToPrint("uno,dos");
				done();
			});
		});
		it("restores the saved game's variables", function(done) {
			runPassage("(set:$foo to 'egg')(set:$bar to 2)(set:$baz to true)", "uno");
			runPassage("(set:$bar to it + 2)(savegame:'1','Filename')", "dos");
			runPassage("(set:$bar to it + 2)(set:$foo to 'nut')", "tres");
			expect("(set:$bar to it + 2)(loadgame:'1')").not.markupToError();
			requestAnimationFrame(function() {
				expect("$foo $bar (text: $baz)").markupToPrint("egg 4 true");
				done();
			});
		});
		it("can restore collection variables", function(done) {
			runPassage(
				"(set:$arr to (a:'egg'))" +
				"(set:$dm to (datamap:'HP',4))" +
				"(set:$ds to (dataset:2,4))" +
				"(savegame:'1')",
				"corge"
			);
			expect("(loadgame:'1')").not.markupToError();
			requestAnimationFrame(function() {
				expect("$arr (text:$dm's HP) (text: $ds contains 4)").markupToPrint("egg 4 true");
				done();
			});
		});
		it("can restore changer command variables", function(done) {
			runPassage(
				"(set:$c1 to (text-style:'underline'))" +
				"(set:$c2 to (a: $c1 + (hook: 'luge')))");
			runPassage("(savegame:'1')");
			expect("(loadgame:'1')").not.markupToError();
			requestAnimationFrame(function() {
				var hook = runPassage("(either:$c2's 1st)[goop]").find('tw-hook');
				requestAnimationFrame(function() {
					expect(hook.css('text-decoration')).toBe('underline');
					expect(hook.attr('name')).toBe('luge');
					done();
				});
			});
		});
	});
});

