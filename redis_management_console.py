# This code runs through the Redis database and looks for keys that do not belong
# This is based off certain criteria outlined in the Github Wiki (redis Organization) section
# It also prompts the user for deletion of these keys from the Redis DB
# Currently, deletion only affects the mock Redis DB, not the actual DB
# Extra information about users and VMs is also printed out with the verbose flag

# (c) 2014,2015 Cloud Raxak Inc. All Rights Reserved

################################

# Code by Eileen Jiang

import redis, ast, string, re
import time, pprint, copy, sys
from cStringIO import StringIO
import traceback

## UTILITY FUNCTIONS ##

class Struct(object): pass

# converts a string seen in Redis to actual representation
def strToActual(s):
    newS = string.replace(s, '\n', '\\n')
    return ast.literal_eval(newS)

# takes in date as string and returns integer format
# eg. 12/25/2015 becomes 20151225 and 07/04/2015 becomes 20150704
def dateConvert(date):
    month, day, year = date.split('/')
    dateStr = year + month + day
    return int(dateStr)

# takes a key and determines if that key is a user or not
# returns a boolean
def isUser(key):
    if '@' not in key: return False
    if ':' in key: return False
    afterAt = key.split('@')[1]
    return string.count(afterAt, '.') < 3

# takes a key and determines if that key is a VM or not
# returns a boolean
def isVM(key):
    if '@' not in key: return False
    afterAt = key.split('@')[1]
    dotSplit = afterAt.split('.')
    try:
        map(int, dotSplit)
        return True
    except: return False


# takes in a lst and deletes all elements in list from Redis DB
def deleteListFromRedis(data, lst):
    modifRedis, keyValueStore = data.modifRedis, data.keyValueStore
    for elem in lst:
        try:
            del modifRedis[elem]
            # WARNING! Uncommenting the next line will affect the Redis DB
            keyValueStore.delete(elem)
            print(elem + ' successfully deleted')
        except:
	    print(traceback.format_exc())
            print(elem + " could not be deleted")
        if data.HTMLtags: print("<br>")

# prints all keys in sorted order
def printDictOnlyKeys(printDict, msg, HTMLtags):
    print('-----------------')
    if HTMLtags: msg = "<h1>" + msg + "</h1>"
    print(msg)
    if HTMLtags: print("<h2>")
    for idx, key in enumerate(sorted(printDict.keys())):
        print("%d) %s" % (idx+1, key))
        if HTMLtags: print("<br>")
    if HTMLtags: print("</h2>")


# prints all VMs and number of users per VM
def printVMDict(printDict, msg, HTMLtags):
    print('-----------------')
    if HTMLtags: msg = "<h1>" + msg + "</h1>"
    print(msg)
    if HTMLtags: print("<h2>")
    for idx, key in enumerate(printDict.keys()):
        print("%d) %s - %s %d" % (idx+1, key, "Number of users:", printDict[key][0]))
        if HTMLtags: print("<br>")
    if HTMLtags: print("</h2>")

# basic printing dict function
def printDict(printDict, msg, HTMLtags):
    print('-----------------')
    if HTMLtags: msg = "<h1>" + msg + "</h1>"
    print(msg)
    if HTMLtags: print("<h2>")
    for idx, key in enumerate(printDict.keys()):
        print("%d) %s: %s" % (idx+1, key, printDict[key]))
        if HTMLtags: print("<br>")
    if HTMLtags: print("</h2>")

# pretty print function for dicts
def prettyPrintDict(printDict, msg, HTMLtags):
    print('-----------------')
    if HTMLtags: msg = "<h1>" + msg + "</h1>"
    print(msg)
    if HTMLtags: print("<h2>")
    pprint.pprint(printDict, width = 20)
    if HTMLtags: print("</h2>")

# custom print function (specifically for HTML)
def customPrint(someDict, level = 0):
#new line at each key but tab needs to work as well
    for key in someDict:
        tabString = "&nbsp&nbsp&nbsp&nbsp"*level
        if type(someDict[key]) == dict:
            print("<br>")
            print("<br>"+tabString + key + ":")
            customPrint(someDict[key], level+1)
        elif type(someDict[key]) == list:
            print("<br>"+tabString + key + ": " + ("%r" % someDict[key]))
        else:
            print("<br>"+ tabString + key + ": " + someDict[key])

