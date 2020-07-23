$ns.diurnal = {
  /* Earth radii per au. */
  DISFAC: 0.0
}

/* Diurnal aberration
 * This formula is less rigorous than the method used for
 * annual aberration.  However, the correction is small.
 */
$ns.diurnal.aberration = function (last, ra, dec) {
  var lha, coslha, sinlha, cosdec, sindec // double
  var coslat, N, D // double

  lha = last - ra
  coslha = Math.cos(lha)
  sinlha = Math.sin(lha)
  cosdec = Math.cos(dec)
  sindec = Math.sin(dec)
  coslat = Math.cos($const.DTR * $const.tlat)

  if (cosdec != 0.0)
    N = 1.5472e-6 * $const.trho * coslat * coslha / cosdec
  else
    N = 0.0

  D = 1.5472e-6 * $const.trho * coslat * sinlha * sindec

  return {
    ra: ra + N,
    dec: dec + D,
    dRA: $const.RTS * N / 15,
    dDec: $const.RTS * D
  }
}

/* Diurnal parallax, AA page D3
 */
$ns.diurnal.parallax = function (last, ra, dec, dist) {
  var cosdec, sindec, coslat, sinlat // double
  var p = [], dp = [], x, y, z, D // double

  /* Don't bother with this unless the equatorial horizontal parallax
   * is at least 0.005"
   */
  if (dist > 1758.8) {
    return {
      ra: ra,
      dec: dec
    }
  }

  this.DISFAC = $const.au / (0.001 * $const.aearth)
  cosdec = Math.cos(dec)
  sindec = Math.sin(dec)

  /* Observer's astronomical latitude
   */
  x = $const.tlat * $const.DTR
  coslat = Math.cos(x)
  sinlat = Math.sin(x)

  /* Convert to equatorial rectangular coordinates
   * in which unit distance = earth radius
   */
  D = dist * this.DISFAC
  p[0] = D * cosdec * Math.cos(ra)
  p[1] = D * cosdec * Math.sin(ra)
  p[2] = D * sindec

  dp[0] = -$const.trho * coslat * Math.cos(last)
  dp[1] = -$const.trho * coslat * Math.sin(last)
  dp[2] = -$const.trho * sinlat

  x = p[0] + dp[0]
  y = p[1] + dp[1]
  z = p[2] + dp[2]
  D = x * x + y * y + z * z
  D = Math.sqrt(D)
  /* topocentric distance */

  /* recompute ra and dec */
  var result = $util.showcor(p, dp)
  return {
    ra: $util.zatan2(x, y),
    dec: Math.asin(z / D),
    dRA: result.dRA,
    dDec: result.dDec
  }
}
