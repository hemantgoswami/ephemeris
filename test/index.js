const execFileSync = require('child_process').execFileSync
const path = require('path')
const test = require('tape')

const ephemeris = require('../')

const BERLIN = {longitude: 10.0014, latitude: 53.5653, height: 0}

function at (iso) {
  return new Date(iso)
}

function observe (name, iso) {
  return ephemeris.getPlanet(name, at(iso), BERLIN.longitude, BERLIN.latitude, BERLIN.height)
    .observed[name]
}

test('getAllPlanets reports the date, the observer and every body', function (t) {
  const result = ephemeris.getAllPlanets(at('2015-08-10T17:09:01.000+00:00'),
    BERLIN.longitude, BERLIN.latitude, BERLIN.height)

  t.equal(result.date.gregorianTerrestrial, '10.8.2015 17:9:1', 'terrestrial date')
  t.equal(result.date.gregorianUniversal, '10.8.2015 17:7:52.983', 'universal date')
  t.equal(result.observer.longitudeGeodetic, BERLIN.longitude, 'observer longitude')
  t.equal(result.observer.latitudeGeodetic, BERLIN.latitude, 'observer latitude')
  t.deepEqual(Object.keys(result.observed), ephemeris.getBodyNames(), 'every body observed')
  t.end()
})

test('apparent longitudes match the published reference values', function (t) {
  const result = ephemeris.getAllPlanets(at('2015-08-10T17:09:01.000+00:00'),
    BERLIN.longitude, BERLIN.latitude, BERLIN.height)

  t.equal(result.observed.sun.apparentLongitudeDms360, '137°45\'39"', 'sun in dms')
  t.equal(result.observed.sun.apparentLongitudeDms30, '17°45\'39"', 'sun in dms modulo 30')
  t.equal(result.observed.moon.apparentLongitudeDms360, '92°41\'17"', 'moon in dms')
  t.equal(result.observed.pluto.apparentLongitudeDms360, '283°27\'13"', 'pluto in dms')
  t.ok(Math.abs(result.observed.sun.apparentLongitudeDd - 137.7610585591896) < 1e-9,
    'sun in decimal degrees')
  t.end()
})

test('getPlanet agrees with getAllPlanets for the same instant', function (t) {
  const date = at('2024-04-05T00:00:00.000Z')
  const all = ephemeris.getAllPlanets(date, BERLIN.longitude, BERLIN.latitude, BERLIN.height)

  ephemeris.getBodyNames().forEach(function (name) {
    const one = ephemeris.getPlanet(name, date, BERLIN.longitude, BERLIN.latitude, BERLIN.height)
    t.equal(one.observed[name].apparentLongitudeDd, all.observed[name].apparentLongitudeDd, name)
  })
  t.end()
})

test('getPlanet rejects a body it does not know', function (t) {
  t.throws(function () {
    ephemeris.getPlanet('nibiru', at('2024-04-05T00:00:00.000Z'), 0, 0, 0)
  }, /Unknown body "nibiru"/, 'names the offending body')
  t.end()
})

test('getBodyNames leaves out the observer and the table helper', function (t) {
  const names = ephemeris.getBodyNames()

  t.equal(names.indexOf('earth'), -1, 'earth is the observer, not an observable')
  t.equal(names.indexOf('init'), -1, 'init is a helper, not a body')
  t.ok(names.indexOf('sun') >= 0 && names.indexOf('pluto') >= 0, 'real bodies are listed')
  t.end()
})

test('a missing date is read as now', function (t) {
  const before = new Date()
  const result = ephemeris.getAllPlanets(null, BERLIN.longitude, BERLIN.latitude, BERLIN.height)
  const after = new Date()

  t.ok(result.date.gregorianTerrestrialRaw.year >= before.getUTCFullYear(), 'not before now')
  t.ok(result.date.gregorianTerrestrialRaw.year <= after.getUTCFullYear(), 'not after now')
  t.end()
})

/*
 * Retrograde motion. The station dates below are the well documented ones,
 * so a body is checked a few days inside each window rather than right on
 * the turn.
 */
test('the retrograde flag matches known retrograde windows', function (t) {
  const cases = [
    // Venus retrograde 25 July - 6 September 2015
    {name: 'venus', iso: '2015-08-10T00:00:00Z', retrograde: true},
    {name: 'venus', iso: '2015-10-10T00:00:00Z', retrograde: false},
    // Mercury retrograde 5 - 25 January 2016
    {name: 'mercury', iso: '2016-01-15T00:00:00Z', retrograde: true},
    {name: 'mercury', iso: '2016-02-15T00:00:00Z', retrograde: false},
    // Mars retrograde 9 September - 14 November 2020
    {name: 'mars', iso: '2020-10-01T00:00:00Z', retrograde: true},
    {name: 'mars', iso: '2020-12-01T00:00:00Z', retrograde: false},
    // Jupiter retrograde 14 May - 13 September 2020
    {name: 'jupiter', iso: '2020-06-20T00:00:00Z', retrograde: true}
  ]

  cases.forEach(function (expected) {
    t.equal(observe(expected.name, expected.iso).is_retrograde, expected.retrograde,
      expected.name + ' on ' + expected.iso)
  })
  t.end()
})

test('the retrograde flag agrees with the change in longitude over a day', function (t) {
  const dates = ['1900-03-01', '1986-01-01', '2015-08-10', '2020-06-20', '2024-04-05', '2099-12-31']

  dates.forEach(function (day) {
    ephemeris.getBodyNames().forEach(function (name) {
      const now = observe(name, day + 'T12:00:00Z')
      if (now.is_retrograde === undefined) {
        return // stars carry no ecliptic motion
      }

      const start = observe(name, day + 'T00:00:00Z').apparentLongitudeDd
      const end = observe(name, day + 'T23:59:59Z').apparentLongitudeDd
      const moved = ((end - start + 540) % 360) - 180

      t.equal(now.is_retrograde, moved < 0, name + ' on ' + day +
        ' moved ' + moved.toFixed(5) + ' degrees')
    })
  })
  t.end()
})

