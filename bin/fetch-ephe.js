#!/usr/bin/env node
'use strict'

const fetchEphemeris = require('../src/fetch-ephe')
const ephe = require('../src/ephe-files')

function parse (argv) {
  const options = {ephePath: './ephe', files: null}

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--help' || arg === '-h') {
      return {help: true}
    } else if (arg === '--dir' || arg === '-d') {
      options.ephePath = argv[++i]
    } else if (arg === '--only') {
      options.files = argv[++i].split(',')
    } else {
      return {error: 'Unrecognised argument: ' + arg}
    }
  }
  return options
}

function usage () {
  const mb = (ephe.totalBytes() / 1048576).toFixed(1)
  console.log('Fetch the Swiss Ephemeris data files.')
  console.log()
  console.log('  npx ephemeris-fetch-ephe [--dir ./ephe] [--only a,b]')
  console.log()
  console.log('Files, ' + mb + ' MB in total:')
  ephe.defaultFiles.forEach(function (name) {
    console.log('  ' + name.padEnd(14) +
      String(Math.round(ephe.files[name].bytes / 1024) + ' kB').padStart(8) +
      '  ' + ephe.files[name].purpose)
  })
  console.log()
  console.log('Pinned to swisseph commit ' + ephe.commit.slice(0, 12) + ' and')
  console.log('checksummed, so a bad or substituted download is refused.')
  console.log()
  console.log('These are Swiss Ephemeris data files, licensed AGPL-3.0 or')
  console.log('commercially by Astrodienst. Fetching them is your decision,')
  console.log('which is why nothing here does it for you.')
}

async function main () {
  const options = parse(process.argv.slice(2))

  if (options.help) {
    usage()
    return 0
  }
  if (options.error) {
    console.error(options.error)
    usage()
    return 1
  }

  try {
    const result = await fetchEphemeris({
      ephePath: options.ephePath,
      files: options.files,
      onProgress: function (event) {
        if (event.status === 'present') {
          console.log('  already there  ' + event.file)
        } else if (event.status === 'fetching') {
          process.stdout.write('  fetching       ' + event.file + ' ... ')
        } else {
          console.log(Math.round(event.bytes / 1024) + ' kB')
        }
      }
    })

    console.log()
    console.log('Ready in ' + result.ephePath)
    console.log()
    console.log("  ephemeris.use(ephemeris.swisseph({ ephePath: '" +
      options.ephePath + "' }))")
    return 0
  } catch (error) {
    console.error()
    console.error('Failed: ' + error.message)
    return 1
  }
}

main().then(function (code) { process.exitCode = code })
