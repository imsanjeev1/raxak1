/* 
 * Js for All reports page (Success, Failure, Manual and Console)
 */

// Get the list of IP addresses enrolled by current user

//Start: Constants//
var API_CALL_PREFIX = "../raxakapi/v1/";
var TIMEOUT_MESSAGE = 'Retry the web page by clicking the refresh/reload button, <br> if the problem persists then please contact the raxak administrator for further assistance.';

var gFlagError = false;
var gErrorStatus = {error: []};
var profileRunIP = " ";

var gApplyProfile = true;
var consoleTextarea;
var consoleLogData;//for consoleTab search
var selectedTimeStamp = "None";
var initinterval = null;
var get_username = [];
var selectedtimestamp = '';
var lastSortList = [[0, 0]];
var isInProgress = false;   //-- check rule running status
var DEFAULT_TIMEOUT = 10 * 1000;//10 seconds


function RemoveDublicateHtml() {
    var seen = {};
    $('table.table tr').each(function () {
        var txt = $(this).text();
        if (seen[txt])
            $(this).remove();
        else
            seen[txt] = true;
    });

    /*$('table.table')
     .trigger('update')
     .trigger('sorton', [lastSortList]);*/
}
//----------------This function returns all ip information i.e executed on our server.-------------
var showIPs = function () {
    var html = '';
    $.ajax({
        url: API_CALL_PREFIX + "getlastrunIPs"
    }).done(function (responseData) {
        arrayOfObjects = responseData;
        if (arrayOfObjects.length > 0) {
            for (var i in arrayOfObjects) {
                var json = JSON.parse(arrayOfObjects[i]);
                key = json.ip;
                value = json.nickname;
                get_username.push(key);
                html += '<option value = "' + key + '">' + value + '</option>';
                $("#myselect1").html(html).select2();
                $("#myselect2").html(html).select2();
                $("#myselect3").html(html).select2();
                $("#myselect4").html(html).select2();
                var ip_address = $("#myselect1 option:selected").val();
                $("#tooltip_success").html(ip_address);
                $("#tooltip_failure").html(ip_address);
                $("#tooltip_manual").html(ip_address);
                $("#tooltip_console").html(ip_address);
            }
            if (get_username != 0) {
                var flag = 0; // flag zero for page load
                profileRunIP = get_username[0];
                showArchivesForIP(profileRunIP, flag);
                showRuleStatus(get_username[0], selectedtimestamp); //-- don't enterchange the calling position of both functions
            }
        } else {
            $("#rulescontents").hide();
            $("#alltabid").hide();
            $("#no_info").show();
            $('#image-holder-page').hide();
        }
        //$('#image-holder-page').hide();
    }).fail(function (jqXHR, textStatus, errorThrown) {
        errorHandler(jqxhrFail);
    });
};
//----------------------End-------------------------------

function callclearinterval(flag) {
    //-- don't enterchange the calling position of both functions
    showArchivesForIP(profileRunIP, flag);
    showRuleStatus(profileRunIP, selectedtimestamp);
}
//-----This function returns the getArchiveLogFileNameList() and showExecutionStatus().
//getArchiveLogFileNameList() displayed the old time value and showExecutionStatus() returns the latest time and latest status.

