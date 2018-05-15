//********** ********** Start: Config ********** **********//
//Start: Constants//
var MEDIA_DIR = './'; //static/
var IMG_DIR = MEDIA_DIR + 'images/';
var CSS_DIR = MEDIA_DIR + 'css/';
var JS_DIR = MEDIA_DIR + 'js/';
var ipDetails = [];
var value_array = new Array();
var value_array1 = new Array();
var key_array = [];
var DEFAULT_TIMEOUT = 10 * 1000;//10 seconds
var show_key = '';
var ip = '';
var frequency = '';
var nextrun = '';
var isshedular = false;
var API_CALL_PREFIX = "../raxakapi/v1/";
var TIMEOUT_MESSAGE = 'Retry the web page by clicking the refresh/reload button, <br> if the problem persists then please contact the raxak administrator for further assistance.';
var TM_ACCESS_NORM = {};
TM_ACCESS_NORM["1"] = {status: "OK", class: "pingreachclass", cssclass: "success", title: "ALL OK"};
TM_ACCESS_NORM["-1"] = {status: "OS not supported", class: "orangeclass", cssclass: "", title: "OS not supported"};
TM_ACCESS_NORM["-2"] = {status: "Unreachable", class: "pingnotreachableclass", cssclass: "danger", title: "Unable to reach target machine (ping failed)"};
TM_ACCESS_NORM["-3"] = {status: "Cannot SSH", class: "yellowclass", cssclass: "warning", title: "Unable to log in with specified userid (ssh login fails)"};
TM_ACCESS_NORM["-4"] = {status: "No sudo", class: "blueclass", cssclass: "info", title: "Insufficient execution privilege (cannot run privileged instructions)"};
TM_ACCESS_NORM["-5"] = {status: "In progress", class: "grayclass", cssclass: "active", title: "Access check in progress"};
//Start: Do Not delete code (contains additional access codes -6 and -99)
var TM_ACCESS_NORMS = {};
TM_ACCESS_NORMS["1"] = {status: "OK", class: "pingreachclass", cssclass: "success", title: "ALL OK"};
TM_ACCESS_NORMS["-1"] = {status: "OS not supported", class: "orangeclass", cssclass: "", title: "OS not supported"};
TM_ACCESS_NORMS["-2"] = {status: "Unreachable", class: "pingnotreachableclass", cssclass: "danger", title: "Unable to reach target machine (ping failed)"};
TM_ACCESS_NORMS["-3"] = {status: "Cannot SSH", class: "yellowclass", cssclass: "warning", title: "Unable to log in with specified userid (ssh login fails)"};
TM_ACCESS_NORMS["-4"] = {status: "No sudo", class: "blueclass", cssclass: "info", title: "Insufficient execution privilege (cannot run privileged instructions)"};
TM_ACCESS_NORMS["-5"] = {status: "In progress", class: "grayclass", cssclass: "active", title: "Access check in progress"};
TM_ACCESS_NORMS["-6"] = {status: "Cannot VPN", class: "pingnotreachableclass", cssclass: "danger", title: "Cannot VPN"};
TM_ACCESS_NORMS["-99"] = {status: "Already exists", class: "pingreachclass", cssclass: "", title: "Target machine already exists"};
//End: Do Not delete code (contains additional access codes -6 and -99)

var APP_VERSION = ''; //One time value by API call
//End: Constants//

//Start: Global variables//
var gLoggedUser; //One time Value by API call
var gSessionData;
var gEnrolledTMs; //Value by API call
var gEnrolledTMCount; //Value by API call

var gFlagError = false;
var gErrorStatus = {error: []};
var gSelectedTM;
var gSelectedTimestamp;
var gSelectedProfile;
var gFlagExecution = false;
var gCurrentExecutionOnTMs = '';
var gLastExecutedAtTimestamp; //Value by API call
var gLastExecutedOnTMs; //Value by API call
var gCustomClientTimeDisplay;
var gWidgetDisplays = [];
var initinterval = 15000;
var intervalid = '';
//End: Global variables//

//********** ********** End: Config ********** **********//


//********** ********** Start: Onload APP ********** **********//
//Start: Onload Function

//Remove Dublicate entry from array
var unique = function (get_new_array) {
    var empty_array = [],
            get_new_arrayLen = get_new_array.length,
            found, x, y;
    for (x = 0; x < get_new_arrayLen; x++) {
        found = undefined;
        for (y = 0; y < empty_array.length; y++) {
            if (get_new_array[x] === empty_array[y]) {
                found = true;
                break;
            }
        }
        if (!found) {
            empty_array.push(get_new_array[x]);
        }
    }
    return empty_array;
}

//End code

