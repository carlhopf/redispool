const crypto = require('crypto');

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

module.exports = function (string, count) {
	if (count === 1) return 0;
	return hashcode(string) % count;
};
