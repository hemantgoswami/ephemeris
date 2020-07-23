$ns.deflection = {}

$ns.deflection.calc = function (p, q, e) {
  var C = 1.974e-8 / ($const.SE * (1 + $const.qe))
  for (var i = 0; i < 3; i++) {
    $const.dp[i] = C * ($const.pq * e[i] / $const.SE - $const.ep * q[i] / $const.SO)
    p[i] += $const.dp[i]
  }
  return {
    sunElongation: Math.acos(-$const.ep) / $const.DTR,
    lightDeflection: $util.showcor(p, $const.dp)
  }
}
