#!/usr/bin/env bash
#	(c) 2015, Cloud Raxak, Inc.
#
#	usage:
#	./gstart.sh
#   Options:
#       s   Save nohop.out
#       f   Run in foreground
#       h   Show help

# Is gunicorn running?
status=`ps -efww | grep -w "gunicorn" | grep -v grep | grep -v $$ | awk '{ print $2 }'`

if [ ! -z "$status" ]; then
        echo "[`date`] : gunicorn is already running on PID(s): "$status
        echo "[`date`] : use ./gstop.sh or ./grestart.sh"
        exit 1;
fi

background=true
save=true
while getopts "sfh" FLAG; do
  case $FLAG in
    s)  #set option "s"
      save=true
      ;;
    f)  #set option "f"
      background=false
      ;;
    h) #show help
      echo "Usage: gstart.sh -sfh"
      exit
      ;;
    \?) #unrecognized option - show help
      echo -e \\n"Option -${BOLD}$OPTARG${NORM} not allowed."
      echo -e "Usage: gstart.sh -sfh (where s=save nohup.out; f=run in foreground; h=help "
      exit -2
      ;;
  esac
done
if $save; then
    touch nohup.out
else
    rm nohup.out
fi

if $background; then
    nohup gunicorn -b 0.0.0.0:8080 wsgi:app -p /tmp/gunicorn.pid --timeout 3000 &
else
    rm /tmp/gunicorn.pid
    gunicorn -b 0.0.0.0:8080 wsgi:app --timeout 3000
fi
