# This is an editor for rule categorization
# Using a generic rule parameterization for now
# Note: due to current formatting, all arguments for a rule must be stored in either an ordered dict or a list
# The contents inside the arg list or arg dict should be either bools or strings

# (c) 2015 Cloud Raxak Inc. All Rights Reserved

import treeOrg
from collections import OrderedDict
from treelib import Tree, Node

# import the file for every group
import permission, partition, umask, ownership, groupownership, publicdirectories

class Struct(object): pass

### START UTILITY FUNCTIONS ###

# prints out the profile (custom)
def printProfile(profile):
    for idx, key in enumerate(sorted(profile.keys())):
        print('%d) %s' % (idx+1, profile[key]))

# prints a dictionary neatly, assumes d is dict
def printDict(d):
    for idx, key in enumerate(sorted(d.keys())):
        print('%d) %s: %s' % (idx+1, key, d[key]))

# prints an ordered dictionary, doesn't sort
def printOrdDict(d):
    for idx, key in enumerate(d.keys()):
        print('%d) %s: %s' % (idx+1, key, d[key]))

def errorMsg(msg):
    print(msg)
    assert(False)

# function takes in a treelib tree, startNode, and endNode, and returns path from startNode to endNode
# list will contain the node keys, not the node objects themselves!
def bfsPaths(tree, startNode, endNode):
    if startNode == endNode: return [startNode]
    queue = [(startNode, [])]
    visited = set()
    while len(queue) != 0:
        (currNode, currPath) = queue.pop(0)
        if currNode == endNode:
            return [startNode] + currPath
        visited.add(currNode)
        currNodeObj = tree.get_node(currNode)
        for neighbor in currNodeObj.fpointer:
            if neighbor not in visited:
                queue.append((neighbor, currPath+[neighbor]))
    return None

# takes in path and subtree and returns resulting treelib subtree from start to end nodes
def drawPath(data, subtree, path):
    if type(path) != list or len(path) < 2: return None
    tree, verboseTree = data.tree, data.verboseTree
    for nodeIdx in xrange(1,len(path)): # path[0] is the root node, which already exists in tree
        nodeLabel = path[nodeIdx]
        if data.verbose: value = verboseTree.get_node(nodeLabel).tag
        else: value = tree.get_node(nodeLabel).tag # should be same as nodeLabel
        try: subtree.create_node(value, nodeLabel, parent=path[nodeIdx-1])
        except: pass # node must've already been created from passed in subtree
    return subtree

# given a node, finds parent
# will not work if leafNode == tree.root
def findParent(data, leafNode):
    tree = data.tree
    pathToRule = bfsPaths(tree, tree.root, leafNode)
    parentNode = pathToRule[-2]
    return parentNode

# saves all the current arguments in profile to a file
def saveToFile(profile, writeFile, defaultArgsList):
    finalStr = ""
    # update all dictionaries in defaultArgsList into one dictionary
    defaultArgs = dict()
    for d in defaultArgsList: defaultArgs.update(d) # use 1 big dict
    for ruleNum in sorted(profile.keys()):
        finalStr += ("START\n%s\n" % ruleNum)
        if ruleNum in defaultArgs: # some rules might not have parameters
            iterArgs = defaultArgs[ruleNum]
            for argElem in iterArgs:
                if type(iterArgs) == list: finalStr += "%s\n" % argElem
                elif type(iterArgs) == OrderedDict:
                    finalStr += "%s, %s\n" % (argElem, iterArgs[argElem])
    with open(writeFile, 'w') as fout:
        fout.write(finalStr)

# find better way to do this...
def findDefaultArgsDict(data, parentNode):
    if parentNode == 'Permission': return data.defaultArgsPermission
    elif parentNode == 'Umask': return data.defaultArgsUmask

# takes in a dictionary and adds all the arguments to that dictionary
def addAllArgs(ruleNum, argList, defaultArgsDict):
    if ',' not in argList[0]: # ruleNum should hash to a list
        defaultArgsDict[ruleNum] = argList
    else: # ruleNum should hash to an ordered dict
        def correctPair(s):
            t1, t2 = s.split(', ')
            if t1 == 'True': t1 = True
            if t1 == 'False': t1 = False
            if t2 == 'True': t2 = True
            if t2 == 'False': t2 = False
            return (t1, t2)
        lst = map(correctPair, argList)
        defaultArgsDict[ruleNum] = OrderedDict(lst)

# reads in the contents of saveArgs.txt
# sets the correct parameters and creates profile and verboseProfile
def readInProfile(data, readFile):
    data.defaultArgsPermission, data.defaultArgsUmask = dict(), dict()
    profile, verboseProfile = dict(), dict()
    with open(readFile, 'r') as fin:
        contentList = fin.read().split('START')
    contentList = map(lambda s: s.splitlines(), filter(lambda lst: len(lst), contentList))
    contentList = map(lambda lst: filter(lambda lst2: len(lst2), lst), contentList)
    for ruleList in contentList:
        ruleNum, argList = ruleList[0], ruleList[1:]
        if len(ruleList) != 1: # rule has args
            parentNode = findParent(data, ruleNum)
            defaultArgsDict = findDefaultArgsDict(data, parentNode) # this aliases defaultArgsDict w/ correct dict
            addAllArgs(ruleNum, argList, defaultArgsDict)
        # now add rule to profile and verboseProfile
        profile[ruleNum] = data.tree.get_node(ruleNum).tag
        verboseProfile[ruleNum] = data.verboseTree.get_node(ruleNum).tag
    return profile, verboseProfile

