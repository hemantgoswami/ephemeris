const constant = require('./constant')
const epsilon = require('./epsilon')
const util = require('./util')

const nutation = {
  /* The answers are posted here by nutlo(): */
  /** time to which the nutation applies */
  jdnut: {},
  /** nutation in longitude (radians) */
  nutl: 0.0,
  /** nutation in obliquity (radians) */
  nuto: 0.0,

  /**
   * Each term in the expansion has a trigonometric
   * argument given by
   *   W = i*MM + j*MS + k*FF + l*DD + m*OM
   * where the variables are defined below.
   * The nutation in longitude is a sum of terms of the
   * form (a + bT) * sin(W). The terms for nutation in obliquity
   * are of the form (c + dT) * cos(W).  The coefficients
   * are arranged in the tabulation as follows:
   *
   * Coefficient:
   * i  j  k  l  m      a      b      c     d
   * 0, 0, 0, 0, 1, -171996, -1742, 92025, 89,
   * The first line of the table, above, is done separately
   * since two of the values do not fit into 16 bit integers.
   * The values a and c are arc seconds times 10000.  b and d
   * are arc seconds per Julian century times 100000.  i through m
   * are integers.  See the program for interpretation of MM, MS,
   * etc., which are mean orbital elements of the Sun and Moon.
   *
   * If terms with coefficient less than X are omitted, the peak
   * errors will be:
   *
   *   omit    error,      omit      error,
   *   a <     longitude   c <       obliquity
   * .0005"    .0100"      .0008"    .0094"
   * .0046     .0492       .0095     .0481
   * .0123     .0880       .0224     .0905
   * .0386     .1808       .0895     .1129
   */
  nt: [
    0, 0, 0, 0, 2, 2062, 2, -895, 5,
    -2, 0, 2, 0, 1, 46, 0, -24, 0,
    2, 0, -2, 0, 0, 11, 0, 0, 0,
    -2, 0, 2, 0, 2, -3, 0, 1, 0,
    1, -1, 0, -1, 0, -3, 0, 0, 0,
    0, -2, 2, -2, 1, -2, 0, 1, 0,
    2, 0, -2, 0, 1, 1, 0, 0, 0,
    0, 0, 2, -2, 2, -13187, -16, 5736, -31,
    0, 1, 0, 0, 0, 1426, -34, 54, -1,
    0, 1, 2, -2, 2, -517, 12, 224, -6,
    0, -1, 2, -2, 2, 217, -5, -95, 3,
    0, 0, 2, -2, 1, 129, 1, -70, 0,
    2, 0, 0, -2, 0, 48, 0, 1, 0,
    0, 0, 2, -2, 0, -22, 0, 0, 0,
    0, 2, 0, 0, 0, 17, -1, 0, 0,
    0, 1, 0, 0, 1, -15, 0, 9, 0,
    0, 2, 2, -2, 2, -16, 1, 7, 0,
    0, -1, 0, 0, 1, -12, 0, 6, 0,
    -2, 0, 0, 2, 1, -6, 0, 3, 0,
    0, -1, 2, -2, 1, -5, 0, 3, 0,
    2, 0, 0, -2, 1, 4, 0, -2, 0,
    0, 1, 2, -2, 1, 4, 0, -2, 0,
    1, 0, 0, -1, 0, -4, 0, 0, 0,
    2, 1, 0, -2, 0, 1, 0, 0, 0,
    0, 0, -2, 2, 1, 1, 0, 0, 0,
    0, 1, -2, 2, 0, -1, 0, 0, 0,
    0, 1, 0, 0, 2, 1, 0, 0, 0,
    -1, 0, 0, 1, 1, 1, 0, 0, 0,
    0, 1, 2, -2, 0, -1, 0, 0, 0,
    0, 0, 2, 0, 2, -2274, -2, 977, -5,
    1, 0, 0, 0, 0, 712, 1, -7, 0,
    0, 0, 2, 0, 1, -386, -4, 200, 0,
    1, 0, 2, 0, 2, -301, 0, 129, -1,
    1, 0, 0, -2, 0, -158, 0, -1, 0,
    -1, 0, 2, 0, 2, 123, 0, -53, 0,
    0, 0, 0, 2, 0, 63, 0, -2, 0,
    1, 0, 0, 0, 1, 63, 1, -33, 0,
    -1, 0, 0, 0, 1, -58, -1, 32, 0,
    -1, 0, 2, 2, 2, -59, 0, 26, 0,
    1, 0, 2, 0, 1, -51, 0, 27, 0,
    0, 0, 2, 2, 2, -38, 0, 16, 0,
    2, 0, 0, 0, 0, 29, 0, -1, 0,
    1, 0, 2, -2, 2, 29, 0, -12, 0,
    2, 0, 2, 0, 2, -31, 0, 13, 0,
    0, 0, 2, 0, 0, 26, 0, -1, 0,
    -1, 0, 2, 0, 1, 21, 0, -10, 0,
    -1, 0, 0, 2, 1, 16, 0, -8, 0,
    1, 0, 0, -2, 1, -13, 0, 7, 0,
    -1, 0, 2, 2, 1, -10, 0, 5, 0,
    1, 1, 0, -2, 0, -7, 0, 0, 0,
    0, 1, 2, 0, 2, 7, 0, -3, 0,
    0, -1, 2, 0, 2, -7, 0, 3, 0,
    1, 0, 2, 2, 2, -8, 0, 3, 0,
    1, 0, 0, 2, 0, 6, 0, 0, 0,
    2, 0, 2, -2, 2, 6, 0, -3, 0,
    0, 0, 0, 2, 1, -6, 0, 3, 0,
    0, 0, 2, 2, 1, -7, 0, 3, 0,
    1, 0, 2, -2, 1, 6, 0, -3, 0,
    0, 0, 0, -2, 1, -5, 0, 3, 0,
    1, -1, 0, 0, 0, 5, 0, 0, 0,
    2, 0, 2, 0, 1, -5, 0, 3, 0,
    0, 1, 0, -2, 0, -4, 0, 0, 0,
    1, 0, -2, 0, 0, 4, 0, 0, 0,
    0, 0, 0, 1, 0, -4, 0, 0, 0,
    1, 1, 0, 0, 0, -3, 0, 0, 0,
    1, 0, 2, 0, 0, 3, 0, 0, 0,
    1, -1, 2, 0, 2, -3, 0, 1, 0,
    -1, -1, 2, 2, 2, -3, 0, 1, 0,
    -2, 0, 0, 0, 1, -2, 0, 1, 0,
    3, 0, 2, 0, 2, -3, 0, 1, 0,
    0, -1, 2, 2, 2, -3, 0, 1, 0,
    1, 1, 2, 0, 2, 2, 0, -1, 0,
    -1, 0, 2, -2, 1, -2, 0, 1, 0,
    2, 0, 0, 0, 1, 2, 0, -1, 0,
    1, 0, 0, 0, 2, -2, 0, 1, 0,
    3, 0, 0, 0, 0, 2, 0, 0, 0,
    0, 0, 2, 1, 2, 2, 0, -1, 0,
    -1, 0, 0, 0, 2, 1, 0, -1, 0,
    1, 0, 0, -4, 0, -1, 0, 0, 0,
    -2, 0, 2, 2, 2, 1, 0, -1, 0,
    -1, 0, 2, 4, 2, -2, 0, 1, 0,
    2, 0, 0, -4, 0, -1, 0, 0, 0,
    1, 1, 2, -2, 2, 1, 0, -1, 0,
    1, 0, 2, 2, 1, -1, 0, 1, 0,
    -2, 0, 2, 4, 2, -1, 0, 1, 0,
    -1, 0, 4, 0, 2, 1, 0, 0, 0,
    1, -1, 0, -2, 0, 1, 0, 0, 0,
    2, 0, 2, -2, 1, 1, 0, -1, 0,
    2, 0, 2, 2, 2, -1, 0, 0, 0,
    1, 0, 0, 2, 1, -1, 0, 0, 0,
    0, 0, 4, -2, 2, 1, 0, 0, 0,
    3, 0, 2, -2, 2, 1, 0, 0, 0,
    1, 0, 2, -2, 0, -1, 0, 0, 0,
    0, 1, 2, 0, 1, 1, 0, 0, 0,
    -1, -1, 0, 2, 1, 1, 0, 0, 0,
    0, 0, -2, 0, 1, -1, 0, 0, 0,
    0, 0, 2, -1, 2, -1, 0, 0, 0,
    0, 1, 0, 2, 0, -1, 0, 0, 0,
    1, 0, -2, -2, 0, -1, 0, 0, 0,
    0, -1, 2, 0, 1, -1, 0, 0, 0,
    1, 1, 0, -2, 1, -1, 0, 0, 0,
    1, 0, -2, 2, 0, -1, 0, 0, 0,
    2, 0, 0, 2, 0, 1, 0, 0, 0,
    0, 0, 2, 4, 2, -1, 0, 0, 0,
    0, 1, 0, 1, 0, 1, 0, 0, 0
  ],

  ss: [],
  cc: []
}

