describe("date and time macros", function() {
	'use strict';
	describe("the (current-date:) macro", function() {
		it("accepts 0 arguments", function() {
			expect("(current-date:)").not.markupToError();
			expect("(current-date: 1)").markupToError();
		});
		it("returns the current system date in the format 'Thu Jan 01 1970'", function() {
			// Ideally this would mock the date, but it's unclear how to produce a Date
			// object without DST or a timezone.
			spyOn(Date.prototype, "toDateString").and.callThrough();
			expect(runPassage("(current-date:)").text()).toMatch(/^[A-Z][a-z]{2} [A-Z][a-z]{2} \d\d \d{4}$/);
			expect(Date.prototype.toDateString).toHaveBeenCalled();
		});
	});
	describe("the (current-time:) macro", function() {
		var trueDate = Date;
		function spyOnDate(fake) {
			spyOn(window,'Date').and.returnValue(fake);
			Date.now = trueDate.now;
			spyOn(fake,'getHours').and.callThrough();
			spyOn(fake,'getMinutes').and.callThrough();
		}
		it("accepts 0 arguments", function() {
			expect("(current-time:)").not.markupToError();
			expect("(current-time: 1)").markupToError();
		});
		it("returns the current system time in the format '12:00 AM'", function() {
			var trueDate = Date;
			var fake = {
				getHours: function() { return 14; },
				getMinutes: function() { return 6; },
			};
			spyOnDate(fake);
			expect("(current-time:)").markupToPrint('2:06 PM');
			expect(fake.getHours).toHaveBeenCalled();
			expect(fake.getMinutes).toHaveBeenCalled();
		});
		it("uses '12' at 12 PM", function() {
			var fake = {
				getHours: function() { return 12; },
				getMinutes: function() { return 59; },
			};
			spyOnDate(fake);
			expect("(current-time:)").markupToPrint('12:59 PM');
		});
		it("uses '12' at 12 AM", function() {
			var fake = {
				getHours: function() { return 0; },
				getMinutes: function() { return 59; },
			};
			spyOnDate(fake);
			expect("(current-time:)").markupToPrint('12:59 AM');
		});
	});
});
