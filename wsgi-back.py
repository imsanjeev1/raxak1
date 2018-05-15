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

def checkAccess(environ, start_response):
    # get the IPs from the url if it was specified there.
    qs = environ['QUERY_STRING']
    print "wsgi: qs: " + str(qs)
    qs1 = dict( (k, v if len(v)>1 else v[0] )
           for k, v in urlparse.parse_qs(qs).iteritems() )

    qs_ip_list1 = qs1['ip']
    qs_ip_list = qs_ip_list1.split(",")
    print "wsgi: qs_ip_list = " + str(qs_ip_list)

    qs_username = qs1['username']
    print "wsgi: qs_username: " + str(qs_username)

    start_response('200 OK', [('Content-Type', 'text/json')])
    return json.dumps(cloudraxak.checkAccess(qs_username,qs_ip_list))
     

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

def showtitleofRule(environ, start_response):
    # get the name from the url if it was specified there.
    args = environ['myapp.url_args']
    print args
    if args:
        rulenum = escape(args[0])
    	start_response('200 OK', [('Content-Type', 'text/plain')])
	return (cloudraxak.showtitleofRule(rulenum)) 
    else:
    	start_response('404 NOT FOUND', [('Content-Type', 'text/plain')])
	return ['Not Found']

def dismiss(environ, start_response):
    # get the name from the url if it was specified there.
    print "wsgi: inside dismiss"
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

def fixRule(environ, start_response):
    # get the name from the url if it was specified there.
    print "wsgi: inside fixRule"
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

def checkRule(environ, start_response):
    # get the name from the url if it was specified there.
    print "wsgi: inside checkRule"
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
		return ("Rule: "+ rulenum + " needs manual intervention")
	elif returnvalue == 98:
		return ("Unable to connect to the target: " + ip)
	else:
		return ("Error fetching status for the rule "+ rulenum)
    else:
    	start_response('404 NOT FOUND', [('Content-Type', 'text/plain')])
	return ['Not Found']

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

def profiles(environ, start_response):
    start_response('200 OK', [('Content-Type', 'text/json')])
    return json.dumps(cloudraxak.getProfilesList())

def supportedOSList(environ, start_response):
    start_response('200 OK', [('Content-Type', 'text/json')])
    return json.dumps(cloudraxak.supportedOSList())

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


def addIP(environ, start_response):
    print "wsgi: inside addIP"
    qs = environ['QUERY_STRING']
    print "wsgi: qs: " + qs
    qs_dict = dict(urlparse.parse_qsl(qs))
    print "wsgi: qs_dict: " + str(qs_dict)
    username = qs_dict.get('username')
    ip = qs_dict.get('ip')
    status = cloudraxak.addIP(username,ip)
    start_response('200 OK', [('Content-Type', 'text/json')])
    return json.dumps(status)

def deleteIP(environ, start_response):
    print "wsgi: inside deleteIP"
    qs = environ['QUERY_STRING']
    print "wsgi: qs: " + str(qs)
    qs_dict = dict(urlparse.parse_qsl(qs))
    print "wsgi: qs_dict: " + str(qs_dict)
    username = qs_dict.get('username')
    ip = qs_dict.get('ip')
    #cloudraxak.deleteIP(username,ip)
    cloudraxak.deleteUsernameIP(username,ip)
    start_response('200 OK', [('Content-Type', 'text/plain')])
    return ['sucessfully deleted']

def getIPs(environ, start_response):
    print "wsgi: inside getIPs"
    qs = environ['QUERY_STRING']
    print "wsgi: qs: " + str(qs)
    qs_dict = dict(urlparse.parse_qsl(qs))
    print "wsgi: qs_dict: " + str(qs_dict)
    username = qs_dict.get('username')
    ips = cloudraxak.getIPs(username)
    start_response('200 OK', [('Content-Type', 'text/json')])
    return json.dumps(ips)

def getIPDetails(environ, start_response):
    print "wsgi: inside getIPDetails"
    # get an IP from the url if it was specified there.
    qs = environ['QUERY_STRING']
    print "wsgi: qs: " + str(qs)
    qs_dict = dict(urlparse.parse_qsl(qs))
    print "wsgi: qs_dict: " + str(qs_dict)
    ip = qs_dict.get('ip')
    start_response('200 OK', [('Content-Type', 'text/json')])
    ip_details_data = cloudraxak.getIPDetails(ip)
    print "wsgi: getIPDetails - " + str(ip_details_data)
    return ip_details_data 

def showExecutionStatus(environ,start_response):
    '''This API shows the execution status  '''	
    # get the name from the url if it was specified there.
    args = environ['myapp.url_args']
    qs = environ['QUERY_STRING']
    if args:
        ip = escape(args[0])
	print ("wsgi: showExecutionStatus: ip = " + ip)
    	start_response('200 OK', [('Content-Type', 'text/json')])
    	return json.dumps(cloudraxak.showExecutionStatus(ip))
    else:
    	start_response('404 NOT FOUND', [('Content-Type', 'text/plain')])
	return ['Not Found']

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

def ruleTitle(environ, start_response):
    print "wsgi: inside ruleTitle"
    args = environ['myapp.url_args']
    qs = environ['QUERY_STRING']
    if args:
        profile = escape(args[0])
	print ("wsgi: ruleTitle: profile = " + profile)
    	start_response('200 OK', [('Content-Type', 'text/json')])
    	return json.dumps(cloudraxak.ruleTitle(profile))
    else:
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
    (r'showtitleofRule/(.+)$', showtitleofRule),
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
    (r'getIPDetails/?$', getIPDetails),
    (r'showExecutionStatus/(.+)$', showExecutionStatus),
    (r'getArchiveLogFileNameList/(.+)$', getArchiveLogFileNameList),
    (r'modifyIP/?$', modifyIP),
    (r'checkAccess/?$', checkAccess),
    (r'ruleTitle/(.+)$', ruleTitle)
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
