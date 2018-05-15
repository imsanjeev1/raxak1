/*
#  (c) 2014, Cloud Raxak Inc. All Rights Reserved
*/

var profileRunIP= "None";
var statusExecution;
var executedIPs = "None"; // To check the status of rules execution of list of the IPs
var show_profile = " ";//To hold the profile name which has to be displayed in report tab.
var show_execmode = "0";//To hold the execution mode which has to be displayed in report tabe.
var success = manual = failed = 0; //To track the success,failure,manual count for rule sets
var selectedTimeStamp= "None"; //To track the selected timestamp from archive log selector. 
var executed_on = "";//To track the archive/latest/last run timestamp.It is used to show the time in report tab.
var latest_client_time = "";


require(["dijit/Dialog", "dojo/domReady!"], function(Dialog){
	
    myDialog = new Dialog({
        title: "My Dialog",
	parseOnLoad: true,
        content: "Cloud Raxak",
        style: "width: 400px; border:1px solid #b7b7b7; background:#fff; margin:0 auto; height:400px;"
    });
    // myDialog2 => info, confirmation
    myDialog2 = new Dialog({
        title: "My Dialog",
	parseOnLoad: true,
        content: "Cloud Raxak",
        style: "width: 350px; border:1px solid #b7b7b7; background:#fff; margin:0 auto; height:135px;"
    });
    // myDialog3 => Warning, Error
    myDialog3 = new Dialog({
        title: "My Dialog",
	parseOnLoad: true,
        content: "Cloud Raxak",
        style: "width: 350px; border:1px solid #b7b7b7; background:#fff; margin:0 auto; height:140px;"
    });
});

function checkSelectedIPs(){
    var multipleValues = [];
    if ($j14("#ipaddms2side__dx").length > 0) {
        $j14("#ipaddms2side__dx option").each(function () {
            multipleValues.push($j14(this).val())
        });
    }
    if (multipleValues.length > 0) {
            var tab2 = dijit.byId('applySelectedProfileButtonClick');
            myDialog2.set("title", "Confirmation");
            button = "<button class='info-btn' data-dojo-type='dijit/form/Button' id='leave_tab_ok' value='OK' type='submit'>OK</button>"
            button_cancel = "<button class='info-btn' data-dojo-type='dijit/form/Button' id='leave_tab_cancel' type='submit'>Cancel</button>"
            myDialog2.set("content", "<div class='info-content'>You have selected some IPs. Would you like to move anyway?</div>"+"<center>"+button+ " " +button_cancel+"</center>");
            myDialog2.set("style", "height:140px;");
            myDialog2.show()

            dojo.connect(dojo.byId("leave_tab_cancel"), "click", function(evt){
                dijit.byId('main_tabContainer').selectChild(tab2);
                console.log("false");
                return false;
            });
    }
}

function updateStatusPans(){
require(["dojo/ready","dojo/io-query"], function(ready,ioQuery){
     ready(function(){
    
    show_profile = "";	
    dojo.empty("success");
    dojo.empty("manual");
    dojo.empty("failed");
    if (profileRunIP=="None")
	return
    //Creating url on the basis of timestamp.	
    var timeStamp = "";	
    selectedTimeStamp_mod = selectedTimeStamp.replace(/\s/g, '');
    latest_client_time_mod = latest_client_time.replace(/\s/g, '');
    		
    dojo.style('ajaxloader', 'display','block');//3a
    //If block :- This case will be executed when user selects lastrun ips	
    if (selectedTimeStamp!= "None" & selectedTimeStamp_mod!= latest_client_time_mod)
    {	

	var date_obj = new Date(selectedTimeStamp);
	var utc_time = date_obj.toUTCString();

	var uri = "/raxakapi/v1/showrun/"+profileRunIP+"?timestamp="+utc_time;
	executed_on = selectedTimeStamp 
	//Disabling the remediate,dismiss,testagain button.
	dijit.byId("dismis_id").setAttribute('disabled', true)
	dijit.byId("remediate_id").setAttribute('disabled', true)
	dijit.byId("testagain_id").setAttribute('disabled', true)

	dijit.byId("diff_id").setAttribute('disabled',false)

    }
    else	
    {
        //Else block :- This case will be executed when user do not select last run ips	
	updateTimeSelector();
	//Enabling the remediate,dismiss,testagain button.
	dijit.byId("dismis_id").setAttribute('disabled',false)
	dijit.byId("remediate_id").setAttribute('disabled',false)
	dijit.byId("testagain_id").setAttribute('disabled',false)
	dijit.byId("diff_id").setAttribute('disabled',true)
	
	//get all the titles of rule numbers
	 map_title = {};
	var rule_profile = "Demonstration Profile";
	if (show_profile.length != 0 ) { rule_profile = show_profile }
	var uri = "/raxakapi/v1/ruleTitle/"+rule_profile;
        dojo.xhrGet({       
		url : uri,                                     
		method: "GET",                               
		crossDomain: false,              
		handleAs: "json"                    
		}).then(function (htmlResults) {             
	      var list1 = eval(htmlResults); 
		  for (var i = 0; i < list1.length; ++i) {
			var rule = list1[i].rule;
			var title = list1[i].title;
			map_title[rule] = title;
		  }
	 });
	
  	var uri = "/raxakapi/v1/showrun/"+profileRunIP;

    } //end else block

    dojo.xhrGet({       
       url : uri,                                     
       method: "GET",                               
       crossDomain: false,              
       handleAs: "text"                    
       }).then(function (htmlResults) {             
	var arrayOfObjects = eval(htmlResults);
	count = arrayOfObjects.length
	var stringConsole = ""

 	var selSuccess = document.getElementById('success');
 	var selFailed = document.getElementById('failed');
 	var selManual = document.getElementById('manual');
	success = manual = failed = 0;
	//Show profile value updating from the file data
        selSuccess.innerHTML = "";selFailed.innerHTML="";selManual.innerHTML="";//#102: Changes by Abhishek
	for(var i in arrayOfObjects) {
		var json = JSON.parse(arrayOfObjects[i])
		show_profile = json.profile
		show_execmode = json.exemode
		stringConsole = stringConsole + json.console
		stringConsole = stringConsole + "\n"
		var opt = document.createElement('option');
		outcome = json.outcome
		opt.innerHTML = "Rule: " + json.rule + " " + outcome;
		opt.value = json.rule;
		if ((outcome.search("successful")) > -1)
		{
		   success++;
		   opt.setAttribute('title', map_title[opt.value]);
		   selSuccess.appendChild(opt);
		}
		else if ((outcome.search("manual")) > -1)
		{
		   manual++;
		   opt.setAttribute('title', map_title[opt.value]);
		   selManual.appendChild(opt);
		}
		else if ((outcome.search("failed")) > -1)
		{
		   failed++;
		   opt.setAttribute('title', map_title[opt.value]);
		   selFailed.appendChild(opt);
		}
	}




	//This event place is only place where we update the 'Selected Profile:'. 
	profile2_id=document.getElementById('profile_val_Id');
	profile2_id.innerHTML = show_profile
	profile3_id=document.getElementById('profile_failure_Id');
	profile3_id.innerHTML = show_profile
	profile4_id=document.getElementById('profile_manual_Id');
	profile4_id.innerHTML = show_profile 
	//Calling API to get the time-status for profilerunIp

	document.getElementById("textarea_id").innerHTML = stringConsole
        dojo.style('ajaxloader', 'display','none');//2b 3b
        }, function (err) {                                
	    myDialog3.set("title", "Error");
            button_ok = "<center><button class='info-btn-ok' data-dojo-type='dijit/form/Button' id='button_ok' type='submit'>OK</button></center>";
            myDialog3.set("content", "<div class='info-content'>Unable to fetch target machines from RAXAK server.\nPlease contact the raxak administrator, if the problem persists."+ "</div>"+button_ok);
            myDialog3.set("style", "height:160px;");
            myDialog3.show();
            console.log( "ERROR: ", err );
       });
       
       
     });
});
}

//Udating the report table.
function updateReportPans(){

       if (profileRunIP=="None")
	  return

       dojo.style('ajaxloader', 'display','block');//4a

       var uri = "/raxakapi/v1/getIPDetails?ip="+profileRunIP;
       dojo.xhrGet({       
          url : uri,                                     
          method: "GET",                               
          crossDomain: false, 
          handleAs: "json"
          }).then(function (htmlResults) {             
		var mapOfObjects = eval(htmlResults);
		var os = mapOfObjects['os'];
		var os_version = mapOfObjects['os_version'];
		var hostname =  mapOfObjects['hostname'];

		//os_name_in_caps=os_name.charAt(0).toUpperCase() + os_name.slice(1);
		os = os+" Release "+os_version;
		
		//Adding header to table cell
    		header_id=document.getElementById('th2');
		header_id.innerHTML = "Executed on:"+executed_on;

		//Adding hostName to table cell
    		host_id=document.getElementById('hostId');
		host_id.innerHTML = hostname

		//Adding osName to table cell
    		os_id=document.getElementById('osId');
		os_id.innerHTML = os 

		//Adding profile to table cell
    		profile_id=document.getElementById('profileId');
		profile_id.innerHTML = show_profile 

		//Adding execution mode to table cell
    		exec_id=document.getElementById('executionId');
		if (show_execmode== "1")
			exec_id.innerHTML = "Automatic Remediation" 
		else
			exec_id.innerHTML = "Manual Remediation" 
		//Calculate toatal rules,success,fail,manual with %			
		var total_rules = success+failed+manual; 	
		var success_perc = Math.round((success/total_rules)*100)
		var failed_perc = Math.round((failed/total_rules)*100)
		var manual_perc = Math.round((manual/total_rules)*100)
    		count_id=document.getElementById('totalId');
		count_id.innerHTML = total_rules 
    		passed_id=document.getElementById('passedId');
		passed_id.innerHTML = success+"  ("+success_perc+")%"
    		failed_id=document.getElementById('failedId');
		failed_id.innerHTML = failed+"  ("+failed_perc+")%" 
    		manual_id=document.getElementById('manualId');
		manual_id.innerHTML = manual+"  ("+manual_perc+")%" 

                dojo.style('ajaxloader', 'display','none');//4b
	   });	
}



