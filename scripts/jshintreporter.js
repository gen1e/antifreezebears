// Based on grunt-contrib-jshint
var c = require('chalk');
module.exports = {};
module.exports.reporter = function(results, data) {
    if (data.length < 1) {
        console.error('0 files linted. Please check your ignored files.');
        return;
    }
    if (results.length === 0) {
        console.log('No errors reported.');
        return;
    }
    var options = data[0].options;
    // Play bell noise
    console.error('\7\n')

    var lastfile = null;
    // Iterate over all errors.
    results.forEach(function(result) {

        // Only print file name once per error
        if (result.file !== lastfile) {
            console.error(c.bold.green(result.file ? '   ' + result.file : ''));
        }
        lastfile = result.file;

        var e = result.error;

        // Sometimes there's no error object.
        if (!e) {
            return;
        }

        if (e.evidence) {
            var evidence = e.evidence.replace(/\t/g, Array(options.indent).join(' '));

            console.error(("       " + e.line).slice(-7) + ' |' + c.grey(evidence));
            console.error("         " + Array(e.character).join(' ') + '^ ' + e.reason);

        } else {
            // Generic "Whoops, too many errors" error.
            console.error(e.reason);
        }
    });
};
