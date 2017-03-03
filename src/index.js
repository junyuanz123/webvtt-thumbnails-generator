'use strict';

var path = require('path')
  , SpriteSheetWriter = require('./SpriteImages')
  , Utils = require('./Util');


/**
 *
 * @callback thumbgenCallback
 * @param {Error} err Any error
 * @param {object} metadata Metadata
 */

/**
 * Generate thumbnails and pack them into WebVTT file
 *
 * @param {string} inputVideo Video file
 * @param {object} options Various options
 * @param {thumbgenCallback} callback Accepts arguments: (err, metadata)
 */
module.exports = function (inputVideo, options, callback) {
  if (!inputVideo) {
    return callback(new Error('Source video file is not specified'))
  }
  else if (!options.secondsPerThumbnail && !options.framesPerThumbnail && !options.timemarks) {
    return callback(new Error('You should specify the way timemarks are calculated'))
  }

  var videoExtension = path.extname(inputVideo)
    , videoBaseName = path.basename(inputVideo, videoExtension)
    , metadata;

  if (!options.outputDirectory) {
    return callback(new Error('You should specify an output directory'));
  }

  options.inputVideoPath = inputVideo;
  options.outputWebVTTPath = path.join(options.outputDirectory, videoBaseName + '.vtt');
  options.spritesImagePath = path.join(options.outputDirectory, videoBaseName + '.png');
  options.outputThumbnailDirectory = options.outputDirectory;

  Utils.metadata(inputVideo, onMetadata);

  function onMetadata(err, data) {
    if (err) {
      return callback(err)
    }

    metadata = data;

    if (!options.timemarks) {
      options.timemarks = []
    }
    options.thumbnailTimeBounds = [];

    var mark;

    if (options.secondsPerThumbnail) {
      mark = 0;

      while (mark < metadata.duration) {
        options.thumbnailTimeBounds.push(Number(mark).toFixed(3));
        options.timemarks.push(Number(mark).toFixed(3));

        mark += options.secondsPerThumbnail
      }
    }
    else if (options.framesPerThumbnail) {
      mark = 0;

      while (mark < metadata.duration) {
        options.thumbnailTimeBounds.push(Number(mark).toFixed(3));
        options.timemarks.push(Number(mark).toFixed(3));

        if (!metadata.fps) {
          return callback(new Error('Can\'t determine video FPS.'))
        }

        mark += options.framesPerThumbnail / metadata.fps
      }
    }

    if (!options.thumbnailSize) {
      options.thumbnailSize = {
        width: metadata.width,
        height: metadata.height
      }
    }
    else if (!options.thumbnailSize.height) {
      options.thumbnailSize.height = options.thumbnailSize.width * metadata.height / metadata.width
    }
    else if (!options.thumbnailSize.width) {
      options.thumbnailSize.width = options.thumbnailSize.height * metadata.width / metadata.height
    }

    Utils.generateThumbnails(
      inputVideo,
      {
        outputThumbnailDirectory: options.outputThumbnailDirectory,
        thumbnailSize: options.thumbnailSize,
        timemarks: options.timemarks
      },
      onGenerate
    )
  }

  function onGenerate(err, filenames) {
    if (err) {
      return callback(err)
    }

    var writer;
    writer = new SpriteSheetWriter(metadata, options, filenames);

    writer.on('error', onError);
    writer.on('success', onSuccess)
  }

  function onError(err) {
    callback(err)
  }

  function onSuccess(data) {
    callback(null, {
      thumbnailsData: data
    })
  }
};