#	Raxak.py
#	(c) 2015 Cloud Raxak Inc.
#
#	Created: June 9, 2015
#	
#	Raxak.py provides a commandline interface to the functionality of the Raxak Protect GUI
#
#	Generic usage:
#		raxak <command> <parameters> <options>
#
import sys, os, string
import requests, json, collections

headers = {'Accept': 'application/json',
           'Content-Type': 'application/json'}

serverIP = 'http://softlayer.cloudraxak.net'
APIprefix = serverIP + '/raxakapi/v1/'
cmdList = [
    ['help', 'help [command]'],
    ['apply', '''apply [profile] <auto> <repeat>
[profile] is required; valid profiles can be found by running raxak profiles
<auto> is an optional parameter: {auto | manual}; defaults to auto if missing
<once> is an optional parameter: {once | daily | weekly | monthly}; defaults to once'''],
    ['profiles', '''profiles : returns the list of valid security profiles'''],
    ['select', '''select usernameIP usernameIP ...
usernameIP is a list of one or more targets of the form raxak@1.2.3.4 which have already been enrolled in the system'''],
    ['remove', '''remove usernameIP
usernameIP is a target of the form raxak@1.2.3.4 which already exists in the selected target list'''],
    ['clear', '''clear : remove all selected target machines'''],
    ['list', '''list prints the currently selected target list'''],
    ['selectnickname', '''selectnickname nickname nickname ...
nickname is one or more nickname of an already enrolled target machine'''],
    ['removenickname', '''removenickname nickname
nickname is the nickname of an already selected target machine'''],
    ['addip', '''addip usernameIP nickname
usernameIP is a target of the form raxak@1.2.3.4
nickname is a string'''],
    ['deleteip', '''deleteip usernameIP'''],
    ['targets', '''targets: returns list of enrolled target machines'''],
    ['status', '''status : returns the status of the last run'''],
    ['report', '''report : generates a full compliance report based on the last run'''],
    ['login', '''setuser username email
username used to associate assets and logs
email unique email such as raxak@cloudraxak.com which must be preregistered with Cloud Raxak
all subsequent actions are carried out in the context of the username set here.
Issuing login again overrides the previous setuser if the username can be validated'''],
    ['logout', '''logout: logs out the user set via setuser'''],
    ['version', '''version: show the server code version''']
]

token = ""
tokenparm = ""
if os.path.isfile('/tmp/raxaktoken'):
    with open('/tmp/raxaktoken', 'r') as f:
        token = f.readline()
        tokenparm = '?token=' + token


def convert(data):
    if isinstance(data, basestring):
        return str(data)
    elif isinstance(data, collections.Mapping):
        return dict(map(convert, data.iteritems()))
    elif isinstance(data, collections.Iterable):
        return type(data)(map(convert, data))
    else:
        return data


