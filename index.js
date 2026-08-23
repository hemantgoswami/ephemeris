'use strict'

const constant = require('./src/astronomy/moshier/constant')
const processor = require('./src/astronomy/moshier/processor')
const body = require('./src/astronomy/moshier/body')

// Keys on the body table that cannot be observed: the observer itself and
// the table's own helper.
const NOT_OBSERVABLE = ['earth', 'init']

function observableNames () {
  return Object.keys(body).filter(function (name) {
    return NOT_OBSERVABLE.indexOf(name) < 0
  })
}

function setUp (date, geodeticalLongitude, geodeticalLatitude, height) {
  const d = !date ? new Date() : date
  constant.tlong = geodeticalLongitude
  constant.glat = geodeticalLatitude
  constant.height = height
  constant.date = {
    day: d.getUTCDate(),
    month: d.getUTCMonth() + 1,
    year: d.getUTCFullYear(),
    hours: d.getUTCHours(),
    minutes: d.getUTCMinutes(),
    seconds: d.getUTCSeconds()
  }
  processor.init()
}

function describeDate (date) {
  return {
    gregorianTerrestrial: [date.day, date.month, date.year].join('.') +
      ' ' + [date.hours, date.minutes, date.seconds].join(':'),
    gregorianTerrestrialRaw: date,
    gregorianUniversal: date.universalDateString,
    gregorianDelta: '00:00:' + date.delta,
    julianTerrestrial: date.julian,
    julianUniversal: date.universal,
    julianDelta: date.delta / 86400
  }
}

function describeObserver () {
  return {
    name: 'earth',
    longitudeGeodetic: constant.tlong,
    longitudeGeocentric: constant.tlong,
    latitudeGeodetic: constant.glat,
    latitudeGeocentric: constant.tlat,
    heightGeodetic: constant.height,
    heightGeocentric: constant.trho * constant.aearth / 1000
  }
}

function describeBody (observed) {
  return {
    name: observed.key,
    raw: observed,
    apparentLongitudeDms30: observed.position.apparentLongitude30String,
    apparentLongitudeDms360: observed.position.apparentLongitudeString,
    apparentLongitudeDd: observed.position.apparentLongitude,
    apparentLongitudeDdPerDay: observed.position.apparentLongitudeMotion,
    geocentricDistanceKm: observed.position.geocentricDistance,
    is_retrograde: observed.position.is_retrograde
  }
}

function observe (names, date, geodeticalLongitude, geodeticalLatitude, height) {
  setUp(date, geodeticalLongitude, geodeticalLatitude, height)

  const observed = {}
  for (let i = 0; i < names.length; i++) {
    constant.body = body[names[i]]
    processor.calcWithMotion(constant.date, constant.body)
    observed[constant.body.key] = describeBody(constant.body)
  }

  return {
    date: describeDate(constant.date),
    observer: describeObserver(),
    observed
  }
}

// Example call: getAllPlanets(new Date(), 10.0014, 53.5653, 0);
function getAllPlanets (date, geodeticalLongitude, geodeticalLatitude, height) {
  return observe(observableNames(), date, geodeticalLongitude, geodeticalLatitude, height)
}

// Example call: getPlanet('moon', new Date(), 10.0014, 53.5653, 0);
function getPlanet (planetName, date, geodeticalLongitude, geodeticalLatitude, height) {
  if (observableNames().indexOf(planetName) < 0) {
    throw new Error('Unknown body "' + planetName + '". Known bodies are: ' +
      observableNames().join(', ') + '.')
  }

  return observe([planetName], date, geodeticalLongitude, geodeticalLatitude, height)
}

module.exports = {
  getAllPlanets,
  getPlanet,
  getBodyNames: observableNames
}
