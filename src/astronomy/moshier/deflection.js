$ns.deflection = {}

$ns.deflection.calc = function (p, q, e) {
  var C = 1.974e-8 / ($const.SE * (1 + $const.qe))

  $const.dp[0] = C * ($const.pq * e.longitude / $const.SE - $const.ep * q.longitude / $const.SO)
  $const.dp[1] = C * ($const.pq * e.latitude / $const.SE - $const.ep * q.latitude / $const.SO)
  $const.dp[2] = C * ($const.pq * e.distance / $const.SE - $const.ep * q.distance / $const.SO)

  p.longitude += $const.dp[0]
  p.latitude += $const.dp[1]
  p.distance += $const.dp[2]

  return {
    sunElongation: Math.acos(-$const.ep) / $const.DTR,
    lightDeflection: $util.showcor(p, $const.dp)
  }
}
