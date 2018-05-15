# WSGI.PY rewritten to use flask. Added code for logging in with google id
#
#	(c) 2014,2015	Cloud Raxak Inc. All Rights Reserved
#
#       updated Jan 25, 2015
#
#	Note: on server you must do
#		pip install flask
#		pip install --upgrade google-api-python-client
#	and, the app secret json file must be downloaded and available as
#		client_secret.json in the local file stystem (raxak1)
#	Needs python cryptography library installed
#		see https://cryptography.jo/en/latest/fernet
#
#	Feb 8 multiple changes culminating in adding /v1/ to all the /raxakapi/ api calls for future growth
#

# import pycurl
import urllib
import StringIO
import json
import flask
import httplib2
import uuid  # needed to create unique secret for google
from apiclient import discovery  # needed for google login
from oauth2client import client
import re
from cgi import escape
import cloudraxak
import urlparse  # this may not be needed since we are using flask decorators
import traceback
import base64
import socket
import subprocess
import string
import hashlib
import logging
import ast
import ConfigParser
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import pprint
import xmltodict
import flask
import httplib2
from apiclient import discovery		# needed for google login
from oauth2client import client
from cryptography.fernet import Fernet
from flask import request
import redis

import oauth2 as oauth
import cloudraxak
import CSA_login_redirect
import redis_management_console as management
import VPNtunnel
import datetime
import time

app = flask.Flask(__name__)
#
#	Open global configuration
#
config = ConfigParser.ConfigParser()
config.read('raxak.cfg')

csaServer = config.get('HP-CSA', 'csaServer')
hpDemoList = [x.strip(' ') for x in config.get('HP-CSA', 'hpDemoList').split(',')]

print("Authorized users of HP Demo" + str(hpDemoList))
# hpDemoList = ["seshmurthy@cloudraxak.com", "prasanna@cloudraxak.com"]	# add names here of people authorized to run the HP demo

print ("Initializing flask, setting key")
app.secret_key = str(uuid.uuid4())
app.secret_key = Fernet.generate_key()

encryptionKey = cloudraxak.encryptionKey(app.secret_key)
crypt = Fernet(encryptionKey)

app.debug = False
logging.basicConfig(filename="raxak-logging.log", level=logging.INFO)

print("Cleaning up residual tunnels if any: ")
#ASG - Blocker - temp commented till time we have a fix
#VPNtunnel.cleanLink()

validservers = [x.strip(' ') for x in config.get('Validation','serverList').split(',')]
print("Valid servers " + str(validservers))

server = socket.gethostname()
if server in validservers:
    raxakMustValidate = True  # must validate (set to false for debugging)
    print ("Running on " + server + "- Validation is on")
else:
    raxakMustValidate = True
    import os.path
    if os.path.isfile(".raxakdevelopment"):
        raxakMustValidate = False
    print (server + " is not a known server: No user validation")

if not raxakMustValidate:
    token = {}
    token['login'] = "Local Auth"
    token['ip'] = "0.0.0.0"
    token['user'] = 'GTestUser'
    token['firstname'] = 'GTestUser'
    token['email'] = 'GTestUser@cloudraxak.com'

    cloudraxak.enroll('GTestUser', token)


defaultuser = "raxak@cloudraxak.com"
if not cloudraxak.getemailexist(defaultuser):
    try:
        print("Creating default login user...")
        rs = redis.Redis()
        userInfo = {}
        password = "@C10udRaxakPr0tect14"
        password = hashlib.md5(password).hexdigest()
        userInfo['firstname'] = "Raxak"
        userInfo['lastname'] = "Cloudraxak"
        userInfo['email'] = defaultuser
        userInfo['phone'] = "0000000000"
        userInfo['company'] = "Cloudraxak"
        userInfo['country'] = "us"
        userInfo['blocked'] = "0"
        userInfo['period'] = "90"
        userInfo['admin'] = "1"
        userInfo['hash'] = ""
        userInfo['date'] = '0000-00-00 00:00:00'
        userInfo['password'] = password
        userInfo['activation'] = "2"
        rs.rpush("UserInfo", json.dumps(userInfo))
    except Exception as e:
        print "error while creating new user" + str(e)
else:
    #Correcting login default values
    rs = redis.Redis()
    dump = rs.lrange('UserInfo', 0, -1)
    if(len(dump) > 0):
        for item in dump:
            mapped_data = json.loads(item)
            if mapped_data.has_key('email'):
                if str(mapped_data['email']) == str(defaultuser):
                    mapped_data['period'] = "90"
                    if (str(mapped_data['activation']) != "2" or str(mapped_data['admin']) != "1" or str(mapped_data['blocked']) != "0"):
                        mapped_data['activation'] = "2"
                        mapped_data['admin'] = "1"
                        mapped_data['blocked'] = "0"
                    rs.lrem("UserInfo", item)
                    rs.lpush("UserInfo", json.dumps(mapped_data))


# get the current git branch/short-hash to printout

branch = subprocess.check_output(["git", "rev-parse", "--abbrev-ref", "HEAD"]).strip()
branch += "/" + subprocess.check_output(["git", "rev-parse", "--short", "HEAD"]).strip()
rs = redis.Redis()
rs.set("codeversion", branch)

print ("Running version: " + branch)

def getcookieifpresent():
    # returns the cookie, if any, in the browser
    # returns None otherwise

    print "wsgi: inside getcookieifpresent()"
    try:
        browser = flask.request.user_agent.browser
    except:
        browser = None

    if browser is not None:
        # if on browser, check if there is a token in the cookie
        usertoken = flask.request.cookies.get('usertoken')
        if usertoken is not None:
            return usertoken
        else:
            return None

    else:
        return None

def validateAPI():
    # returns <userid-string> if
    # user is on a browser, with a cookie, and the cookie validates
    #	user is not on a browser and the token=<token> validates
    #	None otherwise
    # first check if the user is on a browser

    print "wsgi: inside validateAPI()"

#    try:
#        browser = flask.request.user_agent.browser
#    except:
#        browser = None

#    if browser is not None:
        # if on browser, check if there is a token in the cookie
#        usertoken = flask.request.cookies.get('usertoken')
#        if usertoken is not None:
#            return validateUserToken(usertoken)
#        else:
#            if not raxakMustValidate:
#                return "GTestUser"
#            else:
#                return None

    usertoken = getcookieifpresent()

    if usertoken is not None:
        return validateUserToken (usertoken)
    elif not raxakMustValidate:
            return "GTestUser"
    else:
        # is the request from the HP CSA system?
        ip = myIP()
        print("Check IP = " + str(ip))
        if ip == csaServer:  # should be a variable
            # by defalut we consider this validated
            token = "HP-TOKEN"
        else:
            token = flask.request.args.get('token')
        print ("token = " + str(token))
        if token is None:
            print ("No token")
            if not raxakMustValidate:
                return "GTestUser"
            else:
                return None
        else:

            return validateToken(token)

    return None

def is_admin():
    print "wsgi: admin check started"
    cookies = getcookieifpresent()
    if not cookies:
        return False

    try:
        user_token = json.loads(crypt.decrypt(base64.urlsafe_b64decode(str(cookies))))
    except Exception as e:
        print ("Token is either invalid or not bytes.")
        user_token = None

    if user_token:
        rs = redis.Redis(REDIS_HOST)
        admin = rs.hget(user_token['email'] + UINFO, 'admin')
        if admin == "1":
            return True
        else:
            return False
    return False

def validateUserToken(ut):
    print("validateUserToken Decoding token: " + ut[:15] + "...")
    try:
        usertoken = json.loads(crypt.decrypt(base64.urlsafe_b64decode(str(ut))))
    except Exception as e:
        print ("Token decode error: " + str(e))
        return None

    print("User Token (cookie)")
    print(str(usertoken['email']))
    print(str(usertoken['user']))
    print(str(usertoken['ip']))
    if str(usertoken['ip']) == csaServer:
        return str(usertoken['user'])
    elif str(usertoken['login']) == "IBM":
        return str(usertoken['user'])
    elif str(usertoken['ip']) == myIP():
        return str(usertoken['user'])
    else:
        return None


def validateToken(ut):
    # just like validateUserToken except no ip check
    if ut == "HP-TOKEN":
        return ("HP-USER")
    try:
        usertoken = json.loads(crypt.decrypt(base64.urlsafe_b64decode(str(ut))))
    except Exception as e:
        print ("Token decode error: " + str(e))
        return None

    print("User Token")
    print(str(usertoken['email']))
    print(str(usertoken['user']))
    print(str(usertoken['ip']))
    return str(usertoken['user'])


@app.route('/raxakapi/v1/version/')
def version():
    print ("wsgi.py: version")
    try:
        print (str(".remote_addr = " + flask.request.remote_addr))
        print (str(".access_route = " + json.dumps(flask.request.access_route)))
    except:
        print (traceback.format_exc())
    return branch


def myIP():
    print ("wsgi: myIP")
    #	This is needed because different proxies may change the
    #	request.remote_addr along the path of the traffic
    #	request.access_route[0] seems to be a more stable way
    #	works with CloudFlare
    route = flask.request.access_route
    print ("access route = " + json.dumps(route))
    return str(route[0])


@app.route('/raxakapi/v1/whoAmI/')
def whoAmI():
    # validate API call. If it does not validate, then no one is logged in. Call does not fail, just returns a blank string
    print("wsgi: whoAmI")
    userid = validateAPI()
    print ("userid  = " + str(userid))
    if userid is None:
        return "{}"

    else:
        whoami = cloudraxak.whoIs(userid)
        whoami['codeversion'] = branch
        return json.dumps(whoami)

@app.route('/raxakapi/v1/logout/')
def logout():
    print("wsgi: logout")
    #TODO -  need to be verified with cloudraxak.net

    usertype = flask.request.args.get('usertype')
    returnurl = 'logout.html'
    if usertype =='admin':
        returnurl = 'logout.html?usertype=admin'

    usertoken = flask.request.cookies.get('usertoken')
    if usertoken is None:
        print ('No cookie set')
        return flask.make_response(flask.redirect(returnurl))
    else:
        print ("Clear existing cookie")
        token = eatCookie ( usertoken )
        if token['login'] == 'IBM':
            returnurl = 'https://marketplace.ibmcloud.com'
        resp = flask.make_response(flask.redirect(returnurl))
        resp.set_cookie('usertoken', '', expires=0)
        return resp


@app.route('/raxakapi/v1/login/<username>/<email>')
def login(username, email):
    print("wsgi: login: " + username + ": " + email)

    ip = myIP()
    token = {}
    token['login'] = "Local Auth"
    token['ip'] = ip
    token['user'] = username
    token['email'] = email

    code = cloudraxak.enroll(username, token)
    if code == 'OK':
        # create a user token and return it
        encoded = makeCookie (token)

        return flask.make_response(encoded, 200)
    else:
        # Error authenticating user
        return flask.make_response("Authentication error ("+code+")", 401)

def makeCookie( token ):
    try:
        encoded = base64.urlsafe_b64encode(crypt.encrypt(json.dumps(token)))
    except Exception as e:
        print("xxx Encode exception " + str(e))
        encoded = "encode error"

    print ("*** ENCODED COOKIE ***")
    print (encoded)
    return encoded

def eatCookie ( cookie ):
    try:
        token = json.loads(crypt.decrypt(base64.urlsafe_b64decode(str(cookie))))
        print ("cookie decoded; token = " + str(token))
        return token
    except Exception as e:
        print ("Token decode error: " + str(e))
        return None


@app.route('/raxakapi/v1/amazonlogin/')
def amazonlogin():
    # import pycurl
    # import urllib
    # import json
    # import StringIO

    print("wsgi: amazonlogin")

    access_token = flask.request.args.get('access_token')
    print("Amazon access token = " + access_token)
    try:
        h = httplib2.Http('.cache')
        resp, content = h.request(
            "https://api.amazon.com/auth/o2/tokeninfo?access_token=" + urllib.quote_plus(access_token), "GET")

        # verify that the access token belongs to us
        # c.setopt(pycurl.SSL_VERIFYPEER, 1)
        # c.setopt(pycurl.WRITEFUNCTION, b.write)
        # print(c.getinfo(pycurl.EFFECTIVE_URL))
        # c.perform()
        # d = json.loads(b.getvalue())
        d = json.loads(content)
        if d['aud'] != 'amzn1.application-oa2-client.6f555779154d4493b8185aa87a3b75bf':
            # the access token does not belong to us
            print("Invalid token: " + d['aud'])
            raise BaseException("Invalid Token")

    except Exception as e:
        print ("Exception in amazonlogin " + str(e))

    # exchange the access token for user profile
    #	b = StringIO.StringIO()

    #	c = pycurl.Curl()
    #	c.setopt(pycurl.URL, "https://api.amazon.com/user/profile")
    #	c.setopt(pycurl.HTTPHEADER, ["Authorization: bearer " + access_token])
    #	c.setopt(pycurl.SSL_VERIFYPEER, 1)
    #	c.setopt(pycurl.WRITEFUNCTION, b.write)

    #	c.perform()
    h = httplib2.Http(".cache")
    resp, content = h.request("https://api.amazon.com/user/profile", "GET",
                              headers={'Authorization': 'bearer ' + access_token})

    d = json.loads(content)
    print("Amazon information about user")
    for key in d:
        print("key: " + key + " : " + str(d[key]))

    # Now create a cloudraxak token and register it:

    token = {}
    token['login'] = 'Amazon'
    token['ip'] = myIP()
    token['user'] = 'Amazon:' + d['name'].replace(" ", "_")
    token['email'] = d['email']

    encoded = makeCookie(token)

    print('ready to redirect to select.html')
    # enroll this user who just got in (or overwrite information if user exists)

    # enroll can return 'OK', 'Code:xxxx', 'Expired', 'Register'

    enr = cloudraxak.enroll(token['user'], token)

    if enr is 'OK':
        print('wsgi: enroll returns OK')
        try:
            if (token['email'] in hpDemoList):
                url = 'select.html'
            else:
                url = 'raxak.html'
            print ("*** " + url)
            resp = flask.make_response(flask.redirect(url))
            resp.set_cookie('usertoken', encoded)
            return resp
        except Exception as e:
            print("exception : " + str(e))
    elif enr is 'Register':
        print('wsgi: enroll returns Register')
        resp = flask.make_response(flask.redirect('preauth.html'))
        return resp
    elif enr is 'Expired':
        print('wsgi: enroll returns Expired')
        resp = flask.make_response(flask.redirect('expired.html'))
        return resp
    elif 'Code:' in enr:
        print('wsgi: enroll returns ' + enr)
        encenr = base64.urlsafe_b64encode(crypt.encrypt(enr))
        print("encoded code = " + encenr)
        resp = flask.make_response(flask.redirect('codecheck.html?token=' + encoded + '&code=' + encenr))
        return resp
    else:
        pass


