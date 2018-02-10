"use strict";
define(['jquery'], ($) => {
	/*d:
		Colour data

		Colours are special data values which can be provided to certain styling macros, such as (background:)
		or (text-colour:). You can use built=in named colour values, or create other colours using the
		(rgb:) or (hsl:) macros.

		The built-in values consist of the following:

		| Value | HTML colour equivalent
		|---
		| `red` | <span style='background:#e61919;color:black'>#e61919</span>
		| `orange` | <span style='background:#e68019;color:black'>#e68019</span>
		| `yellow` | <span style='background:#e5e619;color:black'>#e5e619</span>
		| `lime` | <span style='background:#80e619;color:black'>#80e619</span>
		| `green` | <span style='background:#19e619;color:black'>#19e619</span>
		| `aqua` or `cyan` | <span style='background:#19e5e6;color:black'>#19e5e6</span>
		| `blue` | <span style='background:#197fe6;color:white'>#197fe6</span>
		| `navy` | <span style='background:#1919e6;color:white'>#1919e6</span>
		| `purple` | <span style='background:#7f19e6;color:white'>#7f19e6</span>
		| `magenta` or `fuchsia` | <span style='background:#e619e5;color:white'>#e619e5</span>
		| `white` | <span style='background:#fff;color:black'>#fff</span>
		| `black` | <span style='background:#000;color:white'>#000</span>
		| `grey` or `gray` | <span style='background:#888;color:white'>#888</span>

		(These colours were chosen to be visually pleasing when used as both background colours and text colours, without
		the glaring intensity that certain HTML colours, like pure #f00 red, are known to exhibit.)

		In addition to these values, and the (rgb:) macro, you can also use HTML hex #xxxxxx and #xxx notation to specify
		colours, such as `#691212` or `#a4e`. (Note that these are *not* strings, but bare values - `(background: #a4e)`
		is valid, as is `(background:navy)`.) Of course, HTML hex notation is notoriously hard to read and write, so this
		isn't recommended.

		If you want to quickly obtain a colour which is the blending of two others, you can blend them
		using the `+` operator: `red + orange + white` produces a blend of red and orange, tinted
		white. `#a4e + black` is a dim purple.

		Like datamaps, colour values have a few read-only data names, which let you examine the **r**ed, **g**reen and **b**lue
		components that make up the colour, as well as its **h**ue, **s**aturation and **l**ightness.

		| Data name | Example | Meaning
		|---
		| `r` | `$colour's r` | The red component, a whole number from 0 to 255.
		| `g` | `$colour's g` | The green component, a whole number from 0 to 255.
		| `b` | `$colour's b` | The blue component, a whole number from 0 to 255.
		| `h` | `$colour's h` | The hue angle in degrees, a whole number from 0 to 359.
		| `s` | `$colour's s` | The saturation percentage, a fractional number from 0 to 1.
		| `l` | `$colour's l` | The lightness percentage, a fractional number from 0 to 1.

		These values can be used in the (hsl:) and (rgb:) macros to produce further colours. Note that some of these values
		do not transfer one-to-one between representations! For instance, the hue of a gray is essentially irrelevant, so grays
		will usually have a `h` value equal to 0, even if you provided a different hue to (hsl:). Furthermore, colours with a
		lightness of 1 are always white, so their saturation and hue are irrelevant.
	*/
	const
		/*
			These RegExps check for HTML #fff and #ffffff format colours.
		*/
		tripleDigit   = /^([\da-fA-F])([\da-fA-F])([\da-fA-F])$/,
		sextupleDigit = /^([\da-fA-F])([\da-fA-F])([\da-fA-F])([\da-fA-F])([\da-fA-F])([\da-fA-F])$/,
		/*
			This cache here is used by the function just below.
		*/
		cssNameCache = Object.create(null);

	/*
		This private function tries its best to convert a CSS3 colour name (like "rebeccapurple"
		or "papayawhip") to an RGB object. It uses jQuery to make the initial lookup, and
		caches the resulting object for future lookups.
	*/
	function css3ToRGB(colourName) {
		if (colourName in cssNameCache) {
			return cssNameCache[colourName];
		}
		let colour = $("<p>").css("background-color", colourName).css("background-color");
		if (!colour.startsWith('rgb')) {
			colour = { r:192, g:192, b:192 };
		}
		else {
			colour = colour.match(/\d+/g).reduce((colour, num, ind) => {
				colour["rgb"[ind]] = +num;
				return colour;
			}, {});
		}
		cssNameCache[colourName] = colour;
		return colour;
	}
	
	/*
		This private function converts a string comprising a CSS hex colour
		into an {r,g,b} object.
		This, of course, doesn't attempt to trim the string, or
		perform "flex hex" parsing to over-long strings.
		(http://scrappy-do.blogspot.com/2004/08/little-rant-about-microsoft-internet.html)
	*/
	function hexToRGB(str) {
		// Assume that any non-strings passed in here are already valid {r,g,b}s.
		if (typeof str !== "string") {
			return str;
		}
		// Trim off the "#".
		str = str.replace("#", '');
		/*
			If a 3-char hex colour was passed, convert it to a 6-char colour.
		*/
		str = str.replace(tripleDigit, "$1$1$2$2$3$3");
		
		return {
			r: parseInt(str.slice(0,2), 16),
			g: parseInt(str.slice(2,4), 16),
			b: parseInt(str.slice(4,6), 16),
		};
	}

	/*
		These two private functions converts RGB 0..255 values into H 0..359
		and SL 0..1 values, and back.
	*/
	function RGBToHSL({r, g, b, a}) {
		// Convert the RGB values to decimals.
		r /= 255, g /= 255, b /= 255;

		const
			max = Math.max(r, g, b),
			min = Math.min(r, g, b),
			// Lightness is the average of the highest and lowest values.
			l = (max + min) / 2,
			delta = max - min;

		if (max === min) {
			// If all three RGB values are equal, it is a gray.
			return { h:0, s:0, l };
		}
		// Calculate hue and saturation as follows.
		let h;
		switch (max) {
			case r: h = (g - b) / delta + (g < b ? 6 : 0); break;
			case g: h = (b - r) / delta + 2; break;
			case b: h = (r - g) / delta + 4; break;
		}
		h = Math.round(h * 60);

		const s = l > 0.5
			? delta / (2 - max - min)
			: delta / (max + min);
		return { h, s, l, a };
	}

	function HSLToRGB({h, s, l, a}) {
		// If saturation is 0, it is a grey.
		if (s === 0) {
			const gray = Math.floor(l * 255);
			return { r: gray, g: gray, b: gray };
		}
		// Convert the H value to decimal.
		h /= 360;

		const
			q = l < 0.5 ? l * (1 + s) : l + s - l * s,
			p = 2 * l - q;

		function hueToRGBComponent(t) {
			// Constrain temp to the range 0..1
			if (t < 0) t += 1;
			if (t > 1) t -= 1;
			// Convert to an RGB component along the graph's four slopes
			// (rising, max, falling, min).
			if (t < 1/6) return p + (q - p) * 6 * t;
			if (t < 1/2) return q;
			if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
			return p;
		}
		return {
			r: Math.floor(hueToRGBComponent(h + 1/3) * 255),
			g: Math.floor(hueToRGBComponent(h) * 255),
			b: Math.floor(hueToRGBComponent(h - 1/3) * 255),
			a,
		};
	}

	const Colour = Object.freeze({
		TwineScript_TypeName:   "a colour",
		TwineScript_ObjectName: "a colour",
		
		/*
			Colours can be blended by addition.
		*/
		"TwineScript_+"(other) {
			/*
				These are just shorthands (for "lvalue" and "rvalue").
			*/
			const
				l = this,
				r = other;
			
			return Colour.create({
				/*
					You may notice this is a fairly glib blending algorithm. It's the same one from Game Maker,
					though, so I'm hard-pressed to think of a more intuitive one.
				*/
				r : Math.min(Math.round((l.r + r.r) * 0.6), 0xFF),
				g : Math.min(Math.round((l.g + r.g) * 0.6), 0xFF),
				b : Math.min(Math.round((l.b + r.b) * 0.6), 0xFF),
				a : (l.a + r.a) / 2,
			});
		},
		
		TwineScript_Print() {
			return "<tw-colour style='background-color:rgba("
				+ [this.r, this.g, this.b, this.a].join(',') + ");'></span>";
		},
		
		TwineScript_is(other) {
			return Colour.isPrototypeOf(other) &&
				other.r === this.r &&
				other.g === this.g &&
				other.b === this.b &&
				other.a === this.a;
		},
		
		TwineScript_Clone() {
			return Colour.create(this);
		},
		
		/*
			This converts the colour into a CSS rgba() function.
		*/
		toRGBAString() {
			return `rgba(${this.r}, ${this.g}, ${this.b}, ${this.a})`;
		},

		/*
			These getters provide h, s and l values as alternatives to this colour's
			r, g and b values. These are accessible in user macros.
		*/
		get h() {
			return RGBToHSL(this).h;
		},

		get s() {
			return RGBToHSL(this).s;
		},

		get l() {
			return RGBToHSL(this).l;
		},

		/*
			This constructor accepts an object containing r, g and b numeric properties,
			an object containing h, s and l numeric properties,
			or a string comprising a CSS hex colour.
		*/
		create(rgbObj) {
			if (typeof rgbObj === "string") {
				if (Colour.isHexString(rgbObj)) {
					return this.create(hexToRGB(rgbObj));
				}
				return this.create(css3ToRGB(rgbObj));
			}
			// To save computation, don't do the HSL to RGB conversion
			// if the RGB values are already present.
			if ("h" in rgbObj && "s" in rgbObj && "l" in rgbObj &&
					!("r" in rgbObj) && !("g" in rgbObj) && !("b" in rgbObj)) {
				return this.create(HSLToRGB(rgbObj));
			}
			// Assume alpha is 1 if it is not specified.
			if (!("a" in rgbObj) || typeof rgbObj.a !== "number") {
				rgbObj.a = 1;
			}
			return Object.assign(Object.create(this), rgbObj);
		},
		/*
			This static method determines if a given string matches a HTML hex colour format.
		*/
		isHexString(str) {
			return (typeof str === "string" && str[0] === "#"
				&& (str.slice(1).match(tripleDigit) || str.slice(1).match(sextupleDigit)));
		},
		/*
			This static method determines if a given string resembles a CSS3 color function.
			This doesn't check if it's a valid or well-formed CSS function, though.
		*/
		isCSS3Function(str) {
			return (typeof str === "string" && /^(?:rgb|hsl)a?\(\s*\d+\s*,\s*\d+%?\s*,\s*\d+%?(?:,\s*\d+(?:\.\d+)?\s*)?\)$/.test(str));
		},
	});
	return Colour;
});
