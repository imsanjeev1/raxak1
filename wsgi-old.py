import re
from cgi import escape
import cloudraxak
import json
import urlparse

def index(environ, start_response):
    """This function will be mounted on "/" and display a link
    to the hello world page."""
    start_response('200 OK', [('Content-Type', 'text/html')])
    return ['''Welcome to Cloud Raxak''']

def hello(environ, start_response):
    """Like the example above, but it uses the name specified in the
URL."""
    # get the name from the url if it was specified there.
    args = environ['myapp.url_args']
    if args:
        subject = escape(args[0])
    else:
        subject = 'World'
    start_response('200 OK', [('Content-Type', 'text/html')])
    return ['''Hello %(subject)s
            !

''' % {'subject': subject}]

#DONE
def showrun(environ, start_response):
    # get the name from the url if it was specified there.
    args = environ['myapp.url_args']
    qs = environ['QUERY_STRING']
    if args:
	timestamp = ""
        ip = escape(args[0])
	print ("wsgi: showrun: ip = " + ip)
	if qs:
	    	print "wsgi: showrun: qs = " + qs
		qs_dict = dict(urlparse.parse_qsl(qs))
		print "wsgi: showrun: s_dict: " + str(qs_dict)
		timestamp = qs_dict.get('timestamp')
		print "wsgi: showrun: timestamp = " + timestamp 
    	start_response('200 OK', [('Content-Type', 'text/json')])
    	return json.dumps(cloudraxak.showrun(ip,timestamp))
    else:
    	start_response('404 NOT FOUND', [('Content-Type', 'text/plain')])
	return ['Not Found']
#DONE
def checkStatus(environ, start_response):
    # get the name from the url if it was specified there.
    args = environ['myapp.url_args']
    if args:
        ip = escape(args[0])
	print ("wsgi: checkStatus: ip = " + ip)
    	start_response('200 OK', [('Content-Type', 'text/plain')])
    	#return json.dumps(cloudraxak.checkStatus(ip))
    	return cloudraxak.checkStatus(ip)
    else:
    	start_response('404 NOT FOUND', [('Content-Type', 'text/plain')])
	return ['Not Found']
#DONE
def getExecutionStatus(environ, start_response):
    # get the IPs from the url if it was specified there.
    qs = environ['QUERY_STRING']
    print "wsgi: qs: " + str(qs)
    qs1 = dict( (k, v if len(v)>1 else v[0] )
           for k, v in urlparse.parse_qs(qs).iteritems() )

    qs_ip_list1 = qs1['ip']
    qs_ip_list = qs_ip_list1.split(",")
    print "wsgi: qs_ip_list = " + str(qs_ip_list)

    start_response('200 OK', [('Content-Type', 'text/plain')])
    return cloudraxak.getExecutionStatus(qs_ip_list)
#DONE

def showCheckRule(environ, start_response):
    # get the name from the url if it was specified there.
    args = environ['myapp.url_args']
    if args:
        rulenum = escape(args[0])
    	start_response('200 OK', [('Content-Type', 'text/plain')])
	return (cloudraxak.showCheckRule(rulenum)) 
    else:
    	start_response('404 NOT FOUND', [('Content-Type', 'text/plain')])
	return ['Not Found']
#DONE
def showFixRule(environ, start_response):
    # get the name from the url if it was specified there.
    args = environ['myapp.url_args']
    if args:
        rulenum = escape(args[0])
    	start_response('200 OK', [('Content-Type', 'text/plain')])
	return (cloudraxak.showFixRule(rulenum)) 
    else:
    	start_response('404 NOT FOUND', [('Content-Type', 'text/plain')])
	return ['Not Found']
#DONE
def dismiss(environ, start_response):
    # get the name from the url if it was specified there.
    args = environ['myapp.url_args']
    qs = environ['QUERY_STRING']
    qs_dict = dict(urlparse.parse_qsl(qs))
    ip = qs_dict.get('ip')
    if args and ip:
        rulenum = escape(args[0])
        start_response('200 OK', [('Content-Type', 'text/plain')])
        returnvalue = cloudraxak.dismiss(ip,str(rulenum))
        return ['OK']
    else:
        start_response('404 NOT FOUND', [('Content-Type', 'text/plain')])
        return ['Not Found']
#DONE
def fixRule(environ, start_response):
    # get the name from the url if it was specified there.
    args = environ['myapp.url_args']
    qs = environ['QUERY_STRING']
    qs_dict = dict(urlparse.parse_qsl(qs))
    ip = qs_dict.get('ip')
    if args and ip:
        rulenum = escape(args[0])
    	start_response('200 OK', [('Content-Type', 'text/plain')])
	returnvalue = cloudraxak.fixRule(ip,str(rulenum)) 
	if returnvalue == 1:
		return ("Rule: "+ rulenum + " sucessfully remediated")
	elif returnvalue == 2:
		return ("Rule: "+ rulenum + " not automatically remediated. Please follow up manually ")
	elif returnvalue == 98:
		return ("Unable to connect to the target: " + ip)
	else:
		return ("Error while remediating the rule "+ rulenum)
    else:
    	start_response('404 NOT FOUND', [('Content-Type', 'text/plain')])
	return ['Not Found']
