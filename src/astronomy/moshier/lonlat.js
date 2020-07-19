$ns.lonlat = {}

$ns.lonlat.calc = function (pp, date, ofdate) {
  var s = [] // double

  /* Make local copy of position vector
   * and calculate radius.
   */
  var r = 0.0
  for (var i = 0; i < 3; i++) {
    s[i] = pp[i]
    r += pp[i] * pp[i]
  }
  r = Math.sqrt(r)

  /* Precess to equinox of date J */
  if (ofdate) {
    $moshier.precess.calc(s, date, -1)
  }

  /* Convert from equatorial to ecliptic coordinates */
  $moshier.epsilon.calc(date)
  var y = $moshier.epsilon.coseps * s[1] + $moshier.epsilon.sineps * s[2]
  var z = -$moshier.epsilon.sineps * s[1] + $moshier.epsilon.coseps * s[2]

  var yy = $util.zatan2(s[0], y)
  var zz = Math.asin(z / r)

  return [
    // longitude and latitude in decimal
    yy, zz, r,
    // longitude and latitude in h,m,s
    $util.dms(yy), $util.dms(zz)
  ]
}
