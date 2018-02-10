"use strict";
define(['utils', 'passages', 'datatypes/changercommand', 'internaltypes/twineerror', 'utils/operationutils'],
({impossible}, Passages, ChangerCommand, TwineError, {objectName}) => {
	/*
		State
		Singleton controlling the running game state.
	*/
	
	/*
		The root prototype for every Moment's variables collection.
	*/
	const SystemVariables = {
		/*
			Note that it's not possible for userland TwineScript to directly access or
			modify this base object.
		*/
		TwineScript_ObjectName: "this story's variables",

		/*
			This is used to distinguish to (set:) that this is a variable store,
			and assigning to its properties does affect game state.
		*/
		TwineScript_VariableStore: true,
	};

	/*
		Prototype object for states remembered by the game.
	*/
	const Moment = {
		/*
			Current passage name
		*/
		passage: "",
		
		/*
			As the prototype object, its variable property is the prototype variables object.
		*/
		variables: SystemVariables,

		/*
			Make a new Moment that comes temporally after this.
			This is usually a fresh Moment, but the State deserialiser
			must re-create prior sessions' Moments.
			Thus, pre-set variables may be supplied to this method.
			
			@param {String} The name of the passage that the player is at in this moment.
			@param {Object} Variables to include in this moment.
		*/
		create(p, v) {
			const ret = Object.create(Moment);
			ret.passage = p || "";
			// Variables are stored as deltas of the previous state's variables.
			// This is implemented using JS's prototype chain :o
			// For the first moment, this becomes a call to Object.create(null),
			// keeping the prototype chain clean.
			ret.variables = Object.assign(Object.create(this.variables), v);
			return ret;
		}
	};
	
	/*
		Stack of previous states.
		This includes both the past (moments the player has created) as well as the future (moments
		the player has undone).
		Count begins at 0 (the game start).
	*/
	let timeline = [ ];
	
	/*
		Index to the game state just when the current passage was entered.
		This represents where the player is within the timeline.
		Everything beyond this index is the future. Everything before and including is the past.
		It usually equals timeline.length-1, except when the player undos.
	*/
	let recent = -1;
	
	/*
		The present - the resultant game state after the current passage executed.
		This is a 'potential moment' - a moment that could become the newest to enter the timeline.
		This is pushed onto the timeline (becoming "recent") when going forward,
		and discarded when going backward.
		Its passage name should equal that of recent.
	*/
	let present = Moment.create();
	
	/*
		The serialisability status of the story state.
		This is irreversibly set to a triplet of [var, value, turn] values,
		which are used for error messages, whenever a non-serialisable object
		is stored in a variable.
	*/
	let serialiseProblem;

	/*
		Debug Mode event handlers are stored here by on(). "forward" and "back" handlers are called
		when the present changes, and thus when play(), fastForward() and rewind() have been called.
		"load" handlers are called exclusively in deserialise().
	*/
	const eventHandlers = {
		forward: [],
		back: [],
		load: [],
	};

	/*
		A private method to create a new present after altering the state.
		@param {String} The name of the passage the player is now currently at.
	*/
	function newPresent(newPassageName) {
		present = (timeline[recent] || Moment).create(newPassageName);
	}
	
	/*
		The current game's state.
	*/
	const State = Object.assign({
		/*
			Getters/setters
		*/

		/*
			Get the current passage name.
			Used as a common argument to Engine.showPassage()
		*/
		get passage() {
			return present.passage;
		},
		
		/*
			Get the current variables.
		*/
		get variables() {
			return present.variables;
		},

		/*
			Is there an undo cache?
		*/
		get pastLength() {
			return recent;
		},

		/*
			Is there a redo cache?
		*/
		get futureLength() {
			return (timeline.length - 1) - recent;
		},

		/*
			Did we ever visit this passage, given its name?
			Return the number of times visited.
		*/
		passageNameVisited(name) {
			let ret = 0;

			if (!Passages.get(name)) {
				return 0;
			}
			for (let i = 0; i <= recent; i++) {
				ret += +(name === timeline[i].passage);
			}

			return ret;
		},

		/*
			Return how long ago this named passage has been visited,
			or infinity if it was never visited.
			This isn't exposed directly to authors.
		*/
		passageNameLastVisited(name) {
			if (!Passages.get(name)) {
				return Infinity;
			}

			if (name === present.passage) {
				return 0;
			}

			for (let i = recent; i > 0; i--) {
				if (timeline[i].passage === name) {
					return (recent-i) + 1;
				}
			}

			return Infinity;
		},

		/*
			Return an array of names of all previously visited passages, in the order
			they were visited. This may include doubles. This IS exposed directly to authors.
		*/
		pastPassageNames() {
			const ret = [];

			for (let i = recent-1; i >= 0; i--) {
				ret.unshift(timeline[i].passage);
			}
			return ret;
		},

		/*
			Movers/shakers
		*/

		/*
			Push the present state to the timeline, and create a new state.
			@param {String} The name of the passage the player is now currently at.
		*/
		play(newPassageName) {
			if (!present) {
				impossible("State.play","present is undefined!");
			}
			// Assign the passage name
			present.passage = newPassageName;
			// Clear the future, and add the present to the timeline
			timeline = timeline.slice(0,recent+1).concat(present);
			recent += 1;
			
			// Create a new present
			newPresent(newPassageName);
			// Call the 'forward' event handler with this passage name.
			eventHandlers.forward.forEach(fn => fn(newPassageName));
		},

		/*
			Rewind the state. This will fail if the player is at the first moment.
			
			@param {String|Number} Either a string (passage id) or a number of steps to rewind.
			@return {Boolean} Whether the rewind was actually performed.
		*/
		rewind(arg) {
			let steps = 1,
				moved = false;

			if (arg) {
				if (typeof arg === "string") {
					steps = this.passageNameLastVisited(arg);
					if (steps === Infinity) {
						return;
					}
				} else if (typeof arg === "number") {
					steps = arg;
				}
			}
			for (; steps > 0 && recent > 0; steps--) {
				moved = true;
				recent -= 1;
			}
			if (moved) {
				newPresent(timeline[recent].passage);
				// Call the 'back' event handler.
				eventHandlers.back.forEach(fn => fn());
			}
			return moved;
		},

		/*
			Undo the rewinding of a state. Fails if no moments are in the future to be redone.
			Currently only accepts numbers.
			
			@param {Number} The number of turns to move forward.
			@return {Boolean} Whether the fast-forward was actually performed.
		*/
		fastForward(arg) {
			let steps = 1,
				moved = false;
			
			if (typeof arg === "number") {
				steps = arg;
			}
			for (; steps > 0 && timeline.length > 0; steps--) {
				moved = true;
				recent += 1;
			}
			if (moved) {
				newPresent(timeline[recent].passage);
				eventHandlers.forward.forEach(fn => fn(timeline[recent].passage, "fastForward"));
			}
			return moved;
		},
		
		/*
			This is used only by Debug Mode - it lets event handlers be registered and called when the State changes.
			"forward" functions have the signature (passageName, isFastForward). "back" functions have no signature.
			"load" functions have the signature (timeline), where timeline is the entire timeline Moments array.
		*/
		on(name, fn) {
			if (!(name in eventHandlers)) {
				impossible('State.on', 'invalid event name');
				return;
			}
			if (typeof fn === "function" && !eventHandlers[name].includes(fn)) {
				eventHandlers[name].push(fn);
			}
			return State;
		},

		/*
			This method is only for Harlowe debugging purposes. It is called nowhere except for the test specs.
		*/
		reset() {
			if (!window.jasmine) {
				return;
			}
			timeline = [];
			recent = -1;
			present = Moment.create();
			serialiseProblem = undefined;
			eventHandlers.load.forEach(fn => fn(timeline));
		},
	},
	/*
		In addition to the above simple methods, two serialisation methods are also present.
		These have a number of helper functions which are wrapped in this block.
	*/
	(()=>{
		
		/*
			This helper checks if serialisation is possible for this data value.
			Currently, most all native JS types are supported, but TwineScript
			specific command objects aren't.
		*/
		function isSerialisable(variable) {
			return (typeof variable === "number"
				|| typeof variable === "boolean"
				|| typeof variable === "string"
				// Nulls shouldn't really ever appear in TwineScript, but technically they're allowed.
				|| variable === null
				|| Array.isArray(variable) && variable.every(isSerialisable)
				|| variable instanceof Set && Array.from(variable).every(isSerialisable)
				|| variable instanceof Map && Array.from(variable.values()).every(isSerialisable)
				|| ChangerCommand.isPrototypeOf(variable));
		}
		
		/*
			This is provided to JSON.stringify(), allowing Maps, Sets
			and Changers to be stringified, albeit in a bespoke fashion.
		*/
		function replacer(name, variable) {
			if (variable instanceof Set) {
				return {
					'(dataset:)': Array.from(variable),
				};
			}
			if (variable instanceof Map) {
				return {
					/*
						Array.from(map) converts the variable to
						an array of key-value pairs.
					*/
					'(datamap:)': Array.from(variable),
				};
			}
			if (ChangerCommand.isPrototypeOf(variable)) {
				return {
					changer: {
						name: variable.macroName,
						params: variable.params,
						next: variable.next,
					}
				};
			}
			return variable;
		}
		
		/*
			This is provided to JSON.parse(), allowing Maps and Sets to be
			revived from the encoding method used above.
		*/
		function reviver(name, variable) {
			if (variable && typeof variable === "object") {
				if (Array.isArray(variable['(dataset:)'])) {
					return new Set(variable['(dataset:)']);
				}
				if (Array.isArray(variable['(datamap:)'])) {
					return new Map(variable['(datamap:)']);
				}
				if (variable.changer && typeof variable.changer === "object") {
					const {name, params, next} = variable.changer;
					return ChangerCommand.create(name, params, next);
				}
			}
			return variable;
		}
		
		/*
			Serialise the game history, from the present backward (ignoring the redo cache)
			into a JSON string.
			
			@return {String|Boolean} The serialised state, or false if serialisation failed.
		*/
		function serialise() {
			const ret = timeline.slice(0, recent + 1);
			/*
				We must determine if the state is serialisable.
				Once it is deemed unserialisable, it remains that way for the rest
				of the story. (Note: currently, rewinding back past a point
				where an unserialisable object was (set:) does NOT revert the
				serialisability status.)

				Create an array (of [var, value] pairs) that shows each variable that
				couldn't be serialised at each particular turn.
			*/
			const serialisability = ret.map(
				(moment) => Object.keys(moment.variables)
					.filter((e) => moment.variables[e] && !isSerialisable(moment.variables[e]))
					.map(e => [e, moment.variables[e]])
			);
			/*
				Identify the variable and value that can't be serialised, and the turn it occurred,
				and save them into serialiseProblem. But, if such a problem was already found previously,
				use that instead.
			*/
			if (!serialiseProblem) {
				serialiseProblem = (serialisability.reduce(
					(problem, [name, value], turn) => (problem || (name && [name, value, turn + 1])),
					undefined
				));
			}
			/*
				If it can't be serialised, return a TwineError with all the details.
			*/
			if (serialiseProblem) {
				const [problemVar, problemValue, problemTurn] = serialiseProblem;

				return TwineError.create(
					"saving",
					"The variable $" + problemVar + " holds " + objectName(problemValue)
					+ " (which is, or contains, a complex data value) on turn " + problemTurn
					+ "; the game can no longer be saved."
				);
			}
			try {
				return JSON.stringify(ret, replacer);
			}
			catch(e) {
				return false;
			}
		}
		
		/*
			Deserialise the string and replace the current history.
			@method deserialise
		*/
		function deserialise(str) {
			let newTimeline,
				lastVariables = SystemVariables;
			
			try {
				newTimeline = JSON.parse(str, reviver);
			}
			catch(e) {
				return false;
			}
			/*
				Verify that the timeline is an array.
			*/
			if (!Array.isArray(newTimeline)) {
				return false;
			}
			
			if ((newTimeline = newTimeline.map((moment) => {
				/*
					Here, we do some brief verification that the moments in the array are
					objects with "passage" and "variables" keys.
				*/
				if (typeof moment !== "object"
						|| !moment.hasOwnProperty("passage")
						|| !moment.hasOwnProperty("variables")) {
					return false;
				}
				/*
					Recreate the variables prototype chain. This doesn't use setPrototypeOf() due to
					compatibility concerns.
				*/
				moment.variables = Object.assign(Object.create(lastVariables), moment.variables);
				
				lastVariables = moment.variables;
				/*
					Re-establish the moment objects' prototype link to Moment.
				*/
				return Object.assign(Object.create(Moment), moment);
			})).includes(false)) {
				return false;
			}
			timeline = newTimeline;
			eventHandlers.load.forEach(fn => fn(timeline));
			recent = timeline.length - 1;
			newPresent(timeline[recent].passage);
		}
		return {
			serialise: serialise,
			deserialise: deserialise,
		};
	})());
	
	Object.seal(Moment);
	return Object.freeze(State);
});
