var constant = require('./constant')
var util = require('./util')

var deflection = {}

deflection.calc = function (p, q, e) {
  var C = 1.974e-8 / (constant.SE * (1 + constant.qe))

  constant.dp.longitude = C * (constant.pq * e.longitude / constant.SE - constant.ep * q.longitude / constant.SO)
  constant.dp.latitude = C * (constant.pq * e.latitude / constant.SE - constant.ep * q.latitude / constant.SO)
  constant.dp.distance = C * (constant.pq * e.distance / constant.SE - constant.ep * q.distance / constant.SO)

  p.longitude += constant.dp.longitude
  p.latitude += constant.dp.latitude
  p.distance += constant.dp.distance

  return {
    sunElongation: Math.acos(-constant.ep) / constant.DTR,
    lightDeflection: util.showcor(p, constant.dp)
  }
}

module.exports = deflection
