'use strict'

/*
 * Print the changelog entry for a version, lifted out of the README, so the
 * release workflow can use it as the body of the GitHub Release. Falls back
 * to a pointer at the changelog when there is no entry for the version.
 */

const fs = require('fs')
const path = require('path')

const version = process.argv[2]

if (!version) {
  console.error('usage: node .github/release-notes.js <version>')
  process.exit(1)
}

const readme = fs.readFileSync(path.join(__dirname, '..', 'README.md'), 'utf8')
const lines = readme.split('\n')
const heading = '#### ' + version
let start = -1

for (let i = 0; i < lines.length; i++) {
  if (lines[i] === heading || lines[i].indexOf(heading + ' ') === 0) {
    start = i + 1
    break
  }
}

if (start < 0) {
  console.log('See the changelog in the README for what changed in ' + version + '.')
  process.exit(0)
}

const body = []

for (let j = start; j < lines.length; j++) {
  if (lines[j].indexOf('#### ') === 0 || lines[j].indexOf('### ') === 0) {
    break
  }
  body.push(lines[j])
}

console.log(body.join('\n').trim())
