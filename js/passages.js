"use strict";
define(['jquery', 'utils', 'utils/selectors'], ($, {unescape}, Selectors) => {
	/*
		Passages
		A userland registry of Passage objects.
		Passage objects are simple Maps exposing passage data to public scripts.
		They have their string content (the "source"), their tags in an array, and their name.
	*/

	/*
		Pass a <tw-passagedata> element into this constructor,
		and a Passage datamap will be produced.
	*/
	function Passage(elem) {
		return Object.assign(new Map([
			/*
				Passage objects have the following properties:
				source: the raw TwineMarkup source of the passage.
			*/
			["source", unescape(elem.html())],
			/*
				tags: an array of its tags, as strings.
			*/
			["tags", (elem.attr('tags') || "").split(/\s/) || []],
			/*
				name: its name, which can be altered to change how
				passage links can refer to this.
			
				Sadly, it's not yet possible to rebind this within $Passages
				just by changing this attribute.
			*/
			["name", elem.attr('name')],
		]),{
			/*
				These must unfortunately be own-properties, as passages must inherit from
				Map rather than this object.
			*/
			TwineScript_TypeName: "passage datamap",
			TwineScript_ObjectName: "a passage datamap"
		});
	}
	
	const Passages = Object.assign(new Map(), {
		TwineScript_ObjectName: "the Passages datamap",
		
		/*
			This method retrieves passages which have a given tag.
		*/
		getTagged(tag) {
			const ret = [];
			this.forEach((v) => {
				/*
					We need this instanceof check in case a non-datamap was added by the author.
				*/
				const tags = v instanceof Map && v.get('tags');
				if (Array.isArray(tags) && tags.includes(tag)) {
					ret.push(v);
				}
			});
			return ret.sort((left, right) => left.get('name') > right.get('name'));
		},
		
		create: Passage,
	});
	
	/*
		Unfortunately, the DOM isn't visible until the page is loaded, so we can't
		read every <tw-passagedata> from the <tw-storydata> HTML and store them in Passages until then.
	*/
	$(() => {
		Array.from($(Selectors.storyData + " > " + Selectors.passageData)).forEach(e => {
			e = $(e);
			Passages.set(e.attr('name'), new Passage(e));
		});
	});
	return Passages;
});
