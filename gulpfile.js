var gulp = require('gulp')
const eslint = require("gulp-eslint")
var uglify = require('gulp-uglify')
var browserify = require('browserify')
var del = require('del')
var rename = require('gulp-rename')
var source = require('vinyl-source-stream')
var buffer = require('vinyl-buffer')

var paths = {
  scripts: {
    src: 'src/**/*.js',
    dest: './dist/'
  }
}

function clean() {
  return del([paths.scripts.dest])
}

function scriptsLint() {
  return gulp.src(paths.scripts.src, { sourcemaps: true })
    .pipe(eslint())
    .pipe(eslint.format())
    .pipe(eslint.failAfterError())
}

function scripts() {
  var b = browserify({
    entries: './index.js',
    debug: true,
    insertGlobals : true,
    standalone: 'ephemeris'
  })
  return b.bundle()
    .pipe(source('ephemeris.js'))
    .pipe(buffer())
    .pipe(gulp.dest(paths.scripts.dest))
    .pipe(uglify())
    .pipe(rename({ extname: '.min.js' }))
    .pipe(gulp.dest(paths.scripts.dest))
}

var build = gulp.series(clean, scriptsLint, scripts)

exports.clean = clean
exports.build = build
exports.default = build
