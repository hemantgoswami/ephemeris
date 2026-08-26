'use strict'

const crypto = require('crypto')
const fs = require('fs')
const path = require('path')

const ephe = require('./ephe-files')

/**
 * Ask on a terminal, when there is one. Returns false rather than hanging
 * when there is not, which is the case in CI, in a server, and in any
 * spawned child process.
 */
function askOnTerminal (question) {
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    return Promise.resolve(false)
  }
  const readline = require('readline')
  const rl = readline.createInterface({input: process.stdin, output: process.stdout})
  return new Promise(function (resolve) {
    rl.question(question, function (answer) {
      rl.close()
      resolve(/^y(es)?$/i.test(answer.trim()))
    })
  })
}

/**
 * Fetch Swiss Ephemeris data files into a directory.
 *
 * Not automatic, and not reachable from a calculation. getAllPlanets is
 * synchronous, so asking mid calculation would mean blocking the event loop
 * or making every signature async; and there is no terminal to ask on in CI,
 * in a server, or in a spawned process, so the answer there would have to be
 * "fail" anyway. Setup is where a question belongs, so this is where it is.
 *
 * With `prompt: true` it describes what it is about to fetch and asks first.
 * Off a terminal it refuses rather than hanging or assuming yes. Pass your
 * own `confirm` to hook it up to an existing interface.
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

  const missing = wanted.filter(function (name) {
    const target = path.join(directory, name)
    return !fs.existsSync(target) || digestOf(target) !== ephe.files[name].sha256
  })

  if (settings.prompt && missing.length > 0) {
    const megabytes = (ephe.totalBytes(missing) / 1048576).toFixed(1)
    const confirm = settings.confirm || askOnTerminal
    const agreed = await confirm(
      'Download ' + missing.length + ' Swiss Ephemeris data file(s), ' +
      megabytes + ' MB, from ' + ephe.baseUrl + '?\n' +
      'They are licensed AGPL-3.0 or commercially by Astrodienst. [y/N] ')

    if (!agreed) {
      throw new Error('Not downloading ' + missing.join(', ') + '. ' +
        'Either answer yes, or fetch them yourself with: ' +
        'npx ephemeris-fetch-ephe --dir ' + directory)
    }
  }

  fs.mkdirSync(directory, {recursive: true})

  const results = []

  for (const name of wanted) {
    const target = path.join(directory, name)
    const expected = ephe.files[name].sha256

    if (missing.indexOf(name) < 0) {
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
