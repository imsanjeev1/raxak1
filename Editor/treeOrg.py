# This file uses the treelib library to create the initial tree structure

# (c) 2015 Cloud Raxak Inc. All Rights Reserved

import string, ast
from treelib import Tree, Node

fileName = 'overall'

# creates rulesTxt/[filename] to be read in later
def treeOrganize():
    fileRead = 'savedFiles/rulesOrganization/%s.csv' % fileName
    with open(fileRead, 'r') as fin:
        contents = fin.readlines()
    writeStr = ""
    ruleList = filter(lambda s: 'V-' in s, contents)
    for elem in ruleList:
        splitList = elem.split(',"')
        if 'V-' not in splitList[0]: continue
        ruleNum = string.strip(splitList[0], '"')
        ruleDescrip = string.strip(splitList[2], '"')
        print splitList
        print ruleNum, type(ruleNum)
        print
        writeStr += "%s %s\n" % (ruleNum, ruleDescrip)
    print writeStr
    fileWrite = 'savedFiles/rulesTxt/%s.txt' % fileName
    with open(fileWrite, 'w') as fout:
        fout.write(writeStr)
    return writeStr

# takes a line in and parses it into rule number and rule description
def parseRule(line):
    parsedList = line.split(' ')
    ruleNum = parsedList[0]
    ruleDescript = string.join(parsedList[1:], ' ')
    return ruleNum, ruleDescript

# create the tree with input file and return the finished tree
def createTree(showDescript=False):
    tree = Tree()
    with open('savedFiles/rulesTxt/%s.txt' % fileName, 'r') as fin:
        contentList = fin.readlines()
    currParent = None
    for line in contentList:
        if not line.startswith('V-'): # new category here, change parent
            currNode, parentNode = map(lambda s: s.strip(), line.split(','))
            currParent = currNode # set the new parent for following lines
            # now add node to tree
            if parentNode == 'NONE': parentNode = None
            tree.create_node(currNode, currNode, parent=parentNode)
        else: # is a rule, add to current category
            ruleNum, ruleDescript = parseRule(line) # TODO
            if showDescript: value = "%s: %s" % (ruleNum, ruleDescript)
            else: value = ruleNum
            tree.create_node(value, ruleNum, parent=currParent)
    # now strip away the \n randomly added to the end of value in every node
    for nodeObj in tree.all_nodes():
        nodeObj.tag = nodeObj.tag.strip()
    return tree


# takes in a jsonified tree and returns the correct tree structure
def unjsonify(jsonTree):
    def giveKey(d): # returns only key in d
        return d.keys()[0]
    def unjsonifyHelper(node, subtree):
        for childStruct in subtree[node]['children']: # childStruct is string if base case, else dict
            if type(childStruct) == str: newTree.create_node(childStruct, childStruct, parent=node)
            else:
                childNode = giveKey(childStruct)
                newTree.create_node(childNode, childNode, parent=node)
                unjsonifyHelper(childNode, childStruct)
    jsonTree = ast.literal_eval(jsonTree)
    root = giveKey(jsonTree)
    newTree = Tree()
    newTree.create_node(root, root) # initialize newTree with the root
    unjsonifyHelper(root, jsonTree) # add all the other nodes in the tree to newTree
    return newTree

