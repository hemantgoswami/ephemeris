$ns.aberration = {}

$ns.aberration.calc = function (p) {
  var x = [], V = [] // double
  var i // int

  /* Calculate the velocity of the earth (see vearth.js). */
  $moshier.vearth.calc($moshier.body.earth.position.date)
  var betai = 0.0, pV = 0.0
  for (i = 0; i < 3; i++) {
    V[i] = $moshier.vearth.vearth[i] / $const.Clightaud
    betai += V[i] * V[i]
    pV += p[i] * V[i]
  }
  /* Make the adjustment for aberration. */
  betai = Math.sqrt(1 - betai)
  var C = 1 + pV
  var A = betai / C
  var B = (1 + pV / (1 + betai)) / C

  for (i = 0; i < 3; i++) {
    x[i] = A * p[i] + B * V[i]
    $const.dp[i] = x[i] - p[i]
  }

  var result = $util.showcor(p, $const.dp)
  for (i = 0; i < 3; i++) {
    p[i] = x[i]
  }

  return result
}