/*
ASG:
Once a user clicked on Apply profile button to execute the profile's rule on target VM(s), 
the indeterminate progress bar should be displayed along with the label of the progress bar saying "Compliance checking in progress..."
And
Once the rules execution finished, progress bar should be removed and only label should be displayed saying "Compliance checking finished"
*/
function checkStatusOfExecution(refresh){

if(typeof refresh == 'undefined') 
{
	refresh=false
}

console.log("checkStatusOfExecution == " + executedIPs)

if ( executedIPs == "None" )
{
	statusExecution = setTimeout(function () {checkStatusOfExecution() }, 10000);
	return
}

 var uri = "/raxakapi/v1/getExecutionStatus?ip="+ executedIPs
 dojo.style('ajaxloader', 'display','none');//16b //dont want loader here
  dojo.xhrGet({
       url : uri,
       method: "GET",
       crossDomain: false,
       handleAs: "text"
       }).then(function (htmlResults) {
		var str = htmlResults
		if (str.indexOf("false") >= 0)
		{
			var div = document.getElementById('indeterminateBar1');
			div.style.display = 'block';
			document.getElementById("try").style.color = "blue"
			dijit.byId("applyprofile_id").setAttribute('disabled',true);
			percentage=str.substring(6)
			statusExecution = setTimeout(function () {checkStatusOfExecution() }, 10000);
			document.getElementById("try").innerHTML = "Compliance checking in progress(" + percentage + "%).....";
		}
		else
		{
			var div = document.getElementById('indeterminateBar1');
			div.style.display = 'none';
                        document.getElementById("try").style.color = "green"
			if(!refresh)//Display only when user has not refreshed the page
			{
				document.getElementById("try").innerHTML = "Compliance checking finished.";
			}
			clearTimeout(statusExecution);
			dijit.byId("applyprofile_id").setAttribute('disabled',false); 
		}	
            }, function (err) {
            alert(err)
            console.log( "ERROR: ", err );
   });
}

function onChangeIpSelValue(x){
	//Updating profileRunIP and all archive selectors.
	//while user selects the other ip address.
	profileRunIP=x
	dojo.byId( "myselect1" ).value =  x ;
	dojo.byId( "myselect2" ).value =  x ;
	dojo.byId( "myselect3" ).value =  x ;
	dojo.byId( "myselect4" ).value =  x ;
	dojo.byId( "myselect5" ).value =  x ;
	
	//1.Updating content pane of all tab w.r.t to 
	//the selected userName@IpAd and timeStamp value.
	//2.Populating the archive log selector. 
	updateTimeSelector();
	updateStatusPans()
}

//Function intends to update the archive log selector in all tabe
//with archive files and latest/last execution timestamp.
function updateTimeSelector()
{
	//Reset the value of selectedTimeStamp as swtich to other userName@ipAd.		
	selectedTimeStamp= "None";  
	var selSuccessHistoryHandler = document.getElementById('myselect1varlog');
	var selFailureHistoryHandler = document.getElementById('myselect2varlog');
	var selManualHistoryHandler = document.getElementById('myselect3varlog');
	var selConsoleHistoryHandler = document.getElementById('myselect4varlog');
	var selReportHistoryHandler = document.getElementById('myselect5varlog');

	//Calling API to get the time-status for profilerunIp
  	var uri = "/raxakapi/v1/showExecutionStatus/"+profileRunIP;
        if(dojo.attr("main_tabContainer_tablist_applySelectedProfileButtonClick", "aria-selected") === true){
            dojo.style('ajaxloader', 'display','none');//17b
        }else{
            dojo.style('ajaxloader', 'display','block');//2a
        }
    	dojo.xhrGet({       
       	url : uri,                                     
        method: "GET",                               
        crossDomain: false,              
        handleAs: "text"                    
        }).then(function (htmlResults) { 
		time_string=htmlResults.split("Rules execution completed on : ");	
		//Getting utc time string from server
		latest_server_utc = time_string[1].replace('"','');
		//Converting utc to local time zone as we are in client zone.
		var arch_time = new Date(latest_server_utc+' UTC');
		latest_client_time=arch_time.toString().split("GMT")[0];
		executed_on = latest_client_time 
		
	}) ;            
	

	//Calling API to get list of archive log files from /var/log/cloudRaxak.
        var uri = "/raxakapi/v1/getArchiveLogFileNameList/"+profileRunIP;
    	dojo.empty(selSuccessHistoryHandler);
        dojo.xhrGet({       
        url : uri,                                     
        method: "GET",                               
        crossDomain: false,              
        handleAs: "text"                    
        }).then(function (htmlResults) {             
		var listOfTimestamp = eval(htmlResults);
		listOfTimestamp.splice(0, 0, latest_server_utc);
		//Clear the previous log archives data from log selector. 	
        	dojo.empty("myselect1varlog");
        	dojo.empty("myselect2varlog");
        	dojo.empty("myselect3varlog");
        	dojo.empty("myselect4varlog");
        	dojo.empty("myselect5varlog");
		for (var index in listOfTimestamp)
		{	
			server_utc_time = listOfTimestamp[index].concat(' UTC');	
			time = new Date(server_utc_time);
			client_local_time = time.toString().split("GMT")[0];
			var option1 = document.createElement('option');
			option1.innerHTML = client_local_time;
			selSuccessHistoryHandler.appendChild(option1);
			var option2 = document.createElement('option');
			option2.innerHTML = client_local_time;
			selFailureHistoryHandler.appendChild(option2);
			var option3 = document.createElement('option');
			option3.innerHTML = client_local_time;
			selManualHistoryHandler.appendChild(option3);
			var option4 = document.createElement('option');
			option4.innerHTML = client_local_time;
			selConsoleHistoryHandler.appendChild(option4);
			var option5 = document.createElement('option');
			option5.innerHTML = client_local_time;
			selReportHistoryHandler.appendChild(option5);
		}

		});//one api ends

                
}



//This function intends to update the archive log selectors 
//with the user selected current value and update the content
//pane of all tabe.
function onChangeTimeStmpSelValue(y){

	dojo.byId( "myselect1varlog" ).value =  y ;
	dojo.byId( "myselect2varlog" ).value =  y ;
	dojo.byId( "myselect3varlog" ).value =  y ;
	dojo.byId( "myselect4varlog" ).value =  y ;
	dojo.byId( "myselect5varlog" ).value =  y ;

	//It takes the selected timestamp.
	selectedTimeStamp=y	
	updateStatusPans()
}

function updateSelectedProfilePage(){
require(["dojo/ready","dojo/io-query"], function(ready,ioQuery){
     ready(function(){
     var q = document.getElementsByName('radioGroup');
     show_profile = ""
     for(var i = 0; i < q.length; i++){
     	if(q[i].checked){
             rate_values = q[i].value;
	     // show_profile updating on selction of profile.	
             show_profile = rate_values
             break
        }
     }
	 

    dojo.query("label[for=selected_profile]")[0].innerHTML = show_profile;
    var stringIPs= ""

    var uri = "/raxakapi/v1/getIPs?username=raxak";
    dojo.style('ajaxloader', 'display','block');//1a
    dojo.xhrGet({       
       url : uri,                                     
       method: "GET",                               
       crossDomain: false,              
       handleAs: "json"                    
       }).then(function (htmlResults) {
           
		var arrayOfObjects = eval(htmlResults);
		
		dojo.empty("ipadd_del");
                dojo.empty("ipadd");
		var selProfile = document.getElementById('ipadd');
		var selAddTargets = document.getElementById('ipadd_del');	
		
                if (arrayOfObjects.length < 1){
                        dijit.byId("deleteip_id").setAttribute('disabled',true);
                        dijit.byId("modifyip").setAttribute('disabled',true);
                        dijit.byId("access_target_id").setAttribute('disabled',true);
                }else{
                        dijit.byId("deleteip_id").setAttribute('disabled',false);
                        dijit.byId("modifyip").setAttribute('disabled',false);
                        dijit.byId("access_target_id").setAttribute('disabled',false);
                }
                
		for(var i in arrayOfObjects) {
			
			var opt = document.createElement('option');
			var opt1 = document.createElement('option');
			var json = JSON.parse(arrayOfObjects[i])
		        ip = json.ip
			access = json.access
                        nickname = json.nickname
			ip_count = arrayOfObjects.length
			if (ip_count == 1){
				opt1.setAttribute("selected", "selected");	
			}
                        
                        if(nickname == ''){
                            nickname = ip;
                        }
                        
			opt.innerHTML = nickname;
			opt.value = ip;
			opt1.innerHTML = nickname;
			opt1.value = ip;
			if (access == -2){
				opt1.setAttribute('class', 'pingnotreachableclass');opt.setAttribute('class', 'pingnotreachableclass');
                                opt1.setAttribute('disabled', true);
				opt1.setAttribute('access',access );
				opt1.setAttribute('title', ip + ' : Unable to reach target machine (ping failed)');
                                opt.setAttribute('title', ip + ' : Unable to reach target machine (ping failed)');
				opt.setAttribute('access',access );
				opt1.setAttribute('nickname',nickname );

			}
			else if(access == 1 ){
                            	opt1.setAttribute('class', 'pingreachclass');opt.setAttribute('class', 'pingreachclass');
				opt1.setAttribute('access',access );
				opt.setAttribute('access',access );
     				opt1.setAttribute('title',ip + ' : ALL OK');opt.setAttribute('title', ip + ' : ALL OK');
				opt1.setAttribute('nickname',nickname );

			}
			else if(access == -1){opt1.setAttribute('class', 'orangeclass');opt.setAttribute('class', 'orangeclass');
				opt1.setAttribute('access',access );
                                opt1.setAttribute('disabled', true);
				opt.setAttribute('access',access );
				opt1.setAttribute('title',ip + ' : OS not supported');opt.setAttribute('title',ip + ' : OS not supported');
			}
			else if(access == -3){opt1.setAttribute('class', 'yellowclass');opt.setAttribute('class', 'yellowclass');
				opt1.setAttribute('access',access );
                                opt1.setAttribute('disabled', true);
				opt.setAttribute('access',access );
				opt1.setAttribute('title',ip + ' : Unable to log in with specified userid (ssh login fails)');opt.setAttribute			   ('title',ip + ' : Unable to log in with specified userid (ssh login fails)');
			}
			else if(access == -4){opt1.setAttribute('class', 'blueclass');opt.setAttribute('class', 'blueclass');
				opt1.setAttribute('access',access );
                                opt1.setAttribute('disabled', true);
				opt.setAttribute('access',access );
				opt1.setAttribute('title',ip + ' : Insufficient execution privilege (cannot run privileged instructions with specified userid)');opt.setAttribute('title',ip + ' : Insufficient execution privilege (cannot run privileged instructions with specified userid)');}
			else if(access == -5){opt1.setAttribute('class', 'grayclass');opt.setAttribute('class', 'grayclass');
				opt1.setAttribute('access',access );
                                opt1.setAttribute('disabled', true);
				opt.setAttribute('access',access );
				opt1.setAttribute('title',ip + ' : Access check in progress');opt.setAttribute('title',ip + ' : Access check in progress');
			}
	        
			selProfile.appendChild(opt1);
	        selAddTargets.appendChild(opt);
	       
		    nodes1=selProfile.children;
			
		}

                dojo.style('ajaxloader', 'display','none');//1b1
                $j14('.ipadd').multiselect2side('destroy');
                $j14('.ipadd').multiselect2side({
		moveOptions: false,
		labelTop: '+ +',
		labelBottom: '- -',
		labelUp: '+',
		labelDown: '-',
		labelsx: '* Selected *',
		labeldx: 'Selected',
		search: "Find: "
                            });
                    
                    //Start: Multiselect2side checkbox set to alltargetmachines
                    $j14(".selectedIPs input:checkbox").each(function(){
                        $j14(this).attr("checked", false);
                    });
                    document.getElementById("alltargetmachines").checked = true;
                    //End: Multiselect2side checkbox set to alltargetmachines
                   
                    //Start: activate Target Machine tab Search
                    $j14('#search_machine').val('');//clear on reload
                    $j14(function() {
                        $j14('#ipadd_del').filterByText($j14('#search_machine'), false);//set true to select only one remaining ip
                    });
                    //End: activate Target Machine tab Search;
                    
                    //Start: Target Machine tab set to alltargetmachines
                    $j14(".selectedIPs_del input:checkbox").each(function(){
                        $j14(this).attr("checked", false);
                    });
                    document.getElementById("alltargetmachines_del").checked = true;
                    //End: Target Machine tab set to alltargetmachines
                    
	            }, function (err) {                                
                        dojo.style('ajaxloader', 'display','none');//1b2
		    myDialog3.set("title", "Error");
                    button_ok = "<center><button class='info-btn-ok' data-dojo-type='dijit/form/Button' id='button_ok' type='submit'>OK</button></center>";
                    myDialog3.set("content", "<div class='info-content'>Unable to fetch target machines from RAXAK server.\nPlease contact the raxak administrator, if the problem persists."+ "</div>"+button_ok);
                    myDialog3.set("style", "height:160px;");
                    myDialog3.show();
	            console.log( "ERROR: ", err );
       });
  });
});
}

