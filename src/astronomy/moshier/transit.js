var altaz = require('./altaz')
var body = require('./body')
var constant = require('./constant')
var custom_constant = require('../../custom.constant')
var delta = require('./delta')
var julian = require('./julian')
var kepler = require('./kepler')
var util = require('./util')

var transit = {
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
  southern_hemisphere: false, // boolean

  /* Julian dates of rise, transit and set times. */
  t_rise: 0.0,
  t_trnsit: 0.0,
  elevation_trnsit: 0.0,
  t_set: 0.0,

  STEP_SCALE: 0.5
};

/**
 * Calculate time of transit
 * assuming RA and Dec change uniformly with time
 */
transit.calc = function (date, lha, dec) {
  var NR = [], YR = [];

  this.f_trnsit = false;
  /* Initialize to no-event flag value. */
  this.r_rise = -10.0;
  this.r_set = -10.0;
  /* observer's geodetic latitude, in radians */
  var x = constant.glat * constant.DTR;
  var coslat = Math.cos(x);
  var sinlat = Math.sin(x);
  var cosdec = Math.cos(dec);
  var sindec = Math.sin(dec);

  this.southern_hemisphere = sinlat < 0;

  /* Refer to same start of date as iter_trnsit,
   so r_trnsit means the same thing in both programs. */
  x = Math.floor(date.universal - 0.5) + 0.5; // UT
  x = (date.universal - x) * constant.TPI; // UT
  /* adjust local hour angle */
  var y = lha;
  /* printf ("%.7f,", lha); */
  while (y < -Math.PI) {
    y += constant.TPI;
  }
  while (y > Math.PI) {
    y -= constant.TPI;
  }
  var lhay = y;
  y = y/(-constant.dradt/constant.TPI + 1.00273790934);
  this.r_trnsit = x - y;
  /* printf ("rt %.7f ", r_trnsit); */
  /* Ordinarily never print here. */
  var result = {
    approxLocalMeridian: util.hms (this.r_trnsit),
    UTdate: this.r_trnsit/constant.TPI
  };

  if (coslat != 0.0 && cosdec != 0.0) {
    /* The time at which the upper limb of the body meets the
     * horizon depends on the body's angular diameter.
     */
    switch (constant.body.key) {
      /* Sun */
      case 'sun':
        this.semidiameter = 0.2666666666666667;
        this.elevation_threshold = -0.8333333333333333;
        NR[0] = this.COSSUN
        NR[1] = custom_constant.COSSUN
        break;

      /* Moon, elevation = -34' - semidiameter + parallax
       * semidiameter = 0.272453 * parallax + 0.0799"
       */
      case 'moon':
        var N = 1/(this.DISFAC*constant.body.position.polar.distance);
        var D = Math.asin(N); /* the parallax */
        this.semidiameter = 0.2725076*D + 3.874e-7;
        NR[0] = NR[1] = -9.890199094634534e-3 - this.semidiameter + D;
        this.semidiameter *= constant.RTD;
        this.elevation_threshold = -34/60 - this.semidiameter;
        NR[0] = NR[1] = Math.sin(NR[0]);
        break;

      /* Other object */
      default:
        NR[0] = NR[1] = this.COSZEN
        this.semidiameter = 0.0;
        this.elevation_threshold = -0.5666666666666666;
        break;
    }

    YR[0] = (NR[0] - sinlat*sindec)/(coslat*cosdec);
    YR[1] = (NR[1] - sinlat*sindec)/(coslat*cosdec);

    if (YR[0] < 1 && YR[0] > -1 && YR[1] < 1 && YR[1] > -1) {
      this.f_trnsit = true;

      /* Derivative of y with respect to declination
       * times rate of change of declination:
       */
      var z = -constant.ddecdt*(sinlat + this.COSZEN*sindec);
      z /= constant.TPI*coslat*cosdec*cosdec;
      /* Derivative of acos(y): */
      var zArr = [];
      zArr[0] = z / Math.sqrt(1 - YR[0]*YR[0]);
      zArr[1] = z / Math.sqrt(1 - YR[1]*YR[1]);
      YR[0] = Math.acos(YR[0]);
      YR[1] = Math.acos(YR[1]);
      D = -constant.dradt/constant.TPI + 1.00273790934;
      this.r_rise = x - (lhay + YR[0])*(1 + zArr[0])/D;
      this.r_set = x - (lhay - YR[0])*(1 - zArr[0])/D;
      this.r_sanatan_rise = x - (lhay + YR[1])*(1 + zArr[1])/D;
      this.r_sanatan_set = x - (lhay - YR[1])*(1 - zArr[1])/D;
      /* Ordinarily never print here. */

      result.dApproxRiseUT = this.r_rise;
      result.dApproxSetUT = this.r_set;
      result.approxRiseUT = util.hms (this.r_rise);
      result.approxSetUT = util.hms (this.r_set);
      result.dApproxSanatanRiseUT = this.r_sanatan_rise;
      result.dApproxSanatanSetUT = this.r_sanatan_set;
      result.approxSanatanRiseUT = util.hms (this.r_sanatan_rise);
      result.approxSanatanSetUT = util.hms (this.r_sanatan_set);
    }
  }
  return result;
};

