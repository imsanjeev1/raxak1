# --runrules.py
#
#	(c) 2014, Cloud Raxak Inc. All Rights Reserved
#
#	runrules.py can be run as a python command line version or loaded and executed
#	through the runRules (note case) function call.
#	runRules takes 3 arguments: an IP address for the target machine in tuple form;
#		a list of rule names, and an optional IP address for a "hopper" when the target
#		ip address is not directly reachable
#
#	runRules uses execnet to create a link to the target, downloads first the support
#		functions from module ruleset (i.e., those that do not begin with checkRule or
#		fixRule), then iterates over the rules specified to send and have the actual rule
#		code executed.
#
#	The execnet gateway is closed after the run of rules is complete.
#
#

import sys, ast, inspect, types, time
import execnet
import pickle
import redis
import time, datetime
from datetime import datetime
import json
import time
import string
from crontab import CronTab
import getpass
import os

import VPNtunnel	
import ruleset
from cloudraxak import getNickname
from cloudraxak import checkAccess
from cloudraxak import getsshport 
import loadrules
import commonstub
import initgatewaycode

gw = ""
channel = ""
consoleLog = ""


def addConsole(data):
    global consoleLog
    data1 = data.rstrip('\n')
    if (data1 and len(data1) > 0):
        print("Console : " + data1)
    consoleLog += data
    consoleLog += "\n"
    return True


def validIP(address):
    parts = address.split(".")
    if len(parts) != 4:
        return False
    for item in parts:
        if not 0 <= int(item) <= 255:
            return False
    return True


def connectGateway(username, ipaddress):
    global gw, channel
    print ('runrules: connectGateway: opening gateway to ' + ipaddress)
    try:
        # ASG
        # Establish the ssh connection with the target VM along with sudo privileges for non-root user,
        # by doing this we dont need to make the changes for those commands who needed a sudo privileges to run on target VM.
        sshport = getsshport(username, ipaddress)

        username, ip = ipaddress.split('@')
        if "root" in username:
            gw = execnet.makegateway(
                "ssh=" + ipaddress + " -p " +  str(sshport) + " -o ServerAliveInterval=30 -o StrictHostKeyChecking=no -o PasswordAuthentication=no -A")
        else:
            gw = execnet.makegateway(
                "ssh=" + ipaddress + " -p " +  str(sshport) + " -o ServerAliveInterval=30 -o StrictHostKeyChecking=no -o PasswordAuthentication=no -A sudo")

        print("runrules: gw = " + str(gw))
    except Exception as e:
        print("runrules: connectGateway: Unable to open ssh gateway to target: " + ipaddress)
        print("runrules: connectGateway: Exception => " + str(e.args))
        return None

    # Now gw is a valid gateway
    print('runrules: connectGateway: sending channel code')

    try:
        channel = gw.remote_exec("""
# This is the stub program sent to the target machine
username = '""" + username + """' """ + inspect.getsource(commonstub) + inspect.getsource(initgatewaycode) ) 
    except Exception as e:
        print("Error creating gateway" + str(e))
        channel = None

    print("runrules: Channel = ", str(channel))
    return channel


def dismiss(ipaddress, rule, autoremediate="0", profilename="DemonstrationProfile", hopperip=None):
    global consoleLog
    try:
        keyValueStore = redis.Redis("localhost")
        codeversion = keyValueStore.get("codeversion")
        prevConsoleLog = ""
        dump = keyValueStore.lrange(ipaddress, 0, -1)
        for item in dump:
            if rule in item:
                selected_rule_dict = json.loads(item)
                if selected_rule_dict.has_key('console'):
                    prevConsoleLog = selected_rule_dict['console']
                    keyValueStore.lrem(ipaddress, item)
                    break

        prevConsoleLog = prevConsoleLog.replace("=================================================",
                                                "\n------ Marking rule as successful ------\n")

        addConsole("\nRule : " + rule + " manually marked as sucessful\n")
        addConsole("=================================================\n")
        rulestatus = {}
        rulestatus['rule'] = rule
        rulestatus['status'] = "COMPLETE"
        rulestatus['outcome'] = "manually marked as successful"
        rulestatus['console'] = prevConsoleLog + consoleLog
        rulestatus['profile'] = profilename
        rulestatus['exemode'] = autoremediate
        rulestatus['severity'] = loadrules.getSeverity(rule[2:])
        rulestatus['codeversion'] = codeversion

        keyValueStore.rpush(ipaddress, json.dumps(rulestatus))
        return 1
    except Exception as e:
        print ("runrules: Dismiss: Exception " + str(e.args))
        return 99


