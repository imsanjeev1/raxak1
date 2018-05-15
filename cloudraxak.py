# cloudraxak.py
#
#	(c) 2014, Cloud Raxak Inc. All Rights Reserved
#
#	This module consists of multiple utility functions related to the decentralized
#	architecture. It is expected that many of these will be called by the applications
#	entrypoint in wsgi.py
#
#
#	PGM	10/20/2014	Created
#	ASG	10/30/2014	New API changes
#	ASG 	12/04/2014	getExecutionStatus: API changes
#	ASG	12/22/2014	API changes - Archive the previous rule execution's log details inside cloudraxak log folder
#				Function added to do the required setting during startup
#				API added to get/set OSname for target VMs
#	ASG	12/24/2014	API changes to retrieve the detailed rules execution log details from the archive log file
#				API changes to retrieve the list of archive list of log files of given username,IP
#	ASG	12/30/2014	API changes to retrieve the list of supported DISA OS Name.
#

import sys, ast, inspect, types, time
import execnet
import pickle
import redis
import time, datetime
import json
import subprocess, os
import glob
import ldap
import getpass
import os
import signal
from crontab import CronTab
import traceback
from croniter import croniter
import logging
import ast
from collections import defaultdict
import re
import platform
import socket
import VPNtunnel	# to use VPN tunnels for access to machines
import calendar
import datetime
import time
import loadrules  # to load the mapping between profiles and rules
import email.message
import smtplib
import hashlib
import commands

logging.basicConfig(filename="raxak-logging.log", level=logging.INFO)

previouscodeversion = "Release-1.9/9ed40d4"  # If code version is not there into redis database for specific execution run

totalRules = 0
global userName
ldapServer = "ldap://130.211.144.211"
csaServer = "130.211.144.211"

# TODO - ASG - need to optimize this function
# clenaup the execution status based on inactiveness
def cleanInProgressStatus():
    # Cleanup all the unfinished execution status keys from database during initialization
    rs = redis.Redis()
    keys = rs.keys("*status")
    for key in keys:
        if "in progress" in str(rs.get(key)):
            rs.delete(key)
    return

#ASG
#Merge all existing last run keys values to new key structure
def merginglastruninfo_old_new_key_structure():
    print "Merging lastruninfo from old to new key structure"
    rs = redis.Redis()
    keys = rs.keys()

    for key in keys:
        if "lastrunips" in key:
            try:
                if type(rs.get(key)) is str:
                    ips = json.loads(rs.get(key))
                    rs.delete(key)
                    username = key[0:int(key.find("lastrunips"))]
                    for ip in ips:
                        lastrundata = {}
                        lastrundata["ip"] = ip
                        lastrundata["nickname"] = getNickname(username, ip)
                        lastrundata["lastrun"] = 1
                        rs.rpush(key, json.dumps(lastrundata))
            except Exception as e:
                continue


# ASG
# Do the required setting during service startup
# Add more changes here inside this function thats needs to be called during service startup
def check_decimal(x):
    split_value = x[:7]
    find_decimal = split_value[:split_value.find('.')]
    if int(find_decimal) < 10:
        upto_2_digit = x[2:]
        split_val = str(upto_2_digit).split()
        get_value = split_val[0][0:2]
    else:
        upto_2_digit = x[3:]
        split_val = str(upto_2_digit).split()
        get_value = split_val[0][0:2]
    if get_value >= '50':
        actual_value = int(find_decimal) + 1
    else:
        actual_value = find_decimal
    return actual_value


def code_decm(x):
    split_value = x[:7]
    find_decimal = split_value[:split_value.find('.')]
    if int(find_decimal) < 10:
        get_after_dec = x[2:]
        split_val = str(get_after_dec).split()
        get_value = split_val[0][0:4]
    else:
        get_after_dec = x[3:]
        split_val = str(get_after_dec).split()
        get_value = split_val[0][0:4]
    return get_value


def initialization():
    loadrules.load()  # load profile definitions
    # cleanInProgressStatus()	# Cleanup all the unfinished execution status keys from database

initialization()  # do the required settings


def getProfilesList():
    return loadrules.profileDescription


def profileDetails():
    print "cloudraxak: Inside profileDetails"
    return loadrules.profileDetails


def encryptionKey(key):
    # checks if there is an encryption key in the redis databse. If yes, it returns it.
    # otherwise it inserts provided key in the database and returns that instead.
    rs = redis.Redis()
    ek = rs.get("encryptionKey")
    if ek is None:
        rs.set("encryptionKey", key)
        return key
    else:
        return ek


def setOfferCode(email, formdata, code):
    # records the details of any six month free offer code in redis for future use

    print("cloudraxak: setOfferCode: " + email + ">" + code)
    rs = redis.Redis()
    try:
        precode = rs.get(email)
    except Exception as e:
        print("Redis exception " + str(e))
        precode = None

    if precode is None or precode is "Expired":
        # user is not preregistered
        rs.set(email, "Code:" + code)
        rs.set(email + ":code", code)
        rs.set(email + ":form", formdata)
    else:
        print("Code already exists for email - " + str(precode) + " OVERWRITING")
        rs.set(email, "Code:" + code)
        rs.set(email + ":code", code)
        rs.set(email + ":form", formdata)

    return

def storeaccount( account, cookie):
	print ("cloudraxak: storeaccount "+ account +" -> "+ cookie)
	rs = redis.Redis()
	rs.set(account, cookie)
	return

def getaccount (account):
	print ("cloudraxak: getaccount -" + account + "-")
	rs = redis.Redis()
	tok = rs.get(account.strip())
	print("->" + str(tok))
	return tok

#	send user registration mail


def enroll(userid, userinfo):
    # enroll user information about user identified as userid (string). User information is a dict.
    # if userid exists, it is overwritten
    # PGM: This code needs to be restructured. As it stands now, if the user is active, the check
    #	for expired offer is never made.
    #	first check for expiration, etc. and then pull up the rest of the info.
    print("cloudraxak: enroll: " + userid + ":" + str(userinfo))
    rs = redis.Redis()
    try:
        userinfojson = rs.get(userid + ":info")
    except Exception as e:
        print("Redis exception " + str(e))
        userinfojson = None
    if userinfojson is None:
        # check if user's email is preauthorized
        try:
            useremail = rs.get(userinfo['email'])
        except Exception as e:
            print("Redis exception (email) " + str(e))
            useremail = None

        if useremail is None:
            if userid is 'GTestUser' or 'CSA' in str(userinfo['login']) or '@ibm.com' in str(userinfo['email']) \
                or 'IBM' in str(userinfo['login']):
                # it is ok, the user is authorized
                print ('cloudraxak: enrolling ' + userid + " : " + str(json.dumps(userinfo)))
            else:
                found = False
                dump = rs.lrange('UserInfo', 0, -1)
                for record in dump:
                   record_dic = ast.literal_eval(record)
                   print str(record_dic)
                   if (str(userinfo['email']) == str(record_dic['email'])):
                       # it is ok, the user is authorized
                       print ('cloudraxak: enrolling ' + userid + " : " + str(json.dumps(userinfo)))
                       found = True
                       break

                if not found:
                    print ('cloudraxak: enroll: Email ' + userinfo['email'] + ' not preregistered')
                    return 'Register'
        elif 'Code:' in useremail:
            # return the code that the user must enter
            return useremail

        elif useremail is 'Allowed':
            pass

        elif useremail is 'Expired':
            return 'Expired'

        else:
            # Check if useremail is a date stamp which is later than today
            print ('cloudraxak: enroll: timestamp? ' + useremail)
            today = datetime.datetime.now()
            try:
                stamp = datetime.datetime.strptime(useremail, '%m/%d/%Y')
            except Exception as e:
                print ("Time conversion exception: " + str(e))
                stamp = datetime.datetime.now()

            if stamp < today:
                rs.set(userinfo['email'], 'Expired')
                return 'Expired'

    else:
        print("cloudraxak: enroll: Overwriting " + userid + " with " + str(json.dumps(userinfo)))
        if 'datetime' not in userinfo:
            userinfo['datetime'] = None

    # rs.set(userinfo['email'], userid)               # Note that the same email can apply to multiple userids. Only the last one will be here
    try:
        rs.set(userinfo['email'] + ':userid', userid)
        rs.set(userid + ":info", json.dumps(userinfo))
        rs.lpush(userid + ":time", time.asctime(time.gmtime()) + " UTC")
        rs.ltrim(userid + ":time", 0, 9)
    except:
        print ("Error in setting last login")
        print (traceback.format_exc())

    try:
        updateLastLoggedIn(userinfo["email"], userinfo["datetime"])
    except Exception as e:
        print ("Unable to updateLastLoggedIn")
        print(traceback.format_exc())
        pass

    #Skip tracking login history for GTestuser
    try:
        if userinfo['email'] != "GTestUser@cloudraxak.com":
            rs.rpush(userinfo['email']+':loginHistory', json.dumps(getLoginDetails(userinfo)))
            rs.ltrim(userinfo['email']+':loginHistory', -10, -1)
    except:
        print("Unable to track login history")
        print(traceback.format_exc())
    print ("cloudraxak: enroll: Returning OK")
    return 'OK'

def getLoginDetails(loginDetails):
    details = {}
    details['email'] = loginDetails['email']
    details['platform'] = loginDetails['platform'] if 'platform' in loginDetails else 'None'
    details['browser'] = loginDetails['browser'] if 'browser' in loginDetails else 'None'
    details['timezone'] = loginDetails['timezone'] if 'timezone' in loginDetails else 'None'
    details['datetime'] = loginDetails['datetime'] if 'datetime' in loginDetails else 'None'

    return details

def updateLastLoggedIn(email, lasttime):
    red = redis.Redis()
    users = red.lrange("UserInfo", 0, -1)
    updatedata = {}
    if len(users) > 0:
        for user in users:
            userinfo = json.loads(user) 
            if (str(userinfo['email']) == str(email)):
                updatedata['firstname'] = userinfo['firstname']
                updatedata['lastname'] = userinfo['lastname']
                updatedata['email'] = userinfo['email']
                updatedata['phone'] = userinfo['phone']
                updatedata['company'] = userinfo['company']
                updatedata['country'] = userinfo['country']
                updatedata['activation'] = userinfo['activation']
                updatedata['blocked'] = userinfo['blocked']
                updatedata['admin'] = userinfo['admin']
                updatedata['period'] = userinfo['period']
                updatedata['password'] = userinfo['password']
                updatedata['hash'] = str(userinfo['hash'])
                updatedata['date'] = str(userinfo['date'])
                updatedata['lastlogin'] = lasttime 
                red.lrem('UserInfo', user)
                red.rpush('UserInfo', json.dumps(updatedata))
                break
    
def activateUser(email, months):
    #	months = 0 => activate forever
    #	months > 0 => activate for duration
    #	months < 0 => deactivate
    print ('cloudraxak: activateUser: ' + email + ' : ' + str(months))
    rs = redis.Redis()
    code = rs.get( email )
    if code is None:
        print ('No code set: ignoring')
    if months == 0:
        rs.set(email, 'Allowed')
    elif months < 0:
        rs.set(email, 'Expired')
    else:
        try:
            then = datetime.datetime.now() + datetime.timedelta(weeks=months*4)
            print("Setting expiration date to " + then.strftime('%m/%d/%Y'))
            rs.set(email, then.strftime('%m/%d/%Y'))
        except:
            print(traceback.format_exc())

    return True

def whoIs(userid):
    # returns stored user information or None
    rs = redis.Redis()
    userinfojson = rs.get(userid + ":info")
    if userinfojson is None:
        return None
    else:
        return json.loads(userinfojson)


def getLDAPpwd(userid):
    # NOTE:
    #	this needs to be redone to detect conflicts between LDAP and redis
    #	the user may exist in LDAP but may be deleted from Redis if the redis database reboots
    #	the user may exist in Redis but not in LDAP

    import ldap.modlist as modlist
    rs = redis.Redis()

    l = ldap.initialize(ldapServer)

    ldapinfo = rs.get(userid + ":LDAP")
    if ldapinfo is None:
        # User has not been added to LDAP
        # Add user to LDAP

        # get user details
        userinfo = whoIs(userid)

        dn = 'uid=' + userid + ',ou=CloudRaxak,dc=example,dc=com'
        attrs = {}
        attrs['objectclass'] = ['inetOrgPerson', 'organizationalPerson', 'person']
        attrs['givenName'] = userid
        attrs['userPassword'] = 'raxak123'
        attrs['mail'] = str(userinfo['email'])
        attrs['cn'] = userid
        attrs['sn'] = userid
        attrs['uid'] = userid
        dif = modlist.addModlist(attrs)
        print(str(dif))
        try:
            result, codes = l.add_s(dn, dif)
            print ("getLDAPpwd: inserting into LDAP" + str(attrs) + "=> " + str(result))

            rs.set(userid + ":LDAP", "raxak123")
            return "raxak123"
        except ldap.ALREADY_EXISTS:
            print ("Duplicate entry for " + userid + " -- already in LDAP, we will assume it is OK")
            print ("This can happen if redis database has been reset for any reason")
            rs.set(userid + ":LDAP", "raxak123")
            return "raxak123"
        except Exception as e:
            # if unsuccessful, return None.
            print ("Error: User " + userid + " could not be added to LDAP")
            print ("LDAP exception: " + str(e))
            return None
    else:
        # we should really check here to ensure that ldap actually has the username, password combo
        try:
            ldapSearch = l.search_s('uid=' + userid + ',ou=CloudRaxak,dc=example,dc=com', ldap.SCOPE_SUBTREE, '(cn=*)',
                                    ['cn', 'mail'])
            print ('User found in LDAP ' + str(ldapSearch))
        except Exception as e:
            print ("Failed to find " + userid + " in LDAP")
            print ("LDAP error: " + str(e))
            # So this means that the LDAP does not have the userid, but redis does. So re add it to LDAP
            rs.delete(userid + ":LDAP")
            return getLDAPpwd(userid)

        return ldapinfo


# ASG
# Return a list of supported OS name list
def supportedOSList():
    supportedOSList = []
    all_os_list = (loadrules.all_os_dict).keys()
    for os_list in all_os_list:
        # ASG
        # Add if loop here for newly added DISA rule XML file for perticular DISA OS name
        if "Red Hat Enterprise Linux 6 Security Technical Implementation Guide" in os_list:
            supportedOSList.append("centos")
            supportedOSList.append("amazon linux ami")
            supportedOSList.append("redhat")
        if "Ubuntu Security Technical Implementation Guide" in os_list:
            supportedOSList.append("ubuntu")
            supportedOSList.append("debian")
        elif "APACHE SERVER 2.2 for Unix" in os_list:
            supportedOSList.append("apache")
    return supportedOSList


def getRulesForProfile(profile, osName):
    return loadrules.getRulesForProfile(profile, osName)


def setCustomer(customer, iplist, profile):
    rs = redis.Redis()
    rs.set(customer + ":iplist", json.dumps(iplist))
    rs.set(customer + ":profile", json.dumps(profile))
    return


def getCustomer(customer):
    rs = redis.Redis()
    iplist = json.loads(rs.get(customer + ":iplist"))
    profile = json.loads(rs.get(customer + ":profile"))
    return iplist, profile


def setCustomerItem(customer, itemname, itemvalue):
    rs = redis.Redis()
    rs.set(customer + ":" + itemname, json.dumps(itemvalue))
    return


def getCustomerItem(customer, itemname):
    rs = redis.Redis()
    return json.loads(rs.get(customer + ":" + itemname))


def dismiss(ip, rulenum):
    print "cloudraxak: inside dismiss"
    # Save the execution mode and profile name before removing the data.
    autoremediate = ""
    profilename = ""
    rs = redis.Redis()
    dump = rs.lrange(ip, 0, -1)
    for item in dump:
        if rulenum in item:
            selected_rule_dict = json.loads(item)
            if selected_rule_dict.has_key('profile'):
                profilename = selected_rule_dict['profile']
            if selected_rule_dict.has_key('exemode'):
                autoremediate = selected_rule_dict['exemode']
                # rs.lrem(ip,item)
                # ASG - TODO to cleanup this code and pass only necessary parameters

                # ret = subprocess.Popen("python ./runrules.py -d "+ip+" "+
    # '"' + rulenum + '"', shell=True)
    ret = subprocess.Popen("python ./runrules.py -d " + ip + " " +
                           '"' + rulenum + '" "' + autoremediate + '"' + ' "' + profilename + '"', shell=True)
    output, errors = ret.communicate()
    print [ret.returncode, errors, output]

    return ret.returncode


def checkRule(username, ip, rulenum):
    print "cloudraxak: inside checkRule"
    # Save the execution mode and profile name before removing the data.
    autoremediate = ""
    profilename = ""
    rs = redis.Redis()
    dump = rs.lrange(ip, 0, -1)
    for item in dump:
        if rulenum in item:
            selected_rule_dict = json.loads(item)
            if selected_rule_dict.has_key('profile'):
                profilename = selected_rule_dict['profile']
            if selected_rule_dict.has_key('exemode'):
                autoremediate = selected_rule_dict['exemode']

                # rs.lrem(ip,item)
                # ASG - TODO to cleanup this code and pass only necessary parameters

                # ret = subprocess.Popen("python ./runrules.py -c "+ip+" "+
    # '"' + rulenum + '"', shell=True)
    ret = subprocess.Popen("python ./runrules.py -c " + username + " " + ip + " " +
                           '"' + rulenum + '" "' + autoremediate + '"' + ' "' + profilename + '"', shell=True)
    output, errors = ret.communicate()
    print "cloudraxak: " + str([ret.returncode, errors, output])

    return ret.returncode


def fixRule(username, ip, rulenum):
    print "cloudraxak: inside fixRule"
    # Save the execution mode and profile name before removing the data.
    autoremediate = ""
    profilename = ""
    rs = redis.Redis()
    dump = rs.lrange(ip, 0, -1)
    for item in dump:
        if rulenum in item:
            selected_rule_dict = json.loads(item)
            if selected_rule_dict.has_key('profile'):
                profilename = selected_rule_dict['profile']
            if selected_rule_dict.has_key('exemode'):
                autoremediate = selected_rule_dict['exemode']

                # rs.lrem(ip,item)
                # ASG - TODO to cleanup this code and pass only necessary parameters

                # ret = subprocess.Popen("python ./runrules.py -f "+ip+" "+
                #		'"' + rulenum + '"', shell=True)

    ret = subprocess.Popen("python ./runrules.py -f " + username + " " + ip + " " +
                           '"' + rulenum + '" "' + autoremediate + '"' + ' "' + profilename + '"', shell=True)

    output, errors = ret.communicate()
    print "cloudraxak: " + str([ret.returncode, errors, output])
    return ret.returncode


def setOS(ip, OSName):
    rs = redis.Redis("localhost")
    rs.set(ip, OSName)
    return


def getOS(ip):
    rs = redis.Redis("localhost")
    if rs.exists(ip + "details"):
        os = rs.get(ip + "details")
        data = json.loads(os)
        return data["os"]

    print ("cloudraxak(getOS): Unknown OS entry for IP = " + ip)
    return ""


def setCronEntry(loggedInUsername, usernameIP, profilename, frequency, autoremediate):
    print "Inside cloudraxak:setCronEntries"

    if frequency.lower() == "none":
        print "frequency is none hence skipping add cron entry operation"
        return

    if frequency.lower() != "hourly" and frequency.lower() != "daily" and frequency.lower() != "weekly" and frequency.lower() != "monthly":
        print "Invalid frequency : " + frequency + " , skipping add cron entry operation"
        return

    sysUsername = getpass.getuser()  # get system user
    system_cron = CronTab(user=sysUsername)

    workingDir = os.getcwd()
    script_absolute_path = workingDir + "/cron.sh "
    cmd = 'sh ' + script_absolute_path + loggedInUsername + ' ' + usernameIP + ' ' + str(autoremediate) + ' "' + profilename + '" none'
    cmd_search = 'sh ' + script_absolute_path

    # Iterate through all exising cron jobs and check whather it is already exist.
    for job in system_cron:
        if cmd_search in str(job):
            split_string = str(job).split()
            cron_usernameIP = ""
            cron_profilename = ""
            cron_frequency = ""
            if "* * * * SUN" in str(job):
                # For weekly
                cron_usernameIP = split_string[8]
                cron_profilename = ' '.join(split_string[9:(split_string.index('none'))])[1:-1]
                cron_frequency = "weekly"
            else:
                # hourly, daily, monthly entries
                cron_usernameIP = split_string[4]
                cron_profilename = ' '.join(split_string[5:(split_string.index('none'))])[1:-1]
                cron_frequency = split_string[0][1:]

            # Check IP address
            if usernameIP.split("@")[1] == cron_usernameIP.split("@")[1]:
                if profilename.lower() == cron_profilename.lower():
                    if frequency.lower() != cron_frequency.lower():
                        continue
                    else:
                        # Check Username
                        if usernameIP.split("@")[0] == cron_usernameIP.split("@")[0]:
                            print "Existing cron entry has the same profilename and frequency hence skipping add cron entry operation"
                            return
                        else:
                            system_cron.remove(job)
                            break

                # Now there should be one frequency entry per IP address
                # If newly requested frequency matched with existing then replace it with new entries
                if frequency.lower() == cron_frequency.lower():
                    system_cron.remove(job)
                    break

    # Creating a job with a comment
    job = system_cron.new(command=cmd, comment='Cloud Raxak added this cron entry')
    if frequency.lower() == "hourly":
        job.every(1).hours()
    elif frequency.lower() == "daily":
        job.every().day()
    elif frequency.lower() == "weekly":
        job.dow.on('SUN')
    elif frequency.lower() == "monthly":
        job.every().month()

    system_cron.write()
    print "cron entry successfully added..."


