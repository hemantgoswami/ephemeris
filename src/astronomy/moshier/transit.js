const constant = require('./constant')
const custom_constant = require('../../custom.constant')
const util = require('./util')

const transit = {
  /** Earth radii per au */
  DISFAC: 2.3454780e4,

  /** cosine of 90 degrees 50 minutes: */
  COSSUN: -0.014543897651582657,
  /** cosine of 90 degrees 34 minutes: */
  COSZEN: -9.8900378587411476e-3,

  /* Returned transit, rise, and set times in radians (2 pi = 1 day) */
  r_trnsit: 0.0,
  r_rise: 0.0,
  r_set: 0.0,
  elevation_threshold: 0.0,
  semidiameter: 0.0,
  f_trnsit: false, // boolean
  southern_hemisphere: false // boolean
}

/**
 * Calculate time of transit
 * assuming RA and Dec change uniformly with time
 */
/**
 * Reduce a time of day expressed as an angle into [0, 2pi).
 *
 * Rise, set and transit are measured from the start of the UT day holding
 * the requested instant, but the instant itself is terrestrial time. An
 * event just either side of that boundary therefore lands outside the day
 * and has to be wrapped back in, otherwise util.hms reports hours like 28
 * or 43, or a negative time.
 */
function timeOfDay (angle) {
  let wrapped = angle % constant.TPI
  if (wrapped < 0) {
    wrapped += constant.TPI
  }
  return wrapped
}

transit.calc = function (date, lha, dec) {
  const NR = [], YR = []
  let D // parallax for the moon, rate denominator later

  this.f_trnsit = false
  /* Initialize to no-event flag value. */
  this.r_rise = -10.0
  this.r_set = -10.0
  /* observer's geodetic latitude, in radians */
  let x = constant.glat * constant.DTR
  const coslat = Math.cos(x)
  const sinlat = Math.sin(x)
  const cosdec = Math.cos(dec)
  const sindec = Math.sin(dec)

  this.southern_hemisphere = sinlat < 0

  /* Refer to same start of date as iter_trnsit,
   so r_trnsit means the same thing in both programs. */
  x = Math.floor(date.universal - 0.5) + 0.5 // UT
  x = (date.universal - x) * constant.TPI // UT
  /* adjust local hour angle */
  let y = lha
  /* printf ("%.7f,", lha); */
  while (y < -Math.PI) {
    y += constant.TPI
  }
  while (y > Math.PI) {
    y -= constant.TPI
  }
  const lhay = y
  y = y/(-constant.dradt/constant.TPI + 1.00273790934)
  this.r_trnsit = timeOfDay(x - y)
  /* printf ("rt %.7f ", r_trnsit); */
  /* Ordinarily never print here. */
  const result = {
    approxLocalMeridian: util.hms (this.r_trnsit),
    UTdate: this.r_trnsit/constant.TPI
  }

  if (coslat != 0.0 && cosdec != 0.0) {
    /* The time at which the upper limb of the body meets the
     * horizon depends on the body's angular diameter.
     */
    switch (constant.body.key) {
      /* Sun */
      case 'sun':
        this.semidiameter = 0.2666666666666667
        this.elevation_threshold = -0.8333333333333333
        NR[0] = this.COSSUN
        NR[1] = custom_constant.COSSUN
        break

      /* Moon, elevation = -34' - semidiameter + parallax
       * semidiameter = 0.272453 * parallax + 0.0799"
       */
      case 'moon': {
        const N = 1/(this.DISFAC*constant.body.position.polar.distance)
        D = Math.asin(N) /* the parallax */
        this.semidiameter = 0.2725076*D + 3.874e-7
        NR[0] = NR[1] = -9.890199094634534e-3 - this.semidiameter + D
        this.semidiameter *= constant.RTD
        this.elevation_threshold = -34/60 - this.semidiameter
        NR[0] = NR[1] = Math.sin(NR[0])
        break
      }

      /* Other object */
      default:
        NR[0] = NR[1] = this.COSZEN
        this.semidiameter = 0.0
        this.elevation_threshold = -0.5666666666666666
        break
    }

    YR[0] = (NR[0] - sinlat*sindec)/(coslat*cosdec)
    YR[1] = (NR[1] - sinlat*sindec)/(coslat*cosdec)

    if (YR[0] < 1 && YR[0] > -1 && YR[1] < 1 && YR[1] > -1) {
      this.f_trnsit = true

      /* Derivative of y with respect to declination
       * times rate of change of declination:
       */
      let z = -constant.ddecdt*(sinlat + this.COSZEN*sindec)
      z /= constant.TPI*coslat*cosdec*cosdec
      /* Derivative of acos(y): */
      const zArr = []
      zArr[0] = z / Math.sqrt(1 - YR[0]*YR[0])
      zArr[1] = z / Math.sqrt(1 - YR[1]*YR[1])
      YR[0] = Math.acos(YR[0])
      YR[1] = Math.acos(YR[1])
      D = -constant.dradt/constant.TPI + 1.00273790934
      this.r_rise = timeOfDay(x - (lhay + YR[0])*(1 + zArr[0])/D)
      this.r_set = timeOfDay(x - (lhay - YR[0])*(1 - zArr[0])/D)
      this.r_sanatan_rise = timeOfDay(x - (lhay + YR[1])*(1 + zArr[1])/D)
      this.r_sanatan_set = timeOfDay(x - (lhay - YR[1])*(1 - zArr[1])/D)
      /* Ordinarily never print here. */

      result.dApproxRiseUT = this.r_rise
      result.dApproxSetUT = this.r_set
      result.approxRiseUT = util.hms (this.r_rise)
      result.approxSetUT = util.hms (this.r_set)
      result.dApproxSanatanRiseUT = this.r_sanatan_rise
      result.dApproxSanatanSetUT = this.r_sanatan_set
      result.approxSanatanRiseUT = util.hms (this.r_sanatan_rise)
      result.approxSanatanSetUT = util.hms (this.r_sanatan_set)
    }
  }
  return result
}


module.exports = transit
