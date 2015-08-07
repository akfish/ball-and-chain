gulp = require('gulp')
path = require('path')
heap = {cli, sourcemaps} = require('gulp-heap')
coffee = heap.require('gulp-coffee')
mocha = heap.require('gulp-mocha')

mochaOpts =
  grep: cli.opts['only']
  globals: ['chai', 'expect']
  require: [path.join(__dirname, '/test/common')]

gulp.task 'test', ['coffee'], mocha(mochaOpts).source('./test/*.spec.coffee', {read: false})
gulp.task 'coffee', coffee('./src/**/*.coffee', './lib', bare: true).with(sourcemaps())

gulp.task 'default', ['coffee']
