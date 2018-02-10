"use strict";
define([], () => {
	/*
		VarScope.
		This is a root prototype object which houses temporary variables, inside a Section's stack. At the moment, it
		only possesses a single TwineScript meta-property.
	*/
	
	return {
		/*
			Note that it's not possible for userland TwineScript to directly access or
			modify this base object.
		*/
		TwineScript_ObjectName: "the temporary variables",
		/*
			This is used to distinguish to (set:) that this is a variable store,
			and assigning to its properties does affect game state.
		*/
		TwineScript_VariableStore: true,
	};
});
