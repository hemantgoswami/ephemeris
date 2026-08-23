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

const RESULT_KEYS = ['date', 'observer', 'observed']

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
  'name', 'raw', 'apparentLongitudeDms30', 'apparentLongitudeDms360',
  'apparentLongitudeDd', 'apparentLongitudeDdPerDay', 'geocentricDistanceKm',
  'is_retrograde'
]

const BODY_NAMES = [
  'sun', 'mercury', 'venus', 'moon', 'mars', 'jupiter',
  'saturn', 'uranus', 'neptune', 'pluto', 'chiron', 'sirius'
]

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
  t.deepEqual(Object.keys(ephemeris).sort(),
    ['getAllPlanets', 'getBodyNames', 'getPlanet'], 'public surface')
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
