'use strict';
var async = require('async');
var Log = require('jslib/utils/Log');
var Client = require('./Client');

var tag = 'Pool';
var poolIdLast = 0;

/**
 * Pool for single host, use dedicated client for each query.
 *
 */
function Pool(options) {
	this.id = poolIdLast++;
	this.tag = 'RedisPool';

	this._host = options.host;
	this._port = options.port;
	this._pass = options.pass;
	this._clients = [];
	this._count = 0;

	// always same client for .get(),
	// use _queue while client is connecting
	this._client = undefined;

	this._queue = async.queue(function(item, cb) {
		process.nextTick(() => item(cb));
	}, 1);
}

Pool.prototype.MAX_CONNECTIONS = 256;

/**
 * Exclusive control over returned connection.
 * Must call release()!
 *
 * @callback {function} (err, client, release)
 */
Pool.prototype.pop = function(callback) {
	if (this._clients.length > 0) {
		var client = this._clients.pop();

		// callback must always be async
		process.nextTick(function() {
			this._pop(client, callback);
		}.bind(this));
	} else {
		Log.trace(tag, 'pop() create new client');

		// creating is async
		this._create(function(err, client) {
			this._pop(client, callback);
		}.bind(this));
	}
};

Pool.prototype._pop = function(client, callback) {
	callback(null, client, function() {
		if (this._clients.indexOf(client) !== -1) return;
		this._clients.push(client);
	}.bind(this));
};

/**
 * Grants non-exclusive control. The returned connection might be
 * used by other callbacks at the same time. Can not use WATCH on keys
 * as this connection is not threadsafe.
 *
 * Always returns the same connection.
 */
Pool.prototype.get = function(callback) {
	if (!callback) throw new Error('callback missing');

	// create first client
	if (this._client === undefined) {
		this._client = null;

		this._queue.push(function(_callback) {
			this._create(function(err, client) {
				// do not allow .watch() on get() client,
				// as we do not have exclusive control
				client.watch = () => { throw new Error('no .watch on get()'); };

				this._client = client;
				_callback();
			}.bind(this));
		}.bind(this));
	}

	this._queue.push(function(_callback) {
		// callback must always be async (queue could exec instantly)
		// > could lead to stacksize exceed
		process.nextTick(function() {
			callback(null, this._client);
			_callback();
		}.bind(this));
	}.bind(this));
};

Pool.prototype._create = function(cb) {
	Log.info(this.tag, 'new connection, #' + this._count);

	var client = Client.create(
		{
			host: this._host,
			port: this._port,
			pass: this._pass,
		},
		() => {
			// success
			this._count++;
			Log.trace(this.tag, 'connect success, count ' + this._count);

			if (this._count > this.MAX_CONNECTIONS) {
				throw new Error(this.tag + ' too many connections, forgot to release?');
			}

			cb(null, client);
		});
};

/**
 * If connection is ready.
 */
Pool.prototype.ready = function(cb) {
	async.waterfall([
		(cb) => this.get(cb),
		(client, cb) => client.randomkey(cb),
	], cb);
};

module.exports = Pool;
