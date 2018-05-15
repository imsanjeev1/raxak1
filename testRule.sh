#!/bin/sh
# File: testRule.sh 
#
#       (c) 2015, Cloud Raxak Inc. All Rights Reserved
#
#	This shell script will help to test the single rule for specific VM.
#
# 	Usage: testRule.sh [option] username@IP security_ruleID
#	Options:
#	-c    check the security rule 
#	-f    fix the security rule
#
#	Note: Install wget and use this script
#
#	Changelog:
#
#	03/03/2015	ASG	Initial draft		
#
#


if [ $# -lt 3 ]; then
    echo "./testRule.sh [options] username@IP <Security RuleID>";
    echo "Options:"
    echo "   -c   check the security rule"
    echo "   -f   fix the security rule"
    return
fi

if [ "$1" = "-c" ] 
then
	wgetString="http://127.0.0.1/raxakapi/v1/checkRule/V-"$3"?ip="$2" -O /dev/null"
elif [ "$1" = "-f" ] 
then
	wgetString="http://127.0.0.1/raxakapi/v1/fixRule/V-"$3"?ip="$2" -O /dev/null"
else
	echo "./testRule.sh [options] username@IP <RuleID without V-*>";
    	echo "Options:"
	echo "   -c   check the security rule"
	echo "   -f   fix the security rule"
fi

wget -q $wgetString  
