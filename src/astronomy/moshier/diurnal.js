var constant = require('./constant')
var util = require('./util')

var diurnal = {
  /** Earth radii per au. */
  DISFAC: 0.0
}

/**
 * Diurnal aberration
 * This formula is less rigorous than the method used for
 * annual aberration.  However, the correction is small.
 */
diurnal.aberration = function (last, ra, dec) {
  var lha = last - ra
  var coslha = Math.cos(lha)
  var sinlha = Math.sin(lha)
  var cosdec = Math.cos(dec)
  var sindec = Math.sin(dec)
  var coslat = Math.cos(constant.DTR * constant.tlat)

  var N = cosdec != 0.0 ? 1.5472e-6 * constant.trho * coslat * coslha / cosdec : 0.0
  var D = 1.5472e-6 * constant.trho * coslat * sinlha * sindec

  return {
    ra: ra + N,
    dec: dec + D,
    dRA: constant.RTS * N / 15,
    dDec: constant.RTS * D
  }
}

/** Diurnal parallax, AA page D3 */
diurnal.parallax = function (last, ra, dec, dist) {
  /* Don't bother with this unless the equatorial horizontal parallax
   * is at least 0.005"
   */
  if (dist > 1758.8) {
    return {
      ra: ra,
      dec: dec
    }
  }

  this.DISFAC = constant.au / (0.001 * constant.aearth)
  var cosdec = Math.cos(dec)
  var sindec = Math.sin(dec)

  /* Observer's astronomical latitude */
  var x = constant.tlat * constant.DTR
  var coslat = Math.cos(x)
  var sinlat = Math.sin(x)

  /* Convert to equatorial rectangular coordinates
   * in which unit distance = earth radius
   */
  var D = dist * this.DISFAC
  var p = {
    longitude: D * cosdec * Math.cos(ra),
    latitude: D * cosdec * Math.sin(ra),
    distance: D * sindec
  }
  var dp = {
    longitude: -constant.trho * coslat * Math.cos(last),
    latitude: -constant.trho * coslat * Math.sin(last),
    distance: -constant.trho * sinlat
  }

  x = p.longitude + dp.longitude
  var y = p.latitude + dp.latitude
  var z = p.distance + dp.distance
  /* topocentric distance */
  D = Math.sqrt(x * x + y * y + z * z)

  var result = util.showcor(p, dp)
  return {
    ra: util.zatan2(x, y),
    dec: Math.asin(z / D),
    dRA: result.dRA,
    dDec: result.dDec
  }
}

module.exports = diurnal
