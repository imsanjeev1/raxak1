/*
 #  (c) 2014, Cloud Raxak Inc. All Rights Reserved
 */

 var profileRunIP = "None";
 var statusExecution;
var executedIPs = "None"; // To check the status of rules execution of list of the IPs
var show_profile = " ";//To hold the profile name which has to be displayed in report tab.
var show_execmode = "0";//To hold the execution mode which has to be displayed in report tabe.
var success = manual = failed = 0; //To track the success,failure,manual count for rule sets
var selectedTimeStamp = "None"; //To track the selected timestamp from archive log selector. 
var executed_on = "";//To track the archive/latest/last run timestamp.It is used to show the time in report tab.
var latest_client_time = "";
var sel_profile = "";
var defaultTimeout = 100000;//Default timeout for ajax request is set to 10 sec.
var flagIpChanges;
var compliance_in_progress = false;
var show_report_result = true;
var user_action= 'add_by_ip_details';//for csv upload
var csv_ip_detail=[];//for csv upload
var csvFileFlag=false;//for csv upload
var tmCount = 0;//To hold target machine count
var compliance_ip = "";
var txtareaContentConsoleTab = '';
var flagTriggerSort = false;
var consoleLogData;//for consoleTab search
var consoleTextarea;
var severityCountReport = []; //To track the success,failure,manual count for rule sets

var detailed_page_report_print_url = '';
var get_comaprision_differnce_report_url = '';
var executingTM = '';//executing compliance check IPs

var menu_tab_select_flag = {
    'select_profile':false,
    'apply_profile':false,
    'success':false,
    'failure':false,
    'manual':false,
    'console_log':false,
    'report_log':false,
    'schedule':false,
    'target_machines':false
};

require(["dijit/Dialog", "dojo/domReady!"], function (Dialog) {

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
    // myDialog4 => Other(Report)
    myDialog4 = new Dialog({
        title: "My Dialog",
        parseOnLoad: true,
        content: "Cloud Raxak",
        style: "width: 350px; border:1px solid #b7b7b7; background:#fff; margin:0 auto; height:140px;"
    });
});


require(["dojo/ready", "dojo/aspect", "dijit/registry", "dijit/layout/TabContainer", "dijit/layout/ContentPane"],
    function (ready, aspect, registry) {

        ready(function () {
                document.getElementById('image-holder-page').style.display = "none";//hide loader asa dom is ready
                var tabContainer1 = registry.byId("main_tabContainer");

                aspect.around(tabContainer1, "selectChild", function (selectChild) {
                    return function (page) {
                        if (flagIpChanges === false) {
                            if (confirm("If you leave before saving selected target machines, your changes will be lost.\n Do you want to leave this tab and discard your changes or stay on this tab?")) {
                                selectChild.apply(this, arguments);
                                flagIpChanges = 'undefined';
                            }
                        } else {
                            selectChild.apply(this, arguments);
                        }
                    }
                });
            });
    });

function hideMessage() {
    $j14("#id_trace").fadeOut(2000);
}        


var getProfileIps = function () {
    var multipleValues = [];
    if ($j14("#ipaddms2side__dx").length > 0) {
        $j14("#ipaddms2side__dx option").each(function () {
            multipleValues.push($j14(this).val())
        });
    }
    return multipleValues;
};

var saveProfileIps = function () {
    flagIpChanges = true;
    var ips = getProfileIps();
    var uri = "/raxakapi/v1/setSelectedTMs/?username=raxak&ips=" + ips;
    dojo.xhrGet({
        url: uri,
        method: "get",
        crossDomain: false,
        handleAs: "json",
        //timeout: defaultTimeout
        timeout: 100000
    }).then(function (htmlResults) {
    }, function (err) {
        if ('timeout' === err.dojoType) {
            myDialog3.set("title", "Timeout Error");
            button_ok = "<center><button class='info-btn-ok' data-dojo-type='dijit/form/Button' id='button_ok' type='submit'>OK</button></center>";
            myDialog3.set("content", "<div class='info-content'>Retry the web page by clicking the refresh/reload button, <br> if the problem persists then please contact the raxak administrator for further assistance.</div>" + button_ok);
            myDialog3.set("style", "height:160px;width:450px;");
            myDialog3.show();
        } else {
            myDialog3.set("title", "Error");
            button_ok = "<center><button class='info-btn-ok' data-dojo-type='dijit/form/Button' id='button_ok' type='submit'>OK</button></center>";
            myDialog3.set("content", "<div class='info-content'> Unable to perform compliance checking.\nPlease contact the raxak administrator, if the problem persists.</div>" + button_ok);
            myDialog3.set("style", "height:160px;width:450px;");
            myDialog3.show();
        }
    });
};
var saveTargetedIps = function () {
    flagIpChanges = true;
    var ips = getProfileIps();
    var uri = "/raxakapi/v1/setSelectedTMs/?username=raxak&ips=" + ips;
    dojo.xhrGet({
        url: uri,
        method: "get",
        crossDomain: false,
        handleAs: "json",
        //timeout: defaultTimeout
        timeout: 100000
    }).then(function (htmlResults) {
        var sel = document.getElementById("ipaddms2side__dx");
        if (sel.options.length < 1) {
            myDialog2.set("title", "Error");
            button = "<center><button class='info-btn-ok' data-dojo-type='dijit/form/Button' id='select_ips' type='submit'>OK</button></center>"
            myDialog2.set("content", "<div class='info-content'>Please select atleast one Target Machine to save.</div>" +button);
            myDialog2.set("style", "height:140px;");
            myDialog2.show()
        } else{
            myDialog2.set("title", "Info");
            button = "<center><button class='info-btn-ok' data-dojo-type='dijit/form/Button' id='save_ips' type='submit'>OK</button></center>"
            myDialog2.set("content", "<div class='info-content'>Selected Target Machine(s) have been saved</div>" +button);
            myDialog2.set("style", "height:140px;");
            myDialog2.show()
            setTimeout("myDialog2.hide()", 1500);
        }

    }, function (err) {
        if ('timeout' === err.dojoType) {
         myDialog3.set("title", "Timeout Error");
         button_ok = "<center><button class='info-btn-ok' data-dojo-type='dijit/form/Button' id='button_ok' type='submit'>OK</button></center>";
         myDialog3.set("content", "<div class='info-content'>Retry the web page by clicking the refresh/reload button, <br> if the problem persists then please contact the raxak administrator for further assistance.</div>" + button_ok);
         myDialog3.set("style", "height:160px;width:450px;");
         myDialog3.show();
     } else {
        myDialog3.set("title", "Error");
        button_ok = "<center><button class='info-btn-ok' data-dojo-type='dijit/form/Button' id='button_ok' type='submit'>OK</button></center>";
        myDialog3.set("content", "<div class='info-content'> Unable to save the Target Machine(s).\nPlease contact the raxak administrator, if the problem persists.</div>" + button_ok);
        myDialog3.set("style", "height:160px;width:450px;");
        myDialog3.show();
    } 
});
};
function updateStatusPans() {
    require(["dojo/ready", "dojo/io-query"], function (ready, ioQuery) {
        ready(function () {

	    //show_profile = "";
            //empty global variable for reinitialization
            executed_on = ""  
            dojo.empty("success");
            dojo.empty("manual");
            dojo.empty("failed");
            if (profileRunIP == "None" || profileRunIP == null)
            {
		//To fix git #421 issue.
        	dojo.style('warningLabel', 'display', 'none');
        	dojo.style('resultTable', 'display', 'inline-table');
		//Disable all the buttons 
		dijit.byId("success_des_rule_id").setAttribute('disabled',true);
            	dijit.byId("fail_des_rule_id").setAttribute('disabled', true);
            	dijit.byId("manual_des_rule_id").setAttribute('disabled', true);
		dijit.byId("dismis_id").setAttribute('disabled', true);
		dijit.byId("force_remediate").setAttribute('disabled', true);
                dijit.byId("remediate_id").setAttribute('disabled', true);
                dijit.byId("testagain_id").setAttribute('disabled', true);
                dijit.byId("diff_id").setAttribute('disabled', true);
		dijit.byId("report_detailed_log").setAttribute('disabled', true);
                return
            }

            // By default Enabling the remediate,dismiss,testagain button.
            dijit.byId("success_des_rule_id").setAttribute('disabled', false);
            dijit.byId("fail_des_rule_id").setAttribute('disabled', false);
            dijit.byId("manual_des_rule_id").setAttribute('disabled', false);
            dijit.byId("dismis_id").setAttribute('disabled', false)
            dijit.byId("force_remediate").setAttribute('disabled', false)
            dijit.byId("remediate_id").setAttribute('disabled', false)
            dijit.byId("testagain_id").setAttribute('disabled', false)

            //Creating url on the basis of timestamp.	
            var timeStamp = "";
            selectedTimeStamp_mod = selectedTimeStamp.replace(/\s/g, '');
            latest_client_time_mod = latest_client_time.replace(/\s/g, '');
            dojo.style('ajaxloader', 'display', 'block');//3a
            //If block :- This case will be executed when user selects archive log.	
            if (selectedTimeStamp != "None" & selectedTimeStamp_mod != latest_client_time_mod)
            {
                var date_obj = new Date(selectedTimeStamp);
                var utc_time = date_obj.toUTCString();
                var uri = "/raxakapi/v1/showrun/" + profileRunIP + "?timestamp=" + utc_time;
                compliance_in_progress = false
                executed_on = selectedTimeStamp
                //Disabling the remediate,dismiss,testagain button.
                dijit.byId("dismis_id").setAttribute('disabled', true)
                dijit.byId("force_remediate").setAttribute('disabled', true)
                dijit.byId("remediate_id").setAttribute('disabled', true)
                dijit.byId("testagain_id").setAttribute('disabled', true)
                dijit.byId("diff_id").setAttribute('disabled', false)

            }
            else
            {
                //Else block :- This case will be executed when user do not select last run ips	
                updateTimeSelector();
                dijit.byId("diff_id").setAttribute('disabled', true)
                var uri = "/raxakapi/v1/showrun/" + profileRunIP;
            } //end else block

            dojo.xhrGet({
                url: uri,
                method: "GET",
                crossDomain: false,
                handleAs: "text",
                timeout: defaultTimeout
            }).then(function (htmlResults) {
                var arrayOfObjects = eval(htmlResults);
                count = arrayOfObjects.length;
                var consoleData = [];
                for (var i in arrayOfObjects) {
                    var json = JSON.parse(arrayOfObjects[i]);
                    show_profile = json.profile;
                    consoleData.push(JSON.parse(arrayOfObjects[i]));
                }
                consoleLogData = consoleData;//consoleLogData is global
                //get all the titles of rule numbers
                map_title = {};
                rule_profile = show_profile
                var uri = "/raxakapi/v1/ruleTitle/" + rule_profile;
                dojo.xhrGet({
                    url: uri,
                    method: "GET",
                    crossDomain: false,
                    handleAs: "json",
                    timeout: defaultTimeout
                }).then(function (htmlResults) {
                    var list1 = eval(htmlResults);
                    for (var i = 0; i < list1.length; ++i) {
                        var rule = list1[i].rule;
                        var title = list1[i].title;
                        map_title[rule] = title;
                    }
                    var stringConsole = ""
                    var selSuccess = document.getElementById('success');
                    var selFailed = document.getElementById('failed');
                    var selManual = document.getElementById('manual');
                    success = manual = failed = 0;
                    severityCountReport = [];
                    var tmpSeverityData = {};
                    //Show profile value updating from the file data
                    selSuccess.innerHTML = "";
                    selFailed.innerHTML = "";
                    selManual.innerHTML = "";//#102: Changes by Abhishek
                    for (var i in arrayOfObjects) {
                        var json = JSON.parse(arrayOfObjects[i])
                        show_profile = json.profile
                        show_execmode = json.exemode
                        stringConsole = stringConsole + json.console
                        stringConsole = stringConsole + "\n"
                        var opt = document.createElement('option');
                        outcome = json.outcome;
                        var ruleSeverity = json.severity;

                        opt.innerHTML = "Rule: " + json.rule + " " + outcome;
                        opt.value = json.rule;
                        if ((outcome.search("successful")) > -1)
                        {
                            success++;
                            tmpSeverityData = {status: 'success', severity: ruleSeverity, count: success, rulenum: json.rule};
                            severityCountReport.push(tmpSeverityData);
                            opt.setAttribute('title', map_title[opt.value]);
                            selSuccess.appendChild(opt);
                        }
                        else if ((outcome.search("manual")) > -1)
                        {
                            manual++;
                            tmpSeverityData = {status: 'manual', severity: ruleSeverity, count: manual, rulenum: json.rule};
                            severityCountReport.push(tmpSeverityData);
                            opt.setAttribute('title', map_title[opt.value]);
                            selManual.appendChild(opt);
                        }
                        else if ((outcome.search("failed")) > -1)
                        { 
                            failed++;
                            tmpSeverityData = {status: 'failed', severity: ruleSeverity, count: failed, rulenum: json.rule};
                            severityCountReport.push(tmpSeverityData);
                            opt.setAttribute('title', map_title[opt.value]);
                            selFailed.appendChild(opt);
                        }
                    }
                    //Success        
                    var s_id = document.getElementById('success');
                    var s_elem = s_id.childNodes;
                    if (s_elem.length == 0) {
                        dijit.byId("success_des_rule_id").setAttribute('disabled', true)
                    }
                    //Failure        
                    var id = document.getElementById('failed');
                    var elem = id.childNodes;
                    if (elem.length == 0) {
                        dijit.byId("fail_des_rule_id").setAttribute('disabled', true)
                        dijit.byId("remediate_id").setAttribute('disabled', true)
                        dijit.byId("testagain_id").setAttribute('disabled', true)
                    }
                    //Manual        
                    var m_id = document.getElementById('manual');
                    var m_elem = m_id.childNodes;
                    if (m_elem.length == 0) {
                        dijit.byId("manual_des_rule_id").setAttribute('disabled', true);
                        dijit.byId("dismis_id").setAttribute('disabled', true);
                        dijit.byId("force_remediate").setAttribute('disabled', true);
                    }
                    //This event place only  where we update the 'Selected Profile:'. 
                    profile2_id = document.getElementById('profile_val_Id');
                    profile2_id.innerHTML = show_profile
                    profile3_id = document.getElementById('profile_failure_Id');
                    profile3_id.innerHTML = show_profile
                    profile4_id = document.getElementById('profile_manual_Id');
                    profile4_id.innerHTML = show_profile
                    profile5_id = document.getElementById('profile_console_Id');
                    profile5_id.innerHTML = show_profile

	    	//This functionality intends to check the inaccessiblity of ip
	    	// after running apply profile.Hide/Display the information in all tabe.
            if ((outcome.search("INACCESSIBLE")) > -1)
            {
               var opt1 = document.createElement('option');
               opt1.style.color = "red";
               opt1.innerHTML = stringConsole;
               document.getElementById('success').appendChild(opt1);

               var opt2 = document.createElement('option');
               opt2.style.color = "red";
               opt2.innerHTML = stringConsole;
               var selFailed = document.getElementById('success');
               document.getElementById('failed').appendChild(opt2);

               var opt3 = document.createElement('option');
               opt3.style.color = "red";
               opt3.innerHTML = stringConsole;
               document.getElementById('manual').appendChild(opt3);
               show_report_result = false	

               document.getElementById('textarea_id').style.color = "red";
           }
           else {
	    		//Hiding the Information.
	    		show_report_result = true	
               document.getElementById('textarea_id').style.color = "black";
           }				

                // To resolve this issue git280.As profile in report Log tab is empty
                //when user runs(my ip) from other machine.
                profile_id = document.getElementById('profileId');
                profile_id.innerHTML = show_profile

                //Calling API to get the time-status for profilerunIp
                document.getElementById("textarea_id").innerHTML = stringConsole;
                consoleTextarea = $j14("#textarea_id").html();

                txtareaContentConsoleTab = stringConsole;
                dojo.style('ajaxloader', 'display', 'none');//2b 3b
                updateReportPans();

                //Start: activate Customized tab Search [activateSearch_Customized(selectorId, searchIdInput);]
                activateSearch_Customized('success', 'search_success_rule');
                activateSearch_Customized('failed', 'search_failure_rule');
                activateSearch_Customized('manual', 'search_manual_rule');
                //End: activate Customized tab Search;
                
                $j14('#search_console_rule').val('');
                $j14('#search_console_div_id a').css("display", "none");

            }, function (err) {
                if ('timeout' === err.dojoType) {
                    myDialog3.set("title", "Timeout Error");
                    button_ok = "<center><button class='info-btn-ok' data-dojo-type='dijit/form/Button' id='button_ok' type='submit'>OK</button></center>";
                    myDialog3.set("content", "<div class='info-content'>Retry the web page by clicking the refresh/reload button, <br> if the problem persists then please contact the raxak administrator for further assistance.</div>" + button_ok);
                    myDialog3.set("style", "height:160px;width:450px;");
                    myDialog3.show();
                }
            });
}, function (err) {
    if ('timeout' === err.dojoType) {
        myDialog3.set("title", "Timeout Error");
        button_ok = "<center><button class='info-btn-ok' data-dojo-type='dijit/form/Button' id='button_ok' type='submit'>OK</button></center>";
        myDialog3.set("content", "<div class='info-content'>Retry the web page by clicking the refresh/reload button, <br> if the problem persists then please contact the raxak administrator for further assistance.</div>" + button_ok);
        myDialog3.set("style", "height:160px;width:450px;");
        myDialog3.show();
    } else {

        myDialog3.set("title", "Error");
        button_ok = "<center><button class='info-btn-ok' data-dojo-type='dijit/form/Button' id='button_ok' type='submit'>OK</button></center>";
        myDialog3.set("content", "<div class='info-content'>Unable to load the compliance execution information.\nPlease contact the raxak administrator, if the problem persists." + "</div>" + button_ok);
        myDialog3.set("style", "height:160px;");
        myDialog3.show();
        console.log("ERROR: ", err);
    }
});
});
});
}

//Udating the report table.
function updateReportPans() {

    if (profileRunIP == "None")
        return

    dojo.style('ajaxloader', 'display', 'block');//4a

    var uri = "/raxakapi/v1/getIPDetails/?ip=" + profileRunIP;
    dojo.xhrGet({
        url: uri,
        method: "GET",
        crossDomain: false,
        handleAs: "json",
        timeout: defaultTimeout
    }).then(function (htmlResults) {
        var mapOfObjects = eval(htmlResults);
        var os = mapOfObjects['os'];
        var os_version = mapOfObjects['os_version'];
        var hostname = mapOfObjects['hostname'];

        //os_name_in_caps=os_name.charAt(0).toUpperCase() + os_name.slice(1);
        os = os + " Release " + os_version;

        header_id = document.getElementById('th2');
        //Adding header to table cell
        //If variable executed_on is empty then compliance checking in progress
        if (compliance_in_progress == true){
			header_id.innerHTML = "Compliance checking in progress";
			header_id.style.color = "blue"
			document.getElementById("try").style.display = 'block';
			document.getElementById("myselect1varlog").selectedIndex ="0";
			document.getElementById("myselect2varlog").selectedIndex ="0";
			document.getElementById("myselect3varlog").selectedIndex ="0";
			document.getElementById("myselect4varlog").selectedIndex ="0";
			document.getElementById("myselect5varlog").selectedIndex ="0";

        }
        else {
        	header_id.innerHTML = "Completed on : " + executed_on;
            header_id.style.color = "black"
        }

        //Adding hostName to table cell
        host_id = document.getElementById('hostId');
        host_id.innerHTML = hostname
        //Adding osName to table cell
        os_id = document.getElementById('osId');
        os_id.innerHTML = os

        //Adding IP Address to table cell
        var arr = profileRunIP.split("@");
        var ip = arr[1];
        ip_address = document.getElementById('ipAddress');
        ip_address.innerHTML = ip

        //Selected profile in report tab
        profile_id = document.getElementById('profileId');
        profile_id.innerHTML = show_profile

        if (show_report_result == false)
        {
		//Hiding Report table and showing warning label.
       dojo.style('resultTable', 'display', 'none');
       dojo.style('warningLabel', 'display', 'block');
   }
   else
   {
		//Hiding warning label and showing Report table
        	dojo.style('warningLabel', 'display', 'none');
        	dojo.style('resultTable', 'display', 'inline-table');
	}

        //Adding execution mode to table cell
        exec_id = document.getElementById('executionId');
        if (show_execmode == "1")
            exec_id.innerHTML = "Automatic Remediation"
        else
            exec_id.innerHTML = "Manual Remediation"
        //Calculate toatal rules,success,fail,manual with %			

        var total_rules = severityCountReport.length;
        var successRuleCount = 0;
        var failedRuleCount = 0;
        var manualRuleCount = 0;
        var highSuccessSeverityCount = 0;
        var mediumSuccessSeverityCount = 0;
        var lowSuccessSeverityCount = 0;
        var highFailedSeverityCount = 0;
        var mediumFailedSeverityCount = 0;
        var lowFailedSeverityCount = 0;
        var highManualSeverityCount = 0;
        var mediumManualSeverityCount = 0;
        var lowManualSeverityCount = 0;

        for(var tmp_a = 0; tmp_a < total_rules; tmp_a++){
            if(severityCountReport[tmp_a].status == 'success'){
                successRuleCount++;
                if(severityCountReport[tmp_a].severity == 'high') highSuccessSeverityCount++;
                if(severityCountReport[tmp_a].severity == 'medium') mediumSuccessSeverityCount++;
                if(severityCountReport[tmp_a].severity == 'low') lowSuccessSeverityCount++;
            }
            if(severityCountReport[tmp_a].status == 'failed'){
                failedRuleCount++;
                if(severityCountReport[tmp_a].severity == 'high') highFailedSeverityCount++;
                if(severityCountReport[tmp_a].severity == 'medium') mediumFailedSeverityCount++;
                if(severityCountReport[tmp_a].severity == 'low') lowFailedSeverityCount++;
            }
            if(severityCountReport[tmp_a].status == 'manual'){
                manualRuleCount++;
                if(severityCountReport[tmp_a].severity == 'high') highManualSeverityCount++;
                if(severityCountReport[tmp_a].severity == 'medium') mediumManualSeverityCount++;
                if(severityCountReport[tmp_a].severity == 'low') lowManualSeverityCount++;
            }
        }

        if((successRuleCount + failedRuleCount + manualRuleCount) > 0){
            document.getElementById('hssc').innerHTML = highSuccessSeverityCount;
            document.getElementById('hfsc').innerHTML = highFailedSeverityCount;
            document.getElementById('hmsc').innerHTML = highManualSeverityCount;
            document.getElementById('htsc').innerHTML = highSuccessSeverityCount + highFailedSeverityCount + highManualSeverityCount;
            document.getElementById('mssc').innerHTML = mediumSuccessSeverityCount;
            document.getElementById('mfsc').innerHTML = mediumFailedSeverityCount;
            document.getElementById('mmsc').innerHTML = mediumManualSeverityCount;
            document.getElementById('mtsc').innerHTML = mediumSuccessSeverityCount + mediumFailedSeverityCount + mediumManualSeverityCount;
            document.getElementById('lssc').innerHTML = lowSuccessSeverityCount;
            document.getElementById('lfsc').innerHTML = lowFailedSeverityCount;
            document.getElementById('lmsc').innerHTML = lowManualSeverityCount;
            document.getElementById('ltsc').innerHTML = lowSuccessSeverityCount + lowFailedSeverityCount + lowManualSeverityCount;

            var success_perc = Math.round((successRuleCount / total_rules) * 100);
            var failed_perc = Math.round((failedRuleCount / total_rules) * 100);
            var manual_perc = Math.round((manualRuleCount / total_rules) * 100);

            //Start: Percent adjustment
            var total_perc = success_perc + failed_perc + manual_perc;
            var tmpArray = [success_perc, failed_perc, manual_perc];

            if((total_perc > 100) || (total_perc < 100)){
                //console.log('Manupulating ' + total_perc + '%');
                var maxX = Math.max.apply(Math, tmpArray);
                var index = tmpArray.indexOf(maxX);

                if(total_perc > 100){
                    if (~index) {
                        tmpArray[index] = maxX - 1;
                    }
                }
                if(total_perc < 100){
                    if (~index) {
                        tmpArray[index] = maxX + 1;
                    }
                }
            }
            total_perc = tmpArray[0] + tmpArray[1] + tmpArray[2];
            //Stop: Percent adjustment

            count_id = document.getElementById('totalId');
            count_id.innerHTML = '<a href="javascript:void(0);" onclick="onclickOfResultHyperlink(4);" style="color:black;">' + total_rules + '  (' + total_perc +'%)</a>';
            passed_id = document.getElementById('passedId');
            passed_id.innerHTML = '<a href="javascript:void(0);" onclick="onclickOfResultHyperlink(1);" style="color:green;">' + successRuleCount + '  (' + tmpArray[0] + '%)</a>';
            failed_id = document.getElementById('failedId');
            failed_id.innerHTML = '<a href="javascript:void(0);" onclick="onclickOfResultHyperlink(2);" style="color:red;">' + failedRuleCount + '  (' + tmpArray[1] + '%)</a>';
            manual_id = document.getElementById('manualId');
            manual_id.innerHTML = '<a href="javascript:void(0);" onclick="onclickOfResultHyperlink(3);" style="color:blue;">' + manualRuleCount + '  (' + tmpArray[2] + '%)</a>';
        }
        
        if(flagTriggerSort){
            triggerSortConsolelog();
        }

        dojo.style('ajaxloader', 'display', 'none');//4b
        
        if(menu_tab_select_flag.report_log == true){
            setDetailedReport();
        }
        
    }, function (err) {
        if ('timeout' === err.dojoType) {
            myDialog3.set("title", "Timeout Error");
            button_ok = "<center><button class='info-btn-ok' data-dojo-type='dijit/form/Button' id='button_ok' type='submit'>OK</button></center>";
            myDialog3.set("content", "<div class='info-content'>Retry the web page by clicking the refresh/reload button, <br> if the problem persists then please contact the raxak administrator for further assistance.</div>" + button_ok);
            myDialog3.set("style", "height:160px;width:450px;");
            myDialog3.show();
        }
    });
}



