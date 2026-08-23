'use strict'

/**
 * Backend registry.
 *
 * A backend is anything that can turn a date and a body into an apparent
 * ecliptic longitude. The built in Moshier engine is one; adapters for
 * Swiss Ephemeris and astronomy-engine are others. Core owns the result
 * shape, the observer, the date arithmetic, the degrees-minutes-seconds
 * formatting and the retrograde rules, so every backend produces the same
 * envelope and only the numbers inside it differ.
 *
 * The contract a backend must meet:
 *
 *   name               string, unique
 *   engine             npm package it needs, or null when built in
 *   available          boolean, is that engine loadable right now
 *   unavailableReason  string when it is not, otherwise null
 *   bodies             canonical names it can calculate
 *   range              {from, to} julian days it claims to be good for,
 *                      or null when it does not say
 *   supports(spec)     boolean, can it do this body
 *   calc(date, spec)   {longitude, motion, distance, raw} or null
 *
 * `date` is the internal date record, carrying `julian` as terrestrial time.
 * `spec` is normalised by core into one of:
 *
 *   {name: 'mars'}       a canonical body
 *   {asteroid: 433}      a numbered minor planet
 *   {star: 'Aldebaran'}  a fixed star
 *   {id: 15}             an engine specific identifier, escape hatch
 *
 * `calc` returns longitude and motion in degrees and degrees per day, and
 * distance in kilometres, or -1 where the body has none. Returning null
 * means "I cannot do this one", and core fills in the unavailable template
 * rather than throwing. Returning `{error: 'why'}` does the same but gives
 * the caller the reason, which is worth doing when the cause is fixable,
 * such as a missing data file.
 */

const registry = {}

const backends = {}
let selected = null

registry.register = function (backend) {
  if (!backend || typeof backend.name !== 'string') {
    throw new Error('A backend needs a name.')
  }
  if (typeof backend.calc !== 'function' || typeof backend.supports !== 'function') {
    throw new Error('Backend "' + backend.name + '" needs calc() and supports().')
  }
  backends[backend.name] = backend
  if (!selected) {
    selected = backend.name
  }
  return backend
}

/** Every registered backend, whether or not its engine is installed. */
registry.list = function () {
  return Object.keys(backends).map(function (name) {
    const backend = backends[name]
    return {
      name: backend.name,
      engine: backend.engine || null,
      available: !!backend.available,
      unavailableReason: backend.unavailableReason || null,
      bodies: backend.bodies.slice(),
      range: backend.range || null,
      selected: name === selected
    }
  })
}

registry.get = function (name) {
  return backends[name] || null
}

registry.current = function () {
  return backends[selected]
}

/**
 * Choose the backend, by name or by passing the object itself. Throws when
 * the engine it needs is not installed, since silently carrying on with a
 * different one would be worse than a clear failure.
 */
registry.use = function (backend) {
  const chosen = typeof backend === 'string' ? backends[backend] : registry.register(backend)

  if (!chosen) {
    throw new Error('No backend named "' + backend + '". Registered: ' +
      Object.keys(backends).join(', ') + '.')
  }
  if (!chosen.available) {
    throw new Error('Backend "' + chosen.name + '" is not usable: ' +
      (chosen.unavailableReason || 'reason not given') +
      (chosen.engine ? '. Try: npm install ' + chosen.engine : ''))
  }

  selected = chosen.name
  return chosen
}

module.exports = registry