test('the daily motion has the sign of the retrograde flag', function (t) {
  const result = ephemeris.getAllPlanets(at('2015-08-10T17:09:01.000Z'),
    BERLIN.longitude, BERLIN.latitude, BERLIN.height)

  ephemeris.getBodyNames().forEach(function (name) {
    const observed = result.observed[name]
    if (observed.is_retrograde === undefined) {
      return
    }
    t.equal(observed.apparentLongitudeDdPerDay < 0, observed.is_retrograde,
      name + ' moves ' + observed.apparentLongitudeDdPerDay.toFixed(5) + ' degrees a day')
  })
  t.end()
})

test('results do not depend on the timezone of the host machine', function (t) {
  const script = 'var e = require(' + JSON.stringify(path.join(__dirname, '..')) + ');' +
    'var r = e.getAllPlanets(new Date("2015-08-10T17:09:01.000Z"), 10.0014, 53.5653, 0);' +
    'console.log(Object.keys(r.observed).map(function (k) {' +
    '  return k + " " + r.observed[k].apparentLongitudeDd + " " + r.observed[k].is_retrograde;' +
    '}).join("|"))'

  function runIn (timezone) {
    const env = Object.assign({}, process.env, {TZ: timezone})
    return execFileSync(process.execPath, ['-e', script], {env, encoding: 'utf8'})
  }

  const utc = runIn('UTC')
  t.equal(runIn('Pacific/Kiritimati'), utc, 'same result at UTC+14')
  t.equal(runIn('Pacific/Pago_Pago'), utc, 'same result at UTC-11')
  t.end()
})

/*
 * Rise, set and transit. These are the approximate times transit.js derives
 * analytically; they agree with a bisection on the library's own elevation
 * to within a few seconds, so what is worth guarding is the bookkeeping
 * around them rather than the astronomy.
 */
const HOURS_PER_RADIAN = 12 / Math.PI

function transitOf (iso, longitude, latitude) {
  return ephemeris.getPlanet('sun', at(iso), longitude, latitude, 0)
    .observed.sun.raw.position.altaz.transit
}

test('rise, set and transit are always a time within the day', function (t) {
  const places = [
    ['London', -0.1276, 51.5072],
    ['Nairobi', 36.8219, -1.2921],
    ['Reykjavik', -21.9426, 64.1466],
    ['Wellington', 174.78, -41.29]
  ]
  const fields = [
    'dApproxRiseUT', 'dApproxSetUT', 'dApproxSanatanRiseUT', 'dApproxSanatanSetUT'
  ]

  places.forEach(function (place) {
    // Midnight matters: new Date('2026-04-18') lands exactly here, and the
    // day the times are measured from is a UT day while the instant asked
    // for is terrestrial time.
    ;['2026-04-18T00:00:00Z', '2026-04-18T12:00:00Z', '2026-12-21T00:00:00Z'].forEach(function (iso) {
      const transit = transitOf(iso, place[1], place[2])
      const meridian = transit.UTdate * 2 * Math.PI * HOURS_PER_RADIAN
      t.ok(meridian >= 0 && meridian < 24,
        place[0] + ' ' + iso + ' meridian ' + meridian.toFixed(4) + ' h is within the day')

      fields.forEach(function (field) {
        if (transit[field] === undefined) {
          return // no event that day
        }
        const hours = transit[field] * HOURS_PER_RADIAN
        t.ok(hours >= 0 && hours < 24,
          place[0] + ' ' + iso + ' ' + field + ' ' + hours.toFixed(4) + ' h is within the day')
      })
    })
  })
  t.end()
})

test('rise and set do not depend on the time of day they are asked for', function (t) {
  const noon = transitOf('2026-04-18T12:00:00Z', -0.1276, 51.5072)

  ;['2026-04-18T00:00:00Z', '2026-04-18T03:00:00Z', '2026-04-18T23:00:00Z'].forEach(function (iso) {
    const other = transitOf(iso, -0.1276, 51.5072)
    const rise = Math.abs(other.dApproxRiseUT - noon.dApproxRiseUT) * HOURS_PER_RADIAN * 3600
    const set = Math.abs(other.dApproxSetUT - noon.dApproxSetUT) * HOURS_PER_RADIAN * 3600
    // The times drift by a fraction of a second across the day because the
    // sun really does move; a whole hour apart would mean the day boundary
    // had been mishandled.
    t.ok(rise < 5, iso + ' rise is within 5s of the midday answer, off by ' + rise.toFixed(2) + 's')
    t.ok(set < 5, iso + ' set is within 5s of the midday answer, off by ' + set.toFixed(2) + 's')
  })
  t.end()
})

test('retrograde is only reported where it can happen', function (t) {
  // The sun and the moon are never overtaken by the earth, so they cannot
  // appear to go backwards. Saying false would suggest the question had
  // been asked and answered; there is no answer to give.
  const dates = ['2015-08-10T17:09:01Z', '2020-10-01T00:00:00Z', '2026-04-18T00:00:00Z']

  dates.forEach(function (iso) {
    t.equal(observe('sun', iso).is_retrograde, undefined, 'the sun on ' + iso)
    t.equal(observe('moon', iso).is_retrograde, undefined, 'the moon on ' + iso)
    t.equal(observe('sirius', iso).is_retrograde, undefined, 'a star on ' + iso)

    // but their motion is still reported, and still forwards
    t.ok(observe('sun', iso).apparentLongitudeDdPerDay > 0, 'the sun still moves forwards')
    t.ok(observe('moon', iso).apparentLongitudeDdPerDay > 0, 'the moon still moves forwards')

    // and the planets do get an answer
    t.equal(typeof observe('mars', iso).is_retrograde, 'boolean', 'mars gets an answer')
    t.equal(typeof observe('chiron', iso).is_retrograde, 'boolean', 'chiron gets an answer')
  })
  t.end()
})

