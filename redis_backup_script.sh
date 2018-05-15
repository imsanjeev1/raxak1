lastSave=`redis-cli lastsave`
currentTime=`date +%s`
suffix=`date +%b-%d-%y`
echo $lastSave
echo $currentTime
diff=`expr $currentTime - $lastSave`
echo "DIFF $diff"
day=`expr 24 \* 3600`
diffInDay=`expr $diff / $day`
echo $diffInDay

one=0

if [ $diffInDay -ge $one ]; then
    echo "Initiating backup"
    redis-cli bgsave
    newLastSave=`redis-cli lastsave`
    while [ $lastSave -ge $newLastSave ]
    do
        newLastSave=`redis-cli lastSave`
        echo "New Last Save $newLastSave"
    done
    dir=`redis-cli config get dir | tail -n 1`
    srcFile="$dir/dump.rdb"
    destFile="/home/dump.rdb_$suffix.zip"
    echo "SRC $srcFile"
    echo "DEST $destFile"
    if [ -f "$srcFile" ]; then
       echo "File present"
       cd $dir
       zip $destFile "dump.rdb"
    else
       echo "File not present"
    fi
else
    echo "This is too early than specified time"
fi
