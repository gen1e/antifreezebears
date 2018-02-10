"use strict";
define(['utils', 'markup', 'twinescript/compiler', 'internaltypes/twineerror'],
({escape, impossible, toJSLiteral, insensitiveName}, TwineMarkup, Compiler, TwineError) => {
	/*
		The Renderer takes the syntax tree from TwineMarkup and returns a HTML string.
		
		Among other responsibilities, it's the intermediary between TwineMarkup and TwineScript -
		macros and expressions become <tw-expression> and <tw-macro> elements alongside other
		markup syntax (with their compiled JS code attached as attributes), and the consumer of
		the HTML (usually Section) can run that code in the Environ.
	*/
	let Renderer;

	/*
		A simple function to wrap text in a given HTML tag, with no attributes.
	*/
	function wrapHTMLTag(text, tagName) {
		return '<' + tagName + '>' + text + '</' + tagName + '>';
	}
	/*
		This makes a basic enclosing HTML tag with no attributes, given the tag name,
		and renders the contained text.
	*/
	function renderTag(token, tagName) {
		const contents = Renderer.render(token.children);
		return contents && wrapHTMLTag(contents, tagName);
	}

	/*
		Text constant used by align().
		The string "text-align: " is selected by the debugmode CSS, so the one space
		must be present.
	*/
	const center = "text-align: center; max-width:50%; ";
	
	/*
		The public Renderer object.
	*/
	Renderer = {
		
		/*
			Renderer accepts the same story options that Harlowe does.
			Currently it only makes use of { debug }.
		*/
		options: {},
		
		/*
			A composition of TwineMarkup.lex and Renderer.render,
			but with a (currently rudimentary) memoizer.
		*/
		exec: (() => {
			/*
				These two vars cache the previously rendered source text, and
				the syntax tree returned by TwineMarkup.lex from that.
			*/
			let cachedInput,
				cachedOutput;

			return (src) => {
				// If a non-string is passed into here, there's really nothing to do.
				if (typeof src !== "string") {
					impossible("Renderer.exec", "source was not a string, but " + typeof src);
					return "";
				}
				
				if (src === cachedInput) {
					return cachedOutput;
				}
				cachedInput = src;
				cachedOutput = Renderer.render(TwineMarkup.lex(src).children);
				return cachedOutput;
			};
		})(),
		
		/*
			The recursive rendering method.
			
			@param {Array} A TwineMarkup token array.
			@return {String} The rendered HTML string.
		*/
		render: function render(tokens) {
			// The output string.
			let out = '';
			// Stack of tag tokens whose names match HTML table elements.
			let HTMLTableStack = [];

			if (!tokens) {
				return out;
			}
			const len = tokens.length;
			for(let i = 0; i < len; i += 1) {
				let token = tokens[i];
				switch(token.type) {
					case "error": {
						out += TwineError.create("syntax",token.message)
							.render(escape(token.text))[0].outerHTML;
						break;
					}
					case "numbered":
					case "bulleted": {
						// Run through the tokens, consuming all consecutive list items
						let tagName = (token.type === "numbered" ? "ol" : "ul");
						out += "<" + tagName + ">";
						let depth = 1;
						while(i < len && tokens[i] && tokens[i].type === token.type) {
							/*
								For differences in depth, raise and lower the <ul> depth
								in accordance with it.
							*/
							out += ("<"  + tagName + ">").repeat(Math.max(0, tokens[i].depth - depth));
							out += ("</" + tagName + ">").repeat(Math.max(0, depth - tokens[i].depth));
							depth = tokens[i].depth;
							
							out += renderTag(tokens[i], "li");
							i += 1;
						}
						/*
							Since the while loop broke at a point where tokens[i] wasn't a list item,
							we must reset i to just prior to that position (so that the for-loop head can increment it).
						*/
						i -= 1;
						out += ("</" + tagName + ">").repeat(depth + 1);
						break;
					}
					case "align": {
						while(token && token.type === "align") {
							const {align} = token;
							const j = (i += 1);
							
							/*
								Base case.
							*/
							if (align === "left") {
								i -= 1;
								break;
							}
							/*
								Crankforward until the end tag is found.
							*/
							while(i < len && tokens[i] && tokens[i].type !== "align") {
								i += 1;
							}
							
							const body = render(tokens.slice(j, i));
							let style = '';
							
							switch(align) {
								case "center":
									style += center + "margin-left: auto; margin-right: auto;";
									break;
								case "justify":
								case "right":
									style += "text-align: " + align + ";";
									break;
								default:
									if (+align) {
										style += center + "margin-left: " + align + "%;";
									}
							}
							
							out += '<tw-align ' + (style ? ('style="' + style + '"') : '')
								+ (Renderer.options.debug ? ' title="' + token.text + '"' : "")
								+ '>' + body + '</tw-align>\n';
							token = tokens[i];
						}
						break;
					}
					case "column": {
						/*
							We need information about all of the columns before we can produce HTML
							of them. So, let's collect the information in this array.
						*/
						const columns = [];
						while(token && token.type === "column") {
							const {column:columnType} = token;
							const j = (i += 1);
							
							/*
								Base case.
							*/
							if (columnType === "none") {
								i -= 1;
								break;
							}

							/*
								Crankforward until the end tag is found.
							*/
							while(i < len && tokens[i] && tokens[i].type !== "column") {
								i += 1;
							}
							/*
								Store the information about this column.
							*/
							columns.push({
								text: token.text,
								type: columnType,
								body: render(tokens.slice(j, i)),
								width: token.width,
								marginLeft: token.marginLeft,
								marginRight: token.marginRight,
							});
							token = tokens[i];
						}
						if (columns.length) {
							/*jshint -W083 */
							const
								totalWidth = columns.reduce((a,e)=> a + e.width, 0);

							out += "<tw-columns>"
								+ columns.map(e =>
									`<tw-column type=${e.type} ${''
									} style="width:${e.width/totalWidth*100}%; margin-left: ${e.marginLeft}em; margin-right: ${e.marginRight}em;" ${
										(Renderer.options.debug ? ` title="${e.text}"` : "")
									}>${e.body}</tw-column>\n`
								).join('')
								+ "</tw-columns>";
						}
						break;
					}
					case "heading": {
						out += renderTag(token, 'h' + token.depth);
						break;
					}
					case "br": {
						/*
							The HTMLTableStack is a small hack to suppress implicit <br>s inside <table> elements.
							Normally, browser DOM parsers will move <br>s inside <table>, <tbody>,
							<thead>, <tfoot> or <tr> elements outside, which is usually quite undesirable
							when laying out table HTML in passage text.
							However, <td> and <th> are, of course, fine.
						*/
						if (!HTMLTableStack.length || /td|th/.test(HTMLTableStack[0])) {
							out += '<br>';
						}
						break;
					}
					case "hr": {
						out += '<hr>';
						break;
					}
					case "escapedLine":
					case "comment": {
						break;
					}
					case "inlineUrl": {
						out += '<a class="link" href="' + escape(token.text) + '">' + token.text + '</a>';
						break;
					}
					case "scriptStyleTag":
					case "tag": {
						/*
							Populate the HTMLTableStack, as described above. Note that explicit <br> tags
							are not filtered out by this: these are left to the discretion of the author.
						*/
						const insensitiveText = token.text.toLowerCase();
						if (/^<\/?(?:table|thead|tbody|tr|tfoot|td|th)\b/.test(insensitiveText)) {
							HTMLTableStack[token.text.startsWith('</') ? "shift" : "unshift"](insensitiveText);
						}
						out += token.text.startsWith('</')
							? token.text
							: token.text.replace(/>$/, " data-raw>");
						break;
					}
					case "sub": // Note: there's no sub syntax yet.
					case "sup":
					case "strong":
					case "em": {
						out += renderTag(token, token.type);
						break;
					}
					case "strike": {
						out += renderTag(token, "s");
						break;
					}
					case "bold": {
						out += renderTag(token, "b");
						break;
					}
					case "italic": {
						out += renderTag(token, "i");
						break;
					}
					case "twineLink": {
						/*
							This crudely desugars the twineLink token into a
							(link-goto:) token.
						*/
						const newTwineLinkToken = TwineMarkup.lex("(link-goto:"
							+ toJSLiteral(token.innerText) + ","
							+ toJSLiteral(token.passage) + ")");
						out += render(newTwineLinkToken.children);
						break;
					}
					case "hook": {
						out += '<tw-hook '
							+ (token.hidden ? 'hidden ' : '')
							+ (token.name ? 'name="' + insensitiveName(token.name) + '"' : '')
							// Debug mode: show the hook destination as a title.
							+ ((Renderer.options.debug && token.name) ? ' title="Hook: ?' + token.name + '"' : '')
							+ ' source="' + escape(token.innerText) + '">'
							+'</tw-hook>';
						break;
					}
					case "verbatim": {
						out += wrapHTMLTag(escape(token.innerText)
							/*
								The only replacement that should be done is \n -> <br>. In
								browsers, even if the CSS is set to preserve whitespace, copying text
								still ignores line breaks that aren't explicitly set with <br>s.
							*/
							.replace(/\n/g,'<br>'), "tw-verbatim");
						break;
					}
					case "collapsed": {
						out += renderTag(token, "tw-collapsed");
						break;
					}
					/*
						Expressions
					*/
					case "variable":
					case "tempVariable":
					case "macro": {
						out += '<tw-expression type="' + token.type + '" name="' + escape(token.name || token.text) + '"'
							// Debug mode: show the macro name as a title.
							+ (Renderer.options.debug ? ' title="' + escape(token.text) + '"' : '')
							+ ' js="' + escape(Compiler(token)) + '">'
							+ '</tw-expression>';
						break;
					}
					/*
						Base case
					*/
					default: {
						out += token.children && token.children.length ? render(token.children) : token.text;
						break;
					}
				}
			}
			return out;
		}
	};
	
	return Object.freeze(Renderer);
});
