var common = require('../../common')
var constant = require('./constant')
var delta = require('./delta')
var julian = require('./julian')
var kepler = require('./kepler')
var moon = require('./moon')
var planet = require('./planet')
var star = require('./star')
var sun = require('./sun')

var moshier = {
  body: require('./body')
}

var processor = {}

processor.calc = function (date, body) {
  constant.body = body

  julian.calc(date)
  delta.calc(date)

  date.universalDate = julian.toGregorian({
    julian: date.universal
  })

  date.universalDateString =
    date.universalDate.day + '.' +
    date.universalDate.month + '.' +
    date.universalDate.year + ' ' +
    date.universalDate.hours + ':' +
    date.universalDate.minutes + ':' +
    (date.universalDate.seconds + date.universalDate.milliseconds / 1000)

  // First calculate the earth
  kepler.calc(date, moshier.body.earth)

  switch (body.key) {
    case 'sun':
      sun.calc()
      break
    case 'moon':
      moon.calc()
      break
    default:
      if (body.raMotion) { // star
        star.calc(body)
      } else { // planet
        planet.calc(body)
      }
      break
  }
}

processor.ecliptic = function (date, observer, body) {
  this.calc(date, observer)
  this.calc(date, body)
  // this.reduce(observer, body)
}

processor.init = function () {
  moshier.body.init()
  kepler.init()
}

processor.test = function () {
  // tested position
  common.copy(constant, {
    tlong: -71.13,
    glat: 42.27,
    attemp: 12.0,
    atpress: 1010.0,
    height: 0.0
  })

  // initialize processor
  this.init()

  // test the moon
  var date = {year: 1986, month: 1, day: 1, hours: 1, minutes: 52, seconds: 0}
  var body = moshier.body.moon
  this.calc(date, body)

  common.assert(date.julian, 2446431.577777778)
  common.assert(date.delta, 54.87009963821919)

  common.assert(body.position.nutation.dRA, -0.48342256851185134)
  common.assert(body.position.nutation.dDec, 5.886353197581648)

  common.assert(body.position.geometric.longitude, 156.0921880198016)
  common.assert(body.position.geometric.latitude, 4.422063993387057)
  common.assert(body.position.geometric.distance, 0.14716616073282882)

  common.assert(body.position.apparentGeocentric.longitude, 2.7242742960376667)
  common.assert(body.position.apparentGeocentric.latitude, 0.07717957641849299)
  common.assert(body.position.apparentGeocentric.distance, 60.24442952894567)

  common.assert(body.position.dHorizontalParallax, 0.016599807399569004)

  common.assert(body.position.sunElongation, 124.15076164595345)
  common.assert(body.position.illuminatedFraction, 0.7815787330095528)

  common.assert(body.position.apparent.dRA, 2.7844808512258266)
  common.assert(body.position.apparent.dDec, 0.23362556081599462)

  common.assert(body.position.altaz.diurnalAberration.ra, 2.7844805966970942)
  common.assert(body.position.altaz.diurnalAberration.dec, 0.23362530162522877)

  common.assert(body.position.altaz.diurnalParallax.ra, 2.7967931740378766)
  common.assert(body.position.altaz.diurnalParallax.dec, 0.2221893682125501)

  common.assert(body.position.altaz.atmosphericRefraction.deg, 0.6356568799861307)
  common.assert(body.position.altaz.atmosphericRefraction.dRA, -112.9014532718829)
  common.assert(body.position.altaz.atmosphericRefraction.dDec, 1585.1382135790564)

  common.assert(body.position.altaz.topocentric.altitude, -0.2989379770846806)
  common.assert(body.position.altaz.topocentric.ra, -3.4946025585162133)
  common.assert(body.position.altaz.topocentric.dec, 0.22987433513647665)
  common.assert(body.position.altaz.topocentric.azimuth, 71.78002666681668)

  // test the sun
  date = {year: 1986, month: 1, day: 1, hours: 16, minutes: 47, seconds: 0}
  body = moshier.body.sun
  this.calc(date, body)

  common.assert(date.julian, 2446432.199305556)
  common.assert(date.delta, 54.87089572485891)

  common.assert(body.position.equinoxEclipticLonLat.longitude, 4.90413951369789)
  common.assert(body.position.equinoxEclipticLonLat.latitude, 0.000002184617423267333)
  common.assert(body.position.equinoxEclipticLonLat.distance, 0.9832794756330766)

  common.assert(body.position.lightTime, 8.177686171897745)

  common.assert(body.position.aberration.dRA, 1.50327643199855)
  common.assert(body.position.aberration.dDec, 1.7448150469138453)

  common.assert(body.position.constellation, 77)

  common.assert(body.position.apparent.dRA, 4.920756988829355)
  common.assert(body.position.apparent.dDec, -0.40123417213339135)

  common.assert(body.position.apparentLongitude, 280.9781321178379)

  common.assert(body.position.altaz.diurnalParallax.ra, 4.920758543965699)
  common.assert(body.position.altaz.diurnalParallax.dec, -0.4012734282906353)

  common.assert(body.position.altaz.atmosphericRefraction.deg, 0.0347669495824713)
  common.assert(body.position.altaz.atmosphericRefraction.dRA, -0.0654871080210392)
  common.assert(body.position.altaz.atmosphericRefraction.dDec, 125.15775095794257)

  common.assert(body.position.altaz.topocentric.altitude, 24.771802544653966)
  common.assert(body.position.altaz.topocentric.ra, -1.3624315255707726)
  common.assert(body.position.altaz.topocentric.dec, -0.4006666463910222)
  common.assert(body.position.altaz.topocentric.azimuth, 179.48488458374226)

  // test sirius
  date = {year: 1986, month: 1, day: 1, hours: 0, minutes: 0, seconds: 0}
  body = moshier.body.sirius
  this.calc(date, body)

  common.assert(date.julian, 2446431.5)
  common.assert(date.delta, 54.87)

  common.assert(body.position.apparent.dRA, 1.7651675096112047)
  common.assert(body.position.apparent.dDec, -0.29137543179606207)

  common.assert(body.position.astrometricDate.dRA, 1.7651002655957506)
  common.assert(body.position.astrometricDate.dDec, -0.29140596467162816)

  common.assert(body.position.altaz.topocentric.altitude, 1.7060953673767152)
  common.assert(body.position.altaz.topocentric.ra, -4.522192086886859)
  common.assert(body.position.altaz.topocentric.dec, -0.2873401996237649)
  common.assert(body.position.altaz.topocentric.azimuth, 114.21923743994829)
}

module.exports = processor
