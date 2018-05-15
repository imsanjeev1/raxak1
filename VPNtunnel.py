# VPNtunnel:
#
#	(c) 2015, Cloud Raxak Inc. All Rights Reserved
#
#	This module works with VPN tunnels to SoftLayer (and probably other similar systems)
#	allowing external access over VPN to private IPs
#
#
#	PGM	07/22/2015	Created
#

import sh
from sh import sudo
import redis
import json
import time, datetime
import hashlib


def cleanLink():
    # Called when the server starts to ensure that the database representation of the tunnel
    # matches reality. We do not want to constantly add and drop VPN routes and tunnels
    # but need a mechanism to ensure that the tunnels are open when needed
    rs = redis.Redis("localhost")
    try:
        tS = rs.get("tunnelStatus")
    except Exception as e:
        print ("Exception " + str(e))
        tS = None
    print("cleanLink: tS = " + str(tS))
    if tS is None:
        # there is no record of an open tunnel
        # we cannot figure out the tunnel name from the ppp0 status, so best thing
        # is to close out any tunnels that may be open
        try:
            sudo.poff()
            return
        except:
            print ("No open tunnel")
            return



    # if tS is not none, we expect to find tunnels open and routes defined. First check
    # if there is a tunnel
    tS = json.loads(tS)
    print('cleanLink: tS ' + str(tS))
    try:
        conf = sh.ifconfig("ppp0")
    except:
        conf = None

    if conf is not None:
        print ("ppp0 exists:\n" + str(conf))
        gateway = ''
        for line in str(conf).splitlines():
            fields = line.split()
            for term in fields:
                if "P-t-P" in term:
                    gateway = term.split(":")[1]
                    print("Gateway: " + gateway)
        if gateway == '':
            print ("ppp0 is defined but not initialized -- removing")
            try:
                sudo.poff()
            except Exception as e:
                print ("Cannot delete ppp0: " + str(e))
            rs.delete("tunnelStatus")
            return

        # Find all routes through ppp0:
        routes = sh.route("-n")
        # Parse the output to find routes that have flags GH and go through ppp0
        routeList = []
        for line in routes.splitlines():
            lineBurst = line.split()
            if len(lineBurst) == 8:
                if lineBurst[7] == "ppp0" and "GH" in lineBurst[3]:
                    routeList.append(str(lineBurst[0]))
        print ("Hosts currently being routed = " + str(routeList))

        for knownRoute in tS['tunnelRoutes']:
            print("knownRoute: " + knownRoute)
            knownRouteIP = knownRoute.split('@')[1]
            print(knownRouteIP)
            if knownRouteIP in routeList:
                print ('route exists: ' + knownRouteIP)
                routeList.remove(knownRouteIP)
            else:
                print ('route does not exist: ' + knownRouteIP)
                tS['tunnelRoutes'].remove(knownRoute)
        rs.set('tunnelStatus', json.dumps(tS))
        if len(routeList) > 0:
            print("Routes that exist but are not recorded in database: " + str(routeList))
            for r in routeList:
                try:
                    sudo.route("delete", r)
                except:
                    print("Error deleting route: " + r)
        else:
            print("All routes accounted for")
    else:
        print('tunnelStatus exists but device does not')
        print('cleaning up all record of that tunnel')
        print('cleaning routes: ' + str(tS['tunnelRoutes']))
        for knownRoute in tS['tunnelRoutes']:
            print("knownRoute: " + knownRoute)
            knownRouteIP = knownRoute.split('@')[1]
            print(knownRouteIP)
            tS['tunnelRoutes'].remove(knownRoute)
        rs.delete("tunnelStatus")

    return


def openLink(ip):
    # returns True iff:
    #	no tunnel is needed
    #	tunnel is needed, exists/can be setup, route exists/can be set up
    print("VPNtunnel: openLink " + ip)
    rs = redis.Redis("localhost")
    needsTunnel = rs.get(ip + ":isTunnel")
    if needsTunnel == "False" or needsTunnel is None:
        return True

    # You need a tunnel and a route:
    print("openLink: " + str(ip) + " needs a tunnel")

    return openTunnel(ip)


def closeLink(ip):
    # returns True iff:
    #	no tunnel is needed
    #	tunnel exists and the route is closed

    rs = redis.Redis("localhost")
    needsTunnel = rs.get(ip + ":isTunnel")
    if needsTunnel == "False":
        return True
    print ("closeLink: " + str(ip) + " needs a tunnel. Closing any open routes")
    return closeRoute(ip)


