const log = require('loglevel');
const redis = require('redis');

var clientIdLast = 0;

var create = function(options, callback) {
	var host = options.host;
	var port = options.port;
	var pass = options.pass;

	var uid = clientIdLast++;
	var tag = 'RedisClient-' + uid + ' ';

	var client = redis.createClient(port, host, {
		// endlessly try to reconnect, after 5s
		retry_strategy: function () {
			return 5000;
		},
		connect_timeout: false,
		// when connection lost, queue commands until reconnected
		enable_offline_queue: true,
	});

	client.auth(pass, function() {
		// auth sent
	});

	client.on('ready', function() {
		// only call on first connect
		if (callback !== undefined) {
			callback(client);
			callback = undefined;
		}
	});

	client.on('end', function() {
		log.warn(tag, 'connection end/lost, ' + host + ':' + port + ', ' + tag);
	});

	// all exceptions thrown in redis callbacks, will bubble up here
	client.on('error', function(err) {

		// https://github.com/NodeRedis/node_redis#error-handling--v26
		// why does that happen?
		if (err instanceof redis.AbortError) {
			log.warn(tag, 'connection aborted', err);

			if (err.code === 'NR_CLOSED') {

			}

			return;
		}

		/*
		// swallow connect errors
		if (message.indexOf('connect ECONNREFUSED') !== -1) {
			log.error(tag, 'error connecting, ' + err);
			return;
		}

		if (message.indexOf('connect EHOSTUNREACH') !== -1) {
			log.error(tag, 'error connecting, ' + err);
			return;
		}

		if (message.indexOf('connect ETIMEDOUT') !== -1) {
			log.error(tag, 'error connect timeout, ' + err);
			return;
		}

		if (message.indexOf('read ECONNRESET') !== -1) {
			log.error(tag, 'error read ECONNRESET, ' + err);
			return;
		}

		if (message.indexOf('read ENETUNREACH') !== -1) {
			log.error(tag, 'error read ENETUNREACH, ' + err);
			return;
		}
		*/

		// throw all other catched errors
		log.error(tag, 'unexpected error ' + err);
		throw new Error(err);
	});

	client.on('end', function() {
		log.debug(tag, 'connection closed');
	});

	return client;
};

exports.create = create;
