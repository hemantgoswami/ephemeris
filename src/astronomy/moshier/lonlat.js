$ns.lonlat = {}

$ns.lonlat.calc = function (pp, date, ofdate) {
  var s = [] // double

  /* Make local copy of position vector
   * and calculate radius.
   */
  var r = 0.0
  for (var i = 0; i < 3; i++) {
    var x = pp[i]
    s[i] = x
    r += x * x
  }
  r = Math.sqrt(r)

  /* Precess to equinox of date J */
  if (ofdate) {
    $moshier.precess.calc(s, date, -1)
  }

  /* Convert from equatorial to ecliptic coordinates */
  $moshier.epsilon.calc(date)
  var yy = s[1]
  var zz = s[2]
  var x = s[0]
  var y = $moshier.epsilon.coseps * yy + $moshier.epsilon.sineps * zz
  var z = -$moshier.epsilon.sineps * yy + $moshier.epsilon.coseps * zz

  yy = $util.zatan2(x, y)
  zz = Math.asin(z / r)

  var result = {}
  // longitude and latitude in decimal
  result[0] = yy
  result[1] = zz
  result[2] = r
  // longitude and latitude in h,m,s
  result[3] = $util.dms(yy)
  result[4] = $util.dms(zz)

  return result
}