/*
 ASG:
 Once a user clicked on Apply profile button to execute the profile's rule on target VM(s), 
 the indeterminate progress bar should be displayed along with the label of the progress bar saying "Compliance checking in progress..."
 And
 Once the rules execution finished, progress bar should be removed and only label should be displayed saying "Compliance checking finished"
 */



function checkStatusOfExecution(refresh) {

    if (typeof refresh == 'undefined')
    {
        refresh = false
    }

    if (executedIPs == "None")
    {
        statusExecution = setTimeout(function () {
            checkStatusOfExecution()
        }, 10000);
        return
    }
    updateStatusPans();

    var reload_show_profile = sessionStorage.getItem('show_profile');
    var reload_autoremediate = sessionStorage.getItem('autoremediate');
    var reload_frequency = sessionStorage.getItem('frequency');

    var uri = "/raxakapi/v1/getExecutionStatus/?ip=" + executedIPs
    dojo.style('ajaxloader', 'display', 'none');//16b //dont want loader here
    dojo.xhrGet({
        url: uri,
        method: "GET",
        crossDomain: false,
        handleAs: "text",
        timeout: defaultTimeout
    }).then(function (htmlResults) {
        var str = htmlResults
        if (str.indexOf("false") >= 0)
        {
            var div = document.getElementById('indeterminateBar1');
            div.style.display = 'none';
            document.getElementById("try").style.color = "blue"
            dijit.byId("applyprofile_id").setAttribute('disabled', true);
            dijit.byId("abort_execution_btn").setAttribute('disabled', false);
            percentage = str.substring(6)
            //If due to some reason if percentage is more than 100% then display 99%
            if (parseInt(percentage) > 99)
            {
                percentage = "99"
            }
            statusExecution = setTimeout(function () {
                checkStatusOfExecution()
            }, 10000);

	    compliance_in_progress = true
            document.getElementById("try").innerHTML = "<p style='margin-top:10px;'>Compliance checking in progress(" + percentage + "%).....</p>";
            $j14('#applySelectedProfileButtonClick .adtab2-overlay').css('display', 'block');//blocking
            flag_adtab2Overlay = false;
            executingTM = executedIPs;
            blockExecutingTMs(true);
            if (refresh)//Go to report tab if execution is in progress and user has refreshed the page.
            {
		document.getElementById("try").style.display = 'block';
            	dijit.byId('main_tabContainer').selectChild(dijit.byId('report_log'));

                $j14("#applySelectedProfileButtonClick #selected_profile").html(reload_show_profile);

                var tmp_reload_show_profile = $j14("input[name=radioGroup][value='"+reload_show_profile+"']");
                tmp_reload_show_profile[0].checked = true;
                if (reload_autoremediate == '0') {
                    document.getElementById('manual_radio').checked = true;
                    document.getElementById('auto_radio').checked = false;
                    document.getElementById("scheduler").value = 'One time';
                } 
                else {
                    document.getElementById('auto_radio').checked = true;
                    document.getElementById('manual_radio').checked = false;
                    document.getElementById("scheduler").value = reload_frequency;
                }
            }
        }
        else
        {
	    compliance_in_progress = false;
        executingTM = executedIPs;
        blockExecutingTMs(false);
            var div = document.getElementById('indeterminateBar1');
            div.style.display = 'none';
            document.getElementById("try").style.color = "green";
            if (!refresh)//Display only when user has not refreshed the page
            {
                //document.getElementById("try").innerHTML = "<div id='id_trace'>Compliance checking finished.</div>";
                document.getElementById("try").innerHTML = "Compliance checking finished.";
		//var tim = window.setTimeout("hieMessage()", 10000);  // 10000 milliseconds = 10 seconds
                flag_adtab2Overlay = true;
            }

            if(reload_autoremediate !== null){
                if (reload_autoremediate == '0') {
                    document.getElementById('manual_radio').checked = true;
                    document.getElementById('auto_radio').checked = false;
                    document.getElementById("manual_radio").click();
                    document.getElementById("scheduler").value = 'One time';
                } else {
                    document.getElementById('auto_radio').checked = true;
                    document.getElementById('manual_radio').checked = false;
                    document.getElementById("auto_radio").click();
                    document.getElementById("scheduler").value = reload_frequency;
                }
                sessionStorage.removeItem('show_profile');
                sessionStorage.removeItem('autoremediate');
                sessionStorage.removeItem('frequency');
            }

            clearTimeout(statusExecution);
            dijit.byId("applyprofile_id").setAttribute('disabled', false);
            dijit.byId("abort_execution_btn").setAttribute('disabled', true);

    if(flag_adtab2Overlay) {
                $j14('#applySelectedProfileButtonClick .adtab2-overlay').css('display', 'none');//unblocking
            }

            //Added following here since this code is called on page reload
            if (getProfileIps().length < 1) {
                dijit.byId("applyprofile_id").setAttribute('disabled', true);
                dijit.byId("abort_execution_btn").setAttribute('disabled', true);
            }
        }
    }, function (err) {

        //Hide progress bar and display error message
        var div = document.getElementById('indeterminateBar1');
        div.style.display = 'none';
        document.getElementById("try").innerHTML = "Compliance execution could not finished.";
        document.getElementById("try").style.color = "red";
        executingTM = executedIPs;
        blockExecutingTMs(false);

        if ('timeout' === err.dojoType) {
            myDialog3.set("title", "Timeout Error");
            button_ok = "<center><button class='info-btn-ok' data-dojo-type='dijit/form/Button' id='button_ok' type='submit'>OK</button></center>";
            myDialog3.set("content", "<div class='info-content'>Retry the web page by clicking the refresh/reload button, <br> if the problem persists then please contact the raxak administrator for further assistance.</div>" + button_ok);
            myDialog3.set("style", "height:160px;width:450px;");
            myDialog3.show();
        } else {
            myDialog3.set("title", "Error");
            button_ok = "<center><button class='info-btn-ok' data-dojo-type='dijit/form/Button' id='button_ok' type='submit'>OK</button></center>";
            myDialog3.set("content", "<div class='info-content'>Unable to load the execution status of Target Machine(s).\nPlease contact the raxak administrator, if the problem persists.</div>" + button_ok);
            myDialog3.set("style", "height:160px;width:450px;");
            myDialog3.show();
        }
    });
}
function onmouseover_hide_div(id){
	document.getElementById(id).style.display = 'none';	
}

function onclicktab_hide_div(tabdiv)
{
	if (!compliance_in_progress)
	{
		var suc = tabdiv;	
	if (suc != 'applySelectedProfileButtonClick')
		{
		document.getElementById("try").style.display = 'none';
		}
	}
}
function onChangeIpSelValue(x) {
    //Updating profileRunIP and all archive selectors.
    //while user selects the other ip address.
    profileRunIP = x
    dojo.byId("myselect1").value = x;
    dojo.byId("myselect2").value = x;
    dojo.byId("myselect3").value = x;
    dojo.byId("myselect4").value = x;
    dojo.byId("myselect5").value = x;

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
    selectedTimeStamp = "None";
    var selSuccessHistoryHandler = document.getElementById('myselect1varlog');
    var selFailureHistoryHandler = document.getElementById('myselect2varlog');
    var selManualHistoryHandler = document.getElementById('myselect3varlog');
    var selConsoleHistoryHandler = document.getElementById('myselect4varlog');
    var selReportHistoryHandler = document.getElementById('myselect5varlog');

    if (dojo.attr("main_tabContainer_tablist_applySelectedProfileButtonClick", "aria-selected") === true) {
        dojo.style('ajaxloader', 'display', 'none');//17b
    } else {
        dojo.style('ajaxloader', 'display', 'block');//2a
    }

    //Calling API to get list of archive log files from /var/log/cloudRaxak.
    var uri = "/raxakapi/v1/getArchiveLogFileNameList/" + profileRunIP;
    var listOfTimestamp = [];
    dojo.empty(selSuccessHistoryHandler);
    dojo.xhrGet({
        url: uri,
        method: "GET",
        crossDomain: false,
        handleAs: "text",
        timeout: defaultTimeout
    }).then(function (htmlResults) {

        //Calling API to get the time-status for profilerunIp
        latest_server_utc = "";
        var uri = "/raxakapi/v1/showExecutionStatus/" + profileRunIP;
        dojo.xhrGet({
            url: uri,
            method: "GET",
            crossDomain: false,
            handleAs: "text",
            timeout: defaultTimeout
        }).then(function (htmlResults1) {
            //Setting this variable to avoid the repeated entires in archive selector.
            //Refer to git #270 and Cr-303jira's description and  	
            if (htmlResults1.match("Rules execution is in progress...")) {
                latest_server_utc = "";
            }
            else {
                if (htmlResults1.indexOf("Rules execution completed on : ") !=-1) {
                time_string = htmlResults1.split("Rules execution completed on : ");
                }
                else
                {
                time_string = htmlResults1.split("Rules execution aborted on : ");
                }
                //Getting utc time string from server
                latest_server_utc = time_string[1].replace('"', '');
                //Converting utc to local time zone as we are in client zone.
                var arch_time = new Date(latest_server_utc + ' UTC');
                latest_client_time = arch_time.toString().split("GMT")[0];
                executed_on = latest_client_time
            }
            var listOfTimestamp = eval(htmlResults);
            if (latest_server_utc.length != 0)
            {
                if (listOfTimestamp.indexOf(latest_server_utc) == -1)
                {
                    listOfTimestamp.splice(0, 0, latest_server_utc);
                }
            }

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


        }, function (err) {

            if ('timeout' === err.dojoType) {
                myDialog3.set("title", "Timeout Error");
                button_ok = "<center><button class='info-btn-ok' data-dojo-type='dijit/form/Button' id='button_ok' type='submit'>OK</button></center>";
                myDialog3.set("content", "<div class='info-content'>Retry the web page by clicking the refresh/reload button, <br> if the problem persists then please contact the raxak administrator for further assistance.</div>" + button_ok);
                myDialog3.set("style", "height:160px;width:450px;");
                myDialog3.show();
            }
        });
}, function (err) {

    if ('timeout' === err.dojoType) {
        myDialog3.set("title", "Timeout Error");
        button_ok = "<center><button class='info-btn-ok' data-dojo-type='dijit/form/Button' id='button_ok' type='submit'>OK</button></center>";
        myDialog3.set("content", "<div class='info-content'>Retry the web page by clicking the refresh/reload button, <br> if the problem persists then please contact the raxak administrator for further assistance.</div>" + button_ok);
        myDialog3.set("style", "height:160px;width:450px;");
        myDialog3.show();
    }

    });//one api ends


}


//This function intends to update the archive log selectors 
//with the user selected current value and update the content
//pane of all tabe.
function onChangeTimeStmpSelValue(y) {

    dojo.byId("myselect1varlog").value = y;
    dojo.byId("myselect2varlog").value = y;
    dojo.byId("myselect3varlog").value = y;
    dojo.byId("myselect4varlog").value = y;
    dojo.byId("myselect5varlog").value = y;

    //It takes the selected timestamp.
    selectedTimeStamp = y
    updateStatusPans()
}

function updateSelectedProfilePage() {
    require(["dojo/ready", "dojo/io-query"], function (ready, ioQuery) {
        ready(function () {
            var q = document.getElementsByName('radioGroup');
            show_profile = ""
            for (var i = 0; i < q.length; i++) {
                if (q[i].checked) {
                    rate_values = q[i].value;
                    // show_profile updating on selction of profile.	
                    show_profile = rate_values
                    break
                }
            }


            dojo.query("label[for=selected_profile]")[0].innerHTML = show_profile;

            var savedIps = '';
            var uri = "/raxakapi/v1/getSelectedTMs/?username=raxak";
            dojo.xhrGet({
                url: uri,
                method: "get",
                crossDomain: false,
                handleAs: "json",
                timeout: defaultTimeout
            }).then(function (response) {
                var tmpIps = String(JSON.parse(response));
                savedIps = tmpIps.split(",");

            }, function (err) {
                if ('timeout' === err.dojoType) {
                    myDialog3.set("title", "Timeout Error");
                    button_ok = "<center><button class='info-btn-ok' data-dojo-type='dijit/form/Button' id='button_ok' type='submit'>OK</button></center>";
                    myDialog3.set("content", "<div class='info-content'>Retry the web page by clicking the refresh/reload button, <br> if the problem persists then please contact the raxak administrator for further assistance.</div>" + button_ok);
                    myDialog3.set("style", "height:160px;width:450px;");
                    myDialog3.show();
                }
            });

            var uri = "/raxakapi/v1/getIPs/?username=raxak";
            dojo.style('ajaxloader', 'display', 'block');//1a
            dojo.xhrGet({
                url: uri,
                method: "GET",
                crossDomain: false,
                handleAs: "json",
                timeout: defaultTimeout
            }).then(function (htmlResults) {

                var arrayOfObjects = eval(htmlResults);

                dojo.empty("ipadd_del");
                dojo.empty("ipadd");
                var selProfile = document.getElementById('ipadd');
                var selAddTargets = document.getElementById('ipadd_del');
                var elementRHS = {}, rhsIps = [];

                tmCount = arrayOfObjects.length;//tmCount is global
                if (arrayOfObjects.length < 1) {
                    dijit.byId("deleteip_id").setAttribute('disabled', true);
                    dijit.byId("modifyip").setAttribute('disabled', true);
                    dijit.byId("access_target_id").setAttribute('disabled', true);
                } else {
                    dijit.byId("deleteip_id").setAttribute('disabled', false);
                    dijit.byId("modifyip").setAttribute('disabled', false);
                    dijit.byId("access_target_id").setAttribute('disabled', false);
                }

                for (var i in arrayOfObjects) {

                    var opt = document.createElement('option');
                    var opt1 = document.createElement('option');
                    var json = JSON.parse(arrayOfObjects[i])
                    ip = json.ip
                    access = json.access
                    nickname = json.nickname
                    ip_count = arrayOfObjects.length

                    if (nickname == '') {
                        nickname = ip;
                    }
                    opt.innerHTML = nickname;
                    opt.value = ip;
                    opt1.innerHTML = nickname;
                    opt1.value = ip;
                    if (access == -2) {
                        opt1.setAttribute('class', 'pingnotreachableclass');
                        opt.setAttribute('class', 'pingnotreachableclass');
                        opt1.setAttribute('disabled', true);
                        opt1.setAttribute('access', access);
                        opt1.setAttribute('title', ip + ' : Unable to reach target machine (ping failed)');
                        opt.setAttribute('title', ip + ' : Unable to reach target machine (ping failed)');
                        opt.setAttribute('access', access);
                        opt1.setAttribute('nickname', nickname);

                    }
                    else if (access == 1) {
                        osname = json.osname;
                        osversion = json.osversion;

                        opt1.setAttribute('class', 'pingreachclass');
                        opt.setAttribute('class', 'pingreachclass');
                        opt1.setAttribute('access', access);
                        opt.setAttribute('access', access);
                        if( typeof (osname) == 'undefined' || typeof(osversion) == 'undefined')
                        {
                            opt.setAttribute('title', ip + ' : ALL OK');
                            opt1.setAttribute('title', ip + ' : ALL OK');
                        }
                        else
                        {
                            opt.setAttribute('title', ip +' ( '+osname + ' v' +osversion + ' )');
                            opt1.setAttribute('title', ip +' ( '+osname + ' v' +osversion + ' )');
                        }
                        opt1.setAttribute('nickname', nickname);
                    }
                    else if (access == -1) {
                        opt1.setAttribute('class', 'orangeclass');
                        opt.setAttribute('class', 'orangeclass');
                        opt1.setAttribute('access', access);
                        opt1.setAttribute('disabled', true);
                        opt.setAttribute('access', access);
                        opt1.setAttribute('title', ip + ' : OS not supported');
                        opt.setAttribute('title', ip + ' : OS not supported');
                    }
                    else if (access == -3) {
                        opt1.setAttribute('class', 'yellowclass');
                        opt.setAttribute('class', 'yellowclass');
                        opt1.setAttribute('access', access);
                        opt1.setAttribute('disabled', true);
                        opt.setAttribute('access', access);
                        opt1.setAttribute('title', ip + ' : Unable to log in with specified userid (ssh login fails)');
                        opt.setAttribute('title', ip + ' : Unable to log in with specified userid (ssh login fails)');
                    }
                    else if (access == -4) {
                        opt1.setAttribute('class', 'blueclass');
                        opt.setAttribute('class', 'blueclass');
                        opt1.setAttribute('access', access);
                        opt1.setAttribute('disabled', true);
                        opt.setAttribute('access', access);
                        opt1.setAttribute('title', ip + ' : Insufficient execution privilege (cannot run privileged instructions)');
                        opt.setAttribute('title', ip + ' : Insufficient execution privilege (cannot run privileged instructions)');
                    }
                    else if (access == -5) {
                        opt1.setAttribute('class', 'grayclass');
                        opt.setAttribute('class', 'grayclass');
                        opt1.setAttribute('access', access);
                        opt1.setAttribute('disabled', true);
                        opt.setAttribute('access', access);
                        opt1.setAttribute('title', ip + ' : Access check in progress');
                        opt.setAttribute('title', ip + ' : Access check in progress');
                    }

                    if ((ip_count == 1) && (access == 1)) {
                        opt1.setAttribute("selected", "selected");
                    }

                    if (($j14.inArray(ip, savedIps) == -1)) {
                        selProfile.appendChild(opt1);
                    } else {
                        elementRHS = {
                            name: opt1.getAttribute('nickname'),
                            value: opt1.getAttribute('value'),
                            nickname: opt1.getAttribute('nickname'),
                            access: opt1.getAttribute('access'),
                            class: opt1.getAttribute('class'),
                            title: opt1.getAttribute('title'),
                            selected: true
                        };
                        rhsIps.push(elementRHS);
                    }


                    selAddTargets.appendChild(opt);
                    nodes1 = selProfile.children;

                }

                dojo.style('ajaxloader', 'display', 'none');//1b1
                $j14('.ipadd').multiselect2side('destroy');
                $j14('.ipadd').multiselect2side({
                    moveOptions: false,
                    labelTop: '+ +',
                    labelBottom: '- -',
                    labelUp: '+',
                    labelDown: '-',
                    labelsx: '* Selected *',
                    labeldx: 'Selected Target Machine(s)',
                    search: "Search : "
                });

                var countRhsIps = rhsIps.length;
                if (countRhsIps > 0) {
                    for (var tmpi = 0; tmpi < countRhsIps; tmpi++) {
                        $j14('.ipadd').multiselect2side('addOption', rhsIps[tmpi]);
                    }
                }

                saveProfileIps();//Since TM (user@IP) can be deleted so deleted TM does not want to get added on RHS.

                //Start: Multiselect2side checkbox set to alltargetmachines
                $j14(".selectedIPs input:checkbox").each(function () {
                    $j14(this).attr("checked", false);
                });
                document.getElementById("alltargetmachines").checked = true;
                //End: Multiselect2side checkbox set to alltargetmachines

                //Start: activate Target Machine tab Search
                $j14('#search_machine').val('');//clear on reload
                $j14(function () {
                    $j14('#ipadd_del').filterByText($j14('#search_machine'), false);//set true to select only one remaining ip
                });
                //End: activate Target Machine tab Search;

                //Start: Target Machine tab set to alltargetmachines
                $j14(".selectedIPs_del input:checkbox").each(function () {
                    $j14(this).attr("checked", false);
                });
                document.getElementById("alltargetmachines_del").checked = true;
                //End: Target Machine tab set to alltargetmachines

                //Start: Enable button Only one Target Machine is available
                var div = document.getElementById('indeterminateBar1').style.display;
                if (getProfileIps().length < 1 || div == 'block') {
                    dijit.byId("applyprofile_id").setAttribute('disabled', true);
                } else {
                    dijit.byId("applyprofile_id").setAttribute('disabled', false);
                }
                //End: Enable button Only one Target Machine is available

                selectOnlyRemainingTM();//#456

            }, function (err) {
                dojo.style('ajaxloader', 'display', 'none');//1b2
                if ('timeout' === err.dojoType) {
                    myDialog3.set("title", "Timeout Error");
                    button_ok = "<center><button class='info-btn-ok' data-dojo-type='dijit/form/Button' id='button_ok' type='submit'>OK</button></center>";
                    myDialog3.set("content", "<div class='info-content'>Retry the web page by clicking the refresh/reload button, <br> if the problem persists then please contact the raxak administrator for further assistance.</div>" + button_ok);
                    myDialog3.set("style", "height:160px;width:450px;");
                    myDialog3.show();
                } else {
                    myDialog3.set("title", "Error");
                    button_ok = "<center><button class='info-btn-ok' data-dojo-type='dijit/form/Button' id='button_ok' type='submit'>OK</button></center>";
                    myDialog3.set("content", "<div class='info-content'>Unable to fetch Target Machine(s) from RAXAK server.\nPlease contact the raxak administrator, if the problem persists." + "</div>" + button_ok);
                    myDialog3.set("style", "height:160px;");
                    myDialog3.show();
                    console.log("ERROR: ", err);
                }

            });
});
});

}

