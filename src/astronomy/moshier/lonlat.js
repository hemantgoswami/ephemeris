var epsilon = require('./epsilon')
var precess = require('./precess')
var util = require('./util')

var lonlat = {}

lonlat.calc = function (pp, date, ofdate) {
  /* Make local copy of position vector
   * and calculate radius.
   */
  var s = {
    longitude: pp.longitude,
    latitude: pp.latitude,
    distance: pp.distance
  }

  var r = Math.sqrt(pp.longitude * pp.longitude
    + pp.latitude * pp.latitude + pp.distance * pp.distance
  )

  /* Precess to equinox of date J */
  if (ofdate) {
    precess.calc(s, date, -1)
  }

  /* Convert from equatorial to ecliptic coordinates */
  epsilon.calc(date)
  var y = epsilon.coseps * s.latitude + epsilon.sineps * s.distance
  var z = -epsilon.sineps * s.latitude + epsilon.coseps * s.distance

  var yy = util.zatan2(s.longitude, y)
  var zz = Math.asin(z / r)

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