def fixRule(username, ipaddress="192.168.122.16", rule='V-38443', autoremediate="0", profilename="DemonstrationProfile",
            hopperip=None):
    global consoleLog
    try:
        keyValueStore = redis.Redis("localhost")
        codeversion = keyValueStore.get('codeversion')

        channel = connectGateway(username, ipaddress)
        if channel is None:
            return 98

        prevConsoleLog = ""
        dump = keyValueStore.lrange(ipaddress, 0, -1)
        for item in dump:
            if rule in item:
                selected_rule_dict = json.loads(item)
                if selected_rule_dict.has_key('console'):
                    prevConsoleLog = selected_rule_dict['console']
                keyValueStore.lrem(ipaddress, item)
                break

        prevConsoleLog = prevConsoleLog.replace("=================================================",
                                                "\n------ Remediating the failed security rule ------\n")

        i = 'fixRule' + rule[2:]

        rulestatus = {}
        rulestatus['rule'] = rule
        # Changed to aborted since user might abort the execution in between.
        rulestatus['status'] = "ABORTED"
        rulestatus['outcome'] = "UNKNOWN"
        rulestatus['console'] = consoleLog
        rulestatus['profile'] = profilename
        rulestatus['exemode'] = autoremediate
        rulestatus['severity'] = loadrules.getSeverity(rule[2:])
        rulestatus['codeversion'] = codeversion
        consoleLog = ""

        try:
            outchan = channel.receive()  # get stdout piped back
            outchan.setcallback(lambda data: addConsole(data))
        except EOFError as connection_lost:
            rulestatus['status'] = "ABORTED BY RAXAK PROTECT"
            rulestatus['console'] = "Aborted due to connection to target machine lost."
            keyValueStore.rpush(ipaddress, json.dumps(rulestatus))
            return 98

        keyValueStore.rpush(ipaddress, json.dumps(rulestatus))

        funcs = {}
        funcsdict = {}
        funcp = pickle.dumps(inspect.getsource(getattr(ruleset, i)))
        funcs[0] = 'X'
        funcs[1] = i
        funcs[2] = funcp

        try:
            jar = pickle.dumps(funcs)
            channel.send(jar)
            retval = channel.receive()
        except EOFError as connection_lost:
            rulestatus['status'] = "ABORTED BY RAXAK PROTECT"
            rulestatus['console'] = "Aborted due to connection to target machine lost."
            keyValueStore.rpush(ipaddress, json.dumps(rulestatus))
            return 98

        '''keyValueStore.rpush(ipaddress, json.dumps(rulestatus))

        i = 'checkRule'+rule[2:]

        rulestatus = {}
        rulestatus['rule'] = i
        rulestatus['status'] = "STARTED"
        rulestatus['outcome'] = "UNKNOWN"
        rulestatus['console'] = consoleLog
        rulestatus['profile'] = profilename
        rulestatus['exemode'] = autoremediate
            rulestatus['severity'] = loadrules.getSeverity(i[2:])
        rulestatus['codeversion'] = codeversion
        consoleLog = ""

        keyValueStore.rpush(ipaddress, json.dumps(rulestatus))
        '''
        i = 'checkRule' + rule[2:]

        addConsole("Re-verifying remediation status of Rule:\n")

        funcs = {}
        funcsdict = {}
        funcp = pickle.dumps(inspect.getsource(getattr(ruleset, i)))
        funcs[0] = 'X'
        funcs[1] = i
        funcs[2] = funcp

        try:
            jar = pickle.dumps(funcs)
            channel.send(jar)
            retval = channel.receive()
        except EOFError as connection_lost:
            rulestatus['status'] = "ABORTED BY RAXAK PROTECT"
            rulestatus['console'] = "Aborted due to connection to target machine lost."
            keyValueStore.rpush(ipaddress, json.dumps(rulestatus))
            return 98

        keyValueStore.rpop(ipaddress)

        rulestatus['status'] = "COMPLETE"
        if retval is None:
            rulestatus['outcome'] = "needs manual intervention"
            retval = 2
            addConsole("Rule: " + i + " needs manual intervention\n")
        elif retval:
            rulestatus['outcome'] = "successfully remediated"
            addConsole("Rule: " + i + " Successfully remediated\n")
        else:
            rulestatus['outcome'] = "needs manual intervention (remediation failed)"
            retval = 2
            addConsole("Rule: " + i + " needs manual intervention (remediation failed)\n")

        addConsole("=================================================\n")
        if isinstance(prevConsoleLog, unicode):
            prevConsoleLog = prevConsoleLog.encode('ascii', 'ignore')
            prevConsoleLog = str(prevConsoleLog)
        rulestatus['console'] = prevConsoleLog + consoleLog

        utf8Str = ""
        for ruleData in rulestatus:
            if ruleData == "console":
                # Spliiting Console Output
                splitRuleStatus = rulestatus[ruleData].splitlines()
                for ele in splitRuleStatus:
                    # Converting into unicode types, replacing errors, if any
                    ele = unicode(ele, errors='replace')
                    # Checking and converting all unicode types into srings
                    if isinstance(ele, unicode):
                        ele = ele.encode('ascii', 'ignore')
                        ele = str(ele)
                    utf8Str += ele + "\n"
                # Replacing converted utf-8 format sring into normal string
                rulestatus[ruleData] = utf8Str

        keyValueStore.rpush(ipaddress, json.dumps(rulestatus))
        return retval
    except Exception as e:
        print ("runrules: fixRule: Exception " + str(e.args))
        return 99


