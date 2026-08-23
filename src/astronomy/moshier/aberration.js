const body = require('./body')
const constant = require('./constant')
const util = require('./util')
const vearth = require('./vearth')

const aberration = {}

aberration.calc = function (p) {
  /* Calculate the velocity of the earth (see vearth.js). */
  vearth.calc(body.earth.position.date)

  const V = {
    longitude: vearth.vearth.longitude / constant.Clightaud,
    latitude: vearth.vearth.latitude / constant.Clightaud,
    distance: vearth.vearth.distance / constant.Clightaud
  }

  let betai = V.longitude * V.longitude
    + V.latitude * V.latitude
    + V.distance * V.distance

  const pV = p.longitude * V.longitude
    + p.latitude * V.latitude
    + p.distance * V.distance

  /* Make the adjustment for aberration. */
  betai = Math.sqrt(1 - betai)
  const C = 1 + pV
  const A = betai / C
  const B = (1 + pV / (1 + betai)) / C

  const x = {
    longitude: A * p.longitude + B * V.longitude,
    latitude: A * p.latitude + B * V.latitude,
    distance: A * p.distance + B * V.distance
  }

  constant.dp = {
    longitude: x.longitude - p.longitude,
    latitude: x.latitude - p.latitude,
    distance: x.distance - p.distance
  }

  const result = util.showcor(p, constant.dp)

  p.longitude = x.longitude
  p.latitude = x.latitude
  p.distance = x.distance

  return result
}

module.exports = aberration
