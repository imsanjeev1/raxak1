#!/bin/bash 
# File: execute.sh 
#
#       (c) 2015, Cloud Raxak Inc. All Rights Reserved
#
#       This shell script will help to automatically login to amazon VM, create a new raxak user
#	do the necessary raxak related VM settings 
#
#       Usage: executionx.sh <VMDefaultUsername> <VM-IP> <pemFilePath>
#
#	Note:- To prepare allow access to your machine, you must do the following steps manually:
#	Ensure that the machine can be pinged by allowing the ICMP protocol through your firewall.
#    	Ensure that port 22 is open to allow SSH access to your machine
#    	Note that both 1 & 2 are off by default on AWS, and on by default on GCE. 
#


if [ $# -lt 3 ]; then
    echo "./execute.sh <VMDefaultUsername> <VM-IP> <pemFilePath>";
    echo ""
    echo "Prerequisite before to execute this script:"
    echo "Ensure that the machine can be pinged by allowing the ICMP protocol through your firewall."
    echo "Ensure that port 22 is open to allow SSH access to your machine "
    echo "Note that both 1 & 2 are off by default on AWS, and on by default on GCE."
    exit
fi

IP=$2
usernameIP=$1"@"$2
ping -q -c3 $2 > /dev/null
if [ $? -eq 0 ]
then
	echo "Ping OK.."
else
	echo "Ping failed.."
	echo "Please allow ICMP protocol through your firewall, so that machine can be reachable"
	exit
fi
pemfilePath=$3
cat raxakVMSetting.sh | ssh -o "StrictHostKeyChecking no" -tt $usernameIP -i $pemfilePath   
