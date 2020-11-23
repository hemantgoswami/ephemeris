var aberration = require('./aberration')
var altaz = require('./altaz')
var constant = require('./constant')
var epsilon = require('./epsilon')
var gplan = require('./gplan')
var lonlat = require('./lonlat')
var nutation = require('./nutation')
var precess = require('./precess')
var util = require('./util')

var moshier = {
  body: require('./body')
}

var moon = {
  /** Right Ascension */
  ra: 0.0,
  /** Declination */
  dec: 0.0
}

/**
 * Calculate geometric position of the Moon and apply
 * approximate corrections to find apparent position,
 * phase of the Moon, etc. for AA.ARC.
 */
moon.calc = function () {
  var moonpp = {}, moonpol = {}

  moshier.body.moon.position = {
    polar: {},
    rect: {}
  }

  /** Geometric equatorial coordinates of the earth. */
  var re = {
    longitude: moshier.body.earth.position.rect.longitude,
    latitude: moshier.body.earth.position.rect.latitude,
    distance: moshier.body.earth.position.rect.distance
  }

  /* Run the orbit calculation twice, at two different times,
   * in order to find the rate of change of R.A. and Dec.
   */

  /* Calculate for 0.001 day ago */
  this.calcll({julian: moshier.body.earth.position.date.julian - 0.001}, moonpp, moonpol) // TDT - 0.001
  var ra0 = this.ra
  var dec0 = this.dec
  var lon0 = moonpol.longitude

  /* Calculate for present instant. */
  moshier.body.moon.position.nutation = this.calcll(moshier.body.earth.position.date, moonpp, moonpol).nutation

  moshier.body.moon.position.geometric = {
    longitude: constant.RTD * moshier.body.moon.position.polar.longitude,
    latitude: constant.RTD * moshier.body.moon.position.polar.latitude,
    distance: constant.RTD * moshier.body.moon.position.polar.distance
  }

  /*
   * The rates of change.  These are used by altaz () to
   * correct the time of rising, transit, and setting.
   */
  constant.dradt = this.ra - ra0
  if (constant.dradt >= Math.PI) {
    constant.dradt = constant.dradt - 2 * Math.PI
  }
  if (constant.dradt <= -Math.PI) {
    constant.dradt = constant.dradt + 2 * Math.PI
  }
  constant.dradt = 1000 * constant.dradt
  constant.ddecdt = 1000 * (this.dec - dec0)

  /* Rate of change in longitude, degrees per day
   * used for phase of the moon
   */
  lon0 = 1000 * constant.RTD * (moonpol.longitude - lon0)

  /* Get apparent coordinates for the earth. */
  var z = Math.sqrt(re.longitude * re.longitude
    + re.latitude * re.latitude + re.distance * re.distance
  )

  re.longitude /= z
  re.latitude /= z
  re.distance /= z

  /* aberration of light. */
  moshier.body.moon.position.annualAberration = aberration.calc(re)

  /* pe.longitude -= STR * (20.496/(RTS*pe.distance)); */
  precess.calc(re, moshier.body.earth.position.date, -1)
  nutation.calc(moshier.body.earth.position.date, re)

  re.longitude *= z
  re.latitude *= z
  re.distance *= z

  var pe = lonlat.calc(re, moshier.body.earth.position.date, false)

  /* Find sun-moon-earth angles */
  var qq = {
    longitude: re.longitude + moonpp.longitude,
    latitude: re.latitude + moonpp.latitude,
    distance: re.distance + moonpp.distance
  }

  util.angles(moonpp, qq, re)

  /* Display answers */
  moshier.body.moon.position.apparentGeocentric = {
    longitude: moonpol.longitude,
    dLongitude: constant.RTD * moonpol.longitude,
    latitude: moonpol.latitude,
    dLatitude: constant.RTD * moonpol.latitude,
    distance: moonpol.distance / constant.Rearth
  }
  moshier.body.moon.position.apparentLongitude = moshier.body.moon.position.apparentGeocentric.dLongitude
  var dmsLongitude = util.dms(moshier.body.moon.position.apparentGeocentric.longitude)
  moshier.body.moon.position.apparentLongitudeString =
    dmsLongitude.degree + '\u00B0' +
    dmsLongitude.minutes + '\'' +
    Math.floor(dmsLongitude.seconds) + '"'

  moshier.body.moon.position.apparentLongitude30String =
    util.mod30(dmsLongitude.degree) + '\u00B0' +
    dmsLongitude.minutes + '\'' +
    Math.floor(dmsLongitude.seconds) + '"'

  moshier.body.moon.position.geocentricDistance = moonpol.distance / constant.Rearth

  var x = constant.Rearth / moonpol.distance
  moshier.body.moon.position.dHorizontalParallax = Math.asin(x)
  moshier.body.moon.position.horizontalParallax = util.dms(Math.asin(x))

  x = 0.272453 * x + 0.0799 / constant.RTS
  /* AA page L6 */
  moshier.body.moon.position.dSemidiameter = x
  moshier.body.moon.position.Semidiameter = util.dms(x)

  x = constant.RTD * Math.acos(-constant.ep)
  /* x = 180.0 - RTD * arcdot (re, pp); */
  moshier.body.moon.position.sunElongation = x
  x = 0.5 * (1 + constant.pq)
  moshier.body.moon.position.illuminatedFraction = x

  /* Find phase of the Moon by comparing Moon's longitude
   * with Earth's longitude.
   *
   * The number of days before or past indicated phase is
   * estimated by assuming the true longitudes change linearly
   * with time.  These rates are estimated for the date, but
   * do not stay constant.  The error can exceed 0.15 day in 4 days.
   */
  x = moonpol.longitude - pe.longitude
  x = util.modtp(x) * constant.RTD
  /* difference in longitude */
  var y = Math.floor(x / 90)
  /* number of quarters */
  x = x - y * 90
  /* phase angle mod 90 degrees */

  /* days per degree of phase angle */
  z = moonpol.distance / (12.3685 * 0.00257357)

  if (x > 45) {
    moshier.body.moon.position.phaseDaysBefore = -(x - 90) * z
    y = (y + 1) & 3
  } else {
    moshier.body.moon.position.phaseDaysPast = x * z
  }

  moshier.body.moon.position.phaseQuarter = y

  moshier.body.moon.position.apparent = {
    dRA: this.ra,
    dDec: this.dec,
    ra: util.hms(this.ra),
    dec: util.dms(this.dec)
  }

  /* Compute and display topocentric position (altaz.js) */
  var pp = {
    longitude: this.ra,
    latitude: this.dec,
    distance: moonpol.distance
  }
  moshier.body.moon.position.altaz = altaz.calc(pp, moshier.body.earth.position.date)
}

