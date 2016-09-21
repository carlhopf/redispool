const crypto = require('crypto');

exports.index = function(string, count) {
	// use native nodejs hash, this is way faster den jslib/hash/MD5
	var hash = crypto.createHash('md5').update(string).digest('hex');

	// 65535 is hex 'ffff' + 1, num max value is 'ffff' 65535,
	// ~~ is faster way of Math.floor(), md5 is 10 times faster then sha512
	return ~~(parseInt(hash.substr(0, 4), 16) / 65536 * count);
};
