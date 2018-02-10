"use strict";
define(['utils', 'datatypes/hookset', 'internaltypes/twineerror'], ({impossible, toJSLiteral}, HookSet, TwineError) => {
	
	/*
		First, a quick shortcut to determine whether the
		given value is an object (i.e. whether the "in"
		operator can be used on a given value).
	*/
	function isObject(value) {
		return !!value && (typeof value === "object" || typeof value === "function");
	}
	
	/*
		Next, a quick function used for distinguishing the 3 types of collections
		native to TwineScript.
	*/
	function collectionType(value) {
		return Array.isArray(value) ? "array" :
			value instanceof Map ? "datamap" :
			value instanceof Set ? "dataset" :
			typeof value === "string" ? "string" :
			value && typeof value === "object" ? "object" :
			/*
				If it's not an object, then it's not a collection. Return
				a falsy string (though I don't condone using this function in
				Boolean position).
			*/
			"";
	}
	
	/*
		Next a quick function that determines if a datamap property name is valid.
		This requires that the datamap itself be passed in.
	*/
	function isValidDatamapName(map, name) {
		if(!(map instanceof Map)) {
			impossible('isValidDatamapName','called with non-Map');
		}
		/*
			The computed variable property syntax means that basically
			any value can be used as a property key. Currently, we only allow strings
			and numbers to be used.
			(This kind of defeats the point of using ES6 Maps, though...)
		*/
		if(typeof name !== "string" && typeof name !== "number") {
			return TwineError.create(
				"property",
				"Only strings and numbers can be used as data names for "
				+ objectName(map) + ", not " + objectName(name) + "."
			);
		}
		/*
			To avoid confusion between types, it is not permitted to make OR REFERENCE
			a number data key if a similar string key is present, and vice-versa.
		*/
		const otherName = (typeof name === "string" ? +name : ''+name);
		
		/*
			If the name was a non-numeric string, otherName should be NaN.
			Ignore it if it is.
		*/
		if(!Number.isNaN(otherName) && map.has(otherName)) {
			return TwineError.create(
				"property",
				"You mustn't use both " + objectName(name) + " and "
				+ objectName(otherName) + " as data names in the same datamap."
			);
		}
		/*
			Those are all the tests.
		*/
		return true;
	}
	
	/*
		This function checks the type of a single macro argument. It's run
		for every argument passed into a type-signed macro.
		
		@param {Anything}     arg  The plain JS argument value to check.
		@param {Array|Object} type A type description to compare the argument with.
		@return {Boolean} True if the argument passes the check, false otherwise.
	*/
	function singleTypeCheck(arg, type) {
		/*
			First, check if it's a None type.
		*/
		if (type === null) {
			return arg === undefined;
		}

		/*
			Now, check if the signature is an Optional, Either, or Wrapped.
		*/
		if (type.innerType) {
			
			/*
				Optional signatures can exit early if the arg is absent.
			*/
			if (type.pattern === "optional" || type.pattern === "zero or more") {
				if (arg === undefined) {
					return true;
				}
				return singleTypeCheck(arg, type.innerType);
			}
			/*
				Either signatures must check every available type.
			*/
			if (type.pattern === "either") {
				/*
					The arg passes the test if it matches some of the types.
				*/
				return type.innerType.some(type => singleTypeCheck(arg, type));
			}
			/*
				If the type expects a lambda, then check the clauses and kind.
			*/
			if (type.pattern === "lambda" && singleTypeCheck(arg, type.innerType)) {
				if(typeof type.clauses !== 'string') {
					impossible('singleTypeCheck','lambda signature had non-string clauses');
				}
				return type.clauses.includes("where")  === "where"  in arg
					&& type.clauses.includes("making") === "making" in arg
					&& type.clauses.includes("via")    === "via"    in arg
					&& type.clauses.includes("with")   === "with"   in arg;
			}
			/*
				Otherwise, if this is a Wrapped signature, ignore the included
				message and continue.
			*/
			if (type.pattern === "wrapped") {
				return singleTypeCheck(arg, type.innerType);
			}
		}

		// If Type but no Arg, then return an error.
		if(type !== undefined && arg === undefined) {
			return false;
		}
		
		// The Any type permits any accessible argument, as long as it's present.
		if (type.TwineScript_TypeName === "anything" && arg !== undefined && !arg.TwineScript_Unstorable) {
			return true;
		}
		/*
			The built-in types. Let's not get tricky here.
		*/
		if (type === String) {
			return typeof arg === "string";
		}
		if (type === Boolean) {
			return typeof arg === "boolean";
		}
		if (type === parseInt) {
			return typeof arg === "number" && !Number.isNaN(arg) && !(arg + '').includes('.');
		}
		if (type === Number) {
			return typeof arg === "number" && !Number.isNaN(arg);
		}
		if (type === Array) {
			return Array.isArray(arg);
		}
		if (type === Map || type === Set) {
			return arg instanceof type;
		}
		/*
			For TwineScript-specific types, this check should mostly suffice.
			TODO: I really need to replace those duck-typing properties.
		*/
		return Object.isPrototypeOf.call(type,arg);
	}

	/*
		A shortcut to determine whether a given value should have
		sequential collection functionality (e.g. Array, String, other stuff).
	*/
	function isSequential(value) {
		return typeof value === "string" || Array.isArray(value) || HookSet.isPrototypeOf(value);
	}
	/*
		Now, a function to clone arbitrary values.
		This is only a shallow clone, designed for use by VarRef.set()
		to make a distinct copy of an object after assignment.
	*/
	function clone(value) {
		if (!isObject(value)) {
			return value;
		}
		/*
			If it has a custom TwineScript clone method, use that.
		*/
		if (typeof value.TwineScript_Clone === "function") {
			return value.TwineScript_Clone();
		}
		/*
			If it's an array, the old standby is on call.
		*/
		if (Array.isArray(value)) {
			return [...value];
		}
		/*
			For ES6 collections, we can depend on the constructors.
		*/
		if (value instanceof Map) {
			return new Map(value);
		}
		if (value instanceof Set) {
			return new Set(value);
		}
		/*
			If it's a function, Function#bind() makes a copy without altering its 'this'.
		*/
		if (typeof value === "function") {
			return Object.assign(value.bind(), value);
		}
		/*
			If it's a plain object or null object, you can rely on Object.assign().
		*/
		switch (Object.getPrototypeOf(value)) {
			case Object.prototype:
				return Object.assign({}, value);
			case null:
				return Object.assign(Object.create(null), value);
		}
		/*
			If we've gotten here, something unusual has been passed in.
		*/
		impossible("OperationUtils.clone", "The value " + (value.toSource ? value.toSource() : value) + " cannot be cloned!");
		return value;
	}

	/*
		Some TwineScript objects can, in fact, be coerced to string.
		HookRefs, for instance, coerce to the string value of their first
		matching hook.
		
		(Will I pay for this later???)
		
		This returns the resulting string, or false if it couldn't be performed.
		@return {String|Boolean}
	*/
	function coerceToString(fn, left, right) {
		if (typeof left  === "string" && isObject(right) &&
				"TwineScript_ToString" in right) {
			return fn(left, right.TwineScript_ToString());
		}
		/*
			We can't really replace this case with a second call to
			canCoerceToString, passing (fn, right, left), because fn
			may not be symmetric.
		*/
		if (typeof right === "string" && isObject(left) &&
				"TwineScript_ToString" in left) {
			return fn(left.TwineScript_ToString(), right);
		}
		return false;
	}
	
	/*
		Most TwineScript objects have an ObjectName method which supplies a name
		string to the error message facilities.
		@return {String}
	*/
	function objectName(obj) {
		return (isObject(obj) && "TwineScript_ObjectName" in obj)
			? obj.TwineScript_ObjectName
			: Array.isArray(obj) ? "an array"
			: obj instanceof Map ? "a datamap"
			: obj instanceof Set ? "a dataset"
			: typeof obj === "boolean" ? "the boolean value '" + obj + "'"
			: (typeof obj === "string" || typeof obj === "number")
				? 'the ' + typeof obj + " " + toJSLiteral(obj)
			: obj === undefined ? "an empty variable"
			: "...whatever this is";
	}
	/*
		The TypeName method is also used to supply error messages relating to type signature
		checks. Generally, a TwineScript datatype prototype should be supplied to this function,
		compared to objectName, which typically should receive instances.
		
		Alternatively, for Javascript types, the global constructors String, Number, Boolean,
		Map, Set, and Array may be given.
		
		Finally, certain "type descriptor" objects are used by Macros, and take the form
			{ pattern: {String, innerType: {Array|Object|String} }
		and these should be warmly received as well.
		
		@return {String}
	*/
	function typeName(obj) {
		/*
			First, check for the "either" type descriptor.
		*/
		if (obj.innerType) {
			if (obj.pattern === "either") {
				if(!Array.isArray(obj.innerType)) {
					impossible("typeName",'"either" pattern had non-array inner type');
				}
				
				return obj.innerType.map(typeName).join(" or ");
			}
			else if (obj.pattern === "optional") {
				return "(an optional) " + typeName(obj.innerType);
			}
			return typeName(obj.innerType);
		}
		
		return (
			/*
				Second, if it's a global constructor, simply return its name in lowercase.
			*/
			(   obj === String ||
				obj === Number ||
				obj === Boolean)  ? "a " + typeof obj()
			:   obj === parseInt  ? "a non-fractional number"
			:   obj === Map       ? "a datamap"
			:   obj === Set       ? "a dataset"
			:   obj === Array     ? "an array"
			/*
				Otherwise, defer to the TwineScript_TypeName, or TwineScript_ObjectName
			*/
			: (isObject(obj) && "TwineScript_TypeName" in obj) ? obj.TwineScript_TypeName
			: objectName(obj)
		);
	}
	
	/*
		As TwineScript uses pass-by-value rather than pass-by-reference
		for all objects, it must also use compare-by-value for objects as well.
		This function implements the "is" operation.
		@return {Boolean}
	*/
	function is(l, r) {
		/*
			For primitives, === is sufficient.
		*/
		if (typeof l !== "object" && typeof r !== "object") {
			return l === r;
		}
		/*
			For Arrays, compare every element and position of one
			with the other.
		*/
		if (Array.isArray(l) && Array.isArray(r)) {
			/*
				A quick check: if they vary in length, they already fail.
			*/
			if (l.length !== r.length) {
				return false;
			}
			return l.every((element, index) => is(r[index], element));
		}
		/*
			For Maps and Sets, simply reduce them to Arrays.
		*/
		if (l instanceof Map && r instanceof Map) {
			// Don't forget that Map.prototype.entries() returns an iterator!
			return is(
				// Since datamaps are supposed to be unordered, we must sort these arrays
				// so that different-ordered maps are regarded as equal.
				Array.from(l.entries()).sort(),
				Array.from(r.entries()).sort()
			);
		}
		if (l instanceof Set && r instanceof Set) {
			return is([...l], [...r]);
		}
		/*
			For TwineScript built-ins, use the TwineScript_is() method to determine
			uniqueness.
		*/
		if (l && typeof l.TwineScript_is === "function") {
			return l.TwineScript_is(r);
		}
		/*
			For plain objects (such as ChangerCommand params), compare structurally.
		*/
		if (l && typeof l === "object" && r && typeof r === "object"
				&& Object.getPrototypeOf(l) === Object.prototype
				&& Object.getPrototypeOf(r) === Object.prototype) {
			return is(
				Object.getOwnPropertyNames(l).map(name => [name, l[name]]),
				Object.getOwnPropertyNames(r).map(name => [name, r[name]])
			);
		}
		return Object.is(l, r);
	}
	
	/*
		As the base function for Operations.contains,
		this implements the "x contains y" and "y is in x" keywords.
		This is placed outside so that Operation.isIn can call it.
		@return {Boolean}
	*/
	function contains(container,obj) {
		/*
			For containers, compare the contents (if it can hold objects)
			using the above is() algorithm rather than by JS's typical by-reference
			comparison.
		*/
		if (container) {
			if (typeof container === "string") {
				return container.includes(obj);
			}
			if(Array.isArray(container)) {
				return container.some((e) => is(e, obj));
			}
			/*
				For Sets and Maps, check that the key exists.
			*/
			if (container instanceof Set || container instanceof Map) {
				return Array.from(container.keys()).some(e => is(e, obj));
			}
		}
		/*
			Default: produce an error.
		*/
		return TwineError.create("operation", objectName(container) + " cannot contain any values, let alone " + objectName(obj));
	}
	
	/*
		This calls the slice() method of the given sequence, but takes TwineScript (subarray:)
		and (substring:) indices (which are 1-indexed), converting them to those preferred by JS.
	*/
	function subset(sequence, a, b) {
		/*
			A zero index or a NaN index is an error.
		*/
		if (!a || !b) {
			return TwineError.create(
				"macrocall",
				"The sub" + collectionType(sequence) + " index values must not be 0 or NaN."
			);
		}
		/*
			To simplify things, convert negative indices into positive ones.
		*/
		if (a < 0) {
			a = sequence.length + a + 1;
		}
		if (b < 0) {
			b = sequence.length + b + 1;
		}
		/*
			For now, let's assume descending ranges are intended,
			and support them.
		*/
		if (a > b) {
			return subset(sequence, b, a);
		}
		/*
			As mentioned elsewhere in Operations, JavaScript's irksome UCS-2 encoding for strings
			means that, in order to treat astral plane characters as 1 character in 1 position,
			they must be converted to and from arrays whenever indexing or .slice() is performed.
		*/
		const isString = typeof sequence === "string";
		if (isString) {
			sequence = Array.from(sequence);
		}
		/*
			As the positive indices are 1-indexed, we shall subtract 1 from a if a is positive.
			But, as they're inclusive, b shall be left as is.
		*/
		const ret = sequence.slice(a > 0 ? a - 1 : a, b).map(clone);
		/*
			Now that that's done, convert any string sequence back into one.
		*/
		if (isString) {
			return ret.join('');
		}
		return ret;
	}

	/*
		This provides a safe means of serialising Arrays, Maps, Sets, and primitives into user-presented HTML.
		This is usually called by such a value appearing in passage prose, or within a (print:) command.
	*/
	function printBuiltinValue(value) {
		/*
			If an error was passed in, return the error now.
		*/
		if (TwineError.containsError(value)) {
			return value;
		}
		if (value && typeof value.TwineScript_Print === "function") {
			return value.TwineScript_Print();
		}
		else if (value instanceof Map) {
			/*
				In accordance with arrays being "pretty-printed" to something
				vaguely readable, let's pretty-print datamaps into HTML tables.
				
				First, convert the map into an array of key-value pairs.
			*/
			value = Array.from(value.entries());
			if (TwineError.containsError(value)) {
				return value;
			}
			return value.reduce((html, [pair1, pair2]) =>
				/*
					Print each value, calling printBuiltinValue() on
					each of them,. Notice that the above conversion means
					that none of these pairs contain error.
				*/
				html + "<tr><td>`" +
					printBuiltinValue(pair1) +
					"`</td><td>`" +
					printBuiltinValue(pair2) +
					"`</td></tr>",
				"<table class=datamap>") + "</table>";
		}
		else if (value instanceof Set) {
			/*
				Sets are close enough to arrays that we might as well
				just pretty-print them identically.
			*/
			return Array.from(value.values()).map(printBuiltinValue) + "";
		}
		else if (Array.isArray(value)) {
			return value.map(printBuiltinValue) + "";
		}
		/*
			If it's an object we don't know how to print, emit an error
			instead of [object Object].
		*/
		else if (isObject(value)) {
			return TwineError.create("unimplemented", "I don't know how to print this value yet.");
		}
		/*
			At this point, primitives have safely fallen through.
		*/
		else {
			return value + "";
		}
	}
	
	const OperationUtils = Object.freeze({
		isObject,
		singleTypeCheck,
		isValidDatamapName,
		collectionType,
		isSequential,
		clone,
		coerceToString,
		objectName,
		typeName,
		is,
		contains,
		subset,
		printBuiltinValue,
		/*
			Used to determine if a property name is an array index.
			If negative indexing sugar is ever added, this could
			be replaced with a function.
		*/
		numericIndex: /^(?:[1-9]\d*|0)$/,
		/*
			An Array#filter() function which filters out duplicates using the is() comparator
			instead of Javascript referencing. This manually filters out similar array/map objects which
			Set()'s constructor won't filter out by itself.
		*/
		unique: (val1,ind,arr) => !arr.slice(ind + 1).some(val2 => is(val1, val2)),
	});
	return OperationUtils;
});
