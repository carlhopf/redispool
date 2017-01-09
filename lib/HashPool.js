const crypto = require('crypto');
const map = require('async/map');
const Client = require('./Client');

// around 70x faster then crypto.createHash('md5')
const hashcode = function (str) {
	if (str.length == 0) return hash;
	var hash = 0;
	
	for (var i = 0; i < str.length; i++) {
		var char = str.charCodeAt(i);
		hash = ((hash<<5)-hash) + char;
		hash = hash & hash; // Convert to 32bit integer
	}

	return Math.abs(hash);
}

const md5hash = function (str) {
	var hash = crypto.createHash('md5').update(str).digest('hex');
	return parseInt(hash.substr(0, 4), 16);
};

const index = function (string, count) {
	if (count === 1) return 0;
	return hashcode(string) % count;
};

/**
 * Different from Pool: one client created per master in init(),
 * so getSync() possible.
 */
class HashPool {
	constructor (options) {
		this.options = options;
		this.ready = false;
		this.clients = [];
		this.length = 0;
	}

	/**
	 * Create a new set of clients, one for each master.
	 */
	init (cb) {
		map(this.options.masters, (json, cb) => {
			Client.retryCreate({
				host: json.host,
				port: json.port,
				pass: json.pass,
				tag: this.options.tag,
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
		throw new Error('not implemented');
	}

	getSync (key) {
		if (!this.ready) throw new Error('HashPool getSync() not ready');
		return this.clients[index(key, this.length)];
	}
}

module.exports = HashPool;