#DONE
def checkRule(environ, start_response):
    # get the name from the url if it was specified there.
    args = environ['myapp.url_args']
    qs = environ['QUERY_STRING']
    qs_dict = dict(urlparse.parse_qsl(qs))
    ip = qs_dict.get('ip')
    if args and ip:
        rulenum = escape(args[0])
    	start_response('200 OK', [('Content-Type', 'text/plain')])
	returnvalue = cloudraxak.checkRule(ip,str(rulenum))
	print "wsgi: " + str(returnvalue)
	if returnvalue == 1:
		return ("Rule: "+ rulenum + " successful")
	elif returnvalue == 0:
		return ("Rule: "+ rulenum + " still failed, can remediate the rule by clicking on remediate button")
	elif returnvalue == 2:
		return ("Rule: "+ rulenum + " needs manual interentation")
	elif returnvalue == 98:
		return ("Unable to connect to the target: " + ip)
	else:
		return ("Error fetching status for the rule "+ rulenum)
    else:
    	start_response('404 NOT FOUND', [('Content-Type', 'text/plain')])
	return ['Not Found']
#DONE
def runProfiles(environ, start_response):
    print "wsgi: inside run profiles "
    # get the name from the url if it was specified there.
    #args = environ['myapp.url_args']
    qs = environ['QUERY_STRING']
    print "wsgi: qs = " + str(qs)
    qs1 = dict( (k, v if len(v)>1 else v[0] )
           for k, v in urlparse.parse_qs(qs).iteritems() )
    print "wsgi: qs1 = " + str(qs1)
    if 'ip' in qs1.keys():
    	qs_rule_list1 = qs1['ip']
	qs_rule_list = qs_rule_list1.split(",")
    	print "wsgi: qs_rule_list = " + str(qs_rule_list)
    else:
    	start_response('404 NOT FOUND', [('Content-Type', 'text/plain')])
	return ['IP address not given']

    if 'profile' in qs1.keys():
	qs_profile = qs1['profile']
    	print "wsgi: qs_profile: " + str(qs_profile)
    else:
    	start_response('404 NOT FOUND', [('Content-Type', 'text/plain')])
	return ['profile name is not given']

    if 'autoremediate' in qs1.keys():
    	qs_autoremediate = qs1['autoremediate']
	print "wsgi: qs_autoremediate: " + str(qs_autoremediate)
    else:
    	start_response('404 NOT FOUND', [('Content-Type', 'text/plain')])
	return ['autoremediate input not provided']

    if qs_rule_list and qs_profile and qs_autoremediate:
    	start_response('200 OK', [('Content-Type', 'text/plain')])
	returnvalue = cloudraxak.applyProfile(qs_rule_list,qs_profile,qs_autoremediate)
    	return ['Compliance checking finished...']
	#TODO - ASG
	#return with rc value of execution of rules on respective Target machine VMs
    else:
    	start_response('404 NOT FOUND', [('Content-Type', 'text/plain')])
	return ['Not Found']
#DONE
def profiles(environ, start_response):
    start_response('200 OK', [('Content-Type', 'text/json')])
    return json.dumps(cloudraxak.getProfilesList())
#DONE
def supportedOSList(environ, start_response):
    start_response('200 OK', [('Content-Type', 'text/json')])
    return json.dumps(cloudraxak.supportedOSList())
#DONE
def modifyIP(environ, start_response):
    print "wsgi: inside ModifyIP"
    qs = environ['QUERY_STRING']
    print "wsgi: qs: " + qs
    qs_dict = dict(urlparse.parse_qsl(qs))
    print "wsgi: qs_dict: " + str(qs_dict)
    username = qs_dict.get('username')
    ip = qs_dict.get('ip')
    current_ip = qs_dict.get('currentip')
    
    rc=cloudraxak.modifyIP(username,ip,current_ip)		
    if rc:
     	start_response('200 OK', [('Content-Type', 'text/plain')])
    	return ['already in the list']
    else:
    	start_response('200 OK', [('Content-Type', 'text/plain')])
    	return ['sucessfully modified']

#DONE
def addIP(environ, start_response):
    print "wsgi: inside addIP"
    # get the name from the url if it was specified there.
    #args = environ['myapp.url_args']
    qs = environ['QUERY_STRING']
    print "wsgi: qs: " + qs
    qs_dict = dict(urlparse.parse_qsl(qs))
    print "wsgi: qs_dict: " + str(qs_dict)
    username = qs_dict.get('username')
    ip = qs_dict.get('ip')
    print 'Adding username',username
    rc = cloudraxak.addIP(username,ip)
    if rc:
    	start_response('200 OK', [('Content-Type', 'text/plain')])
    	return ['already in the list']
    else:
    	start_response('200 OK', [('Content-Type', 'text/plain')])
    	return ['sucessfully added']
