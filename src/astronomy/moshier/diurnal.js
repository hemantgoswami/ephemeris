const constant = require('./constant')
const util = require('./util')

const diurnal = {
  /** Earth radii per au. */
  DISFAC: 0.0
}

/**
 * Diurnal aberration
 * This formula is less rigorous than the method used for
 * annual aberration.  However, the correction is small.
 */
diurnal.aberration = function (last, ra, dec) {
  const lha = last - ra
  const coslha = Math.cos(lha)
  const sinlha = Math.sin(lha)
  const cosdec = Math.cos(dec)
  const sindec = Math.sin(dec)
  const coslat = Math.cos(constant.DTR * constant.tlat)

  const N = cosdec != 0.0 ? 1.5472e-6 * constant.trho * coslat * coslha / cosdec : 0.0
  const D = 1.5472e-6 * constant.trho * coslat * sinlha * sindec

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
      ra,
      dec
    }
  }

  this.DISFAC = constant.au / (0.001 * constant.aearth)
  const cosdec = Math.cos(dec)
  const sindec = Math.sin(dec)

  /* Observer's astronomical latitude */
  let x = constant.tlat * constant.DTR
  const coslat = Math.cos(x)
  const sinlat = Math.sin(x)

  /* Convert to equatorial rectangular coordinates
   * in which unit distance = earth radius
   */
  let D = dist * this.DISFAC
  const p = {
    longitude: D * cosdec * Math.cos(ra),
    latitude: D * cosdec * Math.sin(ra),
    distance: D * sindec
  }
  const dp = {
    longitude: -constant.trho * coslat * Math.cos(last),
    latitude: -constant.trho * coslat * Math.sin(last),
    distance: -constant.trho * sinlat
  }

  x = p.longitude + dp.longitude
  const y = p.latitude + dp.latitude
  const z = p.distance + dp.distance
  /* topocentric distance */
  D = Math.sqrt(x * x + y * y + z * z)

  const result = util.showcor(p, dp)
  return {
    ra: util.zatan2(x, y),
    dec: Math.asin(z / D),
    dRA: result.dRA,
    dDec: result.dDec
  }
}

module.exports = diurnal
