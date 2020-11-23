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

common.is = function (object, type) {
  var typeName = Object.prototype.toString.call(object).slice(8, -1)
  return (
    object !== undefined &&
    object !== null &&
    type.name === typeName
  )
}

common.make = function (context, path) {
  if (common.is(context, String)) {
    path = context
    context = document
  }

  if (path) {
    var paths = path.split('.')
    var key = paths.shift()
    context [key] = context [key] || {}
    context = common.make(context [key], paths.join('.'))
  }
  return context
}

common.define = function (context, path, object) {
  common.copy(common.make(context, path), object)
}

common.assert = function (variable, value) {
  if (variable != value) {
    throw 'Assertion failed: ' + variable + ' != ' + value + '!'
  }
}

module.exports = common
