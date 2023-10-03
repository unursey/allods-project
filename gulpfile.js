import gulp from "gulp";
import browserSync from "browser-sync";
import sassPkg from "sass";
import gulpSass from "gulp-sass";
import cssimport from "gulp-cssimport";
import del from "del";
import htmlmin from "gulp-htmlmin";
import cleanCSS from "gulp-clean-css";
import terser from "gulp-terser";
import concat from "gulp-concat";
import soursemaps from 'gulp-sourcemaps';
import webpack from "webpack-stream";
import gulpImg from "gulp-image";
import gulpWebp from 'gulp-webp';
import gulpAvif from 'gulp-avif';
import { stream as critical } from "critical";
import gulpif from 'gulp-if';
import autoprefixer from "gulp-autoprefixer";
import babel from "gulp-babel";

const prepros = true;

let dev = false;

const allJS = [
  // "src/libs/swiper-bundle.min.js",
];

const sass = gulpSass(sassPkg);

// задачи

export const html = () =>
  gulp
    .src("src/*.html")
    .pipe(
      htmlmin({
        removeComments: true,
        collapseWhitespace: true,
      })
    )
    .pipe(gulp.dest("dist"))
    .pipe(browserSync.stream());

export const style = () => {
  if (prepros) {
    return gulp
      .src("src/scss/**/*.scss")
      .pipe(gulpif(dev, soursemaps.init()))
      .pipe(sass().on("error", sass.logError))
      .pipe(autoprefixer())
      .pipe(
        cleanCSS({
          2: {
            specialComments: 0,
          },
        })
      )
      .pipe(gulpif(dev, soursemaps.write('../maps')))
      .pipe(gulp.dest("dist/css"))
      .pipe(browserSync.stream());
  }

  return gulp
    .src("src/css/index.css")
    .pipe(gulpif(dev, soursemaps.init()))
    .pipe(
      cssimport({
        extensions: ["css"],
      })
    )
    .pipe(autoprefixer())
    .pipe(
      cleanCSS({
        2: {
          specialComments: 0,
        },
      })
    )
    .pipe(gulpif(dev, soursemaps.write('../maps')))
    .pipe(gulp.dest("dist/css"))
    .pipe(browserSync.stream());
};

const configWebpack = {
  mode: dev ? 'development' : 'production',
    devtool: dev ? 'eval-source-map' : false,
    optimization: {
        minimize: false,
  },
  output: {
      filename: 'script.js'
  },
  module: {
      rules: [{
        test: /\.(js)$/,
        exclude: /(node_modules)/}]
  },
};

export const js = () =>
  gulp
    .src([...allJS, "src/js/script.js"])
    .pipe(webpack(configWebpack))
    .pipe(gulpif(dev, soursemaps.init()))
    .pipe(babel({
      presets: ['@babel/preset-env'],
      ignore: [...allJS, 'src/js/**/*.min.js']
    }))
    .pipe(terser())
    .pipe(concat("index.min.js"))
    .pipe(gulpif(dev, soursemaps.write('../maps')))
    .pipe(gulp.dest("dist/js"))
    .pipe(browserSync.stream());

export const img = () => gulp
  .src('src/img/**/*.{jpg,jpeg,png,svg,gif}')
  .pipe(gulpif(!dev, gulpImg({
    optipng: ['-i 1', '-strip all', '-fix', '-o7', '-force'],
    pngquant: ['--speed=1', '--force', 256],
    zopflipng: ['-y', '--lossy_8bit', '--lossy_transparent'],
    jpegRecompress: ['--strip', '--quality', 'medium', '--min', 40, '--max', 80],
    mozjpeg: ['-optimize', '-progressive'],
    gifsicle: ['--optimize'],
    svgo: true,
  })))
  .pipe(gulp.dest('dist/img'))
  .pipe(browserSync.stream());

export const webp = () => gulp
    .src('src/img/**/*.{jpg,jpeg,png}')
    .pipe(gulpWebp({
      quality: 70
    }))
    .pipe(gulp.dest('dist/img'))
    .pipe(browserSync.stream());

export const avif = () => gulp
    .src('src/img/**/*.{jpg,jpeg,png}')
    .pipe(gulpAvif({
      quality: 60
    }))
    .pipe(gulp.dest('dist/img'))
    .pipe(browserSync.stream());

export const critCSS = () => gulp
  .src('dist/*.html')
  .pipe(critical({
    base: 'dist/',
    inline: true,
    css: ['dist/css/index.css']
  }))
  .on('error', err => {
    console.error(err.message)
  })    
  .pipe(gulp.dest('dist'))

export const copy = () => gulp
    .src("src/fonts/**/*", {
      base: "src",
    })
    .pipe(gulp.dest("dist"))
    .pipe(
      browserSync.stream({
        once: true,
      })
    );

export const server = () => {
  browserSync.init({
    ui: false,
    notify: false,
    // tunnel: true,
    server: {
      baseDir: "dist",
    },
  });

  gulp.watch("./src/**/*.html", html);
  gulp.watch(prepros ? "./src/scss/**/*.scss" : "./src/css/**/*.css", style);
  gulp.watch('src/img/**/*.{jpg,jpeg,png,svg,gif}', img);
  gulp.watch("./src/js/**/*.js", js);
  gulp.watch("./src/fonts/**/*", copy);
  gulp.watch('src/img/**/*.{jpg,jpeg,png}', webp);
  gulp.watch('src/img/**/*.{jpg,jpeg,png}', avif);
};

export const clear = () => del("dist/**/*", { forse: true });

// запуск

export const develop = async() => {
  dev = true;
}

export const base = gulp.parallel(html, style, js, img, webp, avif, copy);

export const build = gulp.series(clear, base, critCSS);

export default gulp.series(develop, base, server);
