/*
	Polyfills for post-ES6 functions.
	Currently only contains Array.prototype.includes()
*/
"use strict";
define([], function() {
	const A = Array.prototype;
	if (typeof A.includes !== "function") {
		A.includes = function includes(searchElement, fromIndex = 0) {
			if (!Number.isNaN(searchElement) && Number.isFinite(fromIndex) && typeof searchElement !== 'undefined') {
				return A.indexOf.call(this, searchElement, fromIndex) > -1;
			}

			let O = Object(this), length = parseInt(O.length);
			if (length <= 0) {
				return false;
			}
			let k = fromIndex >= 0 ? fromIndex : Math.max(0, length + fromIndex);
			while (k < length) {
				if (Object.is(searchElement, O[k])) {
					return true;
				}
				k += 1;
			}
			return false;
		};
	}
});