if __name__ == '__main__':
    # parse commandline parameters

    if len(sys.argv) < 2:
        print ("Usage: raxak [command] [parameters] [options]")
        print ("try raxak help for list of valid commands")
        print ("or raxak help command for specific commands")
        sys.exit(1)

    command = sys.argv[1].lower()

    if command == "help":
        if len(sys.argv) == 2:
            print ("Valid raxak commands:")
            for i in range(len(cmdList)):
                print (cmdList[i][0])
            print("Use raxak help <command> for detailed usage")
        else:
            printed = False

            for i in range(len(cmdList)):
                if sys.argv[2].lower() == cmdList[i][0] or sys.argv[2] == 'all':
                    print(cmdList[i][1])
                    print("")
                    printed = True

            if not printed:
                print (sys.argv[2] + " is not a valid command")
                print ("Use raxak help for a list of valid commands")

    elif command == "version":
        r = requests.get(APIprefix + 'version' + tokenparm, verify=False, headers=headers)
        if r.status_code == 200:
            print("Server version: " + str(r.text))
        else:
            print("Error " + str(r.status_code))

    elif command == "whoami":
        r = requests.get(APIprefix + 'whoAmI' + tokenparm, verify=False, headers=headers)
        if r.status_code == 200:
            print("You are " + str(r.text))
        else:
            print("Error " + str(r.status_code))

    elif command == "profiles":
        print(APIprefix + 'profiles' + tokenparm)
        r = requests.get(APIprefix + 'profiles' + tokenparm, verify=False, headers=headers)
        if r.status_code == 200:
            profiles = r.json().keys()
            profiles.sort()
            for profile in profiles:
                print profile
        else:
            print ('Error in API call: ' + str(r.status_code))

    elif command == "targets":
        r = requests.get(APIprefix + 'getIPs' + tokenparm, verify=False, headers=headers)
        if r.status_code == 200:
            codes = set()
            for i in r.json():
                ip = json.loads(i)
                print (
                    'Target: ' + str(ip['ip']) + ' Nickname: ' + str(ip['nickname']) + ' Access: ' + str(ip['access']))
                codes.add(str(ip['access']))

            if codes:
                print ('')
                print ('<where:>')
            for code in codes:
                if "1" in code:
                    print (' 1: ALL OK ')
                if "-1" in code:
                    print ('-1: OS installed on Target Machine is not supported')
                if "-2" in code:
                    print ('-2: Unable to reach Target Machine')
                if "-3" in code:
                    print ('-3: Unable to log in with specified userid (ssh login fails)')
                if "-4" in code:
                    print ('-4: Insufficient execution privilege')
                if "-5" in code:
                    print ('-5: Access check in progress')
            print ('')
        else:
            print ('Error in API call: ' + str(r.status_code))

    elif command == "addip":
        if len(sys.argv) > 3:
            ip = sys.argv[2]
            nickname = sys.argv[3]

            r = requests.get(APIprefix + 'addIP?ip=' + ip + '&nickname=' + nickname + '&token=' + token, \
                             verify=False, headers=headers)
            if r.status_code != 200:
                print("Error: " + str(r.status_code))


    elif command == "clear":
        if os.path.isfile('/tmp/raxakconfig'):
            os.remove('/tmp/raxakconfig')

    elif command == "select":
        if len(sys.argv) > 2:
            r = requests.get(APIprefix + 'getIPs' + tokenparm, verify=False, headers=headers)
            if r.status_code == 200:
                targets = convert(r.json())
                for i in range(len(targets)):
                    targets[i] = convert(json.loads(targets[i]))

                f = open('/tmp/raxakconfig', 'a')

                for i in range(2, len(sys.argv)):
                    for j in range(len(targets)):
                        if targets[j]['ip'] == sys.argv[i]:
                            if targets[j]['access'] == 1:
                                f.write(sys.argv[i] + ' = ' + targets[j]['nickname'] + '\n')
                                print(targets[j]['ip'] + ' = ' + targets[j]['nickname'] + ' selected')
                            else:
                                print(sys.argv[i] + ' is not accessible. Not added.')

                f.close()
        else:
            print ("Usage raxak select <target> <target> ...")

    elif command == "selectnickname":
        if len(sys.argv) > 2:
            r = requests.get(APIprefix + 'getIPs' + tokenparm, verify=False, headers=headers)
            if r.status_code == 200:
                targets = convert(r.json())
                for i in range(len(targets)):
                    targets[i] = convert(json.loads(targets[i]))

                f = open('/tmp/raxakconfig', 'a')

                for i in range(2, len(sys.argv)):
                    for j in range(len(targets)):
                        if targets[j]['nickname'] == sys.argv[i]:
                            if targets[j]['access'] == 1:
                                f.write(targets[j]['ip'] + ' = ' + targets[j]['nickname'] + '\n')
                                print(targets[j]['ip'] + ' = ' + sys.argv[i] + ' selected')
                            else:
                                print(sys.argv[i] + ' is not accessible. Not added.')

                f.close()
        else:
            print ("Usage raxak selectnickname <nickname> <nickname> ...")

    elif command == "list":
        if os.path.isfile('/tmp/raxakconfig'):
            with open('/tmp/raxakconfig', 'r') as f:
                for line in f:
                    print (line.rstrip('\n'))

    elif command == "apply":

        r = requests.get(APIprefix + 'profiles' + tokenparm, verify=False, headers=headers)
        if r.status_code == 200:
            profiles = r.json()
        else:
            print ('Error in API call: ' + str(r.status_code))
        profile = None
        if len(sys.argv) > 2:
            profile = sys.argv[2]
            if profile not in profiles:
                print ("Profile must be one of:")
                for i in profiles:
                    print i
        auto = 1
        if len(sys.argv) > 3:
            if sys.argv[3] == 'manual':
                auto = 0
            elif sys.argv[3] == 'auto':
                auto = 1
            else:
                print ("Illegal optional choice, defaulting to auto")

        repeat = 'none'
        if len(sys.argv) > 4:
            if sys.argv[4] in ['daily', 'weekly', 'monthly']:
                repeat = sys.argv[4]
            elif sys.argv[4] == 'once':
                repeat = 'none'
            else:
                print("Illegal optional choice, must be one of {once | daily | weekly | monthly}")
                print("Defaulting to once")
                repeat = 'none'

        targetlist = ''
        if os.path.isfile('/tmp/raxakconfig'):
            with open('/tmp/raxakconfig', 'r') as f:
                for line in f:
                    targetlist += string.split(line.rstrip('\n'), ' ')[0] + ','

        if targetlist == '':
            print ('No target machines selected')
            print ('Use raxak targets to get a list of your registered targets')
            print ('Use raxak select or raxak selectnickname to add targets to the list')
        else:
            if profile is not None:
                url = APIprefix + 'runProfiles?ip=' + targetlist + "&profile=" + profile + \
                      "&autoremediate=" + str(auto) + "&frequency=" + repeat
                r = requests.get(url, verify=False, headers=headers)
                if r.status_code == 200:
                    print ("Profile application started")
                    print ("Use raxak status to check if the run is finished")
                else:
                    print ("Error: " + str(r.status_code))

    elif command == 'status':
        targetlist = ''
        if os.path.isfile('/tmp/raxakconfig'):
            with open('/tmp/raxakconfig', 'r') as f:
                for line in f:
                    targetlist = string.split(line.rstrip('\n'), ' ')[0]
                    r = requests.get(APIprefix + 'showExecutionStatus/' + targetlist)
                    if r.status_code == 200:
                        print (targetlist + ':' + r.json())
        else:
            print ('No target machines selected')
            print ('Use raxak targets to get a list of your registered targets')
            print ('Use raxak select or raxak selectnickname to add targets to the list')

    elif command == 'report':
        targetlist = ''
        if os.path.isfile('/tmp/raxakconfig'):
            with open('/tmp/raxakconfig', 'r') as f:
                for line in f:
                    targetlist = string.split(line.rstrip('\n'), ' ')[0]
                    r = requests.get(APIprefix + 'showExecutionStatus/' + targetlist + tokenparm)
                    if r.status_code == 200:
                        print (targetlist + ':' + r.json())

                    r = requests.get(APIprefix + 'showrun/' + targetlist + tokenparm)
                    if r.status_code == 200:
                        log = r.json()
                        i = json.loads(log[0])
                        print("Profile used: " + i['profile'])
                        print("Remediation mode: " + str(i['exemode']))

                        for i in log:
                            logbit = json.loads(i)
                            for j in logbit:
                                if j not in ['console', 'profile', 'exemode']:
                                    print (j + " - " + logbit[j])
                            print ('-------------------------------')
                        print ("\n\n\n")

        else:
            print ('No target machines selected')
            print ('Use raxak targets to get a list of your registered targets')
            print ('Use raxak select or raxak selectnickname to add targets to the list')

    elif command == "login":
        if len(sys.argv) > 3:
            username = str(sys.argv[2])
            email = str(sys.argv[3])

            r = requests.get(APIprefix + 'login/' + username + '/' + email + tokenparm, verify=False, headers=headers)
            if r.status_code == 200:
                print("User " + username + " logged in")
                tok = str(r.text)
                # Write token to file for future retrieval
                if os.path.isfile('/tmp/raxaktoken'):
                    os.remove('/tmp/raxaktoken')
                with open('/tmp/raxaktoken', 'a') as f:
                    f.write(tok)

            elif r.status_code == 401:
                print ("User " + username + " is not preauthorized to use Raxak Protect")
            else:
                print ("Error: " + str(r.status_code))
        else:
            print("Usage: raxak login username email")

    elif command == "logout":
        if os.path.isfile('/tmp/raxaktoken'):
            os.remove('/tmp/raxaktoken')
    else:
        print ('Command ' + command + ' not implemented (yet)')
