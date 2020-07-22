$ns.vearth = {
  jvearth: -1.0,
  vearth: []
}

$ns.vearth.calc = function (date) {
  var e = [] // double

  if (date.julian == this.jvearth) {
    return
  }

  this.jvearth = date.julian

  /* calculate heliocentric position of the earth
   * as of a short time ago.
   */
  var t = 0.005
  $moshier.kepler.calc({julian: date.julian - t}, $moshier.body.earth, e)

  this.vearth[0] = ($moshier.body.earth.position.rect[0] - e.longitude) / t
  this.vearth[1] = ($moshier.body.earth.position.rect[1] - e.latitude) / t
  this.vearth[2] = ($moshier.body.earth.position.rect[2] - e.distance) / t
}
