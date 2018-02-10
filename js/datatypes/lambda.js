"use strict";
define(['utils', 'utils/operationutils', 'internaltypes/varscope', 'internaltypes/twineerror'], ({toJSLiteral, insensitiveName, plural}, {typeName, objectName, singleTypeCheck}, VarScope, TwineError) => {
	/*d:
		Lambda data

		Suppose you want to do a complicated task with an array, like, say, convert all of its strings to lowercase,
		or check if its datamaps have "health" data equal to 0, or join all of its strings together
		into a single string. You want to be able to tell Harlowe to search for "each string where the string's 1st
		letter is A". You want to write a "function" for how the search is to be conducted.

		Lambdas are user-created functions that let you tell certain macros, like (find:), (altered:) and (folded:),
		precisely how to search, alter, or combine the data provided to them.

		There are several types of lambdas.

		* "where" lambdas, used by the (find:) macro, are used to search for and filter data. The lambda `_item where _item's
		1st is "A"` tells the macro to searches for items whose `1st` is the string "A".
		
		* "via" lambdas, used by the (altered:) macro, are used to transform and change data. The lambda `_item via _item + "s"`
		tells the macro to add the string "s" to the end of each item.
		
		* "making" lambdas, used by the (folded:) are used to build or "make" a single data value by adding something from
		each item to it. The lambda `_item making _total via _total + (max: _item, 0)` tells the macro to add each item to
		the total, but only if the item is greater than 0. (Incidentally, you can also use "where" inside a "making" lambda -
		you could rewrite that lambda as `_item making _total via _total + _item where _item > 0`.)

		* For certain macros, like (for:), you may want to use a "where" lambda that doesn't filter out any of the values -
		`_item where true`, for instance, will include every item. There is a special, more readable shorthand for this type
		of "where" lambda: writing just `each _item` is equivalent.

		Lambdas use temp variables as "placeholders" for the actual values. For instance, in `(find: _num where _num > 2, 5,6,0)`,
		the temp variable `_num` is used to mean each individual value given to the macro, in turn. It will be 5, 6 and 0, respectively.
		Importantly, this will *not* alter any existing temp variable called `_num` - the inside of a lambda can be thought
		of as a hook, so just as the inner `_x` in `(set: _x to 1) |a>[ (set:_x to 2) ]` is different from the outer `_x`, the `_num` in the
		lambda will not affect any other `_num`.

		An important feature is that you can save lambdas into variables, and reuse them in your story easily. You
		could, for instance, `(set: $statsReadout to (_stat making _readout via _readout + "|" + _stat's name + ":" + _stat's value))`,
		and then use $printStats with the (folded:) macro in different places, such as `(folded: $statsReadout, ...(dataentries: $playerStats))` for displaying the player's stats, `(folded: $statsReadout, ...(dataentries: $monsterStats))` for a monster's stats, etc.

		Lambdas are named after the lambda calculus, and the "lambda" keyword used in many popular programming languages.
		They may seem complicated, but as long as you think of them as just a special way of writing a repeating instruction,
		and understand how their macros work, you may find that they are very convenient.
	*/
	const Lambda = Object.freeze({
		lambda: true,
		TwineScript_TypeName:   "a lambda",
		TwineScript_ObjectName() {
			return "a \""
				+ (("making" in this) ? "making ... " : "")
				+ (("with" in this) ? "with ... " : "")
				+ (("where" in this) ? "where ... " : "")
				+ (("via" in this) ? "via ... " : "")
				+ "\" lambda";
		},

		TwineScript_Print() {
			// TODO: Make this string more detailed.
			return "`[A lambda]`";
		},

		TwineScript_is(other) {
			/*
				Lambdas are equal if their body is equivalent given parameter renaming
				(a.k.a alpha equivalence)
				TODO: Implement the above.
			*/
			return other === this;
		},

		/*
			This static method is used exclusively to produce type signature objects for use by
			macro definitions in macrolib. Specifically, it lets us specify which clauses a macro
			expects its lambda to have.
		*/
		TypeSignature(clauses) {
			return { pattern: "lambda", innerType: Lambda, clauses };
		},

		/*
			Lambdas consist of five clauses: the loop variable's name, the 'making' variable's name,
			the 'with' variable's name, the 'where' clause, and the 'via' clause.

			Lambdas are constructed by joining one of these clauses with a subject (which is either another
			lambda - thus adding their clauses - or a ).
		*/
		create(subject, clauseType, clause) {
			let ret;
			/*
				Firstly, if the subject is an error, propagate it.
			*/
			if (TwineError.containsError(subject)) {
				return subject;
			}
			/*
				If the subject is another lambda (as consecutive clauses compile to nested
				Operations.createLambda() calls), add this clause to that lambda.
			*/
			else if (Lambda.isPrototypeOf(subject)) {
				/*
					An error only identifiable while adding clauses:
					two of one clause (such as "where _a > 2 where _b < 2") is a mistake.
					The only exception is "where true", which can always be replaced (because
					it's created by the shorthand "each _a").
				*/
				if (clauseType in subject && !(clauseType === "where" && subject[clauseType] === "true")) {
					return TwineError.create('syntax', "This lambda has two '" + clauseType + "' clauses.");
				}
				/*
					We shall mutate the passed-in lambda, providing it with this additional clause.
				*/
				ret = subject;
			}
			else {
				/*
					If the subject is a temporary variable or undefined (and it's a mistake if it's not), create a fresh
					lambda object. It's a tad unfortunate that the preceding token before this lambda is already
					compiled into an incorrect object, but we must deal with syntactic ambiguity in this way.
				*/
				if (subject !== undefined &&
						(!subject || !subject.varref
						// It must be a temp variable...
						|| !VarScope.isPrototypeOf(subject.object)
						// ...and not a property access on one.
						|| subject.propertyChain.length > 1)) {
					return TwineError.create('syntax', "This lambda needs to start with a single temporary variable.");
				}
				ret = Object.create(this);
				// Extract the variable name from the TempVar, and make that the 'loop' variable name.
				ret.loop = (subject ? subject.propertyChain[0] : "");
			}
			/*
				We add the new clause, then do some further error-checking afterwards.
			*/
			ret[clauseType] = clause;
			/*
				The "making", "with" or "loop" variables' names must always be unique.
			*/
			const nonunique = [ret.making, ret.with, ret.loop].filter((e,i,a)=>e && a.indexOf(insensitiveName(e)) !== i);
			if (nonunique.length) {
				return TwineError.create('syntax', 'This lambda has two variables named \'' + nonunique[0] + '\'.',
					'Lambdas should have all-unique parameter names.');
			}
			/*
				All checks have now succeeded.
			*/
			return ret;
		},

		/*
			Macros call this method to apply the lambda to a series of provided values.
			This needs to have the macro's section passed in so that its JS code can be eval()'d in
			the correct scope.
		*/
		apply(section, {loop:loopArg, 'with':withArg, making:makingArg, fail:failArg, pass:passArg, ignoreVia}) {
			/*
				We run the JS code of this lambda, inserting the arguments by adding them to a "tempVariables"
				object. The tempVariable references in the code are compiled to VarRefs for tempVariables.
			*/
			const tempVariables = Object.create(VarScope);
			[
				[this.loop, loopArg],
				[this.with, withArg],
				[this.making, makingArg],
			].forEach(([name, arg]) => name && (tempVariables[name] = arg));

			section.stack.unshift(Object.assign(Object.create(null), {tempVariables}));

			/*
				If this lambda has no "making" or "with" clauses, then the "it"
				keyword is set to the loop arg. Note that this doesn't require the presence of
				this.loop - if it is omitted, then you can only access the loop var in the "where"
				clause using "it".
			*/
			if (loopArg && !this.with && !this.making) {
				section.eval("Operations").initialiseIt(loopArg);
			}
			/*
				Otherwise, stuff the "it" value with a special error message that should propagate up
				if "it" is ever used inside this macro.
			*/
			else {
				section.eval("Operations").initialiseIt(
					TwineError.create("operation",
						"I can't use 'it', or an implied 'it', in " + this.TwineScript_ObjectName()
					)
				);
			}

			/*
				At the start of a "making via where" lambda, we must filter out the values that fail
				the "making" clause, without running the "via" clause at all. So, ignoreVia is used by filter()
				to signify that this must be done.
			*/
			const via = (!ignoreVia && this.via);

			const ret = section.eval(
				/*
					If a lambda has a "where" clause, then the "where" clause filters out
					values. Filtered-out values are replaced by the failVal.
					If a lambda has a "via" clause, then its result becomes the result of the
					call. Otherwise, the passVal is used.
				*/
				'where' in this
					? "Operations.where("
						+ this.where + ","
						+ (via || toJSLiteral(passArg)) + ","
						+ toJSLiteral(failArg) + ")"
					: (via || toJSLiteral(passArg))
			);
			section.stack.shift();
			return ret;
		},

		/*
			This convenience function is used to run reduce() on macro args using a lambda,
			which is an operation common to (find:), (all-pass:) and (some-pass:).
		*/
		filter(section, args) {
			return args.reduce((result, arg) => {
				/*
					If an earlier iteration produced an error, don't run any more
					computations and just return.
				*/
				let error;
				if ((error = TwineError.containsError(result))) {
					return error;
				}
				/*
					Run the lambda, to determine whether to filter out this element.
				*/
				const passedFilter = this.apply(section, {loop:arg, pass:true, fail:false, ignoreVia:true});
				if ((error = TwineError.containsError(passedFilter))) {
					return error;
				}
				return result.concat(passedFilter ? [arg] : []);
			}, []);
		},
	});
	return Lambda;
});
