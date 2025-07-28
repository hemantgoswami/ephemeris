'use strict'

var constant = require('./src/astronomy/moshier/constant')
var processor = require('./src/astronomy/moshier/processor')
var body = require('./src/astronomy/moshier/body')

function setUp (date, geodeticalLongitude, geodeticalLatitude, height) {
  var d = !date ? new Date() : date
  constant.tlong = geodeticalLongitude
  constant.glat = geodeticalLatitude
  constant.height = height
  constant.date = {
    day: d.getUTCDate(),
    month: d.getUTCMonth()+1,
    year: d.getUTCFullYear(),
    hours: d.getUTCHours(),
    minutes: d.getUTCMinutes(),
    seconds: d.getUTCSeconds()
  }
  processor.init()
}

// Example call: getAllPlanets(new Date(), 10.0014, 53.5653, 0);
function getAllPlanets (date, geodeticalLongitude, geodeticalLatitude, height) {

  setUp(date, geodeticalLongitude, geodeticalLatitude, height)

  var ret = {
    date: undefined,
    observer: undefined,
    observed: {}
  }
  date = constant.date
  var observables = Object.keys(body)

  for (var i = 0; i < observables.length; i++) {

    var observeMe = observables[i]
    if (['earth', 'init'].indexOf(observeMe) >= 0) {
      continue
    }

    constant.body = body[observeMe]

    processor.calc(date, constant.body)

    if (ret.date === undefined) {
      ret.date = {
        gregorianTerrestrial: [date.day, date.month, date.year].join('.')
          + ' ' + [date.hours, date.minutes, date.seconds].join(':'),
        gregorianTerrestrialRaw: date,
        gregorianUniversal: constant.date.universalDateString,
        gregorianDelta: '00:00:' + constant.date.delta,
        julianTerrestrial: constant.date.julian,
        julianUniversal: constant.date.universal,
        julianDelta: constant.date.delta / 86400
      }
    }

    if (ret.observer === undefined) {
      ret.observer = {
        name: 'earth',
        longitudeGeodetic: constant.tlong,
        longitudeGeocentric: constant.tlong,
        latitudeGeodetic: constant.glat,
        latitudeGeocentric: constant.tlat,
        heightGeodetic: constant.height,
        heightGeocentric: constant.trho * constant.aearth / 1000
      }
    }

    ret.observed[constant.body.key] = {
      name: constant.body.key,
      raw: constant.body,
      apparentLongitudeDms30: constant.body.position.apparentLongitude30String,
      apparentLongitudeDms360: constant.body.position.apparentLongitudeString,
      apparentLongitudeDd: constant.body.position.apparentLongitude,
      geocentricDistanceKm: constant.body.position.geocentricDistance,
      is_retrograde: constant.body.position.is_retrograde
    }

  }

  return ret
}

// Example call: getPlanet('moon', new Date(), 10.0014, 53.5653, 0);
function getPlanet (planetName, date, geodeticalLongitude, geodeticalLatitude, height) {

  setUp(date, geodeticalLongitude, geodeticalLatitude, height)

  var ret = {
    date: undefined,
    observer: undefined,
    observed: {}
  }
  date = constant.date

  constant.body = body[planetName]

  processor.calc(date, constant.body)

  if (ret.date === undefined) {
    ret.date = {
      gregorianTerrestrial: [date.day, date.month, date.year].join('.')
        + ' ' + [date.hours, date.minutes, date.seconds].join(':'),
      gregorianTerrestrialRaw: date,
      gregorianUniversal: constant.date.universalDateString,
      gregorianDelta: '00:00:' + constant.date.delta,
      julianTerrestrial: constant.date.julian,
      julianUniversal: constant.date.universal,
      julianDelta: constant.date.delta / 86400
    }
  }

  if (ret.observer === undefined) {
    ret.observer = {
      name: 'earth',
      longitudeGeodetic: constant.tlong,
      longitudeGeocentric: constant.tlong,
      latitudeGeodetic: constant.glat,
      latitudeGeocentric: constant.tlat,
      heightGeodetic: constant.height,
      heightGeocentric: constant.trho * constant.aearth / 1000
    }
  }

  ret.observed[constant.body.key] = {
    name: constant.body.key,
    raw: constant.body,
    apparentLongitudeDms30: constant.body.position.apparentLongitude30String,
    apparentLongitudeDms360: constant.body.position.apparentLongitudeString,
    apparentLongitudeDd: constant.body.position.apparentLongitude,
    geocentricDistanceKm: constant.body.position.geocentricDistance,
    is_retrograde: constant.body.position.is_retrograde
  }

  return ret
}

module.exports = {
  getAllPlanets: getAllPlanets,
  getPlanet: getPlanet
}
