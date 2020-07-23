$ns.aberration = {}

$ns.aberration.calc = function (p) {
  /* Calculate the velocity of the earth (see vearth.js). */
  $moshier.vearth.calc($moshier.body.earth.position.date)

  var V = {
    longitude: $moshier.vearth.vearth.longitude / $const.Clightaud,
    latitude: $moshier.vearth.vearth.latitude / $const.Clightaud,
    distance: $moshier.vearth.vearth.distance / $const.Clightaud
  }

  var betai = V.longitude * V.longitude
    + V.latitude * V.latitude
    + V.distance * V.distance

  var pV = p.longitude * V.longitude
    + p.latitude * V.latitude
    + p.distance * V.distance

  /* Make the adjustment for aberration. */
  betai = Math.sqrt(1 - betai)
  var C = 1 + pV
  var A = betai / C
  var B = (1 + pV / (1 + betai)) / C

  var x = {
    longitude: A * p.longitude + B * V.longitude,
    latitude: A * p.latitude + B * V.latitude,
    distance: A * p.distance + B * V.distance
  }

  $const.dp = {
    longitude: x.longitude - p.longitude,
    latitude: x.latitude - p.latitude,
    distance: x.distance - p.distance
  }

  var result = $util.showcor(p, $const.dp)

  p.longitude = x.longitude
  p.latitude = x.latitude
  p.distance = x.distance

  return result
}