var showArchivesForIP = function (profileRunIP, flag) {
    var html = '';
    var result = new Array();
    var uri = "/raxakapi/v1/getArchiveLogFileNameList/" + profileRunIP;
    $.ajax({
        timeout: DEFAULT_TIMEOUT,
        dataType: 'json',
        url: uri,
        async: false
    }).done(function (response) {
        $.get(API_CALL_PREFIX + "showExecutionStatus/" + profileRunIP, function (showdata) {
            var latest_server_utc = "";
            if (!showdata.match('execution is in progress')) {
                isInProgress = false;
                if (showdata.match('execution completed')) {
                    latest_server_utc = showdata.split(" : ")[1].replace('"', '');
                    if (flag == 1)
                    {
                        $('#runinprogressmsg').html("<font color='darkgreen'>Compliance execution finished !</font>");
                    }
                } else if( showdata.match("execution aborted by rp")){
                    latest_server_utc = showdata.split(" : ")[1].replace('"',"");
                    if (flag == 1)
                    {
                        $('#runinprogressmsg').html("<font color='darkred'>Compliance execution has been aborted due to connection lost!</font>");
                    }
                } else {
                    latest_server_utc = showdata.split(" : ")[1].replace('"', '');
                    if (flag == 1)
                    {
                        $('#runinprogressmsg').html("<font color='darkred'>Compliance execution has been aborted successfully!</font>");
                    }
                }
                if (response.indexOf(latest_server_utc) == -1) {
                    response.splice(0, 0, latest_server_utc);
                }

                var utc_format = new Date(latest_server_utc + ' UTC');
                var get_utc_date = String(utc_format).replace('GMT+0530 (IST)', "");
                get_actual_time = String(get_utc_date).replace('GMT+0530 (India Standard Time)', "");
                $('#myselect1varlog option').eq(0).val(get_actual_time);
                $('#myselect1varlog option').eq(0).text(get_actual_time);
                $('#myselect2varlog option').eq(0).val(get_actual_time);
                $('#myselect2varlog option').eq(0).text(get_actual_time);
                $('#myselect3varlog option').eq(0).val(get_actual_time);
                $('#myselect3varlog option').eq(0).text(get_actual_time);
                $('#myselect4varlog option').eq(0).val(get_actual_time);
                $('#myselect4varlog option').eq(0).text(get_actual_time);
                clearInterval(initinterval); // Stop auto refresh when complete.
                initinterval = null;
            } else {
                isInProgress = true;
                get_actual_time = 'Latest Execution';
                result.push(get_actual_time);

                // Start auto refresh when change the target machine or load the page.
                if (flag == 2 || flag == 0) {
                    initinterval = setInterval(function () {
                        callclearinterval(1);
                    }, 10000);
                }
            }
            if (flag != 1) {
                if (result != '') {
                    html += '<option value="' + result + '">' + result + '</option>';
                }
                $.each(response, function (key1, value1) {
                    server_utc_time = value1.concat(' UTC');
                    time = new Date(server_utc_time);
                    client_local_time = time.toString().split("GMT")[0];
                    var get_actual_time = String(client_local_time).replace('GMT+0530 (India Standard Time)', "");
                    html += '<option>' + get_actual_time + '</option>';
                });
                $("#myselect1varlog").html(html).select2();
                $("#myselect2varlog").html(html).select2();
                $("#myselect3varlog").html(html).select2();
                $("#myselect4varlog").html(html).select2();
            }
            // Start auto refresh when change the target machine.
            if (flag == 2) {
                //showRuleStatus(profileRunIP, ''); // call to immediate show the percentage and other data.
            }
            $('#image-holder-page').hide();
        });
    }).fail(function (jqXHR, textStatus, errorThrown) {
        if (textStatus == 'timeout') {
            swal({
                text: 'Request timed out',
                type: 'error'
            });
        } else {
            errorHandler(jqXHR);
        }
    });
}; //function Ends...
//---------------------------End----------------------------
//On-Change event of archive file.
//1.Fetching the archived data to access the profile.
//2.Using this profile fetching the title of rules in map.
//3.Displaying the rule,status from archived data and corresponding title. 

var onClickOfArchiveLog = function (timeStamp, selectedindex, flag) {
    var profilerunIp = $('#myselect1').val();
    document.getElementById('myselect1varlog').value = timeStamp;
    document.getElementById('myselect2varlog').value = timeStamp;
    document.getElementById('myselect3varlog').value = timeStamp;
    document.getElementById('myselect4varlog').value = timeStamp;
    selectedTimeStamp = timeStamp;
    if (selectedindex === 0) {
        timeStamp = '';
        selectedTimeStamp = "None"; //set timestamp blank when first option is selected.
        callclearinterval(0); // flag 0 to start auto refresh
    } else {
        var disa = 'pointer-events' 
        isInProgress = false;
        clearInterval(initinterval);
        initinterval = null;
        showRuleStatus(profilerunIp, timeStamp, flag);
    }
};