# wrapper for custom print function
def customPrintWrapper(someDict, msg, HTMLtags):
    print('-----------------')
    if HTMLtags: msg = "<h1>" + msg + "</h1>"
    print(msg)
    if HTMLtags: print("<h2>")
    customPrint(someDict)
    if HTMLtags: print("</h2>")

## END UTILITY FUNCTIONS ##


# creates a 'copy' of the actual DB stored into modifRedis dictionary
def basicManagement(data):
    keyValueStore, allKeysList, modifRedis = data.keyValueStore, data.allKeysList, data.modifRedis
    for key in allKeysList:
        try:
            value = keyValueStore.get(key)
            # here, we know value is a string
            if '{' in value or '[' in value:
                value = strToActual(value)
            modifRedis[key] = value
        except:
            try:
                value = keyValueStore.lrange(key, 0, -1)
                # here, we know that value is a list
                for idx in xrange(len(value)):
                    if '{' in value[idx] and '}' in value[idx]:
                        value[idx] = strToActual(value[idx])
                modifRedis[key] = value
            except: pass


# creates userIDDict and accessVMsDict
def parseDicts(data):
    userIDDict = dict() # map (email, googleID) to list of associated VMs
    accessVMsDict = dict() # map VM to (number of users, set of user accounts on that VM (username@VM))
    errorDict = dict() # map keys (emails) to be deleted to error message
    modifRedis = data.modifRedis
    for key in modifRedis.keys():
        username = key
        if isUser(username): # found a user
            keyUserID = username + ':userid'
            if 'Code:' in modifRedis[key]: # user has not activated code
                userIDDict[(username, "No User ID")] = []
            elif username == 'prasanna@cloudraxak.net': # sole exception
                userIDDict[(username, "No User ID or Associated Keys in DB")] = []
            else:
                try:
                    ID = modifRedis[keyUserID] # flag non-googleIDs as keys to be deleted
                    try: allVMsInfo = modifRedis[ID] # list
                    except: allVMsInfo = [] # user is valid but has not used any IPs yet
                    userIDDict[(username, ID)] = map(lambda d: d['ip'], allVMsInfo)
                    # now update accessVMsDict
                    for ipAddress in userIDDict[(username, ID)]:
                        vmAddress = re.split('@', ipAddress)[1]
                        (numUsers, accountSet) = accessVMsDict.get(vmAddress, (0, set()))
                        accountSet.add(ipAddress)
                        accessVMsDict[vmAddress] = (numUsers+1, accountSet)
                except Exception as e:
                    errorDict[key] = 'Keys do not hash to valid IDs.'
    data.userIDDict, data.accessVMsDict, data.errorDict = userIDDict, accessVMsDict, errorDict

# add all VMs that are user-inaccessible to a flagged dict
# call this after parseDicts
def addExtraVMs(data):
    accessVMsDict, modifRedis = data.accessVMsDict, data.modifRedis
    allVMsToBeDeleted = dict() # VMs that are inaccessible from any user email
    for key in modifRedis.keys():
        if isVM(key):
            username, vmAddress = key.split('@')
            flag = False
            if vmAddress in accessVMsDict:
                _, accountSet = accessVMsDict[vmAddress]
                if key not in accountSet: flag = True # only add (VM IP -> account@VM) to VMs to be deleted
            else: flag = True
            if flag:
                (numUsers, accountSet) = allVMsToBeDeleted.get(vmAddress, (0, set()))
                accountSet.add(key)
                allVMsToBeDeleted[vmAddress] = (numUsers+1, accountSet)
    data.allVMsToBeDeleted = allVMsToBeDeleted

# adds to errorDict users that have 'Expired' status or expiration dates before current date
def checkExpirationStats(data):
    userIDDict, errorDict, modifRedis = data.userIDDict, data.errorDict, data.modifRedis
    currMonth, currDay, _ = time.strftime("%x").split('/')
    currYear = time.strftime("%Y")
    currDateRep = dateConvert("%s/%s/%s" % (currMonth,currDay,currYear))
    for (userEmail, googleID) in userIDDict.keys():
        try:
            value = modifRedis[userEmail]
            if '/' in value:
                userDateRep = dateConvert(value)
                if userDateRep <= currDateRep: # expiration date has passed
                    errorDict[userEmail] = 'Expiration date (%s) has passed.' % value
            if 'Expired' in value:
                errorDict[userEmail] = 'Access Status: Expired'
        except:
            errorDict[userEmail] = 'No information on expiration date.'

