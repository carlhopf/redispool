const log = require('loglevel');
const util = require('util');
const redis = require('redis');
const auto = require('async/auto');
const retry = require('async/retry');
const commands = require('redis-commands');
const EventEmitter = require('events').EventEmitter;

function Multi (client, instance) {
	EventEmitter.call(this);
	this.client = client;
	this.instance = instance;
}

util.inherits(Multi, EventEmitter);

Multi.prototype.run = function (command, args) {
	if (command === 'exec') {
		var cb = args[args.length - 1];
		var ts = Date.now();
		var client = this.client;

		if (typeof cb === 'function') {
			// replace cb with wrapped version
			args[args.length - 1] = function () {
				client.emit('took', Date.now() - ts, command, args);
				cb.apply(this, arguments);
			};

			return this.instance[command].apply(this.instance, args);
		} else {
			// add cb to emit took
			return this.instance[command].call(this.instance, ...args, function () {
				client.emit('took', Date.now() - ts, command, args);
			});
		}
	}
};

commands.list.forEach(function (command) {
	Multi.prototype[command] = function () {
		return this.run(command, arguments);
	};
});

module.exports = Multi;