// Get the list of IP addresses enrolled by current user
var getTMs = function () {
    var html = "";
    $.ajax({
    	timeout:DEFAULT_TIMEOUT,
        dataType: 'json',
        url: API_CALL_PREFIX + "getIPs/"
    }).done(function (response) {
        var ipscount = Object.keys(response).length;
        if (ipscount > 0) {
            intervalid = setInterval(getprofile, initinterval); // just initialize the auto refresh.
            $("#enrolledIPs").html($(response).length);
            // Create the modal data that will be shown on clicking "more info"
            html += "<div class='table-responsive'><table class='table table-hover'><thead>";
            html += "<tr><th>Server Name</th><th>Server IP</th><th>Access</th><th><span style='margin-left:24px;'>OS</span></th>";
            html += "</tr></thead><tbody>";
            $.each(response, function (key, value) {
                var get_tms = JSON.parse(value);
                html += "<tr class='" + TM_ACCESS_NORMS[get_tms.access].cssclass + "'>";
                html += "<td>" + get_tms.nickname + "</td>";
                html += "<td>" + get_tms.ip + "</td>";
                html += "<td>" + TM_ACCESS_NORMS[get_tms.access].status + "</td>";
                if (get_tms.osname != undefined) {
                    html += "<td>" + get_tms.osname + " " + get_tms.osversion + "</td>";
                } else {
                    html += "<td style='text-align: center;'>--</td>";
                }
                html += "</tr>";
            });
            html += "</tbody></table></div>";
            setTimeout(function () {
                $("#enrolledInfoBody").html(html);
            }, 200);
        } else {
            var html1 = '<div class="panel panel-default" style="font-size:larger;text-align:center;margin-top: 350px; opacity:0.7" ><div class="panel-body"><div  style="font-size: x-large;">You have no servers enrolled. <a style="cursor:pointer;text-decoration:none;" href="../enrolled_servers.html">Click here</a> to enroll.</div></div></div>';
            $("#page-wrapper").hide();
            $("body").addClass('blank_bg');
            $("#page-wrapper1").html(html1);
        }
    }).fail(function (jqxhrFail, textStatusFail, errorThrownFail) {
    	 if(textStatusFail == 'timeout'){
    	swal({
            text: 'Request timed out',
            type: 'error'
        });
    }
    	 else{
        	 errorHandler(jqxhrFail);
    	 }
    });
};
var get_ip_details = function (defaultIp, ips, flag) {
    var html = '';
    var htmldetail = '';
    var counter = 0;
    var get_gmt_time = '';
    var target_machine_count = [];
    var ipslength = ips.length;
    var myArray = {}

    if (ipslength > 0) {
        html += "<thead><tr><th>Server Names</th><!--<th>Nickname</th>--><th>Status</th></tr></thead><tbody>";
        htmldetail += "<thead><tr><th>Server Name</th><th>Server IP</th><th>Status</th></tr></thead><tbody>";
        //for (var key in myArray) {
        var i = 1;
        $.each(ips, function (key, data) {
            var data = JSON.parse(data);
            var ip = data.ip;
            var nickname = data.nickname;
            $.ajax({
            	timeout: DEFAULT_TIMEOUT,
                dataType: 'json',
                url: API_CALL_PREFIX + "showExecutionStatus/" + ip,
                async: false
            }).done(function (showdata) {
                var status = '';
                var get_show_executiondata = [];
                ipDetails[ip] = [];
                ipDetails[ip]['executionstatus'] = showdata;
                target_machine_count.push(ip);
                get_show_executiondata.push(showdata);
                if (!showdata.match('execution is in progress')) {
                    counter++;
                    var aborthtml = '';
                    if (showdata.match('execution completed')) {
                        status = 'COMPLETED';
                        var get_ip_data_split = String(showdata).split(" : ");
                    } else if (showdata.match('execution aborted by rp')) {
                        status = 'ABORTED (connection lost)';
                        var get_ip_data_split = String(showdata).split(" : ");
                    } else if (showdata.match('execution aborted')) {
                        status = 'ABORTED';
                        var get_ip_data_split = String(showdata).split(" : ");
                    }

                    var utc_format = new Date(get_ip_data_split[1] + ' UTC');
                    var get_utc_date = String(utc_format).replace('GMT+0530 (IST)', "");
                    get_gmt_time = String(get_utc_date).replace('GMT+0530 (India Standard Time)', "");
                    // compare default ip to current IP to show the Date of First IP if completed
                    if (defaultIp == ip) {
                        $('#dp_datetime').show();
                        if (status.indexOf('ABORTED') != -1) {
                            $('#dp_datetime').text("Aborted on: " + get_gmt_time);
                        } else {
                            $('#dp_datetime').text("Completed on: " + get_gmt_time);
                        }
                    }
                    //var linkhtml = '<td style="font-size:11px !important;padding:7px !important;"><a onclick="getshowrun(' + '\'' + ip + '\',' + '\'' + get_gmt_time + '\',' + '\'' + i + '\');"href="javascript:void(0);">' + ip + ' </a></td>';
                    var linkhtml = '<td style="font-size:11px !important;padding:7px !important;"><a onclick="getshowrun(' + '\'' + ip + '\',' + '\'' + get_gmt_time + '\',' + '\'' + i + '\',' + '\'' + nickname + '\');"href="javascript:void(0);">' + nickname + ' </a></td>';
                    //var linkhtml = '<td style="font-size:11px !important;padding:7px !important;"><a onclick="getshowrun(' + '\'' + ip + '\',' + '\'' + '' + '\',' + '\'' + i + '\','+'\''+nickname+'\');" href="javascript:void(0);">' + nickname + '</a></td>';

                    initinterval = 10000;
                    if (ipslength == counter) {
                        clearInterval(intervalid);
                        $("#spin_id").hide();
                        $("#spin_idd").show();
                        $("#change_value").html("Completed");
                        $("#spinnerText").html('');
                        //$("#spinnerText").html($(unique(target_machine_count)).length);
                    }
                } else {
                    initinterval = 10000;
                    status = 'Run In Progress';
                    if (isshedular == false && getcronjobdetails == '') {
                        var frequency = '<div style="cursor:pointer;text-decoration:none;color:#fff;font-size: 12px;">No scheduler is running.</div>';
                        $("#nextRun").html(frequency);
                    }
                    $("#spin_idd").hide();
                    $("#spin_id").show();
//                   $("#change_value").html("Run In Progress (" + getRunningStatus(ips) + "%)...");
                    $("#spinnerText").html(getRunningStatus(ip, flag) + "%");
                    $("#change_value").html("Run In Progress");
                    var aborthtml = '<a href="javascript:void(0) ;" onclick="abortAction(' + '\'' + ip + '\');"><button  class="btn btn-default" title="Abort Compliance execution for this target machine" type="button" style="padding:1px 8px; font-size:11px;">Abort Execution</button></a>';
                    //var linkhtml = '<td style="font-size:11px !important;padding:7px !important;"><a onclick="getshowrun(' + '\'' + ip + '\',' + '\'' + '' + '\',' + '\'' + i + '\');" href="javascript:void(0);">' + ip + '</a></td>';
                    //var linkhtml = '<td style="font-size:11px !important;padding:7px !important;"><a onclick="getshowrun(' + '\'' + ip + '\',' + '\'' + '' + '\',' + '\'' + i + '\');" href="javascript:void(0);">' + nickname + '</a></td>';
                    var linkhtml = '<td style="font-size:11px !important;padding:7px !important;"><a onclick="getshowrun(' + '\'' + ip + '\',' + '\'' + '' + '\',' + '\'' + i + '\',' + '\'' + nickname + '\');" href="javascript:void(0);">' + nickname + '</a></td>';
                }
                if (get_gmt_time == undefined || get_gmt_time == 'undefined' || get_gmt_time == '') {
                    get_gmt_time = '--';
                }

                if (key_value == ip) {
                    var active_class = 'success';
                } else {
                    var active_class = '';
                }
                html += '<tr class="' + active_class + '" id="trid_' + i + '">';
                html += linkhtml;
                //html += "<td style='font-size:11px !important;padding:7px !important;'>" + nickname + "</td>";
                //html += "<td style='font-size:11px !important;padding:7px !important;'>" + get_gmt_time + "</td>"; //hide date coloumn for future
                html += "<td style='font-size:11px !important;padding:7px !important;'>" + status + " " + aborthtml + "</td>";
                html += "</tr>";

                htmldetail += "<tr>";

                htmldetail += "<td style='font-size:11px !important;padding:7px !important;'>" + nickname + "</td>";
                htmldetail += '<td style="font-size:11px !important;padding:7px !important;">' + ip + '</td>';
                htmldetail += "<td style='font-size:11px !important;padding:7px !important;'>" + status + "</td>";
                htmldetail += "</tr>";
            });
            i++;
        });
        html += "</tbody>";
        htmldetail += "</tbody>";
        $("#numberMachines").html($(unique(target_machine_count)).length);
    } else {
        $("body").addClass('blank_bg');
        var html = '<div style="font-size:12px;text-align:center;">First Add Target !<a href ="../enrolled_servers.html" style="cursor:pointer;text-decoration:none;">Click here</a>.</div>';
        $("#active_machine").html(html);
    }
    $("#lastrunIPs").html(html);
    $("#active_machine").html(htmldetail);
};

