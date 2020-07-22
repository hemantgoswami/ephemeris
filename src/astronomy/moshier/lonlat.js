$ns.lonlat = {}

$ns.lonlat.calc = function (pp, date, ofdate) {
  /* Make local copy of position vector
   * and calculate radius.
   */
  var s = [
    pp.longitude,
    pp.latitude,
    pp.distance
  ]

  var r = Math.sqrt(pp.longitude * pp.longitude
    + pp.latitude * pp.latitude + pp.distance * pp.distance
  )

  /* Precess to equinox of date J */
  if (ofdate) {
    $moshier.precess.calc(s, date, -1)
  }

  /* Convert from equatorial to ecliptic coordinates */
  $moshier.epsilon.calc(date)
  var y = $moshier.epsilon.coseps * s.latitude + $moshier.epsilon.sineps * s.distance
  var z = -$moshier.epsilon.sineps * s.latitude + $moshier.epsilon.coseps * s.distance

  var yy = $util.zatan2(s[0], y)
  var zz = Math.asin(z / r)

  return {
    // longitude and latitude in decimal
    longitude: yy,
    latitude: zz,
    distance: r,
    // longitude and latitude in h,m,s
    dLongitude: $util.dms(yy),
    dLatitude: $util.dms(zz)
  }
}
