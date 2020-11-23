var constant = require('./constant')
var diurnal = require('./diurnal')
var refraction = require('./refraction')
var sidereal = require('./sidereal')
var transit = require('./transit')
var util = require('./util')

var altaz = {
  azimuth: 0.0,
  elevation: 0.0,
  refracted_elevation: 0.0
}

altaz.calc = function (pol, date) {
  // var TPI = 2 * Math.PI

  /** local apparent sidereal time, seconds converted to radians */
  var last = sidereal.calc(date, constant.tlong) * constant.DTR / 240
  /** local hour angle, radians */
  var lha = last - pol.longitude

  var result = {
    dLocalApparentSiderealTime: last,
    localApparentSiderealTime: util.hms(last)
  }

  /* Display rate at which ra and dec are changing */
  /*
   * if( prtflg )
   *   {
   *   x = RTS/24.0;
   *   N = x*dradt;
   *   D = x*ddecdt;
   *   if( N != 0.0 )
   *     printf( "dRA/dt %.2f\"/h, dDec/dt %.2f\"/h\n", N, D );
   *   }
   */

  result.diurnalAberration = diurnal.aberration(last, pol.longitude, pol.latitude)
  var ra = result.diurnalAberration.ra
  var dec = result.diurnalAberration.dec

  /* Do rise, set, and transit times
   transit.js takes diurnal parallax into account,
   but not diurnal aberration. */
  lha = last - ra
  result.transit = transit.calc(date, lha, dec)

  /* Diurnal parallax */
  result.diurnalParallax = diurnal.parallax(last, ra, dec, pol.distance)
  ra = result.diurnalParallax.ra
  dec = result.diurnalParallax.dec

  /* Diurnal aberration */
  /* diurab( last, &ra, &dec ); */

  /* Convert ra and dec to altitude and azimuth */
  var cosdec = Math.cos(dec)
  var sindec = Math.sin(dec)
  lha = last - ra
  var coslha = Math.cos(lha)
  var sinlha = Math.sin(lha)

  /* Use the geodetic latitude for altitude and azimuth */
  x = constant.DTR * constant.glat
  var coslat = Math.cos(x)
  var sinlat = Math.sin(x)

  var N = -cosdec * sinlha
  var D = sindec * coslat - cosdec * coslha * sinlat
  var az = constant.RTD * util.zatan2(D, N)
  var alt = sindec * sinlat + cosdec * coslha * coslat
  alt = constant.RTD * Math.asin(alt)

  /* Store results */
  this.azimuth = az
  this.elevation = alt
  /* Save unrefracted value. */

  /* Correction for atmospheric refraction
   * unit = degrees
   */
  D = refraction.calc(alt)
  alt += D
  this.refracted_elevation = alt

  /* Convert back to R.A. and Dec. */
  var x = Math.cos(constant.DTR * alt)
  var y = Math.sin(constant.DTR * alt)
  var z = Math.cos(constant.DTR * az)
  sinlha = -x * Math.sin(constant.DTR * az)
  coslha = y * coslat - x * z * sinlat
  sindec = y * sinlat + x * z * coslat
  lha = util.zatan2(coslha, sinlha)

  y = ra
  /* save previous values, before refrac() */
  z = dec
  dec = Math.asin(sindec)
  ra = last - lha
  y = ra - y
  /* change in ra */
  while (y < -Math.PI) {
    y += constant.TPI
  }
  while (y > Math.PI) {
    y -= constant.TPI
  }
  y = constant.RTS * y / 15
  z = constant.RTS * (dec - z)

  result.atmosphericRefraction = {
    deg: D,
    dRA: y,
    dDec: z
  }

  result.topocentric = {
    altitude: alt,
    azimuth: az,
    ra: ra,
    dec: dec,
    dRA: util.hms(ra),
    dDec: util.dms(dec)
  }

  return result
}

module.exports = altaz