var getshowrun = function (ip_name, timestamp, trid, nickname) {
    var html = '';
    var html1 = '';
    var html2 = '';
    var profile_name = '';
    var rule_outcome = '';

    var success_array = new Array();
    var failed_array = new Array();
    var manual_array = new Array();
    $.ajax({
    	timeout: DEFAULT_TIMEOUT,
        url: API_CALL_PREFIX + "showrun/" + ip_name,
        beforeSend: function () {
            $("#morris-donut-chart").html('<div style="text-align: center;"><img src="images/loader4.gif" height="150" width="300"></div>');
        }
    }).done(function (response) {
        aborted = false
        var counts = Object.keys(response).length;
        if (counts > 0) {
            var responseObj = JSON.parse(response[0]);
            var show_profile = responseObj.profile;
            var outcome = responseObj.outcome;
            if (outcome !== "INACCESSIBLE" && outcome !== "inaccessible") {
                if (ip_name !== '') {
                    html1 += "<div class='table-responsive'><table class='table table-hover'><thead>" +
                            "<tr><th style='text-align:center;'> Success</th><th style='text-align:center;'>Manual</th>" +
                            "<th style='text-align:center;'>Failure</th></tr></thead><tbody>";
                    $.each(response, function (key, value) {
                        var get_profile_data_value = JSON.parse(value);
                        if (key == 0)
                            profile_name = get_profile_data_value.profile;
                        rule_outcome = get_profile_data_value.outcome;
                        if (rule_outcome.match("successful")) {
                            success_array.push(rule_outcome);
                        }
                        if (rule_outcome == "failed") {
                            failed_array.push(rule_outcome);
                        }
                        if (rule_outcome.match("needs manual intervention")) {
                            manual_array.push(rule_outcome);
                        }
                        if (rule_outcome.match("UNKNOWN")) {
                            aborted = true
                        }
                    });

                    var success_total = success_array.length;
                    var fail_total = failed_array.length;
                    var manual_total = manual_array.length;
                    var total_rule = success_total + fail_total + manual_total;
                    var get_ip_only = ip_name.split('@');
                    var getipsvalue = get_ip_only[1];
                    if (success_total != 0 && fail_total != 0 && manual_total != 0) {
                        var rule_count_info = "<span style='font-weight:bold'>Success (" + success_total + ") Failure (" + fail_total + ") Manual (" + manual_total + ")</span>";
                    }
                    if (success_total == 0) {
                        var rule_count_info = "<span style='font-weight:bold'>Failure (" + fail_total + ") Manual (" + manual_total + ")</span>";
                    }
                    if (fail_total == 0) {
                        var rule_count_info = "<span style='font-weight:bold'>Success (" + success_total + ") Manual (" + manual_total + ")</span>";
                    }
                    if (manual_total == 0) {
                        var rule_count_info = "<span style='font-weight:bold'>Success (" + success_total + ") Failure (" + fail_total + ")</span>";
                    }
                    if (success_total == 0 && fail_total == 0) {
                        var rule_count_info = "<span style='font-weight:bold'>Manual (" + manual_total + ")</span>";
                    }
                    if (success_total == 0 && manual_total == 0) {
                        var rule_count_info = "<span style='font-weight:bold'>Failure (" + fail_total + ")</span>";
                    }
                    if (fail_total == 0 && manual_total == 0) {
                        var rule_count_info = "<span style='font-weight:bold'>Success (" + success_total + ")</span>";
                    }
                    html1 += "<tr>";
                    html1 += "<td style='text-align:center;'>" + success_total + "</td>";
                    html1 += "<td style='text-align:center;'>" + manual_total + "</td>";
                    html1 += "<td style='text-align:center;'>" + fail_total + "</td>";
                    html1 += "</tr>";
                    html1 += "</tbody></table></div>";

                    if (nickname != ip_name) {
                        $('#db_enrolledserver').html('Server Name: ' + nickname + ' ' + '<b>(' + ip_name + ')</b>');
                    }
                    else {
                        $('#db_enrolledserver').html('Server Name: ' + nickname);
                    }
                    // $('#db_enrolledserver').html('Server Name: ' + nickname+' '+ '<b>('+getipsvalue+')</b>');
                    $('#dp_profilename').text('Profile Name: ' + profile_name);
                    //$('#dp_totalrules').text('Total Rules: ' + total_rule);
                    $('#dp_totalrules').html('Total Rules: ' + total_rule + ' - ' + rule_count_info);
                    $('#accessiblecontent').show();
                    $('#inaccessiblecontent').hide();
                    if (timestamp != '') {
                        $("#dp_datetime").show();
                        if (aborted) {
                            $("#dp_datetime").text("Aborted on: " + timestamp);
                        } else {
                            $("#dp_datetime").text("Completed on: " + timestamp);
                        }
                    } else {
                        $("#dp_datetime").hide();
                    }
                    $("#lastrunIPs tbody > tr").each(function (key, value) {
                        $(this).removeClass('success'); //remove the class .
                    });
                    $('#trid_' + trid).addClass('success');
                    generate3dGraph(success_total, fail_total, manual_total);
                    $("#show_rule").html(html1);
                } else {
                    document.getElementById('runing_machine').style.display = 'none';
                    document.getElementById('cron_box').style.display = 'none';
                    document.getElementById('tm_machine').style.width = '100%';
                    document.getElementById('chart_div').style.display = 'none';
                }
            } else {
                $('#accessiblecontent').hide();
                $('#inaccessiblecontent').show();
                $('#in_enrolledserver').text('Server Name: ' + nickname);
                $('#in_profilename').text('Profile Name: ' + responseObj.profile);
                $('#in_status').text('Status : Unable to reach target machine');
            }
        }
    }).fail(function (jqxhrFail, textStatusFail, errorThrownFail) {
        if(textStatusFail == 'timeout'){
        swal({
            text:'Request timed out!',
            type:'error'
        });
        }else{
        	errorHandler(jqxhrFail);	
        }
    });
};