@app.route('/raxakapi/v1/checkCode', methods=['POST'])
def checkCode():
    print("wsgi: checkCode")
    for i in flask.request.form:
        print (str(i) + " : " + str(flask.request.form.get(i)))

    # logic to decode "code" "token" and "entry", compare "entry" with "code" and accept or reject
    # we get 3 tokens back: token, code, and entry

    if 'token' not in flask.request.form:
        print("wsgi: checkCode: error: No token found")
        return flask.abort(400)

    if 'code' not in flask.request.form:
        print("wsgi:checkCode: error: No code found")
        return flask.abort(400)
    if 'entry' not in flask.request.form:
        print("wsgi: checkCode: error: no entry found")
        return flask.make_response(flask.redirect('codecheck.html?token=' +
                                                  flask.request.form.get('token') + '&code=' + flask.request.form.get(
            'code') +
                                                  '&redo=No code entered.'))
    ecode = flask.request.form.get('code')
    print('ecode ' + ecode)
    try:
        code = crypt.decrypt(base64.urlsafe_b64decode(str(ecode)))
        entry = flask.request.form.get('entry')
    except:
        print(traceback.format_exc())
        return flask.abort(400)
    print('wsgi: checkCode: comparing ' + entry.lower() + ' to ' + code.lower()[5:])

    if (entry.lower() == code.lower()[5:]):
        print('wsgi:checkCode: code matched')
        token = json.loads(crypt.decrypt(base64.urlsafe_b64decode(str(flask.request.form.get('token')))))
        cloudraxak.activateUser(token['email'], 6)
        # Now that we have marked the code as correct, we can re-enroll the user successfully

        # enroll should only return 'OK' at this stage

        enr = cloudraxak.enroll(token['user'], token)

        if enr is 'OK':
            print('wsgi: enroll returns OK')
            try:
                if (token['email'] in hpDemoList):
                    url = 'select.html'
                else:
                    url = 'raxak.html'

                print ("*** " + url)
                resp = flask.make_response(flask.redirect(url))
                resp.set_cookie('usertoken', flask.request.form.get('token'))
                return resp
            except Exception as e:
                print("exception : " + str(e))
                print traceback.format_exc()
        else:
            print("wsgi: checkCode: Re-enrollment result is: " + enr + " which is illegal")
            pass

    else:
        return flask.make_response(flask.redirect('codecheck.html?token=' +
                                                  flask.request.form.get('token') + '&code=' + flask.request.form.get(
            'code') +
                                                  '&redo=Code does not match'))
    return flask.abort(400)


@app.route('/raxakapi/v1/googlelogin')
def googlelogin():
  print ("wsgi: In googlelogin")

  try:
    print (flask.request.args)
  except Exception, e:
    print (e)

  ip1 = myIP()
  browser = flask.request.user_agent.browser

  if 'credentials' not in flask.session:
    print ("googlelogin: No credentials -> redirecting to oauth2callback")
    url = flask.url_for('oauth2callback',_external=True)
    print (url)
    return flask.redirect(url)

  print('googlelogin: flask.session[credentials] = ' + flask.session['credentials'])

  credentials = client.OAuth2Credentials.from_json(flask.session['credentials'])
  print ("Credentials exist")
  print (credentials)
#  flask.session.pop('credentials', None)

  if credentials.access_token_expired:
    print ("Expired Token")
    return flask.redirect(flask.url_for('oauth2callback', _external=True))
  else:
    print ("Token Exists")
    http_auth = credentials.authorize(httplib2.Http())
    print ("http_auth done")
#	drive_service = discovery.build('drive', 'v2', http_auth)
#	files = drive_service.files().list().execute()
#	page = page + str(files)
    try:
        id_service = discovery.build('oauth2', 'v1', http_auth)
        userid = id_service.userinfo().get().execute()
        print("Google information about user")
        for key in userid:
            print("key: " + key + " : " + str(userid[key]))
    except Exception as e:
        print("Exception: " + str(e))

    # set usertoken
    token = {}
    token['login'] = "Google"
    token['ip'] = str(ip1)
    token['user'] = str('Google:'+userid['id'])
    token['email'] = str(userid['email'])
    print('Token = ' + str(token))
    encoded = makeCookie(token)
    print('ready to redirect to select.html')
    # enroll this user who just got in (or overwrite information if user exists)

    # enroll can return 'OK', 'Code:xxxx', 'Expired', 'Register'

    enr = cloudraxak.enroll( token['user'], token )

    if enr is 'OK' :
        print('wsgi: enroll returns OK')
        try:
            if (token['email'] in hpDemoList):
                url = 'select.html'
            else:
                url = 'raxak.html'
            print ("*** " + url)
            resp = flask.make_response(flask.redirect(url))
            resp.set_cookie('usertoken', encoded)
            return resp
        except Exception as e:
            print("exception : " + str(e))
    elif enr is 'Register':
        print('wsgi: enroll returns Register')
        resp = flask.make_response(flask.redirect('preauth.html'))
        print (resp.__dict__)
        return resp
    elif enr is 'Expired':
        print('wsgi: enroll returns Expired')
        resp = flask.make_response(flask.redirect('expired.html'))
        return resp
    elif 'Code:' in enr:
        print('wsgi: enroll returns ' + enr)
        encenr = base64.urlsafe_b64encode(crypt.encrypt(enr))
        print('encenr = ' + encenr)
        resp = flask.make_response(flask.redirect('codecheck.html?token='+encoded+'&code='+encenr))
        # Create return and post
        return resp
    else:
        pass

@app.route('/raxakapi/v1/resetCookie')
def resetCookie():
    usertoken = flask.request.cookies.get('usertoken')
    if usertoken is None:
        print ('No cookie set')
        return "No cookie set"
    else:
        if validateUserToken(usertoken) is None:
            print ("Cookie needs to be reset")
            try:
                resp = flask.make_response(flask.redirect(flask.url_for('resetCookie')))
                resp.set_cookie('usertoken', '', expires=0)
            except Exception as e:
                print ("Error: " + str(e))
                return str(e)
            return resp
        else:
            print ("Cookie is valid")
            return "Cookie is valid"


@app.route('/raxakapi/v1/oauth2callback')
def oauth2callback():
    print ("Request Auth")
    print (flask.request.args)

    url = flask.url_for('oauth2callback', _external=True)
    print ("callback url = " + url)
    flow = client.flow_from_clientsecrets(
        'client_secret_3.json',
        # scope='https://www.googleapis.com/auth/drive.metadata.readonly',
        scope='https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
        redirect_uri=url,
        message="File issues")

    print ("Setup flow")

    if 'code' not in flask.request.args:
        auth_uri = flow.step1_get_authorize_url()
        print ("Send Redirect URI for Authorize")
        print (auth_uri)
        return flask.redirect(auth_uri)
    else:
        auth_code = flask.request.args.get('code')
        credentials = flow.step2_exchange(auth_code)

        print ("Got credentials")
        print (credentials.to_json())

        print (str(flask.session))

        flask.session['credentials'] = credentials.to_json()
        print (str(flask.session))

        print ("flask.session[credentials] set -- Sending URI")
        print (flask.url_for('googlelogin', _external=True))

        return flask.redirect(flask.url_for('googlelogin', _external=True))


# for integration testing with HP, the test api needs no validation

@app.route('/raxakapi/v1/getLDAPcreds')
def getLDAPcreds():
    userid = validateAPI()
    if userid is None:
        return ""  # if there is no user, or if the user cannot be authenticated, return null

    password = cloudraxak.getLDAPpwd(userid)
    if password == None:
        return ""

    logindata = {"username": userid, "password": password}

    logindata = {"username": "consumer", "password": "cloud"}
    return flask.jsonify(logindata)


#
@app.route('/raxakapi/v1/jumptoCSAProvision')
def jumptoCSAProvision():
    #	get the current userid from cookie

    userid = validateAPI()
    if userid is None:
        return flask.abort(403)

    # check in redis if the userid has been logged into LDAP

    # check key userid:LDAP for a value. if it exists the user is in LDAP and the value is the password
    # if key does not exist,
    #	add to redis userid:LDAP -> "raxak"
    #	enter the userid and "raxak" into LDAP

    print "Inside jumptoCSAProvision"
    csaUserid = "consumer"
    csaPasswd = "cloud"
    # return flask.redirect(Hp_log_redirect.login(csaUserid,csaPasswd))
    # return flask.make_response( html, mimetype='application/html' )
    # return flask.Response( html, mimetype='text/html' )
    # return flask.Response(Hp_log_redirect.login(csaUserid,csaPasswd), mimetype='text/html')
    resp = flask.Response(CSA_login_redirect.login(csaUserid, csaPasswd), mimetype='text/html')
    resp.headers['Link'] = 'http://130.211.133.165:8089'

    return resp


#	do what Sabi suggests to login and jump directly to <browse catalog detail>

# return flask.redirect( )

@app.route('/raxakapi/v1/jumptoCSAStatus')
def jumptoCSAStatus():
    csaUserid = "consumer"
    csaPasswd = "cloud"

    return flask.redirect()


#
@app.route('/raxakapi/v1/endSubscription/<userid>/<ipaddress>/<service>')
def endSubscription(userid, ipaddress, service):
    print("wsgi: endSubscription:")
    print("... userid: " + str(userid))
    print("... ipaddress: " + str(ipaddress))
    print("... service: " + str(service))
    loggedinuser = validateAPI()
    ip = myIP()
    print("Check IP = " + str(ip))
    if ip == csaServer or loggedinuser is not None:  # should be a variable
        print ("Request from the HP ip address")
        if service == "aws":
            ipaddress = ipaddress.encode("ascii", "ignore")
            ipsplit = string.replace(ipaddress, ".", "-").split("-")
            machineIP = ipsplit[1] + "." + ipsplit[2] + "." + ipsplit[3] + "." + ipsplit[4]
        elif service == "rackspace":
            machineIP = ipaddress.encode("ascii", "ignore")
        else:
            print("Unknown service " + str(service))
    else:
        print("wsgi: test: request not from CSA ip address")

    print("Removing IP = " + str(machineIP))
    ip_list = []
    ip_list.append(machineIP)
    deleted = cloudraxak.deleteUsernameIP(userid, ip_list)
    if deleted:
        cloudraxak.deleteCronJob(userid, ip_list)
    # ASG - TODO Incase of an error, need to report with exact error message as a reply to this API
    return flask.Response(json.dumps('sucessfully deleted'), mimetype='application/json')


#
@app.route('/raxakapi/v1/test/<userid>/<ipaddress>/<securitylevel>/<frequency>/<keypair>/<service>/<nickname>')
def test(userid, ipaddress, securitylevel, frequency, keypair, service, nickname):
    #	question: what to do if the ipaddress is a list or a cluster?

    print("wsgi: test:")
    print("... userid: " + str(userid))
    print("... ipaddress: " + str(ipaddress))
    print("... securitylevel: " + str(securitylevel))
    print("... frequency: " + str(frequency))
    print("... service: " + str(service))
    print("... nickname: " + str(nickname))
    token = {}
    valid = False
    loggedinuser = validateAPI()
    ip = myIP()
    if loggedinuser is None:
        print(str(loggedinuser))
        print("Check IP = " + str(ip))
        print "Security level = ", securitylevel
        if ip == csaServer:  # should be a variable
            valid = True
    else:
        valid = True
    if valid:
    # create a hp-specific token
        print ("Request from the HP ip address")
        token['login'] = "HP-CSA"
        if service == "aws":
            ipaddress = ipaddress.encode("ascii", "ignore")
            ipsplit = string.replace(ipaddress, ".", "-").split("-")
            token['ip'] = csaServer
            machineIP = ipsplit[1] + "." + ipsplit[2] + "." + ipsplit[3] + "." + ipsplit[4]
            machineUsernameIP = "raxak@" + machineIP
        elif service == "rackspace":
            machineIP = ipaddress
            machineUsernameIP = "raxak@" + machineIP
            token['ip'] = csaServer
            rootpwd = base64.b64decode(str(keypair))
            print ("key = " + str(keypair) + " pwd = " + rootpwd)
            rootpwd = rootpwd.replace('$', '\\$')
            print ("escaped version of key: " + rootpwd)
            print ("Rackspace machine: attempting set up of machine")

            try:
                subprocess.call(['./rackspaceVM_settings.sh %s "%s"> /tmp/%s.log' % (machineIP, rootpwd, machineIP)],
                                shell=True)
            except Exception as e:
                print("Error fixing VM parameters: " + str(e))
                print (traceback.format_exc())

        token['user'] = userid
        token['email'] = userid + "@cloudraxak.net"
        cloudraxak.enroll(userid, token)
        print("Ready to do setup of server")
    # try:
    #			subprocess.call(['./amazonVM_settings.sh %s > /dev/null' % machineIP], shell = True)
    #		except Exception as e:
    #			print("Error fixing VM parameters: " + str(e))
    else:
        print("wsgi: test: request not from CSA ip address")

    # do stuff here to take the ipaddress etc, and log it into the system
    status = cloudraxak.addIP(userid, machineUsernameIP, str(nickname))
    #	do stuff here to run the designated profile on the ip
    print ("addIP status = " + str(status))

    flag = False
    for status_list in status:
        for key in status_list:
            if key is "access":
                if int(status_list[key]) > 0:
                    flag = True
                    print("All OK with newly added username@IP, can perform complaince execution")
                else:
                    print("Error: Unable to proceed,  access code is not OK")
                break

    if flag:
        # Do complaince execution only when machine is reachable and access code is 1.
        ip_list = []
        ip_list.append(machineUsernameIP)
        autoremediate = "1"
        if frequency.lower() == 'manual':
            autoremediate = "0"
            frequency = "none"
        if securitylevel.lower() == 'gold':
            profile = "Gold Profile"
        elif securitylevel.lower() == 'silver':
            profile = "Silver Profile"
            # For demo purpose
            autoremediate = "0"
        elif securitylevel == 'platinum':
            profile = "Platinum Profile"
        else:
            print "Defaulting to Demonstration Profile"
            profile = "Demonstration Profile"
        print "Profile to be applied = " + profile
        returnvalue = cloudraxak.applyProfile(userid, ip_list, profile, autoremediate, frequency)

    # encrypt and encode the token to create a cookie equivalent
    encoded = makeCookie(token)
    uri = "raxakapi/v1/csastatus/"+encoded
    uri = '<a href="' + uri + '" target="_blank">Click for Raxak Protect console</a>'
    print ("Returning uri: " + uri)
    return (uri)

