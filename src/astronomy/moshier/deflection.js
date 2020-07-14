$ns.deflection = {}

$ns.deflection.calc = function (p, q, e, result) {
  var C = 1.974e-8 / ($const.SE * (1.0 + $const.qe))
  for (var i = 0; i < 3; i++) {
    $const.dp[i] = C * ($const.pq * e[i] / $const.SE - $const.ep * q[i] / $const.SO)
    p[i] += $const.dp[i]
  }

  result = result || {}

  result.sunElongation = Math.acos(-$const.ep) / $const.DTR
  result.lightDeflection = $util.showcor(p, $const.dp)

  return result
}