def applyProfile(username, iplist, profilename, autoremediate, frequency):
    print("cloudraxak: applyProfile: " + str(username) + " : " + str(iplist) + " : " + str(profilename) + " : " + str(autoremediate) + " : " + frequency)

    rs = redis.Redis()
    devnull = open(os.devnull, 'wb')
    print("cloudraxak: in applyProfile")

    lastrundump = rs.lrange(username + "lastrunips", 0, -1)
    for item in lastrundump:
         try:
             mapped_data = json.loads(item)
             mapped_data["lastrun"] = 0
             rs.lrem(username + "lastrunips", item)
             rs.lpush(username + "lastrunips", json.dumps(mapped_data))
         except Exception as e:
             print ("cloudraxak: apply profile - Error while reseting lastrun flags" + str(e))

    lastrundump = rs.lrange(username + "lastrunips", 0, -1)

    if type(iplist) is list:
        for ip in iplist:
            osName = getOS(ip)
            disaOsName = ""
            if osName:
                print ("cloudraxak: Username@IP = " + ip + " and OS installed = " + osName)
                disaOsName = getDisaOsName(osName)
                print ("cloudraxak: disaOsName = " + str(
                    disaOsName))  # if Unsupported OS then skip the execution and continue execution for other IPs
                if disaOsName is None:
                    print("cloudraxak: OS is unsupported")
                    continue
            else:
                # return
                # TODO -- ASG temp hardcoded
                disaOsName = "Red Hat Enterprise Linux 6 Security Technical Implementation Guide"
            # TODO - ASG-  should return with appropriate return code.

            rulelist = getRulesForProfile(profilename, disaOsName)
            global totalRules
            totalRules = len(rulelist)
            ruleliststr = ' '.join(rulelist)
            if len(ruleliststr) == 0:
                return False

            # Creating a scheduler
            setCronEntry(username, ip, profilename, frequency, autoremediate)

            ret = subprocess.Popen("nohup python ./runrules.py -a " + username + " " + ip + " " +
                                   '"' + ruleliststr + '" "' + autoremediate + '"' + " " + '"' + profilename + '"' + " " + '"' + frequency + '"',
                                   shell=True).pid

            print ("cloudraxak: child PID = " + str(ret))

            found = False
            for item in lastrundump:
                mapped_data = json.loads(item)
                if mapped_data["ip"] == str(ip):
                    mapped_data["lastrun"] = 1
                    rs.lrem(username + "lastrunips", item)
                    rs.lpush(username + "lastrunips", json.dumps((mapped_data)))
                    found = True

            if not found:
                mapped_data = {}
                mapped_data["ip"] = ip
                mapped_data["nickname"] = getNickname(username, ip)
                mapped_data["lastrun"] = "1"
                rs.lpush(username + "lastrunips", json.dumps((mapped_data)))

    return


# TODO - ASG - #return with rc values of execution of rules on respective Target machine VMs
# This function is obsolete--- commented out to see if anything breaks. Delete if nothing breaks
#

'''
def checkStatus( ipaddress ):
	print("in cloudraxak: checkStatus: ipaddress = " + ipaddress)
	rs = redis.Redis("localhost")
	print("redis opened")
	try:
		status = rs.get( ipaddress)
	except Exception as e:
		print("Redis exception " + str(e))
		status = []
	print("cloudraxak: checkStatus: status = " + str(status) + " for ip = " + ipaddress)
	return status
'''

def abortExecution(iplist):
    print "In cloudraxak: abortexecution: IP List = " + str(iplist)
    rs = redis.Redis("localhost")
    for ip in iplist:
        status = rs.get(ip + "status")
        if status is not None:
            if 'in progress' in status:
                print "Compliance execution is in progress for IP = " + str(ip)
                start = status.find("(")
                end = status.find(")")
                if start > -1 and end > -1:
                    pid = status[start + 1:end]
                    print "PID => " + str(pid)
                    try:
                        os.kill(int(pid), signal.SIGTERM)
                        print "Process killed"
                    except Exception as e:
                        print("Exception thrown while killing the process - " + str(e))
            utc = datetime.datetime.utcnow()
            utc_time = datetime.datetime.strftime(utc, '%a %b %d %H:%M:%S %Y')
            rs.set(ip + "status", "Rules execution aborted on : " + utc_time)
    return


def getExecutionStatus(iplist):
    rs = redis.Redis("localhost")
    flag = True
    doneRules = 0
    # Re-calculate totalrule count
    # TODO - Need to optimize in later release - store it in database about profile run execution.
    totalRuleCount = 0
    profilename = ""
    for ip in iplist:
        if not profilename:
            dump = rs.lrange(ip, 0, -1)
            for item in dump:
                selected_rule_dict = json.loads(item)
                if selected_rule_dict.has_key('profile'):
                    profilename = selected_rule_dict['profile']
                    break;

        if profilename:
            osName = getOS(ip)
            disaOsName = ""
            if osName:
                disaOsName = getDisaOsName(osName)
            else:
                disaOsName = "Red Hat Enterprise Linux 6 Security Technical Implementation Guide"

            rulelist = getRulesForProfile(profilename, disaOsName)
            totalRuleCount = len(rulelist)

            if totalRuleCount:
                break

    if not totalRuleCount:
        totalRuleCount = totalRules

    if type(iplist) is list:
        for ip in iplist:
            print ("cloudraxak: getExecutionStatus IP = " + ip)
            rs = redis.Redis()
            dump = rs.lrange(ip, 0, -1)
            if dump:
                doneRules += len(dump)
                status = rs.get(ip + "status")
                if status is not None:
                    if 'in progress' in status:
                        flag = False

        if flag:
            return "true"
        else:
            try:
                percentage = (doneRules * 100) / (totalRuleCount * len(iplist))
                ret = "false:" + str(percentage)
                return ret
            except:
                return "true"
    else:
        rs = redis.Redis()
        dump = rs.lrange(iplist, 0, -1)
        doneRules = len(dump)
        percentage = (doneRules * 100) / (totalRuleCount)
        print ("cloudraxak: getExecutionStatus IP = " + iplist)
        status = rs.get(iplist + "status")
        if 'in progress' in status:
            ret = "false:" + str(percentage)
            return ret

    return "true"

def showrun(username, ipaddress, timestamp):
    print("In cloudraxak: showrun")
    if timestamp:
        timestamp = str(timestamp).split('GMT')[0].strip(' ')
        date_object = datetime.datetime.strptime(timestamp, '%a, %d %b %Y  %H:%M:%S')
        utc_timestamp = datetime.datetime.strftime(date_object, '%Y%m%d%H%M%S')

        # retrieve the logs from the file
        print("cloudraxak: showrun: timestamp = " + utc_timestamp)
        filename = '/var/log/cloudRaxak/' + username + '/' + ipaddress + '-' + utc_timestamp + '.txt'
        print "pathe of showrun API ="+str(filename)
        data = []
        try:
            with open(filename) as f:
                for line in f:
                    data = json.loads(line)
                    break
        except Exception as e:
            print "Exception while reading archive log gile == " + str(e)
        return data
    else:
        # retrieve the logs from the redis database
        rs = redis.Redis()
        dump = rs.lrange(ipaddress, 0, -1)

    # return dump as a list
    return dump


def getConsoleLog(username, usernameIP, securityRule, timestamp):
    'This Api intends to returning the cosnole log for ruleNumber'
    print "cloudraxak: inside getConsoleLog"

    if timestamp != "None":
        dump = showrun(username, usernameIP, timestamp)
    else:
        dump = showrun(username, usernameIP, '')

    for json_rule_dict in dump:
        rule_dict = json.loads(json_rule_dict)
        if rule_dict.has_key("rule"):
            if rule_dict["rule"] == securityRule:
                value = rule_dict["console"].replace("=================================================", '')
                return value.replace("\n", '<br />')


def modifyIP(username, usernameIP, submitIP, submitNickName, selectedNickName, sshport, oldsshport, tunnelInfo=None):
    'This Api intends to modifying the userName@Ip,UserName,NickName'

    print "cloudraxak: inside ModifyIP"

    if len(submitNickName.replace(" ", '')) == 0:
        if submitIP == usernameIP:
            submitNickName = usernameIP
        else:
            submitNickName = submitIP  # Check to resolve issue #429

    # This block intends to just update the nickName in database without calling re-checkAccess.
    # If user modifies only the nickName.
    #modified = False
    nickName_flag = False	
    rs = redis.Redis("localhost")
    dump = rs.lrange(username, 0, -1)
    accessStatus = {}
    accessStatus["sshport"]=str(sshport)
    for item in dump:

        ip_map_data = json.loads(item)
        if ip_map_data.has_key('ip'):
            if usernameIP in ip_map_data['ip']:
    		if ((usernameIP.replace(" ", '') == submitIP.replace(" ", '')) and (
                		submitNickName.replace(" ", '') != selectedNickName.replace(" ", ''))):
                	accessStatus['ip'] = usernameIP
                	accessStatus['nickname'] = submitNickName
		else:
                	accessStatus['ip'] = submitIP
                	accessStatus['nickname'] = submitNickName 
			
                accessStatus['access'] = ip_map_data['access']
                accessStatus['nickname'] = submitNickName
                if ip_map_data.has_key('osname'):
                    accessStatus['osname'] = ip_map_data['osname']
                if ip_map_data.has_key('osversion'):
                    accessStatus['osversion'] = ip_map_data['osversion']
                rs.lrem(username, item)
                rs.rpush(username, json.dumps(accessStatus))
		nickName_flag = True
	
    if rs.exists(username + 'lastrunips'):
        lastrun_dump = rs.lrange(username + "lastrunips", 0, -1)
        for item in lastrun_dump:
            mapped_data = json.loads(item)
            if str(mapped_data["ip"]) == usernameIP:
                mapped_data["ip"] = submitIP
                mapped_data["nickname"] = submitNickName
                rs.lrem(username + "lastrunips",item)
                rs.lpush(username + "lastrunips", json.dumps((mapped_data)))


    if ((usernameIP.replace(" ", '') == submitIP.replace(" ", '')) and (sshport.replace(" ", '') == oldsshport.replace(" ", '')) and (
                submitNickName.replace(" ", '') != selectedNickName.replace(" ", ''))):
                ## ASG - avoid recheck access in case of only nickname modified.
	 	#if nickName_flag:
    	#		modifyGroupIP(username, usernameIP, submitIP)
			return "Modified successfully"
    else:
	ip_list = []
	ip_list.append(submitIP)
        rc = checkAccess(username, ip_list, sshport, submitNickName, tunnelInfo )
        if len(rc) != 0:
	        rs = redis.Redis("localhost")
                if (usernameIP.replace(" ", '') != submitIP.replace(" ", '')):
		    tunnel_key = str(usernameIP)+":isTunnel" #1.Created at the time of add.
		    status_key = str(usernameIP)+"status"    #2.Created at the time of apply profile.
		    details_key = str(usernameIP)+"details"  #3.Created at the time of apply profile. 
 		    if rs.exists(tunnel_key):
			rs.rename(tunnel_key,submitIP+":isTunnel")
 		    if rs.exists(status_key):
			rs.rename(status_key,submitIP+"status")
 		    if rs.exists(details_key):
			rs.rename(details_key,submitIP+"details")
 		    if rs.exists(usernameIP):
			rs.rename(usernameIP,submitIP)

		    #Renaming archive logs
                    archiveLogfileList = glob.glob('/var/log/cloudRaxak/' + username + '/' +usernameIP+"*")
		    for archiveFile in archiveLogfileList:
		        newArchiveFile = "/var/log/cloudRaxak/"+username+"/"+submitIP+"-"+os.path.split(archiveFile)[1].split("-")[1]
			os.rename(archiveFile,newArchiveFile)
	            modifyGroupIP(username, usernameIP, submitIP)
    		return rc

    return "Modified failed"


def addIP(username, ipaddress, nickname, sshport="22", tunnelUsername=None, tunnelPassword=None, tunnelIP=None):
    status_list = []
    rs = redis.Redis()
    ips = rs.lrange(username, 0, -1)
    for item in ips:
        ip_map = json.loads(item)
        if ip_map.has_key("ip"):
            if ip_map["ip"] == ipaddress:
                accessStatus = {}
                accessStatus['ip'] = ipaddress
                accessStatus['nickname'] = nickname
                accessStatus['access'] = "-99"  # -99 -> entry already exists into the database
                status_list.append(accessStatus)
                return status_list
    ip_list = []
    ip_list.append(ipaddress)

    print ("addIP: " + str(tunnelUsername) + " " + str(tunnelPassword) + " " + str(tunnelIP))
    #If the ip is a private ip address, and a tunnel is specified, code that data
    tunnelInfo = None
    if tunnelUsername is not None and \
        tunnelPassword is not None and \
        tunnelIP is not None:
        
        tunnelInfo = {
            'istunnel' : 'True',
            'tunnelusername' : tunnelUsername,
            'tunnelpassword' : tunnelPassword,
            'tunnelip' : tunnelIP
        }
	
    # It will check the access of the username@ip and add the entry along with the access status into database
    return checkAccess(username, ip_list, sshport, nickname, tunnelInfo)


def setSelectedTMs(username, ipaddress):
    rs = redis.Redis()
    return rs.set(username + "Selected", json.dumps(ipaddress))


def getSelectedTMs(username):
    rs = redis.Redis()
    return rs.get(username + "Selected")


def deleteIP(username, ipaddress):
    rs = redis.Redis()
    rs.lrem(username, ipaddress)
    return


def getIPs(username):
    rs = redis.Redis()
    ips = list(set(rs.lrange(username, 0, -1)))
    print ("cloudraxak: ips= " + str(ips))
    return ips


# ASG - Get the supported disa OS name for the corresponding OS version
# If the OS version we ye to support then return with None
def getDisaOsName(targetVMOsName):
    if "centos" in targetVMOsName.lower():
        return "Red Hat Enterprise Linux 6 Security Technical Implementation Guide"
    elif "apache" in targetVMOsName.lower():
        return "APACHE SERVER 2.2 for Unix"
    elif "amazon linux ami" in targetVMOsName.lower():
        return "Red Hat Enterprise Linux 6 Security Technical Implementation Guide"
    elif "redhat" in targetVMOsName.lower():
        return "Red Hat Enterprise Linux 6 Security Technical Implementation Guide"
    elif "ubuntu" in targetVMOsName.lower():
        return "Ubuntu Security Technical Implementation Guide"
    elif "debian" in targetVMOsName.lower():
        return "Ubuntu Security Technical Implementation Guide"
    else:
        return None


def getArchiveLogFileNameList(username, usernameIP):
    print("cloudraxak: getArchiveLogFileNameList: usernameIP = " + usernameIP)
    timestamp_list = []
    logFileNameList = []
    archiveLogfileList = glob.glob('/var/log/cloudRaxak/' + username + '/' + usernameIP + '-*.txt')
    archiveLogfileList.sort(reverse=True)
    for x in archiveLogfileList:
        file_name = os.path.basename(x)
        split_file_name = file_name.split("-")
        utp_timestamp = file_name.rsplit("-", 1)[1].split(".txt")[0]
        # ASG - Check added if due to some reason empty timestamp is getting stored as a filename
        # Hence timestamp is empty then ingore the operation and continue working on next filename
        if not utp_timestamp:
            continue
        dateobject = datetime.datetime.strptime(utp_timestamp, '%Y%m%d%H%M%S')  # strp takes string
        js_fmt = datetime.datetime.strftime(dateobject, '%a %b %d %H:%M:%S %Y')  # strf takes dateobject
        timestamp_list.append(js_fmt)
        logFileNameList.append(file_name)

    #print("cloudraxak: getArchiveLogFileNameList: list of archieve log files = " + str(logFileNameList))
    return timestamp_list


def display_execution_time_list(username, usernameIP):
    TIME_FORMAT = '%a %b %d %Y %H:%M:%S'
    print("cloudraxak: getArchiveLogFileNameList: usernameIP = " + usernameIP)
    exec_timestamp_list = []
    logFileNameList = []
    archiveLogfileList = glob.glob('/var/log/cloudRaxak/' + username + '/' + usernameIP + '*.txt')
    archiveLogfileList.sort(reverse=True)
    for x in archiveLogfileList:
        file_name = os.path.basename(x)
        split_file_name = file_name.split("-")
        utp_timestamp = file_name.rsplit("-", 1)[1].split(".txt")[0]
        # ASG - Check added if due to some reason empty timestamp is getting stored as a filename
        # Hence timestamp is empty then ingore the operation and continue working on next filename
        if not utp_timestamp:
            continue
        dateobject = datetime.datetime.strptime(utp_timestamp, '%Y%m%d%H%M%S')  # strp takes string
        js_fmt = datetime.datetime.strftime(dateobject, '%a %b %d %Y %H:%M:%S')  # strf takes dateobject
        timestamp = calendar.timegm((datetime.datetime.strptime(js_fmt, TIME_FORMAT)).timetuple())
        local_time = datetime.datetime.fromtimestamp(timestamp).strftime(TIME_FORMAT)
        exec_timestamp_list.append(local_time)
        logFileNameList.append(file_name)
    print("cloudraxak: getArchiveLogFileNameList: list of archieve log files = " + str(logFileNameList))
    return exec_timestamp_list


def test():
    rules = getRulesForProfile("DemonstrationProfile",
                               "Red Hat Enterprise Linux 6 Security Technical Implementation Guide")
    # rules = getRulesForProfile( "MAC-3_Public")
    print ("cloudraxak: rules = " + str(rules))
    # ipaddress = "130.211.122.121" # cloud raxak GCE centOS
    # ipaddress = "192.168.122.17" # Local centos
    # ipaddress = "146.148.89.19" # cloud raxak GCE rhel-6
    # iplist = [ '130.211.122.121', '146.148.89.19']
    # iplist = [ '192.168.0.172']

    # applyProfile ( iplist, rules )

    return


def getIPDetails(ip):
    '''This API shows the ipdetails w.r.t ip address'''
    rs = redis.Redis()
    ipdetails = ip + "details"
    ip_details_data = rs.get(ipdetails)
    print type(ip_details_data)
    if ip_details_data is None:
        ip_details_data = ""
    return ip_details_data


def showExecutionStatus(ip):
    '''This API retruns the execution time w.r.t ip address'''
    rs = redis.Redis()
    ipStatus = ip + "status"
    print("getting status")
    ip_status_data=rs.get(ipStatus)
    print("got status" + str(ip_status_data))
    if ip_status_data is None:
        ip_status_data = ""
    return ip_status_data

def showCheckRule(rulenum, osName="ubuntu"):
    disaOsName = getDisaOsName(osName)
    return loadrules.showRule(rulenum, disaOsName)


def showFixRule(rulenum, osName="ubuntu"):
    disaOsName = getDisaOsName(osName)
    return loadrules.showFix(rulenum, disaOsName)


def getRuleSeverity(rulenum, osName="ubuntu"):
    disaOsName = getDisaOsName(osName)
    return loadrules.getSeverity(rulenum, disaOsName)


def showtitleofRule(rulenum, osName="ubuntu"):
    disaOsName = getDisaOsName(osName)
    return loadrules.showtitle(rulenum, disaOsName)


def ruleTitle(profile):
    '''This API rule with title '''
    rule_data = []

    rules = getRulesForProfile(profile, "Red Hat Enterprise Linux 6 Security Technical Implementation Guide")
    for i in rules:
        try:
            rule_t = loadrules.showtitle(i)
        except:
            # ASG - In case we miss to add the title and description of the security rule.
            rule_t = "Rule's title and description is missing, contact administrator for the more details"
        finally:
            rule_data.append({"rule": i, "title": rule_t})
    return rule_data


