var gulp = require('gulp');
var sass = require('gulp-sass');
var uglify = require('gulp-uglify');
var rename = require('gulp-rename');
var concat = require('gulp-concat');
var plumber = require('gulp-plumber');
var autoprefixer = require('gulp-autoprefixer');
var cleanCSS = require('gulp-clean-css');
var sourcemaps = require('gulp-sourcemaps');
var browserSync = require('browser-sync');
var reload = browserSync.reload;

var config = {
    sourceDir: './src/',
    publicDir: './dist/'
};

var filesToMove = [
    './src/js/plugins/**/*.*'
];

/* Scripts task */
gulp.task('scripts', function () {
    var jsDir = config.publicDir + 'js';

    return gulp.src(config.sourceDir + 'js/*.js')
        .pipe(concat('common.js'))
        .pipe(gulp.dest(jsDir))
        .pipe(rename({suffix: '.min'}))
        .pipe(uglify())
        .pipe(gulp.dest(jsDir));
});

/* Styles task */
gulp.task('styles', function () {
    var cssDir = config.publicDir + 'css';

    return gulp.src(config.sourceDir + '/sass/app.scss')
        .pipe(sass().on('error', sass.logError))
        .pipe(sourcemaps.write('.'))
        .pipe(autoprefixer())
        .pipe(gulp.dest(cssDir))
        .pipe(cleanCSS())
        .pipe(rename({suffix: '.min'}))
        .pipe(gulp.dest(cssDir))
});

/* Copy files */
gulp.task('move', function(){
    // the base option sets the relative root for the set of files,
    // preserving the folder structure
    gulp.src(filesToMove, { base: './src/js/plugins' })
        .pipe(gulp.dest('./dist/js/plugins/'));
});

// Static Server + watching scss/html files
gulp.task('serve', function () {

    browserSync.init({
        server: "./"
    });

    gulp.watch(config.sourceDir + 'sass/**/*.*', ['styles']);
    gulp.watch(config.sourceDir + 'js/**/*.*', ['scripts']);
    gulp.watch(config.publicDir + 'css/*.css').on('change', browserSync.reload);
    gulp.watch("*.html").on('change', browserSync.reload);
});


/* Reload task */
gulp.task('bs-reload', function () {
    browserSync.reload();
});

/* Watch scss, js and html files, doing different things with each. */
gulp.task('default', ['scripts', 'styles', 'move', 'serve'], function () {
    /* Watch scss, run the sass task on change. */
    gulp.watch(config.sourceDir + 'sass/**/*.*', ['styles']);
    /* Watch app.js file, run the scripts task on change. */
    gulp.watch(config.sourceDir + 'js/**/*.*', ['scripts']);
    /* Watch .html files, run the bs-reload task on change. */
    gulp.watch(['*.html'], ['bs-reload']);
});