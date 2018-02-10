Introduction: Some of what's new in 2.0

A lot of features have been added to Harlowe 2.0, many of which are designed to shorten existing code idioms or make certain workarounds unnecessary. The changes to existing features you should first familiarise yourself with are:

 * The default Harlowe colour scheme is now white text on black, in adherence to SugarCube and Sugarcane. You can change it back to white using the instructions below.
 * Expressions like `$a < 4 and 5` will now be interpreted as `$a < 4 and it < 5` instead of always producing an error.
 * Using `is` with comparison operators, like `$a is < 3`, is now valid.
 * Changers can be attached to hooks with whitespace between them - `(if: $coverBlown) [Run!]` is now valid.
 * Changers can be attached to named hooks - `(if: true) |moths>[Several moths!]` is now valid.
 * Changers can be added together using + while attaching them to a hook - `(font:'Shatter')+(text-style:'outline')[CRASH!]` is now valid.
 * The default CSS has been changed such that the story's `font` must be overridden on `tw-story` rather than `html` (for consistency with other CSS properties).

The following new features also deserve your attention.

 * The built-in `?page`, `?passage`, `?sidebar` and `?link` hooks
 * Hidden hooks, and the (show:) and (hidden:) command macros
 * Temp variables (see the (set:) article)
 * The special `any` and `all` data names for arrays, strings and datasets (see each type's articles)
 * The (for:) changer macro
 * The (enchant:) command macro
 * The (find:), (altered:) and (folded:) data macros
 * The (dm:) and (ds:) aliases for (datamap:) and (dataset:)
 * Column markup
 * `tw-passage` elements now have a `tags` attribute.

For a complete list of changes, consult the <a href="#changes_2.0.0-changes-(also-see-1.2.3-changes)">change log</a> section.

Changing back from dark to light:
You may want to use the black-on-white colour scheme of Harlowe 1 instead of the new white-on-black colour scheme. A few of the new features described above can help you do this without using CSS! Simply create a `header` tagged passage (a passage with the tag 'header'), and include this in it:

```
(enchant: ?page, (text-colour: black) + (background: white))
```

This uses the new ?page built-in hook to target the entire page, and the new (enchant:) macro to apply changer commands to it directly. In the future, more features are planned that will allow styling the page in this way without CSS, staying within Harlowe code, and letting you use variables and other macros inside it.
