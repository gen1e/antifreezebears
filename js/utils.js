"use strict";
define(['jquery', 'markup', 'utils/selectors', 'utils/polyfills'],
($, TwineMarkup, Selectors) => {

	const
		// Used by lockProperties
		lockDesc = {
			configurable: 0,
			writable: 0
		},
		
		// Used to cache t8n animation times
		t8nAnimationTimes = {
			"transition-in": Object.create(null),
			"transition-out": Object.create(null)
		},
		
		// These two are used by childrenProbablyInline (see below).
		usuallyBlockElements = (
			// The most common block HTML tags that would be used in passage source
			"audio,blockquote,canvas,div,h1,h2,h3,h4,h5,hr,ol,p,pre,table,ul,video,"
			// And the one(s) that Harlowe itself creates through its syntax
			+ "tw-align,tw-story,tw-passage"
		).split(','),
		
		usuallyInlineElements = (
			// The most common inline HTML tags that would be created from passage source
			"a,b,i,em,strong,sup,sub,abbr,acronym,s,strike,del,big,small,script,img,button,input,"
			// And the ones that Harlowe itself creates through its syntax.
			// Note that <tw-hook> and <tw-expression> aren't included.
			+ "tw-link,tw-broken-link,tw-verbatim,tw-collapsed,tw-error"
		).split(','),

		// Certain HTML elements cannot have their parents unwrapped: <audio>, for instance,
		// will break if it is ever detached from the DOM.
		nonDetachableElements = ["audio"];

	let Utils;
	/*
		Caches the CSS time (duration + delay) for a particular transition,
		to save on costly $css() lookups.

		@param (String) Transition to use
		@param {String} Either "transition-in" or "transition-out"
	*/
	function cachedTransitionTime(transIndex, className) {
		const animClass = t8nAnimationTimes[className];
		if (!animClass[transIndex]) {
			const p = $('<p>').appendTo(document.body).attr("data-t8n", transIndex).addClass(className);
			animClass[transIndex] = Utils.cssTimeUnit(p.css("animation-duration")) + Utils.cssTimeUnit(p.css("animation-delay"));
			p.remove();
		}
		return animClass[transIndex];
	}

	let
		//A binding for the cached <tw-story> reference (see below).
		storyElement;

	/*
		A static class with helper methods used throughout Harlowe.
	*/
	Utils = {
		/*
			Locks a particular property of an object.

			@param {Object} Object
			@param {String} Property to lock
			@param {String} A value to set the property to
			@return The affected object
		*/
		lockProperty(obj, prop, value) {
			// Object.defineProperty does walk the prototype chain
			// when reading a property descriptor dict.
			const propDesc = Object.create(lockDesc);
			value && (propDesc.value = value);
			Object.defineProperty(obj, prop, propDesc);
			return obj;
		},

		/*
			String utilities
		*/

		/*
			In some places, it's necessary to print numbers, strings and arrays of primitives
			as JS literals, such as to incorporate them into partially compiled code.
		*/
		toJSLiteral(val) {
			/*
				Of course, JSON.stringify can handle the JS primitives that Harlowe uses, but
				the JS exotic objects must be stringified manually like so.
			*/
			if (val instanceof Map) {
				return "(new Map(" + Utils.toJSLiteral([...val.entries()]) + "))";
			}
			if (val instanceof Set) {
				return "(new Set(" + Utils.toJSLiteral([...val.values()]) + "))";
			}
			return JSON.stringify(val);
		},

		/*
			Takes a string argument, expressed as a CSS time,
			and returns the time in milliseconds that it equals.

			If the string can't be parsed as a time, then this returns 0.
		*/
		cssTimeUnit(s) {
			s = s.toLowerCase();

			if (s.slice(-2) === "ms")
				return (+s.slice(0, -2)) || 0;
			if (s.slice(-1) === "s")
				return (+s.slice(0, -1)) * 1000 || 0;
			return 0;
		},

		/*
			A quick method for turning a number into an "nth" string.
			Used exclusively for error messages.
		*/
		nth(num) {
			const lastDigit = (+num + '').slice(-1);
			return num + (
				lastDigit === "1" ? "st" :
				lastDigit === "2" ? "nd" :
				lastDigit === "3" ? "rd" : "th");
		},

		/*
			A quick method for adding an 's' to the end of a string
			that comes in the form "[num] [noun]". Used exclusively for
			error messages.

			@param {Number} The quantity
			@param {String} The noun to possibly pluralise
			@return {String}
		*/
		plural(num, noun) {
			return num + " " + noun + (num > 1 ? "s" : "");
		},

		/*
			A quick method for joining a string array with commas and "and".
		*/
		andList(array) {
			return array.length === 1 ? array[0]
				: (array.slice(0,-1).join(', ') + " and " + array[array.length-1]);
		},

		/*
			These two strings are modified copies of regex components from markup/patterns.js.
		*/
		// This includes all forms of Unicode 6 whitespace (including \n and \r) except Ogham space mark.
		realWhitespace: "[ \\n\\r\\f\\t\\v\\u00a0\\u2000-\\u200a\\u2028\\u2029\\u202f\\u205f\\u3000]",

		// This handles alphanumeric ranges not covered by \w. Doesn't include hyphens or underscores.
		anyRealLetter:  "[\\dA-Za-z\\u00c0-\\u00de\\u00df-\\u00ff\\u0150\\u0170\\u0151\\u0171\\uD800-\\uDFFF]",

		/*
			HTML utilities
		*/

		/*
			Unescape HTML entities.
		*/
		unescape(text) {
			return text.replace(/&(?:amp|lt|gt|quot|nbsp|zwnj|#39|#96);/g,
				e => ({
					'&amp;'  : '&',
					'&gt;'   : '>',
					'&lt;'   : '<',
					'&quot;' : '"',
					'&#39;'  : "'",
					"&nbsp;" : String.fromCharCode(160),
					"&zwnj;" : String.fromCharCode(8204)
				}[e])
			);
		},

		/*
			HTML-escape a string.
		*/
		escape(text) {
			return text.replace(/[&><"']/g,
				e => ({
					'&' : '&amp;',
					'>' : '&gt;',
					'<' : '&lt;',
					'"' : '&quot;',
					"'" : '&#39;',
				}[e])
			);
		},

		/*
			Some names (namely macro names) are case-insensitive, AND dash-insensitive.
			This method converts such names to all-lowercase and lacking
			underscores and hyphens.
		*/
		insensitiveName(e) {
			return (e + "").toLowerCase().replace(/-|_/g, "");
		},
		
		/*
			Element utilities
		*/

		/*
			childrenProbablyInline: returns true if the matched elements probably only contain elements that
			are of the 'inline' or 'none' CSS display type.
			
			This takes some shortcuts to avoid use of the costly $css() function as much as possible,
			hence, it can only "probably" say so.
			
			This is used to crudely determine whether to make a <tw-transition-container> inline or block,
			given that block children cannot inherit opacity from inline parents in Chrome (as of April 2015).
		*/
		childrenProbablyInline(jq) {
			/*
				This is used to store elements which daunted all of the easy tests,
				so that $css() can be run on them after the first loop has returned all-true.
			*/
			const unknown = [];
			return Array.prototype.every.call(jq.find('*'), elem => {
				/*
					If it actually has "style=display:inline", "hidden", or "style=display:none"
					as an inline attribute, well, that makes life easy for us.
				*/
				if (elem.hidden || /none|inline/.test(elem.style.display)) {
					return true;
				}
				/*
					If the children contain an element which is usually block,
					then *assume* it is and return false early.
				*/
				if (usuallyBlockElements.includes(elem.tagName.toLowerCase())
						/*
							If it has an inline style which is NOT none or inline,
							then go ahead and return false.
						*/
						|| /none|inline/.test(elem.style.display)) {
					return false;
				}
				/*
					If the child's tag name is that of an element which is
					usually inline, then *assume* it is and return true early.
				*/
				if (usuallyInlineElements.includes(elem.tagName.toLowerCase())) {
					return true;
				}
				/*
					For all else, we fall back to the slow case.
				*/
				unknown.push(elem);
				return true;
			})
			&& unknown.every(elem => /none|inline/.test(elem.style.display));
		},

		/*
			Replaces oldElem with newElem while transitioning between both.

			@param a jQuery object currently in the DOM or a DOM structure
			@param an unattached jQuery object to attach
			@param transition to use
		*/

		transitionReplace(oldElem, newElem, transIndex) {
			const closest = oldElem.closest(Selectors.hook);
			if (closest.length > 0) {
				oldElem = closest;
			}

			// Create a transition-main-container
			const container1 = $('<tw-transition-container>').css('position', 'relative');

			// Insert said container into the DOM (next to oldElem)
			container1.insertBefore(oldElem.first());

			let container2a;
			if (newElem) {
				// Create a transition-in-container
				container2a = $('<tw-transition-container>').appendTo(container1);

				// Insert new element
				newElem.appendTo(container2a);
			}

			// Create a transition-out-container
			// and insert it into the transition-main-container.
			const container2b = $('<tw-transition-container>').css('position', 'absolute')
				.prependTo(container1);

			// Insert the old element into the transition-out-container
			oldElem.detach().appendTo(container2b);

			// Transition-out the old element, removing it

			Utils.transitionOut(container2b, transIndex);

			// Transition-in the new element

			if (newElem) {
				Utils.transitionIn(container2a, transIndex, function () {
					// Remove container1 and container2a
					container2a.unwrap().children().first().unwrap();
				});
			}
		},

		/*
			Transition an element out.
			@param {jQuery} jQuery collection to transition out
			@param (String) transition to use
			@param (Number) Replacement animation-duration value.
		*/

		transitionOut(el, transIndex, transitionTime) {
			const childrenInline = Utils.childrenProbablyInline(el),
				/*
					If the element is not a tw-hook or tw-passage, we must
					wrap it in a temporary element first, which can thus be
					animated using CSS.
				*/
				mustWrap =
					el.length > 1 || !childrenInline ||
					!['tw-hook','tw-passage'].includes(el.tag());
			
			/*
				The default transition callback is to remove the element.
			*/
			function onComplete() {
				el.remove();
			}
			/*
				As mentioned above, we must, in some cases, wrap the nodes in containers.
			*/
			if (mustWrap) {
				el = el.wrapAll('<tw-transition-container>').parent();
			}
			/*
				Now, apply the transition.
			*/
			el.attr("data-t8n", transIndex).addClass("transition-out");
			if (Utils.childrenProbablyInline(el)) {
				el.css('display','inline-block');
			}
			/*
				If an alternative transition time was supplied, use it.
			*/
			if (typeof transitionTime === "number") {
				el.css('animation-duration', transitionTime + "ms");
			}
			
			/*
				Ideally I'd use this:
				.one("animationend webkitAnimationEnd MSAnimationEnd", function(){ oldElem.remove(); });
				but in the event of CSS being off, these events won't trigger
				- whereas the below method will simply occur immediately.
			*/
			const delay = transitionTime || cachedTransitionTime(transIndex, "transition-out");

			!delay ? onComplete() : window.setTimeout(onComplete, delay);
		},

		/*
			Transition an element in.

			@param {jQuery} jQuery collection to transition out
			@param (String) Transition to use
			@param (Number) Replacement animation-duration value.
		*/

		transitionIn(el, transIndex, transitionTime) {
			const childrenInline = Utils.childrenProbablyInline(el),
				/*
					If the element is not a tw-hook or tw-passage, we must
					wrap it in a temporary element first, which can thus be
					animated using CSS.
				*/
				mustWrap =
					el.length > 1 || !childrenInline ||
					!['tw-hook','tw-passage'].includes(el.tag());
			
			/*
				The default transition callback is to remove the transition-in
				class. (#maybe this should always be performed???)
			*/
			function onComplete () {
				/*
					Unwrap the wrapping... unless it contains a non-unwrappable element,
					in which case the wrapping must just have its attributes removed.
				*/
				const detachable = el.findAndFilter(nonDetachableElements.join(",")).length === 0;
				if (mustWrap && detachable) {
					el.contents().unwrap();
				}
				/*
					Otherwise, remove the transition attributes.
				*/
				else {
					el.removeClass("transition-in").removeAttr("data-t8n");
				}
			}
			/*
				As mentioned above, we must, in some cases, wrap the nodes in containers.
			*/
			if (mustWrap) {
				el = el.wrapAll('<tw-transition-container>').parent();
			}
			/*
				Now, perform the transition by assigning these attributes
				and letting the built-in CSS take over.
			*/
			el.attr("data-t8n", transIndex).addClass("transition-in");
			/*
				If an alternative transition time was supplied, use it.
			*/
			if (typeof transitionTime === "number") {
				el.css('animation-duration', transitionTime + "ms");
			}
			
			if (Utils.childrenProbablyInline(el)) {
				el.css('display','inline-block');
			}
			const delay = transitionTime || cachedTransitionTime(transIndex, "transition-in");

			!delay ? onComplete() : window.setTimeout(onComplete, delay);
		},

		/*
			Runs a jQuery selector, but:
			- uses the <tw-story> element as context, unless one was given.
			- ignores elements that are transitioning out.
		*/

		$(str, context) {
			return $(str, context || Utils.storyElement).not(".transition-out, .transition-out *");
		},

		/*
			Logging utilities
		*/

		/*
			Internal error logging function. Currently a wrapper for console.error.
			This should be used for engine errors beyond the story author's control.

			@param {String} Name of the calling method.
			@param {String} Message to log.
		*/

		impossible(where, data) {
			if (!window.console) {
				return;
			}
			console.error(where + "(): " + data);
		},

		/*
			Asserts that an object doesn't lack a necessary property.
			This and the next method provide some shape-checking
			to important functions.
		*/
		assertMustHave(object, props) {
			if (!window.console) {
				return;
			}
			for(let i = 0; i < props.length; i += 1) {
				if(!(props[i] in object)) {
					console.error("Assertion failed: object"
						+ " lacks property " + props[i]);
				}
			}
		},

		/*
			Asserts that an object has no property extensions.
		*/
		assertOnlyHas(object, props) {
			if (!window.console) {
				return;
			}
			for(let i in object) {
				if (!props.includes(i)) {
					console.error("Assertion failed: object"
						+ " had unexpected property '" + i + "'!");
				}
			}
		},

		/*
			Constants
		*/

		/*
			This is used as a more semantic shortcut to the <tw-story> element.
		*/
		get storyElement() {
			return storyElement;
		},
	};
	
	/*
		The reference to the <tw-story> should be set at startup, so that it can be
		used even when it is disconnected from the DOM (which occurs when a new
		passage is being rendered into it).
	*/
	$(()=> storyElement = $(Selectors.story));

	return Object.freeze(Utils);
});
