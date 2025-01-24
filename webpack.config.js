// webpack.config.js
const path = require('path');
const Dotenv = require('dotenv-webpack');

module.exports = {
  entry: {
    login: './scripts/login.js',
    main: './scripts/main.js',
  },
  output: {
    filename: '[name].bundle.js',
    path: path.resolve(__dirname, 'scripts/dist'),
    clean: true,
  },
  plugins: [
    new Dotenv({
      path: './.env', // .envファイルのパス
      safe: false,
      systemvars: true,
    }),
  ],
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env'],
          },
        },
      },
      // 必要に応じて他のローダーを追加
    ],
  },
  mode: 'production', // 開発時は 'development' に変更
  devtool: 'source-map',
};