def ruleTitleOnly(profile, osName="centos"):
    '''This API rule with title '''
    rule_data = defaultdict(dict)
    disaOsName = getDisaOsName(osName)
    rules = getRulesForProfile(profile, disaOsName)
    for i in rules:
        try:
            rule_t = loadrules.showtitle(i, disaOsName)
        except:
            # ASG - In case we miss to add the title and description of the security rule.
            rule_t = "Rule's title and description is missing, contact administrator for the more details"
        finally:
            rule_data[i] = rule_t
    return rule_data


def checkAccess(username, usernameIP_list, sshportParam="22", nickname_fromAddTarget="", tunnelInfo=None):
    # TODO spawns the checking access in the background, so that user could able to perform other operation as well without any blocking time
    # Access codes:
    #   +1: Everything OK
    #   -1: OS supported but not version
    #   -2: Ping failed
    #   -3: SSH failed
    #   -4: Cannot run with escalated privilege (sudo)
    #   -5: Access checking in progress
    #   -6: Cannot open VPN tunnel to private IP
    #   -7: Timeout waiting for VPN tunnel

    channel = ""
    rs = redis.Redis("localhost")
    status_list = []
    for ip in usernameIP_list:
        # if not nickname:
        if not nickname_fromAddTarget:
            nickname = getNickname(username, ip)
        else:
            nickname = nickname_fromAddTarget
            # nickname = getNickname(username,ip)
        print("---------------------------------------------------")
        print("cloudraxak: checking access of username@IP = " + ip)
        # Delete an existing IP access status entry if exists
        accessStatus = {}
        if sshportParam is None:
            sshport = getsshport(username, ip)
        else:
            sshport = sshportParam

        if str(sshport) != "22":
            accessStatus['sshport'] = str(sshport)

        print "sshport = " + str(sshport)

        deleteUsernameIP(username, [ip])

        if tunnelInfo:
            accessStatus.update(tunnelInfo)

        #Check if a tunnel is needed, and open one if needed
        #A return status of False means that a tunnel was needed, but could not be opened
                
        if not VPNtunnel.openLink( ip ):
            print("Failed to open VPN tunnel")
            accessStatus['ip'] = ip
            accessStatus['access'] = "-6"
            accessStatus['nickname'] = nickname
            rs.rpush(username, json.dumps(accessStatus))
            status_list.append(accessStatus)
            continue
                	
        #Now tunnel is not needed, or is open and we can proceed as needed
        print("Tunnel Opened or not needed:")
        #Main try block
        try:
            print("... main try")
            # access check in progress
            accessStatus['ip'] = ip
            accessStatus['access'] = "-5"
            accessStatus['nickname'] = nickname
            rs.rpush(username, json.dumps(accessStatus))
            gw = ""
            os = ""
            os_version = ""
            hostname = ""
            ipaddress = ip.split("@")[1]
            userName = ip.split("@")[0]
            #try-1
            try:
                print("... try-1")
                if "root" in userName:
                    gw = execnet.makegateway(
                        "ssh=" + ip + " -p " +  str(sshport) + " -o ServerAliveInterval=30 -o StrictHostKeyChecking=no -o PasswordAuthentication=no -o ConnectTimeout=20 -A")
                else:

                    gw = execnet.makegateway(
                        "ssh=" + ip + " -p " +  str(sshport) + " -o ServerAliveInterval=30 -o StrictHostKeyChecking=no -o PasswordAuthentication=no -o ConnectTimeout=20 -A sudo")
                print("... gw opened " + str(gw))
            except Exception as e:
                print("... gw failed to open, " + str(e) + "> test ping")
                # SSH failed but check wheather VM is reachable or not
                ping_process = subprocess.Popen(['ping', '-c 2', '-w 5', ipaddress], stdout=subprocess.PIPE)
                output = ping_process.communicate()
                deleteUsernameIP(username, [ip])
                if ping_process.returncode != 0:
                    # ping failed hence access status = ping failed
                    print ("Access status: Unable to reach IP address = <" + ipaddress + ">")
                    accessStatus['ip'] = ip
                    accessStatus['access'] = "-2"
                    accessStatus['nickname'] = nickname
                    rs.rpush(username, json.dumps(accessStatus))
                    status_list.append(accessStatus)
                    continue

                # ping succeeded hence access status = SSH failed
                print("Access status : connectGateway: Unable to open ssh gateway to target IP address : " + ip)
                accessStatus['ip'] = ip
                accessStatus['access'] = "-3"
                accessStatus['nickname'] = nickname
                rs.rpush(username, json.dumps(accessStatus))
                status_list.append(accessStatus)
                continue

            #SSH and Ping succeeded, now retrieve the OS Name and OS version of the connected target machine.
            #Try-2
            try:
                print("... try-2 ssh/ping test done")
                channel = gw.remote_exec("""
if __name__ == '__channelexec__':
    import os
    import sys	
    import platform
    import subprocess
    def extractOSFromFile():	
	os_data_list = []
        commands_value  = sys.platform , str(platform.dist()[0]), str(platform.dist()[1]), str(platform.uname()[1])
	os_data_list.append(commands_value)

	os_file_data = []
        if os.path.exists('/etc/os-release'): #Amazon Linux AMI 2015.03
            os_file_data=open('/etc/os-release','r').readlines()	
        elif os.path.exists('/etc/system-release'): #Amazon Linux AMI 2013.03
            os_file_data=open('/etc/system-release','r').readlines()
        else:
	    pass
	os_data_list.append(os_file_data)	
    	
	sudo_file_data_list = []	
	#Checking for therequiretty flag in the sudoers file	
	if os.path.exists('/etc/sudoers'):
            sudo_file_data_list=open('/etc/sudoers','r').readlines()	
	os_data_list.append(sudo_file_data_list)

	pipe = subprocess.Popen(["chage" ,"-M", "-1",'""" + userName + """'], stdout=subprocess.PIPE)
	pipe.wait()

	pipe = subprocess.Popen(["chage" ,"-l" ,'""" + userName + """'], stdout=subprocess.PIPE)
	chageresult = pipe.stdout.read()

	os_data_list.append(chageresult)

        return os_data_list	

    for item in channel:
        channel.send(eval(item))
     
                                """)
                channel.send('extractOSFromFile()')
                outchan = channel.receive()
                print("outchan = " + str(outchan))
                platform = ""
                os = ""
                os_version = ""
                hostname = ""
                raxakuser = ""
                platform, os, os_version, hostname = outchan[0]
                raxakuser = outchan[2]

                import re
                os_name = ""

                if len(outchan[1]) != 0:
                    file_data = outchan[1]
                    if len(os) == 0:
                        for element in file_data:
                            if re.match(r'NAME', element, re.M | re.I):
                                os = element.split('=')[1].strip('\n').strip('"')
                            elif re.match(r'VERSION=', element, re.M | re.I):
                                os_version = element.split('=')[1].strip('\n').strip('"')
                        if not os or not os_version:
                            if "amazon linux ami release" in (file_data[0]).lower():
                                os = "Amazon Linux AMI"
                                os_version = (file_data[0]).split()[-1]

            #except-2
            except Exception as e:
                print ("Exception except-2: " + str(e))
                deleteUsernameIP(username, [ip])
                accessStatus['ip'] = ip
                accessStatus['access'] = "-4"
                accessStatus['nickname'] = nickname
                rs.rpush(username, json.dumps(accessStatus))
                status_list.append(accessStatus)
                continue

            # Checking the requiretty flag in remote sudoers file
            deleteUsernameIP(username, [ip])
            if returnSudoTtyFlag(outchan[2], userName) == False:
                accessStatus['ip'] = ip
                accessStatus['access'] = "-4"
                accessStatus['nickname'] = nickname
                print (
                    "Access status: Insufficient execution privilege (cannot run privileged instructions ) as requiretty flag is not set off for the userid in the sudoers file")
                rs.rpush(username, json.dumps(accessStatus))
                status_list.append(accessStatus)
                continue

            isSupportedOS = False
            osVersionSupported = False
            supportedOS_List = supportedOSList()
            for supportedOS in supportedOS_List:
                if os.lower() in supportedOS.lower():
                    isSupportedOS = True
                    OsVersion_tupple = tuple(map(int, (os_version.split("."))))
                    if os.lower() == "centos" or os.lower() == "redhat": #Redhat-CentOS v6.5 to v7.2
                        if OsVersion_tupple >= (6, 5) and OsVersion_tupple < (7, 3) :
                            osVersionSupported = True
                    elif os.lower() == "ubuntu": #Ubuntu 14.04+
                        if OsVersion_tupple >= (14, 4):
                            osVersionSupported = True
                    elif os.lower() == "debian": #Debian 8 verion only which is equal to Ubuntu v14.04
                        if OsVersion_tupple >= (8, 0) and OsVersion_tupple < (9, 0) :
                            osVersionSupported = True
                    elif os.lower() == "debian": #Amazon AMI Linux v2013 onwards
                        if OsVersion_tupple >= (2013, 0):
                            osVersionSupported = True

                    break

            accessStatus['ip'] = ip
            usernameIPDetails = {}
            usernameIPDetails["os"] = os.title()
            usernameIPDetails["os_version"] = os_version
            usernameIPDetails["hostname"] = hostname
            rs.set(ip + "details", json.dumps(usernameIPDetails))
            if isSupportedOS:
                if osVersionSupported:
                    accessStatus['access'] = 1
                    accessStatus['nickname'] = nickname
                    accessStatus['osname'] = os
                    accessStatus['osversion'] = os_version

                    accessStatus['nickname'] = nickname
                    print ("OS : " + os)
                    print ("OS Version : " + os_version)
                    print ("Access status: ALL OK = <" + ip + ">")
                else:
                    accessStatus['access'] = "-1"
                    accessStatus['nickname'] = nickname
                    print (
                        "Access status: OS (" + os + ") is supported but version (" + os_version + ") is not supported")
            else:
                accessStatus['access'] = "-1"
                accessStatus['nickname'] = nickname
                print ("Access status: OS " + os + " not supported")

            rs.rpush(username, json.dumps(accessStatus))
            status_list.append(accessStatus)

        #Main execept block
        except Exception as e:
            print("main exception: " + str(e))
            print(traceback.format_exc())
            deleteUsernameIP(username, [ip])
            print "Access status: Invalid usernameIP value = <" + ip + "> , hence skipping the access check...."
            print ("Flagging ip address with -2 (unreachable)")
            accessStatus['ip'] = ip
            accessStatus['access'] = "-2"
            accessStatus['nickname'] = nickname
            rs.rpush(username, json.dumps(accessStatus))
            status_list.append(accessStatus)

    print("---------------------------------------------------")
    for ip in usernameIP_list:
        VPNtunnel.closeLink( ip )	# close any tunnelled links if needed
    return status_list


def returnSudoTtyFlag(data, userName):
    import string
    default_req_set = 'Defaults!requiretty'
    req_set_case1 = userName + '!requiretty'
    req_set_case2 = 'Defaults:' + userName + '!requiretty'
    for line in data:
        if ((line != "") and (line[0] != "#")):
            line = line.translate(string.maketrans("\n\t\r", "   "))
            reqflag_file = line.replace(" ", "").strip()
            if ((reqflag_file == default_req_set) or (reqflag_file == req_set_case1) or (
                        reqflag_file == req_set_case2)):
                return True
    return False


def deleteUsernameIP(username, usernameIPlist):
    # from runrules import archieveLogs
    # PGM 5/29/15 Modified so that the usernameIPlist can be simply and IPlist without the login name specified
    # in this case all entries that match the username with that IP address, regardless of the login name, will be deleted.
    deleted = False
    rs = redis.Redis("localhost")
    dump = rs.lrange(username, 0, -1)
    for usernameIP in usernameIPlist:
        for item in dump:
            ip_map_data = json.loads(item)
            if ip_map_data.has_key('ip'):
                if usernameIP == ip_map_data['ip']:
                    rs.lrem(username, item)
                    deleted = True

    return deleted


# Get the Nickname from the database by comparing
# the usernameIP with ip add in database.
def getNickname(username, usernameIP):
    rs = redis.Redis("localhost")
    dump = rs.lrange(username, 0, -1)
    for item in dump:
        ip_map_data = json.loads(item)
        if ip_map_data.has_key('ip'):
            if usernameIP == ip_map_data['ip']:
                return ip_map_data['nickname']

    return ""

# Get the sshport from the database of respective given usernameIP
def getsshport(username, usernameIP):
    rs = redis.Redis("localhost")
    sshport = "22"
    dump = rs.lrange(username, 0, -1)
    for item in dump:
        ip_map_data = json.loads(item)
        if ip_map_data.has_key('ip'):
            if usernameIP == ip_map_data['ip']:
                if ip_map_data.has_key('sshport'):
                    sshport = ip_map_data['sshport']
                return sshport

    return sshport

merginglastruninfo_old_new_key_structure()

def getlastrunIPs(username):
    '''This API shows the last run ips'''
    rs = redis.Redis()
    lastruns = []
    if rs.exists(username + 'lastrunips'):
        lastruns = rs.lrange(username + "lastrunips", 0, -1)
    return lastruns


def getRaxakPublicKey():
    # TODO - For internal development: changes are pending if server dont have public key installed
    # This API return with ssh public key
    return open(os.path.expanduser('~/.ssh/id_rsa.pub')).read()


def getCronJobs(username):
    # Get the cron jobs associated with logged in username.
    sysUsername = getpass.getuser()  # get system user
    system_cron = CronTab(user=sysUsername)

    cron_job_list = []
    for job in system_cron:
        search = "cron.sh " + username
        cron_job_info = {}
        if search in str(job):
            if "* * * * SUN" in str(job):
                # For weekly
                split_string = str(job).split()
                base = datetime.datetime.utcnow()
                iter = croniter('0 0 * * 0', base)
                cron_job_info['nextrun'] = str(iter.get_next(datetime.datetime)).replace('-', '/')
                cron_job_info['ip'] = split_string[8]
                cron_job_info['nickname'] = getNickname(username, split_string[8])
                cron_job_info['profile'] = ' '.join(split_string[10:(split_string.index('none'))])[1:-1]
                cron_job_info['frequency'] = "weekly"
                cron_job_info['remediationmode'] = split_string[9]
                cron_job_list.append(json.dumps(cron_job_info))
            else:
                # hourly, daily, monthly entries
                split_string = str(job).split()
                base = datetime.datetime.utcnow()
                if "@hourly" in split_string[0]:
                    iter = croniter('0 * * * *', base)
                elif "@daily" in split_string[0]:
                    iter = croniter('0 0 * * *', base)
                elif "@monthly" in split_string[0]:
                    iter = croniter('0 0 1 * *', base)
                else:
                    continue
                cron_job_info['nextrun'] = str(iter.get_next(datetime.datetime)).replace('-', '/')
                cron_job_info['ip'] = split_string[4]
                cron_job_info['nickname'] = getNickname(username, split_string[4])
                cron_job_info['profile'] = ' '.join(split_string[6:(split_string.index('none'))])[1:-1]
                cron_job_info['frequency'] = split_string[0][1:]
                cron_job_info['remediationmode'] = split_string[5]
                cron_job_list.append(json.dumps(cron_job_info))

    return cron_job_list


def deleteCronJob(username, usernameIPlist, profilename=None, frequency=None, remediationmode=None):
    print "Inside cloudraxak:deleteCronJob"

    sysUsername = getpass.getuser()  # get system user
    system_cron = CronTab(user=sysUsername)

    if frequency is not None:
        frequency = frequency.lower()

    if profilename is not None:
        #Remove the specific cron entry.
        workingDir = os.getcwd()
        script_absolute_path = workingDir + "/cron.sh "
        if frequency == "weekly":
            cmd = "* * * * SUN" + ' sh ' + script_absolute_path + username + ' ' + usernameIPlist[
                0] + ' ' + remediationmode + ' "' + profilename + '" none'
        else:
            cmd = "@" + frequency + ' sh ' + script_absolute_path + username + ' ' + usernameIPlist[
                0] + ' ' + remediationmode + ' "' + profilename + '" none'

        for job in system_cron:
            if cmd in str(job):
                system_cron.remove(job)
    else:
        #Remove the specified user cron entries.
        for usernameIP in usernameIPlist:
            system_cron.remove_all(usernameIP)
    
    system_cron.write()
    print "cron entry successfully deleted..."


def deleteLastrun(username, usernameIPlist):

    print "inside deleteLastrun.."

    rs = redis.Redis("localhost")
    # delete the ip(s) fron the lastrun list
    if rs.exists(username + 'lastrunips'):
        lastrun_dump = rs.lrange(username + "lastrunips", 0, -1)
        for item in lastrun_dump:
            mapped_data = json.loads(item)
            ip = mapped_data["ip"]
            if str(ip) in usernameIPlist:
                rs.lrem(username + "lastrunips",item)

    print "lastrun deleted"

#---------------Detailed report and comparission report code start here-------------.  
def getReportHtml(parameter_dict):
    html = ('''
        <table  cellspacing="0" cellpadding="0" class="report_container print-friendly" width="700" style="box-shadow:10px 10px 8px 10px #ccc;background-color:#fff;" id="tbl">
            <thead class="thead">
	 <tr><td colspan="2" style="height: 1px ! important;"></td></tr>
            <tr>
                <th align="left"><img alt="Cloud Raxak Inc." src="../images/crlogo.png" style="margin-left:5px;"><br /><a href="http://www.cloudraxak.com" style="margin-left:11px;">http://www.cloudraxak.com</a></th>
   <!--             <th align="right" class="no-print">
                <img src="lib/images/print_icon.gif" alt="Print" onclick="window.print();return false" class="print_button">
                 </th>-->
                </tr>
            </thead>

            <tbody style="background-color:#fff;">
        ''').format(**locals())

    pageName = parameter_dict['page_name']
    if (pageName == 'detailed_report'):
        html = html + getComparisionDetailReport(parameter_dict)
    if (pageName == 'comaprision_differnce_report'):
        html = html + getComparisionReport(parameter_dict)

    html = html + '''</tbody></table>'''
    return html
