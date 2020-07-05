#!/usr/bin/env node

// This beauty concatenates Javascript files and prepares the resulting
// file for node, by adding "module.exports = {...}".
//
// The resulting file will be written to the folder: build/ .
//
// The resulting file can be used via node, or directly in the browser.

'use strict'

var fs = require('fs')
var path = require('path')

var concat = ''

var jsFilesInOrder = [ // does fs.readFile adjust the separators if running on windows?
  'src/index.js',
  'src/common.js',
  'src/load.js',

  'src/astronomy/index.js',

  'src/astronomy/moshier/index.js',
  'src/astronomy/moshier/constant.js',
  'custom.constant.js',
  'src/astronomy/moshier/julian.js',
  'src/astronomy/moshier/delta.js',
  'src/astronomy/moshier/epsilon.js',
  'src/astronomy/moshier/lonlat.js',
  'src/astronomy/moshier/gplan.js',
  'src/astronomy/moshier/precess.js',
  'src/astronomy/moshier/util.js',
  'src/astronomy/moshier/kepler.js',
  'src/astronomy/moshier/body.js',
  'src/astronomy/moshier/sun.js',
  'src/astronomy/moshier/aberration.js',
  'src/astronomy/moshier/altaz.js',
  'src/astronomy/moshier/constellation.js',
  'src/astronomy/moshier/deflection.js',
  'src/astronomy/moshier/diurnal.js',
  'src/astronomy/moshier/fk4fk5.js',
  'src/astronomy/moshier/light.js',
  'src/astronomy/moshier/moon.js',
  'src/astronomy/moshier/nutation.js',
  'src/astronomy/moshier/planet.js',
  'src/astronomy/moshier/refraction.js',
  'src/astronomy/moshier/sidereal.js',
  'src/astronomy/moshier/star.js',
  'src/astronomy/moshier/transit.js',
  'src/astronomy/moshier/vearth.js',
  'src/astronomy/moshier/processor.js',

  'src/astronomy/moshier/plan404/index.js',
  'src/astronomy/moshier/plan404/mercury.js',
  'src/astronomy/moshier/plan404/venus.js',
  'src/astronomy/moshier/plan404/earth.js',
  'src/astronomy/moshier/plan404/moonlr.js',
  'src/astronomy/moshier/plan404/moonlat.js',
  'src/astronomy/moshier/plan404/mars.js',
  'src/astronomy/moshier/plan404/jupiter.js',
  'src/astronomy/moshier/plan404/saturn.js',
  'src/astronomy/moshier/plan404/uranus.js',
  'src/astronomy/moshier/plan404/neptune.js',
  'src/astronomy/moshier/plan404/pluto.js',

  'src/shortcut.js'
]

var targetPath = path.join(__dirname, '..', 'build', 'index.js')
var shortcut = fs.readFileSync(path.join(__dirname, '..', 'src', 'shortcut.js'), 'utf-8')
shortcut = shortcut.replace(/=/g, ':').replace(/;/g, ',').replace(/(^|\n)\$/g, '\n')

for (var i = 0; i < jsFilesInOrder.length; i++) {

  var file = jsFilesInOrder[i]

  concat += '\n// ' + path.basename(file) + '\n' // Add a comment
  concat += fs.readFileSync(file, 'utf-8') // Add content of file
}

concat += '\nvar module = module || {};' // in case code is used in browser
concat += '\nmodule.exports = { ns: $ns, ' + shortcut + '}'

fs.writeFileSync(targetPath, concat)
