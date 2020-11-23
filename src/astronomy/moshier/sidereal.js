var constant = require('./constant')
var epsilon = require('./epsilon')
var nutation = require('./nutation')

var sidereal = {}

sidereal.calc = function (date, tlong) {
  /** Julian day at given UT */
  var jd = date.universal // UT
  /** Julian day at midnight Universal Time */
  var jd0 = Math.floor(jd)
  /** Time of day, UT seconds since UT midnight */
  var secs = date.julian - jd0 // UT
  if (secs < 0.5) {
    jd0 -= 0.5
    secs += 0.5
  } else {
    jd0 += 0.5
    secs -= 0.5
  }
  secs *= 86400

  /* Julian centuries from standard epoch J2000.0 */
  /* T = (jd - J2000)/36525.0; */
  /* Same but at 0h Universal Time of date */
  var T0 = (jd0 - constant.j2000) / 36525

  /* The equation of the equinoxes is the nutation in longitude
   * times the cosine of the obliquity of the ecliptic.
   * We already have routines for these.
   */
  nutation.calclo(date)
  epsilon.calc(date)
  /* nutl is in radians; convert to seconds of time
   * at 240 seconds per degree
   */
  var eqeq = 240 * constant.RTD * nutation.nutl * epsilon.coseps
  /* Greenwich Mean Sidereal Time at 0h UT of date */
  /* Corrections to Williams (1994) introduced in DE403. */
  var gmst = (((-2.0e-6 * T0 - 3.e-7) * T0 + 9.27701e-2) * T0 + 8640184.7942063) * T0
    + 24110.54841
  var msday = (((-(4 * 2.0e-6) * T0 - (3 * 3.e-7)) * T0 + (2 * 9.27701e-2)) * T0
    + 8640184.7942063) / (86400 * 36525) + 1

  /* Local apparent sidereal time at given UT */
  gmst = gmst + msday * secs + eqeq + 240 * tlong
  /* Sidereal seconds modulo 1 sidereal day */
  gmst = gmst - 86400 * Math.floor(gmst / 86400)
  /*
   * var il = gmst/86400.0;
   * gmst = gmst - 86400.0 * il;
   * if( gmst < 0.0 )
   *   gmst += 86400.0;
   */
  return gmst
}

module.exports = sidereal