#-------------------End-----------------------------------
def getComparisionDetailReport(parameter_dict):
    '''
    GetComparisionDetailReport function displaying the summary information,
    successful,Manual,failure,CronJob and Last 10 compliance Execution.
    '''
    #----------------------Summary information Code start--------------------------
    usernameIP = parameter_dict['usernameIP']
    profilename = parameter_dict['profilename']
    archieveLogTimestamp = parameter_dict['archieveLogTimestamp']
    archieveLogTimestampGmt = parameter_dict['archieveLogTimestampGmt']
    archieveLogFirst = parameter_dict['archieveLogFirst']
    userid = parameter_dict['userid']
    nickname = parameter_dict['getnickname']
    userIpDetails = eval(getIPDetails(usernameIP))
    hostname = userIpDetails['hostname']
    os = userIpDetails['os'] + ' Release ' + userIpDetails['os_version']
    osName = userIpDetails['os'].lower()
    codeversion = ''
    if(usernameIP == nickname):
        servernames = usernameIP
    else:
        servernames = nickname+' '+'('+usernameIP+')'
    # create report A dictionay
    RuleSetList = defaultdict(dict)

    latestTimestampProfile = ''
    latestTimestampExeMode = ''
    if (archieveLogFirst == 'true'):
        array_log = []
        [array_log.append(x) for x in showrun(userid, usernameIP, '')]
        # latestTimestampRuleSetList = [x.encode('ascii') for x in showrun(usernameIP,'')]
        latestTimestampRuleSetList = array_log
    else:
        latestTimestampRuleSetList = [x.encode('ascii') for x in showrun(userid, usernameIP, archieveLogTimestamp)]
    #------------------------End----------------------------------
    manual_low_severity_count = []
    manual_medium_severity_count = []
    manual_high_severity_count = []
    failed_low_severity_count = []
    failed_medium_severity_count = []
    failed_high_severity_count = []
    success_low_severity_count = []
    success_medium_severity_count = []
    success_high_severity_count = []
    get_low_severity = []
    get_medium_severity = []
    get_high_severity = []
    servityExists = True
    get_rule_name = ''
    #-----------------------From below code get the Severity status of High,Medim and Low for success,failure and manual---------------------------.
    for report in latestTimestampRuleSetList:
        reportDic = ''
        reportDic = ast.literal_eval(report)  # str to dictionay conversion
        if ('manual' in reportDic['outcome']):
            RuleSetList['manual'][reportDic['rule']] = reportDic
            get_rule_name = reportDic['rule']
            rule_num = get_rule_name.replace('V-', '')
            get_severity = loadrules.getSeverity(rule_num)
            if "low" in get_severity:
                manual_low_severity_count.append(get_severity)
            if 'medium' in get_severity:
                manual_medium_severity_count.append(get_severity)
            if 'high' in get_severity:
                manual_high_severity_count.append(get_severity)
        elif ('failed' in reportDic['outcome']):
            get_rule_name = reportDic['rule']
            rule_num = get_rule_name.replace('V-', '')
            get_severity = loadrules.getSeverity(rule_num)
            RuleSetList['failed'][reportDic['rule']] = reportDic
            if 'low' in get_severity:
                failed_low_severity_count.append(get_severity)
            if 'medium' in get_severity:
                failed_medium_severity_count.append(get_severity)
            if 'high' in get_severity:
                failed_high_severity_count.append(get_severity)
        elif ('successful' in reportDic['outcome']):
            RuleSetList['successful'][reportDic['rule']] = reportDic
            get_rule_name = reportDic['rule']
            rule_num = get_rule_name.replace('V-', '')
            get_severity = loadrules.getSeverity(rule_num)
            if 'low' in get_severity:
                success_low_severity_count.append(get_severity)
            if 'medium' in get_severity:
                success_medium_severity_count.append(get_severity)
            if 'high' in get_severity:
                success_high_severity_count.append(get_severity)
        #-------End Severiy Code-------------------------------
        else:
        #-------------This section displayed the report status---------------------
            RuleSetList['unknown'][reportDic['rule']] = reportDic
        latestTimestampProfile = reportDic['profile']
        report_status = reportDic['status']
        
        if 'ABORTED BY RAXAK PROTECT' == report_status:
            report_check_status = "(ABORTED (connection lost))"
        elif 'ABORTED' in report_status:
            report_check_status = '('+report_status+')'
        else:
            report_check_status = ''
        latestTimestampExeMode = reportDic['exemode']
        if codeversion == '':
            if reportDic.has_key('codeversion'):
                codeversion = (reportDic['codeversion'].strip()).title()
            else:
                codeversion = previouscodeversion
        #------------------Report status End------------------------
    #-----------------------Count and Percentage of successfully,failure and manual on the basis of severity------------------
    if get_rule_name != '':
        manual_low_severity = len(manual_low_severity_count)
        manual_medium_severity = len(manual_medium_severity_count)
        manual_high_severity = len(manual_high_severity_count)
        failed_low_severity = len(failed_low_severity_count)
        failed_medium_severity = len(failed_medium_severity_count)
        failed_high_severity = len(failed_high_severity_count)
        success_low_severity = len(success_low_severity_count)
        success_medium_severity = len(success_medium_severity_count)
        success_high_severity = len(success_high_severity_count)
        manual_total_val = manual_low_severity + manual_medium_severity + manual_high_severity
        failed_total_val = failed_low_severity + failed_medium_severity + failed_high_severity
        success_total_val = success_low_severity + success_medium_severity + success_high_severity
        high_severity_total = manual_high_severity + failed_high_severity + success_high_severity
        medium_severity_total = manual_medium_severity + failed_medium_severity + success_medium_severity
        low_severity_total = manual_low_severity + failed_low_severity + success_low_severity
        success_severity_total_float = float(success_total_val)
        total_results = high_severity_total + medium_severity_total + low_severity_total
        success_severity_total_percentage = (success_severity_total_float / total_results * 100)
        get_success_severity_percentage = str(success_severity_total_percentage)[:9]
        success_severity_percentage = check_decimal(get_success_severity_percentage)
        failed_severity_total_float = float(failed_total_val)
        failed_severity_total_percentage = (failed_severity_total_float / total_results * 100)
        get_failed_severity_percentage = str(failed_severity_total_percentage)[:9]
        failed_severity_percentage = check_decimal(get_failed_severity_percentage)
        manual_severity_total_float = float(manual_total_val)
        manual_severity_total_percentage = (manual_severity_total_float / total_results * 100)
        get_manual_severity_percentage = str(manual_severity_total_percentage)[:9]
        manual_severity_percentage = check_decimal(get_manual_severity_percentage)
        float_array = []
        success_after_decimal = code_decm(get_success_severity_percentage)
        failed_after_decimal = code_decm(get_failed_severity_percentage)
        manual_after_decimal = code_decm(get_manual_severity_percentage)
        if(get_success_severity_percentage=='100.0'):
            success_after_decimal = '0'
        if(get_failed_severity_percentage=='100.0'):
            failed_after_decimal ='0'
        if(get_manual_severity_percentage=='100.0'):
            manual_after_decimal = '0'
        float_array.append(success_after_decimal)
        float_array.append(failed_after_decimal)
        float_array.append(manual_after_decimal)
        get_max_list = max(float_array)
        get_success_severity_percentage_actual = ''
        get_manual_severity_percentage_actual = ''
        get_failed_severity_percentage_actual = ''
        if int(float_array[0][0]) >= 5 or get_max_list == float_array[0]:
            if(get_success_severity_percentage == '100.0' or get_success_severity_percentage =='0.0'):
                get_success_severity_percentage_add = get_success_severity_percentage
            else:
                get_success_severity_percentage_add = float(get_success_severity_percentage) + 1
            get_success_severity_percentage_actual = str(get_success_severity_percentage_add)
            get_success_actual_value = get_success_severity_percentage_actual[
                                       :get_success_severity_percentage_actual.find('.')]
        else:
            get_success_severity_percentage_add = float(get_success_severity_percentage)
            get_success_severity_percentage_actual = str(get_success_severity_percentage_add)
            get_success_actual_value = get_success_severity_percentage_actual[
                                       :get_success_severity_percentage_actual.find('.')]
        if int(float_array[1][0]) >= 5 or get_max_list == float_array[1]:
            if(get_failed_severity_percentage =="0.0" or get_failed_severity_percentage =="100.0"):
                get_failed_severity_percentage_add = get_failed_severity_percentage
            else:
                get_failed_severity_percentage_add = float(get_failed_severity_percentage) + 1
            get_failed_severity_percentage_actual = str(get_failed_severity_percentage_add)
            get_failed_actual_value = get_failed_severity_percentage_actual[
                                      :get_failed_severity_percentage_actual.find('.')]
        else:
            get_failed_severity_percentage_add = float(get_failed_severity_percentage)
            get_failed_severity_percentage_actual = str(get_failed_severity_percentage_add)
            get_failed_actual_value = get_failed_severity_percentage_actual[
                                      :get_failed_severity_percentage_actual.find('.')]
        if int(float_array[2][0]) >= 5 or get_max_list == float_array[2]:
            if(get_manual_severity_percentage =="0.0" or get_manual_severity_percentage == "100.0"):
                get_manual_severity_percentage_add = get_manual_severity_percentage
            else:
                get_manual_severity_percentage_add = float(get_manual_severity_percentage) + 1
            get_manual_severity_percentage_actual = str(get_manual_severity_percentage_add)
            get_manual_actual_value = get_manual_severity_percentage_actual[
                                      :get_manual_severity_percentage_actual.find('.')]
        else:
            get_manual_severity_percentage_add = float(get_manual_severity_percentage)
            get_manual_severity_percentage_actual = str(get_manual_severity_percentage_add)
            get_manual_actual_value = get_manual_severity_percentage_actual[
                                      :get_manual_severity_percentage_actual.find('.')]
    #-------------------------Count End------------------------------------------
    #-------------------------Below code displaying the mode information----------------------
    if (latestTimestampExeMode == '0'):
        latestTimestampExeMode = 'Manual Remediation'
    else:
        latestTimestampExeMode = 'Automatic Remediation'
    ruleProfileList = ruleTitleOnly(profilename, osName)
    #    gethostname  = str(platform.uname()[1])+"<br/>"+str(platform.dist()[0])+"<br/>"+ str(platform.dist()[1])+"<br/>"+sys.platform
    gethostname = str(platform.uname()[1]) + "<br/>" + str(platform.dist()[0]) + " " + str(platform.dist()[1])

    if(archieveLogTimestampGmt == 'Latest Execution'):
        report_check_status = '&nbsp;(<span style="color:orange;">InProgress</span>)'
    else:
        report_check_status
    #------------------End---------------------------------------------
    #--------------------This Sesction displayed the Summary information -------------------------------------
    if get_rule_name != '':
        html = ('''
            <tr>
                <td colspan="2">
                     <table border="0" cellspacing="0" cellpadding="0" width="700" class="detailed_report" id="summary_detail_report">
                        <tr class="table_head1">
                            <td colspan="2" id ="txt_change">Detailed Report</td>
                        </tr>
                        <tr>
                            <td width="195"><b>Server Name</b></td>
                            <td width="399" colspan="2">{servernames}</td>
                        </tr>
                        <tr>
                            <td width="195"><b>Hostname</b></td>
                            <td width="399" colspan="2">{hostname}</td>
                        </tr>
                        <tr>
                            <td width="195"><b>Operating System</b></td>
                            <td width="399" colspan="2">{os}</td>
                        </tr>
                        <tr>
                            <td width="195"><b>Profile</b></td>
                            <td width="399" colspan="2">{latestTimestampProfile}</td>
                        </tr>
                        <tr>
                            <td width="205"><b>Executed on</b></td>
                            <td width="399" colspan="2">{archieveLogTimestampGmt}{report_check_status}</td>
                        </tr>
                        <tr>
                            <td width="195"><b>Execution Mode</b></td>
                            <td width="399" colspan="2">{latestTimestampExeMode}</td>
                        </tr>
                        <tr>
                            <td width="195"><b>Code Version</b></td>
                            <td width="399" colspan="2">{codeversion}</td>
                        </tr>
                        <tr>
                            <td width="195" style="border-right:0"><b>Execution Results</b></td>
                            <td colspan="4" class="last_execution_result_container">	
                                <table border="0.3px solid #ccc;" cellspacing="0" cellpadding="0" width="100%"  class="last_execution_result">
			<tr style="border:1px solid;#ccc;width:100%;">
				<th style="border:1px solid #ccc;width:20%;padding:5px 0px; vertical-align: middle;">Severity</th>
				<th style="border:1px solid #ccc;width:20%;padding:5px 0px; vertical-align: middle;">Passed</th>
				<th style="border:1px solid #ccc;width:20%;padding: 5px 0px; vertical-align: middle;">Failed</th>
				<th style="border:1px solid #ccc;width:20%;padding: 5px 0px; vertical-align: middle;">Manual Intervention</th>
				<th style="border:1px solid #ccc;width:20%;padding: 5px 0px; vertical-align: middle;">Total</th>
			</tr>
				 <tr>
				<td style="background-color: #f2dede;color: #a94442;padding: 2px 10px 3px 7px;width:20%;">High</td> <td>{success_high_severity}</td><td>{failed_high_severity}</td><td>{manual_high_severity}</td>  <td>{high_severity_total}</td>
				</tr>	
				<tr>
				<td style="background-color: #fcf8e3;color: #8a6d3b;padding: 2px 10px 3px 7px;">Medium</td> <td>{success_medium_severity}</td> <td>{failed_medium_severity}</td>  <td>{manual_medium_severity}</td>  <td>{medium_severity_total}</td>  
				</tr>	
				<tr>
				<td style="background-color: #dff0d8;color: #3c763d;padding: 2px 10px 3px 7px;">Low</td><td>{success_low_severity}</td>  <td>{failed_low_severity}</td>  <td>{manual_low_severity}</td>  <td>{low_severity_total}</td>
				</tr>	
				<tr>
				<td>Total</td><td>{success_total_val}({get_success_actual_value}%)</td>  <td>{failed_total_val}({get_failed_actual_value}%)</td>  <td>{manual_total_val}({get_manual_actual_value}%)</td>  <td>{total_results}(100%)</td>
				</tr>	
                                 </table>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
            ''').format(**locals())
    #------------------------------------Summary Information End------------------------------------
    # Manual Outcome   block started
    not_applicable_length = []
    #----------------------------Manual Information displayed with the help of HTML----------------------------------------------
    if manual_total_val > 0:
        html = html + '''
		    <tr class="table_head1 result_class_hide" id="manual_header_id">
                                <td colspan="2">Needs manual intervention </td></tr>
                <tr>
                    <td colspan="2">
			<table class="table result_class_hide" cellspacing="0" width="100%" style="text-align:left" id="manual_cont_id">
			<thead>
            			<tr class="tr_heading">
                			<th  style="width:76px;text-align:left !important">Rule No</th>
                			<th style="width: 88px;text-align:left !important">Severity</th>
                			<th style="padding-left: 6px;">Description</th>
            			</tr>
        		</thead>
                    '''
        i = 0
        for rule in sorted(RuleSetList['manual'].itervalues()):
            rule_id = rule['rule']
            rule_num = rule_id.replace('V-', '')
            disaOsName = getDisaOsName(osName)
            rule_fix = loadrules.showFix(rule_num, disaOsName)
            severity = loadrules.getSeverity(rule_num, disaOsName)
            if 'high' in severity:
                severity = '<span style="background-color: #f2dede;border-color:#ebccd1;color: #a94442;padding: 2px 10px 3px 7px;">' + str(
                    severity).replace('high', 'High') + '</span>'
            if 'medium' in severity:
                severity = '<span style="background-color: #fcf8e3;border-color:#faebcc;color: #8a6d3b;padding: 2px 10px 3px 7px;">' + str(
                    severity).replace('medium', 'Medium') + '</span>'
            if 'low' in severity:
                severity = '<span style="background-color: #dff0d8;border-color:#d6e9c6;color: #3c763d;padding: 2px 10px 3px 7px;">' + str(
                    severity).replace('low', 'Low') + '</span>'
            # print severity
            manual_rule_line = str(rule_fix).replace('\n', '</p><p>')
            rule_console_list = re.split('\n',
                                         rule['console'].replace("=================================================",
                                                                 ''))
            rule_console = ''
            for row in rule_console_list:
                if row:
                    # rule_console = rule_console+row+"<br/>"
                    rule_console = rule_console + row + '\n'
                    if 'N/A' in rule_console:
                        not_applicable_length.append(rule_console)
                        #	manual_rule_line = 'This rule is not applicable.'
            rule_cons = rule_console.replace('\n', '</p><p>')
            rule_status = rule['status']
            rule_title = ruleProfileList[rule['rule']]
            if 'N/A' not in rule_console:
                html = html + ('''
            <tr>
                <td class="rule_font">{rule_id}</td>
                <td align="center">{severity}</td>
                <td>
		<div style="margin-top: -14px;">
		 <p class="rule_title" >{rule_title}</p>
		</div>
		<div class="rule_hide_cons">	
		<p class="rule_console" id="manual_rule_cons">{rule_cons}</p>
                            <p class="rule_title" id="manual_rule_cons1"><span style="background-color:#ccc;text-align:center;text-decoration:underline dotted;">Recommended Fix({os}):</span></p><p class="rule_console" style="margin-top: -13px;">{manual_rule_line}</p>
		</div>
		</td>
            </tr>
                        ''').format(**locals())
                i = i + 1
        html = html + '''
                        </table>
                    </td>
                </tr>
                '''
    #-----------------------------manual End-------------------------------------------------
    #----------------------------Failed Information displayed with the help of HTML----------------------------------------------
    # failed outcome
    if failed_total_val > 0:
        html = html + '''
                <tr class="table_head1 result_class_hide" id="failed_header_id">
                                <td colspan="2">Failed</td>
                            </tr>
                <tr>
                    <td colspan="2">
                     <table class="table result_class_hide" cellspacing="0" width="100%" style="text-align:left" id="failed_cont_id">
                        <thead>
                                <tr class="tr_heading">
                                        <th class="header" style="width:76px;text-align: left !important;vertical-align:middle;">Rule No</th>
                                        <th class="header" style="width:88px;text-align: left !important;vertical-align:middle;">Severity</th>
                                        <th class="header" style="padding-left:6px;">Description</th>
                                </tr>
                        </thead>
                    '''
        for rule in sorted(RuleSetList['failed'].itervalues()):
            rule_id = rule['rule']
            rule_num = rule_id.replace('V-', '')
            disaOsName = getDisaOsName(osName)
            severity = loadrules.getSeverity(rule_num, disaOsName)
            if 'high' in severity:
                severity = '<span style="background-color: #f2dede;border-color:#ebccd1;color: #a94442;padding: 2px 10px 3px 7px;">' + str(
                    severity).replace('high', 'High') + '</span>'
            if 'medium' in severity:
                severity = '<span style="background-color: #fcf8e3;border-color:#faebcc;color: #8a6d3b;padding: 2px 10px 3px 7px;">' + str(
                    severity).replace('medium', 'Medium') + '</span>'
            if 'low' in severity:
                severity = '<span style="background-color: #dff0d8;border-color:#d6e9c6;color: #3c763d;padding: 2px 10px 3px 7px;">' + str(
                    severity).replace('low', 'Low') + '</span>'
            rule_fix = loadrules.showFix(rule_num, disaOsName)
            try:
                failed_rule_line = str(rule_fix).replace('\n', '</p><p>')
            except:
                pass
            rule_console_list = re.split('\n',
                                         rule['console'].replace("=================================================",
                                                                 ''))
            rule_console = ''
            for row in rule_console_list:
                if row:
                    rule_console = rule_console + row + "\n"
                    if 'N/A' in rule_console:
                        failed_rule_line = 'This rule is not applicable.'
            rule_cons = rule_console.replace("\n", "</p><p>")
            rule_status = rule['status']
            rule_title = ruleProfileList[rule['rule']]
            html = html + ('''
            <tr>
                <td class="rule_font">{rule_id}</td>
                <td align="center">{severity}</td>
                <td>
		<div>
		<p class="rule_title">{rule_title}</p></div><div class="rule_hide_cons"><p class="rule_console" style="width:500px;">{rule_cons}</p>
                            <p class="rule_title" style="border: medium none;"><span style="background-color:#ccc;text-align: center;text-decoration:underline dotted;">Recommended Fix({os}):</span></p><p class="rule_console" style="margin-top: -13px;">{failed_rule_line}</p></div>
</td>
            </tr>
             ''').format(**locals())
        html = html + '''
                        </table>
                    </td>
                </tr>
                '''
    # Successful Outcome
    #-------------------------Failed End----------------------------------
    #----------------------------Successful Information displayed with the help of HTML----------------------------------------------
    if success_total_val > 0:
        html = html + '''
                <tr class="table_head1 result_class_hide" id="success_header_id">
                                <td colspan="2">Successful</td>
                            </tr>
                	<tr>
                    <td colspan="2">
			<table class="table result_class_hide" cellspacing="0" width="100%" style="text-align:left" id="success_cont_id">
                        <thead>
                                <tr class="tr_heading">
                                        <th class="header" style="width:76px;text-align: left !important;vertical-align:middle;">Rule No</th>
                                        <th class="header" style="width:88px;text-align: left !important;vertical-align:middle;">Severity</th>
                                        <th class="header" style="padding-left:6px;">Description</th>
                                </tr>
                        </thead>
                        '''
        for rule in sorted(RuleSetList['successful'].itervalues()):
            rule_id = rule['rule']
            rule_num = rule_id.replace('V-', '')
            disaOsName = getDisaOsName(osName)
            severity = loadrules.getSeverity(rule_num, disaOsName)
            if 'high' in severity:
                severity = '<span style="background-color: #f2dede;border-color:#ebccd1;color: #a94442;padding: 2px 10px 3px 7px;">' + str(
                    severity).replace('high', 'High') + '</span>'
            if 'medium' in severity:
                severity = '<span style="background-color: #fcf8e3;border-color:#faebcc;color: #8a6d3b;padding: 2px 10px 3px 7px;">' + str(
                    severity).replace('medium', 'Medium') + '</span>'
            if 'low' in severity:
                severity = '<span style="background-color: #dff0d8;border-color:#d6e9c6;color: #3c763d;padding: 2px 10px 3px 7px;">' + str(
                    severity).replace('low', 'Low') + '</span>'
            rule_console_list = re.split('\n',
                                         rule['console'].replace("=================================================",
                                                                 ''))
            rule_console = ''
            for row in rule_console_list:
                if row:
                    rule_console = rule_console + row + "\n"
            rule_cons = str(rule_console).replace('\n', '</p><p>')
            rule_status = rule['status']
            rule_title = ruleProfileList[rule['rule']]
            html = html + ('''
                 <tr>
                <td class="rule_font">{rule_id}</td>
                <td align="center">{severity}</td>
               <td><div stye="margin-top:-14px;"><p class="rule_title">{rule_title}</p></div><div class="rule_hide_cons"><p class="rule_console" style="width:500px;">{rule_cons}</p></div>
              </td>
            </tr>		
                        ''').format(**locals())
        html = html + '''
                        </table>
                    </td>
                </tr>
                '''
    #----------------------------Successful End----------------------------------------------
    #----------------------------Not Applicable Information displayed with the help of HTML----------------------------------------------
    if len(not_applicable_length) > 0:
        html = html + '''
		   <tr class="table_head1 result_class_hide" id="not_header_id">
                                <td colspan="2">Not Applicable</td></tr>
                <tr>
                    <td colspan="2">
			<table class="table result_class_hide" cellspacing="0" width="100%" style="text-align:left" id="not_cont_id">
			<thead>
            			<tr class="tr_heading">
                			<th  style="width:76px;text-align:left !important">Rule No</th>
                			<th style="width: 88px;text-align:left !important">Severity</th>
                			<th style="padding-left: 6px;">Description</th>
            			</tr>
        		</thead>
                    '''
        for rule in sorted(RuleSetList['manual'].itervalues()):
            rule_id = rule['rule']
            rule_num = rule_id.replace('V-', '')
            disaOsName = getDisaOsName(osName)
            rule_fix = loadrules.showFix(rule_num, disaOsName)
            severity = loadrules.getSeverity(rule_num, disaOsName)
            if 'high' in severity:
                severity = '<span style="background-color: #f2dede;border-color:#ebccd1;color: #a94442;padding: 2px 10px 3px 7px;">' + str(
                    severity).replace('high', 'High') + '</span>'
            if 'medium' in severity:
                severity = '<span style="background-color: #fcf8e3;border-color:#faebcc;color: #8a6d3b;padding: 2px 10px 3px 7px;">' + str(
                    severity).replace('medium', 'Medium') + '</span>'
            if 'low' in severity:
                severity = '<span style="background-color: #dff0d8;border-color:#d6e9c6;color: #3c763d;padding: 2px 10px 3px 7px;">' + str(
                    severity).replace('low', 'Low') + '</span>'
            # print severity
            manual_rule_line = str(rule_fix).replace('\n', '</p><p>')
            rule_console_list = re.split('\n',
                                         rule['console'].replace("=================================================",
                                                                 ''))
            rule_console = ''
            for row in rule_console_list:
                if row:
                    # rule_console = rule_console+row+"<br/>"
                    rule_console = rule_console + row + '\n'
                    if 'N/A' in rule_console:
                        manual_rule_line = 'This rule is not applicable.'
                        rule_cons = rule_console.replace('\n', '</p><p>')
                        rule_status = rule['status']
                        rule_title = ruleProfileList[rule['rule']]
                        # arr_length.append(rule_title)
                        # print "RULE TITLE:::"+str(arr_length)
                        html = html + ('''
            <tr>
                <td class="rule_font">{rule_id}</td>
                <td align="center">{severity}</td>
                <td>
		<div style="margin-top: -14px;">
		 <p class="rule_title" style="border:none;">{rule_title}</p></div>
		</td>
            </tr>
			
                        ''').format(**locals())
        html = html + '''
                        </table>
                    </td>
                </tr>
                '''
    #-----------------------Not Applicable End--------------------------
    #----------------------------Cron Job information displayed with the help of HTML----------------------------------------------
    cron_list = getCronJobs(userid)
    cron_list_html = '';
    for cron in cron_list:
        cron_dict = ast.literal_eval(cron)  # str to dictionay conversion
        if (cron_dict['ip'] == usernameIP):
            cron_list_html = cron_list_html + '<tr><td>' + cron_dict['profile'] + '</td>'
            cron_list_html = cron_list_html + '<td>' + cron_dict['frequency'].capitalize() + '</td>'
            cron_list_html = cron_list_html + '<td>' + cron_dict['nextrun'] + '</td></tr>'

    if (cron_list_html):
        html = html + ('''
                <tr id="cron_head_cont">
                    <td colspan="2">
                        <table border="0" cellspacing="0" cellpadding="0" width="700" class="cron_list">
                            <tbody>
                            <tr class="table_head1">
                                <td colspan="3">Cron Job Details </td>
                            </tr>
                            <tr class="table_head2">
                                <td>Profile</td>
                                <td>Frequency</td>
                                <td>Next Run</td>
                            </tr>
                            {cron_list_html}
                            </tbody>
                        </table>
                    </td>
                </tr>
                        ''').format(**locals())

    #----------------------------Cron job End----------------------------------------------
    #----------------------------Displayed Last 10 Execution----------------------------------------------
    archiveLogFileNameList = display_execution_time_list(userid, usernameIP);
    archiveLogFileNameListHtml = '';
    i = 0;
    for archiveLogFileName in archiveLogFileNameList:
        i = i + 1
        if (i == 11):
            break
        archiveLogFileNameListHtml = archiveLogFileNameListHtml + '<tr><td>' + str(
            i) + '</td><td>' + archiveLogFileName + '</td></tr>'

    if (archiveLogFileNameListHtml):
        html = html + ('''
               <tr id="last_exec_cont">
                    <td colspan="2">
                        <table border="0" cellspacing="0" cellpadding="0" width="700" class="archive_log_fileName">
                            <tbody>
                            <tr class="table_head1">
                                <td colspan="2">Last compliance execution histories (Maximum 10 Logs will be displayed)</td>
                            </tr>
                            <tr class="table_head2">
                                <td style="width: 100px;">Sr.</td>
                                <td>Execution Time</td>
                            </tr>
                            {archiveLogFileNameListHtml}
                        </table>
                    </td>
                </tr>
                ''').format(**locals())
    # table body ends
    return html
    #----------------------------Last 10 Execution End----------------------------------------------
