const common = {}

/**
 * Copy the own enumerable properties of every source onto the target.
 *
 * Sources are applied back to front, so where two of them carry the same
 * key the earliest source wins. That is the opposite of Object.assign, and
 * callers rely on it, so keep the direction of the loop.
 */
common.copy = function (target, ...sources) {
  if (target) {
    for (let i = sources.length - 1; i >= 0; i--) {
      const source = sources[i]
      if (source) {
        for (const key in source) {
          if (Object.prototype.hasOwnProperty.call(source, key)) {
            target[key] = source[key]
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