function updateTargetPane() {
    require(["dojo/ready", "dojo/io-query"], function (ready, ioQuery) {
        ready(function () {
            var q = document.getElementsByName('radioGroup');
            show_profile = ""
            for (var i = 0; i < q.length; i++) {
                if (q[i].checked) {
                    rate_values = q[i].value;
                    // show_profile updating on selction of profile.	
                    show_profile = rate_values
                    break
                }
            }
           // dojo.query("label[for=selected_profile]")[0].innerHTML = show_profile;

           var uri = "/raxakapi/v1/getIPs/?username=raxak";
            dojo.style('ajaxloader', 'display', 'block');//1a
            dojo.xhrGet({
                url: uri,
                method: "GET",
                crossDomain: false,
                handleAs: "json",
                timeout: defaultTimeout
            }).then(function (htmlResults) {
                var arrayOfObjects = eval(htmlResults);
                dojo.empty("ipadd_del");
                var selAddTargets = document.getElementById('ipadd_del');
                var elementRHS = {}, rhsIps = [];

                tmCount = arrayOfObjects.length;//tmCount is global
                if (arrayOfObjects.length < 1) {
                    dijit.byId("deleteip_id").setAttribute('disabled', true);
                    dijit.byId("modifyip").setAttribute('disabled', true);
                    dijit.byId("access_target_id").setAttribute('disabled', true);
                } else {
                    dijit.byId("deleteip_id").setAttribute('disabled', false);
                    dijit.byId("modifyip").setAttribute('disabled', false);
                    dijit.byId("access_target_id").setAttribute('disabled', false);
                }
                for (var i in arrayOfObjects) {
                    var opt = document.createElement('option');
                    var json = JSON.parse(arrayOfObjects[i])
                    ip = json.ip
                    access = json.access
                    nickname = json.nickname
                    ip_count = arrayOfObjects.length
                    if (nickname == '') {
                        nickname = ip;
                    }
                    opt.innerHTML = nickname;
                    opt.value = ip;
                    if (access == -2) {
                        opt.setAttribute('class', 'pingnotreachableclass');
                        opt.setAttribute('title', ip + ' : Unable to reach target machine (ping failed)');
                        opt.setAttribute('access', access);
                    }
                    else if (access == 1) {
                     osname = json.osname;
                     osversion = json.osversion;
                     opt.setAttribute('class', 'pingreachclass');
                     opt.setAttribute('access', access);
                     if( typeof (osname) == 'undefined' || typeof(osversion) == 'undefined')
                     {
                         opt.setAttribute('title', ip + ' : ALL OK');
                     }
                     else
                     {
                         opt.setAttribute('title', ip +' ( '+osname + ' v' +osversion + ' )');
                     }
                 }
                 else if (access == -1) {
                    opt.setAttribute('class', 'orangeclass');
                    opt.setAttribute('access', access);
                    opt.setAttribute('title', ip + ' : OS not supported');
                }
                else if (access == -3) {
                    opt.setAttribute('class', 'yellowclass');
                    opt.setAttribute('access', access);
                    opt.setAttribute('title', ip + ' : Unable to log in with specified userid (ssh login fails)');
                }
                else if (access == -4) {
                    opt.setAttribute('class', 'blueclass');
                    opt.setAttribute('access', access);
                    opt.setAttribute('title', ip + ' : Insufficient execution privilege (cannot run privileged instructions)');
                }
                else if (access == -5) {
                    opt.setAttribute('class', 'grayclass');
                    opt.setAttribute('access', access);
                    opt.setAttribute('title', ip + ' : Access check in progress');
                }

                if ((ip_count == 1) && (access == 1)) {
                    opt.setAttribute("selected", "selected");
                }

                selAddTargets.appendChild(opt);
            }
                dojo.style('ajaxloader', 'display', 'none');//1b1

		//Start: activate Target Machine tab Search
                $j14('#search_machine').val('');//clear on reload
                $j14(function () {
                    $j14('#ipadd_del').filterByText($j14('#search_machine'), false);//set true to select only one remaining ip
                });
                //End: activate Target Machine tab Search;

                //Start: Target Machine tab set to alltargetmachines
                $j14(".selectedIPs_del input:checkbox").each(function () {
                    $j14(this).attr("checked", false);
                });
                document.getElementById("alltargetmachines_del").checked = true;
                //End: Target Machine tab set to alltargetmachines

                selectOnlyRemainingTM();

                if(compliance_in_progress){
                    blockExecutingTMs(true);
                }

            }, function (err) {
                dojo.style('ajaxloader', 'display', 'none');//1b2
                if ('timeout' === err.dojoType) {
                    myDialog3.set("title", "Timeout Error");
                    button_ok = "<center><button class='info-btn-ok' data-dojo-type='dijit/form/Button' id='button_ok' type='submit'>OK</button></center>";
                    myDialog3.set("content", "<div class='info-content'>Retry the web page by clicking the refresh/reload button, <br> if the problem persists then please contact the raxak administrator for further assistance.</div>" + button_ok);
                    myDialog3.set("style", "height:160px;width:450px;");
                    myDialog3.show();
                } else {
                    myDialog3.set("title", "Error");
                    button_ok = "<center><button class='info-btn-ok' data-dojo-type='dijit/form/Button' id='button_ok' type='submit'>OK</button></center>";
                    myDialog3.set("content", "<div class='info-content'>Unable to fetch Target Machine(s) from RAXAK server.\nPlease contact the raxak administrator, if the problem persists." + "</div>" + button_ok);
                    myDialog3.set("style", "height:160px;");
                    myDialog3.show();
                    console.log("ERROR: ", err);
                }
                selectOnlyRemainingTM();
            });
});
});
}

function validationForRuleSelection(rulenum, content)
{
    if (rulenum.length == 0)
    {
        myDialog2.set("title", "Info");
        button_ok = "<center><button class='info-btn-ok' data-dojo-type='dijit/form/Button' id='button_ok' type='submit'>OK</button></center>";
        myDialog2.set("content", "<div class='info-content'> Please select the rule to " + content + "  </div>" + button_ok);
        myDialog2.show()
        return 0
    }

    return 1

}

