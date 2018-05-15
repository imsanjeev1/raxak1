#!/usr/bin/env python
#
#   commonstub.py
#   (c) 2015    Cloud Raxak, Inc. All rights reserved
#
#   This stub program is what is sent over execnet to the remote
#   server to start each connection. It contains global context
#   and core functions used by the various checkRuleXXX and fixRuleXXX
#   code elements in ruleset.py and similar files.
#   It needs to be imported into each of these files to ensure
#   that compile-time errors are eliminated.
#
#   Code in initgatewaycode.py is appended to the source code derived from
#   commonstub.py.
#   Ensure that all executable code is in initgatewaycode, and only passive function calls
#   are in commonstub.


import pickle, types, sys, platform, string, traceback
import os
import subprocess
import re
import ConfigParser
import time
import shutil
import string
import socket
from socket import getaddrinfo
from datetime import datetime, date

# Global Variables------------------------------
verbose = True
runlocal = True
consoleChan = None

##Password aging controls
PASS_MAX_DAYS = 60
PASS_MIN_DAYS = 1
PASS_MIN_LEN = 14
PASS_WARN_AGE = 7

OsName = ""
OsVersion = ""
g_rule38481FailAndMnual = False
g_rule38447FailAndMnual = False
previous_runlevel = None
current_runlevel = None
uid_value = ""
uid_max_value = ""
commandsOutDict = {}

#Redirecting all aide configuration check output into this file
aideTmpLogFile = "/tmp/aidelog.txt"

# Utility Functions-------------------------------------------------------

# Cloudraxak logging function
def mylogging (line):
    print(line)
    return

# ASG
# Convert the OS version string into tuple for the comparision
def versiontuple(v):
    return tuple(map(int, (v.split("."))))


# ASG
# Retrieve the OS name, OS version and set the values in the global variable for further operations
def SetOsValues():
    global OsName, OsVersion
    import os
    import re
    import platform
    try:
        OsName = platform.dist()[0]
        OsVersion = platform.dist()[1]
        if len(OsName) != 0:
            OsName = str(platform.dist()[0])
            OsVersion = versiontuple(str(platform.dist()[1]))
        if len(OsVersion) == 0:
            if os.path.exists('/etc/os-release'):
                file_data = open('/etc/os-release', 'r').readlines()
                for element in file_data:
                    if re.match(r'NAME', element, re.M | re.I):
                        OsName = element.split('=')[1].split('"')[1]
                    elif re.match(r'VERSION=', element, re.M | re.I):
                        OsVersion = element.split('=')[1].split('"')[1]
                        # OsVersion = versiontuple(os_v)
            elif os.path.exists('/etc/system-release'):  # Amazon Linux AMI 2013.03
                file_data = open('/etc/system-release', 'r').readlines()
                if "amazon linux ami release" in (file_data[0]).lower():
                    OsName = "Amazon Linux AMI"
                    OsVersion = (file_data[0]).split()[-1]

    except Exception as e:
        print ("Channel code: SetOsValues: Exception " + str(e))
        OsName = ""
        OsVersion = ""


SetOsValues()


def removeSpaces(string):
    return "".join(string.split())


def writeFile(filename, contents, mode='wt'):
    # wt stands for write text
    fout = None
    try:
        fout = open(filename, mode)
        fout.write(contents)
    finally:
        if (fout != None): fout.close()
    return True


def substituteLines(lineBeginWith, replaceLine, filename):
    textNoSpaces = removeSpaces(lineBeginWith)
    subLineCount = 0
    newContents = ""
    replaceLine = replaceLine + '\n'
    with open(filename, 'r') as f:
        for line in f:
            lineNoSpaces = removeSpaces(line)
            if line[0:len(textNoSpaces)] == textNoSpaces:
                subLineCount += 1
                newContents += replaceLine
            # check that I append it as a new line
            else:
                newContents += line
    writeFile(filename, newContents)
    if (subLineCount == 0):
        appendToFile(filename, replaceLine)
    return subLineCount


def removeUnwantedLines(filename, unwanted):
    with open(filename, 'r') as f:
        newContents = ""
        for line in f:
            if unwanted not in line:
                # check that I append it as a new line
                newContents += line
    writeFile(filename, newContents)


def lineInFile(filename, line):
    contents = readFile(filename)
    contentsNoSpaces = removeSpaces(contents)
    return removeSpaces(line) in contents


def readFile(filename, mode='rt'):
    # rt stands for read text
    fin = contents = None
    try:
        fin = open(filename, mode)
        contents = fin.read()
    finally:
        if (fin != None): fin.close()
    return contents


# def logging( line ):
#	global consoleChan
#	print( "consoleChan = " + str(consoleChan))
#	print( "runlocal = " + str(runLocal))
#	if runlocal:
#		import TG
#		TG.consoleLog( line )
#	else:
#		print (line)
#		consoleChan.send( line )
#	return

def logging(line):
    print(line)
    return


# PGM 10-16-2014	Removed class RuleDef, pulled all methods to top level


# Python 2.7
# def runOnShell(commands):
#    return subprocess.check_output(''.join(commands), shell=True)
# Python 2.6