/** Compute estimate of lunar rise and set times for iterative solution. */
transit.iterator = function (time, callback) {
  var date = {
    julian: time
  };

  julian.toGregorian (date);
  julian.calc (date);
  delta.calc (date);

  kepler (date, body.earth);

  callback ();
};

/** Iterative computation of rise, transit, and set times. */
transit.iterateTransit = function (callback) {
  var date, t0; // double
  var isPrtrnsit = false;
  var loopctr = 0;
  // var retry = 0;
  /* Start iteration at time given by the user. */
  var t1 = body.earth.position.date.universal; // UT

  /* Find transit time. */
  do {
    t0 = t1;
    date = Math.floor (t0 - 0.5) + 0.5;
    this.iterator (t0, callback);
    t1 = date + this.r_trnsit / constant.TPI;
    if (++loopctr > 10) {
      break;
      // goto no_trnsit;
    }
  } while (Math.abs (t1 - t0) > .0001);

  if (loopctr <= 10) {
    this.t_trnsit = t1;
    this.elevation_trnsit = altaz.elevation;
    var trnsit1 = this.r_trnsit;
    var set1 = this.r_set;
    if (!this.f_trnsit) {
      /* Rise or set time not found. Apply a search technique to
       check near inferior transit if object is above horizon now. */
      this.t_rise = -1.0;
      this.t_set = -1.0;
      if (altaz.elevation > this.elevation_threshold) {
        this.noRiseSet (callback);
      }
      // goto prtrnsit;
    } else {
      /* Set current date to be that of the transit just found. */
      var date_trnsit = date;
      t1 = date + this.r_rise / constant.TPI;
      /* Choose rising no later than transit. */
      if (t1 >= this.t_trnsit) {
        date -= 1;
        t1 = date + this.r_rise / constant.TPI;
      }
      loopctr = 0;
      do {
        t0 = t1;
        this.iterator (t0, callback);
        /* Skip out if no event found. */
        if (!this.f_trnsit) {
          /* Rise or set time not found. Apply search technique. */
          this.t_rise = -1.0;
          this.t_set = -1.0;
          this.noRiseSet (callback);
          isPrtrnsit = true;
          // goto prtrnsit;
        } else if (++loopctr > 10) {
          // Rise time did not converge
          this.f_trnsit = false;
          isPrtrnsit = true;
          // goto prtrnsit;
        } else {
          t1 = date + this.r_rise / constant.TPI;
          if (t1 > this.t_trnsit) {
            date -= 1;
            t1 = date + this.r_rise / constant.TPI;
          }
        }
      } while (Math.abs (t1 - t0) > .0001);

      if (!isPrtrnsit) {
        var rise1 = this.r_rise;
        this.t_rise = t1;

        /* Set current date to be that of the transit. */
        date = date_trnsit;
        this.r_set = set1;
        /* Choose setting no earlier than transit. */
        t1 = date + this.r_set / constant.TPI;
        if (t1 <= this.t_trnsit) {
          date += 1;
          t1 = date + this.r_set / constant.TPI;
        }
        loopctr = 0;
        do {
          t0 = t1;
          this.iterator (t0, callback);
          if (!this.f_trnsit) {
            /* Rise or set time not found. Apply search technique. */
            this.t_rise = -1.0;
            this.t_set = -1.0;
            this.noRiseSet (callback);
            isPrtrnsit = true;
            // goto prtrnsit;
          } else if (++loopctr > 10) {
            // Set time did not converge
            this.f_trnsit = false;
            isPrtrnsit = true;
            // goto prtrnsit;
          } else {
            t1 = date + this.r_set / constant.TPI;
            if (t1 < this.t_trnsit) {
              date += 1;
              t1 = date + this.r_set / constant.TPI;
            }
          }
        } while (Math.abs(t1 - t0) > .0001);

        if (!isPrtrnsit) {
          this.t_set = t1;
          this.r_trnsit = trnsit1;
          this.r_rise = rise1;
        }
      }
    }
// prtrnsit:
    var result = {};
    result.localMeridianTransit = julian.toGregorian ({julian: this.t_trnsit});
    if (this.t_rise != -1.0) {
      result.riseDate = julian.toGregorian ({julian: this.t_rise});
    }
    if (this.t_set != -1.0) {
      result.setDate = julian.toGregorian ({julian: this.t_set});
      if (this.t_rise != -1.0) {
        t0 = this.t_set - this.t_rise;
        if (t0 > 0 && t0 < 1) {
          result.visibleHours = 24 * t0;
        }
      }
    }

    if (
      Math.abs(body.earth.position.date.julian - this.t_rise) > 0.5 &&
      Math.abs(body.earth.position.date.julian - this.t_trnsit) > 0.5 &&
      Math.abs(body.earth.position.date.julian - this.t_set) > 0.5
    ) {
      // wrong event date
      result.wrongEventDate = true;
    }
  }
// no_trnsit:
  // prtflg = prtsave;
  this.f_trnsit = true;
  return result;
};

