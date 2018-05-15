#!/usr/bin/env bash
# Is gunicorn running?


status=`ps -efww | grep -w "gunicorn" | grep -v grep | grep -v $$ | awk '{ print $2 }'`


if [ ! -z "$status" ]; then
#   try to kill based on pid file if available
    [ -f /tmp/gunicorn.pid ] && kill `cat /tmp/gunicorn.pid` || kill $status
    rm /tmp/gunicorn.pid
else
    echo "[`date`] : gunicorn is not running."
fi
