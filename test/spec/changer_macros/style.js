describe("style changer macros", function() {
	'use strict';
	var dominantTextColour, dominantBackground;
	beforeAll(function() {
		dominantTextColour = $('tw-story').css('color');
		dominantBackground = $('tw-story').css('background-color');
	});

	describe("the (css:) macro", function() {
		it("requires exactly 1 string argument", function() {
			expect("(css:)").markupToError();
			expect("(css:1)").markupToError();
			expect("(css:'A','B')").markupToError();
		});
		it("applies the passed CSS to the hook as an inline style property", function() {
			expect(runPassage("(css:'display:inline-block')[Hey]").find('tw-hook').css('display'))
				.toBe('inline-block');
			expect(runPassage("(css:'clear:both;')[Hey]").find('tw-hook').css('clear'))
				.toBe('both');
		});
		it("can be (set:) in a variable", function() {
			runPassage("(set: $s to (css:'display:inline-block;'))");
			var hook = runPassage("$s[Hey]").find('tw-hook');
			expect(hook.css('display')).toBe('inline-block');
		});
		it("can compose with itself", function() {
			runPassage("(set: $s to (css:'display:inline-block') + (css:'clear:both') + (css:'white-space:pre-wrap'))");
			var hook = runPassage("$s[Hey]").find('tw-hook');
			expect(hook.css('display')).toBe('inline-block');
			expect(hook.css('clear')).toBe('both');
			expect(hook.css('white-space')).toBe('pre-wrap');
		});
		it("compositions have structural equality", function() {
			expect("(print: (css:'display:inline-block') + (css:'clear:both')"
				+ " is (css:'display:inline-block') + (css:'clear:both'))").markupToPrint("true");
			expect("(print: (css:'display:inline-block') + (css:'clear:both')"
				+ " is (css:'display:flex') + (css:'clear:both'))").markupToPrint("false");
		});
		it("errors when placed in passage prose while not attached to a hook", function() {
			expect("(css:'color:red')").markupToError();
			expect("(css:'color:red')[]").not.markupToError();
		});
	});
	describe("the (textstyle:) macro", function() {
		it("requires exactly 1 string argument", function() {
			expect("(print:(textstyle:))").markupToError();
			expect("(print:(textstyle:1))").markupToError();
			expect("(print:(textstyle:'A','B'))").markupToError();
		});
		it("errors unless given a valid textstyle name", function() {
			expect("(print:(textstyle:''))").markupToError();
			expect("(print:(textstyle:'garply corge'))").markupToError();
			['bold', 'italic', 'underline', 'strike', 'superscript', 'subscript', 'blink', 'shudder',
			'mark', 'condense', 'expand', 'outline', 'shadow', 'emboss', 'smear', 'blur', 'blurrier',
			'mirror', 'upsidedown', 'fadeinout', 'rumble'].forEach(function(e) {
				expect("(print:(textstyle:'" + e + "'))").not.markupToError();
			});
		});
		it("uses case- and dash-insensitive style names", function() {
			expect("(textstyle:'BOLD')[]").not.markupToError();
			expect("(textstyle:'--b--o--l--d')[]").not.markupToError();
			expect("(textstyle:'_bOl_-D')[]").not.markupToError();
		});
		it("errors when placed in passage prose while not attached to a hook", function() {
			expect("(textstyle:'bold')").markupToError();
			expect("(textstyle:'bold')[]").not.markupToError();
		});
		['outline','shadow','blur','blurrier','emboss','smear'].forEach(function(e) {
			describe("'" + e + "' style", function() {
				it("uses the shadow colour equal to the dominant text colour", function(done) {
					var hook = runPassage("(text-style:'" + e + "')[Goobar]")
						.find('tw-hook');
					setTimeout(function() {
						expect(hook).toHaveTextShadowColour(dominantTextColour);
						done();
					});
				});
				it("correctly discerns the dominant text colour of outer hooks", function(done) {
					var hook = runPassage("(text-colour: #fadaba)[|2>[(text-style:'" + e + "')[Goobar]]]")
						.find('tw-hook[name=2] > tw-hook');
					setTimeout(function() {
						expect(hook).toHaveTextShadowColour('#fadaba');
						done();
					});
				});
				if (e.slice(0,4)==="blur") {
					it("has transparent text colour", function(done) {
						var hook = runPassage("(text-style:'" + e + "')[Goobar]")
							.find('tw-hook');
						setTimeout(function() {
							expect(hook).toHaveColour('transparent');
							done();
						});
					});
				}
				if (e === "outline") {
					it("uses the text colour of the background", function(done) {
						var hook = runPassage("(text-style:'outline')[Goobar]")
							.find('tw-hook');
						setTimeout(function() {
							expect(hook).toHaveColour(dominantBackground);
							done();
						});
					});
					it("correctly discerns the background colour of outer hooks", function(done) {
						var hook = runPassage("(background: #fadaba)[|2>[(text-style:'outline')[Goobar]]]")
							.find('tw-hook[name=2] > tw-hook');
						setTimeout(function() {
							expect(hook).toHaveColour('#fadaba');
							done();
						});
					});
				}
			});
		});
		['mirror','upside-down'].forEach(function(e) {
			describe("'" + e + "' style", function() {
				// We can't examine the elements any more than this.
				it("uses a defined CSS transform ", function(done) {
					var hook = runPassage("(text-style:'" + e + "')[Goobar]")
						.find('tw-hook');
					setTimeout(function() {
						expect(hook.attr('style')).toMatch(new RegExp("transform:.*?\\s" +
							((e === "mirror") ? "scaleX\\(\\s*-1\\s*\\)" : "scaleY\\(\\s*-1\\s*\\)")));
						done();
					});
				});
			});
		});
		['rumble','shudder','fade-in-out','blink'].forEach(function(e){
			describe("'" + e + "' style", function() {
				// We can't examine the elements any more than this.
				it("uses a defined CSS animation and easing function", function(done) {
					var hook = runPassage("(text-style:'" + e + "')[Goobar]")
						.find('tw-hook');
					setTimeout(function() {
						var style = hook.attr('style');
						expect(style).toMatch(new RegExp("animation(?:\\-name)?:.*?\\s" +
							((e === "blink") ? "fade-in-out" :
							e) + "\\b"));
						expect(style).toMatch(new RegExp("animation(?:\\-timing\\-function)?:.*?\\s" +
							(e === "blink" ? "steps\\(\\s*1,\\s*end\\s*\\)" :
							e === "fade-in-out" ? "ease-in-out" :
							"linear")));
						done();
					});
				});
			});
		});
		describe("'none' style", function() {
			it("removes other styles it is composed to the right with", function(done) {
				var hook = runPassage("(set:$x to (text-style:'bold'))(set:$x to it + (text-style:'none'))$x[Goobar]")
					.find('tw-hook');
				setTimeout(function() {
					expect(hook.attr('style')).toBe(undefined);
					done();
				});
			});
			xit("removes other styles in already enchanted text", function(done) {
				var hook = runPassage("[Goobar]<x|(enchant:?x, (text-style:'bold'))(enchant:?x, (text-style:'none'))")
					.find('tw-hook');
				setTimeout(function() {
					expect(hook.css('font-weight')).toBe("400");
					done();
				});
			});
			it("doesn't remove styles if it is composed to the left", function(done) {
				var hook = runPassage("(set:$x to (text-style:'bold'))(set:$x to (text-style:'none') + it)$x[Goobar]")
					.find('tw-hook');
				setTimeout(function() {
					expect(hook.attr('style')).toMatch(/font-weight:\s*(bold|800)/);
					done();
				});
			});
		});
	});
	describe("the (transition:) macro", function() {
		it("requires exactly 1 string argument", function() {
			expect("(print:(transition:))").markupToError();
			expect("(print:(transition:1))").markupToError();
			expect("(print:(transition:'A','B'))").markupToError();
		});
		it("errors unless given a valid transition name", function() {
			expect("(print:(transition:''))").markupToError();
			expect("(print:(transition:'garply corge'))").markupToError();
			["dissolve", "shudder", "pulse"].forEach(function(e) {
				expect("(print:(transition:'" + e + "'))").not.markupToError();
			});
		});
		it("errors when placed in passage prose while not attached to a hook", function() {
			expect("(transition:'dissolve')").markupToError();
			expect("(transition:'dissolve')[]").not.markupToError();
		});
		it("has structural equality", function() {
			expect("(print: (transition:'dissolve') is (transition:'dissolve'))").markupToPrint("true");
			expect("(print: (transition:'dissolve') is (transition:'pulse'))").markupToPrint("false");
		});
		// TODO: Add .css() tests of output.
	});
	describe("the (transition-time:) macro", function() {
		it("requires exactly 1 number argument", function() {
			expect("(print:(transition:))").markupToError();
			expect("(print:(transition:'A'))").markupToError();
			expect("(print:(transition:2,2))").markupToError();
		});
		it("errors unless given a positive number", function() {
			expect("(print:(transition-time:0s))").markupToError();
			expect("(print:(transition-time:-50ms))").markupToError();
			expect("(print:(transition-time:50ms))").not.markupToError();
		});
		it("errors when placed in passage prose while not attached to a hook", function() {
			expect("(transition-time:2s)").markupToError();
			expect("(transition-time:2s)[]").not.markupToError();
		});
		it("has structural equality", function() {
			expect("(print: (transition-time:2s) is (transition-time:2s))").markupToPrint("true");
			expect("(print: (transition-time:2s) is (transition-time:2ms))").markupToPrint("false");
		});
		// TODO: Add .css() tests of output.
	});
	describe("the (text-rotate:) macro", function() {
		it("requires exactly 1 number argument", function() {
			expect("(print:(text-rotate:))").markupToError();
			expect("(print:(text-rotate:1))").not.markupToError();
			expect("(print:(text-rotate:'A'))").markupToError();
			expect("(print:(text-rotate:55,55))").markupToError();
		});
		it("rotates the attached hook by the given number of degrees", function(done) {
			var hook = runPassage("(text-rotate:20)[Rotated.]").find('tw-hook');
			setTimeout(function() {
				expect(hook.attr('style')).toMatch(/rotate\(20deg\)/);
				done();
			});
		});
	});
	describe("the (background:) macro", function() {
		it("requires 1 string argument or 1 colour argument", function() {
			expect("(print:(background:))").markupToError();
			expect("(print:(background:1))").markupToError();
			expect("(print:(background:'A','B'))").markupToError();
			expect("(print:(background:'A'))").not.markupToError();
			expect("(print:(background:red + white))").not.markupToError();
		});
		it("errors when placed in passage prose while not attached to a hook", function() {
			expect("(background:'A')").markupToError();
			expect("(background:'A')[]").not.markupToError();
		});
		it("given a string, applies it as the background-image property", function(done) {
			var p = runPassage("(background:'garply')[Hey]").find('tw-hook');
			setTimeout(function() {
				expect(p.attr('style')).toMatch(/background-image:\s*url\(['"]?.*?garply['"]?\)/);
				done();
			});
		});
		it("given a string with a hex colour, applies it as the background-color property", function(done) {
			var p = runPassage("(background:'#601040')[Hey]").find('tw-hook');
			setTimeout(function() {
				expect(p.attr('style')).toMatch(/background-color:\s*(?:#601040|rgb\(\s*96,\s*16,\s*64\s*\))/);
				done();
			});
		});
		it("given a colour, applies it as the background-color property", function(done) {
			var p = runPassage("(background:'#800000')[Hey]").find('tw-hook');
			setTimeout(function() {
				expect(p.attr('style')).toMatch(/background-color:\s*(?:#800000|rgb\(\s*128,\s*0,\s*0\s*\))/);
				done();
			});
		});
		it("can compose with itself", function(done) {
			var p = runPassage("(set: $x to (background:'#800000')+(background:'garply'))$x[Hey]").find('tw-hook');
			setTimeout(function() {
				expect(p.attr('style')).toMatch(/background-image:\s*url\(['"]?.*?garply['"]?\)/);
				expect(p.attr('style')).toMatch(/background-color:\s*(?:#800000|rgb\(\s*128,\s*0,\s*0\s*\))/);
				done();
			});
		});
		it("compositions have structural equality", function() {
			expect("(print: (background:black)+(background:'garply') is (background:black)+(background:'garply'))").markupToPrint("true");
			expect("(print: (background:black)+(background:'garply') is (background:black)+(background:'grault'))").markupToPrint("false");
		});
	});
	describe("the (align:) macro", function() {
		it("requires exactly 1 string argument", function() {
			expect("(print:(align:))").markupToError();
			expect("(print:(align:1))").markupToError();
			expect("(print:(align:'A','B'))").markupToError();
		});
		it("errors if not given an valid arrow", function() {
			expect("(align:'')[]").markupToError();
			expect("(align:'===')[]").markupToError();
			expect("(align:'<<==')[]").markupToError();
			expect("(align:'===><==>')[]").markupToError();
		});
		it("errors when placed in passage prose while not attached to a hook", function() {
			expect("(align:'==>')").markupToError();
			expect("(align:'==>')[]").not.markupToError();
		});
		it("right-aligns text when given '==>'", function(done) {
			var align = runPassage("(align:'==>')[garply]").find('tw-hook');
			setTimeout(function() {
				expect(align.css('text-align')).toBe('right');
				expect(align.text()).toBe('garply');
				expect(align.css('margin-left')).toMatch(/^(?:0px)?$/);
				done();
			});
		});
		it("ignores the number of, and imbalance of, = signs used", function(done) {
			[2,3,4,5,6,7,8,9,10].forEach(function(number) {
				var align = runPassage("(align:'" + "=".repeat(number) + ">')[garply]").find('tw-hook');
				setTimeout(function() {
					expect(align.css('text-align')).toBe('right');
					expect(align.text()).toBe('garply');
					expect(align.css('margin-left')).toMatch(/^(?:0px)?$/);
					done();
				});
			});
		});
		it("centres text with a balanced '=><='", function(done) {
			var align = runPassage("(align:'=><=')[garply]").find('tw-hook');
			setTimeout(function() {
				expect(align.css('text-align')).toBe('center');
				expect(align.text()).toBe('garply');
				expect(align.attr('style')).toMatch(/max-width:\s*50%/);
				expect(align.attr('style')).toMatch(/margin-left:\s*auto/);
				expect(align.attr('style')).toMatch(/margin-right:\s*auto/);
				done();
			});
		});
		it("justifies text with '<==>'", function(done) {
			var align = runPassage("(align:'<==>')[garply]").find('tw-hook');
			setTimeout(function() {
				expect(align.css('text-align')).toBe('justify');
				expect(align.text()).toBe('garply');
				expect(align.css('margin-left')).toMatch(/^(?:0px)?$/);
				done();
			});
		});
		it("left-aligns text when given '<=='", function(done) {
			var align = runPassage("(align:'==>')[(align:'<==')[garply]]").find('tw-hook');
			setTimeout(function() {
				expect(align.css('text-align')).toBe('right');
				expect(align.css('margin-left')).toMatch(/^(?:0px)?$/);
				align = align.find('tw-hook');
				expect(align.css('text-align')).toBe('left');
				expect(align.css('margin-right')).toMatch(/^(?:0px)?$/);
				done();
			});
		});
		it("aligns text with unbalanced '==><='", function(done) {
			var align = runPassage("(align:'==><====')[garply]").find('tw-hook');
			setTimeout(function() {
				expect(align.css('text-align')).toBe('center');
				expect(align.attr('style')).toMatch(/margin-left:\s*17%/);
			
				align = runPassage("(align:'=====><=')[garply]").find('tw-hook');
				setTimeout(function() {
					expect(align.css('text-align')).toBe('center');
					expect(align.attr('style')).toMatch(/margin-left:\s*42%/);
					done();
				});
			});
		});
		it("has structural equality", function() {
			expect("(print: (align:'<==') is (align:'<=='))").markupToPrint("true");
			expect("(print: (align:'<==') is (align:'=><=='))").markupToPrint("false");
		});
	});
	describe("the (hover-style:) macro", function() {
		it("requires exactly 1 style changer argument", function() {
			expect("(hover-style:)[]").markupToError();
			expect("(hover-style:1)[]").markupToError();
			expect("(hover-style:'A')[]").markupToError();
			expect("(hover-style:(font:'Skia'),(textstyle:'bold'))[]").markupToError();

			expect("(hover-style:(align:'==>'))[]").not.markupToError();
			expect("(hover-style:(background:black))[]").not.markupToError();
			expect("(hover-style:(css:'display:block'))[]").not.markupToError();
			expect("(hover-style:(font:'Skia'))[]").not.markupToError();
			expect("(hover-style:(text-colour:red))[]").not.markupToError();
			expect("(hover-style:(text-rotate:2))[]").not.markupToError();
		});
		it("applies the passed-in style only when hovering over the hook", function(done) {
			var hover = runPassage("(hover-style:(textstyle:'bold'))[garply]").find('tw-hook');
			hover.mouseenter();
			setTimeout(function() {
				expect(hover.attr('style')).toMatch(/font-weight:\s*(bold|800)/);
				hover.mouseleave();
				setTimeout(function() {
					expect(hover.attr('style')).not.toMatch(/font-weight:\s*(bold|800)/);
					done();
				});
			});
		});
		it("applies the style alongside existing styles", function(done) {
			var hover = runPassage("(hover-style:(textstyle:'bold'))+(text-color:'#ea1dac')[garply]").find('tw-hook');
			hover.mouseenter();
			setTimeout(function() {
				expect(hover.attr('style')).toMatch(/font-weight:\s*(bold|800)/);
				expect(hover).toHaveColour('#ea1dac');
				hover.mouseleave();
				done();
			});
		});
		it("removes the passed-in style when leaving the hook", function(done) {
			var hover = runPassage("(hover-style:(text-color:'#fadaba'))+(text-color:'#ea1dac')[garply]").find('tw-hook');
			setTimeout(function() {
				expect(hover).toHaveColour('#ea1dac');
				hover.mouseenter();
				setTimeout(function() {
					expect(hover).toHaveColour('#fadaba');
					hover.mouseleave();
					setTimeout(function() {
						expect(hover).toHaveColour('#ea1dac');
						done();
					});
				});
			});
		});
		it("errors if the passed-in changer isn't just a style changer", function() {
			expect("(hover-style:(replace:?1))[]").markupToError();
			expect("(hover-style:(if:true))[]").markupToError();
			expect("(hover-style:(t8n:'dissolve'))[]").markupToError();
			expect("(hover-style:(text-color:'red')+(hook:'E'))[]").markupToError();
		});
	});
	it("can compose arbitrarily deep", function(done) {
		var align = runPassage(
			"(set:$c1 to (align:'==>'))"
			+ "(set: $c2 to $c1 + (text-color:#400))"
			+ "(set: $c3 to $c2 + (text-color:#400))"
			+ "(set: $c4 to $c3 + (text-color:#400))"
			+ "(set: $c5 to $c4 + (text-color:#400))"
			+ "(set: $c6 to $c4 + (text-color:#400))"
			+ "(set: $c7 to $c6 + (text-color:#400))"
			+ "$c7[garply]"
		).find('tw-hook');
		setTimeout(function() {
			expect(align.css('text-align')).toBe('right');
			done();
		});
	});
});