#DONE
def deleteIP(environ, start_response):
    print "wsgi: inside deleteIP"
    # get the name from the url if it was specified there.
    #args = environ['myapp.url_args']
    qs = environ['QUERY_STRING']
    print "wsgi: qs: " + str(qs)
    qs_dict = dict(urlparse.parse_qsl(qs))
    print "wsgi: qs_dict: " + str(qs_dict)
    username = qs_dict.get('username')
    ip = qs_dict.get('ip')
    cloudraxak.deleteIP(username,ip)
    start_response('200 OK', [('Content-Type', 'text/plain')])
    return ['sucessfully deleted']
#DONE
def getIPs(environ, start_response):
    print "wsgi: inside getIPs"
    # get the name from the url if it was specified there.
    #args = environ['myapp.url_args']
    qs = environ['QUERY_STRING']
    print "wsgi: qs: " + str(qs)
    qs_dict = dict(urlparse.parse_qsl(qs))
    print "wsgi: qs_dict: " + str(qs_dict)
    username = qs_dict.get('username')
    ips = cloudraxak.getIPs(username)
    start_response('200 OK', [('Content-Type', 'text/json')])
    return json.dumps(ips)
#DONE
def getIPStatus(environ, start_response):		
    print "wsgi: inside getIPStatus"
    # get the name from the url if it was specified there.
    #args = environ['myapp.url_args']
    qs = environ['QUERY_STRING']
    print "wsgi: qs: " + qs
    qs_dict = dict(urlparse.parse_qsl(qs))
    print "wsgi: qs_dict: " + str(qs_dict)
    username = qs_dict.get('username')
    ips1 = cloudraxak.getIPStatus(username)
    start_response('200 OK', [('Content-Type', 'text/json')])
    return json.dumps(ips1)
#DONE
def IPStatus(environ, start_response):        
    print "wsgi: inside IPStatus"
    # get the name from the url if it was specified there.
    #args = environ['myapp.url_args']
    qs = environ['QUERY_STRING']
    print "wsgi: qs: " + qs
    qs_dict = dict(urlparse.parse_qsl(qs))
    print "wsgi: qs_dict: " + str(qs_dict)
    username = qs_dict.get('username')
    ip = qs_dict.get('ip')
#    print "ip: " + ip
#    print "username: " + username
    ips1 = cloudraxak.IPStatus(username, ip)
    start_response('200 OK', [('Content-Type', 'text/json')])
    return json.dumps(ips1)
#DONE
def getArchiveLogFileNameList(environ, start_response):
    print "wsgi: inside getArchiveLogFileNameList"
    # get the userName@Ip from the url if it was specified there.
    args = environ['myapp.url_args']
    if args:
        userNameIp = escape(args[0])
        start_response('200 OK', [('Content-Type', 'text/json')])
        return json.dumps(cloudraxak.getArchiveLogFileNameList(userNameIp))
    else:
       start_response('404 NOT FOUND', [('Content-Type', 'text/plain')])
       return ['Not Found']

def not_found(environ, start_response):
    """Called if no URL matches."""
    start_response('404 NOT FOUND', [('Content-Type', 'text/plain')])
    return ['Not Found']


# map urls to functions
urls = [
    (r'^$', index),
    (r'hello/?$', hello),
    (r'profiles/?$', profiles),
    (r'supportedOSList/?$', supportedOSList),
    (r'showCheckRule/(.+)$', showCheckRule),
    (r'showFixRule/(.+)$', showFixRule),
    (r'fixRule/(.+)$', fixRule),
    (r'checkRule/(.+)$', checkRule),
    (r'dismiss/(.+)$', dismiss),
    (r'runProfiles/?$', runProfiles),
    (r'addIP/?$', addIP),
    (r'deleteIP/?$', deleteIP),
    (r'getIPs/?$', getIPs),
    (r'getExecutionStatus/?$', getExecutionStatus),
    (r'status/(.+)$', checkStatus),
    (r'showrun/(.+)$', showrun),
    (r'getIPStatus/?$', getIPStatus),
    (r'IPStatus/?$', IPStatus),
    (r'getArchiveLogFileNameList/(.+)$', getArchiveLogFileNameList),
    (r'modifyIP/?$', modifyIP)
]

def application(environ, start_response):
    """
    The main WSGI application. Dispatch the current request to
    the functions from above and store the regular expression
    captures in the WSGI environment as  `myapp.url_args` so that
    the functions from above can access the url placeholders.

    If nothing matches call the `not_found` function.
    """

    print "wsgi: eviron= "
    print environ
    path = environ.get('PATH_INFO', '').lstrip('/')
    for regex, callback in urls:
        match = re.search(regex, path)
        if match is not None:
            environ['myapp.url_args'] = match.groups()
            return callback(environ, start_response)
    return not_found(environ, start_response)
