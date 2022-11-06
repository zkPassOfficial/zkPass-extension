/* config-overrides.js */
let path = require('path')
let _ = require('lodash')

module.exports = function override(config, env) {
  //do stuff with the webpack config...
  const res = _.merge(config, {
    entry: {
      main: './src/index.tsx',
      background: './src/background/index.ts',
    },
    output: {
      path: path.resolve(__dirname, 'build'),
      pathinfo: false,
      filename: 'static/js/[name].js',
      chunkFilename: 'static/js/[name].chunk.js',
      assetModuleFilename: 'static/media/[name].[ext]',
      publicPath: '/'
    },
    resolve: {
      fallback: {
        path: require.resolve('path-browserify'),
        crypto: require.resolve('crypto-browserify'),
        stream: require.resolve('stream-browserify')
      }
    },
    module: {
      rules: [
        {
          test: /\.worker\.ts$/,
          loader: 'worker-loader',
        },
      ],
    },
  })
  return res
}