@app.route('/raxakapi/v1/customsetup/<username>/<enroll>')
@app.route('/raxakapi/v1/customsetup/<username>/<enroll>/<profile>/<auto>/<repeat>', methods=['POST'])
def customsetup(username='raxak', enroll='False', profile='None', auto='False', repeat='Once'):
    #
    #   customsetup returns a customized VMSetup.sh tied to the user who is logged in
    #   Custom parameters are:
    #       username = the username created for RaxakProtect to log in (default: raxak)
    #       profile = the profile automatically executed once: default None
    #       auto = True if auto remediation, False if manual, ignored if profile=None
    #       repeat = {Daily | Weekly | Monthly} if auto = True, otherwise Once
    #
    print ("wsgi: customsetup")
    print ("... username: " + username)
    print ("... enroll: " + enroll)
    print ("... profile: " + profile)
    print ("... auto: " + auto)
    print ("... repeat: " + repeat)

    # First check if there is a logged in user
    userid = validateAPI()
    if userid is None:
        print ("No validated user available")
        return flask.abort(401)

    usertoken = getcookieifpresent()
    if usertoken is None:
        print ("No cookie?")
        return flask.abort(401)
    try:
        env = flask.request.__dict__['environ']
        servername = env['HTTP_X_FORWARDED_PROTO'] + '://' + env['HTTP_X_FORWARDED_HOST']


        print ('servername = '+servername)
        shortcode = hashlib.sha256(usertoken).hexdigest()[:16].upper() #This is a 16 character hash of the cookie

        with open('WebFrontEnd-Bootstrap/VMSetup.sh', 'r') as myfile:
            data=myfile.read()

        # Set customized values
        custstrings = '''
username='''+username+'''
secretcode='''+shortcode+'''
usertoken='''+usertoken+'''
raxakserver='''+servername+'''
profile='''+ urllib.quote(profile)+'''
auto='''+auto+'''
repeat='''+repeat+'''
# End customization
'''

        if enroll.lower() == 'true':
            data = data.replace('#***',custstrings)

            with open('WebFrontEnd-Bootstrap/customize-stub.sh', 'r') as myfile:
                data += myfile.read()


        response = flask.make_response(data)


        response.headers["Content-Disposition"] = "attachment; filename=RaxakProtectSetup.sh"
        return response
        # return '<pre>' + data + '</pre>'
    except:
        print("Exception")
        print(traceback.format_exc())
        return (404)

@app.route('/raxakapi/v1/autoenroll/<usertoken>/<nickname>/<username>/<profile>/<auto>/<repeat>')
def autoenroll(usertoken, nickname, username, profile, auto, repeat):


    print("wsgi: autoenroll:")
    print ("... usertoken: "+ str(usertoken))
    print ("... nickname: " + str(nickname))
    print ("... username: " + str(username))
    print ("... profile: " + str(profile))
    print ("... auto: " + str(auto))
    print ("... repeat: " + str(repeat))

    repeat = ('none', repeat)[auto.lower() == 'true']

    loggedinuser = validateToken( str(usertoken))   # Since this will be an API call, no validation for IP
    if loggedinuser is None:
        print ("User cannot be validated. Refusing to enroll")
        return flask.abort(401)


    print ("Validated user = " + loggedinuser)

    ip = myIP()
    print ("wsgi: autoenroll: enrolling machine " + str(ip))

    status = cloudraxak.addIP(loggedinuser, str(username)+'@'+str(ip) , str(nickname))
    #	do stuff here to run the designated profile on the ip
    print ("addIP status = " + str(status))

    # status is a list of access codes for each ip. Here since we only have one ip
    ipstatus = int(status[0]['access'])
    if ipstatus < 0:
        if ipstatus == -99:
            return "Duplicate IP address in system. Cannot add"
        if ipstatus == -1:
            return "OS supported but incorrect version"
        if ipstatus == -2:
            return "Ping failed"
        if ipstatus == -3:
            return "SSH failed"
        if ipstatus == -4:
            return "Cannot run with escalated privilege (sudo)"
        if ipstatus == -6:
            return "Cannot open VPN tunnel to private IP"
        if ipstatus == -7:
            return "Timeout waiting for VPN tunnel"

    print ("Machine successfully enrolled")
    if profile.lower() == 'none':
        return ("Machine successfully enrolled; no profile specified")

    iplist = [ str(username)+'@'+str(ip) ]
    status = cloudraxak.applyProfile(loggedinuser, iplist, profile, ('0','1')[auto.lower() == 'true'], repeat)
    print("wsgi: autoenroll: applyProfile status= " + str(status))
    return "Applying profile: status = " + str(status)

@app.route('/raxakapi/v1/openstackenroll/<usertoken>/<nickname>/<username>')
def openstackenroll(usertoken, nickname, username):
    #	question: what to do if the ipaddress is a list or a cluster?

    print("wsgi: openstackenroll:")
    print("... usertoken: " + str(usertoken))
    print("... nickname: " + str(nickname))
    print("... username: " + str(username))



    ip = myIP()
    print ("wsgi: openstackenroll: " + str(ip))

    # We need a good generalized way to check the validity of a call from a
    # newly created VM in openstack. The best way will be to use the VMSetup to
    # return a token that represents the user, and to pass the token in as
    # part of the call. (see place holder for usertoken) this token can be
    # checked as we usually do in validateAPI. For now, we are assuming that
    # any call that has the variable usertoken set to OPENSTACK is acceptable.

    if usertoken != 'OPENSTACK':
        return "Authentication Failed: Must be OPENSTACK"



    token = {}
    valid = False
    loggedinuser = 'GTestUser'      # should get this from the usertoken in the future

    # create a hp-specific token
    print ("Request from the HP ip address")
    token['login'] = "HP-CSA"

    token['user'] = loggedinuser
    token['firstname'] = loggedinuser
    token['email'] = loggedinuser + "@cloudraxak.net"
    cloudraxak.enroll( loggedinuser, token )
    print("Ready to do setup of server")

    #	do stuff here to take the ipaddress etc, and log it into the system
    status = cloudraxak.addIP(loggedinuser, str(username)+'@'+str(ip) , str(nickname))
    #	do stuff here to run the designated profile on the ip
    print ("addIP status = " + str(status))


    #	encrypt and encode the token to create a cookie equivalent
    try:
        encoded = base64.urlsafe_b64encode(crypt.encrypt(json.dumps(token)))
    except Exception as e:
        print("xxx Encode exception in test " + str(e))
        encoded = "encode_error"

    print ("Returning code: " + encoded)
    return encoded

@app.route('/raxakapi/v1/csastatus/<token>')
def csastatus(token):
    # validate the token, if it is correct, switch to index after setting the appropriate cookie
    print ("wsgi: csastatus")
    user = validateUserToken(token)
    print ("validation test returns user = " + str(user))
    if user is None:
        print ("Token does not validate")
        return flask.abort(403)
    else:
    # set usertoken
        print ("Token validates and will be used as the cookie")
        encoded = token

        print ("*** ENCODED COOKIE ***")
        print (encoded)

        print('ready to redirect to raxak.html')
    # enroll this user who just got in (or overwrite information if user exists)
    # convert token to dict by decoding

        token = {}
        token = json.loads(crypt.decrypt(base64.urlsafe_b64decode(str(encoded))))
        print ("wsgi: csastatus: token decoded, username = " + token['user'])

        if cloudraxak.enroll(token['user'], token) == 'OK':
            print('wsgi: enroll returns True')
            url = 'raxak.html'
            print ("*** " + url)

            resp = flask.make_response(flask.redirect(url))
            resp.set_cookie('usertoken', encoded)
            return resp
        else:
            return flask.abort(403)


@app.route('/raxakapi/v1/generateHPCode', methods=['POST'])
def generateHPCode():
    print ("wsgi: generateHPcode")

    for i in flask.request.form:
        print (str(i) + " : " + str(flask.request.form.get(i)))

    print ("flask.request.form = " + json.dumps(flask.request.form))

    name = flask.request.form.get("first_name") + " " + flask.request.form.get("last_name")
    email = flask.request.form.get("user_email")
    try:
        code = hashlib.sha256(email).hexdigest()[:8].upper()
    except Exception as e:
        print (str(e))

    print('wsgi: generateHPCode: code for ' + email + ' = ' + code)

    # record the code against the email address in Redis
    cloudraxak.setOfferCode(email, json.dumps(flask.request.form), code)
    httpserver = flask.request.environ['HTTP_X_FORWARDED_HOST']
    print("HTTP Server: " + httpserver)
    html = '''
    <!DOCTYPE html>
    <html lang="en-US">
    <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Your Custom Code</title>
    <head>
    <body>
    <div style="position:relative;width:478px;margin-left:auto;margin-right:auto;"><h1>Your custom access code for Raxak Protect</h1>
    </div>'''
    html += '''
    <div style="position: relative; background: url(http://''' + httpserver + '''/free-trial.jpg); width:478px; height:377px; border:2px solid black; margin-left:auto; margin-right:auto;">

    <div style="position:absolute; bottom: 70px; left: 20px; width: 400px; font-size: large; font-weight: bold; color: #000;">
    <p>For '''
    html += name + '''</p><p>'''
    html += code + '''</p> </div>'''
    html += "<a href='http://" + httpserver + "/free-trial.html'>Click here to return to enrollment form</a><br>"
    html += "<a href='mailto:" + email + "?subject=Free%20Trial%20of%20Raxak%20Protect&body=Dear User,%0D%0A%0D%0A"
    html += "Congratulations.%20Your%206%20month%20free%20trial%20of%20Raxak%20Protect%20has%20been%20approved.%20The%20authorization%20code%20for%20the%20trial%20is:%20" + code + "%0D%0A%0D%0A"
    html += "To%20use%20the%20software,%20please%20go%20to%20http://"+ httpserver
    html += "/login.html%20and%20follow%20the%20steps.%0D%0A%0D%0A"
    html += "For%20complete%20instructions%20on%20how%20to%20use%20Raxak%20Protect,%20see%20http://"
    html += httpserver + "/stepbystephelp.html%0D%0A%0D%0A"
    html += "Remember%20that%20Raxak%20Protect%20is%20evolving%20rapidly.%20Please%20provide%20feedback%20to%20sales@cloudraxak.com%0D%0A%0D%0A"
    html += "The%20Cloud%20Raxak%20Team,%0D%0A"
    html += "Simplifying%20and%20automating%20cloud%20security%20compliance.%0D%0A"
    html += "" + httpserver + "%0D%0A"
    html += "'>Click here to email the code</a>"
    html += "</body></html>"
    return html


@app.route('/', defaults={'who': 'everybody'})
@app.route('/raxakapi/v1/hello/', defaults={'who': 'world'})
@app.route('/raxakapi/v1/hello/<who>')
def hello(who):
    try:
        print ("Hello world")

        print("Request properties: ")
        pp = pprint.pformat(flask.request.__dict__)
        print (pp)
        # check if user is authenticated either with a token or a cookie
        usertoken = getcookieifpresent()
        userid = validateAPI()
        print("after validateAPI()")
        page = ""
        page += "<h1>Welcome back</h1>Welcome back " + "<br>"

        page += 'Hello ' + who + ' --from Flask' + '<br>'
        page += 'Cookie: '
        if usertoken is None:
            page += '<br> None found. Might not be a browser<br>'
        else:
            page += '<br><pre>' + usertoken + ' </pre>'
            page += '<br><br>Validated user : ' + userid + '<br>'
            page += '<pre>' + pp + '</pre><br>'

        print (page)
        return page
    except:
        print("Exception: ")
        print(traceback.format_exc())
        return


# <--------------- remaining functions imported from old wsgi.py and converted to  using Flask ----------->
@app.route('/raxakapi/v1/showrun/', defaults={'ip': ''})
@app.route('/raxakapi/v1/showrun/<ip>')
def showrun(ip):
    # get the name from the url if it was specified there.
    # args = environ['myapp.url_args']
    # qs = environ['QUERY_STRING']

    # validate API call as authentic and return if not
    userid = validateAPI()
    if userid is None:
        return flask.abort(403)

    print ("ip = " + ip)
    args = flask.request.args
    if ip != '':
        timestamp = ""
    # ip = escape(args[0])
    print ("wsgi: showrun: ip = " + ip)
    #	if qs:
    #			print "wsgi: showrun: qs = " + qs
    #		qs_dict = dict(urlparse.parse_qsl(qs))
    #		print "wsgi: showrun: s_dict: " + str(qs_dict)
    #		timestamp = qs_dict.get('timestamp')
    #		print "wsgi: showrun: timestamp = " + timestamp
    #		start_response('200 OK', [('Content-Type', 'text/json')])
    #		return json.dumps(cloudraxak.showrun(ip,timestamp))

    if 'timestamp' in flask.request.args:
        timestamp = flask.request.args.get('timestamp')
    else:
        timestamp = ""

    return flask.Response(json.dumps(cloudraxak.showrun(userid, ip, timestamp)), mimetype='application/json')

# NOTE-- not in API Reference

@app.route('/raxakapi/v1/status/', defaults={'ip': ''})
@app.route('/raxakapi/v1/status/<ip>')
def checkStatus(ip):
    print ('wsgi: inside checkStatus')
    # validate API call as authentic and return if not
    userid = validateAPI()
    if userid is None:
        return flask.abort(403)

    if ip != '':
        print ("wsgi: checkStatus: ip = " + ip)
        status = cloudraxak.checkStatus(ip)
        print ("return status = " + str(status))
        return flask.Response(status, mimetype='application/json')
    else:
        return flask.abort(400, 'Usage: status/<login>@<ip>')


@app.route('/raxakapi/v1/getExecutionStatus/')
def getExecutionStatus():
    # get the IPs from the url if it was specified there.
    # validate API call as authentic and return if not
    userid = validateAPI()
    if userid is None:
        return flask.abort(403)

    if 'ip' in flask.request.args:
        qs_ip_list1 = flask.request.args.get('ip')
        qs_ip_list = qs_ip_list1.split(",")
        print "wsgi: qs_ip_list = " + str(qs_ip_list)
        # return cloudraxak.getExecutionStatus(qs_ip_list)	# should this be jsonified?
        return flask.Response(cloudraxak.getExecutionStatus(qs_ip_list), mimetype='text/plain')
    else:
        return flask.abort(404, "Usage: getExecutionStatus/<ip-list>")


