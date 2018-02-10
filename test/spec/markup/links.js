describe("link syntax", function() {
	'use strict';
	describe("simple link syntax", function() {
		it("consists of [[, text, then ]], and desugars to a (link-goto:) macro", function() {
			var expression = runPassage("[[flea]]").find('tw-expression');
		
			expect(expression.attr("type")).toBe("macro");
			expect(expression.attr("name")).toBe("link-goto");
			expect(expression.text()).toBe("flea");
		});
		it("can be used in macro expression position", function() {
			var expression = runPassage("(set: $x to [[flea]])$x").find('tw-expression');
			
			expect(expression.text()).toBe("flea");
		});
		it("may have non-sequential ]s in the text", function() {
			var expression = runPassage("[[fl]e]a]]").find('tw-expression');
		
			expect(expression.attr("type")).toBe("macro");
			expect(expression.attr("name")).toBe("link-goto");
			expect(expression.text()).toBe("fl]e]a");
		});
		it("may contain markup, and links to the correct passage based on the plain text", function() {
			createPassage("","mire");
			var link = runPassage("[[mi''r''e]]").find('tw-link');
		
			expect(link.html()).toBe("mi<b>r</b>e");
			expect(link.attr("passage-name")).toBe("mire");
		});
		it("may contain line breaks", function() {
			createPassage("","mire");
			var link = runPassage("[[\nmire\n]]").find('tw-link');
		
			expect(link.html()).toBe("<br>mire<br>");
			expect(link.attr("passage-name")).toBe("mire");
		});
		it("won't be confused with nested hooks", function() {
			expect(runPassage("|a>[|b>[c]]").find('tw-expression, tw-error').length).toBe(0);
			expect(runPassage("[[b]<c|]<a|").find('tw-expression, tw-error').length).toBe(0);
			expect(runPassage("|a>[[b]]").find('tw-expression, tw-error').length).toBe(0);
			expect(runPassage("[[b]]<a|").find('tw-expression').length).toBe(1);
		});
		it("won't be confused with attached hooks", function() {
			createPassage("","Hello");
			expect(runPassage("(if:true)[[[Hello]]]").find('tw-hook tw-link').length).toBe(1);
		});
		it("works correctly with double-quotes", function() {
			createPassage("",'"do it"');
			var link = runPassage('[["do it"]]').find('tw-link');
			expect(link.html()).toBe('"do it"');
			expect(link.attr("passage-name")).toBe('"do it"');
		});
		it("works correctly with single-quotes", function() {
			createPassage("","'do it'");
			var link = runPassage("[['do it']]").find('tw-link');
			expect(link.html()).toBe("'do it'");
			expect(link.attr("passage-name")).toBe("'do it'");
		});
	});
	describe("proper link syntax", function() {
		it("consists of a simple link with <- or ->", function() {
			var expression = runPassage("[[in->out]]").find('tw-expression');
		
			expect(expression.attr("type")).toBe("macro");
			expect(expression.attr("name")).toBe("link-goto");
		});
		it("only displays the text on the other side of the arrow", function() {
			var expression = runPassage("[[in->out]]").find('tw-expression');
		
			expect(expression.text()).toBe("in");
		});
		it("links to the passage pointed to by the arrow", function() {
			createPassage("", "out");
		
			var link = runPassage("[[in->out]]").find('tw-link');
		
			expect(link.parent().is('tw-expression')).toBe(true);
			expect(link.attr("passage-name")).toBe("out");
		
			link = runPassage("[[out<-in]]").find('tw-link');
		
			expect(link.parent().is('tw-expression')).toBe(true);
			expect(link.attr("passage-name")).toBe("out");
		});
		it("uses the rightmost right arrow (or, in its absence, leftmost left arrow) as the separator", function() {
			createPassage("", "E");
		
			var link = runPassage("[[A->B->C->D->E]]").find('tw-link');
		
			expect(link.text()).toBe("A->B->C->D");
			expect(link.attr("passage-name")).toBe("E");
		
			link = runPassage("[[E<-D<-C<-B<-A]]").find('tw-link');
		
			expect(link.text()).toBe("D<-C<-B<-A");
			expect(link.attr("passage-name")).toBe("E");
		
			link = runPassage("[[A<-B<-C->D->E]]").find('tw-link');
		
			expect(link.attr("passage-name")).toBe("E");
		
			createPassage("", "C<-D<-E");
			link = runPassage("[[A->B->C<-D<-E]]").find('tw-link');
		
			expect(link.attr("passage-name")).toBe("C<-D<-E");
		});
	});
});