function sortRules(p1, p2) {
    p1 = JSON.parse(p1);
    p2 = JSON.parse(p2);
    if (p1.rule < p2.rule)
        return -1;
    else if (p1.rule > p2.rule)
        return 1;
    else
        return 0;
}
//---------------------------showRuleStatus function returns the information of the profiles.---------------- 
var showRuleStatus = function (profileRunIP, selectedTimeStamp, flag) {
    var status = [];
    var show_status = '';
    if (selectedTimeStamp == '') {
        var utc_time = '';
        var uri = "/raxakapi/v1/showrun/" + profileRunIP;
    } else {
        var date_obj = new Date(selectedTimeStamp);
        var utc_time = date_obj.toUTCString();
        var uri = "/raxakapi/v1/showrun/" + profileRunIP + "?timestamp=" + utc_time;
    }
    $.ajax({
        timeout: DEFAULT_TIMEOUT,
        dataType: 'json',
        url: uri,
        beforeSend: function () {
            $('#ajaxloader').show();
        }
    }).done(function (response) {
        if (response.length) {
            $.each(response, function (key, value) {
                var responseObj = JSON.parse(value);
                var abort_value = responseObj.status;
                if (abort_value == 'ABORTED BY RAXAK PROTECT') {
                    status.push('ABORTED BY RAXAK PROTECT');
                }
                if (abort_value == 'ABORTED') {
                    status.push('ABORTED');
                }
                if (abort_value == 'COMPLETE') {
                    status.push('COMPLETE');
                }
            });
            if (status.slice(-1)[0] == "ABORTED") {
                show_status = '<font color="darkred">Compliance execution aborted !</font>';
            }
            if (status.slice(-1)[0] == "ABORTED BY RAXAK PROTECT") {
                show_status = '<font color="darkred">Compliance execution aborted due to connection lost !</font>';
            }
            if (status.slice(-1)[0] == 'COMPLETE') {
                show_status = '<font color="darkgreen">Compliance execution completed !</font>';
            }
            arrayOfObjects = response;
            arrayOfObjects.sort(sortRules);
            var responseObj = JSON.parse(response[0]);
            var show_profile = responseObj.profile;
            var outcome = responseObj.outcome;
            var map_title = {};
            if (outcome !== "INACCESSIBLE" && outcome !== "INACCESSIBLE") {
                $.get(API_CALL_PREFIX + "ruleTitle/" + show_profile, function (rule_data) {
                    var totalProfileRules = rule_data.length;
                    for (var element in rule_data) {
                        var rule = rule_data[element].rule;
                        var title = rule_data[element].title;
                        map_title[rule] = title;
                    }
                    //Adding row-column in success-table
                    var successful_html = "<div class='table-responsive'><table class='table table-hover'><thead><tr>";
                    successful_html += "<th width='60%'>Rules</th><th>Severity</th><th width='17%'>Status</th>";
                    successful_html += "<td width='12%' style='font-size: 14px; font-weight: bold;'>Console Log</td>";
                    successful_html += "</tr></thead><tbody>";
                    //Adding row-column in failure-table
                    var failure_html = "<div class='table-responsive'><table class='table table-hover'><thead><tr>";
                    failure_html += "<th width='46%'>Rules</th><th>Severity</th><th width='10%'>Status</th>";
                    failure_html += "<td width='12%' style='font-size: 14px; font-weight: bold;'>Console Log</td>";
                    failure_html += "<td width='10%' style='font-size: 14px; font-weight: bold;'>Remediate</td><td width='13%' style='font-size: 14px; font-weight: bold;'>Test Again</td>";
                    failure_html += "</tr></thead><tbody>";
                    //Adding row-column in manual-table
                    var manual_html = "<div class='table-responsive'><table class='table table-hover'><thead><tr>";
                    manual_html += "<th width='43%'>Rules</th><th>Severity</th><th width='10%'>Status</th><td width='12%' style='font-size: 14px; font-weight: bold;'>Console Log</td>";
                   // if (!isInProgress && selectedTimeStamp === '')
                        manual_html += "<td width='10%' style='font-size: 14px; font-weight: bold;'>Dismiss</td><td width='15%' style='font-size: 14px; font-weight: bold;'>Force Remediate</td>";
                    manual_html += "</tr></thead><tbody>";
                    var success_count = 0;
                    var manual_count = 0;
                    var failed_count = 0;
                    var stringConsole = "";
                    var consoleData = [];
                    for (var i in arrayOfObjects) {
                        var html = '';
                        var json = JSON.parse(arrayOfObjects[i]);
                        var console = json.console
                        if (console.indexOf("Unable to reach IP address") > -1) {

                        } else {
                            stringConsole = stringConsole + json.console + "\n";
                            consoleData.push(json);
                        }
                        var show_profile = json.profile;
                        var outcome = json.outcome;
                        var outcomestr = outcome.charAt(0).toUpperCase() + outcome.slice(1); //capatilize first latter.
                        rule = json.rule;
                        var get_severity = json.severity;
                        if (get_severity == "low") {
                            html += '<tr class="success">';
                        }
                        if (get_severity == "medium") {
                            html += '<tr class="warning">';
                        }
                        if (get_severity == "high") {
                            html += '<tr class="danger">';
                        }
                        var severity = get_severity.substr(0, 1).toUpperCase() + get_severity.substr(1).toLowerCase();
                        html += '<td><a id="' + rule + '" ip="' + profileRunIP + '"  timestamp="' + utc_time + '" href="javascript:void(0);" onclick="ruleDescriptionModal(this.id)">' + rule + " - " + map_title[rule] + '</td>';
                        html += "<td>" + severity + "</td>";
                        html += "<td>" + outcomestr + "</td>";
                        html += "<td><a id='" + rule + "' href='javascript:void(0);' class='rulelinks' href='javascript:void(0);' onclick='getConsoleLog(" + "\"" + rule + "\");'><i class='fa fa-fw fa-list-alt' title='Rule Description'></i></a></td>";

                        if (outcome === "successful" || outcome === "successfully remediated" || outcome === "manually marked as successful") {
                            success_count++;
                            successful_html += html
                        } else if (outcome === "failed") {
                            failed_count++;
                            if (!isInProgress && selectedTimeStamp === '') {
	                            $('.archieve_log').text('');
                                html += '<td><a href="javascript:void(0);" class="rulelinks" onClick="ruleRemediate(' + '\'' + profileRunIP + '\',' + '\'' + rule + '\',' + '\'' + utc_time + '\');"><i class="fa fa-ambulance" title="Remediate" style=""></i></a></td>';
                                html += '<td><a href="javascript:void(0);" class="rulelinks" onClick="ruleTestAgain(' + '\'' + profileRunIP + '\',' + '\'' + rule + '\',' + '\'True\');"><i class="fa fa-play" title="Try Again"></i></a></td>';
                            }
                           else{
	                            $('.archieve_log').text('[Archeive Log]');
                                html += '<td><a href="javascript:void(0);" class="rulelinks tooltip-wrapper disabled" data-title="Remediate functionality disabled for archivelog." ><i class="fa fa-ambulance" title="Remediate" style="pointer-events:none;"></i></a></td>';
                                html += '<td><a href="javascript:void(0);" class="rulelinks" onClick="ruleTestAgain(' + '\'' + profileRunIP + '\',' + '\'' + rule + '\',' + '\'False\');"><i class="fa fa-play" title="Try Again" style="pointer-events:none;"></i></a></td>';
							}
                            failure_html += html;
                        } else if (outcome.search("needs manual intervention") > -1) {
                            manual_count++;
                            if (!isInProgress && selectedTimeStamp === '') {
                                if (outcome.search("(N/A)") > -1) {
                                    html += '<td><a class="rulelinks">--</a></td>';
                                    html += '<td><a class="rulelinks">--</a></td>';
                                } else {
                                    html += '<td><a href="javascript:void(0);" class="rulelinks" onClick="ruleDismiss(' + '\'' + profileRunIP + '\',' + '\'' + rule + '\');"><i class="fa fa-check-circle-o" title="Dismiss and mark as successful" style="pointer-events:none;"></a></td>';
                                    html += '<td><a href="javascript:void(0);" class="rulelinks" onClick="ruleForceRemediate(' + '\'' + profileRunIP + '\',' + '\'' + rule + '\');"><i class="fa fa-ambulance" title="Force Remediate" style="pointer-events:none;"></a></td>';
                                }
                            }
                            else{
                            	
                            	html += '<td><a href="javascript:void(0);" class="rulelinks tooltip-wrapper disabled" data-title="Dismiss functionality disabled for archivelog." onClick="ruleDismiss(' + '\'' + profileRunIP + '\',' + '\'' + rule + '\');"><i class="fa fa-check-circle-o" title="Dismiss and mark as successful" style="pointer-events:none;"></a></td>';
                                html += '<td><a href="javascript:void(0);" class="rulelinks tooltip-wrapper disabled" data-title="Force Remediate functionality disabled for archivelog."onClick="ruleForceRemediate(' + '\'' + profileRunIP + '\',' + '\'' + rule + '\');"><i class="fa fa-ambulance" title="Force Remediate" style="pointer-events:none;"></a></td>';
                            }
                            manual_html += html;
                        }
                    }
                    if (success_count == 0) {
                        successful_html += '<td colspan="6" style="text-align:center;border:1px solid #ccc;border-left:2px solid #ccc;">No records found</td>';
                    }
                    if (failed_count == 0) {
                        failure_html += '<td colspan="6" style="text-align:center;border:1px solid #ccc;border-left:2px solid #ccc;">No records found</td>';
                    }
                    if (manual_count == 0) {
                        manual_html += '<td colspan="6" style="text-align:center;border:1px solid #ccc;border-left:2px solid #ccc;">No records found</td>';
                    }
                    html += "</tr></tbody></table></div>";
                    consoleLogData = consoleData;//consoleLogData is global
                    //Updating the profile name and count w.r.t success/failure/manual
                    var total_applied_rules = parseInt(success_count + failed_count + manual_count);
                    if (isInProgress && selectedTimeStamp == '') {
                        var percentage = Math.round((total_applied_rules / totalProfileRules) * 100);
                        if (percentage != 100) {
                            $('#runinprogressmsg').text("Compliance execution in progress " + percentage + "%");
                        }
                    }
                    else {
                        $('#runinprogressmsg').html(show_status);
                    }
                    $(".success_count_html").text(success_count);
                    $(".failure_count_html").text(failed_count);
                    $(".manual_count_html").text(manual_count);
                    $(".console_count_html").text(total_applied_rules);

                    var showProfileRules = ' (Total Rules: ' + totalProfileRules + ')';
                    $("#success_profile_val_Id").html(show_profile + showProfileRules);
                    $("#failure_profile_val_Id").html(show_profile + showProfileRules);
                    $("#manual_profile_val_Id").html(show_profile + showProfileRules);
                    $("#console_profile_val_Id").html(show_profile + showProfileRules);
                    //Updating the rule status w.r.t success/failure/manual 
                    $("#console_table").hide('');
                    $("#console_textarea").show();
                    // $('table.table tbody, table.table thead').empty();
                    $("#success_table_id").html(successful_html);
                    $("#failure_table_id").html(failure_html);
                    $("#manual_table_id").html(manual_html);
                    $("#console-text-area").html(stringConsole);
                    consoleTextarea = $("#console-text-area").html();
                    $('#ajaxloader').hide();

                    $.tablesorter.addParser({
                        // set a unique id 
                        id: 'grades',
                        is: function (s) {
                            // return false so this parser is not auto detected 
                            return false;
                        },
                        format: function (s) {
                            // format your data for normalization 
                            return s.toLowerCase().replace(/high/, 2).replace(/medium/, 1).replace(/low/, 0);
                        }
                        // set type, either numeric or text 
                        //type: 'numeric'
                    });

                    $("table.table").tablesorter({
                        headers: {
                            1: {
                                sorter: 'grades' // sorter header for column index 1.
                            }
                        },
                        //sortList : lastSortList,
                    });

                    /*
                     RemoveDublicateHtml(); // Remove duplicate html elements.
                     $('table.table')
                     .trigger('update') //update table
                     .trigger('grades', [lastSortList]); //sorter with sequence
                     */

                    $('.tooltip-wrapper').tooltip({position:"bottom"});
                }).fail(function (jqXHR, textStatus, errorThrown) {
                    errorHandler(jqXHR);
                }); //rule title
            } else {
                $("#console_textarea").hide();
                $("#console_table").show('');
                $('.success_count_html').text(0);
                $('.failure_count_html').text(0);
                $('.manual_count_html').text(0);
                $('.console_count_html').text(0);
                $("#success_table_id").html('<tr><td class="redText">Unable to reach selected target machine !</tr></td>');
                $("#failure_table_id").html('<tr><td class="redText">Unable to reach selected target machine !</tr></td>');
                $("#manual_table_id").html('<tr><td class="redText">Unable to reach selected target machine !</tr></td>');
                $("#console_table").html('<tr><td class="redText">Unable to reach selected target machine !</tr></td>');
                $('#runinprogressmsg').html('<font color="red">Unable to reach selected target machine !</font>');
            }
            $('#ajaxloader').hide();
        }
    }).fail(function (jqXHR, textStatus, errorThrown) {
        if (textStatus == 'timeout') {
            swal({
                text: 'Request timed out',
                type: 'error'
            });
        } else {
            errorHandler(jqXHR);
        }
    });//show run ending..
};//event close bracket.
//----------------------End--------------------------------------
$('table.table').on('sortEnd', function (e) {
    lastSortList = e.target.config.sortList;
});
//--------------ruleRemediate function used for fix the rule------------------
var ruleRemediate = function (ip, rule, timestamp) {
    $.ajax({
        url: API_CALL_PREFIX + "fixRule/" + rule + "?ip=" + ip,
        beforeSend: function () {
            $('#ajaxloader').show();
        }
    }).done(function (responseData) {
        $('#ajaxloader').hide();
        $('#' + rule).closest('tr').remove();
        $('table.table').trigger('update');
        showRuleStatus(ip, timestamp);
        swal({
            text: responseData,
            type: 'success'
        });
    }).fail(function (jqXHR, textStatus, errorThrown) {
        errorHandler(jqXHR);
    });
};
//---------------End-----------------------------

