var common = require('../../common')
var altaz = require('./altaz')
var body = require('./body')
var constant = require('./constant')
var constellation = require('./constellation')
var epsilon = require('./epsilon')
var kepler = require('./kepler')
var lonlat = require('./lonlat')
var nutation = require('./nutation')
var precess = require('./precess')
var util = require('./util')

var sun = {}

sun.calc = function () {
  var t // double

  body.sun.position = body.sun.position || {}

  /* Display ecliptic longitude and latitude. */
  var ecr = {
    longitude: -body.earth.position.rect.longitude,
    latitude: -body.earth.position.rect.latitude,
    distance: -body.earth.position.rect.distance
  }

  var pol = body.sun.position.equinoxEclipticLonLat = lonlat.calc(ecr, body.earth.position.date, true) // TDT

  /* Philosophical note: the light time correction really affects
   * only the Sun's barycentric position; aberration is due to
   * the speed of the Earth.  In Newtonian terms the aberration
   * is the same if the Earth is standing still and the Sun moving
   * or vice versa.  Thus the following is actually wrong, but it
   * differs from relativity only in about the 8th decimal.
   * It should be done the same way as the corresponding planetary
   * correction, however.
   */
  pol.distance = body.earth.position.polar.distance // eapolar[2];
  for (var i = 0; i < 2; i++) {
    t = pol.distance / 173.1446327
    /* Find the earth at time TDT - t */
    kepler.calc({julian: body.earth.position.date.julian - t}, body.earth, ecr, pol)
  }

  /* position t days ago */
  ecr = {
    longitude: -ecr.longitude,
    latitude: -ecr.latitude,
    distance: -ecr.distance
  }

  /* position now */
  var rec = {
    longitude: -body.earth.position.rect.longitude, // -rearth[0];
    latitude: -body.earth.position.rect.latitude, // -rearth[1];
    distance: -body.earth.position.rect.distance // -rearth[2];
  }

  /* change in position */
  pol = {
    longitude: rec.longitude - ecr.longitude,
    latitude: rec.latitude - ecr.latitude,
    distance: rec.distance - ecr.distance
  }

  common.copy(body.sun.position, {
    date: body.earth.position.date,
    lightTime: 1440 * t,
    aberration: util.showcor(ecr, pol)
  })

  /* Estimate rate of change of RA and Dec
   * for use by altaz().
   */
  var d = util.deltap(ecr, rec)
  /* see util.dms() */
  constant.dradt = d.dr
  constant.ddecdt = d.dd
  constant.dradt /= t
  constant.ddecdt /= t

  /* There is no light deflection effect.
   * AA page B39.
   */

  /* precess to equinox of date */
  precess.calc(ecr, body.earth.position.date, -1)

  rec = {
    longitude: ecr.longitude,
    latitude: ecr.latitude,
    distance: ecr.distance
  }

  /* Nutation */
  epsilon.calc(body.earth.position.date)
  nutation.calc(body.earth.position.date, ecr)

  /* Display the final apparent R.A. and Dec.
   * for equinox of date.
   */
  body.sun.position.constellation = constellation.calc(ecr, body.earth.position.date)

  body.sun.position.apparent = util.showrd(ecr, pol)

  /* Show it in ecliptic coordinates */
  var y = epsilon.coseps * rec.latitude + epsilon.sineps * rec.distance
  y = util.zatan2(rec.longitude, y) + nutation.nutl
  body.sun.position.apparentLongitude = constant.RTD * y
  var dmsLongitude = util.dms(y)
  body.sun.position.apparentLongitudeString =
    dmsLongitude.degree + '\u00B0' +
    dmsLongitude.minutes + '\'' +
    Math.floor(dmsLongitude.seconds) + '"'

  body.sun.position.apparentLongitude30String =
    util.mod30(dmsLongitude.degree) + '\u00B0' +
    dmsLongitude.minutes + '\'' +
    Math.floor(dmsLongitude.seconds) + '"'

  body.sun.position.geocentricDistance = -1

  /* Report altitude and azimuth */
  body.sun.position.altaz = altaz.calc(pol, body.earth.position.date)
}

module.exports = sun
