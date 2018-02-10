"use strict";
define(['jquery'], ($) => {
	
	$.prototype.extend({
		/*
			popAttr: returns an attribute while removing it. Accepts only 1 argument.
		*/
		popAttr(attr) {
			const ret = this.attr(attr);
			this.removeAttr(attr);
			return ret;
		},
		/*
			popData: return data while removing it. Accepts only 1 argument.
		*/
		popData(name) {
			const ret = this.data(name);
			this.removeData(name);
			return ret;
		},
		/*
			tag: returns the **lowercase** tag name of the first matched element.
			This is only a getter.
		*/
		tag() {
			return this[0] && this[0].tagName && this[0].tagName.toLowerCase();
		},
		/*
			This slightly complicated procedure is necessary to select all
			descendent text nodes.
			This returns a sorted Array, not a jQuery.
		*/
		textNodes() {
			/*
				Base case: this collection contains a single text node.
			*/
			if (this.length === 1 && this[0] instanceof Text) {
				return [this[0]];
			}
			/*
				First, create an array containing all descendent and contents nodes
				which are text nodes.
			*/
			return Array.from(this.add(this.contents().add(this.find('*').contents())).filter(function() {
				return this instanceof Text;
			}))
			/*
				the addBack() call adds back the descendents in an unwanted order, so we must
				sort the returned array using compareDocumentPosition.
			*/
			.sort((left, right) => (left.compareDocumentPosition(right)) & 2 ? 1 : -1);
		},

		/*
			Quick utility function that calls .filter(q).add(q).find(q),
			which is similar to just .find() but includes the top element
			if it also matches.
		*/
		findAndFilter(selector) {
			return this.filter(selector).add(this.find(selector));
		},
	});
});
