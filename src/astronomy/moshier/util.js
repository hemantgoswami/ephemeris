$ns.util = {}

$ns.util.mods3600 = function (value) {
  return value - 1.296e6 * Math.floor(value / 1.296e6)
}

/* Reduce x modulo 2 pi */
$ns.util.modtp = function (x) {
  var y = x - Math.floor(x / $const.TPI) * $const.TPI
  while (y < 0) {
    y += $const.TPI
  }
  while (y >= $const.TPI) {
    y -= $const.TPI
  }
  return y
}

/* Reduce x modulo 360 degrees */
$ns.util.mod360 = function (x) {
  var y = x - Math.floor(x / 360) * 360
  while (y < 0) {
    y += 360
  }
  while (y > 360) {
    y -= 360
  }
  return y
}

/* Reduce x modulo 30 degrees */
$ns.util.mod30 = function (x) {
  var y = x - Math.floor(x / 30) * 30
  while (y < 0) {
    y += 30
  }
  while (y > 30) {
    y -= 30
  }
  return y
}

$ns.util.zatan2 = function (x, y) {
  var w = 0, code = 0

  if (x < 0) {
    code = 2
  }
  if (y < 0) {
    code |= 1
  }

  if (x == 0) {
    if (code & 1) {
      return 1.5 * Math.PI
    }
    if (y == 0) {
      return 0
    }
    return 0.5 * Math.PI
  }

  if (y == 0) {
    if (code & 2) {
      return Math.PI
    }
    return 0
  }

  switch (code) {
    default:
    case 0:
      w = 0
      break
    case 1:
      w = 2 * Math.PI
      break
    case 2:
    case 3:
      w = Math.PI
      break
  }

  return w + Math.atan(y / x)
}

$ns.util.sinh = function (x) {
  return (Math.exp(x) - Math.exp(-x)) / 2
}

$ns.util.cosh = function (x) {
  return (Math.exp(x) + Math.exp(-x)) / 2
}

$ns.util.tanh = function (x) {
  return (Math.exp(x) - Math.exp(-x)) / (Math.exp(x) + Math.exp(-x))
}

$ns.util.hms = function (x) {
  var s = x * $const.RTOH
  if (s < 0) {
    s += 24
  }
  var h = Math.floor(s)
  s -= h
  s *= 60
  var m = Math.floor(s)
  s -= m
  s *= 60
  /* Handle shillings and pence roundoff. */
  var sfrac = Math.floor(1000 * s + 0.5)
  if (sfrac >= 60000) {
    sfrac -= 60000
    m += 1
    if (m >= 60) {
      m -= 60
      h += 1
    }
  }
  var sint = Math.floor(sfrac / 1000)
  sfrac -= Math.floor(sint * 1000)

  return {
    hours: h,
    minutes: m,
    seconds: sint,
    milliseconds: sfrac
  }
}

$ns.util.dms = function (x) {
  var s = x * $const.RTD
  if (s < 0) {
    s = -s
  }
  var d = Math.floor(s)
  s -= d
  s *= 60
  var m = Math.floor(s)
  s -= m
  s *= 60

  return {
    degree: d,
    minutes: m,
    seconds: s
  }
}

/* Display magnitude of correction vector
 * in arc seconds
 */
$ns.util.showcor = function (p, dp) {
  var p1 = [] // double

  for (var i = 0; i < 3; i++) {
    p1[i] = p[i] + dp[i]
  }

  var d = $util.deltap(p, p1)

  return {
    dRA: $const.RTS * d.dr / 15,
    dDec: $const.RTS * d.dd
  }
}

/* Display Right Ascension and Declination
 * from input equatorial rectangular unit vector.
 * Output vector pol[] contains R.A., Dec., and radius.
 */
