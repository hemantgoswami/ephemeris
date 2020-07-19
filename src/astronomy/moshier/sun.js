$ns.sun = {}

$ns.sun.calc = function () {
  var t, ecr = [], rec = [] // double

  $moshier.body.sun.position = $moshier.body.sun.position || {}

  /* Display ecliptic longitude and latitude. */
  for (var i = 0; i < 3; i++) {
    ecr[i] = -$moshier.body.earth.position.rect[i] // -rearth[i];
  }
  var r = $moshier.body.earth.position.polar[2] // eapolar[2];

  var pol = $moshier.body.sun.position.equinoxEclipticLonLat = $moshier.lonlat.calc(ecr, $moshier.body.earth.position.date, true) // TDT

  /* Philosophical note: the light time correction really affects
   * only the Sun's barycentric position; aberration is due to
   * the speed of the Earth.  In Newtonian terms the aberration
   * is the same if the Earth is standing still and the Sun moving
   * or vice versa.  Thus the following is actually wrong, but it
   * differs from relativity only in about the 8th decimal.
   * It should be done the same way as the corresponding planetary
   * correction, however.
   */
  pol[2] = r
  for (var i = 0; i < 2; i++) {
    t = pol[2] / 173.1446327
    /* Find the earth at time TDT - t */
    $moshier.kepler.calc({julian: $moshier.body.earth.position.date.julian - t}, $moshier.body.earth, ecr, pol)
  }
  r = pol[2]

  for (var i = 0; i < 3; i++) {
    var x = -ecr[i]
    /* position t days ago */
    ecr[i] = x
    /* position now */
    rec[i] = -$moshier.body.earth.position.rect[i] // -rearth[i];
    /* change in position */
    pol[i] = rec[i] - x
  }

  $copy($moshier.body.sun.position, {
    date: $moshier.body.earth.position.date,
    lightTime: 1440 * t,
    aberration: $util.showcor(ecr, pol)
  })

  /* Estimate rate of change of RA and Dec
   * for use by altaz().
   */
  var d = $util.deltap(ecr, rec)
  /* see $util.dms() */
  $const.dradt = d.dr
  $const.ddecdt = d.dd
  $const.dradt /= t
  $const.ddecdt /= t

  /* There is no light deflection effect.
   * AA page B39.
   */

  /* precess to equinox of date */
  $moshier.precess.calc(ecr, $moshier.body.earth.position.date, -1)

  for (var i = 0; i < 3; i++) {
    rec[i] = ecr[i]
  }

  /* Nutation */
  $moshier.epsilon.calc($moshier.body.earth.position.date)
  $moshier.nutation.calc($moshier.body.earth.position.date, ecr)

  /* Display the final apparent R.A. and Dec.
   * for equinox of date.
   */
  $moshier.body.sun.position.constellation = $moshier.constellation.calc(ecr, $moshier.body.earth.position.date)

  $moshier.body.sun.position.apparent = $util.showrd(ecr, pol)

  /* Show it in ecliptic coordinates */
  var y = $moshier.epsilon.coseps * rec[1] + $moshier.epsilon.sineps * rec[2]
  y = $util.zatan2(rec[0], y) + $moshier.nutation.nutl
  $moshier.body.sun.position.apparentLongitude = $const.RTD * y
  var dmsLongitude = $util.dms(y)
  $moshier.body.sun.position.apparentLongitudeString =
    dmsLongitude.degree + '\u00B0' +
    dmsLongitude.minutes + '\'' +
    Math.floor(dmsLongitude.seconds) + '"'

  $moshier.body.sun.position.apparentLongitude30String =
    $util.mod30(dmsLongitude.degree) + '\u00B0' +
    dmsLongitude.minutes + '\'' +
    Math.floor(dmsLongitude.seconds) + '"'

  $moshier.body.sun.position.geocentricDistance = -1

  /* Report altitude and azimuth */
  $moshier.body.sun.position.altaz = $moshier.altaz.calc(pol, $moshier.body.earth.position.date)
}
