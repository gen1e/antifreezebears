"use strict";
define(['jquery', 'utils'], ($, {impossible, escape}) => {
	/*
		TwineErrors are errors created by the TwineScript runtime. They are supplied with as much
		information as they can, in order to give the author sufficient assistance in
		understanding the error.
	*/
	
	/*
		This dictionary supplies explanations for the most typical error types.
	*/
	const errorExplanations = {
		syntax:        "The markup seems to contain a mistake.",
		saving:        "I tried to save or load the game, but I couldn't do it.",
		operation:     "I tried to perform an operation on some data, but the data's type was incorrect.",
		macrocall:     "I tried to use a macro, but its call wasn't written correctly.",
		datatype:      "I tried to use a macro, but was given the wrong type of data to it.",
		keyword:       "I was given a keyword in a way that I didn't understand.",
		infinite:      "I almost ended up doing the same thing over and over, forever.",
		property:      "I tried to access a value in a string/array/datamap, but I couldn't find it.",
		unimplemented: "I currently don't have this particular feature. I'm sorry.",
		javascript:    "This error message was reported by your browser's Javascript engine. "
			+ "I don't understand it either, but it usually means that an expression was badly written.",
	},
	
	TwineError = {
		/*
			Normally, the type by itself suggests a rudimentary explanation from the above dict.
			But, a different explanation can be provided by the caller, if they choose.
		*/
		create(type, message, explanation) {
			if (!message) {
				impossible("TwineError.create", "called with only 1 string.");
			}
			/*
				Whatever happens, there absolutely must be a valid explanation from either source.
			*/
			if(!(explanation || type in errorExplanations)) {
				impossible('TwineError.create','no error explanation given');
			}
			
			return Object.assign(Object.create(this), {
				/*
					The type of the TwineError consists of one of the errorExplanations keys.
				*/
				type,
				message,
				explanation,
			});
		},
		
		/*
			This utility function converts a Javascript Error into a TwineError.
			This allows them to be render()ed by Section.
			
			Javascript error messages are presaged with a coffee cup (\u2615),
			to signify that the browser produced them and not Twine.
		*/
		fromError(error) {
			return TwineError.create("javascript", "\u2615 " + error.message);
		},
		
		/*
			In TwineScript, both the runtime (operations.js) and Javascript eval()
			of compiled code (by compiler.js) can throw errors. They should be treated
			as equivalent within the engine.
			
			If the arguments contain a native Error, this will return that error.
			Or, if it contains a TwineError, return that as well.
			This also recursively examines arrays' contents.
			
			Maybe in the future, there could be a way to concatenate multiple
			errors into a single "report"...
			
			@return {Error|TwineError|Boolean} The first error encountered, or false.
		*/
		containsError(...args) {
			return args.reduce(
				(last, e) => last ? last
					: e instanceof Error ? e
					: TwineError.isPrototypeOf(e) ? e
					: Array.isArray(e) ? TwineError.containsError(...e)
					: false,
				false
			);
		},
		
		/*
			Twine warnings are just errors with a special "warning" bit.
		*/
		createWarning(type, message) {
			return Object.assign(this.create(type, message), {
				warning: true,
			});
		},
		
		render(titleText) {
			/*
				Default the titleText value. It may be undefined if, for instance, debug mode is off.
			*/
			titleText = titleText || "";
			const errorElement = $("<tw-error class='"
					+ (this.type === "javascript" ? "javascript ": "")
					+ (this.warning ? "warning" : "error")
					+ "' title='" + escape(titleText) + "'>" + escape(this.message) + "</tw-error>"),
				/*
					The explanation text element.
				*/
				explanationElement = $("<tw-error-explanation>")
					.text(this.explanation || errorExplanations[this.type])
					.hide(),
				/*
					The button to reveal the explanation consists of a rightward arrowhead
					which is rotated when the explanation is unfolded down.
				*/
				explanationButton = $("<tw-error-explanation-button tabindex=0>")
					/*
						The arrowhead must be in its own <span> so that it can be rotated.
						The CSS class "folddown-arrowhead" is used exclusively for this kind of thing.
					*/
					.html("<span class='folddown-arrowhead'>&#9658;</span>");
					
			/*
				Wire up the explanation button to reveal the error explanation.
			*/
			explanationButton.on('click', () => {
				explanationElement.toggle();
				explanationButton.children(".folddown-arrowhead").css(
					'transform',
					'rotate(' + (explanationElement.is(':visible') ? '90deg' : '0deg') + ')'
				);
			});
			
			errorElement.append(explanationButton).append(explanationElement);
			
			return errorElement;
		},
	};
	return TwineError;
});