/*
 * @param {type} ip
 * @returns {string aborted execution}
 */

function abortAction(runningIp) {
    if (runningIp) {
        var url = API_CALL_PREFIX + "abortExecution/?ip=" + runningIp + "";
        $.ajax({
            url: url,
//            async: true,
            success: function (result) {
                if (result.toString().toLowerCase() == "aborted execution") {
                    getprofile();
                }
            }
        });
    } else {
        alert("No running job to abort");
    }
    return false;
}

/*
 * 
 * @param {type} ip
 * @returns {Number percentage}
 */
var getRunningStatus = function (ip, flag) {
    var percentage = 0;
    var url = API_CALL_PREFIX + "getExecutionStatus/?ip=" + ip + "";
    $.ajax({
        url: url,
        async: false,
        success: function (result) {
            try {
                var res = result.toString().split(":");
                if (res[0] == "false") {
                    if (flag == 0 && res[1] >= 100) { // try to handle % when page load but not working properly.
                        //res[1] = 99;
                        percentage = 0;
                    } else {
                        percentage = res[1];
                    }
                }
            } catch (e) {
                alert("Error : While getting percentage !");
            }
        }
    });
    return percentage;
};

var getprofile = function (flag) {
    var html = '';
    var html1 = '';
    var html2 = '';
    var profile_name = '';
    var total_rule = '';
    var rule_outcome = '';
    var rule_name = '';
    var nick_name_key = [];
    $.ajax({
    	timeout: DEFAULT_TIMEOUT,
        url: API_CALL_PREFIX + "getlastrunIPs",
        //async: false
    }).done(function (response) {
        arrayOfObjects = response;
        aborted = false
        if (arrayOfObjects.length == 0) {
            $("#spin_id").hide();
            $("#spin_idd").show();
            $("#change_value").text("");
        }
        if (arrayOfObjects.length > 0) {
            for (var i in arrayOfObjects) {
                var json = JSON.parse(arrayOfObjects[i]);
                key = json.ip;
                value = json.nickname
                lastrun = json.lastrun
                if (lastrun != "1") {
                    continue;
                }
                key_array.push(key);
                nick_name_key.push(value)
            }
            //In case of no latest execution IP in previous runs, then skip rendering last run summary.
            if (key_array.length == 0){
                $("#image-holder-page").fadeOut('slow');
                clearInterval(intervalid);
            }
            get_key = unique(key_array);
            get_nickname_val = unique(nick_name_key);
            if (get_key != '') {
                key_value = get_key[0];
                get_cron_details();
                get_ip_details(key_value, response, flag); //set first Ip i.e key_value as Default ip
            } else {
                key_value = '';
            }
            var get_ip_only1 = key_value.split('@');
            var getipsvalue1 = get_ip_only1[1];
            var success_array = new Array();
            var failed_array = new Array();
            var manual_array = new Array();

            if (key_value != '' || key_value == 'undefined') {
                $.get(API_CALL_PREFIX + "showrun/" + key_value, function (getprofiledata) {
                    var counts = Object.keys(getprofiledata).length;
                    if (counts > 0) {
                        var responseObj = JSON.parse(getprofiledata[0]);
                        var outcome = responseObj.outcome;
                        if (outcome !== "INACCESSIBLE" && outcome !== "inaccessible") {
                            html1 += "<div class='table-responsive'><table class='table table-hover'><thead>";
                            html1 += "<tr><th style='text-align:center;'> Success</th><th style='text-align:center;'>Manual</th>";
                            html1 += "<th style='text-align:center;'>Failure</th></tr></thead><tbody>";

                            $.each(getprofiledata, function (key, value) {
                                var get_profile_data_value = JSON.parse(value);
                                if (key == 0)
                                    profile_name = get_profile_data_value.profile;
                                rule_name = get_profile_data_value.rule;
                                value_array.push(rule_name);
                                total_rule = unique(value_array).length;
                                rule_outcome = get_profile_data_value.outcome;
                                if (rule_outcome.match("successful")) {
                                    success_array.push(rule_outcome);
                                }
                                if (rule_outcome == "failed") {
                                    failed_array.push(rule_outcome);
                                }
                                if (rule_outcome.match("needs manual intervention")) {
                                    manual_array.push(rule_outcome);
                                }
                                if (rule_outcome.match("UNKNOWN")) {
                                    aborted = true;
                                }

                            });

                            var success_total = success_array.length;
                            var fail_total = failed_array.length;
                            var manual_total = manual_array.length;
                            total_rule = success_total + fail_total + manual_total;
                            if (success_total != 0 && fail_total != 0 && manual_total != 0) {
                                var rule_count_info = "<span style='font-weight:bold'>Success (" + success_total + ") Failure (" + fail_total + ") Manual (" + manual_total + ")</span>";
                            }
                            if (success_total == 0) {
                                var rule_count_info = "<span style='font-weight:bold'>Failure (" + fail_total + ") Manual (" + manual_total + ")</span>";
                            }
                            if (fail_total == 0) {
                                var rule_count_info = "<span style='font-weight:bold'>Success (" + success_total + ") Manual (" + manual_total + ")</span>";
                            }
                            if (manual_total == 0) {
                                var rule_count_info = "<span style='font-weight:bold'>Success (" + success_total + ") Failure (" + fail_total + ")</span>";
                            }
                            if (success_total == 0 && fail_total == 0) {
                                var rule_count_info = "<span style='font-weight:bold'>Manual (" + manual_total + ")</span>";
                            }
                            if (success_total == 0 && manual_total == 0) {
                                var rule_count_info = "<span style='font-weight:bold'>Failure (" + fail_total + ")</span>";
                            }
                            if (fail_total == 0 && manual_total == 0) {
                                var rule_count_info = "<span style='font-weight:bold'>Success (" + success_total + ")</span>";
                            }
                            if (nick_name_key[0] != key_value) {
                                $('#db_enrolledserver').html('Server Name: ' + nick_name_key[0] + ' ' + '<b>(' + key_value + ')</b>');
                            }
                            else {
                                $('#db_enrolledserver').html('Server Name: ' + key_value);
                            }
                            $('#dp_profilename').text('Profile Name: ' + profile_name);
                            //$('#dp_totalrules').text('Total Rules: ' + total_rule);
                            $('#dp_totalrules').html('Total Rules: ' + total_rule + ' - ' + rule_count_info);
                            $('#accessiblecontent').show();
                            $('#inaccessiblecontent').hide();
                            html1 += "<tr>";
                            html1 += "<td style='text-align:center;'>" + success_total + "</td>";
                            html1 += "<td style='text-align:center;'>" + manual_total + "</td>";
                            html1 += "<td style='text-align:center;'>" + fail_total + "</td>";
                            html1 += "</tr>";
                            html1 += "</tbody></table></div>";

                            $("#show_rule").html(html1);
                            generate3dGraph(success_total, fail_total, manual_total);
                        } else {
                            $('#accessiblecontent').hide();
                            $('#inaccessiblecontent').show();
                            $('#in_enrolledserver').html('Server Name: ' + nick_name_key[0] + ' ' + '<b>(' + key_value + ')</b>');
                            $('#in_profilename').text('Profile Name: ' + responseObj.profile);
                            $('#in_status').text('Status : Unable to reach target machine');
                        }
                    }
                    $("#image-holder-page").fadeOut('slow');
                });
            } else {
                document.getElementById('runing_machine').style.display = 'none';
                document.getElementById('cron_box').style.display = 'none';
                document.getElementById('tm_machine').style.width = '100%';
                document.getElementById('chart_div').style.display = 'none';
            }
        } else {
            $("#image-holder-page").fadeOut('slow');
            clearInterval(intervalid);
        }
    }).fail(function (jqxhrFail, textStatusFail, errorThrownFail) {
        if(textStatusFail == 'timeout'){
            swal({
                text:'Request timed out',
                type:'error'
            });
            }else{
            	errorHandler(jqxhrFail);	
            }
    });
};

