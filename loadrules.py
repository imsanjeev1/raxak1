import datetime
import glob

# (c) 2014 Cloud Raxak Inc.
#
#	This is an abbreviated version of the old rulegui.py. It only loads the XML file
#	corresponding to the DISA rules and creates two global dicts: rules and profiles
#	profiles is the mapping between profile->list of rules
#	rules is a dict indexed by rule name (i.e., 'V-12345') and returns a 2 element list of
#	the check and the fix for that rule as strings
# 
#	10/18/2014	PGM	New file created
#	12/22/2014	ASG	changes to load the rules of all available xml files
#				Added getRulesForProfile function to retrieve the rule list of corresponding OS.
#	12/24/2014	ASG	Make the global rulelist with an assumption that rule id would be unique with other OS DISA rule list	
#				to provide the description of Check/Fix of the rule.

profileDescription = {}
all_os_dict = {}
profileDetails = []


def load():
    for file in glob.glob("*.xml"):
        print("Rules loaded from an xml file = " + file)
        rules = {}
        import xml.etree.ElementTree as ET
        tree = ET.parse(file)
        root = tree.getroot()
        rootTag = root.tag
        rootTag = rootTag.replace("Benchmark", "")
        groupTag = rootTag + "Group"
        ruleTag = rootTag + "Rule"
        fixtextTag = rootTag + "fixtext"
        checkTag = rootTag + "check"
        check_contentTag = rootTag + "check-content"
        profileTag = rootTag + "Profile"
        selectTag = rootTag + "select"
        titleTag = rootTag + "title"
        descriptionTag = rootTag + "description"

        """ Create two dictionaries
            First contains all the rule. Each rule has a list with check and fix
            The key in the rule dictionary is the rule id
            Second contains all the rule ids assigned to a profile
            The is the profile id
        """

        os_name = ""
        profiles = {}
        os_dict = {}

        for child in root:
            if (child.tag == titleTag):
                os_name = child.text.encode('utf-8')
            if (child.tag == groupTag):
                for groupChild in child:
                    if (groupChild.tag == ruleTag):
                        severity = str(groupChild.get("severity"))
                        for ruleField in groupChild:
                            if (ruleField.tag == fixtextTag):
                                fix = ruleField.text.encode('utf-8')
                            if (ruleField.tag == titleTag):
                                title = ruleField.text.encode('utf-8')
                            if (ruleField.tag == checkTag):
                                for checkField in ruleField:
                                    if (checkField.tag == check_contentTag):
                                        check = checkField.text.encode('utf-8')
                        rules[child.get("id")] = [check, fix, title, severity]

            if (child.tag == profileTag):
                ruleItems = []
                for selectChild in child:
                    if (selectChild.tag == selectTag):
                        if (selectChild.get("selected") == "true"):
                            ruleItems.append(selectChild.get("idref"))

              #	PGM updated 11/18 to get more verbose title text instead of simple profile id

                profileName = child.get("id")
                for i in child:
                    if (i.tag == titleTag):
                        profileName = i.text.encode('utf-8')
                    if (i.tag == descriptionTag):
                        description = i.text
                        # ASG
                        # Should populate the profile description only once and from U_RedHat_6... profile only
                        # Because we have added profile description text inside same xml file only
                        # And it will redudant to add the same description text in all newly added XML file
                        if (file in "U_RedHat_6_V1R2_Manual-xccdf.xml"):
                            profileDescription[profileName] = description
                            # profiles[profileName.replace(" ", "")] = ruleItems
                print("Profile: " + profileName)
                profiles[profileName] = ruleItems

        os_dict["rule_list"] = profiles
        os_dict["rules"] = rules
        all_os_dict[os_name] = os_dict

    for key, value in profileDescription.iteritems():
        profiledetailsdict = {}
        profiledetailsdict["profilename"] = key
        profiledetailsdict["description"] = value.strip()
        profiledetailsdict["rulescount"] = len(getRulesForProfile(key))
        profileDetails.append(profiledetailsdict)
        

def checkRule(rulenum):
    if ruleset.runCheckRule(rulenum):
        print ("Success")
    else:
        print ("Run fixRule (" + str(rulenum) + ")")


def fixRule(rulenum):
    ruleset.runFixRule(rulenum)


def showRule(rulenum, osName="Red Hat Enterprise Linux 6 Security Technical Implementation Guide"):
    try:
        os_dist = all_os_dict[osName]
        rules = os_dist["rules"]
        if rules['V-' + str(rulenum)][0]:
            return (rules['V-' + str(rulenum)][0])
        else:
            return "Unable to fetch description of the rule.Please contact the raxak administrator, if the problem persists."
    except:
        return "Unable to fetch description of the rule.Please contact the raxak administrator, if the problem persists."


def showFix(rulenum, osName="Red Hat Enterprise Linux 6 Security Technical Implementation Guide"):
    try:
        os_dist = all_os_dict[osName]
        rules = os_dist["rules"]
        if rules['V-' + str(rulenum)][1]:
            return (rules['V-' + str(rulenum)][1])
        else:
            return "Unable to fetch description of the rule.Please contact the raxak administrator, if the problem persists."
    except:
        return "Unable to fetch description of the rule.Please contact the raxak administrator, if the problem persists."


def showtitle(rulenum, osName="Red Hat Enterprise Linux 6 Security Technical Implementation Guide"):
    os_dist = all_os_dict[osName]
    rules = os_dist["rules"]
    return (rules[str(rulenum)][2])


def getRulesForProfile(profile, osName="Red Hat Enterprise Linux 6 Security Technical Implementation Guide"):
    os_dist = all_os_dict[osName]
    profileRule_list = os_dist["rule_list"]
    return profileRule_list[profile]


def getSeverity(rulenum, osName="Red Hat Enterprise Linux 6 Security Technical Implementation Guide"):
    os_dist = all_os_dict[osName]
    rules = os_dist["rules"]
    try:
        return (rules['V-' + str(rulenum)][3])
    except:
        return "low"
