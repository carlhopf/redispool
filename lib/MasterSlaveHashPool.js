const async = require('async');
const crypto = require('crypto');
const MasterSlavePool = require('./MasterSlavePool');

function index(string, count) {
	// use native nodejs hash, this is way faster den jslib/hash/MD5
	var hash = crypto.createHash('md5').update(string).digest('hex');

	// 65535 is hex 'ffff' + 1, num max value is 'ffff' 65535,
	// ~~ is faster way of Math.floor()
	// md5 is 10 times faster then sha512
	return ~~(parseInt(hash.substr(0, 4), 16) / 65536 * count);
}

/**
 * Hash distribute RedisPool.pop(key) requests across all available redis hosts.
 *
 * @param {string} options.tag  Just a tag for logging.
 * @param {array} options.masters  Master details: [{ host, port, pass }]
 * @param {array} options.slaves  Slave nodes for each master: [[{ host, port, pass }, ..]]
 */
function MasterSlaveHashPool(options) {
	this._pools = [];

	var tag = options.tag;
	var masters = options.masters;
	var slaves = options.slaves;

	if (masters.length === 0) throw new Error('0 masters given');

	this._pools = masters.map((master, i) => {
		return new MasterSlavePool({
			tag: tag,
			master: master,
			slaves: slaves ? slaves[i] : undefined,
			maxConnections: options.maxConnections,
		});
	});

	this.length = this._pools.length;
}

/**
 * Pings all masterpools, which means connection is ready.
 */
MasterSlaveHashPool.prototype.ready = function(cb) {
	async.each(this._pools, function(pool, cb) {
		pool.ready(cb);
	}, cb);
};

/**
 * Index of
 */
MasterSlaveHashPool.prototype.index = function (key) {
	return index(key, this.length);
};

MasterSlaveHashPool.prototype.pop = function(key, callback) {
	if (typeof key !== 'string') throw new Error('key invalid: ' + key);
	this._pools[this.index(key)].pop(callback);
};

MasterSlaveHashPool.prototype.popSlave = function(key, callback) {
	if (typeof key !== 'string') throw new Error('key invalid: ' + key);
	this._pools[this.index(key)].popSlave(callback);
};

MasterSlaveHashPool.prototype.get = function(key, callback) {
	if (typeof key !== 'string') throw new Error('key invalid: ' + key);
	this._pools[this.index(key)].get(callback);
};

MasterSlaveHashPool.prototype.getSlave = function(key, callback) {
	if (typeof key !== 'string') throw new Error('key invalid: ' + key);
	this._pools[this.index(key)].getSlave(callback);
};

MasterSlaveHashPool.prototype.getIndex = function(index) {
	this._pools[index].get(callback);
};

module.exports = MasterSlaveHashPool;
