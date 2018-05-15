#!/bin/bash
# This is the stub file that is  used by the createCustomVMSetup API call
#   to construct a custom VMSetup.sh
#   This section must run as root
#   $username should be defined externally
#
# Create hidden file with customization
#   This file is created as a hidden file with root access only
echo "Customization section: (c) Cloud Raxak Inc."
secretcode=${secretcode:-None}
username=${username:-raxak}
echo "Secret Code :"$secretcode
echo $secretcode > ~${username}/.raxak
chmod 600 ~$username/.raxak
#
# Now create the autoenroll capability
#
hostname=`hostname`

echo "Username: "$username
echo "Host name: "$hostname
# syntax: /raxakapi/v1/autoenroll/usertoken/nickname/username/profile/auto/periodicity
#   defaults: usertoken = ""    (will return warning)
#   username = "raxak" (set globally here)
#   nickname = hostname of the server
#   profile = None
#   auto = False (ignored if profile = None
#   periodicity = "Once" (ignored if auto = False)
#   this version defaults usertoken to prasanna's google id for testing purposes
#
usertoken=${usertoken:-None}
echo "User token: "$usertoken
raxakserver=${raxakserver:-http://softlayer.cloudraxak.net}
echo "Raxak SaaS server: "$raxakserver
enroll=$raxakserver"/raxakapi/v1/autoenroll/"$usertoken"/"$hostname"/"$username"/"$profile"/"$auto"/"$repeat
echo "API Call: "$enroll
if [ -x /usr/bin/wget ] ; then
    echo "Using wget -q "$enroll" -O /dev/null"
    wget -q $enroll -O /dev/null
elif [ -x /usr/bin/curl ] ; then
    echo "Using curl "$enroll
    curl $enroll
else
    echo "Neither wget nor curl is installed"
    if [ -f /etc/lsb-release -o -f /etc/debian_version ]; then
          sudo apt-get -y install wget
          if [ $? -eq 0 -a -x /usr/bin/wget ]; then
                wget -q $enroll -O /dev/null
          else
                echo "wget:Install error hence unable to enroll, please contact the RAXAK administrator for further assistance."
                exit 1
          fi
    elif [ -f /etc/redhat-release ]; then
          sudo yum install -y curl
          if [ $? -eq 0 -a -x /usr/bin/curl ]; then
                curl $enroll
          else
                echo "curl:Install error hence unable to enroll, please contact the RAXAK administrator for further assistance."
                exit 1
          fi
    else
          #TODO - Redirect the logs in error file for future reference for debugging.
          echo "OS not supported. Unable to autoenroll."
          echo "Please contact the RAXAK administrator for further assistance."
          exit 1
    fi
fi
rm -f stack
exit