/**
 * Calculate apparent latitude, longitude, and horizontal parallax
 * of the Moon at Julian date J.
 */
moon.calcll = function (date, rect, pol) {
  /* Compute obliquity of the ecliptic, coseps, and sineps. */
  epsilon.calc(date)
  /* Get geometric coordinates of the Moon. */
  gplan.moon(date, rect, pol)
  /* Post the geometric ecliptic longitude and latitude, in radians,
   * and the radius in au.
   */
  constant.body.position.polar.longitude = pol.longitude
  constant.body.position.polar.latitude = pol.latitude
  constant.body.position.polar.distance = pol.distance

  /* Light time correction to longitude,
   * about 0.7".
   */
  pol.longitude -= 0.0118 * constant.DTR * constant.Rearth / pol.distance

  /* convert to equatorial system of date */
  var cosB = Math.cos(pol.latitude)
  var sinB = Math.sin(pol.latitude)
  var cosL = Math.cos(pol.longitude)
  var sinL = Math.sin(pol.longitude)
  rect.longitude = cosB * cosL
  rect.latitude = epsilon.coseps * cosB * sinL - epsilon.sineps * sinB
  rect.distance = epsilon.sineps * cosB * sinL + epsilon.coseps * sinB

  /* Rotate to J2000. */
  precess.calc(rect, {julian: moshier.body.earth.position.date.julian}, 1) // TDT

  /* Find Euclidean vectors and angles between earth, object, and the sun */
  var pp = {
    longitude: rect.longitude * pol.distance,
    latitude: rect.latitude * pol.distance,
    distance: rect.distance * pol.distance
  }

  var qq = {
    longitude: moshier.body.earth.position.rect.longitude + pp.longitude,
    latitude: moshier.body.earth.position.rect.latitude + pp.latitude,
    distance: moshier.body.earth.position.rect.distance + pp.distance
  }

  util.angles(pp, qq, moshier.body.earth.position.rect)

  /* Make rect a unit vector. */
  /* rect.longitude /= EO; */
  /* rect.latitude /= EO; */
  /* rect.distance /= EO; */

  /* Correct position for light deflection. (Ignore.) */
  /* relativity(rect, qq, rearth); */

  /* Aberration of light.
   The Astronomical Almanac (Section D, Daily Polynomial Coefficients)
   seems to omit this, even though the reference ephemeris is inertial. */
  /* annuab (rect); */

  /* Precess to date. */
  precess.calc(rect, {julian: moshier.body.earth.position.date.julian}, -1) // TDT

  /* Correct for nutation at date TDT. */
  var result = {
    nutation: nutation.calc({julian: moshier.body.earth.position.date.julian}, rect) // TDT
  }

  /* Apparent geocentric right ascension and declination. */
  this.ra = util.zatan2(rect.longitude, rect.latitude)
  this.dec = Math.asin(rect.distance)

  /* For apparent ecliptic coordinates, rotate from the true
   equator into the ecliptic of date. */
  cosL = Math.cos(epsilon.eps + nutation.nuto)
  sinL = Math.sin(epsilon.eps + nutation.nuto)
  var y = cosL * rect.latitude + sinL * rect.distance
  var z = -sinL * rect.latitude + cosL * rect.distance
  pol.longitude = util.zatan2(rect.longitude, y)
  pol.latitude = Math.asin(z)

  /* Restore earth-moon distance. */
  rect.longitude *= constant.EO
  rect.latitude *= constant.EO
  rect.distance *= constant.EO

  return result
}

module.exports = moon
