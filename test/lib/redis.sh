#!/bin/bash
PIDFILE="redis.pid"
DIR=$(pwd)/bin/
VERSION="3.2.5"

URL="http://download.redis.io/releases/redis-${VERSION}.tar.gz"
TAR="redis.tar.gz"

mkdir -p $DIR
mkdir -p $DIR/redis

cd $DIR

if [ ! -f "$TAR" ]; then
  curl $URL -o $TAR
  tar -xf $TAR -C redis --strip-components=1
fi

cd redis

if [ ! -f "src/redis-server" ]; then
  echo "make"
  make
fi