//--------------ruleTestAgain function used for check the rule---------------------
var ruleTestAgain = function (ip, rule, keep_logs) {
  alert(keep_logs);
    $.ajax({
        type: 'POST',
        data:{'ip':ip,'keep_logs':keep_logs},
        //url: API_CALL_PREFIX + "checkRule/" + rule + "/?ip=" + ip,
        url: API_CALL_PREFIX + "checkRule/" + rule + "/",
        beforeSend: function () {
            $('#ajaxloader').show();
        }
    }).done(function (response) {
        showRuleStatus(ip, '');
        $('#ajaxloader').hide();
        swal({
            text: response,
            type: 'error'
        });
    }).fail(function (jqXHR, textStatus, errorThrown) {
        errorHandler(jqXHR);
    });
};
//------------------End ------------------------------
//-----------------ruleDismiss used for dismiss the rule-------------------------
var ruleDismiss = function (ip, rule) {
    $.ajax({
        url: API_CALL_PREFIX + "dismiss/" + rule + "?ip=" + ip,
        beforeSend: function () {
            $('#ajaxloader').show();
        }
    }).done(function (responseData) {
        $('#' + rule).closest('tr').remove(); // removed selected dismissed row.
        $('table.table').trigger('update'); // update table value.
        showRuleStatus(ip, '');
        $('#ajaxloader').hide();
        swal({
            text: responseData,
            type: 'success'
        });
    }).fail(function (jqXHR, textStatus, errorThrown) {
        errorHandler(jqXHR);
    });
};
//----------------End-----------------------------------

