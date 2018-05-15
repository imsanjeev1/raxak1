# PERMISSIONS group

# (c) 2015 Cloud Raxak Inc. All Rights Reserved

from collections import OrderedDict

def initializePermissions():
    permissionsDict = dict() # map ruleNum to ordered dict of default args

    # V-38449
    argsV38449 = [ ('ownerRead',False), ('ownerWrite',False), ('ownerEx',False),
                   ('groupRead',False), ('groupWrite',False), ('groupEx',False),
                   ('otherRead',False), ('otherWrite',False), ('otherEx',False) ]
    permissionsDict['V-38449'] = OrderedDict(argsV38449)

    # V-38457
    argsV38457 = [ ('ownerRead',True), ('ownerWrite',True), ('ownerEx',False),
                   ('groupRead',True), ('groupWrite',False), ('groupEx',False),
                   ('otherRead',True), ('otherWrite',False), ('otherEx',False) ]
    permissionsDict['V-38457'] = OrderedDict(argsV38457)

    # V-38461
    argsV38461 = [ ('ownerRead',True), ('ownerWrite',True), ('ownerEx',False),
                   ('groupRead',True), ('groupWrite',False), ('groupEx',False),
                   ('otherRead',True), ('otherWrite',False), ('otherEx',False) ]
    permissionsDict['V-38461'] = OrderedDict(argsV38461)

    # V-38465
    argsV38465 = [ ('ownerRead',True), ('ownerWrite',True), ('ownerEx',True),
                   ('groupRead',True), ('groupWrite',False), ('groupEx',True),
                   ('otherRead',True), ('otherWrite',False), ('otherEx',True) ]
    permissionsDict['V-38465'] = OrderedDict(argsV38465)

    # V-38469
    argsV38469 = [ ('ownerRead',True), ('ownerWrite',True), ('ownerEx',True),
                   ('groupRead',True), ('groupWrite',False), ('groupEx',True),
                   ('otherRead',True), ('otherWrite',False), ('otherEx',True) ]
    permissionsDict['V-38469'] = OrderedDict(argsV38469)

    # V-38493
    argsV38493 = [ ('ownerRead',True), ('ownerWrite',True), ('ownerEx',True),
                   ('groupRead',True), ('groupWrite',False), ('groupEx',True),
                   ('otherRead',True), ('otherWrite',False), ('otherEx',True) ]
    permissionsDict['V-38493'] = OrderedDict(argsV38493)

    # V-38498
    argsV38498 = [ ('ownerRead',True), ('ownerWrite',True), ('ownerEx',False),
                   ('groupRead',True), ('groupWrite',False), ('groupEx',False),
                   ('otherRead',False), ('otherWrite',False), ('otherEx',False) ]
    permissionsDict['V-38498'] = OrderedDict(argsV38498)

    # V-38504
    argsV38504 = [ ('ownerRead',False), ('ownerWrite',False), ('ownerEx',False),
                   ('groupRead',False), ('groupWrite',False), ('groupEx',False),
                   ('otherRead',False), ('otherWrite',False), ('otherEx',False) ]
    permissionsDict['V-38504'] = OrderedDict(argsV38504)

    # V-38583
    argsV38583 = [ ('ownerRead',True), ('ownerWrite',True), ('ownerEx',False),
                   ('groupRead',False), ('groupWrite',False), ('groupEx',False),
                   ('otherRead',False), ('otherWrite',False), ('otherEx',False) ]
    permissionsDict['V-38583'] = OrderedDict(argsV38583)

    # V-38623
    argsV38623 = [ ('ownerRead',True), ('ownerWrite',True), ('ownerEx',False),
                   ('groupRead',False), ('groupWrite',False), ('groupEx',False),
                   ('otherRead',False), ('otherWrite',False), ('otherEx',False) ]
    permissionsDict['V-38623'] = OrderedDict(argsV38623)

    return permissionsDict


