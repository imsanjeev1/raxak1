#   initgatewaycode.py
#   (c) 2015 Cloud Raxak, Inc.
#
#   This is the code that is sent to the remote server as part of the connection
#   created via execnet make_gateway. It is appended to the source code derived from
#   commonstub.py.
#   Ensure that all executable code is in initgatewaycode, and only passive function calls
#   are in commonstub.

import sys, pickle, traceback, subprocess

if __name__ == '__channelexec__':
    ochan = channel.gateway.newchannel()
    sys.stdout = ochan.makefile('w')
    channel.send(ochan)

    # username is globally defined to be the raxak userid. Check its password expiration times
    pipe = subprocess.Popen(["chage" ,"-M", "-1", username], stdout=subprocess.PIPE)
    pipe.wait()

    pipe = subprocess.Popen(["chage" ,"-l" , username], stdout=subprocess.PIPE)
    chageresult = pipe.stdout.read()
    #logging("Checked password expiry for Raxak Protect's account")
    #logging(chageresult)

    while not channel.isclosed():
        val = channel.receive()
        jar = pickle.loads(val)
        fname = jar[1]
        fcode = pickle.loads(jar[2])
        if jar[0] == 'L':  # create function
            # exec(jar[1] + "= types.FunctionType(fcode, globals())")
            exec (fcode)
            channel.send(True)
        elif jar[0] == 'S':  # set variable
            exec (jar[1] + "= fcode")
            channel.send(True)
        else:
            print('Remote: executing ' + jar[1])
            # func = types.FunctionType(fcode, globals())
            exec (fcode)
            # print("converted func")
            # execute ret = jar[1]()
            ret = None
            try:
                exec ('ret = ' + jar[1] + '()')
                print("Remote: finished executing")
            # print("Remote: status = " + str(ret)) //not needed hence commented

            except Exception as e:
                print ("Exception caught : ( During Remote: execution ) => " + str(e))
                print (traceback.format_exc())
                ret = None
            finally:
                channel.send(ret)
