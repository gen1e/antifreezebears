"use strict";
define([
	'jquery',
	'utils/naturalsort',
	'macros',
	'utils/operationutils',
	'state',
	'engine',
	'passages',
	'datatypes/lambda',
	'datatypes/assignmentrequest',
	'internaltypes/twineerror',
	'internaltypes/twinenotifier'],
($, NaturalSort, Macros, {objectName, typeName, subset, collectionType, isValidDatamapName, is, unique, clone}, State, Engine, Passages, Lambda, AssignmentRequest, TwineError, TwineNotifier) => {
	
	const {optional, rest, either, zeroOrMore, Any}   = Macros.TypeSignature;
	
	Macros.add
		/*d:
			VariableToValue data
			
			This is a special value that only (set:) and (put:) make use of.
			It's created by joining a variable and a value with the `to` or `into` keywords:
			`$emotion to 'flustered'` is an example of a VariableToValue. It exists primarily to
			make (set:) and (put:) more readable.
		*/
		/*d:
			Instant data

			A few special macros in Harlowe perform actions immediately, as soon as they're evaluated.
			These can be used in passages, but cannot have their values saved using (set:) or (put:),
			or stored in data structures.
		*/
		/*d:
			(set: ...VariableToValue) -> Instant
			
			Stores data values in variables.
			
			Example usage:
			* `(set: $battlecry to "Save a " + $favouritefood + " for me!")` sets a variable called $battlecry.
			* `(set: _dist to $altitude - $enemyAltitude)` sets a temp variable called _dist.
			
			Rationale:
			
			Variables are data storage for your game. You can store data values under special names
			of your choosing, and refer to them later.

			There are two kinds of variables. Normal variables, whose names begin with `$`, persist between passages,
			and should be used to store data that will be needed throughout the entire game. Temp variables,
			whose names begin with `_`, only exist inside the hook or passage that they're first (set:), and
			are forgotten after the hook or passage ends. You should use temp variables if you're writing passage
			code that mustn't accidentally affect any other passages' variables (by using (set:) on a variable name
			that someone else was using for something different). This can be essential in collaborative work
			with other authors working on the same story independently, or when writing code to be used in multiple stories.
			
			Variables have many purposes: keeping track of what the player has accomplished,
			managing some other state of the story, storing hook styles and changers, and
			other such things. You can display variables by putting them in passage text,
			attach them to hooks, and create and change them using the (set:) and (put:) macros.
			
			Details:
			
			In its basic form, a variable is created or changed using `(set: ` variable `to` value `)`.
			You can also set multiple variables in a single (set:) by separating each VariableToValue
			with commas: `(set: $weapon to 'hands', $armour to 'naked')`, etc.
			
			You can also use `it` in expressions on the right-side of `to`. Much as in other
			expressions, it's a shorthand for what's on the left side: `(set: $vases to it + 1)`
			is a shorthand for `(set: $vases to $vases + 1)`.
			
			If the destination isn't something that can be changed - for instance, if you're trying to set a
			bare value to another value, like `(set: true to 2)` - then an error will be printed. This includes
			modifying arrays - `(set: (a:2,3)'s 1st to 1)` is also an error.

			Due to the variable syntax potentially conflicting with dollar values (such as $1.50) in your story text,
			variables cannot begin with a numeral.
			
			See also:
			(push:), (move:)

			#basics 1
		*/
		("set", (_, ...assignmentRequests) => {
			let debugMessage = "";
			/*
				This has to be a plain for-loop so that an early return
				is possible.
			*/
			for(let i = 0; i < assignmentRequests.length; i+=1) {
				const ar = assignmentRequests[i];
				
				if (ar.operator === "into") {
					return TwineError.create("macrocall", "Please say 'to' when using the (set:) macro.");
				}
				let result;
				/*
					If ar.src is a VarRef, obtain its current value.
					Note that this could differ from its value at compilation time -
					in (set: $a to 1, $b to $a), the second $a has a different value to the first.
				*/
				if (ar.src && ar.src.varref) {
					const get = ar.src.get();
					let error;
					if ((error = TwineError.containsError(get))) {
						return error;
					}
					result = ar.dest.set(get);
				}
				else {
					result = ar.dest.set(ar.src);
				}
				/*
					If the setting caused an error to occur, abruptly return the error.
				*/
				if (TwineError.isPrototypeOf(result)) {
					return result;
				}
				if (Engine.options.debug) {
					// Add a semicolon only if a previous iteration appended a message.
					debugMessage += (debugMessage ? "; " : "")
						+ objectName(ar.dest)
						+ " is now "
						+ objectName(ar.src);
				}
			}

			/*
				There's nothing that can be done with the results of (set:) or (put:)
				operations, except to display nothing when they're in bare passage text.
				Return a plain unstorable value that prints out as "".
			*/
			return {
				TwineScript_TypeName:     "a (set:) operation",
				TwineScript_ObjectName:   "a (set:) operation",
				TwineScript_Unstorable: true,
				TwineScript_Print:        () => debugMessage && TwineNotifier.create(debugMessage).render(),
			};
		},
		[rest(AssignmentRequest)])
		
		/*d:
			(put: ...VariableToValue) -> Instant
			
			A left-to-right version of (set:) that requires the word `into` rather than `to`.
			
			Rationale:
			
			This macro has an identical purpose to (set:) - it creates and changes variables.
			For a basic explanation, see the rationale for (set:).
			
			Almost every programming language has a (set:) construct, and most of these place the
			variable on the left-hand-side. However, a minority, such as HyperTalk, place the variable
			on the right. Harlowe allows both to be used, depending on personal preference. (set:) reads
			as `(set: ` variable `to` value `)`, and (put:) reads as `(put: ` value `into` variable `)`.
			
			Details:
			
			Just as with (set:), a variable is changed using `(put: ` value `into` variable `)`. You can
			also set multiple variables in a single (put:) by separating each VariableToValue
			with commas: `(put: 2 into $batteries, 4 into $bottles)`, etc.
			
			`it` can also be used with (put:), but, interestingly, it's used on the right-hand side of
			the expression: `(put: $eggs + 2 into it)`.

			See also:
			(set:), (move:)

			#basics 2
		*/
		("put", (_, ...assignmentRequests) => {
			let debugMessage = "";
			/*
				This has to be a plain for-loop so that an early return
				is possible.
			*/
			for(let i = 0; i < assignmentRequests.length; i+=1) {
				const ar = assignmentRequests[i];
				
				if (ar.operator !== "into") {
					return TwineError.create("macrocall", "Please say 'into' when using the (put:) macro.");
				}
				let result = ar.dest.set(ar.src);
				/*
					If the setting caused an error to occur, abruptly return the error.
				*/
				if (TwineError.isPrototypeOf(result)) {
					return result;
				}
				if (Engine.options.debug) {
					// Add a semicolon only if a previous iteration appended a message.
					debugMessage += (debugMessage ? "; " : "")
						+ objectName(ar.dest)
						+ " is now "
						+ objectName(ar.src);
				}
			}
			return {
				TwineScript_TypeName:     "a (put:) operation",
				TwineScript_ObjectName:   "a (put:) operation",
				TwineScript_Unstorable: true,
				TwineScript_Print:        () => debugMessage && TwineNotifier.create(debugMessage).render(),
			};
		},
		[rest(AssignmentRequest)])
		
		/*d:
			(move: ...VariableToValue) -> Instant
			
			A variant of (put:) that deletes the source value after copying it - in effect
			moving the value from the source to the destination.
			
			Example usage:
			`(move: $arr's 1st into $var)`

			Rationale:
			You'll often use data structures such as arrays or datamaps as storage for values
			that you'll only use once, such as a list of names to print out. When it comes time
			to use them, you can remove it from the structure and retrieve it in one go.

			Details:
			You must use the `into` keyword, like (put:), with this macro. This is because, like (put:),
			the destination of the value is on the right, whereas the source is on the left.

			You can also set multiple variables in a single (move:) by separating each VariableToValue
			with commas: `(move: $a's 1st into $b, $a's 2nd into $c)`, etc.

			If the value you're accessing cannot be removed - for instance, if it's an array's `length` -
			then an error will be produced.

			See also:
			(push:), (set:)

			#basics 3
		*/
		("move", (_, ...assignmentRequests) => {
			let debugMessage = "";
			/*
				This has to be a plain for-loop so that an early return
				is possible.
			*/
			for(let i = 0; i < assignmentRequests.length; i+=1) {
				const ar = assignmentRequests[i];
				if (ar.operator !== "into") {
					return TwineError.create("macrocall", "Please say 'into' when using the (move:) macro.");
				}
				/*
					If ar.src is a VarRef, then it's a variable, and its value
					should be deleted when the assignment is completed.
				*/
				let result, error;
				if (ar.src && ar.src.varref) {
					const get = ar.src.get();
					if ((error = TwineError.containsError(get))) {
						return error;
					}
					result = ar.dest.set(get);
					if ((error = TwineError.containsError(result))) {
						return error;
					}
					ar.src.delete();
				}
				else {
					/*
						Otherwise, it's a plain value (such as seen in (move: 2 into $red)).
					*/
					result = ar.dest.set(ar.src);
					if ((error = TwineError.containsError(result))) {
						return error;
					}
				}
				if (Engine.options.debug) {
					// Add a semicolon only if a previous iteration appended a message.
					debugMessage += (debugMessage ? "; " : "")
						+ objectName(ar.dest)
						+ " is now "
						+ objectName(ar.src);
				}
			}
			return {
				TwineScript_TypeName:     "a (move:) operation",
				TwineScript_ObjectName:   "a (move:) operation",
				TwineScript_Unstorable: true,
				TwineScript_Print:        () => debugMessage && TwineNotifier.create(debugMessage).render(),
			};
		},
		[rest(AssignmentRequest)])

		/*
			ARRAY MACROS
		*/
		
		/*d:
			Array data
			
			There are occasions when you may need to work with a whole sequence of values at once.
			For example, a sequence of adjectives (describing the player) that should be printed depending
			on what a numeric variable (such as a health point variable) currently is.
			You could create many, many variables to hold each value, but it is preferable to
			use an array containing these values.
			
			Arrays are one of the two major "data structures" you can use in Harlowe. The other, datamaps,
			are created with (dm:). Generally, you want to use arrays when you're dealing with values that
			directly correspond to *numbers*, and whose *order* and *position* relative to each other matter.
			If you instead need to refer to values by a name, and don't care about their order, a datamap is best used.
			
			You can refer to and extract data at certain positions inside arrays using `1st`, `2nd`, `3rd`, and so forth:
			`$array's 1st`, also written as `1st of $array`, refers to the value in the first position. Additionally, you can
			use `last` to refer to the last position, `2ndlast` to refer to the second-last, and so forth. Arrays also have
			a `length` number: `$array's length` tells you how many values are in it. If you don't know the exact position
			to remove an item from, you can use an expression, in brackers, after it: `$array's ($pos - 3)`.
			
			To see if arrays contain certain values, you can use the `contains` and `is in` operators like so: `$array contains 1`
			is true if it contains the number 1 anywhere, and false if it does not. `1 is in $array` is another way to write that.
			If you want to check if an array contains some, or all of the values, in another array, you can compare with a special
			`any` or `all` name on the other array: `$array contains any of (a:2,4,6)`, and `$array contains all of (a:2,4,6)`
			will check if `$array` contains some, or all, of the numbers 2, 4 and 6.

			(Incidentally, `any` and `all` can also be used with other operators, like `is`, `is not`, `>`, `<`, `>=`, and `<=`,
			to compare every value in the array with a number or other value. For instance, `all of (a:2,4) >= 2` is true, as is
			`any of (a:2,4) >= 4`.)
			
			Arrays may be joined by adding them together: `(a: 1, 2) + (a: 3, 4)` is the same as `(a: 1, 2, 3, 4)`.
			You can only join arrays to other arrays. To add a bare value to the front or back of an array, you must
			put it into an otherwise empty array using the (a:) macro: `$myArray + (a:5)` will make an array that's just
			$myArray with 5 added on the end, and `(a:0) + $myArray` is $myArray with 0 at the start.

			You can make a subarray by providing a range (an array of numbers, such as
			those created with (range:)) as a reference - `$arr's (a:1,2)` produces an array with only the first 2 values of $arr.
			Additionally, you can subtract items from arrays (that is, create a copy of an array with certain values removed) using
			the `-` operator: `(a:"B","C") - (a:"B")` produces `(a:"C")`. Note that multiple copies of a value in an array will all
			be removed by doing this: `(a:"B","B","B","C") - (a:"B")` also produces `(a:"C")`.
			
			You may note that certain macros, like (either:), accept sequences of values. A special operator, `...`, exists which
			can "spread out" the values inside an array, as if they were individually placed inside the macro call.
			`(either: ...$array)` is a shorthand for `(either: $array's 1st, $array's 2nd, $array's 3rd)`, and so forth for as many
			values as there are inside the $array. Note that you can still include values after the spread: `(either: 1, ...$array, 5)`
			is valid and works as expected.

			To summarise, the following operators work on arrays.
			
			| Operator | Purpose | Example
			|---
			| `is` | Evaluates to boolean `true` if both sides contain equal items in an equal order, otherwise `false`. | `(a:1,2) is (a:1,2)` (is true)
			| `is not` | Evaluates to `true` if both sides differ in items or ordering. | `(a:4,5) is not (a:5,4)` (is true)
			| `contains` | Evaluates to `true` if the left side contains the right side. | `(a:"Ape") contains "Ape"`<br>`(a:(a:99)) contains (a:99)`<br>`(a:1,2) contains any of (a:2,3)`<br>`(a:1,2) contains all of (a:2,1)`
			| `is in` | Evaluates to `true` if the right side contains the left side. | `"Ape" is in (a:"Ape")`<br>`(a:99) is in (a:(a:99))`<br>`any of (a:2,3) is in (a:1,2)`<br>`all of (a:2,1) is in (a:1,2)`
			| `+` | Joins arrays. | `(a:1,2) + (a:1,2)` (is `(a:1,2,1,2)`)
			| `-` | Subtracts arrays, producing an array containing every value in the left side but not the right. | `(a:1,1,2,3,4,5) - (a:1,2)` (is `(a:3,4,5)`)
			| `...` | When used in a macro call, it separates each value in the right side. | `(a: 0, ...(a:1,2,3,4), 5)` (is `(a:0,1,2,3,4,5)`)
			| `'s` | Obtains the item at the right numeric position, or the `length`, `any` or `all` values. | `(a:"Y","Z")'s 1st` (is "Y")<br>`(a:4,5)'s (2)` (is 5)<br>`(a:5,5,5)'s length` (is 3)
			| `of` | Obtains the item at the left numeric position, or the `length`, `any` or `all` values. | `1st of (a:"Y","O")` (is "Y")<br>`(2) of (a:"P","S")` (is "S")<br>`length of (a:5,5,5)` (is 3)
		*/
		/*d:
			(a: [...Any]) -> Array
			Also known as: (array:)
			
			Creates an array, which is an ordered collection of values.
			
			Example usage:
			`(a:)` creates an empty array, which could be filled with other values later.
			`(a: "gold", "frankincense", "myrrh")` creates an array with three strings.
			This is also a valid array, but with its elements spaced in a way that makes them more readable:
			```
			(a:
				"You didn't sleep in the tiniest bed",
				"You never ate the just-right porridge",
				"You never sat in the smallest chair",
			)
			```
			
			Rationale:
			For an explanation of what arrays are, see the Array article. This macro is the primary
			means of creating arrays - simply supply the values to it, in order.
			
			Details:
			Note that due to the way the spread `...` operator works, spreading an array into
			the (a:) macro will accomplish nothing: `(a: ...$array)` is the same as just the `$array`.
			
			See also:
			(dm:), (ds:)
			
			#data structure 1
		*/
		(["a", "array"], (_, ...args) => args, zeroOrMore(Any))
		
		/*d:
			(range: Number, Number) -> Array
			
			Produces an array containing an inclusive range of whole numbers from a to b,
			in ascending order.
			
			Example usage:
			`(range:1,14)` is equivalent to `(a:1,2,3,4,5,6,7,8,9,10,11,12,13,14)`
			`(range:2,-2)` is equivalent to `(a:-2,-1,0,1,2)`
			
			Rationale:
			This macro is a shorthand for defining an array that contains a sequence of
			integer values. Rather than writing out all of the numbers, you can simply provide
			the first and last numbers.
			
			Details:
			Certain kinds of macros, like (either:) or (dataset:), accept sequences of values. You can
			use (range:) with these in conjunction with the `...` spreading operator:
			`(dataset: ...(range:2,6))` is equivalent to `(dataset: 2,4,5,6,7)`, and
			`(either: ...(range:1,5))` is equivalent to `(random: 1,5)`.
			
			See also:
			(a:)

			#data structure
		*/
		("range", function range(_, a, b) {
			/*
				For now, let's assume descending ranges are intended,
				and support them.
			*/
			if (a > b) {
				return range(_, b, a);
			}
			/*
				This differs from Python: the base case returns just [a],
				instead of an empty array. The rationale is that since it is
				inclusive, a can serve as both start and end term just fine.
			*/
			const ret = [a];
			b -= a;
			while(b-- > 0) {
				ret.push(++a);
			}
			return ret;
		},
		[parseInt, parseInt])
		
		/*d:
			(subarray: Array, Number, Number) -> Array
			
			When given an array, this returns a new array containing only the elements
			whose positions are between the two numbers, inclusively.
			
			Example usage:
			`(subarray: $a, 3, 4)` is the same as `$a's (a:3,4)`
			
			Rationale:
			
			You can obtain subarrays of arrays without this macro, by using the `'s` or `of` syntax along
			with an array of positions. For instance, `$a's (range:4,12)` obtains a subarray of $a containing
			its 4th through 12th values. But, for compatibility with previous Harlowe versions which did not
			feature this syntax, this macro also exists.
			
			Details:

			If you provide negative numbers, they will be treated as being offset from the end
			of the array - `-2` will specify the `2ndlast` item, just as 2 will specify
			the `2nd` item.
			
			If the last number given is larger than the first (for instance, in `(subarray: (a:1,2,3,4), 4, 2)`)
			then the macro will still work - in that case returning (a:2,3,4) as if the numbers were in
			the correct order.

			See also:
			(substring:), (rotated:)
			
			#deprecated
		*/
		("subarray", (_, array, a, b) => subset(array, a, b),
		[Array, parseInt, parseInt])
		
		/*d:
			(shuffled: Any, Any, [...Any]) -> Array
			
			Identical to (a:), except that it randomly rearranges the elements
			instead of placing them in the given order.
			
			Example usage:
			```
			(set: $a to (a: 1,2,3,4,5,6))
			(print: (shuffled: ...$a))
			```
			
			Rationale:
			If you're making a particularly random story, you'll often want to create a 'deck'
			of random descriptions, elements, etc. that are only used once. That is to say, you'll want
			to put them in an array, then randomise the array's order, preserving that random order
			for the duration of a game.
			
			The (either:) macro is useful for selecting an element from an array randomly
			(if you use the spread `...` syntax), but isn't very helpful for this particular problem.
			The (shuffled:) macro is the solution: it takes elements and returns a randomly-ordered array that
			can be used as you please.
			
			Details:
			To ensure that it's being used correctly, this macro requires two or more items -
			providing just one (or none) will cause an error to be presented.
			
			See also:
			(a:), (either:), (rotated:)
			
			#data structure
		*/
		("shuffled", (_, ...args) =>
			// The following is an in-place Fisher–Yates shuffle.
			args.reduce((a,e,ind) => {
				// Obtain a random number from 0 to ind inclusive.
				const j = (Math.random()*(ind+1)) | 0;
				if (j === ind) {
					a.push(e);
				}
				else {
					a.push(a[j]);
					a[j] = e;
				}
				return a;
			},[]).map(clone),
		[Any, rest(Any)])
		
		/*d:
			(sorted: Number or String, ...Number or String) -> Array
			
			Similar to (a:), except that it requires only numbers or strings, and orders
			them in English alphanumeric sort order, rather than the order in which they were provided.
			
			Example usage:
			```
			(set: $a to (a: 'A','C','E','G', 2, 1))
			(print: (sorted: ...$a))
			```
			
			Rationale:
			Often, you'll be using arrays as 'decks' that will provide values to other parts of
			your story in a specific order. If you want, for instance, several strings to appear in
			alphabetical order, this macro can be used to create a sorted array, or (by using the
			spread `...` syntax) convert an existing array into a sorted one.
			
			Details:
			Unlike other programming languages, strings aren't sorted using ASCII sort order, but alphanumeric sorting:
			the string "A2" will be sorted after "A1" and before "A11". Moreover, if the player's web browser
			supports internationalisation (that is, every current browser except Safari 6-8 and IE 10), then
			the strings will be sorted using English language rules (for instance, "é" comes after "e" and before
			"f", and regardless of the player's computer's language settings. Otherwise, it will sort
			using ASCII comparison (whereby "é" comes after "z").
			
			Currently there is no way to specify an alternative language locale to sort by, but this is likely to
			be made available in a future version of Harlowe.
			
			To ensure that it's being used correctly, this macro requires two or more items -
			providing just one (or none) will cause an error to be presented.
			
			See also:
			(a:), (shuffled:), (rotated:)
			
			#data structure
		*/
		// Note that since this only accepts primitives, clone() is unnecessary.
		("sorted", (_, ...args) => args.sort(NaturalSort("en")),
		[either(Number,String), rest(either(Number,String))])
		
		/*d:
			(rotated: Number, [...Any]) -> Array
			
			Similar to the (a:) macro, but it also takes a number at the start, and moves
			each item forward by that number, wrapping back to the start
			if they pass the end of the array.
			
			Example usage:
			* `(rotated: 1, 'A','B','C','D')` is equal to `(a: 'D','A','B','C')`.
			* `(rotated: -2, 'A','B','C','D')` is equal to `(a: 'C','D','A','B')`.
			
			Rationale:
			Sometimes, you may want to cycle through a number of values, without
			repeating any until you reach the end. For instance, you may have a rotating set
			of flavour-text descriptions for a thing in your story, which you'd like displayed
			in their entirety without the whim of a random picker. The (rotated:) macro
			allows you to apply this "rotation" to a sequence of data, changing their positions
			by a certain number without discarding any values.
			
			Remember that, as with all macros, you can insert all the values in an existing
			array using the `...` syntax: `(set: $a to (rotated: 1, ...$a))` is a common means of
			replacing an array with a rotation of itself.
			
			Think of the number as being an addition to each position in the original sequence -
			if it's 1, then the value in position 1 moves to 2, the value in position 2 moves to 3,
			and so forth.

			Incidentally... you can also use this macro to rotate a string's characters, by doing
			something like this: `(string: ...(rotated: 1, ...$str))`
			
			Details:
			To ensure that it's being used correctly, this macro requires three or more items -
			providing just two, one or none will cause an error to be presented.
			
			See also:
			(sorted:)
			
			#data structure
		*/
		("rotated", (_, number, ...array) => {
			/*
				The number is thought of as an offset that's added to every index.
				So, to produce this behaviour, it must be negated.
			*/
			number *= -1;
			/*
				These error checks are maybe a bit strict, but ensure that this behaviour
				could (maybe) be freed up in later versions.
			*/
			if (number === 0) {
				return TwineError.create("macrocall",
					"I can't rotate these values by 0 positions.");
			}
			else if (Math.abs(number) >= array.length) {
				return TwineError.create("macrocall",
					"I can't rotate these " + array.length + " values by " + number + " positions.");
			}
			return array.slice(number).concat(array.slice(0, number)).map(clone);
		},
		[parseInt, Any, rest(Any)])

		/*d:
			(repeated: Number, ...Any) -> Array
			
			When given a number and a sequence of values, this macro produces an array containing
			those values repeated, in order, by the given number of times.
			
			Example usage:
			* `(repeated: 5, false)` produces `(a: false, false, false, false, false)`
			* `(repeated: 3, 1,2,3)` produces `(a: 1,2,3,1,2,3,1,2,3)`
			
			Rationale:
			This macro, as well as (range:), are the means by which you can create a large array of
			similar or regular data, quickly. Just as an example: you want, say, an array of several
			identical, complex datamaps, each of which are likely to be modified in the game,
			you can use (repeated:) to make those copies easily. Or, if you want, for instance, a
			lot of identical strings accompanied by a lone different string, you can use (repeated:)
			and add a `(a: "string")`to the end.

			When you already have an array variable, this is similar to simply adding that variable
			to itself several times. However, if the number of times is over 5, this can be much
			simpler to write.
			
			Details:
			An error will, of course, be produced if the number given is 0 or less, or contains a fraction.
			
			See also:
			(a:), (range:)
			
			#data structure
		*/
		("repeated", (_, number, ...array) => {
			if (number <= 0) {
				return TwineError.create("macrocall",
					"I can't repeat these values " + number + " times.");
			}
			const ret = [];
			while(number-- > 0) {
				ret.push(...array);
			}
			return ret.map(clone);
		},
		[parseInt, rest(Any)])

		/*d:
			(interlaced: Array, ...Array) -> Array
			
			Takes multiple arrays, and pairs up each value in those arrays: it
			creates an array containing each array's first value followed by each
			array's second value, and so forth. If some values have no matching pair (i.e. one array
			is longer than the other) then those values are ignored.
			
			Example usage:
			`(interlaced: (a: 'A', 'B', 'C', 'D'), (a: 1, 2, 3))` is the same as `(a: 'A',1,'B',2,'C',3)`
			
			Rationale:
			There are a couple of other macros which accept data in pairs - the most notable being
			(dm:), which takes data names and data values paired. This macro can help
			with using such macros. For instance, you can supply an array of (datanames:) and
			(datavalues:) to (interlaced:), and supply that to (dm:), to produce the original
			datamap again. Or, you can supply just the names, and use a macro like (repeated:) to
			fill the other values.
			
			However, (interlaced:) can also be of use alongside macros which accept a sequence: you
			can use it to cleanly insert values between each item. For instance, one can pair
			an array with another array of spaces, and then convert them to a string with (text:).
			`(text: ...(interlaced: $arr, (repeated: $arr's length, ' '))` will create a string containing
			each element of $arr, followed by a space.
			
			Details:
			If one of the arrays provided is empty, the resulting array will be empty, as well.
			
			See also:
			(a:), (rotated:), (repeated:)
			
			#data structure
		*/
		("interlaced", (_, ...arrays) => {
			/*
				Determine the length of the longest array.
			*/
			let len = Math.min(...arrays.map(arr => arr.length));
			const ret = [];
			/*
				For each array, add its element to the returning array.
			*/
			for(let i = 0; i < len; i += 1) {
				for(let j = 0; j < arrays.length; j+=1) {
					ret.push(clone(arrays[j][i]));
				}
			}
			return ret;
		},
		[Array, rest(Array)])
		;

	Macros.add
		/*d:
			(altered: Lambda, ...Any) -> Array

			This takes a "via" lambda and a sequence of values, and creates a new array with the same values in the same order,
			but altered via the operation in the lambda's "via" clause.

			Example usage:
			* `(altered: _monster via "Dark " + _monster, "Wolf", "Ape", "Triffid")` produces `(a: "Dark Wolf", "Dark Ape", "Dark Triffid")`
			* `(altered: _player via _player + (dm: "HP", _player's HP - 1), ...$players)` produces an array of $players datamaps whose "HP" datavalue is decreased by 1.

			Rationale:
			Transforming entire arrays or datasets, performing an operation on every item at once, allows arrays to be modified with the same ease
			that single values can - just as you can add some extra text to a string with a single +, so too can you add extra text to an entire
			array of strings using a single call to (altered:).

			This macro uses a lambda (which is just the "temp variable `via` an expression" expression) to take each item in the sequence and produce a new
			value to populate the resulting array. For `(altered: _a via _a + 1, 10,20,30)` it will produce 10 + 1, 20 + 1 and 30 + 1, and put those
			into a new array.

			Details:
			Of course, if any operation applied to any of the values should cause an error, such as trying to add a string to a number,
			an error will result.

			The temp variable, which you can name anything you want, is controlled entirely by the lambda - it doesn't exist
			outside of it, it won't alter identically-named temp variables outside of it, and you can't manually (set:)
			it within the lambda.

			You can refer to other variables, including other temp variables, in the `via` expression. For instance, you can write
			`(altered: _object via _playerName + "'s " + _object, "Glove", "Hat", "Purse")`. However, for obvious reasons,
			if the outer temp variable is named the same as the lambda's temp variable, it can't be referred to in the expression.

			If no values are given to (altered:) except for the lambda, an empty array will be produced.

			See also:
			(for:), (folded:)

			#data structure
		*/
		("altered", (section, lambda, ...args) => args.map(loop => lambda.apply(section, {loop})),
		[Lambda.TypeSignature('via'), rest(Any)])
		/*d:
			(find: Lambda, ...Any) -> Array

			This searches through the given values, and produces an array of those which match the given search
			test (which is expressed using a temp variable, the `where` keyword, and a boolean condition).
			If none match, an empty array is produced.

			Example usage:
			* `(find: _person where _person is not "Alice", ...$people)` produces a subset of $people not containing the string `"Alice"`.
			* `(find: _item where _item's 1st is "A", "Thorn", "Apple", "Cryptid", "Anchor")` produces `(a: "Apple", "Anchor")`.
			* `(find: _num where (_num >= 12) and (it % 2 is 0), 9, 10, 11, 12, 13, 14, 15, 16)` produces `(a: 12, 14, 16)`.
			* `(find: _val where _val + 2, 9, 10, 11)` produces an error, because `_item + 2` isn't a boolean.
			* `1st of (find: _room where _room's objs contains "Egg", ...$rooms)` finds the first datamap in $rooms whose "objs" contains the string `"Egg"`.

			Rationale:
			Selecting specific data from arrays or sequences based on a user-provided boolean condition is one of the more common and powerful
			operations in programming. This macro allows you to immediately work with a subset of the array's data, without
			caring what kind of subset it is. The subset can be based on each string's characters, each datamap's values, each number's
			evenness or oddness, whether a variable matches it... anything you can write.

			This macro uses a lambda (which is just the "temp variable `where` a condition" expression) to check every one of
			the values given after it. For `(find: _item where _item > 40, 30, 60, 90)`, it will first check if `30 > 40` (which
			is `false`), if `60 > 40` (which is `true`), and if `90 > 40` (which is `true`), and include in the returned array
			those values which resulted in `true`.

			Details:
			Of course, if any condition should cause an error, such as checking if a number contains a number, then the error will appear.

			The temp variable, which you can name anything you want, is controlled entirely by the lambda - it doesn't exist
			outside of it, it won't alter identically-named temp variables outside of it, and you can't manually (set:)
			it within the lambda.

			You can refer to other variables, including other temp variables, in the `where` condition. For instance, you can
			write `(set: _name to "Eva")(find: _item where _item is _name, "Evan", "Eve", "Eva")`. However, for obvious reasons,
			if the outer temp variable is named the same as the lambda's temp variable, it can't be referred to in the condition.

			There isn't a way to examine the position of a value in the condition - you can't write, say, `(find: _item where
			_pos % 2 is 0, "A", "B", "C", "D")` to select just "B" and "D".

			You shouldn't use this macro to try and alter the given values! Consider the (altered:) or (folded:) macro instead.

			See also:
			(sorted:), (all-pass:), (some-pass:), (none-pass:)

			#data structure
		*/
		("find", (section, lambda, ...args) => lambda.filter(section, args),
		[Lambda.TypeSignature('where'), rest(Any)])
		/*d:
			(all-pass: Lambda, ...Any) -> Boolean

			This takes a "where" lambda and a series of values, and evaluates to true if the lambda, when run using each value, always evaluated to true.

			Example usage:
			* `(all-pass: _num where _num > 1 and _num < 14, 6, 8, 12, 10, 9)` is true.
			* `(all-pass: _room where "Egg" is not in _room's objs, ...$rooms)` is true if each datamap in $rooms doesn't have the string `"Egg"` in its "objs".

			Rationale:
			While the `contains` and `is in` operators can be used to quickly check if a sequence of values contains an exact value or values, you'll
			often find yourself wanting to check that the values in a sequence merely resemble a kind of value - for instance, that they're positive
			numbers, or strings beginning with "E".

			The (all-pass:) macro lets you perform these checks easily using a lambda, identical to that used with (find:) - simply write a "temp variable
			`where` a condition" expression, and every value will be put into the temp variable one by one, and the condition checked for each.

			Details:
			Of course, if any condition should cause an error, such as checking if a number contains a number, then the error will appear.

			The temp variable, which you can name anything you want, is controlled entirely by the lambda - it doesn't exist
			outside of it, it won't alter identically-named temp variables outside of it, and you can't manually (set:)
			it within the lambda.

			You can refer to other variables, including other temp variables, in the `where` condition. For instance, you can
			write `(set: _name to "Eva")(all-pass: _item where _item is _name, "Evan", "Eve", "Eva")`. However, for obvious reasons,
			if the outer temp variable is named the same as the lambda's temp variable, it can't be referred to in the condition.

			See also:
			(sorted:), (count:), (find:), (some-pass:), (none-pass:)

			#data structure
		*/
		("all-pass", (section, lambda, ...args) => {
			const ret = lambda.filter(section, args);
			return TwineError.containsError(ret) || ret.length === args.length;
		},
		[Lambda.TypeSignature('where'), rest(Any)])
		/*d:
			(some-pass: Lambda, ...Any) -> Boolean

			This is similar to (all-pass:), but produces true if one or more value, when given to the lambda, evaluated to false.
			It can be thought of as shorthand for putting `not` in front of (none-pass:).
			For more information, consult the description of (all-pass:).

			#data structure
		*/
		("some-pass", (section, lambda, ...args) => {
			const ret = lambda.filter(section, args);
			return TwineError.containsError(ret) || ret.length > 0;
		},
		[Lambda.TypeSignature('where'), rest(Any)])
		/*d:
			(none-pass: Lambda, ...Any) -> Boolean

			This can be thought of as the opposite of (all-pass:): it produces true if every value, when given to the lambda, evaluated to false.
			For more information, consult the description of (all-pass:).

			#data structure
		*/
		("none-pass", (section, lambda, ...args) => {
			const ret = lambda.filter(section, args);
			return TwineError.containsError(ret) || ret.length === 0;
		},
		[Lambda.TypeSignature('where'), rest(Any)])
		/*d:
			(folded: Lambda, ...Any) -> Any

			This takes a "making" lambda and a sequence of values, and creates a new value (the "total") by feeding every value in the
			sequence to the lambda, akin to folding a long strip of paper into a single square.

			Example usage:
			* `(folded: _enemy making _allHP via _allHP + _enemy's hp, ...$enemies)` will first set _sum to $enemies's 1st's hp, then add the remaining hp values in $enemies to it.
			* `(folded: _name making _allNames via _allNames + "/" + _name, ...(history: ))` will create a string of every passage name in the (history:) array,
			separated by a forward slash.

			Rationale:
			The (for:) macro, while intended to display multiple copies of a hook, can also be used to run a single macro call multiple times. You may
			wish to use this to repeatedly (set:) a variable to itself plus one of the looped values (or some other operation). (folded:) is meant
			to let you perform this in a shorter, more fluid fashion.

			Consider, first of all, a typical (for:) and (set:) loop such as the following:
			```
			{(set:$allNames to "")
			(for: each _name, ...(history: ))[
			    (set:$allNames to it + "/" _name)
			]}
			You've visited: $allNames
			```
			This can be rewritten using (folded:) as follows. While this version may seem a little harder to read if you're not used to it, it
			allows you to accomplish the same thing in a single line, by immediately using the macro's provided value without a variable:
			```
			You've visited: (folded: _name making _allNames via _allNames + "/" + _name, ...(history: )))
			```
			This macro uses a lambda (which is the "temp variable `making` another temp variable `via` expression" expression) to run the
			expression using every provided value, much like those repeated (set:) calls.

			If you need to perform this operation at various different times in your story, you may wish to (set:) the lambda into a variable,
			so that you, for instance, might need only write:
			```
			You've visited: (folded: $namesWithForwardSlashes, ...(history: )))
			```

			Details:
			Of course, if at any time the expression should cause an error, such as adding a number to a string, then an error will result.

			Both of the temp variables, the value and the total, can be named anything you want. As with other lambda macros, they don't exist
			outside of it, won't alter identically-named temp variables outside of it, and can't be manually (set:) within the lambda.

			You can refer to other variables, including other temp variables, in the `via` expression. For instance, you can write
			`(folded: _score making _totalScore via _totalScore + _score * _bonusMultiplier)`. However, for obvious reasons,
			if the outer temp variable is named the same as the lambda's temp variables, it can't be referred to in the expression.

			You can also use a "where" clause inside the "making" lambda to prevent an operation from occurring if a value isn't suitable -
			`(folded: _item making _total via _total + _item where _item > 0, ...$arr)` will only sum up the values in $arr which are greater than 0.

			See also:
			(for:), (altered:)

			#data structure
		*/
		("folded", (section, lambda, ...args) => {
			// Run the optional "where" clause to filter out values, if it's present.
			if ("where" in lambda) {
				args = lambda.filter(section, args);
			}
			return TwineError.containsError(args) || args
				.reduce((making,loop) => lambda.apply(section,{making,loop}));
		},
		[either(Lambda.TypeSignature('where via making'), Lambda.TypeSignature('via making')), rest(Any)])
		;
		
	Macros.add
		/*d:
			(datanames: Datamap) -> Array
			
			This takes a datamap, and returns a sorted array of its data names, sorted
			alphabetically.
			
			Example usage:
			`(datanames: (dm:'B','Y', 'A','X'))` produces the array `(a: 'A','B')`
			
			Rationale:
			Sometimes, you may wish to obtain some information about a datamap. You may want
			to list all of its data names, or determine how many entries it has. You can use
			the (datanames:) macro to do these things: if you give it a datamap, it produces
			a sorted array of all of its names. You can then (print:) them, check the length
			of the array, obtain a subarray, and other things you can do to arrays.
			
			See also:
			(datavalues:), (dataentries:)
			
			#data structure
		*/
		("datanames", (_, map) =>  Array.from(map.keys()).sort(NaturalSort("en")),
		[Map])
		/*d:
			(datavalues: Datamap) -> Array
			
			This takes a datamap, and returns an array of its values, sorted
			alphabetically by their name.
			
			Example usage:
			`(datavalues: (dm:'B',24, 'A',25))` produces the array `(a: 25,24)`
			
			Rationale:
			Sometimes, you may wish to examine the values stored in a datamap without
			referencing every name - for instance, determining if 0 is one of the values.
			(This can't be determined using the `contains` keyword, because that only checks
			the map's data names.) You can extract all of the datamap's values into an array
			to compare and analyse them using (datavalues:). The values will be sorted by
			their associated names.
			
			See also:
			(datanames:), (dataentries:)
			
			#data structure
		*/
		("datavalues", (_, map) =>
			/*
				We first need to sort values by their keys (thus necessitating using .entries())
				then extracting just the values.
			*/
			Array.from(map.entries()).sort(
				(a,b) => ([a[0],b[0]].sort(NaturalSort("en"))[0] === a[0] ? -1 : 1)
			).map(
				e => clone(e[1])
			),
		[Map])
		/*d:
			(dataentries: Datamap) -> Array
			
			This takes a datamap, and returns an array of its name/value pairs. Each pair
			is a datamap that only has "name" and "value" data. The pairs are ordered by their name.
			
			Example usage:
			* `(datapairs: (dm:'B',24, 'A',25))` produces the following array:
			`(a: (dm: "name", "A", "value", 25), (dm: "name", "B", "value", 24))`
			* `(altered: _entry via _entry's name + ":" + _entry's value, ...(datapairs: $m))` creates
			an array of strings from the $m datamap's names and values.
			
			Rationale:
			There are occasions where operating on just the names, or the values, of
			a datamap isn't good enough - you'll want both. Rather than the verbose process
			of taking the (datanames:) and (datavalues:) arrays and using them (interlaced:)
			with each other, you can use this macro instead, which allows the name and value of
			each entry to be referenced using "name" and "value" properties.
			
			See also:
			(datanames:), (datavalues:)
			
			#data structure
		*/
		("dataentries", (_, map) =>
			/*
				As with (datavalues:), we need to sort values by their keys.
			*/
			Array.from(map.entries()).sort(
				(a,b) => ([a[0],b[0]].sort(NaturalSort("en"))[0] === a[0] ? -1 : 1)
			).map(
				e => new Map([["name", e[0]], ["value", clone(e[1])]])
			),
		[Map])
		
		/*d:
			(history:) -> Array

			This returns an array containing the string names of all of the passages
			the player has visited up to now, in the order that the player visited them.

			Example usage:
			`(history:) contains "Cellar"` is true if the player has visited a passage called
			"Cellar" at some point.

			Rationale:
			Often, you may find yourself using "flag" variables to keep track of whether
			the player has visited a certain passage in the past. You can use (history:), along with
			data structure operators such as the `contains` operator, to obviate this necessity.

			Details:
			This includes duplicate names if the player has visited a passage more than once, or visited
			the same passage two or more turns in a row.

			This does *not* include the name of the current passage the player is visiting.

			See also:
			(passage:), (savedgames:)

			#game state
		*/
		("history", () => State.pastPassageNames(),
		[])
		
		/*d:
			(passage: [String]) -> Datamap
			
			When given a passage string name, this provides a datamap containing information about that passage. If no
			name was provided, then it provides information about the current passage.
			
			Example usage:
			`(passage:"Cellar")`

			Rationale:
			There are times when you wish to examine the data of the story as it is running - for instance, checking what
			tag a certain passage has, and performing some special behaviour as a result. This macro provides that functionality.

			Details:
			The datamap contains the following names and values.

			| Name | Value |
			|---
			| source | The source markup of the passage, exactly as you entered it in the Twine editor |
			| name | The string name of this passage. |
			| tags | An array of strings, which are the tags you gave to this passage. |

			The "source" value, like all strings, can be printed using (print:). Be warned that printing the source of
			the current passage, while inside of it, may lead to an infinite regress.

			Interestingly, the construction `(print: (passage: "Cellar")'s source)` is essentially identical in function (albeit longer to write)
			than `(display: "Cellar")`.

			See also:
			(history:), (savedgames:)

			#game state
		*/
		("passage", (_, passageName) =>
			clone(Passages.get(passageName || State.passage))
				|| TwineError.create('macrocall', "There's no passage named '" + passageName + "' in this story."),
		[optional(String)])
		
		/*d:
			(saved-games:) -> Datamap
			
			This returns a datamap containing the names of currently occupied save game slots.

			Example usage:
			`(print (saved-games:)'s "File A")` prints the name of the save file in the slot "File A".
			`(if: (saved-games:) contains "File A")` checks if the slot "File A" is occupied.

			Rationale:
			For a more thorough description of the save file system, see the (save-game:) article.
			This macro provides a means to examine the current save files in the user's browser storage, so
			you can decide to print "Load game" links if a slot is occupied, or display a list of
			all of the occupied slots.

			Details:
			Each name in the datamap corresponds to an occupied slot name. The values are the file names of
			the files occupying the slot.

			Changing the datamap does not affect the save files - it is simply information.

			See also:
			(save-game:), (load-game:)

			#saving
		*/
		("savedgames", () => {
			/*
				This should be identical to the internal function in macrolib/commands.js.
				TODO: Add this to Engine itself, maybe.
			*/
			function storagePrefix(text) {
				return "(" + text + " " + Engine.options.ifid + ") ";
			}
			/*
				This reads all of the localStorage keys with save slot-related names.
			*/
			let
				i = 0, key;
			const
				savesMap = new Map();
			/*
				Iterate over all the localStorage keys using this somewhat clunky do-loop.
			*/
			do {
				key = localStorage.key(i);
				i += 1;
				const prefix = storagePrefix("Saved Game");
				if (key && key.startsWith(prefix)) {
					// Trim off the prefix
					key = key.slice(prefix.length);
					// Populate the saves map with the save slot name.
					savesMap.set(key, localStorage.getItem(storagePrefix("Saved Game Filename") + key));
				}
			}
			while(key);
			return savesMap;
		},
		[])
		
		/*
			DATAMAP MACROS
		*/
		/*d:
			Datamap data
			
			There are occasions when you may need to work with collections of values that "belong" to a
			specific object or entity in your story - for example, a table of numeric "statistics" for
			a monster - or that associate a certain kind of value with another kind, such as a combination of
			adjectives ("slash", "thump") that change depending on the player's weapon name ("claw", "mallet") etc.
			You can create datamaps to keep these values together, move them around en masse, and organise them.
			
			Datamaps are one of the two major "data structures" you can use in Harlowe. The other, arrays,
			are created with (a:). You'll want to use datamaps if you want to store values that directly correspond to *strings*,
			and whose *order* and *position* do not matter. If you need to preserve the order of the values, then an array
			may be better suited.
			
			Datamaps consist of several string *name*s, each of which maps to a specific *value*. `$animals's frog` and `frog of $animals`
			refers to the value associated with the name 'frog'. You can add new names or change existing values by using (set:) -
			`(set: $animals's wolf to "howl")`.

			You can express the name as a bare word if it doesn't have a space or other punctuation in it - `$animals's frog` is OK, but
			`$animals's komodo dragon` is not. In that case, you'll need to always supply it as a string - `$animals's "komodo dragon"`.
			
			Datamaps may be joined by adding them together: `(dm: "goose", "honk") + (dm: "robot", "whirr")` is the same as
			`(dm: "goose", "honk", "robot", "whirr")`. In the event that the second datamap has the same name as the first one,
			it will override the first one's value - `(dm: "dog", "woof") + (dm: "dog", "bark")` will act as
			`(dm: "dog", "bark")`.
			
			You may notice that you usually need to know the names a datamap contains in order to access its values. There are certain
			macros which provide other ways of examining a datamap's contents: (datanames:) provides a sorted array of its names,
			(datavalues:) provides a sorted array of its values, and (dataentries:) provides an array of names and values.

			To summarise, the following operators work on datamaps.
			
			| Operator | Purpose | Example
			|---
			| `is` | Evaluates to boolean `true` if both sides contain equal names and values, otherwise `false`. | `(dm:"HP",5) is (dm:"HP",5)` (is true)
			| `is not` | Evaluates to `true` if both sides differ in items or ordering. | `(dm:"HP",5) is not (dm:"HP",4)` (is true)<br>`(dm:"HP",5) is not (dm:"MP",5)` (is true)
			| `contains` | Evaluates to `true` if the left side contains the name on the right.<br>(To check that a datamap contains a value, try using `contains` with (datavalues:)) | `(dm:"HP",5) contains "HP"` (is true)<br>`(dm:"HP",5) contains 5` (is false)
			| `is in` | Evaluates to `true` if the right side contains the name on the left. | `"HP" is in (dm:"HP",5)` (is true)
			| `+` | Joins datamaps, using the right side's value whenever both sides contain the same name. | `(dm:"HP",5) + (dm:"MP",5)`
			| `'s` | Obtaining the value using the name on the right. | `(dm:"love",155)'s love` (is 155).
			| `of` | Obtaining the value using the name on the left. | `love of (dm:"love",155)` (is 155).
		*/
		/*d:
			(dm: [...Any]) -> Datamap
			Also known as: (datamap:)

			Creates a datamap, which is a data structure that pairs string names with data values.
			You should provide a string name, followed by the value paired with it, and then another
			string name, another value, and so on, for as many as you'd like.

			Example usage:
			`(dm:)` creates an empty datamap.
			`(dm: "Cute", 4, "Wit", 7)` creates a datamap with two names and values.
			The following code also creates a datamap, with the names and values laid out in a readable fashion:
			```
			(dm:
				"Susan", "A petite human in a yellow dress",
				"Tina", "A ten-foot lizardoid in a three-piece suit",
				"Gertie", "A griffin draped in a flowing cape",
			)
			```
			
			Rationale:
			For an explanation of what datamaps are, see the Datamap article.
			This macro is the primary means of creating datamaps - simply supply a name,
			followed by a value, and so on.

			In addition to creating datamaps for long-term use, this is also used to
			create "momentary" datamaps which are used only in some operation. For instance,
			to add several values to a datamap at once, you can do something like this:
			```
			(set: $map to it + (dm: "Name 1", "Value 1", "Name 2", "Value 2"))
			```

			You can also use (dm:) as a kind of "multiple choice" structure, if you combine it with
			the `'s` or `of` syntax. For instance...
			```
			(set: $element to $monsterName of (dm:
				"Chilltoad", "Ice",
				"Rimeswan", "Ice",
				"Brisketoid", "Fire",
				"Slime", "Water"
			))
			```
			...will set $element to one of those elements if $monsterName matches the correct name. But, be warned: if
			none of those names matches $monsterName, an error will result.

			See also:
			(a:), (ds:)

			#data structure 2
		*/
		(["datamap","dm"], (_, ...args) => {
			let key;
			const map = new Map();
			/*
				This takes the flat arguments "array" and runs
				map.set() with every two values.
				During each odd iteration, the element is the key.
				Then, the element is the value.
			*/
			const status = args.reduce((status, element) => {
				let error;
				/*
					Propagate earlier iterations' errors.
				*/
				if (TwineError.containsError(status)) {
					return status;
				}
				if (key === undefined) {
					key = element;
				}
				/*
					Key type-checking must be done here.
				*/
				else if ((error = TwineError.containsError(isValidDatamapName(map, key)))) {
					return error;
				}
				/*
					This syntax has a special restriction: you can't use the same key twice.
				*/
				else if (map.has(key)) {
					return TwineError.create("macrocall",
						"You used the same data name ("
						+ objectName(key)
						+ ") twice in the same (datamap:) call."
					);
				}
				else {
					map.set(key, clone(element));
					key = undefined;
				}
				return status;
			}, true);
			/*
				Return an error if one was raised during iteration.
			*/
			if (TwineError.containsError(status)) {
				return status;
			}
			/*
				One error can result: if there's an odd number of arguments, that
				means a key has not been given a value.
			*/
			if (key !== undefined) {
				return TwineError.create("macrocall", "This datamap has a data name without a value.");
			}
			return map;
		},
		zeroOrMore(Any))
		
		/*
			DATASET MACROS
		*/
		/*d:
			Dataset data

			Arrays are useful for dealing with a sequence of related data values, especially if
			they have a particular order. There are occasions, however, where you don't really
			care about the order, and instead would simply use the array as a storage place for
			values - using `contains` and `is in` to check which values are inside.

			Think of datasets as being like arrays, but with specific restrictions:

			* You can't access any positions within the dataset (so, for instance, the `1st`, `2ndlast`
			and `last` aren't available, although the `length` still is) and can only use `contains`
			and `is in` to see whether a value is inside (or, by using `any` and `all`, many values).

			* Datasets only contain unique values: adding the string "Go" to a dataset already
			containing "Go" will do nothing.

			* Datasets are considered equal (by the `is` operator) if they have the same items, regardless
			of order (as they have no order).

			These restrictions can be helpful in that they can stop programming mistakes from
			occurring - you might accidentally try to modify a position in an array, but type the name of
			a different array that should not be modified as such. Using a dataset for the second
			array, if that is what best suits it, will cause an error to occur instead of allowing
			this unintended operation to continue.


			| Operator | Purpose | Example
			|---
			| `is` | Evaluates to boolean `true` if both sides contain equal items, otherwise `false`. | `(ds:1,2) is (ds 2,1)` (is true)
			| `is not` | Evaluates to `true` if both sides differ in items. | `(ds:5,4) is not (ds:5)` (is true)
			| `contains` | Evaluates to `true` if the left side contains the right side. | `(ds:"Ape") contains "Ape"`<br>`(ds:(ds:99)) contains (ds:99)`<br>`(ds: 1,2,3) contains all of (a:2,3)`<br>`(ds: 1,2,3) contains any of (a:3,4)`
			| `is in` | Evaluates to `true` if the right side contains the left side. | `"Ape" is in (ds:"Ape")`<br>`(a:3,4) is in (ds:1,2,3)`
			| `+` | Joins datasets. | `(ds:1,2,3) + (ds:1,2,4)` (is `(ds:1,2,3,4)`)
			| `-` | Subtracts datasets. | `(ds:1,2,3) - (ds:1,3)` (is `(ds:2)`)
			| `...` | When used in a macro call, it separates each value in the right side.<br>The dataset's values are sorted before they are spread out.| `(a: 0, ...(ds:1,2,3,4), 5)` (is `(a:0,1,2,3,4,5)`)
		*/
		/*d:
			(ds: [...Any]) -> Dataset
			Also known as: (dataset:)

			Creates a dataset, which is an unordered collection of unique values.
			
			Example usage:
			`(ds:)` creates an empty dataset, which could be filled with other values later.
			`(ds: "gold", "frankincense", "myrrh")` creates a dataset with three strings.
			
			Rationale:
			For an explanation of what datasets are, see the Dataset article. This macro is the primary
			means of creating datasets - simply supply the values to it, in any order you like.
			
			Details:
			You can also use this macro to remove duplicate values from an array (though also eliminating the array's
			order) by using the spread `...` operator like so: `(a: ...(ds: ...$array))`.
			
			See also:
			(dm:), (a:)
			
			#data structure 3
		*/
		(["dataset","ds"], (_, ...args) => new Set(args.filter(unique).map(clone)), zeroOrMore(Any))
		
		/*
			COLLECTION OPERATIONS
		*/
		/*d:
			(count: Array or String, ...Any) -> Number

			Accepts a string or array, followed by a value, and produces the number of times any of the values
			are inside the string or array.

			Example usage:
			`(count: (a:1,2,3,2,1), 1, 2)` produces 4.
			`(count: "Though", "ugh","u","h")` produces 4.

			Rationale:
			You can think of this macro as being like the `contains` operator, but more powerful.
			While `contains` produces `true` or `false` if occurrences of the right side
			appear in the left side, (count:) produces the actual number of occurrences.

			Note that if you only want to check if an array or string contains any or all of the
			values, it's easier to use `contains` with the `all` property like so: `$arr contains all of (a:1,2)`
			and `$arr contains any of (a:1,2)`. But, if you need an exact figure for the number of occurrences,
			this macro will be of use.

			Details:
			If you use this with a number, boolean, datamap, dataset (which can't have duplicates),
			or anything else which can't have a value, then an error will result.

			If you use this with a string, and the values aren't also strings, then an error will result.

			Substrings are counted separately from each other - that is, the string "Though" contains "ugh" once and "h"
			once, and `(count: "Though","ugh","h")` results in 3. To check for "h" occurrences that are not contained in "ugh",
			you can try subtracting two (count:)s - `(count: "Though","ugh") - (count: "Though","h")` produces 1.

			See also:
			(datanames:), (datavalues:)

			#data structure
		*/
		("count", function count(_, collection, ...values) {
			/*
				As with many other macros, this handles multiple data values by recursively calling itself.
			*/
			if (values.length > 1) {
				let error;
				const recur = values.map(value => count(_, collection, value));
				if ((error = TwineError.containsError(recur))) {
					return error;
				}
				return recur.reduce((a,e) => a + e, 0);
			}
			const [value] = values;
			/*
				With a single value in hand, we now perform the count.
			*/
			switch(collectionType(collection)) {
				case "dataset":
				case "datamap": {
					return TwineError.create("macrocall",
						"(count:) shouldn't be given a datamap or dataset.",
						"You should use the 'contains' operator instead. For instance, write: $variable contains 'value'."
					);
				}
				case "string": {
					if (typeof value !== "string") {
						return TwineError.create("macrocall",
							objectName(collection)
							+ " can't contain  "
							+ objectName(value)
							+ " because it isn't a string."
						);
					}
					/*
						Since String#split() always produces an array of length 1 or more,
						this will always produce 0 or higher.

						Incidentally, if the value is the empty string, then 0 occurrences
						should be reported.
					*/
					return !value ? 0 : collection.split(value).length-1;
				}
				case "array": {
					return collection.reduce((count, e) => count + is(e,value), 0);
				}
				default: {
					return TwineError.create("macrocall",
						objectName(collection)
						+ " can't contain values, let alone "
						+ objectName(value)
						+ "."
					);
				}
			}
		},
		/*
			This currently has "Any" instead of "either(Array,String)" as its signature's first argument, so
			that the above special error messages can appear for certain wrong argument types.
		*/
		[Any, rest(Any)])
		
		// End of macros
		;
});
