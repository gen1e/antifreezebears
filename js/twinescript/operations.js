"use strict";
define([
	'state',
	'datatypes/colour',
	'datatypes/assignmentrequest',
	'utils/operationutils',
	'internaltypes/twineerror',
],
(State, Colour, AssignmentRequest, {isObject, collectionType, coerceToString, is, clone, unique, contains, typeName, objectName}, TwineError) => {
	/*
		Operation objects are a table of operations which TwineScript proxies
		for/sugars over JavaScript. These include basic fixes like the elimination
		of implicit type coercion and the addition of certain early errors, but also
		includes support for new TwineScript operators, overloading of old operators,
		and other things.
	*/
	let Operations,
		/*d:
			it keyword

			This keyword is a shorthand for the closest leftmost value in an expression. It lets you write
			`(if: $candles < 2 and it > 5)` instead of `(if: $candles < 2 and $candles > 5)`, or `(set: $candles to it + 3)`
			instead of `(set: $candles to $candles + 3)`. (You can't, however, use it in a (put:) or (move:) macro:
			`(put:$red + $blue into it)` is invalid.)

			Since `it` uses the closest leftmost value, `(print: $red > 2 and it < 4 and $blue > 2 and it < 4)` is the same as
			`(print: $red > 2 and $red < 4 and $blue > 2 and $blue < 4)`.

			`it` is case-insensitive: `IT`, `iT` and `It` are all acceptable as well.

			In some situations, the `it` keyword will be *inserted automatically* by Harlowe when the story runs. If you write an
			incomplete comparison expression where the left-hand side is missing, like `(print: $red > 2 and < 4)`,
			then, when running, the `it` keyword will automatically be inserted into the absent spot - producing, in this case,
			`(print: $red > 2 and it < 4)`. Note that in situations where the `it` keyword would not have an obvious value, such as
			`(print: < 4)`, an error will result nonetheless.

			If the `it` keyword equals a datamap, string, array, or other "collection" data type, then you can access data values
			using the `its` variant - `(print: $red is 'egg' and its length is 3)` or `(set:$red to its 1st)`. Much like the `'s`
			operator, you can use computed values with `its` - `(if: $red's length is 3 and its $position is $value)` will work as
			expected.
		*/
		/*
			The "it" keyword is bound to whatever the last left-hand-side value
			in a comparison operation was. Since its scope is so ephemeral,
			it can just be a shared identifier right here.
		*/
		It = 0;
	
	/*
		Here are some wrapping functions which will be applied to
		the Operations methods, providing type-checking and such to their arguments.
	*/
	
	/*
		Wraps a function to refuse its arguments if one
		of them is not a certain type of primitive.
		@param {String} type Either "number" or "boolean"
		@param {Function} fn The function to wrap.
		@param {String} [operationVerb] A verb describing the function's action.
		@param {String} [message] An optional extra error message hint.
		@return {Function}
	*/
	function onlyPrimitives(type, fn, operationVerb, message) {
		operationVerb = operationVerb || "do this to";
		return (left, right) => {
			/*
				If the passed function has an arity of 1, ignore the
				right value.
			*/
			if (fn.length === 1) {
				right = left;
			}
			/*
				This part allows errors to propagate up the TwineScript stack.
			*/
			let error;
			if ((error = TwineError.containsError(left, right))) {
				return error;
			}
			if (typeof left !== type || typeof right !== type) {
				return TwineError.create(
					"operation",
					"I can only "
						+ operationVerb + " " + type + "s, not "
						+ objectName(typeof left !== type ? left : right)
						+ ".",
					message
				);
			}
			return fn(left, right);
		};
	}
	
	/*
		Converts a function to type-check its two arguments before
		execution, and thus suppress JS type coercion.
		@return {Function}
	*/
	function doNotCoerce(fn) {
		return (left, right) => {
			/*
				This part allows errors to propagate up the TwineScript stack.
			*/
			let error;
			if ((error = TwineError.containsError(left, right))) {
				return error;
			}
			// VarRefs cannot have operations performed on them.
			if (left && left.varref) {
				return TwineError.create("operation", "I can't give an expression a new value.");
			}
			/*
				This checks that left and right are generally different types
				(both different typeof or, if both are object, different collection types)
			*/
			if (typeof left !== typeof right
				|| collectionType(left) !== collectionType(right)) {
				/*
					Attempt to coerce to string using TwineScript specific
					methods, and return an error if it fails.
				*/
				return coerceToString(fn, left, right)
					/*
						TwineScript errors are handled by TwineScript, not JS,
						so don't throw this error, please.
					*/
					|| TwineError.create("operation",
						// BUG: This isn't capitalised.
						objectName(left)
						+ " isn't the same type of data as "
						+ objectName(right)
					);
			}
			return fn(left, right);
		};
	}
	
	/*
		Converts a function to handle determiners ("any", "all") and to set It after it is done.
		@return {Function}
	*/
	function comparisonOp(fn) {
		const compare = (left, right) => {
			let error;
			if ((error = TwineError.containsError(left, right))) {
				return error;
			}
			It = left;
			if (left.determiner) {
				const all = left.determiner === "all";
				/*
					Normally we'd use Array#every and Array#some here, but we also need
					to pull out any TwineErrors which are produced doing each of these
					comparisons. So, these looping methods are expanded as follows.
				*/
				return left.array.reduce((result, e) => {
					let error, next = compare(e, right);
					if ((error = TwineError.containsError(result, next))) {
						return error;
					}
					return (all ? result && next : result || next);
				}, all);
			}
			else if (right.determiner) {
				const all = right.determiner === "all";
				return right.array.reduce((result, e) => {
					let error, next = compare(left, e);
					if ((error = TwineError.containsError(result, next))) {
						return error;
					}
					return (all ? result && next : result || next);
				}, all);
			}
			return fn(left, right);
		};
		return compare;
	}

	const andOrNotMessage =
		"If one of these values is a number, you may want to write a check that it 'is not 0'. "
		+ "Also, if one is a string, you may want to write a check that it 'is not \"\" '.";
	
	/*
		Now, let's define the operations themselves.
	*/
	Operations = {
		
		/*
			While for the most part Operations is static, instances should
			nonetheless be created...
		*/
		create(section) {
			/*
				The only varying state that an Operations instance would have
				compared to the prototype is this "section" argument, which
				as it turns out is only used to enable the "time" identifier.
				Hrmmm... #awkward
			*/
			
			const ret = Object.create(this);
			
			/*
				This contains special runtime identifiers which may change at any time.
			*/
			ret.Identifiers = {

				/*
					This signifier is used solely by VarRef to determine if Identifiers is being
					used as an assignment destination.
				*/
				TwineScript_Identifiers: true,

				get it() {
					return It;
				},
				
				/*d:
					time keyword

					This keyword evaluates to the number of milliseconds passed since the passage
					was displayed. Its main purpose is to be used alongside changers
					such as (live:) or (link:). `(link:"Click")[(if: time > 5s)[...]]`, for instance,
					can be used to determine if 5 seconds have passed since this passage was displayed,
					and thus whether the player waited 5 seconds before clicking the link.

					When the passage is initially being rendered, `time` will be 0.

					`time` used in (display:) macros will still produce the time of the host passage, not the
					contained passage. So, you can't use it to determine how long the (display:)ed passage
					has been present in the host passage.
				*/
				/*
					The "time" keyword binds to the number of milliseconds since the passage
					was rendered.
			
					It might be something of a toss-up whether the "time" keyword should
					intuitively refer to the entire passage's lifetime, or just the nearest
					hook's. I believe that the passage is what's called for here.
				*/
				get time() {
					return (Date.now() - section.timestamp);
				}
			};
			
			return ret;
		},

		/*
			This is used to implement "elided comparisons", such as (if: $A is $B or $C).
			The right side, "or $C", is converted to "elidedComparisonOperator('or', 'is', $C)".
			If $C is boolean, then the expression is considered to be (if: $A is ($B or $C)),
			as usual. But, if it's not, then it's (if: ($A is $B) or ($A is $C)).
		*/
		elidedComparisonOperator(logicalOp, comparisonOp, ...values) {
			return values.reduce((result, value) => {
				if (typeof value === 'boolean') {
					return value;
				}
				return Operations[logicalOp](
					result,
					Operations[comparisonOp](It, value)
				);
			},
			// This is true when logicalOp is "and", and false for "or" -
			// that is, the identity values for those operations.
			logicalOp === "and");
		},
		
		and: onlyPrimitives("boolean", doNotCoerce((l, r) => l && r), "use 'and' to join", andOrNotMessage),
		
		or: onlyPrimitives("boolean", doNotCoerce((l, r) => l || r), "use 'or' to join", andOrNotMessage),
		
		not: onlyPrimitives("boolean", e => !e, "use 'not' to invert", andOrNotMessage),
		
		"+":  doNotCoerce((l, r) => {
			/*
				I'm not a fan of the fact that + is both concatenator and
				arithmetic op, but I guess it's close to what people expect.
				Nevertheless, applying the logic that a string is just as much a
				sequential collection as an array, I feel I can overload +
				on collections to mean immutable concatenation or set union.
			*/
			if (Array.isArray(l)) {
				/*
					Note that the doNotCoerce wrapper above requires that
					the right side also be an array.
				*/
				return [...l, ...r];
			}
			let ret;
			/*
				For Maps and Sets, create a new instance combining left and right.
				You may note that in the case of Maps, values of keys used on the
				right side trump those on the left side.
			*/
			if (l instanceof Map) {
				ret = new Map(l);
				r.forEach((v,k) => ret.set(k, v));
				return ret;
			}
			if (l instanceof Set) {
				return new Set([...l, ...r].filter(unique).map(clone));
			}
			/*
				If a TwineScript object implements a + method, use that.
			*/
			else if (typeof l["TwineScript_+"] === "function") {
				return l["TwineScript_+"](r);
			}
			/*
				Finally, if it's a primitive, we defer to JS's addition operator.
			*/
			if ("string|number|boolean".includes(typeof l)) {
				return l + r;
			}
			/*
				Having got this far, there's nothing else that can be added.
				Return an error.
			*/
			return TwineError.create("operation", "I can't use + on " + objectName(l) + ".");
		}),
		"-":  doNotCoerce((l, r) => {
			/*
				Overloading - to mean "remove all instances from".
				So, "reed" - "e" = "rd", and [1,3,5,3] - 3 = [1,5].
			*/
			if (Array.isArray(l)) {
				/*
					Note that the doNotCoerce wrapper above requires that
					the right side also be an array. Subtracting 1 element
					from an array requires it be wrapped in an (a:) macro.
				*/
				return l.filter(val1 => !r.some(val2 => is(val1, val2)));
			}
			/*
				Sets, but not Maps, can be subtracted.
			*/
			if (l instanceof Set) {
				const rvals = [...r];
				return new Set([...l].filter(val1 => !rvals.some(val2 => is(val1, val2))));
			}
			if (typeof l === "string") {
				/*
					This is an easy but cheesy way to remove all instances
					of the right string from the left string.
				*/
				return l.split(r).join('');
			}
			/*
				Finally, if it's a number, subtract it.
			*/
			if (typeof l === "number") {
				return l - r;
			}
			return TwineError.create("operation", "I can't use - on " + objectName(l) + ".");
		}),
		"*":  onlyPrimitives("number", doNotCoerce((l, r) => l * r), "multiply"),
		"/":  onlyPrimitives("number", doNotCoerce((l, r) => {
			if (r === 0) {
				return TwineError.create("operation", "I can't divide " + objectName(l) + " by zero.");
			}
			return l / r;
		}), "divide"),
		"%":  onlyPrimitives("number", doNotCoerce((l, r) => {
			if (r === 0) {
				return TwineError.create("operation", "I can't modulo " + objectName(l) + " by zero.");
			}
			return l % r;
		}), "modulus"),
		
		"<":  comparisonOp( onlyPrimitives("number", doNotCoerce((l,r) => l <  r), "do < to")),
		">":  comparisonOp( onlyPrimitives("number", doNotCoerce((l,r) => l >  r), "do > to")),
		"<=": comparisonOp( onlyPrimitives("number", doNotCoerce((l,r) => l <= r), "do <= to")),
		">=": comparisonOp( onlyPrimitives("number", doNotCoerce((l,r) => l >= r), "do >= to")),
		
		is: comparisonOp(is),
		
		isNot: comparisonOp((l,r) => !Operations.is(l,r)),
		contains: comparisonOp(contains),
		isIn: comparisonOp((l,r) => contains(r,l)),
		
		/*
			The only user-produced value which is passed into this operation is the bool -
			the passVal and failVal are internally supplied.
		*/
		where(bool, passVal, failVal) {
			let err;
			if ((err = TwineError.containsError(bool))) {
				return err;
			}
			if (typeof bool !== "boolean") {
				return TwineError.create("operation",
					"This lambda's 'where' clause must evaluate to true or false, not "
					+ objectName(bool)
					+ ".");
			}
			return bool ? passVal : failVal;
		},

		/*
			This takes a plain value assumed to be an array, and wraps
			it in a special structure that denotes it to be spreadable.
			This is created by the spread (...) operator.
		*/
		makeSpreader(val) {
			return {
				value: val,
				spreader: true,
			};
		},

		/*
			And here is the function for creating AssignmentRequests.
			Because a lot of error checking must be performed, and
			appropriate error messages must be generated, all of this
			is part of TwineScript instead of the AssignmentRequest module.
		*/
		makeAssignmentRequest(dest, src, operator) {
			const
				/*
					Refuse if the object or value is an error.
				*/
				error = TwineError.containsError(dest, src);
			
			if (error) {
				return error;
			}
			
			/*
				Also refuse if the dest is not, actually, a VarRef.
			*/
			if (!isObject(dest) || !("varref" in dest)) {
				return TwineError.create("operation",
					"I can't store a new value inside "
					+ objectName(dest)
					+ ".");
			}
			
			// The input is all clear, it seems.
			return AssignmentRequest.create(dest, src, operator);
		},
		
		/*
			This helper function sets the It identifier to a passed-in VarRef,
			while returning the original VarRef.
			It's used for easy compilation of assignment requests.
		*/
		setIt(e) {
			/*
				Propagate any errors passed in, as usual for these operations.
				Note that this does NOT handle errors returned in
				wrappers by VarRef.create(), because those should only be unwrapped
				when the compiler tries to .get() them.
			*/
			if (TwineError.containsError(e)) {
				return e;
			}
			/*
				If a non-varRef was passed in, a syntax error has occurred.
			*/
			if (!e.varref) {
				return TwineError.create("operation",
					"I can't put a new value into "
					+ objectName(e)
					+ "."
				);
			}
			return (It = e.get()), e;
		},

		/*
			This, however, is more low-level: instead of being directly called from compiled
			user code, it is called indirectly in order to discreetly mutate the "it" identifier.
			To underscore that this must not be called from user code, it returns undefined.
		*/
		initialiseIt(e) {
			It = e;
		},
	};
	return Object.freeze(Operations);
});