function generate3dGraph(success_total, fail_total, manual_total) {
    var datapoints = [];

    if (success_total != 0 && manual_total != 0 && fail_total != 0) {
        datapoints.push(['Success', success_total]);
        datapoints.push(['Failure', fail_total]);
        datapoints.push(['Manual', manual_total]);
        Highcharts.setOptions({
            colors: ['#008000', '#FF0000', '#FFA500']
        });
    }
    if (success_total != 0 && manual_total == 0 && fail_total == 0) {
        Highcharts.setOptions({
            colors: ['#008000']
        });
        datapoints.push(['Success', success_total]);
    } else if (success_total == 0 && fail_total != 0 && manual_total != 0) {
        Highcharts.setOptions({
            colors: ['#FF0000', '#FFA500']
        });
        datapoints.push(['Failure', fail_total]);
        datapoints.push(['Manual', manual_total]);
    } else if (manual_total == 0 && success_total != 0 && fail_total != 0) {
        Highcharts.setOptions({
            colors: ['#008000', '#FF0000']
        });
        datapoints.push(['Success', success_total]);
        datapoints.push(['Failure', fail_total]);
    } else if (fail_total == 0 && success_total != 0 && manual_total != 0) {
        Highcharts.setOptions({
            colors: ['#008000', '#FFA500']
        });
        datapoints.push(['Success', success_total]);
        datapoints.push(['Manual', manual_total]);
    }
    if (success_total == 0 && manual_total != 0 && fail_total == 0) {
        Highcharts.setOptions({
            colors: ['#FFA500']
        });
        datapoints.push(['Manual', manual_total]);
    }
    if (success_total == 0 && manual_total == 0 && fail_total != 0) {
        Highcharts.setOptions({
            colors: ['#FF0000']
        });
        datapoints.push(['Failure', fail_total]);
    }
    $('#accesschartContainers').highcharts({
        chart: {
            type: 'pie',
            options3d: {
                enabled: true,
                alpha: 45
            }
        },
        title: {
            text: ''//'Report Graph'
        },
        tooltip: {
            //pointFormat: '{series.name}: <b>{point.percentage:.1f}%</b>'
            pointFormat: '<b>{point.y}</b>'
        },
        plotOptions: {
            pie: {
                innerSize: 100,
                depth: 45,
                dataLabels: {
                    enabled: false, // disabled the name and arrow
                    format: '{point.name}'
                },
                showInLegend: true
            }
        },
        legend: {
            enabled: true,
            layout: 'horizontal',
            align: 'center',
            verticalAlign: 'top'
        },
        series: [{
                name: 'Delivered amount',
                data: datapoints
            }]
    });
}
var getcronjobdetails = '';
var get_cron_details = function () {
    $.ajax({
    	timeout: DEFAULT_TIMEOUT,
        dataType: 'json',
        url: API_CALL_PREFIX + "getCronJobs"
    }).done(function (responseData) {
        var sortedDates = '';
        getcronjobdetails = responseData;
        if (getcronjobdetails != '') {
            var frequency = '<div style="font-size:12px;"><a href ="../enrolled_servers.html" style="cursor:pointer;text-decoration:none;color:#fff;">No scheduler is running</a>.</div>';
            var html = "<div class='table-responsive'><table class='table table-hover'><thead>" +
                    "<tr><th>Server Name</th><th>Profile</th><th>Frequency</th><th>Nextrun</th></tr></thead><tbody>";
            var date_array = [];
            $.each(getcronjobdetails, function (key, value) {
                var get_cron_job = JSON.parse(value);
                var ip = get_cron_job.ip;
                var frequency = get_cron_job.frequency;
                frequency = frequency.substr(0, 1).toUpperCase() + frequency.substr(1).toLowerCase();
                var cron_profile = get_cron_job.profile;
                var nextrun = get_cron_job.nextrun;
                var utc_format = new Date(nextrun + ' UTC');
                var get_utc_date = String(utc_format).replace('GMT+0530 (IST)', "");
                //get_utc_date = String(utc_format).replace('GMT+0530 (India Standard Time)', "");
                date_array.push(get_utc_date);
                sort_date = date_array.sort();
                sortedDates = sort_date.sort(function (var1, var2) {
                    var a = new Date(var1), b = new Date(var2);
                    if (a > b)
                        return 1;
                    if (a < b)
                        return -1;
                    return 0;
                });
                html += "<tr>";
                html += "<td>" + ip + "</td>";
                html += "<td>" + cron_profile + "</td>";
                html += "<td>" + frequency + "</td>";
                html += "<td>" + get_utc_date + "</td>";
                html += "</tr>";
            });
            $("#nextRun").html('<span style= "font-size:14px;">Next Run:<br/>' + sortedDates[0] + '</span>');
        } else {
            var html = '<div style="font-size:12px;text-align:center;">To set the Schedular<a href ="../apply_profile.html" style="cursor:pointer;text-decoration:none;">. Click here.</div>';
            var frequency = '<div style="font-size:12px;"><a href ="../apply_profile.html" style="cursor:pointer;text-decoration:none;color:#fff;">Click here to set the Schedular</a>.</div>';
            //var html = '<div style="font-size:12px;text-align:center;" >To set the Schedular<a href ="../apply_profile.html"  style="cursor:pointer;text-decoration:none;" id="hide_href_div" onclick="hide(this.id)">. Click here.</div>';
            var html = '<div style="font-size:12px;text-align:center;" >No scheduler is running.</div>';
            //var frequency = '<div><a href ="../apply_profile.html" style="cursor:pointer;text-decoration:none;color:#fff;font-size: 12px;">Click here to set the Schedular</a>.</div>';
            var frequency = '<div><a href ="../apply_profile.html" style="cursor:pointer;text-decoration:none;color:#fff;font-size: 12px;">No scheduler is running</a>.</div>';
            $("#nextRun").html(frequency);
        }
        html += "</tbody></table></div>";
        $("#cron_job_count").html(html);
    }).fail(function (jqxhrFail, textStatusFail, errorThrownFail) {
        if(textStatusFail == 'timeout'){
            swal({
                text:'Request timed out',
                type:'error'
            });
            }else{
            	errorHandler(jqxhrFail);	
            }
    });
};
var session_get = '';
var loggedinUsername = '';
var get_motd_info = function (dformat) {
    var html = '';
    if (sessionStorage.getItem('motd_info')) {
        $('#motd_info').hide();
        return;
    }
    var content = {date: dformat};
    $.ajax({
        method: 'POST',
        timeout: DEFAULT_TIMEOUT,
        dataType: 'json',
        data: content,
        url: API_CALL_PREFIX + "getMotds/"
    }).done(function (response) {
        if (Object.keys(response).length > 0) {
            var motd_data = JSON.parse(response[0]);
            var description = motd_data.description;
            sessionStorage.setItem('motd_info', description);
            $('#motd_get').html('<font color="#31708F">' + description);
        } else {
            var loggedin_user = sessionStorage.getItem('logged_user');
            var loggedin_user = JSON.parse(loggedin_user);
            var loggedinUsernamedefault = loggedin_user.user;
            var loggedinUsername = loggedin_user.firstname;
            logged_username = ''
            if ( loggedinUsername != undefined) {
                logged_username = String(loggedinUsername).charAt(0).toUpperCase() + loggedinUsername.slice(1);
            }
            var date1 = new Date();
            var time = date1.getHours() + ":" + date1.getMinutes() + ":" + date1.getSeconds();
            var gethour = date1.getHours();
            sessionStorage.setItem('motd_info', true);
            greetingMsg = "Hello";
            if (time > '00:00:00' && time < '11:59:59') {
                greetingMsg = 'Good Morning';
            }
            else if (time > '12:00:00' && time < '16:00:00') {
                greetingMsg = 'Good Afternoon';
            }
            else if (time > '16:00:00' && time < '23:59:59') {
                greetingMsg = 'Good Evening';
            }
            if(logged_username == '')
            {
                html = greetingMsg;
            }
            else
            {
                html = greetingMsg + ', ' + logged_username + '&nbsp;';
            }
            $('#motd_get').html(html);
        }
    }).fail(function (jqxhrFail, textStatusFail, errorThrownFail) {
    	if(textStatusFail == 'timeout'){
    	        swal({
    	            text:'Request timed out',
    	            type:'error'
    	        });
    	}else{
    	   	errorHandler(jqxhrFail);	
    	     }
    });
};

function hide(target) {
    if (target == "hide_href_div") {
        $("#cron_job").hide();
        setInterval(function () {
            history.go(0)
        }, 50);
    }
}

var d = new Date();
var curr_date = d.getDate();
var curr_month = d.getMonth();
curr_month++;
var curr_year = d.getFullYear();
var month_names = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
var get_month = month_names[d.getMonth()];
var dashboard_login_time = get_month + ' ' + curr_date + ',' + ' ' + curr_year
$(document).ready(function () {
    var flag = 0; //-- set0 for page load.
    $("#login_time").text(dashboard_login_time);
	$(".container-fluid").css('display','block');
    getTMs();
    getprofile(flag);
    Number.prototype.padLeft = function (base, chr) {
        var len = (String(base || 10).length - String(this).length) + 1;
        return len > 0 ? new Array(len).join(chr || '0') + this : this;
    }
    var dateObj = new Date,
            dformat = [dateObj.getDate().padLeft(),
                (dateObj.getMonth() + 1).padLeft(),
                dateObj.getFullYear()].join('-');
    get_motd_info(dformat);
});
//********** ********** End: Onload APP ********** **********//

//********** ********** Start: Onload Page ********** **********//
//********** ********** End: Onload Page ********** **********//
