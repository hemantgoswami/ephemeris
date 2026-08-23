# Changelog

## 3.0.1
* Moves the development and release instructions out of the README and into
  `CONTRIBUTING.md`, which is not in `files` and so does not ship. npm
  renders the README as the package page, so those sections were showing up
  there as a maintainer runbook in front of anyone looking at the library.
* Moves the changelog into this file. The README keeps a pointer and the one
  note that matters before upgrading. npm has no changelog of its own, it
  only renders the README, so the release notes on GitHub are now the
  per-version view and this file is the full history.
* No code change in either.

## 3.0.0 Breaking Changes - Please read carefully
* Reports `is_retrograde` only for bodies that can actually be retrograde,
  which means the planets and the asteroids. The sun and the moon are never
  overtaken by the earth, so they cannot appear to move backwards; they now
  report `undefined` rather than a permanent `false`, matching what stars
  already did. Their `apparentLongitudeDdPerDay` is unaffected. Sampled over
  four centuries, solar motion never drops below 0.95 degrees a day and
  lunar motion never below 11.76, so there was never an answer to give.
* Removes the unreachable iterative rise and set solver from `transit.js`,
  about 300 lines. It was never called from anywhere, in any commit, and the
  `kepler` call inside it was wrong from the initial 2018 commit, so it threw
  the moment it ran. Nothing changes for callers: the approximate times were
  always the ones being reported. Removing it also drops the last circular
  import in the package, `altaz` and `transit`, which made requiring
  `src/astronomy/moshier/transit` before the package entry point return a
  half built module.
* Fixes rise, set and meridian times falling outside the day they belong
  to. They are measured from the start of the UT day holding the requested
  instant, but the instant itself is terrestrial time, and nothing wrapped
  an event landing either side of that boundary back into the day. So
  `approxSetUT` could report `hours: 43`, or a negative time. Querying at
  exactly midnight always tripped it, which is what `new Date('2026-04-18')`
  gives you. Across a year at six locations, 2179 of 7300 rise and set
  values were 24 hours out and 365 were negative; now none are. The times
  themselves were always right, and still agree with a bisection on the
  library's own elevation to within a few seconds.
* Ships TypeScript definitions in `index.d.ts`. `getPlanet` is generic, so
  its result is narrowed to the body requested.
* Modernises the source to ES2022 declarations. Every `var` became `let` or
  `const`, and `common.copy` takes rest parameters instead of reading
  `arguments`. The calculation itself is untouched and the output is byte
  identical, verified across five dates from 1900 to 2099 including the
  topocentric and transit values.
* Requires Node 22 or newer. The calculation code is untouched and still
  produces byte identical results on older versions, but `engines` now
  states what is actually tested and supported. This matters because Yarn
  refuses to install a package whose `engines` it does not satisfy, where
  npm only warns.
* Node 20 went end of life on 30 April 2026, which is what prompted this.
  Continuous integration now covers Node 22, 24 and 26, and the toolchain in
  `mise.toml` moves to Node 24, the active LTS.

## 2.3.0
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

## 2.2.0 Feature added
* Adds retrograde flag for planets

## 2.0.0 Breaking Changes - Please read carefully
* Released 5th July 2020
* Removes dependency on Moment.js and uses JavaScript's default date object
* Fixes names of a few variables as there were typos (Thanks [Erik](https://github.com/stenflo) for these changes)

## 1.0.0
* Released 30th June 2020
* updates test and fixes test