test('the sun and the moon only ever move forwards', function (t) {
  // Four centuries of sampling, so nobody is tempted to reintroduce a
  // retrograde flag for them.
  let slowestSun = Infinity
  let slowestMoon = Infinity

  for (let year = 1700; year <= 2100; year += 50) {
    for (let day = 0; day < 365; day += 29) {
      const when = new Date(Date.UTC(year, 0, 1) + day * 86400e3)
      const sun = ephemeris.getPlanet('sun', when, 0, 0, 0).observed.sun
      const moon = ephemeris.getPlanet('moon', when, 0, 0, 0).observed.moon
      slowestSun = Math.min(slowestSun, sun.apparentLongitudeDdPerDay)
      slowestMoon = Math.min(slowestMoon, moon.apparentLongitudeDdPerDay)
    }
  }

  t.ok(slowestSun > 0, 'slowest solar motion seen was ' + slowestSun.toFixed(5) + ' deg/day')
  t.ok(slowestMoon > 0, 'slowest lunar motion seen was ' + slowestMoon.toFixed(5) + ' deg/day')
  t.end()
})

test('a body that never rises or sets reports no rise or set', function (t) {
  const midnightSun = transitOf('2026-06-21T12:00:00Z', 15.6469, 78.2232)
  const polarNight = transitOf('2026-12-21T12:00:00Z', 15.6469, 78.2232)

  t.equal(midnightSun.dApproxRiseUT, undefined, 'no sunrise under the midnight sun')
  t.equal(midnightSun.dApproxSetUT, undefined, 'no sunset under the midnight sun')
  t.equal(polarNight.dApproxRiseUT, undefined, 'no sunrise in the polar night')
  t.equal(polarNight.dApproxSetUT, undefined, 'no sunset in the polar night')
  t.ok(midnightSun.approxLocalMeridian, 'the meridian crossing is still reported')
  t.end()
})

/*
 * Contract tests. These exist to catch a field being dropped or renamed by
 * accident, which a value test would not notice. If one of these fails and
 * the change was deliberate, update the list and say so in the changelog.
 */

const RESULT_KEYS = ['backend', 'date', 'observer', 'observed']

const DATE_KEYS = [
  'gregorianTerrestrial', 'gregorianTerrestrialRaw', 'gregorianUniversal',
  'gregorianDelta', 'julianTerrestrial', 'julianUniversal', 'julianDelta'
]

const TERRESTRIAL_RAW_KEYS = [
  'day', 'month', 'year', 'hours', 'minutes', 'seconds',
  'julianDate', 'julianTime', 'julian', 'j2000', 'b1950', 'j1900',
  'delta', 'terrestrial', 'universal', 'universalDate', 'universalDateString'
]

const OBSERVER_KEYS = [
  'name', 'longitudeGeodetic', 'longitudeGeocentric', 'latitudeGeodetic',
  'latitudeGeocentric', 'heightGeodetic', 'heightGeocentric'
]

const OBSERVED_KEYS = [
  'name', 'available', 'unavailableReason', 'backend', 'raw',
  'apparentLongitudeDms30', 'apparentLongitudeDms360',
  'apparentLongitudeDd', 'apparentLongitudeDdPerDay', 'geocentricDistanceKm',
  'is_retrograde'
]

const BODY_NAMES = [
  'sun', 'mercury', 'venus', 'moon', 'mars', 'jupiter',
  'saturn', 'uranus', 'neptune', 'pluto', 'chiron', 'sirius',
  'rahu', 'ketu', 'trueRahu', 'trueKetu'
]

const MEAN_NODES = ['rahu', 'ketu']
const TRUE_NODES = ['trueRahu', 'trueKetu']
const ALL_NODES = MEAN_NODES.concat(TRUE_NODES)

/** Meeus, Astronomical Algorithms, equation 47.7. */
function meeusMeanNode (julian) {
  const T = (julian - 2451545.0) / 36525
  const omega = 125.0445479 - 1934.1362891 * T + 0.0020754 * T * T +
    T * T * T / 467441 - T * T * T * T / 60616000
  return ((omega % 360) + 360) % 360
}

function separation (a, b) {
  let difference = a - b
  if (difference > 180) {
    difference -= 360
  }
  if (difference <= -180) {
    difference += 360
  }
  return difference
}

test('the result keeps its documented shape', function (t) {
  const result = ephemeris.getAllPlanets(at('2015-08-10T17:09:01Z'),
    BERLIN.longitude, BERLIN.latitude, BERLIN.height)

  t.deepEqual(Object.keys(result).sort(), RESULT_KEYS.slice().sort(), 'top level keys')
  t.deepEqual(Object.keys(result.date).sort(), DATE_KEYS.slice().sort(), 'date keys')
  t.deepEqual(Object.keys(result.date.gregorianTerrestrialRaw).sort(),
    TERRESTRIAL_RAW_KEYS.slice().sort(), 'raw terrestrial date keys')
  t.deepEqual(Object.keys(result.observer).sort(), OBSERVER_KEYS.slice().sort(), 'observer keys')
  t.deepEqual(Object.keys(result.observed), BODY_NAMES, 'bodies, in order')

  BODY_NAMES.forEach(function (name) {
    t.deepEqual(Object.keys(result.observed[name]).sort(), OBSERVED_KEYS.slice().sort(),
      name + ' keys')
  })
  t.end()
})

test('getBodyNames is the documented list', function (t) {
  t.deepEqual(ephemeris.getBodyNames(), BODY_NAMES, 'names, in order')
  t.end()
})

test('the module exports exactly the documented functions', function (t) {
  t.deepEqual(Object.keys(ephemeris).sort(), [
    'astronomyEngine', 'backend', 'backends', 'ephemerisFiles',
    'fetchEphemeris', 'getAllPlanets', 'getBody', 'getBodyNames', 'getPlanet',
    'registerBackend', 'swisseph', 'use'
  ], 'public surface')
  t.end()
})