def checkRule(username, ipaddress, rule='V-38443', autoremediate="0", profilename="DemonstrationProfile", hopperip=None):
    global consoleLog
    try:
        keyValueStore = redis.Redis("localhost")
        codeversion = keyValueStore.get("codeversion")

        channel = connectGateway(username, ipaddress)
        # get back the channel for the remote machine

        if channel is None:
            return 98

        prevConsoleLog = ""
        dump = keyValueStore.lrange(ipaddress, 0, -1)
        for item in dump:
            if rule in item:
                selected_rule_dict = json.loads(item)
                if selected_rule_dict.has_key('console'):
                    prevConsoleLog = selected_rule_dict['console']
                keyValueStore.lrem(ipaddress, item)
                break

        prevConsoleLog = prevConsoleLog.replace("=================================================",
                                                "\n------ Re-checking the failed security rule ------\n")

        i = 'checkRule' + rule[2:]

        rulestatus = {}
        rulestatus['rule'] = rule
        rulestatus['status'] = "ABORTED"
        rulestatus['outcome'] = "UNKNOWN"
        rulestatus['console'] = consoleLog
        rulestatus['profile'] = profilename
        rulestatus['exemode'] = autoremediate
        rulestatus['severity'] = loadrules.getSeverity(rule[2:])
        rulestatus['codeversion'] = codeversion
        consoleLog = ""
        
        try:
            outchan = channel.receive()  # get stdout piped back
            outchan.setcallback(lambda data: addConsole(data))
        except EOFError as connection_lost:
            rulestatus['status'] = "ABORTED BY RAXAK PROTECT"
            rulestatus['console'] = "Aborted due to connection to target machine lost."
            keyValueStore.rpush(ipaddress, json.dumps(rulestatus))
            return 98

        keyValueStore.rpush(ipaddress, json.dumps(rulestatus))

        funcs = {}
        funcsdict = {}
        funcp = pickle.dumps(inspect.getsource(getattr(ruleset, i)))
        funcs[0] = 'X'
        funcs[1] = i
        funcs[2] = funcp

        try:
            jar = pickle.dumps(funcs)
            channel.send(jar)
            retval = channel.receive()
        except EOFError as connection_lost:
            rulestatus['status'] = "ABORTED BY RAXAK PROTECT"
            rulestatus['console'] = "Aborted due to connection to target machine lost."
            keyValueStore.rpush(ipaddress, json.dumps(rulestatus))
            return 98

        # put retval into database for future use.
        keyValueStore.rpop(ipaddress)

        rulestatus['status'] = "COMPLETE"
        if retval is None:
            rulestatus['outcome'] = "needs manual intervention"
            retval = 2
            addConsole("Rule: " + rule + " needs manual intervention\n")
        elif retval == 3:  # for manual (N/A)
            rulestatus['outcome'] = "needs manual intervention (N/A)"
            retval = 2  # for manual
            addConsole("Rule: " + rule + " needs manual intervention (N/A)\n")
        elif retval:
            retval = 1
            rulestatus['outcome'] = "successful"
            addConsole("Rule: " + rule + " Successful\n")
        else:
            retval = 0
            rulestatus['outcome'] = "failed"
            addConsole("Rule: " + rule + " failed\n")

        addConsole("=================================================\n")
        if isinstance(prevConsoleLog, unicode):
            prevConsoleLog = prevConsoleLog.encode('ascii', 'ignore')
            prevConsoleLog = str(prevConsoleLog)
        rulestatus['console'] = prevConsoleLog + consoleLog

        utf8Str = ""
        for ruleData in rulestatus:
            if ruleData == "console":
                # Spliiting Console Output
                splitRuleStatus = rulestatus[ruleData].splitlines()
                for ele in splitRuleStatus:
                    # Converting into unicode types, replacing errors, if any
                    ele = unicode(ele, errors='replace')
                    # Checking and converting all unicode types into srings
                    if isinstance(ele, unicode):
                        ele = ele.encode('ascii', 'ignore')
                        ele = str(ele)
                    utf8Str += ele + "\n"
                # Replacing converted utf-8 format sring into normal string
                rulestatus[ruleData] = utf8Str

        keyValueStore.rpush(ipaddress, json.dumps(rulestatus))
        return retval
    except Exception as e:
        print ("runrules: checkRule : Exception " + str(e.args))
        return 99


