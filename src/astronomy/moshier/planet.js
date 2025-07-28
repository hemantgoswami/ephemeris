var aberration = require('./aberration')
var altaz = require('./altaz')
var constant = require('./constant')
var constellation = require('./constellation')
var deflection = require('./deflection')
var epsilon = require('./epsilon')
var kepler = require('./kepler')
var light = require('./light')
var lonlat = require('./lonlat')
var nutation = require('./nutation')
var precess = require('./precess')
var util = require('./util')

var moshier = {
  body: require('./body')
}

var planet = {}

planet.calc = function (body) {
  this.prepare(body)

  /* calculate heliocentric position of the object */
  kepler.calc(moshier.body.earth.position.date, body)
  /* apply correction factors and print apparent place */
  this.reduce(body, body.position.rect, moshier.body.earth.position.rect)
}

/**
 * The following program reduces the heliocentric equatorial
 * rectangular coordinates of the earth and object that
 * were computed by kepler() and produces apparent geocentric
 * right ascension and declination.
 */
planet.reduce = function (body, q, e) {
  /* Save the geometric coordinates at TDT */
  var temp = {
    longitude: q.longitude,
    latitude: q.latitude,
    distance: q.distance
  }

  /* Display ecliptic longitude and latitude, precessed to equinox
   of date. */
  var polar = body.equinoxEclipticLonLat = lonlat.calc(q, moshier.body.earth.position.date, true)

  /* Adjust for light time (planetary aberration) */
  light.calc(body, q, e)

  /* Find Euclidean vectors between earth, object, and the sun */
  var p = {
    longitude: q.longitude - e.longitude,
    latitude: q.latitude - e.latitude,
    distance: q.distance - e.distance
  }

  util.angles(p, q, e)

  var b = temp.longitude - e.longitude
  var a = b * b
  b = temp.latitude - e.latitude
  a += b * b
  b = temp.distance - e.distance
  a += b * b
  body.position.trueGeocentricDistance = Math.sqrt(a)

  /* was EO */
  body.position.equatorialDiameter = 2 * body.semiDiameter / constant.EO

  /* Calculate visual magnitude.
   * "Visual" refers to the spectrum of visible light.
   * Phase = 0.5(1+pq) = geometric fraction of disc illuminated.
   * where pq = cos( sun-object-earth angle )
   * The magnitude is
   *    V(1,0) + 2.5 log10( SE^2 SO^2 / Phase)
   * where V(1,0) = elemnt->mag is the magnitude at 1au from
   * both earth and sun and 100% illumination.
   */
  var phase = 0.5 * (1 + constant.pq)
  /* Fudge the phase for light leakage in magnitude estimation.
   * Note this phase term estimate does not reflect reality well.
   * Calculated magnitudes of Mercury and Venus are inaccurate.
   */
  var x = 0.5 * (1.01 + 0.99 * constant.pq)
  var magnitude = body.magnitude + 2.1715 * Math.log(constant.EO * constant.SO) - 1.085 * Math.log(x)
  body.position.approxVisual = {
    magnitude: magnitude,
    phase: phase
  }

  /* Find unit vector from earth in direction of object */
  p.longitude /= constant.EO
  p.latitude /= constant.EO
  p.distance /= constant.EO

  temp = {
    longitude: p.longitude,
    latitude: p.latitude,
    distance: p.distance
  }

  /* Report astrometric position */
  body.position.astrometricJ2000 = util.showrd(p, polar)

  /* Also in 1950 coordinates */
  precess.calc(temp, {julian: constant.b1950}, -1)
  body.position.astrometricB1950 = util.showrd(temp, polar)

  /* Correct position for light deflection */
  body.position.deflection = deflection.calc(p, q, e) // relativity

  /* Correct for annual aberration */
  body.position.aberration = aberration.calc(p)

  /* Precession of the equinox and ecliptic
   * from J2000.0 to ephemeris date
   */
  precess.calc(p, moshier.body.earth.position.date, -1)

  /* Adjust for nutation at current ecliptic. */
  epsilon.calc(moshier.body.earth.position.date)
  body.position.nutation = nutation.calc(moshier.body.earth.position.date, p)

  /* Display the final apparent R.A. and Dec.
   * for equinox of date.
   */
  body.position.constellation = constellation.calc(p, moshier.body.earth.position.date)
  body.position.apparent = util.showrd(p, polar)

  /* Geocentric ecliptic longitude and latitude. */
  p.longitude *= constant.EO
  p.latitude *= constant.EO
  p.distance *= constant.EO

  body.position.apparentGeocentric = lonlat.calc(p, moshier.body.earth.position.date, false)
  body.position.apparentGeocentric_prev_date = lonlat.calc(p, constant.retro_date, false)
  body.position.apparentLongitude = body.position.apparentGeocentric.longitude * constant.RTD
  body.position.apparentLongitudeString =
    body.position.apparentGeocentric.dLongitude.degree + '\u00B0' +
    body.position.apparentGeocentric.dLongitude.minutes + '\'' +
    Math.floor(body.position.apparentGeocentric.dLongitude.seconds) + '"'
  var p1 = body.position.apparentGeocentric_prev_date.dLongitude
  var p2 = body.position.apparentGeocentric.dLongitude
  body.position.is_retrograde = (util.degreesToDecimal(p1['degree'], p1['minutes'], p1['seconds']) - util.degreesToDecimal(p2['degree'], p2['minutes'], p2['seconds'])) < 0

  body.position.apparentLongitude30String =
    util.mod30(body.position.apparentGeocentric.dLongitude.degree) + '\u00B0' +
    body.position.apparentGeocentric.dLongitude.minutes + '\'' +
    Math.floor(body.position.apparentGeocentric.dLongitude.seconds) + '"'

  body.position.geocentricDistance = -1

  /* Go do topocentric reductions. */
  polar.distance = constant.EO
  body.position.altaz = altaz.calc(polar, moshier.body.earth.position.date)
}

planet.prepare = function (body) {
  if (!body.semiAxis) {
    body.semiAxis = body.perihelionDistance / (1 - body.eccentricity)
  }
}

module.exports = planet
