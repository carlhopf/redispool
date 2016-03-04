var log = require('loglevel');
var redis = require('redis');

var clientIdLast = 0;

var create = function(options, callback) {
	var host = options.host;
	var port = options.port;
	var pass = options.pass;

	var uid = clientIdLast++;
	var tag = 'RedisClient-' + uid + ' ';

	var client = redis.createClient(port, host, {
		// endlessly try to reconnect
		max_attempts: 0,
		connect_timeout: false,
		retry_max_delay: 5000,
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
		var message = err.message;
		log.warn(tag, 'error', message);

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