/**
 * Nutation -- AA page B20
 * using nutation in longitude and obliquity from nutlo()
 * and obliquity of the ecliptic from epsiln()
 * both calculated for Julian date J.
 *
 * p = equatorial rectangular position vector of object for
 * mean ecliptic and equinox of date.
 */
nutation.calc = function (date, p) {
  this.calclo(date)
  /* be sure we calculated nutl and nuto */
  epsilon.calc(date)
  /* and also the obliquity of date */

  const f = epsilon.eps + this.nuto
  const ce = Math.cos(f)
  const se = Math.sin(f)
  const sino = Math.sin(this.nuto)
  const cl = Math.cos(this.nutl)
  const sl = Math.sin(this.nutl)

  /* Apply adjustment
   * to equatorial rectangular coordinates of object.
   *
   * This is a composite of three rotations: rotate about x axis
   * to ecliptic of date; rotate about new z axis by the nutation
   * in longitude; rotate about new x axis back to equator of date
   * plus nutation in obliquity.
   */
  const p1 = {
    longitude: cl * p.longitude
      - sl * epsilon.coseps * p.latitude
      - sl * epsilon.sineps * p.distance,
    latitude: sl * ce * p.longitude
      + (cl * epsilon.coseps * ce + epsilon.sineps * se) * p.latitude
      - (sino + (1 - cl) * epsilon.sineps * ce) * p.distance,
    distance: sl * se * p.longitude
      + (sino + (cl - 1) * se * epsilon.coseps) * p.latitude
      + (cl * epsilon.sineps * se + epsilon.coseps * ce) * p.distance
  }

  const dp = {
    longitude: p1.longitude - p.longitude,
    latitude: p1.latitude - p.latitude,
    distance: p1.distance - p.distance
  }

  const result = util.showcor(p, dp)

  p.longitude = p1.longitude
  p.latitude = p1.latitude
  p.distance = p1.distance

  return result
}

