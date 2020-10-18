const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const StatsWebpackPlugin = require('stats-webpack-plugin');
const ReactRefreshWebpackPlugin = require('@pmmmwh/react-refresh-webpack-plugin');
const { version } = require('./package.json');
const childProcess = require('child_process');

const gitShaBuffer = childProcess.execSync('git rev-parse --short HEAD');
const gitSha = gitShaBuffer.toString().trim();

module.exports = (env) => {
  const isDevMode = !!(env && env.dev);
  return {
    devServer: {
      proxy: {
        '/sandiego-2020-general-results': {
          target: 'http://0.0.0.0:8081',
          changeOrigin: true,
        },
      },
    },
    devtool: isDevMode ? 'eval-source-map' : 'source-map',
    entry: ['fontsource-dm-mono/400.css', path.resolve(__dirname, 'src')],
    mode: isDevMode ? 'development' : 'production',
    module: {
      rules: [
        isDevMode && {
          test: /\.tsx?$/,
          include: path.resolve(__dirname, 'src'),
          use: [
            {
              loader: require.resolve('babel-loader'),
              options: {
                plugins: [require.resolve('react-refresh/babel')],
              },
            },
          ],
        },
        {
          test: /\.tsx?$/,
          use: 'ts-loader',
          include: path.resolve(__dirname, 'src'),
        },
        {
          test: /\.css?$/,
          use: ['style-loader', 'css-loader'],
        },
        {
          test: /\.woff2?$/,
          use: 'file-loader',
        },
      ].filter(Boolean),
    },
    plugins: [
      new HtmlWebpackPlugin({
        releaseLabel: `${version} [${gitSha}:${isDevMode ? 'dev' : 'prod'}]`,
        template: 'src/index.html',
        title: 'SD Results',
      }),
      isDevMode &&
        new ReactRefreshWebpackPlugin({
          overlay: false,
        }),
      !isDevMode && new StatsWebpackPlugin('../stats.json'),
    ].filter(Boolean),
    resolve: {
      extensions: ['.js', '.ts', '.tsx'],
    },
    stats: 'minimal',
  };
};
