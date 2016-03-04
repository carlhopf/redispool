var Pool = require('./Pool');

/**
 * Connection pool to number of redis hosts.
 *
 * @param options.master {array} Connection info { host, port, pass }.
 * @param options.slaves {array} Optional. Array of { host, port, pass }.
 */
function MasterSlavePool(options) {
	this.tag = 'MasterSlavePool-' + options.tag;
	this._master = options.master;
	this._slaves = options.slaves || [];

	this._mpool = new Pool({
		host: this._master.host,
		port: this._master.port,
		pass: this._master.pass,
	});

	this._spools = this._slaves.map((slave) => {
		return new Pool({
			host: slave.host,
			port: slave.port,
			pass: slave.pass,
		});
	});
}

/**
 * If connection to master is ready.
 */
MasterSlavePool.prototype.ready = function(cb) {
	this._mpool.ready(cb);
};

MasterSlavePool.prototype.pop = function(cb) {
	this._mpool.pop(cb);
};

MasterSlavePool.prototype.popSlave = function(cb) {
	this._spools[Math.floor(Math.random() * this._spools.length)].pop(cb);
};

MasterSlavePool.prototype.get = function(cb) {
	this._mpool.get(cb);
};

MasterSlavePool.prototype.getSlave = function(cb) {
	this._spools[Math.floor(Math.random() * this._spools.length)].get(cb);
};

module.exports = MasterSlavePool;
