/* 
 * Js for All reports page (Success, Failure, Manual and Console)
 */

// Get the list of IP addresses enrolled by current user

//Start: Constants//
var API_CALL_PREFIX = "../raxakapi/v1/";
var profileRunIP = " ";
var consoleTextarea;
var consoleLogData; //for consoleTab search
var initinterval = '';
var get_username = [];
var selectedtimestamp = '';
var percentage = '';
var lastSortList = [];

function getUsers() {
    var html = '';
    var username = '';
    var loggedemail = '';
    $.ajax({
        dataType: 'json',
        url: API_CALL_PREFIX + "getUsers/"
    }).done(function (response) {
        if (response.length > 0) {
            var loggedemail = JSON.parse(sessionStorage.getItem("logged_user")).user;
            $.each(response, function (key, value) {
                if (loggedemail === value.email) {
                    html += '<option value="' + value.email + '" selected="selected">' + value.email + '</option>';
                } else {
                    html += '<option value="' + value.email + '">' + value.email + '</option>';
                }
            });

            $('#getuser').html(html);
            $('#getuser').select2();

            if (loggedemail) {
                var flag = 0; //-- represent page load.
                showIPs(loggedemail, flag);
            }
        } else {
            $("#alltabid").hide();
            $("#no_info").show();
            $('#image-holder-page').fadeOut('slow');
        }
    }).fail(function (jqxhrFail, textStatusFail, errorThrownFail) {
        errorHandler(jqxhrFail);
    });
}
// flag = 0, represent page load.
// flag = refresh, represent change any drop down.
var showIPs = function (username, flag) {
    var html = '';
    var get_username = [];
    $.ajax({
        url: API_CALL_PREFIX + "getUserIPs/" + username
    }).done(function (response) {
        if (response.length > 0) {
            $("#alltabid").show();
            $("#no_info").hide();
            $('#image-holder-page').fadeOut('slow');
            for (var i in response) {
                var json = JSON.parse(response[i]);
                var key = json.ip;
                var value = json.nickname
                get_username.push(key);
                html += '<option value = "' + key + '">' + value + '</option>';
            }
            $("#myselect1").html(html).select2();
            $("#myselect2").html(html).select2();
            $("#myselect3").html(html).select2();
            $("#myselect4").html(html).select2();
            var ip_address = $("#myselect1 option:selected").val();
            $("#tooltip_success").html(ip_address);
            $("#tooltip_failure").html(ip_address);
            $("#tooltip_manual").html(ip_address);
            $("#tooltip_console").html(ip_address);
            if (get_username.length) {
                profileRunIP = get_username[0];
                var test = $("#myselect1varlog").val();
                showRuleStatus(username, get_username[0], selectedtimestamp); //-- don't enterchange the calling position of both functions
                showArchivesForIP(username, profileRunIP, flag);
            }
            if (flag == 0) { //-- represent page load.
                initinterval = setInterval(function () {
                    callclearinterval(username, 1);
                }, 10000); // Start auto refresh on page load.
            }
        } else {
            $("#alltabid").hide();
            $("#no_info").show();
            $('.percentage').text('');
            $('.percentage').hide();
            $('#image-holder-page').fadeOut('slow');
        }
        //$('#image-holder-page').fadeOut('slow');
    }).fail(function (jqXHR, textStatus, errorThrown) {
        errorHandler(jqXHR);
    });
};

function callclearinterval(username, flag) {
    //-- don't enterchange the calling position of both functions
    showRuleStatus(username, profileRunIP, selectedtimestamp);
    showArchivesForIP(username, profileRunIP, flag);
}