//--------------------ruleForceRemediate used for ForceRemediate rule----------------------
var ruleForceRemediate = function (ip, rule) {
    $.ajax({
        url: API_CALL_PREFIX + "forceRemediateRule/" + rule + "?ip=" + ip,
        beforeSend: function () {
            $('#ajaxloader').show();
        }
    }).done(function (responseData) {
        responseData = JSON.parse(responseData);
        $('#' + rule).closest('tr').remove(); // removed selected ruleForceRemediate row.
        $('table.table').trigger('update'); // update table value.
        showRuleStatus(ip, '');
        $('#ajaxloader').hide();
        type = "error";
        switch (responseData.code) {
            case 1:
                type = "success";
                break;
            case 2:
            case 98:
                type = "warning";
                break;
            case "None":
                type = "error";
                break;
        }
        swal({
            html: responseData.message,
            type: type
        });
    }).fail(function (jqXHR, textStatus, errorThrown) {
        errorHandler(jqXHR);
    });
};
//----------------------End---------------------------------------

//--------------------When clicked on refresh icon ,then updateRulePanel will call---------------------
var updateRulePanel = function (selected_archive) {
    var date_obj = new Date(selected_archive);
    var utc_time = date_obj.toUTCString();
    var uri = "/raxakapi/v1/showrun/" + profileRunIP + "?timestamp=" + utc_time;
    $.ajax({
        dataType: 'json',
        url: uri
    }).done(function (responseData1) {
        arrayOfObjects = responseData1;
        show_profile = '';
        $.each(responseData1, function (key1, value1) {
            var json = JSON.parse(value1);
            show_profile = json.profile;
        });

        var uri = "/raxakapi/v1/ruleTitle" + show_profile;
        map_title = {};
        $.get(API_CALL_PREFIX + "ruleTitle/" + show_profile, function (rule_data) {
            for (var element in rule_data) {
                var rule = rule_data[element].rule;
                var title = rule_data[element].title;
                map_title[rule] = title;
            }

            //Adding row-column in success-table
            var html = "<div class='table-responsive'><table class='table table-hover'><thead>" +
                    "<tr><th width='70%'>Rules</th><th width='19%'>Status</th>" +
                    "<th width='11%'>Describe</th></tr></thead><tbody>";
            for (var i in arrayOfObjects) {
                var json = JSON.parse(arrayOfObjects[i]);
                outcome = json.outcome;
                rule = json.rule;
                html += "<tr>";
                html += "<td>" + rule + ' - ' + map_title[rule] + "</td>";
                html += "<td>" + outcome + "</td>";
                html += "<td id='" + rule + "' ip='" + profileRunIP + "' timestamp='" + utc_time + "'  align='center' onclick='ruleDescriptionModal(this.id)'><i class='fa fa-fw fa-list-alt'></i></td>";
                html += "</tr>";
                html += "</tbody></table></div>";
                $("#success_table_id").html(html);
            }//loop ending.
        }).fail(function (jqXHR, textStatus, errorThrown) {
            errorHandler(jqXHR);
        }); //rule title
    }).fail(function (jqXHR, textStatus, errorThrown) {
        errorHandler(jqXHR);
    });//show run ending..
};
//---------------End----------------------------