def remediateRule(ipaddress, rule, channel=None, hopperip=None):
    try:
        if not channel:
            return -1

        i = 'fixRule' + rule

        funcs = {}
        funcsdict = {}
        funcp = pickle.dumps(inspect.getsource(getattr(ruleset, i)))
        funcs[0] = 'X'
        funcs[1] = i
        funcs[2] = funcp

        jar = pickle.dumps(funcs)
        channel.send(jar)
        retval = channel.receive()
        print ("runrules: remediateRule: retval = " + str(retval))

        addConsole("Reverifying remediation status of Rule:\n")

        i = 'checkRule' + rule

        funcs = {}
        funcsdict = {}
        funcp = pickle.dumps(inspect.getsource(getattr(ruleset, i)))
        funcs[0] = 'X'
        funcs[1] = i
        funcs[2] = funcp

        jar = pickle.dumps(funcs)
        channel.send(jar)
        retval = channel.receive()

        return retval
    except Exception as e:
        print ("runrules: remediateRule: Exception " + str(e.args))
        return 98


def runProfile(ipaddress="192.168.122.16", profile="Demonstration Profile", autoremediate="1", hopperip=None):
    loadrules.load()

    if profile not in loadrules.profiles:
        print ("runrules: runProfile: Unknown profile " + profile + " specified")
        print ("Allowable Profiles: ")
        for i in loadrules.profiles:
            print (i)
        return

    rulelist = loadrules.profiles[profile]

    runRules(username, ipaddress, ' '.join(rulelist), autoremediate, hopperip)

    return


