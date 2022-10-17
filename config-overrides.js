/* config-overrides.js */
let path = require('path');

module.exports = function override(config, env) {
  //do stuff with the webpack config...
  return {
    ...config,
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
  }
}