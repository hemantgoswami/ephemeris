'use strict'

/**
 * Swiss Ephemeris, through the `sweph` bindings.
 *
 * Not a dependency of this package. Install it yourself:
 *
 *   npm install sweph
 *
 * Licensing matters here. Swiss Ephemeris is AGPL-3.0 or a paid commercial
 * licence from Astrodienst, which is stricter than this package's GPL-3.0
 * and reaches hosted services. Installing sweph is the point at which that
 * applies to you, which is exactly why it is not installed for you.
 *
 * Without data files sweph runs in Moshier mode, which is the same theory
 * the built in backend uses, so it buys nothing. Point `ephePath` at a
 * directory of .se1 files for the JPL accuracy that makes it worthwhile.
 * Roughly 1.9 MB covers 1800 to 2400.
 */

const CANONICAL = {
  sun: 'SE_SUN',
  mercury: 'SE_MERCURY',
  venus: 'SE_VENUS',
  moon: 'SE_MOON',
  mars: 'SE_MARS',
  jupiter: 'SE_JUPITER',
  saturn: 'SE_SATURN',
  uranus: 'SE_URANUS',
  neptune: 'SE_NEPTUNE',
  pluto: 'SE_PLUTO',
  chiron: 'SE_CHIRON',
  rahu: 'SE_MEAN_NODE',
  ketu: 'SE_MEAN_NODE',
  trueRahu: 'SE_TRUE_NODE',
  trueKetu: 'SE_TRUE_NODE'
}

const OPPOSITE = ['ketu', 'trueKetu']
const AU_IN_KM = 149597870.7

function load () {
  try {
    return {module: require('sweph'), error: null}
  } catch (error) {
    // Just the first line; a module-not-found carries a whole require stack.
    return {module: null, error: String(error.message).split('\n')[0]}
  }
}

module.exports = function swisseph (options) {
  const settings = options || {}
  const loaded = load()
  const sweph = loaded.module

  if (sweph && settings.ephePath) {
    sweph.set_ephe_path(settings.ephePath)
  }

  const constants = sweph ? sweph.constants : {}
  // Without data files the only mode that works is Moshier, and asking for
  // the file backed one would fall back to it silently.
  const flags = sweph
    ? (settings.ephePath ? constants.SEFLG_SWIEPH : constants.SEFLG_MOSEPH) | constants.SEFLG_SPEED
    : 0

  return {
    name: 'swisseph',
    engine: 'sweph',
    available: !!sweph,
    unavailableReason: sweph ? null : 'the sweph package is not installed: ' + loaded.error,
    bodies: Object.keys(CANONICAL).concat(['sirius']),
    // DE431 through sweph, far wider than anything else here.
    range: {from: -3026604.5, to: 7857139.5},

    supports: function (spec) {
      if (!sweph) {
        return false
      }
      if (spec.name) {
        return spec.name === 'sirius' || Object.prototype.hasOwnProperty.call(CANONICAL, spec.name)
      }
      return spec.asteroid !== undefined || spec.star !== undefined || spec.id !== undefined
    },

    calc: function (date, spec) {
      if (!this.supports(spec)) {
        return null
      }

      if (spec.star || spec.name === 'sirius') {
        const star = spec.star || 'Sirius'
        const found = sweph.fixstar2_ut(star, date.universal, flags)
        // A missing sefstars.txt comes back as flag -1 with a row of zeroes
        // rather than as a thrown error, so check the flag, not just data.
        if (!found.data || found.error || found.flag < 0) {
          return {error: found.error || 'Swiss Ephemeris could not resolve the star ' + star}
        }
        return {
          longitude: found.data[0],
          motion: undefined,
          distance: -1,
          raw: found
        }
      }

      let id
      if (spec.name) {
        id = constants[CANONICAL[spec.name]]
      } else if (spec.asteroid !== undefined) {
        id = constants.SE_AST_OFFSET + spec.asteroid
      } else {
        id = spec.id
      }

      const result = sweph.calc(date.julian, id, flags)
      // Same again: a missing data file yields a value and an error, and in
      // some modes silently falls back to Moshier. Refuse both.
      if (!result.data || result.error || result.flag < 0) {
        return {error: result.error || 'Swiss Ephemeris returned no data for this body'}
      }

      let longitude = result.data[0]
      if (spec.name && OPPOSITE.indexOf(spec.name) >= 0) {
        longitude = (longitude + 180) % 360
      }

      return {
        longitude,
        motion: result.data[3],
        distance: result.data[2] > 0 ? result.data[2] * AU_IN_KM : -1,
        raw: result
      }
    }
  }
}
