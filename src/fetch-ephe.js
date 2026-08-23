'use strict'

const crypto = require('crypto')
const fs = require('fs')
const path = require('path')

const ephe = require('./ephe-files')

/**
 * Fetch Swiss Ephemeris data files into a directory.
 *
 * Deliberately not automatic. There is no postinstall hook and nothing
 * downloads during a calculation: a library that reaches the network while
 * you are asking it for a planet is a bad surprise in CI, behind a proxy,
 * or on an airgapped box. This runs when you run it, and not otherwise.
 *
 * Already present files with the right checksum are left alone, so it is
 * safe to run repeatedly.
 */
async function fetchEphemeris (options) {
  const settings = options || {}
  const directory = settings.ephePath || './ephe'
  const wanted = settings.files || ephe.defaultFiles
  const onProgress = settings.onProgress || function () {}

  wanted.forEach(function (name) {
    ephe.urlFor(name) // throws early on a name we do not know
  })

  fs.mkdirSync(directory, {recursive: true})

  const results = []

  for (const name of wanted) {
    const target = path.join(directory, name)
    const expected = ephe.files[name].sha256

    if (fs.existsSync(target) && digestOf(target) === expected) {
      onProgress({file: name, status: 'present'})
      results.push({file: name, status: 'present', path: target})
      continue
    }

    onProgress({file: name, status: 'fetching', url: ephe.urlFor(name)})

    const response = await fetch(ephe.urlFor(name))
    if (!response.ok) {
      throw new Error('Could not fetch ' + name + ': HTTP ' + response.status +
        ' from ' + ephe.urlFor(name))
    }

    const body = Buffer.from(await response.arrayBuffer())
    const actual = crypto.createHash('sha256').update(body).digest('hex')
    if (actual !== expected) {
      throw new Error('Checksum mismatch for ' + name + '. Expected ' +
        expected + ' but got ' + actual + '. Refusing to write it.')
    }

    fs.writeFileSync(target, body)
    onProgress({file: name, status: 'fetched', bytes: body.length})
    results.push({file: name, status: 'fetched', path: target, bytes: body.length})
  }

  return {ephePath: path.resolve(directory), files: results}
}

function digestOf (file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')
}

module.exports = fetchEphemeris
module.exports.files = ephe
