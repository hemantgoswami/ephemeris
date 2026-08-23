// Type definitions for ephemeris
// Hand written against the shape index.js actually returns.

declare namespace ephemeris {
  /** Every body getPlanet accepts, and every key getAllPlanets fills in. */
  type BodyName =
    | 'sun'
    | 'mercury'
    | 'venus'
    | 'moon'
    | 'mars'
    | 'jupiter'
    | 'saturn'
    | 'uranus'
    | 'neptune'
    | 'pluto'
    | 'chiron'
    | 'sirius'

  /** A calendar date broken out of a julian day. */
  interface UniversalDate {
    julian: number
    year: number
    month: number
    day: number
    hours: number
    minutes: number
    seconds: number
    milliseconds: number
  }

  /** The requested instant, with everything derived from it. */
  interface TerrestrialDate {
    day: number
    month: number
    year: number
    hours: number
    minutes: number
    seconds: number
    julianDate: number
    julianTime: number
    julian: number
    /** Julian epoch, years of 365.25 days. */
    j2000: number
    /** Besselian epoch. */
    b1950: number
    j1900: number
    /** TT minus UT in seconds. */
    delta: number
    terrestrial: number
    universal: number
    universalDate: UniversalDate
    universalDateString: string
  }

  interface DateReport {
    /** Terrestrial time as 'd.m.yyyy h:m:s'. */
    gregorianTerrestrial: string
    gregorianTerrestrialRaw: TerrestrialDate
    /** Universal time as 'd.m.yyyy h:m:s.mmm'. */
    gregorianUniversal: string
    /** TT minus UT, formatted as '00:00:<seconds>'. */
    gregorianDelta: string
    julianTerrestrial: number
    julianUniversal: number
    /** TT minus UT expressed in days. */
    julianDelta: number
  }

  interface Observer {
    name: 'earth'
    longitudeGeodetic: number
    longitudeGeocentric: number
    latitudeGeodetic: number
    latitudeGeocentric: number
    /** Metres above the ellipsoid, as passed in. */
    heightGeodetic: number
    /** Distance from the centre of the earth, in kilometres. */
    heightGeocentric: number
  }

  interface ObservedBody<N extends BodyName = BodyName> {
    name: N
    /**
     * The full internal state for this body, including position.altaz and
     * the transit block. Its shape is not part of the public contract and
     * may change between releases.
     */
    raw: unknown
    /** Apparent ecliptic longitude in dms, reduced into its 30 degree sign. */
    apparentLongitudeDms30: string
    /** Apparent ecliptic longitude in dms over the whole circle. */
    apparentLongitudeDms360: string
    /** Apparent ecliptic longitude in decimal degrees. */
    apparentLongitudeDd: number
    /**
     * Apparent motion in longitude, decimal degrees per day, negative when
     * retrograde. Reported for the sun and the moon too, where it is always
     * positive. Undefined for stars, which have no such motion.
     */
    apparentLongitudeDdPerDay: number | undefined
    /** Distance from the earth where the body reports one, else a sentinel. */
    geocentricDistanceKm: number
    /**
     * True when apparent longitude is decreasing.
     *
     * Undefined where the question does not apply: the sun and the moon are
     * never overtaken by the earth so they cannot appear to go backwards,
     * and a star does not move against the ecliptic at all.
     */
    is_retrograde: boolean | undefined
  }

  interface Result<N extends BodyName = BodyName> {
    date: DateReport
    observer: Observer
    observed: { [K in N]: ObservedBody<K> }
  }
}

declare const ephemeris: {
  /**
   * Observe every body at an instant. Pass null as the date to use now.
   * Longitude and latitude are geodetic degrees, height is metres.
   */
  getAllPlanets(
    date: Date | null | undefined,
    geodeticalLongitude: number,
    geodeticalLatitude: number,
    height: number
  ): ephemeris.Result

  /**
   * Observe a single body. Throws if the name is not one of getBodyNames().
   */
  getPlanet<N extends ephemeris.BodyName>(
    planetName: N,
    date: Date | null | undefined,
    geodeticalLongitude: number,
    geodeticalLatitude: number,
    height: number
  ): ephemeris.Result<N>

  /** The names getPlanet accepts. */
  getBodyNames(): ephemeris.BodyName[]
}

export = ephemeris
