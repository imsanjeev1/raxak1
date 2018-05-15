import execnet
import ruleset, TG, rulegui

print ("Init ssh connection")
resp = ruleset.runCheckRule(38483)

print (resp)

