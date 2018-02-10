describe("HTML in twinemarkup", function() {
	'use strict';
	function expectHTMLToBecome(text, expected) {
		var r = runPassage(text);
		r.find('[data-raw]').removeAttr('data-raw');
		expect(r.html()).toBe(expected);
	}
	
	it("due to the behaviour of jQuery.parseHTML(), orphaned end-tags are silently removed", function() {
		expect("Bee</b>").markupToPrint("Bee");
	});

	it("doesn't recognise tags that begin with a non-ASCII-letter", function() {
		expect("<3>Bee</3>").markupToPrint("<3>Bee");
		expect("<é>Bee</é>").markupToPrint("<é>Bee");
	});

	describe("span-level tags", function() {
		it("are rendered as HTML, with an added data-raw attribute", function() {
			expect(runPassage("<b>Bee</b>").find('b[data-raw]').length).toBe(1);
		});
		it("turn into their respective elements", function() {
			expectHTMLToBecome(
				"<i>What</i> <b>is</b> <u>this</u>?",
				"<i>What</i> <b>is</b> <u>this</u>?"
			);
		});
		it("persist across line breaks", function() {
			expectHTMLToBecome(
				"<i>What\n</i> <b>is\n</b> <u>this\n</u>?",
				"<i>What<br></i> <b>is<br></b> <u>this<br></u>?"
			);
		});
	});
	describe("block-level tags", function() {
		it("turn into their respective elements", function() {
			expectHTMLToBecome(
				"<div>Hey</div>?",
				"<div>Hey</div>?"
			);
		});
	});
	describe("elements with attributes", function() {
		it("retain their attributes", function() {
			var DOM = runPassage("<div id='gerald' style='background-color:black'>Hey</div>?");
			
			expect(DOM.find("#gerald").attr('style')).toMatch(/background-color:\s*black/);
		});
	});
	describe("<script> tags", function() {
		it("execute their contained code", function() {
			expect(runPassage("Hey!<script>window.foo = 1;</script>").find('script').length).toBe(1);
			expect(window.foo).toBe(1);
		});
		it("can have src attributes", function(done) {
			runPassage('<script src="data:text/javascript;plain,window.foo=1//"></script>');
			setTimeout(function() {
				expect(window.foo).toBe(1);
				done();
			},1000);
		});
		afterEach(function() {
			delete window.foo;
		});
	});
	describe("<style> tags", function() {
		it("can be used without escaping their contents", function() {
			expect(runPassage("<style>b { box-sizing: content-box; }</style><b>Hey</b>").find('b').css('box-sizing')).toBe('content-box');
		});
	});

	describe("<table> tags", function() {
		it("won't allow line breaks to become erroneous <br> elements inside them", function() {
			expect(runPassage("<table>\n<tr> \n<td>X</td>C\nV</tr>\n?</table>").find('br').length).toBe(0);
		});
		it("will allow line breaks nested inside some other structure", function() {
			expect(runPassage("<table>''\n''<tr><td>X</td>''\n''</tr></table>").find('br').length).toBe(2);
		});
		it("will allow explicit <br> elements inside them to be automatically moved", function() {
			expect(runPassage("<table><br><tr><td>X</td><br></tr></table>").find('br + br').length).toBe(1);
		});
	});
	
	var audioBase64 = [
		"data:audio/ogg;base64,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",
		"data:audio/mp3;base64,/+MYxAAAAANIAAAAAExBTUUzLjk4LjJVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV/+MYxDsAAANIAAAAAFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV/+MYxHYAAANIAAAAAFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV/+MYxLEAAANIAAAAAFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV"
	][+!new Audio().canPlayType('audio/ogg')];
	
	describe("<audio> tags", function() {
		it("when autoplaying, continue to autoplay after transition has finished", function(done) {
			var a = runPassage("<audio autoplay loop><source src='" + audioBase64 + "'></source></audio>").find('audio');
			setTimeout(function() {
				expect(a[0].paused).toBe(false);
				done();
			}, 1000);
		});
		it("even inside nested hooks", function(done) {
			var a = runPassage("(text-style:'bold')[<audio autoplay loop><source src='" + audioBase64 + "'></source></audio>]").find('audio');
			setTimeout(function() {
				expect(a[0].paused).toBe(false);
				done();
			}, 1000);
		});
	});

	describe("HTML comments", function() {
		it("are removed from the rendered HTML", function() {
			[0,1,2].forEach(function(i) {
				expect(
					"A<!--" + "\n".repeat(i) + "-->B"
				).markupToBecome(
					"AB"
				);
			});
		});
		it("can handle partial syntax inside", function() {
			expect(
				"A<!--''-->B"
			).markupToBecome(
				"AB"
			);
		});
		it("can be nested", function() {
			expect(
				"A<!--Cool<!-- -->Cool-->B"
			).markupToBecome(
				"AB"
			);
		});
	});
	describe("HTML entities", function() {
		it("(named) can be used", function() {
			expect(
				"&para;&sect;&hearts;"
			).markupToBecome(
				"¶§♥"
			);
		});
		it("(numeric) can be used", function() {
			expect(
				"&#223;&#xDF;"
			).markupToBecome(
				"ßß"
			);
		});
	});
});