test('the raw block still carries the internal detail callers read', function (t) {
  const raw = observe('moon', '2015-08-10T17:09:01Z').raw

  t.ok(raw.position, 'position')
  t.ok(raw.position.altaz, 'position.altaz')
  t.ok(raw.position.altaz.topocentric, 'topocentric altitude and azimuth')
  t.ok(raw.position.altaz.transit, 'transit block')
  t.ok(raw.position.altaz.diurnalParallax, 'diurnal parallax')
  t.ok(raw.position.apparentGeocentric, 'apparent geocentric position')
  t.equal(typeof raw.position.altaz.topocentric.altitude, 'number', 'altitude is a number')
  t.equal(typeof raw.position.altaz.transit.approxLocalMeridian, 'object', 'meridian crossing')
  t.end()
})

/*
 * The calculation runs on a shared mutable singleton, so one call leaking
 * into the next is a standing risk. These pin that down.
 */
test('one call does not leak into the next', function (t) {
  const reference = ephemeris.getAllPlanets(at('2015-08-10T17:09:01Z'),
    BERLIN.longitude, BERLIN.latitude, BERLIN.height)
  const fingerprint = JSON.stringify(reference.observed)

  function again (why) {
    const repeat = ephemeris.getAllPlanets(at('2015-08-10T17:09:01Z'),
      BERLIN.longitude, BERLIN.latitude, BERLIN.height)
    t.equal(JSON.stringify(repeat.observed), fingerprint, why)
  }

  again('repeating the same call is stable')

  ephemeris.getPlanet('moon', at('1999-01-01T03:00:00Z'), -120, -40, 5000)
  again('after a single body somewhere else entirely')

  ephemeris.getAllPlanets(at('2200-01-01T00:00:00Z'), 179, 89, 0)
  again('after a far future call near the pole')

  try {
    ephemeris.getPlanet('nibiru', at('2015-08-10T17:09:01Z'), 0, 0, 0)
  } catch {
    // the throw is the point
  }
  again('after a call that threw')
  t.end()
})

test('every body reports finite numbers, everywhere, over four centuries', function (t) {
  function nonFinite (node, prefix, found, depth) {
    if (depth > 8 || node === null || typeof node !== 'object') {
      return found
    }
    Object.keys(node).forEach(function (key) {
      const value = node[key]
      const path = prefix ? prefix + '.' + key : key
      if (typeof value === 'number' && !Number.isFinite(value)) {
        found.push(path + ' = ' + value)
      } else if (typeof value === 'object') {
        nonFinite(value, path, found, depth + 1)
      }
    })
    return found
  }

  const dates = ['1700-06-15', '1900-03-01', '2026-04-18', '2099-12-31']
  const spots = [
    [0, 0], [10.0014, 53.5653], [-71.13, 42.27],
    [15.6469, 78.2232], [174.78, -41.29], [0, 89.9], [0, -89.9], [179.99, 0]
  ]

  dates.forEach(function (day) {
    spots.forEach(function (spot) {
      const iso = day + 'T00:00:00Z' // midnight is the awkward one
      let result
      t.doesNotThrow(function () {
        result = ephemeris.getAllPlanets(at(iso), spot[0], spot[1], 0)
      }, iso + ' at ' + spot[0] + ',' + spot[1] + ' does not throw')

      if (result) {
        const bad = nonFinite(result, '', [], 0)
        t.equal(bad.length, 0, iso + ' at ' + spot[0] + ',' + spot[1] +
          ' is all finite' + (bad.length ? ': ' + bad.slice(0, 3).join(', ') : ''))
      }
    })
  })
  t.end()
})

test('every module under src loads on its own', function (t) {
  const fs = require('fs')
  const path = require('path')
  const root = path.join(__dirname, '..', 'src')
  const files = []

  ;(function walk (dir) {
    fs.readdirSync(dir).forEach(function (entry) {
      const full = path.join(dir, entry)
      if (fs.statSync(full).isDirectory()) {
        walk(full)
      } else if (/\.js$/.test(entry)) {
        files.push(full)
      }
    })
  })(root)

  t.ok(files.length > 30, 'found ' + files.length + ' modules')
  files.forEach(function (file) {
    t.doesNotThrow(function () {
      require(file)
    }, path.relative(root, file) + ' loads')
  })
  t.end()
})

