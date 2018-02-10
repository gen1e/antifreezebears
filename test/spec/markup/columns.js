describe("column syntax", function() {
	'use strict';
	
	it("creates a column with ==|, |== or =|= on a single line, and ends a column with |==| on a single line", function() {
		var passage = runPassage("|==\ngarply\n==|\ncorge\n|==|\ngrault");
		expect(passage.text()).toBe('garply\ncorge\ngrault');
		var columns = passage.find('tw-columns');
		expect(columns.text()).toBe('garply\ncorge\n');
		var column = columns.find('tw-column');
		expect(column.first().attr('type')).toBe('left');
		expect(column.first().text()).toBe('garply');
		expect(column.last().attr('type')).toBe('right');
		expect(column.last().text()).toBe('corge');
	});
	it("ignores preceding and trailing whitespace", function() {
		var column = runPassage("   |==   \ngarply\n  ==|  \ngrault\n |==|   ").find('tw-column');
		expect(column.length).toBe(2);
	});
	it("must be on a single line", function() {
		var column = runPassage("==|garply\n|==grault\n|==|corge").find('tw-column');
		expect(column.length).toBe(0);
	});
	it("works with only one column", function() {
		var column = runPassage("=====|\ngarply\n|==|\ngrault").find('tw-column');
		expect(column.length).toBe(1);
	});
	it("works with empty columns", function() {
		var column = runPassage("=====|\ngarply\n|==|\ngrault").find('tw-column');
		expect(column.length).toBe(1);
	});
	it("works with many columns", function() {
		var column = runPassage("|==\nA\n=|=\nB\n=|=\nC\n=|=\nD\n=|=\nE\n=|=\nF\n|==|\nG").find('tw-column');
		expect(column.length).toBe(6);
		expect(column[0].style.width).toMatch(/^16\.6+/);
	});
	it("doesn't require a final |==|", function() {
		var passage = runPassage("|==\ngarply\n==|\ncorge");
		expect(passage.find('tw-column').length).toBe(2);
	});
	it("columns' widths are evenly divided when each token has single |'s", function() {
		var column = runPassage("|==\nX\n==|\nX\n|==|\n").find('tw-column');
		expect(column.filter(function(){ return this.style.width === "50%";}).length).toBe(2);

		column = runPassage("|==\nX\n=|=\nX\n=|=\nX\n==|\nX\n|==|\n").find('tw-column');
		expect(column.filter(function(){ return this.style.width === "25%";}).length).toBe(4);
		column = runPassage("|==\nX" + "\n=|=\nX".repeat(9) + "\n|==|\n").find('tw-column');
		expect(column.filter(function(){ return this.style.width === "10%";}).length).toBe(10);
	});
	it("columns' widths are proportionally divided when tokens have multiple |'s", function() {
		var column = runPassage("|==\nX\n==|||\nX\n|==|\n").find('tw-column');
		expect(column[0].style.width).toBe("25%");
		expect(column[1].style.width).toBe("75%");
	});
	it("columns have margins based on the number of ='s", function() {
		var column = runPassage("|====\nX\n=|\nX\n|==|\n").find('tw-column');
		expect(column[0].style.marginRight).toBe("4em");
		expect(column[0].style.marginLeft).toBe("0em");
		expect(column[1].style.marginRight).toBe("0em");
		expect(column[1].style.marginLeft).toBe("1em");
	});
	it("does not consume preceding line breaks", function() {
		[1,2,3,4].forEach(function(i) {
			expect(runPassage(
				"A" + "\n".repeat(i) + "==|\ngarply\n|==|\n"
			).children('br').length).toBe(i);
		});
	});
	it("won't create <br> elements afterward", function() {
		expect(runPassage("==|\ngarply\n|==|\n").find('tw-columns + br').length).toBe(0);
	});
});