//--------------ruleDescriptionModal code used for show the description the rules--------------------
function ruleDescriptionModal(rule_id) {
    var html = '';
    var rulenum = rule_id.substring(2);
    var user_ip = $('#' + rule_id).attr("ip");
    var uri = "/raxakapi/v1/showRuleDescription/" + rulenum + '/' + user_ip;
    $.ajax({
        type: "GET",
        url: uri
    }).done(function (response) {
        var ruleData = JSON.parse(response);
        var res = ruleData['Check Rule'].split("\n");
        var severityText = ruleData['Severity'].charAt(0).toUpperCase() + ruleData['Severity'].slice(1);
        html += "<div class='rule_desc_severity_popup'><b>Severity:</b><span class='" + severityText + "'> " + severityText + "</span></div>";
        html += '<h4><b> Check Description: </b></h4>';

        for (i = 0; i < res.length; i++) {
            if (res[i].slice(0, 1) == "$" || res[i].slice(0, 1) == "#") {
                html += '<p class="showrules">' + res[i] + '<\p>';
            } else {
                html += "<p>" + res[i] + "<\p>";
            }
        }

        var htres = ruleData['Fix Rule'].split("\n");
        html += '</br><h4><b>Fix Description: </b></h4>';
        for (i = 0; i < htres.length; i++) {
            if (htres[i].slice(0, 1) == "#" || htres[i].slice(0, 1) == "$") {
                html += '<p class="showrules">' + htres[i] + '<\p>';
            } else {
                html += "<p>" + htres[i] + "<\p>";
            }
        }

        setHeaderColor(severityText, "#ruleDescription");
        $('#ruleDescription .close').css("color", "#000");
        $('#ruleDescription .modal-title').html("Rule " + rule_id);
        $('#ruleDescription .modal-body').html(html);
        $('#ruleDescription').modal('show');
    }).fail(function (jqXHR, textStatus, errorThrown) {
        errorHandler(jqXHR);
    });
}
//----------------------End---------------------------
var setHeaderColor = function (Severity, modalParent) {
    var header = modalParent + " .modal-header";
    var title = modalParent + " .modal-title";

    switch (Severity) {
        case "Low":
            $(header).css("background", "#d6e9c6");
            break;
        case "Medium":
            $(header).css("background", "#faebcc");
            break;
        case "High":
            $(header).css("background", "#ebccd1");
            break;
        default :
            $(header).css("background", "#5a555a");
            $(title).addClass('important-white');
    }
    $(title).css("color", "black");
};
//On-Change event of user@ip in success.
$("#myselect1").on("change", function (event) {
    var option = $(this).find('option:selected').val();
    onChangeIpSelValue(option);//current
    $("#tooltip_success").html(option);
    $("#tooltip_failure").html(option);
    $("#tooltip_manual").html(option);
    $("#tooltip_console").html(option);
});

