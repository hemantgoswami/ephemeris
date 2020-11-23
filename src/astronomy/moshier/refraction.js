var constant = require('./constant')

var refraction = {}

/**
 * Atmospheric refraction.
 * Returns correction in degrees to be added to true altitude
 * to obtain apparent altitude.
 */
refraction.calc = function (alt) {
  if (alt < -2 || alt >= 90) {
    return 0
  }

  /* For high altitude angle, AA page B61
   * Accuracy "usually about 0.1' ".
   */
  if (alt > 15) {
    return 0.00452 * constant.atpress / ((273 + constant.attemp) * Math.tan(constant.DTR * alt))
  }

  /* Formula for low altitude is from the Almanac for Computers.
   * It gives the correction for observed altitude, so has
   * to be inverted numerically to get the observed from the true.
   * Accuracy about 0.2' for -20C < T < +40C and 970mb < P < 1050mb.
   */

  /* Start iteration assuming correction = 0 */
  var y = alt
  var D = 0.0
  /* Invert Almanac for Computers formula numerically */
  var P = (constant.atpress - 80) / 930
  var Q = 4.8e-3 * (constant.attemp - 10)
  var y0 = y
  var D0 = D

  for (var i = 0; i < 4; i++) {
    var N = y + (7.31 / (y + 4.4))
    N = 1 / Math.tan(constant.DTR * N)
    D = N * P / (60 + Q * (N + 39))
    N = y - y0
    y0 = D - D0 - N
    /* denominator of derivative */

    if (N != 0.0 && y0 != 0.0) {
      /* Newton iteration with numerically estimated derivative */
      N = y - N * (alt + D - y) / y0
    } else {
      /* Can't do it on first pass */
      N = alt + D
    }

    y0 = y
    D0 = D
    y = N
  }
  return D
}

module.exports = refraction