#--------This function is used for displaying the information in difference tab.----------------------
def get_Summary_ComparisionReport(parameter_dict):
    usernameIP = parameter_dict['usernameIP']
    userid = parameter_dict['userid']
    print "userid === "+str(userid)
    ip_details_data = ast.literal_eval(getIPDetails(usernameIP))
    host_machine = ip_details_data['hostname']
    os = ip_details_data['os'] + ' Release ' + ip_details_data['os_version']
    osName = ip_details_data['os'].lower()
    profilename = parameter_dict['profilename']
    archieveLogTimestamp = parameter_dict['archieveLogTimestamp']
    archieveLogTimestampGmt = parameter_dict['archieveLogTimestampGmt']
    archieveLogCurrentTimestampGmt = parameter_dict['archieveLogCurrentTimestampGmt']
    #    archieveLogFirst = parameter_dict['archieveLogFirst']

    #----- Start new changes ----------#
    timeStamp_T1 = parameter_dict['timeStamp_T1']
    timeStamp_T2 = parameter_dict['timeStamp_T2']
    selectedTime_T1 = parameter_dict['selectedTime_T1']
    selectedTime_T2 = parameter_dict['selectedTime_T2']
    Lflag = parameter_dict['Lflag']
    Rflag = parameter_dict['Rflag']
    #----- End new changes ----------#

    if(Lflag=='true'):
        showrun_obj_latest_tmp = showrun(userid, usernameIP, '')
    else:
        showrun_obj_latest_tmp = showrun(userid, usernameIP, timeStamp_T1)
    get_latest_run = showExecutionStatus(usernameIP)
    get_latest_run_time = get_latest_run[get_latest_run.find(':')+1:get_latest_run.rfind('')]
    showrun_obj_latest_list = [x.encode('ascii') for x in showrun_obj_latest_tmp]
    #showrun_obj_passed_tmp = showrun(userid, usernameIP, archieveLogTimestamp)
    if(Rflag=='true'):
        showrun_obj_passed_tmp = showrun(userid, usernameIP, '')
    else:
        showrun_obj_passed_tmp = showrun(userid, usernameIP, timeStamp_T2)

    showrun_obj_passed_list = [x.encode('ascii') for x in showrun_obj_passed_tmp]

    # create report A dictionay
    reporta = defaultdict(dict)
    reporta_profile = ''
    reporta_exemode = ''
    codeversion_current = ''
    for report in showrun_obj_latest_list:
        report_dic = ast.literal_eval(report)  # str to dictionay conversion
        reporta_outcome_value =  report_dic['outcome']
        reporta[report_dic['rule']] = report_dic
        if reporta_profile == '':
            reporta_profile = report_dic['profile'].strip()
        if reporta_exemode == '':
            reporta_exemode = report_dic['exemode'].strip()
        reporta_status = report_dic['status'].strip()
        if 'ABORTED' in reporta_status:
            reporta_check_status = '('+reporta_status+')'
        else:
            reporta_check_status = ''
        if codeversion_current == '':
            if report_dic.has_key('codeversion'):
                codeversion_current = (report_dic['codeversion'].strip()).title()
            else:
                codeversion_current = previouscodeversion

    reportb = defaultdict(dict)
    reportb_profile = ''
    reportb_exemode = ''
    codeversion_archive = ''
    for report in showrun_obj_passed_list:
        report_dic = json.loads(report)  # str to dictionay conversion
        reportb_outcome_value =  report_dic['outcome']
        reportb[report_dic['rule']] = report_dic
        if reportb_profile == '':
            reportb_profile = report_dic['profile'].strip()
        if reportb_exemode == '':
            reportb_exemode = report_dic['exemode'].strip()
        reportb_status = report_dic['status'].strip()
        if 'ABORTED' in reportb_status:
            reportb_check_status = '('+reportb_status+')'
        else:
            reportb_check_status = ''
        if codeversion_archive == '':
            if report_dic.has_key('codeversion'):
                codeversion_archive = (report_dic['codeversion'].strip()).title()
            else:
                codeversion_archive = previouscodeversion

    exemode_a = 'Manual Remediation' if (reporta_exemode == '0') else 'Automatic Remediation'
    exemode_b = 'Manual Remediation' if (reportb_exemode == '0') else 'Automatic Remediation'
    rules_same_result = defaultdict(dict)
    rules_different_result = defaultdict(dict)
    rules_uncommon_result = defaultdict(dict)
    for rule_key, rule_val in reporta.items():
        if rule_key in reportb:
            reportb_val = reportb.get(rule_key)
            if ((reportb_val['outcome'] == rule_val['outcome'])):
                rules_same_result[rule_key] = rule_val
            else:
                rules_different_result[rule_key]['reporta'] = rule_val;
                rules_different_result[rule_key]['reportb'] = reportb_val;
        else:
            rules_uncommon_result[rule_key] = rule_val

    for rule_key, rule_val in reportb.items():
        if rule_key in reporta:
            reporta_val = reporta.get(rule_key)
            if (reporta_val['outcome'] == rule_val['outcome']):
                rules_same_result[rule_key] = rule_val
            else:
                rules_different_result[rule_key]['reporta'] = reporta_val;
                rules_different_result[rule_key]['reportb'] = rule_val;
        else:
            rules_uncommon_result[rule_key] = rule_val

    # To remove the empty key which has inaccessible value.
    rules_uncommon_result = {key: value for key, value in rules_uncommon_result.iteritems()
                             if len(key) != 0 and rules_uncommon_result[key] != 'INACCESSIBLE'}

    # create report A dictionay
    rules_same_result_len = len(rules_same_result)
    rules_different_result_len = len(rules_different_result)
    rules_uncommon_result_len = len(rules_uncommon_result)
    rules_total = rules_same_result_len + rules_different_result_len + rules_uncommon_result_len
    report_b_archieve_log_timestamp_obj = datetime.datetime.strptime(
        str(archieveLogTimestamp).split('GMT')[0].strip(' '), '%a, %d %b %Y  %H:%M:%S')
    report_b_archieve_log_timestamp = datetime.datetime.strftime(report_b_archieve_log_timestamp_obj,
                                                                 '%a, %d %b %H:%M:%S %Y ')
    # create summary report
    if rules_uncommon_result_len > 0:
        rules_uncommon_result_value = str(rules_uncommon_result_len) + ' ' + '&nbsp;''rule(s) with single report,'
    else:
        rules_uncommon_result_value = ''
    if rules_same_result_len > 0:
        rules_same_result_value = str(rules_same_result_len) + '&nbsp;' 'rules with same results.'
    else:
        rules_same_result_value = ''
    if rules_different_result_len > 0:
        rules_different_result_value = str(rules_different_result_len) + '&nbsp;''rules with different results,'
    else:
        rules_different_result_value = ''
    total_rules_get = (rules_different_result_value+rules_uncommon_result_value+rules_same_result_value)
    total_rules_count = str(rules_total)+' ' + "Total rules("+str(total_rules_get)+")"
    dict_val = {'os':osName,'os_version':os,'reporta_profile':reporta_profile,'reportb_profile':reportb_profile,'timeStamp_T1':selectedTime_T1,'timeStamp_T2':selectedTime_T2,'reporta_execution_mode':exemode_a,'reportb_execution_mode':exemode_b,'reporta_code_version':codeversion_current,'reportb_code_version':codeversion_archive,'reporta_check_status':reporta_check_status,'reportb_check_status':reportb_check_status,'total_rules_count':total_rules_count,'reportb_dic_outcome':str(reportb_outcome_value),'reporta_dic_outcome':str(reporta_outcome_value),'host_name':host_machine}
    print dict_val
    if (dict_val !={}):
        return dict_val
    else:
        return False