# Usage: /raxakapi/v1/showCheckRule/<rulenumber>/<targetmachine>
@app.route('/raxakapi/v1/showCheckRule/', defaults={'rulenum': ''})
@app.route('/raxakapi/v1/showCheckRule/<rulenum>')
@app.route('/raxakapi/v1/showCheckRule/<rulenum>', defaults={'targetmachine': ''})
@app.route('/raxakapi/v1/showCheckRule/<rulenum>/<targetmachine>')
def showCheckRule(rulenum, targetmachine):
    print("wsgi: inside showCheckRule")

    # validate API call as authentic and return if not
    userid = validateAPI()
    if userid is None:
        return flask.abort(403)
    if targetmachine != '':
        print("targetmachine :" + targetmachine)
    if rulenum != '':
        return cloudraxak.showCheckRule(rulenum)
    else:
        return flask.abort(404, "Usage: /raxakapi/v1/showCheckRule/<rulenumber>")


@app.route('/raxakapi/v1/showFixRule/', defaults={'rulenum': ''})
@app.route('/raxakapi/v1/showFixRule/<rulenum>')
@app.route('/raxakapi/v1/showFixRule/<rulenum>', defaults={'targetmachine': ''})
@app.route('/raxakapi/v1/showFixRule/<rulenum>/<targetmachine>')
def showFixRule(rulenum, targetmachine):
    print("wsgi: inside showFixRule")
    userid = validateAPI()
    if userid is None:
        return flask.abort(403)
    if targetmachine != '':
        print("targetmachine :" + targetmachine)
    if rulenum != '':
        return cloudraxak.showFixRule(rulenum)
    else:
        return flask.abort(404, "Usage: /raxakapi/v1/showFixRule/<rulenumber>")


# Usage: /raxakapi/v1/showRuleDescription/<rulenumber>/<targetmachine>
@app.route('/raxakapi/v1/showRuleDescription/', defaults={'rulenum': ''})
@app.route('/raxakapi/v1/showRuleDescription/<rulenum>')
@app.route('/raxakapi/v1/showRuleDescription/<rulenum>', defaults={'targetmachine': ''})
@app.route('/raxakapi/v1/showRuleDescription/<rulenum>/<targetmachine>')
def showRuleDescription(rulenum, targetmachine):
    print("wsgi: inside showRuleDescription")

    # validate API call as authentic and return if not
    userid = validateAPI()
    if userid is None:
        return flask.abort(403)
    if targetmachine != '':
        print("targetmachine :", targetmachine)
    if rulenum != '':
        ruleDescription = {}
        osName = cloudraxak.getOS(targetmachine)
        if osName == "":
            ruleDescription['Severity'] = cloudraxak.getRuleSeverity(rulenum)
            ruleDescription['Check Rule'] = cloudraxak.showCheckRule(rulenum)
            ruleDescription['Fix Rule'] = cloudraxak.showFixRule(rulenum)
        else:
            ruleDescription['Severity'] = cloudraxak.getRuleSeverity(rulenum, osName)
            ruleDescription['Check Rule'] = cloudraxak.showCheckRule(rulenum, osName)
            ruleDescription['Fix Rule'] = cloudraxak.showFixRule(rulenum, osName)
        return json.dumps(ruleDescription)
    else:
        return flask.abort(404, "Usage: /raxakapi/v1/showRuleDescription/<rulenumber>")


# Usage:	/raxakapi/v1/profiles
@app.route('/raxakapi/v1/profiles/')
def profiles():
    print ("wsgi: inside profiles")
    # validate API call as authentic and return if not
    userid = validateAPI()
    if userid is None:
        return flask.abort(403)

    return json.dumps(cloudraxak.getProfilesList())


# Usage:        /raxakapi/v1/profileDetails
@app.route('/raxakapi/v1/profileDetails/')
def profileDetails():
    print ("wsgi: inside profileDetails")
    # validate API call as authentic and return if not
    userid = validateAPI()
    if userid is None:
        return flask.abort(403)

    return json.dumps(cloudraxak.profileDetails())


#	Usage: /raxakapi/v1/supportedOSList
@app.route('/raxakapi/v1/supportedOSList/')
def supportedOSList():
    print("wsgi: inside supportedOSList")
    # validate API call as authentic and return if not
    userid = validateAPI()
    if userid is None:
        return flask.abort(403)
    return json.dumps(cloudraxak.supportedOSList())

#	Usage: /raxakapi/v1/dismiss/V-38455?ip=raxak@192.168.0.187
#	Note-- this requires rule name to be of the form V-XXX, not just XXX
@app.route('/raxakapi/v1/dismiss/<rulenum>')
def dismiss(rulenum):
    print('wsgi: inside dismiss')

    # validate API call as authentic and return if not
    userid = validateAPI()
    if userid is None:
        return flask.abort(403)

    ip = flask.request.args.get('ip')
    if ip is not None:
        returnvalue = cloudraxak.dismiss(ip, str(rulenum))
        return "Rule: " + rulenum + " manually marked as successful"
    else:
        return flask.abort(404, 'Usage: /raxakapi/v1/dismiss/<rulenum>?ip=<username>@<ip-address>')


# Usage: /raxakapi/v1/fixRule/rulenum?ip=raxak@192.168.0.187
@app.route('/raxakapi/v1/fixRule/<rulenum>')
def fixRule(rulenum):
    print('wsgi: inside fixRule')

    # validate API call as authentic and return if not
    userid = validateAPI()
    if userid is None:
        return flask.abort(403)

    ip = flask.request.args.get('ip')
    if ip is not None:
        returnvalue = cloudraxak.fixRule(userid, ip, str(rulenum))
        if returnvalue == 1:
            return "Rule: " + rulenum + " successfully remediated"
        elif returnvalue == 2:
            return "Rule: " + rulenum + " not automatically remediated. Please follow up manually "
        elif returnvalue == 98:
            return "Unable to connect to the target: " + ip
        else:
            return "Error while remediating the rule " + rulenum
    else:
        return flask.abort(404, 'Usage: /raxakapi/v1/fixRule/<rulenum>?ip=<username>@<ip-address>')


# Usage: /raxakapi/v1/checkRule/<rulenum>?ip=<login>@<ip-address>
@app.route('/raxakapi/v1/checkRule/<rulenum>/', methods=['GET', 'POST'])
def checkRule(rulenum):
    # get the name from the url if it was specified there.
    print('wsgi: in checkRule')

    # validate API call as authentic and return if not
    userid = validateAPI()
    if userid is None:
        return flask.abort(403)

    ip = flask.request.args.get('ip')
    if ip is not None:
        returnvalue = cloudraxak.checkRule(userid, ip, str(rulenum))
        print "wsgi: " + str(returnvalue)
        if returnvalue == 1:
            return "Rule: " + rulenum + " successful"
        elif returnvalue == 0:
            return "Rule: " + rulenum + " still failed, can remediate the rule by clicking on remediate icon"
        elif returnvalue == 2:
            return "Rule: " + rulenum + " needs manual interentation"
        elif returnvalue == 98:
            return "Unable to connect to the target: " + ip
        else:
            return "Error fetching status for the rule " + rulenum
    else:
        return flask.abort(404, 'Usage: /raxakapi/v1/checkRule/<rulenum>?ip=<username>@<ip-address>')


# Usage: /raxakapi/v1/forceRemediateRule/rulenum?ip=raxak@192.168.0.187
@app.route('/raxakapi/v1/forceRemediateRule/<rulenum>')
def forceRemediateRule(rulenum):
    print('wsgi: inside forceRemediateRule')

    # validate API call as authentic and return if not
    userid = validateAPI()
    if userid is None:
        return flask.abort(403)

    ip = flask.request.args.get('ip')
    if ip is not None:
        status = {}
        returnvalue = cloudraxak.fixRule(userid, ip, str(rulenum))
        if returnvalue == 1:
            status["message"] = "Rule: " + rulenum + " forcefully remediated"
            status["code"] = 1
        elif returnvalue == 2:
            status["message"] = "Rule: " + rulenum + " unable to remediate forcefully. <br>Please fix it manually."
            status["code"] = 2
        elif returnvalue == 98:
            status["message"] = "Unable to connect to the target: " + ip
            status["code"] = 98
        else:
            status["message"] = "Error while remediating the rule " + rulenum
            status["code"] = None

        return json.dumps(status)
    else:
        return flask.abort(404, 'Usage: /raxakapi/v1/forceRemediateRule/<rulenum>?ip=<username>@<ip-address>')


# Usage: /raxakapi/v1/runProfiles?ip="+ip+"&profile="+profile+"&autoremediate="+autoremediate;
@app.route('/raxakapi/v1/runProfiles/')
def runProfiles():
    print "wsgi: inside run profiles "

    # validate API call as authentic and return if not
    userid = validateAPI()
    if userid is None:
        ip = myIP()
        print("Check IP = " + str(ip))
        # From cron scheduler
        if ip == "127.0.0.1":
            userid = flask.request.args.get('username')
            if userid is None:
                return flask.abort(403)
        else:
            return flask.abort(403)

    if 'ip' in flask.request.args:
        qs_rule_list1 = flask.request.args.get('ip')
        qs_rule_list = qs_rule_list1.split(",")
        print "wsgi: qs_rule_list = " + str(qs_rule_list)
    else:
        return flask.abort(404, 'Usage: rule list must be specified')

    if 'profile' in flask.request.args:
        qs_profile = flask.request.args.get('profile')
        print "wsgi: qs_profile: " + str(qs_profile)
    else:
        return flask.abort(404, 'Usage: profile must be specified')

    if 'autoremediate' in flask.request.args:
        qs_autoremediate = flask.request.args.get('autoremediate')
        print "wsgi: qs_autoremediate: " + str(qs_autoremediate)
    else:
        return flask.abort(404, 'Usage: autoremediate must be specified')

    if 'frequency' in flask.request.args:
        qs_frequency = flask.request.args.get('frequency')
        print "wsgi: qs_frequency: " + str(qs_frequency)
    else:
        return flask.abort(404, 'Usage: frequency must be specified')

    if qs_rule_list and qs_profile and qs_autoremediate and qs_frequency:
        returnvalue = cloudraxak.applyProfile(userid, qs_rule_list, qs_profile, qs_autoremediate, qs_frequency)
        if returnvalue == None:
            return 'Compliance checking finished...'
    # TODO - ASG
    # return with rc value of execution of rules on respective Target machine VMs
    else:
        return flask.abort(404,
                           'Usage: /raxakapi/v1/runProfiles?ip=<ip-list>&profile=<profile>&autoremediate=<autoremediate>')

##Usage: /raxakapi/v1/addIP/ 
# ... note, username is actually taken from the login authentication
######previously it was get method, so when saving private ip, the password was shown in qureystring.#######
@app.route('/raxakapi/v1/addIP/', methods=['POST'])
def addIP():
    print "wsgi: inside addIP"

    # validate API call as authentic and return if not
    userid = validateAPI()
    if userid is None:
        return flask.abort(403)

    # username = flask.request.args.get('username')
    ip = flask.request.form.get('ip')
    if ip is None:
        return flask.abort(404, \
                      "Usage /raxakapi/v1/addIP?ip=<username>@<ip-address>&nickname=<nickname>&tunnelUsername=<username>&tunnelPassword=<pwd>&tunnelIP=<ip>")

    nickname = flask.request.form.get('nickname')
    if nickname is None:
        nickname = ip

    sshport = flask.request.form.get('sshport')
    if sshport is None:
        sshport = "22"

    tunnelUsername = flask.request.form.get('tunnelusername')
    tunnelPassword = flask.request.form.get('tunnelpassword')
    tunnelIP = flask.request.form.get('tunnelip')
        
    print("wsgi: addIP: " + ip + " " + nickname + " " + str(sshport) + " " + str(tunnelUsername) + " " + str(tunnelPassword) + " " + str(tunnelIP))

    status = cloudraxak.addIP(userid, ip, nickname, sshport, tunnelUsername, tunnelPassword, tunnelIP)
    return flask.Response(json.dumps(status), mimetype="application/json")


#	Usage: /raxakapi/v1/setSelectedTMs?username=raxak&ip=ip


@app.route('/raxakapi/v1/setSelectedTMs/')
def setSelectedTMs():
    print "wsgi: inside setSelectedTMs"

    # validate API call as authentic and return if not
    userid = validateAPI()
    if userid is None:
        return flask.abort(403)

    qs_ip_list = flask.request.args.get('ips')
    print ("wsgi: username = " + userid + " qs_ip_list = " + str(qs_ip_list))
    status = cloudraxak.setSelectedTMs(userid, qs_ip_list)
    return flask.Response(json.dumps(status), mimetype="application/json")


#	Usage: /raxakapi/v1/setSelectedTMs?username=raxak&ip=ip
@app.route('/raxakapi/v1/getSelectedTMs/')
def getSelectedTMs():
    print "wsgi: inside getSelectedTMs"

    # validate API call as authentic and return if not
    userid = validateAPI()
    if userid is None:
        return flask.abort(403)

    status = cloudraxak.getSelectedTMs(userid)
    return flask.Response(json.dumps(status), mimetype="application/json")


#	Usage: /raxakapi/v1/deleteIP?username=<username>&ip=<login>@<ip-address>
#		... note, username is now taken from the login authentication
@app.route('/raxakapi/v1/deleteIP')
@app.route('/raxakapi/v1/deleteIP/')
def deleteIP():
    print "wsgi: inside deleteIP"

    # validate API call as authentic and return if not
    userid = validateAPI()
    if userid is None:
        return flask.abort(403)

    # username = qs_dict.get('username')
    ip = flask.request.args.get('ip')

    if ip is None:
        return flask.abort(404, "Usage /raxakapi/v1/deleteIP?ip=<username>@<ip-address>")

    qs_ip_list = ip.split(",")

    deleted = cloudraxak.deleteUsernameIP(userid, qs_ip_list)
    if deleted:
        cloudraxak.deleteLastrun(userid, qs_ip_list)
        cloudraxak.deleteCronJob(userid,qs_ip_list)
        cloudraxak.deleteGroupIP(userid, qs_ip_list)

    # ASG - TODO Incase of an error, need to report with exact error message as a reply to this API
    return flask.Response(json.dumps('sucessfully deleted'), mimetype='application/json')

