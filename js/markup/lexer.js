/*
	The Lexer accepts plain strings, and, given a set of rules, transforms
	them to a tree of tokens.
	
	Consumers must augment this object's 'rules' property.
*/
/*jshint strict:true*/
(function(){
	"use strict";
	let Lexer;
	const rules = {};
	
	/*
		The "prototype" object for lexer tokens.
		It just has some basic methods that iterate over tokens' children,
		but which nonetheless lexer customers may find valuable.
	*/
	function Token(/*variadic*/) {
		/*
			Due to speed paranoia, this uses longhand assignment.
		*/
		for (let i = 0; i < arguments.length; i++) {
			for (let j in arguments[i]) {
				this[j] = arguments[i][j];
			}
		}
	}
	/*
		A "private" utility function called by addChild and foldTokens,
		which sets up the token's private childAt object, mapping
		its children to character positions. This is used to make pathAt()
		and tokenAt() lookups fast, which is important given that the syntax
		highlighter relies on them heavily.
	*/
	function cacheChildPos(token, childToken) {
		token.childAt = token.childAt || {};
		for(let i = childToken.start; i < childToken.end; i += 1) {
			token.childAt[i] = childToken;
		}
	}
	
	Token.prototype = {
		constructor: Token,
		
		/*
			Create a token and put it in the children array.
		*/
		addChild(tokenData) {
			const index = this.lastChildEnd();
			
			/*
				Now, create the token, then assign to it the idiosyncratic data
				properties and the tokenMethods.
			*/
			const childToken = new Token(
				{
					start:     index,
					end:       tokenData.text && index + tokenData.text.length,
					children:  [],
				},
				tokenData);
			
			/*
				If the token has non-empty innerText, lex the innerText
				and append to its children array.
			*/
			if (childToken.innerText) {
				lex(childToken);
			}
			/*
				Having finished, push the child token to the children array.
			*/
			this.children.push(childToken);
			cacheChildPos(this, childToken);
			/*
				Let other things probe and manipulate the childToken; return it.
			*/
			return childToken;
		},
		
		/*
			A shortcut to the last element in the children array.
		*/
		lastChild() {
			return this.children ? this.children[this.children.length-1] || null : null;
		},
		
		/*
			lastChildEnd provides the end index of the last child token,
			allowing the start index of a new token to be calculated.
			
			Hence, when there are no children, it defaults to the start
			index of this token.
		*/
		lastChildEnd() {
			const lastToken = this.lastChild();
			return lastToken ? lastToken.end : this.start +
				/*
					Some macros' children do not exactly overlap their parents in terms of
					their ranges - an example is (if:), which is a macro token whose start is 0,
					but contains a macroName token whose start is 1.
					In that case, the index of the first child should be 1.
					
					We determine the difference by comparing the text and innerText positions -
					(if:)'s text is "(if:)" but innerText is "if:"
				*/
				Math.max(0, this.text.indexOf(this.innerText));
		},
		
		/*
			Given an index in this token's text, find the deepest leaf,
			if any, that corresponds to it.
		*/
		tokenAt(index) {
			// First, a basic range check.
			if (index < this.start || index >= this.end) {
				return null;
			}
			/*
				If the childAt cache exists, use that to obtain the answer.
			*/
			if (this.childAt) {
				return (this.childAt[index] && this.childAt[index].tokenAt(index)) || this;
			}
			/*
				Ask each child, if any, what their deepest token
				for this index is.
			*/
			if (this.children.length) {
				for(let i = 0; i < this.children.length; i+=1) {
					const childToken = this.children[i].tokenAt(index);
					if (childToken) {
						return childToken;
					}
				}
				/*
					As described in lastChildEnd(), some tokens can have a gap between their
					start and their first child's start. The index may have fallen in that gap
					if no children were matched in the previous call.
					In which case, fall through and return this.
				*/
			}
			return this;
		},
		
		/*
			Given an index in this token's text, return an array of tokens,
			deepest-first, leading to and including that token.
		*/
		pathAt(index) {
			// First, a basic range check.
			if (index < this.start || index >= this.end) {
				return [];
			}
			/*
				If the childAt cache exists, use that to obtain the answer.
			*/
			if (this.childAt) {
				return ((this.childAt[index] && this.childAt[index].pathAt(index)) || []).concat(this);
			}
			/*
				Ask each child, if any, what their path for this index is.
			*/
			let path = [];
			if (this.children.length) {
				for(let i = 0; i < this.children.length; i+=1) {
					const childPath = this.children[i].pathAt(index);
					if (childPath.length) {
						path.concat(childPath);
						break;
					}
				}
			}
			return path.concat(this);
		},
		
		/*
			Given an index in this token's text, find the closest leaf
			(that is, only from among the token's immediate children)
			that corresponds to it.
		*/
		nearestTokenAt(index) {
			// First, a basic range check.
			if (index < this.start || index >= this.end) {
				return null;
			}
			/*
				Find whichever child has the index within its start-end range.
			*/
			if (this.children) {
				return this.children.reduce(function(prevValue, child) {
					return prevValue || ((index >= child.start && index < child.end) ? child : null);
				}, null);
			}
			return this;
		},
		
		/*
			Runs a function on every leaf token in the tree,
			and returns true if all returned truthy values.
		*/
		everyLeaf: function everyLeaf(fn) {
			if (!this.children || this.children.length === 0) {
				return !!fn(this);
			}
			return this.children.reduce((a,e) => e.everyLeaf(fn) && a, true);
		},
		
		/*
			Check if all leaf nodes contain just whitespace.
		*/
		isWhitespace() {
			return this.everyLeaf((e) => {
				/*
					Check if it's the 'whitespace' type... or if it's a
					mislabeled text leaf.
				*/
				return e.type === "whitespace" || !e.text.trim();
			});
		},
		
		/*
			Check if this token is a Front token or not. A semantic shorthand for a simple test.
			Currently unused inside Lexer itself.
		*/
		isFrontToken() {
			return this.isFront;
		},
		
		/*
			In the same vein, this checks if this token is a Back token or not.
			Currently unused inside Lexer itself.
		*/
		isBackToken() {
			return 'matches' in this;
		},
		
		/*
			Convert this token in-place into a text token, in the simplest manner possible.
			
			TODO: Really, this should combine this with all adjacent text tokens.
		*/
		demote() {
			this.type = "text";
		},
		
		/*
			Convert this token in-place into an early error token, which renders as a <tw-error>.
		*/
		error(message) {
			this.type = "error";
			this.message = message;
		},
		
		/*
			This is used primarily for browser console debugging purposes - output from
			LEX() may be turned to string to provide an overview of its contents.
		*/
		toString() {
			let ret = this.type + "(" + this.start + "→" + this.end + ")";
			if (this.children && this.children.length > 0) {
				ret += "[" + this.children + "]";
			}
			return ret;
		}
	};
	
	/*
		A helper function for lex(), which determines whether a given rule should be tested
		against the given text, based on a number of factors.
	*/
	function shouldTest(rule, text, lastToken, unmatchedLength) {
		return (
			/*
				Check whether this rule is restricted to only being matched
				directly after another rule has. An example is the "block"
				rules, which may only match after a "br" or "paragraph"
				rule.
			*/
			!rule.canFollow ||
				rule.canFollow.indexOf(
					/*
						Interesting note: this allows null lastTokens
						to be passed as-is, and object lastTokens to have
						their type checked - the short-circuit's falsy
						value's type matters here.
					*/
					lastToken && lastToken.type
				) >-1) &&
			/*
				Conversely, check whether this rule cannot follow after
				the previous rule.
			*/
			(!rule.cannotFollow || (
				/*
					For most cannotFollow items, this will suffice:
				*/
				rule.cannotFollow.indexOf(
					lastToken && lastToken.type
				) === -1 &&
				/*
					However, if cannotFollow contains "text", the check is more
					tricky: the last text token hasn't been forged yet. So,
					this line must be used:
				*/
				!(rule.cannotFollow.indexOf("text") > -1 && unmatchedLength)
				)) &&
			/*
				If a peek is available, check that before running
				the full match regexp.
			*/
			(!rule.peek || rule.peek.toLowerCase() === text.slice(0, rule.peek.length).toLowerCase());
	}
	
	/*
		The main lexing routine. Given a token with an innerText property and
		addChild methods, this function will lex its text into new tokens
		and add them as children.
	*/
	function lex(parentToken) {
		const
			src = parentToken.innerText;
		
		let
			/*
				The frontTokenStack's items are "front" tokens, those
				that pair up with a "back" token to make a token representing
				an arbitrarily nestable rule.
			*/
			frontTokenStack = [],
			/*
				index ticks upward as we advance through the src.
				firstUnmatchedIndex is bumped up whenever a match is made,
				and is used to create "text" tokens between true tokens.
			*/
			index = 0,
			firstUnmatchedIndex = index,
			/*
				The endIndex is the terminating position in which to stop lexing.
			*/
			endIndex = src.length,
			/*
				This caches the most recently created token between iterations.
				This must be 'null' and not 'undefined' because some canFollow
				arrays may contain null, to mean the start of input.
			*/
			lastToken = null;
		
		/*
			Run through the src, character by character, matching all the
			rules on every slice, creating tokens as we go, until exhausted.
		*/
		while(index < endIndex) {
			const slice = src.slice(index);
			
			/*
				This is used to store what "mode" the lexer is in, which is
				either parentToken.innerMode, or the innerMode of the recentmost
				unmatched frontToken.
			*/
			let mode = (frontTokenStack.length ? frontTokenStack[0] : parentToken).innerMode;
			/*
				Run through all the rules in the current mode in turn.
				Note that modeStack[0] means "the current mode in the modeStack".
				Speed paranoia precludes the deployment of [].forEach() here.
			*/
			let i = 0, l = mode.length;
			for (; i < l; i+=1) {
				const rule = rules[mode[i]];
				
				/*
					Before running the pattern, check to see if this rule is valid right now.
					If so, then do it.
				*/
				if (!(shouldTest(rule, slice, lastToken, firstUnmatchedIndex < index) &&
						/*
							.test() is several times faster than .exec(), so only run the latter
							once the former passes. This means there's a perf hit when a match IS
							found (as .exec() must be run separately to .test()) but it should be balanced
							by the number of rules which will not match.
						*/
						rule.pattern.test(slice))) {
					continue;
				}
				const match = rule.pattern.exec(slice);
				/*
					Having run the pattern, we now create tokenData from the match. We use this
					to create the token, but we shouldn't do so if certain invalidation criteria
					are met...
				*/
				const tokenData = rule.fn(match);
				/*
					...such as this: if it would be a Back token, it must match with a Front token.
				*/
				let isMatchingBack = false;
				let ft = 0;
				if (tokenData.matches) {
					/*
						Speed paranoia necessitates a for-loop here, which sets
						ft to either the index of the rightmost frontToken matching
						tokenData's matches, or -1.
					*/
					for(; ft < frontTokenStack.length; ft += 1) {
						let {type} = frontTokenStack[ft];
						if (type in tokenData.matches) {
							isMatchingBack = true;
							break;
						}
						/*
							For the purposes of the following comparison with cannotCross,
							the innumerable "verbatimN" types must be converted back to
							"verbatimOpener". This is a somewhat unfortunate hack.
						*/
						if (type.indexOf("verbatim") === 0) {
							type = "verbatimOpener";
						}
						/*
							If there is a front token which this back token "cannot cross" -
							that is, cannot pair with a front token behind it - then
							abandon this rule. An example is (print: ")") - the
							parenthesis cannot cross the stringOpener to match the
							macroFront.
						*/
						if (tokenData.cannotCross && tokenData.cannotCross.indexOf(type) >-1) {
							// This unconventional way to break the loop is used to simplify the
							// "was the loop fruitless" check below.
							ft = frontTokenStack.length-1;
						}
					}
					/*
						If it doesn't match, then abandon this rule and try the next one.
					*/
					if (ft >= frontTokenStack.length && !tokenData.isFront) {
						continue;
					}
				}
				
				/*
					Now that it's fully confirmed, let's build this token.
					First, create a token out of the interstitial unmatched
					text between this and the last "proper" token.
				*/
				if (firstUnmatchedIndex < index) {
					parentToken.addChild({
						type: "text",
						text: src.slice(firstUnmatchedIndex, index),
						innerMode: mode
					});
				}
				// Create a token using the matched rule's fn.
				lastToken = parentToken.addChild(tokenData);
				
				// Increment the index in the src
				index += lastToken.text.length;
				firstUnmatchedIndex = index;
				
				/*
					The preceding test confirmed whether this is a matching Back token or not.
					If so, we fold them together.
				*/
				if (isMatchingBack) {
					/*
						Note: this function splices the children array in-place!!
						Fortunately, nothing needs to be adjusted to account for this.
					*/
					foldTokens(parentToken, lastToken, frontTokenStack[ft]);
					frontTokenStack = frontTokenStack.slice(ft + 1);
				}
				
				/*
					Front tokens are saved, in case a Back token arrives
					later that can match it. This MUST come after the isMatchingBack check
					so that the tokens which are both Front and Back will work properly.
				*/
				if (lastToken.isFrontToken()) {
					frontTokenStack.unshift(lastToken);
				}
				/*
					Break from the for-loop.
				*/
				break;
			}
			
			/*
				If no match was available, then advance one character and loop again.
			*/
			if (i === l) {
				index += 1;
				if (lastToken === null) {
					lastToken = { type: "text" };
				}
			}
		}
		
		/*
			Push the last run of unmatched text before we go.
		*/
		if (firstUnmatchedIndex < index) {
			parentToken.addChild({
				type: "text",
				text: src.slice(firstUnmatchedIndex, index),
				innerMode: (frontTokenStack.length ? frontTokenStack[0] : parentToken).innerMode,
			});
		}
		/*
			We're done, except that we may still have unmatched frontTokens.
		*/
		while(frontTokenStack.length > 0) {
			frontTokenStack.shift().demote();
		}
		return parentToken;
	}
	
	/*
		To waylay speed concerns, the tokens are passed in as tuples:
		the token object itself, and its index within the parentToken's
		children array.
	*/
	function foldTokens(parentToken, backToken, frontToken) {
		/*
			Having found a matching pair of tokens, we fold them together.
			For convenience, let's promote the Back token (currently, "child")
			into the folded-up single token.
		*/
		const backTokenIndex   = parentToken.children.indexOf(backToken),
			frontTokenIndex  = parentToken.children.indexOf(frontToken);
		
		/*
			First, find the tokens enclosed by the pair, and make them the
			Back token's children.
		*/
		backToken.children = parentToken.children.splice(
			frontTokenIndex + 1,
			/*
				This quantity selects only those after the Front token
				and before the Back token.
			*/
			(backTokenIndex) - (frontTokenIndex + 1)
		);
		backToken.children.forEach(function(token) {
			cacheChildPos(backToken, token);
		});
		
		/*
			Change its type to the actual type, without the "Back" suffix.
			
			Recall that a Back token's "matches" array maps Front token types
			(the key) to full token types (the value).
		*/
		backToken.type = backToken.matches[frontToken.type];
		
		/*
			Change its text and innerText to reflect its contents.
		*/
		backToken.innerText = "";
		for (let i = 0, l = backToken.children.length; i < l; i++) {
			backToken.innerText += backToken.children[i].text;
		}
		
		/*
			Give it the correct start index.
		*/
		backToken.start = frontToken.start;
		
		/*
			The text includes the original enclosing tokens around the
			innerText.
			
			In the case of a hook, this reflects the syntax structure:
			"[" + hook contents + "]"
		*/
		backToken.text = frontToken.text + backToken.innerText + backToken.text;
		
		/*
			Copy other properties that the Front token possesses but
			the Back token does not.
			
			Assumption: that the Back token and Front token will never
			have colliding props. If so, then they are left as they are.
			
			This uses Object.keys() because Chrome deopts for-in over
			the frontToken object.
		*/
		Object.keys(frontToken).forEach((key) => {
			if(!Object.hasOwnProperty.call(backToken, key)) {
				backToken[key] = frontToken[key];
			}
		});
		/*
			Do not inherit the isFront property from the frontToken.
		*/
		if (backToken.isFront) {
			backToken.isFront = false;
		}
		
		/*
			Remove the Front token.
		*/
		parentToken.children.splice(frontTokenIndex, 1);
		/*
			Having now reconfigured the backToken as the sole token,
			the positions cache must be altered.
		*/
		cacheChildPos(parentToken, backToken);
	}
	
	/*
		This is the returned object representing the lexer inner state.
	*/
	Lexer = {
		/*
			The main function.
			This returns the entire set of tokens, rooted in a "root"
			token that has all of tokenMethods's methods.
		*/
		lex(src, initIndex) {
			return lex(new Token({
				type:                 "root",
				start:        initIndex || 0,
				end:              src.length,
				text:                    src,
				innerText:               src,
				children:                 [],
				childAt:                  {},
				innerMode: Lexer.modes.start,
			}));
		},
		/*
			The (initially empty) rules object should be augmented with
			whatever rules the language requires.
		*/
		rules: rules,
		/*
			The (initially empty) modes object should be filled with
			the language's modes, as well.
		*/
		modes: {},
	};
	
	if(typeof module === 'object') {
		module.exports = Lexer;
	}
	else if(typeof define === 'function' && define.amd) {
		define('lexer', [], function () {
			return Lexer;
		});
	}
	// Loaded as a story format in TwineJS
	else if (this && this.loaded) {
		this.modules || (this.modules = {});
		this.modules.Lexer = Lexer;
	}
	else {
		this.TwineLexer = Lexer;
	}
}).call(eval('this') || (typeof global !== 'undefined' ? global : window));
