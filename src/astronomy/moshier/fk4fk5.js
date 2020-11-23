var constant = require('./constant')
var util = require('./util')

var fk4fk5 = {
  /* Factors to eliminate E terms of aberration */
  A: [-1.62557e-6, -3.1919e-7, -1.3843e-7],
  Ad: [1.244e-3, -1.579e-3, -6.60e-4],

  /**
   * Transformation matrix for unit direction vector,
   * and motion vector in arc seconds per century
   */
  Mat: [
    0.9999256782, -0.0111820611, -4.8579477e-3,
    2.42395018e-6, -2.710663e-8, -1.177656e-8,
    0.0111820610, 0.9999374784, -2.71765e-5,
    2.710663e-8, 2.42397878e-6, -6.587e-11,
    4.8579479e-3, -2.71474e-5, 0.9999881997,
    1.177656e-8, -6.582e-11, 2.42410173e-6,
    -5.51e-4, -0.238565, 0.435739,
    0.99994704, -0.01118251, -4.85767e-3,
    0.238514, -2.667e-3, -8.541e-3,
    0.01118251, 0.99995883, -2.718e-5,
    -0.435623, 0.012254, 2.117e-3,
    4.85767e-3, -2.714e-5, 1.00000956
  ]
}

/**
 * Convert FK4 B1950.0 catalogue coordinates
 * to FK5 J2000.0 coordinates.
 * AA page B58.
 */
fk4fk5.calc = function (p, m, el) {
  /* Note the direction vector and motion vector
   * are already supplied by rstar.c.
   */
  m.longitude *= constant.RTS
  m.latitude *= constant.RTS
  m.distance *= constant.RTS

  /* motion must be in arc seconds per century */
  var a = this.A[0] * p.longitude
    + this.A[1] * p.latitude
    + this.A[2] * p.distance

  var b = this.Ad[0] * p.longitude
    + this.Ad[1] * p.latitude
    + this.Ad[2] * p.distance

  /* Remove E terms of aberration from FK4 */
  var R = [
    p.longitude - this.A[0] + a * p.longitude,
    p.latitude - this.A[1] + a * p.latitude,
    p.distance - this.A[2] + a * p.distance,
    m.longitude - this.Ad[0] + b * p.longitude,
    m.latitude - this.Ad[1] + b * p.latitude,
    m.distance - this.Ad[2] + b * p.distance
  ]

  var u_i = 0
  var v_i = 0

  /* Perform matrix multiplication */
  var v = this.Mat
  var M = []
  for (var i = 0; i < 6; i++) {
    M[i] = 0.0
    for (var j = 0; j < 6; j++) {
      M[i] += R[u_i++] * v[v_i++] // *u++ * *v++;
    }
  }
  p.longitude = M[0]
  p.latitude = M[1]
  p.distance = M[2]
  m.longitude = M[3]
  m.latitude = M[4]
  m.distance = M[5]

  /* Transform the answers into J2000 catalogue entries
   * in radian measure.
   */
  b = p.longitude * p.longitude + p.latitude * p.latitude
  var c = b + p.distance * p.distance
  a = Math.sqrt(c)

  el.ra = util.zatan2(p.longitude, p.latitude)
  el.dec = Math.asin(p.distance / a)

  /* Note motion converted back to radians per (Julian) century */
  el.raMotion = (p.longitude * m.latitude - p.latitude * m.longitude) / (constant.RTS * b)
  el.decMotion = (
    m.distance * b - p.distance * (p.longitude * m.longitude + p.latitude * m.latitude)
  ) / (constant.RTS * c * Math.sqrt(b))

  if (el.parallax > 0) {
    c = p.longitude * m.longitude + p.latitude * m.latitude + p.distance * m.distance

    /* divide by RTS to deconvert m (and therefore c)
     * from arc seconds back to radians
     */
    el.velocity = c / (21.094952663 * el.parallax * constant.RTS * a)
  }
  el.parallax = el.parallax / a
  /* a is dimensionless */
  el.epoch = constant.j2000
}

module.exports = fk4fk5