var showArchivesForIP = function (username, profileRunIP, flag) {
    var html = '';
    var result = new Array();
    profileRunIP = profileRunIP.trim();
    var uri = "/raxakapi/v1/getUsersArchiveLogFileNameList/" + username + "/" + profileRunIP;
    $.ajax({
        dataType: 'json',
        url: uri
    }).done(function (response) {
        if (response) {
            listTIMESTAMP = response;
            $.get(API_CALL_PREFIX + "showExecutionStatus/" + profileRunIP, function (showdata) {
                if (showdata.length > 2) {    // checking for 2 because api returning empty brackets ('[]') as a string.
                    latest_server_utc = "";
                    if (!showdata.match('execution is in progress')) {
                        if (showdata.match('execution completed')) {
                            latest_server_utc = showdata.split("Rules execution completed on : ")[1].replace('"', '');
                        } else {
                            latest_server_utc = showdata.split("Rules execution aborted on : ")[1].replace('"', '');
                        }
                        if (listTIMESTAMP.indexOf(latest_server_utc) == -1) {
                            listTIMESTAMP.splice(0, 0, latest_server_utc);
                        }
                        var get_ip = String(latest_server_utc).replace(",", "");
                        var get_ip_value = String(get_ip).replace('"', '');
                        var get_ip_value_date = String(get_ip_value).replace('"', '');
                        var utc_format = new Date(get_ip_value_date + ' UTC');
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
                        $('#myselect4varlog').select2();
                        $('.percentage').hide();
                        $('.percentage').text('');
                        clearInterval(initinterval); // Stop auto refresh when complete.
                        initinterval = '';
                    } else {
                        get_actual_time = 'Latest Execution';
                        $('.percentage').text(percentage);
                        $('.percentage').show();
                        result.push(get_actual_time);

                        // Start auto refresh when change the target machine.
                        if (flag == 2) {
                            callclearinterval(username, 1); // call to immediate show the percentage and other data.
                            initinterval = setInterval(function () {
                                callclearinterval(username, 1);
                            }, 10000);
                        }
                    }
                    if (flag != 1) {
                        if (result != '') {
                            html += '<option value="' + result + '">' + result + '</option>';
                        }
                        $.each(listTIMESTAMP, function (key1, value1) {
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
                    $('#image-holder-page').fadeOut('slow');
                } else {
                    $('.percentage').hide();
                    $('.percentage').text('');
                    $("#myselect1varlog").html("").select2();
                    $("#myselect2varlog").html("").select2();
                    $("#myselect3varlog").html("").select2();
                    $("#myselect4varlog").html("").select2();
                    clearInterval(initinterval); // Stop auto refresh when complete.
                    initinterval = '';
                }
            });
        }
    }).fail(function (jqXHR, textStatus, errorThrown) {
        errorHandler(jqXHR);
    });
}; //function Ends...

//On-Change event of archive file.
//1.Fetching the archived data to access the profile.
//2.Using this profile fetching the title of rules in map.
//3.Displaying the rule,status from archived data and corresponding title. 

var onClickOfArchiveLog = function (timeStamp, selectedindex) {
    percentage = '';
    $('.percentage').hide();
    var profilerunIp = $('#myselect1').val();
    var username = $.trim($("#getuser option:selected").val());
    document.getElementById('myselect1varlog').value = timeStamp;
    document.getElementById('myselect2varlog').value = timeStamp;
    document.getElementById('myselect3varlog').value = timeStamp;
    document.getElementById('myselect4varlog').value = timeStamp;
    selectedTimeStamp = timeStamp;
    clearSeachText();
    if (selectedindex === 0) {
        timeStamp = '';
        selectedTimeStamp = "None"; //set timestamp blank when first option is selected.
        callclearinterval(username, 1); // call to immediate show the percentage and other data.
        initinterval = setInterval(function () {
            callclearinterval(username, 1);
        }, 10000); // Start auto refresh on page load.
    } else {
        clearInterval(initinterval);
        initinterval = '';
        showRuleStatus(username, profilerunIp, timeStamp, 'refresh');
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

var showRuleStatus = function (username, profileRunIP, selectedTimeStamp, flag) {
    profileRunIP = profileRunIP.trim();
    if (selectedTimeStamp == '') {
        var utc_time = '';
        var uri = "/raxakapi/v1/showUsersRun/" + username + "/" + profileRunIP;
    } else {
        var date_obj = new Date(selectedTimeStamp);
        var utc_time = date_obj.toUTCString();
        var uri = "/raxakapi/v1/showUsersRun/" + username + "/" + profileRunIP + "?timestamp=" + utc_time;
    }
    $.ajax({
        dataType: 'json',
        url: uri,
        beforeSend: function () {
            if (flag == 'refresh') {
                $('#ajaxloader').show();
            }
        }
    }).done(function (responseData1) {
        if (responseData1 != "") {
            arrayOfObjects = responseData1;
            arrayOfObjects.sort(sortRules);
            var responseObj = JSON.parse(responseData1[0]);
            var show_profile = responseObj.profile;
            var outcome = responseObj.outcome;
            var map_title = {};
            if (outcome !== "INACCESSIBLE" && outcome !== "INACCESSIBLE") {
                $.get(API_CALL_PREFIX + "ruleTitle/" + show_profile, function (rule_data) {
                    var rule_counts = rule_data.length;
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
                    if (selectedTimeStamp === '')
                        failure_html += "<td width='10%' style='font-size: 14px; font-weight: bold;'>Remediate</td><td width='13%' style='font-size: 14px; font-weight: bold;'>Test Again</td>";
                    failure_html += "</tr></thead><tbody>";

                    //Adding row-column in manual-table
                    var manual_html = "<div class='table-responsive'><table class='table table-hover'><thead><tr>";
                    manual_html += "<th width='43%'>Rules</th><th>Severity</th><th width='10%'>Status</th><td width='12%' style='font-size: 14px; font-weight: bold;'>Console Log</td>";
                    if (selectedTimeStamp === '')
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
                        html += '<td><a id="' + rule + '" ip="' + profileRunIP + '"  timestamp="' + utc_time + '" href="javascript:void(0);" data-target="#descriptions" data-toggle="modal" onclick="ruleDescriptionModal(this.id)">' + rule + " - " + map_title[rule] + '</td>';
                        html += "<td>" + severity + "</td>";
                        html += "<td>" + outcomestr + "</td>";
                        html += "<td><a id='" + rule + "'   href='javascript:void(0);' data-target='#descriptions' data-toggle='modal' id='add_sev' class='rulelinks' href='javascript:void(0);' onclick='getConsoleLog(" + "\"" + rule + "\");'><i class='fa fa-fw fa-list-alt' title='Rule Description'></i></a></td>";

                        if (outcome === "successful" || outcome === "successfully remediated" || outcome === "manually marked as successful") {
                            success_count++;
                            successful_html += html
                        } else if (outcome === "failed") {
                            failed_count++;
                            if (selectedTimeStamp === '') {
                                html += '<td><a href="javascript:void(0);" class="rulelinks" onClick="ruleRemediate(' + '\'' + profileRunIP + '\',' + '\'' + rule + '\',' + '\'' + utc_time + '\');"><i class="fa fa-refresh" title="Remediate"></i></a></td>';
                                html += '<td><a href="javascript:void(0);" class="rulelinks" onClick="ruleTestAgain(' + '\'' + profileRunIP + '\',' + '\'' + rule + '\');"><i class="fa fa-play" title="Try Again"></i></a></td>';
                            }
                            failure_html += html;
                        } else if (outcome === "needs manual intervention" || outcome === "needs manual intervention (N/A)") {
                            manual_count++;
                            if (selectedTimeStamp === '') {
                                if (outcome.search("(N/A)") > -1) {
                                    html += '<td><a class="rulelinks">--</a></td>';
                                    html += '<td><a class="rulelinks">--</a></td>';
                                } else {
                                    html += '<td><a href="javascript:void(0);" class="rulelinks" onClick="ruleDismiss(' + '\'' + profileRunIP + '\',' + '\'' + rule + '\');"><i class="fa fa-check-circle-o" title="Dismiss and mark as successful"></a></td>';
                                    html += '<td><a href="javascript:void(0);" class="rulelinks" onClick="ruleForceRemediate(' + '\'' + profileRunIP + '\',' + '\'' + rule + '\');"><i class="fa fa-refresh" title="Force Remediate"></a></td>';
                                }
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
                    consoleLogData = consoleData; //consoleLogData is global
                    //Updating the profile name and count w.r.t success/failure/manual
                    var total_applied_rules = parseInt(success_count + failed_count + manual_count);
                    var perct = Math.round((total_applied_rules / rule_counts) * 100);
                    percentage = "In Progress " + perct + "%";

                    $(".success_count_html").text(success_count);
                    $(".failure_count_html").text(failed_count);
                    $(".manual_count_html").text(manual_count);
                    $(".console_count_html").text(total_applied_rules);

                    $(".profile_tabel").show();
                    document.getElementById("success_profile_val_Id").innerHTML = show_profile;
                    document.getElementById("failure_profile_val_Id").innerHTML = show_profile;
                    document.getElementById("manual_profile_val_Id").innerHTML = show_profile;
                    document.getElementById("console_profile_val_Id").innerHTML = show_profile;

                    //Updating the rule status w.r.t success/failure/manual 
                    $("#console_table").hide('');
                    $("#console_textarea").show();
                    $("#success_table_id").html(successful_html);
                    $("#failure_table_id").html(failure_html);
                    $("#manual_table_id").html(manual_html);
                    $("#console-text-area").html(stringConsole);
                    consoleTextarea = $("#console-text-area").html();
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
                        sortList: lastSortList,
                    });

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
            }
        } else {
            clearInterval(initinterval);
            initinterval = '';
            $("#console_textarea").hide();
            $(".profile_tabel").hide();
            $("#console_table").show('');
            $('.success_count_html').text(0);
            $('.failure_count_html').text(0);
            $('.manual_count_html').text(0);
            $('.console_count_html').text(0);
            $("#success_table_id").html('<tr><td colspan="6" style="text-align:center;border:1px solid #ccc;border-left:2px solid #ccc;">No records found</td>');
            $("#failure_table_id").html('<tr><td colspan="6" style="text-align:center;border:1px solid #ccc;border-left:2px solid #ccc;">No records found</td>');
            $("#manual_table_id").html('<tr><td colspan="6" style="text-align:center;border:1px solid #ccc;border-left:2px solid #ccc;">No records found</td>');
            $("#console_table").html('<tr><td colspan="6" style="text-align:center;border:1px solid #ccc;border-left:2px solid #ccc;">No records found</td>');
        }
        $("#ajaxloader").fadeOut('slow');
    }).fail(function (jqXHR, textStatus, errorThrown) {
        errorHandler(jqXHR);
    }); //show run ending..
}; //event close bracket.

$('table.table').on('sortEnd', function (e) {
    lastSortList = e.target.config.sortList;
});

var ruleRemediate = function (ip, rule, timestamp) {
    $.ajax({
        url: API_CALL_PREFIX + "fixRule/" + rule + "?ip=" + ip,
        beforeSend: function () {
            $('#ajaxloader').show();
        }
    }).done(function (responseData) {
        $('#ajaxloader').fadeOut('slow');
        var username = $.trim($("#getuser option:selected").val());
        showRuleStatus(username, ip, timestamp);
        $('#myModalLabel').text("Rule Remediate");
        swal({
            text: responseData,
            type: 'success'
        })
    }).fail(function (jqXHR, textStatus, errorThrown) {
        errorHandler(jqXHR);
    });
};

var ruleTestAgain = function (ip, rule) {
    $.ajax({
        type: 'POST',
        url: API_CALL_PREFIX + "checkRule/" + rule + "/?ip=" + ip,
        beforeSend: function () {
            $('#ajaxloader').show();
        }
    }).done(function (responseData) {
        var username = $.trim($("#getuser option:selected").val());
        showRuleStatus(username, ip, '');
        $('#ajaxloader').fadeOut('slow');
        $('#myModalLabel').text("Rule Test Again");
        swal({
            text: responseData,
            type: 'success'
        })
    }).fail(function (jqXHR, textStatus, errorThrown) {
        errorHandler(jqXHR);
    });
}

var ruleDismiss = function (ip, rule) {
    $.ajax({
        url: API_CALL_PREFIX + "dismiss/" + rule + "?ip=" + ip,
        beforeSend: function () {
            $('#ajaxloader').show();
        }
    }).done(function (responseData) {
        var username = $.trim($("#getuser option:selected").val());
        showRuleStatus(username, ip, '');
        $('#ajaxloader').fadeOut('slow');
        $('#myModalLabel').text("Rule Dismiss");
        swal({
            text: responseData,
            type: 'success'
        })
    }).fail(function (jqXHR, textStatus, errorThrown) {
        errorHandler(jqXHR);
    });
}

var ruleForceRemediate = function (ip, rule) {
    $.ajax({
        url: API_CALL_PREFIX + "forceRemediateRule/" + rule + "?ip=" + ip,
        beforeSend: function () {
            $('#ajaxloader').show();
        }
    }).done(function (responseData) {
        var username = $.trim($("#getuser option:selected").val());
        showRuleStatus(username, ip, '');
        $('#ajaxloader').fadeOut('slow');
        $('#myModalLabel').text("Rule Force Remediate");
        type = "error"
        switch (responseData.code)
        {
            case 1:
                type = "success"
                break;
            case 2:
            case 98:
                type = "warning"
                break;
            case "None":
                type = "error"
                break;
        }
        swal({
            html: responseData.message,
            type: type
        })
    }).fail(function (jqXHR, textStatus, errorThrown) {
        errorHandler(jqXHR);
    });
};

var updateRulePanel = function (selected_archive) {
    var date_obj = new Date(selected_archive);
    var utc_time = date_obj.toUTCString();
    var uri = "/raxakapi/v1/showUsersRun/" + profileRunIP + "?timestamp=" + utc_time;
    $.ajax({
        dataType: 'json',
        url: uri
    }).done(function (responseData1) {
        arrayOfObjects = responseData1
        show_profile = ''
        $.each(responseData1, function (key1, value1) {
            var json = JSON.parse(value1)
            show_profile = json.profile
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
                var json = JSON.parse(arrayOfObjects[i])
                outcome = json.outcome;
                rule = json.rule;
                html += "<tr>";
                html += "<td>" + rule + ' - ' + map_title[rule] + "</td>";
                html += "<td>" + outcome + "</td>";
                html += "<td id='" + rule + "' ip='" + profileRunIP + "' timestamp='" + utc_time + "'  align='center' onclick='ruleDescriptionModal(this.id)'><i class='fa fa-fw fa-list-alt'></i></td>"
                html += "</tr>";
                html += "</tbody></table></div>";
                $("#success_table_id").html(html);
            } //loop ending.
        }).fail(function (jqXHR, textStatus, errorThrown) {
            errorHandler(jqXHR);
        }); //rule title
    }).fail(function (jqXHR, textStatus, errorThrown) {
        errorHandler(jqXHR);
    }); //show run ending..
};

function ruleDescriptionModal(rule_id) {
    var html = '';
    var rulenum = rule_id.substring(2);
    var user_ip = $('#' + rule_id).attr("ip");
    var uri = "/raxakapi/v1/showRuleDescription/" + rulenum + '/' + user_ip;
    $.ajax({
        type: "GET",
        url: uri,
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
        $('#ruleDescription .modal-title').html("Rule " + rule_id);
        $('#ruleDescription .modal-body').html(html);
        $('#ruleDescription').modal('show');
    }).fail(function (jqXHR, textStatus, errorThrown) {
        errorHandler(jqXHR);
    });
}

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
    }
    $(title).css("color", "black");
};

//On-Change event of user@ip in success.
$("#myselect1").on("change", function (event) {
    var option = $(this).find('option:selected').val();
    onChangeIpSelValue(option);
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
    onChangeIpSelValue(option)
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
    $("#myselect1varlog")[0].selectedIndex = 0;
    var option = $("#myselect1varlog").find('option:selected').val();
    var selectedindex = $("#myselect1varlog").prop("selectedIndex");
    var flag = 'refresh';
    onClickOfArchiveLog(option, selectedindex, flag);
}

//This function intends to update the current user selected value of all 
//ip selector and modify the archives accordingly.
function onChangeIpSelValue(option) {
    //Updating profileRunIP and all archive selectors.
    //while user selects the other ip address.
    $('.percentage').text('');
    $('.percentage').hide();
    profileRunIP = option;
    var username = $.trim($("#getuser option:selected").val());
    document.getElementById('myselect1').value = option;
    document.getElementById('myselect2').value = option;
    document.getElementById('myselect3').value = option;
    document.getElementById('myselect4').value = option;
    clearSeachText();
    clearInterval(initinterval);
    initinterval = '';
    showArchivesForIP(username, option, 2);
    showRuleStatus(username, option, '', 'refresh');
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
    var timeStamp = 'None';
    var profileRunIP = $('#myselect1').val();
    var selectedindex = $('#myselect1varlog').prop("selectedIndex");
    if (selectedTimeStamp !== 'None') {
        var date_obj = new Date(selectedTimeStamp);
        var utc_time = date_obj.toUTCString();
        var timeStamp = utc_time;
    }

    var content = {
        userNameIP: profileRunIP,
        securityRule: rulenum,
        timeStamp: timeStamp
    };
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
            } catch (e) {
                alert(e);
            }
        },
        complete: function () {
            $('#my_header').text("Rule " + rulenum);
            $("#modal_body").html(html);
            $('#ruleDescription').modal('show');
        },
        error: function (jqXHR, textStatus, errorThrown) {
            errorHandler(jqXHR);
        }
    });
}

var clearSeachText = function () {
    $('#success-search').val('');
    $('#failure-search').val('');
    $('#manual-search').val('');
    $('#console-search').val('');
};

$(function () {
    getUsers();
    $(".row").on('change', "#getuser", function () {
        clearSeachText();
        var userid = $(this).val().trim();
        if (userid)
            showIPs(userid, '2');
    })
});