const constant = require('./constant')
const gplan = require('./gplan')
const util = require('./util')

/**
 * The lunar nodes: the two points where the moon's orbit crosses the
 * ecliptic. They are directions, not bodies, so they carry a longitude and
 * nothing else.
 *
 * The ascending node going north is Rahu, the descending node is Ketu, and
 * the two are exactly 180 degrees apart by definition.
 *
 * Longitudes are tropical, geocentric, of date, matching every other
 * longitude the library reports. Sidereal work needs an ayanamsa subtracted
 * and there is none here.
 */
const node = {}

/**
 * Interval, in days, for the central difference that gives the moon's
 * velocity. Only the orientation of the orbital plane matters, so the
 * answer is stable to well under an arcsecond anywhere from 0.001 to 0.5.
 */
const VELOCITY_STEP_DAYS = 0.02

function normalise (degrees) {
  return ((degrees % 360) + 360) % 360
}

/**
 * Mean node. gplan already derives the moon's mean longitude L and its mean
 * distance from the ascending node F, both in arcseconds, so the mean
 * ascending node is L - F.
 */
function meanAscending (date) {
  gplan.meanElements(date)
  return normalise((gplan.LP_equinox - gplan.NF_arcsec) / 3600)
}

/** Geometric geocentric ecliptic position of the moon, as a vector. */
function moonVector (julianDate) {
  const pol = {}
  gplan.moon({julian: julianDate}, {}, pol)
  const cosLatitude = Math.cos(pol.latitude)
  return [
    pol.distance * cosLatitude * Math.cos(pol.longitude),
    pol.distance * cosLatitude * Math.sin(pol.longitude),
    pol.distance * Math.sin(pol.latitude)
  ]
}

/**
 * True, or osculating, node: the ascending node of the plane the moon is
 * travelling in at this instant. The angular momentum r x v is normal to
 * that plane, so the node lies along z x (r x v).
 */
function trueAscending (date) {
  const before = moonVector(date.julian - VELOCITY_STEP_DAYS)
  const after = moonVector(date.julian + VELOCITY_STEP_DAYS)
  // Finish on the requested date so gplan is left where the caller expects.
  const here = moonVector(date.julian)

  const velocity = [
    after[0] - before[0],
    after[1] - before[1],
    after[2] - before[2]
  ]
  const momentum = [
    here[1] * velocity[2] - here[2] * velocity[1],
    here[2] * velocity[0] - here[0] * velocity[2],
    here[0] * velocity[1] - here[1] * velocity[0]
  ]

  return normalise(Math.atan2(momentum[0], -momentum[1]) * constant.RTD)
}

const ASCENDING = {
  meanAscending,
  meanDescending: meanAscending,
  trueAscending,
  trueDescending: trueAscending
}

const DESCENDING = ['meanDescending', 'trueDescending']

node.calc = function (date, body) {
  let longitude = ASCENDING[body.lunarNode](date)

  if (DESCENDING.indexOf(body.lunarNode) >= 0) {
    longitude = normalise(longitude + 180)
  }

  const dms = util.dms(longitude * constant.DTR)

  body.position = body.position || {}
  body.position.apparentLongitude = longitude
  body.position.apparentLongitudeString =
    dms.degree + '\u00B0' +
    dms.minutes + '\'' +
    Math.floor(dms.seconds) + '"'
  body.position.apparentLongitude30String =
    util.mod30(dms.degree) + '\u00B0' +
    dms.minutes + '\'' +
    Math.floor(dms.seconds) + '"'

  // A node is a direction, so there is nothing to be a distance from.
  body.position.geocentricDistance = -1
}

module.exports = node
