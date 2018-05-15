#Creating VM setting temp file which will be used to execute the list of commands on VM itself to make the raxak related necessary settings
#	Usage: ./rackspaceVM_settings.sh machineIP rootpassword
touch /tmp/vm_settings_log$1
echo "---- " >> /tmp/vm_settings_log$1
cat ./WebFrontEnd/VMSetup.sh | sshpass -p "$2" ssh -o "StrictHostKeyChecking no" -tt root@$1 
