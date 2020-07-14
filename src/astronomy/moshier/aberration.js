$ns.aberration = {}

$ns.aberration.calc = function (p, result) {
  var x = [], V = [] // double

  /* Calculate the velocity of the earth (see vearth.js). */
  $moshier.vearth.calc($moshier.body.earth.position.date)
  var betai = 0.0, pV = 0.0
  for (var i = 0; i < 3; i++) {
    var A = $moshier.vearth.vearth[i] / $const.Clightaud
    V[i] = A
    betai += A * A
    pV += p[i] * A
  }
  /* Make the adjustment for aberration. */
  betai = Math.sqrt(1.0 - betai)
  var C = 1.0 + pV
  var A = betai / C
  var B = (1.0 + pV / (1.0 + betai)) / C

  for (var i = 0; i < 3; i++) {
    C = A * p[i] + B * V[i]
    x[i] = C
    $const.dp[i] = C - p[i]
  }

  result = result || {}

  $util.showcor(p, $const.dp, result)
  for (var i = 0; i < 3; i++) {
    p[i] = x[i]
  }

  return result
}
