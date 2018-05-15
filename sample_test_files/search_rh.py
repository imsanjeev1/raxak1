import xml.etree.ElementTree as ET
tree = ET.parse("U_RedHat_6_V1R2_Manual-xccdf.xml")
root = tree.getroot()
rootTag = root.tag
rootTag = rootTag.replace("Benchmark","")
groupTag=rootTag+"Group"
ruleTag=rootTag+"Rule"
fixtextTag=rootTag+"fixtext"
checkTag=rootTag+"check"
check_contentTag=rootTag+"check-content"
profileTag=rootTag+"Profile"
selectTag=rootTag+"select"

ruleDict = {}
profileDict = {}

for child in root:
    #Process Profiles
    if (child.tag == groupTag):
        groupId=child.get("id")
        ruleItem = []
        rule=[]
        rule=child.get("Rule")
        fixtext=rule.get("fixtext")
        ruleItem.append(fixtext)
        check=rule.get("check")
        check_content = check.text
        ruleItem.append(check_content)
        ruleDict[groupId] = ruleItem

print ruleDict
print ruleDict.keys()
