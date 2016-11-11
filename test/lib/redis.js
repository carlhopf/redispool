const cp = require('child_process');
const async = require('async');
const fs = require('fs');
const path = require('path');
const mkdirp = require('mkdirp');
const request = require('request');

const PORT = exports.PORT = 8655;

var server;
var dir = path.join(process.cwd(), 'test', 'lib');

exports.start = function (cb) {
	async.series([
		(cb) => {
			cp.exec(path.join(dir, 'redis.sh'), function (err) {
				console.log('make done', err);
				cb(null);
			});
		},

		(cb) => {
			server = cp.spawn(
				path.join(process.cwd(), 'bin', 'redis', 'src', 'redis-server'),
				['--port ' + PORT]);

			server.stdout.on('data', (data) => {
				data = data.toString('utf8');
				//console.log(data);

				if (data.indexOf('ready to accept connections') !== -1) {
					cb(null);
				}
			});

			server.stderr.on('data', (data) => {
				data = data.toString('utf8');
				console.error(data);
			});
		},
	], cb);
};

exports.stop = function (cb) {
	if (!server) return;

	console.log('kill', server.pid);

	server.on('error', function (err) {
		console.log('kill err', err);
	});

	server.on('exit', function () {
		if (cb) cb(null);
	});

	server.kill('SIGTERM');
	server = undefined;
};
