const HashPool = require('./HashPool');

class PubHashPool {
	/**
	 * Ok.
	 *
	 * @param {array} options.masters
	 */
	constructor (options) {
		this.options = options;

		this.pool = new HashPool({
			masters: options.masters,
		});
	}

	init (cb) {
		if (!cb) throw new Error('cb missing');
		this.pool.init(cb);
	}

	/**
	 *
	 *
	 * @param {function} cb - Ready callback.
	 */
	publish (channel, json, cb) {
		var client = this.pool.getSync(channel);
		client.publish(channel, JSON.stringify(json), cb);
	}
}

module.exports = PubHashPool;
