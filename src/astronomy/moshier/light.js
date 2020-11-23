var constant = require('./constant')
var kepler = require('./kepler')
var util = require('./util')
var vearth = require('./vearth')

var moshier = {
  body: require('./body')
}

var light = {}

light.calc = function (body, q, e) {
  var p = {}
  var t // double

  /* save initial q-e vector for display */
  var p0 = {
    longitude: q.longitude - e.longitude,
    latitude: q.latitude - e.latitude,
    distance: q.distance - e.distance
  }

  var E = Math.sqrt(e.longitude * e.longitude
    + e.latitude * e.latitude
    + e.distance * e.distance)

  for (var i = 0; i < 2; i++) {
    p.longitude = q.longitude - e.longitude
    p.latitude = q.latitude - e.latitude
    p.distance = q.distance - e.distance

    var Q = q.longitude * q.longitude
      + q.latitude * q.latitude
      + q.distance * q.distance

    var P = p.longitude * p.longitude
      + p.latitude * p.latitude
      + p.distance * p.distance

    P = Math.sqrt(P)
    Q = Math.sqrt(Q)
    /* Note the following blows up if object equals sun. */
    t = (P + 1.97e-8 * Math.log((E + P + Q) / (E - P + Q))) / 173.1446327
    kepler.calc({julian: moshier.body.earth.position.date.julian - t}, body, q)
  }

  body.lightTime = 1440 * t

  /* Final object-earth vector and the amount by which it changed. */
  p.longitude = q.longitude - e.longitude
  p.latitude = q.latitude - e.latitude
  p.distance = q.distance - e.distance
  constant.dp.longitude = p.longitude - p0.longitude
  constant.dp.latitude = p.latitude - p0.latitude
  constant.dp.distance = p.distance - p0.distance
  body.aberration = util.showcor(p0, constant.dp)

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
  vearth.calc(moshier.body.earth.position.date)

  p.longitude += vearth.vearth.longitude * t
  p.latitude += vearth.vearth.latitude * t
  p.distance += vearth.vearth.distance * t

  var d = util.deltap(p, p0)
  /* see util.dms() */
  constant.dradt = d.dr
  constant.ddecdt = d.dd
  constant.dradt /= t
  constant.ddecdt /= t
}

module.exports = light
