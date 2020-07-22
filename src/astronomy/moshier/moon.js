$ns.moon = {
  ra: 0.0, /* Right Ascension */
  dec: 0.0 /* Declination */
}

/* Calculate geometric position of the Moon and apply
 * approximate corrections to find apparent position,
 * phase of the Moon, etc. for AA.ARC.
 */
$ns.moon.calc = function () {
  var moonpp = {}, moonpol = {}

  $moshier.body.moon.position = {
    polar: [],
    rect: []
  }

  /* Geometric equatorial coordinates of the earth. */
  var re = {
    longitude: $moshier.body.earth.position.rect[0],
    latitude: $moshier.body.earth.position.rect[1],
    distance: $moshier.body.earth.position.rect[2]
  }

  /* Run the orbit calculation twice, at two different times,
   * in order to find the rate of change of R.A. and Dec.
   */

  /* Calculate for 0.001 day ago */
  this.calcll({julian: $moshier.body.earth.position.date.julian - 0.001}, moonpp, moonpol) // TDT - 0.001
  var ra0 = this.ra
  var dec0 = this.dec
  var lon0 = moonpol[0]

  /* Calculate for present instant. */
  $moshier.body.moon.position.nutation = this.calcll($moshier.body.earth.position.date, moonpp, moonpol).nutation

  $moshier.body.moon.position.geometric = {
    longitude: $const.RTD * $moshier.body.moon.position.polar[0],
    latitude: $const.RTD * $moshier.body.moon.position.polar[1],
    distance: $const.RTD * $moshier.body.moon.position.polar[2]
  }

  /**
   * The rates of change.  These are used by altaz () to
   * correct the time of rising, transit, and setting.
   */
  $const.dradt = this.ra - ra0
  if ($const.dradt >= Math.PI) {
    $const.dradt = $const.dradt - 2 * Math.PI
  }
  if ($const.dradt <= -Math.PI) {
    $const.dradt = $const.dradt + 2 * Math.PI
  }
  $const.dradt = 1000 * $const.dradt
  $const.ddecdt = 1000 * (this.dec - dec0)

  /* Rate of change in longitude, degrees per day
   * used for phase of the moon
   */
  lon0 = 1000 * $const.RTD * (moonpol[0] - lon0)

  /* Get apparent coordinates for the earth. */
  var z = Math.sqrt(re.longitude * re.longitude
    + re.latitude * re.latitude + re.distance * re.distance
  )

  re.longitude /= z
  re.latitude /= z
  re.distance /= z

  /* aberration of light. */
  $moshier.body.moon.position.annualAberration = $moshier.aberration.calc(re)

  /* pe.longitude -= STR * (20.496/(RTS*pe.distance)); */
  $moshier.precess.calc(re, $moshier.body.earth.position.date, -1)
  $moshier.nutation.calc($moshier.body.earth.position.date, re)

  re.longitude *= z
  re.latitude *= z
  re.distance *= z

  var pe = $moshier.lonlat.calc(re, $moshier.body.earth.position.date, false)

  /* Find sun-moon-earth angles */
  var qq = {
    longitude: re.longitude + moonpp.longitude,
    latitude: re.latitude + moonpp.latitude,
    distance: re.distance + moonpp.distance
  }

  $util.angles(moonpp, qq, re)

  /* Display answers */
  $moshier.body.moon.position.apparentGeocentric = {
    longitude: moonpol.longitude,
    dLongitude: $const.RTD * moonpol.longitude,
    latitude: moonpol.latitude,
    dLatitude: $const.RTD * moonpol.latitude,
    distance: moonpol.distance / $const.Rearth
  }
  $moshier.body.moon.position.apparentLongitude = $moshier.body.moon.position.apparentGeocentric.dLongitude
  var dmsLongitude = $util.dms($moshier.body.moon.position.apparentGeocentric.longitude)
  $moshier.body.moon.position.apparentLongitudeString =
    dmsLongitude.degree + '\u00B0' +
    dmsLongitude.minutes + '\'' +
    Math.floor(dmsLongitude.seconds) + '"'

  $moshier.body.moon.position.apparentLongitude30String =
    $util.mod30(dmsLongitude.degree) + '\u00B0' +
    dmsLongitude.minutes + '\'' +
    Math.floor(dmsLongitude.seconds) + '"'

  $moshier.body.moon.position.geocentricDistance = moonpol.distance / $const.Rearth

  var x = $const.Rearth / moonpol.distance
  $moshier.body.moon.position.dHorizontalParallax = Math.asin(x)
  $moshier.body.moon.position.horizontalParallax = $util.dms(Math.asin(x))

  x = 0.272453 * x + 0.0799 / $const.RTS
  /* AA page L6 */
  $moshier.body.moon.position.dSemidiameter = x
  $moshier.body.moon.position.Semidiameter = $util.dms(x)

  x = $const.RTD * Math.acos(-$const.ep)
  /* x = 180.0 - RTD * arcdot (re, pp); */
  $moshier.body.moon.position.sunElongation = x
  x = 0.5 * (1 + $const.pq)
  $moshier.body.moon.position.illuminatedFraction = x

  /* Find phase of the Moon by comparing Moon's longitude
   * with Earth's longitude.
   *
   * The number of days before or past indicated phase is
   * estimated by assuming the true longitudes change linearly
   * with time.  These rates are estimated for the date, but
   * do not stay constant.  The error can exceed 0.15 day in 4 days.
   */
  x = moonpol[0] - pe.longitude
  x = $util.modtp(x) * $const.RTD
  /* difference in longitude */
  var y = Math.floor(x / 90)
  /* number of quarters */
  x = x - y * 90
  /* phase angle mod 90 degrees */

  /* days per degree of phase angle */
  z = moonpol[2] / (12.3685 * 0.00257357)

  if (x > 45) {
    $moshier.body.moon.position.phaseDaysBefore = -(x - 90) * z
    y = (y + 1) & 3
  } else {
    $moshier.body.moon.position.phaseDaysPast = x * z
  }

  $moshier.body.moon.position.phaseQuarter = y

  $moshier.body.moon.position.apparent = {
    dRA: this.ra,
    dDec: this.dec,
    ra: $util.hms(this.ra),
    dec: $util.dms(this.dec)
  }

  /* Compute and display topocentric position (altaz.js) */
  var pp = [ this.ra, this.dec, moonpol.distance ]
  $moshier.body.moon.position.altaz = $moshier.altaz.calc(pp, $moshier.body.earth.position.date)
}

