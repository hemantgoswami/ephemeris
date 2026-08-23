var common = {}

common.copy = function (target /*, source ... */) {
  if (target) {
    for (var i = arguments.length - 1; i > 0; i--) {
      var source = arguments [i]
      if (source) {
        for (var key in source) {
          if (Object.prototype.hasOwnProperty.call(source, key)) {
            target [key] = source [key]
          }
        }
      }
    }
  }
  return target
}

common.assert = function (variable, value) {
  if (variable != value) {
    throw new Error('Assertion failed: ' + variable + ' != ' + value + '!')
  }
}

module.exports = common
