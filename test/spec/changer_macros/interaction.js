describe("interaction macros", function() {
	'use strict';
	[{
		name: 'click',
		entity: 'link',
		action: 'click',
		cssClass: 'enchantment-link',
		eventMethod: 'click',
	},
	{
		name: 'mouseover',
		entity: 'mouseover-region',
		action: 'mouseover',
		cssClass: 'enchantment-mouseover',
		eventMethod: 'mouseenter',
	}].forEach(function(e) {
		describe("(" + e.name + ":)", function() {
			it("accepts either 1 hookset or 1 non-empty string", function() {
				expect("(print:(" + e.name + ":?foo))").not.markupToError();
				expect("(print:(" + e.name + ":'baz'))").not.markupToError();

				expect("(print:(" + e.name + ":?foo, ?bar))").markupToError();
				expect("(print:(" + e.name + ":?foo, 'baz'))").markupToError();
				expect("(print:(" + e.name + ":'baz', 'baz'))").markupToError();
				expect("(print:(" + e.name + ":''))").markupToError();
			});
			it("errors when placed in passage prose while not attached to a hook", function() {
				expect("(" + e.name + ":?foo)").markupToError();
				expect("(" + e.name + ":?foo)[]").not.markupToError();
			});
			describe("given a single hook", function() {
				it("enchants the selected hook as a " + e.action, function() {
					var p = runPassage("[cool]<foo|(" + e.name + ":?foo)[]").find('tw-enchantment');
					expect(p.length).toBe(1);
					expect(p.hasClass(e.cssClass)).toBe(true);
				
					p = runPassage("(" + e.name + ":?foo)[][cool]<foo|").find('tw-enchantment');
					expect(p.length).toBe(1);
					expect(p.hasClass(e.cssClass)).toBe(true);
				});
				it("renders the attached hook when the enchantment is " + e.action + "ed", function() {
					var p = runPassage("[cool]<foo|(" + e.name + ":?foo)[beans]");
					expect(p.text()).toBe("cool");
					p.find('tw-enchantment')[e.eventMethod]();
					expect(p.text()).toBe("coolbeans");
				});
				it("disenchants the selected hook when the enchantment is " + e.action + "ed", function() {
					var p = runPassage("[cool]<foo|(" + e.name + ":?foo)[beans]");
					expect(p.text()).toBe("cool");
					p.find('tw-enchantment')[e.eventMethod]();
					expect(p.find('tw-enchantment').length).toBe(0);
				});
				it("nested enchantments are triggered one by one", function() {
					var p = runPassage("[[cool]<foo|]<bar|(" + e.name + ":?foo)[beans](" + e.name + ":?bar)[lake]");
					expect(p.text()).toBe("cool");
					p.find('tw-enchantment').first()[e.eventMethod]();
					expect(p.text()).toBe("coollake");
					p.find('tw-enchantment').first()[e.eventMethod]();
					expect(p.text()).toBe("coolbeanslake");
				});
				it("affects hooks inside other hooks", function() {
					var p = runPassage("(if:true)[[cool]<foo|](" + e.name + ":?foo)[beans]").find('tw-enchantment');
					expect(p.length).toBe(1);
					expect(p.hasClass(e.cssClass)).toBe(true);
				});
				if (e.name === "click") {
					it("gives affected hooks a tabindex", function() {
						var p = runPassage("[cool]<foo|(" + e.name + ":?foo)[]").find('tw-enchantment');
						expect(p.attr('tabindex')).toBe('0');
					});
					describe("with ?Page", function() {
						it("enchants the <tw-story> element with the 'enchantment-clickblock' class", function() {
							runPassage("(click:?Page)[1]");
							var e = $('tw-story').parent('tw-enchantment.enchantment-clickblock');
							expect(e.length).toBe(1);
						});
						it("does this even when targeting other hooks", function() {
							var p = runPassage("[cool]<page|(click:?Page)[1]");
							expect(p.find('tw-enchantment').length).toBe(1);
							var e = $('tw-story').parent('tw-enchantment.enchantment-clickblock');
							expect(e.length).toBe(1);
						});
						it("enchants the <tw-story> with a box-shadow", function() {
							runPassage("(click:?Page)[1]");
							var e = $('tw-story').parent();
							// We can't expect to get more precise than this, unfortunately.
							expect(e.css('box-shadow')).toMatch("inset");
							expect(e.css('display')).toBe('block');
						});
						it("multiple enchantments are triggered in order", function() {
							var p = runPassage(
								"(click:?Page)[1]"
								+ "(click:?Page)[2]"
								+ "(click:?Page)[3]");
							$('tw-story').click();
							expect(p.text()).toBe("1");
							$('tw-story').click();
							expect(p.text()).toBe("12");
							$('tw-story').click();
							expect(p.text()).toBe("123");
						});
						it("gives it a tabindex", function() {
							runPassage("(click:?Page)[1]");
							var p = $('tw-story').parent('tw-enchantment.enchantment-clickblock');
							expect(p.attr('tabindex')).toBe('0');
						});
					});
					// TODO: with ?Sidebar and ?Passage
				}
			});
			describe("given multiple hooks", function() {
				it("enchants each selected hook as a link", function() {
					var p = runPassage("[very]<foo|[cool]<foo|(" + e.name + ":?foo)[]").find('tw-enchantment');
					expect(p.length).toBe(2);
					p = runPassage("(" + e.name + ":?foo)[][very]<foo|[cool]<foo|").find('tw-enchantment');
					expect(p.length).toBe(2);
				});
				it("renders the attached hook when either enchantment is " + e.action + "ed", function() {
					['first','last'].forEach(function(f) {
						var p = runPassage("[very]<foo|[cool]<foo|(" + e.name + ":?foo)[beans]");
						expect(p.text()).toBe("verycool");
						p.find('tw-enchantment')[f]()[e.eventMethod]();
						expect(p.text()).toBe("verycoolbeans");
					});
				});
				it("disenchants all selected hooks when the enchantment is " + e.action + "ed", function() {
					['first','last'].forEach(function(f) {
						var p = runPassage("[very]<foo|[cool]<foo|(" + e.name + ":?foo)[beans]");
						p.find('tw-enchantment')[f]()[e.eventMethod]();
						expect(p.find('tw-enchantment').length).toBe(0);
					});
				});
				it("enchants additional matching hooks added to the passage", function() {
					var p = runPassage("[very]<foo|(" + e.name + ":?foo)[](link:)[[cool]<foo|]");
					p.find('tw-expression[name=link]').click();
					expect(p.find('tw-enchantment').length).toBe(2);
				});
			});
			describe("given strings", function() {
				it("enchants each found string in the passage", function() {
					var p = runPassage("wow(" + e.name + ":'wow')[]wow").find('tw-enchantment');
					expect(p.length).toBe(2);
					expect(p.hasClass(e.cssClass)).toBe(true);
				});
				it("renders the attached hook when any enchanted string is " + e.action + "ed", function() {
					['first','last'].forEach(function(f) {
						var p = runPassage("wow(" + e.name + ":'wow')[ gosh ]wow");
						expect(p.text()).toBe("wowwow");
						p.find('tw-enchantment')[f]()[e.eventMethod]();
						expect(p.text()).toBe("wow gosh wow");
					});
				});
				it("disenchants all selected strings when the enchantment is " + e.action + "ed", function() {
					['first','last'].forEach(function(f) {
						var p = runPassage("wow(" + e.name + ":'wow')[ gosh ]wow");
						p.find('tw-enchantment')[f]()[e.eventMethod]();
						expect(p.find('tw-enchantment').length).toBe(0);
					});
				});
				it("nested enchantments are triggered one by one", function() {
					var p = runPassage("wow(" + e.name + ":'wow')[gosh](" + e.name + ":'w')[geez]");
					expect(p.text()).toBe("wow");
					p.find('tw-enchantment').first()[e.eventMethod]();
					expect(p.text()).toBe("wowgosh");
					p.find('tw-enchantment').first()[e.eventMethod]();
					expect(p.text()).toBe("wowgoshgeez");
				
					p = runPassage("wow(" + e.name + ":'w')[gosh](" + e.name + ":'wow')[geez]");
					expect(p.text()).toBe("wow");
					p.find('tw-enchantment').first()[e.eventMethod]();
					expect(p.text()).toBe("wowgosh");
					p.find('tw-enchantment').first()[e.eventMethod]();
					expect(p.text()).toBe("wowgoshgeez");
				});
				it("enchants additional matching strings added to the passage", function() {
					var p = runPassage("wow(" + e.name + ":'wow')[](link:'A')[wow]");
					p.find('tw-link').click();
					expect(p.find('tw-enchantment').length).toBe(2);
				});
			});
		});
	});
});
