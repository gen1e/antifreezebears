"use strict";
define(['macros', 'utils', 'utils/operationutils', 'datatypes/colour', 'internaltypes/twineerror'],
(Macros, {realWhitespace, anyRealLetter}, {subset, objectName}, Colour, TwineError) => {
	/*
		Built-in value macros.
		These macros manipulate the primitive values - boolean, string, number.
	*/
	
	const
		{rest, zeroOrMore,
		/* Any is a value, not a method. */
		Any} = Macros.TypeSignature;
	
	Macros.add
		/*d:
			String data
			
			A string is just a block of text - a bunch of text characters strung together.
			
			When making a story, you'll mostly work with strings that you intend to insert into
			the passage source. If a string contains markup, then the markup will be processed when it's
			inserted. For instance, `"The ''biiiiig'' bellyblob"` will print as "The <b>biiiiig</b> bellyblob".
			Even macro calls inside strings will be processed: printing `"The (print:2*3) bears"` will print "The 6 bears".
			If you wish to avoid this, simply include the verbatim markup inside the string:``"`It's (exactly: as planned)`"`` will
			print "It's (exactly: as planned)".
			
			You can add strings together to join them: `"The" + ' former ' + "Prime Minister's"`
			pushes the strings together, and evaluates to "The former Prime Minister's". Notice
			that spaces had to be added between the words in order to produce a properly spaced final string.
			Also, notice that you can only add strings together. You can't subtract them, much less multiply or divide them.
			
			Strings are similar to arrays, in that their individual characters can be accessed: `"ABC"'s 1st` evaluates to "A",
			`"Gosh"'s 2ndlast` evaluates to "s", and `"Exeunt"'s last` evaluates to "t". They, too, have a "length":
			`"Marathon"'s length` is 8. If you don't know the exact position of a character, you can use an expression,
			in brackers, after it: `$string's ($pos - 3)`. And, you can access a substring by providing an array of positions
			in place of a single position: `"Dog"'s (a: 2,3)` is "og".

			Also, you can use the `contains` and `is in` operators to see if a certain string is contained within another: `"mother"
			contains "moth"` is true, as is `"a" is in "a"`. Again, like arrays, strings have special `any` and `all` data names which
			can be used with `contains` and `is in` to check all their characters - `all of $string is not "w"` is true if the string doesn't
			contain "w", and `$string contains any of "aeiou"` is true if the string contains those five letters.

			To summarise, here are the operations you can perform on strings.

			| Operator | Function | Example
			|---
			| `+` | Joining. | `"A" + "Z"` (is "AZ")
			| `is` | Evaluates to boolean `true` if both sides are equal, otherwise `false`. | `$name is "Frederika"`<br>`any of "Buxom" is "x"`
			| `is not` | Evaluates to boolean `true` if both sides are not equal, otherwise `false`. | `$friends is not $enemies`<br>`all of "Gadsby" is not "e"`
			| `contains` | Evaluates to boolean `true` if the left side contains the right side, otherwise `false`. | `"Fear" contains "ear"`
			| `is in` | Checking if the right string contains the left string, otherwise `false`. | `"ugh" is in "Through"`
			| `'s` | Obtaining the character or substring at the right numeric position. | `"YO"'s 1st` (is "Y")<br>`"PS"'s (2)` (is "S")<br>`"ear"'s (a: 2,3)` (is "ar")
			| `of` | Obtaining the character at the left numeric position. | `1st of "YO"` (is "Y")<br>`(2) of "PS"` (is "S")<br>`(a: 2,3) of "ear"` (is "ar")
		*/
		/*d:
			(text: ...[Number or String or Boolean or Array]) -> String
			Also known as: (string:)
			
			(text:) accepts any amount of expressions and tries to convert them all
			to a single String.
			
			Example usages:
			* `(text: $cash + 200)`
			* `(if: (text: $cash)'s length > 3)[Phew! Over four digits!]`
			* `(text: ...$arr)`
			
			Rationale:
			Unlike in Twine 1 and SugarCube, Twine 2 will only convert numbers into strings, or strings
			into numbers, if you explictly ask it to. This extra carefulness decreases
			the likelihood of unusual bugs creeping into stories (such as adding 1 and "22"
			and getting "122"). The (text:) macro (along with (num:)) is how you can convert
			non-string values to a string.
			
			Details:
			This macro can also be used much like the (print:) macro - as it evaluates to a
			string, and strings can be placed in the story source freely,
			
			If you give an array to (text:), it will attempt to convert every element
			contained in the array to a String, and then join them up with commas. So,
			`(text: (a: 2, "Hot", 4, "U"))` will result in the string "2,Hot,4,U".
			If you'd rather this not occur, you can also pass the array's individual
			elements using the `...` operator - this will join them with nothing in between.
			So, `(text: ...(a: 2, "Hot", 4, "U"))` will result in the string "2Hot4U".
			
			See also:
			(num:)

			#string
		*/
		(["text", "string"],
			/*
				Since only primitives (and arrays) are passed into this, and we use
				JS's default toString() for primitives, we don't need
				to do anything more than join() the array.
			*/
			(_, ...args) => args.join(''),
		// (text: accepts a lot of any primitive)
		[zeroOrMore(Macros.TypeSignature.either(String, Number, Boolean, Array))])

		/*d:
			(substring: String, Number, Number) -> String
			
			This macro produces a substring of the given string, cut from two inclusive number positions.
			
			Example usage:
			`(substring: "growl", 3, 5)` is the same as `"growl"'s (a:3,4,5)`

			Rationale:
			You can obtain substrings of strings without this macro, by using the `'s` or `of` syntax along
			with an array of positions. For instance, `$str's (range:4,12)` obtains a substring of $str containing
			its 4th through 12th characters. But, for compatibility with previous Harlowe versions which did not
			feature this syntax, this macro also exists.
			
			Details:
			If you provide negative numbers, they will be treated as being offset from the end
			of the string - `-2` will specify the `2ndlast` character, just as 2 will specify
			the `2nd` character.
			
			If the last number given is smaller than the first (for instance, in `(substring: "hewed", 4, 2)`)
			then the macro will still work - in that case returning "ewe" as if the numbers were in
			the correct order.
			
			See also:
			(subarray:)

			#deprecated
		*/
		("substring", (_, string, a, b) => subset(string, a, b),
		[String, parseInt, parseInt])

		/*d:
			(lowercase: String) -> String
			
			This macro produces a lowercase version of the given string.
			
			Example usage:
			`(lowercase: "GrImAcE")` is the same as `"grimace"`
			
			Details:
			The results of this macro for non-ASCII characters currently depends on the player's browser's Unicode
			support. For instance, 'İ' in lowercase should be 'i̇', but some browsers don't support this.
			
			See also:
			(uppercase:), (lowerfirst:), (upperfirst:)

			#string
		*/
		("lowercase", (_, string) => string.toLowerCase(),
		[String])
		
		/*d:
			(uppercase: String) -> String
			
			This macro produces an uppercase version of the given string.
			
			Example usage:
			`(uppercase: "GrImAcE")` is the same as `"GRIMACE"`
			
			Details:
			The results of this macro for non-ASCII characters currently depends on the player's browser's Unicode
			support. For instance, 'ß' in uppercase should be 'SS', but some browsers don't support this.
			
			See also:
			(lowercase:), (upperfirst:), (lowerfirst:)

			#string
		*/
		("uppercase", (_, string) => string.toUpperCase(),
		[String])
		
		/*d:
			(lowerfirst: String) -> String
			
			This macro produces a version of the given string, where the first alphanumeric character is lowercase, and
			other characters are left as-is.
			
			Example usage:
			`(lowerfirst: "  College B")` is the same as `"  college B"`
			
			Details:
			If the first alphanumeric character cannot change case (for instance, if it's a number) then nothing
			will change in the string. So, "8DX" won't become "8dX".

			The results of this macro for non-ASCII characters currently depends on the player's browser's Unicode
			support. For instance, 'İ' in lowercase should be 'i̇', but some browsers don't support this.
			
			See also:
			(uppercase:), (lowercase:), (upperfirst:)

			#string
		*/
		("lowerfirst", (_, string) =>
			// This has to be an entire word, to handle surrogate pairs and single characters alike.
			string.replace(new RegExp(anyRealLetter + "+"), word => {
				// Split the word into code points first.
				word = Array.from(word);
				return word[0].toLowerCase() + (word.slice(1).join('')).toLowerCase();
			}
		),
		[String])
		
		/*d:
			(upperfirst: String) -> String
			
			This macro produces a version of the given string, where the first alphanumeric character is uppercase, and
			other characters are left as-is.
			
			Example usage:
			`(upperfirst: "  college B")` is the same as `"  College B"`
			
			Details:
			If the first alphanumeric character cannot change case (for instance, if it's a number) then nothing
			will change in the string. So, "4ever" won't become "4Ever".

			The results of this macro for non-ASCII characters currently depends on the player's browser's Unicode
			support. For instance, 'ß' in uppercase should be 'SS', but some browsers don't support this.
			
			See also:
			(uppercase:), (lowercase:), (lowerfirst:)

			#string
		*/
		("upperfirst", (_, string) =>
			// This has to be an entire word, to handle surrogate pairs and single characters alike.
			string.replace(new RegExp(anyRealLetter + "+"), word => {
				// Split the word into code points first.
				word = Array.from(word);
				return word[0].toUpperCase() + (word.slice(1).join('')).toLowerCase();
			}
		),
		[String])

		/*d:
			(words: String) -> Array
			
			This macro takes a string and creates an array of each word ("word" meaning a sequence of non-whitespace
			characters) in the string.
			
			Example usage:
			`(words: "god-king Torment's peril")` is the same as `(a: "god-king", "Torment's", "peril")`
			
			Rationale:
			It can be useful to explicitly distinguish individual words within a string, in a manner not possible
			with just the `contains` operator - for instance, seeing if a string contains the bare word "to" - not "torn"
			or any other larger word. This macro allows a string's words to be split up and examined individually -
			you can safely check if `(words: $a) contains "to"`, or check on a particular word in the sequence by
			asking if, say, `(words: $a)'s 2nd is 'goose'`.

			Details:
			If the string was empty or contained only whitespace, then this will create an empty array. Moreover,
			if the string contained no whitespace, then the array will contain just the entire original string.

			The whitespace characters recognised by this macro include line breaks, non-breaking spaces, and other uncommon
			space characters.
			
			See also:
			(startcase:)

			#string
		*/
		("words", (_, string) => string.split(new RegExp(realWhitespace + "+")).filter(Boolean),
		[String])

		/*d:
			Number data
			
			Number data is just numbers, which you can perform basic mathematical calculations with.
			You'll generally use numbers to keep track of statistics for characters, count how many times
			an event has occurred, and numerous other uses.
			
			You can do all the basic mathematical operations you'd expect to numbers:
			`(1 + 2) / 0.25 + (3 + 2) * 0.2` evaluates to the number 13. The computer follows the normal order of
			operations in mathematics: first multiplying and dividing, then adding and subtracting. You can group
			subexpressions together and force them to be evaluated first with parentheses.
			
			If you're not familiar with some of those symbols, here's a review, along with various other operations you can perform.
			
			| Operator | Function | Example
			|---
			| `+` | Addition. | `5 + 5` (is 10)
			| `-` | Subtraction.  Can also be used to negate a number. | `5 - -5` (is 10)
			| `*` | Multiplication. | `5 * 5` (is 25)
			| `/` | Division. | `5 / 5` (is 1)
			| `%` | Modulo (remainder of a division). | `5 % 26` (is 1)
			| `>` | Evaluates to boolean `true` if the left side is greater than the right side, otherwise `false`. | `$money > 3.75`
			| `>=` | Evaluates to boolean `true` if the left side is greater than or equal to the right side, otherwise `false`. | `$apples >= $carrots + 5`
			| `<` | Evaluates to boolean `true` if the left side is less than the right side, otherwise `false`. | `$shoes < $people * 2`
			| `<=`~ | Evaluates to boolean `true` if the left side is less than or equal to the right side, otherwise `false`. | `65 <= $age`
			
			You can only perform these operations (apart from `is`) on two pieces of data if they're both numbers. Adding the
			string "5" to the number 2 would produce an error, and not the number 7 nor the string "52". You must
			convert one side or the other using the (num:) or (text:) macros.
		*/
		/*d:
			(num: String) -> Number
			Also known as: (number:)
			
			This macro converts strings to numbers by reading the digits in the entire
			string. It can handle decimal fractions and negative numbers.
			If any letters or other unusual characters appear in the number, it will
			result in an error.
			
			Example usage:
			`(num: "25")` results in the number `25`.
			
			Rationale:
			Unlike in Twine 1 and SugarCube, Twine 2 will only convert numbers into strings, or strings
			into numbers, if you explictly ask it to using macros such as this. This extra
			carefulness decreases the likelihood of unusual bugs creeping into stories
			(such as performing `"Eggs: " + 2 + 1` and getting `"Eggs: 21"`).
			
			Usually, you will only work with numbers and strings of your own creation, but
			if you're receiving user input and need to perform arithmetic on it,
			this macro will be necessary.
			
			See also:
			(text:)

			#number
		*/
		(["num", "number"], (_, expr) => {
			/*
				This simply uses JS's toNumber conversion, meaning that
				decimals and leading spaces are handled, but leading letters etc. are not.
			*/
			if (Number.isNaN(+expr)) {
				return TwineError.create("macrocall", "I couldn't convert " + objectName(expr)
					+ " to a number.");
			}
			return +expr;
		},
		[String])

		/*d:
			(rgb: Number, Number, Number) -> Colour

			This macro creates a colour using the three red (r), green (g) and blue (b) values
			provided, whose values are whole numbers between 0 and 255.

			Example usage:
			* `(rgb: 255, 0, 47)` produces a colour with 255 red, 0 blue and 47 green.
			* `(rgb: 90, 0, 0)'s r` produces the number 90.

			Rationale:

			The RGB additive colour model is commonly used for defining colours: the HTML
			hexadecimal notation for colours (such as #9263AA) simply consists of three hexadecimal
			values placed together. This macro allows you to create such colours computationally,
			by providing variables for certain components.

			Details:

			This macro takes the same range of numbers as the CSS `rgb()` function.

			Giving values higher than 255 or lower than 0, or with a fractional part,
			will cause an error.

			See also:
			(rgba:), (hsl:), (hsla:)

			#colour
		*/
		("rgb", (_, ...values) => {
			for (let val, i = 0; i < values.length; i += 1) {
				val = values[i];
				if (val < 0 || val > 255) {
					return TwineError.create("macrocall",
						"RGB values must be whole numbers between 0 and 255, not " + objectName(val) + ".");
				}
			}
			return Colour.create({r: values[0], g: values[1], b: values[2]});
		},
		[parseInt, parseInt, parseInt])

		/*d:
			(rgba: Number, Number, Number, Number) -> Colour

			A special version of (rgb:), this macro allows you to supply not just the red (r),
			green (g) and blue (b) values, but also the transparency (alpha, or a) percentage, which
			is a fractional value between 0 (fully transparent) and 1 (fully visible).

			Anything drawn with a partially transparent colour will itself be partially transparent. You
			can then layer such elements to produce a few interesting visual effects.

			Example usage:
			`(rgba: 178, 229, 178, 0.6)` produces a 40% transparent faint green.

			Details:

			This macro takes the same range of numbers as the CSS `rgba()` function.

			Giving alpha percentages higher than 1 or lower than 0 will cause an error.

			See also:
			(rgb:), (hsl:), (hsla:)

			#colour
		*/
		("rgba", (_, ...values) => {
			for (let val, i = 0; i < 3; i += 1) {
				val = values[i];
				if (val < 0 || val > 255) {
					return TwineError.create("macrocall",
						"RGB values must be whole numbers between 0 and 255, not " + objectName(val) + ".");
				}
			}
			if (values[3] < 0 || values[3] > 1) {
				return TwineError.create("macrocall",
					"Alpha values must be numbers between 0 and 1 inclusive, not " + objectName(values[3]) + ".");
			}
			return Colour.create({r: values[0], g: values[1], b: values[2], a: values[3]});
		},
		[parseInt, parseInt, parseInt, Number])

		/*d:
			(hsl: Number, Number, Number) -> Colour

			This macro creates a colour using the given hue (h) angle in degrees, as well as the given
			saturation (s) and lightness (l) percentages.

			Example usage:
			* `(hsl: 120, 0.8, 0.5)` produces a colour with 120 degree hue, 80% saturation and 50% lightness.
			* `(hsl: 28, 1, 0.4)'s h` produces the number 28.

			Rationale:

			The HSL colour model is regarded as easier to work with than the RGB model used for HTML hexadecimal
			notation and the (rgb:) macro. Being able to set the hue with one number instead of three, for
			instance, lets you control the hue using a single variable, and alter it at will.

			Details:

			This macro takes the same range of numbers as the CSS `hsl()` function.

			Giving saturation or lightness values higher than 1 or lower than 0 will cause an error. However,
			you can give any kind of hue number to (hsl:), and it will automatically round it to fit the 0-359
			degree range. This allows you to cycle through hues easily by providing a steadily increasing variable or
			a counter, such as `(hsl: time / 100, 1, 0.5)`.

			See also:
			(rgb:), (rgba:), (hsla:)

			#colour
		*/
		("hsl", (_, h, s, l) => {
			const errorMsg = " values must be numbers between 0 and 1 inclusive, not ";
			if (s < 0 || s > 1) {
				return TwineError.create("macrocall", "Saturation" + errorMsg + objectName(s) + ".");
			}
			if (l < 0 || l > 1) {
				return TwineError.create("macrocall", "Lightness" + errorMsg + objectName(l) + ".");
			}
			/*
				Unlike S and L, H is silently rounded and truncated to the 0..360 range. This allows increasing counters
				to be given directly to the (hsl:) macro, to cycle through the hues continuously.
				Round is used because, as the user's hue range is effectively continuous, nothing is lost by using it.
			*/
			h = Math.round(h) % 360;
			if (h < 0) {
				h += 360;
			}
			return Colour.create({h, s, l});
		},
		[Number, Number, Number])

		/*d:
			(hsla: Number, Number, Number, Number) -> Colour

			A special version of (hsl:), this macro allows you to supply not just the hue (h) angle in
			degrees, saturation (s) and lightness (l) percentages, but also the transparency
			(alpha, or a) percentage, which is a fractional value between 0 (fully transparent)
			and 1 (fully visible).

			Anything drawn with a partially transparent colour will itself be partially transparent. You
			can then layer such elements to produce a few interesting visual effects.

			Example usage:
			`(hsla: 120, 0.5, 0.8, 0.6)` produces a 40% transparent faint green.

			Details:

			This macro takes the same range of numbers as the CSS `rgba()` function.

			Giving alpha percentages higher than 1 or lower than 0 will cause an error.

			See also:
			(rgb:), (rgba:), (hsl:)

			#colour
		*/
		("hsla", (_, h, s, l, a) => {
			const errorMsg = " values must be numbers between 0 and 1 inclusive, not ";
			if (s < 0 || s > 1) {
				return TwineError.create("macrocall", "Saturation" + errorMsg + objectName(s) + ".");
			}
			if (l < 0 || l > 1) {
				return TwineError.create("macrocall", "Lightness" + errorMsg + objectName(l) + ".");
			}
			if (a < 0 || a > 1) {
				return TwineError.create("macrocall", "Alpha" + errorMsg + objectName(l) + ".");
			}
			h = Math.round(h) % 360;
			if (h < 0) {
				h += 360;
			}
			return Colour.create({h, s, l, a});
		},
		[Number, Number, Number, Number])

		;
		/*d:
			Boolean data
			
			Computers can perform more than just mathematical tasks - they are also virtuosos in classical logic. Much as how
			arithmetic involves manipulating numbers with addition, multiplication and such, logic involves manipulating the
			values `true` and `false` using its own operators. Those are not text strings - they are values as fundamental as
			the natural numbers. In computer science, they are both called *Booleans*, after the 19th century mathematician
			George Boole.
			
			`is` is a logical operator. Just as + adds the two numbers on each side of it, `is` compares two values on each
			side and evaluates to `true` or `false` depending on whether they're identical. It works equally well with strings,
			numbers, arrays, and anything else, but beware - the string `"2"` is not equal to the number 2.
			
			There are several other logical operators available.
			
			| Operator | Purpose | Example
			|---
			| `is` | Evaluates to `true` if both sides are equal, otherwise `false`. | `$bullets is 5`
			| `is not` | Evaluates to `true` if both sides are not equal. | `$friends is not $enemies`
			| `contains` | Evaluates to `true` if the left side contains the right side. | `"Fear" contains "ear"`
			| `is in` | Evaluates to `true` if the right side contains the left side. | `"ugh" is in "Through"`
			| `>` | Evaluates to `true` if the left side is greater than the right side. | `$money > 3.75`
			| `>=` | Evaluates to `true` if the left side is greater than or equal to the right side. | `$apples >= $carrots + 5`
			| `<` | Evaluates to `true` if the left side is less than the right side. | `$shoes < $people * 2`
			| `<=` | Evaluates to `true` if the left side is less than or equal to the right side. | `65 <= $age`
			| `and` | Evaluates to `true` if both sides evaluates to `true`. | `$hasFriends and $hasFamily`
			| `or` | Evaluates to `true` if either side is `true`. | `$fruit or $vegetable`
			| `not` | Flips a `true` value to a `false` value, and vice versa. | `not $stabbed`
			
			Conditions can quickly become complicated. The best way to keep things straight is to use parentheses to
			group things.
		*/

	/*
		JS library wrapper macros
	*/
	
	/*
		Filter out NaN and Infinities, throwing an error instead.
		This is only applied to functions that can create non-numerics,
		namely log, sqrt, etc.
	*/
	function mathFilter (fn) {
		return (...args) => {
			const result = fn(...args);
			if (typeof result !== "number" || isNaN(result)) {
				return TwineError.create("macrocall", "This mathematical expression doesn't compute!");
			}
			return result;
		};
	}
	
	({
		/*d:
			(weekday:) -> String

			This date/time macro produces one of the strings "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"
			or "Saturday", based on the weekday on the current player's system clock.

			Example usage:
			`Today is a (weekday:).`

			#date and time
		*/
		weekday: [() => ['Sun', 'Mon', 'Tues', 'Wednes', 'Thurs', 'Fri', 'Satur'][new Date().getDay()] + "day",
		// 0 args
		null],

		/*d:
			(monthday:) -> Number

			This date/time macro produces a number corresponding to the day of the month on the current player's system clock.
			This should be between 1 (on the 1st of the month) and 31, inclusive.

			Example usage:
			`Today is day (monthday:).`
			
			#date and time
		*/
		monthday: [() => new Date().getDate(),
		null],

		/*d:
			(current-time:) -> String

			This date/time macro produces a string of the current 12-hour time on the current player's system clock,
			in the format "12:00 AM".

			Example usage:
			`The time is (current-time:).`
			
			#date and time
		*/
		currenttime: [() => {
			const d = new Date(),
				am = d.getHours() < 12,
				hr = ((d.getHours() % 12) || 12),
				mins = (d.getMinutes() < 10 ? "0" : "") + d.getMinutes();

			return hr + ":" + mins + " " + (am ? "A" : "P") + "M";
		},
		null],

		/*d:
			(current-date:) -> String

			This date/time macro produces a string of the current date the current player's system clock,
			in the format "Thu Jan 01 1970".

			Example usage:
			`Right now, it's (current-date:).`
			
			#date and time
		*/
		currentdate: [() => {
			return new Date().toDateString();
		},
		null],

		/*d:
			(min: ...Number) -> Number

			This maths macro accepts numbers, and evaluates to the lowest valued number.

			Example usage:
			`(min: 2, -5, 2, 7, 0.1)` produces -5.

			#maths
		*/
		min: [Math.min, rest(Number)],
		/*d:
			(max: ...Number) -> Number

			This maths macro accepts numbers, and evaluates to the highest valued number.

			Example usage:
			`(max: 2, -5, 2, 7, 0.1)` produces 7.

			#maths
		*/
		max: [Math.max, rest(Number)],
		/*d:
			(abs: Number) -> Number

			This maths macro finds the absolute value of a number (without the sign).

			Example usage:
			`(abs: -4)` produces 4.

			#maths
		*/
		abs: [Math.abs, Number],
		/*d:
			(sign: Number) -> Number

			This maths macro produces -1 when given a negative number, 0 when given 0, and 1
			when given a positive number.

			Example usage:
			`(sign: -4)` produces -1.

			#maths
		*/
		sign: [Math.sign, Number],
		/*d:
			(sin: Number) -> Number

			This maths macro computes the sine of the given number of radians.

			Example usage:
			`(sin: 3.14159265 / 2)` produces 1.

			#maths
		*/
		sin:    [Math.sin, Number],
		/*d:
			(cos: Number) -> Number

			This maths macro computes the cosine of the given number of radians.

			Example usage:
			`(cos: 3.14159265)` produces -1.

			#maths
		*/
		cos:    [Math.cos, Number],
		/*d:
			(tan: Number) -> Number

			This maths macro computes the tangent of the given number of radians.

			Example usage:
			`(tan: 3.14159265 / 4)` produces approximately 1.

			#maths
		*/
		tan:    [Math.tan, Number],
		/*d:
			(floor: Number) -> Number

			This macro rounds the given number downward to a whole number. If a whole number is provided,
			it returns the number as-is.

			Example usage:
			`(floor: 1.99)` produces 1.

			#number
		*/
		floor:  [Math.floor, Number],
		/*d:
			(round: Number) -> Number

			This macro rounds the given number to the nearest whole number - downward if
			its decimals are smaller than 0.5, and upward otherwise. If a whole number is provided,
			it returns the number as-is.

			Example usage:
			`(round: 1.5)` produces 2.

			#number
		*/
		round:  [Math.round, Number],
		/*d:
			(ceil: Number) -> Number

			This macro rounds the given number upward to a whole number. If a whole number is provided,
			it returns the number as-is.

			Example usage:
			`(ceil: 1.1)` produces 2.

			#number
		*/
		ceil:   [Math.ceil, Number],
		/*d:
			(pow: Number, Number) -> Number

			This maths macro raises the first number to the power of the second number, and
			provides the result.

			Example usage:
			`(pow: 2, 8)` produces 256.

			#maths
		*/
		pow:    [mathFilter(Math.pow), [Number, Number]],
		/*d:
			(exp: Number) -> Number

			This maths macro raises Euler's number to the power of the given number, and
			provides the result.

			Example usage:
			`(exp: 6)` produces approximately 403.

			#maths
		*/
		exp:    [Math.exp, Number],
		/*d:
			(sqrt: Number) -> Number

			This maths macro produces the square root of the given number.

			Example usage:
			`(sqrt: 25)` produces 5.

			#maths
		*/
		sqrt:   [mathFilter(Math.sqrt), Number],
		/*d:
			(log: Number) -> Number

			This maths macro produces the natural logarithm (the base-e logarithm) of the given number.

			Example usage:
			`(log: (exp:5))` produces 5.

			#maths
		*/
		log:    [mathFilter(Math.log), Number],
		/*d:
			(log10: Number) -> Number

			This maths macro produces the base-10 logarithm of the given number.

			Example usage:
			`(log10: 100)` produces 2.

			#maths
		*/
		log10:  [mathFilter(Math.log10), Number],
		/*d:
			(log2: Number) -> Number

			This maths macro produces the base-2 logarithm of the given number.

			Example usage:
			`(log2: 256)` produces 8.

			#maths
		*/
		log2:   [mathFilter(Math.log2), Number],

		/*d:
			(random: Number, [Number]) -> Number

			This macro produces a whole number randomly selected between the two whole numbers, inclusive
			(or, if the second number is absent, then between 0 and the first number, inclusive).

			Example usage:
			`(random: 1,6)` simulates a six-sided die roll.

			See also:
			(either:), (shuffled:)

			#number
		*/
		random: [(a, b) => {
			let from, to;
			if (!b) {
				from = 0;
				to = a;
			} else {
				from = Math.min(a, b);
				to = Math.max(a, b);
			}
			to += 1;
			return ~~((Math.random() * (to - from))) + from;
		}, [parseInt, Macros.TypeSignature.optional(parseInt)]],
		
		/*d:
			(either: ...Any) -> Any
			
			Give this macro several values, separated by commas, and it will pick and return
			one of them randomly.
			
			Example usage:
			`A (either: "slimy", "goopy", "slippery") puddle` will randomly be "A slimy puddle", "A goopy puddle"
			or "A slippery puddle".
			
			Rationale:
			There are plenty of occasions where you might want random elements in your story: a few random adjectives
			or flavour text lines to give repeated play-throughs variety, for instance, or a few random links for a "maze"
			area. For these cases, you'll probably want to simply select from a few possibilities. The (either:)
			macro provides this functionality.

			Details:
			As with many macros, you can use the spread `...` operator to place all of the values in an array or dataset
			into (either:), and pick them randomly. `(either: ...$array)`, for instance, will choose one possibility from
			all of the array contents.

			If you want to pick two or more values randomly, you may want to use the (shuffled:) macro, and extract a subarray
			from its result.
			
			See also:
			(random:), (shuffled:)

			#basics
		*/
		either: [(...args) => args[~~(Math.random() * args.length)], rest(Any)],
		
		/*
			This method takes all of the above and registers them
			as Twine macros.
			
			By giving this JS's only falsy object key,
			this method is prohibited from affecting itself.
		*/
		""() {
			Object.keys(this).forEach((key) => {
				if (key) {
					let fn = this[key][0];
					let typeSignature = this[key][1];
					/*
						Of course, the mandatory first argument of all macro
						functions is section, so we have to convert the above
						to use a contract that's amenable to this requirement.
					*/
					Macros.add(key, (_, ...rest) => fn(...rest), typeSignature);
				}
			});
		}
	}[""]());
	
});
