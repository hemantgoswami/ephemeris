'use strict'

/*
 * Print the changelog entry for a version, lifted out of the README, so the
 * release workflow can use it as the body of the GitHub Release. Falls back
 * to a pointer at the changelog when there is no entry for the version.
 */

var fs = require('fs')
var path = require('path')

var version = process.argv[2]

if (!version) {
  console.error('usage: node .github/release-notes.js <version>')
  process.exit(1)
}

var readme = fs.readFileSync(path.join(__dirname, '..', 'README.md'), 'utf8')
var lines = readme.split('\n')
var heading = '#### ' + version
var start = -1

for (var i = 0; i < lines.length; i++) {
  if (lines[i] === heading || lines[i].indexOf(heading + ' ') === 0) {
    start = i + 1
    break
  }
}

if (start < 0) {
  console.log('See the changelog in the README for what changed in ' + version + '.')
  process.exit(0)
}

var body = []

for (var j = start; j < lines.length; j++) {
  if (lines[j].indexOf('#### ') === 0 || lines[j].indexOf('### ') === 0) {
    break
  }
  body.push(lines[j])
}

console.log(body.join('\n').trim())
