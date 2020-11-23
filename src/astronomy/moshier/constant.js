var constant = {
  /* Standard epochs.  Note Julian epochs (J) are measured in
   * years of 365.25 days.
   */
  /** 2000 January 1.5 */
  j2000: 2451545.0,
  /** 1950 January 0.923 Besselian epoch */
  b1950: 2433282.423,
  /** 1900 January 0, 12h UT */
  j1900: 2415020.0,
  /** Radians to hours, minutes, seconds */
  RTOH: 12 / Math.PI,

  /** radians per degree */
  DTR: 1.7453292519943295769e-2,
  /** degrees per radian */
  RTD: 5.7295779513082320877e1,
  /** arc seconds per radian */
  RTS: 2.0626480624709635516e5,
  /** radians per arc second */
  STR: 4.8481368110953599359e-6,

  TPI: 2 * Math.PI,

  /** Input date */
  date: {},

  tlong: -71.13, /* Cambridge, Massachusetts */ // input for kinit
  /** geocentric */
  tlat: 42.38, // input for kinit
  /** geodetic */
  glat: 42.27, // input for kinit

  /* Parameters for calculation of azimuth and elevation */
  /** atmospheric temperature, degrees Centigrade */ // input for kinit
  attemp: 12.0,
  /** atmospheric pressure, millibars */ // input for kinit
  atpress: 1010.0,

  /**
   * If this number is nonzero, then the program will return it for
   * delta T and not calculate anything.
   */
  dtgiven: 0.0, // input for kinit

  /** Distance from observer to center of earth, in earth radii */
  trho: 0.9985,
  flat: 298.257222,
  height: 0.0,

  /** Radius of the earth in au */
  // Thanks to Min He <Min.He@businessobjects.com> for pointing out
  // this needs to be initialized early.
  Rearth: 0.0, // calculated in kinit

  /* Constants used elsewhere. These are DE403 values. */
  /** Radius of the earth, in meters. */
  aearth: 6378137,
  /** Astronomical unit, in kilometers. */
  au: 1.49597870691e8,
  /** Earth/Moon mass ratio. */
  emrat: 81.300585,
  /** Speed of light, km/sec */
  Clight: 2.99792458e5,
  /** C in au/day */
  Clightaud: 0.0,

  /**
   * approximate motion of right ascension and declination
   * of object, in radians per day
   */
  dradt: 0.0,
  ddecdt: 0.0,

  /** earth-sun distance */
  SE: 0.0,
  /** object-sun distance */
  SO: 0.0,
  /** object-earth distance */
  EO: 0.0,

  /** cosine of sun-object-earth angle */
  pq: 0.0,
  /** -cosine of sun-earth-object angle */
  ep: 0.0,
  /** cosine of earth-sun-object angle */
  qe: 0.0,

  /** correction vector, saved for display */
  dp: {},

  /** Current kepler body */
  body: {}
}

module.exports = constant
