#!/bin/bash
echo "----------------------------------------------------" >> /var/log/cloudRaxak/cloudRaxak_cron_log
echo "Username : " $1 >> /var/log/cloudRaxak/cloudRaxak_cron_log
echo "Target Machine usename@IP : " $2 >> /var/log/cloudRaxak/cloudRaxak_cron_log
echo "Compliance execution profile : " $4 >> /var/log/cloudRaxak/cloudRaxak_cron_log
echo "Compliance execution remediation mode: " $3 >> /var/log/cloudRaxak/cloudRaxak_cron_log
echo "Date of execution : " `date` >> /var/log/cloudRaxak/cloudRaxak_cron_log
echo "----------------------------------------------------" >> /var/log/cloudRaxak/cloudRaxak_cron_log

profile=`echo $4 | sed 's/ /%20/g'`
wgetString="http://127.0.0.1/raxakapi/v1/runProfiles/?ip="$2"&profile="$profile"&autoremediate="$3"&frequency=none&username="$1

wget -qO /dev/null "$wgetString"
