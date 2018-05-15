#!/bin/bash
#       (c) 2015-2016, Cloud Raxak, Inc.

# TO DO : Need to work on elminating hard coded paths

# Change the below path according to your location of the git repository.
path=/home/raxak/release-2.01/raxak1
cd $path

list_of_emailid=$(grep -w validManagers raxak.cfg | tr "=" "\n" | tr "," "\n" | awk '/@/')
a=0
pid=$(pgrep gunicorn)

msg_success="Hello Admin,

            The Gunicorn application server was found stopped. It has been started to avoid inconvenience for Raxak Protect users."
msg_fail="Hello Admin,

          The Gunicorn application server was found stopped. Something went wrong, Gunicorn application server failed to start."

if [[ -z "$pid" ]]    # If pid is blank that means gunicorn is not running.
then
    bash gstart.sh 2>/dev/null
    pid_check=$(pgrep gunicorn)
    if [[ ! -z "$pid_check" ]]
    then
        for email_id in $list_of_emailid
        do
            mail -s "Gunicorn found stopped, Server rebooted." $email_id <<< $msg_success
        done
    else
        for email_id in $list_of_emailid 
        do
            mail -s "Gunicorn found stopped, but Server failed to restart." $email_id <<< $msg_fail
        done
    fi
else
    :
fi

