const log = require('loglevel');
const redis = require('redis');
const auto = require('async/auto');
const retry = require('async/retry');

var clientIdLast = 0;

var create = function (options, cb) {
	var host = options.host;
	var port = options.port;
	var pass = options.pass;
	var uid = clientIdLast++;
	var tag = 'redispool-client-' + uid + ' ';

	auto({
		client: (cb) => {
			var done = false;

			// to not use retry_strategy, instead create new client for every retry
			// once connected and client ready, try to reconnect every 500ms
			var client = redis.createClient(port, host, {
				retry_strategy: function () {
					return done ? 500 : false;
				},
				enable_offline_queue: false,
			});

			if (pass) {
				client.auth(pass, function () {
					// auth sent
				});
			}

			client.on('ready', function () {
				if (!done) {
					done = true;
					cb(null, client);
				}
			});

			client.on('end', function () {
				log.warn(tag, 'connection end/lost, ' + host + ':' + port + ', ' + tag);

				if (!done) {
					done = true;
					cb('connection end/lost ' + host + ':' + port);
				}
			});

			// all exceptions thrown in redis callbacks, will bubble up here
			// https://github.com/NodeRedis/node_redis#error-handling--v26
			client.on('error', function (err) {
				if (!done) {
					done = true;
					cb('error ' + err);
				}

				log.error(tag, 'unexpected error ' + err);
				throw new Error(err);
			});
		},

		// run query, to verify connection is established
		query: ['client', (res, cb) => {
			res.client.randomkey(cb);
		}],
	}, (err, res) => {
		// in any case of error, close client
		if (err) {
			if (res.client) res.client.end(true);
		}

		cb(err, res.client);
	})
};

/**
 * Retry create client, until connection successfull.
 */
var retryCreate = function (options, cb) {
	// TODO implement cancel callback
	var cancel = false;

	retry(
		{
			times: options.times || Number.MAX_VALUE,
			interval: options.interval || 3000,
		},
		(cb) => create(options, cb),
		(err, client) => cb(err, client));

	return function () {
		cancel = true;
	};
};

exports.retryCreate = retryCreate;
