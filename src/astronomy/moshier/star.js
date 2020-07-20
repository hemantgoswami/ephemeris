$ns.star = {}

$ns.star.calc = function (body) {
  if (!body.isPrepared) {
    this.prepare(body)
    body.isPrepared = true
  }
  this.reduce(body)
}

$ns.star.reduce = function (body) {
  var p = [], q = [], e = [], m = [], temp = [], polar = [] // double
  var epoch // double
  var i // int

  /* Convert from RA and Dec to equatorial rectangular direction */
  do {
    var cosdec = Math.cos(body.dec)
    var sindec = Math.sin(body.dec)
    var cosra = Math.cos(body.ra)
    var sinra = Math.sin(body.ra)
    q[0] = cosra * cosdec
    q[1] = sinra * cosdec
    q[2] = sindec

    /* space motion */
    var vpi = 21.094952663 * body.velocity * body.parallax
    m[0] = -body.raMotion * cosdec * sinra
      - body.decMotion * sindec * cosra
      + vpi * q[0]

    m[1] = body.raMotion * cosdec * cosra
      - body.decMotion * sindec * sinra
      + vpi * q[1]

    m[2] = body.decMotion * cosdec
      + vpi * q[2]

    epoch = body.epoch

    /* Convert FK4 to FK5 catalogue */
    if (epoch == $const.b1950) {
      $moshier.fk4fk5.calc(q, m, body)
      // continue;
    }
  } while (epoch == $const.b1950)

  for (i = 0; i < 3; i++) {
    e[i] = $moshier.body.earth.position.rect[i]
  }

  /* precess the earth to the star epoch */
  $moshier.precess.calc(e, {julian: epoch}, -1)

  /* Correct for proper motion and parallax */
  var T = ($moshier.body.earth.position.date.julian - epoch) / 36525
  for (i = 0; i < 3; i++) {
    p[i] = q[i] + T * m[i] - body.parallax * e[i]
  }

  /* precess the star to J2000 */
  $moshier.precess.calc(p, {julian: epoch}, 1)
  /* reset the earth to J2000 */
  for (i = 0; i < 3; i++) {
    e[i] = $moshier.body.earth.position.rect[i]
  }

  /* Find Euclidean vectors between earth, object, and the sun
   * angles( p, q, e );
   */
  $util.angles(p, p, e)

  /* Find unit vector from earth in direction of object */
  for (i = 0; i < 3; i++) {
    p[i] /= $const.EO
    temp[i] = p[i]
  }

  body.position = {}
  body.position.approxVisualMagnitude = body.magnitude

  /* Report astrometric position */
  body.position.astrometricJ2000 = $util.showrd(p, polar)

  /* Also in 1950 coordinates */
  $moshier.precess.calc(temp, {julian: $const.b1950}, -1)

  body.position.astrometricB1950 = $util.showrd(temp, polar)

  /* For equinox of date: */
  for (i = 0; i < 3; i++) {
    temp[i] = p[i]
  }

  $moshier.precess.calc(temp, $moshier.body.earth.position.date, -1)
  body.position.astrometricDate = $util.showrd(temp, polar)

  /* Correct position for light deflection
   * relativity( p, q, e );
   */
  body.position.deflection = $moshier.deflection.calc(p, p, e) // relativity

  /* Correct for annual aberration */
  body.position.aberration = $moshier.aberration.calc(p)

  /* Precession of the equinox and ecliptic
   * from J2000.0 to ephemeris date
   */
  $moshier.precess.calc(p, $moshier.body.earth.position.date, -1)

  /* Adjust for nutation at current ecliptic. */
  $moshier.epsilon.calc($moshier.body.earth.position.date)
  $moshier.nutation.calc($moshier.body.earth.position.date, p)

  /* Display the final apparent R.A. and Dec.
   * for equinox of date.
   */
  body.position.apparent = $util.showrd(p, polar)

  // prepare for display
  body.position.apparentLongitude = body.position.apparent.dRA
  var dmsLongitude = $util.dms(body.position.apparentLongitude)
  body.position.apparentLongitudeString =
    dmsLongitude.degree + '\u00B0' +
    dmsLongitude.minutes + '\'' +
    Math.floor(dmsLongitude.seconds) + '"'

  body.position.apparentLongitude30String =
    $util.mod30(dmsLongitude.degree) + '\u00B0' +
    dmsLongitude.minutes + '\'' +
    Math.floor(dmsLongitude.seconds) + '"'

  body.position.geocentricDistance = 7777

  /* Go do topocentric reductions. */
  $const.dradt = 0.0
  $const.ddecdt = 0.0
  polar[2] = 1.0e38
  /* make it ignore diurnal parallax */

  body.position.altaz = $moshier.altaz.calc(polar, $moshier.body.earth.position.date)
}

$ns.star.prepare = function (body) {
  /* Read in the ASCII string data and name of the object */
  // sscanf( s, "%lf %lf %lf %lf %lf %lf %lf %lf %lf %lf %lf %lf %s",
  //   &body->epoch, &rh, &rm, &rs, &dd, &dm, &ds,
  //   &body->mura, &body->mudec, &body->v, &body->px, &body->mag, &body->obname[0] );

  var x = body.epoch
  if (x == 2000.0) {
    x = $const.j2000
  } else if (x == 1950.0) {
    x = $const.b1950
  } else if (x == 1900.0) {
    x = $const.j1900
  } else {
    x = $const.j2000 + 365.25 * (x - 2000)
  }
  body.epoch = x

  /* read the right ascension */
  if (!body.ra) {
    body.ra = 2 * Math.PI * (3600 * body.hmsRa.hours + 60 * body.hmsRa.minutes + body.hmsRa.seconds) / 86400
  }

  /* read the declination */
  if (!body.dec) {
    /* the '-' sign may appaer at any part of hmsDec */
    var sign = body.hmsDec.hours < 0 || body.hmsDec.minutes < 0 || body.hmsDec.seconds < 0 ? -1 : 1
    var z = (3600 * Math.abs(body.hmsDec.hours) + 60 * Math.abs(body.hmsDec.minutes) + Math.abs(body.hmsDec.seconds)) / $const.RTS
    body.dec = sign < 0 ? -z : z
  }

  body.raMotion *= 15 / $const.RTS
  /* s/century -> "/century -> rad/century */
  body.decMotion /= $const.RTS
  if (body.parallax < 1) {
    /* assume px in arc seconds */
    body.parallax = body.parallax <= 0 ? 0 : $const.STR * body.parallax
  } else {
    body.parallax = 1 / ($const.RTS * body.parallax)
    /* parsecs -> radians */
  }
}
