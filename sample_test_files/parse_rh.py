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

""" Create two dictionaries
    First contains all the rule. Each rule has a list with check and fix
    The key in the rule dictionary is the rule id
    Second contains all the rule ids assigned to a profile
    The is the profile id
"""
    
rules = {}
profiles = {}

for child in root:
    if (child.tag == groupTag):
        for groupChild in child:
            if (groupChild.tag == ruleTag):
                for ruleField in groupChild:
                    if (ruleField.tag == fixtextTag):
                        fix = ruleField.text
                    if (ruleField.tag == checkTag):
                        for checkField in ruleField:
                            if (checkField.tag == check_contentTag):
                                check = checkField.text
                rules[child.get("id")] = [check, fix] 

    if (child.tag == profileTag):
        ruleItems = []
        for selectChild in child:
            if (selectChild.tag == selectTag):
                if (selectChild.get("selected") == "true"):
                    ruleItems.append(selectChild.get("idref"))
        profiles[child.get("id")] = ruleItems

#Test: Map Profiles to Rules, check this in the xml
#for profile in profiles.keys():
#    for ruleItem in profiles.get(profile):
#        print profile+"["+ruleItem+"]="+str(rules.get(ruleItem))

for ruleId in rules.keys():
    print str(ruleId)
    print str(rules.get(ruleId))
    print "\n\n"
            