# ask user whether each VM in user-inaccessible VMs (as well as corr log files) should be deleted
# only deletes from mock Redis DB, not actual DB
def promptDeletionVMs(data):
    allVMsToBeDeleted, modifRedis, keyValueStore = data.allVMsToBeDeleted, data.modifRedis, data.keyValueStore
    rsDict = data.rsDict
    deletedVMs = set() # remove these VMs from dict after loop - unsafe to remove during loop
    if data.delete: # delete all VMs
        print('-----------------')
        if data.HTMLtags: print("<h1>")
        print("\n\nAll following keys have been flagged for deletion. Run with delete=True to delete.\n")
        if data.HTMLtags: print("</h1> <h2>")
        for vm in allVMsToBeDeleted.keys():
            print("Deleting VM %s and associated log files..." % vm),
            accountSet = allVMsToBeDeleted[vm][1]
            deletedVMs.add(vm)
            for userAccountVM in accountSet:
                delList = [userAccountVM, userAccountVM + 'details', userAccountVM + 'status']
                successList, failedList = list(), list()
                for delKey in delList:
                    try:
                        del modifRedis[delKey]
                        if delKey in data.mergedErrorDict: del data.mergedErrorDict[delKey]
                        # WARNING! Uncommenting the next line will affect the Redis DB
                        keyValueStore.delete(delKey)
                        successList.append(delKey)
                    except Exception as e:
                        failedList.append(str(e))
                print("Successfully deleted: %r, Did not delete: %r" % (successList, failedList))
            if data.HTMLtags: print("<br><br>")
            else: print('\n')
        if data.HTMLtags: print("</h2>")
        for vm in deletedVMs: # now remove deleted VMs from dict as well
            del allVMsToBeDeleted[vm]
    else:
        printDictOnlyKeys(allVMsToBeDeleted, 'All VMs flagged for deletion (run with delete=True to delete)', data.HTMLtags)


# ask user whether each key in errorDict should be deleted (as well as corr log files) from Redis
# only deletes from mock Redis DB, not actual DB
# after calling this function, only data.mergedErrorDict is valid
# data.rsDict and data.errorDict will have little meaning
def promptDeletionError(data):
    mergedErrorDict, modifRedis, keyValueStore = data.mergedErrorDict, data.modifRedis, data.keyValueStore
    deletedKeys = set()
    if data.delete: # delete all flagged keys
        print('-----------------')
        if data.HTMLtags: print("<h1>")
        print("\n\nAll following keys have been flagged for deletion. Run with delete=True to delete.\n")
        if data.HTMLtags: print("</h1> <h2>")
        for key in mergedErrorDict.keys():
            print("Deleting key %s and associated keys..." % key),
            keyTupleList = filter(lambda t: key in t[0], data.userIDDict.keys())
            if len(keyTupleList) == 1: # otherwise, key would not be valid user
                userid = keyTupleList[0][1]
                if "No User ID" not in userid:
                    # now delete newly unused VMs (since the user is about to be deleted)
		    if userid in modifRedis:
		    	vmList = modifRedis[userid]
                    	vmIPList = map(lambda d: d['ip'], vmList)
                    	for vmIP in vmIPList:
                        	delList = [vmIP, vmIP+'details', vmIP+'status']
                        	(numUsers, accountSet) = data.accessVMsDict[vmIP.split('@')[1]]
                        	if numUsers == 1 and vmIP in accountSet:
                            		deleteListFromRedis(data, delList)
                    # now, delete the user and associated keys
                    userAssocList = [key, key+":form", key+":userid", key+":code",
                        userid, userid+"Selected", userid+":time", userid+"lastrunips", userid+":info"]
                    deleteListFromRedis(data, userAssocList)
                else:
                    noIDUserAssocList = [key, key+":form", key+":userid", key+":code"]
                    deleteListFromRedis(data, noIDUserAssocList)
            else: deleteListFromRedis(data, [key]) # just delete the key otherwise
            deletedKeys.add(key)
            if data.HTMLtags: print("<br>")
            else: print('')
        for key in deletedKeys:
            del mergedErrorDict[key]
    else:
        printDictOnlyKeys(mergedErrorDict, 'All keys flagged for deletion (run with delete=True to delete)', data.HTMLtags)

