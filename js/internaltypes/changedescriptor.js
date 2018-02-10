"use strict";
define(['jquery', 'utils', 'renderer', 'datatypes/hookset'], ($, {assertOnlyHas, impossible, transitionIn}, {exec}, HookSet) => {
	/*
		When a new Section (generally a hook or expression) is about to be rendered,
		a ChangeDescriptor is created and fed into all of the ChangerCommands which are
		attached to the Section. They mutate the ChangeDescriptor, and the result describes
		all of the changes that must be made to the Section on rendering.
	*/

	/*
		changeDescriptorShape is an array of all expected properties on
		ChangeDescriptor instances. It's cached for performance paranoia.
	*/
	let changeDescriptorShape;

	const ChangeDescriptor = {
		
		// A ChangeDescriptor is a TwineScript internal object with the following values:
		
		// {String} source            The hook's source, which can be finagled before it is run.
		source:            "",

		// {String} innerSource       Used by (link:), this stores the original source if some kind
		//                            of "trigger element" needs to be rendered in its place initially.
		innerSource:       "",
		
		// {Boolean} enabled          Whether or not this code is enabled.
		//                            (Disabled code won't be used until something enables it).
		enabled:          true,
		
		// {jQuery|HookSet}           Where to render the source, if not the hookElement.
		target:           null,
		
		// {String} append            Which jQuery method name to append the source to the dest with.
		append:           "append",

		// {[newTarget]} newTargets   Alternative targets (which are {target,append} objects) to use instead of the original.
		newTargets:       null,
		
		// {String} [transition]      Which built-in transition to use.
		transition:       "instant",
		
		// {Number|Null} [transitionTime]  The duration of the transition, in ms, or null if the default speed should be used.
		transitionTime:   null,

		// {Object} loopVars          An object of {temp variable : values array} pairs, which the source should loop over.
		//                            Used only by (for:)
		loopVars:         null,
		
		// {Array} styles             A set of CSS styles to apply inline to the hook's element.
		styles:           null,
		
		// {Array} [attr]             Array of objects of attributes to apply to the <tw-expression> using $.fn.attr().
		//                            Some attributes' values can be functions that reference existing values. Therefore,
		//                            rather than a single object, this must be an array of objects.
		//                            Used by (hook:) and (css:).
		attr:             null,
		
		// {Object} [data]            Data to attach to the <tw-expression> using $.fn.attr().
		//                            Used only by (link:).
		data:             null,
		
		// {Object} [section]         A Section that 'owns' this ChangeDescriptor.
		//                            Used by enchantment macros to determine where to register
		//                            their enchantments to.
		section:          null,
		
		/*
			This method produces a short list of properties this descriptor has, which were altered by the changers
			run against it (or supplied to it at creation).
			It's used by (hover-style:) to ensure that the changers it receives only affect styles.
		*/
		summary() {
			return [
				"source", "innerSource", "enabled", "target", "append", "newTargets",
				"transition", "transitionTime"
			]
			.filter(e => this.hasOwnProperty(e))
			.concat([
				this.attr.length && "attr",
				this.styles.length && "styles",
				Object.keys(this.loopVars).length && "loopVars",
				Object.keys(this.data).length && "data",
			].filter(Boolean));
		},

		/*
			This creates an inheriting ChangeDescriptor, and is basically
			another shorthand for the old create-assign pattern.
			ChangeDescriptors can delegate to earlier descriptors if need be.
			Passed-in properties can be added to the descriptor, and a single
			(presumably composed) ChangerCommand as well.
		*/
		create(properties, changer) {
			const ret = Object.assign(Object.create(this), {
					// Of course, we can't inherit array contents from the prototype chain,
					// so we have to copy the arrays.
					attr:          [].concat(this.attr          || []),
					styles:        [].concat(this.styles        || []),
					loopVars:      this.loopVars || {},
					data:          this.data || {},
				}, properties);
			/*
				If a ChangerCommand was passed in, run it.
			*/
			if (changer) {
				changer.run(ret);
			}
			return ret;
		},
		
		/*
			This method applies the style/attribute/data entries of this descriptor
			to the target HTML element.
		*/
		update() {
			const {section, newTargets} = this;
			let {target} = this;
			
			/*
				This loop iterates over every DOM element that the target
				ultimately includes.
			*/
			const forEachTarget = (elem) => {
				/*
					Apply the style attributes to the element.
				*/
				if (Array.isArray(this.styles) && this.styles.length > 0) {
					/*
						Some styles depend on the pre-existing CSS to calculate their values
						(for instance, "blurrier" converts the dominant text colour into a
						text shadow colour, changing the text itself to transparent.)
						If the user has complicated story CSS, it's not possible
						to determine what colour should be used for such a hook
						until it's connected to the DOM. So, now this .css call is deferred
						for 1 frame, which should (._.) be enough time for it to become attached.
					*/
					setTimeout(() => elem.css(Object.assign(...[{}].concat(this.styles))));
				}
				/*
					If HTML attributes were included in the changeDescriptor, apply them now.
				*/
				if (this.attr) {
					this.attr.forEach(e => elem.attr(e));
				}
				/*
					Same with jQuery data (such as functions to call in event of, say, clicking).
				*/
				if (this.data) {
					elem.data(this.data);
				}
			};

			/*
				forEachTarget should be run on every target element, be there a set or a single one.
				As in render(), the newTargets should be used instead of the original if present.
			*/
			if (Array.isArray(newTargets) && newTargets.length) {
				target = newTargets.map(t => t.target);
			}

			[].concat(target).forEach(target => {
				if (HookSet.isPrototypeOf(target)) {
					target.forEach(section, forEachTarget);
				}
				else {
					/*
						It's OK for length>1 jQuery collections to be treated as single
						elements here, because the methods called on them (data(), attr(), css())
						work regardless of number of contained elements.
					*/
					forEachTarget(target);
				}
			});
		},
		
		/*
			This method renders TwineMarkup, executing the expressions
			within. The expressions only have visibility within this passage.
			
			@return {jQuery} The rendered passage DOM.
		*/
		render() {
			const
				{source, transition, transitionTime, enabled, section, newTargets} = this;
			let
				{target, append} = this;
			
			assertOnlyHas(this, changeDescriptorShape);

			/*
				First: if this isn't enabled, nothing needs to be rendered. However,
				the source needs to be saved in case the (show:) macro is used on this.
				We store it as "hiddenSource" in every element's jQuery data store.
			*/
			if (!enabled || (target.popAttr('hidden') !== undefined)) {
				/*
					You may wonder if this should use the descriptor's 'innerSource', which is used by
					(link:) to store the "inner" source behind the link's <tw-link> source. What should
					happen is that when the hidden hook is shown, the link's <tw-link> is shown, which then
					remains clickable and able to reveal the innerSource.

					Also, this should not use newTargets, as a construction of the form "(hide:)(replace:?b)|a>[]"
					followed by (show:?a) should result in ?a appearing, instead of nothing happening. (And
					(show:?b) shouldn't do anything, either.)
				*/
				ChangeDescriptor.create({target,data:{hiddenSource:source}}).update();
				return $();
			}

			/*
				newTargets are targets specified by revision macros (such as ?foo in (replace:?foo))
				which should be used instead of the original.
			*/
			if (Array.isArray(newTargets) && newTargets.length) {
				target = newTargets;
			}
			/*
				If there's no target (after modifying newTargets), something incorrect has transpired.
			*/
			if (!target) {
				impossible("ChangeDescriptor.render",
					"ChangeDescriptor has source but not a target!");
				return $();
			}
			/*
				For "collection" targets (a HookSet, newTarget array, or a length>1 jQuery), each target must be rendered separately,
				by performing recursive render() calls. Then, return a jQuery containing every created element,
				so that consumers like Section.renderInto() can modify all of their <tw-expressions>, etc.
			*/
			let dom = $();
			const renderAll = append => target => {
				/*
					Generate a new descriptor which has the same properties
					(rather, delegates to the old one via the prototype chain)
					but has just this hook/word as its target.
					Then, render using that descriptor.
				*/
				dom = dom.add(this.create({ target, append, newTargets:null }).render());
			};
			[].concat(target).forEach(function loop(target, _, __, append_ = append) {
				// Is it a HookSet,
				if (HookSet.isPrototypeOf(target)) {
					target.forEach(section, renderAll(append_));
				}
				// a jQuery of <tw-hook> or <tw-expression> elements,
				else if (target.jquery && target.length > 1) {
					Array.from(target).map($).forEach(renderAll(append_));
				}
				// or a newTarget object?
				else if (target.target && target.append) {
					/*
						the newTarget's "target" property may be a HookSet or jQuery.
						To handle this, we unwrap the newTarget object and pass its "append"
						value to a recursive call to "loop"
					*/
					loop(target.target, _, __, target.append);
				}
			});
			/*
				Return the compiled DOM, or return an empty set if the target is a collection
				and the above loop didn't produce anything.
			*/
			if (dom.length || Array.isArray(target) || HookSet.isPrototypeOf(target)) {
				return dom;
			}
			/*
				Henceforth, the target is a single jQuery.
			*/

			/*
				Check to see that the given jQuery method in the descriptor
				actually exists, and potentially tweak the name if it does not.
			*/
			if (!(append in target)) {
				/*
					(replace:) should actually replace the interior of the hook with the
					content, not replace the hook itself (which is what .replaceWith() does).
					So, we need to do .empty() beforehand, then change the method to "append"
					(though "prepend" will work too).
				*/
				if (append === "replace") {
					target.empty();
					append = "append";
				}
				/*
					If I wished to add a variant of (replace:) that did remove the entire
					hook, then I'd change append to "replaceWith".
				*/
				else {
					impossible("Section.render", "The target doesn't have a '" + append + "' method.");
					return $();
				}
			}
			/*
				Render the TwineMarkup source into a HTML DOM structure.
				
				You may notice that the design of this and renderInto() means
				that, when a HookSet has multiple targets, each target has
				its own distinct rendering of the same TwineMarkup.
				
				(Note: source may be '' if the descriptor's append method is "remove".
				In which case, let it be an empty set.)
				
				Notice also that the entire expression is wrapped in $():
				a jQuery must be returned by this method, and $(false)
				conveniently evaluates to $().Otherwise, it converts the
				array returned by $.parseHTML into a jQuery.
				
				This has to be run as close to insertion as possible because of
				the possibility of <script> elements being present - 
				$.parseHTML executes scripts immediately on encountering them (if
				the third arg is true) and it wouldn't do to execute them and then
				early-exit from this method.
			*/
			
			dom = $(source &&
				$.parseHTML(exec(source), document, true));
			
			/*
				Now, insert the DOM structure into the target element.
				
				Here are the reasons why the DOM must be connected to the target before the
				expressions are evaluated:
				
				* Various Twine macros perform DOM operations on this pre-inserted jQuery set of
				rendered elements, but assume that all the elements have a parent item, so that e.g.
				.insertBefore() can be performed on them.
				
				* Also, and perhaps more saliently, the next block uses .find() to select
				<tw-macro> elements etc., which assumes that the jQuery object has a single
				container element at its "root level".
				
				* Finally, sensor macros' interval functions deactivate themselves if the
				section is disconnected from Utils.storyElement, and if they initially
				run without being connected, they will immediately deactivate.
			*/
			target[append](
				// As mentioned above, dom may be empty if append is "remove".
				dom.length ? dom : undefined
			);
			/*
				Apply the style/data/attr attributes to the target element.
			*/
			this.update();
			
			/*
				Transition it using this descriptor's given transition.
			*/
			if (transition) {
				transitionIn(
					/*
						There's a slight problem: when we want to replace the
						target, we don't need to apply a transition to every
						element, so we just transition the target itself.
						
						But, when we're *appending* to the target, we don't want
						the existing material in it to be transitioned, so
						then we must resort to transitioning every element.
						
						This is #awkward, I know...
					*/
					append === "replace" ? target : dom,
					transition,
					transitionTime
				);
			}
			
			return dom;
		}
	};
	changeDescriptorShape = Object.keys(ChangeDescriptor);
	
	return Object.seal(ChangeDescriptor);
});
