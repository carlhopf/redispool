```javascript
const Pool = require('redispool/Pool');

var pool = new Pool({
  host: '127.0.0.1',
  port: 6379,
  maxConnections: 4,
});

// pop a client, for exclusive use, must call release()
pool.pop(function (err, client, release) {
  if (err) return;

  client.randomkey(function (err, key) {
    console.log('pool.pop', err, key);
    release();
  });
});

// get a client, which will be shared among other get()s
pool.get(function (err, client) {
  client.randomkey(function (err, key) {
    console.log('pool.get', err, key);
  });
});

```




enable_offline_queue set to false, as this could lead to serious
problems with Pool.pop() return timeouts?