def runOnShell(command, printConsoleLog=True):
    ret = ""  # return output string
    rc = 0  # return code value

    try:

        # PGM: Note--
        # subprocess.Popen cannot handle pipes since pipes are a shell construct
        # many of the calls to runOnShell were actually piped commands that broke.
        # solution is to either fork a shell to handle the pipes (as below), or to
        # programatically separate the individual command lines and build your own pipe in
        # runOnShell as in stackoverflow.com/questions/14568663/invoking-pipe-...
        # Having shell=True is a security vulnerability but is OK in our context since the
        # command being executed is programattically bounded.

        # (Previous code)
        # ret = subprocess.Popen(command, shell=True, stdout=subprocess.PIPE).communicate()[0]
        # ASG: Modified the code to fetch the error message along with command's output and
        # Return the appropriate message (output or error message) based on outcome.

        proc = subprocess.Popen(command, shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        # logging('> Os = ' + str(OsName) + ', OsVersion = ' + str(OsVersion))

        out, err = proc.communicate()
        rc = proc.returncode

        if err and rc:
            rc = -1
            if out:
                ret = str(out)
            ret += str("Error => " + err)
        elif out:
            rc = 0
            ret = str(out)

    except Exception as e:
        rc = -1
        # ret = "subprocess.Popen error"+ sys.exc_info()[0]
        ret = str("runOnShell : Exception => " + str(e))

    # Printing output and error message as a console log
    if printConsoleLog:
        logging('# ' + command)
        for line in ret.splitlines():
            logging('> ' + line)

    if (rc < 0):
        # ASG: Printing debug logs (OS name and OS version) in error case scenario.
        logging('> Os = ' + str(OsName) + ', OsVersion = ' + str(OsVersion))

    return ret


def appendToFile(filename, appendText, addNewLine=False):  # assumes at end of linenewline character
    filebasename = str(os.path.basename(filename))
    newfilename = "/tmp/" + filebasename
    runOnShell('cp -f ' + filename + ' ' + newfilename)
    runOnShell("ls -l /tmp")
    runOnShell('chmod 666 ' + newfilename)

    appendLineFlag = False  # For indicating whether appendText ia vailable or not
    with open(newfilename, "r+") as myfile:
        for line in myfile:
            if isL (line) and (appendText in line):
                appendLineFlag = True
                break
        # If line is not available, try to append line at the EOF
        if not appendLineFlag:
            myfile.write(appendText)

    runOnShell('cp -f ' + newfilename + ' ' + filename)
    runOnShell('rm -f ' + newfilename)


def installNecessaryPackages():
    if OsName.lower() == "ubuntu":
        if not os.path.exists('/usr/sbin/sysv-rc-conf'):
            runOnShell('apt-get -y install sysv-rc-conf', False)
        #For ldapsearch command.
        if runOnShell('dpkg -s ldap-utils >/dev/null 2>&1; echo $?',False):
            runOnShell('apt-get -y install ldap-utils', False)
    else:
        if runOnShell('rpm -q openldap-clients >/dev/null 2>&1; echo $?',False):
            runOnShell('yum -y install openldap-clients',False)

installNecessaryPackages()


def atoi(s):
    if s == "":
        return "error"
    else:
        p = re.compile(r'[^\d-]*(-?[\d]+(\.[\d]*)?([eE][+-]?[\d]+)?)')
        m = p.match(s)
        if m:
            result = m.groups()[0]
            if "." in result or "e" in result or "E" in result:
                return int("{1}".format(s, float(result)))
            else:
                return int('{1}'.format(s, int(result)))
        else:
            print "unable to convert '" + s + "'"
            return "error"


def tokenMatch(src, dest):
    # PGM: there were several errors. the split function used was src.split(" ") which
    # does not split on tabs. the return was all (x in .. which only works if all tokens are found)
    sL = filter(lambda a: a != "", src.split())

    dL = dest.split()
    return any(x in dL for x in sL)


def findDefaultRunLevel():
    global previous_runlevel, current_runlevel
    previous_runlevel = None
    output = runOnShell("runlevel",False).replace("\n", "")
    if output.find("N") != -1:
        current_runlevel = output.split("N")[1].strip()
        current_runlevel = current_runlevel + ":on"
    else:
        previous_runlevel = output.split(" ")[0] + ":on"
        current_runlevel = output.split(" ")[1] + ":on"


findDefaultRunLevel()


def getUID():
    global uid_value, uid_max_value

    if OsName.lower() == "ubuntu":
        uid_value = "1000"  # DEFAULT VALUE FOR UBUNTU
    else:
        uid_value = "500"

    uid_max_value = "60000" # DEFAULT VALUE FOR ALL OS

    # Fetching the value of UID_MIN, UID_MAX from login.defs file for user.
    uid_param_value = runOnShell('grep "UID_MIN" /etc/login.defs | grep -v ".*_UID_MIN" | grep -v "^#"',False)
    uid_param_max_value = runOnShell('grep "UID_MAX" /etc/login.defs | grep -v ".*_UID_MAX" | grep -v "^#"',False)
    module_search_obj_for_alapha = re.compile(r'([Aa-zZ])').search(uid_param_value)
    module_search_max_obj_for_alapha = re.compile(r'([Aa-zZ])').search(uid_param_max_value)
    # UID_MIN value
    if module_search_obj_for_alapha == None:
        module_search_obj = re.compile(r'(\d+)$').search(uid_param_value)
        if module_search_obj:
            uid_value = module_search_obj.group(1)
    # UID_MAX value
    if module_search_max_obj_for_alapha == None:
        module_search_max_obj = re.compile(r'(\d+)$').search(uid_param_max_value)
        if module_search_max_obj:
            uid_max_value = module_search_max_obj.group(1)

getUID()


def checkingAuditService():
    logging("Checking the audit service installation.")
    if os.path.exists('/sbin/auditd') == False:
        logging("The audit daemon service is not installed")
        return False
    else:
        logging("\nChecking the runtime status of auditd service.")
        if OsName.lower() == 'ubuntu':
            audit_service_status = runOnShell("service auditd status").translate(string.maketrans("\n\t\r", "   "))
            audit_service_level = runOnShell("sysv-rc-conf --list auditd").translate(string.maketrans("\n\t\r", "   "))
            if (tokenMatchIC("* auditd is not running.", audit_service_status) or \
                        tokenMatchIC("auditd 0:off 1:off 2:off 3:off 4:off 5:off 6:off S:off", audit_service_level)):
                return False
        elif OsVersion >= (7, 0):
            audit_service_status = runOnShell('systemctl status auditd.service')
            match_object = filter(lambda element: re.search(r'Active', element), audit_service_status.split('\n'))[0]
            audit_enable_status = runOnShell("systemctl is-enabled auditd.service").translate(
                string.maketrans("\n\t\r", "   "))
            if 'running' in match_object and 'enabled' in audit_enable_status:
                return True
            else:
                return False
        else:
            audit_service_status = runOnShell("service auditd status").translate(string.maketrans('\n\t\r', '   '))
            audit_service_level = runOnShell("chkconfig --list auditd").translate(string.maketrans("\n\t\r", "   "))
            if (tokenMatchIC("auditd is stopped", audit_service_status) or \
                        tokenMatchIC("auditd 0:off 1:off 2:off 3:off 4:off 5:off 6:off", audit_service_level)):
                return False
    return True


def setPluginParamYum(bool_value):
    if bool_value == False:
        logging("CloudRaxak  disabling the 'plugin' parameter in yum.conf file.")
        token_match = "plugins=1\n"
        replace_param = "plugins=0\n"
    else:
        logging("CloudRaxak  enabling the 'plugin' parameter in yum.conf file.")
        token_match = "plugins=0\n"
        replace_param = "plugins=1\n"

    with open("/etc/yum.conf", "r") as f:
        file_data = ""
        lines = f.readlines()
        for line in lines:
            if isL(line) and "plugins" in line:
                if tokenMatchIC(token_match, line):
                    file_data += replace_param
            else:
                file_data += line
        fout = None
        try:
            fout = open("/etc/yum.conf", 'wt')
            fout.write(file_data)
        except:
            pass
        finally:
            if fout is not None:
                fout.close()


def checkAPT_GETAndInstall():
    '''   
    Description->
    It will check whether apt-get is installed or not and if not, it will install apt-get tool
    Procedure->
    The below prodecure for installing apt-get tool, if it is not installed in Ubuntu
    There are steps to install apt-get
    #Download apt related files for 64 bit
    step 1) wget http://ftp.us.debian.org/debian/pool/main/a/apt/apt_0.8.10.3+squeeze1_amd64.deb http://ftp.us.debian.org/debian/pool/main/g/gcc-4.4/libstdc++6_4.4.5-8_amd64.deb
                            OR
    #Download apt related files for 32 bit
    step 1) wget http://ftp.us.debian.org/debian/pool/main/a/apt/apt_0.8.10.3+squeeze1_i386.deb http://ftp.us.debian.org/debian/pool/main/g/gcc-4.4/libstdc++6_4.4.5-8_i386.deb
    #replace old by new packages follow 2 steps
    step 2) sudo dpkg -P libapt-pkg4.12 apt
    step 3) sudo dpkg -i libstdc++6_4.4.5-8_*.deb apt_0.8.10.3+squeeze1*.deb debian-archive-keyring_2012.4_all.deb
    #Update apt-get
    step 4) sudo apt-get update
    #Try to forcefully install apt-get
    step 5) sudo apt-get -f -y install
    '''
    # Indicates apt-get installation status
    aptgetStat = False
    dpkgRes = runOnShell("dpkg -S apt-get", False).split()
    for ele in dpkgRes:
        if "apt:" in ele:
            aptgetStat = True
            break
        else:
            continue

    if aptgetStat == True:
        # apt-get is already installed and no need to install again
        logging("apt-get is already installed")
        return True
    else:
        # the below procedure for installing apt-get
        logging("apt-get is not available. So, downloading apt package and installing apt-get")
        runOnShell(
            "wget http://ftp.us.debian.org/debian/pool/main/a/apt/apt_0.8.10.3+squeeze1_amd64.deb http://ftp.us.debian.org/debian/pool/main/g/gcc-4.4/libstdc++6_4.4.5-8_amd64.deb")
        runOnShell("dpkg -P libapt-pkg4.12 apt", False)
        runOnShell("dpkg -i libstdc++6_4.4.5-8_*.deb apt_0.8.10.3+squeeze1*.deb debian-archive-keyring_2012.4_all.deb", False)
        runOnShell("apt-get update", False)
        runOnShell("apt-get -f -y install", False)

    aptgetRes = runOnShell("dpkg -s apt", False)
    if ("not installed" in aptgetRes) or ("deinstall" in aptgetRes) or ("error" in aptgetRes):
        logging("apt-get is not installed because apt package is not available")
        return False
    else:
        logging("apt-get is susccessfully installed")
        return True


def checkSSHDSyntax():
    if not os.path.exists ("/etc/ssh/sshd_config"):
	logging ("SSH configuration file does not exist. Please fix it manually.")
	return None

    if not os.path.exists("/usr/sbin/sshd"):
	logging("The SSH service is not available which needs to be installed to be connected to the system. Hence, fix it in manually.")
	return None

    logging("Checking ssh configuration file validity.")
    sshRes = runOnShell("/usr/sbin/sshd -t")
    if "Disabling protocol version" in sshRes:
	#Not handling invalid ssh protocol
	return False
    elif "Could not load host key" in sshRes:
	logging ("Generating new ssh host keys.")
	sshKeyLoadList = [sshKey.split(":")[1] for sshKey in sshRes.splitlines()]
	#Generating keys for not existed keys
	for sshKey in sshKeyLoadList:
	    runOnShell ("echo 'y' | sudo /usr/bin/ssh-keygen -q -f " + sshKey  + " -C '' -N ''")

	#Again checking ssh configuration file for syntax errors.
	sshRes = runOnShell("/usr/sbin/sshd -t")

    if sshRes != "":
        logging("Since there is syntax error in ssh configuration file, need manual intervention to fix the configuration syntax error.")
        return None

    return True


def checkSSHDConfig():
    logging("Checking ssh configuration file validity.")

    sshRes = runOnShell("/usr/sbin/sshd -t")
    if "Disabling protocol version" in sshRes:
        # Not handling invalid ssh protocol
        return True

    if sshRes != "":
        logging(
            "Since there is syntax error in ssh configuration file, need manual intervention to fix the configuration syntax error.")
        return None

    logging("Checking the runtime status of ssh service.")
    if OsName.lower() == 'ubuntu':
        if "running" not in runOnShell("service ssh status").translate(string.maketrans("\n\t\r", "   ")):
            return False

        sshdLevelStatus = runOnShell("sysv-rc-conf --list ssh")
        if ("2:off" in sshdLevelStatus) or ("3:off" in sshdLevelStatus) or ("4:off" in sshdLevelStatus) or (
                    "5:off" in sshdLevelStatus):
            return False
    elif OsVersion >= (7, 0):
        if ("active (running)" not in runOnShell('systemctl status sshd.service')) or \
                ("enabled" not in runOnShell("systemctl is-enabled sshd.service").translate(
                    string.maketrans("\n\t\r", "   "))):
            return False
    else:
        if "is running" not in runOnShell("service sshd status"):
            return False

        sshdLevelStatus = runOnShell("chkconfig --list sshd")
        if ("3:off" in sshdLevelStatus) or ("5:off" in sshdLevelStatus):
            return False

    return True


def runSSHDCService():
    logging("Checking the runtime status of ssh service.")
    # This flag indicates whether ssh service should be stated or reloaded
    sshServiceFlag = False

    if OsName.lower() == 'ubuntu':
        sshFlag = "ssh"
        if "running" not in runOnShell("service ssh status").translate(string.maketrans("\n\t\r", "   ")):
            sshServiceFlag = True

        sshdLevelStatus = runOnShell("sysv-rc-conf --list ssh")
        if ("2:off" in sshdLevelStatus) or ("3:off" in sshdLevelStatus) or ("4:off" in sshdLevelStatus) or (
                    "5:off" in sshdLevelStatus):
            logging("Enabling the ssh service level.")
            runOnShell('sysv-rc-conf --level 2345 ssh on')
    elif OsVersion >= (7, 0):
        sshFlag = "sshd"
        if "enabled" not in runOnShell("systemctl is-enabled sshd.service").translate(
                string.maketrans("\n\t\r", "   ")):
            logging("Enabling the ssh service.")
            runOnShell("systemctl enable sshd.service")

        if "active (running)" not in runOnShell('systemctl status sshd.service'):
            sshServiceFlag = True
    else:
        sshFlag = "sshd"
        if "is running" not in runOnShell("service sshd status").translate(string.maketrans("\n\t\r", "   ")):
            sshServiceFlag = True

        sshdLevelStatus = runOnShell("chkconfig --list sshd")
        if ("3:off" in sshdLevelStatus) or ("5:off" in sshdLevelStatus):
            logging("Enabling the ssh service level.")
            runOnShell('chkconfig --level 35 sshd on')

    if sshServiceFlag:
        logging("Starting the ssh service.")
        runOnShell("service {0} start".format(sshFlag))
    else:
        logging("Reloading the ssh service.")
        runOnShell("service {0} reload".format(sshFlag))


def checkServiceRunlevel(serviceName):
    """Checking the service status & run level."""

    if "ntp" in serviceName:
        if OsName.lower() == "ubuntu":
            serviceName = "ntp"
    elif "cups" in serviceName:
        serviceName = "cups"
    else:
        pass

    logging("Checking the status of " + serviceName + " service.")
    if (OsName.lower() == 'ubuntu') or (OsVersion < (7, 0)):

        serviceStatus = runOnShell("service " + serviceName + " status")
	if ("not running" in serviceStatus) or ("stopped" in serviceStatus) or ("stop/waiting" in serviceStatus):
            logging(serviceName + " service is not running.")
            return False

        if OsName.lower() == "ubuntu":
            serviceStatus = runOnShell("/etc/init.d/" + serviceName + " status")
            if ("not running" in serviceStatus) or ("stopped" in serviceStatus) or ("stop/waiting" in serviceStatus):
                logging(serviceName + " service is not running.")
                return False

        if OsName.lower() == "ubuntu":
            runLevelFilePath = "/etc/init/rc-sysinit.conf"
            runLevelCmd = "sysv-rc-conf --list " + serviceName
        else:
            runLevelFilePath = "/etc/inittab"
            runLevelCmd = "chkconfig --list " + serviceName

        # Need to append all run levels which are need to be checked
        runLevelList = []

        # To find the service run level status
        serviceLevelStatus = runOnShell(runLevelCmd)

        runLevel = runOnShell("runlevel").split()

        # We need to check current run level, default run level, and run level - 3
        runLevelList.append(runLevel[1])
        runLevelList.append(3)

        if os.path.exists(runLevelFilePath):
            try:
                # Finding default run level. If not available in the file, considering 3 is the default run level.
                if OsName.lower() == "ubuntu":
                    defaultRunLevel = runOnShell("grep -v '^#' {0} | grep -w DEFAULT_RUNLEVEL | grep env | cut -d '=' -f2".format(runLevelFilePath))
                else:
                    defaultRunLevel = runOnShell("grep -v '^#' {0} | grep -w initdefault: | cut -d ':' -f2".format(runLevelFilePath))

                defaultRunLevel = int(defaultRunLevel)
            except Exception:
        	if OsName.lower() == "ubuntu":
		    logging("Default runLevel does not exist on the system which may cause of down the system on rebooting.")
		    return False
		else:
                    defaultRunLevel = 3

            runLevelList.append(defaultRunLevel)

            # Removing duplicate run levels from the run level list
        runLevelList = list(set(runLevelList))

        for checkRunLevel in runLevelList:
            if str(checkRunLevel) + ":" not in serviceLevelStatus:
                logging("run level {0} is not available".format(checkRunLevel))
                return False
            elif str(checkRunLevel) + ":off" in serviceLevelStatus:
                logging("Log run level {0} is off".format(checkRunLevel))
                return False
    else:
	status = runOnShell("systemctl is-active " + serviceName + ".service")
	status = status.splitlines()[0]
	if (status != "active") :
            logging(serviceName + " service is not running.")
	    return False 

	if "enabled" not in runOnShell("systemctl is-enabled " + serviceName + ".service") :
            logging(serviceName + " service is not enabled at runlevel.")
	    return False	

    return True

def CheckService(serviceName,serviceCheckMode=True):
    """Checking the package availability, service status & run level."""

    if "cron" in serviceName:
        if OsName.lower() == "ubuntu":
            serviceName = "cron"
    if not CheckPackage(serviceName,serviceCheckMode):
        return False

    if not checkServiceRunlevel(serviceName):
	return False

    return True

def fix_ubuntu_runlevel():
    '''This function intends to fix the default runlevel of ubuntu.'''
    runLevelFilePath = "/etc/init/rc-sysinit.conf"
    try:
        # Finding default run level. If not available in the file, considering 2 is the default run level.
        defaultRunLevel = runOnShell("grep -v '^#' {0} | grep -w DEFAULT_RUNLEVEL | grep env | cut -d '=' -f2".format(runLevelFilePath))
        defaultRunLevel = int(defaultRunLevel)
    except Exception:
        logging("Updating the rc-sysinit.conf file with default runlevel.")
        lastLine = ""
        concatLine = ""
        defaultRunlevel = False
        fileSplit = open("/etc/init/rc-sysinit.conf").readlines()
        for line in fileSplit:
             if isL(line) and re.match(r'\s*env\s*DEFAULT_RUNLEVEL', line, re.M | re.I):
		 if not defaultRunlevel:
                     if not tokenMatch("Cloud Raxak updated next line", lastLine):
                         concatLine += "# Cloud Raxak updated next line\n"
                     concatLine += "env DEFAULT_RUNLEVEL=2 \n"
                     defaultRunlevel = True
             else:
                  concatLine += line
             	  lastLine = line
        if not defaultRunlevel:
            logging("Adding the default runlevel.")
            if not tokenMatch("Cloud Raxak updated next line",lastLine):
                concatLine += "\n# Cloud Raxak updated next line\n"
            concatLine += "env DEFAULT_RUNLEVEL=2\n"

        fout = open("/etc/init/rc-sysinit.conf", 'w')
        if fout != None:	
            fout.write(concatLine)
            fout.close()


def RunService(serviceName, default_flag=True):
    serviceMessage = ""	
    executeService = "" 	
    # To identify different service names
 
    if "ssh" in serviceName:
	if OsName.lower() == "ubuntu":
	    serviceName = "ssh"
	else:
	    serviceName = "sshd"
    elif "ntp" in serviceName:
	if OsName.lower() == "ubuntu":
	    serviceName = "ntp"
    elif "cron" in serviceName:
        # Just enable the service if disabled at runlevel. Crontab is reloaded automatically since cron checks it's timestamp of modification
        # every minute. If any changes have been made to crontab file, cron will then examine the modification time on all crontabs and reload
        # those which have changed. Thus cron need not be restarted whenever a crontab file is modified.
        default_flag = False
	if OsName.lower() == "ubuntu":
	    serviceName = "cron"
    else:
	pass


    logging("Checking the status of " + serviceName + " service.")
    if (OsName.lower() == "ubuntu") or (OsVersion < (7, 0)):
        if OsName.lower() == "ubuntu":
            serviceStatus = runOnShell("/etc/init.d/" + serviceName + " status")
            if ("not running" in serviceStatus) or ("stopped" in serviceStatus) or ("stop/waiting" in serviceStatus):
                logging("Starting init.d service " + serviceName)
                runOnShell("/etc/init.d/" + serviceName + " start")
            else:
		if default_flag:
		    if "ntp" not in serviceName:
                	logging("Reloading init.d service " + serviceName)
                	runOnShell("/etc/init.d/" + serviceName + " reload")

	if default_flag:
	    if "ntp" in serviceName:
		serviceMessage = "Restarting the " + serviceName + " service."
		executeService = "service {0} restart; /etc/init.d/{0} restart".format(serviceName)
	    else:
        	serviceMessage = "Reloading the " + serviceName + " service."
        	executeService = "service {0} reload".format(serviceName)
        runServiceStatus = runOnShell("service " + serviceName + " status")
        if ("not running" in runServiceStatus) or ("stopped" in runServiceStatus) or ("stop/waiting" in runServiceStatus):
            serviceMessage = "Starting the " + serviceName + " service."
            executeService = "service {0} start".format(serviceName)

    	if OsName.lower() == "ubuntu":
            #Adding defaultRunlevel in file if defaultRunlevel doesn not exist in file in case of ubuntu.
            fix_ubuntu_runlevel()

        logging("Enabling the " + serviceName + " service level.")
        if OsName.lower() == "ubuntu":
            runOnShell("sysv-rc-conf --level 2345 " + serviceName + " on")
        else:
            runOnShell("chkconfig --level 2345 " + serviceName + " on")
    else:
        serviceStatus = runOnShell("systemctl is-enabled " + serviceName + ".service")
        if "masked" in serviceStatus:
        	runOnShell("systemctl unmask " + serviceName + ".service")
        elif "enabled" not in serviceStatus:
            logging("Enabling the " + serviceName + " service.")
            runOnShell("systemctl enable " + serviceName + ".service")

	if default_flag:
	    if "ntp" in serviceName:
		serviceMessage = "Restarting the " + serviceName + " service."
		executeService = "systemctl stop {0}.service; systemctl start {0}.service; systemctl restart {0}.service".format(serviceName)
	    else:
        	serviceMessage = "Reloading the " + serviceName + " service."
        	executeService = "systemctl reload {0}.service".format(serviceName)
	
	status = runOnShell("systemctl is-active " + serviceName + ".service")
	status = status.splitlines()[0]
	if (status != "active") :
        	serviceMessage = "Starting the " + serviceName + " service."
        	executeService = "systemctl start {0}.service".format(serviceName)

    if serviceMessage != "" and executeService !=  "":	
    	# Start/Reload the service
    	logging(serviceMessage)
    	runOnShell(executeService)


def ChangeUserAccountExpiryDate(user_account, lastPasswordChangeDate, passwordExpires, passwordInactive):
    import datetime
    if "password must be changed" in lastPasswordChangeDate:
        logging(str(user_account) + "'s Last password change is not set.")
        return None
    else:
        # Converting Last password change format
        lastPasswordChangeDate = runOnShell("date -d'" + lastPasswordChangeDate + "' +%Y-%m-%d")
        # Converting string to datetime.datetime format
        lastPasswordChangeDate1 = datetime.datetime.strptime(lastPasswordChangeDate[:-1], "%Y-%m-%d")
        if "never" in passwordExpires:
            passwordExpires = lastPasswordChangeDate1 + datetime.timedelta(days=35)
        else:
            passwordExpires = runOnShell("date -d'" + passwordExpires + "' +%Y-%m-%d")
            # Converting string to datetime.datetime format
            passwordExpires = datetime.datetime.strptime(passwordExpires[:-1], "%Y-%m-%d")

        if "never" in passwordInactive:
            # As per the STIG, assigning considering 60
            passwordInactive = lastPasswordChangeDate1 + datetime.timedelta(days=60)
        else:
            passwordInactive = runOnShell("date -d'" + passwordInactive + "' +%Y-%m-%d")
            # Converting string to datetime.datetime format
            passwordInactive = datetime.datetime.strptime(passwordInactive[:-1], "%Y-%m-%d")

        difflastPasswordChangeDateAndpasswordExpires = abs((passwordExpires - lastPasswordChangeDate1).days)
        difflastPasswordChangeDateAndpasswordInactive = abs((passwordInactive - lastPasswordChangeDate1).days)

        daysToADD = difflastPasswordChangeDateAndpasswordExpires + difflastPasswordChangeDateAndpasswordInactive

        # Adding password expiry and password inactive to the Last password change
        changedDate = lastPasswordChangeDate1 + datetime.timedelta(days=daysToADD)
        # removing Hours, Minutes, Seconds
        changedDate = runOnShell("date -d'" + str(changedDate) + "' +%Y-%m-%d")

        return changedDate[:-1]


def tokenMatchIC(src, dest):
    sL = filter(lambda a: a != "", src.lower().split(" "))
    # To remove () from string as it occured in rule:-38669
    dest = dest.translate(string.maketrans("()", "  "))
    dL = dest.lower().split(" ")
    # To remove empty string from list.
    dL = filter(lambda elem: elem != '', dL)
    return all(x in dL for x in sL)


def serviceInstalled(service):
    if service == "":
        return False
    else:
        return "No such file" not in service


def isL(line):
    # return line == "" or not(line[0] == "#")
    return not line.isspace() and not (line.startswith("#"))


def checkContainsValue(id, val, str):
    n = str.find(id)
    if n >= 0:
        return atoi(str[n + len(id):]) == val
    else:
        return False


def strcmp(a, b):
    return a.lower().lstrip(" ").rstrip(" ") == b.lower().lstrip(" ").rstrip(" ")


def keyValEqMatch(key, val, res):
    key = key.lower()
    val = val.lower()
    res = res.lower()
    n = res.find(key)
    if n >= 0:
        eq = res[n + len(key):].find('=')
        if eq >= 0:
            try:
                return filter(lambda x: not (x == ""),
                              res[n + len(key):][eq + 1:].split(" "))[0] == val
            except IndexError:
                return False
    return False


# ASG - TODO - Since keyValEqMatch is used in multiple place during checkRule or FixRule
#             Hence once keyValEqMatch_new is tested with all instance will rename it
def keyValEqMatch_new(key, val, res):
    '''This function will look for exacts key's value in a given string for the comparison, will return appropriately'''
    key = key.lower()
    val = val.lower()
    res = res.lower()
    n = res.find(key)
    if n > 0:
        if not res[n - 1] is " ":
            return False
    if n >= 0:
        try:
            if not res[n + len(key)] is " " and not res[n + len(key)] is "=":
                return False
            eq = res[n + len(key):].find('=')
            if eq >= 0:
                return filter(lambda x: not (x == ""),
                              res[n + len(key):][eq + 1:].split(" "))[0] == val
        except:
            return False
    return False


def getValueOfKey(key, res):
    '''This function will return with the value of key from the given string or else return None'''
    key = key.lower()
    res = res.lower()
    n = res.find(key)
    if n > 0:
        if not res[n - 1] is " ":
            return None
    if n >= 0:
        try:
            if not res[n + len(key)] is " " and not res[n + len(key)] is "=":
                return None
            eq = res[n + len(key):].find('=')
            if eq >= 0:
                return filter(lambda x: not (x == ""),
                              res[n + len(key):][eq + 1:].split(" "))[0]
        except:
            return None
    return None


def returnExpected(command, expectedOutput):
    output = runOnShell(command)
    # strip the white spaces from both the expected output, and output
    output = removeSpaces(output)
    expectedOutput = removeSpaces(expectedOutput)
    # return output==expectedOutput
    # compare the two
    # return (expectedOutput in output) or (output in expectedOutput)
    return expectedOutput in output


def hasFile(directory, filepath):
    return runOnShell("find " + directory + " -path " + "*" + filepath)

def checkMount(path):
	# Checking the partition of the directory eg. /tmp, /var, /var/log ...	
	logging("Checking "+ "'" + path + "'" +" is on its own partition or logical volume.")
	check_mount = runOnShell('mount |grep "^\/[^\/]" |grep "on[[:space:]]'+ path +'[[:space:]]"')

        if check_mount != "":
		logging("'" + path + "' has its own partition or logical volume.")
		return True

def CheckPackage(pkgName, checkMode=False):
    ''' Checking if the package installed on the system. If not, it will return False. 
	pkgName : Name of package
	checkMode : Purpose of this arguments to find the availability of service/package using different mode.
	checkMode : False : will check the package by checking the binary file.
	checking : True : will check the package/service by using command like dpkg,rpm as per Os.  
    '''

    #Checking package installation using installation tool
    logging("Checking if package of " + pkgName + " service is installed on the system.")
    if checkMode:
        serviceDaemonCheck = "/usr/sbin/"
        service_list = ["auditd", "iptables", "ip6tables"]
        if pkgName in service_list and (OsName.lower() == "ubuntu" or OsVersion < (7,0)):
            serviceDaemonCheck = "/sbin/"

        if not os.path.exists(serviceDaemonCheck + pkgName):
            logging("The {0} service's package is not available on the system. ".format(pkgName))
            return False
    else:
        pkgInstallTool = "rpm -q "
        checkMode = True
        if OsName.lower() == "ubuntu":
            pkgInstallTool = "dpkg -s "
            checkMode = False

        # Not displaying the console log output in case ubuntu machine
        pkgChkInfo = runOnShell(pkgInstallTool + pkgName, checkMode)
        if ("not installed" in pkgChkInfo) or ("deinstall" in pkgChkInfo) or ("error" in pkgChkInfo):
            # In case of redhat flavours, masking the below log message because 'rpm -q ' command will give the same log message.
            if not checkMode:
                logging("Package of " + pkgName + " service is not installed on the system.")
            return False

    logging("Package of " + pkgName + " service is installed on the system.")
    return True

def CheckPasswdAge(pass_min, key_string):
     """This function returns either True or False depending on key value and key string provided in parantheses."""
     # To check the actual list of users, we need to check the default min uid stored in /etc/login.defs 
     # any new user created gets a uid from this file and more users created after that get a uid as Min_uid+1 and so on.
     min_uid = runOnShell('grep -w UID_MIN /etc/login.defs | awk -F" " \'{print $2}\'')
     user_list = runOnShell('cat /etc/passwd | awk -F":" \'$3 >= ' + min_uid + '\' | cut -d: -f1')
     user_list = user_list.split()
     count_wrong_passwd = 0
     for user in range(len(user_list)):
             check_age = runOnShell('chage -l '+ user_list[user] +' | grep "' + key_string + '" | awk -F":" \'{print $2}\'')
             check_age = int(check_age)
             logging('> ' + user_list[user] + ' password max age = ' + str(check_age))
             # Raxak Protect's special user does not count in the testing
             if user_list[user] == username:
                logging("> Ignoring check for Raxak Protect username " + user_list[user])
                continue
             if check_age != pass_min:
                     count_wrong_passwd += 1
     if count_wrong_passwd:
             return False
     else:
             return True

def InstallPackage(pkgName):
    '''
        Description: Install the passed package on the respective system.
        Purpose: To avoid show/display the junk log message on the console.
        OS Support: centos(6.x, 7.x), Redhat(6.x, 7.x), amazon, and ubuntu.
    '''

    if OsName.lower() == "ubuntu":
        if not checkAPT_GETAndInstall():
	    return None
        pkgInstallTool = 'apt-get -y install '
        if "cron" in pkgName:
            pkgName = "cron"
	elif "audit" in pkgName:
            pkgName = "auditd"
    else:
        pkgInstallTool = 'yum -y install '
        if OsName.lower() == "amazon linux ami":
            yumFlag = False #To know whether yum is enabled or not
            yumFlagStr = "plugins=0" #yumFlag enabling string
            #open the /etc/yum.conf file for searching yumString
            with open("/etc/yum.conf", "r") as yumConfigFile:
                for line in yumConfigFile:
                    if isL(line) and tokenMatchIC(yumFlagStr, line):
                        yumFlag = True
                        break

            if not yumFlag:
                #If YUM flag is not enabled, enable it
                setPluginParamYum(False)

    logging ("Installing the " + pkgName + " package.")
    # Installing the package here
    installPkgInfo = runOnShell (pkgInstallTool + pkgName, False)
    	
    if "Failed to fetch" in installPkgInfo:
	logging("Abort the rule remediation since unable to install the package.")	
	return None			

    if "dpkg was interrupted" in installPkgInfo:
        logging ("dpkg is not properly configured.\ndpkg will be properly configured using 'dpkg --configure -a' command.")
        return None

    if (OsName.lower() == "amazon linux ami") and (not yumFlag):
        # Reverting the yum flag
        setPluginParamYum (True)

    return True

def validate_ip(ipAddress):
    '''
       This function takes an argument ipAddress(could be a domain name also ) and then checks whether it is in the right format.
       For eg: ipAddress = 192.168.0.56 would be correct. ipAddress = 192.168 would be wrong. If it has the right format it checks
       whether the ipAddress's and client machine's gateway is same, if not it returns False, if it does match it returns True.
       If ipAddress = domain_name then it returns True, please use socket.getaddrinfo() for validating domain names separately.  
    '''
    if re.search(r'\d?\d?\d?\.*\d?\d?\d?\.*\d?\d?\d?\.*\d?\d?\d', ipAddress, re.M|re.I):
        if not re.search(r'\d?\d?\d\.\d?\d?\d\.\d?\d?\d\.\d?\d?\d', ipAddress, re.M|re.I) or "0.0.0.0" in ipAddress or "127.0.0.1" in ipAddress:
            return False
        ipSplit = ipAddress.split('.')
        fetchGateway = runOnShell('ip route | grep -w "default via" | awk -F" " \'{print $3}\'')
        gatewaySplit = fetchGateway.split('.')
        if ipSplit[2] == gatewaySplit[2]:
            return True
        else:
            return False
    else:
        return True
     

def check_rsyslog_config():
    '''
       This function checks whether rsyslog is configured correctly on client machine. If anything wrong with 
       the configuration, it returns None and if everything is alright, it returns True. 
    '''
    if not CheckPackage("rsyslog"):
        logging("Rsyslog needs to be installed for forwarding local logs to a remote log host. Please install rsyslog manually and \
configure rsyslog as per your requirement. You can choose any protocol from TCP,UDP or RELP although RELP is recommended for reliable \
message delivery.")
        return None
    if not checkServiceRunlevel("rsyslog"):
        return None
    if not os.path.exists('/etc/rsyslog.conf'):
        logging("Rsyslog configuration file 'rsyslog.conf' does not exist. Please fix this manually.")
        return None
    with open("/etc/rsyslog.conf", "r") as fileRead:
        resultFlag = False
        relpFlag = False
        modFlag = False
        moduleFlag = False
        fileData = runOnShell('cat /etc/rsyslog.conf | grep -v "^#"', False)
        searchObjectimux = re.search(r'\$ModLoad\s+imuxsock', fileData)
        if (OsName.lower() == "redhat" or OsName.lower() == "centos") and OsVersion >= (7,0):
            searchObjectKernel = re.search(r'\$ModLoad\s+imjournal', fileData)
        else:
            searchObjectKernel = re.search(r'\$ModLoad\s+imklog', fileData)
        if searchObjectimux and searchObjectKernel:
            moduleFlag = True
        for line in fileRead:
            if isL(line):
                # searching if TCP is present
                searchObjectTCP = re.search(r'(([*][.][*])\s+@@\b)', line)
                # searching if UDP is present
                searchObjectUDP = re.search(r'(([*][.][*])\s+@\b)', line)
                # searching if RELP is present
                searchObjectRELP = re.search(r'(([*][.][*])\s+:omrelp:\b)', line)
                searchObjectMod = re.search(r'([$]ModLoad\s+omrelp\b)', line)
                if searchObjectTCP != None:
                    try:
                        tcpObj = line.split("@@")[1].rstrip('\n')
                        if ":" in tcpObj:
                                tcpSplit = tcpObj.split(":")
                                result = socket.getaddrinfo(tcpSplit[0], tcpSplit[1])
                                tcpip = tcpSplit[0]
                        else:
                                result = socket.getaddrinfo(tcpObj, None)
                                tcpip = tcpObj
                        if not validate_ip(tcpip):
                            resultFlag = False
                        else:
                            resultFlag = True
                    except:
                        logging("TCP configuration in the system is not correct, need to fix it manually.")
                        return None
                elif searchObjectUDP != None:
                    try:
                        udpObj = line.split("@")[1].rstrip('\n')
                        if ":" in udpObj:
                                udpSplit = udpObj.split(":")
                                result = socket.getaddrinfo(udpSplit[0], udpSplit[1])
                                udpip = udpSplit[0]
                        else:
                                result = socket.getaddrinfo(udpObj, None)
                                udpip = udpObj
                        if not validate_ip(udpip):
                            resultFlag = False
                        else:
                            resultFlag = True
                    except:
                        logging("UDP configuration in the system is not correct, need to fix it manually.")
                        return None
                elif searchObjectRELP != None:
                    if not CheckPackage("rsyslog-relp"):
                        logging("If you are using RELP for forwarding system logs to remote server you need to install package 'rsyslog-relp'.")
                        return None
                    try:
                        relpObj = line.split(":")[2].rstrip('\n')
                        relpPort = line.split(":")[3].rstrip('\n')
                        result = socket.getaddrinfo(relpObj, relpPort)
                        if not validate_ip(relpObj):
                            relpFlag = False
                        else:
                            relpFlag = True
                    except:
                        logging("RELP configuration in the system is not correct, need to fix it manually.")
                        return None
                elif searchObjectMod != None:
                    modFlag = True
        if relpFlag:
            if modFlag:
                resultFlag = True
            else:
                logging("RELP module not imported correctly. Please fix this manually.")
                return None
        if resultFlag and moduleFlag:
            logging("Configuration for forwarding log messages to a remote loghost is correct.")
            return True
        logging("Configuration for forwarding log messages to a remote loghost is not correct. Please fix this manually.")
        return None

def check_fstab_config():
    '''
        This function checks whether there is any configuration error is fstab file related to integer value in mount option column or \
        if there are less than 3 column for any mounted entry.
    '''
    filename = "/etc/fstab"
    # Taking backup of fstab file.
    fileContent = open (filename, "r").readlines()
    #checking for any configuration error in file.(Any entry with less than 6 column.)
    for line in fileContent:
        if isL(line):
            line = line.translate(string.maketrans("\n\t\r", "   ")).strip().split()
            if len(line) < 3:
                logging ("The below mentioned fstab configuration file entry has less than 3 columns which is wrong configuration. \
Please fix it manually.\n{0}".format (" ".join (line)))
                return False
            #Checking for any configuration error in file.(any device with wrong mounting point.)
            elif len(line) > 3:
                optionList = line[3].split(",")
                if any (re.match ("^\d+", option) for option in optionList):
                    logging ("The below mentioned entry has integer option. Please fix it manually.\n{0}".format (" ".join (line)))
                    return False
    return True

def pci_service_check(service,protocol):
    """This function intends to check the status following pci-dss services for different Os 
    1.daytime-stream (daytime(Sending back current time of day) at tcp protocol)-56041
    2.daytime-dgram (daytime(Sending back current time of day) at udp protocol)-56042
    3.chargen-stream (chargen(Sending as much character data as possible) at tcp protocol)-56043
    4.chargen-dgram (chargen(Sending as much character data as possible) at udp protocol)-56044
    5.echo-stream (echo(Echoing back incoming data) at tcp protocol)-56045
    6.echo-dgram (echo(Echoing back incoming data.) at udp protocol)-56079
    """

    logging("Checking if Extended Internet Services Daemon is installed.")
    if not os.path.exists('/usr/sbin/xinetd'):
        logging("Extended Internet Services daeamon (xinetd) is not installed which supports daytime-stream service\
 ,hence daytime-stream does not exist on the system.")
    	return True

    if protocol == "tcp":
        serviceName = service+'-stream'
    else:
        serviceName = service+'-dgram'
    if OsName.lower() == "ubuntu":
        logging("Checking Extended Internet Services Daemon status.")
	service_status = runOnShell('service xinetd status').translate(string.maketrans("\n\t\r", "   "))
        if tokenMatchIC("stop/waiting", service_status):
            logging("The extended Internet services daemon (xinetd) service is not running.")
            return True

    	logging("Checking if " +service+" service is installed.")
    	if not os.path.exists('/etc/xinetd.d/'+service):
    		logging(service+" service is not installed.")
    		return True
    	try:
    	    logging("Finding the "+ service +" service port value at " + protocol + " protocol.")
    	    daytimeTcpPort = runOnShell("sudo grep -w ^"+service+" /etc/services | cut -f3 | grep -w "+protocol+" | grep -v '^#'").split("/")[0]
    	except (IndexError, ValueError):
    	    logging("Since the default "+ service +"port is not defined. Hence, "+ service +" service is not working.")
    	    return True
    	
    	if not daytimeTcpPort:
    	    logging("Since the default daytime port is not defined at "+protocol+" protocol. Hence, "+ serviceName + " service is not working.")
    	    return True
    	else :
    	    logging("Checking if "+ serviceName+" service port " +daytimeTcpPort+" is enabled at "+protocol+" protocol.")
    	    daytimeAtTcp = runOnShell('netstat -aunp | grep xinetd |grep :'+ str(daytimeTcpPort)+' | grep '+protocol)
    
    	    logging("Checking if "+ serviceName +" is configured through xinetd.")
    	    if  daytimeAtTcp != "":
    	        logging(serviceName+" service is running at " + protocol +" protocol through xinetd.")
    	   	return False
    	    else:
    	        logging(serviceName+" service is not configured. Hence, "+ service +" is not running.")
    	   	return True
    else:	
        logging("Checking xinetd service status.")
        if ((OsVersion >= (7,0)) and (OsName.lower() == 'centos' or OsName.lower() == 'redhat')):
            service_status = runOnShell('systemctl is-active xinetd.service').replace('\n','')
    	    if service_status in ["inactive", "unknown","failed"]:
    	        logging("Extended Internet Services daeamon (xinetd) is not running.")
    	        return True
        elif "stopped" in runOnShell('service xinetd status').replace('\n',''):
	    logging("Extended Internet Services daeamon (xinetd) is not running.")
	    return True

    	logging("Checking if "+serviceName+" is installed.")
    	if not os.path.exists('/etc/xinetd.d/'+serviceName):
    	    logging(serviceName+" is not installed.")
    	    return True
    
    	logging("Checking the status of "+serviceName+" service.")
    	if "off" in runOnShell("chkconfig --list "+serviceName).translate(string.maketrans("\n\t\r", "   ")):
    	    logging(serviceName+" service is disabled.")
    	    return True
    
    logging(serviceName+" service is enabled.")
    return False


def pci_service_fix(service,protocol):
    """This function intends to fix the status of following pci-dss services for different Os 
    1.daytime-stream (daytime at tcp protocol)-56041		
    2.daytime-dgram (daytime at udp protocol)-56042		
    3.chargen-stream (chargen at tcp protocol)-56043		
    4.chargen-dgram (chargen at udp protocol)-56044		
    5.echo-stream (echo at udp protocol)-56045		
    6.echo-dgram (echo at udp protocol)-56079		
    """
    if protocol == 'tcp':
	service_name = service+'-'+'stream'
    else:
	service_name = service+'-'+'dgram'
		
    if OsName.lower() == "ubuntu":
        lastLine = ""
        fileData = ""	
        listOfLines = open('/etc/xinetd.d/'+service).readlines()
	service_count = False
	#Checking/Fixing the service specific file data.  
        for line in listOfLines:
            fileContentLine = line.translate(string.maketrans("\n\t\r", "   "))
            if isL(fileContentLine) and tokenMatchIC("disable", fileContentLine):
                continue
            elif isL(fileContentLine) and tokenMatchIC("}", fileContentLine):
                if "Cloud Raxak updated next line" not in lastLine:
                    fileData += "# Cloud Raxak updated next line\n"
                fileData += "disable = yes\n"
		service_count = True
            fileData += line
            lastLine = line

        fout = open('/etc/xinetd.d/'+service, 'w')
        if fout != None:
            fout.write(fileData)
            fout.close()

	runOnShell("service xinetd restart")
    else:
        runOnShell('chkconfig '+ service_name +' off; service xinetd restart')

def file_config_backup(filename):
    '''
        This function take backup of the any file and save the old changes in the same path.
    '''
    # Taking backup of fstab file.
    fileContent = open (filename, "r").readlines()
    timestamp = time.strftime("%Y%m%d-%H%M")
    fstabBackupFile = filename + timestamp
    shutil.copyfile(filename,fstabBackupFile)

def fix_fstab_conf(line,correctOption,wrongOption,mountPoint):
    '''
        This function is use to fix fstab related issue.
        Eq: V-57569, V-56009, V-56011, V-56021, V-56022, V-56023 and V-56024.
    '''
    if correctOption == "noexec":
        mount_option_list = ('noexec', 'user', 'users')
    else:
        mount_option_list = (correctOption, 'group', 'owner', 'user', 'users')
    newLine = ""
    line = line.translate(string.maketrans("\n\t\r", "   ")).strip()
    line = line.split(" ")
    line = filter(None, line)
    if mountPoint in line[1]:
        optionList = []
        try:
            mount_option = line[3].split(',') #Spliting the mount option to check nosuid option present or not.
            #Checking the mount option from right to left.
            optionList = [ele for ele in mount_option if (ele != wrongOption)]
        except:
            pass
        if not any(mountOption in mount_option_list for mountOption in optionList):
            optionList.append(correctOption)
        logging("Adding nosuid option to the line.")
        if len(line) > 3:
            if len(line) == 4:
                line.append("0")
            if len(line) == 5:
                line.append("0")
            newLine += line[0] + " " + line[1] + " "  + line[2] + " " + ",".join(optionList) + " " + line[4] + " " + line[5] + "\n"
            return newLine
        elif len(line) == 3:
            newLine += line[0] + " " + line[1] + " "  + line[2] + " " + ",".join(optionList) + " 0 0" + "\n"
            return newLine

def check_gui_system():
   '''
   This function checks whether the system is GUI or NON-GUI system.
   '''
   logging("Checking if the system is GUI based system.")
   if OsName.lower() == "ubuntu":
       if not CheckPackage('ubuntu-desktop') or not CheckPackage('xorg'):
           logging("Since this system is not a GUI based system, this rule is not applicable.")
           return True
   else:
       if not os.path.exists('/usr/bin/gconftool-2'):
           logging("Since this system is not a GUI based system, this rule is not applicable.")
           return True

# Global function for comman functionality of gconf rules.
def gconf_golbal_users(normalGetCommand):
    '''
    Description:
        This function checks gsetting schema valules in system-wide.
        1. Get the list of users from /etc/passwd file.
        2. Check the gsetting valuses through system-wide as login with respective user.

    Parameters:
        normalGetCommand - This represent the command to get the gsetting schema values.
    '''
    if OsName.lower() == "ubuntu" or ((OsName.lower() == "redhat" or OsName.lower() == "centos") and OsVersion >= (7,0)):
        # Listing the user accounts.
        userList = runOnShell("awk -F: '$3>=" + str(uid_value) + "&&$3<=" + str(uid_max_value) + "{print $1}' /etc/passwd", False).splitlines()
        if OsName.lower() == "centos" or OsName.lower() == "redhat":
            # Appending "root" user to userslist to run different command inthis case.
            userList.append("root")
        usersInfo = ""
        global commandsOutDict
        commandsOutDict = {}
        for userName in userList:
            # The command is differentiating based on login user in ubutnu or root user in centos or redhat and for remainig users.
            if (OsName.lower() == "ubuntu" and userName == username) or userName == "root":
                schemmaResult = runOnShell(normalGetCommand, False).strip('\n')
                commandsOutDict[userName] = schemmaResult
            else:
                loginGetCommand =  "sudo -u " + userName + " -H " + normalGetCommand
                schemmaResult = runOnShell(loginGetCommand, False).strip('\n')
                commandsOutDict[userName] = schemmaResult

def gsetting_package_check():
    '''
    This function is check and install the gsetting package if does not exist.
    '''
    if not os.path.exists("/usr/bin/gsettings"):
        if not InstallPackage("libglib2.0-bin"):
            return None
    if not os.path.exists("/usr/bin/dbus-launch"):
        if not InstallPackage("dbus-x11"):
            return None

def display_list_as_columns(inputList, noOfColumns):
    '''
    This function takes two arguments, a list and the no of columns you want to display your list into. Whichever list is passed as an 
    argument, it will be divided into the no of columns you pass as an argument.
    '''
    # Convert all the elements in the list to strings.
    inputList = map(str, inputList)
    # Add padding in the beginning itself.
    inputList = ["{0:30}".format(element) for element in inputList]
    # Initialize a counter for breaking the string with new lines.
    countNewLine = 0
    displayString = "\n"

    for idx in inputList:
        if countNewLine == noOfColumns:
            countNewLine = 0
            # Split with new line once the count reaches to no of columns.
            displayString += "\n"
        displayString += idx
        countNewLine += 1

    logging(displayString)