def runRules(username, ipaddress="192.168.122.17", rules=
['V-38443', 'V-38488', 'V-38477', 'V-38455'], autoremediate="0",
             profilename="DemonstrationProfile", hopperip=None):
    print("runrules: runRules: starting run" + rules)
    global consoleLog, gw
    machine_reachable = True
    # for this version, we are assuming hopperip = None and not doing any hopping
    # Open an execnet link to the target ip
    # ipaddress = "130.211.112.245" # cloud raxak GCE ubuntu
    # ipaddress = "130.211.122.121" # cloud raxak GCE centOS
    # ipaddress = "192.168.122.17" # Local centos
    # ipaddress = "146.148.89.19" # cloud raxak GCE rhel-6

    # Connect to the redis database
    keyValueStore = redis.Redis("localhost")
    # Archive the logs details of associated IP address
    archieveLogs(username, ipaddress)
    status = "Rules execution is in progress (" + str(os.getpid()) + ")..."
    keyValueStore.set(ipaddress + "status", status)
    codeversion = keyValueStore.get("codeversion")

    channel = None #Default channel value is None only gets initialized when VM access status is ALL OK.
    status_list = checkAccess(username, [ipaddress])
    if status_list[0].has_key('access'):
        access_value = status_list[0]['access']
        if access_value > 0 :
            channel = connectGateway(username, ipaddress)

    # Added check to fix the issue git #80.
    if channel == None:
        keyValueStore.set(ipaddress + "status", "Rules execution is in progress...")
        # Adding the inaccessible message to console.
        if status_list[0].has_key('access'):
            access_value = status_list[0]['access']
            if access_value == '-1':
                msg = "OS not supported"
            elif access_value == '-2':
                msg = "Unable to reach IP address"
            elif access_value == '-3':
                msg = "Unable to log in with specified userid (ssh login fails)"
            # elif access_value == '-4':
            #	msg = "Insufficient execution privilege"
            # elif access_value == '-5':
            #	msg = "Access check in progress"
        rulestatus = {}
        rulestatus['rule'] = ""
        rulestatus['status'] = "COMPLETE"
        rulestatus['outcome'] = "INACCESSIBLE"
        rulestatus['console'] = msg
        rulestatus['profile'] = profilename
        rulestatus['exemode'] = autoremediate
        rulestatus['severity'] = ""
        rulestatus['codeversion'] = codeversion

        keyValueStore.rpush(ipaddress, json.dumps(rulestatus))
        utc = datetime.utcnow()
        utc_time = datetime.strftime(utc, '%a %b %d %H:%M:%S %Y')
        keyValueStore.set(ipaddress + "status", "Rules execution completed on : " + utc_time)
        return
    else:
        # Get back the channel for the remote machine
        outchan = channel.receive()  # get stdout piped back
        print ("runrules: runRules: outchan = " + str(outchan))
        # outchan.setcallback (lambda data: sys.stdout.write("\n> " + str(data)))
        outchan.setcallback(lambda data: addConsole(data))
        print('runrules: runRules: received print channel and created lambda')

        rule_list = rules.split(' ')

        if not rule_list:
            return -1

        for ii in rule_list:

            if not channel:
                return -1

            i = 'checkRule' + ii[2:]

            print ("runrules: runRules: " + i)

            rulestatus = {}
            rulestatus['rule'] = ii
            rulestatus['status'] = "ABORTED"
            rulestatus['outcome'] = "UNKNOWN"
            rulestatus['console'] = consoleLog
            consoleLog = ""
            rulestatus['profile'] = profilename
            rulestatus['exemode'] = autoremediate
            rulestatus['severity'] = loadrules.getSeverity(ii[2:])
            rulestatus['codeversion'] = codeversion

            print("runrules: runRules: pushing rulestatus")
            keyValueStore.rpush(ipaddress, json.dumps(rulestatus))

            funcs = {}
            funcsdict = {}
            funcp = pickle.dumps(inspect.getsource(getattr(ruleset, i)))
            funcs[0] = 'X'
            funcs[1] = i
            funcs[2] = funcp

            jar = pickle.dumps(funcs)
            if not channel:
                continue

            try:
                channel.send(jar)
            except Exception as e:
                print ("runrules: runRules: error sending jar, caught " + str(e.args))
                print ("runrules: runRules: gatway value is " + str(gw))
                return

            try:
                retval = channel.receive()
            except EOFError as connection_lost:
                rulestatus['status'] = "ABORTED BY RAXAK PROTECT"
                rulestatus['console'] = "Aborted due to connection to target machine lost."
                keyValueStore.rpush(ipaddress, json.dumps(rulestatus))
                machine_reachable = False
                break
                

            # put retval into database for future use.

            keyValueStore.rpop(ipaddress)

            if retval is None:
                rulestatus['outcome'] = "needs manual intervention"
                addConsole("Rule: " + ii + " needs manual intervention\n")
            elif retval == 3:  # for manual (N/A)
                rulestatus['outcome'] = "needs manual intervention (N/A)"
                addConsole("Rule: " + ii + " needs manual intervention (N/A)\n")
            elif retval:
                rulestatus['outcome'] = "successful"
                addConsole("Rule: " + ii + " successful\n")
            else:
                if int(autoremediate):
                    addConsole("Rule failed, remediating rule automatically:\n")
                    retval = remediateRule(ipaddress, ii[2:], channel)
                    if retval is None:
                        rulestatus['outcome'] = "needs manual intervention"
                        retval = 2
                        addConsole("Rule: " + ii + " needs manual intervention\n")
                    elif retval:
                        rulestatus['outcome'] = "successfully remediated"
                        addConsole("Rule: " + ii + " Successfully remediated\n")
                    else:
                        rulestatus['outcome'] = "needs manual intervention (remediation failed)"
                        retval = 2
                        addConsole("Rule: " + ii + " needs manual intervention (remediation failed)\n")
                else:
                    rulestatus['outcome'] = "failed"
                    addConsole("Rule: " + ii + " failed")

            rulestatus['status'] = "COMPLETE"
            addConsole("\n=================================================\n")
            rulestatus['console'] = consoleLog

            utf8Str = ""
            for ruleData in rulestatus:
                if ruleData == "console":
                    # Spliiting Console Output
                    splitRuleStatus = rulestatus[ruleData].splitlines()
                    for ele in splitRuleStatus:
                        # Converting into unicode types, replacing errors, if any
                        ele = unicode(ele, errors='replace')
                        # Checking and converting all unicode types into srings
                        if isinstance(ele, unicode):
                            ele = ele.encode('ascii', 'ignore')
                            ele = str(ele)
                        utf8Str += ele + "\n"

                    # Replacing converted utf-8 format sring into normal string
                    rulestatus[ruleData] = utf8Str

            keyValueStore.rpush(ipaddress, json.dumps(rulestatus))

        utc = datetime.utcnow()
        utc_time = datetime.strftime(utc, '%a %b %d %H:%M:%S %Y')
        if machine_reachable:
            keyValueStore.set(ipaddress + "status", "Rules execution completed on : " + utc_time)
        elif machine_reachable == False:
            keyValueStore.set(ipaddress + "status", "Rules execution aborted by rp on : " + utc_time)
        gw.exit()
        return retval