$ns.util.showrd = function (p, pol) {
  var r = 0
  for (var i = 0; i < 3; i++) {
    r += p[i] * p[i]
  }
  r = Math.sqrt(r)

  pol[0] = $util.zatan2(p[0], p[1])
  pol[1] = Math.asin(p[2] / r)
  pol[2] = r

  var result = {}

  $copy(result, {
    dRA: pol[0],
    dDec: pol[1],
    ra: $util.hms(pol[0]),
    dec: $util.dms(pol[1])
  })

  return result
}

/*
 * Convert change in rectangular coordinates to change
 * in right ascension and declination.
 * For changes greater than about 0.1 degree, the
 * coordinates are converted directly to R.A. and Dec.
 * and the results subtracted.  For small changes,
 * the change is calculated to first order by differentiating
 *   tan(R.A.) = y/x
 * to obtain
 *    dR.A./cos**2(R.A.) = dy/x - y dx/x**2
 * where
 *    cos**2(R.A.) = 1/(1 + (y/x)**2)
 *
 * The change in declination arcsin(z/R) is
 *   d asin(u) = du/sqrt(1-u**2)
 *   where u = z/R.
 *
 * p0 is the initial object - earth vector and
 * p1 is the vector after motion or aberration.
 *
 */
$ns.util.deltap = function (p0, p1) {
  var dr, dp = [] // double

  var P = 0.0
  var Q = 0.0
  var z = 0.0
  for (var i = 0; i < 3; i++) {
    P += p0[i] * p0[i]
    Q += p1[i] * p1[i]
    dp[i] = p1[i] - p0[i]
    z += dp[i] * dp[i]
  }

  var A = Math.sqrt(P)
  var B = Math.sqrt(Q)

  if (A < 1.e-7 || B < 1.e-7 || z / (P + Q) > 5.e-7) {
    P = $util.zatan2(p0[0], p0[1])
    Q = $util.zatan2(p1[0], p1[1])
    Q = Q - P
    while (Q < -Math.PI) {
      Q += 2 * Math.PI
    }
    while (Q > Math.PI) {
      Q -= 2 * Math.PI
    }
    dr = Q
    P = Math.asin(p0[2] / A)
    Q = Math.asin(p1[2] / B)
    return {
      dd: Q - P,
      dr: dr
    }
  }

  var x = p0[0]
  var y = p0[1]
  if (x == 0.0) {
    dr = 1.0e38
  } else {
    Q = y / x
    Q = (dp[1] - dp[0] * y / x) / (x * (1 + Q * Q))
    dr = Q
  }

  x = p0[2] / A
  P = Math.sqrt(1 - x * x)

  return {
    dd: (p1[2] / B - x) / P,
    dr: dr
  }
}

/* Sun - object - earth angles and distances.
 * q (object), e (earth), and p (q minus e) are input vectors.
 * The answers are posted in the following global locations:
 */
$ns.util.angles = function (p, q, e) {
  $const.EO = 0.0
  $const.SE = 0.0
  $const.SO = 0.0
  $const.pq = 0.0
  $const.ep = 0.0
  $const.qe = 0.0
  for (var i = 0; i < 3; i++) {
    var a = e[i]
    var b = q[i]
    var s = p[i]
    $const.EO += s * s
    $const.SE += a * a
    $const.SO += b * b
    $const.pq += s * b
    $const.ep += a * s
    $const.qe += b * a
  }
  /* Distance between Earth and object */
  $const.EO = Math.sqrt($const.EO)
  /* Sun - object */
  $const.SO = Math.sqrt($const.SO)
  /* Sun - earth */
  $const.SE = Math.sqrt($const.SE)
  /* Avoid fatality: if object equals sun, SO is zero. */
  if ($const.SO > 1.0e-12) {
    /* cosine of sun-object-earth */
    $const.pq /= $const.EO * $const.SO
    /* cosine of earth-sun-object */
    $const.qe /= $const.SO * $const.SE
  }
  /* -cosine of sun-earth-object */
  $const.ep /= $const.SE * $const.EO
}