/**
 * If the initial approximation fails to locate a rise or set time,
 * this function steps between the transit time and the previous
 * or next inferior transits to find an event more reliably.
 */
transit.noRiseSet = function (callback) {
  var t_trnsit0 = this.t_trnsit; // double
  var el_trnsit0 = this.elevation_trnsit; // double

  /* Step time toward previous inferior transit to find
   whether a rise event was missed. The step size is a function
   of the azimuth and decreases near the transit time. */
  var t_above = t_trnsit0;
  var el_above = el_trnsit0;
  var t_below = -1.0;
  var el_below = el_above;
  var t = t_trnsit0 - 0.25;
  var e = 1.0;
  while (e > 0.005) {
    this.iterator (t, callback);
    if (altaz.elevation > this.elevation_threshold) {
      /* Object still above horizon. */
      t_above = t;
      el_above = altaz.elevation;
    } else {
      /* Object is below horizon. Rise event is bracketed.
       Proceed to interval halving search. */
      t_below = t;
      el_below = altaz.elevation;
      break; // goto search_rise;
    }
    /* Step time by an amount proportional to the azimuth deviation. */
    e = altaz.azimuth/360;
    if (altaz.azimuth < 180) {
      if (this.southern_hemisphere) {
        t += this.STEP_SCALE * e;
      } else {
        t -= this.STEP_SCALE * e;
      }
    } else {
      e = 1 - e;
      if (this.southern_hemisphere) {
        t -= this.STEP_SCALE * e;
      } else {
        t += this.STEP_SCALE * e;
      }
    }
  }

  /* No rise event detected. */
  if (altaz.elevation > this.elevation_threshold) {
    /* Previous inferior transit is above horizon. */
    this.t_rise = -1.0;
  } else {
    /* Find missed rise time. */
// search_rise:
    this.t_rise = this.searchHalve (t_below, el_below, t_above, el_above, callback);
    this.f_trnsit = true;
  }

  /* Step forward in time toward the next inferior transit. */
  t_above = t_trnsit0;
  el_above = el_trnsit0;
  t_below = -1.0;
  el_below = el_above;
  t = t_trnsit0 + 0.25;
  e = 1.0;
  while (e > 0.005) {
    this.iterator (t, callback);
    if (altaz.elevation > this.elevation_threshold) {
      /* Object still above horizon. */
      t_above = t;
      el_above = altaz.elevation;
    } else {
      /* Object is below horizon. Event is bracketed.
       Proceed to interval halving search. */
      t_below = t;
      el_below = altaz.elevation;
      break; // goto search_set;
    }
    /* Step time by an amount proportional to the azimuth deviation. */
    e = altaz.azimuth/360;
    if (altaz.azimuth < 180) {
      if (this.southern_hemisphere) {
        t += this.STEP_SCALE * e; /* Southern hemisphere observer. */
      } else {
        t -= this.STEP_SCALE * e;
      }
    } else {
      e = 1 - e;
      if (this.southern_hemisphere) {
        t -= this.STEP_SCALE * e;
      } else {
        t += this.STEP_SCALE * e;
      }
    }
  }

  if (altaz.elevation > this.elevation_threshold) {
    /* Next inferior transit is above horizon. */
    this.t_set = -1.0;
    // return 0;
  } else {
    /* Find missed set time. */
// search_set:
    this.t_set = this.searchHalve (t, altaz.elevation, this.t_trnsit, this.elevation_trnsit, callback);
    this.f_trnsit = true;
  }
};

/**
 * Search rise or set time by simple interval halving
 * after the event has been bracketed in time.
 */
transit.searchHalve = function (t1, y1, t2, y2, callback) {
  var e2 = y2 - this.elevation_threshold;
  var tm = 0.5 * (t1 + t2);

  while (Math.abs(t2 - t1) > .00001) {
    /* Evaluate at middle of current interval. */
    tm = 0.5 * (t1 + t2);
    this.iterator (tm, callback);
    var em = altaz.elevation - this.elevation_threshold;
    /* Replace the interval boundary whose error has the same sign as em. */
    if (em * e2 > 0) {
      t2 = tm;
      e2 = em;
    } else {
      t1 = tm;
    }
  }
  return tm;
};

module.exports = transit