# Archieve the logs stored in the database to the logs files
def archieveLogs(username, ipaddress):
    rs = redis.Redis()
    dump = rs.lrange(ipaddress, 0, -1)
    if dump:
        timestamp = []
        dt_obj1 = ""
        if rs.exists(ipaddress + "status"):
            status = rs.get(ipaddress + "status")
            if str("Rules execution completed on :") in str(status):
                timestamp = status.split("Rules execution completed on : ")
            else:
                timestamp = status.split("Rules execution aborted on : ")
            if len(timestamp) == 2:
                dt_obj = datetime.strptime(timestamp[1], '%a %b %d %H:%M:%S %Y')
                dt_obj1 = datetime.strftime(dt_obj, '%Y%m%d%H%M%S')
            else:
                dt_obj1 = time.strftime('%Y%m%d%H%M%S')
        else:
            dt_obj1 = time.strftime('%Y%m%d%H%M%S')

        directory = "/var/log/cloudRaxak/" + username + "/"

        if not os.path.exists(directory):
            os.makedirs(directory)

        filename = directory + ipaddress + "-" + dt_obj1 + ".txt"
        with open(filename, 'w') as outfile:
            json.dump(dump, outfile)

    # Delete the previous execution logs from the redis
    rs.delete(ipaddress)


