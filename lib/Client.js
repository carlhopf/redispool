const log = require('loglevel');
const util = require('util');
const redis = require('redis');
const auto = require('async/auto');
const retry = require('async/retry');
const commands = require('redis-commands');
const EventEmitter = require('events').EventEmitter;
const Multi = require('./Multi');

const PING_INTERVAL = 30 * 1000;
const PING_TIMEOUT = 20 * 1000;

function Client (options, cb) {
	EventEmitter.call(this);

	this.options = options;
	this.tag = 'RedisClient-' + this.options.host;
	this.instance = undefined;

	this.ivping = undefined;
	this.toping = undefined;

	this.connect(cb);
}

util.inherits(Client, EventEmitter);

Client.prototype.connect = function (cb) {
	clearInterval(this.ivping);

	// client.end(flush=true), will callback err on all pending commands
	if (this.instance) this.instance.end(true);

	// new instance
	var done = false;

	this.instance = redis.createClient(
		this.options.port,
		this.options.host,
		{
			retry_strategy: function () {
				return 500;
			},
			enable_offline_queue: false,
			socket_keepalive: true,
		});

	if (this.options.pass) {
		this.instance.auth(this.options.pass, function () {});
	}

	this.instance.on('ready', () => {
		log.debug(this.tag, 'connection ready');
		this.emit('ready');

		// start pinging after ready
		this.ivping = setInterval(() => this.ping(), PING_INTERVAL);

		if (!done) {
			done = true;
			if(cb) cb(null, this);
		}
	});

	this.instance.on('message', (channel, string) => {
		this.emit('message', channel, string);
	});

	this.instance.on('reconnecting', () => {
		log.warn(this.tag, 'reconnecting');

		// stop pingig, redisclient will now proceed to reconnect
		clearInterval(this.ivping);
		clearInterval(this.toping);
	});

	this.instance.on('end', () => {
		log.warn(this.tag, 'connection end/lost');

		// stop pingig, redisclient will now proceed to reconnect
		clearInterval(this.ivping);
		clearInterval(this.toping);
	});

	// all exceptions thrown in redis callbacks, will bubble up here
	this.instance.on('error', (err) => {
		log.error(this.tag, 'onerror', err);
	});
};

Client.prototype.ping = function () {
	this.toping = setTimeout(() => this._pingTimeout(), PING_TIMEOUT);

	this.instance.randomkey(function (err) {
		if (!err) clearTimeout(this.toping);
	});
};

Client.prototype._pingTimeout = function () {
	log.warn(this.tag, 'ping timeout, reconnect');
	this.connect();
};

Client.prototype.run = function (command, args) {
	var cb = args[args.length - 1];
	var ts = Date.now();
	var that = this;

	// bug with client.publish:
	// - if no cb provided, last entry in arguments was 'undefined'
	if (typeof cb === 'function' || (cb === undefined && args.length !== 0)) {
		// replace cb with wrapped version
		args[args.length - 1] = function () {
			that.emit('took', Date.now() - ts, command, args);
			if (cb) cb.apply(this, arguments);
		};

		return this.instance[command].apply(this.instance, args);
	} else {
		// add cb to emit took
		return this.instance[command].call(this.instance, ...args, function () {
			that.emit('took', Date.now() - ts, command, args);
		});
	}
};

commands.list.forEach(function (command) {
	Client.prototype[command] = function () {
		return this.run(command, arguments);
	};
});

Client.prototype.multi = function () {
	return new Multi(this, this.instance.multi());
};

var create = function (options, cb) {
	auto({
		client: (cb) => {
			new Client(options, cb);
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