function validationForRuleSelection(rulenum,content)
    {
        if (rulenum.length == 0)
    	{  
    	    myDialog2.set("title", "Info");
            button_ok = "<center><button class='info-btn-ok' data-dojo-type='dijit/form/Button' id='button_ok' type='submit'>OK</button></center>";
            myDialog2.set("content", "<div class='info-content'> Please select the rule to "+ content +"  </div>"+button_ok);
            myDialog2.show()
    	    return 0
    	}
    
    	return 1
    
}

require(["dojo/ready","dojo/io-query"], function(ready,ioQuery){
     ready(function(){
   	dojo.connect(dojo.byId("applyprofile_id"), "click", function(evt){
	var apply_status = dojo.attr("applyprofile_id", 'disabled');
		if(apply_status){
			return;
		}
	var ip = ""
    	var ip_access = ""
	var ip_invalid_list = ""
	var isInValidList = "false"
	var ip_invalid_list_title = ""
	ip_title_list=""
	var defaultStatusSelectionIP = ""
    var sel = document.getElementById("ipaddms2side__dx");
    var x ="";
    
        if ( sel.options.length < 1){
		myDialog2.set("title", "Error");
		button = "<center><button class='info-btn-ok' data-dojo-type='dijit/form/Button' id='submit_profile' type='submit'>OK</button></center>"
		myDialog2.set("content", "<div class='info-content'>Please select atleast one Target Machine.</div>"+button);
		myDialog2.show()
	}
    
	for (var i=0, iLen=sel.options.length; i<iLen; i++) {
	  	if(sel.options[i].selected == true)
	  		
                {
			console.log(sel.options[i].value)
			if(ip)
                         { 
			   console.log(sel.options[i].value)
                	   ip_access = sel.options[i].getAttribute('access')
			   ip_title = sel.options[i].getAttribute('title')
                               if (ip_access == 1)
				{	ip = ip + "," + sel.options[i].value }
				else
				{ 
					ip_invalid_list = ip_invalid_list + "," + sel.options[i].value 
					isInValidList = "true"
					var x = "* " + sel.options[i].value +" [ "+ sel.options[i].getAttribute('title') + " ] "
					if ( ip_title_list != ""){
						ip_title_list = ip_title_list+ " ; <br>"  + x
					}
					else
					{
						ip_title_list = x
					}
				}
			 }
			else
			 { 
                           ip_access = sel.options[i].getAttribute('access')
			   ip_title = sel.options[i].getAttribute('title')
			   ip_nickname = sel.options[i].getAttribute('nickname')
			   if (ip_access == 1){
			     	ip = sel.options[i].value
			        defaultStatusSelectionIP = ip
			   }
			   else 
                           { 
			     ip_invalid_list = ip_invalid_list + "," + sel.options[i].value
			     isInValidList = "true"
			     var x = "* " + sel.options[i].value +" [ "+ sel.options[i].getAttribute('title') + " ] "
				if ( ip_title_list != ""){
				   ip_title_list = ip_title_list+ " ; <br>"  + x
				 }
			        else
				 {
				   ip_title_list = x 

				 }
			  }
			}
			
	       }
	}

	if ( isInValidList == "true"){
		myDialog2.set("title", "Compliance execution on Target machine(s)");
		button = "<center><button class='info-btn-ok' data-dojo-type='dijit/form/Button' id='submit_profile' type='submit'>OK</button></center>"
		myDialog2.set("content", "<div class='info-content'>Cannot execute compliance checking on target machine(s) :- <br> "+  ip_title_list + " " +"</br>"+"</div>"+button);
		myDialog2.set("style","width:450px; height:160px;")
		myDialog2.show()
	}
     	//Commented is taken for future refrence. 	
	var autoremediate = "0"
    	show_profile = ""
	if (ip && ip.trim().length) { 
    	     dojo.empty("myselect1");
    	     dojo.empty("myselect2");
    	     dojo.empty("myselect3");
    	     dojo.empty("myselect4");
    	     dojo.empty("myselect5");
             var q = document.getElementsByName('radioGroup');
             var rate_values;
             if(document.getElementById('auto_radio').checked)
             {
                rate_value = document.getElementById('auto_radio').value;
              }
             else if(document.getElementById('manual_radio').checked)
             {
                rate_value = document.getElementById('manual_radio').value;
             }
	         autoremediate=rate_value

             for(var i = 0; i < q.length; i++){
             	if(q[i].checked){
                   rate_values = q[i].value;
	     		       // show_profile updating on selction of profile.	
			       show_profile = rate_values
			 	   break
                }
             }
	}
	else
	{
		return
	}

	//Updating ip selector and clears the archive log selector
	updateIpSelector()
	
    var uri = "/raxakapi/v1/runProfiles?ip="+ip+"&profile="+show_profile+"&autoremediate="+autoremediate;
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
		executedIPs = ip
	    profileRunIP=defaultStatusSelectionIP
		updateTimeSelector();
                dojo.style('ajaxloader', 'display','none');//18b
		var div = document.getElementById('indeterminateBar1');
		div.style.display = 'block';
	        document.getElementById("try").style.color = "blue"
		document.getElementById("try").innerHTML = "Compliance checking in progress(0%).....";
		dijit.byId("applyprofile_id").setAttribute('disabled',true);
		statusExecution = setTimeout(function () {checkStatusOfExecution() }, 10000);

            }, function (err) {                                         
            alert(err)                                                                      
            console.log( "ERROR: ", err );
       });
    
});  
     
	dojo.connect(dojo.byId("deleteip_id"), "click", function(evt){
		
		var idStatus = dojo.attr("deleteip_id", 'disabled');
		if(idStatus){
			return;
		}
		
		var ip = "";
		var target_mchn_handler = document.getElementById("ipadd_del");
		for (var i=0, iLen=target_mchn_handler.options.length; i<iLen; i++) {
		  	if(target_mchn_handler.options[i].selected ==true){
				if(ip)
					{
					ip = ip+ ',' +target_mchn_handler.options[i].value
					}
					else
					{
						ip= target_mchn_handler.options[i].value
					}
			}
		  }
		

   		if (ip != null) {
			if (ip.length==0)
		    {	
				myDialog2.set("title", "Info");
            			button = "<button class='info-btn' data-dojo-type='dijit/form/Button' id='leave_tab_ok' value='OK' type='submit'>OK</button>"
            			myDialog2.set("content", "<div class='info-content'>Please select a Target Machine</div>"+"<center>"+button+ "</center>");
           			myDialog2.set("style", "height:140px;");
            			myDialog2.show()
		     }
			else {
				myDialog2.set("title", "Confirmation");
				button = "<button class='info-btn' data-dojo-type='dijit/form/Button' id='submit_delete' value='OK' type='submit'>OK</button>"
				button_cancel = "<button class='info-btn' data-dojo-type='dijit/form/Button' id='cancel_delete' type='submit'>Cancel</button>"
				myDialog2.set("content", "<div class='info-content'> Are you sure, you want to delete the selected Target Machine?</div>"+"<center>"+button+ " " +button_cancel+"</center>");
				myDialog2.show()
				
			        dojo.connect(dojo.byId("submit_delete"), "click", function(evt){
	    			var uri = "/raxakapi/v1/deleteIP?username=raxak&ip="+ip;
                                dojo.style('ajaxloader', 'display','block');//7a
	    			dojo.xhrGet({       
	    		     			url : uri,                                     
	    		     			method: "GET",
	    		     			crossDomain: false,              
	    		     			handleAs: "json"                    
	    		    		     }).then(function (htmlResults) {             
    						for(var count= target_mchn_handler.options.length-1; count >= 0; count--) {
    						     //if the option is selected, delete the option
    						    if(target_mchn_handler.options[count].selected == true) {
  
    						            try {
    						                     target_mchn_handler.remove(count, null);
    						                     
    						             } catch(error) {
    						                     
    						                     target_mchn_handler.remove(count);
    						            }
    						    }
    						}
					

					if (target_mchn_handler.length < 1){
						dijit.byId("deleteip_id").setAttribute('disabled',true);
						dijit.byId("modifyip").setAttribute('disabled',true);
						dijit.byId("access_target_id").setAttribute('disabled',true);
					}
						
                                       dojo.style('ajaxloader', 'display','none');//7b1
	    		        }, function (err) {                                     
                                dojo.style('ajaxloader', 'display','none');//7b2    
	    		        alert(err)                                                                      
	    		        console.log( "ERROR: ", err );
	    		    	});
	    		 });//deleteIP End
			} //Else
		} //Top if
	});

    //Event Handler of modify ip address button	
    dojo.connect(dojo.byId("modifyip"), "click", function(evt){
		var idStatus = dojo.attr("modifyip", 'disabled');
		if(idStatus){
			return;
		}
		var target_machine_list_handler = document.getElementById("ipadd_del");

		var count_tmp = 0;		
		for (var i=0, iLen=target_machine_list_handler.options.length; i<iLen; i++) {
		  	if(target_machine_list_handler.options[i].selected ==true){
				count_tmp++
			}	
		}	
		if(count_tmp >= 2){
			myDialog2.set("title", "Info");
                        button_ok = "<center><button class='info-btn-ok' data-dojo-type='dijit/form/Button' id='button_ok' type='submit'>OK</button></center>"
			myDialog2.set("content", "<div class='info-content'>Please Select only one Target Machine</div>"+button_ok);
			myDialog2.show()
		}
		else{
		    full_mod_ip = target_machine_list_handler.value;
		    if(full_mod_ip == ''){	
		       	myDialog2.set("title", "Info");
            		button = "<button class='info-btn' data-dojo-type='dijit/form/Button' id='leave_tab_ok' value='OK' type='submit'>OK</button>"
            		myDialog2.set("content", "<div class='info-content'>Please select a Target Machine</div>"+"<center>"+button+ "</center>");
           		myDialog2.set("style", "height:140px;");
            		myDialog2.show()
		    }
                    else{
               		var full_mod_nickname = target_machine_list_handler.options[target_machine_list_handler.selectedIndex].text;
			if (full_mod_ip != null)
			{
	        	//Getting selected user name and ipaddress. 		
		    	var arr = full_mod_ip.split("@");
		   	 var user_name = arr[0];
		    	mod_ip = arr[1];
		    	if (full_mod_ip.length!=0)
		    	{
			    dijit.byId("formDialogmod").reset(); 	
		    	    dijit.byId("formDialogmod").show();
		    	}
		    	else{	
		       		myDialog2.set("title", "Info");
            			button = "<button class='info-btn' data-dojo-type='dijit/form/Button' id='leave_tab_ok' value='OK' type='submit'>OK</button>"
            			myDialog2.set("content", "<div class='info-content'>Please select a Target Machine</div>"+"<center>"+button+ "</center>");
           			myDialog2.set("style", "height:140px;");
            			myDialog2.show()
		    	}
		    	document.getElementById("usernamemod").value= user_name; 
		    	document.getElementById("ipaddressmod").value = mod_ip;   
			if(full_mod_nickname.indexOf('@') === -1){
                    	    document.getElementById("nicknamemod").value = full_mod_nickname;
			}
		    }//if block
		   }
		}
	
    });

    //This function validate all input checks for modify ip address. 
    function validateSubmitData(user_name,ip_address,nickname){
	check=/^[a-zA-Z0-9!#$%^&*'-+/=?_`{|}~]+$/
	check_nickname=/^[a-zA-Z0-9_-]+$/

    	user_name = user_name.trim()
    	nickname = nickname.trim()
    	if(user_name=='' && ip_address==''){
		myDialog2.set("title", "Error");
            	button = "<button class='info-btn' data-dojo-type='dijit/form/Button' id='leave_tab_ok' value='OK' type='submit'>OK</button>"
            	myDialog2.set("content", "<div class='info-content'>Please enter Username and IP Address</div>"+"<center>"+button+ "</center>");
           	myDialog2.set("style", "height:140px;");
            	myDialog2.show()
    	  return 0
        }
    	if(user_name == ''){
		myDialog2.set("title", "Error");
            	button = "<button class='info-btn' data-dojo-type='dijit/form/Button' id='leave_tab_ok' value='OK' type='submit'>OK</button>"
            	myDialog2.set("content", "<div class='info-content'>Please enter Username</div>"+"<center>"+button+ "</center>");
           	myDialog2.set("style", "height:140px;");
            	myDialog2.show()
    	  return 0
    	}
    	if (ip_address == ''){
		myDialog2.set("title", "Error");
            	button = "<button class='info-btn' data-dojo-type='dijit/form/Button' id='leave_tab_ok' value='OK' type='submit'>OK</button>"
            	myDialog2.set("content", "<div class='info-content'>Please enter IP Address</div>"+"<center>"+button+ "</center>");
           	myDialog2.set("style", "height:140px;");
            	myDialog2.show()
    	  return 0
    	}
        if(ip_address != ''){
            RegE = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
            if(!ip_address.match(RegE)) { 
		myDialog2.set("title", "Error");
            	button = "<button class='info-btn' data-dojo-type='dijit/form/Button' id='leave_tab_ok' value='OK' type='submit'>OK</button>"
            	myDialog2.set("content", "<div class='info-content'>Please enter a valid IP Address</div>"+"<center>"+button+ "</center>");
           	myDialog2.set("style", "height:140px;");
            	myDialog2.show()
                return 0
            }
        }
	if((user_name.length < 1 ) || (user_name.length > 20)){
		myDialog2.set("title", "Error");
            	button = "<button class='info-btn' data-dojo-type='dijit/form/Button' id='leave_tab_ok' value='OK' type='submit'>OK</button>"
            	myDialog2.set("content", "<div class='info-content'>Username should not be more than 20 characters</div>"+"<center>"+button+ "</center>");
           	myDialog2.set("style", "height:140px;");
            	myDialog2.show()
		return 0
	}
	if((user_name !='') && user_name.match(' ')){	
		myDialog2.set("title", "Error");
            	button = "<button class='info-btn' data-dojo-type='dijit/form/Button' id='leave_tab_ok' value='OK' type='submit'>OK</button>"
            	myDialog2.set("content", "<div class='info-content'>Spaces not allowed in Username</div>"+"<center>"+button+ "</center>");
           	myDialog2.set("style", "height:140px;");
            	myDialog2.show()
		return 0 
	
	}
    	if (!user_name.match(check)){
		myDialog2.set("title", "Error");
            	button = "<button class='info-btn' data-dojo-type='dijit/form/Button' id='leave_tab_ok' value='OK' type='submit'>OK</button>"
            	myDialog2.set("content", "<div class='info-content'>Please enter a valid Username</div>"+"<center>"+button+ "</center>");
           	myDialog2.set("style", "height:140px;");
            	myDialog2.show()
    	  return 0
    	}
	if((nickname.length < 0 ) || (nickname.length > 20)){
		myDialog2.set("title", "Error");
            	button = "<button class='info-btn' data-dojo-type='dijit/form/Button' id='leave_tab_ok' value='OK' type='submit'>OK</button>"
            	myDialog2.set("content", "<div class='info-content'>Nickname should not be more than 20 characters</div>"+"<center>"+button+ "</center>");
           	myDialog2.set("style", "height:140px;");
            	myDialog2.show()
		return 0
	}
	if((nickname !='') && nickname.match(' ')){	
		myDialog2.set("title", "Error");
        	button = "<button class='info-btn' data-dojo-type='dijit/form/Button' id='leave_tab_ok' value='OK' type='submit'>OK</button>"
        	myDialog2.set("content", "<div class='info-content'>Spaces not allowed in Nickname</div>"+"<center>"+button+ "</center>");
        	myDialog2.set("style", "height:140px;");
        	myDialog2.show()
		return 0
	}
    	if ((nickname != '') && (!nickname.match(check))){
		myDialog2.set("title", "Error");
            	button = "<button class='info-btn' data-dojo-type='dijit/form/Button' id='leave_tab_ok' value='OK' type='submit'>OK</button>"
            	myDialog2.set("content", "<div class='info-content'>Please enter a valid Nickname</div>"+"<center>"+button+ "</center>");
           	myDialog2.set("style", "height:140px;");
            	myDialog2.show()
    	  return 0
    	}
    return 1	
    }	
    
    //Event handler of submit button of modify ip address 	
    dojo.connect(dojo.byId("submit1"), "click", function(evt){
    var user_name = document.getElementById("usernamemod").value;
   
	var submit_ip = document.getElementById("ipaddressmod").value;
	var nicknamemod = document.getElementById("nicknamemod").value;
	var return_status=validateSubmitData(user_name,submit_ip,nicknamemod);
	user_name = user_name.trim()
	if(return_status)
	{   
            var add_delete_handler = document.getElementById("ipadd_del");
             var target_machine_list_handler = document.getElementById("ipadd_del");
             full_mod_ip = target_machine_list_handler.value;
	     var full_sub_ip = user_name+'@'+submit_ip; 
             var full_mod_nickname = target_machine_list_handler.options[target_machine_list_handler.selectedIndex].text;                
	     if (full_sub_ip!=null && ( (full_sub_ip!=full_mod_ip) || (full_mod_nickname!=nicknamemod) ) ){
	         var uri = "/raxakapi/v1/modifyIP?username=raxak&ip="+full_mod_ip+"&currentip="+full_sub_ip+"&nickname="+nicknamemod;
                 dojo.style('ajaxloader', 'display','block');//8a
    		 dojo.xhrGet({       
       		 url : uri,                                     
       		 method: "GET",                               
       		 crossDomain: false,              
       		 handleAs: "text"                    
       	         }).then(function (htmlResults) {             
				updateSelectedProfilePage();
                                dojo.style('ajaxloader', 'display','none');//8b1
			 },function (err) {                         
                dojo.style('ajaxloader', 'display','none');//8b2             
            	alert(err);
            	console.log( "ERROR: ", err );
       		  });
	     }//inner if

       }//outer if
    });


    dojo.connect(dojo.byId("describerule_id"), "click", function(evt){

	var value = dojo.byId("manual").value;
	rulenum = value.substring(2);
        //Checking the rule number validation
        return_value =validationForRuleSelection(rulenum," see the description.");
        if (return_value == 0)
        {
        		return
        }

	console.log(rulenum);


     var checkString;
     var fixString;

    var uri = "/raxakapi/v1/showCheckRule/"+rulenum

    dojo.xhrGet({       
       url : uri,                                     
       method: "GET",                               
       crossDomain: false,              
       handleAs: "text"                    
       }).then(function (htmlResults) { 
	if (htmlResults.match("Unable to fetch")){
		myDialog2.set("title", "Error");
            	button = "<button class='info-btn' data-dojo-type='dijit/form/Button' id='leave_tab_ok' value='OK' type='submit'>OK</button>"
            	myDialog2.set("content", "<div class='info-content'>Unable to fetch description of the rule.\nPlease contact the raxak administrator, if the problem persists.</div>"+"<center>"+button+ "</center>");
           	myDialog2.set("style", "height:140px;");
            	myDialog2.show()
	}
	else{

		var res = htmlResults.split("\n");
		checkString = "<h2><b class='focus-top' tabindex='0'>Check Description: </b></h2>"
		for(i=0;i<res.length;i++)
		{
			checkString = checkString + "<p>" + res[i] + "<\p>";  
		}
	}
    	
    var uri = "/raxakapi/v1/showFixRule/"+rulenum
    dojo.xhrGet({       
       url : uri,                                     
       method: "GET",                               
       crossDomain: false,              
       handleAs: "text"                    
       }).then(function (htmlResults) { 
	if (htmlResults.match("Unable to fetch")){
		myDialog2.set("title", "Error");
            	button = "<button class='info-btn' data-dojo-type='dijit/form/Button' id='leave_tab_ok' value='OK' type='submit'>OK</button>"
            	myDialog2.set("content", "<div class='info-content'>Unable to fetch description of the rule.\nPlease contact the raxak administrator, if the problem persists.</div>"+"<center>"+button+ "</center>");
           	myDialog2.set("style", "height:140px;");
            	myDialog2.show()
	}
	else{    
		var res = htmlResults.split("\n");
		fixString = "<h2><b>Fix Description: </b></h2>"
		for(i=0;i<res.length;i++)
		{
			fixString = fixString + "<p>" + res[i] + "<\p>";  
		}

		button = "<center><button style='text-align: center' data-dojo-type='dijit/form/Button' type='submit'>Close</button></center>"
		myDialog.set("title", "Rule " + value);
		myDialog.set("content", checkString + fixString + button);
		myDialog.set("style","width: 450px; border:1px solid #b7b7b7; background:#fff; margin:0 auto; height:300px;")
		myDialog.show()
            }}, function (err) {                                         
            alert(err)                                                                      
            console.log( "ERROR: ", err );
	});
            }, function (err) {                                         
            alert(err)                                                                      
            console.log( "ERROR: ", err );
       });
       });

    dojo.connect(dojo.byId("describerule1_id"), "click", function(evt){

	var value = dojo.byId("success").value;
	rulenum = value.substring(2);
	//Checking the rule number validation
    	return_value =validationForRuleSelection(rulenum," see the description.");
	
    	if (return_value == 0)
    	{
    		return
    	}

	console.log(rulenum);

     var checkString; 
     var fixString;

var uri = "/raxakapi/v1/showCheckRule/"+rulenum
    dojo.xhrGet({       
       url : uri,                                     
       method: "GET",                               
       crossDomain: false,              
       handleAs: "text"                    
       }).then(function (htmlResults) {  
	if (htmlResults.match("Unable to fetch")){
		myDialog2.set("title", "Error");
            	button = "<button class='info-btn' data-dojo-type='dijit/form/Button' id='leave_tab_ok' value='OK' type='submit'>OK</button>"
            	myDialog2.set("content", "<div class='info-content'>Unable to fetch description of the rule.\nPlease contact the raxak administrator, if the problem persists.</div>"+"<center>"+button+ "</center>");
           	myDialog2.set("style", "height:140px;");
            	myDialog2.show()
	}
	else{      
		var res = htmlResults.split("\n");
	
        	checkString = "<h2><b class='focus-top' tabindex='0'>Check Description: </b></h2>"
		for(i=0;i<res.length;i++)
		{
			checkString = checkString + "<p>" + res[i] + "<\p>";  
		}
	}
    var uri = "/raxakapi/v1/showFixRule/"+rulenum

    dojo.xhrGet({       
       url : uri,                                     
       method: "GET",                               
       crossDomain: false,              
       handleAs: "text"                    
       }).then(function (htmlResults) {             
	if (htmlResults.match("Unable to fetch")){
		myDialog2.set("title", "Error");
            	button = "<button class='info-btn' data-dojo-type='dijit/form/Button' id='leave_tab_ok' value='OK' type='submit'>OK</button>"
            	myDialog2.set("content", "<div class='info-content'>Unable to fetch description of the rule.\nPlease contact the raxak administrator, if the problem persists.</div>"+"<center>"+button+ "</center>");
           	myDialog2.set("style", "height:140px;");
            	myDialog2.show()
	}
	else{
		var res = htmlResults.split("\n");
		fixString = "<h2><b>Fix Description: </b></h2>"
		for(i=0;i<res.length;i++)
		{
			fixString = fixString + "<p>" + res[i] + "<\p>";  
		}

		button = "<center><button style='text-align: center' data-dojo-type='dijit/form/Button' type='submit'>Close</button></center>"
		myDialog.set("title", "Rule " + value);
		myDialog.set("content", checkString + fixString + button);
		myDialog.set("style","width: 450px; border:1px solid #b7b7b7; background:#fff; margin:0 auto; height:300px;")
		myDialog.show()
           	}}, function (err) {                                         
            	alert(err)                                                                      
            	console.log( "ERROR: ", err );
		});
            	}, function (err) {                                         
            	alert(err)                                                                      
            	console.log( "ERROR: ", err );
       		});
       	});


    dojo.connect(dojo.byId("desrule_id"), "click", function(evt){

	var value = dojo.byId("failed").value;
	rulenum = value.substring(2)
    	//Checking the rule number validation
	return_value = validationForRuleSelection(rulenum," see the description");
    	if (return_value == 0)
    	{
    		return
    	}

	console.log(rulenum);

     var checkString;
     var fixString;

    var uri = "/raxakapi/v1/showCheckRule/"+rulenum

    dojo.xhrGet({       
       url : uri,                                     
       method: "GET",                               
       crossDomain: false,              
       handleAs: "text"                    
       }).then(function (htmlResults) {  
	if (htmlResults.match("Unable to fetch")){
		myDialog2.set("title", "Error");
            	button = "<button class='info-btn' data-dojo-type='dijit/form/Button' id='leave_tab_ok' value='OK' type='submit'>OK</button>"
            	myDialog2.set("content", "<div class='info-content'>Unable to fetch description of the rule.\nPlease contact the raxak administrator, if the problem persists.</div>"+"<center>"+button+ "</center>");
           	myDialog2.set("style", "height:140px;");
            	myDialog2.show()
	}
	else{
           
		var res = htmlResults.split("\n");
        	checkString = "<h2><b class='focus-top' tabindex='0'>Check Description: </b></h2>"
		for(i=0;i<res.length;i++)
		{
			checkString = checkString + "<p>" + res[i] + "<\p>";  
		}
	}
    var uri = "/raxakapi/v1/showFixRule/"+rulenum

    dojo.xhrGet({       
       url : uri,                                     
       method: "GET",                               
       crossDomain: false,              
       handleAs: "text"                    
       }).then(function (htmlResults) {             
	
	if (htmlResults.match("Unable to fetch")){
		myDialog2.set("title", "Error");
            	button = "<button class='info-btn' data-dojo-type='dijit/form/Button' id='leave_tab_ok' value='OK' type='submit'>OK</button>"
            	myDialog2.set("content", "<div class='info-content'>Unable to fetch description of the rule.\nPlease contact the raxak administrator, if the problem persists.</div>"+"<center>"+button+ "</center>");
           	myDialog2.set("style", "height:140px;");
            	myDialog2.show()
	}
	else{
		var res = htmlResults.split("\n");
		fixString = "<h2><b>Fix Description: </b></h2>"
		for(i=0;i<res.length;i++)
		{
			fixString = fixString + "<p>" + res[i] + "<\p>";  
		}

		button = "<center><button style='text-align: center' data-dojo-type='dijit/form/Button' type='submit'>Close</button></center>"
		myDialog.set("title", "Rule " + value);
		myDialog.set("content", checkString + fixString + button);
		myDialog.set("style","width: 450px; border:1px solid #b7b7b7; background:#fff; margin:0 auto; height:300px;")
		myDialog.show()
           	}}, function (err) {                                         
            alert(err)                                                                      
            console.log( "ERROR: ", err );
	});
            }, function (err) {                                         
            alert(err)                                                                      
            console.log( "ERROR: ", err );
     });

     });
     });
});