def initializeDefaultArgs(data):
    data.defaultArgsPermission = permission.initializePermission() # map ruleNum to ordered dict of default args
    data.defaultArgsUmask = umask.initializeUmask() # ruleNum --> set of allowed args

# this function is a hard-coded solution (preferably replaced with a better solution) to the customize option
# exec does not work in the below function
def decideCustomize(data, ruleCust, parentNode):
    if parentNode == "Permission": permission.customizePermission(data, ruleCust)
    elif parentNode == "Partition": partition.customizePartition(data, ruleCust)
    elif parentNode == "Umask": umask.customizeUmask(data, ruleCust)
    elif parentNode == "Ownership": ownership.customizeOwnership(data, ruleCust)
    elif parentNode == "Group Ownership": groupownership.customizeGroupOwnership(data, ruleCust)
    elif parentNode == "Public Directories": publicdirectories.customizePublicDirectories(data, ruleCust)

### END UTILITY FUNCTIONS ###

# initializes data and creates empty profile + verboseProfile
def init(data):
    initializeDefaultArgs(data)
    profile = dict() # maps ruleNum to ruleNum: ruleDescription
    verboseProfile = dict() # verbose version of profile
    return profile, verboseProfile

def editorMain():
    data = Struct()
    with open('jsonifiedtree.py', 'r') as fin:
        contents = fin.read()
    data.tree = tree = treeOrg.unjsonify(contents)
    data.verboseTree = verboseTree = treeOrg.createTree(showDescript=True)
    profile, verboseProfile = init(data)
    while True:
        userIn = raw_input("""--------------------
                           MAIN EDITOR:
                           Enter a command: view tree : displays tree of all rules (optional: verbose)
                                            view profile : displays custom profile (optional: verbose)
                                            view profile tree : displays profile as subtree (optional: verbose)
                                            new : loads an empty profile
                                            load profile [NUM]: use contents of 'saveArgs[NUM].txt'
                                            add __ to profile : adds selected rule to profile
                                            customize __ : allows parameterization of selected rule
                                            delete __ from profile : deletes selected rule from profile
                                            save to profile [NUM]: save current profile to 'saveArgs[NUM].txt'
                                            quit : quit the console\n""")
        try:
            userIn = userIn.strip()
            commandArgs = userIn.split(' ')
            command = commandArgs[0]
            if userIn == 'view tree': tree.show()
            elif userIn == 'view tree (verbose)': verboseTree.show()
            elif userIn == 'view profile' or userIn == 'view profile (verbose)':
                if len(profile) == 0: print('Profile is empty.')
                else:
                    if 'verbose' in userIn: printProfile(verboseProfile)
                    else: printProfile(profile)
            elif 'view profile tree' in userIn:
                if len(profile) == 0: print('Profile is empty.')
                else:
                    data.verbose = verbose = 'verbose' in userIn
                    subtree = Tree()
                    if verbose: rootValue = verboseTree.get_node(tree.root).tag
                    else: rootValue = tree.root
                    subtree.create_node(rootValue, tree.root) # create root node
                    for endNode in profile.keys():
                        pathToNode = bfsPaths(tree, tree.root, endNode)
                        if pathToNode == None: errorMsg("ERROR: Cannot find path to %s." % endNode)
                        subtree = drawPath(data, subtree, pathToNode)
                    print("")
                    subtree.show()
            elif command == 'new': profile, verboseProfile = init(data)
            elif command == 'load':
                profileNum = commandArgs[2]
                readFile = "saveArgs%s.txt" % profileNum
                profile, verboseProfile = readInProfile(data, readFile)
            elif command == 'add':
                ruleAdd = commandArgs[1]
                if len(filter(lambda k: ruleAdd in k, profile.keys())) != 0: # checks if ruleAdd is already a key
                    errorMsg("ERROR: %s is already in profile." % ruleAdd)
                else:
                    addNode = tree.get_node(ruleAdd)
                    if addNode != None:
                        profile[ruleAdd] = addNode.tag
                        verboseProfile[ruleAdd] = verboseTree.get_node(ruleAdd).tag
                    else: errorMsg("ERROR: %s does not exist." % ruleAdd) # chose a rule that doesn't exist
            elif command == 'customize':
                ruleCust = commandArgs[1]
                if ruleCust not in profile.keys(): errorMsg("ERROR: %s is not in profile." % ruleCust)
                parentNode = findParent(data, ruleCust)
                # TODO: figure out odd exec bug below
                #strToRun = "permission.customizePermission(data, ruleCust)"
                #print strToRun
                #exec(strToRun)
                decideCustomize(data, ruleCust, parentNode) # TODO: find a better solution for this
            elif command == 'delete':
                ruleDel = commandArgs[1]
                if ruleDel in profile.keys():
                    del profile[ruleDel]
                    del verboseProfile[ruleDel]
                else: errorMsg("ERROR: %s is not in profile." % ruleDel)
            elif command == 'save':
                profileNum = commandArgs[3]
                writeFile = "saveArgs%s.txt" % profileNum
                saveToFile(profile, writeFile, [data.defaultArgsPermission, data.defaultArgsUmask])
            elif userIn == 'quit': quit()
            else: errorMsg('Command not recognized.')
            print('\nCommand Successful!')
        except Exception as e:
            print "ERROR:", e.args

print("To run editor, call editorMain().")
#editorMain()
