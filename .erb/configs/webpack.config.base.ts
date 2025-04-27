/**
 * Base webpack config used across other specific configs
 */

import chalk from 'chalk'

import webpack from 'webpack';
import TsconfigPathsPlugins from 'tsconfig-paths-webpack-plugin';  // loads modules specified in 'paths' in tsconfig
                                                                  // (don't have any in the aviad cohen repo)

import webpackPaths from './webpack.paths';  // script that exports object with dllPath, distPath, etc.

import { dependencies as externals } from '../../release/app/package.json';

const cl = console.log
cl(chalk.black.bgGreen('>>>>> STARTED WEBPACK.CONFIG.BASE <<<<<<'))
cl(chalk.black.bgGreen(`process.env.NODE_ENV: ${process.env.NODE_ENV}`))
cl(chalk.black.bgGreen(`process.env.TS_NODE_TRANSPILE_ONLY: ${process.env.TS_NODE_TRANSPILE_ONLY}`))
cl(chalk.black.bgGreen(`process.env.PORT: ${process.env.PORT}`))

// OPEN QUESTIONS:
//  1) why is output.path set to srcPath?
//  2) what is implication of output.library.type = 'commonjs2'?




const configuration: webpack.Configuration = {
  externals: [...Object.keys(externals || {})],  // these are the 'dependencies' packages in package.json
                              // per webpack docs: The externals configuration option provides a way of
                              // excluding dependencies from the output bundles. Instead, the created bundle
                              // relies on that dependency to be present in the consumer's (any end-user
                              // application) environment. This feature is typically most useful to library 
                              // developers, however there are a variety of applications for it.

  stats: 'errors-only',

  module: {
    rules: [
      {
        test: /\.[jt]sx?$/,
        exclude: /node_modules/,
        use: {
          loader: 'ts-loader',
          options: {
            // Remove this line to enable type checking in webpack builds
            transpileOnly: true,
            compilerOptions: {
              module: 'esnext',
            },
          },
        },
      },
      {
        test: /\.node$/,
        loader: "node-loader",
      },
    ],
  },

  output: {
    path: webpackPaths.srcPath,
    // https://github.com/webpack/webpack/issues/1114
    library: {
      type: 'commonjs2',
    },
  },

  /**
   * Determine the array of extensions that should be used to resolve modules.
   */
  resolve: {
    extensions: ['.js', '.jsx', '.json', '.ts', '.tsx'],
    modules: [webpackPaths.srcPath, 'node_modules'],
    // There is no need to add aliases here, the paths in tsconfig get mirrored
    plugins: [new TsconfigPathsPlugins()],    // loads modules specified in 'paths' in tsconfig
                                              // (don't have any in the aviad cohen repo)
  },

  plugins: [
    new webpack.EnvironmentPlugin({   // see https://webpack.js.org/plugins/environment-plugin/
      NODE_ENV: 'production',         // if NODE_ENV is not already set, this sets it to default value of 'production'
    }),
  ],
};

export default configuration;
