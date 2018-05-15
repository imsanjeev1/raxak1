#!/bin/bash
whoami 
randpw(){ < /dev/urandom tr -dc A-Z-a-z-0-9 | head -c${1:-16};echo;}
username="raxak"
password=$(randpw)
echo 'Defaults !requiretty' >> /etc/sudoers
echo " "$username"         ALL=(ALL)       NOPASSWD: ALL" >> /etc/sudoers
useradd -m $username
echo -e "$password\n$password\n" | sudo passwd $username
sudo -u $username bash <<EOF
whoami
cd ~
pwd
mkdir -p ~/.ssh/
echo "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABAQDCXPkVRVZj9hrfZ5l4SwKKt0Ni4IrBkBpZj4LxkP730FYylSSRQNiBuWE46G8smyA0V8Q2jat2Y2fWXn2i4AozakjYLis+UoYLDpFaH35dKBX2mcQzmNBZLmwgLFfrLXMVb4j0Bhg87SnPyUzsp88FfCl7VqzDjE16Pq3WrqOrX/AC9f2tHKlDFepH11XJGAabZ5BuVDPdg02q7xIF4erGtCgLTPPB6Vyp1pg9OqJCWGBcSdVs2Zu8riVBZPtgMo19ag/g14fuY6O/02f5zHJl3TvcWJS4LQe+EyvqCt1T1h2/8YEl9YaYshATYdViVdrKrWvlPloOEEnDppeMyRM9 raxakPublic.key" >> ~/.ssh/authorized_keys
chmod 640 ~/.ssh/authorized_keys
chmod 700 ~/.ssh/
EOF
exit
