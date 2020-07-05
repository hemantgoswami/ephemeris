// This file is a placeholder and needs more tests.

var test = require('tape');
var Moment = require('moment-timezone');

var ephemeris = require('../');

test('dummy test', function (t) {
    t.plan(3);
    var dateObj = new Moment.tz('10.08.2015 17:09:01', 'DD.MM.YYYY HH:mm:ss', 'UTC')

    var result = ephemeris.getAllPlanets(dateObj, 10.0014, 53.5653, 0);

    t.equal(result.date.gregorianTerrestrial, '10.8.2015 17:9:1');
    t.equal(result.observer.longitudeGeodetic,  10.0014);
    t.equal(result.observed.sun.apparentLongitudeDms360,  '137°45\'39"');
});
