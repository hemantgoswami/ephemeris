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
    | LunarNode

  /**
   * The lunar nodes, where the moon's orbit crosses the ecliptic. Rahu is
   * the ascending node and Ketu the descending one, always 180 degrees
   * apart. The unprefixed pair are the mean nodes, from the moon's mean
   * elements; the true pair are the osculating nodes, from the orbital
   * plane the moon is on at the instant. They differ by up to 1.9 degrees.
   */
  type LunarNode = 'rahu' | 'ketu' | 'trueRahu' | 'trueKetu'

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

  /** How a body is named when it is not in the catalogue. */
  type BodySpec =
    | BodyName
    | {name: BodyName}
    /** A numbered minor planet, e.g. {asteroid: 433} for Eros. */
    | {asteroid: number}
    /** A fixed star by catalogue name, e.g. {star: 'Aldebaran'}. */
    | {star: string}
    /** An engine specific identifier. The escape hatch. */
    | {id: number}

  /** What a backend says about itself. */
  interface BackendInfo {
    name: string
    /** npm package it needs, or null when built in. */
    engine: string | null
    /** Whether that package is installed and loadable right now. */
    available: boolean
    /** Why not, when it is not. */
    unavailableReason: string | null
    bodies: string[]
    /** Julian day bounds it claims to be good for, when it says. */
    range: {from: number, to: number} | null
    selected: boolean
  }

  /** The interface a custom backend has to meet. */
  interface Backend {
    name: string
    engine?: string | null
    available: boolean
    unavailableReason?: string | null
    bodies: string[]
    range?: {from: number, to: number} | null
    supports (spec: object): boolean
    calc (date: TerrestrialDate, spec: object):
      {longitude: number, motion?: number, distance: number, raw?: unknown} |
      {error: string} |
      null
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
    /**
     * Distance from the earth where the body reports one, else a sentinel.
     * Always -1 for the lunar nodes, which are directions rather than
     * objects and so have no distance.
     */
    geocentricDistanceKm: number
    /**
     * True when apparent longitude is decreasing.
     *
     * Undefined where the question does not apply: the sun and the moon are
     * never overtaken by the earth so they cannot appear to go backwards,
     * and a star does not move against the ecliptic at all.
     */
    is_retrograde: boolean | undefined

    /**
     * False when the current backend cannot produce this body. Every value
     * field is then null rather than absent, so the shape never changes and
     * callers do not have to special case it.
     */
    available: boolean
    /** Why it could not, when available is false. Often actionable. */
    unavailableReason: string | null
    /** Which backend produced, or failed to produce, this body. */
    backend: string
  }

  interface Result<N extends BodyName = BodyName> {
    /** The backend that produced this result. */
    backend: string
    date: DateReport
    observer: Observer
    observed: { [K in N]: ObservedBody<K> }
  }

  /** What getBody returns: keys are readable renderings of each spec. */
  interface BodyResult {
    backend: string
    date: DateReport
    observer: Observer
    observed: { [key: string]: ObservedBody<BodyName> }
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

  /**
   * Ask for anything the catalogue does not name: a numbered minor planet, a
   * fixed star, or an engine specific id. Whether it resolves depends on the
   * backend; when it does not, the unavailable template comes back instead
   * of an error.
   */
  getBody(
    spec: ephemeris.BodySpec | ephemeris.BodySpec[],
    date: Date | null | undefined,
    geodeticalLongitude: number,
    geodeticalLatitude: number,
    height: number
  ): ephemeris.BodyResult

  /**
   * Choose the backend, by name or by passing a configured one. Throws if
   * the engine it needs is not installed, rather than quietly using another.
   */
  use(backend: string | ephemeris.Backend): string

  /** The name of the backend currently in use. */
  backend(): string

  /** Every registered backend and whether it is usable here. */
  backends(): ephemeris.BackendInfo[]

  /** Add your own backend. */
  registerBackend(backend: ephemeris.Backend): string

  /**
   * Swiss Ephemeris, through the sweph package, which you install yourself.
   * Note that Swiss Ephemeris is AGPL-3.0 or commercially licensed.
   */
  swisseph(options?: {ephePath?: string}): ephemeris.Backend

  /** astronomy-engine, MIT licensed, which you install yourself. */
  astronomyEngine(): ephemeris.Backend
}

export = ephemeris
