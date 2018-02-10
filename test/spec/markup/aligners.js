describe("aligner syntax", function() {
	'use strict';
	
	it("right-aligns text with ==> on a single line, and ends right-alignment with <== on a single line", function() {
		var passage = runPassage("==>\ngarply\n<==\ngrault");
		var align = passage.find('tw-align');
		expect(align.css('text-align')).toBe('right');
		expect(align.text()).toBe('garply');
		expect(passage.text()).toBe('garply\ngrault');
		expect(align.css('margin-left')).toMatch(/^(?:0px)?$/);
	});
	it("ignores preceding and trailing whitespace", function() {
		var align = runPassage("   ==>   \ngarply\n   <==   ").find('tw-align');
		expect(align.length).toBe(1);
	});
	it("must be on a single line", function() {
		var align = runPassage("==>garply\ngrault\n<==corge").find('tw-align');
		expect(align.length).toBe(0);
	});
	it("ignores the number of, and imbalance of, = signs used", function() {
		[2,3,4,5,6,7,8,9,10].forEach(function(number) {
			var align = runPassage("=".repeat(number) + ">\ngarply\n<" + "=".repeat(number+2)).find('tw-align');
			expect(align.css('text-align')).toBe('right');
			expect(align.text()).toBe('garply');
			expect(align.css('margin-left')).toMatch(/^(?:0px)?$/);
		});
	});
	it("centres text with a balanced =><=", function() {
		var align = runPassage("=><=\ngarply").find('tw-align');
		expect(align.css('text-align')).toBe('center');
		expect(align.text()).toBe('garply');
		expect(align.attr('style')).toMatch(/max-width:\s*50%/);
		expect(align.attr('style')).toMatch(/margin-left:\sauto/);
		expect(align.attr('style')).toMatch(/margin-right:\sauto/);
	});
	it("justifies text with <==>", function() {
		var align = runPassage("<==>\ngarply\n<==").find('tw-align');
		expect(align.css('text-align')).toBe('justify');
		expect(align.text()).toBe('garply');
		expect(align.css('margin-left')).toMatch(/^(?:0px)?$/);
	});
	it("aligns text with unbalanced ==><=", function() {
		var align = runPassage("==><====\ngarply").find('tw-align');
		expect(align.css('text-align')).toBe('center');
		expect(align.attr('style')).toMatch(/margin-left:\s*17%/);
		
		align = runPassage("=====><=\ngarply").find('tw-align');
		expect(align.css('text-align')).toBe('center');
		expect(align.attr('style')).toMatch(/margin-left:\s*42%/);
	});
	it("doesn't nest <tw-align> elements", function() {
		var align = runPassage("<==>\ngarply\n==>\ngrault\n<==").find('tw-align');
		expect(align.first().text()).toBe('garply');
		expect(align.last().text()).toBe('grault');
		expect(align.length).toBe(2);
	});
	it("does not consume preceding line breaks", function() {
		[1,2,3,4].forEach(function(i) {
			expect(runPassage(
				"A" + "\n".repeat(i) + "==>\ngarply\n<==\n"
			).children('br').length).toBe(i);
		});
	});
	it("won't create <br> elements afterward", function() {
		expect(runPassage("<==>\ngarply\n<==\n").find('tw-align + br').length).toBe(0);
	});
});
