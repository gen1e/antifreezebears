"use strict";
define(['jquery', 'utils', 'utils/selectors', 'markup'], ($, Utils, Selectors, {Patterns}) => {
	/*
		A HookSet is an object representing a "hook selection". Hooks in
		Twine passages can have identical titles, and both can therefore be
		selected by the same hook reference. This class represents
		these selections within a given Section.

		In addition to regular hook selections, there is also "pseudo-hooks".
		A "pseudo-hook" is section text selected using a search string, rather
		than a hook tag reference. A macro instantiation like...
			(remove: "cats")
		...would make a pseudo-hook that matches, or "hooks", every instance of
		the string "cats" in the passage. So, without needing to mark up
		that text with hook syntax, the author can still manipulate it intuitively.
		This is a powerful construct!
	*/

	/*d:
		HookName data
		
		A hook name is like a variable name, but with `?` replacing the `$` sigil. When given to a macro that accepts it,
		it signifies that *all* hooks with the given name should be affected by the macro.
		For instance, `(click: ?red)` will cause *all* hooks with a `<red|` or `|red>` nametag to be subject to the (click:)
		macro's behaviour.

		In earlier Harlowe versions, it was possible to also use hook names with (set:), (put:) and (move:) to modify the
		text of the hooks, but macros such as (replace:) should be used to accomplish this instead.

		If you only want some of the hooks with the given name to be affected, you can treat the hook name as a sort of read-only
		array: access its `1st` element (such as by `?red's 1st`) to only affect the first such named hook in the passage, access
		the `last` to affect the last, and so forth. (Even specifying an array of positions, like `?red's (a:1,3,5)`, will work.)
		Unlike arrays, though, you can't access their `length`, nor can you spread them with `...`.

		If you need to, you cal also add hook names together to affect both at the same time: `(click: ?red + ?blue's 1st)` will
		affect all hooks tagged `<red|`, as well as the first hook tagged `<blue|`.

		Note: if a hook name does not apply to a single hook in the given passage (for instance, if you type `?rde` instead of
		`?red`) then no error will be produced. This is to allow macros such as (click:) to be placed in the `header` or `footer`
		passages, and thus easily affect hooks in every passage, even if individual passages lack the given hook name. Of course, it
		means that you'll have to be extra careful while typing the hook name, as misspellings will not be easily identified
		by Harlowe itself.
	*/

	/*
		Retrieves a substring from a text node by slicing it into (at most 3) parts,
		specified by the inclusive start and non-inclusive end indices.
	*/
	function sliceNode(node, start, end) {
		/*
			We need to cache the length here, as the node is transformed
			by the subsequent splitText calls.
		*/
		const l = node.textContent.length;
		/*
			Of course, we can't omit simple range checks before going further.
		*/
		if (start >= l) {
			return;
		}
		/*
			Now, we do the first split, separating the start of the node
			from the start of the substring.
			(We skip this if the substring is at the start, as splitting
			will create a 0-char text node.)
		*/
		let newNode;
		const ret = [(newNode = (start === 0 ? node : node.splitText(start)))];
		if (end) {
			/*
				This function supports negative end indices, using the
				following quick conversion:
			*/
			if (end <= 0) {
				end = l - end;
			}
			/*
				If that conversion causes end to become equal to l, we
				don't bother (as it will create another 0-char text node).
			*/
			if (end < l) {
				/*
					Otherwise, the split will be performed.
					Note that this returns the rightmost portion of the split,
					i.e. from the end of the substring onwards.
				*/
				ret.push(newNode.splitText(end - start));
			}
		}
		return ret;
	}
	
	/*
		This complicated function takes an array of contiguous sequential
		text nodes, and a search string, and does the following:
		
		1. Finds all occurrences of the search string in the sequence,
		even where the string spans multiple text nodes,
		
		2. Splits the nodes along the occurrences of the string, and
		then returns these split-off nodes.
		
		The purpose of this is to allow transformations of exact
		textual matches within passage text, *regardless* of the
		actual DOM hierarchy which those matches bestride.
	*/
	function findTextInNodes(textNodes, searchString) {
		let
			/*
				examinedNodes holds the text nodes which are currently being
				scrutinised for any possibility of holding the search string.
			*/
			examinedNodes = [],
			/*
				examinedText holds the textContent of the entire set of
				examinedNodes, for easy comparison and inspection.
			*/
			examinedText = '',
			/*
				ret is the returned array of split-off text nodes.
			*/
			ret = [];
		
		/*
			First, if either search set is 0, return.
		*/
		if (!textNodes.length || !searchString) {
			return ret;
		}
		/*
			We progress through all of the text nodes.
		*/
		while(textNodes.length > 0) {
			/*
				Add the next text node to the set of those being examined.
			*/
			examinedNodes.push(textNodes[0]);
			examinedText += textNodes[0].textContent;
			textNodes.shift();
			
			/*
				Now, perform the examination: does this set of nodes contain the string?
			*/
			let index = examinedText.indexOf(searchString);
			/*
				If so, proceed to extract the substring.
			*/
			if (index > -1) {
				const remainingLength = examinedText.length - (index + searchString.length);
				/*
					First, remove all nodes which do not contain any
					part of the search string (as this algorithm scans left-to-right
					through nodes, these will always be in the left portion of the
					examinedNodes list).
				*/
				while(index >= examinedNodes[0].textContent.length) {
					index -= examinedNodes[0].textContent.length;
					examinedNodes.shift();
				}
				/*
					In the event that it was found within a single node,
					simply slice that node only.
				*/
				if (examinedNodes.length === 1) {
					const slices = sliceNode(examinedNodes[0], index, index + searchString.length);
					ret.push(slices[0]);
					// The extra slice at the end shall be examined
					// in the next recursion.
					if (slices[1]) {
						textNodes.unshift(slices[1]);
					}
					break;
				}
				/*
					We now push multiple components: a slice from the first examined node
					(which will extract the entire right side of the node):
				*/
				ret.push(sliceNode(
					examinedNodes[0],
					index,
					examinedNodes[0].length
				)
				/*
					(Since we're extracting the right side, there will be no 'end' slice
					returned by sliceNode. So, just use the first returned element.)
				*/
				[0]);
				/*
					Then, all of the nodes between first and last:
				*/
				ret.push(...examinedNodes.slice(1,-1));
				/*
					Then, a slice from the last examined node (which will extract
					the entire left side).
				*/
				const slices = sliceNode(
					examinedNodes[examinedNodes.length-1],
					0,
					examinedNodes[examinedNodes.length-1].textContent.length - remainingLength
				);
				ret.push(slices[0]);
				// The extra slice at the end shall be examined
				// in the next recursion.
				if (slices[1]) {
					textNodes.unshift(slices[1]);
				}
				// Finally, if any of the above were undefined, we remove them.
				ret = ret.filter(Boolean);
				break;
			}
		}
		/*
			The above only finds the first substring match. The further ones
			are obtained through this recursive call.
		*/
		return [ret, ...findTextInNodes(textNodes, searchString)];
	}

	/*
		Given a search string, this wraps all identified text nodes inside the given DOM
		inside the given HTML tag. Currently only used to create <tw-pseudo-hook> elements.

		@param {String} searchString The passage text to wrap
		@param {jQuery} dom The DOM in which to search
		@param {String} htmlTag The HTML tag to wrap around
		@return {jQuery} A jQuery set holding the created HTML wrapper tags.
	*/
	function wrapTextNodes(searchString, dom, htmlTag) {
		const nodes = findTextInNodes(dom.textNodes(), searchString);
		let ret = $();
		nodes.forEach((e) => {
			ret = ret.add($(e).wrapAll(htmlTag));
		});
		return ret.parent();
	}

	/*
		Convert a hook names string to a CSS selector.
		This includes the "built-in" names that target certain
		Harlowe elements: ?page, ?passage, ?sidebar, ?link.

		@param {String} chain to convert
		@return {String} classlist string
	*/
	function hookToSelector(c) {
		c = Utils.insensitiveName(c).replace(/\?/g, '').replace(/"/g, "&quot;");
		let ret = Selectors.hook+'[name="' + c + '"]';
		/*
			The built-in names work alongside user names: |page>[] will be
			selected alongside the <tw-story> element.
		*/
		ret += ({
			page: ", tw-story",
			passage: ", tw-passage",
			sidebar: ", tw-sidebar",
			link: ", tw-link, .enchantment-link",
		}[c]) || "";
		return ret;
	}

	/*
		Hooks are "live" in the sense that their selected hooks are re-computed on
		every operation performed on them.

		This private method returns a jQuery collection of every <tw-hook>
		in this HookSet's Section which matches this HookSet's selector string.
	*/
	function hooks({dom}) {
		let ret = $();

		/*
			First, take the elements from all the previous hooks that
			this was concatenated to. (For instance, [?a] + ?b's 1st)
		*/
		if (this.prev) {
			ret = ret.add(hooks.call(this.prev, {dom}));
		}
		/*
			If this has a selector itself (such as ?a + [?b]'s 1st), add those elements
			(as restricted by the properties).
		*/
		/*
			The following function takes a jQuery set of elements and produces
			a reduce() function which extracts just the ones keyed to a given index
			(or array of indexes).
		*/
		const reducer = (elements, index) => {
			if (Array.isArray(index)) {
				return index.reduce((a,i) => a.add(elements.get(i)), $());
			}
			// Luckily, negatives indices work fine with $().get().
			return $(elements.get(index));
		};
		if (this.selector) {
			let ownElements;
			/*
				If this is a pseudo-hook (search string) selector, we must create the
				temporary <tw-pseudo-hook> elements around the selection.
			*/
			if (!this.selector.match("^" + Patterns.hookRef + "$")) {
				/*
					Note that wrapTextNodes currently won't target text directly inside <tw-story>,
					<tw-sidebar> and other <tw-passage>s.
				*/
				ownElements = wrapTextNodes(this.selector, dom, '<tw-pseudo-hook>');
			}
			else {
				ownElements = dom.add(dom.parentsUntil(Utils.storyElement.parent()))
					.findAndFilter(hookToSelector(this.selector));
			}
			if (this.properties.length) {
				ret = ret.add(this.properties.reduce(reducer, ownElements));
			}
			else {
				ret = ret.add(ownElements);
			}
		}
		/*
			Conversely, if this has a base, then we add those elements
			(as restricted by the properties).
		*/
		if (this.base) {
			ret = ret.add(this.properties.reduce(reducer, hooks.call(this.base, {dom})));
		}
		return ret;
	}

	/*
		After calling hooks(), we must remove the <tw-pseudo-hook> elements
		and normalize the text nodes that were split up as a result of the selection.
	*/
	function cleanupPseudoHooks({dom}) {
		Utils.$('tw-pseudo-hook', dom).contents().unwrap().parent().each(function() {
			this.normalize();
		});
	}

	/*
		This is used exclusively by TwineScript_is() to provide a crude string serialisation
		of all of a HookSet's relevant distinguishing properties, order-insensitive, which can
		be compared using ===. This takes advantage of the fact that all of these properties
		can be serialised to strings with little fuss.

		Note: this actually returns an array, so that it can recursively call itself. But, it's
		expected that consumers will convert it to a string.
	*/
	function hash(hookset) {
		if (!hookset) {
			return [];
		}
		const {selector, base, properties, prev} = hookset;
		// The hash of ?red + ?blue should equal that of ?blue + ?red. To do this,
		// the prev's hash and this hookset's hash is added to an array, which is then sorted and returned.
		return [JSON.stringify([Utils.insensitiveName(selector) || "", hash(base), [...properties].sort()]), ...hash(prev)].sort();
	}
	
	const HookSet = Object.freeze({
		
		/*
			An Array forEach-styled iteration function. The given function is
			called on every <tw-hook> in the section DOM
			
			This is currently just used by Section.renderInto, to iterate over each
			word and render it individually.
			
			@param {Section} The section the hooks should target.
			@param {Function} The callback, which is passed the following:
				{jQuery} The <tw-hook> element to manipulate.
		*/
		forEach(section, fn) {
			const ret = hooks.call(this, section).each(function(i) {
				fn($(this), i);
			});
			cleanupPseudoHooks.call(this, section);
			return ret;
		},
		
		/*
			TwineScript_ObjectName and _TypeName are used for error messages.
		*/
		get TwineScript_ObjectName() {
			/*
				Let's not bother printing out this hookset's entire heritage
				if it's anything more than basic.
			*/
			if (this.properties.length > 0 || this.prev) {
				return "a complex hook name";
			}
			return this.selector + " (a hook name)";
		},

		TwineScript_TypeName: "a hook name (like ?this)",
		/*
			HookSets cannot be assigned to variables.
		*/
		TwineScript_Unstorable: true,

		/*
			HookSets can be concatenated in the same manner as ChangerCommands.
		*/
		"TwineScript_+"(other) {
			/*
				Make a copy of this HookSet to return.
			*/
			const clone = other.TwineScript_Clone();
			/*
				Attach this to the other, producing a chain of [this] -> [clone].
			*/
			clone.prev = this;
			return clone;
		},

		/*
			HookSets are identical if they have the same selector, base, properties (and if
			a property is a slices, it is order-sensitive) and prev.
		*/
		TwineScript_is(other) {
			return hash(this) + "" === hash(other) + "";
		},

		/*
			These are used by VarRef, under the assumption that this is a sequential object.
			Accessing 1st, 2nd, etc. for a HookSet will produce only the nth document-order
			element for that hookset.

			Note that index may actually be an array of indices, as created by "?a's (a:1,2,4)".
			The order of this array must be preserved, so that "?a's (a:2,4)'s 2nd" works correctly.
		*/
		TwineScript_GetElement(index) {
			return HookSet.create(undefined, this, [index], undefined);
		},

		// As of 19-08-2016, HookSets no longer have a length property, because calculating it requires
		// passing in a section, and it doesn't make much sense to ever do so.

		TwineScript_Clone() {
			return HookSet.create(this.selector, this.base, this.properties, this.prev);
		},
		
		/*
			Creates a new HookSet, which contains the following:

			{String} selector: a hook name, such as "?flank" for ?flank, or a bare search string.
			{HookSet} base: an alternative to selector. A HookSet from which the properties
				are being extracted.
			{Array} properties: a set of properties to restrict the current set of hooks.
			{HookSet} prev: a hook which has been +'d with this one.

			Consider this diagram:

			[prev]    [selector] [properties]
			(?apple + ?banana's  2ndlast)'s 2ndlast
			[          base            ]   [properties]
		*/
		create(selector, base, properties = [], prev = undefined) {
			return Object.assign(Object.create(this || HookSet), {
				selector, base, properties, prev
			});
		},

		/*
			This brief sugar method is only used in macrolib/enchantments.
		*/
		from(arg) {
			return HookSet.isPrototypeOf(arg) ? arg : HookSet.create(arg);
		},
	});
	return HookSet;
});
