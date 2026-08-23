'use strict'

/**
 * astronomy-engine, by Don Cross.
 *
 * Not a dependency of this package. Install it yourself:
 *
 *   npm install astronomy-engine
 *
 * MIT licensed, so unlike Swiss Ephemeris it adds no copyleft obligations,
 * and it is pure JavaScript so it works in a browser. The trade is coverage:
 * the sun, the moon and the planets only. No Chiron, no fixed stars, no
 * asteroids, and no nodes as bodies. Those come back as unavailable rather
 * than as wrong numbers.
 *
 * Measured against the built in backend it agrees to within about 12
 * arcseconds, which is 0.003 degrees.
 */

const CANONICAL = {
  sun: 'Sun',
  mercury: 'Mercury',
  venus: 'Venus',
  moon: 'Moon',
  mars: 'Mars',
  jupiter: 'Jupiter',
  saturn: 'Saturn',
  uranus: 'Uranus',
  neptune: 'Neptune',
  pluto: 'Pluto'
}

const AU_IN_KM = 149597870.7
// Sampled either side of the instant to get the rate of change, since
// astronomy-engine reports position rather than speed in longitude.
const MOTION_STEP_DAYS = 0.02

function load () {
  try {
    return {module: require('astronomy-engine'), error: null}
  } catch (error) {
    // Just the first line; a module-not-found carries a whole require stack.
    return {module: null, error: String(error.message).split('\n')[0]}
  }
}

module.exports = function astronomyEngine () {
  const loaded = load()
  const engine = loaded.module

  function longitudeAt (body, julianUT) {
    // astronomy-engine counts days from J2000 in universal time.
    const time = engine.MakeTime(julianUT - 2451545.0)
    const vector = engine.GeoVector(body, time, true)
    const ecliptic = engine.Ecliptic(vector)
    return {longitude: ecliptic.elon, distance: vector.Length()}
  }

  return {
    name: 'astronomy-engine',
    engine: 'astronomy-engine',
    available: !!engine,
    unavailableReason: engine
      ? null
      : 'the astronomy-engine package is not installed: ' + loaded.error,
    bodies: Object.keys(CANONICAL),
    // The library documents 1700 to 2200 as its well tested span.
    range: {from: 2341972.5, to: 2524593.5},

    supports: function (spec) {
      return !!engine && !!spec.name && Object.prototype.hasOwnProperty.call(CANONICAL, spec.name)
    },

    calc: function (date, spec) {
      if (!this.supports(spec)) {
        return null
      }

      const body = engine.Body[CANONICAL[spec.name]]
      const here = longitudeAt(body, date.universal)
      const before = longitudeAt(body, date.universal - MOTION_STEP_DAYS)
      const after = longitudeAt(body, date.universal + MOTION_STEP_DAYS)

      let moved = (after.longitude - before.longitude) % 360
      if (moved > 180) {
        moved -= 360
      }
      if (moved <= -180) {
        moved += 360
      }

      return {
        longitude: here.longitude,
        motion: moved / (2 * MOTION_STEP_DAYS),
        distance: here.distance * AU_IN_KM,
        raw: here
      }
    }
  }
}