/* Calculate apparent latitude, longitude, and horizontal parallax
 * of the Moon at Julian date J.
 */
$ns.moon.calcll = function (date, rect, pol) {
  /* Compute obliquity of the ecliptic, coseps, and sineps. */
  $moshier.epsilon.calc(date)
  /* Get geometric coordinates of the Moon. */
  $moshier.gplan.moon(date, rect, pol)
  /* Post the geometric ecliptic longitude and latitude, in radians,
   * and the radius in au.
   */
  $const.body.position.polar[0] = pol.longitude
  $const.body.position.polar[1] = pol.latitude
  $const.body.position.polar[2] = pol.distance

  /* Light time correction to longitude,
   * about 0.7".
   */
  pol[0] -= 0.0118 * $const.DTR * $const.Rearth / pol[2]

  /* convert to equatorial system of date */
  var cosB = Math.cos(pol.latitude)
  var sinB = Math.sin(pol.latitude)
  var cosL = Math.cos(pol.longitude)
  var sinL = Math.sin(pol.longitude)
  rect.longitude = cosB * cosL
  rect.latitude = $moshier.epsilon.coseps * cosB * sinL - $moshier.epsilon.sineps * sinB
  rect.distance = $moshier.epsilon.sineps * cosB * sinL + $moshier.epsilon.coseps * sinB

  /* Rotate to J2000. */
  $moshier.precess.calc(rect, {julian: $moshier.body.earth.position.date.julian}, 1) // TDT

  /* Find Euclidean vectors and angles between earth, object, and the sun */
  var pp = {
    longitude: rect.longitude * pol.distance,
    latitude: rect.latitude * pol.distance,
    distance: rect.distance * pol.distance
  }

  var qq = {
    longitude: $moshier.body.earth.position.rect.longitude + pp.longitude,
    latitude: $moshier.body.earth.position.rect.latitude + pp.latitude,
    distance: $moshier.body.earth.position.rect.distance + pp.distance
  }

  $util.angles(pp, qq, $moshier.body.earth.position.rect)

  /* Make rect a unit vector. */
  /* for (i = 0; i < 3; i++) */
  /*  rect[i] /= EO; */

  /* Correct position for light deflection.
   (Ignore.)  */
  /* relativity( rect, qq, rearth ); */

  /* Aberration of light.
   The Astronomical Almanac (Section D, Daily Polynomial Coefficients)
   seems to omit this, even though the reference ephemeris is inertial. */
  /* annuab (rect); */

  /* Precess to date. */
  $moshier.precess.calc(rect, {julian: $moshier.body.earth.position.date.julian}, -1) // TDT

  /* Correct for nutation at date TDT. */
  var result = {
    nutation: $moshier.nutation.calc({julian: $moshier.body.earth.position.date.julian}, rect) // TDT
  }

  /* Apparent geocentric right ascension and declination. */
  this.ra = $util.zatan2(rect.longitude, rect.latitude)
  this.dec = Math.asin(rect.distance)

  /* For apparent ecliptic coordinates, rotate from the true
   equator into the ecliptic of date. */
  cosL = Math.cos($moshier.epsilon.eps + $moshier.nutation.nuto)
  sinL = Math.sin($moshier.epsilon.eps + $moshier.nutation.nuto)
  var y = cosL * rect.latitude + sinL * rect.distance
  var z = -sinL * rect.latitude + cosL * rect.distance
  pol.longitude = $util.zatan2(rect.longitude, y)
  pol.latitude = Math.asin(z)

  /* Restore earth-moon distance. */
  rect.longitude *= $const.EO
  rect.latitude *= $const.EO
  rect.distance *= $const.EO

  return result
}
