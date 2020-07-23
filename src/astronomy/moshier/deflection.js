$ns.deflection = {}

$ns.deflection.calc = function (p, q, e) {
  var C = 1.974e-8 / ($const.SE * (1 + $const.qe))

  $const.dp.longitude = C * ($const.pq * e.longitude / $const.SE - $const.ep * q.longitude / $const.SO)
  $const.dp.latitude = C * ($const.pq * e.latitude / $const.SE - $const.ep * q.latitude / $const.SO)
  $const.dp.distance = C * ($const.pq * e.distance / $const.SE - $const.ep * q.distance / $const.SO)

  p.longitude += $const.dp.longitude
  p.latitude += $const.dp.latitude
  p.distance += $const.dp.distance

  return {
    sunElongation: Math.acos(-$const.ep) / $const.DTR,
    lightDeflection: $util.showcor(p, $const.dp)
  }
}