#--------End.----------------------
# Get Comparision report html
def getComparisionReport(parameter_dict):
    #---------------------Below code displaying the Comparison summary report-------------------
    latest_mode1 = ''
    latest_mode2 = ''
    usernameIP = parameter_dict['usernameIP']
    profilename = parameter_dict['profilename']
    archieveLogTimestamp = parameter_dict['archieveLogTimestamp']
    archieveLogTimestampGmt = parameter_dict['archieveLogTimestampGmt']
    archieveLogCurrentTimestampGmt = parameter_dict['archieveLogCurrentTimestampGmt']
    #    archieveLogFirst = parameter_dict['archieveLogFirst']
    userid = parameter_dict['userid']
    timeStamp_T1 = parameter_dict['timeStamp_T1']
    timeStamp_T2 = parameter_dict['timeStamp_T2']
    selectedTime_T1 = parameter_dict['selectedTime_T1']
    selectedTime_T2 = parameter_dict['selectedTime_T2']
    Lflag = parameter_dict['Lflag']
    Rflag = parameter_dict['Rflag']
    total_rules_diff_count = ''
    ip_details_data = eval(getIPDetails(usernameIP))
    host_machine = ip_details_data['hostname']
    os = ip_details_data['os'] + ' Release ' + ip_details_data['os_version']
    osName = ip_details_data['os'].lower()

    if(Lflag=='true'):
        latest_mode1 = '(latest)'
        showrun_obj_latest_tmp = showrun(userid, usernameIP, '')
    else:
        showrun_obj_latest_tmp = showrun(userid, usernameIP, timeStamp_T1)
        latest_mode1 = ""

    showrun_obj_latest_list = [x.encode('ascii') for x in showrun_obj_latest_tmp]

    if(Rflag=='true'):
        latest_mode2 = '(latest)'
        showrun_obj_passed_tmp = showrun(userid, usernameIP, '')
    else:
        showrun_obj_passed_tmp = showrun(userid, usernameIP, timeStamp_T2)
        latest_mode2 = ''

    showrun_obj_passed_list = [x.encode('ascii') for x in showrun_obj_passed_tmp]
    # create report A dictionay
    reporta = defaultdict(dict)
    reporta_profile = ''
    reporta_exemode = ''
    codeversion_current = ''
    for report in showrun_obj_latest_list:
        report_dic = ast.literal_eval(report)  # str to dictionay conversion
        reporta[report_dic['rule']] = report_dic
        if reporta_profile == '':
            reporta_profile = report_dic['profile'].strip()
        if reporta_exemode == '':
            reporta_exemode = report_dic['exemode'].strip()
        reporta_status = report_dic['status'].strip()
        if 'ABORTED' in reporta_status:
            reporta_check_status = '('+reporta_status+')'
        else:
            reporta_check_status = ''
        if(selectedTime_T1 =='Latest Execution'):
            reporta_check_status = '(<font color="orange">Inprogress</font>)'
        else:
            reporta_check_status = reporta_check_status
        if codeversion_current == '':
            if report_dic.has_key('codeversion'):
                codeversion_current = (report_dic['codeversion'].strip()).title()
            else:
                codeversion_current = previouscodeversion

    reportb = defaultdict(dict)
    reportb_profile = ''
    reportb_exemode = ''
    codeversion_archive = ''
    for report in showrun_obj_passed_list:
        report_dic = ast.literal_eval(report)  # str to dictionay conversion
        reportb[report_dic['rule']] = report_dic
        if reportb_profile == '':
            reportb_profile = report_dic['profile'].strip()
        if reportb_exemode == '':
            reportb_exemode = report_dic['exemode'].strip()
        reportb_status = report_dic['status'].strip()
        if 'ABORTED' in reportb_status:
            reportb_check_status = '('+reportb_status+')'
        else:
            reportb_check_status = ''
        if(selectedTime_T2 =='Latest Execution'):                                                                                                     
            reportb_check_status = '(<font color="orange">Inprogress</font>)'                                                                         
                                                                                                                                                      
        else:                                                                                                                                         
            reportb_check_status = reportb_check_status   
        if codeversion_archive == '':
            if report_dic.has_key('codeversion'):
                codeversion_archive = (report_dic['codeversion'].strip()).title()
            else:
                codeversion_archive = previouscodeversion

    exemode_a = 'Manual Remediation' if (reporta_exemode == '0') else 'Automatic Remediation'
    exemode_b = 'Manual Remediation' if (reportb_exemode == '0') else 'Automatic Remediation'
    rules_same_result = defaultdict(dict)
    rules_different_result = defaultdict(dict)
    rules_uncommon_result = defaultdict(dict)
    # create common,diffrent and present in one report rules dictionay
    for rule_key, rule_val in reporta.items():
        if rule_key in reportb:
            reportb_val = reportb.get(rule_key)
            if ((reportb_val['outcome'] == rule_val['outcome'])):
                rules_same_result[rule_key] = rule_val
            else:
                rules_different_result[rule_key]['reporta'] = rule_val;
                rules_different_result[rule_key]['reportb'] = reportb_val;
        else:
            rules_uncommon_result[rule_key] = rule_val

    for rule_key, rule_val in reportb.items():
        if rule_key in reporta:
            reporta_val = reporta.get(rule_key)
            if (reporta_val['outcome'] == rule_val['outcome']):
                rules_same_result[rule_key] = rule_val
            else:
                rules_different_result[rule_key]['reporta'] = reporta_val;
                rules_different_result[rule_key]['reportb'] = rule_val;
        else:
            rules_uncommon_result[rule_key] = rule_val

    # To remove the empty key which has inaccessible value.
    rules_uncommon_result = {key: value for key, value in rules_uncommon_result.iteritems()
                             if len(key) != 0 and rules_uncommon_result[key] != 'INACCESSIBLE'}
    # create report A dictionay
    rules_same_result_len = len(rules_same_result)
    rules_different_result_len = len(rules_different_result)
    rules_uncommon_result_len = len(rules_uncommon_result)
    rules_total = rules_same_result_len + rules_different_result_len + rules_uncommon_result_len

    report_b_archieve_log_timestamp_obj = datetime.datetime.strptime(
        str(archieveLogTimestamp).split('GMT')[0].strip(' '), '%a, %d %b %Y  %H:%M:%S')
    report_b_archieve_log_timestamp = datetime.datetime.strftime(report_b_archieve_log_timestamp_obj,
                                                                 '%a, %d %b %H:%M:%S %Y ')
    #------------------------Summary Difference Code End ----------------------
    # create summary report
    if rules_uncommon_result_len > 0:
        rules_uncommon_result_value = str(rules_uncommon_result_len) + ' ' + '&nbsp;''rule(s) with single report,'
    else:
        rules_uncommon_result_value = ''
    if rules_same_result_len > 0:
        rules_same_result_value = str(rules_same_result_len) + '&nbsp;' 'rules with same results.'
    else:
        rules_same_result_value = ''
    if rules_different_result_len > 0:
        rules_different_result_value = str(rules_different_result_len) + '&nbsp;''rules with different results,'
    else:
        rules_different_result_value = ''
    #-----------------------------Summary Html code start------------------
    summary_report = ('''
            <tr>
            <td colspan="2">
                <table  border="0" cellspacing="0" cellpadding="0" width="100%" class="summary_table" style="border:1px solid #ccc;">
                    <tbody>
                    <tr class="table_head1" style="border: 1px solid #ccc;">
                        <th rowspan="2" style="text-align:center;">Summary</th>
                        <th colspan="4" style="text-align:center;">Comparison Report</th>
                    </tr>
                    <tr class="table_head2" style="border: 1px solid #ccc;">
                        <td>Report A'''+latest_mode1+'''</td>
                        <td>Report B'''+latest_mode2+'''</td>
                    </tr>
                    <tr style="border: 1px solid #ccc;">
                        <td id="tdhst" style="width:188px;"><b>Hostname</b></td>
                        <td id="hosta" style="width: 285px;">{host_machine}</td>
                        <td id="hostb" style="width: 285px;">{host_machine}</td>
                    </tr>
                    <tr>
                        <td><b>Operating System</b></td>
                        <td>{os}</td>
                        <td>{os}</td>
                    </tr>
                    <tr>
                        <td><b>Profile</b></td>
                        <td>{reporta_profile}</td>
                        <td>{reportb_profile}</td>
                    </tr><tr>
                        <td><b>Executed on</b></td>
                        <td style="width:314px;">{selectedTime_T1}{reporta_check_status}</td>
                        <td style="width:314px;">{selectedTime_T2}{reportb_check_status}</td>
                    </tr>
                    <tr>
                        <td><b>Execution Mode</b></td>
                        <td>{exemode_a}</td>
                        <td>{exemode_b}</td>
                    </tr>
                    <tr>
                        <td><b>Code Version</b></td>
                        <td>{codeversion_current}</td>
                        <td>{codeversion_archive}</td>
                    </tr>
                    <tr>
                        <td><b>Results</b></td>
                        <td colspan="3"> {rules_total} total rules({rules_different_result_value}{rules_uncommon_result_value} {rules_same_result_value})</td>
                    </tr>
                </tbody>
            </table>
        </td>
        </tr>
        ''').format(**locals());
    ruleTitle_obj_a = ruleTitleOnly(reporta_profile, osName)
    ruleTitle_obj_b = ruleTitleOnly(reportb_profile, osName)
    ruleTitle_obj = ruleTitle_obj_a.copy()
    ruleTitle_obj.update(ruleTitle_obj_b)

    #-----------------------------Summary Html code End------------------
    #----------------------------Rules with same result code Satrt here -------------------------------------
    rules_same_result_middle_html = ''
    for rule_key, rule_val in rules_same_result.items():
        rule_title = ruleTitle_obj[rule_key]
        rule_outcome = rule_val['outcome'].capitalize()

        rule_num = rule_key.replace('V-', '')
        disaOsName = getDisaOsName(osName)
        severity = loadrules.getSeverity(rule_num, disaOsName)
        if 'high' in severity:
            severity = '<span style="background-color: #f2dede;border-color:#ebccd1;color: #a94442;padding: 2px 10px 3px 7px;">' + str(
                severity).replace('high', 'High') + '</span>'
        if 'medium' in severity:
            severity = '<span style="background-color: #fcf8e3;border-color:#faebcc;color: #8a6d3b;padding: 2px 10px 3px 7px;">' + str(
                severity).replace('medium', 'Medium') + '</span>'
        if 'low' in severity:
            severity = '<span style="background-color: #dff0d8;border-color:#d6e9c6;color: #3c763d;padding: 2px 10px 3px 7px;">' + str(
                severity).replace('low', 'Low') + '</span>'

        rule_check = loadrules.showRule(rule_num, disaOsName)
        rule_check_desc = rule_check.replace('\n', '</p><p>')
        rule_fix = loadrules.showFix(rule_num, disaOsName)
        fix_rule = rule_fix.replace('\n', '</p><p>')
        rules_same_result_middle_html = rules_same_result_middle_html + ('''
        <tr>
	<td class="rule_font">{rule_key}</td>
	<td align="center">{severity}</td>
            <td style="width:1305px;">
                <a href="#" data-featherlight="#rule_desc_{rule_num}">{rule_title}</a>
                <div id="rule_desc_{rule_num}" class="rule_desc">
                    <div class="rule_desc_title">Description: Rule V-{rule_num}</div>
                    <div class="check_description">
			<span style="color:#6b6a6a;font-weight:bold;">Severity</span> - <b>{severity}</b>
                        <h2 style="margin-top: 19px;">Check Description:</h2>
                        <p>{rule_check_desc}</p>
                    </div>
                    <div class="fix_description">
                        <h2>Fix Description:</h2>
                        <p>{fix_rule}</p>
                    </div>
                <div>
            </td>
            <td style="width:217px;">{rule_outcome}</td>
        </tr>
        ''').format(**locals());

    if not rules_same_result_middle_html:
        rules_same_result_html = '';
    else:
        rules_same_result_html = ('''
        <tr class="table_head1" style="border:1px solid #ccc;"><th colspan="2" style="text-align:center;">Rules with same result</th></tr>
        <tr>
        <td colspan="2">
		<table id="example" class="table table-striped table-bordered" cellspacing="0" width="100%">	
                 <thead>
                                <tr class="tr_heading">
                                        <th class="header" style="width:139px;text-align: left !important;">Rule No</th>
                                        <th class="header" style="width:139px;text-align: left !important;">Severity</th>
                                        <th class="header" style="padding-left:6px;">Rule(s)</th>
                                        <th class="header" style="width:139px;text-align: left !important;">Result</th>
                                </tr>
                  </thead>
                {rules_same_result_middle_html}
            </table>
        </td></tr>
        ''').format(**locals());

    #-----------------------------Rules with same Result code End here------------------
    #-----------------------------Rules with different Result code start here------------------
    rules_different_result_middle_html = ''
    for rule_key, rule_val in rules_different_result.items():
        rule_title = ruleTitle_obj[rule_key]
        rule_outcome_a = rule_val['reporta']['outcome'].capitalize()
        rule_outcome_b = rule_val['reportb']['outcome'].capitalize()
        rule_num = rule_key.replace('V-', '')
        disaOsName = getDisaOsName(osName)
        severity = loadrules.getSeverity(rule_num, disaOsName)
        if 'high' in severity:
            severity = '<span style="background-color: #f2dede;border-color:#ebccd1;color: #a94442;padding: 2px 10px 3px 7px;">' + str(
                severity).replace('high', 'High') + '</span>'
        if 'medium' in severity:
            severity = '<span style="background-color: #fcf8e3;border-color:#faebcc;color: #8a6d3b;padding: 2px 10px 3px 7px;">' + str(
                severity).replace('medium', 'Medium') + '</span>'
        if 'low' in severity:
            severity = '<span style="background-color: #dff0d8;border-color:#d6e9c6;color: #3c763d;padding: 2px 10px 3px 7px;">' + str(
                severity).replace('low', 'Low') + '</span>'

        rule_check = loadrules.showRule(rule_num, disaOsName)
        rule_check_desc = rule_check.replace('\n', '</p><p>')
        rule_fix = loadrules.showFix(rule_num, disaOsName)
        fix_rule = rule_fix.replace('\n', '</p><p>')
        rules_different_result_middle_html = rules_different_result_middle_html + ('''
        <tr>  
	<td class="rule_font">{rule_key}</td>
	<td align="center">{severity}</td>
            <td style="width:1305px;">
		 <a href="#" data-featherlight="#rule_desc_{rule_num}">{rule_title}</a>
                <div id="rule_desc_{rule_num}" class="rule_desc">
                    <div class="rule_desc_title">Description: Rule V-{rule_num}</div>
                    <div class="check_description">
			<span style="color:#6b6a6a;font-weight:bold;">Severity</span> - <b>{severity}</b>
                        <h2>Check Description:</h2>
                        <p>{rule_check_desc}</p>
                    </div>
                    <div class="fix_description">
                        <h2>Fix Description:</h2>
                        <p>{fix_rule}</p>
                    </div>
                <div>
            </td>
            <td style="width:100px;">{rule_outcome_a}</td>
            <td style="width:100px;">{rule_outcome_b}</td>
        </tr>
        ''').format(**locals());

    if not rules_different_result_middle_html:
        rules_different_result_html = '';
    else:
        rules_different_result_html = ('''
        <tr class="table_head1" style="border: 1px solid #ccc;"><th colspan="2" style="text-align:center;">Rules with different result</th></tr>
        <tr>
        <td colspan="2">
	<table class="table table-striped table-bordered" cellspacing="0" width="100%">
	<thead>
                <tr class="tr_heading">
	<th rowspan="2"  style="width:145px;">Rule No</th><th rowspan="2">Severity&nbsp;&nbsp;</th><th rowspan="2" style="border: 1px solid #ccc;" >Rule(s)</th><td colspan="2" style="border: 1px solid #ccc;text-align:center;"><b>Results</b></td></tr>
                <tr style="border: 1px solid #ccc;"><th style="border-right: 1px solid rgb(204, 204, 204);text-align: left ! important; width: 157px;">Report-A</th><th style="text-align:left ! important; width: 157px;">Report-B</th></tr>
	</thead>	
                {rules_different_result_middle_html}
            </table>
        </td>
        </tr>
    ''').format(**locals());
    #-----------------------------Rules with different Result code End here------------------
    #-----------------------------Rules with Single code start here------------------
    rules_uncommon_result_middle_html = ''
    for rule_key, rule_val in rules_uncommon_result.items():
        rule_title = ruleTitle_obj[rule_key]
        rule_num = rule_key.replace('V-', '')
        disaOsName = getDisaOsName(osName)
        severity = loadrules.getSeverity(rule_num, disaOsName)
        if 'high' in severity:
            severity = '<span style="background-color: #f2dede;border-color:#ebccd1;color: #a94442;padding: 2px 10px 3px 7px;">' + str(
                severity).replace('high', 'High') + '</span>'
        if 'medium' in severity:
            severity = '<span style="background-color: #fcf8e3;border-color:#faebcc;color: #8a6d3b;padding: 2px 10px 3px 7px;">' + str(
                severity).replace('medium', 'Medium') + '</span>'
        if 'low' in severity:
            severity = '<span style="background-color: #dff0d8;border-color:#d6e9c6;color: #3c763d;padding: 2px 10px 3px 7px;">' + str(
                severity).replace('low', 'Low') + '</span>'
        rule_check = loadrules.showRule(rule_num, disaOsName)
        rule_check_desc = rule_check.replace('\n', '</p><p>')
        rule_fix = loadrules.showFix(rule_num, disaOsName)
        fix_rule = rule_fix.replace('\n', '</p><p>')
        rule_outcome = rule_val['outcome'].capitalize()
        rules_uncommon_result_middle_html = rules_uncommon_result_middle_html + ('''
        <tr>
	<td class="rule_font">{rule_key}</td>
	<td align="center">{severity}</td>
            <td style="width:1305px;">
		<a href="#" data-featherlight="#rule_desc_{rule_num}">{rule_title}</a>
                <div id="rule_desc_{rule_num}" class="rule_desc">
                    <div class="rule_desc_title">Description: Rule V-{rule_num}</div>
                    <div class="check_description">
			<span style="color:#6b6a6a;font-weight:bold;">Severity</span> - <b>{severity}</b>
                        <h2>Check Description:</h2>
                        <p>{rule_check_desc}</p>
                    </div>
                    <div class="fix_description">
                        <h2>Fix Description:</h2>
                        <p>{fix_rule}</p>
                    </div>
                <div>
            </td>
            <td style="width:217px;">{rule_outcome}</td>
        </tr>
        ''').format(**locals());
    if not rules_uncommon_result_middle_html:
        rules_uncommon_result_html = '';
    else:
        rules_uncommon_result_html = ('''
         <tr  class="table_head1"><th colspan="2" style="text-align:center;">Rules with single report</th></tr>
        <tr>
        <td colspan="2">
	<table id="example" class="table table-striped table-bordered" cellspacing="0" width="100%">
	<thead>
                <tr class="tr_heading">
                    <th style="width:139px;text-align: left !important;">Rule No</th>
                    <th  style="width:139px;text-align: left !important;">Severity</th>
                    <th  style="padding-left:6px;">Rule(s)</th>
                    <th  style="width:139px;text-align: left !important;">Results</th>
                </tr>
	</thead>
                {rules_uncommon_result_middle_html}
            </table>
        </td>
        </tr>
    ''').format(**locals());

    #-----------------------------Rules with Single code End here------------------
    #-----------------Combined the html information as per our priority---------------------------
    html = summary_report + rules_different_result_html + rules_uncommon_result_html + rules_same_result_html
    #------------------------------End------------------------------------------------
    return html


def get_system_address():
    arg='ip route list'
    ip=subprocess.Popen(arg,shell=True,stdout=subprocess.PIPE)
    data = ip.communicate()
    sdata = data[0].split()
    ipaddr = sdata[ sdata.index('src')+1 ]
    netdev = sdata[ sdata.index('dev')+1 ]
    return (ipaddr)

def date_format():
    cmd = commands.getoutput('date +"%Y%m%d%H%M%S"') 
    return cmd

def date_set():
    cmd = commands.getoutput('date +"%Y-%m-%d %H:%M:%S"') 
    return cmd

# Register new user and send acknowlagement mail to admin and user both
# @ key description
# activation  = 0 for admin review pending
# activation  = 1 for Email confirmation is pending
# activation  = 2 Account activated
def send_mail_old(receivers,bcc,firstname,lastname,phone,company,country,password=''):
    try:
        userInfo = {}
        rs = redis.Redis()
        get_date = date_format()
        pass_date_format = date_set()
        add_date = str(pass_date_format)
        remote_ip = get_system_address()
        date_hash = hashlib.md5(get_date).hexdigest()
        hash_cont = hashlib.md5(receivers).hexdigest()
        hash_value = str(hash_cont)+str(date_hash)
        userInfo['firstname'] = firstname
        userInfo['lastname'] = lastname
        userInfo['email'] = receivers
        userInfo['phone'] = phone
        userInfo['company'] = company
        userInfo['country'] = country
        userInfo['activation'] = 0
        userInfo['blocked'] = 0
        userInfo['admin'] = 0
        userInfo['period'] = ""
        userInfo['password'] = password
        userInfo['hash'] = hash_value
        userInfo['date'] = add_date
        rs.rpush("UserInfo", json.dumps(userInfo))
        # mail template start
        if (password !=''):
            url_content = "http://"+remote_ip+"/activate.html?email=" ""+receivers+"" "&hash=" ""+hash_value+"" 
            html = """
        <html>
          <head></head>
          <body>
                <p>Dear """+firstname+" "+lastname+""",<br><br>
                Thanks for your interest in Raxak Protect Security Compliance solution. <br>
                Click <a href="""+url_content+""">here</a> to activate CloudRaxak account.<br>
                Please contact us at sales@cloudraxak.com if you have any other questions.<br><br>
                The Cloud Raxak Team,<br>
                Simplifying and automating cloud security compliance.<br>
                www.cloudraxak.com<br>
                </p>
          </body>
        </html>
            """
        else:
            url_content = "http://"+remote_ip+"/change_password.html?email=" ""+receivers+"" "&hash=" ""+hash_value+""
            html = """ 
             <html>                                                                                                                                                 <head></head>                                                                                                                           
          <body>                                                                                                                                      
                <p>Dear """+firstname+" "+lastname+""",<br><br>                                                                                       
                Thanks for your interest in Raxak Protect Security Compliance solution. <br>                                                          
                Click <a href="""+url_content+""">here</a> to change password.<br>                                                        
                Please contact us at sales@cloudraxak.com if you have any other questions.<br><br>                                                    
                The Cloud Raxak Team,<br>                                                                                                             
                Simplifying and automating cloud security compliance.<br>                                                                             
                www.cloudraxak.com<br>                                                                                                                
                </p>                                                                                                                                  
          </body>                                                                                                                                     
        </html>               
            """
        sender = 'CloudRaxak Admin<admin@cloudraxak.com>' #TODO - need to decide sender cloudraxak ID
        smtpObj = smtplib.SMTP('localhost', 25)
        msg = email.message.Message()
        msg['From'] = sender
        msg['To'] = receivers
        msg['bcc'] = bcc
        toaddrs = [receivers]+[bcc]
        print toaddrs
        msg['subject'] = 'CloudRaxak account activation link'
        msg.add_header('Content-Type','text/html')
        msg.set_payload(html)
        msg = smtpObj.sendmail(sender, toaddrs, msg.as_string())
        result= [userInfo]
    except Exception as e:
       result = False
    return result

# activate user account and update the key activation from 0 to 1.
def Get_User_Info():
    redis_connect= redis.Redis()
    get_user_info_value = redis_connect.lrange('UserInfo', 0, -1)
    if(get_user_info_value !=[]):
        status =  get_user_info_value
    else:
        status = False
    return status

    
def activate(email_get, hashString):
    try:
        rs = redis.Redis("localhost")
        dump = rs.lrange('UserInfo', 0, -1)
        updatedata = {}
        remote_ip = get_system_address()
        #TODO should not be hardcoded
        toadmin = 'raxak@cloudraxak.com'
        toadminsplit = toadmin.split('@')
        toadminname= toadminsplit[0]  
        for item in dump:
            maped_data = json.loads(item)
            if maped_data.has_key('email'):
                if (str(maped_data['email']) == str(email_get)):
                    if(str(maped_data['hash']) == str(hashString)):
                        if maped_data['activation'] =="0":
                            updatedata['firstname'] = maped_data['firstname']
                            updatedata['lastname'] = maped_data['lastname']
                            updatedata['email'] = maped_data['email']
                            updatedata['phone'] = maped_data['phone']
                            updatedata['company'] = maped_data['company']
                            updatedata['country'] = maped_data['country']
                            updatedata['date'] = maped_data['date']
                            updatedata['activation'] = "2"
                            updatedata['admin'] = "0"
                            updatedata['period'] = maped_data['period']
                            updatedata['blocked'] = maped_data['blocked']
                            updatedata['password'] = maped_data['password']
                            updatedata['hash'] = maped_data['hash']
                            url_content = "http://"+remote_ip+"/activate.html?email=" ""+maped_data['email']+"" "&hash=" ""+str(maped_data['hash'])+""
                            html = """
                            <html>
                            <head></head>
                            <body>
                            <p>Dear """+toadminname+""" ,<br><br>
							"""+maped_data['firstname']+""" """+maped_data['lastname']+"""account has been activated.
							The Cloud Raxak Team,
							Simplifying and automating cloud security compliance.
							www.cloudraxak.com
                            </p>
                            </body>
                            </html>"""
                            sender = 'CloudRaxak Admin<admin@cloudraxak.com>' #TODO - need to decide sender cloudraxak ID
                            smtpObj = smtplib.SMTP('localhost', 25)
                            msg = email.message.Message()
                            msg['From'] = sender
                            msg['To'] = toadmin
                            msg['subject'] = 'User successfully activated.'
                            msg.add_header('Content-Type','text/html')
                            msg.set_payload(html)
                            msg = smtpObj.sendmail(sender,toadmin, msg.as_string())
                            rs.lrem('UserInfo', item)
                            rs.rpush('UserInfo', json.dumps(updatedata))
                            result = {'flag':1,'message':"Account has been activated"}
                            print "Account has been activated"
                        else:
                            result = {'flag':2,'message':"Account already activated"}
                            print "Account already has been activated"
                    else:
                        result = {'flag':3,'message':"Url is not correct"}
                        print "Activation URL is modified"
    except Exception as e:
        print e
        result = "cloudraxak:activate - Error :: "+str(e)
    return result

# check user email id is exist.
# Return True if exist
# Return False if not exist
#TODO - API name needs to be changed
def getemailexist(email):
    try:
        print "cloudraxak: checking user existance"
        rs = redis.Redis("localhost")
        dump = rs.lrange('UserInfo', 0, -1)
        if(len(dump) > 0):
            for item in dump:
                mapped_data = json.loads(item)
                if mapped_data.has_key('email'):
                    if str(mapped_data['email']) == str(email):
                        result = True
                        print "Email ID - " + str(mapped_data['email']) + " already registered."
                        break
                    else:
                        result = False
        else:
            result = False
    except Exception as e:
        result = "Cloudraxak:getemailexist Error :: "+str(e)
    return result


def deleteUser(email):
    try:
        rs = redis.Redis("localhost")
        dump = rs.lrange('UserInfo', 0, -1)
        if(len(dump) > 0):
            for item in dump:
                ip_map_data = json.loads(item)
                if ip_map_data.has_key('email'):
                    if ip_map_data['email'] == str(email):
                        rs.lrem('UserInfo', item)
                        result = {'status':True,'message':'successfull'}
                    else:
                        result = {'status':False,'message':'emailId not exist'}
        else:
            result = {'status':False,'message':'no data available'}
    except Exception as e:
        #result = str(e)
        result = {'status':False,'message':str(e)}
    return result

