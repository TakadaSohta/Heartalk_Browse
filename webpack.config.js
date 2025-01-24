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
    path: path.resolve(__dirname, 'docs/js'), // GitHub Pagesが 'docs' フォルダを参照する場合
    clean: true, // ビルド前に出力ディレクトリをクリーン
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
  mode: 'production', // 開発時は 'development' に変更可能
  devtool: 'source-map', // デバッグ用にソースマップを生成
};