# ONE OCCURANCE
#	Usage: /raxakapi/v1/getIPs?username=<username>
#		... note, username is now taken from the login authentication
@app.route('/raxakapi/v1/getIPs/')
def getIPs():
    print "wsgi: inside getIPs"

    # validate API call as authentic and return if not
    userid = validateAPI()
    if userid is None:
        return flask.abort(403)

    ips = cloudraxak.getIPs(userid)
    try:
        print ("wsgi: ips = " + str(ips) + str(type(ips)))
    except Exception as e:
        print ("wsgi print exception " + str(e))
    return flask.Response(json.dumps(ips), mimetype="application/json")


#	Usage: /raxakapi/v1/getArchiveLogFileNameList/<usernameip>
@app.route('/raxakapi/v1/getArchiveLogFileNameList/', defaults={'userNameIp': ''})
@app.route('/raxakapi/v1/getArchiveLogFileNameList/<userNameIp>')
def getArchiveLogFileNameList(userNameIp):
    print "wsgi: inside getArchiveLogFileNameList"

    # validate API call as authentic and return if not
    userid = validateAPI()
    if userid is None:
        return flask.abort(403)

    if userNameIp != '':
        return json.dumps(cloudraxak.getArchiveLogFileNameList(userid, userNameIp))
    else:
        return flask.abort(404, 'Usage: /raxakapi/v1/getArchiveLogFileNameList/<login>@<ip-address>')


#--- get archive log file list of an user from Admin panel.
#--  @userName is first argument gives user name.
#--  @userNameIp is second argument gives user name IP.

@app.route('/raxakapi/v1/getUsersArchiveLogFileNameList/', defaults={'userName': '','userNameIp': ''})
@app.route('/raxakapi/v1/getUsersArchiveLogFileNameList/<userName>/<userNameIp>')
def getUsersArchiveLogFileNameList(userName,userNameIp):
    print "wsgi: inside getUsersArchiveLogFileNameList"

    # validate API call as authentic and return if not
    userid = validateAPI()
    if userid is None:
        return flask.abort(403)

    if userName !='' and userNameIp != '':
        return json.dumps(cloudraxak.getArchiveLogFileNameList(userName, userNameIp))
    else:
        return flask.abort(404, 'Usage: /raxakapi/v1/getUsersArchiveLogFileNameList/<login>@<ip-address>')

#--- get rule status data of an user from Admin panel.
@app.route('/raxakapi/v1/showUsersRun/', defaults={'userName': '','ip': ''})
@app.route('/raxakapi/v1/showUsersRun/<userName>/<ip>')
def showUsersRun(userName,ip):
    # validate API call as authentic and return if not
    userid = validateAPI()
    if userid is None:
        return flask.abort(403)

    args = flask.request.args
    if userName !='' and ip != '':
        timestamp = ""

    if 'timestamp' in flask.request.args:
        timestamp = flask.request.args.get('timestamp')
    else:
        timestamp = ""

    return flask.Response(json.dumps(cloudraxak.showrun(userName, ip, timestamp)), mimetype='application/json')


########################### during merge
#	Usage: /raxakapi/v1/checkAccess?ip=<login>@<ip-address>&username=<username>
@app.route('/raxakapi/v1/checkAccess/')
def checkAccess():
    # get the IPs from the url if it was specified there.
    print ('wsgi: checkAccess')

    # validate API call as authentic and return if not
    userid = validateAPI()
    if userid is None:
        return flask.abort(403)

    qs_ip_list1 = flask.request.args.get('ip')
    qs_ip_list = qs_ip_list1.split(",")
    print ("wsgi: username = " + userid + "qs_ip_list = " + str(qs_ip_list))

    qs_username = userid

    return flask.Response(json.dumps(cloudraxak.checkAccess(qs_username, qs_ip_list, None)), mimetype='application/json')


#	Usage: /raxakapi/v1/showtitleofRule/rulenum
@app.route('/raxakapi/v1/showtitleofRule/', defaults={'rulenum': ''})
@app.route('/raxakapi/v1/showtitleofRule/<rulenum>')
def showtitleofRule(rulenum):
    print ('wsgi: showtitleofRule')

    # validate API call as authentic and return if not
    userid = validateAPI()
    if userid is None:
        return flask.abort(403)

    if rulenum != '':
        return cloudraxak.showtitleofRule(rulenum)
    else:
        return flask.abort(404, 'Usage: /raxakapi/v1/showtitleofRule/<rulenum>')


# Usage: /raxakapi/v1/getIPDetails/?ip=<login>@<ip-address>
@app.route('/raxakapi/v1/getIPDetails/')
def getIPDetails():
    print "wsgi: inside getIPDetails"

    # validate API call as authentic and return if not
    userid = validateAPI()
    if userid is None:
        return flask.abort(403)
    print ('passed userid test')
    ip = flask.request.args.get('ip')
    print('ip: ' + str(ip))
    if ip is not None:
        print('wsgi: getIPDetails: ip = ' + ip)
        ip_details_data = cloudraxak.getIPDetails(ip)
        print "wsgi: getIPDetails - " + str(ip_details_data)
        return flask.Response(json.dumps(ip_details_data), mimetype='application/text')
    else:
        return flask.abort(404, 'Usage: /raxakapi/v1/getIPDetails?ip=<login>@<ip-address>')


#	Usage: /raxakapi/v1/showExecutionStatus/?ip=<login>@<ip-address>
@app.route('/raxakapi/v1/showExecutionStatus/<ip>')
def showExecutionStatus(ip):
    '''This API shows the execution status  '''
    # get the name from the url if it was specified there.

    # validate API call as authentic and return if not
    try:
        userid = validateAPI()
        if userid is None:
            return flask.abort(403)
        if ip is not None:
            print ("wsgi: showExecutionStatus: ip = " + ip)
            return flask.Response(json.dumps(cloudraxak.showExecutionStatus(ip)), mimetype='application/text')
        else:
            return flask.abort(404, 'Usage: /raxakapi/v1/showExecutionStatus?ip=<login>@<ip-address>')
    except:
        print ("Error in showExecutionStatus for ip = " + ip)
        print (traceback.format_exc())
        return flask.abort(500)


# Usage: /raxakapi/v1/urlParamaterEncode
@app.route('/raxakapi/v1/urlParamaterEncode', methods=['GET', 'POST'])
def urlParamaterEncode():
    print "Inside urlParamaterEncode"
    import zlib
    # validate API call as authentic and return if not
    userid = validateAPI()
    if userid is None:
        return flask.abort(403)

    paramters = {}
    for i in flask.request.form:
        paramters[str(i)] = str(flask.request.form.get(i))

    # encode all paramters
    parameter_str = urllib.quote_plus(base64.b64encode(zlib.compress(json.dumps(paramters))))
    #    parameter_str1=  zlib.decompress(base64.b64decode(urllib.unquote_plus(parameter_str)))

    return flask.Response(parameter_str, mimetype='application/text')


# Usage: /raxakapi/v1/getReportHtml
@app.route('/raxakapi/v1/getReportHtml', methods=['POST'])
def getReportHtml():
    import zlib
    # validate API call as authentic and return if not
    userid = validateAPI()
    if userid is None:
        return flask.abort(403)
    reportData = request.form.get('reportData')
    if reportData is not None:
        parameter_str = zlib.decompress(base64.b64decode(urllib.unquote_plus(reportData)))
        parameter_dict = ast.literal_eval(parameter_str)  # str to dictionay conversion
        parameter_dict['userid'] = userid
        html = {}
        html['page_title'] = parameter_dict['page_title']
        html['parameters'] = parameter_dict

        # get html report content
        html['detailed_report'] = cloudraxak.getReportHtml(parameter_dict)

        return flask.Response(json.dumps(html), mimetype='application/json')
    else:
        return flask.abort(404, 'Usage: /raxakapi/v1/showExecutionStatus?ip=<login>@<ip-address>')



# Usage: /raxakapi/v1/getUsersReportHtml
# generate report from admin panel of selected user.
@app.route('/raxakapi/v1/getUsersReportHtml', methods=['POST'])
def getUsersReportHtml():
    import zlib
    # validate API call as authentic and return if not
    userid = validateAPI()
    if userid is None:
        return flask.abort(403)
    reportData = request.form.get('reportData')
    if reportData is not None:
        parameter_str = zlib.decompress(base64.b64decode(urllib.unquote_plus(reportData)))
        parameter_dict = ast.literal_eval(parameter_str)  # str to dictionay conversion
        html = {}
        html['page_title'] = parameter_dict['page_title']
        html['parameters'] = parameter_dict

        # get html report content
        html['detailed_report'] = cloudraxak.getReportHtml(parameter_dict)
        return flask.Response(json.dumps(html), mimetype='application/json')
    else:
        return flask.abort(404, 'Usage: /raxakapi/v1/showExecutionStatus?ip=<login>@<ip-address>')

@app.route('/raxakapi/v1/modifyIP', methods=['POST'])
def modifyIP():
    print "wsgi: inside ModifyIP"
    userid = validateAPI()
    if userid is None:
        return flask.abort(403)

    usernameIP = request.form.get('usernameIP')
    submitIP = request.form.get('submitIP')
    submitNickName = request.form.get('submitNickName')
    selectedNickName = request.form.get('selectedNickName')
    sshport = request.form.get('sshport')
    oldsshport = request.form.get('oldsshport')

    print "sshport == " + str(sshport)
    print "oldsshport == " + str(oldsshport)
   
    tunnelInfo = None
    try:
        tunnelInfo = {
            'tunnelusername' : request.form.get('tunnelusername', "N/A"),
            'tunnelpassword' : request.form.get('tunnelpassword', "N/A"),
            'tunnelip' : request.form.get('tunnelip', "N/A"),
        }
    except KeyError as e:
        #tunnel info not found in request means vm is public.
        print "keys not found"
        pass

    if submitIP is None or usernameIP is None:
        return flask.abort('404', "Usage: /raxakapi/v1/modifyIP")
    else:
        if submitNickName is None:
            submitNickName = usernameIP

        return flask.Response(json.dumps(cloudraxak.modifyIP(userid, usernameIP, submitIP, submitNickName, selectedNickName, sshport, oldsshport, tunnelInfo)),
                              mimetype='application/json')


@app.route('/raxakapi/v1/getConsoleLog', methods=['POST'])
def getConsoleLog():
    print "wsgi: inside getConsoleLog"
    userid = validateAPI()
    if userid is None:
        return flask.abort(403)

    usernameIP = request.form.get('userNameIP')
    securityRule = request.form.get('securityRule')
    timeStamp = request.form.get('timeStamp')
    if securityRule is None or usernameIP is None:
        return flask.abort('404', "Usage: /raxakapi/v1/modifyIP")
    else:
        return flask.Response(cloudraxak.getConsoleLog(userid, usernameIP, securityRule, timeStamp),
                              mimetype='application/text')


# Usage: /raxakapi/v1/ruleTitle/<profilename>
@app.route('/raxakapi/v1/ruleTitle/', defaults={'profile', ''})
@app.route('/raxakapi/v1/ruleTitle/<profile>')
def ruleTitle(profile):
    print "wsgi: inside ruleTitle"

    # validate API call as authentic and return if not
    userid = validateAPI()
    if userid is None:
        return flask.abort(403)

    if profile != '':
        print ("wsgi: ruleTitle: profile = " + profile)
        return flask.Response(json.dumps(cloudraxak.ruleTitle(profile)), mimetype='application/json')
    else:
        return flask.abort(404, 'Usage: /raxakapi/v1/ruleTitle')


# Usage: /raxakapi/v1/getlastrunIPs
@app.route('/raxakapi/v1/getlastrunIPs')
def getlastrunIPs():
    print "wsgi: inside getlastrunIPs"
    # get an IP from the url if it was specified there.

    # validate API call as authentic and return if not
    userid = validateAPI()
    if userid is None:
        return flask.abort(403)
    lastrun_ip = cloudraxak.getlastrunIPs(userid)
    return flask.Response(json.dumps(lastrun_ip), mimetype='application/json')


#	Usage: /raxakapi/v1/getRaxakPublicKey
@app.route('/raxakapi/v1/getRaxakPublicKey')
def getRaxakPublicKey():
    print("wsgi: inside getRaxakPublicKey")

    # validate API call as authentic and return if not
    userid = validateAPI()
    if userid is None:
        return flask.abort(403)

    return cloudraxak.getRaxakPublicKey()


#	Usage: /raxakapi/v1/getCronJobs
@app.route('/raxakapi/v1/getCronJobs')
def getCronJobs():
    print("wsgi: inside getCronJobs")

    # validate API call as authentic and return if not
    userid = validateAPI()
    if userid is None:
        return flask.abort(403)

    return flask.Response(json.dumps(cloudraxak.getCronJobs(userid)), mimetype="application/json")


@app.route('/raxakapi/v1/deleteCronJob', methods=['POST'])
def deleteCronJob():
    '''This API will delete the cron jobs associated with the username'''

    userid = validateAPI()
    if userid is None:
        return flask.abort(403)

    usernameIP = request.form.get('usernameIP')
    profilename = request.form.get('profilename')
    frequency = request.form.get('frequency')
    remediationmode = request.form.get('remediationmode')
    usernameIPlist = []
    usernameIPlist.append(usernameIP)

    if usernameIP and profilename and frequency:
        cloudraxak.deleteCronJob(userid, usernameIPlist, profilename, frequency, remediationmode)
        return flask.Response(json.dumps('cronjobs sucessfully deleted'), mimetype='application/json')
    else:
        return flask.abort(404, 'Usage: /raxakapi/v1/deleteCronJob')


