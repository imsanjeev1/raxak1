#billing.py
#
#
#	(c) 2015, Cloud Raxak Inc. All Rights Reserved
#
#	This module consists of multiple utility functions related to the accounting and
#	billing functions. The database information is stored in redis as always
#	Note: in this version cost units are dimensionless (assumed to be $)
#
#
import json, datetime, time, redis

	
def newRateClass ():
	rateClass = {}
	rateClass['setup'] = 50
	rateClass['machine'] = 10
	rateClass['monthly'] = 1000
	rateClass['run'] = 10
	return rateClass
	
def newCurrentUsage():
	usage = newRateClass()
	for field in usage:
		usage['field'] = 0
	usage['setup'] = 1		# initial setup charges
	return usage
		

def initAccounting ( username ):
# 	Initialize accounting structure for a new user
	
	account = {}
	account['memberSince'] = datetime.date.today().timetuple().tm_mday
	account['expiration'] = ""# get from redis
	account['invoices'] = []
	account['rates'] = newRateClass()
	account['usage']= newCurrentUsage()
	
	rs = redis.Redis('localhost')
	rs.set(username+':account', json.dumps(account))
	return account
	
	
def getAccounting ( username ):
	rs = redis.Redis('localhost')
	account = rs.get(username + ':account')
	return json.loads(account) if account else None
	

def setAccounting ( username ):
	rs = redis.Redis('localhost')
	rs.set(username+':account', json.dumps(account))
	return 
	

def createInvoice ( username ):
	rs = redis.Redis ('localhost')
	
	account = rs.get ( username + ':account')

#	We will bill for all usage through now, since the last billing cycle
#	create invoice data and clear the current usage


	
