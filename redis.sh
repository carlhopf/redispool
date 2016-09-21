#!/bin/bash
NAME="redis-3.0.7"
PIDFILE="redis.pid"
PORT="6371"
DIR=$(pwd)

cd $DIR/server/$NAME

if [ ! -f "src/redis-server" ]; then
  echo "make"
  make
fi

# process exist, kill old
PID=$(ps aux | grep "[r]edis-server \*.$PORT" | awk '{print $2}')

if [ -n "$PID" ]; then
  echo "kill $PID"
  kill -9 $PID
  rm $PIDFILE
fi

# start, config set to deamonize
./src/redis-server redis.conf

while [ ! -f "$PIDFILE" ]; do
  echo "waiting for new pidfile"
  sleep 0.25
done

echo "started pid $(cat $PIDFILE)"
exit 0