if __name__ == '__main__':
    # parse commandline parameters

    if len(sys.argv) < 2:
        sys.exit(1)

    option = sys.argv[1]
    if option == "-a":
        if len(sys.argv) < 7 or len(sys.argv) > 8:
            print(
                "Usage: python runrules.py -a <username> <ip-address> <rule-list> <autoremediate> <profilename> <frequency>{<hopper-ip>}")
            sys.exit(1)
        else:
            # runRules( ipaddress, rule_list, hopperip ):
            ipaddress = sys.argv[3]

            # Check compliance execution status, if already in progress then skip the execution
            rs = redis.Redis()
            status = rs.get(ipaddress + "status")
            if status is not None:
                # Skip the execution if compliance execution is already in progress
                if 'in progress' in status:
                    print "Skip the execution since compliance execution is already in progress"
                    sys.exit(0)

                    # TODO ASG - if due to some reason if compliance execution couldn't able to finish it for particular IP
                    # And if user has again would like to perform compliance execution on same IP then it won't allow user to do it
                    # Solution: Add the timestamp in the status key itself to trace down the started time.
                    # And with the help of the timestamp we can allow user to re-execute in such case.

            username = sys.argv[2]
            print "username = ", username

            #create a link to the IP address with a tunnel if needed
            if not VPNtunnel.openLink( ipaddress ):
                sys.exit( 1 )
            print("returned from VPNtunnel check ")

            # Check the access code of the username@IP
            recheckAccessCounter = 3
            delay = 30
            while recheckAccessCounter:
                accessCheckInProgress = False
                ips = rs.lrange(username, 0, -1)
                for ip_list in ips:
                    ip_list_dict = json.loads(ip_list)
                    if str(ip_list_dict['ip']) == str(ipaddress):
                        if int(ip_list_dict['access']) < 0:
                            if str(ip_list_dict['access']) == "-5":
                                # If access check in progress then wait for 30sec
                                # then recheck the access value.
                                time.sleep(delay)
                                recheckAccessCounter = recheckAccessCounter - 1
                                accessCheckInProgress = True
                            else:
                                # if access value is -ve and not -5 then do not continue and exit
                                print "Access code of '" + ipaddress + "' is not OK(" \
                                      + str(ip_list_dict['access']) + "), hence skipping the compliance execution."
                                VPNtunnel.closeLink( username + "@" + ipaddress)
                                sys.exit(0)

                if accessCheckInProgress:
                    if recheckAccessCounter:
                        # if re-check counter is more than 0 then continue and re-check the access code
                        continue
                    else:
                        print "Access check of '" + ipaddress + "' still in progress, hence skipping compliance execution"
                        VPNtunnel.closeLink( username + "@" + ipaddress)
                        sys.exit(0)
                else:
                    break

            print("runrules: " + sys.argv[1] + " " + sys.argv[3])
            rule_list = sys.argv[4]
            autoremediate = sys.argv[5]
            profilename = sys.argv[6]
            frequency = sys.argv[7]

            print("runrules: ready to call runRules -a")
            if runRules(username, ipaddress, rule_list, autoremediate, profilename):
                VPNtunnel.closeLink( username + "@" + ipaddress)
                sys.exit(0)
            else:
                VPNtunnel.closeLink( username + "@" + ipaddress)
                sys.exit(1)
    elif option == "-c":
        if len(sys.argv) < 6 or len(sys.argv) > 7:
            print("Usage: python runrules.py -c <username> <ip-address> <rulenumber> <autoremediate> <profilename>  {<hopper-ip>}")
            sys.exit(1)
        else:
            # THE ipaddress HERE SHOULD BE OF THE FORM username@ipaddress
            username = sys.argv[2]
            ipaddress = sys.argv[3]
            autoremediate = sys.argv[5]
            profilename = sys.argv[6]
            if not VPNtunnel.openLink( ipaddress ):
                sys.exit(1)
            print("runrules: " + sys.argv[2] + " " + sys.argv[3])
            rule = sys.argv[4]
            rc = checkRule(username, ipaddress, rule, autoremediate, profilename)
            VPNtunnel.closeLink( ipaddress )
            sys.exit(rc)
    elif option == "-f":
        if len(sys.argv) < 6 or len(sys.argv) > 7:
            print("Usage: python runrules.py -f <username> <ip-address> <rulenumber> <autoremediate> <profilename>  {<hopper-ip>}")
            sys.exit(1)
        else:
            # THE ipaddress HERE SHOULD BE OF THE FORM username@ipaddress
            username = sys.argv[2]
            ipaddress = sys.argv[3]
            autoremediate = sys.argv[5]
            profilename = sys.argv[6]
            if not VPNtunnel.openLink( ipaddress ):
                sys.exit(1)
            print("runrules: " + sys.argv[2] + " " + sys.argv[3])
            rule = sys.argv[4]
            rc = fixRule(username, ipaddress, rule, autoremediate, profilename)
            VPNtunnel.closeLink( ipaddress )
            sys.exit(rc)
    elif option == "-d":
        if len(sys.argv) < 5 or len(sys.argv) > 6:
            print("Usage: python runrules.py -d <ip-address> <rulenumber> <autoremediate> <profilename>  {<hopper-ip>}")
            sys.exit(1)
        else:
            ipaddress = sys.argv[2]
            autoremediate = sys.argv[4]
            profilename = sys.argv[5]
            print("runrules: " + sys.argv[1] + " " + sys.argv[2])
            rule = sys.argv[3]
            rc = dismiss(ipaddress, rule, autoremediate, profilename)
            sys.exit(rc)
    else:
        print("Invalid options entered")
        sys.exit(1)

    ###TODO Ashish - Please ignore below code - needs to be moved/cleaned
    if len(sys.argv) == 5:
        hopperip = sys.argv[i4]
        if not validIP(hopperip):
            print("IP address specified for hopper is invalid")
    else:
        hopperip = None

#---end of file
