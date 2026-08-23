const epsilon = require('./epsilon')
const precess = require('./precess')
const util = require('./util')

const lonlat = {}

lonlat.calc = function (pp, date, ofdate) {
  /* Make local copy of position vector
   * and calculate radius.
   */
  const s = {
    longitude: pp.longitude,
    latitude: pp.latitude,
    distance: pp.distance
  }

  const r = Math.sqrt(pp.longitude * pp.longitude
    + pp.latitude * pp.latitude + pp.distance * pp.distance
  )

  /* Precess to equinox of date J */
  if (ofdate) {
    precess.calc(s, date, -1)
  }

  /* Convert from equatorial to ecliptic coordinates */
  epsilon.calc(date)
  const y = epsilon.coseps * s.latitude + epsilon.sineps * s.distance
  const z = -epsilon.sineps * s.latitude + epsilon.coseps * s.distance

  const yy = util.zatan2(s.longitude, y)
  const zz = Math.asin(z / r)

  return {
    // longitude and latitude in decimal
    longitude: yy,
    latitude: zz,
    distance: r,
    // longitude and latitude in h,m,s
    dLongitude: util.dms(yy),
    dLatitude: util.dms(zz)
  }
}

module.exports = lonlat
