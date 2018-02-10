"use strict";
define([
	'jquery',
	'utils',
	'utils/selectors',
	'renderer',
	'twinescript/environ',
	'twinescript/operations',
	'state',
	'utils/operationutils',
	'datatypes/changercommand',
	'datatypes/hookset',
	'datatypes/colour',
	'internaltypes/changedescriptor',
	'internaltypes/varscope',
	'internaltypes/twineerror',
	'internaltypes/twinenotifier',
],
($, Utils, Selectors, Renderer, Environ, Operations, State, {printBuiltinValue,objectName}, ChangerCommand, HookSet, Colour, ChangeDescriptor, VarScope, TwineError, TwineNotifier) => {

	let Section;

	/*
		Section objects represent a block of Twine source rendered into the DOM.
		It contains its own DOM, a reference to any enclosing Section,
		and methods and properties related to invoking TwineScript code within it.
		
		The big deal of having multiple Section objects (and the name Section itself
		as compared to "passage" or "screen") is that multiple simultaneous passages'
		(such as stretchtext mode) code can be hygenically scoped. Hook references
		in one passage cannot affect another, and so forth. (This hygeine is currently
		not implemented, however, as neither is stretchtext.)

		After a section has finished rendering, one can expect it to be discarded.
		The following things allow a section object to persist:
		* Live hook macros (until they deactivate themselves when the section is removed from the DOM)
		* Saved (enchant:), (link-goto:) and other macros.
	*/
	
	/*
		Apply the result of a <tw-expression>'s evaluation to the next hook.
		If the result is a changer command, live command or boolean, this will cause the hook
		to be rendered differently.

		@param {jQuery} The <tw-expression> element.
		@param {Any} The result of running the expression.
		@param {jQuery} The next <tw-hook> element, passed in solely to save re-computing it.
	*/
	function applyExpressionToHook(expr, result, nextHook) {
		/*
			If result is a ChangerCommand, please run it.
		*/
		if (result && typeof result === "object" && result.changer) {
			const enabled = this.renderInto(
				/*
					The use of popAttr prevents the hook from executing normally
					if it wasn't actually the eventual target of the changer function.
				*/
				nextHook.popAttr('source'),
				/*
					Don't forget: nextHook may actually be empty.
					This is acceptable - the result changer could alter the
					target appropriately.
				*/
				nextHook,
				result
			);

			if (!enabled) {
				const name = Utils.insensitiveName(expr.attr('name'));
				/*
					The 'false' class is used solely by debug mode to visually denote
					that a macro such as (if:) (but not (hidden:)) suppressed a hook.
				*/
				if (["if", "elseif", "unless", "else"].includes(name)) {
					expr.addClass("false");
					/*
						Unfortunately, (else-if:) must be special-cased, so that it doesn't affect
						lastHookShown, instead preserving the value of the original (if:).
					*/
					if (name !== "elseif") {
						this.stack[0].lastHookShown = false;
					}
				}
				return;
			}
		}
		/*
			Else, if it's a live macro, please run that.
		*/
		else if (result && typeof result === "object" && result.live) {
			runLiveHook.call(this, nextHook, result.delay, result.event);
		}
		/*
			And finally, the false case.
			This is special: as it prevents hooks from being run, an (else:)
			that follows this will pass.
		*/
		else if (result === false) {
			/*
				Just as in ChangeDescriptor.render(), suppressing a hook will move
				its source into a 'hiddenSource' data store.
			*/
			if (nextHook.attr('source')) {
				nextHook.data('hiddenSource', nextHook.popAttr('source'));
			}
			expr.addClass("false");
			
			this.stack[0].lastHookShown = false;
			return;
		}
		/*
			Any other values that aren't primitive true should result in runtime errors
			when attached to hooks.
		*/
		else if (result !== true) {
			expr.replaceWith(TwineError.create("datatype",
					objectName(result) + " cannot be attached to this hook.",
					"Only Booleans, changer commands, and the (live:) macro can be attached to hooks."
				).render(expr.attr('title')));
		}
		/*
			The (else:) and (elseif:) macros require a little bit of state to be
			saved after every hook interaction: whether or not the preceding hook
			was shown or hidden by the attached expression.
			Sadly, we must oblige with this overweening demand.
		*/
		this.stack[0].lastHookShown = true;
	}
	
	/*
		This function selects the next sibling element which isn't a whitespace text node,
		nor a <br>. It also returns the intervening whitespace.
	*/
	function nextNonWhitespace(e) {
		const {nextSibling} = (e instanceof $ ? e[0] : e);
		if (nextSibling &&
				((nextSibling instanceof Text && !nextSibling.textContent.trim())
				|| (nextSibling.tagName || '').toLowerCase() === "br")) {

			const { whitespace, nextElem } = nextNonWhitespace(nextSibling);
			return { whitespace: $(nextSibling).add(whitespace), nextElem };
		}
		return { whitespace: $(), nextElem: $(nextSibling) };
	}
	
	/*
		Run a newly rendered <tw-expression> element's code, obtain the resulting value,
		and apply it to the next <tw-hook> element, if present.
		
		@param {jQuery} The <tw-expression> to run.
	*/
	function runExpression(expr) {
		/*
			Execute the expression, and obtain its result value.
		*/
		let result = this.eval(expr.popAttr('js') || '');

		/*
			Consecutive changer expressions, separated with "+" and followed by a hook,
			will "chain up" into a single command, which is then applied to that hook.

			As long as the result is a changer, it may link up with an expression following it
			if a "+" is placed between them.

			Note: If the result isn't a changer at all, then it might be another kind of value
			(a boolean, or a (live:) command) which still can be attached, but not chained.
		*/
		let whitespace, nextElem, nextHook = $();
		nextElem = expr;

		while(ChangerCommand.isPrototypeOf(result)) {
			/*
				Check if the next non-whitespace element is a +, or an anonymous hook.
			*/
			({whitespace, nextElem} = nextNonWhitespace(nextElem));
			if (nextElem[0] instanceof Text && nextElem[0].textContent.trim() === "+") {
				/*
					Having found a +, we must confirm the non-ws element after it is an expression.
				*/
				let whitespaceAfter, plusMark = nextElem;
				({whitespace:whitespaceAfter, nextElem} = nextNonWhitespace(plusMark));
				if (nextElem.is(Selectors.expression)) {
					/*
						It's an expression - we can join them.
						Add the expressions, and remove the interstitial + and whitespace.
					*/
					const nextValue = this.eval(nextElem.popAttr('js'));
					/*
						(But, don't join them if the nextValue contains its own error.)
					*/
					if (TwineError.containsError(nextValue)) {
						result = nextValue;
						break;
					}
					const newResult = Operations["+"](result, nextValue);
					$(whitespace).add(plusMark).add(whitespaceAfter).remove();
					/*
						If this causes result to become an error, create a new error with a more appropriate
						message.
					*/
					if (TwineError.containsError(newResult)) {
						result = TwineError.create("operation",
							"I can't combine " + objectName(result) + " with " + objectName(nextValue) + "."
						);
					}
					else {
						result = newResult;
					}
					continue;
				}
				/*
					If the next element wasn't an expression, fall down to the error below.
				*/
			}
			if (nextElem.is(Selectors.hook)) {
				/*
					If it's an anonymous hook, apply the summed changer to it
					(and remove the whitespace).
				*/
				whitespace.remove();
				nextHook = nextElem;
				break;
			}
			/*
				If it's neither hook nor expression, then this evidently isn't connected to
				a hook at all. Produce an error.
			*/
			expr.replaceWith(TwineError.create("syntax",
				"The (" + result.macroName + ":) command should be assigned to a variable or attached to a hook.",
				"Macros like this should appear to the left of a hook: " + expr.attr('title') + "[Some text]"
			).render(expr.attr('title')));
			break;
		}
		/*
			IF the above loop wasn't entered at all (i.e. the result wasn't a changer) then an error may
			be called for. For now, obtain the next hook anyway.
		*/
		nextHook = nextHook.length ? nextHook : nextNonWhitespace(expr).nextElem.filter(Selectors.hook);

		/*
			Print any error that resulted.
			This must of course run after the sensor/changer function was run,
			in case that provided an error.
		*/
		let error;
		if ((error = TwineError.containsError(result))) {
			if (error instanceof Error) {
				error = TwineError.fromError(error);
			}
			expr.replaceWith(error.render(expr.attr('title'), expr));
		}
		/*
			If we're in debug mode, a TwineNotifier may have been sent.
			In which case, print that *inside* the expr, not replacing it.
		*/
		else if (TwineNotifier.isPrototypeOf(result)) {
			expr.append(result.render());
		}
		/*
			Print the expression if it's a string, number, data structure,
			or is a non-changer command of some kind.
		*/
		else if (
				/*
					If it's plain data, it shouldn't be attached to a hook.
					If it was attached, an error should be produced
					(by applyExpressionToHook) to clue the author into the correct attachable types.
				*/
				(!nextHook.length &&
				(typeof result === "string"
				|| typeof result === "number"
				|| result instanceof Map
				|| result instanceof Set
				|| Array.isArray(result)
				|| Colour.isPrototypeOf(result)))
				//  However, commands will cleanly "detach" without any error resulting.
				|| (result && result.TwineScript_Print && !result.changer)) {
			/*
				TwineScript_Print(), when called by printBuiltinValue(), typically emits
				side-effects. These will occur... now.
			*/
			result = printBuiltinValue(result);
			
			/*
				If TwineScript_Print returns an object of the form { earlyExit },
				then that's a signal to cease all further expression evaluation
				immediately.
			*/
			if (result.earlyExit) {
				return "earlyexit";
			}
			/*
				On rare occasions (specifically, when the passage component
				of the link syntax produces an error) TwineScript_Print()
				returns a jQuery of the <tw-error>.
			*/
			else if (result instanceof $) {
				expr.append(result);
			}
			/*
				Alternatively (and more commonly), TwineScript_Print() can
				return an Error object.
			*/
			else if (TwineError.containsError(result)) {
				if (result instanceof Error) {
					result = TwineError.fromError(result);
				}
				expr.replaceWith(result.render(expr.attr('title'), expr));
			}
			else {
				/*
					Transition the resulting Twine code into the expression's element.
				*/
				this.renderInto(result, expr);
			}
		}
		else if (nextHook.length) {
			applyExpressionToHook.call(this, expr, result, nextHook);
		}
		/*
			The only remaining values should be unattached changers, or booleans.
		*/
		else if (!(result.changer || typeof result === "boolean")) {
			Utils.impossible('Section.runExpression', "The expression evaluated to an unknown value: " + result.toSource());
		}
	}
	
	/*
		This quick memoized feature test checks if the current platform supports Node#normalize().
	*/
	const supportsNormalize = (() => {
		let result;
		return () => {
			if (result !== undefined) {
				return result;
			}
			const p = $('<p>');
			/*
				If the method is absent, then...
			*/
			if (!p[0].normalize) {
				return (result = false);
			}
			/*
				There are two known normalize bugs: not normalising text ranges containing a hyphen,
				and not normalising blank text nodes. This attempts to discern both bugs.
			*/
			p.append(document.createTextNode("0-"),document.createTextNode("2"),document.createTextNode(""))
				[0].normalize();
			return (result = (p.contents().length === 1));
		};
	})();

	/*
		Both of these navigates up the tree to find the nearest text node outside this element,
		earlier or later in the document.
		These return an unwrapped Text node, not a jQuery.
	*/
	function prevParentTextNode(e) {
		const elem = e.first()[0],
			parent = e.parent();
		/*
			Quit early if there's no parent.
		*/
		if (!parent.length) {
			return null;
		}
		/*
			Get the parent's text nodes, and obtain only the last one which is
			earlier (or later, depending on positionBitmask) than this element.
		*/
		let textNodes = parent.textNodes().filter((e) => {
			const pos = e.compareDocumentPosition(elem);
			return pos & 4 && !(pos & 8);
		});
		textNodes = textNodes[textNodes.length-1];
		/*
			If no text nodes were found, look higher up the tree, to the grandparent.
		*/
		return !textNodes ? prevParentTextNode(parent) : textNodes;
	}
	
	function nextParentTextNode(e) {
		const elem = e.last()[0],
			parent = e.parent();
		/*
			Quit early if there's no parent.
		*/
		if (!parent.length) {
			return null;
		}
		/*
			Get the parent's text nodes, and obtain only the last one which is
			earlier (or later, depending on positionBitmask) than this element.
		*/
		const textNodes = parent.textNodes().filter((e) => {
			const pos = e.compareDocumentPosition(elem);
			return pos & 2 && !(pos & 8);
		})[0];
		/*
			If no text nodes were found, look higher up the tree, to the grandparent.
		*/
		return !textNodes ? nextParentTextNode(parent) : textNodes;
	}

	/*
		<tw-collapsed> elements should collapse whitespace inside them in a specific manner - only
		single spaces between non-whitespace should remain.
		This function performs this transformation by modifying the text nodes of the passed-in element.

		@param {jQuery} The element whose whitespace must collapse.
	*/
	function collapse(elem) {
		/*
			A .filter() callback which removes nodes inside a <tw-verbatim>,
			a replaced <tw-hook>, or a <tw-expression> element, unless it is also inside a
			<tw-collapsed> inside the <tw-expression>. Used to prevent text inside those
			elements from being truncated.
		*/
		function noVerbatim(e) {
			/*
				The (this || e) dealie is a kludge to support its use in a jQuery
				.filter() callback as well as a bare function.
			*/
			return $(this || e).parentsUntil('tw-collapsed')
				.filter('tw-verbatim, tw-expression, '
					/*
						Also, remove nodes that have collapsing=false on their parent elements,
						which is currently (June 2015) only used to denote hooks whose contents were (replace:)d from
						outside the collapsing syntax - e.g. {[]<1|}(replace:?1)[Good  golly!]
					*/
					+ '[collapsing=false]')
				.length === 0;
		}
		/*
			We need to keep track of what the previous and next exterior text nodes are,
			but only if they were also inside a <tw-collapsed>.
		*/
		let beforeNode = prevParentTextNode(elem);
		if (!$(beforeNode).parents('tw-collapsed').length) {
			beforeNode = null;
		}
		let afterNode = nextParentTextNode(elem);
		if (!$(afterNode).parents('tw-collapsed').length) {
			afterNode = null;
		}
		/*
			- If the node contains <br>, replace with a single space.
		*/
		elem.findAndFilter('br:not([data-raw])')
			.filter(noVerbatim)
			.replaceWith(document.createTextNode(" "));
		/*
			Having done that, we can now work on the element's nodes without concern for modifying the set.
		*/
		const nodes = elem.textNodes();
		
		/*
			This is part of an uncomfortable #kludge used to determine whether to
			retain a final space at the end, by checking how much was trimmed from
			the finalNode and lastVisibleNode.
		*/
		let finalSpaces = 0;
		
		nodes.reduce((prevNode, node) => {
			/*
				- If the node is inside a <tw-verbatim> or <tw-expression>, regard it as a solid Text node
				that cannot be split or permuted. We do this by returning a new, disconnected text node,
				and using that as prevNode in the next iteration.
			*/
			if (!noVerbatim(node)) {
				return document.createTextNode("A");
			}
			/*
				- If the node contains runs of whitespace, reduce all runs to single spaces.
				(This reduces nodes containing only whitespace to just a single space.)
			*/
			node.textContent = node.textContent.replace(/\s+/g,' ');
			/*
				- If the node begins with a space and previous node ended with whitespace or is empty, trim left.
				(This causes nodes containing only whitespace to be emptied.)
			*/
			if (node.textContent[0] === " "
					&& (!prevNode || !prevNode.textContent || prevNode.textContent.search(/\s$/) >-1)) {
				node.textContent = node.textContent.slice(1);
			}
			return node;
		}, beforeNode);
		/*
			- Trim the rightmost nodes up to the nearest visible node.
			In the case of { <b>A </b><i> </i> }, there are 3 text nodes that need to be trimmed.
			This uses [].every to iterate up until a point.
		*/
		[...nodes].reverse().every((node) => {
			if (!noVerbatim(node)) {
				return false;
			}
			// If this is the last visible node, merely trim it right, and return false;
			if (!node.textContent.match(/^\s*$/)) {
				node.textContent = node.textContent.replace(/\s+$/, (substr) => {
					finalSpaces += substr.length;
					return '';
				});
				return false;
			}
			// Otherwise, trim it down to 0, and set finalSpaces
			else {
				finalSpaces += node.textContent.length;
				node.textContent = "";
				return true;
			}
		});
		/*
			- If the afterNode is present, and the previous step removed whitespace, reinsert a single space.
			In the case of {|1>[B ]C} and {|1>[''B'' ]C}, the space inside ?1 before "C" should be retained.
		*/
		if (finalSpaces > 0 && afterNode) {
			nodes[nodes.length-1].textContent += " ";
		}
		/*
			Now that we're done, normalise the nodes.
			(But, certain browsers' Node#normalize may not work,
			in which case, don't bother at all.)
		*/
		elem[0] && supportsNormalize() && elem[0].normalize();
	}
	
	/*
		A live hook is one that has the (live:) macro attached.
		It repeatedly re-renders, allowing a passage to have "live" behaviour.
		
		This is exclusively called by runExpression().
		
		@param {jQuery} The <tw-hook>.
		@param {Number} The timeout delay.
	*/
	function runLiveHook(target, delay) {
		/*
			Remember the code of the hook.
			
			(We also remove (pop) the code from the hook
			so that doExpressions() doesn't render it.)
		*/
		const source = target.popAttr('source') || "";
		
		/*
			Default the delay to 20ms if none was given.
		*/
		delay = (delay === undefined ? 20 : delay);
		
		/*
			This closure runs every frame from now on, until
			the target hook is gone.
			
			Notice that as this is bound, giving it a name isn't
			all that useful.
		*/
		const recursive = (() => {
			/*
				We must do an inDOM check here in case a different (live:) macro
				(or a (goto:) macro) caused this to leave the DOM between
				previous runs.
			*/
			if (!this.inDOM()) {
				return;
			}
			this.renderInto(source, target, {append:'replace'});
			/*
				The (stop:) command causes the nearest (live:) command enclosing
				it to be stopped. Inside an (if:), it allows one-off live events to be coded.
				If a (stop:) is in the rendering target, we shan't continue running.
			*/
			if (target.find(Selectors.expression + "[name='stop']").length) {
				return;
			}
			/*
				Re-rendering will also cease if this section is removed from the DOM.
			*/
			if (!this.inDOM()) {
				return;
			}
			/*
				Otherwise, resume re-running.
			*/
			setTimeout(recursive, delay);
		});
		
		setTimeout(recursive, delay);
	}
	
	Section = {
		/*
			Creates a new Section which inherits from this one.
			Note: while all Section use the methods on this Section prototype,
			there isn't really much call for a Section to delegate to its
			parent Section.
			
			@param {jQuery} The DOM that comprises this section.
			@return {Section} Object that inherits from this one.
		*/
		create(dom) {
			// Just some overweening type-checking.
			if(!(dom instanceof $ && dom.length === 1)) {
				Utils.impossible('Section.create','called with no DOM element');
			}
			
			/*
				Install all of the non-circular properties.
			*/
			let ret = Object.assign(Object.create(this), {
				/*
					The time this Section was rendered. Of course, it's
					not been rendered yet, but it needs to be recorded this early because
					TwineScript uses it.
				*/
				timestamp: Date.now(),
				/*
					The root element for this section. Macros, hookRefs, etc.
					can only affect those in this Section's DOM.
				*/
				dom: dom || Utils.storyElement,
				/*
					The expression stack is an array of plain objects,
					each housing runtime data that is local to the expression being
					evaluated. It is used by macros such as "display" and "if" to
					keep track of prior evaluations - e.g. display loops, (else:).
					Its objects currently are allowed to possess:
					- lastHookShown: Boolean
					- tempVariables: VarScope
					
					render() pushes a new object to this stack before
					running expressions, and pops it off again afterward.
				*/
				stack: [],
				/*
					This is an enchantments stack. Enchantment objects (created by macros
					such as (click:)) are tracked here to ensure that post-hoc permutations
					of this enchantment's DOM are also enchanted correctly.
				*/
				enchantments: []
			});
			
			/*
				Add a TwineScript environ and mix in its eval() method.
			*/
			ret = Environ(ret);
			return ret;
		},
		
		/*
			A quick check to see if this section's DOM is connected to the
			story's DOM.
			Currently only used by recursiveSensor().
		*/
		inDOM() {
			return $(Utils.storyElement).find(this.dom).length > 0;
		},
		
		/*
			This function allows an expression of TwineMarkup to be evaluated as data, and
			determine the text within it.
			This is currently only used by runLink, to determine the link's passage name.

			@param {String} expr
			@return {String|jQuery} text, or a <tw-error> element.
		*/
		evaluateTwineMarkup(expr) {
			/*
				The expression is rendered into this loose DOM element, which
				is then discarded after returning. Hopefully no leaks
				will arise from this.
			*/
			const p = $('<p>');
			
			/*
				Render the text, using this own section as the base (which makes sense,
				as the recipient of this function is usually a sub-expression within this section).
			
				No changers, etc. are capable of being applied here.
			*/
			this.renderInto(expr, p);
			
			/*
				But first!! Pull out any errors that were generated.
				We return the plain <tw-error> elements in order to save re-creating
				them later in the pipeline, even though it makes the type signature of
				this function somewhat #awkward.
			*/
			let errors;
			if ((errors = p.find('tw-error')).length > 0) {
				return errors;
			}
			return p.text();
		},
		
		/*
			Renders the given TwineMarkup code into a given element,
			transitioning it in. Changer functions can be provided to
			modify the ChangeDescriptor object that controls how the code
			is rendered.
			
			This is used primarily by Engine.showPassage() to render
			passage data into a fresh <tw-passage>, but is also used to
			render TwineMarkup into <tw-expression>s (by runExpression())
			and <tw-hook>s (by render() and runLiveHook()).
			
			@param {String} The TwineMarkup code to render into the target.
			@param The render destination. Usually a HookSet or jQuery.
			@param [changers] The changer function(s) to run.
			@return {Boolean} Whether the ChangeDescriptors enabled the rendering
				(i.e. no (if:false) macros or such were present).
		*/
		renderInto(source, target, ...changers) {
			/*
				This is the ChangeDescriptor that defines this rendering.
			*/
			const desc = ChangeDescriptor.create({ target, source, section: this});
			
			/*
				Run all the changer functions.
				[].concat() wraps a non-array in an array, while
				leaving arrays intact.
			*/
			changers.forEach((changer) => {
				/*
					If a non-changer object was passed in (such as from
					specificEnchantmentEvent()), assign its values,
					overwriting the default descriptor's.
					Honestly, having non-changer descriptor-altering objects
					is a bit displeasingly rough-n-ready, but it's convenient...
				*/
				if (!changer.changer) {
					Object.assign(desc, changer);
				}
				else {
					changer.run(desc);
				}
			});

			/*
				The changers may have altered the target - update the target variable to match.
			*/
			target = desc.target;
			
			/*
				Infinite regress can occur from a couple of causes: (display:) loops, or evaluation loops
				caused by something as simple as (set: $x to "$x")$x.
				So here's a rudimentary check: bail if the stack length has now proceeded over 50 levels deep.
			*/
			if (this.stack.length >= 50) {
				TwineError.create("infinite", "Printing this expression may have trapped me in an infinite loop.")
					.render(target.attr('title')).replaceAll(target);
			}

			const renderAndExecute = (desc, stackObject) => {
				/*
					Run the changer, and get all the newly rendered elements.
				*/
				const dom = desc.render();
				
				/*
					Put the passed-in object on the data stack.
				*/
				this.stack.unshift(stackObject);
				
				/*
					This provides (sigh) a reference to this object usable by the
					inner doExpressions function, below.
				*/
				const section = this;

				/*
					Execute the expressions immediately.
				*/
				
				dom.findAndFilter(Selectors.hook + ',' + Selectors.expression)
						.each(function doExpressions() {
					const expr = $(this);
					
					switch(expr.tag()) {
						case Selectors.hook:
						{
							/*
								First, hidden hooks should not be rendered, and instead stash
								their source as "hiddenSource" data for macros to activate
								later.
							*/
							if (expr.attr('hidden')) {
								expr.removeAttr('hidden');
								expr.data('hiddenSource', expr.popAttr('source'));
							}
							/*
								Now we can render visible hooks.
								Note that hook rendering may be triggered early by attached
								expressions, so a hook lacking a 'source' attr may have
								already been rendered.
							*/
							if (expr.attr('source')) {
								section.renderInto(expr.popAttr('source'), expr);
							}
							/*
								If the hook's render contained an earlyexit
								expression (see below), halt here also.
							*/
							if (expr.find('[earlyexit]').length) {
								return false;
							}
							break;
						}
						case Selectors.expression:
						{
							if (expr.attr('js')) {
								/*
									If this returns false, then the entire .each() loop
									will terminate, thus halting expression evaluation.
								*/
								const result = runExpression.call(section, expr);
								if (result === "earlyexit") {
									dom.attr('earlyexit', true);
									return false;
								}
								return result;
							}
						}
					}
				});

				/*
					Special case for hooks inside existing collapsing syntax:
					their whitespace must collapse as well.
					(This may or may not change in a future version).
					
					Important note: this uses the **original** target, not desc.target,
					to determine if it's inside a <tw-collapsed>. This means that
					{(replace:?1)[  H  ]} will always collapse the affixed hook regardless of
					where the ?1 hook is.
				*/
				if (dom.length && target instanceof $ && target.is(Selectors.hook)
						&& target.parents('tw-collapsed').length > 0) {
					collapse(dom);
				}
				
				dom.findAndFilter(Selectors.collapsed).each(function() {
					collapse($(this));
				});
				
				/*
					After evaluating the expressions, pop the passed-in data stack object (and its scope).
				*/
				this.stack.shift();
			};

			/*
				The temp variable scope of the rendered DOM inherit from the current
				stack, or, if absent, the base VarScope class.
			*/
			const tempVariables = Object.create(this.stack.length ?  this.stack[0].tempVariables : VarScope);
			/*
				For debug mode, the temp variables store needs to also carry the name of its enclosing lexical scope.
				We derive this from the current target.

				(The target should always be truthy, but, just in case...)
			*/
			const targetTag = target && target.tag();
			tempVariables.TwineScript_VariableStoreName = (
				targetTag === Selectors.hook ? (target.attr('name') ? ("?" + target.attr('name')) : "an unnamed hook") :
				targetTag === Selectors.expression ? ("a " + target.attr('type') + " expression") :
				targetTag === Selectors.passage ? "this passage" :
				"an unknown scope"
			);

			/*
				If the descriptor features a loopVar, we must loop - that is, render and execute once for
				each value in the loopVars, assigning the value to their temp. variable names in a new data stack per loop.

				For a loopVars such as {
					a: [1,2,3],
					b: [5,6],
				},
				the created tempVariables objects should be these two:
				{ a: 1, b: 5 },
				{ a: 2, b: 6 }.
			*/
			if (Object.keys(desc.loopVars).length) {
				// Copy the loopVars, to avoid permuting the descriptor.
				const loopVars = Object.assign({}, desc.loopVars);
				// Find the shortest loopVars array, and iterate that many times ()
				let i = Math.min(...Object.keys(loopVars).map(name => loopVars[name].length));

				/*jshint -W083 */
				for(; i > 0; i -= 1) {
					renderAndExecute(desc, {
						tempVariables: Object.keys(loopVars).reduce((a,name) => {
							a[name] = loopVars[name].shift();
							return a;
						}, Object.create(tempVariables)),
					});
				}
			}
			/*
				Otherwise, just render and execute once normally.
			*/
			else {
				renderAndExecute(desc, { tempVariables });
			}
			
			/*
				Finally, update the enchantments now that the DOM is modified.
				We should only run updateEnchantments in the "top level" render call,
				to save on unnecessary DOM mutation.
				This can be determined by just checking that this Section's stack is empty.
			*/
			if (this.stack.length === 0) {
				this.updateEnchantments();
			}

			/*
				This return value is solely used by debug mode to colour <tw-expression>
				macros for (if:) in cases where it suppressed a hook.
			*/
			return desc.enabled;
		},
		
		/*
			Updates all enchantments in the section. Should be called after every
			DOM manipulation within the section (such as, at the end of .render()).
		*/
		updateEnchantments() {
			this.enchantments.forEach((e) => {
				/*
					This first method removes old <tw-enchantment> elements...
				*/
				e.disenchant();
				/*
					...and this one adds new ones.
				*/
				e.enchantScope();
			});
		},
		
	};
	
	return Object.preventExtensions(Section);
});
