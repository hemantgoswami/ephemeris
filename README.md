[![CI](https://github.com/hemantgoswami/ephemeris/actions/workflows/ci.yml/badge.svg)](https://github.com/hemantgoswami/ephemeris/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/ephemeris.svg)](https://www.npmjs.com/package/ephemeris)

This source is modified version of [xerik](https://www.npmjs.com/package/ephemeris-moshier). Thank you for such a brilliant piece of work.

This is basically JavaScript implementation of [Moshier's ephemeris](http://www.moshier.net) calculations for sun, planets, comets, asteroids and stars.

Which, initially written by [mivion](https://github.com/mivion/ephemeris), xerik converted it into a node module. This is a slight customized version with following changes:

1. Changes the transit method to get standard sun/moon rise/set times as well as a custom horizon based
1. Takes in JavaScript date object as opposed to a date time string
1. Implements a method to just fetch in single planet as opposed to all of it
1. Reports apparent daily motion and a retrograde flag
1. Removes html, css bit to keep it focused to one task
1. Reformats the code

### Installation

`npm install ephemeris`

### Usage

*app.js*
```javascript
const ephemeris = require('ephemeris');
const dateObj = new Date('2015-08-10T17:09:01.000+00:00');

// parameters: ephemeris.getAllPlanets(dateObj, longitude, latitude, height);
const all = ephemeris.getAllPlanets(dateObj, 10.0014, 53.5653, 0);

// parameters: ephemeris.getPlanet(name, dateObj, longitude, latitude, height);
const venus = ephemeris.getPlanet('venus', dateObj, 10.0014, 53.5653, 0);

// the names getPlanet accepts
ephemeris.getBodyNames();
// [ 'sun', 'mercury', 'venus', 'moon', 'mars', 'jupiter', 'saturn',
//   'uranus', 'neptune', 'pluto', 'chiron', 'sirius',
//   'rahu', 'ketu', 'trueRahu', 'trueKetu' ]
```

#### Lunar nodes: Rahu and Ketu

The two points where the moon's orbit crosses the ecliptic are included as
bodies, so they come back from `getAllPlanets` like anything else.

```javascript
const nodes = ephemeris.getAllPlanets(dateObj, 10.0014, 53.5653, 0).observed;

nodes.rahu.apparentLongitudeDd;      // 342.16922, mean ascending node
nodes.ketu.apparentLongitudeDd;      // 162.16922, always rahu + 180
nodes.trueRahu.apparentLongitudeDd;  // 340.95728, osculating
nodes.trueKetu.apparentLongitudeDd;  // 160.95728
```

| | `rahu` and `ketu` | `trueRahu` and `trueKetu` |
| --- | --- | --- |
| from | the moon's mean elements | the orbital plane the moon is on right now |
| motion | steady -0.052954 degrees a day, always retrograde | wanders, and moves forwards about a quarter of the time |
| differ from the mean by | - | up to 1.9 degrees |
| usually wanted by | Vedic work | much Western practice, matching Swiss Ephemeris `SE_TRUE_NODE` |

A node is a direction, not an object, so `geocentricDistanceKm` is always
`-1` and there is no rise, set or altitude for it.

**These are tropical longitudes**, of date, exactly like every other
longitude here. Sidereal work needs an ayanamsa subtracted, and this library
does not provide one, so `rahu` is not the sidereal Rahu until you subtract
your chosen ayanamsa yourself.

The date is read in UTC. Passing `null` as the date uses the current time.
`getPlanet` throws if it is given a name that is not in `getBodyNames()`.

#### What each observed body reports

| Field | Meaning |
| --- | --- |
| `name` | the body's key, same as the key it is filed under |
| `raw` | the full internal state for the body, including `position.altaz` |
| `apparentLongitudeDms360` | apparent ecliptic longitude, degrees/minutes/seconds over the whole circle |
| `apparentLongitudeDms30` | the same longitude reduced into its 30 degree sign |
| `apparentLongitudeDd` | apparent ecliptic longitude in decimal degrees |
| `apparentLongitudeDdPerDay` | apparent motion in longitude, decimal degrees per day; negative when retrograde |
| `geocentricDistanceKm` | distance from the earth, where the body reports one |
| `is_retrograde` | true when apparent longitude is decreasing; undefined where retrograde motion cannot happen |

Apparent motion is measured between one hour before the requested instant
and the instant itself, so a station lands within about an hour of the real
one.

`is_retrograde` is only reported for bodies that can be retrograde, which
means the planets and the asteroids. The sun and the moon are never
overtaken by the earth, so they cannot appear to move backwards and they
report `undefined` rather than a permanent `false`; their
`apparentLongitudeDdPerDay` is still given, and is always positive. A star
reports `undefined` for both, since it does not move against the ecliptic.

Rise and set times are the analytic approximation from `transit.js`. They
agree with a bisection on the library's own elevation to within a few
seconds, at every latitude tested up to 78 degrees north. A body that never
rises or sets on a given day simply has no rise and set fields.

#### TypeScript

Types ship with the package, hand written in `index.d.ts`, so there is
nothing to install from DefinitelyTyped.

```typescript
import ephemeris = require('ephemeris');

const all = ephemeris.getAllPlanets(new Date(), 10.0014, 53.5653, 0);
const lon: number = all.observed.venus.apparentLongitudeDd;

// getPlanet narrows the result to the body you asked for, so
// one.observed.moon type checks and one.observed.venus does not
const one = ephemeris.getPlanet('moon', null, 0, 0, 0);
```

`BodyName`, `ObservedBody`, `Observer`, `DateReport` and `Result` are all
exported for use in your own signatures. Note that `is_retrograde` and
`apparentLongitudeDdPerDay` are typed as possibly undefined, because stars
do not have them.

#### Sample output

```javascript
{
  date: {
    gregorianTerrestrial: '10.8.2015 17:9:1',
    gregorianTerrestrialRaw: {
      day: 10,
      month: 8,
      year: 2015,
      hours: 17,
      minutes: 9,
      seconds: 1,
      julianDate: 2457244.5,
      julianTime: 0.7145949074074074,
      julian: 2457245.2145949076,
      j2000: 2015.6063370154895,
      b1950: 2015.6065478300004,
      j1900: 2015.6063370154895,
      delta: 68.01714323102905,
      terrestrial: 2457245.2145949076,
      universal: 2457245.2138076723,
      universalDate: [Object],
      universalDateString: '10.8.2015 17:7:52.983'
    },
    gregorianUniversal: '10.8.2015 17:7:52.983',
    gregorianDelta: '00:00:68.01714323102905',
    julianTerrestrial: 2457245.2145949076,
    julianUniversal: 2457245.2138076723,
    julianDelta: 0.0007872354540628362
  },
  observer: {
    name: 'earth',
    longitudeGeodetic: 10.0014,
    longitudeGeocentric: 10.0014,
    latitudeGeodetic: 53.5653,
    latitudeGeocentric: 53.38123133267187,
    heightGeodetic: 0,
    heightGeocentric: 6364.336264644461
  },
  observed: {
    sun: {
      name: 'sun',
      raw: [Object],
      apparentLongitudeDms30: '17°45\'39"',
      apparentLongitudeDms360: '137°45\'39"',
      apparentLongitudeDd: 137.7610585591896,
      apparentLongitudeDdPerDay: 0.9593885486374347,
      geocentricDistanceKm: -1,
      is_retrograde: false
    },
    venus: {
      name: 'venus',
      raw: [Object],
      apparentLongitudeDms30: '25°43\'16"',
      apparentLongitudeDms360: '145°43\'16"',
      apparentLongitudeDd: 145.7212923824036,
      apparentLongitudeDdPerDay: -0.5678333325058702,
      geocentricDistanceKm: -1,
      is_retrograde: true
    },
    // ... mercury, moon, mars, jupiter, saturn, uranus, neptune, pluto,
    //     chiron and sirius follow in the same shape
    sirius: {
      name: 'sirius',
      raw: [Object],
      apparentLongitudeDms30: '11°27\'17"',
      apparentLongitudeDms360: '101°27\'17"',
      apparentLongitudeDd: 1.7707222368344282,
      apparentLongitudeDdPerDay: undefined,
      geocentricDistanceKm: 7777,
      is_retrograde: undefined
    }
  }
}
```

### Contributing

Setting the project up, the lint and test commands, and how a release is
cut are in [CONTRIBUTING.md](CONTRIBUTING.md).

### Changelog

Full history is in [CHANGELOG.md](CHANGELOG.md), and each release on GitHub
carries its own entry.

3.x requires Node 22 or newer, and reports `is_retrograde` only for bodies
that can actually be retrograde. Read the 3.0.0 entry before upgrading from
2.x.

### Contributors

This implementation based on code by [Steve Moshier](http://www.moshier.net).

The initial JavaScript code has been written by [xerik](https://github.com/xErik/ephemeris-moshier).

### License

[GPLv3](https://www.gnu.org/licenses/gpl-3.0.html)
