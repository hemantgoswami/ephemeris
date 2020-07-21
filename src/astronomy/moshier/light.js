$ns.light = {}

$ns.light.calc = function (body, q, e) {
  var p = [], p0 = [], t // double
  var i // int

  /* save initial q-e vector for display */
  for (i = 0; i < 3; i++) {
    p0[i] = q[i] - e[i]
  }

  var E = 0.0
  for (i = 0; i < 3; i++) {
    E += e[i] * e[i]
  }
  E = Math.sqrt(E)

  for (var k = 0; k < 2; k++) {
    var P = 0.0
    var Q = 0.0
    for (i = 0; i < 3; i++) {
      p[i] = q[i] - e[i]
      Q += q[i] * q[i]
      P += p[i] * p[i]
    }
    P = Math.sqrt(P)
    Q = Math.sqrt(Q)
    /* Note the following blows up if object equals sun. */
    t = (P + 1.97e-8 * Math.log((E + P + Q) / (E - P + Q))) / 173.1446327
    $moshier.kepler.calc({julian: $moshier.body.earth.position.date.julian - t}, body, q)
  }

  body.lightTime = 1440 * t

  /* Final object-earth vector and the amount by which it changed. */
  for (i = 0; i < 3; i++) {
    p[i] = q[i] - e[i]
    $const.dp[i] = p[i] - p0[i]
  }
  body.aberration = $util.showcor(p0, $const.dp)

  /* Calculate dRA/dt and dDec/dt.
   * The desired correction of apparent coordinates is relative
   * to the equinox of date, but the coordinates here are
   * for J2000.  This introduces a slight error.
   *
   * Estimate object-earth vector t days ago.  We have
   * p(?) = q(J-t) - e(J), and must adjust to
   * p(J-t)  =  q(J-t) - e(J-t)  =  q(J-t) - (e(J) - Vearth * t)
   *         =  p(?) + Vearth * t.
   */
  $moshier.vearth.calc($moshier.body.earth.position.date)

  for (i = 0; i < 3; i++) {
    p[i] += $moshier.vearth.vearth[i] * t
  }

  var d = $util.deltap(p, p0)
  /* see $util.dms() */
  $const.dradt = d.dr
  $const.ddecdt = d.dd
  $const.dradt /= t
  $const.ddecdt /= t
}
