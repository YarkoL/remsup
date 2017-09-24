var path = require('path');

const webpack = require('webpack');

module.exports = {
	entry: './src/App.js',
	output: {
		filename: 'bundle.js',
		path: path.resolve(__dirname, 'public')
	},
	watch: true,
	module: {
		loaders: [
			{
				test:/\.js$/,
				exclude:/node_modules/,
				loader: 'babel-loader',
			},
			{
				test: /\.(png|svg|jpg|gif)$/,
				loader: 'file-loader',
				options: {
        			name: '/img/[name]_[hash:7].[ext]',
      			}
			}

		]
	}
}