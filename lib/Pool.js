const async = require('async');
const Log = require('loglevel');
const Client = require('./Client');

const tag = 'Pool';
const MS_RETURN_POP = 3600 * 1000;

var poolIdLast = 0;

/**
 * Pool for single host.
 */
function Pool (options) {
	this.id = poolIdLast++;
	this.tag = options.tag || 'no-tag';

	this._host = options.host;
	this._port = options.port;
	this._pass = options.pass;
	this._maxConnections = options.maxConnections || 4;

	this._clients = [];
	this._count = 0;

	// always same client for .get(),
	// use _queue while client is connecting
	this._client = undefined;

	this._queue = async.queue(function (item, cb) {
		process.nextTick(() => item(cb));
	}, 1);

	// get client, pass to next task (pop() request)
	this._popQueue = async.queue(
		(task, cb) => async.waterfall([
			(cb) => this._popOrCreate(cb),
			(client, cb) => task(client, cb),
		], cb),
		this._maxConnections);
}

Pool.prototype._popOrCreate = function (cb) {
	if (this._clients.length > 0) {
		var client = this._clients.pop();
		process.nextTick(() => cb(null, client));
	} else {
		this._create(cb);
	}
};

/**
 * Exclusive control over returned connection.
 * Must call release()!
 *
 * @callback {function} (err, client, release)
 */
Pool.prototype.pop = function (cb) {
	var err = new Error(
		'client return timeout: ' + this.tag + ' ' + this.id);

	// get next available client
	this._popQueue.push((client, cbQueue) => {
		var to = setTimeout(() => {
			throw err;
		}, MS_RETURN_POP);

		cb(null, client, () => {
			// return client
			if (this._clients.indexOf(client) !== -1) return;

			clearTimeout(to);
			this._clients.push(client);
			cbQueue(null);
		});
	});
};

/**
 * Grants non-exclusive control. The returned connection might be
 * used by other callbacks at the same time. Can not use WATCH on keys
 * as this connection is not threadsafe.
 *
 * Always returns the same connection.
 */
Pool.prototype.get = function (callback) {
	if (!callback) throw new Error('callback missing');

	// create first client
	if (this._client === undefined) {
		this._client = null;

		this._queue.push(function (_callback) {
			this._create(function (err, client) {
				// do not allow .watch() on get() client,
				// as we do not have exclusive control
				client.watch = () => { throw new Error('no .watch on get()'); };

				this._client = client;
				_callback();
			}.bind(this));
		}.bind(this));
	}

	this._queue.push(function (_callback) {
		// callback must always be async (queue could exec instantly)
		// > could lead to stacksize exceed
		process.nextTick(function () {
			callback(null, this._client);
			_callback();
		}.bind(this));
	}.bind(this));
};

Pool.prototype._create = function (cb) {
	Log.debug(tag, 'new client', this._count + 1, this.tag);

	Client.retryCreate(
		{
			host: this._host,
			port: this._port,
			pass: this._pass,
		},
		(err, client) => {
			// success
			this._count++;
			cb(err, client);
		});
};

/**
 * If connection is ready.
 */
Pool.prototype.ready = function (cb) {
	async.waterfall([
		(cb) => this.get(cb),
		(client, cb) => client.randomkey(cb),
	], cb);
};

module.exports = Pool;
