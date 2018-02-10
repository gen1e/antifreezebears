"use strict";
define(['jquery', 'utils', 'utils/selectors', 'utils/operationutils', 'macros', 'datatypes/hookset', 'datatypes/changercommand', 'internaltypes/enchantment', 'internaltypes/twineerror'],
($, Utils, Selectors, {is}, Macros, HookSet, ChangerCommand, Enchantment, TwineError) => {

	const {either,rest} = Macros.TypeSignature;
	/*
		Built-in Revision, Interaction and Enchantment macros.
		This module modifies the Macros module only, and exports nothing.
	*/

	/*d:
		(enchant: HookName or String, Changer) -> Command

		Applies a changer to every occurrence of a hook or string in a passage, and continues applying that changer to any further
		occurrences that are made to appear in the same passage later.

		Example usage:
		* `(enchant: "gold", (text-colour: yellow) + (text-style:'bold'))` makes all occurrences of "gold" in the text be bold and yellow.
		* `(enchant: ?dossier, (link: "Click to read"))` makes all the hooks named "dossier" be hidden behind links reading
		"Click to read".

		Rationale:
		While changers allow you to style or transform certain hooks in a passage, it can be tedious and error-prone to attach them to every
		occurrence as you're writing your story, especially if the attached changers are complicated. You can
		simplify this by storing changers in short variables, and attaching just the variables, like so:
		```
		(set: _ghost to (text-style:'outline'))
		_ghost[Awoo]
		_ghost[Ooooh]
		```
		Nevertheless, this can prove undesirable: you may want to remove the _ghost styling later in development, which would
		force you to remove the attached variables to avoid producing an error; you may want to only style a single word or phrase,
		and find it inconvenient to place it in a hook; you may simply not like having code, like that (set:) macro,
		be at the start of your passage; you may not want to keep track of which variables hold which changers, given the possibility (if
		you're using normal variables) that they could be changed previously in the story.

		Instead, you can give the hooks the name "ghost", and then (enchant:) them afterward like so:
		```
		|ghost>[Awoo]
		|ghost>[Ooooh]
		(enchant: ?ghost, (text-style:'outline'))
		```
		The final (enchant:) macro can target words instead of hooks, much like (click:) - simply provide a string instead of a hook name.

		This macro works well in "header" tagged passages - using a lot of (enchant:) commands to style certain words or parts of
		every passage, you can essentially write a "styling language" for your story, where certain hook names "mean" certain colours or
		behaviour. (This is loosely comparable to using CSS to style class names, but exclusively uses macros.)

		Details:
		As with (click:), the "enchantment" affects the text produced by (display:) macros, and any hooks changed by (replace:) etc. in the future,
		until the player makes their next turn.

		The built-in hook names, ?Page, ?Passage, ?Sidebar and ?Link, can be targeted by this macro, and can be styled on a per-passage basis this way.

		See also:
		(click:)

		#basics
	*/
	Macros.add("enchant",
		(section, scope, changer) => ({
			TwineScript_ObjectName: "an (enchant:) command",
			TwineScript_TypeName:   "an (enchant:) command",
			TwineScript_Print() {
				/*
					First, test the changer to confirm it contains no revision macros.
				*/
				const summary = changer.summary();
				if (summary.includes('newTargets') || summary.includes('target')) {
					return TwineError.create(
						"macrocall",
						"The changer given to (enchant:) can't include a revision command like (replace:) or (append:)."
					);
				}
				
				const enchantment = Enchantment.create({
					scope: HookSet.from(scope), changer, section,
				});
				section.enchantments.push(enchantment);
				enchantment.enchantScope();
				return "";
			},
		}),
		[either(HookSet,String), ChangerCommand]
	);

	/*
		Revision macros produce ChangerCommands that redirect where the attached hook's
		text is rendered - usually rendering inside an entirely different hook.
	*/
	const revisionTypes = [
			/*d:
				(replace: ...HookName or String) -> Changer
				
				Creates a command which you can attach to a hook, and replace target
				destinations with the hook's contents. The targets are either text strings within
				the current passage, or hook references.

				Example usage:

				This example changes the words "categorical catastrophe" to "**dog**egorical **dog**astrophe"
				```
				A categorical catastrophe!
				(replace: "cat")[**dog**]
				```

				This example changes the `|face>` and `|heart>` hooks to read "smile":
				```
				A |heart>[song] in your heart, a |face>[song] on your face.
				(replace: ?face, ?heart)[smile]
				```

				Rationale:
				A common way to make your stories feel dynamic is to cause their text to modify itself
				before the player's eyes, in response to actions they perform. You can check for these actions
				using macros such as (link:), (click:) or (live:), and you can make these changes using macros
				such as (replace:).

				Using (replace:) is only one way of providing this dynamism, however - the (show:) macro also
				offers similar functionality. See that macro's article for an explanation of when you might prefer
				to use it over (replace:), and vice-versa.

				Details:
				(replace:) lets you specify a target, and a block of text to replace the target with. The attached hook
				will not be rendered normally - thus, you can essentially place (replace:) commands anywhere in the passage
				text without interfering much with the passage's visible text.

				If the given target is a string, then every instance of the string in the current passage is replaced
				with a copy of the hook's contents. If the given target is a hook reference, then only named hooks
				with the same name as the reference will be replaced with the hook's contents. Use named hooks when
				you want only specific places in the passage text to change.

				If the target doesn't match any part of the passage, nothing will happen. This is to allow you to
				place (replace:) commands in `header` tagged passages, if you want them to conditionally affect
				certain named hooks throughout the entire game, without them interfering with other passages.

				See also:
				(append:), (prepend:), (show:)

				#revision
			*/
			"replace",
			/*d:
				(append: ...HookName or String) -> Changer

				A variation of (replace:) which adds the attached hook's contents to
				the end of each target, rather than replacing it entirely.

				Example usage:
				* `(append: "Emily", "Em")[, my maid] ` adds ", my maid " to the end of every occurrence of "Emily" or "Em".
				* `(append: ?dress)[ from happier days]` adds " from happier days" to the end of the `|dress>` hook.

				Rationale:
				As this is a variation of (replace:), the rationale for this macro can be found in
				that macro's description. This provides the ability to append content to a target, building up
				text or amending it with an extra sentence or word, changing or revealing a deeper meaning.

				See also:
				(replace:), (prepend:)

				#revision
			*/
			"append",
			/*d:
				(prepend: ...HookName or String) -> Changer

				A variation of (replace:) which adds the attached hook's contents to
				the beginning of each target, rather than replacing it entirely.

				Example usage:

				* `(prepend: "Emily", "Em")[Miss ] ` adds "Miss " to the start of every occurrence of "Emily" or "Em".
				* `(prepend: ?dress)[my wedding ]` adds "my wedding " to the start of the `|dress>` hook.

				Rationale:
				As this is a variation of (replace:), the rationale for this macro can be found in
				that macro's description. This provides the ability to prepend content to a target, adding
				preceding sentences or words to a text to change or reveal a deeper meaning.

				See also:
				(replace:), (append:)

				#revision
			*/
			"prepend"
		];
	
	revisionTypes.forEach((e) => {
		Macros.addChanger(e,
			(_, ...scopes) => {
				/*
					If a selector is empty (which means it's the empty string) then throw an error,
					because nothing can be selected.
				*/
				if (!scopes.every(Boolean)) {
					return TwineError.create("datatype",
						"A string given to this ("
						+ e
						+ ":) macro was empty."
					);
				}
				return ChangerCommand.create(e, scopes.map(HookSet.from));
			},
			(desc, ...scopes) => {
				/*
					Now, if the source hook was outside the collapsing syntax,
					and its dest is inside it, then it should NOT be collapsed, reflecting
					its, shall we say, "lexical" position rather than its "dynamic" position.
				*/
				const collapsing = $(desc.target).parents().filter('tw-collapsed').length > 0;
				if (!collapsing) {
					desc.attr = [...desc.attr, { collapsing: false }];
				}
				/*
					Having done that, we may now alter the desc's target.
					We need to eliminate duplicate targets, in cases such as (replace:?1) + (replace:?1, ?2).
				*/
				desc.newTargets = (desc.newTargets || []);
				desc.newTargets.push(
					...scopes.filter(target1 => !desc.newTargets.some(
							({target:target2, append}) => is(target1, target2) && e === append
						))
						/*
							Create a newTarget object, which is a {target, append} object that pairs the revision
							method with the target. This allows "(append: ?a) + (prepend:?b)" to work on the same
							ChangeDescriptor.
						*/
						.map(target => ({target, append:e}))
				);
				return desc;
			},
			rest(either(HookSet,String))
		);
	});
	
	/*
		This large routine generates functions for enchantment macros, to be applied to
		Macros.addChanger().
		
		An "enchantment" is a process by which selected hooks in a passage are
		automatically wrapped in <tw-enchantment> elements that have certain styling classes,
		and can trigger the rendering of the attached TwineMarkup source when they experience
		an event.
		
		In short, it allows various words to become links etc., and do something when
		they are clicked, just by deploying a single macro instantiation! Just type
		"(click:"house")[...]", and every instance of "house" in the section becomes
		a link that does something.
		
		The enchantDesc object is a purely internal structure which describes the
		enchantment. It contains the following:
		
		* {String} event The DOM event that triggers the rendering of this macro's contents.
		* {String} classList The list of classes to 'enchant' the hook with, to denote that it
		is ready for the player to trigger an event on it.
		* {String} rerender Determines whether to clear the span before rendering into it ("replace"),
		append the rendering to its current contents ("append") or prepend it ("prepend").
		Only used for "combos", like click-replace().
		* {Boolean} once Whether or not the enchanted DOM elements can trigger this macro
		multiple times.
		
		@method newEnchantmentMacroFns
		@param  {Function} innerFn       The function to perform on the macro's hooks
		@param  {Object}  [enchantDesc]  An enchantment description object, or null.
		@return {Function[]}             A pair of functions.
	*/
	function newEnchantmentMacroFns(enchantDesc, name) {
		/*
			Register the event that this enchantment responds to
			in a jQuery handler.
			
			Sadly, since there's no permitted way to attach a jQuery handler
			directly to the triggering element, the "actual" handler
			is "attached" via a jQuery .data() key, and must be called
			from this <tw-story> handler.
		*/
		$(() => {
			Utils.storyElement.on(
				/*
					Put this event in the "enchantment" jQuery event
					namespace, solely for personal tidiness.
				*/
				enchantDesc.event + ".enchantment",
			
				// This converts a HTML class attribute into a CSS selector
				"." + enchantDesc.classList.replace(/ /g, "."),
			
				function generalEnchantmentEvent() {
					const enchantment = $(this),
						/*
							Run the actual event handler.
						*/
						event = enchantment.data('enchantmentEvent');
				
					if (event) {
						event(enchantment);
					}
				}
			);
		});
		
		/*
			Return the macro function AND the ChangerCommand function.
			Note that the macro function's "selector" argument
			is that which the author passes to it when invoking the
			macro (in the case of "(macro: ?1)", selector will be "?1").
		*/
		return [
			(_, ...selectors) => {
				/*
					If one of the selectors is empty (which means it's the empty string) then throw an error,
					because nothing can be selected.
				*/
				if (!selectors.every(Boolean)) {
					return TwineError.create("datatype",
						"A string given to this ("
						+ name
						+ ":) macro was empty."
					);
				}
				return ChangerCommand.create(name, selectors.map(HookSet.from));
			},
			/*
				This ChangerCommand registers a new enchantment on the Section that the
				ChangeDescriptor belongs to.
				
				It must perform the following tasks:
				1. Silence the passed-in ChangeDescriptor.
				2. Create an enchantment for the hooks selected by the given selector.
				3. Affix an enchantment event function (that is, a function to run
				when the enchantment's event is triggered) to the <tw-enchantment> elements.
				
				You may notice some of these are side-effects to a changer function's
				proper task of altering a ChangeDescriptor. Alas...
			*/
			function makeEnchanter(desc, selector) {
				/*
					Prevent the target's source from running immediately.
					This is unset when the event is finally triggered.
				*/
				desc.enabled = false;
				
				/*
					If a rerender method was specified, then this is a "combo" macro,
					which will render its hook's code into a separate target.
					
					Let's modify the descriptor to use that target and render method.
					(Yes, the name "rerender" is #awkward.)
				*/
				if (enchantDesc.rerender) {
					desc.newTargets = (desc.newTargets || [])
						.concat({ target: selector, append: enchantDesc.rerender });
				}

				/*
					This enchantData object is stored in the descriptor's Section's enchantments
					list, to allow the Section to easily enchant and re-enchant this
					scope whenever its DOM is altered (e.g. words matching this enchantment's
					selector are added or removed from the DOM).
				*/
				const enchantData = Enchantment.create({
					functions: [
						target => {
							/*
								If the target <tw-enchantment> wraps a "block" element (currently defined as just
								<tw-story>, <tw-sidebar> or <tw-passage>) then use the enchantDesc's
								blockClassList instead of its classList. This is used to give (click: ?page)
								a different styling than just turning the entire passage text into a link.
							*/
							target.attr('class',
								target.children().is("tw-story, tw-sidebar, tw-passage")
								? enchantDesc.blockClassList
								: enchantDesc.classList
							);
						}
					],
					attr:
						/*
							Include the tabIndex for link-type enchantments, so that they
							can also be clicked using the keyboard. This includes the clickblock
							enchantment.
						*/
						(enchantDesc.classList + '').match(/\b(?:link|enchantment-clickblock)\b/)
							? { tabIndex: '0' }
							: {},
					data: {
						enchantmentEvent() {
							if (enchantDesc.once) {
								/*
									Remove this enchantment from the Section's list.
								*/
								const index = desc.section.enchantments.indexOf(enchantData);
								desc.section.enchantments.splice(index,1);
								/*
									Of course, the <tw-enchantment>s
									must also be removed.
								*/
								enchantData.disenchant();
							}
							/*
								At last, the target originally specified
								by the ChangeDescriptor can now be filled with the
								ChangeDescriptor's original source.
								
								By passing the desc as the third argument,
								all its values are assigned, not just the target.
								The second argument may be extraneous. #awkward
							*/
							desc.section.renderInto(
								desc.source,
								null,
								Object.assign({}, desc, { enabled: true })
							);
						},
					},
					scope: selector,
					section: desc.section,
				});
				/*
					Add the above object to the section's enchantments.
				*/
				desc.section.enchantments.push(enchantData);
				/*
					Enchant the scope for the first time.
				*/
				enchantData.enchantScope();
				return desc;
			},
			either(HookSet,String)
		];
	}

	/*
		A separate click event needs to be defined for .enchantment-clickblock, which is explained below.
	*/
	$(() => {
		Utils.storyElement.on(
			/*
				Put this event in the "enchantment" jQuery event namespace, alongside the other enchantment events.
			*/
			"click.enchantment",
			/*
				Sadly, there's no way to narrow this callback to just <tw-story> elements inside
				<tw-enchantment>s, as the selector argument to .on() precludes targeting the
				element itself.
			*/
			function() {
				/*
					Multiple enchantments would create multiple nested <tw-enchantment> elements.
					We must go through all of them and execute at will.
				*/
				Array.from($(this).parents('.enchantment-clickblock'))
					// compareDocumentPosition mask 8 means "contains".
					.sort((left, right) => (left.compareDocumentPosition(right)) & 8 ? 1 : -1)
					.forEach(e => {
						const event = $(e).data('enchantmentEvent');
						if (event) {
							event();
						}
					});
			}
		);
	});

	/*
		Interaction macros produce ChangerCommands that defer their attached
		hook's rendering, and enchantment a target hook, waiting for the
		target to be interacted with and then performing the deferred rendering.
	*/
	const interactionTypes = [
		/*d:
			(click: HookName or String) -> Changer

			Produces a command which, when attached to a hook, hides it and enchants the specified target, such that
			it visually resembles a link, and that clicking it causes the attached hook to be revealed.

			Example usage:
			* `There is a small dish of water. (click: "dish")[Your finger gets wet.]` causes "dish" to become a link that,
			when clicked, reveals "Your finger gets wet." at the specified location.
			* `[Fie and fuggaboo!]<shout| (click: ?shout)[Blast and damnation!]` does something similar to every hook named `<shout|`.

			Rationale:

			The (link:) macro and its variations lets you make passages more interactive, by adding links that display text when
			clicked. However, it can often greatly improve your passage code's readability to write a macro call that's separate
			from the text that it affects. You could want to write an entire paragraph, then write code that makes certain words
			into links, without interrupting the flow of the prose in the editor.

			The (click:) macro lets you separate text and code in this way. Place (click:) hooks at the end of your passages, and have
			them affect named hooks, or text strings, earlier in the passage.

			Details:

			Text or hooks targeted by a (click:) macro will be styled in a way that makes them indistinguishable from passage links,
			and links created by (link:). When any one of the targets is clicked, this styling will be removed and the hook attached to the
			(click:) will be displayed.

			Additionally, if a (click:) macro is removed from the passage, then its targets will lose the link styling and no longer be
			affected by the macro.

			Targeting ?Page or ?Passage:

			When a (click:) command is targeting the ?Page or ?Passage, instead of transforming the entire passage text into
			a link, something else will occur: a blue link-coloured border will surround the page, and
			the mouse cursor (on desktop browsers) will resemble a hand no matter what it's hovering over.

			Clicking a link when a (click:) is targeting the ?Page or ?Passage will cause both the link and the (click:) to
			activate at once.

			Using multiple (click:) commands to target the ?Page or ?Passage will require multiple clicks from the
			player to activate all of them. They activate in the order they appear on the page - top to bottom.

			See also:
			(link:), (link-reveal:), (link-repeat:), (mouseover:), (mouseout:), (replace:), (click-replace:)

			#links 5
		*/
		{
			name: "click",
			enchantDesc: {
				event    : "click",
				once     : true,
				rerender : "",
				classList: "link enchantment-link",
				blockClassList: "enchantment-clickblock",
			}
		},
		/*d:
			(mouseover: HookName or String) -> Changer

			A variation of (click:) that, instead of showing the hook when the target is clicked, shows it
			when the mouse pointer merely hovers over it. The target is also styled differently, to denote this
			hovering functionality.

			Rationale:

			(click:) and (link:) can be used to create links in your passage that reveal text or, in conjunction with
			other macros, transform the text in myriad ways. This macro is exactly like (click:), except that instead of
			making the target a link, it makes the target reveal the hook when the mouse hovers over it. This can convey
			a mood of fragility and spontaneity in your stories, of text reacting to the merest of interactions.

			Details:

			This macro is subject to the same rules regarding the styling of its targets that (click:) has, so
			consult (click:)'s details to review them.

			This macro is not recommended for use in games or stories intended for use on touch devices, as
			the concept of "hovering" over an element doesn't really make sense with that input method.
			
			See also:
			(link:), (link-reveal:), (link-repeat:), (click:), (mouseout:), (replace:), (mouseover-replace:), (hover-style:)

			#links 9
		*/
		{
			name: "mouseover",
			enchantDesc: {
				event    : "mouseenter",
				once     : true,
				rerender : "",
				classList: "enchantment-mouseover"
			}
		},
		/*d:
			(mouseout: HookName or String) -> Changer

			A variation of (click:) that, instead of showing the hook when the target is clicked, shows it
			when the mouse pointer moves over it, and then leaves. The target is also styled differently, to denote this
			hovering functionality.

			Rationale:

			(click:) and (link:) can be used to create links in your passage that reveal text or, in conjunction with
			other macros, transform the text in myriad ways. This macro is exactly like (click:), but rather than
			making the target a link, it makes the target reveal the hook when the mouse stops hovering over it.
			This is very similar to clicking, but is subtly different, and conveys a sense of "pointing" at the element to
			interact with it rather than "touching" it. You can use this in your stories to give a dream-like or unearthly
			air to scenes or places, if you wish.

			Details:

			This macro is subject to the same rules regarding the styling of its targets that (click:) has, so
			consult (click:)'s details to review them.

			This macro is not recommended for use in games or stories intended for use on touch devices, as
			the concept of "hovering" over an element doesn't really make sense with that input method.
			
			See also:
			(link:), (link-reveal:), (link-repeat:), (click:), (mouseover:), (replace:), (mouseout-replace:), (hover-style:)

			#links 13
		*/
		{
			name: "mouseout",
			enchantDesc: {
				event    : "mouseleave",
				once     : true,
				rerender : "",
				classList: "enchantment-mouseout"
			}
		}
	];
	
	interactionTypes.forEach((e) => Macros.addChanger(e.name, ...newEnchantmentMacroFns(e.enchantDesc, e.name)));
	
	/*
		Combos are shorthands for interaction and revision macros that target the same hook:
		for instance, (click: ?1)[(replace:?1)[...]] can be written as (click-replace: ?1)[...]
	*/
	/*d:
		(click-replace: HookName or String) -> Changer

		A special shorthand combination of the (click:) and (replace:) macros, this allows you to make a hook
		replace its own text with that of the attached hook whenever it's clicked. `(click: ?1)[(replace:?1)[...]]`
		can be rewritten as `(click-replace: ?1)[...]`.

		Example usage:
		```
		My deepest secret.
		(click-replace: "secret")[longing for you].
		```

		See also:
		(click-prepend:), (click-append:)

		#links 6
	*/
	/*d:
		(click-append: HookName or String) -> Changer

		A special shorthand combination of the (click:) and (append:) macros, this allows you to append
		text to a hook or string when it's clicked. `(click: ?1)[(append:?1)[...]]`
		can be rewritten as `(click-append: ?1)[...]`.

		Example usage:
		```
		I have nothing to fear.
		(click-append: "fear")[ but my own hand].
		```

		See also:
		(click-replace:), (click-prepend:)

		#links 7
	*/
	/*d:
		(click-prepend: HookName or String) -> Changer

		A special shorthand combination of the (click:) and (prepend:) macros, this allows you to prepend
		text to a hook or string when it's clicked. `(click: ?1)[(prepend:?1)[...]]`
		can be rewritten as `(click-prepend: ?1)[...]`.

		Example usage:
		```
		Who stands with me?
		(click-prepend: "?")[ but my shadow].
		```

		See also:
		(click-replace:), (click-append:)

		#links 8
	*/
	/*d:
		(mouseover-replace: HookName or String) -> Changer

		This is similar to (click-replace:), but uses the (mouseover:) macro's behaviour instead of
		(click:)'s. For more information, consult the description of (click-replace:).

		#links 10
	*/
	/*d:
		(mouseover-append: HookName or String) -> Changer

		This is similar to (click-append:), but uses the (mouseover:) macro's behaviour instead of
		(click:)'s. For more information, consult the description of (click-append:).

		#links 11
	*/
	/*d:
		(mouseover-prepend: HookName or String) -> Changer

		This is similar to (click-prepend:), but uses the (mouseover:) macro's behaviour instead of
		(click:)'s. For more information, consult the description of (click-prepend:).

		#links 12
	*/
	/*d:
		(mouseout-replace: HookName or String) -> Changer

		This is similar to (click-replace:), but uses the (mouseout:) macro's behaviour instead of
		(click:)'s. For more information, consult the description of (click-replace:).

		#links 14
	*/
	/*d:
		(mouseout-append: HookName or String) -> Changer

		This is similar to (click-append:), but uses the (mouseout:) macro's behaviour instead of
		(click:)'s. For more information, consult the description of (click-append:).

		#links 15
	*/
	/*d:
		(mouseout-prepend: HookName or String) -> Changer

		This is similar to (click-prepend:), but uses the (mouseout:) macro's behaviour instead of
		(click:)'s. For more information, consult the description of (click-prepend:).
		
		#links 16
	*/
	revisionTypes.forEach((revisionType) => {
		interactionTypes.forEach((interactionType) => {
			const enchantDesc = Object.assign({}, interactionType.enchantDesc, {
					rerender: revisionType
				}),
				name = interactionType.name + "-" + revisionType;
			Macros.addChanger(name, ...newEnchantmentMacroFns(enchantDesc, name));
		});
	});
});
