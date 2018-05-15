#!/bin/bash
#	VMSetup.sh
#	(c) 2015-2016, Cloud Raxak, Inc.
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
echo ${0}" VM setup script. (c) 2014-2016 Cloud Raxak Inc."
#
# randpw(){ < /dev/urandom tr -dc _A-Z-a-z-0-9 | head -c${1:-16};echo;}

if [ "$(id -u)" != "0" ]; then
   echo ${0}" must be run as root."
   exit 1
fi

#    Global variables and overrides go here
#***
username=${username:-raxak}

echo Working as user `whoami`
id -u $username
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
echo 'User '$username' exists -- adding public key'
fi
echo 'Switching to '$username
su - $username << "EOF"
echo User changed to `whoami`
cd ~
echo Working in directory `pwd`
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
