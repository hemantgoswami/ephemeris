var common = require('../../common')
var constant = require('./constant')

var util = {}

util.mods3600 = function (value) {
  return value - 1.296e6 * Math.floor(value / 1.296e6)
}

/** Reduce x modulo 2 pi */
util.modtp = function (x) {
  var y = x - Math.floor(x / constant.TPI) * constant.TPI
  while (y < 0) {
    y += constant.TPI
  }
  while (y >= constant.TPI) {
    y -= constant.TPI
  }
  return y
}

/** Reduce x modulo 360 degrees */
util.mod360 = function (x) {
  var y = x - Math.floor(x / 360) * 360
  while (y < 0) {
    y += 360
  }
  while (y > 360) {
    y -= 360
  }
  return y
}

/** Reduce x modulo 30 degrees */
util.mod30 = function (x) {
  var y = x - Math.floor(x / 30) * 30
  while (y < 0) {
    y += 30
  }
  while (y > 30) {
    y -= 30
  }
  return y
}

util.zatan2 = function (x, y) {
  var w = 0, code = 0

  if (x < 0) {
    code = 2
  }
  if (y < 0) {
    code |= 1
  }

  if (x == 0) {
    return code & 1 ? 1.5 * Math.PI
      : y == 0 ? 0 : 0.5 * Math.PI
  }

  if (y == 0) {
    return code & 2 ? Math.PI : 0
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

util.sinh = function (x) {
  return (Math.exp(x) - Math.exp(-x)) / 2
}

util.cosh = function (x) {
  return (Math.exp(x) + Math.exp(-x)) / 2
}

util.tanh = function (x) {
  return (Math.exp(x) - Math.exp(-x)) / (Math.exp(x) + Math.exp(-x))
}

util.hms = function (x) {
  var s = x * constant.RTOH
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

util.degreesToDecimal = function (deg, minutes, seconds) {
  return deg + (minutes / 60) + (seconds / 3600)
}

util.dms = function (x) {
  var s = x * constant.RTD
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

/**
 * Display magnitude of correction vector
 * in arc seconds
 */
util.showcor = function (p, dp) {
  var p1 = {
    longitude: p.longitude + dp.longitude,
    latitude: p.latitude + dp.latitude,
    distance: p.distance + dp.distance
  }
  var d = util.deltap(p, p1)
  return {
    dRA: constant.RTS * d.dr / 15,
    dDec: constant.RTS * d.dd
  }
}

/**
 * Display Right Ascension and Declination
 * from input equatorial rectangular unit vector.
 * Output vector pol contains R.A., Dec., and radius.
 */
util.showrd = function (p, pol) {
  var r = Math.sqrt(p.longitude * p.longitude
    + p.latitude * p.latitude + p.distance * p.distance
  )

  pol.longitude = util.zatan2(p.longitude, p.latitude)
  pol.latitude = Math.asin(p.distance / r)
  pol.distance = r

  var result = {}
  common.copy(result, {
    dRA: pol.longitude,
    dDec: pol.latitude,
    ra: util.hms(pol.longitude),
    dec: util.dms(pol.latitude)
  })
  return result
}

/**
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
 */
util.deltap = function (p0, p1) {
  var dr

  var P = p0.longitude * p0.longitude
    + p0.latitude * p0.latitude
    + p0.distance * p0.distance

  var Q = p1.longitude * p1.longitude
    + p1.latitude * p1.latitude
    + p1.distance * p1.distance

  var dp = {
    longitude: p1.longitude - p0.longitude,
    latitude: p1.latitude - p0.latitude,
    distance: p1.distance - p0.distance
  }

  var z = dp.longitude * dp.longitude
    + dp.latitude * dp.latitude
    + dp.distance * dp.distance

  var A = Math.sqrt(P)
  var B = Math.sqrt(Q)

  if (A < 1.e-7 || B < 1.e-7 || z / (P + Q) > 5.e-7) {
    P = util.zatan2(p0.longitude, p0.latitude)
    Q = util.zatan2(p1.longitude, p1.latitude)
    Q = Q - P
    while (Q < -Math.PI) {
      Q += 2 * Math.PI
    }
    while (Q > Math.PI) {
      Q -= 2 * Math.PI
    }
    dr = Q
    P = Math.asin(p0.distance / A)
    Q = Math.asin(p1.distance / B)
    return {
      dd: Q - P,
      dr: dr
    }
  }

  var x = p0.longitude
  var y = p0.latitude
  if (x == 0.0) {
    dr = 1.0e38
  } else {
    var a = y / x
    dr = (dp.latitude - dp.longitude * y / x) / (x * (1 + a * a))
  }
  x = p0.distance / A
  return {
    dd: (p1.distance / B - x) / Math.sqrt(1 - x * x),
    dr: dr
  }
}

/**
 * Sun - object - earth angles and distances.
 * q (object), e (earth), and p (q minus e) are input vectors.
 * The answers are posted in the following global locations:
 */
util.angles = function (p, q, e) {
  var a = {
    longitude: p.longitude,
    latitude: p.latitude,
    distance: p.distance
  }
  /* Distance between Earth and object */
  constant.EO = Math.sqrt(a.longitude * a.longitude
    + a.latitude * a.latitude + a.distance * a.distance
  )
  /* Sun - object */
  constant.SO = Math.sqrt(q.longitude * q.longitude
    + q.latitude * q.latitude + q.distance * q.distance
  )
  /* Sun - earth */
  constant.SE = Math.sqrt(e.longitude * e.longitude
    + e.latitude * e.latitude + e.distance * e.distance
  )

  constant.pq = a.longitude * q.longitude
    + a.latitude * q.latitude + a.distance * q.distance

  constant.ep = e.longitude * a.longitude
    + e.latitude * a.latitude + e.distance * a.distance

  constant.qe = q.longitude * e.longitude
    + q.latitude * e.latitude + q.distance * e.distance

  /* Avoid fatality: if object equals sun, SO is zero. */
  if (constant.SO > 1.0e-12) {
    /* cosine of sun-object-earth */
    constant.pq /= constant.EO * constant.SO
    /* cosine of earth-sun-object */
    constant.qe /= constant.SO * constant.SE
  }
  /* -cosine of sun-earth-object */
  constant.ep /= constant.SE * constant.EO
}

module.exports = util
