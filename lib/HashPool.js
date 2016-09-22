const crypto = require('crypto');
const map = require('async/map');
const Client = require('./Client');

const index = function(string, count) {
	// use native nodejs hash, this is way faster den jslib/hash/MD5
	var hash = crypto.createHash('md5').update(string).digest('hex');

	// 65535 is hex 'ffff' + 1, num max value is 'ffff' 65535,
	// ~~ is faster way of Math.floor(), md5 is 10 times faster then sha512
	return ~~(parseInt(hash.substr(0, 4), 16) / 65536 * count);
};

/**
 * Different from pool: one client created per master in ini(),
 * so getSync() possible.
 */
class HashPool {

	constructor (options) {
		this.options = options;
		this.ready = false;
		this.clients = [];
		this.length = 0;
	}

	init (cb) {
		map(this.options.masters, (json, cb) => {
			Client.create({
				host: json.host,
				port: json.port,
				pass: json.pass,
			}, cb);
		}, (err, _clients) => {
			if (err) return cb(err);

			this.ready = true;
			this.clients = _clients;
			this.length = this.clients.length;
			cb(null, this.clients);
		});
	}

	get (key, cb) {
		throw new Error('implement');
	}

	getSync (key) {
		if (!this.ready) throw new Error('HashPool getSync() not ready');
		return this.clients[index(key, this.length)];
	}
}

module.exports = HashPool;
