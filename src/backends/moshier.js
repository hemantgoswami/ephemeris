'use strict'

/**
 * The built in backend: Moshier's analytic theory, the engine this package
 * has always used. No dependencies, no data files, works in a browser.
 *
 * Accuracy is Moshier's, roughly an arcsecond against JPL over the modern
 * era and degrading outside it. The range below is the window the theory is
 * meant for; it will return numbers outside it without complaint, which is
 * why the range is declared rather than left null.
 */

const bodyTable = require('../astronomy/moshier/body')
const constant = require('../astronomy/moshier/constant')
const processor = require('../astronomy/moshier/processor')

const NOT_OBSERVABLE = ['earth', 'init']

function names () {
  return Object.keys(bodyTable).filter(function (name) {
    return NOT_OBSERVABLE.indexOf(name) < 0
  })
}

const moshier = {
  name: 'moshier',
  engine: null,
  available: true,
  unavailableReason: null,
  bodies: names(),
  // 1600 to 2200 as julian days. Moshier fitted the theory to this window.
  range: {from: 2305447.5, to: 2524593.5},

  supports: function (spec) {
    return !!spec.name && this.bodies.indexOf(spec.name) >= 0
  },

  calc: function (date, spec) {
    if (!this.supports(spec)) {
      return null
    }

    const target = bodyTable[spec.name]
    constant.body = target
    processor.calcWithMotion(date, target)

    // star.js stores apparentLongitude as right ascension in radians, while
    // every other body stores ecliptic longitude in degrees. The backend
    // contract is degrees, so convert. See the known gap in CONTRIBUTING:
    // the underlying quantity for a star is still right ascension, not an
    // ecliptic longitude, which is a separate and older problem.
    const longitude = target.raMotion
      ? target.position.apparentLongitude * constant.RTD
      : target.position.apparentLongitude

    return {
      longitude,
      motion: target.position.apparentLongitudeMotion,
      distance: target.position.geocentricDistance,
      raw: target
    }
  }
}

module.exports = moshier