require(["dojo/ready", "dojo/io-query"], function (ready, ioQuery) {
    ready(function () {

        //Event Handler of saveip button
        dojo.connect(dojo.byId("saveip"), "click", function (evt) {
         saveTargetedIps();
        });//End: Event Handler of saveip button

        dojo.connect(dojo.byId("abort_execution_btn"), "click", function (evt) {
            var apply_status = dojo.attr("abort_execution_btn", 'disabled');
            if (apply_status) {
                return;
            }

            var uri = "/raxakapi/v1/abortExecution/?ip=" + executingTM;
            dojo.xhrGet({
                url: uri,
                method: "GET",
                crossDomain: false,
                handleAs: "text",
                timeout: defaultTimeout
            }).then(function (htmlResults) {
                dijit.byId("abort_execution_btn").setAttribute('disabled', true);
                document.getElementById("try").innerHTML = "Aborting compliance execution";
                flag_adtab2Overlay = true;
                $j14('#applySelectedProfileButtonClick .adtab2-overlay').css('display', 'none');//unblocking
            }, function (err) {
                if ('timeout' === err.dojoType) {
                    myDialog3.set("title", "Timeout Error");
                    button_ok = "<center><button class='info-btn-ok' data-dojo-type='dijit/form/Button' id='button_ok' type='submit'>OK</button></center>";
                    myDialog3.set("content", "<div class='info-content'>Retry the web page by clicking the refresh/reload button, <br> if the problem persists then please contact the raxak administrator for further assistance.</div>" + button_ok);
                    myDialog3.set("style", "height:160px;width:450px;");
                    myDialog3.show();
                } else {
                    myDialog3.set("title", "Error");
                    button_ok = "<center><button class='info-btn-ok' data-dojo-type='dijit/form/Button' id='button_ok' type='submit'>OK</button></center>";
                    myDialog3.set("content", "<div class='info-content'>Unable to abort execution for selected Target Machine(s).\nPlease contact the raxak administrator, if the problem persists.</div>" + button_ok);
                    myDialog3.set("style", "height:160px;width:450px;");
                    myDialog3.show();
                }
            });
        });
        
        dojo.connect(dojo.byId("applyprofile_id"), "click", function (evt) {
            var apply_status = dojo.attr("applyprofile_id", 'disabled');
            if (apply_status) {
                return;
            }
	    document.getElementById("try").style.display = 'block';	
        dijit.byId("abort_execution_btn").setAttribute('disabled', false);

            $j14('#applySelectedProfileButtonClick .adtab2-overlay').css('display', 'block');//blocking
            var flag_adtab2Overlay = false;

            saveProfileIps();

            var ip = ""
            var defaultStatusSelectionIP = ""
            var sel = document.getElementById("ipaddms2side__dx");
            if (sel.options.length < 1) {
                myDialog2.set("title", "Error");
                button = "<center><button class='info-btn-ok' data-dojo-type='dijit/form/Button' id='submit_profile' type='submit'>OK</button></center>"
                myDialog2.set("content", "<div class='info-content'>Please select atleast one Target Machine.</div>" + button);
                myDialog2.show()
            }

            for (var i = 0, iLen = sel.options.length; i < iLen; i++) {
                //console.log(sel.options[i].value)
                if (ip)
                {
                    //console.log(sel.options[i].value)
                    ip = ip + "," + sel.options[i].value
                }
                else
                {
                    ip = sel.options[i].value
                    defaultStatusSelectionIP = ip
                }

            }
            compliance_ip = ip
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
                if (document.getElementById('auto_radio').checked)
                {
                    rate_value = document.getElementById('auto_radio').value;
                }
                else if (document.getElementById('manual_radio').checked)
                {
                    rate_value = document.getElementById('manual_radio').value;
                }
                autoremediate = rate_value

                for (var i = 0; i < q.length; i++) {
                    if (q[i].checked) {
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

            if (autoremediate == 0)
            {
                //If Manual remediation then frequency set to "none"	
                frequency = "none"
            }
            else
            {
                //Automatic remediation
                frequency = document.getElementById("scheduler").value;
                if ((frequency == "One time") || (frequency == ""))
                {
                    //If frequency is "One time" then replace it to "none"	
                    frequency = "none";
                }
            }

            frequency = frequency.toLowerCase();

            manageCronForProfile(defaultStatusSelectionIP, ip, show_profile, autoremediate, frequency);
        });

dojo.connect(dojo.byId("deleteip_id"), "click", function (evt) {

    var idStatus = dojo.attr("deleteip_id", 'disabled');
    if (idStatus) {
        return;
    }

    var ip = "";
    var target_mchn_handler = document.getElementById("ipadd_del");
    for (var i = 0, iLen = target_mchn_handler.options.length; i < iLen; i++) {
        if (target_mchn_handler.options[i].selected == true) {
            if (ip)
            {
                ip = ip + ',' + target_mchn_handler.options[i].value
            }
            else
            {
                ip = target_mchn_handler.options[i].value
            }
        }
    }

    if (ip != null) {
        if (ip.length == 0)
        {
            myDialog2.set("title", "Info");
            button = "<button class='info-btn' data-dojo-type='dijit/form/Button' id='leave_tab_ok' value='OK' type='submit'>OK</button>"
            myDialog2.set("content", "<div class='info-content'>Please select a Target Machine</div>" + "<center>" + button + "</center>");
            myDialog2.set("style", "height:140px;");
            myDialog2.show()
        }
        else {
           if (compliance_in_progress){
            ip = ip.split(",");
            compliance_ip_list =  compliance_ip.split(",");
            for (var j=0 ; j < ip.length ; j++){
                delete_ip = ip[j];
                if (compliance_ip_list.indexOf(delete_ip) != -1){
                   myDialog2.set("title", "Info");
                   button = "<button class='info-btn' data-dojo-type='dijit/form/Button' id='leave_tab_ok' value='OK' type='submit'>OK</button>"
                   myDialog2.set("content", "<div class='info-content'> User selected operation is restricted as compliance is running</div>" + "<center>" + button + "</center>");
                   myDialog2.set("style", "height:140px;");
                   myDialog2.show();
                   return false;
               }
           }       
       }

       myDialog2.set("title", "Confirmation");
       button = "<button class='info-btn' data-dojo-type='dijit/form/Button' id='submit_delete' value='OK' type='submit'>OK</button>"
       button_cancel = "<button class='info-btn' data-dojo-type='dijit/form/Button' id='cancel_delete' type='submit'>Cancel</button>"
       myDialog2.set("content", "<div class='info-content'> Are you sure, you want to delete the selected Target Machine?</div>" + "<center>" + button + " " + button_cancel + "</center>");
       myDialog2.show()

       dojo.connect(dojo.byId("submit_delete"), "click", function (evt) {
        var uri = "/raxakapi/v1/deleteIP/?username=raxak&ip=" + ip;
                        dojo.style('ajaxloader', 'display', 'block');//7a
                        dojo.xhrGet({
                            url: uri,
                            method: "GET",
                            crossDomain: false,
                            handleAs: "json",
                            timeout: defaultTimeout
                        }).then(function (htmlResults) {
                            for (var count = target_mchn_handler.options.length - 1; count >= 0; count--) {
                                //if the option is selected, delete the option
                                if (target_mchn_handler.options[count].selected == true) {

                                    try {
                                        target_mchn_handler.remove(count, null);

                                    } catch (error) {

                                        target_mchn_handler.remove(count);

                                    }
                                }
                            }
                            updateIpSelectoronDelete(ip);

                            if (target_mchn_handler.length < 1) {
                                dijit.byId("deleteip_id").setAttribute('disabled', true);
                                dijit.byId("modifyip").setAttribute('disabled', true);
                                dijit.byId("access_target_id").setAttribute('disabled', true);
                            }

                            dojo.style('ajaxloader', 'display', 'none');//7b1
                        }, function (err) {
                            dojo.style('ajaxloader', 'display', 'none');//7b2    
                            if ('timeout' === err.dojoType) {
                                myDialog3.set("title", "Timeout Error");
                                button_ok = "<center><button class='info-btn-ok' data-dojo-type='dijit/form/Button' id='button_ok' type='submit'>OK</button></center>";
                                myDialog3.set("content", "<div class='info-content'>Retry the web page by clicking the refresh/reload button, <br> if the problem persists then please contact the raxak administrator for further assistance.</div>" + button_ok);
                                myDialog3.set("style", "height:160px;width:450px;");
                                myDialog3.show();
                            } else {
                                myDialog3.set("title", "Error");
                                button_ok = "<center><button class='info-btn-ok' data-dojo-type='dijit/form/Button' id='button_ok' type='submit'>OK</button></center>";
                                myDialog3.set("content", "<div class='info-content'>Unable to delete the selected Target Machine(s).\nPlease contact the raxak administrator, if the problem persists.<br>Error code: "+err.dojoType + "<br>uri = "+ uri + "</div>" + button_ok);

                                myDialog3.set("style", "height:160px;width:450px;");
                                myDialog3.show();
                            }
                        });
			});//deleteIP End
                } //Else
            } //Top if

//	}//end of else
});



        //Event Handler of modify ip address button	
        dojo.connect(dojo.byId("modifyip"), "click", function (evt) {
            var idStatus = dojo.attr("modifyip", 'disabled');
            if (idStatus) {
                return;
            }
            var target_machine_list_handler = document.getElementById("ipadd_del");

            var count_tmp = 0;
            for (var i = 0, iLen = target_machine_list_handler.options.length; i < iLen; i++) {
                if (target_machine_list_handler.options[i].selected == true) {
                    count_tmp++
                }
            }
            if (count_tmp >= 2) {
                myDialog2.set("title", "Info");
                button_ok = "<center><button class='info-btn-ok' data-dojo-type='dijit/form/Button' id='button_ok' type='submit'>OK</button></center>"
                myDialog2.set("content", "<div class='info-content'>Please Select only one Target Machine</div>" + button_ok);
                myDialog2.show()
            }
            else {
                full_selected_ip = target_machine_list_handler.value;
                if (full_selected_ip == '') {
                    myDialog2.set("title", "Info");
                    button = "<button class='info-btn' data-dojo-type='dijit/form/Button' id='leave_tab_ok' value='OK' type='submit'>OK</button>"
                    myDialog2.set("content", "<div class='info-content'>Please select a Target Machine</div>" + "<center>" + button + "</center>");
                    myDialog2.set("style", "height:140px;");
                    myDialog2.show()
                }
                else {
                    var full_selected_nickname = target_machine_list_handler.options[target_machine_list_handler.selectedIndex].text;
                    if (full_selected_ip != null)
                    {
                      if (compliance_in_progress){
                       ip = full_selected_ip.split(",");
                       compliance_ip_list =  compliance_ip.split(",");
                       for (var j=0 ; j < ip.length ; j++){
                        delete_ip = ip[j];
                        if (compliance_ip_list.indexOf(delete_ip) != -1){
                            myDialog2.set("title", "Info");
                            button = "<button class='info-btn' data-dojo-type='dijit/form/Button' id='leave_tab_ok' value='OK' type='submit'>OK</button>"
                            myDialog2.set("content", "<div class='info-content'> User selected operation is restricted as compliance is running</div>" + "<center>" + button + "</center>");
                            myDialog2.set("style", "height:140px;");
                            myDialog2.show();
                            return false;
                        }
                    }       
                }
                        //Getting selected user name and ipaddress. 		
                        var arr = full_selected_ip.split("@");
                        var user_name = arr[0];
                        mod_ip = arr[1];
                        if (full_selected_ip.length != 0)
                        {
                            dijit.byId("formDialogmod").reset();
                            dijit.byId("formDialogmod").show();
                        }
                        else {
                            myDialog2.set("title", "Info");
                            button = "<button class='info-btn' data-dojo-type='dijit/form/Button' id='leave_tab_ok' value='OK' type='submit'>OK</button>"
                            myDialog2.set("content", "<div class='info-content'>Please select a Target Machine</div>" + "<center>" + button + "</center>");
                            myDialog2.set("style", "height:140px;");
                            myDialog2.show()
                        }
                        document.getElementById("usernamemod").value = user_name;
                        document.getElementById("ipaddressmod").value = mod_ip;

			//#429 GIT Issue : Checking the nickName to ip.
			if (full_selected_ip.trim() != full_selected_nickname.trim()){	
                document.getElementById("nicknamemod").value = full_selected_nickname;}

                    }//if block
                }
            }

        });


        //Event handler of submit button of modify ip address 	
        dojo.connect(dojo.byId("submit1"), "click", function (evt) {
            onClickOfModify();
        });

    });
});

function manageCronForProfile(defaultStatusSelectionIP, ip, show_profile, autoremediate, frequency){
    var uri = "/raxakapi/v1/getCronJobs";
    dojo.xhrGet({
        url: uri,
        method: "get",
        crossDomain: false,
        handleAs: "json",
        timeout: defaultTimeout
    }).then(function (response) {
        var aCronInfo = eval(response);
        if (aCronInfo.length > 0) {

            var aSelIpInfo = ip.split(",");
            var countSelIpInfo = aSelIpInfo.length;
            var aSelIpDetail = [];
            var aPopCronInfo = [];
            var popInfoHtml = '';
            var crnExistHtml = '';
            
            for(var k= 0; k < countSelIpInfo; k++){
                var tmpVar = aSelIpInfo[k].split('@');
                aSelIpDetail.push({username:tmpVar[0],ipadrs:tmpVar[1],ipdetail:aSelIpInfo[k]});
            }

            for (var i in aCronInfo) {
                var json = JSON.parse(aCronInfo[i]);
                var crn_info = json.ip.split('@');
                var crn_user = crn_info[0];
                var crn_ip = crn_info[1];
                var crn_profile = json.profile;
                var crn_frequency = json.frequency;

                if ((crn_frequency === frequency) && (crn_profile !== show_profile)) {

                    var cronExist4IP = aSelIpDetail.filter(function (tmp_crn) { return tmp_crn.ipadrs == crn_ip });
                    if(cronExist4IP.length > 0){
                        aPopCronInfo.push({username:crn_user,ip:crn_ip,profile:crn_profile});//for checking

                        //Existing cron
                        crnExistHtml += '<tr>';
                        crnExistHtml += '<td>'+crn_user+'@'+crn_ip+'</td>';
                        crnExistHtml += '<td>'+frequency+'</td>';
                        crnExistHtml += '<td>'+crn_profile+'</td>';
                        crnExistHtml += '</tr>';

                        //New Cron
                        popInfoHtml += '<tr>';
                        popInfoHtml += '<td>'+cronExist4IP[0].ipdetail+'</td>';
                        popInfoHtml += '<td>'+frequency+'</td>';
                        popInfoHtml += '<td>'+show_profile+'</td>';
                        popInfoHtml += '</tr>';
                    }
                }
            }

            if(aPopCronInfo.length > 0){
                var contentHtml = 'Already has a cron with: <br>';
                contentHtml += '<table class="existing_cron_info" border="1">';
                contentHtml += '<tr><td>Target Machine</td><td>Frequency</td><td>Profile</td></tr>';
                contentHtml += crnExistHtml;
                contentHtml += '</table>';

                contentHtml += 'New cronjob entries:';
                contentHtml += '<table class="existing_cron_info" border="1">';
                contentHtml += '<tr><td>Target Machine</td><td>Frequency</td><td>Profile</td></tr>';
                contentHtml += popInfoHtml;
                contentHtml += '</table>';
                contentHtml += 'Do you want to replace?';


                myDialog2.set("title", "Info");
                button1 = "<button class='info-btn' data-dojo-type='dijit/form/Button' id='cron_replace_yes' value='Yes' type='submit'>Yes</button>";
                button2 = "<button class='info-btn' data-dojo-type='dijit/form/Button' id='cron_replace_no' value='No' type='submit'>No</button>";
                //myDialog2.set("content", "<div class='info-content'>Already has a cron for profile: "+crn_profile+" with this frequency, <br> Do you want to replace it with current selected profile?</div>" + "<center>" + button1 +" &nbsp;"+ button2 + "</center>");
                myDialog2.set("content", "<div class='info-content'>"+contentHtml+"</div>" + "<center>" + button1 + " &nbsp;" + button2 + "</center>");
                myDialog2.set("style", "height:auto;width:450px;");
                myDialog2.show();

                dojo.connect(dojo.byId("cron_replace_yes"), "click", function (evt) {
                    doRunProfile(defaultStatusSelectionIP, ip, show_profile, autoremediate, frequency);
                });

                dojo.connect(dojo.byId("cron_replace_no"), "click", function (evt) {
                    frequency = 'none';
                    doRunProfile(defaultStatusSelectionIP, ip, show_profile, autoremediate, frequency, 'no');
                });
            }else{
                doRunProfile(defaultStatusSelectionIP, ip, show_profile, autoremediate, frequency);
            }
            
        }else{
            doRunProfile(defaultStatusSelectionIP, ip, show_profile, autoremediate, frequency);
        }
        
    }, function (err) {
        if ('timeout' === err.dojoType) {
            myDialog3.set("title", "Timeout Error");
            button_ok = "<center><button class='info-btn-ok' data-dojo-type='dijit/form/Button' id='button_ok' type='submit'>OK</button></center>";
            myDialog3.set("content", "<div class='info-content'>Retry the web page by clicking the refresh/reload button, <br> if the problem persists then please contact the raxak administrator for further assistance.</div>" + button_ok);
            myDialog3.set("style", "height:160px;width:450px;");
            myDialog3.show();
        }
        else
        {
            myDialog3.set("title", "Error");
            button_ok = "<center><button class='info-btn-ok' data-dojo-type='dijit/form/Button' id='button_ok' type='submit'>OK</button></center>";
            myDialog3.set("content", "<div class='info-content'>Failed to fetch cronjobs <br> if the problem persists then please contact the raxak administrator for further assistance.</div>" + button_ok);
            myDialog3.set("style", "height:160px;width:450px;");
            myDialog3.show();
        }
    });
}


/**
 * 
 * @param {type} defaultStatusSelectionIP
 * @param {type} ip
 * @param {type} show_profile
 * @param {type} autoremediate
 * @param {type} frequency
 * @param {type} cronPromptConfirm = User confirmation input in popup
 * @returns {undefined}
 */
var doRunProfile = function(defaultStatusSelectionIP, ip, show_profile, autoremediate, frequency, cronPromptConfirm){
    sessionStorage.setItem('show_profile', show_profile);
    sessionStorage.setItem('autoremediate', autoremediate);
    sessionStorage.setItem('frequency', frequency);
    executingTM = ip;
    blockExecutingTMs(true);
    cronPromptConfirm = typeof cronPromptConfirm === 'undefined' ? 'yes' : 'no';

    var uri = "/raxakapi/v1/runProfiles/?ip=" + ip + "&profile=" + show_profile + "&autoremediate=" + autoremediate + "&frequency=" + frequency+ "&cron_prompt_confirm=" + cronPromptConfirm;
    dojo.xhrGet({
        url: uri,
        method: "GET",
        crossDomain: false,
        handleAs: "text",
        timeout: defaultTimeout
    }).then(function (htmlResults) {
        dojo.empty("success");
        dojo.empty("manual");
        dojo.empty("failed");
        executedIPs = ip
        profileRunIP = defaultStatusSelectionIP
        updateTimeSelector();
        dojo.style('ajaxloader', 'display', 'none');//18b
        var div = document.getElementById('indeterminateBar1');
        div.style.display = 'none';
        document.getElementById("try").style.color = "blue"
        document.getElementById("try").innerHTML = "Compliance checking in progress(0%).....";
        dijit.byId("applyprofile_id").setAttribute('disabled', true);
        dijit.byId("abort_execution_btn").setAttribute('disabled', false);
        //header_id = document.getElementById('th2');
        //header_id.innerHTML = "Executed on: Compliance checking in progress.";
        compliance_in_progress = true;
        statusExecution = setTimeout(function () {
            checkStatusOfExecution()
        }, 10000);

    }, function (err) {
        if ('timeout' === err.dojoType) {
            myDialog3.set("title", "Timeout Error");
            button_ok = "<center><button class='info-btn-ok' data-dojo-type='dijit/form/Button' id='button_ok' type='submit'>OK</button></center>";
            myDialog3.set("content", "<div class='info-content'>Retry the web page by clicking the refresh/reload button, <br> if the problem persists then please contact the raxak administrator for further assistance.</div>" + button_ok);
            myDialog3.set("style", "height:160px;width:450px;");
            myDialog3.show();
        } else {
            myDialog3.set("title", "Error");
            button_ok = "<center><button class='info-btn-ok' data-dojo-type='dijit/form/Button' id='button_ok' type='submit'>OK</button></center>";
            myDialog3.set("content", "<div class='info-content'> Unable to perform compliance checking.\nPlease contact the raxak administrator, if the problem persists." + "</div>" + button_ok);
            myDialog3.set("style", "height:160px;");
            myDialog3.show();
            $j14('#applySelectedProfileButtonClick .adtab2-overlay').css('display', 'none');//unblocking
        }
    });
};


require(["dojo/ready", "dojo/io-query"], function (ready, ioQuery) {
    ready(function () {

        var uri = "/raxakapi/v1/whoAmI/";

        dojo.xhrGet({
            url: uri,
            method: "GET",
            crossDomain: false,
            handleAs: "json",
            timeout: defaultTimeout
        }).then(function (htmlResults) {
            var json = htmlResults;
            if (json == null) {
                // redirect to login page
                window.location.replace('https://www.cloudraxak.net/login.html');
            }
            else {
                var login = document.getElementById('loginmessage');
                login.innerHTML = "<b>User:</b> " + json['email'];
                var userdomain = document.getElementById('userdomain');

                if (json['login'] === 'HP-CSA') {
                    userdomain.innerHTML = "Logged in with <img height='20px' alt='" + json['login'] + "' title='" + json['login'] + "' src='/lib/images/hp_icn.jpg'> ";
                }
                if (json['login'] === 'Amazon') {
                    userdomain.innerHTML = "Logged in with <img height='20px' alt='" + json['login'] + "' title='" + json['login'] + "' src='/lib/images/amzn_icn.jpg'> ";
                }
                if (json['login'] === 'Google') {
                    userdomain.innerHTML = "Logged in with <img height='16px' alt='" + json['login'] + "' title='" + json['login'] + "' src='/lib/images/ggle_icn.jpg'> ";
                }
                if (json['login'] === 'Local Auth') {
                    userdomain.innerHTML = "Logged in with " + json['login'];
                    document.getElementById('logout_span').innerHTML = "";
                }
                if (json['login'] === 'IBM') {
                    userdomain.innerHTML = "Logged in with <img height='16px' alt='" + json['login'] + "' title='" + json['login'] + "' src='/lib/images/ibm_icn.jpg'> ";   
                }
            }
        }, function (err) {
            if ('timeout' === err.dojoType) {
                myDialog3.set("title", "Timeout Error");
                button_ok = "<center><button class='info-btn-ok' data-dojo-type='dijit/form/Button' id='button_ok' type='submit'>OK</button></center>";
                myDialog3.set("content", "<div class='info-content'>Retry the web page by clicking the refresh/reload button, <br> if the problem persists then please contact the raxak administrator for further assistance.</div>" + button_ok);
                myDialog3.set("style", "height:160px;width:450px;");
                myDialog3.show();
            } else {
                myDialog3.set("title", "Error");
                button_ok = "<center><button class='info-btn-ok' data-dojo-type='dijit/form/Button' id='button_ok' type='submit'>OK</button></center>";
                myDialog3.set("content", "<div class='info-content'>Unable to load the current loged in user.\nPlease contact the raxak administrator, if the problem persists. </div>" + button_ok);
                myDialog3.set("style", "height:160px;width:450px;");
                myDialog3.show();
            }
        });
});
});

require(["dojo/ready", "dojo/io-query"], function (ready, ioQuery) {
    ready(function () {

        var uri = "/raxakapi/v1/version/";

        dojo.xhrGet({
            url: uri,
            method: "GET",
            crossDomain: false,
            handleAs: "text",
            timeout: defaultTimeout
        }).then(function (htmlResults) {
            var login = document.getElementById('codeversion');
            login.innerHTML = "<b>Version:</b> " + htmlResults;

        }, function (err) {
            if ('timeout' === err.dojoType) {
                myDialog3.set("title", "Timeout Error");
                button_ok = "<center><button class='info-btn-ok' data-dojo-type='dijit/form/Button' id='button_ok' type='submit'>OK</button></center>";
                myDialog3.set("content", "<div class='info-content'>Retry the web page by clicking the refresh/reload button, <br> if the problem persists then please contact the raxak administrator for further assistance.</div>" + button_ok);
                myDialog3.set("style", "height:160px;width:450px;");
                myDialog3.show();
            } else {
                myDialog3.set("title", "Error");
                button_ok = "<center><button class='info-btn-ok' data-dojo-type='dijit/form/Button' id='button_ok' type='submit'>OK</button></center>";
                myDialog3.set("content", "<div class='info-content'>Unable retrive the version of Target Machine(s).\nPlease contact the raxak administrator, if the problem persists.</div>" + button_ok);
                myDialog3.set("style", "height:160px;width:450px;");
                myDialog3.show();
            }
        });
});
});


require(["dojo/ready", "dojo/io-query"], function (ready, ioQuery) {
    ready(function () {

        var uri = "/raxakapi/v1/profiles/";

        dojo.xhrGet({
            url: uri,
            method: "GET",
            crossDomain: false,
            handleAs: "json",
            timeout: defaultTimeout
        }).then(function (htmlResults) {
            var json = htmlResults
            var container = document.getElementById('demo');
            var jsonarray = [];
            var i = 0;
            for (key in json) {
                jsonarray[jsonarray.length] = key;
            }
            jsonarray.sort();

            for (i = 0; i < jsonarray.length; i++) {
                key = jsonarray[i];
                var radio1 = document.createElement('input');
                radio1.id = 'myRadioId' + i;
                radio1.type = 'radio';
                radio1.name = 'radioGroup';
                radio1.value = key;
                //ASG - Temp hardcoded to Demonstration Profile 
                if (key == 'Demonstration Profile')
                {
                    radio1.checked = 'true';
                    dojo.query("label[for=selected_profile]")[0].innerHTML = key;
                    getRulesByProfile('Demonstration Profile');
                }

                var label1 = document.createElement('label');
                label1.setAttribute('for', radio1.id);
                label1.setAttribute('title', json[key]);
                label1.setAttribute('class', 'radio-label-hover-txt');
                label1.innerHTML = key+'<br>'+'<br>'

                container.appendChild(radio1);
                container.appendChild(label1);
            }
        }, function (err) {
            if ('timeout' === err.dojoType) {
                myDialog3.set("title", "Timeout Error");
                button_ok = "<center><button class='info-btn-ok' data-dojo-type='dijit/form/Button' id='button_ok' type='submit'>OK</button></center>";
                myDialog3.set("content", "<div class='info-content'>Retry the web page by clicking the refresh/reload button, <br> if the problem persists then please contact the raxak administrator for further assistance.</div>" + button_ok);
                myDialog3.set("style", "height:160px;width:450px;");
                myDialog3.show();
            } else {
                myDialog3.set("title", "Error");
                button_ok = "<center><button class='info-btn-ok' data-dojo-type='dijit/form/Button' id='button_ok' type='submit'>OK</button></center>";
                myDialog3.set("content", "<div class='info-content'>Unable to load the profiles .\nPlease contact the raxak administrator, if the problem persists.</div>" + button_ok);
                myDialog3.set("style", "height:160px;width:450px;");
                myDialog3.show();
            }
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
    for (var i = 0, iLen = ipadd_handler.options.length; i < iLen; i++) {
        opt_value = ipadd_handler.options[i].value;
        opt = ipadd_handler.options[i].getAttribute('nickname');
        var val = opt
        access_val = ipadd_handler.options[i].getAttribute('access')
        if (access_val == 1) {
            var success_opt = document.createElement('option');
            success_opt.innerHTML = val;
            success_opt.value = opt_value;
            success_opt.setAttribute('nickname',val);
            var failure_opt = document.createElement('option');
            failure_opt.innerHTML = val;
            failure_opt.value = opt_value;
            failure_opt.setAttribute('nickname',val);
            var manual_opt = document.createElement('option');
            manual_opt.innerHTML = val;
            manual_opt.value = opt_value;
            manual_opt.setAttribute('nickname',val);
            var console_opt = document.createElement('option');
            console_opt.innerHTML = val;
            console_opt.value = opt_value;
            console_opt.setAttribute('nickname',val);
            var report_opt = document.createElement('option');
            report_opt.innerHTML = val;
            report_opt.value = opt_value;
            report_opt.setAttribute('nickname',val);

            success_sel.appendChild(success_opt);
            failure_sel.appendChild(failure_opt);
            manual_sel.appendChild(manual_opt);
            console_sel.appendChild(console_opt);
            report_sel.appendChild(report_opt);
        }
    }

}

//Function for deletion of ips from success/failure/manual...
//tabs after applying the profile 
function updateIpSelectoronDelete(ip)
{
    dojo.empty("myselect1varlog");
    dojo.empty("myselect2varlog");
    dojo.empty("myselect3varlog");
    dojo.empty("myselect4varlog");
    dojo.empty("myselect5varlog");

    var success_sel = document.getElementById("myselect1");
    var failure_sel = document.getElementById("myselect2");
    var manual_sel = document.getElementById("myselect3");
    var console_sel = document.getElementById("myselect4");
    var report_sel = document.getElementById("myselect5");
    var ipadd_handler = document.getElementById("ipaddms2side__dx");
    var ip_dict= {};
    nodes = success_sel.childNodes;
    for (var i = 0; i < nodes.length; i++){
       val = nodes[i].value
       nickname_text = nodes[i].text 
       ip_dict[val]=nickname_text ;
   }
   var ip_obj = ip.split(",");
   for (var j=0 ; j < ip_obj.length ; j++){
       ip = ip_obj[j];
       if (ip in ip_dict){
          delete ip_dict[ip];
      }
  }
  obj_keys = Object.keys(ip_dict)
  dojo.empty("myselect1");
  dojo.empty("myselect2");
  dojo.empty("myselect3");
  dojo.empty("myselect4");
  dojo.empty("myselect5");
  if (obj_keys != ""){
   for(var k in ip_dict ){
      if ( k == "undefined")
      {
         continue
     }
     var success_opt = document.createElement('option');
     success_opt.innerHTML = ip_dict[k];
     success_opt.value = k;
     success_opt.setAttribute('nickname',ip_dict[k]);
     var failure_opt = document.createElement('option');
     failure_opt.innerHTML = ip_dict[k];
     failure_opt.value =  k;
     failure_opt.setAttribute('nickname',ip_dict[k]);
     var manual_opt = document.createElement('option');
     manual_opt.innerHTML = ip_dict[k];
     manual_opt.value = k;
     manual_opt.setAttribute('nickname',ip_dict[k]);
     var console_opt = document.createElement('option');
     console_opt.innerHTML = ip_dict[k];
     console_opt.value = k;
     console_opt.setAttribute('nickname',ip_dict[k]);
     var report_opt = document.createElement('option');
     report_opt.innerHTML = ip_dict[k];
     report_opt.value = k;
     report_opt.setAttribute('nickname',ip_dict[k]);

     success_sel.appendChild(success_opt);
     failure_sel.appendChild(failure_opt);
     manual_sel.appendChild(manual_opt);
     console_sel.appendChild(console_opt);
     report_sel.appendChild(report_opt);
 }
 var x = document.getElementById("myselect1").selectedIndex;
 var y = document.getElementById("myselect1").options;
 profileRunIP = y[x].value;

 updateSelectedProfilePage();
}
else{
	profileRunIP = "None";
	document.getElementById("textarea_id").value = "";
    txtareaContentConsoleTab = "";
    dojo.empty("hostId");
    dojo.empty("osId");
    dojo.empty("ipAddress");
    dojo.empty("executionId");
    dojo.empty("totalId");
    dojo.empty("passedId");
    dojo.empty("failedId");
    dojo.empty("manualId");
    dojo.empty("th2");
}
}

//updates the nickname in select box of success/failure/mauale..
//tabs after modify
function updateIponModify(full_submit_ip,submit_nick_name)
{
    dojo.empty("myselect1varlog");
    dojo.empty("myselect2varlog");
    dojo.empty("myselect3varlog");
    dojo.empty("myselect4varlog");
    dojo.empty("myselect5varlog");
    var success_sel = document.getElementById("myselect1");
    var failure_sel = document.getElementById("myselect2");
    var manual_sel = document.getElementById("myselect3");
    var console_sel = document.getElementById("myselect4");
    var report_sel = document.getElementById("myselect5");
    var ipadd_handler = document.getElementById("ipaddms2side__dx");
    var ip_dict= {};
    nodes = success_sel.childNodes;
    for (var i = 0; i < nodes.length; i++){
       val = nodes[i].value
       nickname_text = nodes[i].text 
       ip_dict[val]=nickname_text ;
   }
   obj_keys = Object.keys(ip_dict)
   dojo.empty("myselect1");
   dojo.empty("myselect2");
   dojo.empty("myselect3");
   dojo.empty("myselect4");
   dojo.empty("myselect5");
   var new_list = [];
   var profile_ip_dict = {};
   if (obj_keys != ""){
       for(var k in ip_dict ){
          if ( k == "undefined"){
            continue
        }
        var success_opt = document.createElement('option');
        var failure_opt = document.createElement('option');
        var manual_opt = document.createElement('option');
        var console_opt = document.createElement('option');
        var report_opt = document.createElement('option');
        if (k != profileRunIP){

         new_list.push(k);
     }
 }
 new_list.splice(0,0,profileRunIP);
 for(var ip in new_list ){
  var success_opt = document.createElement('option');
  var failure_opt = document.createElement('option');
  var manual_opt = document.createElement('option');
  var console_opt = document.createElement('option');
  var report_opt = document.createElement('option');
  success_opt.value = new_list[ip];
  failure_opt.value = new_list[ip];
  manual_opt.value = new_list[ip];
  console_opt.value = new_list[ip];
  report_opt.value = new_list[ip];
  if ( new_list[ip] == full_submit_ip){
     if (submit_nick_name == "" ){
         submit_nick_name = new_list[ip];
     }
     success_opt.setAttribute('nickname',submit_nick_name);
     success_opt.innerHTML = submit_nick_name;
     failure_opt.setAttribute('nickname',submit_nick_name);
     failure_opt.innerHTML = submit_nick_name;
     manual_opt.setAttribute('nickname',submit_nick_name);
     manual_opt.innerHTML = submit_nick_name;
     console_opt.setAttribute('nickname',submit_nick_name);
     console_opt.innerHTML = submit_nick_name;
     report_opt.setAttribute('nickname',submit_nick_name);
     report_opt.innerHTML = submit_nick_name;
 }
 else
 {
  success_opt.setAttribute('nickname',ip_dict[new_list[ip]]);
  success_opt.innerHTML = ip_dict[new_list[ip]];
  failure_opt.setAttribute('nickname',ip_dict[new_list[ip]]);
  failure_opt.innerHTML = ip_dict[new_list[ip]];
  manual_opt.setAttribute('nickname',ip_dict[new_list[ip]]);
  manual_opt.innerHTML = ip_dict[new_list[ip]];
  console_opt.setAttribute('nickname',ip_dict[new_list[ip]]);
  console_opt.innerHTML = ip_dict[new_list[ip]];
  report_opt.setAttribute('nickname',ip_dict[new_list[ip]]);
  report_opt.innerHTML = ip_dict[new_list[ip]];
}
success_sel.appendChild(success_opt);
failure_sel.appendChild(failure_opt);
manual_sel.appendChild(manual_opt);
console_sel.appendChild(console_opt);
report_sel.appendChild(report_opt);
}
}
}

require(["dojo/ready"], function (ready) {
    ready(function () {

        dojo.connect(dojo.byId("myselect1"), "onchange", function (evt) {
            var x = document.getElementById("myselect1").value;
            onChangeIpSelValue(x)
            dojo.stopEvent(evt);
        });
        dojo.connect(dojo.byId("myselect2"), "onchange", function (evt) {
            var x = document.getElementById("myselect2").value;
            onChangeIpSelValue(x)
            dojo.stopEvent(evt);
        });
        dojo.connect(dojo.byId("myselect3"), "onchange", function (evt) {
            var x = document.getElementById("myselect3").value;
            onChangeIpSelValue(x)
            dojo.stopEvent(evt);
        });
        dojo.connect(dojo.byId("myselect4"), "onchange", function (evt) {
            var x = document.getElementById("myselect4").value;
            /*cleanConsoleSearchContent("myselect4-onchange");*/
            onChangeIpSelValue(x)
            dojo.stopEvent(evt);
        });
        dojo.connect(dojo.byId("myselect5"), "onchange", function (evt) {
            var x = document.getElementById("myselect5").value;
            onChangeIpSelValue(x)
            updateReportPans()
            dojo.stopEvent(evt);
        });
        //Binding event for all history-log selectors.
        dojo.connect(dojo.byId("myselect1varlog"), "onchange", function (evt) {
            var y = document.getElementById("myselect1varlog").value;
            onChangeTimeStmpSelValue(y)
            dojo.stopEvent(evt);
        });

        dojo.connect(dojo.byId("myselect2varlog"), "onchange", function (evt) {
            var y = document.getElementById("myselect2varlog").value;
            onChangeTimeStmpSelValue(y)
            dojo.stopEvent(evt);
        });

        dojo.connect(dojo.byId("myselect3varlog"), "onchange", function (evt) {
            var y = document.getElementById("myselect3varlog").value;
            onChangeTimeStmpSelValue(y)
            dojo.stopEvent(evt);
        });

        dojo.connect(dojo.byId("myselect4varlog"), "onchange", function (evt) {
            var y = document.getElementById("myselect4varlog").value;
            onChangeTimeStmpSelValue(y)
            /*flagTriggerSort = true;*/ //global
            dojo.stopEvent(evt);
        });

        dojo.connect(dojo.byId("myselect5varlog"), "onchange", function (evt) {
            var y = document.getElementById("myselect5varlog").value;
		//document.getElementById("report_detailed_log").selectedIndex ="0";
            onChangeTimeStmpSelValue(y)
            //Updating report panes on selection of file from archive sel of Report Log tab. 
            updateReportPans()
            dojo.stopEvent(evt);
        });

    });
});

function checkData(user_val, user_ip, user_nickname, private_username, private_password, private_tunnelIP) {

    check_user = /^[a-zA-Z0-9~!#^%*&`\_\-{|}/'$?+=]+([\.]?[a-zA-Z0-9~!#^%*&`\_\-{|}/'$?+=]+)?$/;
    check_nickname = /^[Aa-zZ0-9\.\@]*/
    user_val = user_val.trim();

    if (user_nickname !== '') {
        user_nickname = user_nickname.trim();
    }
    if (user_val == '' && user_ip == '') {
        myDialog2.set("title", "Error");
        button = "<button class='info-btn' data-dojo-type='dijit/form/Button' id='leave_tab_ok' value='OK' type='submit'>OK</button>"
        myDialog2.set("content", "<div class='info-content'>Please enter Username and IP Address</div>" + "<center>" + button + "</center>");
        myDialog2.set("style", "height:140px;");
        myDialog2.show()
    }
    else if (user_ip == '') {
        myDialog2.set("title", "Error");
        button = "<button class='info-btn' data-dojo-type='dijit/form/Button' id='leave_tab_ok' value='OK' type='submit'>OK</button>"
        myDialog2.set("content", "<div class='info-content'>Please enter IP Address</div>" + "<center>" + button + "</center>");
        myDialog2.set("style", "height:140px;");
        myDialog2.show()
    }
    else if (user_val == '') {
        myDialog2.set("title", "Error");
        button = "<button class='info-btn' data-dojo-type='dijit/form/Button' id='leave_tab_ok' value='OK' type='submit'>OK</button>"
        myDialog2.set("content", "<div class='info-content'>Please enter Username</div>" + "<center>" + button + "</center>");
        myDialog2.set("style", "height:140px;");
        myDialog2.show()
    }
    else if ((user_val.length < 1) || (user_val.length > 20)) {

        myDialog2.set("title", "Error");
        button = "<button class='info-btn' data-dojo-type='dijit/form/Button' id='leave_tab_ok' value='OK' type='submit'>OK</button>"
        myDialog2.set("content", "<div class='info-content'>Username should not be more than 20 characters</div>" + "<center>" + button + "</center>");
        myDialog2.set("style", "height:140px;");
        myDialog2.show()
    }
    else if ((user_val != '') && user_val.match(' ')) {
        myDialog2.set("title", "Error");
        button = "<button class='info-btn' data-dojo-type='dijit/form/Button' id='leave_tab_ok' value='OK' type='submit'>OK</button>"
        myDialog2.set("content", "<div class='info-content'>Spaces not allowed in Username</div>" + "<center>" + button + "</center>");
        myDialog2.set("style", "height:140px;");
        myDialog2.show()
    }
    else if (!user_val.match(check_user)) {
        myDialog2.set("title", "Error");
        button = "<button class='info-btn' data-dojo-type='dijit/form/Button' id='leave_tab_ok' value='OK' type='submit'>OK</button>"
        myDialog2.set("content", "<div class='info-content'>Please enter a valid Username</div>" + "<center>" + button + "</center>");
        myDialog2.set("style", "height:140px;");
        myDialog2.show()
    }
    /* Start: #390 comment
    else if ((user_nickname.length < 0) || (user_nickname.length > 50)) {

        myDialog2.set("title", "Error");
        button = "<button class='info-btn' data-dojo-type='dijit/form/Button' id='leave_tab_ok' value='OK' type='submit'>OK</button>"
        myDialog2.set("content", "<div class='info-content'>Nickname should not be more than 50 characters</div>" + "<center>" + button + "</center>");
        myDialog2.set("style", "height:140px;");
        myDialog2.show()
    }
    else if ((user_nickname != '') && user_nickname.match(' ')) {
        myDialog2.set("title", "Error");
        button = "<button class='info-btn' data-dojo-type='dijit/form/Button' id='leave_tab_ok' value='OK' type='submit'>OK</button>"
        myDialog2.set("content", "<div class='info-content'>Spaces not allowed in Nickname</div>" + "<center>" + button + "</center>");
        myDialog2.set("style", "height:140px;");
        myDialog2.show()
    }
    else if ((user_nickname != '') && (!user_nickname.match(check_nickname))) {
        myDialog2.set("title", "Error");
        button = "<button class='info-btn' data-dojo-type='dijit/form/Button' id='leave_tab_ok' value='OK' type='submit'>OK</button>"
        myDialog2.set("content", "<div class='info-content'>Please enter a valid Nickname</div>" + "<center>" + button + "</center>");
        myDialog2.set("style", "height:140px;");
        myDialog2.show()
    }
    End: #390 comment */
    else {
        RegE = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)(\s+-p\s+\d+)*$/
        if (user_ip.match(RegE)) {
            ip = user_val + '@' + user_ip
            ip_list_target = [];
            var selAddTargets = document.getElementById('ipadd_del');
            var sel = document.getElementById("ipadd");

            if (user_nickname == '') {
             user_nickname = ip;
         }

         nodes = selAddTargets.childNodes;
         last_index = nodes.length
         for (var i = 0; i < nodes.length; i++) {
            ip_list_target.push(nodes[i].value);
        }
        if (ip_list_target.length == 10) 
        {
            myDialog2.set("title", "Error");
            button = "<button class='info-btn' data-dojo-type='dijit/form/Button' id='leave_tab_ok' value='OK' type='submit'>OK</button>"
            myDialog2.set("content", "<div class='info-content'>Cannot have more than 10 machines enrolled</div>" + "<center>" + button + "</center>");
            myDialog2.set("style", "height:140px;");
            myDialog2.show()
            return
        }
        val = ip_list_target.indexOf(ip);
        if (val != -1) {
            myDialog2.set("title", "Error");
            button = "<button class='info-btn' data-dojo-type='dijit/form/Button' id='leave_tab_ok' value='OK' type='submit'>OK</button>"
            myDialog2.set("content", "<div class='info-content'>IP address " + ip + " " + "already in list  </div>" + "<center>" + button + "</center>");
            myDialog2.set("style", "height:140px;");
            myDialog2.show()
        }
        else {
            var opt = document.createElement('option');
            opt.innerHTML = user_nickname;
            opt.value = ip;
            opt.setAttribute('class', 'grayclass');
            opt.setAttribute('title', ip + ' : Access check in progress');

            var opt1 = document.createElement('option');
            opt1.innerHTML = user_nickname;
            opt1.value = ip;
            opt1.setAttribute('class', 'grayclass');
            opt1.setAttribute('title', ip + ' : Access check in progress');
            sel.appendChild(opt1);
            selAddTargets.appendChild(opt);

            var uri = "";
            if((private_username !== '') && (private_password !== '') && (private_tunnelIP !== '')){
                uri = "/raxakapi/v1/addIP/?username=raxak&ip=" + ip + "&nickname=" + user_nickname+ "&tunnelUsername=" + private_username+ "&tunnelPassword=" + private_password+ "&tunnelIP=" + private_tunnelIP;
            }else{
                uri = "/raxakapi/v1/addIP/?username=raxak&ip=" + ip + "&nickname=" + user_nickname
            }

                var opt1 = document.createElement('option');
                opt1.innerHTML = user_nickname;
                opt1.value = ip;
                opt1.setAttribute('class', 'grayclass');
                opt1.setAttribute('title', ip + ' : Access check in progress');
                sel.appendChild(opt1);
                selAddTargets.appendChild(opt);

                var uri = "";
                if((private_username !== '') && (private_password !== '') && (private_tunnelIP !== '')){
                    uri = "/raxakapi/v1/addIP/?username=raxak&ip=" + ip + "&nickname=" + user_nickname+ "&tunnelUsername=" + private_username+ "&tunnelPassword=" + private_password+ "&tunnelIP=" + private_tunnelIP;
                }else{
                    uri = "/raxakapi/v1/addIP/?username=raxak&ip=" + ip + "&nickname=" + user_nickname
                }
                dojo.style('ajaxloader', 'display', 'block');//5a
                dijit.byId('formDialog').hide();

                dojo.xhrGet({
                    url: uri,
                    method: "GET",
                    crossDomain: false,
                    handleAs: "json",
                    timeout: defaultTimeout + 10000
                }).then(function (htmlResults) {
                    var arrayOfObjects = eval(htmlResults);

                    tmCount = tmCount + 1;//tmCount is global, since only one TM is being added with this call!
                    selectOnlyRemainingTM();

                    ip_add = arrayOfObjects[0].ip;
                    nickname = arrayOfObjects[0].nickname;
                    ip_access = arrayOfObjects[0].access;
                    selAddTargets.remove(last_index)
                    if (ip_access == -2) {
                        opt.setAttribute('class', 'pingnotreachableclass');
                        opt.setAttribute('title', ip + ' : Unable to reach IP address');
                        opt.setAttribute('access', ip_access);
                    }
                    else if (ip_access == 1) {
                    	osname = arrayOfObjects[0].osname;
                    	osversion = arrayOfObjects[0].osversion;
                        opt.setAttribute('class', 'pingreachclass');
                        if( typeof (osname) == 'undefined' || typeof(osversion) == 'undefined')
                        {
                         opt.setAttribute('title', ip + ' : ALL OK');
                     }
                     else
                     {
                         opt.setAttribute('title', ip +' ( '+osname + ' v' +osversion + ' )');
                     }
                     opt.setAttribute('access', ip_access);
                 }
                 else if (ip_access == -1) {
                    opt.setAttribute('class', 'orangeclass');
                    opt.setAttribute('title', ip + ' : OS not supported');
                    opt.setAttribute('access', ip_access);
                }
                else if (ip_access == -3) {
                    opt.setAttribute('class', 'yellowclass');
                    opt.setAttribute('title', ip + ' : Unable to log in with specified userid (ssh login fails)');
                    opt.setAttribute('access', ip_access);
                }
                else if (ip_access == -4) {
                    opt.setAttribute('class', 'blueclass');
                    opt.setAttribute('title', ip + ' : Insufficient execution privilege');
                    opt.setAttribute('access', ip_access);
                }

                /* Start: #443*/
                var optClass = opt.getAttribute('class');

                $j14(".selectedIPs_del input:checkbox").each(function () {
                    if ($j14(this).is(":checked")) {
                        if(ip_access == this.value){
                            opt.setAttribute('class', optClass + ' displayBlock');
                        }

                        if(this.value == '1,-1,-2,-3,-4'){
                            opt.setAttribute('class', optClass + ' displayBlock');
                        }

                    }else{
                        if(ip_access == this.value){
                            opt.setAttribute('class', optClass + ' displayNone');
                        }
                    }
                });
                /* End: #443*/

                selAddTargets.appendChild(opt);

                $j14('#search_machine').val('');
                $j14(function () {
                    $j14('#ipadd_del').filterByText($j14('#search_machine'), false);
                });

                dijit.byId("deleteip_id").setAttribute('disabled', false);
                dijit.byId("modifyip").setAttribute('disabled', false);
                dijit.byId("access_target_id").setAttribute('disabled', false);

                    dojo.style('ajaxloader', 'display', 'none');//5b1

                    dijit.byId("formDialog").reset();
                }, function (err) {
                    dojo.style('ajaxloader', 'display', 'none');//5b2
                    if ('timeout' === err.dojoType) {
                        myDialog3.set("title", "Timeout Error");
                        button_ok = "<center><button class='info-btn-ok' data-dojo-type='dijit/form/Button' id='button_ok' type='submit'>OK</button></center>";
                        myDialog3.set("content", "<div class='info-content'>Retry the web page by clicking the refresh/reload button, <br> if the problem persists then please contact the raxak administrator for further assistance.</div>" + button_ok);
                        myDialog3.set("style", "height:160px;width:450px;");
                        myDialog3.show();
                    } else {

                     myDialog3.set("title", "Error");
                     button_ok = "<center><button class='info-btn-ok' data-dojo-type='dijit/form/Button' id='button_ok' type='submit'>OK</button></center>";
                     myDialog3.set("content", "<div class='info-content'>Unable to add the Target Machine(s).\nPlease contact the raxak administrator, if the problem persists.</div>" + button_ok);
                     myDialog3.set("style", "height:160px;width:450px;");
                     myDialog3.show();
                     dijit.byId('formDialog').show();
                 }
             });
}
}
else {
    myDialog2.set("title", "Error");
    button = "<button class='info-btn' data-dojo-type='dijit/form/Button' id='leave_tab_ok' value='OK' type='submit'>OK</button>"
    myDialog2.set("content", "<div class='info-content'> Please enter valid IP Address (1)</div>" + "<center>" + button + "</center>");
    myDialog2.set("style", "height:140px;");
    myDialog2.show()

}
document.getElementById('ipaddress').value = '';
document.getElementById('username').value = 'raxak';
$j14("#username_pip").val('');
$j14("#ipaddress_pip").val('');
$j14("#paswd_pip").val('');
}
var nickval = document.getElementById('nickname2').value = '';
}

//checkAccess api call
require(["dojo/ready", "dojo/io-query","dojo/query", "dojo/NodeList-manipulate"], function (ready, ioQuery) {
    ready(function () {
        dojo.connect(dojo.byId("access_target_id"), "click", function (evt) {
            var idStatus = dojo.attr("access_target_id", 'disabled');
            if (idStatus) {
                return;
            }

            var ip = [];
            var selAddTargets = document.getElementById('ipadd_del');
            var iLen = selAddTargets.options.length;

            var aChkboxValues = [];
            $j14(".selectedIPs_del input:checkbox").each(function () {
                if ($j14(this).is(":checked")) {
                    aChkboxValues.push(this.value);
                }
            });

            for (var i = 0; i < iLen; i++) {
                if (selAddTargets.options[i].selected == true) {

                    if($j14.inArray("1,-1,-2,-3,-4", aChkboxValues) > -1){
                        ip.push(selAddTargets.options[i].value);
                    }

                    var existFlag = $j14.inArray(selAddTargets.options[i].getAttribute('access') , aChkboxValues);
                    if(existFlag > -1){
                        ip.push(selAddTargets.options[i].value);
                    }
                }
            }
            ip = ip.join();

            if (ip != "") {
                myDialog2.set("title", "Info");
                button_ok = "<center><button class='info-btn-ok' data-dojo-type='dijit/form/Button' id='button_ok' type='submit'>OK</button></center>"
                myDialog2.set("content", "<div class='info-content'>Retesting of access to the selected entries, it will take some time to complete..</div>" + button_ok);
                myDialog2.show()
                setTimeout("myDialog2.hide()", 3000);
                dijit.byId("access_target_id").setAttribute('disabled', true);
                selAddTargets.setAttribute('disabled', true);
                document.getElementById('allOk_del').disabled = true;
                document.getElementById('unsupportedOS_del').disabled = true;
                document.getElementById('unabletoreach_del').disabled = true;
                document.getElementById('unabletologinwithspecifieduser_del').disabled = true;
                document.getElementById('insufficientexecutionprivilege_del').disabled = true;
                document.getElementById('alltargetmachines_del').disabled = true;

                var uri = "/raxakapi/v1/checkAccess/?username=raxak&ip=" + ip
                dojo.style('ajaxloader', 'display', 'block');//6a

                dojo.xhrGet({
                    url: uri,
                    method: "GET",
                    crossDomain: false,
                    handleAs: "json",
                    //timeout: defaultTimeout + 10000
                    timeout: defaultTimeout + 100000
                }).then(function (htmlResults) {
                    var arrayOfObjects = eval(htmlResults);
                    for (var i in arrayOfObjects) {
                        var opt = document.createElement('option');
                        target_ip = arrayOfObjects[i].ip;
                        nickname = arrayOfObjects[i].nickname;
                        target_access = arrayOfObjects[i].access;
                        opt.innerHTML = nickname;
                        opt.value = target_ip;
                        if (target_access == -2) {
                            opt.setAttribute('class', 'pingnotreachableclass');
                            opt.setAttribute('title', target_ip + 'Unable to reach IP address');
                            opt.setAttribute('access', target_access);
                        }
                        else if (target_access == 1) {
                           osname = arrayOfObjects[0].osname;
                           osversion = arrayOfObjects[0].osversion;
                           opt.setAttribute('class', 'pingreachclass');
                           if( typeof (osname) == 'undefined' || typeof(osversion) == 'undefined')
                           {
                              opt.setAttribute('title', target_ip + ' : ALL OK');
                          }
                          else
                          {
                              opt.setAttribute('title', target_ip +' ( '+osname + ' v' +osversion + ' )');
                          }
                          opt.setAttribute('access', target_access);
                      }
                      else if (target_access == -1) {
                        opt.setAttribute('class', 'orangeclass');
                        opt.setAttribute('title', target_ip + 'OS not supported');
                        opt.setAttribute('access', target_access);
                    }
                    else if (target_access == -3) {
                        opt.setAttribute('class', 'yellowclass');
                        opt.setAttribute('title', target_ip + 'Unable to log in with specified userid (ssh login fails)');
                        opt.setAttribute('access', target_access);
                    }
                    else if (target_access == -4) {
                        opt.setAttribute('class', 'blueclass');
                        opt.setAttribute('title', target_ip + 'Insufficient execution privilege');
                        opt.setAttribute('access', target_access);
                    }
                    else if (target_access == -5) {
                        opt.setAttribute('class', 'grayclass');
                        opt.setAttribute('title', target_ip + 'Access check in progress');
                        opt.setAttribute('access', target_access);
                    }
                        //selAddTargets.remove(selAddTargets.selectedIndex);
                        $j14(".ipadd_del option[value='"+target_ip+"']").remove();

                        /* Start: #442*/
                        var optClass = opt.getAttribute('class');

                        $j14(".selectedIPs_del input:checkbox").each(function () {
                            if ($j14(this).is(":checked")) {
                                if(target_access == this.value){
                                    opt.setAttribute('class', optClass + ' displayBlock');
                                }

                                if(this.value == '1,-1,-2,-3,-4'){
                                    opt.setAttribute('class', optClass + ' displayBlock');
                                }

                            }else{
                                if(target_access == this.value){
                                    opt.setAttribute('class', optClass + ' displayNone');
                                }
                            }
                        });
                        /* End: #442*/

                        selAddTargets.appendChild(opt);
                    }
                    dojo.style('ajaxloader', 'display', 'none');//6b
                    selAddTargets.removeAttribute("disabled");
                    dijit.byId("access_target_id").setAttribute('disabled', false);
                    document.getElementById('allOk_del').disabled = false;
                    document.getElementById('unsupportedOS_del').disabled = false;
                    document.getElementById('unabletoreach_del').disabled = false;
                    document.getElementById('unabletologinwithspecifieduser_del').disabled = false;
                    document.getElementById('insufficientexecutionprivilege_del').disabled = false;
                    document.getElementById('alltargetmachines_del').disabled = false;

                    selectOnlyRemainingTM();
                }, function (err) {
                    if ('timeout' === err.dojoType) {
                        myDialog3.set("title", "Timeout Error");
                        button_ok_id = "<center><button class='info-btn-ok' data-dojo-type='dijit/form/Button' id='button_ok_id' type='submit'>OK</button></center>";
                        myDialog3.set("content", "<div class='info-content'>Retry the web page by clicking the refresh/reload button, <br> if the problem persists then please contact the raxak administrator for further assistance.</div>" + button_ok_id);
                        myDialog3.set("style", "height:160px;width:450px;");
                        myDialog3.show();
                    }
                    dojo.style('ajaxloader', 'display', 'none');//6c
                    selAddTargets.removeAttribute("disabled");
                    dijit.byId("access_target_id").setAttribute('disabled', false);
                    document.getElementById('allOk_del').disabled = false;
                    document.getElementById('unsupportedOS_del').disabled = false;
                    document.getElementById('unabletoreach_del').disabled = false;
                    document.getElementById('unabletologinwithspecifieduser_del').disabled = false;
                    document.getElementById('insufficientexecutionprivilege_del').disabled = false;
                    document.getElementById('alltargetmachines_del').disabled = false;

                    selectOnlyRemainingTM();
                });
}
else {
    selAddTargets.removeAttribute("disabled");
    dijit.byId("access_target_id").setAttribute('disabled', false);
    document.getElementById('allOk_del').disabled = false;
    document.getElementById('unsupportedOS_del').disabled = false;
    document.getElementById('unabletoreach_del').disabled = false;
    document.getElementById('unabletologinwithspecifieduser_del').disabled = false;
    document.getElementById('insufficientexecutionprivilege_del').disabled = false;
    document.getElementById('alltargetmachines_del').disabled = false;

    myDialog2.set("title", "Info");
                //ASG - Should be proper standard message - modified for the demo purpose
                button_ok_id = "<center><button class='info-btn-ok' data-dojo-type='dijit/form/Button' id='button_ok_id' type='submit'>OK</button></center>"
                myDialog2.set("content", "<div class='info-content'>Please select a Target Machine" + "</div>" + button_ok_id);
                myDialog2.show()
            }
        });
});
});

function getComparisionDetailReport(){

    var userProfileSelectedTimestamp = document.getElementById("myselect5varlog").value;
    var userProfileIpAddress = document.getElementById("myselect5").value;
    var userProfileName = document.getElementById('profileId').innerHTML;
    if(!emptyCheck(userProfileSelectedTimestamp) && !emptyCheck(userProfileIpAddress) && !emptyCheck(userProfileName)){
        var archieveLogTimestampObj = new Date(userProfileSelectedTimestamp);
        var archieveLogTimestamp = archieveLogTimestampObj.toUTCString();
        var archieveLogFirst = false;
        if($j14("#myselect5varlog option:selected").index()==0){
            archieveLogFirst = true;
        }
        
        var content = {profilename:userProfileName, usernameIP:userProfileIpAddress, archieveLogTimestamp:archieveLogTimestamp, archieveLogTimestampGmt:userProfileSelectedTimestamp,'archieveLogFirst':archieveLogFirst}; 
        var uri = "/raxakapi/v1/getComparisionDetailReport";
        dojo.xhrPost({
            url: uri,
            postData: content,
        }).then(function (htmlResults) {
            var popUp = window.open();
            if (popUp == null || typeof(popUp)=='undefined') { 	
                alert('Please disable your pop-up blocker and click the "view report" link again.'); 
            } 
            else { 	
                var pagetitle = window.document.title;
                popUp.document.title = "Cloud Raxak - Detailed Target Machine report";
                $j14(popUp.document.body).html(htmlResults);
                window.document.title = pagetitle;
            }
        }, function (err) {
            if ('timeout' === err.dojoType) {
                myDialog3.set("title", "Timeout Error");
                button_ok = "<center><button class='info-btn-ok' data-dojo-type='dijit/form/Button' id='button_ok' type='submit'>OK</button></center>";
                myDialog3.set("content", "<div class='info-content'>Retry the web page by clicking the refresh/reload button, <br> if the problem persists then please contact the raxak administrator for further assistance.</div>" + button_ok);
                myDialog3.set("style", "height:160px;width:450px;");
                myDialog3.show();
            }
            
        });
}
}

function difference_dialog() {
    if (selectedTimeStamp == 'None') {
        myDialog2.set("title", "Info");
        button_ok = "<center><button class='info-btn-ok' data-dojo-type='dijit/form/Button' id='button_ok' type='submit'>OK</button></center>"
        myDialog2.set("content", "<div class='info-content'>Please click on Apply profile to see the difference " + "</div>" + button_ok);
        myDialog2.show()
    }
    else {
        dijit.byId("diffDialog").show();        
        dojo.style('ajaxloader', 'display', 'block');//9a
        var date_obj = new Date(selectedTimeStamp);
        var timestamp = date_obj.toUTCString();
        // get the rules status with the timestamp 
        var uri = "/raxakapi/v1/getComparisionReport";
        var content = {profilename:show_profile, usernameIP:profileRunIP, archieveLogTimestamp:timestamp}; 
        
        dojo.xhrPost({
            url: uri,
            postData: content,
        }).then(function (htmlResults) {
            dojo.query("#diffDialog .dijitDialogPaneContent").innerHTML(htmlResults);
            updateStatusPans();
            var time_offset = 5.5;
            var report_a_timestamp = dojo.byId("report_a_archieve_log_timestamp");
            if(report_a_timestamp){
                var arch_time = new Date(report_a_timestamp.innerHTML + ' UTC');
                report_a_timestamp.innerHTML = arch_time.toString().split("GMT")[0];
            }
            
            var report_b_timestamp = dojo.byId("report_b_archieve_log_timestamp");
            if(report_b_timestamp){
                var arch_time = new Date(report_b_timestamp.innerHTML + ' UTC');
                report_b_timestamp.innerHTML = arch_time.toString().split("GMT")[0];
            }
            
        }, function (err) {
            if ('timeout' === err.dojoType) {
                myDialog3.set("title", "Timeout Error");
                button_ok = "<center><button class='info-btn-ok' data-dojo-type='dijit/form/Button' id='button_ok' type='submit'>OK</button></center>";
                myDialog3.set("content", "<div class='info-content'>Retry the web page by clicking the refresh/reload button, <br> if the problem persists then please contact the raxak administrator for further assistance.</div>" + button_ok);
                myDialog3.set("style", "height:160px;width:450px;");
                myDialog3.show();
            }
        });
    }//else 
}



// check the Description of title in comparision  	
function ShowruleDesc(rulenum) {
    rulenum = rulenum.substring(2);
    var checkString;
    var fixString;

    var uri = "/raxakapi/v1/showCheckRule/" + rulenum
    dojo.style('ajaxloader', 'display', 'block');//12a
    dojo.xhrGet({
        url: uri,
        method: "GET",
        crossDomain: false,
        handleAs: "text",
        timeout: defaultTimeout
    }).then(function (htmlResults) {
        var res = htmlResults.split("\n");

        checkString = "<h2><b class='focus-top' tabindex='0'>Check Description: </b></h2>"
        for (i = 0; i < res.length; i++)
        {
            checkString = checkString + "<p>" + res[i] + "<\p>";
        }

        var uri = "/raxakapi/v1/showFixRule/" + rulenum
        dojo.xhrGet({
            url: uri,
            method: "GET",
            crossDomain: false,
            handleAs: "text",
            timeout: defaultTimeout
        }).then(function (htmlResults) {
            var res = htmlResults.split("\n");
            fixString = "<h2><b>Fix Description: </b></h2>"
            for (i = 0; i < res.length; i++)
            {
                fixString = fixString + "<p>" + res[i] + "<\p>";
            }
            dojo.style('ajaxloader', 'display', 'none');//12b1

            button = "<center><button style='text-align: center' data-dojo-type='dijit/form/Button' type='submit'>Close</button></center>"
            myDialog.set("title", "Rule " + rulenum);
            myDialog.set("content", checkString + fixString + button);
            myDialog.set("style", "width: 450px; height:300px;")
            myDialog.show()
        }, function (err) {
            dojo.style('ajaxloader', 'display', 'none');//12b2
            if ('timeout' === err.dojoType) {
                myDialog3.set("title", "Timeout Error");
                button_ok = "<center><button class='info-btn-ok' data-dojo-type='dijit/form/Button' id='button_ok' type='submit'>OK</button></center>";
                myDialog3.set("content", "<div class='info-content'>Retry the web page by clicking the refresh/reload button, <br> if the problem persists then please contact the raxak administrator for further assistance.</div>" + button_ok);
                myDialog3.set("style", "height:160px;width:450px;");
                myDialog3.show();
            } else {
                myDialog3.set("title", "Error");
                button_ok = "<center><button class='info-btn-ok' data-dojo-type='dijit/form/Button' id='button_ok' type='submit'>OK</button></center>";
                myDialog3.set("content", "<div class='info-content'>Unable load the description of a rules.\nPlease contact the raxak administrator, if the problem persists.</div>" + button_ok);
                myDialog3.set("style", "height:160px;width:450px;");
                myDialog3.show();
            }
        });
}, function (err) {
        dojo.style('ajaxloader', 'display', 'none');//12b3
        if ('timeout' === err.dojoType) {
            myDialog3.set("title", "Timeout Error");
            button_ok = "<center><button class='info-btn-ok' data-dojo-type='dijit/form/Button' id='button_ok' type='submit'>OK</button></center>";
            myDialog3.set("content", "<div class='info-content'>Retry the web page by clicking the refresh/reload button, <br> if the problem persists then please contact the raxak administrator for further assistance.</div>" + button_ok);
            myDialog3.set("style", "height:160px;width:450px;");
            myDialog3.show();
        } else {
          myDialog3.set("title", "Error");
          button_ok = "<center><button class='info-btn-ok' data-dojo-type='dijit/form/Button' id='button_ok' type='submit'>OK</button></center>";
          myDialog3.set("content", "<div class='info-content'>Unable load the description of a rules.\nPlease contact the raxak administrator, if the problem persists.</div>" + button_ok);
          myDialog3.set("style", "height:160px;width:450px;");
          myDialog3.show();
      }
  });
}

function dismissRules() {
    //This function dismiss the rules on click event of dismiss button.
    var value = dojo.byId("manual").value;
    rulenum = value.substring(2);
    //Checking the rule number validation
    return_value = validationForRuleSelection(rulenum, " dismiss.");
    if (return_value == 0)
    {
        return
    }

    var uri = "/raxakapi/v1/dismiss/V-" + rulenum + "?ip=" + profileRunIP;
    dojo.xhrGet({
        url: uri,
        method: "GET",
        crossDomain: false,
        handleAs: "text",
        timeout: defaultTimeout
    }).then(function (htmlResults) {
        updateStatusPans()
    }, function (err) {
        if ('timeout' === err.dojoType) {
            myDialog3.set("title", "Timeout Error");
            button_ok = "<center><button class='info-btn-ok' data-dojo-type='dijit/form/Button' id='button_ok' type='submit'>OK</button></center>";
            myDialog3.set("content", "<div class='info-content'>Retry the web page by clicking the refresh/reload button, <br> if the problem persists then please contact the raxak administrator for further assistance.</div>" + button_ok);
            myDialog3.set("style", "height:160px;width:450px;");
            myDialog3.show();
        } else {
            myDialog3.set("title", "Error");
            button_ok = "<center><button class='info-btn-ok' data-dojo-type='dijit/form/Button' id='button_ok' type='submit'>OK</button></center>";
            myDialog3.set("content", "<div class='info-content'>Unable to dismiss the security check rule.\nPlease contact the raxak administrator, if the problem persists.</div>" + button_ok);
            myDialog3.set("style", "height:160px;width:450px;");
            myDialog3.show();
        }
    });

}
//describe_on_success
require(["dojo/ready", "dojo/io-query"], function (ready, ioQuery) {
    ready(function () {

        //success_des_rule_id
        dojo.connect(dojo.byId("success_des_rule_id"), "click", function (evt) {
           var apply_status = dojo.attr("success_des_rule_id", 'disabled');
           if (apply_status) {
            return;
        }
        var value = dojo.byId("success").value;
        var targetMachine = dojo.byId("myselect1").value;
        rulenum = value.substring(2);
        //Checking the rule number validation
        return_value = validationForRuleSelection(rulenum, " see the description.");

        if (return_value == 0)
        {
           return
       }
       showRuleDescription(rulenum,value,targetMachine);
       }); //success_des_rule_id
    })
})

//describe_on_failure
require(["dojo/ready", "dojo/io-query"], function (ready, ioQuery) {
    ready(function () {

        //fail_des_rule_id
        dojo.connect(dojo.byId("fail_des_rule_id"), "click", function (evt) {
           var fail_des_status = dojo.attr("fail_des_rule_id", 'disabled');
           if (fail_des_status) {
            return;
        }
        var value = dojo.byId("failed").value;
        var targetMachine = dojo.byId("myselect2").value;
        rulenum = value.substring(2);
        //Checking the rule number validation
        return_value = validationForRuleSelection(rulenum, " see the description.");

        if (return_value == 0)
        {
         return
        }
        showRuleDescription(rulenum,value,targetMachine);
       });//fail_des_rule_id
    })
})


//describe_on_Manual
require(["dojo/ready", "dojo/io-query"], function (ready, ioQuery) {
    ready(function () {

        //manual_des_rule_id
        dojo.connect(dojo.byId("manual_des_rule_id"), "click", function (evt) {
           var manual_des_status = dojo.attr("manual_des_rule_id", 'disabled');
           if (manual_des_status) {
            return;
        }
        var value = dojo.byId("manual").value;
        var targetMachine = dojo.byId("myselect3").value;
        rulenum = value.substring(2);
        //Checking the rule number validation
        return_value = validationForRuleSelection(rulenum, " see the description.");
        if (return_value == 0)
        {
         return
        }
        showRuleDescription(rulenum,value,targetMachine);
     });
   });
 });


//Check description and fix description
function showRuleDescription(rulenum,value,targetMachine){
    var checkString;
    var fixString;

    if(targetMachine !== ''){
        targetMachine = "/" + targetMachine;
    }

    var uri = "/raxakapi/v1/showRuleDescription/" + rulenum + targetMachine;
    dojo.xhrGet({
        url: uri,
        method: "GET",
        crossDomain: false,
        handleAs: "text",
        timeout: defaultTimeout
    }).then(function (htmlResults) {
        var ruleData = JSON.parse(htmlResults);

        if ((ruleData['Severity'].match("Unable to fetch")) ||
                (ruleData['Check Rule'].match("Unable to fetch")) ||
                (ruleData['Fix Rule'].match("Unable to fetch"))) {
            myDialog2.set("title", "Error");
            button = "<button class='info-btn' data-dojo-type='dijit/form/Button' id='leave_tab_ok' value='OK' type='submit'>OK</button>";
            myDialog2.set("content", "<div class='info-content'>Unable to fetch description of the rule.\nPlease contact the raxak administrator, if the problem persists.</div>" + "<center>" + button + "</center>");
            myDialog2.set("style", "height:160px;");
            myDialog2.show();
        } else {
            var severityText = ruleData['Severity'].charAt(0).toUpperCase() + ruleData['Severity'].slice(1);
            var ruleDescriptionHtml = "<div class='rule_desc_severity_popup'><b class='focus-top' tabindex='0'>Severity:</b><span class='" + severityText + "'> " + severityText + "</span></div>";

            ruleDescriptionHtml += "<h2><b>Check Description: </b></h2>";
            var res = ruleData['Check Rule'].split("\n");
            for (i = 0; i < res.length; i++) {
                ruleDescriptionHtml += "<p>" + res[i] + "<\p>";
            }

            ruleDescriptionHtml += "<h2><b>Fix Description: </b></h2>";
            var res = ruleData['Fix Rule'].split("\n");
            for (i = 0; i < res.length; i++) {
                ruleDescriptionHtml += "<p>" + res[i] + "<\p>";
            }

            button = "<center><button style='text-align: center' data-dojo-type='dijit/form/Button' type='submit'>Close</button></center>";
            myDialog.set("title", "Rule " + value );
            myDialog.set("content", ruleDescriptionHtml + button);
            myDialog.set("style", "width: 450px; border:1px solid #b7b7b7; background:#fff; margin:0 auto; height:300px;");
            myDialog.show();
        }
    }, function (err) {
        if ('timeout' === err.dojoType) {
            myDialog3.set("title", "Timeout Error");
            button_ok = "<center><button class='info-btn-ok' data-dojo-type='dijit/form/Button' id='button_ok' type='submit'>OK</button></center>";
            myDialog3.set("content", "<div class='info-content'>Retry the web page by clicking the refresh/reload button, <br> if the problem persists then please contact the raxak administrator for further assistance.</div>" + button_ok);
            myDialog3.set("style", "height:160px;width:450px;");
            myDialog3.show();
        } else {
             myDialog2.set("title", "Error");
             button = "<button class='info-btn' data-dojo-type='dijit/form/Button' id='leave_tab_ok' value='OK' type='submit'>OK</button>";
             myDialog2.set("content", "<div class='info-content'>Unable to fetch description of the rule.\nPlease contact the raxak administrator, if the problem persists.</div>" + "<center>" + button + "</center>");
             myDialog2.set("style", "height:140px;");
             myDialog2.show();
             }
    });
}

function remediateFailedRules()
{
    //This function remediate the failed rules on click event of Remediate button.
    var value = dojo.byId("failed").value;
    rulenum = value.substring(2);
    //Checking the rule number validation
    return_value = validationForRuleSelection(rulenum, " remediate.");
    if (return_value == 0)
    {
        return
    }

    var uri = "/raxakapi/v1/fixRule/V-" + rulenum + "?ip=" + profileRunIP;
    dojo.style('ajaxloader', 'display', 'block');//13a
    dojo.xhrGet({
        url: uri,
        method: "GET",
        crossDomain: false,
        handleAs: "text",
    }).then(function (htmlResults) {
        myDialog2.set("title", "Info");
        button = "<button class='info-btn' data-dojo-type='dijit/form/Button' id='leave_tab_ok' value='OK' type='submit'>OK</button>"
        myDialog2.set("content", "<div class='info-content'> Please enter valid IP Address (2)</div>" + "<center>" + button + "</center>");
        myDialog2.set("content", "<div class='info-content'>" + htmlResults + "</div>" + "<center>" + button + "</center>");
        myDialog2.set("style", "height:140px;");
        myDialog2.show()
        updateStatusPans()
        dojo.style('ajaxloader', 'display', 'none');//13b1
    }, function (err) {
        dojo.style('ajaxloader', 'display', 'none');//13b2
        if ('timeout' === err.dojoType) {
            myDialog3.set("title", "Timeout Error");
            button_ok = "<center><button class='info-btn-ok' data-dojo-type='dijit/form/Button' id='button_ok' type='submit'>OK</button></center>";
            myDialog3.set("content", "<div class='info-content'>Retry the web page by clicking the refresh/reload button, <br> if the problem persists then please contact the raxak administrator for further assistance.</div>" + button_ok);
            myDialog3.set("style", "height:160px;width:450px;");
            myDialog3.show();
        } else {
            myDialog3.set("title", "Error");
            button_ok = "<center><button class='info-btn-ok' data-dojo-type='dijit/form/Button' id='button_ok' type='submit'>OK</button></center>";
            myDialog3.set("content", "<div class='info-content'>Unable to Fix the security check Rule.\nplease contact the raxak administrator for further assistance.</div>" + button_ok);
            myDialog3.set("style", "height:160px;width:450px;");
            myDialog3.show();
        }
    });

}

function testAgain()
{
    //This function test agian the failed rules on click event of Test Again button.
    var value = dojo.byId("failed").value;
    rulenum = value.substring(2);
    //Checking the rule number validation
    return_value = validationForRuleSelection(rulenum, " test again.");
    if (return_value == 0)
    {
        return
    }

    console.log(rulenum);

    var uri = "/raxakapi/v1/checkRule/V-" + rulenum + "?ip=" + profileRunIP;
    dojo.style('ajaxloader', 'display', 'block');//14a
    dojo.xhrGet({
        url: uri,
        method: "GET",
        crossDomain: false,
        handleAs: "text",
    }).then(function (htmlResults) {
        myDialog2.set("title", "Rule Status : V-" + rulenum);
        button = "<center><button class='info-btn-ok' data-dojo-type='dijit/form/Button' id='button_ok' type='submit'>OK</button></center>";
        myDialog2.set("content", "<div class='info-content'>" + htmlResults + "</div>" + "<center>" + button + "</center>");
        myDialog2.show()
        updateStatusPans()
        dojo.style('ajaxloader', 'display', 'none');//14b1
    }, function (err) {
        dojo.style('ajaxloader', 'display', 'none');//14b2
        if ('timeout' === err.dojoType) {
            myDialog3.set("title", "Timeout Error");
            button_ok = "<center><button class='info-btn-ok' data-dojo-type='dijit/form/Button' id='button_ok' type='submit'>OK</button></center>";
            myDialog3.set("content", "<div class='info-content'>Retry the web page by clicking the refresh/reload button, <br> if the problem persists then please contact the raxak administrator for further assistance.</div>" + button_ok);
            myDialog3.set("style", "height:160px;width:450px;");
            myDialog3.show();
        } else {
            myDialog3.set("title", "Error");
            button_ok = "<center><button class='info-btn-ok' data-dojo-type='dijit/form/Button' id='button_ok' type='submit'>OK</button></center>";
            myDialog3.set("content", "<div class='info-content'>Unable to load the compliance exection information of a rule.\nPlease contact the raxak administrator, if the problem persists.</div>" + button_ok);
            myDialog3.set("style", "height:160px;width:450px;");
            myDialog3.show();
        }
    });

}


//This function validate all input checks for modify ip address. 
function validateSubmitData(user_name, ip_address, nickname) {
    check = /^[a-zA-Z0-9~!#^%*&`\_\-{|}/'$?+=]+([\.]?[a-zA-Z0-9~!#^%*&`\_\-{|}/'$?+=]+)?$/;
    check_nickname = /^[Aa-zZ0-9\.\@]*/

    user_name = user_name.trim()
    nickname = nickname.trim()
    if (user_name == '' && ip_address == '') {
        myDialog2.set("title", "Error");
        button = "<button class='info-btn' data-dojo-type='dijit/form/Button' id='leave_tab_ok' value='OK' type='submit'>OK</button>"
        myDialog2.set("content", "<div class='info-content'>Please enter Username and IP Address</div>" + "<center>" + button + "</center>");
        myDialog2.set("style", "height:140px;");
        myDialog2.show()
        return 0
    }
    if (user_name == '') {
        myDialog2.set("title", "Error");
        button = "<button class='info-btn' data-dojo-type='dijit/form/Button' id='leave_tab_ok' value='OK' type='submit'>OK</button>"
        myDialog2.set("content", "<div class='info-content'>Please enter Username</div>" + "<center>" + button + "</center>");
        myDialog2.set("style", "height:140px;");
        myDialog2.show()
        return 0
    }
    if (ip_address == '') {
        myDialog2.set("title", "Error");
        button = "<button class='info-btn' data-dojo-type='dijit/form/Button' id='leave_tab_ok' value='OK' type='submit'>OK</button>"
        myDialog2.set("content", "<div class='info-content'>Please enter IP Address</div>" + "<center>" + button + "</center>");
        myDialog2.set("style", "height:140px;");
        myDialog2.show()
        return 0
    }
    if (ip_address != '') {
        RegE = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)(\s+-p\s+\d+)*$/
        if (!ip_address.match(RegE)) {
            myDialog2tset("title", "Error");
            button = "<button class='info-btn' data-dojo-type='dijit/form/Button' id='leave_tab_ok' value='OK' type='submit'>OK</button>"
            myDialog2.set("content", "<div class='info-content'>Please enter a valid IP Address</div>" + "<center>" + button + "</center>");
            myDialog2.set("style", "height:140px;");
            myDialog2.show()
            return 0
        }
    }
    if ((user_name.length < 1) || (user_name.length > 20)) {
        myDialog2.set("title", "Error");
        button = "<button class='info-btn' data-dojo-type='dijit/form/Button' id='leave_tab_ok' value='OK' type='submit'>OK</button>"
        myDialog2.set("content", "<div class='info-content'>Username should not be more than 20 characters</div>" + "<center>" + button + "</center>");
        myDialog2.set("style", "height:140px;");
        myDialog2.show()
        return 0
    }
    if ((user_name != '') && user_name.match(' ')) {
        myDialog2.set("title", "Error");
        button = "<button class='info-btn' data-dojo-type='dijit/form/Button' id='leave_tab_ok' value='OK' type='submit'>OK</button>"
        myDialog2.set("content", "<div class='info-content'>Spaces not allowed in Username</div>" + "<center>" + button + "</center>");
        myDialog2.set("style", "height:140px;");
        myDialog2.show()
        return 0

    }
    if (!user_name.match(check)) {
        myDialog2.set("title", "Error");
        button = "<button class='info-btn' data-dojo-type='dijit/form/Button' id='leave_tab_ok' value='OK' type='submit'>OK</button>"
        myDialog2.set("content", "<div class='info-content'>Please enter a valid Username</div>" + "<center>" + button + "</center>");
        myDialog2.set("style", "height:140px;");
        myDialog2.show()
        return 0
    }
    /* Start: #390 comment
    if ((nickname.length < 0) || (nickname.length > 50)) {
        myDialog2.set("title", "Error");
        button = "<button class='info-btn' data-dojo-type='dijit/form/Button' id='leave_tab_ok' value='OK' type='submit'>OK</button>"
        myDialog2.set("content", "<div class='info-content'>Nickname should not be more than 50 characters</div>" + "<center>" + button + "</center>");
        myDialog2.set("style", "height:140px;");
        myDialog2.show()
        return 0
    }
    if ((nickname != '') && nickname.match(' ')) {
        myDialog2.set("title", "Error");
        button = "<button class='info-btn' data-dojo-type='dijit/form/Button' id='leave_tab_ok' value='OK' type='submit'>OK</button>"
        myDialog2.set("content", "<div class='info-content'>Spaces not allowed in Nickname</div>" + "<center>" + button + "</center>");
        myDialog2.set("style", "height:140px;");
        myDialog2.show()
        return 0
    }
    if ((nickname != '') && (!nickname.match(check_nickname))) {
        myDialog2.set("title", "Error");
        button = "<button class='info-btn' data-dojo-type='dijit/form/Button' id='leave_tab_ok' value='OK' type='submit'>OK</button>"
        myDialog2.set("content", "<div class='info-content'>Please enter a valid Nickname</div>" + "<center>" + button + "</center>");
        myDialog2.set("style", "height:140px;");
        myDialog2.show()
        return 0
    }
    End: #390 comment*/
    return 1
}



//This funcion intends to handle the all validation and functionality
//while user click on submit button of modify dialog box.
function onClickOfModify()
{
    var user_name = document.getElementById("usernamemod").value;
    var submit_ip = document.getElementById("ipaddressmod").value;
    var submit_nick_name = document.getElementById("nicknamemod").value;
    var return_status = validateSubmitData(user_name, submit_ip, submit_nick_name);
    user_name = user_name.trim()
    if (return_status)
    {
        var add_delete_handler = document.getElementById("ipadd_del");
        var target_machn_list_hndl = document.getElementById("ipadd_del");
        full_selected_ip = target_machn_list_hndl.value;
        var full_submit_ip = user_name + '@' + submit_ip;
        var full_selected_nickname = target_machn_list_hndl.options[target_machn_list_hndl.selectedIndex].text;

        //Checking the selected nickname with nickName which gets on click of submit of modify pop-up. 
        //Checking the selected ip with ip which gets on click of submit of modify pop-up.
        if ((full_selected_nickname == submit_nick_name) & (full_selected_ip == full_submit_ip))
        {
            return
        }


        //Checking validation for already existence of modified ip in the list.
        ip_list_target = [];
        var selAddTargets = document.getElementById('ipadd_del');
        nodes = selAddTargets.childNodes;
        last_index = nodes.length
        var detective_map = {}
        for (var i = 0; i < nodes.length; i++)
        {


            if (full_selected_ip != nodes[i].value) {
                ip_list_target.push(nodes[i].value);
            }
            else
            {
                var ip_nickname = nodes[i].text
                detective_map[nodes[i].value] = ip_nickname
            }
        }


        var bool_value = false;
        index_value = ip_list_target.indexOf(full_submit_ip);
        if (index_value != -1) {

            var bool_value = true;
        }
        else if ((full_submit_ip in detective_map) && (detective_map[full_submit_ip] == submit_nick_name))
        {
            var bool_value = true;

        }

        if (bool_value)
        {
            myDialog2.set("title", "Error");
            button = "<button class='info-btn' data-dojo-type='dijit/form/Button' id='leave_tab_ok' value='OK' type='submit'>OK</button>"
            myDialog2.set("content", "<div class='info-content'>IP address " + full_submit_ip + " " + "already in list  </div>" + "<center>" + button + "</center>");
            myDialog2.set("style", "height:140px;");
            myDialog2.show()
            return

        }


        if (full_submit_ip != null && ((full_submit_ip != full_selected_ip) || (full_selected_ip != submit_nick_name) || (full_submit_ip == submit_nick_name))) {

          var uri = "/raxakapi/v1/modifyIP";
		dojo.style('ajaxloader', 'display', 'block');//8a
        	var content = {usernameIP:full_selected_ip, submitIP:full_submit_ip, submitNickName:submit_nick_name,selectedNickName:full_selected_nickname}; 
        	dojo.xhrPost({
            	url: uri,
            	postData: content,
	    	timeout: defaultTimeout + 10000
        	}).then(function (htmlResults) {
             		updateSelectedProfilePage();
			updateIponModify(full_submit_ip,submit_nick_name)
             		dojo.style('ajaxloader', 'display', 'none');//8b1

                }, function (err) {
                dojo.style('ajaxloader', 'display', 'none');//8b2             
                if ('timeout' === err.dojoType) {
                    myDialog3.set("title", "Timeout Error");
                    button_ok = "<center><button class='info-btn-ok' data-dojo-type='dijit/form/Button' id='button_ok' type='submit'>OK</button></center>";
                    myDialog3.set("content", "<div class='info-content'>Retry the web page by clicking the refresh/reload button, <br> if the problem persists then please contact the raxak administrator for further assistance.</div>" + button_ok);
                    myDialog3.set("style", "height:160px;width:450px;");
                    myDialog3.show();
                } else {
                 myDialog3.set("title", "Error");
                 button_ok = "<center><button class='info-btn-ok' data-dojo-type='dijit/form/Button' id='button_ok' type='submit'>OK</button></center>";
                 myDialog3.set("content", "<div class='info-content'>Unable to modify the Target Machine(s).\nPlease contact the raxak administrator, if the problem persists.</div>" + button_ok);
                 myDialog3.set("style", "height:160px;width:450px;");
                 myDialog3.show();
             }
         });

        }//inner if

    }//outer if

}//Function end


// on reload the last executed ips list in success/failure/manual/console tabs
require(["dojo/ready", "dojo/io-query"], function (ready, ioQuery) {
    ready(function () {
        var uri = "/raxakapi/v1/getlastrunIPs";
        dojo.style('ajaxloader', 'display', 'block');//15a
        dojo.xhrGet({
            url: uri,
            method: "GET",
            crossDomain: false,
            handleAs: "json",
            timeout: defaultTimeout
        }).then(function (htmlResults) {
            var obj_values = eval(htmlResults)
            var ips = ""
            if (obj_values != null) {
                ip_list = Object.keys(obj_values);
                var success_sel = document.getElementById("myselect1");
                var failure_sel = document.getElementById("myselect2");
                var manual_sel = document.getElementById("myselect3");
                var console_sel = document.getElementById("myselect4");
                var report_sel = document.getElementById("myselect5");
                for (i in obj_values) {
                    var val = obj_values[i];
                    if (ips) {
                        ips = ips + "," + i
                    }
                    else
                    {
                        ips = i
                    }
                    var opt1 = document.createElement('option');
                    opt1.innerHTML = val;
                    opt1.value = i;
                    opt1.setAttribute('nickname', val);
                    var opt2 = document.createElement('option');
                    opt2.innerHTML = val;
                    opt2.value = i;
                    opt2.setAttribute('nickname', val);
                    var opt3 = document.createElement('option');
                    opt3.innerHTML = val;
                    opt3.value = i;
                    opt3.setAttribute('nickname', val);

                    var opt4 = document.createElement('option');
                    opt4.innerHTML = val;
                    opt4.value = i;
                    opt4.setAttribute('nickname', val);

                    var opt5 = document.createElement('option');
                    opt5.innerHTML = val;
                    opt5.value = i;
                    opt5.setAttribute('nickname', val);

                    success_sel.appendChild(opt1);
                    failure_sel.appendChild(opt2);
                    manual_sel.appendChild(opt3);
                    console_sel.appendChild(opt4);
                    report_sel.appendChild(opt5);
                }
            }


            profileRunIP = ip_list[0];
            dojo.style('ajaxloader', 'display', 'none');//15b
            executedIPs = ips
            flag = true
            statusExecution = setTimeout(function () {
                checkStatusOfExecution(flag)
            }, 100);
        }, function (err) {
            if ('timeout' === err.dojoType) {
                myDialog3.set("title", "Timeout Error");
                button_ok = "<center><button class='info-btn-ok' data-dojo-type='dijit/form/Button' id='button_ok' type='submit'>OK</button></center>";
                myDialog3.set("content", "<div class='info-content'>Retry the web page by clicking the refresh/reload button, <br> if the problem persists then please contact the raxak administrator for further assistance.</div>" + button_ok);
                myDialog3.set("style", "height:160px;width:450px;");
                myDialog3.show();
            }
        });
});
});

var enableButtons = function (flag) {
    if (flag) {
        dijit.byId("deleteip_id").setAttribute('disabled', false);
        dijit.byId("modifyip").setAttribute('disabled', false);
        dijit.byId("access_target_id").setAttribute('disabled', false);
    } else {
        dijit.byId("deleteip_id").setAttribute('disabled', true);
        dijit.byId("modifyip").setAttribute('disabled', true);
        dijit.byId("access_target_id").setAttribute('disabled', true);
    }
};

//This functoion intends to switch on the /success/failure/manual/console tabe
//while click on  success/failure/manual/console hyperlink under reports tab respectively.
function onclickOfResultHyperlink(resultHyperlinkId) {
    dojo.ready(function () {
        //resultHpyerlinkId (1,2,3,4) define the id of success/failure/manual/console tab respectively.
        if (resultHyperlinkId == 1) {
            dijit.byId('main_tabContainer').selectChild(dijit.byId('successTab'));
        } else if (resultHyperlinkId == 2) {
            dijit.byId('main_tabContainer').selectChild(dijit.byId('failureTab'));
        } else if (resultHyperlinkId == 3) {
            dijit.byId('main_tabContainer').selectChild(dijit.byId('manualTab'));
        } else {
            dijit.byId('main_tabContainer').selectChild(dijit.byId('consoleTab'));
        }
    });
}

function getRulesByProfile(profile) {
    var uri = "/raxakapi/v1/ruleTitle/" + profile;
    dojo.xhrGet({
        url: uri,
        method: "GET",
        crossDomain: false,
        handleAs: "json",
        timeout: defaultTimeout
    }).then(function (htmlResults) {
        var list1 = eval(htmlResults);
        var ruleCount = list1.length;
        var container = document.getElementById('profile-rules-list');
        for (var i = 0; i < ruleCount; ++i) {
            var rule = list1[i].rule;
            var title = list1[i].title;
            //map_title[rule] = title;
            var span = document.createElement('span');
            span.id = 'span_' + rule;
            var label1 = document.createElement('div');
            label1.setAttribute('for', span.id);
            label1.setAttribute('title', title);
            label1.setAttribute('class', 'rulelist');
            label1.innerHTML = rule + ' - ' + title + '';
            //label1.innerHTML = "<a href='javascript:displayRuleDesc(\'" + rule + "\');'>" + rule + " - " + title + "</a>";
            //var text = document.createTextNode(map_title[rulenum]);
            var link = document.createElement('A');
            link.setAttribute('href', "javascript:displayRuleDesc('" + rule + "')");
            link.appendChild(label1);

            container.appendChild(link);
        }
        document.getElementById("sel_rulename").innerHTML = '(' + ruleCount + ') ' + "Rules in " + profile;

    }, function (err) {
        if ('timeout' === err.dojoType) {
            myDialog3.set("title", "Timeout Error");
            button_ok = "<center><button class='info-btn-ok' data-dojo-type='dijit/form/Button' id='button_ok' type='submit'>OK</button></center>";
            myDialog3.set("content", "<div class='info-content'>Retry the web page by clicking the refresh/reload button, <br> if the problem persists then please contact the raxak administrator for further assistance.</div>" + button_ok);
            myDialog3.set("style", "height:170px;width:450px;");
            myDialog3.show();
        }
    });
}

function camelCase(s) {
  return (s||'').toLowerCase().replace(/(\b|-)\w/g, function(m) {
    return m.toUpperCase().replace(/-/,'');
});
}

function getCronjobIps() {
    dijit.byId("delete_cron").setAttribute('disabled', true);
    dijit.byId("update_cron").setAttribute('disabled', true);
    $j14("#cronjobtab_id").val('');//on reload clear selection
    
    var uri = "/raxakapi/v1/getCronJobs";
    dojo.xhrGet({
        url: uri,
        method: "get",
        crossDomain: false,
        handleAs: "json",
        timeout: defaultTimeout
    }).then(function (response) {
        var arrayOfObjects = eval(response);
        $j14("#cron_sel_holder").html('');
        for (var i in arrayOfObjects) {
            var cronLi = document.createElement('li');
            var json = JSON.parse(arrayOfObjects[i]);
            var ip = json.ip;
            var profile = json.profile;
            var frequency = json.frequency;
            var nickname = json.nickname;
            var nextrun = json.nextrun;
            var cron_time = new Date(nextrun + ' UTC');
            hours = cron_time.getHours();
            hours = hours+24%24;
            ampm="AM";
            if(hours >12)
            {
             hours = hours%12;
             ampm = "PM";
         }
         else if(hours==0)
         { 
             hours=12;
         }
         minutes = cron_time.getMinutes();
         minutes = minutes < 10 ? '0'+minutes : minutes;
         month = cron_time.getMonth()+1;
         month = month <10 ? '0'+ month : month;
         date = cron_time.getDate();
         date = date <10 ? '0'+ date : date; 
         next_cron_time = (hours + ":" + minutes + ampm +" "+ month + "/" + date);
         var tmp_id = 'cronip_'+i;
            //var tmp_function = "chooseCronIp('"+ip+"');";
            var tmp_function = "chooseCronIp('"+tmp_id+"','"+nickname+"','"+profile+"','"+frequency+"');";
            if(i % 2 === 0) {
                $j14("#cron_sel_holder").append('<li onclick="'+tmp_function+'" id="'+tmp_id+'" class="cron_li_even" title="'+ ip +'">'+ nickname.replace(/(.{51})/g,"$1<br>") + ' (' + ip + ') ' + profile + ': ' + camelCase(frequency)+ '<br>Next run at approximately ' + next_cron_time +'</li>');
            } else {
                $j14("#cron_sel_holder").append('<li onclick="'+tmp_function+'" id="'+tmp_id+'" class="cron_li_odd" title="'+ ip +'">'+ nickname.replace(/(.{51})/g,"$1<br>") + ' (' + ip + ') ' + profile + ': ' + camelCase(frequency)+ '<br>Next run at approximately ' + next_cron_time +'</li>');
            }
        }

    }, function (err) {
        if ('timeout' === err.dojoType) {
            myDialog3.set("title", "Timeout Error");
            button_ok = "<center><button class='info-btn-ok' data-dojo-type='dijit/form/Button' id='button_ok' type='submit'>OK</button></center>";
            myDialog3.set("content", "<div class='info-content'>Retry the web page by clicking the refresh/reload button, <br> if the problem persists then please contact the raxak administrator for further assistance.</div>" + button_ok);
            myDialog3.set("style", "height:160px;width:450px;");
            myDialog3.show();
        }
        else
        { 
            myDialog3.set("title", "Error");
            button_ok = "<center><button class='info-btn-ok' data-dojo-type='dijit/form/Button' id='button_ok' type='submit'>OK</button></center>";
            myDialog3.set("content", "<div class='info-content'>Unable to do scheduled compliance checks, <br> if the problem persists then please contact the raxak administrator for further assistance.</div>" + button_ok);
            myDialog3.set("style", "height:160px;width:450px;");
            myDialog3.show();



        }
    });
}

function displayRuleDesc(rulenum) {
    var ruleId = rulenum;
    rulenum = rulenum.substring(2);

    var checkString;
    var fixString;

    var uri = "/raxakapi/v1/showCheckRule/" + rulenum;
    dojo.xhrGet({
        url: uri,
        method: "GET",
        crossDomain: false,
        handleAs: "text",
        timeout: defaultTimeout
    }).then(function (htmlResults) {
        var res = htmlResults.split("\n");

        checkString = "<h2><b class='focus-top' tabindex='0'>Check Description: </b></h2>";
        for (i = 0; i < res.length; i++) {
            checkString = checkString + "<p>" + res[i] + "<\p>";
        }

        var uri = "/raxakapi/v1/showFixRule/" + rulenum;
        dojo.xhrGet({
            url: uri,
            method: "GET",
            crossDomain: false,
            handleAs: "text",
            timeout: defaultTimeout
        }).then(function (htmlResults) {
            var res = htmlResults.split("\n");
            fixString = "<h2><b>Fix Description: </b></h2>";
            for (i = 0; i < res.length; i++) {
                fixString = fixString + "<p>" + res[i] + "<\p>";
            }

            button = "<center><button style='text-align: center' data-dojo-type='dijit/form/Button' type='submit'>Close</button></center>";
            myDialog.set("title", "Rule " + ruleId);
            myDialog.set("content", checkString + fixString + button);
            myDialog.set("style", "width: 450px; height:300px;");
            myDialog.show();
        }, function (err) {
            if ('timeout' === err.dojoType) {
                myDialog3.set("title", "Timeout Error");
                button_ok = "<center><button class='info-btn-ok' data-dojo-type='dijit/form/Button' id='button_ok' type='submit'>OK</button></center>";
                myDialog3.set("content", "<div class='info-content'>Retry the web page by clicking the refresh/reload button, <br> if the problem persists then please contact the raxak administrator for further assistance.</div>" + button_ok);
                myDialog3.set("style", "height:160px;width:450px;");
                myDialog3.show();
            } else {
                myDialog2.set("title", "Error");
                button = "<button class='info-btn' data-dojo-type='dijit/form/Button' id='leave_tab_ok' value='OK' type='submit'>OK</button>"
                myDialog2.set("content", "<div class='info-content'>Unable to fetch description of the rule.\nPlease contact the raxak administrator, if the problem persists.</div>" + "<center>" + button + "</center>");
                myDialog2.set("style", "height:140px;");
                myDialog2.show()
            }
        });
}, function (err) {
    if ('timeout' === err.dojoType) {
        myDialog3.set("title", "Timeout Error");
        button_ok = "<center><button class='info-btn-ok' data-dojo-type='dijit/form/Button' id='button_ok' type='submit'>OK</button></center>";
        myDialog3.set("content", "<div class='info-content'>Retry the web page by clicking the refresh/reload button, <br> if the problem persists then please contact the raxak administrator for further assistance.</div>" + button_ok);
        myDialog3.set("style", "height:160px;width:450px;");
        myDialog3.show();
    } else {
       myDialog2.set("title", "Error");
       button = "<button class='info-btn' data-dojo-type='dijit/form/Button' id='leave_tab_ok' value='OK' type='submit'>OK</button>"
       myDialog2.set("content", "<div class='info-content'>Unable to fetch description of the rule.\nPlease contact the raxak administrator, if the problem persists.</div>" + "<center>" + button + "</center>");
       myDialog2.set("style", "height:140px;");
       myDialog2.show()
   }
});
}

//Start:Event Handler of update cron
function chooseCronIp(crontab_id,crontab_nickname,crontab_profile,crontab_freq){
    var crontabId = $j14("#cronjobtab_id").val();
    if(crontabId === ''){
        prevCrontabId = crontab_id;
        $j14("#cronjobtab_id").val(crontab_id);
        $j14("#cronjobtab_nickname").val(crontab_nickname);
        $j14("#cronjobtab_profile").val(crontab_profile);
        $j14("#cronjobtab_freq").val(crontab_freq);
        $j14('#'+crontab_id).addClass("cr_sel");
        dijit.byId("update_cron").setAttribute('disabled', false);
        dijit.byId("delete_cron").setAttribute('disabled', false);
    } else {
        if(crontabId == crontab_id){
            $j14("#cronjobtab_id").val('');
            $j14("#cronjobtab_profile").val('');
            $j14("#cronjobtab_freq").val('');
            $j14('#'+crontab_id).removeClass("cr_sel");
            dijit.byId("update_cron").setAttribute('disabled', true);
            dijit.byId("delete_cron").setAttribute('disabled', true);
        }else{
            $j14("#cronjobtab_id").val(crontab_id);
            $j14("#cronjobtab_nickname").val(crontab_nickname);
            $j14("#cronjobtab_profile").val(crontab_profile);
            $j14("#cronjobtab_freq").val(crontab_freq);
            $j14('#'+crontabId).removeClass("cr_sel");
            $j14('#'+crontab_id).addClass("cr_sel");
            dijit.byId("update_cron").setAttribute('disabled', false);
            dijit.byId("delete_cron").setAttribute('disabled', false);
        }
    }
}

function updateCron() {
    var selected_cronid = $j14("#cronjobtab_id").val();
    var full_selected_ip = document.getElementById(selected_cronid).title;
    var selected_nickname = $j14("#cronjobtab_nickname").val();
    var selected_profile = $j14("#cronjobtab_profile").val();
    var selected_freq = $j14("#cronjobtab_freq").val();
    
    if (full_selected_ip === '') {
        myDialog2.set("title", "Info");
        button = "<button class='info-btn' data-dojo-type='dijit/form/Button' id='leave_tab_ok' value='OK' type='submit'>OK</button>";
        myDialog2.set("content", "<div class='info-content'>Please select a Target Machine</div>" + "<center>" + button + "</center>");
        myDialog2.set("style", "height:140px;");
        myDialog2.show();
    }
    else {
        dijit.byId("updateCronDialog").reset();
        dijit.byId("updateCronDialog").show();
        
        document.getElementById("cron_tm").value = full_selected_ip;
        document.getElementById("cron_tm_nickname").value = selected_nickname;
        document.getElementById("cron_profile").value = selected_profile;   
        var sel_freq_modi = selected_freq.charAt(0).toUpperCase() + selected_freq.slice(1);
        $j14("#updateCronDialog select").val(sel_freq_modi);
    }
}

require(["dojo/ready", "dojo/io-query"], function (ready, ioQuery) {
    ready(function () {
        //Start: update cron
        dojo.connect(dojo.byId("submit_update_cron"), "click", function (evt) {
            var cron_tm = document.getElementById("cron_tm").value;
            var cron_tm_nickname = document.getElementById("cron_tm_nickname").value;
            var cron_profile = document.getElementById("cron_profile").value;
            var cron_freq = document.getElementById("cron_freq").value;
        });
        //End: update cron
        
        //Start: delete cron
        dojo.connect(dojo.byId("delete_cron"), "click", function (evt) {
            var apply_status = dojo.attr("delete_cron", 'disabled');
            if (apply_status) {
                return;
            }

            myDialog2.set("title", "Confirmation");
            button = "<button class='info-btn' data-dojo-type='dijit/form/Button' id='sub_del_cron' value='OK' type='submit'>OK</button>"
            button_cancel = "<button class='info-btn' data-dojo-type='dijit/form/Button' id='cancel_del_cron' type='submit'>Cancel</button>"
            myDialog2.set("content", "<div class='info-content'> Are you sure, you want to delete the selected schedule?</div>" + "<center>" + button + " " + button_cancel + "</center>");
            myDialog2.show();

            dojo.connect(dojo.byId("sub_del_cron"), "click", function (evt) {
                var selected_cronid = $j14("#cronjobtab_id").val();
                var full_selected_ip = document.getElementById(selected_cronid).title;
                var selected_nickname = $j14("#cronjobtab_nickname").val();
                var selected_profile = $j14("#cronjobtab_profile").val();
                var selected_freq = $j14("#cronjobtab_freq").val();
                
                var uri = "/raxakapi/v1/deleteCronJob";
                var content = {usernameIP:full_selected_ip, profilename:selected_profile, frequency:selected_freq};

                dojo.xhrPost({
                    url: uri,
                    postData: content
                }).then(function (htmlResults) {
                    getCronjobIps();

                }, function (err) {
                    if ('timeout' === err.dojoType) {
                        myDialog3.set("title", "Timeout Error");
                        button_ok = "<center><button class='info-btn-ok' data-dojo-type='dijit/form/Button' id='button_ok' type='submit'>OK</button></center>";
                        myDialog3.set("content", "<div class='info-content'>Retry the web page by clicking the refresh/reload button, <br> if the problem persists then please contact the raxak administrator for further assistance.</div>" + button_ok);
                        myDialog3.set("style", "height:160px;width:450px;");
                        myDialog3.show();
                    }
                });
            });
});
        //End: delete cron

        //Start: toggle enable-disable for fileselector -wip
        /*dojo.connect(dojo.byId("uploadcsvfile"), "onchange", function (evt) {
            if (document.getElementById("uploadcsvfile").value === "") {
                $j14('#username').prop('disabled', false);
                $j14('#ipaddress').prop('disabled', false);
                $j14('#nickname2').prop('disabled', false);
            }else{
                $j14('#username').prop('disabled', true);
                $j14('#ipaddress').prop('disabled', true);
                $j14('#nickname2').prop('disabled', true);
            }
            dojo.stopEvent(evt);
        });*/
        //End: toggle enable-disable for fileselector -wip
    });
});
//End:Event Handler of update cron

function clearUploadFileSelector(){
    $j14("#uploadcsvfile").val('');

    user_action= 'add_by_ip_details';
    $j14("#add_ip_details_ip").prop("checked", true);
    $j14("#add_ip_details_user_selection" ).val('add_by_ip_details');

    $j14("#private_ip").prop("checked", false);
    $j14('.private_ip_fields').hide();

    $j14( "#addtmip" ).show();
    $j14( "#addtmip_csv" ).hide();
}

function changeUserIpDetailAction(action){
    $j14("#add_ip_details_user_selection" ).val(action);
    user_action = action;

    document.getElementById('private_ip').checked = false;
    //$j14("#private_ip").prop("checked", false);//creating gui issue
    $j14('.private_ip_fields').hide();

    $j14('#username').val('');
    $j14('#ipaddress').val('');
    $j14('#nickname2').val('');
    $j14('#username_pip').val('');
    $j14('#paswd_pip').val('');
    $j14('#ipaddress_pip').val('');

    if(action == 'add_by_ip_details'){
        $j14( "#addtmip" ).show();
        $j14( "#addtmip_csv" ).hide();
    }
    if(action == 'add_by_csv_file'){
        $j14( "#addtmip" ).hide();
        $j14( "#addtmip_csv" ).show();
    }
}

function AddTargetedIpDetails(){

    if(user_action == 'add_by_csv_file'){
        if(!csvFileFlag){//csvFileFlag is global
            myDialog2.set("title", "Info");
            button = "<center><button class='info-btn-ok' data-dojo-type='dijit/form/Button' id='csv-flagerr' type='submit'>OK</button></center>";
            myDialog2.set("content", "<div class='info-content'>You have to upload CSV file.</div>" +button);
            myDialog2.set("style", "height:140px;");
            myDialog2.show();
            return false;
        }
        
        var dataCount = csv_ip_detail.length;//csv_ip_detail is global
        var ipToAdd = [];
        var failedIp = [];
        var failedIpHtml = '<table border="1"><tr><td>Target Machine detail</td><td>Reason</td></tr>';
        
        for (var tmpj = 0; tmpj < dataCount; tmpj++) {
            var arrDetail = csv_ip_detail[tmpj];
            
            if(arrDetail.length > 1){
                var csv_user_val = arrDetail[0];
                var csv_user_ip = arrDetail[1];
                var csv_user_nickname = arrDetail[2];
                
                var csv_pip_usrname = arrDetail[3];
                var csv_pip_paaswrd = arrDetail[4];
                var csv_pip_tunelip = arrDetail[5];

                if((typeof csv_user_nickname === 'undefined')){
                    csv_user_nickname = '';
                }
                
                if((typeof csv_pip_usrname === 'undefined')){
                    csv_pip_usrname = '';
                }

                if((typeof csv_pip_paaswrd === 'undefined')){
                    csv_pip_paaswrd = '';
                }

                if((typeof csv_pip_tunelip === 'undefined')){
                    csv_pip_tunelip = '';
                }

                //validate data
                var result = verifyCsvData(csv_user_val, csv_user_ip, csv_user_nickname, csv_pip_usrname, csv_pip_paaswrd, csv_pip_tunelip);//#482
                if(result[0]){
                 ipToAdd.push(arrDetail);
             }else{
                 failedIp.push(arrDetail);
                 failedIpHtml += '<tr><td>'+arrDetail+'</td><td>'+result[1]+'</td></tr>';
             }

         }else{
            failedIp.push(arrDetail);
            failedIpHtml += '<tr><td>'+arrDetail+'</td><td>No data or Invalid detail format;<br>Expecting: username,IP address,nickname(optional)</td></tr>';
        }
    }
    failedIpHtml += '</table>';

    if(ipToAdd.length > 0){
        /* Start: Add block */
        var json_ipToAdd = JSON.stringify(ipToAdd);
        var json_failedIp = JSON.stringify(failedIp);

            //send data
            dojo.style('image-loader-page', 'display', 'block');

            var uri = "/raxakapi/v1/addMultipleIPs/";
            var content = {ipList:json_ipToAdd};

            dojo.xhrPost({
                url: uri,
                postData: content,
            }).then(function (htmlResults) {
                dojo.style('image-loader-page', 'display', 'none');

                var jsonCSVResults = JSON.parse(htmlResults);
                jsonCSVResults = jsonCSVResults['SUCCESS'];
                var countTMResults = jsonCSVResults.length;

                var addedIp = [];
                //Duplicate ips on server
                var duplicateIpHtml = '';
                var duplicateIp = [];

                for (var csv_i = 0; csv_i < countTMResults; csv_i++) {
                    //getTMAccessStatus(jsonCSVResults[csv_i][0].access);//not using now.
                    //-99 show for this only
                    if(jsonCSVResults[csv_i][0].access == -99){
                        duplicateIpHtml += '<br>'+jsonCSVResults[csv_i][0].ip;
                        duplicateIp.push(jsonCSVResults[csv_i][0].ip);
                    }else{
                        addedIp.push(jsonCSVResults[csv_i][0].ip);
                    }
                }

                //Start: Upload report
                var CSVReportHtml = '';
                dijit.byId('formDialog').hide();

                //Added Ips
                if(addedIp.length > 0){
                    CSVReportHtml += addedIp.length + ' Target machine(s) successfully added <br>';
                }else{
                    CSVReportHtml += 'Not able to add any target machine<br>';
                }

                //failed Ips
                if(failedIp.length > 0){
                    CSVReportHtml += '<br>' + failedIp.length + ' Target machine(s) failed to add:<br>';
                    CSVReportHtml += failedIpHtml;
                }

                if(duplicateIp.length > 0){
                    CSVReportHtml += '<br>' + duplicateIp.length + ' Target machine(s) already exists' + duplicateIpHtml;
                }

                //Upload report
                myDialog4.set("title", "Upload Report");
                button = "<center><button class='info-btn-ok' data-dojo-type='dijit/form/Button' id='csv_upload_report' type='submit'>OK</button></center>";
                myDialog4.set("content", "<div class='csvreport-content'>"+CSVReportHtml+"</div>" +button);
                myDialog4.set("style", "min-height:140px;min-width:350px;height:auto;width:auto;");
                myDialog4.show();
                //End: Upload report

                showCsvUploadReport(htmlResults, ipToAdd, failedIp);

                csv_ip_detail=[];//clearing here

            }, function (err) {
                dojo.style('image-loader-page', 'display', 'none');
                dijit.byId('formDialog').hide();

                //Start: Upload report
                var CSVReportHtml = 'Please try again, some error occured while adding machine(s)<br>';

                //Upload report
                myDialog4.set("title", "Upload Report");
                button = "<center><button class='info-btn-ok' data-dojo-type='dijit/form/Button' id='csv_upload_report' type='submit'>OK</button></center>";
                myDialog4.set("content", "<div class='csvreport-content'>"+CSVReportHtml+"</div>" +button);
                myDialog4.set("style", "min-height:140px;min-width:350px;height:auto;width:auto;");
                myDialog4.show();
                //End: Upload report

                showCsvUploadReport(err, ipToAdd, failedIp);

                csv_ip_detail=[];//clearing here
            });
/* End: Add block */
}else{
            //Start: Upload report (client side validation not cleared)
            var CSVReportHtml = 'Not able to add any target machine<br>';
            dijit.byId('formDialog').hide();

            //failed Ips
            if(failedIp.length > 0){
                CSVReportHtml += '<br>' + failedIp.length + ' Target machine(s) failed to add:<br>';
                CSVReportHtml += failedIpHtml;
            }else{
                CSVReportHtml = 'File is blank or contains invalid detail format<br><br>';
                CSVReportHtml += 'Format: username,IP address,nickname(optional)<br>';
                CSVReportHtml += 'Example: root,192.168.0.1,test_machine<br>';
            }

            //Upload report
            myDialog4.set("title", "Upload Report");
            button = "<center><button class='info-btn-ok' data-dojo-type='dijit/form/Button' id='csv_upload_report' type='submit'>OK</button></center>";
            myDialog4.set("content", "<div class='csvreport-content'>"+CSVReportHtml+"</div>" +button);
            myDialog4.set("style", "min-height:140px;min-width:350px;height:auto;width:auto;");
            myDialog4.show();
            //End: Upload report (client side validation not cleared)
            
            csv_ip_detail=[];//clearing here
        }
        
        csvFileFlag = false;//resetting
        
    }else if(user_action == 'add_by_ip_details'){
        var user_val        = $j14("#username").val();
        var user_ip         = $j14("#ipaddress").val();
        var user_nickname   = $j14("#nickname2").val();

        var user_private_ip    = $j14("#private_ip").val();

        var user_username_pip  = '';
        var user_ipaddress_pip = '';
        var user_paswd_pip = '';
        if(user_private_ip){
            var user_username_pip  = $j14("#username_pip").val();
            var user_ipaddress_pip = $j14("#ipaddress_pip").val();
            var user_paswd_pip = $j14("#paswd_pip").val();
        }

        checkData(user_val, user_ip, user_nickname, user_username_pip, user_paswd_pip, user_ipaddress_pip);
    }

    return false;
}

function showCsvUploadReport(resultApiCSV, ipToAdd, failedIp){
    var uri = "/raxakapi/v1/getIPs/?username=raxak";
        dojo.style('ajaxloader', 'display', 'block');//1a
        dojo.xhrGet({
            url: uri,
            method: "GET",
            crossDomain: false,
            handleAs: "json",
            timeout: defaultTimeout
        }).then(function (htmlResults) {
            var arrayOfObjects = eval(htmlResults);
            dojo.empty("ipadd_del");
            var selAddTargets = document.getElementById('ipadd_del');

            tmCount = arrayOfObjects.length;//tmCount is global
            if (arrayOfObjects.length < 1) {
                dijit.byId("deleteip_id").setAttribute('disabled', true);
                dijit.byId("modifyip").setAttribute('disabled', true);
                dijit.byId("access_target_id").setAttribute('disabled', true);
            } else {
                dijit.byId("deleteip_id").setAttribute('disabled', false);
                dijit.byId("modifyip").setAttribute('disabled', false);
                dijit.byId("access_target_id").setAttribute('disabled', false);
            }

            for (var i in arrayOfObjects) {
                var opt = document.createElement('option');
                var json = JSON.parse(arrayOfObjects[i])
                ip = json.ip
                access = json.access
                nickname = json.nickname
                ip_count = arrayOfObjects.length
                if (nickname == '') {
                    nickname = ip;
                }
                opt.innerHTML = nickname;
                opt.value = ip;
                if (access == -2) {
                    opt.setAttribute('class', 'pingnotreachableclass');
                    opt.setAttribute('title', ip + ' : Unable to reach target machine (ping failed)');
                    opt.setAttribute('access', access);
                }
                else if (access == 1) {
                  osname = json.osname;
                  osversion = json.osversion;
                  opt.setAttribute('class', 'pingreachclass');
                  opt.setAttribute('access', access);
                  if( typeof (osname) == 'undefined' || typeof(osversion) == 'undefined')
                  {
                     opt.setAttribute('title', ip + ' : ALL OK');
                 }
                 else
                 {
                     opt.setAttribute('title', ip +' ( '+osname + ' v' +osversion + ' )');
                 }
             }
             else if (access == -1) {
                opt.setAttribute('class', 'orangeclass');
                opt.setAttribute('access', access);
                opt.setAttribute('title', ip + ' : OS not supported');
            }
            else if (access == -3) {
                opt.setAttribute('class', 'yellowclass');
                opt.setAttribute('access', access);
                opt.setAttribute('title', ip + ' : Unable to log in with specified userid (ssh login fails)');
            }
            else if (access == -4) {
                opt.setAttribute('class', 'blueclass');
                opt.setAttribute('access', access);
                opt.setAttribute('title', ip + ' : Insufficient execution privilege (cannot run privileged instructions)');
            }
            else if (access == -5) {
                opt.setAttribute('class', 'grayclass');
                opt.setAttribute('access', access);
                opt.setAttribute('title', ip + ' : Access check in progress');
            }

            if ((ip_count == 1) && (access == 1)) {
                opt.setAttribute("selected", "selected");
            }

            selAddTargets.appendChild(opt);
        }
            dojo.style('ajaxloader', 'display', 'none');//1b1

            selectOnlyRemainingTM();
        }, function (err) {
            dojo.style('ajaxloader', 'display', 'none');//1b2
            if ('timeout' === err.dojoType) {
                myDialog3.set("title", "Timeout Error");
                button_ok = "<center><button class='info-btn-ok' data-dojo-type='dijit/form/Button' id='button_ok' type='submit'>OK</button></center>";
                myDialog3.set("content", "<div class='info-content'>Retry the web page by clicking the refresh/reload button, <br> if the problem persists then please contact the raxak administrator for further assistance.</div>" + button_ok);
                myDialog3.set("style", "height:160px;width:450px;");
                myDialog3.show();
            } else {
                myDialog3.set("title", "Error");
                button_ok = "<center><button class='info-btn-ok' data-dojo-type='dijit/form/Button' id='button_ok' type='submit'>OK</button></center>";
                myDialog3.set("content", "<div class='info-content'>Unable to fetch target machines from RAXAK server.\nPlease contact the raxak administrator, if the problem persists." + "</div>" + button_ok);
                myDialog3.set("style", "height:160px;");
                myDialog3.show();
                console.log("ERROR: ", err);
            }
            selectOnlyRemainingTM();
        });

}

var verifyCsvData = function(user_val, user_ip, user_nickname, csv_pip_usrname, csv_pip_paaswrd, csv_pip_tunelip){
    check_user = /^[a-zA-Z0-9~!#^%*&`\_\-{|}/'$?+=]+([\.]?[a-zA-Z0-9~!#^%*&`\_\-{|}/'$?+=]+)?$/;
    check_nickname = /^[Aa-zZ0-9\.\@]*/
    user_val = user_val.trim();

    if (user_nickname !== '') {
        user_nickname = user_nickname.trim();
    }
    if (user_val == '' && user_ip == '') {
        return [false, 'Please enter Username and IP Address'];
    }
    else if (user_ip == '') {
        return [false, 'Please enter IP Address'];
    }
    else if (user_val == '') {
        return [false, 'Please enter Username'];
    }
    else if ((user_val.length < 1) || (user_val.length > 20)) {
        return [false, 'Username should not be more than 20 characters'];
    }
    else if ((user_val != '') && user_val.match(' ')) {
        return [false, 'Spaces not allowed in Username'];
    }
    else if (!user_val.match(check_user)) {
        return [false, 'Please enter a valid Username'];
    }
    else if ((csv_pip_usrname !== '') && ((csv_pip_paaswrd == '') || (csv_pip_tunelip == ''))) {//#482
        return [false, 'Please enter complete Private address details'];
    }
    else {
        RegE = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)(\s+-p\s+\d+)*$/
        if (!user_ip.match(RegE)) {
            return [false, 'Please enter valid IP Address (3)'];
        }
    }
    return [true, 'Valid '+user_ip];
};

function getTMAccessStatus(access){
    var statusMsg = '';
    if (access == -2) {
        //pingnotreachableclass
        statusMsg = 'Unable to reach target machine (ping failed)';
    }
    else if (access == 1) {
        //pingreachclass
        statusMsg = 'ALL OK';
    }
    else if (access == -1) {
        //orangeclass
        statusMsg = 'OS not supported';
    }
    else if (access == -3) {
        //yellowclass
        statusMsg = 'Unable to log in with specified userid (ssh login fails)';
    }
    else if (access == -4) {
        //blueclass
        statusMsg = 'Insufficient execution privilege (cannot run privileged instructions)';
    }
    else if (access == -5) {
        //grayclass
        statusMsg = 'Access check in progress';
    }
    else if (access == -99) {
        statusMsg = 'Target machine already exists';
    }

    return statusMsg;
}

//Onclick call for Console log button on success/failure/manual tab
function showConsolelog(tab)
{
    var value = ""
    if(tab == "success")
    {
       value = dojo.byId("success").value;
   }   
   else if(tab == "failed")
   {
       value = dojo.byId("failed").value;
   }   
   else if(tab == "manual")
   {
       value = dojo.byId("manual").value;
   }   
   else
   {
      return 
  }

  rulenum = value
        //Checking the rule number validation
        return_value = validationForRuleSelection(rulenum, " see the description.");
        if (return_value == 0)
        {
         return
     }

     show_console_log(value)
 }



//Showing the console log corresponding to selected rule.
function show_console_log(value){
	selectedTimeStamp_mod = selectedTimeStamp.replace(/\s/g, '');
	latest_client_time_mod = latest_client_time.replace(/\s/g, '');
	var timeStamp = "None";
	if (selectedTimeStamp != "None" & selectedTimeStamp_mod != latest_client_time_mod)
	{
		var date_obj = new Date(selectedTimeStamp);
		var utc_time = date_obj.toUTCString();
		var timeStamp = utc_time;
	}

	var uri = "/raxakapi/v1/getConsoleLog";
        var content = {userNameIP :profileRunIP ,securityRule:rulenum, timeStamp:timeStamp}; 
        dojo.xhrPost({
		url: uri,
		postData: content,
		timeout: defaultTimeout + 10000
        }).then(function (htmlResults) {
		button = "<center><button style='text-align: center' data-dojo-type='dijit/form/Button' type='submit'>Close</button></center>"
		string = "<h2><b class='focus-top' tabindex='0'>  </b></h2>"
		myDialog.set("title", "Console Log : Rule " + value );
		myDialog.set("content",string + htmlResults + button);
		myDialog.set("style", "width: 450px; border:1px solid #b7b7b7; background:#fff; margin:0 auto; height:300px;")
		myDialog.show()
            
            }, function (err) {
			if ('timeout' === err.dojoType) {
				myDialog3.set("title", "Timeout Error");
				button_ok = "<center><button class='info-btn-ok' data-dojo-type='dijit/form/Button' id='button_ok' type='submit'>OK</button></center>";
				myDialog3.set("content", "<div class='info-content'>Retry the web page by clicking the refresh/reload button, <br> if the problem persists then please contact the raxak administrator for further assistance.</div>" + button_ok);
				myDialog3.set("style", "height:160px;width:450px;");
				myDialog3.show();
		} else {
			myDialog3.set("title", "Error");
			button_ok = "<center><button class='info-btn-ok' data-dojo-type='dijit/form/Button' id='button_ok' type='submit'>OK</button></center>";
			myDialog3.set("content", "<div class='info-content'>Unable to modify the Target Machine(s).\nPlease contact the raxak administrator, if the problem persists.</div>" + button_ok);
			myDialog3.set("style", "height:160px;width:450px;");
			myDialog3.show();
		}
	}); //Api closed.
}//function closed.



function emptyCheck(data)
{
    data = data.trim();
    if (typeof (data) == 'number' || typeof (data) == 'boolean')
    {
        return false;
    }
    if (typeof (data) == 'undefined' || data === null)
    {
        return true;
    }
    if (typeof (data.length) != 'undefined')
    {
        return data.length == 0;
    }
    var count = 0;
    for (var i in data)
    {
        if (data.hasOwnProperty(i))
        {
            count++;
        }
    }
    return count == 0;
}


function setMenuTabSelect(tabid){
    var result = menu_tab_select_flag;
    $j14.each(result, function(k, v) {
        if(k == tabid){
         menu_tab_select_flag[k] = true;
     }else{
        menu_tab_select_flag[k] = false;
    }
});
}

function openComaprisionDiffernceReportPage(){
    window.open(get_comaprision_differnce_report_url, '_blank');
}

function setComaprisionDiffernceReportUrl(){
	dijit.byId("report_detailed_log").setAttribute('disabled',false);
   if ($j14("#myselect5varlog option:selected").index() == 0){
       archieveLogFirst = true;
   }else{
        archieveLogFirst = false;
        var page_name = 'comaprision_differnce_report';
        var page_title = 'Cloud Raxak Comaparision Difference Report';
        var userProfileSelectedTimestamp = document.getElementById("myselect5varlog").value;
        var archieveLogTimestampObj = new Date(userProfileSelectedTimestamp);
        var archieveLogTimestamp = archieveLogTimestampObj.toUTCString();
        var userProfileIpAddress = document.getElementById("myselect5").value;
        var userProfileName = document.getElementById('profileId').innerHTML;
        var archieveLogCurrentTimestampGmt =  $j14("#myselect5varlog option:first-child").val();
        var content = {profilename: userProfileName, usernameIP: userProfileIpAddress, archieveLogTimestamp: archieveLogTimestamp, archieveLogTimestampGmt: userProfileSelectedTimestamp,'archieveLogCurrentTimestampGmt':archieveLogCurrentTimestampGmt, 'page_name': page_name,'page_title':page_title};
        dojo.xhrPost({
            url: '/raxakapi/v1/urlParamaterEncode',
            postData: content,
        }).then(function (jsonUrl) {
            if (typeof location.origin === 'undefined')
                location.origin = location.protocol + '//' + location.host;
                get_comaprision_differnce_report_url = location.origin + '/report.html?reportData=' + jsonUrl;
        });
   }
}


function openDetailedReportPage(){
    window.open(detailed_page_report_print_url, '_blank');
}

function setDetailedReport() {

    var page_title = 'Cloud Raxak Detailed Report';
    var userProfileSelectedTimestamp = document.getElementById("myselect5varlog").value;
    var userProfileIpAddress = document.getElementById("myselect5").value;
    var userProfileName = document.getElementById('profileId').innerHTML;
    var page_error = true;
    $j14('#pass_opt_value').val('');	
    var report_type1 =  $j14(this).find("option:selected").text();
    if(report_type1 == ''){
	dijit.byId("report_detailed_log").setAttribute('disabled',true);
	}		
        $j14("#pass_opt_value").change(function () {
            var report_type = $j14("#pass_opt_value option:selected").val()
	    if(report_type !=''){	
	    dijit.byId("report_detailed_log").setAttribute('disabled',false);}
	    else{
	
	    	dijit.byId("report_detailed_log").setAttribute('disabled',true);}
    if (!emptyCheck(userProfileSelectedTimestamp) && !emptyCheck(userProfileIpAddress) && !emptyCheck(userProfileName)) {
        var archieveLogTimestampObj = new Date(userProfileSelectedTimestamp);
        var archieveLogTimestamp = archieveLogTimestampObj.toUTCString();
        var archieveLogFirst = false;
        var page_name = 'detailed_report';
        if ($j14("#myselect5varlog option:selected").index() == 0)
            archieveLogFirst = true;
        var content = {profilename: userProfileName, usernameIP: userProfileIpAddress, archieveLogTimestamp: archieveLogTimestamp, archieveLogTimestampGmt: userProfileSelectedTimestamp, 'archieveLogFirst': archieveLogFirst, 'page_name': page_name,'page_title':page_title};
        dojo.xhrPost({
            url: '/raxakapi/v1/urlParamaterEncode',
            postData: content,
        }).then(function (jsonUrl) {
            if (typeof location.origin === 'undefined')
                location.origin = location.protocol + '//' + location.host;
            var new_page_path = location.origin + '/report.html?report_type='+report_type+'&reportData=' + jsonUrl;
            detailed_page_report_print_url = new_page_path;
        });
    }

        });
}

function validate_private_ip_section(){
    var check_user = /^[a-zA-Z0-9~!#^%*&`\_\-{|}/'$?+=]+([\.]?[a-zA-Z0-9~!#^%*&`\_\-{|}/'$?+=]+)?$/;
    var check_nickname = /^[Aa-zZ0-9\.\@]*/
    var chk_value = document.getElementById('private_ip').checked;
    var ip_address = document.getElementById('ipaddress').value;
    var user_name = document.getElementById('username_pip').value;
    var password_value = document.getElementById('paswd_pip').value;
    var tunnel_name = document.getElementById('ipaddress_pip').value;
    if(chk_value == true){	
       if (ip_address == ''){
           myDialog2.set("title", "Error");
           button = "<button class='info-btn' data-dojo-type='dijit/form/Button' id='leave_tab_ok' value='OK' type='submit'>OK</button>"                 
           myDialog2.set("content", "<div class='info-content'>Please enter ip address</div>" + "<center>" + button + "</center>");                      	    myDialog2.set("style", "height:140px;");                                  myDialog2.show()
           return false;}
           if (user_name == ''){
              myDialog2.set("title", "Error");
              button = "<button class='info-btn' data-dojo-type='dijit/form/Button' id='leave_tab_ok' value='OK' type='submit'>OK</button>"
              myDialog2.set("content", "<div class='info-content'>Please enter Username</div>" + "<center>" + button + "</center>");                      	      myDialog2.set("style", "height:140px;");
              myDialog2.show()
              return false;}
              if(user_name.length < 1 || user_name.length > 20){
                  button = "<button class='info-btn' data-dojo-type='dijit/form/Button' id='leave_tab_ok' value='OK' type='submit'>OK</button>"
                  myDialog2.set("content", "<div class='info-content'>Username should not be more than 20 characters</div>" + "<center>" + button + "</center>");
                  myDialog2.set("style", "height:140px;");
                  myDialog2.show()
                  return false;}
                  if(password_value == '' ){
                      myDialog2.set("title", "Error");
                      button = "<button class='info-btn' data-dojo-type='dijit/form/Button' id='leave_tab_ok' value='OK' type='submit'>OK</button>"
                      myDialog2.set("content", "<div class='info-content'>Please enter Password</div>" + "<center>" + button + "</center>");                      	    myDialog2.set("style", "height:140px;");                                  myDialog2.show()
                      return false;}	
                      if(tunnel_name == '' ){
                          myDialog2.set("title", "Error");
                          button = "<button class='info-btn' data-dojo-type='dijit/form/Button' id='leave_tab_ok' value='OK' type='submit'>OK</button>"
                          myDialog2.set("content", "<div class='info-content'>Please enter tunnel ip</div>" + "<center>" + button + "</center>");
                          myDialog2.set("style", "height:140px;");
                          myDialog2.show()
                          return false;}
                      }
                  }

function forceRemediateRules(){
    //This function remediate the failed rules on click event of Force Remediate button.
    var value = dojo.byId("manual").value;
    rulenum = value.substring(2);
    //Checking the rule number validation
    return_value = validationForRuleSelection(rulenum, " force remediate.");
    if (return_value === 0){
        return;
    }

    var uri = "/raxakapi/v1/forceRemediateRule/V-" + rulenum + "?ip=" + profileRunIP;
    dojo.style('ajaxloader', 'display', 'block');
    dojo.xhrGet({
        url: uri,
        method: "GET",
        crossDomain: false,
        handleAs: "text"
    }).then(function (htmlResults) {
        myDialog2.set("title", "Info");
        button = "<button class='info-btn' data-dojo-type='dijit/form/Button' id='leave_tab_ok' value='OK' type='submit'>OK</button>";
        myDialog2.set("content", "<div class='info-content'> Please enter valid IP Address</div>" + "<center>" + button + "</center>");
        myDialog2.set("content", "<div class='info-content'>" + htmlResults + "</div>" + "<center>" + button + "</center>");
        myDialog2.set("style", "height:140px;");
        myDialog2.show();
        updateStatusPans();
        dojo.style('ajaxloader', 'display', 'none');
    }, function (err) {
        dojo.style('ajaxloader', 'display', 'none');
        if ('timeout' === err.dojoType) {
            myDialog3.set("title", "Timeout Error");
            button_ok = "<center><button class='info-btn-ok' data-dojo-type='dijit/form/Button' id='button_ok' type='submit'>OK</button></center>";
            myDialog3.set("content", "<div class='info-content'>Retry the web page by clicking the refresh/reload button, <br> if the problem persists then please contact the raxak administrator for further assistance.</div>" + button_ok);
            myDialog3.set("style", "height:160px;width:450px;");
            myDialog3.show();
        } else {
            myDialog3.set("title", "Error");
            button_ok = "<center><button class='info-btn-ok' data-dojo-type='dijit/form/Button' id='button_ok' type='submit'>OK</button></center>";
            myDialog3.set("content", "<div class='info-content'>Unable to Fix the security check Rule.\nplease contact the raxak administrator for further assistance.</div>" + button_ok);
            myDialog3.set("style", "height:160px;width:450px;");
            myDialog3.show();
        }
    });
}