##Usage: /raxakapi/v1/addMultipleTMs
# ... note, username is actually taken from the login authentication
@app.route('/raxakapi/v1/addMultipleIPs/', methods=['POST'])
def addMultipleIPs():
    print "wsgi: inside addMultipleIPs"

    # validate API call as authentic and return if not
    userid = validateAPI()
    if userid is None:
        return flask.abort(403)

    ipList = request.form.get('ipList')
    ipList = json.loads(ipList)
    FinalList = []

    for elem in ipList:
        try:
            username = None
            ip = None
            Nickname = None
            tunnelUsername = None
            tunnelPassword = None
            tunnelIP = None
            username = elem[0]
            ip = username + "@" + elem[1]  # Capturing IP Address
            if ip is None:
                continue

            print "====================================="
            print "username and IP address = " + str(ip)
            nickname = ip
            if len(elem) > 2:
                if elem[2] != "":
                    nickname = elem[2]

            print "nickname = " + str(nickname)
            sshport = "22"

            if len(elem) > 3 and len(elem) >= 6:
                tunnelUsername = elem[3]
                tunnelPassword = elem[4]
                tunnelIP = elem[5]
                print "VPN username = " + str(tunnelUsername)
                print "VPN password = " + str(tunnelPassword)
                print "Tunnel IP = " + str(tunnelIP)

            status = cloudraxak.addIP(userid, ip, nickname, sshport, tunnelUsername, tunnelPassword, tunnelIP)
            print "Status for ip {0}: {1}".format(nickname, status)
            FinalList.append(status)

        except Exception as e:
            print "Received an exception while adding entry (" + str(elem) + ") ==> " + str(e)

    successDict = {}
    successDict["SUCCESS"] = FinalList
    return flask.Response(json.dumps(successDict), mimetype="application/json")

#	Usage: /raxakapi/v1/abortExecution?ip="+ip
@app.route('/raxakapi/v1/abortExecution/')
def abortExecution():
    print "wsgi: inside abort execution"

    # validate API call as authentic and return if not
    userid = validateAPI()
    if userid is None:
        ip = myIP()
        print("Check IP = " + str(ip))
        # From cron scheduler
        if ip == "127.0.0.1":
            userid = flask.request.args.get('username')
            if userid is None:
                return flask.abort(403)
        else:
            return flask.abort(403)

    if 'ip' in flask.request.args:
        qs_ip_list1 = flask.request.args.get('ip')
        qs_ip_list = qs_ip_list1.split(",")
        print "wsgi: qs_ip_list = " + str(qs_ip_list)
    else:
        return flask.abort(404, 'Usage: IP address must be specified')

    if qs_ip_list:
        cloudraxak.abortExecution(qs_ip_list)
        return flask.Response("Aborted execution", mimetype='text/plain')
    else:
        return flask.abort(404, 'Usage: /raxakapi/v1/abortExecution?ip=<ip-list>')


#----------------- IBM Cloud/Softlayer integration ---------------------------


#---note: these imports should all be moved up to the top of the file eventually


consumerKey =  "raxak-protect-3877"
consumerSecret = "YF1y3DwKnJetHip3"


def byteify(input):
    if isinstance(input, dict):
        return {byteify(key):byteify(value) for key,value in input.iteritems()}
    elif isinstance(input, list):
        return [byteify(element) for element in input]
    elif isinstance(input, unicode):
        return input.encode('utf-8')
    else:
        return input

@app.route('/raxakapi/v1/ibmlogin')
def ibmLogin():
    # 2 parameters are passed in,
    # token (which is the same as the IBM accountIdentifier)
    # openid which defines the username
    # https://example.com/login/openid={openid}&token={accountIdentifier}

    print("wsgi: ibmlogin")
    token = str(flask.request.args.get("token"))
    openid = str(flask.request.args.get("openid"))
    print ('token = '+ token)
    print ('openid = '+ openid)

    # test token to see if it is valid

    cookie = cloudraxak.getaccount( token )
    if cookie is None:
        print ("Invalid accountIdentifier token")
        return flask.abort(401)

    tok = eatCookie( cookie )


    print ('user token - ' + str(tok))
    if tok is None:
        return flask.abort(401)

    # extract user uuid from openid validation

    if tok['user'] not in openid:
        print(tok['user'] + ' not in openid ' + openid)
        return flask.abort(401)

    # everything matches


    # set token as a cookie and redirect to index.html
    url = 'https://softlayer.cloudraxak.net/index.html'
    print ("*** " + url)
    resp = flask.make_response(flask.redirect(url))
    resp.set_cookie('usertoken', cookie)
    return resp

# Marketplace requires the following APIs to be suported
#	create
#	cancel
#	change
#	status
#	assign
#	unassign
@app.route('/raxakapi/v1/ibmcloud-assign')
def ibmcloudAssign():
    successmsg = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<result>
    <success>true</success>
    <message>%s</message>
</result>
'''
    errormsg = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<result>
    <success>false</success>
    <message>%s</message>
    <errorCode>%s</errorCode>
</result>
'''
    print ("wsgi: ibmcloudAssign")
    url = str(flask.request.args.get("url"))
    print ("ibmcloudAssign  url parameter = " + str(url))

    consumer = oauth.Consumer(consumerKey, consumerSecret)
    client = oauth.Client(consumer)
    try:
        resp, content  = client.request( url )
    except Exception as e:
        print ("Error in accessing validation url = " + url)
        print ("Exception condition: " + str(e))
        rXML = errormsg % (url, 'ERROR_CODE')
        print (rXML)
        return flask.Response(rXML, mimetype='text/xml')


    if (resp['status'] == '200'):
        subs = xmltodict.parse(str(content))
    # convert subs from a OrderedDict to Dict; convert from unicode
    # to regular byte strings

        subs = byteify( json.loads( json.dumps( subs )))
        print (str(subs))

        event = subs['event']
        if event['type'] != 'USER_ASSIGNMENT':
            print("Wrong event type: Expecting USER_ASSIGNMENT, got " + str(event['type']))
            return flask.abort(403)

        # Identify the admin making the changes

        admin = event['creator']['firstName'] + ' ' + event['creator']['lastName']
        print('Change authorized by ' + admin)

        # Identify the new user being added

        user = event['payload']['user']
        email = user['email']
        account = event['payload']['account']['accountIdentifier']
        token = {}
        token['login'] = "IBM"
        token['ip'] = "0.0.0.0"
        token['user'] = user['uuid']
        token['email'] = user['email']
        print ('Registering user: ' + user['firstName'] + ' ' + user['lastName'])

        enr = cloudraxak.enroll( token['user'], token )
        # for IBM Marketplace, enr should return 'OK', otherwise something went wrong
        if enr is 'OK' :
            print('wsgi: enroll returns OK')
        # create a token which will become part of the activation record,
            cookie = makeCookie (token)

            cloudraxak.storeaccount(account, cookie)	#stores encoded -> cookie

            rXML = successmsg%("Assignment successful")
            return flask.Response(rXML, mimetype='text/xml')
        else:
            rXML = errormsg%("Cannot create new user " + user['firstName'] + ' ' + user['lastName'], \
                'UNAUTHORIZED')
            return flask.Response(rXML, mimetype='text/html')
    else:
        print ("ibmCloudAssign signature checking error " + str(resp))
        rXML = errormsg%('Assign signature error', \
                'INVALID_RESPONSE')
        return flask.Response(rXML, mimetype='text/xml')

    return


@app.route('/raxakapi/v1/ibmcloud-unassign')
def ibmcloudUnAssign():
    successmsg = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<result>
    <success>true</success>
    <message>%s</message>
</result>
'''
    errormsg = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<result>
    <success>false</success>
    <message>%s</message>
    <errorCode>%s</errorCode>
</result>
'''
    print ("wsgi: ibmcloudUnAssign")
    url = str(flask.request.args.get("url"))
    print ("ibmcloudUnAssign  url parameter = " + str(url))

    consumer = oauth.Consumer(consumerKey, consumerSecret)
    client = oauth.Client(consumer)
    try:
        resp, content  = client.request( url )
    except Exception as e:
        print ("Error in accessing validation url = " + url)
        print ("Exception condition: " + str(e))
        rXML = errormsg % (url, 'ERROR_CODE')
        print (rXML)
        return flask.Response(rXML, mimetype='text/xml')


    if (resp['status'] == '200'):
        subs = xmltodict.parse(str(content))
    # convert subs from a OrderedDict to Dict; convert from unicode
    # to regular byte strings

        subs = byteify( json.loads( json.dumps( subs )))
        print (str(subs))

        event = subs['event']
        if event['type'] != 'USER_UNASSIGNMENT':
            print("Wrong event type: Expecting USER_UNASSIGNMENT, got " + str(event['type']))
            return flask.abort(403)

        # Check whether the user being unassigned is currently unassigned
        # Now we are assuming that the marketplace has done this check.

        account = event['payload']['account']['accountIdentifier']
        cloudraxak.storeaccount(account, '')

        rXML = successmsg%('Unassignment successful')
        print (rXML)
        return flask.Response(rXML, mimetype='text/xml')
    else:
        print ("ibmCloudUnAssign signature checking error " + str(resp))
        rXML = errormsg%('Assign signature error', \
                'INVALID_RESPONSE')
        return flask.Response(rXML, mimetype='text/xml')

    return


@app.route('/raxakapi/v1/ibmcloud-change')
def ibmcloudChange():
    errormsg = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<result>
    <success>false</success>
    <message>%s</message>
    <errorCode>%s</errorCode>
</result>
'''
    print ("wsgi: ibmcloudChange")
    url = str(flask.request.args.get("url"))
    print ("ibmcloudCreate  url parameter = " + str(url))

    consumer = oauth.Consumer(consumerKey, consumerSecret)
    client = oauth.Client(consumer)
    try:
        resp, content  = client.request( url )
    except Exception as e:
        print ("Error in accessing validation url = " + url)
        print ("Exception condition: " + str(e))
        rXML = errormsg % (url, 'ERROR_CODE')
        print (rXML)
        return flask.Response(rXML, mimetype='text/xml')


    if (resp['status'] == '200'):
        subs = xmltodict.parse(str(content))
    # convert subs from a OrderedDict to Dict; convert from unicode
    # to regular byte strings

        subs = byteify( json.loads( json.dumps( subs )))
        print (str(subs))

        event = subs['event']
        if event['type'] != 'SUBSCRIPTION_CHANGE':
            print("Wrong event type: Expecting SUBSCRIPTION_CHANGE, got " + str(event['type']))
            return flask.abort(403)

        creator = event['creator']
        email = creator['email']

        payload = event['payload']
        account = payload['account']['accountIdentifier']

        # check if the account info matches the user who is attempting to make the change

        cookie = cloudraxak.getaccount( account )
        if cookie is None:
            print ("Invalid accountIdentifier token: " + account)
            return flask.abort(401)

        tok = eatCookie( cookie )

        if tok['user'] != creator['uuid']:
            print('Account user: ' + tok['user'] + ' does not match uuid ' + creator['uuid'])
            rXML = errormsg % \
                ('Userid does not match account owner', 'UNAUTHORIZED')
            print (rXML)
            return flask.Response(rXML, mimetype='text/xml')


        # check if the proper version is specified in the change request

        if payload['order']['editionCode'] != 'UNLIM':
            print('Unknown editionCode ' + payload['order']['editionCode'])
            rXML = errormsg % \
                ('Unknown editionCode ' + payload['order']['editionCode'], \
                'UNAUTHORIZED')
            print (rXML)
            return flask.Response(rXML, mimetype='text/xml')

        # update the user to have unlimited usage Rights

        cloudraxak.activateUser(tok['email'], 0)	# 0 => activate for ever


        rXML = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <result>
    <success>true</success>
    <message>Account change successful for user: '''
        rXML += creator['firstName'] + ' ' + creator['lastName'] + '''
    </message>
    </result>'''
        print (rXML)
        return flask.Response(rXML, mimetype='text/xml')

    else:
        print ("ibmCloudCreate signature checking error " + str(resp))
        rXML = errormsg%('Create error '+'INVALID_RESPONSE')
        return flask.Response(rXML, mimetype='text/xml')

    return


@app.route('/raxakapi/v1/ibmcloud-status')
def ibmcloudStatus():
    errormsg = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<result>
    <success>false</success>
    <message>%s</message>
    <errorCode>%s</errorCode>
</result>
'''
    print ("wsgi: ibmcloudStatus")
    url = str(flask.request.args.get("url"))
    print ("ibmcloudStatus  url parameter = " + str(url))

    consumer = oauth.Consumer(consumerKey, consumerSecret)
    client = oauth.Client(consumer)
    try:
        resp, content  = client.request( url )
    except Exception as e:
        print ("Error in accessing validation url = " + url)
        print ("Exception condition: " + str(e))
        rXML = errormsg % (url, 'ERROR_CODE')
        print (rXML)
        return flask.Response(rXML, mimetype='text/xml')


    if (resp['status'] == '200'):
        subs = xmltodict.parse(str(content))
    # convert subs from a OrderedDict to Dict; convert from unicode
    # to regular byte strings

        subs = byteify( json.loads( json.dumps( subs )))
        print (str(subs))

        event = subs['event']
        if event['type'] != 'SUBSCRIPTION_NOTICE':
            print("Wrong event type: Expecting SUBSCRIPTION_NOTICE, got " + str(event['type']))
            return flask.abort(403)

        payload = event['payload']
        account = payload['account']['accountIdentifier']
        notice = payload['notice']['type']

        cookie = cloudraxak.getaccount( account )
        if cookie is None:
            print ("Invalid accountIdentifier token: " + account)
            return flask.abort(401)

        tok = eatCookie( cookie )

        if notice == 'DEACTIVATED':
            # can only happen to a paid subscription, not FREE
            cloudraxak.activateUser(tok['email'], -1)

        elif notice == 'CLOSED':
            # same action as ibmcloudCancel
            cloudraxak.activateUser(token['email'], -1)

        elif notice == 'REACTIVATED':
            # same action as ibcloudChange (to unlimited subscription)
            cloudraxak.activateUser(tok['email'], 0)

        elif notice == 'UPCOMING_INVOICE':
            pass
        else:
            rXML = errormsg % ('Illegal notice code: '+ notice, 'UNAUTHORIZED')
            print (rXML)
            return flask.Response(rXML, mimetype='text/xml')

        rXML = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <result>
    <success>true</success>
    </result>'''
        print (rXML)
        return flask.Response(rXML, mimetype='text/xml')

    else:
        print ("ibmCloudStatus signature checking error " + str(resp))
        rXML = errormsg%('Subscription notice error', \
                'INVALID_RESPONSE')
        return flask.Response(rXML, mimetype='text/xml')

    return

@app.route('/raxakapi/v1/ibmcloud-create', methods=['GET', 'POST'])
def ibmcloudCreate():

    errormsg = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<result>
    <success>false</success>
    <message>Account creation faled for : %s
    </message>
    <errorCode>%s</errorCode>