/**
 * Nutation in longitude and obliquity
 * computed at Julian date J.
 */
nutation.calclo = function (date) {
  if (this.jdnut.julian == date.julian) {
    return 0
  }

  this.jdnut = date

  /* Julian centuries from 2000 January 1.5,
   * barycentric dynamical time
   */
  const T = (date.julian - 2451545) / 36525
  const T2 = T * T
  const T10 = T / 10

  /* Fundamental arguments in the FK5 reference system. */

  /**
   * longitude of the mean ascending node of the lunar orbit
   * on the ecliptic, measured from the mean equinox of date
   */
  const OM = (util.mods3600(-6962890.539 * T + 450160.280) + (0.008 * T + 7.455) * T2)
    * constant.STR

  /**
   * mean longitude of the Sun minus the
   * mean longitude of the Sun's perigee
   */
  const MS = (util.mods3600(129596581.224 * T + 1287099.804) - (0.012 * T + 0.577) * T2)
    * constant.STR

  /**
   * mean longitude of the Moon minus the
   * mean longitude of the Moon's perigee
   */
  const MM = (util.mods3600(1717915922.633 * T + 485866.733) + (0.064 * T + 31.310) * T2)
    * constant.STR

  /**
   * mean longitude of the Moon minus the
   * mean longitude of the Moon's node
   */
  const FF = (util.mods3600(1739527263.137 * T + 335778.877) + (0.011 * T - 13.257) * T2)
    * constant.STR

  /**
   * mean elongation of the Moon from the Sun.
   */
  const DD = (util.mods3600(1602961601.328 * T + 1072261.307) + (0.019 * T - 6.891) * T2)
    * constant.STR

  /* Calculate sin( i*MM ), etc. for needed multiple angles */
  this.sscc(0, MM, 3)
  this.sscc(1, MS, 2)
  this.sscc(2, FF, 4)
  this.sscc(3, DD, 4)
  this.sscc(4, OM, 2)

  let C = 0.0
  let D = 0.0
  const p = this.nt
  /* point to start of table */

  let p_i = 0

  for (let i = 0; i < 105; i++) {
    /* argument of sine and cosine */
    let k
    let k1 = false
    let cv = 0.0
    let sv = 0.0
    for (let m = 0; m < 5; m++) {
      const j = p[p_i++] // *p++;
      if (j) {
        k = j < 0 ? -j : j
        let su = this.ss[m][k - 1]
        /* sin(k*angle) */
        if (j < 0) {
          su = -su
        }
        const cu = this.cc[m][k - 1]
        if (!k1) { /* set first angle */
          sv = su
          cv = cu
          k1 = true
        } else { /* combine angles */
          const sw = su * cv + cu * sv
          cv = cu * cv - su * sv
          sv = sw
        }
      }
    }
    /* longitude coefficient */
    let f = p[p_i++] // *p++;
    k = p[p_i++] // *p++;
    if (k != 0) {
      f += T10 * k
    }

    /* obliquity coefficient */
    let g = p[p_i++] // *p++;
    k = p[p_i++] // *p++;
    if (k != 0) {
      g += T10 * k
    }

    /* accumulate the terms */
    C += f * sv
    D += g * cv
  }
  /* first terms, not in table: */
  C += (-1742 * T10 - 171996) * this.ss[4][0]
  /* sin(OM) */
  D += (89 * T10 + 92025) * this.cc[4][0]
  /* cos(OM) */
  /*
   printf( "nutation: in longitude %.3f\", in obliquity %.3f\"\n", C, D );
   */
  /* Save answers, expressed in radians */
  this.nutl = 0.0001 * constant.STR * C
  this.nuto = 0.0001 * constant.STR * D
}

/**
 * Prepare lookup table of sin and cos ( i*Lj )
 * for required multiple angles
 */
nutation.sscc = function (k, arg, n) {
  const su = Math.sin(arg)
  const cu = Math.cos(arg)
  this.ss[k] = []
  this.cc[k] = []

  this.ss[k][0] = su
  /* sin(L) */
  this.cc[k][0] = cu
  /* cos(L) */
  let sv = 2 * su * cu
  let cv = cu * cu - su * su
  this.ss[k][1] = sv
  /* sin(2L) */
  this.cc[k][1] = cv
  for (let i = 2; i < n; i++) {
    const s = su * cv + cu * sv
    cv = cu * cv - su * sv
    sv = s
    this.ss[k][i] = sv
    /* sin( i+1 L ) */
    this.cc[k][i] = cv
  }
}

module.exports = nutation