require(["dojo/ready", "dojo/io-query"], function(ready, ioQuery){
	ready (function(){
	
	var uri = "/raxakapi/v1/whoAmI";
	
	dojo.xhrGet({
		url: uri,
		method: "GET",
		crossDomain: false,
		handleAs: "json"
		}).then(function( htmlResults ){
			var json = htmlResults;
			if (json == null) {
				// redirect to login page
				window.location.replace('https://www.cloudraxak.net/login.html');
				}
			else {
				var login = document.getElementById('loginmessage');
				login.innerHTML = "<b>User:</b> " + json['email'];
				}
			}, function (err) {                                         
            			alert(err)                                                                      
            			console.log( "ERROR: ", err );
       			});
 		});
 	});	
				
require(["dojo/ready", "dojo/io-query"], function(ready, ioQuery){
	ready (function(){
	
	var uri = "/raxakapi/v1/version";
	
	dojo.xhrGet({
		url: uri,
		method: "GET",
		crossDomain: false,
		handleAs: "text"
		}).then(function( htmlResults ){
			var login = document.getElementById('codeversion');
			login.innerHTML = "<b>Version:</b> " + htmlResults;

			}, function (err) {                                         
            			alert(err)                                                                      
            			console.log( "ERROR: ", err );
       			});
 		});
 	});


