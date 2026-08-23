'use strict'

/**
 * The Swiss Ephemeris data files this package knows how to fetch.
 *
 * Pinned to a commit rather than a branch, so the same command fetches the
 * same bytes next year, and every file carries a checksum so a bad or
 * substituted download is caught rather than trusted. Branch URLs move: an
 * earlier attempt at the documented astro.com path already 404s.
 *
 * The files are Swiss Ephemeris data and carry Swiss Ephemeris licensing,
 * AGPL-3.0 or a commercial licence from Astrodienst. Fetching them is a
 * deliberate act by the person running the command, which is the whole
 * reason this is not automatic.
 */

const COMMIT = '3fd0f956d73898b91cc4f67cf18b21af656d1342'

const ephe = {
  commit: COMMIT,
  baseUrl: 'https://raw.githubusercontent.com/aloistr/swisseph/' + COMMIT + '/ephe',

  files: {
    'sepl_18.se1': {
      purpose: 'planets, 1800 to 2400',
      bytes: 484068,
      sha256: 'ca1393ceab3a44fbc895887cf789c68819ae6a1cbc9b22225872dbe4ccd99a66'
    },
    'semo_18.se1': {
      purpose: 'moon, 1800 to 2400',
      bytes: 1305686,
      sha256: '1ca07bd67c24374d77226180c20a4f9996cba013697894810518e7eb582ca4f7'
    },
    'seas_18.se1': {
      purpose: 'main asteroids including Chiron, 1800 to 2400',
      bytes: 222411,
      sha256: 'a2cd8fc33807c78ca9a700c91c2e042258b12fc4796519e00781440b5ad8b2e2'
    },
    'sefstars.txt': {
      purpose: 'fixed star catalogue',
      bytes: 135643,
      sha256: '18b0dcafbe5b7240773daba2c038a325f5b3fc4163f61e0a7f4e92abd4f517c6'
    }
  }
}

/** Everything, which is the sensible default and only about 2.1 MB. */
ephe.defaultFiles = Object.keys(ephe.files)

ephe.urlFor = function (name) {
  if (!Object.prototype.hasOwnProperty.call(ephe.files, name)) {
    throw new Error('Unknown ephemeris file "' + name + '". Known files are: ' +
      ephe.defaultFiles.join(', ') + '.')
  }
  return ephe.baseUrl + '/' + name
}

ephe.totalBytes = function (names) {
  return (names || ephe.defaultFiles).reduce(function (sum, name) {
    return sum + ephe.files[name].bytes
  }, 0)
}

module.exports = ephe