//On-Change event of user@ip in success.
$("#myselect2").on("change", function (event) {
    var option = $(this).find('option:selected').val();
    onChangeIpSelValue(option);
    $("#tooltip_success").html(option);
    $("#tooltip_failure").html(option);
    $("#tooltip_manual").html(option);
    $("#tooltip_console").html(option);
});

//On-Change event of user@ip in success.
$("#myselect3").on("change", function (event) {
    var option = $(this).find('option:selected').val();
    onChangeIpSelValue(option);
    $("#tooltip_success").html(option);
    $("#tooltip_failure").html(option);
    $("#tooltip_manual").html(option);
    $("#tooltip_console").html(option);
});

//On-Change event of user@ip in success.
$("#myselect4").on("change", function (event) {
    var option = $(this).find('option:selected').val();
    onChangeIpSelValue(option);
    $("#tooltip_success").html(option);
    $("#tooltip_failure").html(option);
    $("#tooltip_manual").html(option);
    $("#tooltip_console").html(option);
});

$("#myselect1varlog").on("change", function (event) {
    var option = $(this).find('option:selected').val();
    var selectedindex = $(this).prop("selectedIndex");
    onClickOfArchiveLog(option, selectedindex);
});

//On-Change event of user@ip in success.
$("#myselect2varlog").on("change", function (event) {
    var option = $(this).find('option:selected').val();
    var selectedindex = $(this).prop("selectedIndex");
    onClickOfArchiveLog(option, selectedindex);
});