require(["dojo/ready","dojo/io-query"], function(ready,ioQuery){
     ready(function(){

    var uri = "/raxakapi/v1/profiles";

    dojo.xhrGet({       
       url : uri,                                     
       method: "GET",                               
       crossDomain: false,              
       handleAs: "json"                    
       }).then(function (htmlResults) {             
          var json = htmlResults
          var container = document.getElementById('demo');
          for (key in json) {
          		var radio1 = document.createElement('input');
          		radio1.id = 'myRadioId1';
                radio1.type = 'radio';
                radio1.name = 'radioGroup';
				radio1.value = key;
				//ASG - Temp hardcoded to Demonstration Profile 
				if(key == 'Demonstration Profile')
				{
					radio1.checked= 'true';
					dojo.query("label[for=selected_profile]")[0].innerHTML = key;
				}
                          
                var label1 = document.createElement('label');
                label1.setAttribute('for', radio1.id);
		label1.setAttribute('title', json[key]);
		label1.setAttribute('class', 'radio-label-hover-txt');
                label1.innerHTML = key + '<br>' + '<br>'
                             
                container.appendChild(radio1);
                container.appendChild(label1);
			}
            }, function (err) {                                         
            //	alert(err)                                                                      
            console.log( "ERROR: ", err );
       		});
});
});



//This function intends to populate the ips in ip selector. 
//clear the archive log selector.
function updateIpSelector()
{
    var success_sel = document.getElementById("myselect1");
    var failure_sel = document.getElementById("myselect2");
    var manual_sel = document.getElementById("myselect3");
    var console_sel = document.getElementById("myselect4");
    var report_sel = document.getElementById("myselect5");
    var ipadd_handler = document.getElementById("ipaddms2side__dx");
    var opt;
    for (var i=0, iLen=ipadd_handler.options.length; i<iLen; i++) {
    	if(ipadd_handler.options[i].selected ==true){
    	    opt_value = ipadd_handler.options[i].value;
	    opt = ipadd_handler.options[i].getAttribute('nickname');
   	    var val = opt
   	    access_val = ipadd_handler.options[i].getAttribute('access')
   	    if (access_val==1){
   	        var success_opt = document.createElement('option');
   	   	success_opt.innerHTML = val;
   	   	success_opt.value = opt_value;
   	   	var failure_opt = document.createElement('option');
   	   	failure_opt.innerHTML = val;
   	   	failure_opt.value = opt_value;
   	   	var manual_opt = document.createElement('option');
   	   	manual_opt.innerHTML = val;
   	   	manual_opt.value = opt_value;
   	   	var console_opt = document.createElement('option');
   	   	console_opt.innerHTML = val;
   	   	console_opt.value = opt_value;
   	   	var report_opt = document.createElement('option');
   	   	report_opt.innerHTML = val;
   	   	report_opt.value = opt_value;
   	   
   	   	success_sel.appendChild(success_opt); 
   	   	failure_sel.appendChild(failure_opt); 
   	   	manual_sel.appendChild(manual_opt); 
   	   	console_sel.appendChild(console_opt);
   	   	report_sel.appendChild(report_opt); 
   	    }
   	}
    }
   

}