# Block user account and update the key blocked from 0 to 1.
def blockUser(email):
    try:
        print "cloudraxak: block an account ===="+email
        rs = redis.Redis("localhost")
        dump = rs.lrange('UserInfo', 0, -1)
        updatedata = {}
        if(len(dump) > 0):
            for item in dump:
                maped_data = json.loads(item)
                if maped_data.has_key('email'):
                    if (str(maped_data['email']) == str(email)):
                        if maped_data['blocked'] =="0":
                            updatedata['blocked'] = "1"
                            act = maped_data['activation']
                            result = [{'status':True,'blocked':"1",'activation':''+str(act)+''}]
                        else:
                            updatedata['blocked'] = "0"
                            act = maped_data['activation']
                            result = [{'status':True,'blocked':"0",'activation':''+str(act)+''}]
                        updatedata['firstname'] = maped_data['firstname']
                        updatedata['lastname'] = maped_data['lastname']
                        updatedata['email'] = maped_data['email']
                        updatedata['phone'] = maped_data['phone']
                        updatedata['company'] = maped_data['company']
                        updatedata['country'] = maped_data['country']
                        updatedata['activation'] = maped_data['activation']
                        updatedata['admin'] = maped_data['admin']
                        updatedata['period'] = maped_data['period']
                        updatedata['password'] = maped_data['password']
                        updatedata['date'] = maped_data['date']
                        updatedata['hash'] = maped_data['hash']
                        #updatedata['blocked'] = blocked
                        rs.lrem('UserInfo', item)
                        rs.rpush('UserInfo', json.dumps(updatedata))
                        #result = {'status':1,'message':"Account has been blocked"}
                        break
                    else:
                        result = {'status':False,'message':"email id not exist"}
        else:
            result = {'status':False,'message':"no data available"}
    except Exception as e:
        result = "Error :: "+str(e)
    return result

# modify user account and update the details.
def modifyUser(firstname,lastname,email,phone,company,country,blocked):
    try:
        print "cloudraxak: modify User an account == "+email
        rs = redis.Redis("localhost")
        dump = rs.lrange('UserInfo', 0, -1)
        updatedata = {}
        if(len(dump) > 0):
            for item in dump:
                maped_data = json.loads(item)
                if (str(maped_data['email']) == str(email)):
                    updatedata['firstname'] = firstname
                    updatedata['lastname'] = lastname
                    updatedata['email'] = email
                    updatedata['phone'] = phone
                    updatedata['company'] = company
                    updatedata['country'] = country
                    updatedata['activation'] = maped_data['activation']
                    updatedata['blocked'] = maped_data['blocked']
                    updatedata['admin'] = maped_data['admin']
                    updatedata['period'] = maped_data['period']
                    updatedata['password'] = maped_data['password']
                    updatedata['hash'] = str(maped_data['hash'])
                    updatedata['date'] = str(maped_data['date'])
                    rs.lrem('UserInfo', item)
                    rs.rpush('UserInfo', json.dumps(updatedata))
                    result = [updatedata]#{'status':1,'message':"Account has been blocked"}
                    break
                else:
                    result = {'status':3,'message':"email id not exist"}
        else:
            result = {'status':4,'message':"no data available"}
    except Exception as e:
        result = "Error :: "+str(e)
    return result

# change user password and update.
def changePassword(email,hashString,password):
    try:
        print "cloudraxak: change Password"
        rs = redis.Redis("localhost")
        dump = rs.lrange('UserInfo', 0, -1)
        updatedata = {}
        for item in dump:
            maped_data = json.loads(item)
            if maped_data.has_key('email'):
                if (str(maped_data['email']) == str(email) and maped_data['hash'] !='' and str(maped_data['hash']) == str(hashString)):
                    updatedata['firstname'] = maped_data['firstname']
                    updatedata['lastname'] = maped_data['lastname']
                    updatedata['email'] = maped_data['email']
                    updatedata['phone'] = maped_data['phone']
                    updatedata['company'] = maped_data['company']
                    updatedata['country'] = maped_data['country']
                    updatedata['admin'] = maped_data['admin']
                    updatedata['period'] = maped_data['period']
                    updatedata['password'] = password
                    updatedata['date'] = str(maped_data['date'])
                    updatedata['activation'] = "2"
                    updatedata['blocked'] = maped_data['blocked']
                    updatedata['hash'] = ''#maped_data['hash']
                    rs.lrem('UserInfo', item)
                    rs.rpush('UserInfo', json.dumps(updatedata))
                    result = [{'status':True,'message':'Password has been changed successfully.'}]
                    print "Password has been changed successfully."
                    break
                else:
                    result = [{'status':False,'message':"You can't changed the password."}]
                    print "You can't changed the password."
    except Exception as e:
        result = [{'status':False,'message':"You can't changed the password."}]
        print "Error :: "+str(e)
    return result

# forgot user password and update.
def forgotPassword(receiver):
    print receiver
    try:
        print "cloudraxak: change Password"
        rs = redis.Redis("localhost")
        dump = rs.lrange('UserInfo', 0, -1)
        get_date = date_format()
        remote_ip = get_system_address()
        date_hash = hashlib.md5(get_date).hexdigest()
        email_hash = hashlib.md5(receiver).hexdigest()
        hash_value = str(email_hash)+str(date_hash)
        updatedata = {}
        for item in dump:
            maped_data = json.loads(item)
            if maped_data.has_key('email'):
                if (str(maped_data['email']) == str(receiver)):
                    if (maped_data['blocked'] == "0"):
                        if (maped_data['activation'] == "0"):
                            updatedata['firstname'] = maped_data['firstname']
                            updatedata['lastname'] = maped_data['lastname']
                            updatedata['email'] = maped_data['email']
                            updatedata['phone'] = maped_data['phone']
                            updatedata['company'] = maped_data['company']
                            updatedata['country'] = maped_data['country']
                            updatedata['password'] = maped_data['password']
                            updatedata['admin'] = maped_data['admin']
                            updatedata['activation'] = maped_data['activation']
                            updatedata['date'] = str(maped_data['date'])
                            updatedata['blocked'] = maped_data['blocked']
                            updatedata['hash'] = hash_value
                            rs.lrem('UserInfo', item)
                            rs.rpush('UserInfo', json.dumps(updatedata))

                            # mail template start
                            url_content = "http://"+remote_ip+"/change_password.html?email=" ""+receiver+"" "&hash=" ""+hash_value+"" 
                            html = """
                            <html>
                            <head></head><body>
                             <p>Dear """+str(maped_data['firstname'])+" "+str(maped_data['lastname'])+""",<br><br>
                             Thanks for your interest in Raxak Protect Security Compliance solution. <br>
                             Click <a href="""+url_content+""">here</a> to activate CloudRaxak account.<br>
                             Please contact us at sales@cloudraxak.com if you have any other questions.<br><br>
                             The Cloud Raxak Team,<br>
                             Simplifying and automating cloud security compliance.<br>www.cloudraxak.com<br>
                             </p>
                            </body></html>
                           """
                            sender = 'CloudRaxak Admin<admin@cloudraxak.com>' #TODO - need to decide sender cloudraxak ID
                            smtpObj = smtplib.SMTP('localhost', 25)
                            msg = email.message.Message()
                            msg['From'] = sender
                            msg['To'] = receiver
                            msg['subject'] = 'CloudRaxak Reset Password Link'
                            msg.add_header('Content-Type','text/html')
                            msg.set_payload(html)
                            msg = smtpObj.sendmail(sender, receiver, msg.as_string())
                            result = [{'status':True,'message':'Please check your Email, We have sent a link to reset password.'}]
                            print "check your email activation link sent"
                            break
                        else:
                            result = [{'status':False,'message':'Your account not activated yet.'}]
                            print "Your account not activated yet"
                            break
                    else:
                        result = [{'status':False,'message':'Your account has blocked, Please contact to Administrator.'}]
                        print "Account has blocked"
                        break
                else:
                    #result = False
                    result = [{'status':False,'message':'This Email is not registered with us.'}]
                    print "No account found with that email address."
    except Exception as e:
        result = [{'status':False,'message':"Something wrong you can't chnage password."}]
        print "Error :: "+str(e)
    return result

def  addMotd(data_id,title,from_date,to_date,description):
        print "cloudraxak: adding Motd."
	rowMotdInfo = {}
        rs = redis.Redis()
        rowMotdInfo['title'] = title
        rowMotdInfo['from_date'] = from_date
        rowMotdInfo['to_date'] = to_date
        rowMotdInfo['description'] = description
        rowMotdInfo['id'] = data_id
	json_hash = json.dumps(rowMotdInfo)
        rs.rpush("motdinfo", json_hash)
    	dump = rs.lrange("motdinfo", 0, -1)
	return "successfully added"

def getMotds(current_date):
    print "cloudraxak: retrieving Motd."
    rs = redis.Redis()
    current_date_motd = []
    motdinfoList = list(set(rs.lrange("motdinfo", 0, -1)))
    if current_date == 'None':
        return motdinfoList

    current_date_obj = datetime.datetime.strptime(current_date, "%d-%m-%Y")
    for row_hash in motdinfoList:
    	row_hash_load = json.loads(row_hash)
        from_date =  row_hash_load["from_date"].encode('ascii')
        to_date =  row_hash_load["to_date"].encode()
        from_date_obj = datetime.datetime.strptime(from_date, "%d-%m-%Y")
        to_date_obj = datetime.datetime.strptime(to_date, "%d-%m-%Y")
        if (from_date_obj<= current_date_obj <=to_date_obj):
            current_date_motd.append(row_hash)

    return current_date_motd

def deleteMotd(row_id):
    print "cloudraxak: delete Motd."
    rs = redis.Redis()
    dump = rs.lrange("motdinfo", 0, -1)
    for row_hash in dump:
    	row_hash_load = json.loads(row_hash)
        for key in row_hash_load:
        	if row_hash_load[key] == row_id:
        		rs.lrem("motdinfo",row_hash)

    dump = rs.lrange("motdinfo", 0, -1)
    return "successfully deleted"


def modifyMotd(row_id,title,date_from,date_to,description):
    print "cloudraxak: modifyMotd."
    rs = redis.Redis()
    dump = rs.lrange("motdinfo", 0, -1)
    updated_hash_row = {}	
    for row_hash in dump:
    	row_hash_load = json.loads(row_hash)
        for key in row_hash_load:
        	if row_hash_load[key] == row_id:
        		rs.lrem("motdinfo",row_hash)
			updated_hash_row['id'] = str(row_id)
			updated_hash_row['title'] = str(title)
			updated_hash_row['from_date'] = str(date_from)
			updated_hash_row['to_date'] = str(date_to)
			updated_hash_row['description'] = str(description)
			json_hash = json.dumps(updated_hash_row)
        		rs.rpush("motdinfo", json_hash)

    rs.delete(row_id)
    rs.set(row_id, json_hash )

    return "successfully modified"


def Signin(email,password):
    rs = redis.Redis("localhost")
    dump = rs.lrange('UserInfo', 0, -1)
    password = hashlib.md5(password).hexdigest()
    status = {}
    status["status"] = "False"
    msg = ""
    for record in dump:
        record_dic = ast.literal_eval(record)
        if record_dic.has_key('password'):
            if (record_dic['email'] !='' and record_dic['password'] !=''):
                if (email == str(record_dic['email']) and password == str(record_dic['password'])):
                    if(str(record_dic['activation']) == "0"):
                        if(str(record_dic['blocked']) == "0"):
                            message = {'email':record_dic['email'],'firstname':record_dic['firstname'],'lastname':record_dic['lastname'],'company':record_dic['company']}
                            status["status"] = "True"
                            status["firstname"] = record_dic['firstname']
                            msg = "Account validated"
                            break
                        else:
                            msg = "Your Account has been blocked. Please contact admin"
                            break
                    else:
                        msg = 'Your account is not activated yet'
                        break 
                else:
                    msg = "Please check your email id or password"

    status["message"] = msg
    return status            

#def createGroup(username, ipaddress, groupname):
def createGroup(username, ipaddress, groupname,description):
    groupIps = {}
    rs = redis.Redis()
    try:
        print "cloudraxak: checking group name exist"
        dump = rs.lrange(username + "groups", 0, -1)
        if(len(dump) > 0):
            for item in dump:
                mapped_data = json.loads(item)
                if mapped_data.has_key('groupname'):
                    if str(mapped_data['groupname']) == groupname:
                        groupIps['status'] = False
                        groupIps['message'] = "Group name already exist, Try another?"
                        print "group name - " + str(groupname) + " already registered."
                        return groupIps
                        break
                    #else:
                    #    result = False

        groupIps['groupname'] = groupname
        groupIps['ips'] = ipaddress
        groupIps['description'] = description
        rs.rpush(username + "groups", json.dumps(groupIps))
        groupIps['status'] = True
    except Exception as e:
        result = "Cloudraxak:getemailexist Error :: "+str(e)
    return groupIps

def getGroups(username):
    rs = redis.Redis()
    groups = rs.lrange(username + "groups", 0, -1)
    print ("cloudraxak: groups= " + str(groups))
    return groups

def deleteGroup(username, group):
    deleted = False
    print "cloudraxak: deleteGroup"
    group = group.split(",")
    rs = redis.Redis()
    dump = rs.lrange(username + "groups", 0, -1)
    for element in group:
        for item in dump:
            ip_map_data = json.loads(item)
            if ip_map_data.has_key('groupname'):
                if element == ip_map_data['groupname']:
                    rs.lrem(username + "groups", item)
                    deleted = True

    return deleted

def deleteGroupIP(username, ipaddress_list):
    print "Inside deleteGroupIP"
    rs = redis.Redis()
    group_dump = rs.lrange(username + "groups", 0, -1)
    for group_ip in group_dump:
        group_load_data = json.loads(group_ip)
	for key in group_load_data:
            ip_data = group_load_data[key].split(",")
            for ip in ipaddress_list:
                rs.lrem(username + "groups",group_ip)
                if ip in ip_data:
                    remove_ip = ip_data.remove(ip)
		    updatedip = ",".join([str(i) for i in ip_data])
		    group_load_data[key] = updatedip
    	    rs.rpush(username + "groups", json.dumps(group_load_data))
    return "GroupIP deleted"

def modifyGroupIP(username, usernameIP, submitIP):
    print "cloudraxak: modifyGroupIP."
    rs = redis.Redis()
    dump = rs.lrange(username + "groups", 0, -1)
    updated_dict = {}
    for group_ip in dump:
    	group_ip_load = json.loads(group_ip)
        for key in group_ip_load:
	    ip_data = group_ip_load[key].split(",")
	    for ip in ip_data:
                if ip == usernameIP:
		    rs.lrem(username + "groups",group_ip)
		    ind_ip = ip_data.index(ip)
		    ip_data.remove(ip)
		    modify_ip = ip_data.insert(ind_ip, submitIP )
		    updated_ip = ",".join([str(i) for i in ip_data])
		    group_ip_load[key] = updated_ip
                    rs.rpush(username + "groups", json.dumps(group_ip_load))
    return "successfully modified"

#-- modify the server group details.
def modifyGroup(username, groupname,currentgroupname,ips ,description):
    try:
        print "cloudraxak: modifyGroupIP."
        rs = redis.Redis()
        dump = rs.lrange(username + "groups", 0, -1)
        status = {}
        status["status"] = "False"
        updated_dict = {}
        for item in dump:
    	    group_data = json.loads(item)
            if(str(group_data['groupname'])==groupname):
                updated_dict['groupname']=currentgroupname
                updated_dict['description']=description
                updated_dict['ips']=ips
                rs.lrem(username + "groups", item)
                rs.rpush(username + "groups", json.dumps(updated_dict))
                msg = updated_dict
                status["status"] = "True"
                break
    except Exception as e:
        msg = "Error :: "+str(e)
    status["message"] = msg
    return status

# get user list to show in servers page dropdown.
def getUsers():
    redis_connect = redis.Redis()
    dump = redis_connect.lrange('UserInfo', 0, -1)
    data = {}
    email_list=[]
    if(len(dump) > 0):
        for item in dump:
            print "ITEM"+str(item)
            maped_data = json.loads(item)
            if maped_data.has_key('email'):
                data={'firstname':maped_data['firstname'],'lastname':maped_data['lastname'],'email':maped_data['email'],'admin':maped_data['admin']}
                email_list.append(data)
        status =  email_list
    else:
        status = False
    return status

# Admin Privilege  account and update the key admin from 0 to 1.
def adminPrivilege(email, makeadmin):
    try:
        rs = redis.Redis("localhost")
        dump = rs.lrange('UserInfo', 0, -1)
        updatedata = {}
        if(len(dump) > 0):
            for item in dump:
                maped_data = json.loads(item)
                if maped_data.has_key('email'):
                    if (str(maped_data['email']) == str(email)):
                        if makeadmin == 'true' :
                            if maped_data['admin'] == '1':
                                result = [{'status' : False, 'message' : 'already has admin privilege.'}]
                                break
                            else:
                                updatedata['admin'] = "1"
                                act = maped_data['activation']
                                result = [{'status':True,'admin':"1"}]
                        elif makeadmin == 'false':
                            updatedata['admin'] = "0"
                            act = maped_data['activation']
                            result = [{'status':True,'admin':"0"}]
                        updatedata['firstname'] = maped_data['firstname']
                        updatedata['lastname'] = maped_data['lastname']
                        updatedata['email'] = maped_data['email']
                        updatedata['phone'] = maped_data['phone']
                        updatedata['company'] = maped_data['company']
                        updatedata['blocked'] = maped_data['blocked']
                        updatedata['country'] = maped_data['country']
                        updatedata['period'] = maped_data['period']
                        updatedata['activation'] = maped_data['activation']
                        updatedata['password'] = maped_data['password']
                        updatedata['date'] = maped_data['date']
                        updatedata['hash'] = maped_data['hash']
                        #updatedata['blocked'] = blocked
                        rs.lrem('UserInfo', item)
                        rs.rpush('UserInfo', json.dumps(updatedata))
                        break
                    else:
                        result = [{'status':False, 'message':"email id not exist."}]
        else:
            result = [{'status':False,'message':"no data available."}]
    except Exception as e:
        result = [{'status':False, 'message':"Something went wrong."}]
    return result

def adminSignin(email,password):
    rs = redis.Redis("localhost")
    dump = rs.lrange('UserInfo', 0, -1)
    password = hashlib.md5(password).hexdigest()
    status = {}
    status["status"] = "False"
    msg = ""
    for record in dump:
        record_dic = ast.literal_eval(record)
        if record_dic.has_key('password'):
            if (record_dic['email'] !='' and record_dic['password'] !=''):
                if (email == str(record_dic['email']) and password == str(record_dic['password'])):
                    if(record_dic['activation'] == "0"):
                        if(record_dic['blocked'] == "0" and record_dic['admin'] == "1"):
                            msg = {'email':record_dic['email'],'firstname':record_dic['firstname'],'lastname':record_dic['lastname'],'company':record_dic['company']}
                            #status = [{'status':True,'message':msg}]
                            status["status"] = "True"
                            msg = "Account validated"
                            break
                        else:
                            msg = "Your account don't have admin privileges"
                            break
                    else:
                        msg = "Your account is not activated yet"
                        break 
                else:
                    msg = "Please check your email id or password"
    status["message"] = msg
    return status            