//On-Change event of user@ip in success.
$("#myselect3varlog").on("change", function (event) {
    var option = $(this).find('option:selected').val();
    var selectedindex = $(this).prop("selectedIndex");
    onClickOfArchiveLog(option, selectedindex);
});

//On-Change event of user@ip in success.
$("#myselect4varlog").on("change", function (event) {
    var option = $(this).find('option:selected').val();
    var selectedindex = $(this).prop("selectedIndex");
    onClickOfArchiveLog(option, selectedindex);
});

function get_refresh_rules() {
    var flag = 'refresh';
    $("#myselect1varlog")[0].selectedIndex = 0;
    var option = $("#myselect1varlog").find('option:selected').val();
    var selectedindex = $("#myselect1varlog").prop("selectedIndex");
    clearInterval(initinterval);
    initinterval = null;
    onClickOfArchiveLog(option, selectedindex, flag);
}

//This function intends to update the current user selected value of all 
//ip selector and modify the archives accordingly.
function onChangeIpSelValue(option) {
    //Updating profileRunIP and all archive selectors.
    //while user selects the other ip address.
    profileRunIP = option;
    document.getElementById('myselect1').value = option;
    document.getElementById('myselect2').value = option;
    document.getElementById('myselect3').value = option;
    document.getElementById('myselect4').value = option;
    clearInterval(initinterval);
    initinterval = null;
    showArchivesForIP(option, 2);
    showRuleStatus(option, '');
}

$('#success-search').keyup(function () {
    filterRules('success-search');
});

$('#failure-search').keyup(function () {
    filterRules('failure-search');
});

$('#manual-search').keyup(function () {
    filterRules('manual-search');
});

$('#console-search').keyup(function () {
    consoleFilterRules('#console-search');
});

function filterRules(id) {
    // affect and search only in related tab's table rows
    var tableClass = '.' + id;
    var tableBody = $(tableClass + ' tbody');
    var tableRowsClass = $(tableClass + ' tbody tr');
    var inputText = $('#' + id).val().toLowerCase();
    tableRowsClass.each(function (i, val) {
        //Lower text for case insensitive
        var rowText = $(val).text().toLowerCase();
        if (rowText.indexOf(inputText) == -1) {
            tableRowsClass.eq(i).hide();
        } else {
            $(tableClass + ' .search-sf').remove();
            tableRowsClass.eq(i).show();
        }
    });
    if (tableRowsClass.children(':visible').length == 0) {
        tableBody.append('<tr class="search-sf"><td class="text-muted" colspan="6" style="text-align:center;">No match found.</td></tr>');
    }
}

function consoleFilterRules() {
    var searchTerm = $.trim($("#console-search").val());
    if (searchTerm) {
        var strShowData = '';
        $.each(consoleLogData, function (key, value) {
            var rule_num = value.rule;
            if (rule_num.indexOf(searchTerm) > -1) {
                strShowData += value.console;
            }
        });
        $("#console-text-area").html(strShowData);
    } else {
        $("#console-text-area").html(consoleTextarea);
    }
}

function getConsoleLog(rulenum) {
    var html = '';
    var profileRunIP = $('#myselect1').val();
    var timeStamp = 'None';
    var selectedindex = $('#myselect1varlog').prop("selectedIndex");
    if (selectedTimeStamp !== 'None') {
        var date_obj = new Date(selectedTimeStamp);
        var utc_time = date_obj.toUTCString();
        var timeStamp = utc_time;
    }

    var content = {userNameIP: profileRunIP, securityRule: rulenum, timeStamp: timeStamp};
    $.ajax({
        type: "POST",
        url: API_CALL_PREFIX + "getConsoleLog",
        data: content,
        success: function (result) {
            try {
                var res = result.split("<br />");
                html += '<h4><b> Console Log: </b></h4>';
                for (i = 0; i < res.length; i++) {
                    if (res[i].slice(0, 1) == "$" || res[i].slice(0, 1) == "#") {
                        html += '<p class="showrules">' + res[i] + '<\p>';
                    } else {
                        html += "<p>" + res[i] + "<\p>";
                    }
                }
                //setHeaderColor(null, "#ruleDescription");
            } catch (e) {
                alert(e);
            }
        }, complete: function () {
            $('#descriptions .modal-title').text("Rule " + rulenum);
            $("#descriptions .modal-body").html(html);
            $('#descriptions').modal('show');
        }, error: function (jqXHR, textStatus, errorThrown) {
            errorHandler(jqXHR);
        }
    });
}

$(function () {
    showIPs();
});
