'use strict'

const js = require('@eslint/js')
const globals = require('globals')

module.exports = [
  {
    ignores: [
      'node_modules/**',
      '.yarn/**',
      'play/**'
    ]
  },
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: globals.node
    },
    linterOptions: {
      reportUnusedDisableDirectives: true
    },
    rules: {
      // Modern declarations. Kept as errors so the ES5 style cannot creep
      // back in one file at a time.
      'no-var': 'error',
      'prefer-const': 'error',
      'object-shorthand': ['error', 'properties'],
      'semi': ['error', 'never'],
      'quotes': ['error', 'single', {avoidEscape: true}],
      'indent': ['error', 2, {SwitchCase: 1}],
      'no-trailing-spaces': 'error',
      'eol-last': 'error',
      'no-unused-vars': ['error', {args: 'after-used'}],
      // Loose equality is pervasive in the translated numerical code and
      // tightening it would be a behaviour change, not a lint fix.
      'eqeqeq': 'off',
      // Moshier's constants are quoted at full published precision; the
      // digits beyond a double are deliberate documentation, not a mistake.
      'no-loss-of-precision': 'off'
    }
  },
  {
    files: ['test/**/*.js'],
    languageOptions: {
      globals: globals.node
    }
  }
]
