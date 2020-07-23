$ns.vearth = {
  jvearth: -1.0,
  vearth: {}
}

$ns.vearth.calc = function (date) {
  var e = {}

  if (date.julian == this.jvearth) {
    return
  }

  this.jvearth = date.julian

  /* calculate heliocentric position of the earth
   * as of a short time ago.
   */
  var t = 0.005
  $moshier.kepler.calc({julian: date.julian - t}, $moshier.body.earth, e)

  this.vearth.longitude = ($moshier.body.earth.position.rect.longitude - e.longitude) / t
  this.vearth.latitude = ($moshier.body.earth.position.rect.latitude - e.latitude) / t
  this.vearth.distance = ($moshier.body.earth.position.rect.distance - e.distance) / t
}