require(["dojo/ready" ], function(ready){
     ready(function(){

		dojo.connect(dojo.byId("myselect1"), "onchange", function(evt){
	     		var x = document.getElementById("myselect1").value;
			onChangeIpSelValue(x)
	     		dojo.stopEvent(evt);
		 });
		dojo.connect(dojo.byId("myselect2"), "onchange", function(evt){
	     		var x = document.getElementById("myselect2").value;
			onChangeIpSelValue(x)
	     		dojo.stopEvent(evt);
		 });
		dojo.connect(dojo.byId("myselect3"), "onchange", function(evt){
	     		var x = document.getElementById("myselect3").value;
			onChangeIpSelValue(x)
	     		dojo.stopEvent(evt);
		 });
		dojo.connect(dojo.byId("myselect4"), "onchange", function(evt){
	     		var x = document.getElementById("myselect4").value;
			onChangeIpSelValue(x)
	     		dojo.stopEvent(evt);
		 });
		dojo.connect(dojo.byId("myselect5"), "onchange", function(evt){
	     		var x = document.getElementById("myselect5").value;
			onChangeIpSelValue(x)
			updateReportPans()
	     		dojo.stopEvent(evt);
		 });
		//Binding event for all history-log selectors.
		dojo.connect(dojo.byId("myselect1varlog"), "onchange", function(evt){
	     		var y = document.getElementById("myselect1varlog").value;
			onChangeTimeStmpSelValue(y)
	     		dojo.stopEvent(evt);
		 });

		dojo.connect(dojo.byId("myselect2varlog"), "onchange", function(evt){
	     		var y = document.getElementById("myselect2varlog").value;
			onChangeTimeStmpSelValue(y)
	     		dojo.stopEvent(evt);
		 });

		dojo.connect(dojo.byId("myselect3varlog"), "onchange", function(evt){
	     		var y = document.getElementById("myselect3varlog").value;
			onChangeTimeStmpSelValue(y)
	     		dojo.stopEvent(evt);
		 });

		dojo.connect(dojo.byId("myselect4varlog"), "onchange", function(evt){
	     		var y = document.getElementById("myselect4varlog").value;
			onChangeTimeStmpSelValue(y)
	     		dojo.stopEvent(evt);
		 });

		dojo.connect(dojo.byId("myselect5varlog"), "onchange", function(evt){
	     		var y = document.getElementById("myselect5varlog").value;
			onChangeTimeStmpSelValue(y)
			//Updating report panes on selection of file from archive sel of Report Log tab. 
			updateReportPans()
	     		dojo.stopEvent(evt);
		});

     });
});

