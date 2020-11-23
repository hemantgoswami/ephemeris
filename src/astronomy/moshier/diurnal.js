$ns.diurnal = {
  /* Earth radii per au. */
  DISFAC: 0.0
}

/* Diurnal aberration
 * This formula is less rigorous than the method used for
 * annual aberration.  However, the correction is small.
 */
$ns.diurnal.aberration = function (last, ra, dec) {
  var lha = last - ra
  var coslha = Math.cos(lha)
  var sinlha = Math.sin(lha)
  var cosdec = Math.cos(dec)
  var sindec = Math.sin(dec)
  var coslat = Math.cos($const.DTR * $const.tlat)

  var N = cosdec != 0.0 ? 1.5472e-6 * $const.trho * coslat * coslha / cosdec : 0.0
  var D = 1.5472e-6 * $const.trho * coslat * sinlha * sindec

  return {
    ra: ra + N,
    dec: dec + D,
    dRA: $const.RTS * N / 15,
    dDec: $const.RTS * D
  }
}

/* Diurnal parallax, AA page D3 */
$ns.diurnal.parallax = function (last, ra, dec, dist) {
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
  var cosdec = Math.cos(dec)
  var sindec = Math.sin(dec)

  /* Observer's astronomical latitude */
  var x = $const.tlat * $const.DTR
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
    longitude: -$const.trho * coslat * Math.cos(last),
    latitude: -$const.trho * coslat * Math.sin(last),
    distance: -$const.trho * sinlat
  }

  x = p.longitude + dp.longitude
  var y = p.latitude + dp.latitude
  var z = p.distance + dp.distance
  /* topocentric distance */
  D = Math.sqrt(x * x + y * y + z * z)

  var result = $util.showcor(p, dp)
  return {
    ra: $util.zatan2(x, y),
    dec: Math.asin(z / D),
    dRA: result.dRA,
    dDec: result.dDec
  }
}
