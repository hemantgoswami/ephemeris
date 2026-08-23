'use strict'

const constant = require('./src/astronomy/moshier/constant')
const delta = require('./src/astronomy/moshier/delta')
const julian = require('./src/astronomy/moshier/julian')
const processor = require('./src/astronomy/moshier/processor')
const util = require('./src/astronomy/moshier/util')

const registry = require('./src/backends/registry')
const moshier = require('./src/backends/moshier')
const swisseph = require('./src/backends/swisseph')
const astronomyEngine = require('./src/backends/astronomy-engine')

// All three are registered whether or not their engine is installed, so
// backends() can report honestly on what is and is not usable here. Moshier
// goes first and so stays the default. Registering an adapter does not load
// its engine beyond a require in a try/catch, and adds no dependency.
registry.register(moshier)
registry.register(swisseph())
registry.register(astronomyEngine())

/**
 * The catalogue every backend is measured against. getAllPlanets always
 * returns exactly these keys, whichever backend is in use, so switching
 * engines never changes the shape of the result. A backend that cannot do
 * one of them gets the unavailable template instead.
 */
const CATALOGUE = moshier.bodies.slice()

/**
 * Bodies whose apparent longitude only ever increases as seen from the
 * earth, so retrograde does not apply to them.
 */
const ALWAYS_DIRECT = ['sun', 'moon']

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

  // Backends other than the built in one need the julian day and delta T
  // before any body is calculated, and the built in one recomputes them
  // harmlessly.
  julian.calc(constant.date)
  delta.calc(constant.date)
  constant.date.universalDate = julian.toGregorian({julian: constant.date.universal})
  constant.date.universalDateString =
    constant.date.universalDate.day + '.' +
    constant.date.universalDate.month + '.' +
    constant.date.universalDate.year + ' ' +
    constant.date.universalDate.hours + ':' +
    constant.date.universalDate.minutes + ':' +
    (constant.date.universalDate.seconds + constant.date.universalDate.milliseconds / 1000)

  return constant.date
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

/** What a body looks like when the current backend cannot produce it. */
function unavailable (key, backend, reason) {
  return {
    name: key,
    available: false,
    unavailableReason: reason ||
      'the ' + backend.name + ' backend does not provide ' + key,
    backend: backend.name,
    raw: null,
    apparentLongitudeDms30: null,
    apparentLongitudeDms360: null,
    apparentLongitudeDd: null,
    apparentLongitudeDdPerDay: null,
    geocentricDistanceKm: null,
    is_retrograde: null
  }
}

function describeBody (key, result, backend) {
  const dms = util.dms(result.longitude * constant.DTR)
  const motion = result.motion

  let retrograde
  if (motion === undefined || motion === null || ALWAYS_DIRECT.indexOf(key) >= 0) {
    retrograde = undefined
  } else {
    retrograde = motion < 0
  }

  return {
    name: key,
    available: true,
    unavailableReason: null,
    backend: backend.name,
    raw: result.raw,
    apparentLongitudeDms30: util.mod30(dms.degree) + '°' +
      dms.minutes + '\'' + Math.floor(dms.seconds) + '"',
    apparentLongitudeDms360: dms.degree + '°' +
      dms.minutes + '\'' + Math.floor(dms.seconds) + '"',
    apparentLongitudeDd: result.longitude,
    apparentLongitudeDdPerDay: motion,
    geocentricDistanceKm: result.distance,
    is_retrograde: retrograde
  }
}

/** Turn whatever the caller passed into the {name} / {asteroid} / ... form. */
function normalise (spec) {
  if (typeof spec === 'string') {
    return {name: spec}
  }
  if (spec && typeof spec === 'object') {
    return spec
  }
  throw new Error('A body is named by a string, or described by an object ' +
    'such as {asteroid: 433}, {star: "Aldebaran"} or {id: 15}.')
}

function keyFor (spec) {
  if (spec.name) {
    return spec.name
  }
  if (spec.asteroid !== undefined) {
    return 'asteroid:' + spec.asteroid
  }
  if (spec.star !== undefined) {
    return 'star:' + spec.star
  }
  if (spec.id !== undefined) {
    return 'id:' + spec.id
  }
  return 'unknown'
}

function observe (specs, date, geodeticalLongitude, geodeticalLatitude, height) {
  const backend = registry.current()
  const when = setUp(date, geodeticalLongitude, geodeticalLatitude, height)
  const observed = {}

  specs.forEach(function (raw) {
    const spec = normalise(raw)
    const key = keyFor(spec)
    let result = null

    if (backend.supports(spec)) {
      result = backend.calc(when, spec)
    }

    if (result && result.error) {
      observed[key] = unavailable(key, backend, result.error)
    } else if (result) {
      observed[key] = describeBody(key, result, backend)
    } else {
      observed[key] = unavailable(key, backend)
    }
  })

  return {
    backend: backend.name,
    date: describeDate(when),
    observer: describeObserver(),
    observed
  }
}

// Example call: getAllPlanets(new Date(), 10.0014, 53.5653, 0);
function getAllPlanets (date, geodeticalLongitude, geodeticalLatitude, height) {
  return observe(CATALOGUE, date, geodeticalLongitude, geodeticalLatitude, height)
}

// Example call: getPlanet('moon', new Date(), 10.0014, 53.5653, 0);
function getPlanet (planetName, date, geodeticalLongitude, geodeticalLatitude, height) {
  if (CATALOGUE.indexOf(planetName) < 0) {
    throw new Error('Unknown body "' + planetName + '". Known bodies are: ' +
      CATALOGUE.join(', ') + '. For anything else, use getBody().')
  }

  return observe([planetName], date, geodeticalLongitude, geodeticalLatitude, height)
}

/**
 * Ask for anything the catalogue does not name: a numbered minor planet, a
 * fixed star, or an engine specific identifier. Whether it works depends on
 * the backend, and an unavailable template comes back when it does not.
 *
 *   getBody({asteroid: 433}, date, lon, lat, 0)
 *   getBody({star: 'Aldebaran'}, date, lon, lat, 0)
 *   getBody(['mars', {asteroid: 433}], date, lon, lat, 0)
 */
function getBody (spec, date, geodeticalLongitude, geodeticalLatitude, height) {
  const specs = Array.isArray(spec) ? spec : [spec]
  return observe(specs, date, geodeticalLongitude, geodeticalLatitude, height)
}

module.exports = {
  getAllPlanets,
  getPlanet,
  getBody,
  getBodyNames: function () { return CATALOGUE.slice() },

  // Backends
  use: function (backend) { return registry.use(backend).name },
  backend: function () { return registry.current().name },
  backends: function () { return registry.list() },
  registerBackend: function (backend) { return registry.register(backend).name },
  swisseph,
  astronomyEngine,

  /**
   * Fetch the Swiss Ephemeris data files. Explicit on purpose: there is no
   * postinstall hook and nothing downloads while you are asking for a
   * planet. Equivalent to the ephemeris-fetch-ephe command.
   */
  fetchEphemeris: require('./src/fetch-ephe'),
  ephemerisFiles: require('./src/ephe-files')
}