# verbose flag gives extra info about keys, users, and accessible / inaccessible VMs
# delete flag allows user to actively delete vs. only view all flagged keys from Redis DB
# HTMLtags flag makes the output HTML-compatible in a web browser
def redisManagement(verbose=True, delete=False, HTMLtags=False):
    print("verbose = "+str(verbose))
    print("delete = "+str(delete))
    print("HTMLtags = " + str(HTMLtags))
    data = Struct()
    # load up the Redis DB
    data.keyValueStore = redis.Redis('localhost')
    data.allKeysList = data.keyValueStore.keys('*')
    data.modifRedis = dict() # modified key-value dict database

    basicManagement(data)
    print("Done with basicManagement")
    parseDicts(data)
    print("Done with parseDicts")
    addExtraVMs(data)
    print("Done with addExtraVMs")
    checkExpirationStats(data)
    print("Done with checkExpirationStats")

    userIDDict, accessVMsDict, errorDict = data.userIDDict, data.accessVMsDict, data.errorDict
    data.delete, data.HTMLtags = delete, HTMLtags

    # Call major dicts from Nancy's codebase
    data.overallDict, data.flagDict, data.rsDict = overallOrganization()

    # create the joint flagged dictionary here
    data.errorDict.update(data.rsDict)
    data.mergedErrorDict = copy.deepcopy(data.errorDict)

    # following lines capture anything printed to STDOUT and puts it into string buffer variable
    old_stdout = sys.stdout
    sys.stdout = mystdout = StringIO()

    # add beginning HTML
    if HTMLtags:
        print("""
<!DOCTYPE html>
<html>
  <head>
    <title>Redis Console Output</title>
  </head>
  <body id="home">
    <header>
        <h1> Redis Console Output </h1> <br>
    </header>
""")

    # print useful info here
    if verbose:
        printDictOnlyKeys(data.modifRedis, "ALL SORTED KEYS IN REDIS DB", HTMLtags)
        printDict(userIDDict, "ALL USER EMAILS, GOOGLE IDs, AND ASSOCIATED VMs", HTMLtags)
        printVMDict(accessVMsDict, "ALL USER-ACCESSIBLE VMs AND NUMBER OF USERS", HTMLtags)

        if not HTMLtags:
            prettyPrintDict(data.overallDict, "Database ordered by user, id, and vm", HTMLtags)
        else:
            print("<pre>")
            prettyPrintDict(data.overallDict, "Database ordered by user, id, and vm", HTMLtags)
            print("</pre>")
            #customPrintWrapper(data.overallDict, "Database ordered by user, id, and vm", HTMLtags)
        printDict(data.flagDict, "Dictionary flagging missing keys for each user", HTMLtags)

    # prompt deletion of VMs and keys in errorDict
    promptDeletionVMs(data)
    promptDeletionError(data)
    # many data structures not fully updated, be careful if adding any code after above 2 functions

    print('-----------------')

    #printDict(data.mergedErrorDict, 'ALL FLAGGED KEYS WITH ERROR MESSAGES', HTMLtags)

    if HTMLtags:
        print("""
  </body>
</html>
""")

    # reset STDOUT back to screen instead of variable at the very end
    sys.stdout = old_stdout

    # return printed string
    finalStr = mystdout.getvalue()
    # remove \n from HTML if HTML tags are on
    #if HTMLtags: finalStr.replace("\n", "<br>")

    return finalStr


###################################

# Code by Nancy Xiao

#encryptionKey
#status: user allowed, expired, code, date when trial ends
#form: user info (includes name, email, phone, etc
#code: expiration code
#userid: google id, amazon id, user id
#info: user info (includes ip, login, user, and email)
#vmList: list of vms checked (includes: access, ip, nickname)
#selected: list of selected Target Machines
#lastrunips: list of latest ips run
#time: 10 latest runs
#console log: vm console log
#vmStatus: latest status (usually in "rules execution completed on :"
#vmDetails: os version, hostname, os

def strTo(string):
    return ast.literal_eval(string)

def redisDatabase():
    rs = redis.Redis('localhost')
    rskeys = rs.keys("*")
    rsDict = {}
    for key in rskeys:
        try:
            val = rs.get(key)
            if "{" in val or '[' in val:
                val = strTo(val)
        except:
            val = rs.lrange(key, 0,-1)
        rsDict[key] = val
    return rsDict, rskeys

def userAdd(userDict,rsDict,userEmail,flagDict):
    for item in ["status", "form", "code", "userid"]:
        userElemAdd(item, userDict, rsDict, userEmail, flagDict)