def send_mail(receivers,firstname,lastname,phone,company,country,password=''):
    try:
        userInfo = {}
        rs = redis.Redis()
        get_date = date_format()
        pass_date_format = date_set()
        add_date = str(pass_date_format)
        remote_ip = get_system_address()
        date_hash = hashlib.md5(get_date).hexdigest()
        hash_cont = hashlib.md5(receivers).hexdigest()
        hash_value = str(hash_cont)+str(date_hash)
        userInfo['firstname'] = firstname
        userInfo['lastname'] = lastname
        userInfo['email'] = receivers
        userInfo['phone'] = phone
        userInfo['company'] = company
        userInfo['country'] = country
        userInfo['date'] = add_date
        userInfo['blocked'] = "0"
        userInfo['admin'] = "0"
        userInfo['period'] = ""
        userInfo['password'] = password
        userInfo['hash'] = hash_value
        userInfo['activation'] = "0"
        if(userInfo['activation'] == ''):
            userInfo['activation'] = "1" 
        rs.rpush("UserInfo", json.dumps(userInfo))
        # mail template start
        #TODO should not be hardcoded
        toadmin = 'raxak@cloudraxak.com'
        toadminsplit = toadmin.split('@')
        toadminname= toadminsplit[0]
        if(password !=""):
            html = """
			<html>
			<head></head>
			<body>
			<p>Dear """+firstname+" "+lastname+""",<br><br>
                        We have received your registration request, we will review your account and activate your account at the earliest.
                        <br/><br/>

                        Appreciate your patience.
                        <br/><br/>
 
			The Cloud Raxak Team<br>
			Simplifying and automating cloud security compliance.<br>
			www.cloudraxak.com<br>
			</p>
			</body>
			</html>"""
            sender = 'CloudRaxak Admin<admin@cloudraxak.com>' #TODO - need to decide sender cloudraxak ID
            smtpObj = smtplib.SMTP('localhost', 25)
            msg = email.message.Message()
            msg['From'] = sender
            msg['To'] = receivers
            msg['subject'] = 'Raxak Protect : Thank you for registering !!'
            msg.add_header('Content-Type','text/html')
            msg.set_payload(html) 
            msg = smtpObj.sendmail(sender,receivers, msg.as_string())
            cmd_date = commands.getoutput('date +"%B , %d %Y at %r"')
            get_current_date = cmd_date.replace('IST','')
            userhtml = """ 
             <html>                                                                                                                                                 <head></head>                                                                                                                           
          		<body>				
                <p>Dear Admin,<br><br>
                
                The user has been registered for Raxak Protect free trial for automated security compliance solution on """+get_current_date+"""<br/><br/>
                User details as follows: <br/><br/>
                Name :    """+firstname+""" """+lastname+"""<br/>
                Email:    """+receivers+"""<br/>
                Company:  """+company+"""<br/>
                Country:  """+country+"""<br/>
                Phone No: """+phone+"""<br/><br/>
                The Cloud Raxak Team,<br/>
                Simplifying and automating cloud security compliance.<br/>
                www.cloudraxak.com<br/>                                                                                       
				</body></html>"""
            sender = 'CloudRaxak Admin<admin@cloudraxak.com>' #TODO - need to decide sender cloudraxak ID
            #USER Send
            smtpObj = smtplib.SMTP('localhost', 25)
            msg = email.message.Message()
            msg['From'] = sender
            msg['To'] = toadmin
            msg['subject'] = 'Raxak Protect : User registered for free trial'
            msg.add_header('Content-Type','text/html')
            msg.set_payload(userhtml)
            msg = smtpObj.sendmail(sender,toadmin, msg.as_string())
            #adminmsg = smtpObj.sendmail(sender,toadmin, adminmsg.as_string())
        if(password ==""):
            url_content = "http://"+remote_ip+"/change_password.html?email=" ""+receivers+"" "&hash=" ""+hash_value+""
            html = """ 
             <html><head></head><body
			   <p>Dear """+firstname+" "+lastname+""",<br><br>                                                                                       
                Thanks for your interest in Raxak Protect Security Compliance solution. <br>                                                          
                Click <a href="""+url_content+""">here</a> to change password.<br>                                                                     
                Please contact us at sales@cloudraxak.com if you have any other questions.<br><br>                                                    
                The Cloud Raxak Team,<br>                                                                                                             
                Simplifying and automating cloud security compliance.<br>                                                                             
                www.cloudraxak.com<br>                                                                                                                
                </p>  	
            </html>"""
            sender = 'CloudRaxak Admin<admin@cloudraxak.com>' #TODO - need to decide sender cloudraxak ID
            smtpObj = smtplib.SMTP('localhost', 25)
            msg = email.message.Message()
            msg['From'] = sender
            msg['To'] = receivers
            msg['subject'] = 'Raxak Protect: change Password'
            msg.add_header('Content-Type','text/html')
            msg.set_payload(html) 
            msg = smtpObj.sendmail(sender,receivers, msg.as_string())
        result= [userInfo]
    except Exception as e:
       result = False
    return result
def feedbackSent(touser,feedback):
    try:
        UserFeedback = {}
        rs = redis.Redis("localhost")    
        #TODO should not be hardcoded
        toadmin = 'raxak@cloudraxak.com'
        toadminsplit = toadmin.split('@')
        toadminname= toadminsplit[0]
        tousersplit = touser.split('@')
        tousername= tousersplit[0]
        UserFeedback['user'] = touser
        UserFeedback['feedback'] = feedback
        html = """
                <html>
                <head></head>
                <body>
                <p>Dear """+tousername+""",<br><br>
                Thank you for your valuable feedback.<br/>
                We appreciate your taking time out of your busy schedule to let us know what you think.<br/> 
                Your feedback has been sent to the technical team.<br/><br/>
                <b>Feedback Details:</b><br/> 
                <div style="font-family: message-box; color: rgb(35, 92, 218);">"""+feedback+"""</div><br/>
                <br/><br/>
				The Cloud Raxak Team<br/>
                Simplifying and automating cloud security compliance.<br/>
                www.cloudraxak.com <br/>
                <!--<address>
                 Thanks&Regards<br/>  
                </address>--></p>
                </body>
                </html>"""
        #sender = ''+touser+'' #TODO - need to decide sender cloudraxak ID
        sender = 'CloudRaxak Admin<admin@cloudraxak.com>' #TODO - need to decide sender cloudraxak ID
        smtpObj = smtplib.SMTP('localhost', 25)
        msg = email.message.Message()
        msg['From'] = sender
        msg['To'] = touser
        msg['subject'] = 'CloudRaxak feedback message'
        msg.add_header('Content-Type','text/html')
        msg.set_payload(html)
        msg = smtpObj.sendmail(sender, touser, msg.as_string())
        html = """
                <html>
                <head></head>
                <body>
                <p>Dear """+toadminname+""",<br><br>
                <b>Feedback Details:</b><br/> 
                <div style="font-family: message-box; color: rgb(35, 92, 218);">"""+feedback+"""</div><br/>
                <br/>
                 The Cloud Raxak Team<br/>
                 Simplifying and automating cloud security compliance.<br/>
                 www.cloudraxak.com<br/>
                 <!--<address>
                 Thanks&Regards <br/>
                </address>--></p>
                </body>
                </html>"""
        #sender = ''+touser+'' #TODO - need to decide sender cloudraxak ID
        sender = 'CloudRaxak Admin<admin@cloudraxak.com>' #TODO - need to decide sender cloudraxak ID
        smtpObj = smtplib.SMTP('localhost', 25)
        msg = email.message.Message()
        msg['From'] = touser
        msg['To'] = toadmin
        msg['subject'] = 'CloudRaxak feedback message'
        msg.add_header('Content-Type','text/html')
        msg.set_payload(html)
        msg = smtpObj.sendmail(sender, toadmin, msg.as_string())
        rs.rpush('UserFeedback', json.dumps(UserFeedback))
        result = [{'status':True}]
        return result    
    except Exception as e:
        print e
def adminReview(get_email,blocked,period):
    try:
        print "cloudraxak: activate an account"
        print "Email id " + str(get_email)
        rs = redis.Redis("localhost")
        dump = rs.lrange('UserInfo', 0, -1)
        updatedata = {}
        remote_ip = get_system_address()
        for item in dump:
            maped_data = json.loads(item)
            if maped_data.has_key('email'):
                if (str(maped_data['email']) == str(get_email)):
                    if(maped_data.has_key('blocked')):
                        if maped_data['activation'] =="0":
                            updatedata['firstname'] = maped_data['firstname']
                            updatedata['lastname'] = maped_data['lastname']
                            updatedata['email'] = maped_data['email']
                            updatedata['phone'] = maped_data['phone']
                            updatedata['company'] = maped_data['company']
                            updatedata['country'] = maped_data['country']
                            updatedata['date'] = maped_data['date']
                            updatedata['activation'] = "2"
                            updatedata['admin'] = "0"
                            updatedata['period'] = period
                            updatedata['blocked'] = blocked
                            updatedata['password'] = maped_data['password']
                            updatedata['hash'] = maped_data['hash']
                            url_content = "http://"+remote_ip+"/activate.html?email=" ""+maped_data['email']+"" "&hash=" ""+str(maped_data['hash'])+""
                            html = """
                            <html>
                            <head></head>
                            <body>
                            <p>Dear """+maped_data['firstname']+" "+maped_data['lastname']+""",<br><br>
                            Thanks for your interest in Raxak Protect Security Compliance solution. <br>
                            Click <a href="""+url_content+""">here</a> to activate CloudRaxak account.<br>
                            Please contact us at sales@cloudraxak.com if you have any other questions.<br><br>
                            Your Account is activated for """+maped_data['period']+""" days.
                            The Cloud Raxak Team,<br>
                            Simplifying and automating cloud security compliance.<br>
                            www.cloudraxak.com<br>
                            </p>
                            </body>
                            </html>"""
                            sender = 'CloudRaxak Admin<admin@cloudraxak.com>' #TODO - need to decide sender cloudraxak ID
                            smtpObj = smtplib.SMTP('localhost', 25)
                            msg = email.message.Message()
                            msg['From'] = sender
                            msg['To'] = maped_data['email']
                            msg['subject'] = 'CloudRaxak account activation link'
                            msg.add_header('Content-Type','text/html')
                            msg.set_payload(html)
                            msg = smtpObj.sendmail(sender, maped_data['email'], msg.as_string())
                            rs.lrem('UserInfo', item)
                            rs.rpush('UserInfo', json.dumps(updatedata))
                            result = [{'status':True,'blocked':blocked,'period':period}]
                        else:
                            result = [{'status':False}]
                    else:
                        result = [{'status':False}]
    except Exception as e:
        result = "cloudraxak:review admin - Error :: "+str(e)
    return result

#    Set and change the access trial period
def setAccessPeriod(email,period):
    try:
        rs = redis.Redis("localhost")
        dump = rs.lrange('UserInfo', 0, -1)
        updatedata = {}
        if(len(dump) > 0):
            for item in dump:
                maped_data = json.loads(item)
                if maped_data.has_key('email'):
                    if (str(maped_data['email']) == str(email)):
                        updatedata['firstname'] = maped_data['firstname']
                        updatedata['lastname'] = maped_data['lastname']
                        updatedata['email'] = maped_data['email']
                        updatedata['phone'] = maped_data['phone']
                        updatedata['company'] = maped_data['company']
                        updatedata['country'] = maped_data['country']
                        updatedata['activation'] = maped_data['activation']
                        updatedata['blocked'] = maped_data['blocked']
                        updatedata['admin'] = maped_data['admin']
                        updatedata['period'] = period
                        updatedata['password'] = maped_data['password']
                        updatedata['hash'] = maped_data['hash']
                        updatedata['date'] = maped_data['date']
                        rs.lrem('UserInfo', item)
                        rs.rpush('UserInfo', json.dumps(updatedata))
                        result = [{'status':True,'period':period}]
                        break
                    else:
                        result = {'status':False,'message':"email id not exist"}
        else:
            result = {'status':False,'message':"no data available"}
    except Exception as e:
        result = "Error :: "+str(e)
    return result

def CreateTicket(touser,issue,title,vmname,description):
    try:
        TicketInfo = {}
        rs = redis.Redis("localhost")    
        #TODO should not be hardcoded
        toadmin = 'raxak@cloudraxak.com'
        toadminsplit = toadmin.split('@')
        toadminname= toadminsplit[0]
        tousersplit = touser.split('@')
        tousername= tousersplit[0]
        TicketInfo['user'] = touser
        TicketInfo['issue'] = issue
        TicketInfo['title'] = title
        TicketInfo['vmname'] = vmname
        TicketInfo['desc'] = description
        html = """
                <html>
                <head></head>
                <body>
                <p>Dear """+tousername+""",<br><br>
                Thanks for raising a support ticket, we will be in touch shortly to discuss your query.<br/>
                Ticket details are as follows: <br/> 
                <table border="1px" width="70%" cellspacing="0" cellpadding="5">
                <tr>
                <th colspan="2">
                Ticket Details 
                </th>
                </tr>
                <tr>
                <th width="20%" align="left">Issue Type</th>
                <td width="50%" align="left">"""+issue+"""</td>
                </tr>
                <tr>
                <th width="20%" align="left">Issue Title</th>
                <td width="50%" align="left">"""+title+"""</td>
                </tr>
                <tr>
                <th width="20%" align="left">Virtual Machine</th>
                <td width="50%" align="left">"""+vmname+"""</td>
                </tr>
                <tr>
                <th width="20%" align="left" valign="top">Description</th>
                <td width="50%" align="left">
                <div style="width: 99%;border:0" align="left" readonly>"""+description+"""</div>
                </td>
                </tr>
                </table>
                <br/><br/>
                The Cloud Raxak Team <br/>
                Simplifying and automating cloud security compliance.<br/>
                www.cloudraxak.com<br/>
                <!--<address>
                 Thanks&Regards<br/>  
                </address>--></p>
                </body>
                </html>"""
        #sender = ''+touser+'' #TODO - need to decide sender cloudraxak ID
        sender = 'CloudRaxak Admin<admin@cloudraxak.com>' # TODO - need to decide sender cloudraxak ID
        smtpObj = smtplib.SMTP('localhost', 25)
        msg = email.message.Message()
        msg['From'] = sender
        msg['To'] = touser
        msg['subject'] = 'CloudRaxak Create Ticket'
        msg.add_header('Content-Type','text/html')
        msg.set_payload(html)
        msg = smtpObj.sendmail(sender, touser, msg.as_string())
        html = """
                <html>
                <head></head>
                <body>
                <p>Dear """+toadminname+""",<br><br>
                """+touser.title()+""" has raised a support ticket, please take a look.<br/>
                User's details:<br/>
                Email ID - """+touser.title()+"""<br/>
                Ticket details are as follows: <br/>
                <table border="1px" width="70%" cellspacing="0" cellpadding="5">
                <tr>
                <th colspan="2">
                Ticket Details
                </th>
                </tr>
                <tr>
                <th width="20%" align="left">Issue Type</th>
                <td width="50%" align="left">"""+issue+"""</td>
                </tr>
                <tr>
                <th width="20%" align="left">Issue Title</th>
                <td width="50%" align="left">"""+title+"""</td>
                </tr>
                <tr>
                <th width="20%" align="left">Virtual Machine</th>
                <td width="50%" align="left">"""+vmname+"""</td>
                </tr>
                <tr>
                <th width="20%" valign="top" align="left">Description</th>
                <td width="50%" align="left">
                <div style="width: 99%;border:0px;" align="left" readonly>"""+description+"""</div>
                 </td>
                </tr>
                </table>
                The Cloud Raxak Team <br/>
                Simplifying and automating cloud security compliance.<br/>
                www.cloudraxak.com<br/>
                <!--<address>
                 Thanks&Regards <br/>
                </address>--></p>
                </body>
                </html>"""
        #sender = ''+touser+'' #TODO - need to decide sender cloudraxak ID
        sender = 'CloudRaxak Admin<admin@cloudraxak.com>' #TODO - need to decide sender cloudraxak ID
        smtpObj = smtplib.SMTP('localhost', 25)
        msg = email.message.Message()
        msg['From'] = touser
        msg['To'] = toadmin
        msg['subject'] = 'CloudRaxak Create Ticket'
        msg.add_header('Content-Type','text/html')
        msg.set_payload(html)
        msg = smtpObj.sendmail(sender, toadmin, msg.as_string())
        rs.rpush('TicketInfo', json.dumps(TicketInfo))
        result = [{'status':True}]
        return result    
    except Exception as e:
        print e
        
#Get UserDetails Function
def getUserDetails(email):
    try:
        rs = redis.Redis("localhost")
        dump = rs.lrange('UserInfo', 0, -1)
        getuserdetails = {}
        if(len(dump) > 0):
            for item in dump:
                maped_data = json.loads(item)
                if maped_data.has_key('email'):
                    if (str(maped_data['email']) == str(email)):
                        firstname = maped_data['firstname']
                        lastname = maped_data['lastname']
                        email = maped_data['email']
                        phone = maped_data['phone']
                        company = maped_data['company']
                        country = maped_data['country']
                        period =  maped_data['period']
                        date = maped_data['date']
                        try:
                            used_period = (datetime.datetime.now() - datetime.datetime.strptime(date, "%Y-%m-%d %H:%M:%S")).days
                            left_period = int(period) - int(used_period)
                        except:
                            left_period = "N/A"
                            
                        result ={   'firstname':firstname,
                            'lastname':lastname,
                            'email':email,
                            'phone':phone,
                            'company':company,
                            'country':country,
                            'period':period,
                            'date':date,
                            'left_period' : left_period}
                        break
                    else:
                        result = {'status':False,'message':"email id not exist"}
        else:
            result = {'status':False,'message':"no data available"}
    except Exception as e:
        result = "Error :: "+str(e)
    return result

#Reset Password
def ResetPassword(useremail,oldpassword,newpassword):
    try:
        print "cloudraxak: Reset Password"
        rs = redis.Redis("localhost")
        password = hashlib.md5(newpassword).hexdigest()
        dump = rs.lrange('UserInfo', 0, -1)
        updatedata = {}
        for item in dump:
            maped_data = json.loads(item)
            if maped_data.has_key('email'):
                if (str(maped_data['email']) == str(useremail) and str(maped_data['password']) == str(oldpassword)):
                    updatedata['firstname'] = maped_data['firstname']
                    updatedata['lastname'] = maped_data['lastname']
                    updatedata['email'] = maped_data['email']
                    updatedata['phone'] = maped_data['phone']
                    updatedata['company'] = maped_data['company']
                    updatedata['country'] = maped_data['country']
                    updatedata['admin'] = maped_data['admin']
                    updatedata['period'] = maped_data['period']
                    updatedata['password'] = password
                    updatedata['date'] = str(maped_data['date'])
                    updatedata['activation'] = "2"
                    updatedata['blocked'] = maped_data['blocked']
                    updatedata['hash'] = maped_data['hash']
                    html = """
                    <html>
                    <head></head>
                    <body>
                    <p>Dear """+maped_data['firstname']+" "+maped_data['lastname']+""",<br><br>
                    Your Raxak Protect account password has been changed. If you did not change this yourself please contact support@cloudraxak.com immediately.
                    The Cloud Raxak Team,<br>
                    Simplifying and automating cloud security compliance.<br>
                    www.cloudraxak.com<br>
                    This is a system generated alert. We request you not to reply to this message.
                    </p>
                    </body>
                    </html>"""
                    sender = 'CloudRaxak Admin<admin@cloudraxak.com>' #TODO - need to decide sender cloudraxak ID
                    smtpObj = smtplib.SMTP('localhost', 25)
                    msg = email.message.Message()
                    msg['From'] = sender
                    msg['To'] = useremail
                    msg['subject'] = 'Your Raxak Protect account password has been changed'
                    msg.add_header('Content-Type','text/html')
                    msg.set_payload(html)
                    msg = smtpObj.sendmail(sender,useremail, msg.as_string())
                    rs.lrem('UserInfo', item)
                    rs.rpush('UserInfo', json.dumps(updatedata))
                    result = [{'status':True,'message':'Password has been Reset successfully.'}]
                    break
                else:
                    result = [{'status':False,'message':"You can't Reset the password."}]
    except Exception as e:
        result = [{'status':False,'message':"You can't Reset the password."}]
    return result

#Update UserDetails Function
def modifyUserDetails(email,firstname,lastname,company,phone):
    try:
        rs = redis.Redis("localhost")
        dump = rs.lrange('UserInfo', 0, -1)
        updatedata = {}
        if(len(dump) > 0):
            for item in dump:
                maped_data = json.loads(item)
                if maped_data.has_key('email'):
                    if (str(maped_data['email']) == str(email)):
                        updatedata['firstname'] = firstname
                        updatedata['lastname'] = lastname
                        updatedata['email'] = maped_data['email']
                        updatedata['phone'] = phone
                        updatedata['company'] = company
                        updatedata['country'] = maped_data['country']
                        updatedata['activation'] = maped_data['activation']
                        updatedata['blocked'] = maped_data['blocked']
                        updatedata['admin'] = maped_data['admin']
                        updatedata['period'] = maped_data['period']
                        updatedata['password'] = maped_data['password']
                        updatedata['hash'] = maped_data['hash']
                        updatedata['date'] = maped_data['date']
                        rs.lrem('UserInfo', item)
                        rs.rpush('UserInfo', json.dumps(updatedata))
                        result = [{'status':True}]
                        break
                    else:
                        result = {'status':False,'message':"email id not exist"}
        else:
            result = {'status':False,'message':"no data available"}
    except Exception as e:
        result = "Error :: "+str(e)
    return result

#Get FeedbackInfo
def feedbackInfo():
    redis_connect= redis.Redis()
    get_feedbackinfo = redis_connect.lrange('UserFeedback', 0, -1)
    if(get_feedbackinfo !=[]):
        status = get_feedbackinfo
    else:
        status = False
    return status

#DeleteFeedback 
def deleteFeedback(email,feedback):
    try:
        deleted = False
        rs = redis.Redis("localhost")
        dump = rs.lrange('UserFeedback', 0, -1)
        for item in dump:
            ip_map_data = json.loads(item)
            if email == ip_map_data['user'] and feedback.strip() == str(ip_map_data['feedback'].strip()):
                rs.lrem("UserFeedback", item)
                deleted = True
    except Exception as e:
        print e
    return deleted