function checkData(user_val, user_ip, user_nickname, flag_modify){
                        flag_modify = (typeof flag_modify === "undefined") ? false : true;
			check_user=/^[a-zA-Z0-9!#$%^&*'-+/=?_`{|}~]+$/
			check_nickname=/^[a-zA-Z0-9_-]+$/
			user_val = user_val.trim();
                        
                        if(user_nickname !== ''){
                            user_nickname = user_nickname.trim();
                        }
	       		if(user_val == '' && user_ip==''){
				myDialog2.set("title", "Error");
            			button = "<button class='info-btn' data-dojo-type='dijit/form/Button' id='leave_tab_ok' value='OK' type='submit'>OK</button>"
            			myDialog2.set("content", "<div class='info-content'>Please enter Username and IP Address</div>"+"<center>"+button+ "</center>");
           			myDialog2.set("style", "height:140px;");
            			myDialog2.show()
			}
			else if(user_ip==''){
				myDialog2.set("title", "Error");
            			button = "<button class='info-btn' data-dojo-type='dijit/form/Button' id='leave_tab_ok' value='OK' type='submit'>OK</button>"
            			myDialog2.set("content", "<div class='info-content'>Please enter IP Address</div>"+"<center>"+button+ "</center>");
           			myDialog2.set("style", "height:140px;");
            			myDialog2.show()
			}
			else if(user_val == ''){
				myDialog2.set("title", "Error");
            			button = "<button class='info-btn' data-dojo-type='dijit/form/Button' id='leave_tab_ok' value='OK' type='submit'>OK</button>"
            			myDialog2.set("content", "<div class='info-content'>Please enter Username</div>"+"<center>"+button+ "</center>");
           			myDialog2.set("style", "height:140px;");
            			myDialog2.show()
			}
			else if((user_val.length < 1) || (user_val.length > 20)){
				
				myDialog2.set("title", "Error");
            			button = "<button class='info-btn' data-dojo-type='dijit/form/Button' id='leave_tab_ok' value='OK' type='submit'>OK</button>"
            			myDialog2.set("content", "<div class='info-content'>Username should not be more than 20 characters</div>"+"<center>"+button+ "</center>");
           			myDialog2.set("style", "height:140px;");
            			myDialog2.show()
			}
			else if((user_val !='') && user_val.match(' ')){	
				myDialog2.set("title", "Error");
            			button = "<button class='info-btn' data-dojo-type='dijit/form/Button' id='leave_tab_ok' value='OK' type='submit'>OK</button>"
            			myDialog2.set("content", "<div class='info-content'>Spaces not allowed in Username</div>"+"<center>"+button+ "</center>");
           			myDialog2.set("style", "height:140px;");
            			myDialog2.show()
			}
			else if(!user_val.match(check_user)){
				myDialog2.set("title", "Error");
            			button = "<button class='info-btn' data-dojo-type='dijit/form/Button' id='leave_tab_ok' value='OK' type='submit'>OK</button>"
            			myDialog2.set("content", "<div class='info-content'>Please enter a valid Username</div>"+"<center>"+button+ "</center>");
           			myDialog2.set("style", "height:140px;");
            			myDialog2.show()
			}
			else if((user_nickname.length < 0 ) || (user_nickname.length > 20)){
				
				myDialog2.set("title", "Error");
            			button = "<button class='info-btn' data-dojo-type='dijit/form/Button' id='leave_tab_ok' value='OK' type='submit'>OK</button>"
            			myDialog2.set("content", "<div class='info-content'>Nickname should not be more than 20 characters</div>"+"<center>"+button+ "</center>");
           			myDialog2.set("style", "height:140px;");
            			myDialog2.show()
			}
			else if((user_nickname !='') && user_nickname.match(' ')){	
				myDialog2.set("title", "Error");
            			button = "<button class='info-btn' data-dojo-type='dijit/form/Button' id='leave_tab_ok' value='OK' type='submit'>OK</button>"
            			myDialog2.set("content", "<div class='info-content'>Spaces not allowed in Nickname</div>"+"<center>"+button+ "</center>");
           			myDialog2.set("style", "height:140px;");
            			myDialog2.show()
			}
			else if((user_nickname != '') && (!user_nickname.match(check_nickname))){
				myDialog2.set("title", "Error");
            			button = "<button class='info-btn' data-dojo-type='dijit/form/Button' id='leave_tab_ok' value='OK' type='submit'>OK</button>"
            			myDialog2.set("content", "<div class='info-content'>Please enter a valid Nickname</div>"+"<center>"+button+ "</center>");
           			myDialog2.set("style", "height:140px;");
            			myDialog2.show()
			}
		   else{
			RegE = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
				if(user_ip.match(RegE)) { 
				ip= user_val + '@' + user_ip
				ip_list_target = [];
				var selAddTargets = document.getElementById('ipadd_del');
				var sel = document.getElementById("ipadd");	
				
                                if (user_nickname == ''){
                                    user_nickname = ip;
                                }
                                
				nodes=selAddTargets.childNodes;
                last_index = nodes.length
				for(var i=0; i<nodes.length; i++) {
					ip_list_target.push(nodes[i].value);
				}
			    val = ip_list_target.indexOf(ip);
    			if (val != -1){
				myDialog2.set("title", "Error");
            			button = "<button class='info-btn' data-dojo-type='dijit/form/Button' id='leave_tab_ok' value='OK' type='submit'>OK</button>"
            			myDialog2.set("content", "<div class='info-content'>IP address " + ip + " " + "already in list  </div>"+"<center>"+button+ "</center>");
           			myDialog2.set("style", "height:140px;");
            			myDialog2.show()
				}
				else {
					    var opt = document.createElement('option');
					   	opt.innerHTML = user_nickname;
						opt.value = ip;
						opt.setAttribute('class','grayclass');
						opt.setAttribute('title',ip + ' : Access check in progress');

						var opt1 = document.createElement('option');
					   	opt1.innerHTML = user_nickname;
						opt1.value = ip;
						opt1.setAttribute('class','grayclass');
						opt1.setAttribute('title',ip + ' : Access check in progress');
						sel.appendChild(opt1);
						selAddTargets.appendChild(opt);
		
				    var uri = "/raxakapi/v1/addIP?username=raxak&ip="+ip+"&nickname="+user_nickname
				   
                                   dojo.style('ajaxloader', 'display','block');//5a
                                   
				    dojo.xhrGet({       
				       url : uri,                                     
				       method: "GET",                               
				       crossDomain: false,              
				       handleAs: "json"                    
				       }).then(function (htmlResults) {  
					var arrayOfObjects = eval(htmlResults);
				   	ip_add = arrayOfObjects[0].ip;
				    	nickname = arrayOfObjects[0].nickname;
                   		    	ip_access = arrayOfObjects[0].access;
                    		    	selAddTargets.remove(last_index)
					if (ip_access == -2){
				        opt.setAttribute('class', 'pingnotreachableclass');
				        opt.setAttribute('title',ip + ' : Unable to reach IP address');
			        }
			        else if(ip_access == 1 ){opt.setAttribute('class', 'pingreachclass');
             				opt.setAttribute('title',ip + ' : ALL OK');
			        }
			        else if(ip_access == -1){opt.setAttribute('class', 'orangeclass');
					opt.setAttribute('title',ip + ' : OS not supported');
			        }
			        else if(ip_access == -3){opt.setAttribute('class', 'yellowclass');
					opt.setAttribute('title',ip + ' : Unable to log in with specified userid (ssh login fails)');
			        }
			        else if(ip_access == -4){opt.setAttribute('class', 'blueclass');
					opt.setAttribute('title',ip + ' : Insufficient execution privilege');
			        }
	                selAddTargets.appendChild(opt);	
					
						
						dijit.byId("deleteip_id").setAttribute('disabled',false);
						dijit.byId("modifyip").setAttribute('disabled',false);
						dijit.byId("access_target_id").setAttribute('disabled',false);
						
                                                dojo.style('ajaxloader', 'display','none');//5b1
					
					    }, function (err) { 
                                            dojo.style('ajaxloader', 'display','none');//5b2
					    alert(err)                                                                      
					    console.log( "ERROR: ", err );
				       });	
						} }
					 else {
						myDialog2.set("title", "Error");
            					button = "<button class='info-btn' data-dojo-type='dijit/form/Button' id='leave_tab_ok' value='OK' type='submit'>OK</button>"
            					myDialog2.set("content", "<div class='info-content'> Please enter valid IP Address</div>"+"<center>"+button+ "</center>");
           					myDialog2.set("style", "height:140px;");
            					myDialog2.show()

				      }	
		document.getElementById('ipaddress').value='';
		document.getElementById('username').value='root';
  		}
		var nickval = document.getElementById('nickname2').value='';
}

//checkAccess api call
require(["dojo/ready","dojo/io-query"], function(ready,ioQuery){
     ready(function(){

	 dojo.connect(dojo.byId("access_target_id"), "click", function(evt){
		var idStatus = dojo.attr("access_target_id", 'disabled');
		if(idStatus){
			return;
		}
		
	    ip = ""
		var defaultStatusSelectionIP = ""
		var selAddTargets = document.getElementById('ipadd_del');
		for (var i=0, iLen=selAddTargets.options.length; i<iLen; i++) {
		  	if(selAddTargets.options[i].selected ==true){
				myDialog2.set("title", "Info");
                                button_ok = "<center><button class='info-btn-ok' data-dojo-type='dijit/form/Button' id='button_ok' type='submit'>OK</button></center>"
				myDialog2.set("content", "<div class='info-content'>Retesting of access to the selected entries, it will take some time to complete..</div>"+button_ok);
				myDialog2.show()
   			    setTimeout("myDialog2.hide()", 3000); 
		
				if(ip)
					{
					ip = ip+ ',' +selAddTargets.options[i].value
					}
					else
					{
						ip= selAddTargets.options[i].value
					}
			}
		  }
		if(ip != ""){
			var uri = "/raxakapi/v1/checkAccess?username=raxak&ip="+ip
                        dojo.style('ajaxloader', 'display','block');//6a
                        
				dojo.xhrGet({       
				url : uri,                                     
				method: "GET",                               
				crossDomain: false,              
				handleAs: "json"                    
				}).then(function (htmlResults) {             
				var arrayOfObjects = eval(htmlResults); 
				for(var i in arrayOfObjects) {
					var opt = document.createElement('option');
					target_ip = arrayOfObjects[i].ip;
					nickname = arrayOfObjects[i].nickname;
					target_access = arrayOfObjects[i].access;
					opt.innerHTML =	nickname;
					opt.value = target_ip;
					if (target_access == -2){opt.setAttribute('class', 'pingnotreachableclass');opt.setAttribute('title',target_ip + 'Unable to reach IP address');
					}
					else if(target_access == 1 ){opt.setAttribute('class', 'pingreachclass');opt.setAttribute('title',target_ip + ' : ALL OK');
					}
					else if(target_access == -1){opt.setAttribute('class', 'orangeclass');opt.setAttribute('title',target_ip + 'OS not supported');
					}
					else if(target_access == -3){opt.setAttribute('class', 'yellowclass');opt.setAttribute('title',target_ip + 'Unable to log in with specified userid (ssh login fails)');
					}
					else if(target_access == -4){opt.setAttribute('class', 'blueclass');opt.setAttribute('title',target_ip + 'Insufficient execution privilege');}
					else if(target_access == -5){opt.setAttribute('class', 'grayclass');opt.setAttribute('title',target_ip + 'Access check in progress');
					}
					selAddTargets.remove(selAddTargets.selectedIndex);
					selAddTargets.appendChild(opt);
			
				}
                                dojo.style('ajaxloader', 'display','none');//6b
			});
		}
		else{myDialog2.set("title", "Info");
				//ASG - Should be proper standard message - modified for the demo purpose
				button_ok = "<center><button class='info-btn-ok' data-dojo-type='dijit/form/Button' id='button_ok' type='submit'>OK</button></center>"
				myDialog2.set("content", "<div class='info-content'>Please select a Target Machine" + "</div>"+button_ok);
				myDialog2.show()}
		});	
	});
});
function difference_dialog(){
				if(selectedTimeStamp == 'None'){
				    myDialog2.set("title", "Info");
				    button_ok = "<center><button class='info-btn-ok' data-dojo-type='dijit/form/Button' id='button_ok' type='submit'>OK</button></center>"
					myDialog2.set("content", "<div class='info-content'>Please click on Apply profile to see the difference " + "</div>"+button_ok);
					myDialog2.show()	
				}
			   else{
			    	dijit.byId("diffDialog").show();
					//get all the titles of rules
	 				map_title = {};
	 				//var uri = "/raxakapi/v1/ruleTitle/"+profile;
	 				var uri = "/raxakapi/v1/ruleTitle/"+show_profile;
                                        dojo.style('ajaxloader', 'display','block');//9a
					 dojo.xhrGet({       
					   url : uri,                                     
					   method: "GET",                               
					   crossDomain: false,              
					   handleAs: "json"                    
					   }).then(function (htmlResults) {             
					   	var list1 = eval(htmlResults); 
						for (var i = 0; i < list1.length; ++i) {
							var rule = list1[i].rule;
							var title = list1[i].title;
							map_title[rule] = title;
					 	}
					 });

					 executed_on_latest = ""
					 var uri = "/raxakapi/v1/showExecutionStatus/"+profileRunIP;
						 dojo.xhrGet({       
						 url : uri,
						 method: "GET",                               
						 crossDomain: false,              
						 handleAs: "text"                    
						 }).then(function (htmlResults) { 
							 time_string2=htmlResults.split("Rules execution completed on : ");	
							 executed_on_latest = time_string2[1].replace('"','');
					}) ; 
	 				
					var rule_data = {};
					var titleString;
					sel_profile = ""
					exe_mode_latest = ""
					var date_obj = new Date(selectedTimeStamp);
					var utc_time = date_obj.toUTCString();
					// get the rules status with the timestamp
					var uri = "/raxakapi/v1/showrun/"+profileRunIP+"?timestamp="+utc_time;
					   dojo.xhrGet({       
				       url : uri,                                     
				       method: "GET",                               
				       crossDomain: false,              
				       handleAs: "text"                    
				       }).then(function (htmlResults) {             
						var arrayOfObjects = eval(htmlResults);
						rule_count = arrayOfObjects.length
						var stringConsole = ""
						var stringReport = ""
						var selSuccess = document.getElementById('success');
					 	var selFailed = document.getElementById('failed');
					 	var selManual = document.getElementById('manual');
                                                selSuccess.innerHTML = "";selFailed.innerHTML="";selManual.innerHTML="";//#102: Changes by Abhishek
						for(var i in arrayOfObjects) {
						    lis = []
							var json = JSON.parse(arrayOfObjects[i])
							stringReport = stringReport+"\nstatus :"+json.status+"\noutcome :"+json.outcome+"\nconsole:"+json.console+json.rule
							stringReport = stringReport + "\n"
							rulenum = json.rule
							outcome = json.outcome
							lis.push(outcome)
							rule_data[rulenum]=lis
							rule_no =  rulenum.substr(2);
						}
                                                dojo.style('ajaxloader', 'display','none');//9b
					});
					// comparison of latestrule with the timestamp
					 dojo.empty("table1");
					 dojo.empty("diff_table");
					 var uri = "/raxakapi/v1/showrun/"+profileRunIP;
                                         dojo.style('ajaxloader', 'display','block');//10a
							   dojo.xhrGet({       
						       url : uri,                                     
						       method: "GET",                               
						       crossDomain: false,              
						       handleAs: "text"                    
						       }).then(function (htmlResults) {
								var arrayOfObjects = eval(htmlResults);
								rule_count = arrayOfObjects.length
								var stringConsole = ""
								var stringReport = ""
								var diffDialog = document.getElementById('diffDialog');
								var table2 = document.createElement('diff_table');
								var table = document.createElement('table1');
								    
								var link = document.createElement("A");
							    var href = document.createAttribute('href');
							    var link1 = document.createElement("A");
							    
								var th = document.createElement('th');
								var text = document.createTextNode('Rules with same results');
								th.appendChild(text);
								th.setAttribute('colspan','2');
								th.setAttribute('class','thclass');
								table1.appendChild(th);
								var tr = document.createElement('tr');
								tr.setAttribute('class','trclass');
								var td = document.createElement('td');
								var text3 = document.createTextNode('Rule(s)');
								var td4 = document.createElement('td');
								td4.setAttribute('class','td2class');
								var text4 = document.createTextNode('Results'); 
								td.appendChild(text3);
								td4.appendChild(text4);
								tr.appendChild(td);
								tr.appendChild(td4);
								table1.appendChild(tr);
								
								var table2 = document.getElementById("diff_table");
								var th11 = document.createElement('th');
								var text11 = document.createTextNode('Rules with different results');
								th11.appendChild(text11);
								th11.setAttribute('colspan', '3');
								th11.setAttribute('class', 'thclass');
								table2.appendChild(th11);
								var tr8 = document.createElement('tr');
								tr8.setAttribute('class','trclass');
							    var td8 = document.createElement('td');
							    var td9 = document.createElement('td');
							    var td10 = document.createElement('td');
							    var text8 = document.createTextNode('Rule(s)');
							    var text9 = document.createTextNode(executed_on_latest);
							    var text10 = document.createTextNode(executed_on);
							    td8.appendChild(text8);
							    td9.appendChild(text9);
							    td10.appendChild(text10);
							
							    tr8.appendChild(td8);
							    tr8.appendChild(td9);
							    tr8.appendChild(td10);
							    table2.appendChild(tr8);
							    same_count = 0;
								diff_count = 0;
								for(var i in arrayOfObjects) {
									var json = JSON.parse(arrayOfObjects[i])
									stringReport = stringReport+"\nstatus :"+json.status+"\noutcome :"+json.outcome+"\nconsole:"+json.console+json.rule
									stringReport = stringReport + "\n"
									outcome = json.outcome
									rulenum = json.rule
									sel_profile = json.profile
									exe_mode_latest = json.exemode
 									var rule_status = rule_data[rulenum][0];
									var tr = document.createElement('tr');
									var tr8 = document.createElement('tr');
									var link = document.createElement('A');
									var link1 = document.createElement('A');
									if ( outcome == rule_status)
									{
										same_count = same_count+1;
										var tr = document.createElement('tr'); 
										var td1 = document.createElement('td');
										td1.setAttribute('class','td1class');
		  								var text1 = document.createTextNode(map_title[rulenum]);
		  								link.setAttribute('href',"javascript:ShowruleDesc('"+rulenum+"')");
		  								link.appendChild(text1);
		  								td1.appendChild(link);
		  								var td2 = document.createElement('td');
										td2.setAttribute('class','td2class');
										outcome_upper = outcome.charAt(0).toUpperCase() + outcome.slice(1);
		  								var text2 = document.createTextNode(outcome_upper); 
                                         
										td2.appendChild(text2);
										tr.appendChild(td1);
										tr.appendChild(td2);
										
										table1.appendChild(tr);
									}
									else
									{
										diff_count = diff_count+1;
										var tr55 = document.createElement('tr');
									    var td55 = document.createElement('td');
									    td55.setAttribute('class','td55class');
									    var td66 = document.createElement('td');
									    td66.setAttribute('class','td66class');
									    var td77 = document.createElement('td');
									    td77.setAttribute('class','td77class');
									    var text55 = document.createTextNode(map_title[rulenum]);
									    link1.setAttribute('href',"javascript:ShowruleDesc('"+rulenum+"')");
                                        outcome_upper = outcome.charAt(0).toUpperCase() + outcome.slice(1);
										var text66 = document.createTextNode(outcome_upper);
										rule_status_upper = rule_status.charAt(0).toUpperCase() + rule_status.slice(1);
										var text77 = document.createTextNode(rule_status_upper);
									    link1.appendChild(text55);
									    td55.appendChild(link1);
									    td66.appendChild(text66);
									    td77.appendChild(text77);
									    tr55.appendChild(td55);
									    tr55.appendChild(td66);
									    tr55.appendChild(td77);
									
									    table2.appendChild(tr55);
									}
								}
								document.body.appendChild(diffDialog); 	
                                                                dojo.style('ajaxloader', 'display','none');//10b
						});
           					
						   var uri = "/raxakapi/v1/getIPDetails?ip="+profileRunIP;
                                                   dojo.style('ajaxloader', 'display','block');//11a
						   dojo.xhrGet({       
							  url : uri,                                     
							  method: "GET",                               
							  crossDomain: false, 
							  handleAs: "json"
							  }).then(function (htmlResults) {             
							var arrayOfObjects = eval(htmlResults);
							os_name=arrayOfObjects.os;
							os_version=arrayOfObjects.os_version;
							hostname=arrayOfObjects.hostname;
							os_name_in_caps=os_name.charAt(0).toUpperCase() + os_name.slice(1);
							os = os_name_in_caps+" Release "+os_version;
							//Adding host to table cell
					    		host_id=document.getElementById('hosta');
					    		host_id.innerHTML = hostname
					    		host_id=document.getElementById('hostb');
								host_id.innerHTML = hostname
							//Adding os to table cell
					    		os_id=document.getElementById('osa');
					    		os_id.innerHTML = os
					    		os_id=document.getElementById('osb');
								os_id.innerHTML = os 
							//Adding profile to table cell
					    		profile_id=document.getElementById('proa');
								profile_id.innerHTML = sel_profile
								profile_id=document.getElementById('prob');
								profile_id.innerHTML = show_profile
							//Adding executedon to table cell
								exeon_id=document.getElementById('exeona');
								exeon_id.innerHTML = executed_on_latest;
								exeon_id=document.getElementById('exeonb');
								exeon_id.innerHTML = executed_on;
							//Adding execution mode to table cell
					    	exec_id=document.getElementById('exema')
					    	if (exe_mode_latest == "1")
								exec_id.innerHTML = "Automatic Remediation" 
							else
								exec_id.innerHTML = "Manual Remediation" 
					    	exec_id=document.getElementById('exemb')
							if (show_execmode == "1")
								exec_id.innerHTML = "Automatic Remediation" 
							else
								exec_id.innerHTML = "Manual Remediation" 
					 		var totalrule = success+failed+manual;
					 		var new_rule = totalrule-(same_count+diff_count)
					 		rule_count=document.getElementById('totalrule');
							rule_count.innerHTML =  totalrule+" "+"total rules" +"("+same_count+" "+ "rules with same results," + diff_count+" "+"rule(s) with different result(s)," + new_rule+" "+"rule(s) present in only one report"+")"
                                                        dojo.style('ajaxloader', 'display','none');//11b
						   });	
 }
}
	 
// check the Description of title in comparision  	
function ShowruleDesc(rulenum){
	rulenum = rulenum.substring(2);
	console.log(rulenum);
	
     var checkString;
     var fixString;

    var uri = "/raxakapi/v1/showCheckRule/"+rulenum
	dojo.style('ajaxloader', 'display','block');//12a
    dojo.xhrGet({       
       url : uri,                                     
       method: "GET",                               
       crossDomain: false,              
       handleAs: "text"                    
       }).then(function (htmlResults) {             
	var res = htmlResults.split("\n");
	
        checkString = "<h2><b class='focus-top' tabindex='0'>Check Description: </b></h2>"
	for(i=0;i<res.length;i++)
	{
		checkString = checkString + "<p>" + res[i] + "<\p>"; 
	}

    var uri = "/raxakapi/v1/showFixRule/"+rulenum
    dojo.xhrGet({       
       url : uri,                                     
       method: "GET",                               
       crossDomain: false,              
       handleAs: "text"                    
       }).then(function (htmlResults) {             
	var res = htmlResults.split("\n");
	fixString = "<h2><b>Fix Description: </b></h2>"
	for(i=0;i<res.length;i++)
	{
		fixString = fixString + "<p>" + res[i] + "<\p>";  
	}
        dojo.style('ajaxloader', 'display','none');//12b1

	button = "<center><button style='text-align: center' data-dojo-type='dijit/form/Button' type='submit'>Close</button></center>"
	myDialog.set("title", "Rule " + rulenum);
	myDialog.set("content", checkString + fixString + button);
	myDialog.set("style","width: 450px; height:300px;")
	myDialog.show()
            }, function (err) {        
            dojo.style('ajaxloader', 'display','none');//12b2
            alert(err)                                                                      
            console.log( "ERROR: ", err );
	});
            }, function (err) {                                         
                dojo.style('ajaxloader', 'display','none');//12b3
            alert(err)                                                                      
            console.log( "ERROR: ", err );
     });  
}
 
function dismissRules(){
   //This function dismiss the rules on click event of dismiss button.
   var value = dojo.byId("manual").value;
   rulenum = value.substring(2);
   //Checking the rule number validation
    return_value =validationForRuleSelection(rulenum," dismiss.");
    if (return_value == 0)
    {
    		return
    }

   console.log(rulenum);
   var uri = "/raxakapi/v1/dismiss/V-"+rulenum+"?ip="+profileRunIP;
   dojo.xhrGet({       
      url : uri,                                     
      method: "GET",                               
      crossDomain: false,              
      handleAs: "text"                    
      }).then(function (htmlResults) {             
	       	updateStatusPans()
                }, function (err) {                                         
                alert(err)                                                                      
                console.log( "ERROR: ", err );
           });

}

function remediateFailedRules()
{
   //This function remediate the failed rules on click event of Remediate button.
    var value = dojo.byId("failed").value;
    rulenum = value.substring(2);
    //Checking the rule number validation
    return_value =validationForRuleSelection(rulenum," remediate.");
    if (return_value == 0)
    {
    		return
    }

    console.log(rulenum);

    var uri = "/raxakapi/v1/fixRule/V-"+rulenum+"?ip="+profileRunIP;
    dojo.style('ajaxloader', 'display','block');//13a
    dojo.xhrGet({       
       url : uri,                                     
       method: "GET",                               
       crossDomain: false,              
       handleAs: "text"                    
       }).then(function (htmlResults) { 
		myDialog2.set("title", "Info");
            	button = "<button class='info-btn' data-dojo-type='dijit/form/Button' id='leave_tab_ok' value='OK' type='submit'>OK</button>"
        	myDialog2.set("content", "<div class='info-content'> Please enter valid IP Address</div>"+"<center>"+button+ "</center>");  
		myDialog2.set("content", "<div class='info-content'>" + htmlResults + "</div>"+"<center>"+button+ "</center>");  
          	myDialog2.set("style", "height:140px;");
            	myDialog2.show()
		updateStatusPans()
                dojo.style('ajaxloader', 'display','none');//13b1
            }, function (err) {                                  
            dojo.style('ajaxloader', 'display','none');//13b2
            alert(err)                                                                      
            console.log( "ERROR: ", err );
       });

}

function testAgain()
{
   //This function test agian the failed rules on click event of Test Again button.
    var value = dojo.byId("failed").value;
    rulenum = value.substring(2);
    //Checking the rule number validation
    return_value =validationForRuleSelection(rulenum," test again.");
    if (return_value == 0)
    {
    		return
    }

    console.log(rulenum);

    var uri = "/raxakapi/v1/checkRule/V-"+rulenum+"?ip="+profileRunIP;
    dojo.style('ajaxloader', 'display','block');//14a
    dojo.xhrGet({       
       url : uri,                                     
       method: "GET",                               
       crossDomain: false,              
       handleAs: "text"                    
       }).then(function (htmlResults) {             
		myDialog2.set("title", "Rule Status : V-"+rulenum);
                button = "<center><button class='info-btn-ok' data-dojo-type='dijit/form/Button' id='button_ok' type='submit'>OK</button></center>";
		myDialog2.set("content", "<div class='info-content'>" + htmlResults + "</div>"+"<center>"+button+ "</center>");
		myDialog2.show()
		updateStatusPans()
                dojo.style('ajaxloader', 'display','none');//14b1
            }, function (err) {                         
            dojo.style('ajaxloader', 'display','none');//14b2
            alert(err)                                                                      
            console.log( "ERROR: ", err );
       });

}
// on reload the last executed ips list in success/failure/manual/console tabs
require(["dojo/ready","dojo/io-query"], function(ready,ioQuery){
    ready(function(){
    var uri = "/raxakapi/v1/getlastrunIPs";
    dojo.style('ajaxloader', 'display','block');//15a
    dojo.xhrGet({       
       url : uri,                                     
       method: "GET",                               
       crossDomain: false,              
       handleAs: "json"                    
       }).then(function (htmlResults) {
        var  obj_values = eval(htmlResults)
	var ips = ""
        if (obj_values != null){
	ip_list = Object.keys(obj_values);
        var success_sel = document.getElementById("myselect1");
	    var failure_sel = document.getElementById("myselect2");
	    var manual_sel = document.getElementById("myselect3");
	    var console_sel = document.getElementById("myselect4");
	    var report_sel = document.getElementById("myselect5");
        for (i in obj_values){
        	var val = obj_values[i];
		if(ips){
			ips = ips + "," + i
		}
		else
		{
			ips = i
		}
        	var opt1 = document.createElement('option');
		    	opt1.innerHTML = val;
			opt1.value = i;
			var opt2 = document.createElement('option');
			opt2.innerHTML = val;
			opt2.value = i;
			var opt3 = document.createElement('option');
			opt3.innerHTML = val;
			opt3.value = i;
			var opt4 = document.createElement('option');
			opt4.innerHTML = val;
			opt4.value = i;
			var opt5 = document.createElement('option');
			opt5.innerHTML = val;
			opt5.value = i;

			success_sel.appendChild(opt1); 
			failure_sel.appendChild(opt2); 
			manual_sel.appendChild(opt3); 
			console_sel.appendChild(opt4);
			report_sel.appendChild(opt5); 
        }
        }
	profileRunIP = ip_list[0];
        dojo.style('ajaxloader', 'display','none');//15b
	executedIPs = ips
	flag=true
	statusExecution = setTimeout(function () {checkStatusOfExecution(flag) }, 100);
       });
    });
 });
