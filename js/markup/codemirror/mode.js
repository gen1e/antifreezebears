/*jshint strict:true*/
(function() {
	'use strict';
	/*
		First, a preamble of helpers.
		
		This is a copy of Utils.insensitiveName(), used to check macro names.
	*/
	const insensitiveName = (e) => (e + "").toLowerCase().replace(/-|_/g, "");
	
	/*
		This MACROS token is actually replaced with an object literal listing
		of the currently defined Harlowe macros at compile-time, from the metadata script.
	*/
	const macros = "MACROS";

	/*
		Produce an array of the macro names, using both their names and their aliases.
	*/
	const validMacros = macros instanceof Object && Object.keys(macros).reduce((a,e)=>a.concat(macros[e].name, ...macros[e].aka),[]).map(insensitiveName);

	/*
		Import the TwineMarkup lexer function, and store it locally.
	*/
	let lex;
	if(typeof define === 'function' && define.amd) {
		define('markup', [], (markup) => {
			lex = markup.lex;
		});
	}
	// Loaded as a story format in TwineJS
	else if (this && this.loaded && this.modules) {
		lex = this.modules.Markup.lex;
	}
	
	/*
		The mode is defined herein.
	*/
	window.CodeMirror && CodeMirror.defineMode('harlowe-2', () => {
		let cm, tree,
			// These caches are used to implement special highlighting when the cursor
			// rests on variables or hookRefs, such that all the other variable/hook
			// tokens are highlighted as well.
			referenceTokens = {
				variable: [],
				tempVariable: [],
				hook: [],
				hookRef: [],
				populate() {
					this.variable = [];
					this.tempVariable = [];
					this.hook = [];
					this.hookRef = [];

					const recur = (token) => {
						if (token.type === "variable" || token.type === "tempVariable"
								|| token.type === "hook" || token.type === "hookRef") {
							this[token.type].push(token);
						}
						token.children.forEach(recur);
					};
					tree.children.forEach(recur);
				}
			};
		
		/*
			This 'beforeChange' event handler applies a hack to CodeMirror to force it
			to rerender the entire text area whenever a change is made, not just the change.
			This allows 'backtrack' styling, such as unclosed brackets, to be possible
			under CodeMirror.
		*/
		function forceFullChange(changeObj, oldText) {
			if (!changeObj.update) {
				return;
			}
			/*
				First, obtain the text area's full text line array, truncated
				to just the line featuring the change.
			*/
			const line = changeObj.from.line;
			
			let newText = oldText
				.split('\n')
				.slice(0, changeObj.from.line + 1);
			
			/*
				Join it with the change's text.
			*/
			newText[line] =
				newText[line].slice(0, changeObj.from.ch)
				+ changeObj.text[0];
			
			/*
				If the change is multi-line, the additional lines should be added.
			*/
			newText = newText.concat(changeObj.text.slice(1));
			
			/*
				Now, register this change.
			*/
			changeObj.update({line:0, ch:0}, changeObj.to, newText);
			
			return newText.join('\n');
		}

		/*
			This 'cursorActivity' event handler applies CodeMirror marks based on
			the token that the cursor is resting on.
		*/
		let cursorMarks = [];
		function cursorMarking(doc) {
			if (cursorMarks.length) {
				cursorMarks.forEach(mark => mark.clear());
				cursorMarks = [];
			}
			const token = tree.tokenAt(doc.indexFromPos(doc.getCursor()));
			// If the cursor is at the end of the passage, or there is no text, then
			// the returned token will be null.
			if (!token) {
				return;
			}
			/*
				First, mark the containing token for the cursor's current position.
				This illuminates the boundaries between tokens, and provides makeshift
				bracket/closer matching.
			*/
			cursorMarks.push(doc.markText(
				doc.posFromIndex(token.start),
				doc.posFromIndex(token.end),
				{className: 'cm-harlowe-2-cursor'}
			));
			/*
				If the token is a variable or hookRef, then
				highlight certain other instances in the text.
				For variables, hooks and hookRefs, highlight all other occurrences of
				the variable in the passage text.
			*/
			if (token.type === "variable" || token.type === "tempVariable"
					|| token.type === "hookRef" || token.type === "hook") {
				// <hooks| should highlight matching ?hookRefs.
				const type = token.type === "hook" ? "hookRef" : token.type;
				referenceTokens[type].forEach(e => {
					if (e !== token && e.name === token.name) {
						cursorMarks.push(doc.markText(
							doc.posFromIndex(e.start),
							doc.posFromIndex(e.end),
							{className: 'cm-harlowe-2-variableOccurrence'}
						));
					}
				});
			}
			/*
				Also for hookRefs and hooks, highlight the nametags of the
				named hook(s) that match this one's name.
			*/
			if (token.type === "hookRef" || token.type === "hook") {
				referenceTokens.hook.forEach(e => {
					if (e !== token && e.name === token.name) {
						const tagStart =
							// This assumes that the end of the hook's text consists of its <tag|,
							// and nothing else.
							e.tagPosition === "appended" ? (e.end - e.name.length) - 1
							// This assumes that the start of the hook's text is its |tag>.
							: e.start + 1;

						cursorMarks.push(doc.markText(
							doc.posFromIndex(tagStart),
							doc.posFromIndex(tagStart + e.name.length),
							{className: 'cm-harlowe-2-hookOccurrence'}
						));
					}
				});
			}
		}
		
		let init = () => {
			const doc = cm.doc;
			/*
				Use the Harlowe lexer to compute a full parse tree.
			*/
			tree = lex(doc.getValue());
			referenceTokens.populate();

			/*
				Attach the all-important beforeChanged event, but make sure it's only attached once.
				Note that this event is removed by TwineJS when it uses swapDoc to dispose of old docs.
			*/
			doc.on('beforeChange', (_, change) => {
				const oldText = doc.getValue();
				forceFullChange(change, oldText);
			});
			doc.on('change', () => {
				const text = doc.getValue();
				tree = lex(text);
				// Populate the referential tokens caches.
				referenceTokens.populate();
			});
			doc.on('swapDoc', init);
			doc.on('cursorActivity', cursorMarking);
			init = null;
		};
		
		return {
			/*
				The startState is vacant because all of the computation is done
				inside token().
			*/
			startState() {
				if (!cm) {
					/*
						CodeMirror doesn't allow modes to have full access to the text of
						the document. This hack overcomes this respectable limitation:
						TwineJS's PassageEditor stashes a reference to the CodeMirror instance in
						the Harlowe modes object - and here, we retrieve it.
					*/
					cm = CodeMirror.modes['harlowe-2'].cm;
					cm.setOption('placeholder', [
						"Enter the body text of your passage here.",
						"''Bold'', //italics//, ^^superscript^^, ~~strikethrough~~, and <p>HTML tags</p> are available.",
						"To display special symbols without them being transformed, put them between `backticks`.",
						"To link to another passage, write the link text and the passage name like this: [[link text->passage name]]\nor this: [[passage name<-link text]]\nor this: [[link text]].",
						"Macros like (set:) and (display:) are the programming of your passage. If you've (set:) a $variable, you can just enter its name to print it out.",
						"To make a 'hook', put [single square brackets] around text - or leave it empty [] - then put a macro like (if:), a $variable, or a |nametag> outside the front, |like>[so].",
						"Hooks can be used for many things: showing text (if:) something happened, applying a (text-style:), making a place to (append:) text later on, and much more!",
						"Consult the Harlowe documentation for more information.",
						].join('\n\n'));
					/*
						Line numbers aren't important for a primarily prose-based form as passage text,
						but it's good to have some UI element that distinguishes new lines from
						wrapped lines. So, we use the CM lineNumbers gutter with only bullets in it.
					*/
					cm.setOption('lineNumbers', true);
					cm.setOption('lineNumberFormatter', () => "\u2022");
				}
				
				return {
					pos: 0,
				};
			},
			blankLine(state) {
				state.pos++;
			},
			token: function token(stream, state) {
				if (init) {
					init();
				}
				/*
					We must render each token using the cumulative styles of all parent tokens
					above it. So, we obtain the full path.
				*/
				const currentBranch = tree.pathAt(state.pos);
				// The path is deepest-first - the bottom token is at 0.
				const currentToken = currentBranch[0];
				
				/*
					If, say, the doc had no text in it, the currentToken would be null.
					In which case, quit early.
				*/
				if (!currentToken) {
					state.pos++;
					stream.next();
					return null;
				}
				/*
					Advance pos until the end of this token. This is determined by either:
					- the pos reaching the current token's end,
					- the currentToken's children suddenly appearing as the deepest
					token at the pos.
					- the pos reaching the line's end,
					currentToken.tokenAt() handles the first and second cases.
				*/
				while(currentToken === currentToken.tokenAt(state.pos)
						&& !stream.eol()) {
					state.pos++;
					stream.next();
				}
				if (stream.eol()) {
					state.pos++;
				}
				/*
					For performance paranoia, this is a plain for-loop.
				*/
				let counts = {};
				let ret = '';
				for (let i = 0; i < currentBranch.length; i+=1) {
					const type = currentBranch[i].type;
					let name = "harlowe-2-" + type;
					counts[name] = (counts[name] || 0) + 1;
					// If this name has been used earlier in the chain, suffix
					// this name with an additional number.
					if (counts[name] > 1) {
						name += "-" + (counts[name]);
					}
					switch(type) {
						/*
							Use the error style if the macro's name doesn't match the list of
							existant Harlowe macros.
						*/
						case "macroName":
							if (validMacros.indexOf(insensitiveName(currentBranch[i].text.slice(0,-1))) === -1) {
								name += " harlowe-2-error";
							}
							break;
					}
					ret += name + " ";
				}
				return ret;
			},
		};
	});
	/*
		In order to provide styling to the Harlowe mode, CSS must be dynamically injected
		when the mode is defined. This is done now, by creating a <style> element with ID
		"cm-harlowe" and placing our CSS in it.
	*/
	/*
		If the style element already exists, it is reused. Otherwise, it's created.
		(Let's use pure DOM calls in the absence of a jQuery require() call.)
	*/
	let harloweStyles = document.querySelector('style#cm-harlowe-2');
	if (!harloweStyles) {
		harloweStyles = document.createElement('style');
		harloweStyles.setAttribute('id','cm-harlowe-2');
		document.head.appendChild(harloweStyles);
	}
	/*
		This large function dynamically constructs a CSS string containing all of
		the styles used by the editor. Each property in the returned object indirectly maps to
		a CSS selector, and the value maps directly to CSS attributes assigned by the selector.
	*/
	harloweStyles.innerHTML = (() => {
		const
			nestedBG     = (h,s,l) => e => "background-color: hsla(" + h + "," + s + "%," + l + "%," + e +");",
			warmHookBG   = nestedBG(40, 100, 50),
			coolHookBG   = nestedBG(220, 100, 50),
			macro        = percent => nestedBG(320, 44, 50)(percent) + "color: #a84186;",
			invalid      = "color: firebrick !important; background-color: hsla(17, 100%, 74%, 0.74) !important;",
			intangible   = "font-weight:100; color: hsla(0,0,0,0.5)";
		
		/*
			If a property includes commas, then it's a multiple-name selector.
			It will be converted to "[selector], [selector]" etc.
		*/
		return {
			root: 'box-sizing:border-box;',

			// The cursor token highlight should ignore the most common tokens, unwrapped text tokens.
			"cursor:not([class^='cm-harlowe-2-text cm-harlowe-2-root'])":
				"border-bottom: 2px solid darkgray;",

			CodeMirror: "padding: 0 !important",

			// The line number bullets (see the lineNumbers option, above), are a bit too dark by default.
			"CodeMirror-linenumber": "color: #ccc;",
			// Also, the gutters sometimes encroach on the text area for some reason.
			"CodeMirror-gutters": "left: 0px !important;",

			// "Warm" hooks
			hook:        warmHookBG(0.05),
			"hook-2":    warmHookBG(0.1),
			"hook-3":    warmHookBG(0.15),
			"hook-4":    warmHookBG(0.2),
			"hook-5":    warmHookBG(0.25),
			"hook-6":    warmHookBG(0.3),
			"hook-7":    warmHookBG(0.35),
			"hook-8":    warmHookBG(0.4),
			
			// This space prevents the selector from matching hookRef as well.
			"^=hook , ^=hook-":
				"font-weight:bold;",
			
			//TODO: whitespace within collapsed
			"error:not([class*='cm-harlowe-2-string'])":
				invalid,
			
			macro:        macro(0.05),
			"macro-2":    macro(0.1),
			"macro-3":    macro(0.15),
			"macro-4":    macro(0.2),
			"macro-5":    macro(0.25),
			"macro-6":    macro(0.3),
			"macro-7":    macro(0.35),
			"macro-8":    macro(0.4),

			macroName:
				"font-style:italic;",

			// The bottommost element is a macro open/close bracket
			"^=macro ":
				"font-weight:bold;",

			"bold, strong":
				"font-weight:bold;",

			"italic, em":
				"font-style:italic;",

			"sup":
				"vertical-align: super;font-size:0.8em;",

			"strike":
				"text-decoration: line-through;",

			"verbatim":
				"background-color: hsla(0,0%,50%,0.1);",

			"^=bold, ^=strong, ^=italic, ^=em, ^=sup, ^=verbatim, ^=strike":
				intangible,

			// These two rules implement "fake smart quotes", which should
			// more easily convey strings' boundaries.
			"^=string":
				"font-style:italic; display:inline-block; transform: scaleX(-1);",

			"string + ^=string":
				"transform: none;",

			"^=collapsed":
				"font-weight:bold; color: hsl(201, 100%, 30%);",
			
			// "Cool" hooks
			// These are a combination of hooks and collapsed
			"collapsed":           coolHookBG(0.025),
			"collapsed.hook":      coolHookBG(0.05),
			"collapsed.hook-2":    coolHookBG(0.1),
			"collapsed.hook-3":    coolHookBG(0.15),
			"collapsed.hook-4":    coolHookBG(0.2),
			"collapsed.hook-5":    coolHookBG(0.25),
			"collapsed.hook-6":    coolHookBG(0.3),
			"collapsed.hook-7":    coolHookBG(0.35),
			"collapsed.hook-8":    coolHookBG(0.4),
			
			"twineLink:not(.text)":
				"color: #3333cc;",
			tag:
				"color: #4d4d9d;",
			
			boolean:
				"color: #626262;",
			string:
				"color: #008282;",
			number:
				"color: #A15000;",
			variable:
				"color: #0076b2;",
			tempVariable:
				"color: #1a6e97;",
			hookRef:
				"color: #007f54;",
			"variableOccurrence, hookOccurrence":
				"background: #9fdfc9 !important;",

			where:
				"color: #007f00; font-style:italic;",
			via:
				"color: #007f00; font-style:italic;",
			with:
				"color: #007f00; font-style:italic;",
			making:
				"color: #007f00; font-style:italic;",
			each:
				"color: #007f00; font-style:italic;",
			
			heading:
				"font-weight:bold;",
			hr:
				"display:block; background-image: linear-gradient(0deg, transparent, transparent 45%, silver 45%, transparent 55%, transparent);",
			align:
				"display:block; color: hsl(14, 99%, 37%); background-color: hsla(14, 99%, 87%, 0.2);",
			column:
				"display:block; color: hsl(204, 99%, 37%); background-color: hsla(204, 99%, 87%, 0.2);",
			
			escapedLine:
				"font-weight:bold; color: hsl(51, 100%, 30%);",
			
			"identifier, property, belongingProperty, itsProperty, belongingItProperty, belongingItOperator":
				"color: #0076b2;",
			
			toString() {
				return Object.keys(this).reduce((a,e) => {
					var selector;
					if (e === 'toString') {
						return a;
					}
					if (e.slice(0,10) === "CodeMirror") {
						return a + "." + e + "{" + this[e] + "}";
					}
					/*
						Comma-containing names are handled by splitting them here,
						and then re-joining them. If the property lacks a comma,
						then this merely creates an array of 1 element and runs .map()
						on that.
					*/
					selector = e.split(", ")
						/*
							This does a few things:
							- It converts sequential selectors (separated by a dot).
							- It adds the cm- CodeMirror prefix to the CSS classes.
							- It adds the harlowe- storyformat prefix as well.
							- It converts the keys to a selector (by consequence of the above)
							and the values to a CSS body.
						*/
						.map(function map(e) {
							if (e.indexOf('.') > -1) {
								return e.split(/\./g).map(map).join('');
							}
							if (e.indexOf(" + ") > -1) {
								return e.split(/ \+ /g).map(map).join(' + ');
							}
							// There's no need for $= because that will always be cm-harlowe-root or cm-harlowe-cursor.
							if (e.indexOf("^=") === 0) {
								return "[class^='cm-harlowe-2-" + e.slice(2) + "']";
							}
							return ".cm-harlowe-2-" + e;
						});
					return a + selector.join(', ') + "{" + this[e] + "}";
				}, '');
			},
		} + "";
	})();
}.call(eval('this')));
