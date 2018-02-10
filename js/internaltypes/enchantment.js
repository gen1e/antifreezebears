"use strict";
define(['jquery', 'utils', 'internaltypes/changedescriptor'], ($, Utils, ChangeDescriptor) => {
	/*
		Enchantments are special styling that is applied to selected elements of a
		passage by a macro. Enchantments are registered with a Section by pushing
		them onto the Section's "enchantments" array, whereupon the Section will
		automatically run updateEnchantments() whenever its DOM is permuted.
	*/

	const Enchantment = {
		/*
			Creates an Enchantment based on the given descriptor object.
			The descriptor should have {scope, attr, data} properties.

			The scope is shared with both enchantData methods:
			disenchant removes the <tw-enchantment> elements
			set on the scope, and enchantScope creates an updated
			scope to enchant.
		*/
		create(descriptor) {
			Utils.assertOnlyHas(descriptor, ['scope', 'section', 'attr', 'data', 'changer', 'functions']);

			return Object.assign(Object.create(this), {
				/*
					A store for the <tw-enchantment> wrappers created by enchantScope.
					
					This is a case of a jQuery object being used as a data structure rather
					than as a query result set. Search function calls for DOM elements 'contained' in
					these enchantments is more succinct using jQuery than using a plain Array or Set.
				*/
				enchantments: $(),
			}, descriptor);
		},
		/*
			This method enchants the scope, applying the macro's enchantment's
			classes to the matched elements.
		*/
		enchantScope() {
			const {attr, data, functions, section, changer} = this;
			let {scope} = this;
			/*
				scope could be a jQuery, if this is a HTML scope created by, say, (enchant: "<i>"). In which
				case, convert it to an array for the purposes of this method.
			*/
			if (scope instanceof $) {
				scope = Array.prototype.map.call(scope, e => $(e));
			}
			/*
				Reset the enchantments store, to prepare for the insertion of
				a fresh set of <tw-enchantment>s.
			*/
			this.enchantments = $();
			
			/*
				Now, enchant each selected word or hook within the scope.
			*/
			scope.forEach(section, (e) => {
				/*
					Create a fresh <tw-enchantment>, and wrap the elements in it.

					It's a little odd that the generated wrapper must be retrieved
					using a terminating .parent(), but oh well.
				*/
				const wrapping = e.wrapAll("<tw-enchantment>").parent();

				/*
					Apply the attr, data and functions now.
				*/
				if (attr) {
					wrapping.attr(attr);
				}
				if (data) {
					wrapping.data(data);
				}
				if (functions) {
					functions.forEach(fn => fn(wrapping));
				}
				if (changer) {
					const cd = ChangeDescriptor.create({section, target:wrapping});
					changer.run(cd);
					cd.update();
					/*
						CSS kludge for <tw-story>: when style properties are written on its enclosing <tw-enchantment>,
						add "inherit" CSS for those same properties on <tw-story> itself, so that it won't override
						it with its own default CSS.
					*/
					if (e.is(Utils.storyElement)) {
						const enchantedProperties = Object.keys(Object.assign({},...cd.styles));
						e.css(enchantedProperties.reduce((a,e)=>{
							a[e] = "inherit";
							return a;
						},{}));
						/*
							Store the list of enchanted properties as data on this wrapping,
							so that they can be removed later.
						*/
						wrapping.data({enchantedProperties});
					}
				}

				/*
					This brief CSS kludge allows a <tw-enchantment> wrapping <tw-story>
					to not restrict the <tw-story>'s width and height.
					It must be performed now because the aforementioned .attr() call
					may entirely alter the style attribute.
				*/
				if (e.is(Utils.storyElement)) {
					wrapping.css({ width: '100%', height: '100%' });
				}

				/*
					Store the wrapping in the enchantments list.
				*/
				this.enchantments = this.enchantments.add(wrapping);
			});
		},
		/*
			This method removes the enchantment wrappers installed by enchantScope().
			This is called by Section whenever the scope's DOM may have been changed,
			so that enchantScope() can then select the newly selected regions.
		*/
		disenchant() {
			/*
				Clear all existing <tw-enchantment> wrapper elements placed by
				the previous call to enchantScope().
			*/
			this.enchantments.each(function() {
				const c = $(this).contents();
				c.unwrap();
				/*
					Undo the preceding CSS "inherit" kludge for <tw-story>.
				*/
				const enchantedProperties = $(this).data('enchantedProperties');
				if (enchantedProperties && c.has(Utils.storyElement)) {
					Utils.storyElement.css(enchantedProperties.reduce((a,e)=>(a[e] = "",a),{}));
				}
			});
		},

	};
	return Object.freeze(Enchantment);
});
