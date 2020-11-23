var constant = require('./constant')
var epsilon = require('./epsilon')

var precess = {
  /* In WILLIAMS and SIMON, Laskar's terms of order higher than t^4
   have been retained, because Simon et al mention that the solution
   is the same except for the lower order terms. */
  pAcof: [
    /* Corrections to Williams (1994) introduced in DE403. */
    -8.66e-10, -4.759e-8, 2.424e-7, 1.3095e-5, 1.7451e-4, -1.8055e-3,
    -0.235316, 0.076, 110.5414, 50287.91959
  ],
  /** Pi from Williams' 1994 paper, in radians.  No change in DE403. */
  nodecof: [
    6.6402e-16, -2.69151e-15, -1.547021e-12, 7.521313e-12, 1.9e-10,
    -3.54e-9, -1.8103e-7, 1.26e-7, 7.436169e-5,
    -0.04207794833, 3.052115282424
  ],
  /** Pi from Williams' 1994 paper, in radians.  No change in DE403. */
  inclcof: [
    1.2147e-16, 7.3759e-17, -8.26287e-14, 2.503410e-13, 2.4650839e-11,
    -5.4000441e-11, 1.32115526e-9, -6.012e-7, -1.62442e-5,
    0.00227850649, 0.0
  ]
}

/**
 * Precession of the equinox and ecliptic
 * from epoch Julian date J to or from J2000.0
 *
 * Subroutine arguments:
 *
 * R = rectangular equatorial coordinate vector to be precessed.
 *     The result is written back into the input vector.
 * J = Julian date
 * direction =
 *      Precess from J to J2000: direction = 1
 *      Precess from J2000 to J: direction = -1
 * Note that if you want to precess from J1 to J2, you would
 * first go from J1 to J2000, then call the program again
 * to go from J2000 to J2.
 */
precess.calc = function (R, date, direction) {
  var p_i = 0
  var i // int

  if (date.julian == constant.j2000) {
    return
  }
  /* Each precession angle is specified by a polynomial in
   * T = Julian centuries from J2000.0.  See AA page B18.
   */
  var T = (date.julian - constant.j2000) / 36525

  /* Implementation by elementary rotations using Laskar's expansions.
   * First rotate about the x axis from the initial equator
   * to the ecliptic. (The input is equatorial.)
   */
  if (direction == 1) {
    /* To J2000 */
    epsilon.calc(date)
  } else {
    /* From J2000 */
    epsilon.calc({julian: constant.j2000})
  }
  var z = epsilon.coseps * R.latitude + epsilon.sineps * R.distance
  var x = {
    longitude: R.longitude,
    latitude: z,
    distance: -epsilon.sineps * R.latitude + epsilon.coseps * R.distance
  }

  /* Precession in longitude */
  T /= 10
  /* thousands of years */
  var p = this.pAcof
  var pA = p[p_i++] // *p++;
  for (i = 0; i < 9; i++) {
    pA = pA * T + p[p_i++] // *p++;
  }
  pA *= constant.STR * T

  /* Node of the moving ecliptic on the J2000 ecliptic. */
  p = this.nodecof
  p_i = 0
  var W = p[p_i++] // *p++;
  for (i = 0; i < 10; i++) {
    W = W * T + p[p_i++] // *p++;
  }

  /* Rotate about z axis to the node. */
  z = direction == 1 ? W + pA : W
  var B = Math.cos(z)
  var A = Math.sin(z)
  z = B * x.longitude + A * x.latitude
  x.latitude = -A * x.longitude + B * x.latitude
  x.longitude = z

  /* Rotate about new x axis by the inclination of the moving
   * ecliptic on the J2000 ecliptic.
   */
  p = this.inclcof
  p_i = 0
  z = p[p_i++] // *p++;
  for (i = 0; i < 10; i++) {
    z = z * T + p[p_i++] // *p++;
  }
  if (direction == 1) {
    z = -z
  }
  B = Math.cos(z)
  A = Math.sin(z)
  z = B * x.latitude + A * x.distance
  x.distance = -A * x.latitude + B * x.distance
  x.latitude = z

  /* Rotate about new z axis back from the node. */
  z = direction == 1 ? -W : -W - pA
  B = Math.cos(z)
  A = Math.sin(z)
  z = B * x.longitude + A * x.latitude
  x.latitude = -A * x.longitude + B * x.latitude
  x.longitude = z

  /* Rotate about x axis to final equator. */
  if (direction == 1) {
    epsilon.calc({julian: constant.j2000})
  } else {
    epsilon.calc(date)
  }
  z = epsilon.coseps * x.latitude - epsilon.sineps * x.distance
  x.distance = epsilon.sineps * x.latitude + epsilon.coseps * x.distance
  x.latitude = z

  R.longitude = x.longitude
  R.latitude = x.latitude
  R.distance = x.distance
}

module.exports = precess