class Permissions(object):
    def __init__(self, ordDict):
        self.permissOrdDict = ordDict
        self.catList = map(lambda t: t[0], self.permissOrdDict.items())
        self.boolList = map(lambda t: t[1], self.permissOrdDict.items())

    # return current permission string
    def showPermissString(self):
        permissionString = "-"
        permissOrdDict = self.permissOrdDict
        for permissIdx, elem in enumerate(permissOrdDict):
            # decide whether permission is 'r', 'w', or 'x'
            allPermiss = ['r','w','x']
            permissElem = allPermiss[permissIdx % len(allPermiss)]
            # decide whether permission should be valid or not
            permissionString += permissElem if permissOrdDict[elem] else '-'
        return permissionString

    # return numeric representation of permission string
    def showNumPermissString(self):
        # boolList is the list of just permission booleans
        boolList = self.boolList
        def formNum(permissListStr): # takes in bools and returns int from 0-7
            [read, write, execute] = permissListStr
            num = 0
            for idx in xrange(totalGroups):
                num += int(permissListStr[idx]) * (2**(totalGroups-idx-1))
            return num
        totalGroups = 3
        permissStr = "0"
        for groupIdx in xrange(totalGroups):
            startIdx = groupIdx*totalGroups
            endIdx = (groupIdx+1)*totalGroups
            permissStr += str(formNum(boolList[startIdx:endIdx]))
        return permissStr

    # takes in a 3-length string and outputs resulting ordered dict
    def setNewArgs(self, newPermissStr):
        ordDict = OrderedDict()
        categoryIdx = 0
        catList = self.catList
        for digitStr in newPermissStr:
            digit = int(digitStr)
            binDigit = bin(digit)[2:].zfill(3) # eg. 3 becomes '011'
            for bDigit in binDigit:
                category = catList[categoryIdx]
                categoryIdx += 1
                ordDict[category] = bool(int(bDigit))
        return ordDict

    def check(self):
        #res = runOnShell('ls -l /etc/passwd')
        permissionString = showPermissString()
        # return permissionString in res.split(" ")[0]

    def fix(self):
        permissStr = showNumPermissString(self)
        s = 'sudo chmod %s /etc/passwd' % permissStr
        return s
        #runOnShell(s)

def customizePermissions(data, ruleCust):
    custDefaultArgs = data.defaultArgsPermissions[ruleCust] # ordered dict
    obj = Permissions(custDefaultArgs)
    while True:
        userIn = raw_input("""------------
                           EDITING %s:
                           Enter a command: view args : displays current args for rule
                                            view permissions : display current permission
                                            change __ to __ : change args (eg. change ownerRead to True)
                                            set args to __ : set based off string (eg. set args to 077)
                                            done : done editing rule %s\n""" % (ruleCust, ruleCust))
        try:
            commandArgs = userIn.split(' ')
            command = commandArgs[0]
            if userIn == 'view args': printOrdDict(custDefaultArgs)
            elif userIn == 'view permissions':
                print("Rule %s has permissions: %s %s" % (ruleCust, obj.showPermissString(),
                                                          obj.showNumPermissString()))
            elif command == 'change':
                arg = commandArgs[1]
                newBool = (commandArgs[3] == 'True')
                if arg not in custDefaultArgs: errorMsg("ERROR: %s not in default args." % arg)
                custDefaultArgs[arg] = newBool
            elif command == 'set':
                newPermiss = commandArgs[3]
                if not newPermiss.isdigit(): errorMsg("ERROR: Permission string must be integer.")
                if len(newPermiss) != 3: errorMsg("ERROR: Permission string must have length 3.")
                custDefaultArgs = obj.setNewArgs(newPermiss)
                data.defaultArgsPermissions[ruleCust] = custDefaultArgs # necessary b/c loss of aliasing
            elif command == 'done': break
            else: assert(False)
            if command in set(['change', 'set']): obj = Permissions(custDefaultArgs) # update Permissions obj
            print("Command Successful!")
        except Exception as e:
            print "ERROR: ", e.args