def openTunnel(ip):
    # If a tunnel is needed for ip shown, openTunnel will create a tunnel and add a route to that ip as follows:
    # If a tunnel is open but is not the correct tunnel for the ip in question,
    #	tunnelOpen will call tunnelClose to close the open tunnel (which will work if there are no open routes through
    #  it)
    # If there are no open tunnels, openTunnel will open a new tunnel based on the IP characteristics
    # If a tunnel is already open with the right characteristics, openTunnel will check for the route and add it if
    # needed
    # if the route already exists and the tunnel is open, no specific action is taken
    print("openTunnel " + str(ip))
    rs = redis.Redis("localhost")

    needsTunnel = rs.get(ip + ":isTunnel")
    print ("openTunnel: needsTunnel: " + needsTunnel)
    if needsTunnel == "False":
        return True
    print("openTunnel: Getting tunnel parameters")

    # Tunnel is needed: get information about ip from redis
    tunnelUsername = rs.get(ip + ":tunnelUsername")
    tunnelPassword = rs.get(ip + ":tunnelPassword")
    tunnelIP = rs.get(ip + ":tunnelIP")

    print(tunnelUsername + " " + tunnelPassword + " " + tunnelIP)

    tunnelN = tunnelUsername + ":" + tunnelIP
    tunnelName = hashlib.sha256(tunnelN).hexdigest()[:18]
    print ("openTunnel: tunnelName for " + tunnelN + " = " + tunnelName)

    # check if a tunnel by that name is open


    tunnelStatus = rs.get("tunnelStatus")  # assuming here that the username and the tunnel IP are unique

    if tunnelStatus is not None:
        print ("openTunnel: tunnelStatus = " + tunnelStatus)
        # There is a tunnel open. Is it the right one
        tS = json.loads(tunnelStatus)
        if tS["tunnelName"] != tunnelName:
            # try closing the tunnel that is open
            print ("openTunnel: Need to close tunnel " + tS["tunnelName"])

            if not closeTunnel(tS):
                print ('Error: Cannot close tunnel')
                return False  # current tunnel cannot be closed

            # if tunnel is successfully closed, closeTunnel will clear all the tunnelStatus information in redis
            tS = {}
            tunnelStatus = None

    if tunnelStatus is None:
        # tunnel does not exist-- open it

        # first check if the tunnel is registered and a config file created for it

        availableTunnels = str(sudo.ls("/etc/ppp/peers")).split()
        print ("availableTunnels: " + str(availableTunnels))

        if tunnelName not in availableTunnels:
            print("Creating new tunnel")
            try:
                rc = sudo.pptpsetup("--create", tunnelName, "--server", tunnelIP, \
                                    "--username", tunnelUsername, "--password", tunnelPassword, "--encrypt")
                availableTunnels = str(sudo.ls("/etc/ppp/peers")).split()
                print ('After creating: availableTunnels: ' + str(availableTunnels))
                if tunnelName not in availableTunnels:
                    print ("Unable to create tunnel: rc= " + str(rc))
                    return False
            except Exception as e:
                print ("Exception in pptpsetup: " + str(e))
                return False
        # We have created a tunnel. Turn it on with popen

        rc = sudo.pon(tunnelName)
        print('openTunnel: rc: ' + str(rc))

        # Check if VPN tunnel is ready

        if not tunnelIsReady():
            print("openTunnel: Tunnel could not be turned on: rc = " + str(rc))
            return False

        print("tunnel Is Ready")

        # if error in opening the tunnel, return failure
        tS = {}
        tS['created'] = time.strftime("%c")
        tS['tunnelRoutes'] = []
        tS['tunnelName'] = tunnelName
        rs.set("tunnelStatus", json.dumps(tS))

        # If we have not returned yet, tS has the data structure of the current tunnel configuration

    if not openRoute(tS, ip):
        # route does not exist in current tunnel, or could not open a new one
        return False

    rs.set('tunnelStatus', json.dumps(tS))
    # If we have not returned yet, we now have a tunnel, with the proper route added. We should be good to go
    print("Tunnel set. Everything OK")
    return True


def tunnelIsReady():
    count = 5
    while count > 0:
        print('tunnelIsReady: count = ' + str(count))
        gateway = ''
        try:
            conf = sh.ifconfig("ppp0")
            print ("tunnelIsReady:\n" + str(conf))
            for line in str(conf).splitlines():
                fields = line.split()
                for term in fields:
                    if "P-t-P" in term:
                        gateway = term.split(":")[1]

        except:
            print('tunnel ppp0 not found')

        print('tunnelIsReady: gateway: ' + str(gateway))
        if gateway == '':
            count = count - 1
            time.sleep(5)
        else:
            break

    if count == 0:
        print('Counted down, but no tunnel')
        return False

    return True


def openRoute(tS, ip):
    # At this time, ppp0 is created, named, etc.
    # Check if route already exists
    print ("openRoute: " + str(tS) + " " + ip)

    if ip in tS['tunnelRoutes']:
        return True

    # Else open a route
    print ("Opening route to " + ip)
    gateway = ""
    try:
        a = sh.ifconfig("ppp0")
        for line in str(a).splitlines():
            fields = line.split()
            for term in fields:
                if "P-t-P" in term:
                    gateway = term.split(":")[1]
                    print("Gateway: " + gateway)
    except Exception as e:
        print ("openRoute: cannot ifconfig ppp0 " + str(e))
        return False

    if gateway == "":
        print("openRoute: gateway could not be parsed from ppp0")
        return False

    print("openRoute: Adding route to " + str(ip).split("@")[1])
    try:
        sudo.route("add", "-host", str(ip).split("@")[1], "gw", gateway, "dev", "ppp0")
        print("route added")
    except Exception as e:
        print("Error adding route: " + str(e))
        return False

    print(sh.route("-n"))
    rs = redis.Redis("localhost")
    tS['tunnelRoutes'].append(ip)
    rs.set("tunnelStatus", json.dumps(tS))

    return True


def closeRoute(ip):
    rs = redis.Redis("localhost")
    tunnelStatus = rs.get('tunnelStatus')
    if tunnelStatus is None:
        return True

    tunnelStatus = json.loads(tunnelStatus)
    if ip in tunnelStatus['tunnelRoutes']:
        # remove the route
        print("Removing the route to " + str(ip))
        sudo.route("delete", str(ip).split("@")[1])
        print(sh.route("-n"))
        #
        tunnelStatus['tunnelRoutes'].remove(ip)
        rs.set('tunnelStatus', json.dumps(tunnelStatus))
        return True

    return True


def closeTunnel(tS):
    # Tunnel will be closed if there are no routes leading into it

    if len(tS['tunnelRoutes']) > 0:
        print("Tunnel " + tS['tunnelName'] + " has routes to " + str(tS['tunnelRoutes']))
        return False

    # close tunnel
    rs = redis.Redis("localhost")
    rs.delete('tunnelStatus')
    return True