</result>
'''
    print ("wsgi: ibmcloudCreate")
    url = str(flask.request.args.get("url"))
    print ("ibmcloudCreate  url parameter = " + str(url))

    consumer = oauth.Consumer(consumerKey, consumerSecret)
    client = oauth.Client(consumer)
    try:
        resp, content  = client.request( url )
    except Exception as e:
        print ("Error in accessing validation url = " + url)
        print ("Exception condition: " + str(e))
        rXML = errormsg % (url, 'ERROR_CODE')
        print (rXML)
        return flask.Response(rXML, mimetype='text/xml')


    if (resp['status'] == '200'):
        subs = xmltodict.parse(str(content))
    # convert subs from a OrderedDict to Dict; convert from unicode
    # to regular byte strings

        subs = byteify( json.loads( json.dumps( subs )))
        print (str(subs))

        event = subs['event']
        if event['type'] != 'SUBSCRIPTION_ORDER':
            print("Wrong event type: Expecting SUBSCRIPTION_ORDER, got " + str(event['type']))
            return flask.abort(403)

        creator = event['creator']
        email = creator['email']
        payload = event['payload']
        token = {}
        token['login'] = "IBM"
        token['ip'] = "0.0.0.0"
        token['user'] = creator['uuid']
        token['email'] = creator['email']
        print ('Registering user: ' + creator['firstName'] + ' ' + creator['lastName'])

        enr = cloudraxak.enroll( token['user'], token )
        # for IBM Marketplace, enr should return 'OK', otherwise something went wrong
        if enr is 'OK' :
            print('wsgi: enroll returns OK')
        # check the version being subscribed
            editionCode = payload['order']['editionCode']
            if editionCode == 'UNLIM':
                print('UNLIM')
                activation = cloudraxak.activateUser(token['email'], 0)
            elif editionCode == 'FREE':
                print('FREE')
                activation = cloudraxak.activateUser(token['email'], 1)
            else:
                print('Unknown editionCode ' + editionCode)
                rXML = errormsg % \
                    ('Unknown editionCode ' + editionCode, \
                    'UNAUTHORIZED')
                print (rXML)
                return flask.Response(rXML, mimetype='text/xml')

        # set time to be a month
            if activation:
                print('Activated')
        # create a token which will become part of the activation record,
                cookie = makeCookie (token)
                try:
                    encoded = hashlib.sha256(cookie).hexdigest()[:36]
                except Exception as e:
                    print (str(e))
                cloudraxak.storeaccount(encoded, cookie)	#stores encoded -> cookie

                print ('accountIdentifier = ' + encoded)

                # encoded = 'a05aac3e-ef76-47ef-9a3e-7697cb76e679' # for testing
                rXML = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <result>
    <success>true</success>
    <message>Account creation successful for user: '''
                rXML += creator['firstName'] + ' ' + creator['lastName'] + '''
    </message>
    <accountIdentifier>'''
                rXML += encoded + '''
    </accountIdentifier>
    </result>'''
                print (rXML)
                return flask.Response(rXML, mimetype='text/xml')
            else:
                print('Activation error')
                rXML = errormsg % \
                    (creator['firstName'] + ' ' + creator['lastName'], \
                    'Error from cloudraxak.activateuser ' + str(enr))
                print (rXML)
                return flask.Response(rXML, mimetype='text/xml')



        else:
            print('wsgi: enroll returns ' + enr)
            rXML = errormsg % \
                (creator['firstName'] + ' ' + creator['lastName'], \
                'cloudraxak.enroll returns ' + str(enr))
            print (rXML)
            return flask.Response(rXML, mimetype='text/xml')

    else:
        print ("ibmCloudCreate signature checking error " + str(resp))
        rXML = errormsg%('Signature error' + 'INVALID_RESPONSE')
        return flask.Response(rXML, mimetype='text/xml')

    return

@app.route('/raxakapi/v1/ibmcloud-cancel', methods=['GET', 'POST'])
def ibmcloudCancel():

    errormsg = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <result>
        <success>false</success>
        <message>%s
        </message>
        <errorCode>%s</errorCode>
    </result>
    '''
    print ("wsgi: ibmcloudCancel")
    url = str(flask.request.args.get("url"))
    print ("ibmcloudCancel  url parameter = " + str(url))

    consumer = oauth.Consumer(consumerKey, consumerSecret)
    client = oauth.Client(consumer)
    try:
        resp, content  = client.request( url )
    except Exception as e:
        print ("Error in accessing validation url = " + url)
        print ("Exception condition: " + str(e))
        rXML = errormsg % ('Invalid eventURL '+url, 'INVALID_RESPONSE')

        print (rXML)
        return flask.Response(rXML, mimetype='text/xml')


    if (resp['status'] == '200'):
        subs = xmltodict.parse(str(content))
    # convert subs from a OrderedDict to Dict; convert from unicode
    # to regular byte strings

        subs = byteify( json.loads( json.dumps( subs )))
        print (str(subs))

        event = subs['event']
        if event['type'] != 'SUBSCRIPTION_CANCEL':
            print("Wrong event type: Expecting SUBSCRIPTION_CANCEL, got " + str(event['type']))
            return flask.abort(403)

        creator = event['creator']
        email = creator['email']
        account = event['payload']['account']['accountIdentifier']

        print ('Cancelling account = ' + str(account))

        # Sanity check if the account exists

        # convert account to token
        cookie = cloudraxak.getaccount( account )
        if cookie is None:
            print ("accountIdentifier not found in database")
            rXML = errormsg % ('Account Identifier ' + account + ' not in database', \
                    'USER_NOT_FOUND')
            print (rXML)
            return flask.Response(rXML, mimetype='text/xml')

        # validate that userid in token matches uuid in the creator field

        token = eatCookie (cookie)
        if token is None:
            print ("Invalid token")
            rXML = errormsg % ('Invalid token', 'USER_NOT_FOUND')
            print (rXML)
            return flask.Response(rXML, mimetype='text/xml')
        # delete account (set account to expired)
        cloudraxak.activateUser(token['email'], -1)
        # NEED TO DO SOMETHING HERE OTHER THAN JUST INVALIDATE account

        rXML = '''<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<result>
<success>true</success>
<message>Account cancelled for user: '''
        rXML += creator['firstName'] + ' ' + creator['lastName'] + '''
