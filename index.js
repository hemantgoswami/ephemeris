'use strict'

var eph = require('./build/')

function setUp (iDate, geodeticalLongitude, geodeticalLatitude, height) {
  var date

  eph.const.tlong = geodeticalLongitude
  eph.const.glat = geodeticalLatitude
  eph.const.height = height

  eph.const.date = iDate.format('DD.MM.YYYY HH:mm:ss')

  if (eph.const.date) {
    var tokens = eph.const.date.split(' ')

    tokens[0] = tokens[0].split('.')
    tokens[1] = tokens[1].split(':')

    date = {
      day: parseFloat(tokens[0][0]), // parseFloat strips leading zeros
      month: parseFloat(tokens[0][1]),
      year: parseFloat(tokens[0][2]),
      hours: parseFloat(tokens[1][0]),
      minutes: parseFloat(tokens[1][1]),
      seconds: parseFloat(tokens[1][2])
    }
    eph.const.date = date
  }
  eph.processor.init()
}

// Example call: getAllPlanets(momentDateObj, 10.0014, 53.5653, 0);
function getAllPlanets (iDate, geodeticalLongitude, geodeticalLatitude, height) {

  setUp(iDate, geodeticalLongitude, geodeticalLatitude, height)

  var ret = {
    date: undefined,
    observer: undefined,
    observed: {}
  }
  var date = eph.const.date
  var observables = Object.keys(eph.moshier.body)

  for (var i = 0; i < observables.length; i++) {

    var observeMe = observables[i]
    if (['earth', 'init'].indexOf(observeMe) >= 0) {
      continue
    }

    eph.const.body = eph.moshier.body[observeMe]

    eph.processor.calc(date, eph.const.body)

    if (ret.date === undefined) {
      ret.date = {
        gregorianTerrestrial: [date.day, date.month, date.year].join('.') + ' ' + [date.hours, date.minutes, date.seconds].join(':'),
        gregorianTerrestrialRaw: date,
        gregorianUniversal: (eph.const.date.universalDateString),
        gregorianDelta: ('00:00:' + (eph.const.date.delta)),
        julianTerrestrial: (eph.const.date.julian),
        julianUniversal: (eph.const.date.universal),
        julianDelta: (eph.const.date.delta / 86400)
      }
    }

    if (ret.observer === undefined) {
      ret.observer = {
        name: 'earth',
        longitueGeodetic: (eph.const.tlong),
        longitudeGeodecentric: (eph.const.tlong),
        latitudeGeodetic: (eph.const.glat),
        latitudeGeodecentric: (eph.const.tlat),
        heightGeodetic: (eph.const.height),
        heightGeodecentric: (eph.const.trho * eph.const.aearth / 1000),
      }
    }

    var body = {
      name: eph.const.body.key,
      raw: eph.const.body,
      apparentLongitudeDms30: (eph.const.body.position.apparentLongitude30String),
      apparentLongitudeDms360: (eph.const.body.position.apparentLongitudeString),
      apparentLongitudeDd: (eph.const.body.position.apparentLongitude),
      geocentricDistanceKm: (eph.const.body.position.geocentricDistance)
    }
    ret.observed[body.name] = body

  }

  return ret
}

// Example call: getPlanet('moon', momentDateObj, 10.0014, 53.5653, 0);
function getPlanet (planetName, iDate, geodeticalLongitude, geodeticalLatitude, height) {

  setUp(iDate, geodeticalLongitude, geodeticalLatitude, height)

  var ret = {
    date: undefined,
    observer: undefined,
    observed: {}
  }
  var date = eph.const.date

  eph.const.body = eph.moshier.body[planetName]

  eph.processor.calc(date, eph.const.body)

  if (ret.date === undefined) {
    ret.date = {
      gregorianTerrestrial: [date.day, date.month, date.year].join('.') + ' ' + [date.hours, date.minutes, date.seconds].join(':'),
      gregorianTerrestrialRaw: date,
      gregorianUniversal: (eph.const.date.universalDateString),
      gregorianDelta: ('00:00:' + (eph.const.date.delta)),
      julianTerrestrial: (eph.const.date.julian),
      julianUniversal: (eph.const.date.universal),
      julianDelta: (eph.const.date.delta / 86400)
    }
  }

  if (ret.observer === undefined) {
    ret.observer = {
      name: 'earth',
      longitueGeodetic: (eph.const.tlong),
      longitudeGeodecentric: (eph.const.tlong),
      latitudeGeodetic: (eph.const.glat),
      latitudeGeodecentric: (eph.const.tlat),
      heightGeodetic: (eph.const.height),
      heightGeodecentric: (eph.const.trho * eph.const.aearth / 1000),
    }
  }

  var body = {
    name: eph.const.body.key,
    raw: eph.const.body,
    apparentLongitudeDms30: (eph.const.body.position.apparentLongitude30String),
    apparentLongitudeDms360: (eph.const.body.position.apparentLongitudeString),
    apparentLongitudeDd: (eph.const.body.position.apparentLongitude),
    geocentricDistanceKm: (eph.const.body.position.geocentricDistance)
  }
  ret.observed[body.name] = body

  return ret
}

module.exports = {
  ephemeris: eph,
  getAllPlanets,
  getPlanet
}