test('requiring an internal module first does not break the package', function (t) {
  // transit and altaz used to import each other, so loading transit before
  // the entry point handed altaz a half built module and blew up with
  // 'transit.calc is not a function'.
  const script = 'require(' + JSON.stringify(path.join(__dirname, '..', 'src', 'astronomy', 'moshier', 'transit')) + ');' +
    'const e = require(' + JSON.stringify(path.join(__dirname, '..')) + ');' +
    'const r = e.getPlanet("sun", new Date("2015-08-10T17:09:01Z"), 10.0014, 53.5653, 0);' +
    'process.stdout.write(r.observed.sun.apparentLongitudeDms360)'

  const direct = observe('sun', '2015-08-10T17:09:01Z').apparentLongitudeDms360
  let loadedFirst

  try {
    loadedFirst = execFileSync(process.execPath, ['-e', script],
      {encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']})
  } catch (error) {
    // Report the crash as a failed assertion rather than letting it take the
    // whole run down, which is what an import cycle regression would do.
    loadedFirst = 'the child process failed: ' +
      String(error.stderr || error.message).split('\n')[0]
  }

  t.equal(loadedFirst, direct, 'same answer whichever module is required first')
  t.end()
})

test('common.copy applies sources so the earliest one wins', function (t) {
  const common = require('../src/common')

  t.deepEqual(common.copy({}, {a: 1, z: 9}, {a: 2, b: 3}, {a: 4, c: 5}),
    {a: 1, b: 3, c: 5, z: 9}, 'first source wins, unlike Object.assign')
  t.deepEqual(common.copy({}, null, {a: 1}), {a: 1}, 'a missing source is skipped')
  t.deepEqual(common.copy({x: 0}, {y: 2}), {x: 0, y: 2}, 'the target is kept and returned')
  t.equal(common.copy(null, {a: 1}), null, 'a falsy target comes back untouched')
  t.end()
})

test('the published package points at its type definitions', function (t) {
  const fs = require('fs')
  const pkg = require('../package.json')

  t.equal(pkg.types, 'index.d.ts', 'types field')
  t.ok(fs.existsSync(path.join(__dirname, '..', pkg.types)), 'the file exists')
  t.ok(pkg.files.indexOf(pkg.types) >= 0, 'and it is in files, so it ships')
  t.ok(pkg.files.indexOf(pkg.main) >= 0, 'as is the entry point')
  t.end()
})

test('maintainer only documentation stays out of the published package', function (t) {
  const fs = require('fs')
  const pkg = require('../package.json')

  // npm renders the README as the package page, so anything shipped is on
  // display to everyone installing the library. CONTRIBUTING.md carries the
  // release runbook and belongs in the repository only.
  const repoOnly = ['CONTRIBUTING.md']

  repoOnly.forEach(function (name) {
    t.ok(fs.existsSync(path.join(__dirname, '..', name)), name + ' exists in the repo')
    t.equal(pkg.files.indexOf(name), -1, name + ' is not in files, so it does not ship')
  })

  const readme = fs.readFileSync(path.join(__dirname, '..', 'README.md'), 'utf8')
  t.equal(readme.indexOf('Trusted publishers'), -1,
    'the shipped README does not carry the release setup')
  t.equal(readme.indexOf('Workflow filename'), -1,
    'nor the workflow name it depends on')
  t.end()
})

test('the changelog ships and the release notes are wired to it', function (t) {
  const fs = require('fs')
  const pkg = require('../package.json')
  const changelogPath = path.join(__dirname, '..', 'CHANGELOG.md')

  t.ok(fs.existsSync(changelogPath), 'CHANGELOG.md exists')
  t.ok(pkg.files.indexOf('CHANGELOG.md') >= 0, 'and ships, unlike CONTRIBUTING.md')

  // The release workflow fills the GitHub Release body from this script. If
  // the version has no entry it prints a pointer instead, which would ship a
  // release with no notes, so check the entry is really there.
  function notesFor (version) {
    return execFileSync(process.execPath,
      [path.join(__dirname, '..', '.github', 'release-notes.js'), version],
      {encoding: 'utf8'}).trim()
  }

  const current = notesFor(pkg.version)
  t.ok(current.length > 0, 'the current version has release notes')
  t.equal(current.indexOf('See CHANGELOG.md'), -1,
    'version ' + pkg.version + ' has a real entry, not the fallback')

  // and every version the changelog claims to document resolves
  const changelog = fs.readFileSync(changelogPath, 'utf8')
  const versions = changelog.split('\n')
    .filter(function (line) { return /^## \d/.test(line) })
    .map(function (line) { return line.replace(/^## /, '').split(' ')[0] })

  t.ok(versions.length >= 5, 'found ' + versions.length + ' documented versions')
  versions.forEach(function (version) {
    const notes = notesFor(version)
    t.equal(notes.indexOf('See CHANGELOG.md'), -1, version + ' resolves to a real entry')
  })

  t.equal(notesFor('9.9.9').indexOf('See CHANGELOG.md'), 0,
    'an undocumented version falls back rather than failing')

  // Not self referential, unlike the loop above: the newest heading has to
  // be the version about to ship, which catches a bump without an entry and
  // an entry written under a mistyped heading.
  t.equal(versions[0], pkg.version,
    'the newest changelog entry is ' + versions[0] + ', the version being released')
  t.end()
})

test('every version that was ever released has a changelog entry', function (t) {
  const fs = require('fs')
  const root = path.join(__dirname, '..')

  // The release workflow tags every publish, so the tags are the record of
  // what actually shipped. The checks above only ever look at versions the
  // changelog already claims, so they cannot notice an entry being renamed
  // away from a version that is out in the world.
  if (!fs.existsSync(path.join(root, '.git'))) {
    t.skip('not a git checkout, so there are no tags to compare against')
    return t.end()
  }

  let tags
  try {
    tags = execFileSync('git', ['tag', '--list', 'v*'],
      {cwd: root, encoding: 'utf8'}).trim()
  } catch {
    t.skip('git is not available here')
    return t.end()
  }

  if (!tags) {
    t.skip('no tags in this checkout, so nothing to compare (needs fetch-depth 0)')
    return t.end()
  }

  const released = tags.split('\n').map(function (tag) { return tag.trim().replace(/^v/, '') })
  const changelog = fs.readFileSync(path.join(root, 'CHANGELOG.md'), 'utf8')
  const documented = changelog.split('\n')
    .filter(function (line) { return /^## \d/.test(line) })
    .map(function (line) { return line.replace(/^## /, '').split(' ')[0] })

  t.ok(released.length > 0, 'found ' + released.length + ' released versions')
  released.forEach(function (version) {
    t.ok(documented.indexOf(version) >= 0,
      version + ' was released, so it is in the changelog')
  })
  t.end()
})

/*
 * Lunar nodes. Rahu and Ketu are points where the moon's orbit crosses the
 * ecliptic, carried as pseudo bodies.
 */

test('the mean node agrees with Meeus over four centuries', function (t) {
  const julian = require('../src/astronomy/moshier/julian')

  for (let year = 1700; year <= 2150; year += 50) {
    const when = new Date(Date.UTC(year, 0, 1, 12))
    const mine = observe('rahu', when.toISOString()).apparentLongitudeDd
    const theirs = meeusMeanNode(julian.calc({
      year, month: 1, day: 1, hours: 12, minutes: 0, seconds: 0
    }))
    const arcsec = Math.abs(separation(mine, theirs)) * 3600

    t.ok(arcsec < 2, year + ': ' + mine.toFixed(5) + ' vs Meeus ' +
      theirs.toFixed(5) + ', ' + arcsec.toFixed(2) + ' arcsec apart')
  }
  t.end()
})

test('the true node is where the moon actually crosses the ecliptic', function (t) {
  // At the instant the moon crosses the ecliptic going north, its longitude
  // is the ascending node. That is the definition, so it is the check.
  function latitude (when) {
    return ephemeris.getPlanet('moon', when, 0, 0, 0)
      .observed.moon.raw.position.polar.latitude
  }
  function longitude (when) {
    const radians = ephemeris.getPlanet('moon', when, 0, 0, 0)
      .observed.moon.raw.position.polar.longitude
    return ((radians * 180 / Math.PI) % 360 + 360) % 360
  }

  const step = 6 * 3600e3
  let previous = latitude(new Date(Date.UTC(2026, 0, 1)))
  let found = 0

  for (let t0 = Date.UTC(2026, 0, 1) + step; t0 < Date.UTC(2026, 11, 31) && found < 6; t0 += step) {
    const current = latitude(new Date(t0))
    if (previous < 0 && current >= 0) {
      let low = t0 - step
      let high = t0
      for (let i = 0; i < 50; i++) {
        const mid = (low + high) / 2
        if (latitude(new Date(mid)) < 0) {
          low = mid
        } else {
          high = mid
        }
      }
      const when = new Date((low + high) / 2)
      const node = ephemeris.getPlanet('trueRahu', when, 0, 0, 0)
        .observed.trueRahu.apparentLongitudeDd
      const arcsec = Math.abs(separation(node, longitude(when))) * 3600

      t.ok(arcsec < 2, when.toISOString().slice(0, 16) + ': trueRahu is ' +
        arcsec.toFixed(2) + ' arcsec from the moon at the crossing')
      found++
    }
    previous = current
  }

  t.equal(found, 6, 'found six northward crossings to check')
  t.end()
})

test('ketu is exactly opposite rahu', function (t) {
  const dates = ['1900-06-15T00:00:00Z', '2026-01-01T00:00:00Z', '2099-11-02T18:30:00Z']

  dates.forEach(function (iso) {
    const result = ephemeris.getAllPlanets(at(iso), 0, 0, 0).observed
    const mean = separation(result.ketu.apparentLongitudeDd, result.rahu.apparentLongitudeDd)
    const real = separation(result.trueKetu.apparentLongitudeDd, result.trueRahu.apparentLongitudeDd)

    t.ok(Math.abs(Math.abs(mean) - 180) < 1e-9, iso + ' ketu is 180 from rahu')
    t.ok(Math.abs(Math.abs(real) - 180) < 1e-9, iso + ' trueKetu is 180 from trueRahu')
  })
  t.end()
})

test('the mean node crawls backwards at a fixed rate', function (t) {
  const dates = ['1850-04-01T00:00:00Z', '2026-01-01T00:00:00Z', '2140-09-09T00:00:00Z']

  dates.forEach(function (iso) {
    MEAN_NODES.forEach(function (name) {
      const node = observe(name, iso)
      t.equal(node.is_retrograde, true, name + ' is retrograde on ' + iso)
      t.ok(Math.abs(node.apparentLongitudeDdPerDay - -0.052954) < 1e-4,
        name + ' moves ' + node.apparentLongitudeDdPerDay.toFixed(6) + ' deg/day')
    })
  })
  t.end()
})

test('the true node wobbles around the mean and sometimes goes direct', function (t) {
  let direct = 0
  let samples = 0
  let widest = 0

  for (let day = 0; day < 400; day += 3) {
    const when = new Date(Date.UTC(2026, 0, 1) + day * 86400e3)
    const result = ephemeris.getAllPlanets(when, 0, 0, 0).observed
    widest = Math.max(widest, Math.abs(separation(
      result.trueRahu.apparentLongitudeDd, result.rahu.apparentLongitudeDd)))
    if (!result.trueRahu.is_retrograde) {
      direct++
    }
    samples++
  }

  t.ok(direct > 0, 'trueRahu was direct in ' + direct + ' of ' + samples + ' samples')
  t.ok(direct < samples, 'and retrograde in the rest')
  t.ok(widest > 0.5 && widest < 3,
    'it strayed at most ' + widest.toFixed(4) + ' degrees from the mean node')
  t.end()
})

test('nodes are directions, so they carry no distance and no altaz', function (t) {
  ALL_NODES.forEach(function (name) {
    const node = observe(name, '2026-01-01T00:00:00Z')

    t.equal(node.geocentricDistanceKm, -1, name + ' has the no-distance sentinel')
    t.equal(node.raw.position.altaz, undefined, name + ' has no altitude or azimuth')
    t.equal(node.raw.position.polar, undefined, name + ' has no rectangular position')
    t.ok(node.apparentLongitudeDms360.length > 0, name + ' still has a longitude string')
  })
  t.end()
})

test('adding the nodes left the other bodies alone', function (t) {
  // The true node computes the moon at three epochs. If that leaked into the
  // moon's own entry this would move.
  const result = ephemeris.getAllPlanets(at('2015-08-10T17:09:01Z'),
    BERLIN.longitude, BERLIN.latitude, BERLIN.height)

  t.equal(result.observed.moon.apparentLongitudeDms360, '92°41\'17"', 'moon unchanged')
  t.equal(result.observed.sun.apparentLongitudeDms360, '137°45\'39"', 'sun unchanged')
  t.equal(result.observed.moon.apparentLongitudeDd, 92.68823373136327, 'moon to full precision')
  t.ok(result.observed.moon.raw.position.altaz.transit, 'moon still has its transit block')
  t.end()
})

/*
 * Backends. The engines behind the optional ones are not dependencies, so
 * whatever is installed here is what gets exercised. Moshier is always
 * present, and the conformance block runs over everything available.
 */

test('a star reports degrees, like every other body', function (t) {
  // star.js keeps apparentLongitude as right ascension in radians while
  // everything else keeps ecliptic longitude in degrees. The backend
  // converts, and the dms strings are the check: they were right before the
  // backend split and have to stay right.
  const sirius = observe('sirius', '2015-08-10T17:09:01Z')

  t.equal(sirius.apparentLongitudeDms360, '101\u00B027\'17"', 'dms over the circle')
  t.equal(sirius.apparentLongitudeDms30, '11\u00B027\'17"', 'dms within the sign')
  t.ok(sirius.apparentLongitudeDd > 100 && sirius.apparentLongitudeDd < 102,
    'the decimal value is degrees, ' + sirius.apparentLongitudeDd.toFixed(4) + ', not radians')

  // and the decimal agrees with the string it is printed next to
  const fromString = parseInt(sirius.apparentLongitudeDms360, 10)
  t.equal(Math.floor(sirius.apparentLongitudeDd), fromString,
    'the decimal and the dms string describe the same angle')
  t.end()
})

test('the three backends are registered, whether or not their engine is here', function (t) {
  const listed = ephemeris.backends()
  const names = listed.map(function (b) { return b.name }).sort()

  t.deepEqual(names, ['astronomy-engine', 'moshier', 'swisseph'], 'all three listed')
  t.equal(ephemeris.backend(), 'moshier', 'moshier is the default')

  listed.forEach(function (b) {
    t.equal(typeof b.available, 'boolean', b.name + ' declares availability')
    t.ok(Array.isArray(b.bodies) && b.bodies.length > 0, b.name + ' declares its bodies')
    if (!b.available) {
      t.ok(b.unavailableReason && b.unavailableReason.length > 0,
        b.name + ' says why not: ' + b.unavailableReason)
    }
  })

  const moshier = listed.filter(function (b) { return b.name === 'moshier' })[0]
  t.equal(moshier.available, true, 'the built in backend is always available')
  t.equal(moshier.engine, null, 'and needs no package')
  t.ok(moshier.range && moshier.range.from < moshier.range.to, 'and declares a range')
  t.end()
})

test('choosing a backend that is not here fails loudly', function (t) {
  t.throws(function () {
    ephemeris.use('nope')
  }, /No backend named "nope"/, 'an unknown name')

  const missing = ephemeris.backends().filter(function (b) { return !b.available })
  missing.forEach(function (b) {
    t.throws(function () {
      ephemeris.use(b.name)
    }, /is not usable/, b.name + ' refuses rather than silently using another engine')
  })

  t.equal(ephemeris.backend(), 'moshier', 'a failed switch leaves the selection alone')
  t.end()
})

test('an unavailable body is templated, not thrown', function (t) {
  // Ask the built in backend for something only Swiss Ephemeris could do.
  const result = ephemeris.getBody({asteroid: 433}, at('2026-01-01T00:00:00Z'), 0, 0, 0)
  const entry = result.observed['asteroid:433']

  t.ok(entry, 'the entry exists under a readable key')
  t.equal(entry.available, false, 'flagged unavailable')
  t.ok(entry.unavailableReason.length > 0, 'with a reason: ' + entry.unavailableReason)
  t.equal(entry.apparentLongitudeDd, null, 'no longitude is invented')
  t.equal(entry.is_retrograde, null, 'nor a retrograde flag')
  t.equal(entry.backend, 'moshier', 'and it names the backend that could not do it')

  // The template must be shape compatible, or callers have to special case it.
  const real = result.observed['asteroid:433']
  const known = ephemeris.getPlanet('mars', at('2026-01-01T00:00:00Z'), 0, 0, 0).observed.mars
  t.deepEqual(Object.keys(real).sort(), Object.keys(known).sort(),
    'the template carries the same keys as a real body')
  t.end()
})

test('getBody takes names, specs, and lists of either', function (t) {
  const when = at('2026-01-01T00:00:00Z')

  const one = ephemeris.getBody('mars', when, 0, 0, 0)
  t.equal(one.observed.mars.available, true, 'a plain name works')

  const many = ephemeris.getBody(['mars', {asteroid: 433}, {star: 'Aldebaran'}], when, 0, 0, 0)
  t.deepEqual(Object.keys(many.observed), ['mars', 'asteroid:433', 'star:Aldebaran'],
    'each spec gets a readable key')
  t.equal(many.observed.mars.available, true, 'the known one resolves')
  t.equal(many.observed['star:Aldebaran'].available, false, 'the unknown one is templated')

  t.throws(function () {
    ephemeris.getBody(42, when, 0, 0, 0)
  }, /named by a string, or described by an object/, 'a nonsense spec is rejected')
  t.end()
})

test('getPlanet still refuses names outside the catalogue', function (t) {
  t.throws(function () {
    ephemeris.getPlanet('asteroid:433', at('2026-01-01T00:00:00Z'), 0, 0, 0)
  }, /use getBody/, 'and points at the generic call')
  t.end()
})

test('every available backend meets the same contract', function (t) {
  const when = at('2026-01-01T00:00:00Z')
  const available = ephemeris.backends().filter(function (b) { return b.available })
  const reference = {}

  t.ok(available.length >= 1, available.length + ' backend(s) available to check')

  available.forEach(function (info) {
    ephemeris.use(info.name)
    const result = ephemeris.getAllPlanets(when, BERLIN.longitude, BERLIN.latitude, 0)

    t.equal(result.backend, info.name, info.name + ' names itself in the result')
    t.deepEqual(Object.keys(result.observed), BODY_NAMES,
      info.name + ' returns the whole catalogue, available or not')
    t.deepEqual(Object.keys(result).sort(), RESULT_KEYS.slice().sort(),
      info.name + ' keeps the envelope')

    BODY_NAMES.forEach(function (name) {
      const entry = result.observed[name]
      t.deepEqual(Object.keys(entry).sort(), OBSERVED_KEYS.slice().sort(),
        info.name + ' ' + name + ' has the standard keys')

      if (!entry.available) {
        return
      }
      t.ok(entry.apparentLongitudeDd >= 0 && entry.apparentLongitudeDd < 360,
        info.name + ' ' + name + ' longitude is in range')
      t.ok(/^\d+°\d+'\d+"$/.test(entry.apparentLongitudeDms360),
        info.name + ' ' + name + ' has a well formed dms string')
      if (entry.is_retrograde !== undefined && entry.is_retrograde !== null) {
        t.equal(entry.is_retrograde, entry.apparentLongitudeDdPerDay < 0,
          info.name + ' ' + name + ' retrograde matches the sign of its motion')
      }

      // Backends should agree with each other to well under a degree.
      if (reference[name] === undefined) {
        reference[name] = entry.apparentLongitudeDd
      } else {
        let apart = entry.apparentLongitudeDd - reference[name]
        if (apart > 180) { apart -= 360 }
        if (apart <= -180) { apart += 360 }
        t.ok(Math.abs(apart) < 0.1, info.name + ' ' + name + ' is within 0.1 deg of the first backend, ' +
          (apart * 3600).toFixed(1) + ' arcsec')
      }
    })
  })

  ephemeris.use('moshier')
  t.end()
})

/*
 * Fetching the Swiss Ephemeris data files. Nothing here touches the network:
 * these check the catalogue, the pinning and the guards around it.
 */

test('the ephemeris file catalogue is pinned and checksummed', function (t) {
  const ephe = ephemeris.ephemerisFiles

  t.ok(/^[0-9a-f]{40}$/.test(ephe.commit), 'pinned to a commit, not a branch')
  t.ok(ephe.baseUrl.indexOf(ephe.commit) > 0, 'the base url carries that commit')
  t.ok(ephe.defaultFiles.length >= 4, ephe.defaultFiles.length + ' files listed')

  ephe.defaultFiles.forEach(function (name) {
    const entry = ephe.files[name]
    t.ok(entry.purpose && entry.purpose.length > 0, name + ' says what it is for')
    t.ok(entry.bytes > 1000, name + ' declares a size')
    t.ok(/^[0-9a-f]{64}$/.test(entry.sha256), name + ' has a sha256')
    t.equal(ephe.urlFor(name), ephe.baseUrl + '/' + name, name + ' resolves to a pinned url')
  })

  const mb = ephe.totalBytes() / 1048576
  t.ok(mb > 1 && mb < 4, 'the whole set is ' + mb.toFixed(1) + ' MB')

  t.throws(function () {
    ephe.urlFor('nope.se1')
  }, /Unknown ephemeris file/, 'an unknown file is refused')
  t.end()
})

test('fetching refuses an unknown file before doing anything', function (t) {
  // The name check has to happen before the directory is created, or a typo
  // leaves an empty folder behind.
  const fs = require('fs')
  const target = path.join(__dirname, '..', 'should-not-exist-ephe')

  ephemeris.fetchEphemeris({ephePath: target, files: ['nope.se1']})
    .then(function () {
      t.fail('it should have refused')
      t.end()
    })
    .catch(function (error) {
      t.ok(/Unknown ephemeris file/.test(error.message), 'refused: ' + error.message.slice(0, 40))
      t.equal(fs.existsSync(target), false, 'and created no directory')
      t.end()
    })
})

test('asking before downloading', function (t) {
  const fs = require('fs')
  const scratch = path.join(__dirname, '..', 'test-ephe-scratch')
  fs.rmSync(scratch, {recursive: true, force: true})

  // Declining must leave nothing behind, and must say how to do it by hand.
  ephemeris.fetchEphemeris({
    ephePath: scratch,
    files: ['sefstars.txt'],
    prompt: true,
    confirm: function () { return Promise.resolve(false) }
  }).then(function () {
    t.fail('it downloaded despite being refused')
    t.end()
  }).catch(function (error) {
    t.ok(/Not downloading/.test(error.message), 'refused')
    t.ok(/ephemeris-fetch-ephe/.test(error.message), 'and names the command instead')
    t.equal(fs.existsSync(scratch), false, 'creating no directory')
    t.end()
  })
})

test('with no terminal it refuses rather than hanging or assuming yes', function (t) {
  const fs = require('fs')
  const scratch = path.join(__dirname, '..', 'test-ephe-scratch-tty')
  fs.rmSync(scratch, {recursive: true, force: true})

  // The default confirm returns false without a tty, which is the case in
  // CI, in a server, and in any spawned process. Anything else would hang a
  // build. Tests run without a tty, so this is that path.
  t.equal(!!process.stdin.isTTY, false, 'the suite itself has no terminal')

  ephemeris.fetchEphemeris({ephePath: scratch, files: ['sefstars.txt'], prompt: true})
    .then(function () {
      t.fail('it downloaded without anyone agreeing')
      t.end()
    })
    .catch(function (error) {
      t.ok(/Not downloading/.test(error.message), 'refused with: ' + error.message.slice(0, 34))
      t.equal(fs.existsSync(scratch), false, 'and downloaded nothing')
      t.end()
    })
})

test('the fetch command ships and is wired up', function (t) {
  const fs = require('fs')
  const pkg = require('../package.json')
  const binPath = pkg.bin['ephemeris-fetch-ephe']

  t.ok(binPath, 'package.json declares the command')
  t.ok(fs.existsSync(path.join(__dirname, '..', binPath)), 'and the file is there')
  t.ok(pkg.files.indexOf('bin') >= 0, 'and bin/ ships')

  const help = execFileSync(process.execPath, [path.join(__dirname, '..', binPath), '--help'],
    {encoding: 'utf8'})
  t.ok(help.indexOf('ephemeris-fetch-ephe') >= 0, 'help names the command')
  t.ok(help.indexOf('AGPL') >= 0, 'and states the licence of what it downloads')
  ephemeris.ephemerisFiles.defaultFiles.forEach(function (name) {
    t.ok(help.indexOf(name) >= 0, 'help lists ' + name)
  })
  t.end()
})

test('nothing downloads on its own', function (t) {
  const pkg = require('../package.json')
  const hooks = ['preinstall', 'install', 'postinstall', 'prepare']

  hooks.forEach(function (hook) {
    t.equal(pkg.scripts[hook], undefined,
      'no ' + hook + ' script, so installing never reaches the network')
  })

  // and the calculation path must not mention fetch at all
  const fs = require('fs')
  const core = fs.readFileSync(path.join(__dirname, '..', 'src', 'backends', 'swisseph.js'), 'utf8')
  t.equal(/\bfetch\s*\(/.test(core), false, 'the backend never downloads during a calculation')
  t.end()
})
