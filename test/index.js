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
    {name: 'jupiter', iso: '2020-06-20T00:00:00Z', retrograde: true},
    // The sun and the moon never go retrograde as seen from the earth
    {name: 'sun', iso: '2020-10-01T00:00:00Z', retrograde: false},
    {name: 'moon', iso: '2020-10-01T00:00:00Z', retrograde: false}
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
