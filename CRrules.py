#!/usr/bin/env python
#
import os
import os.path
import subprocess
import re
import sys
import ConfigParser
import string
import re
import platform
import logging
import time

from commonstub import * # New header file for common stub items to be sent over execnet gateway
# Check Rule 55000 checks the following items. All must be correct for it to return True.
# otherwise it returns None (requires manual intervention)



def checkRule55000():
    res = runOnShell("sudo txt-stat | grep 'TXT measured'")
    if 'command not found' in res:
            print('TXT boot is not enabled on this system')
            return None
    if 'TRUE' not in res:
            print('*** TXT measured launch was not enabled')
            print('    Ensure that tboot is available and is the default boot mechanism')
            return None

    # look in opt/trustagent/configuration/trustagent.properties to find CIT server
    res = runOnShell ('sudo grep mtwilson.api.url /opt/trustagent/configuration/trustagent.properties')
    if 'No such file' in res:
        print('Machine is not enrolled with a CIT (Mt. Wilson) server')
        return None
    try:
        ipaddress = res.split('=')[1].replace('\\','')
        ipaddress = ipaddress.replace('\n','')
    except:
        ipaddress = None

    if ipaddress is None:
        print('Cannot determine CIT server address')
        return None
    print('Detected CIT server URL for API calls: ' + ipaddress)

    res = runOnShell('sudo grep trustagent.tls.cert.ip /opt/trustagent/configuration/trustagent.properties')
    if 'No such file' in res:
        print('Machine is not enrolled with a CIT (Mt. Wilson) server')
        return None
    try:
        myip = res.split('=')[1].split(',')[2].replace('\\','')
    except:
        myip = None

    if myip is None:
        print('Cannot determine server address as identified to Mt. Wilson')
        return None
    print('Detected server address: ' + myip)

    headers = {'Content-type': 'application/json', 'Accept':'application/json'}

    try:
        import requests
        apicall = ipaddress + '/hosts?nameEqualTo=' + myip
        print('>' + apicall)
        r = requests.get(apicall, verify=False, auth=('admin','password'),
                         headers=headers)
        if r.status_code != 200:
            print('Unable to get host info from CIT server. Server returns: ' + str(r.status_code))
            return None
        rj = r.json()
        hostid = str(rj['hosts'][0]['id'])
        print('CIT server identifies host as ' + hostid)

        data = '{"host_uuid" : "' + hostid + '"}'
        apicall = ipaddress + '/host-attestations'
        print('apicall: ' + apicall)
        r = requests.post(apicall, data=data, headers=headers, verify=False,
                          auth=('admin','password'))
        if r.status_code != 200:
            print('Unable to get host attestations: code =' + r.status_code + r.text)
            return None

        rj = r.json()
        biostrust = rj['host_trust_response']['trust']['bios']
        vmmtrust  = rj['host_trust_response']['trust']['vmm']

        print('Bios trust = ' + str (biostrust) )
        print('OS/VMM trust = ' + str (vmmtrust))

        print('Machine attributes/geotagging: ')
        for attribute in rj['trust_report']['host_report']['tag_certificate']['attribute']:
            print(str(attribute['attribute_values'][0]['string']))
        print('------- end trust attributes -------')
        if str(biostrust) == 'True' and str(vmmtrust) == 'True':
                print('*** Asset: ' + myip + ' is trusted. Hardware signature checked. ***')
                return True
        else:
            return None
    except Exception as e:
        print('Python library >requests< not found. Error: ' + str(e))
        return None






    pass

def fixRule55000():
    pass