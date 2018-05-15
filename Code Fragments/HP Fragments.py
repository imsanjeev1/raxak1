import requests
from types import *
import pprint
import json

ipaddr = 'https://130.211.133.165:8444/'
baseURI = 'https://130.211.133.165:8444/csa/rest/'
headers = { 'Accept' : 'application/json'}
baseURIc = 'https://130.211.133.165:8444/csa/api/'

pp = pprint.PrettyPrinter( indent=4 )

def consumption ( username, pwd ):
	print ('consumption: ' + username + ' : ' + pwd)
	headers['Content-Type'] = 'application/json'
	data = {}
	data['passwordCredentials'] = {"username":username, "password":pwd}
	data['tenantName'] = "CSA_CONSUMER"
	
	r = requests.post(ipaddr + 'idm-service/v2.0/tokens', verify=False, auth=('idmTransportUser', 'idmTransportUser'), data=json.dumps(data), headers=headers)

	rj = r.json()
	#pp.pprint ( rj )
	
	token = str(rj['token']['id'])
	
	print ('id = ' + token )
	
	headers['X-Auth-token'] = token
	data = {"approval" : "ALL"}
	
	
	r = requests.post(baseURIc + 'mpp/mpp-offering/filter', verify=False, auth=('idmTransportUser', 'idmTransportUser'), data=json.dumps(data), headers=headers)
	
	rj = r.json()
	#pp.pprint( rj )
	
	print ("Offering ---")
	
	display = rj['members'][0]['displayName']
	category = rj['members'][0]['category']['name']
	serviceid = rj['members'][0]['id']
	catalogid = rj['members'][0]['catalogId']
	
	print ( display )
	print ( category )
	print ( 'Service id = ' + serviceid )
	print ( 'Catalog id = ' + catalogid )
	
	
	r = requests.get(baseURIc + 'mpp/mpp-offering/' + serviceid + '?catalogId='+catalogid+'&category='+category, verify=False, headers=headers)
	
	rj = r.json()
	pp.pprint (rj)

'''

At the end of the day, this is what the subscription call should look like:

{"categoryName":"APPLICATION_SERVICES","subscriptionName":"Raxak-CSA Integration (1.0.0)","startDate":"2015-04-17T23:21:15.000Z","endDate":"2015-04-18T23:21:15.000Z","fields":{"field_8a7040664c0a81f8014c1516922e4a91":true,"field_8a7040664c0a81f8014c1516923e4a94":"us-west-2","field_8a7040664c0a81f8014c1516923e4a95":"b","field_8a7040664c0a81f8014c1516924d4a96":"raxak-key","field_8a7040664c0a81f8014c1516924d4a97":"Amazon Linux#us-west-2","field_8a7040664c0a81f8014c1516924d4a98":"ami-2558ce15","field_8a7040664c0a81f8014c1516925d4a9a":"m1.small","field_8a7040664c0a81f8014c1516926c4aaa":1,"field_8a7040664c0a81f8014c1516924d4a99":"None","field_8a7040664c0a81f8014c1516926c4aad":"http","field_8a7040664c0a81f8014c1516926c4aae":"http","field_8a7040664c0a81f8014c1516928c4ab6":true,"field_8a7040664c0a81f8014c151692ba4ab9":"daily","field_8a7040664c0a81f8014c151692e94ac9":"gold"},"action":"ORDER"}
'''	
	
	
	
	return r
	 
def loginUser (username):
	

	r = requests.get(baseURI + 'login/CSA_CONSUMER/' + username, auth=('csaTransportUser','csaTransportUser'), verify=False, headers=headers)
	
	userid = str( r.json()['id'] )
	print ("Userid for " + username + " = " + userid)
	
	return userid
	
def getServiceDescription ( userid ):
	GlobalCatalog = "90d9650a36988e5d0136988f03ab000f"
	RaxakOffering = "8a7040664c0a81f8014c151691734a8a"


	r = requests.get(baseURI + 'catalog/' + GlobalCatalog + "/offering/" + RaxakOffering + "?userIdentifier=" + userid, auth=('csaTransportUser','csaTransportUser'), verify=False, headers=headers)
	
	so = r.json()
	print so['optionModel']['name']
	plist = so['optionModel']['optionSets'][0]['options'][0]['property']
	print "----"
	
	for i in range(len(plist)):
		print ("...")
		ol = plist[i]
		print(ol['displayName'])

		if len(ol['values']) > 0:
			print("values = " + str(ol['values'][0]['displayName']))
		
		for j in range(len ( ol['availableValues'])):
			print (ol['availableValues'][j]['displayName'])
	print "..."
		
	
	return so
	
r = consumption('prashant','welcome123')
	

	
	
