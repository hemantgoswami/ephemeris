var body = require('./body')
var kepler = require('./kepler')

var vearth = {
  jvearth: -1.0,
  vearth: {}
}

vearth.calc = function (date) {
  var e = {}

  if (date.julian == this.jvearth) {
    return
  }

  this.jvearth = date.julian

  /* calculate heliocentric position of the earth
   * as of a short time ago.
   */
  var t = 0.005
  kepler.calc({julian: date.julian - t}, body.earth, e)

  this.vearth.longitude = (body.earth.position.rect.longitude - e.longitude) / t
  this.vearth.latitude = (body.earth.position.rect.latitude - e.latitude) / t
  this.vearth.distance = (body.earth.position.rect.distance - e.distance) / t
}

module.exports = vearth
