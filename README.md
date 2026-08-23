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
// [ 'sun', 'mercury', 'venus', 'moon', 'mars', 'jupiter',
//   'saturn', 'uranus', 'neptune', 'pluto', 'chiron', 'sirius' ]
```

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
| `is_retrograde` | true when apparent longitude is decreasing |

Apparent motion is measured between one hour before the requested instant
and the instant itself, so a station lands within about an hour of the real
one. Stars report `undefined` for both motion fields, since retrograde
motion does not apply to them.

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

### Development

```
yarn install
yarn run lint      # eslint, flat config in eslint.config.js
yarn run test      # tape, runs lint first
```

With [mise](https://mise.jdx.dev) installed, `mise run test`, `mise run lint`
and `mise run lintfix` do the same.

`.github/workflows/ci.yml` runs the same lint and tests on every pull
request and every push to `main`, across Node 20, 22 and 24.

### Releasing

Releases are published to npm by `.github/workflows/release.yml` when a
GitHub Release is published. The workflow authenticates with npm trusted
publishing, so there is no token stored in the repository.

One time setup on npmjs.com, under the ephemeris package, Settings, Trusted
publishers, add a GitHub Actions publisher with:

| Field | Value |
| --- | --- |
| Organization or user | `hemantgoswami` |
| Repository | `ephemeris` |
| Workflow filename | `release.yml` |
| Environment | leave blank |

The workflow filename has to match exactly. Renaming or moving the workflow
means updating the trusted publisher entry, or the publish is rejected.

To cut a release:

1. Bump `version` in `package.json` and add a changelog entry, on a branch
2. Merge it to `main`
3. Publish a GitHub Release tagged `v2.3.0`, from Releases in the GitHub UI
   or with `gh release create v2.3.0 --title v2.3.0 --notes "..."`

Merging on its own publishes nothing. The release in step 3 is what starts
the workflow.

The workflow refuses to publish if the tag does not match the version in
`package.json`, or if that version is already on npm. Running it by hand
from the Actions tab does everything except the publish, which is a cheap
way to check a version packs correctly before cutting the release.

Known gap: `processor.test()` in `src/astronomy/moshier/processor.js` is a
self check inherited from the original port. Its expected topocentric and
refraction values have never matched what this code produces, so it is not
part of `yarn run test`. The apparent geocentric positions it checks do
match.

### Changelog

#### 2.3.0
* Fixes `is_retrograde`, which was previously wrong for most bodies. It
  compared two reductions of the same position vector rather than two
  positions, so the difference it measured was the change in obliquity over
  an hour, not the body's own motion. The flag was also inverted, missing for
  the sun and the moon, and dependent on the host machine's timezone.
* Adds `apparentLongitudeDdPerDay`, the apparent motion in longitude
* Adds `getBodyNames()`, and makes `getPlanet` throw on an unknown name
* Migrates ESLint to the flat config required by ESLint 9, so `yarn run lint`
  works again
* Replaces the placeholder test with real coverage of positions, retrograde
  windows and timezone independence

#### 2.2.0 Feature added
* Adds retrograde flag for planets

#### 2.0.0 Breaking Changes - Please read carefully
* Released 5th July 2020
* Removes dependency on Moment.js and uses JavaScript's default date object
* Fixes names of a few variables as there were typos (Thanks [Erik](https://github.com/stenflo) for these changes)

#### 1.0.0
* Released 30th June 2020
* updates test and fixes test

### Contributors

This implementation based on code by [Steve Moshier](http://www.moshier.net).

The initial JavaScript code has been written by [xerik](https://github.com/xErik/ephemeris-moshier).

### License

[GPLv3](https://www.gnu.org/licenses/gpl-3.0.html)