def userElemAdd(string, userDict, rsDict, userEmail,flagDict):
    try:
        if string == "status":
            userDict["status"] = rsDict[userEmail]
            del rsDict[userEmail]
        else:
            userDict[string] = rsDict[userEmail + ":" + string]
            del rsDict[userEmail + ":" + string]
    except:
        if string == "code":
            try:
                stat=userDict["status"]
            except:
                stat = ""
            flag(string, userEmail, flagDict, stat)
        else:
            flag(string,userEmail,flagDict)

def idDictElemAdd(string, ID, idDict, rsDict, userEmail, flagDict, consoleDict,vmSet):
    try:
        if string == "info":
            idDict[string] = rsDict[ID + ":info"]
            del rsDict[ID + ":info"]
        elif string == "vmList":
            idDict[string] = rsDict[ID]
            vmAdd(idDict, userEmail, flagDict, rsDict, consoleDict,vmSet)
            del rsDict[ID]
        elif string == "Selected":
            idDict[string] = rsDict[ID + "Selected"]
            del rsDict[ID + "Selected"]
        elif string == "lastrunips":
            idDict[string] = rsDict[ID + "lastrunips"]
            del rsDict[ID + "lastrunips"]
        else:
            idDict[string] = rsDict[ID + ":time"]
            del rsDict[ID + ":time"]
    except:
        message = string + " in ID"
        flag(message,userEmail,flagDict)
def idDictAdd(ID, userDict, rsDict, userEmail,flagDict, consoleDict, vmSet):
    idDict = {}
    for item in ["info", "vmList", "Selected", "lastrunips", "time"]:
        idDictElemAdd(item, ID, idDict, rsDict, userEmail,flagDict, consoleDict, vmSet)
    return idDict

def vmElemAdd(string, userEmail, flagDict, rsDict, ip, consoleDict, IPDict, vmSet):
    try:
        if string == "console":
            consoleDict[ip] = rsDict[ip]
            vmSet.add(ip)
        elif string == "status":
            IPDict[string] = rsDict[ip + string]
            vmSet.add(ip+string)
        else: #string == "details"
            IPDict[string] = rsDict[ip + string]
            vmSet.add(ip+string)
    except:
        message = ip + ":" + string + " in vm"
        flag(message,userEmail,flagDict)

def vmAdd(idDict, userEmail, flagDict, rsDict, consoleDict, vmSet):
    vmList = idDict["vmList"]
    for item in vmList:
        vm = strTo(item)
        ip = vm["ip"]
        IPDict = {}
        idDict[ip] = IPDict
        for elem in ["console", "status", "details"]:
            vmElemAdd(elem,userEmail,flagDict,rsDict,ip,consoleDict,IPDict,vmSet)
    return idDict

def flag(string, userEmail, flagDict,status = ""):
    if userEmail not in flagDict:
        flagDict[userEmail + " is missing"] = missingList = []
    if string == "missing: code":
        if "/" in status:#its a date -> needs a code
            flagDict[userEmail] += [string]
            return
        if "Code" in status: #trial run but not activated -> need code
            flagDict[userEmail] += [string]
            return
        if "Expired" in status:
            flag("expired user", userEmail, flagDict)
        else:
            return
    else:
        flagDict[userEmail + " is missing"] += [string]

def sortExtraKeyList(rsDict):
    count = 0
    extraKeyList = []
    for key in rsDict:
        count += 1
        extraKeyList += [key]
    sortedExtraKeyList = sorted(extraKeyList)

def overallOrganization():
    rs = redisDatabase()
    rsDict = rs[0]
    rskeys = rs[1]
    overallDict = {}
    overallDict["encryptionKey"] = rsDict["encryptionKey"]
    del rsDict["encryptionKey"]
    flagDict = {}
    consoleDict = {}
    userList = []
    vmSet = set()
    for key in rskeys:
        if "userid" in key:
            userList += [key]
    for user in userList:
        userEmail = user[0:-7]
        userDict = {}
        overallDict[userEmail] = userDict
        userAdd(userDict, rsDict, userEmail, flagDict)
        ID = userDict["userid"]
        idDict = idDictAdd(ID,userDict,rsDict,userEmail,flagDict,consoleDict,vmSet)
        userDict["ID"] = idDict
    for elem in vmSet:
        del rsDict[elem]
    extraKeysList = sortExtraKeyList(rsDict)
    return (overallDict, flagDict, rsDict)

####################

# print redisManagement(verbose=True, delete=False, HTMLtags=True)
