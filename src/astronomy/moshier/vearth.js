$ns.vearth = {
  jvearth: -1.0,
  vearth: []
}

$ns.vearth.calc = function (date) {
  var e = [], p = [] // double

  if (date.julian == this.jvearth) {
    return
  }

  this.jvearth = date.julian

  /* calculate heliocentric position of the earth
   * as of a short time ago.
   */
  var t = 0.005
  $moshier.kepler.calc({julian: date.julian - t}, $moshier.body.earth, e, p)

  for (var i = 0; i < 3; i++) {
    this.vearth[i] = ($moshier.body.earth.position.rect[i] - e[i]) / t
  }
}
