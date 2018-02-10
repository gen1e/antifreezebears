'use strict';

const fs = require('fs');
const {unescape, escape} = require('lodash');

/*
	This generates end-user Harlowe macro and syntax documentation (in Markup).
*/
const metadata = require('./metadata');
let outputFile = "";
let navElement = "<nav><img src='icon.svg' width=96 height=96></img>";
/*
	Obtain the version
*/
const {version} = JSON.parse(fs.readFileSync('package.json'));
navElement += `<div class=nav_version><p>Harlowe ${version} manual</p>
<p><a href="/1.html">1.2.4</a> | <b>${version}</b></p>
</div>`;

let currentCategory;

Object.keys(metadata).map(e => metadata[e]).forEach(e=>{
	outputFile += `\n<h1 id=section_${e.defCode}>${e.defName}</h1>\n`;
	navElement += `<h5>${e.defName}</h5><ul class=list_${e.defCode}>`;

	const [out, nav] = e.output();
	outputFile += out;
	navElement += nav + "</ul>"
});

/*
	Output the MD docs as an intermediate product.
*/
fs.writeFileSync('dist/harloweDocs.md',outputFile);
/*
	Convert to HTML with Marked
*/
outputFile = require('marked')(outputFile);

/*
	Add animations from animations.scss.
*/
let animations = require('child_process').execSync("sass --style compressed --scss ./scss/animations.scss");
/*
	Compile the <pre> using the CodeMirror mode.
	First, obtain the CodeMirror highlighting CSS.
*/
let highlighting;
global.document = {
	querySelector(){},
	createElement: () => ({
		setAttribute(){},
		set innerHTML(e) {
			highlighting = e;
		},
	}),
	head: { appendChild(){} },
};
global.window = global;
require('../js/markup/codemirror/mode.js');
if (highlighting === undefined) {
	throw new Error("The kludge to import the CodeMirror mode's CSS didn't work.");
}
/*
	Now, find the <code> elements and modify their contents.
*/
const {modes} = require('../js/markup/lexer.js');
const {lex} = require('../js/markup/markup.js');
// These are used to determine what lexing mode to use for code blocks.
const sectionMarkupStart = outputFile.search('<h1 id="section_markup">');
const sectionMarkupEnd   = outputFile.slice(sectionMarkupStart + 5).search('<h1 ') + sectionMarkupStart + 5;

outputFile = outputFile.replace(/<code>([^<]+)<\/code>(~?)/g, ({length}, code, noStyle, offset) => {
	if (noStyle) {
		return `<code>${code}</code>`;
	}
	function makeCSSClasses(pos) {
		return root.pathAt(pos + root.start).map(token => 'cm-harlowe-2-' + token.type).join(' ');
	}
	code = unescape(code);
	let ret = '', root, lastPos = 0;
	// If the offset is inside the "Passage markup" section, OR is followed by a </pre>, use the normal mode.
	// Otherwise, use the macro mode.
	if (offset > sectionMarkupEnd && !outputFile.slice(offset + length).startsWith("</pre>")) {
		modes.start = modes.macro;
	} else {
		modes.start = modes.markup;
	}
	root = lex(code);
	root.everyLeaf(token => {
		while (token.start - root.start > lastPos) {
			ret += `<span class="${makeCSSClasses(lastPos)}">${escape(code[lastPos])}</span>`;
			lastPos += 1;
		}
		ret += `<span class="${makeCSSClasses(token.start)}">${escape(token.text)}</span>`;
		lastPos = token.end - root.start;
	});
	while (code.length > lastPos) {
		ret += `<span class="${makeCSSClasses(lastPos)}">${escape(code[lastPos])}</span>`;
		lastPos += 1;
	}
	return `<code>${ret}</code>`;
});
/*
	Append CSS and HTML header tags
*/
outputFile = `<!doctype html><title>Harlowe ${version} manual</title><meta charset=utf8><style>
/* Normalisation CSS */
html { font-size:110%; font-weight:lighter; }
body { font-family:Georgia, "Times New Roman", Times, serif; line-height:1.5; margin:0 25vw 4em 25vw;}
p { margin-top:1em; }
strong,b { font-weight: bold; }
a { color:#3B8BBA; }
a:hover, a:focus, a:active { color:#22516d; }
table { background:#fafafa; border-bottom:1px solid #ccc; border-collapse:collapse; border-right:1px solid #ccc; border-spacing:0; font-size:1em; width:100%; }
table tr { border-top:1px solid #ccc; }
table tr:nth-child(2n),thead { background:#eee; }
table th,table td { border-left:1px solid #ccc; padding:4px; text-align:left; }
tfoot { background:#e3e3e3; }
h1,h2,h3,h4,h5,h6 { border-bottom:solid 1px #ddd; color:#000; font-weight:400; line-height:1em; margin:0; padding-top:1rem; }
h4,h5,h6 { font-weight:700; }
h1 { font-size:2.5em; }
h2 { font-size:2em; }
h3 { font-size:1.5em; }
h4 { font-size:1.2em; }
h5 { font-size:1em; }
h6 { font-size:.9em; }
h1,h2 { padding-top:2rem; padding-bottom:5px; }

/* Nav bar */
nav { position:fixed; width:15vw; max-width: 20vw; top:2.5vh;left:5vh; bottom:5vh; overflow-y:scroll; border:1px solid #888; padding:1rem; margin-bottom:2em; font-size:90% }
nav ul { list-style-type: none; margin: 0em; padding: 0em; }
nav img { display:block; margin: 0 auto;}
.nav_version { text-align:center }
@media screen and (max-width: 800px) { nav { position:relative; } }

/* Main styles */
.def_title { background:linear-gradient(180deg,white,white 70%,silver); border-bottom:1px solid silver; padding-bottom:5px; }
.macro_signature { opacity:0.75 }
.nav_macro_return_type { opacity:0.33; float:right; }
@media screen and (max-width: 1400px) { .nav_macro_return_type { display:none; } }
@media screen and (max-width: 1600px) { .nav_macro_return_type { font-size:80% } }
.nav_macro_aka { opacity: 0.75; font-size:90%; color:#3B8BBA; margin-left: 0.5em; font-style: italic; }
.nav_macro_aka::before { content: "also known as "; opacity: 0.75; }

/* Code blocks */
code { background:#FFF; border:1px solid #888; color:#000; display:block; padding:12px; overflow-x: scroll; }

/* Inline code */
pre { display:inline; }
:not(pre) > code { background:hsla(0,0%,100%,0.75); border:1px dotted #888; display:inline; padding:1px; white-space:nowrap; }
table :not(pre) > code { white-space: pre-wrap; }
/* Heading links */
.heading_link::before { content: "§"; display:inline-block; margin-left:-25px; padding-right:10px; color:black; font-weight:100; visibility:hidden; text-decoration:none; }
:hover > .heading_link::before { visibility:visible; }

/* Kludge for the (text-style:) macro */
t-s::before { content: 'Example text'; }

/* Highlighting */
${highlighting}

/* Animations */
${animations}
</style>${navElement}</ul></nav>${outputFile}
<p><small>This manual was generated at: ${new Date}</small></p>`;
/*
	Done
*/
fs.writeFileSync("dist/harloweDocs.html", outputFile);

