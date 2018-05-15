#!/bin/bash

# Admin's email id here.
email_id=kaustubh@esoftech.org
a=0
pid=$(pgrep gunicorn)
#echo $pid

if [[ -z "$pid" ]]    # If pid is blank that means gunicorn is not running
then
    cd /home/raxak/release-2.01/raxak1/                       # Please change this path to your customised path before running this script.
    bash gstart.sh 2>/dev/null
    mail -s "Gunicorn found stopped, server rebooted." $email_id <<< "Hello Admin,

       The Gunicorn application server was found stopped. We have restarted the gunicorn application server to avoid inconvenience for CloudRaxak users. Thank you for hosting RaxaK Protect. You can contact the support team for any more queries.

Regards,
CloudRaxak Support Team."
else
    :
fi
