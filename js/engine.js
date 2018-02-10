"use strict";
define(['jquery', 'utils', 'utils/selectors', 'state', 'section', 'passages'],
($, Utils, Selectors, State, Section, Passages) => {
	/*
		Utils.storyElement is a getter, so we need a reference to Utils as well
		as all of these methods.
	*/
	const {escape, impossible, passageSelector, transitionOut} = Utils;
	
	/*
		Engine is a singleton class responsible for rendering passages to the DOM.
	*/
	let Engine;
	
	/*
		Story options, loaded at startup and provided to other modules that may use them.
		
		Implemented values:
		
		debug : debug mode is ready. Click the bug icon to reveal all macro spans.
		undo : enable the undo button.
		redo : enable the redo button.
		ifid : the UUID of the story. The only non-boolean option.
	*/
	const options = Object.create(null);

	/*
		Creates the HTML structure of the <tw-passage>. Sub-function of showPassage().

		@return {jQuery}
	*/
	function createPassageElement () {
		const
			container = $('<tw-passage><tw-sidebar>'),
			sidebar = container.children(Selectors.sidebar);
		
		/*
			Generate the HTML for the permalink.
			(This is currently unavailable as of Harlowe 1.0)
		*/
		if (options.permalink && State.save) {
			sidebar.append(
				'<tw-icon tabindex=0 class="permalink" title="Permanent link to this passage"><a href="#' + State.save() + '">&sect;'
			);
		}
		// Apart from the Permalink, the sidebar buttons consist of Undo (Back) and Redo (Forward) buttons.
		const
			back = $('<tw-icon tabindex=0 class="undo" title="Undo">&#8630;</tw-icon>').click(Engine.goBack),
			fwd  = $('<tw-icon tabindex=0 class="redo" title="Redo">&#8631;</tw-icon>').click(Engine.goForward);

		if (State.pastLength <= 0) {
			back.css("visibility", "hidden");
		}
		if (State.futureLength <= 0) {
			fwd.css( "visibility", "hidden");
		}
		sidebar.append(back).append(fwd);

		return container;
	}
	
	/*
		A small helper that generates a HTML tag containing injected
		setup passage source. Used in showPassage.
	*/
	function setupPassageElement(tagType, setupPassage) {
		return "<tw-include type=" + tagType + " title='"
			+ escape(setupPassage.get('name'))
			+ "'>"
			+ setupPassage.get('source')
			+ "</tw-include>";
	}
	
	/*
		Shows a passage by transitioning the old passage(s) out, and then adds the new passages.

		displayOptions allows stretchtext (boolean), transitionIn (string)
		or transitionOut (string) to be selected.
	*/
	function showPassage (name, displayOptions = {}) {
		// Confirm that the options object only contains
		// what this function recognises.
		Utils.assertOnlyHas(displayOptions, ["stretch", "transitionIn", "transitionOut"]);

		const
			// The passage
			passageData = Passages.get(name),
			// The <tw-story> element
			story = Utils.storyElement;

		let
			/*
				The <tw-story>'s parent is usually <body>, but if this game is embedded
				in a larger HTML page, it could be different.
			*/
			parent = story.parent(),
			{
				// Whether or not this should be a stretchtext transition
				stretch,
				// The transition to use to remove the passage. This is
				// of course only used when stretchtext is false.
				transitionOut: transitionOutName,

				transitionIn: transitionInName,
			} = displayOptions;

		transitionOutName = transitionOutName || "instant";

		/*
			If the story has a <tw-enchantment> around it (which could have been placed)
			by an (enchant: "<tw-story>") macro), then disenchant.
			Note that since old passages take awhile to transition out, disenchanting everything
			else within them would be unwise.
		*/
		if (parent.is(Selectors.enchantment)) {
			/*
				But first, undo the (enchant:) "inherit" kludge for <tw-story>, described in Enchantment.
			*/
			const enchantedProperties = parent.data('enchantedProperties');
			if (enchantedProperties) {
				story.css(enchantedProperties.reduce((a,e)=>(a[e] = "",a),{}));
			}
			/*
				That being done, continue as above.
			*/
			parent = story.unwrap().parent();
		}

		/*
			Early exit: the wrong passage name was supplied.
			Author error must never propagate to this method - it should have been caught earlier.
		*/
		if (!passageData || !(passageData instanceof Map) || !passageData.has('source')) {
			impossible("Engine.showPassage", "There's no passage with the name \""+name+"\"!");
		}
		
		/*
			Because rendering a passage is a somewhat intensive DOM manipulation,
			the <tw-story> is detached before and reattached after.
		*/
		story.detach();
		
		/*
			Find out how many tw-passage elements there are currently in the
			destination element.
		*/
		const oldPassages = Utils.$(story.children(passageSelector));
		
		/*
			If this isn't a stretchtext transition, send away all of the
			old passage instances.
		*/
		if (!stretch && transitionOutName) {
			transitionOut(oldPassages, transitionOutName);
			/*
				This extra adjustment is separate from the transitionOut method,
				as it should only apply to the block-level elements that are
				passages. It enables the new transitioning-in passage to be drawn
				over the departing passage. Note: this may prove to be too restrictive
				in the future and need to be made more subtle.
			*/
			oldPassages.css('position','absolute');
		}
		
		/*
			Make the passage's tags visible in the DOM, on both the <tw-passage> and
			the <tw-story>, for user CSS availability.
		*/
		const tags = (passageData.get('tags') || []).join(' ');
		const newPassage = createPassageElement().appendTo(story)
			.attr({tags});

		/*
			Only the most recent passage's tags are present on the <tw-story>.
		*/
		story.attr({tags});
		
		const section = Section.create(newPassage);
		
		/*
			Actually do the work of rendering the passage now.
			First, gather the source of the passage in question.
		*/
		let source = passageData.get('source');
		
		/*
			Now, we add to it the source of the 'header' and 'footer' tagged passages.
			We explicitly include these passages inside <tw-header> elements
			so that they're visible to the author when they're in debug mode, and can clearly
			see the effect they have on the passage.
		*/
		/*d:
			header tag

			It is often very useful to want to reuse a certain set of macro calls in every passage,
			or to reuse an opening block of text. You can do this by giving the passage the special
			tag `header`, or `footer`. All passages with these tags will have their source text included at the top
			(or, for `footer`, the bottom) of every passage in the story, as if by an invisible (display:) macro call.

			If many passages have the `header` tag, they will all be displayed, ordered by their passage
			name, sorted alphabetically, and by case (capitalised names appearing before lowercase names).

			#transclusion 1
		*/
		/*d:
			debug-header tag
			
			This special tag is similar to the `header` tag, but only causes the passage
			to be included if you're running the story in debug mode.

			This has a variety of uses: you can put special debug display code in this
			passage, which can show the status of certain variables or provide links
			to change the game state as you see fit, and have that code
			be present in every passage in the story, but only during testing.

			All passages tagged with `debug-header` will run before the passages tagged `header` will run,
			ordered by their passage name, sorted alphabetically, and by case (capitalised names appearing
			before lowercase names).

			#transclusion 4
		*/
		/*d:
			footer tag

			This special tag is identical to the `header` tag, except that it places the passage
			at the bottom of all visited passages, instead of the top.

			#transclusion 2
		*/
		/*d:
			debug-footer tag
			
			This special tag is identical to the `debug-header` tag, except that it places the passage
			at the bottom of all visited passages, instead of the top.

			All passages tagged with `debug-footer` will run, in alphabetical order
			by their passage name, after the passages tagged `footer` have been run.

			#transclusion 5
		*/
		source =
			Passages.getTagged('header')
			.map(setupPassageElement.bind(0, "header"))
			.join('')
			+ (options.debug
				? Passages.getTagged('debug-header')
					.map(setupPassageElement.bind(0, "debug-header"))
					.join('')
				: '')
			+ source
			+ Passages.getTagged('footer')
			.map(setupPassageElement.bind(0, "footer"))
			.join('')
			+ (options.debug
				? Passages.getTagged('debug-footer')
					.map(setupPassageElement.bind(0, "debug-footer"))
					.join('')
				: '')
			;
		
		/*
			We only add the startup and debug-startup passages if this is the very first passage.
			Note that the way in which source is modified means that startup code
			runs before header code.
		*/
		/*d:
			startup tag

			This special tag is similar to `header`, but it will only cause the passage
			to be included in the very first passage in the game.

			This is intended to simplify the story testing process: if you have setup
			code which creates variables used throughout the entire story, you should put it in
			a passage with this tag, instead of the starting passage. This allows you to test your
			story from any passage, and, furthermore, easily change the starting passage if you wish.

			All passages tagged with `startup` will run, in alphabetical order
			by their passage name, before the passages tagged `header` will run.

			#transclusion 3
		*/
		/*d:
			debug-startup tag
			
			This special tag is similar to the `startup` tag, but only causes the passage
			to be included if you're running the story in debug mode.

			This has a variety of uses: you can put special debugging code into this
			passage, or set up a late game state to test, and have that code run
			whenever you use debug mode, no matter which passage you choose to test.

			All passages tagged with `debug-startup` will run, in alphabetical order
			by their passage name, after the passages tagged `startup` will run.

			#transclusion 6
		*/
		if (State.pastLength <= 0) {
			// Note that this places debug-startup passages after startup passages.
			if (options.debug) {
				source = Passages.getTagged('debug-startup')
					.map(setupPassageElement.bind(0, "debug-startup"))
					.join('')
					+ source;
			}
			source = Passages.getTagged('startup')
				.map(setupPassageElement.bind(0, "startup"))
				.join('')
				+ source;
		}
		
		/*
			Then, run the actual passage.
		*/
		section.renderInto(
			source,
			newPassage,
			/*
				Use the author's styles, assigned using TwineScript,
				as well as this basic, default ChangeDescriptor-like object
				supplying the transition.
			*/
			{ transition: transitionInName || "dissolve" }
		);
		
		/*
			Reattach the <tw-story> and any <tw-enchantment> elements (or whatnot)
			that now surround it.
		*/
		parent.append(story.parents().length ? story.parents().last() : story);
		/*
			In stretchtext, scroll the window to the top of the inserted element,
			minus an offset of 5% of the viewport's height.
			Outside of stretchtext, just scroll to the top of the <tw-story>'s element.
		*/
		scroll(
			0,
			stretch ? newPassage.offset().top - ($(window).height() * 0.05) : story.offset().top
		);
	}
	
	Engine = {
		
		/*
			Moves the game state backward one turn. If there is no previous state, this does nothing.
		*/
		goBack() {
			//TODO: get the stretch value from state

			if (State.rewind()) {
				showPassage(State.passage);
			}
		},

		/*
			Moves the game state forward one turn, after a previous goBack().
		*/
		goForward() {
			//TODO: get the stretch value from state

			if (State.fastForward()) {
				showPassage(State.passage);
			}
		},

		/*
			Displays a new passage, advancing the game state forward.
		*/
		goToPassage(id, stretch) {
			// Update the state.
			State.play(id);
			showPassage(id, {stretch});
		},
		
		/*
			Displays a new passage WITHOUT changing the game state.
			Used exclusively by state-loading routines.
		*/
		showPassage: showPassage,
		
		options: options,
	};
	
	return Object.freeze(Engine);
});