</message>
</result>'''
        print (rXML)
        return flask.Response(rXML, mimetype='text/xml')
    else:
        rXML = errormsg % ('Invalid status code ' + str(resp['status']), 'INVALID_RESPONSE')
        print (rXML)
        return flask.Response(rXML, mimetype='text/xml')


    return


@app.route('/raxakapi/v1/redisManage/', defaults={'verbose': 'True', 'prompt': 'False', 'html': 'True'})
@app.route('/raxakapi/v1/redisManage/<verbose>/<prompt>/<html>')
def redisManage(verbose, prompt, html):
    print ("in wsgi: redisManage: " + str(verbose) + " / " + str(prompt) + " / " + str(html))
    v = False
    p = False
    h = False
    if verbose == 'True': v = True
    if prompt == 'True': p = True
    if html == 'True': h = True
    try:
        string = management.redisManagement( v, p, h )
        print (string)
        return flask.Response(string, mimetype='text/html')
    except Exception as e:
        print (traceback.format_exc())
        print ("Error in redisManage " + str(e))
        return flask.abor(500)


#	User registration and send account activation mail

@app.route('/raxakapi/v1/register/',methods=['GET', 'POST'])
def register():
    print "wsgi: inside register user"
    firstname = str(request.form.get('firstname'))
    lastname = str(request.form.get('lastname'))
    receivers = str(request.form.get('email'))
    phone = str(request.form.get('phone'))
    company = str(request.form.get('company'))
    country = str(request.form.get('country'))
    password = str(request.form.get('password'))
    password = hashlib.md5(password).hexdigest()
    #confirm_password = str(request.form.get('confirm_password'))
    status = cloudraxak.send_mail(receivers,firstname,lastname,phone,company,country,password)
    return flask.Response(json.dumps(status), mimetype="application/json")


@app.route('/raxakapi/v1/addUser/',methods=['GET', 'POST'])
def addUser():
    print "wsgi: inside register user"
    if validateAPI() and is_admin():
        firstname = str(request.form.get('firstname'))
        lastname = str(request.form.get('lastname'))
        receivers = str(request.form.get('email'))
        phone = str(request.form.get('phone'))
        company = str(request.form.get('company'))
        country = str(request.form.get('country'))
        password = str(request.form.get('password'))
        password = hashlib.md5(password).hexdigest()
        #confirm_password = str(request.form.get('confirm_password'))
        status = cloudraxak.send_mail(receivers,firstname,lastname,phone,company,country)
        return flask.Response(json.dumps(status), mimetype="application/json")
    else:
        return flask.abort(401, "You are not authorized to access this resource.")

@app.route('/raxakapi/v1/get_Summary_ComparisionReport/' ,methods=['GET', 'POST']) 
def get_Summary_ComparisionReport():
    import zlib
    userid = validateAPI()
    if userid is None:
        return flask.abort(403)
    reportData = str(request.form.get('reportData'))
    if reportData is not None:
        parameter_str = zlib.decompress(base64.b64decode(urllib.unquote_plus(reportData)))
        parameter_dict = json.loads(parameter_str)
        parameter_dict['userid'] = userid
        html = {}
        html['page_title'] = parameter_dict['page_title']
        html['parameters'] = parameter_dict
        status = cloudraxak.get_Summary_ComparisionReport(parameter_dict)
        return flask.Response(json.dumps(status), mimetype='application/json')


@app.route('/raxakapi/v1/usersSummaryComparisionReport/' ,methods=['GET', 'POST'])
def usersSummaryComparisionReport():
    import zlib
    userid = validateAPI()
    if userid is None:
        return flask.abort(403)
    reportData = str(request.form.get('reportData'))
    if reportData is not None:
        parameter_str = zlib.decompress(base64.b64decode(urllib.unquote_plus(reportData)))
        parameter_dict = json.loads(parameter_str)
        #selectedUser = str(parameter_dict['userName'])
        #parameter_dict['userid'] = userid
        html = {}
        html['page_title'] = parameter_dict['page_title']
        html['parameters'] = parameter_dict
        status = cloudraxak.get_Summary_ComparisionReport(parameter_dict)
        return flask.Response(json.dumps(status), mimetype='application/json')



# activate user account and update the key activation from 0 to 1.
@app.route('/raxakapi/v1/activate/',methods=['POST'])
def activate():
    email = str(request.form.get('email'))
    hash_string = str(request.form.get('hash'))
    status = cloudraxak.activate(email,hash_string)
    return flask.Response(json.dumps(status), mimetype="application/json")

# check user email id is exist.
@app.route('/raxakapi/v1/getemailexist/',methods=['POST'])
def getemailexist():
    print "wsgi: inside user getemailexist"
    email = str(request.form.get('email'))
    status = cloudraxak.getemailexist(email)
    return flask.Response(json.dumps(status), mimetype="application/json")




@app.route('/raxakapi/v1/Get_User_Info/')
def Get_User_Info():
    if validateAPI() and is_admin():
        get_user_info = cloudraxak.Get_User_Info()
        status = flask.Response(json.dumps(get_user_info), mimetype="application/json")
    else:
        status = flask.abort(401, "You are not authorized to access this resource.")
    return status

# Call API to delete user form user list
#	Usage: /raxakapi/v1/deleteIP?emailid=<emailid>
@app.route('/raxakapi/v1/deleteUser/')
def deleteUser():
    if validateAPI() and is_admin():
        email = flask.request.args.get('email')
        if email is None:
            return flask.abort(404, "Usage /raxakapi/v1/deleteUser?email=<email>")
        result = cloudraxak.deleteUser(email)
        # ASG - TODO Incase of an error, need to report with exact error message as a reply to this API
        return flask.Response(json.dumps(result), mimetype='application/json')
    else:
        return flask.abort(401, "You are not authorized to access this resource.")

# Block user account and update the key blocked from 0 to 1.
@app.route('/raxakapi/v1/blockUser/',methods=['POST'])
def blockUser():
    if validateAPI() and is_admin():
        email = str(request.form.get('email'))
        print "wsgi: inside block User "+email
        result = cloudraxak.blockUser(email)
        return flask.Response(json.dumps(result), mimetype="application/json")
    else:
        return flask.abort(401, "You are not authorized to access this resource.")


@app.route('/raxakapi/v1/addMotd/',methods=['GET', 'POST'])
def addMotd():
    print "wsgi: inside addMotd user"
    if validateAPI() and is_admin():
        data_id = str(request.form.get('id'))
        title = str(request.form.get('Title'))
        from_date = str(request.form.get('Date_from'))
        to_date = str(request.form.get('Date_to'))
        description = str(request.form.get('Description'))
        return flask.Response(cloudraxak.addMotd(data_id,title,from_date,to_date,description),
                                  mimetype='application/text')
    else:
        return flask.abort(401, "You are not authorized to access this resource.")

@app.route('/raxakapi/v1/getMotds/', methods=['GET', 'POST'])
def getMotds():
    print "wsgi: inside getMotds"
    clientCurrentDate = str(request.form.get('date'))
    if clientCurrentDate != None:	
    	motds = cloudraxak.getMotds(clientCurrentDate)
    else:
    	motds = cloudraxak.getMotds()
		
    return flask.Response(json.dumps(motds), mimetype="application/json")

@app.route('/raxakapi/v1/deleteMotd/',methods=['GET', 'POST'] )
def deleteMotd():
    print "wsgi: inside deleteMotd"
    if validateAPI() and is_admin():
        row_id = str(request.form.get('rowid'))
        return flask.Response(cloudraxak.deleteMotd(row_id),
                                  mimetype='application/text')
    else:
        return flask.abort(401, "You are not authorized to access this resource.")

@app.route('/raxakapi/v1/modifyMotd/', methods=['GET','POST'])
def modifyMotd():
    print "wsgi: inside modifyMotd."
    if validateAPI() and is_admin():
        row_id = request.form.get('id')
        title = request.form.get('title')
        date_from = request.form.get('date_from')
        date_to = request.form.get('date_to')
        description = request.form.get('description')
        return flask.Response(cloudraxak.modifyMotd(row_id,title,date_from,date_to,description),
        		mimetype='application/text')
    else:
        return flask.abort(401, "You are not authorized to access this resource.")

# modify user account and update the details.
@app.route('/raxakapi/v1/modifyUser/',methods=['POST'])
def modifyUser():
    print "wsgi: inside modify User"
    if validateAPI() and is_admin():
        firstname = str(request.form.get('firstname'))
        lastname = str(request.form.get('lastname'))
        email = str(request.form.get('email'))
        phone = str(request.form.get('phone'))
        company = str(request.form.get('company'))
        country = str(request.form.get('country'))
        blocked = ''#sstr(request.form.get('blocked'))
        status = cloudraxak.modifyUser(firstname,lastname,email,phone,company,country,blocked)
        return flask.Response(json.dumps(status), mimetype="application/json")
    else:
        return flask.abort(401, "You are not authorized to access this resource.")

# change user password and update.
@app.route('/raxakapi/v1/changePassword/',methods=['POST'])
def changePassword():
    print "wsgi: inside change Password"
    email = str(request.form.get('email'))
    hashString = str(request.form.get('hash'))
    password = str(request.form.get('password'))
    password = hashlib.md5(password).hexdigest()
    result = cloudraxak.changePassword(email,hashString,password)
    return flask.Response(json.dumps(result), mimetype="application/json")




# forgot password and update.
@app.route('/raxakapi/v1/forgotPassword/',methods=['POST'])
def forgotPassword():
    print "wsgi: inside forgot Password"
    email = str(request.form.get('email'))
    result = cloudraxak.forgotPassword(email)
    return flask.Response(json.dumps(result), mimetype="application/json")

#Sigin API
@app.route('/raxakapi/v1/Signin/',methods=['POST'])
def Signin():
    print "wsgi: signin function"
    email = str(request.form.get('email'))
    password = str(request.form.get('password'))
    status = cloudraxak.Signin(email,password)
    print "Sign in status: " + str(status)

    if str(status['status']) == "True":
        ip = myIP()
        token = {}
        token['login'] = "Local Auth"
        token['ip'] = ip
        token['user'] = email
        token['firstname'] = status["firstname"]
        token['email'] = email
        token['platform'] = str(request.form.get('platform'))
        token['browser'] = str(request.form.get('browser'))
        token['timezone'] = str(request.form.get('timezone'))
        token['datetime'] = str(request.form.get('datetime'))

        code = cloudraxak.enroll(email, token)
        if code == 'OK':
            try:
                # create a user token and return it
                encoded = makeCookie (token)
                status["usertoken"] = str(encoded)
            except Exception as e:
                print("exception while making cookies: " + str(e))
        #ASG else loop missing - need RND and has to be handled in case of code not OK

    return flask.Response(json.dumps(status), mimetype="application/json")


#       Created for admin user
#       Usage: /raxakapi/v1/deleteIP?username=<username>&ip=<login>@<ip-address>
@app.route('/raxakapi/v1/getUserIPs/<username>')
def getUserIPs(username):
    print "wsgi: inside getUserIPs"
    if validateAPI() and is_admin():
        if username != '':
            ips = cloudraxak.getIPs(username)
            try:
                print ("wsgi: ips = " + str(ips) + str(type(ips)))
            except Exception as e:
                print ("wsgi print exception " + str(e))
            return flask.Response(json.dumps(ips), mimetype="application/json")
        else:
            return flask.abort(404, "Usage: /raxakapi/v1/getUserIPs/<username>")
    else:
        return flask.abort(401, "You are not authorized to access this resource.")



#       Created for admin user
#       Usage: /raxakapi/v1/deleteIP?username=<username>&ip=<login>@<ip-address>
@app.route('/raxakapi/v1/deleteUserIP')
@app.route('/raxakapi/v1/deleteUserIP/')
def deleteUserIP():
    print "wsgi: inside deleteUserIP"

    if validateAPI() and is_admin():
        username = flask.request.args.get('username')
        ip = flask.request.args.get('ip')

        if username is None or ip is None:
            return flask.abort(404, "Usage /raxakapi/v1/deleteIP?ip=<username>@<ip-address>")

        qs_ip_list = ip.split(",")

        deleted = cloudraxak.deleteUsernameIP(username, qs_ip_list)
        if deleted:
            cloudraxak.deleteLastrun(username, qs_ip_list)
            cloudraxak.deleteCronJob(username,qs_ip_list)

        # ASG - TODO Incase of an error, need to report with exact error message as a reply to this API
        return flask.Response(json.dumps('sucessfully deleted'), mimetype='application/json')
    else:
        return flask.abort(401, "You are not authorized to access this resource.")

# Create the group of ips
@app.route('/raxakapi/v1/createGroup/',methods=['POST'])
def createGroup():

    # validate API call as authentic and return if not
    userid = validateAPI()
    if userid is None:
        return flask.abort(403)
    #ip = str(flask.request.args.get('ips'))
    #groupname = flask.request.args.get('groupname')
    ips = str(request.form.get('ips'))
    groupname = str(request.form.get('groupname'))
    description = str(request.form.get('description'))
    if ips is None:
        return flask.abort(404, \
                      "Usage /raxakapi/v1/createGroup?ips=<username>@<ip-address>&groupname=<groupname>")

    get_group_info = cloudraxak.createGroup(userid, ips, groupname,description)
    status = flask.Response(json.dumps(get_group_info), mimetype="application/json")
    return status

# modify the group of details
@app.route('/raxakapi/v1/modifyGroup/',methods=['POST'])
def modifyGroup():

    # validate API call as authentic and return if not
    userid = validateAPI()
    if userid is None:
        return flask.abort(403)
    #ip = str(flask.request.args.get('ips'))
    #groupname = flask.request.args.get('groupname')
    ips = str(request.form.get('ips'))
    groupname = str(request.form.get('groupname'))
    currentgroupname = str(request.form.get('currentgroupname'))
    description = str(request.form.get('description'))

    if ips is None:
        return flask.abort(404, \
                      "Usage /raxakapi/v1/modifyGroup?ips=<username>@<ip-address>&groupname=<groupname>")

    get_group_info = cloudraxak.modifyGroup(userid, groupname,currentgroupname,ips ,description)
    status = flask.Response(json.dumps(get_group_info), mimetype="application/json")
    return status

#Get the group of ips
@app.route('/raxakapi/v1/getGroups/',methods=['POST'])
def getGroups():
    print "wsgi: inside getGroups"

    # validate API call as authentic and return if not
    userid = validateAPI()
    if userid is None:
        return flask.abort(403)

    group = cloudraxak.getGroups(userid)
    return flask.Response(json.dumps(group), mimetype="application/json")

# Delete Group
@app.route('/raxakapi/v1/deleteGroup/',methods=['POST'])
def deleteGroup():
    print "wsgi: inside deleteGroup"

    # validate API call as authentic and return if not
    userid = validateAPI()
    if userid is None:
        return flask.abort(403)

    #group = flask.request.args.get('groupname')
    group = str(request.form.get('groupname'))
    if group is None:
        return flask.abort(404, "Usage /raxakapi/v1/deleteGroup?username=<userid>&groupname=<groupname>")
    result = cloudraxak.deleteGroup(userid, group)
    return flask.Response(json.dumps(result), mimetype='application/json')

# get user list to show in servers page dropdown.
@app.route('/raxakapi/v1/getUsers/')
def getUsers():
    if validateAPI() and is_admin():
        result = cloudraxak.getUsers()
        result = flask.Response(json.dumps(result), mimetype="application/json")
        return result
    else:
        return flask.abort(401, "You are not authorized to access this resource.")

@app.route('/raxakapi/v1/adminPrivilege/',methods=['POST'])
def adminPrivilege():
    email = str(request.form.get('email'))
    admin = str(request.form.get('admin'))
    print "wsgi: inside user block User "+email
    result = cloudraxak.adminPrivilege(email, admin)
    return flask.Response(json.dumps(result), mimetype="application/json")



#Admin Sigin API
@app.route('/raxakapi/v1/adminSignin/',methods=['POST'])
def adminSignin():
    email = str(request.form.get('email'))
    password = str(request.form.get('password'))
    status = cloudraxak.adminSignin(email,password)
    print "Sign in status: " + str(status)

    if str(status['status']) == "True":
        ip = myIP()
        token = {}
        token['login'] = "Local Auth"
        token['ip'] = ip
        token['user'] = email
        token['email'] = email
        token['platform'] = str(request.form.get('platform'))
        token['browser'] = str(request.form.get('browser'))
        token['timezone'] = str(request.form.get('timezone'))
        token['datetime'] = str(request.form.get('datetime'))

        code = cloudraxak.enroll(email, token)
        if code == 'OK':
            try:
                # create a user token and return it
                encoded = makeCookie (token)
                status["usertoken"] = str(encoded)
            except Exception as e:
                print("exception while making cookies: " + str(e))
        #ASG else loop missing - need RND and has to be handled in case of code not OK

    return flask.Response(json.dumps(status), mimetype="application/json")


@app.route('/raxakapi/v1/adminReview/',methods=['POST'])
def adminReview():
    print "wsgi: inside user activation"
    email = str(request.form.get('emailid'))
    blocked = request.form.get('blocked')
    period = request.form.get('period')
    status = cloudraxak.adminReview(email,blocked,period)
    return flask.Response(json.dumps(status), mimetype="application/json")


#       Created for admin user
#       Usage: /raxakapi/v1/deleteIP?username=<username>&ip=<login>@<ip-address>

#    Set and change the access trial period
@app.route('/raxakapi/v1/setAccessPeriod/',methods=['POST'])
def setAccessPeriod():
    if validateAPI() and is_admin():
        emailid = str(request.form.get('emailid'))
        period = request.form.get('period')
        #print "wsgi: setAccessPeriod =========================== "+emailid
        result = cloudraxak.setAccessPeriod(emailid,period)
        return flask.Response(json.dumps(result), mimetype="application/json")
    else:
        return flask.abort(401, "You are not authorized to access this resource.")
#   To show last login details

@app.route('/raxakapi/v1/CreateTicket/', methods=['POST'])
def CreateTicket():
    userid = validateAPI()
    if userid is None:
        return flask.abort(403)
    issue = str(flask.request.form.get('issueid'))
    title = str(flask.request.form.get('titleid'))
    vmname = str(flask.request.form.get('vmid'))
    description = str(flask.request.form.get('descid'))
    status = cloudraxak.CreateTicket(userid,issue,title,vmname,description)
    return flask.Response(json.dumps(status), mimetype="application/json")

@app.route('/raxakapi/v1/feedback/', methods=['POST'])
def feedback():
    userid = validateAPI()
    if userid is None:
        return flask.abort(403)
    feedback = str(flask.request.form.get('feedback'))
    status = cloudraxak.feedbackSent(userid,feedback)
    return flask.Response(json.dumps(status), mimetype="application/json")

#GetUserDetails
@app.route('/raxakapi/v1/getUserDetails/', methods=['GET'])
def getUserDetails():
    userid = validateAPI()
    if userid is None:
        return flask.abort(403)
    status = cloudraxak.getUserDetails(userid)
    return flask.Response(json.dumps(status), mimetype="application/json")

#Update UserDetails Information 
@app.route('/raxakapi/v1/modifyUserDetails/', methods=['POST'])
def modifyUserDetails ():
    userid = validateAPI()
    if userid is None:
        return flask.abort(403)
    firstname = str(flask.request.form.get('firstname'))
    lastname = str(flask.request.form.get('lastname'))
    company = str(flask.request.form.get('company'))
    phone = str(flask.request.form.get('phone'))
    status = cloudraxak.modifyUserDetails(userid,firstname,lastname,company,phone)
    return flask.Response(json.dumps(status), mimetype="application/json")

#Reset user password and update.
@app.route('/raxakapi/v1/ResetPassword/',methods=['GET','POST'])
def ResetPassword():
    userid = validateAPI()
    if userid is None:
        return flask.abort(403)
    password = str(request.form.get('oldpassword'))
    oldpassword = hashlib.md5(password).hexdigest()
    password = str(request.form.get('newpassword'))
    result = cloudraxak.ResetPassword(userid,oldpassword,password)
    return flask.Response(json.dumps(result), mimetype="application/json")


@app.route('/raxakapi/v1/getLoginHistory/<username>')
def getLoginHistory(username):
    key = username +":loginHistory"
    try:
        rs = redis.Redis()
        result = rs.lrange(key, -10, -1)
        results = []
        for res in reversed(result):
            results.append(json.loads(res))

        context = {
            "results" : results,
        }

        return flask.render_template("login_history.html", **context)
    except Exception as e:
        print "EXEC ", e

# get Allowed Servers to add private ips.
@app.route('/raxakapi/v1/getVPNAllowedServers/',methods=['GET','POST'])
def getVPNAllowedServers():
    userid = validateAPI()

    if userid is None:
        return flask.abort(403)

    allowedServers = [x.strip(' ') for x in config.get('VPNTunnel', 'allowedServers').split(',')]
    print allowedServers
    return flask.Response(json.dumps(allowedServers), mimetype="application/json")

@app.route('/raxakapi/v1/feedbackInfo/')
def feedbackInfo():
    if validateAPI() and is_admin():
        feedback = cloudraxak.feedbackInfo()
        status = flask.Response(json.dumps(feedback), mimetype="application/json")
    else:
        status = flask.abort(401, "You are not authorized to access this resource.")
    return status



@app.route('/raxakapi/v1/deleteFeedback/')
def deleteFeedback():
    print "wsgi: inside delete feedback"
    email = flask.request.args.get('email')
    feedback = flask.request.args.get('feedback')
    if email is None or feedback is None:
        return flask.abort(403)
    deleted = cloudraxak.deleteFeedback(email, feedback)
    return flask.Response(json.dumps('sucessfully deleted'), mimetype='application/json')


import report
# Usage: /raxakapi/v1/generateReportPdf
@app.route('/raxakapi/v1/getReportPDF', methods=['POST'])
def getReportPDF():
    print "in side get Report PDF"
    import zlib
    # validate API call as authentic and return if not
    try:
        userid = validateAPI()
        if userid is None:
            return flask.abort(403)
        reportData = request.form.get('reportData')
        if reportData is not None:
            parameter_str = zlib.decompress(base64.b64decode(urllib.unquote_plus(reportData)))
            parameter_dict = ast.literal_eval(parameter_str)
            parameter_dict['userid'] = userid
            data = report.generateReportPDF(parameter_dict)
            return flask.Response(json.dumps(data), mimetype="application/json")
        else:
            return flask.abort(404, 'Usage: /raxakapi/v1/generateReportPdf?ip=<login>@<ip-address>')
    except Exception as e:
        print ("wsgi in side get Report PDF Exception ",str(e))

if __name__ == '__main__':
    app.run()
