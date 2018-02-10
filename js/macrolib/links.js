"use strict";
define(['jquery', 'macros', 'utils', 'utils/selectors', 'state', 'passages', 'engine', 'datatypes/changercommand', 'internaltypes/twineerror'],
($, Macros, Utils, Selectors, State, Passages, Engine, ChangerCommand, TwineError) => {
	/*
		This module defines the behaviour of links in Harlowe - both
		the normal passage links, and the (link:) macro's links.
		But, this does not include (click:) enchantments, which
		are technically not links (but behave identically).
	*/
	const {optional} = Macros.TypeSignature;
	const emptyLinkTextError = "Links can't have empty strings for their displayed text.";
	
	/*
		Register the event that this enchantment responds to
		in a jQuery handler.
		
		Sadly, since there's no permitted way to attach a jQuery handler
		directly to the triggering element, the "actual" handler
		is "attached" via a jQuery .data() key, and must be called
		from this <tw-story> handler.
	*/
	$(() => $(Utils.storyElement).on(
		/*
			The jQuery event namespace is "passage-link".
		*/
		"click.passage-link",
		Selectors.internalLink,
		function clickLinkEvent() {
			const link = $(this),
				/*
					This could be a (link:) command. Such links' events
					are, due to limitations in the ChangeDescriptor format,
					attached to the <tw-expression> containing it.
				*/
				event = link.parent().data('clickEvent');
			
			if (event) {
				event(link);
				return;
			}
			/*
				If no event was registered, then this must be
				a passage link...
			*/
			const next = link.attr('passage-name');
			if (next) {
				// TODO: stretchtext
				Engine.goToPassage(next,false);
				return;
			}
			/*
				Or, a (link-undo:) link.
			*/
			if (link.is('[undo]')) {
				Engine.goBack();
				return;
			}
		}
	));
	
	[
		/*d:
			(link: String) -> Changer
			Also known as: (link-replace:)
			
			Makes a command to create a special link that can be used to show a hook.
			
			Example usage:
			`(link: "Stake")[The dracula crumbles to dust.]` will create a link reading "Stake"
			which, when clicked, disappears and shows "The dracula crumbles to dust."
			
			Rationale:
			
			As you're aware, links are what the player uses to traverse your story. However,
			links can also be used to simply display text or run macros inside hooks. Just
			attach the (link:) macro to a hook, and the entire hook will not run or appear at all until the
			player clicks the link.
			
			Note that this particular macro's links disappear when they are clicked - if you want
			their words to remain in the text, consider using (link-reveal:).
			
			Details:
			This creates a link which is visually indistinguishable from normal passage links.
			
			See also:
			(link-reveal:), (link-repeat:), (link-goto:), (click:)

			#links 1
		*/
		["link", "link-replace"],
		/*d:
			(link-reveal: String) -> Changer
			
			Makes a command to create a special link that shows a hook, keeping the link's
			text visible after clicking.
			
			Example usage:
			`(link-reveal: "Heart")[broken]` will create a link reading "Heart"
			which, when clicked, changes to plain text, and shows "broken" after it.
			
			Rationale:
			
			This is similar to (link:), but allows the text of the link to remain in the passage
			after it is clicked. It allows key words and phrases in the passage to expand and
			reveal more text after themselves. Simply attach it to a hook, and the hook will only be
			revealed when the link is clicked.
			
			Details:
			This creates a link which is visually indistinguishable from normal passage links.
			
			If the link text contains formatting syntax, such as "**bold**", then it will be retained
			when the link is demoted to text.
			
			See also:
			(link:), (link-repeat:), (link-goto:), (click:)

			#links 2
		*/
		["link-reveal"],
		/*d:
			(link-repeat: String) -> Changer
			
			Makes a command to create a special link that shows a hook, and, when clicked again,
			re-runs the hook, appending its contents again.
			
			Example usage:
			`(link-repeat: "Add cheese")[(set:$cheese to it + 1)]` will create a link reading "Add cheese"
			which, when clicked, adds 1 to the $cheese variable using (set:), and can be clicked repeatedly.
			
			Rationale:
			
			This is similar to (link:), but allows the created link to remain in the passage
			after it is clicked. It can be used to make a link that displays more text after
			each click, or which must be clicked multiple times before something can happen (using (set:)
			and (if:) to keep count of the number of clicks).
			
			Details:
			This creates a link which is visually indistinguishable from normal passage links.
			Each time the link is clicked, the text and macros printed in the previous run are
			appended.
			
			See also:
			(link-reveal:), (link:), (link-goto:), (click:)
			
			#links 3
		*/
		["link-repeat"]
	].forEach(arr =>
		Macros.addChanger(arr,
			(_, expr) => {
				if (!expr) {
					return TwineError.create("macrocall", emptyLinkTextError);
				}
				return ChangerCommand.create(arr[0], [expr]);
			},
			(desc, text) => {
				/*
					This check ensures that multiple concatenations of (link:) do not overwrite
					the original source with their successive '<tw-link>' substitutions.
				*/
				if (!desc.innerSource) {
					desc.innerSource = desc.source;
				}
				desc.source = '<tw-link tabindex=0>' + text + '</tw-link>';
				/*
					Only (link-replace:) removes the link on click (by using the "replace"
					append method) - the others merely append.
				*/
				desc.append = arr[0] === "link" ? "replace" : "append";
				desc.data.clickEvent = (link) => {
					desc.source = desc.innerSource;
					desc.section.renderInto(desc.innerSource + "", null, desc);
					/*
						Only (link-reveal:) turns the link into plain text:
						the others either remove it (via the above) or leave it be.
					*/
					if (arr[0] === "link-reveal") {
						link.contents().unwrap();
					}
				};
			},
			[String]
		)
	);
	
	/*
		(link-goto:) is an eager version of (link:...)[(goto:...)], where the
		passage name ((goto:)'s argument) is evaluated alongside (link:)'s argument.
		It is also what the standard link syntax desugars to.
	*/
	Macros.add
		/*d:
			(link-goto: String, [String]) -> Command
			
			Takes a string of link text, and an optional destination passage name, and makes a command to create
			a link that takes the player to another passage. The link functions identically to a standard link.
			This command should not be attached to a hook.
			
			Example usage:
			* `(link-goto: "Enter the cellar", "Cellar")` is approximately the same as `[[Enter the cellar->Cellar]]`.
			* `(link-goto: "Cellar")` is the same as `[[Cellar]]`.

			Rationale:
			This macro serves as an alternative to the standard link syntax (`[[Link text->Destination]]`), but has a couple of
			slight differences.

			* The link syntax lets you supply a fixed text string for the link, and an expression for the destination
			passage's name. However, it does not provide any other means of computing the link. (link-goto:) also
			allows the link text to be any expression - so, something like `(link-goto: "Move " + $name + "to the cellar", "Cellar")`
			can be written.

			* The resulting command from this macro, like all commands, can be saved and used elsewhere.
			If you have a complicated link you need to use in several passages, you could (set:) it to a variable and use that variable
			in its place.

			Details:
			As a bit of trivia... the Harlowe engine actually converts all standard links into (link-goto:) macro calls internally -
			the link syntax is, essentially, a syntactic shorthand for (link-goto:).

			See also:
			(link:), (link-reveal:), (link-repeat:), (link-undo:), (goto:)

			#links 4
		*/
		(["link-goto"],
			/*
				Return a new (link-goto:) object.
			*/
			(section, text, passage) => {
				if (!text) {
					return TwineError.create("macrocall", emptyLinkTextError);
				}
				return {
					TwineScript_TypeName: "a (link-goto: "
						+ Utils.toJSLiteral(text) + ", "
						+ Utils.toJSLiteral(passage) + ") command",
					TwineScript_ObjectName: "a (link-goto:) command",
					
					TwineScript_Print() {
						/*
							The string representing the passage name is evaluated as TwineMarkup here -
							the link syntax accepts TwineMarkup in both link and passage position
							(e.g. [[**Go outside**]], [[$characterName->$nextLocation]]), and the text
							content of the evaluated TwineMarkup is regarded as the passage name,
							even though it is never printed.
							
							One concern is that of evaluation order: the passage name is always evaluated
							before the link text, as coded here. But, considering the TwineMarkup parser
							already discards the ordering of link text and passage name in the link
							syntax ([[a->b]] vs [[b<-a]]) then this can't be helped, and probably doesn't matter.
						*/
						const passageName = section.evaluateTwineMarkup(Utils.unescape(passage || text));
						
						/*
							If a <tw-error> was returned by evaluateTwineMarkup, replace the link with it.
						*/
						if (passageName instanceof $) {
							/*
								section.runExpression() is able to accept jQuery objects
								being returned from TwineScript_Print().
							*/
							return passageName;
						}
						/*
							Check that the passage is indeed available.
						*/
						if (!Passages.has(passageName)) {
							/*
								Since the passage isn't available, create a broken link.
								TODO: Maybe this should be an error as well??
							*/
							return '<tw-broken-link passage-name="' + Utils.escape(passageName) + '">'
								+ (text || passage)
								+ '</tw-broken-link>';
						}
						/*
							Previously visited passages may be styled differently compared
							to unvisited passages.
						*/
						const visited = (State.passageNameVisited(passageName));
						
						/*
							This regrettably exposes the destination passage name in the DOM...
							but I hope to somehow eliminate this in the near future.
						*/
						return '<tw-link tabindex=0 ' + (visited > 0 ? 'class="visited" ' : '')
							// Always remember to Utils.escape() any strings that must become raw HTML attributes.
							+ 'passage-name="' + Utils.escape(passageName)
							+ '">' + (text || passage) + '</tw-link>';
					}
				};
			},
		[String, optional(String)])

		/*d:
			(link-undo: String) -> Command

			Takes a string of link text, and produces a link that, when clicked, undoes the current turn and
			sends the player back to the previously visited passage. The link appears identical to a typical
			passage link.
			This command should not be attached to a hook.

			Example usage:
			`(link-undo:"Retreat")` behaves the same as `(link:"Retreat")[(undo:)]`.

			Rationale:
			The ability to undo the player's last turn, as an alternative to (go-to:), is explained in the documentation
			of the (undo:) macro. This macro provides a shorthand for placing (undo:) inside a (link:) attached hook.

			You may, as part of customising your story, be using (replace:) to change the ?sidebar, and remove its
			default "undo" link. If so, you can selectively provide undo links at certain parts of your story instead,
			by using this macro.

			Details:
			As with (undo:), if this command is used on the play session's first turn, an error will be produced (as there
			is yet nothing to undo at that time.) You can check which turn it is by examining the `length` of the (history:)
			array.

			See also:
			(undo:), (link-goto:)

			#links 5
		*/
		("link-undo", (section, text) => {
				if (!text) {
					return TwineError.create("macrocall", emptyLinkTextError);
				}
				return {
					TwineScript_ObjectName: "a (link-undo:"
						+ Utils.toJSLiteral(text) + ") command",
					TwineScript_TypeName:   "a (link-undo:) command",
					TwineScript_Print() {
						/*
							Users of (link-undo:) should always check that (history:) is longer than 1.
						*/
						if (State.pastLength < 1) {
							return TwineError.create("macrocall", "I can't use (link-undo:) on the first turn.");
						}
						/*
							Much like (link-goto:), this too reveals its purpose by including an 'undo' attribute,
							which is used by the "click.passage-link" event handler.
						*/
						return '<tw-link tabindex=0 undo>' + text + '</tw-link>';
					},
				};
			},
		[String]);
});
