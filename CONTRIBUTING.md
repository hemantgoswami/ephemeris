# Contributing

## Development

```
yarn install
yarn run lint      # eslint, flat config in eslint.config.js
yarn run test      # tape, runs lint first
```

With [mise](https://mise.jdx.dev) installed, `mise run test`, `mise run lint`
and `mise run lintfix` do the same.

`.github/workflows/ci.yml` runs the same lint and tests on every pull request
and every push to `main`, across Node 22, 24 and 26. Node 24 is the version
the dev toolchain pins in `mise.toml`.

`no-var` and `prefer-const` are errors, not warnings, so the old ES5 style
cannot creep back one file at a time. `index.d.ts` is maintained by hand and
is not generated from the sources.

## Releasing

Merging to `main` is the release. `.github/workflows/release.yml` checks
every push to `main`: if the version in `package.json` is not on npm yet, it
lints, tests, publishes, then creates the `v<version>` tag and a GitHub
Release whose notes are the changelog entry for that version. A push that
does not change the version does nothing and passes.

So to ship a release:

1. Bump `version` in `package.json` and add a `#### <version>` changelog
   entry to the README, on a branch
2. Merge it to `main`

That is the whole process. There is no tag to push and no release to create
by hand; the workflow does both after the publish succeeds, so a tag only
ever exists for a version that actually shipped.

Because any merge that bumps the version ships to npm, treat the version
field as the release switch: leave it alone in ordinary pull requests.

Authentication is npm trusted publishing, so there is no token stored in the
repository. The one time setup on npmjs.com, under the ephemeris package,
Settings, Trusted publishers, is a GitHub Actions publisher with:

| Field | Value |
| --- | --- |
| Organization or user | the GitHub account that owns the repository |
| Repository | `ephemeris` |
| Workflow filename | `release.yml` |
| Environment | leave blank |

The workflow filename has to match exactly, and the environment field has to
be blank because the job does not declare one. Renaming or moving the
workflow means updating the trusted publisher entry, or the publish is
rejected.

This file is deliberately left out of the `files` list in `package.json`, so
it stays in the repository and does not ship to npm, where the README is
rendered as the package page.

## Testing the optional backends

The Swiss Ephemeris and astronomy-engine adapters have no engine installed
by default, so the conformance block in the test suite only exercises what
is present. To cover all three:

```
npm install --no-save sweph astronomy-engine
yarn run test
```

That takes the suite from 561 assertions to 681. Do not add either engine to
`devDependencies`: `sweph` carries Swiss Ephemeris, which is AGPL-3.0, and
contributors should opt into that deliberately rather than by cloning.

## Known gaps

`star.js` reports right ascension where the rest of the library reports
ecliptic longitude. The backend converts radians to degrees so the units
match, but the quantity is still wrong: Swiss Ephemeris puts Sirius at
104.449 degrees of ecliptic longitude for 2026-01-01, and this library says
101.455, because they are not the same measurement. Only `sirius` is
affected, since it is the only star. Fixing it properly means running the
star through the ecliptic reduction the planets use.

`processor.test()` in `src/astronomy/moshier/processor.js` is a self check
inherited from the original port. Its expected topocentric and refraction
values have never matched what this code produces, so it is not part of
`yarn run test`. The apparent geocentric positions it checks do match.
