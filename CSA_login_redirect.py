import requests
from types import *
import pprint
import json
import Cookie

ipaddr = 'https://130.211.133.165:8444/'
baseURI = 'https://130.211.133.165:8444/csa/rest/'
headers = { 'Accept' : 'application/json'}
baseURIc = 'https://130.211.133.165:8444/csa/api/'

pp = pprint.PrettyPrinter( indent=4 )

def login( username, pwd ):

	#Login - First part
	print "============= Login - First part ==================== "
	headers = {}
        headers['Content-Type'] = {'application/json'}
        headers['Accept'] = {'application/json'}
        headers['Cookie'] = {'orgName=CSA_CONSUMER'}
        headers['Connection'] = {'keep-alive'}
        headers['Authorization'] = {'Basic aWRtVHJhbnNwb3J0VXNlcjppZG1UcmFuc3BvcnRVc2Vy'}
        headers['Referer'] = {''}
        headers['User-Agent'] = {'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/40.0.2214.115 Safari/537.36'}
        data = {}
        data['passwordCredentials'] = {"username":username, "password":pwd}
        data['tenantName'] = "CSA_CONSUMER"

        r = requests.get('https://130.211.133.165:8089/login',verify=False, headers=headers,data=json.dumps(data))
	
	print r
	print r.headers
	rurl = r.url
	print rurl

	print "===SET-COOKIE===" , r.headers['set-cookie']
	cookie = Cookie.SimpleCookie(r.headers['set-cookie'])
        jRefToken = "J-XSRF-TOKEN=" + cookie['J-XSRF-TOKEN'].value
        print jRefToken 
        jsessionId = "JSESSIONID=" + cookie['JSESSIONID'].value
        print jsessionId 
	print cookie['J-XSRF-TOKEN'].value

	#Login Part-2
	print "============= Login - Second part =================== "
	headers2 = {}
        headers2['Accept'] = {'application/xml'}
        headers2['Connection'] = {'keep-alive'}
        headers2['Cookie'] = { jsessionId , jRefToken }
        headers2['Content-Type'] = {'application/json'}
        headers2['Accept-Encoding'] = { 'gzip, deflate' }
        headers2['X-XSRF-TOKEN'] = { cookie['J-XSRF-TOKEN'].value }
        headers2['Referer'] = {'https://130.211.133.165:8089/org/CSA_CONSUMER'}
        #headers['Referer'] = {''}
        #headers1['User-Agent'] = {'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/40.0.2214.115 Safari/537.36'}
        r1 = requests.get(rurl,verify=False,headers=headers2)
	print r1
        print r1.content
	return r1.content

	#Authenticate
	print "============= Anthenticate part ======================= "
	headers1 = {}
	headers1['Accept'] = {'application/json'}
	headers1['Accept-Language'] = {'en-US'}
	headers1['Connection'] = {'keep-alive'}
	headers1['Content-Encoding'] = {'gzip'}
	headers1['transfer-Encoding'] = {'chunked'}
	headers1['Content-Type'] = {'application/json,charset=utf-8'}
	headers1['Referer'] = { rurl }
	headers1['Host'] = {'130.211.133.165:8444'}
	headers1['Content-Length'] = {'94'}
	headers1['encoding'] = {'None'}
	headers1['Cookie'] = { r.headers['set-cookie'], 'orgName=CSA_CONSUMER', 'JREFERER=https://130.211.133.165:8089/org/CSA_CONSUMER'}
	headers1['X-XSRF-TOKEN'] = {cookie['J-XSRF-TOKEN'].value}
	headers1['Accept-Encoding'] = { 'gzip, deflate' }

        rb = requests.post('https://130.211.133.165:8444/idm-service/idm/v0/api/public/authenticate',verify=False, headers=headers1,data=json.dumps(data) )
	print rb.status_code
	print rb.headers
	print rb.history
	print rb.url

#r = login("prashant","welcome123")


