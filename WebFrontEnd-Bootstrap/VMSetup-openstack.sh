#!/bin/bash
#	VMSetup.sh
#	(c) 2015, Cloud Raxak, Inc.
#	This script, run as a post-install script, will set up the desired userid
#	and populate its public key. It will also set up no-password sudo access
#	and the !requiretty flags in the sudoers file
#   Usage: VMSetup.sh <userid>
#       where <userid> defaults to "raxak" if not specified
#
#-----------------------
#	We assume that the script is running as root
#   Output from the file can usually be found in /var/log
#
echo "VMSetup.sh (c) Cloud Raxak Inc."
randpw(){ < /dev/urandom tr -dc _A-Z-a-z-0-9 | head -c${1:-16};echo;}

if [ "$(id -u)" != "0" ]; then
   echo "VMSetup.sh must be run as root"
   exit 1
fi

username=${username:-raxak}

whoami
id -u ${username}
result=$?;
if [ $result -ne 0 ]; then
echo "Create user "$username
echo 'Creating username '$username
useradd -m $username
echo '# Added for Raxak Protect service' >> /etc/sudoers
echo 'Defaults:'$username' !requiretty'  >> /etc/sudoers
echo 'Defaults:root !requiretty'         >> /etc/sudoers
echo $username' ALL=(ALL) NOPASSWD: ALL' >> /etc/sudoers
echo '# End section ---   Raxak Protect' >> /etc/sudoers
else
echo 'User '${username}' exists -- adding public key'
fi
echo 'Switching to '$username
su - $username << "EOF"
# This section runs as $username
whoami
cd ~
pwd
mkdir -p ~/.ssh/
key="AAAAB3NzaC1yc2EAAAADAQABAAABAQDCXPkVRVZj9hrfZ5l4SwKKt0"
key=${key}"Ni4IrBkBpZj4"
key=${key}"LxkP730FYylSSRQNiBuWE46G8smyA0V8Q2jat2Y2fWXn2i4Aozakj"
key=${key}"YLis+UoYLDpFaH35dKBX2mcQzmN"
key=${key}"BZLmwgLFfrLXMVb4j0Bhg87SnPyUzsp88FfCl7VqzDjE16Pq3WrqO"
key=${key}"rX/AC9f2tHKlDFepH11XJGAabZ5B"
key=${key}"uVDPdg02q7xIF4erGtCgLTPPB6Vyp1pg9OqJCWGBcSdVs2Zu8riVBZ"
key=${key}"PtgMo19ag/g14fuY6O/02f5zHJ"
key=${key}"l3TvcWJS4LQe+EyvqCt1T1h2/8YEl9YaYshATYdViVdrKrWvl"
key=${key}"PloOEEnDppeMyRM9"
echo "Key = "$key
echo "ssh-rsa $key raxakPublic.key" >> ~/.ssh/authorized_keys
chmod 640 ~/.ssh/authorized_keys
chmod 700 ~/.ssh/
EOF
# Now back to running as root
whoami
# Create hidden file with customization
#   This file is created as a hidden file with root access only
cat $secretcode > ~$username/.raxak
chmod 600 ~$username/.raxak
#
# Now create the autoenroll capability
#
hostname=`hostname`

# syntax: /raxakapi/v1/autoenroll/usertoken/nickname/username/profile/auto/periodicity
#   defaults: usertoken = ""    (will return warning)
#   username = "raxak" (set globally here)
#   nickname = hostname of the server
#   profile = None
#   auto = False (ignored if profile = None
#   periodicity = "Once" (ignored if auto = False)
#   this version defaults usertoken to prasanna's google id for testing purposes
#
usertoken="Z0FBQUFBQld3NHlRNHBXbUZyRVlEeFJvRjZsX1NWZE53eUZJaDVyZk5QZGthRXdublJXOUIxWWMwNV9Da2RjUkJ1RG5YQWNzRUNZYUlDNFFKM05DODY1OWhXaVA0OUVMSi1tUElYMVRrZXZNSWpoc2xGMkV5cDRzbW1lazZEVVpucHNEOTVScERBRkZWV1JVZFFSVXZCSnhmLTFIRjZlUzlWUi1HbjBScTk0X0pnTndoVmUySkU4VFRRRzI1MkwtZjVRNHppaVRzMEt2ZzBqejBDYU5WNnE1MmF1UGxmUVg1WkZ0RTQtTUtyNVRHak1oN3B1YVF5cz0="
RAXAKSERVER="http://softlayer.cloudraxak.net"
openstackenroll=$RAXAKSERVER"/raxakapi/v1/autoenroll/"$usertoken"/"$hostname"/"$username"/None/False/Once"
if [ -x /usr/bin/wget ] ; then
    echo "Using wget -q "$openstackenroll" -O /dev/null"
    wget -q $openstackenroll -O /dev/null
elif [ -x /usr/bin/curl ] ; then
    echo "Using curl "$openstackenroll
    curl $openstackenroll
else
    echo "Neither wget nor curl is installed"
    if [ -f /etc/lsb-release -o -f /etc/debian_version ]; then
          sudo apt-get -y install wget
          if [ $? -eq 0 -a -x /usr/bin/wget ]; then
                wget -q $openstackenroll -O /dev/null
          else
                echo "wget:Install error hence unable to enroll, please contact the RAXAK administrator for further assistance."
                exit 1
          fi
    elif [ -f /etc/redhat-release ]; then
          sudo yum install -y curl
          if [ $? -eq 0 -a -x /usr/bin/curl ]; then
                curl $openstackenroll
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
