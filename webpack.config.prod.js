var pkg = require('./package.json');
var webpack = require('webpack');
var path = require('path');
var UglifyJsPlugin = require('uglifyjs-webpack-plugin');
// var ExtractTextPlugin = require('extract-text-webpack-plugin');

// 设置 webpack 环境值
var devFlagPlugin = new webpack.DefinePlugin({
	__LOCAL__: process.env.LOCAL || 'false'
});

module.exports = {
	devtool: false,
	mode: 'production',
	performance: {
		hints: false
	},
	entry: {
		main : './src/main.js',
		loader: './src/loader.js', 
	},
	output: {
		path: path.resolve(__dirname, './dist'),
		filename: '[name].js',
	},
	module: {
		rules: [
			{
				test: /\.js$/,
				exclude: /node_modules/,
				use: [
					{
						loader: 'babel-loader',
						options: {
							presets: [
								['es2015', { modules: false }],
								'stage-0',
							],
							plugins: [
								'transform-runtime',
							]
						},
					},
				],
			},
			{
				test: /\.html$/, loader: 'html-loader?minimize=false'
			},
			{
				test: /\.(less|css)$/,
				use: [{
					loader: 'style-loader' // creates style nodes from JS strings
				}, 
				{
					loader: 'css-loader',
					options: {
						minimize: true,
					},
				},
				{
					loader: 'less-loader',
				},
				],
			},
		],
	},
	devServer: {
		host: '0.0.0.0',
		contentBase:  __dirname,
		disableHostCheck: true,
		publicPath: '/dist',
	},
	plugins: [
		new webpack.BannerPlugin([
			'FireWorm v' + pkg.version,
			'',
			'Licensed under the MIT License (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at'
		].join('\n')),
		new UglifyJsPlugin({
			uglifyOptions: {
				compress: true
			}
		}),
		// ,new ExtractTextPlugin('[name].min.css') // 将css独立打包
		devFlagPlugin
	]
};
