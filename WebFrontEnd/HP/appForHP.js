/*
#  (c) 2014, Cloud Raxak Inc. All Rights Reserved
*/

//VM_Username_IP = "root@192.168.0.172"
VM_Username_IP = "root@15.125.97.169"


function ashish(){

var profile = document.getElementById("profiles").value;
var autoremediate = $('input[name="RadioGroup1"]:checked').val(); 

//var uri = "http://192.168.0.71/raxakapi/v1/runProfiles?ip=root@192.168.0.172&profile="+profile+"&autoremediate="+autoremediate;
var uri = "/raxakapi/runProfiles?ip="+ VM_Username_IP +"&profile="+profile+"&autoremediate="+autoremediate;

jQuery.ajax( {
    url: uri,
    type: 'GET',
    beforeSend : function( xhr ) {
    },
    success: function( response ) {
	window.location.href = "myservice.html";
    }
} );

/*
    dojo.xhrGet({
       url : uri,
       method: "GET",
       crossDomain: false,
       handleAs: "text"
       }).then(function (htmlResults) {
console.log("sucess")
                dojo.empty("success");
                dojo.empty("manual");
                dojo.empty("failed");
                profileRunIP=defaultStatusSelectionIP
        myDialog.set("title", "Success");
        myDialog.set("content", "<h2>Rules successfully been executed on IP: "+ip+"</h2>");
        myDialog.set("style","width: 450px; border:1px solid #b7b7b7; background:#fff; padding:8px; margin:0 auto; height:100px; overflow:auto;")
        myDialog.show()

            }, function (err) {
            alert(err)
            console.log( "ERROR: ", err );
       });

*/
/*
jQuery.ajax( {
    //url: 'http://192.168.0.71/raxakapi/getIPs?username=ashish',
    url: 'http://192.168.0.71/raxakapi/status/root@192.168.0.172status',
    type: 'GET',
    beforeSend : function( xhr ) {
    },
    success: function( response ) {
	//alert(response)
	console.log(response)
	//document.getElementById("status_execution").innerHTML = (String(res));
	//alert("Rules execution on targetted VM is in progress")
    }
} );
*/

}
/*
var value = 0

alert("a")
setInterval(
function(){
alert("Hello"+value)
value++
},2000);

*/

statusURL = "/raxakapi/status/"+ VM_Username_IP + "status"

jQuery.ajax( {
    //url: 'http://192.168.0.71/raxakapi/status/root@192.168.0.172status',
    url: statusURL,
    type: 'GET',
    beforeSend : function( xhr ) {
    },
    success: function( response ) {
	document.getElementById("status_execution").innerHTML = response;
    }
} );

jQuery.ajax( {
    //url: 'http://192.168.0.71/raxakapi/showrun/root@192.168.0.172',
    url: "/raxakapi/showrun/"+ VM_Username_IP,
    type: 'GET',
    beforeSend : function( xhr ) {
    },
    success: function( response ) {
	var arrayOfObjects = eval(response);
        count = arrayOfObjects.length

	success = manual = failed = 0
        var stringConsole = ""
        for(var i in arrayOfObjects) {
                var json = JSON.parse(arrayOfObjects[i])
                outcome = json.outcome
                if ((outcome.search("successful")) > -1)
                {
			success++;
                }
                else if ((outcome.search("manual")) > -1)
                {
			manual++;
                }
                else if ((outcome.search("failed")) > -1)
                {
			failed++;
                }
        }

	$("#success_status").text(success);
	$("#failure_status").text(failed);
	$("#manual_status").text(manual);
    }
} );

function myservice(st){
document.getElementById("status_execution").innerHTML = "asass";
window.location.href = "myservice.html";
}

