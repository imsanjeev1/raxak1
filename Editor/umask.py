# UMASK group

# (c) 2015 Cloud Raxak Inc. All Rights Reserved


def initializeUmask():
    umaskDict = dict() # map ruleNum to set of allowed args
    umaskDict['V-38642'] = ['027', '022']
    umaskDict['V-38645'] = ['077']
    umaskDict['V-38647'] = ['077']
    umaskDict['V-38649'] = ['077']
    umaskDict['V-38651'] = ['077']
    return umaskDict

def customizeUmask(data, ruleCust):
    custDefaultArgs = data.defaultArgsUmask[ruleCust]
    while True:
        userIn = raw_input("""------------
                           EDITING %s:
                           Enter a command: view args : displays current args
                                            set args to __ : set comma-delimited permissions (eg. 027,022)
                                            done : done editing rule %s\n""" % (ruleCust, ruleCust))
        try:
            userIn = userIn.strip()
            commandArgs = userIn.split(' ')
            command = commandArgs[0]
            if userIn == 'view args':
                print("List of allowed arguments for %s files: " % ruleCust)
                for idx, argNum in enumerate(custDefaultArgs):
                    print('%d) %s' % (idx+1, argNum))
            elif command == 'set':
                print commandArgs[3]
                newArgsList = commandArgs[3].split(',')
                data.defaultArgsUmask[ruleCust] = custDefaultArgs = newArgsList
            elif userIn == 'done': break
            else: assert(False)
            print("Command Successful!")
        except Exception as e: print("ERROR: ", e.args)
