var MEDIA_DIR = './';//static/
var IMG_DIR = MEDIA_DIR + 'images/';
var CSS_DIR = MEDIA_DIR + 'css/';
var JS_DIR = MEDIA_DIR + 'js/';

var detailed_page_report_print_url = '';
var get_comaprision_differnce_report_url = '';
var get_comaprision_differnce_report_content = '';
var get_comaprision_differnce_report_content1 = '';
var API_CALL_PREFIX = "../raxakapi/v1/";
var DEFAULT_TIMEOUT = 10 * 1000;//10 seconds
var TIMEOUT_MESSAGE = 'Retry the web page by clicking the refresh/reload button, <br> if the problem persists then please contact the raxak administrator for further assistance.';
var compliance_in_progress = false;
var show_profile = " ";
var show_report_result = true;
var show_execmode = "0";
var severityCountReport = [];
var flagTriggerSort = false;
var gFlagError = false;
var gErrorStatus = {error: []};
var gApplyProfile = true;
var executed_on = "";
var get_actual_time = '';
var Rexecution = '';
var status_arr = [];
var set_interval = '';
var menu_tab_select_flag = {
    'select_profile': false,
    'apply_profile': false,
    'success': false,
    'failure': false,
    'manual': false,
    'console_log': false,
    'report_log': false,
    'schedule': false,
    'target_machines': false
};

var get_username = [];
//--------LastrunIps code start here and displayed the ip on select-box --------- 
var getIp = function () {
    var html = '';
    $.ajax({
        url: API_CALL_PREFIX + "getlastrunIPs"
    }).done(function (response) {
        arrayOfObjects = response;
        if (arrayOfObjects.length > 0) {
            for (var i in arrayOfObjects) {
                var json = JSON.parse(arrayOfObjects[i]);
                key = json.ip;
                value = json.nickname;
                if (value == '') {
                    var nickname = key;
                } else {
                    var nickname = value;
                }
                get_username.push(key);
                html += '<option value = "' + key + '">' + nickname + '</option>';
            }
            $("#myselect5").html(html).select2();
            $("#myselect6").html(html).select2();
            var ip_value = $("#myselect6 option:selected").val();
            $("#tooltip_detail").html(ip_value);
            $("#tooltip_difference").html(ip_value);
            if (get_username.length > 0) {
                showDate(get_username[0], '');
                onUserselectUpdateDiv(get_username[0]);
            }
        } else {
            clearInterval(set_interval);
            set_interval = '';
            $("#reportlogcontents").hide();
            $("#no_info").show();
            $('#image-holder-page').hide();
        }
        var get_exec_time = $("#myselect5varlog option:first").val();
        $("#last_exec").html(get_exec_time);
    }).fail(function (jqXHR, textStatus, errorThrown) {
        errorHandler(jqXHR);
    });
};
//----------------------------End----------------------
//-------This function shows the status and time of the latest machine i.e running.---------.  
function getCurrentDate(ip_name) {
    var hrml = "";
    var status = '';
    var result = new Array();
    var uri = API_CALL_PREFIX + "showExecutionStatus/" + ip_name;
    $.ajax({
        dataType: 'json',
        async: false,
        timeout: 0.111111,
        url: uri
    }).done(function (response) {
        if (response != null) {
            if (!response.match('execution is in progress')) {
                if (response.match('execution completed')) {
                    var get_ip_data_split = String(response).split(" : ");
                    status = '<font color="green"><b>Completed</b></font>';
                } else if( response.match('execution aborted by rp')){
                    var get_ip_data_split = String(response).split(" : ");
                    status = '<font color="darkred"><b>ABORTED (connection lost)</b></font>';
                } else {
                    var get_ip_data_split = String(response).split(" : ");
                    status = '<font color="darkred"><b>ABORTED</b></font>';
                }
                
                var utc_format = new Date(get_ip_data_split[1] + ' UTC');
                var get_utc_date = String(utc_format).replace('GMT+0530 (IST)', "");
                get_actual_time = String(get_utc_date).replace('GMT+0530 (India Standard Time)', "");
                $('#myselect5varlog option').eq(0).val(get_actual_time);
                $('#myselect5varlog option').eq(0).text(get_actual_time);
                $('#myselect7varlog option').eq(0).val(get_actual_time);
                $('#myselect7varlog option').eq(0).text(get_actual_time);
                $('#myselect8varlog option').eq(0).val(get_actual_time);
                $('#myselect8varlog option').eq(0).text(get_actual_time);
                $('#last_exec').text(get_actual_time);
                var selectedTime_diff_latest_time = $("#myselect7varlog").val() //$('#myselect7varlog option').eq(0).val();
                $("#latest_executed_time").text(selectedTime_diff_latest_time)
                $('#diff_status').hide();
                clearInterval(set_interval);
                set_interval = '';
            } else {
                get_actual_time = 'Latest Execution';
                status = '<font color="orange"><b>In Progress</b></font>';
                var get_execution_time = $("#myselect5varlog option:first").val();
                $("#last_exec").html(get_execution_time);
            }
            $("#th2").html(status);
            result['status'] = status;
        } else {
            $('#report_table').hide();
            $('#report_log_id').hide();
            html = '<div style="font-size:larger;text-align:center;margin-top:45px;"><p style="margin-top:8px;">Date Log is not available for this ip.</p>.</div>'
            $('#report_table1').html(html)
        }
    }).fail(function (jqXHR, textStatus, errorThrown) {
        get_actual_time = '';
        if (textStatus == 'timeout') {
            swal({
                text: 'Request timed out',
                type: 'error'
            });
        } else {
            errorHandler(jqXHR);
        }
    });
    result['date'] = get_actual_time;
    return result;
}

function call_showrun() {
    $("#myselect5varlog")[0].selectedIndex = 0;
    var ip_add = $("#myselect5 option:selected").val();
    getCurrentDate(ip_add);
    getShowrun('', '', '', 'refresh');
}
//------------------Displayed the Archivelog time----------------- 
function showDate(username, check_option) {
    var html = '';
    var last_exec = '';
    var last_execute_time = [];
    var uri = API_CALL_PREFIX + "getArchiveLogFileNameList/" + username;
    $.ajax({
        dataType: 'json',
        async: false,
        timeout: DEFAULT_TIMEOUT,
        url: uri
    }).done(function (response) {
        if (username != '') {
            var result = getCurrentDate(username);
            if (result['date'] != '') {
                last_exec = result['date'];
                $("#last_exec").html(last_exec);
                html += '<option value="' + result['date'] + '">' + result['date'] + '</option>';
            }
            $.each(response, function (key, value) {
                var utc_format = new Date(value + ' UTC');
                var get_utc_date = String(utc_format).replace('GMT+0530 (IST)', "");
                var get_actual_time = String(get_utc_date).replace('GMT+0530 (India Standard Time)', "");
                last_execute_time.push(get_actual_time);
                //if (result['date'] == '' && key == 0) {
                if (key == 0) {
                    last_exec = get_actual_time;
                    html += '<option value="' + get_actual_time + '">' + get_actual_time + '</option>';
                } else {
                    html += '<option value="' + get_actual_time + '">' + get_actual_time + '</option>';
                }
            });
            $("#myselect5varlog").html(html).select2();
            $("#myselect6varlog").html(html).select2();
            $("#myselect7varlog").html(html).select2();
            $("#myselect8varlog").html(html).select2();
            getShowrun();
            var count_option_length1 = $('#myselect7varlog > option').length;
            if (check_option != 1 && count_option_length1 > 1) {
                getLatestDiffReport(1);
            }
        } else {
            $('#report_table').hide();
            $('#report_log_id').hide();
            html = '<div style="font-size:larger;text-align:center;margin-top:45px;"><p style="margin-top:8px;">Date Log is not available for this ip.</p>.</div>'
            $('#report_table1').html(html)
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
    });
}
//--------------End------------------------
//----------Showrun function displayed the information of the rules---------------.

function getShowrun(ip_name, timestmp, flag, refresh) {
    var uri = '';
    var html = '';
    var status = '';
    var high_success_sev = [];
    var medium_success_sev = [];
    var low_success_sev = [];
    var high_fail_sev = [];
    var medium_fail_sev = [];
    var low_fail_sev = [];
    var high_manual_sev = [];
    var medium_manual_sev = [];
    var low_manual_sev = [];
    var get_user_name = ip_name;
    if (flag === 'ipname' && ip_name != '' && timestmp == '') {
        var get_time_stmp = $("#myselect5varlog option:selected").text();
    } else if (flag === 'timestamp' && ip_name != '' && timestmp != '') {
        var get_time_stmp = timestmp;
        var change_date = new Date(get_time_stmp);
        var convert_date_format = $.trim(change_date.toUTCString());
        var selectedindex = $('#myselect5varlog').prop("selectedIndex");
        if (selectedindex != 0) {
            uri = API_CALL_PREFIX + "showrun/" + get_user_name + "?timestamp=" + convert_date_format;
        } else {
            uri = API_CALL_PREFIX + "showrun/" + get_user_name;
        }
    } else {
        get_user_name = $("#myselect5 option:selected").val();
        uri = API_CALL_PREFIX + "showrun/" + get_user_name;
    }
    $.ajax({
        dataType: 'json',
        timeout: DEFAULT_TIMEOUT,
        url: uri,
        beforeSend: function () {
            $('#ajaxloader').show();
        }
    }).done(function (response) {
        show_date_value = response;
        $.each(show_date_value, function (key, value) {
            var get_profile_data = JSON.parse(value);
            var profile_name = get_profile_data.profile;
            var get_profile_name = get_profile_data.profile;
            var severity_check = get_profile_data.outcome;
            var severity_check1 = get_profile_data.severity;
            var profile_mode = get_profile_data.exemode;
            var code_version = get_profile_data.codeversion;
            var log_status = get_profile_data.status;
            //-- Get the profile counts from session.
            var profilenamemod = profile_name.replace(/[^a-z0-9]+/gi, '_').toLowerCase();
            var profilecounts = sessionStorage.getItem(profilenamemod + '_counts');
            if (profilecounts) {
                profile_name = profile_name + ' <b>(Total Rules: ' + profilecounts + ')</b>';
            }
            if (severity_check == 'INACCESSIBLE') {
                $('#report_table1').hide();
                html = '<div style="font-size:larger;text-align:center;margin-top:20px;"><p style="margin-top:8px;color:darkred;">Unable to reach target machine !</p></div>';
                $('#inaccessible').html(html);
                $('#pass_opt_value').attr('disabled', true);
                $('#inaccessible').show();
            }
            else {
                $('#report_table1').show();
                $('#pass_opt_value').attr('disabled', false);
                $('#inaccessible').hide();
            }

            if (log_status == 'COMPLETE') {
                status = '<font color="green"><b>Completed</b></font>';
            } else if (log_status == 'ABORTED') {
                status = '<font color="darkred"><b>ABORTED</b></font>';
            } else if (log_status == 'ABORTED BY RAXAK PROTECT') {
                status = '<font color="darkred"><b>ABORTED (connection lost)</b></font>';
            } else {
                status = '<font color="orange"><b>In Progress</b></font>';
            }
            if (profile_mode == 0) {
                display_profile_mode = 'Manual Remediation';
            } else {
                display_profile_mode = 'Automatic Remediation';
            }

            if (severity_check1 == "high" && severity_check.match("successful")) {
                high_success_sev.push(severity_check);
            }

            if (severity_check1 == "medium" && severity_check.match("successful")) {
                medium_success_sev.push(severity_check);
            }

            if (severity_check1 == "low" && severity_check.match("successful")) {
                low_success_sev.push(severity_check);
            }


            if (severity_check1 == "high" && severity_check == "failed") {
                high_fail_sev.push(severity_check);
            }

            if (severity_check1 == "medium" && severity_check == "failed") {
                medium_fail_sev.push(severity_check);
            }

            if (severity_check1 == "low" && severity_check == "failed") {
                low_fail_sev.push(severity_check);
            }

            if (severity_check1 == "high" && severity_check.match("manual")) {
                high_manual_sev.push(severity_check);
            }

            if (severity_check1 == "medium" && severity_check.match("manual")) {
                medium_manual_sev.push(severity_check);
            }

            if (severity_check1 == "low" && severity_check.match("manual")) {
                low_manual_sev.push(severity_check);
            }
            var high_severity = high_success_sev.length + high_fail_sev.length + high_manual_sev.length;
            var medium_severity = medium_success_sev.length + medium_fail_sev.length + medium_manual_sev.length;
            var low_severity = low_success_sev.length + low_fail_sev.length + low_manual_sev.length;
            var passed_severity = high_success_sev.length + medium_success_sev.length + low_success_sev.length;
            var failed_severity = high_fail_sev.length + medium_fail_sev.length + low_fail_sev.length;
            var manual_severity = high_manual_sev.length + medium_manual_sev.length + low_manual_sev.length;
            var get_total_value = passed_severity + failed_severity + manual_severity;
            var percent_of_passed_severity = Math.round(passed_severity / get_total_value * 100);
            var percent_of_failed_severity = Math.round(failed_severity / get_total_value * 100);
            var percent_of_manual_severity = Math.round(manual_severity / get_total_value * 100);
            var total_percentage = percent_of_passed_severity + percent_of_failed_severity + percent_of_manual_severity;
            var create_array = [percent_of_passed_severity, percent_of_failed_severity, percent_of_manual_severity];
            if ((total_percentage > 100) || (total_percentage < 100)) {
                var maxX = Math.max.apply(Math, create_array);
                var index = create_array.indexOf(maxX);
                if (total_percentage > 100) {
                    if (~index) {
                        create_array[index] = maxX - 1;
                    }
                }
                if (total_percentage < 100) {
                    if (~index) {
                        create_array[index] = maxX + 1;
                    }
                }
            }
            if (passed_severity == "0") {
                create_array[0] = 0;
            } else {
                passed_value = create_array[0] + '%'
            }
            if (failed_severity == "0") {
                create_array[1] = 0;
            }

            if (manual_severity == "0") {
                create_array[2] = 0;
            }

            if (get_total_value == "0") {
                total_percentage = 0;
            }
            var get_selected_date = $("#myselect5varlog option:selected").val();
            if (get_actual_time == 'Latest Execution' && get_selected_date == 'Latest Execution') {
                status = '<font color="orange"><b>In Progress</b></font>';
            }
            total_actual_percentage = create_array[0] + create_array[1] + create_array[2];
            $("#profileId").html(profile_name);
            $("#profileid_name").val(get_profile_name);
            $("#profileId1").html(profile_name);
            $("#version_id").html(code_version);
            $("#executionId").html(display_profile_mode);
            $("#hssc").html(high_success_sev.length);
            $("#mssc").html(medium_success_sev.length);
            $("#lssc").html(low_success_sev.length);
            $("#hfsc").html(high_fail_sev.length);
            $("#mfsc").html(medium_fail_sev.length);
            $("#lfsc").html(low_fail_sev.length);
            $("#hmsc").html(high_manual_sev.length);
            $("#mmsc").html(medium_manual_sev.length);
            $("#lmsc").html(low_manual_sev.length);
            $("#htsc").html(high_severity);
            $("#mtsc").html(medium_severity);
            $("#ltsc").html(low_severity);
            $("#passedId").html(passed_severity + '(' + create_array[0] + '%)');
            $("#failedId").html(failed_severity + '(' + create_array[1] + '%)');
            $("#manualId").html(manual_severity + '(' + create_array[2] + '%)');
            $("#totalId").html(get_total_value + '(' + total_actual_percentage + '%)');
        });
        var ip_address = $("#myselect5 option:selected").val();
        var nickname = $("#myselect5 option:selected").text();
        if (ip_address == nickname) {
            var username = ip_address;
        } else {
            var username = nickname + " (" + ip_address + ")";
        }

        $("#ipId").html(username);

        if (flag == 'timestamp' || flag == 'ipname') {
            $("#th2").html(status);
        }
        $('#image-holder-page').hide();
        $('#ajaxloader').hide();
    }).fail(function (jqXHR, textStatus, errorThrown) {
        if (textStatus == 'timeout') {
            $('#image-holder-page').hide();
            $('#ajaxloader').hide();
            swal({
                text: 'Request timed out',
                type: 'error'
            });
        } else {
            errorHandler(jqXHR);
        }
    });
}
//-----------------Showrun End-----------------------

//--------------This function displayed the Machine os information------------
function onUserselectUpdateDiv(username) {
    var uri;
    var get_user_name = $("#myselect5").val();
    uri = API_CALL_PREFIX + "getIPDetails/?ip=" + username;
    $.ajax({
        method: "GET",
        dataType: 'json',
        timeout: DEFAULT_TIMEOUT,
        url: uri
    }).done(function (response) {
        try
        {
            var mapOfObjects = eval(response);
        }
        catch (e)
        {
            var mapOfObjects = eval("[" + response + "]")[0];
        }
        var os = mapOfObjects['os'];
        var os_version = mapOfObjects['os_version'];
        var hostname = mapOfObjects['hostname'];
        os = os + " Release " + os_version;
        $("#osId").html(os);
        $("#hostId").html(hostname);
        $('#report_detailed_log').attr('disabled', true);
        $('#image-holder-page').hide();
        //$('#ajaxloader').hide()
    }).fail(function (jqXHR, textStatus, errorThrown) {
        if (textStatus == 'timeout') {
            $('#image-holder-page').hide();
            $('#ajaxloader').hide()
            swal({
                text: 'Request timed out',
                type: 'error'
            });
        } else {
            errorHandler(jqXHR);
        }
    });
}
//-----------------------End--------------------------------------
function onchange_3_tier() {
    var select_value = $("#pass_opt_value").val();
}

function openComaprisionDiffernceReportPage() {
    window.open(get_comaprision_differnce_report_url, '_blank');
}

function openDetailedReportPage() {
    window.open(detailed_page_report_print_url, '_blank');
}
//--------------------Generate the Difference report------------------
function setComaprisionDiffernceReportUrl(latest_diff) {
    var result = true;
    var Rflag = false;
    var Lflag = false;
    var get_actual_latest = '';
    var page_name = 'comaprision_differnce_report';
    var page_title = 'Cloud Raxak Comaparision Difference Report';
    if (latest_diff == 1) {

        var count_option_length = $('#myselect7varlog > option').length;
        if (count_option_length > 1) {
            var latestTimeStamp = $('#myselect7varlog option').eq(0).val();
            var userProfileSelectedTimestamp = $('#myselect8varlog option').eq(1).val();
            var selectedTime_T1 = $('#myselect7varlog option').eq(0).val();
            var selectedTime_T2 = $('#myselect8varlog option').eq(1).val();
            $("#myselect8varlog")[0].selectedIndex = 1;
        }
        else {
            $("#myselect8varlog")[0].selectedIndex = 0;
        }
        //--------- Start new changes---------
        var selectedTime_T1Obj = new Date(selectedTime_T1);
        var selectedTime_T2Obj = new Date(selectedTime_T2);
        var timeStamp_T1 = selectedTime_T1Obj.toUTCString();
        var timeStamp_T2 = selectedTime_T2Obj.toUTCString();
        var Lflag = true;

        //--------- End new changes---------
    } else {
        var selectedTime_T1 = $("#myselect7varlog").val();
        var selectedTime_T2 = $("#myselect8varlog").val();


        //--------- Start new changes---------
        var selectedTime_T1Obj = new Date(selectedTime_T1);
        var selectedTime_T2Obj = new Date(selectedTime_T2);
        var timeStamp_T1 = selectedTime_T1Obj.toUTCString();
        var timeStamp_T2 = selectedTime_T2Obj.toUTCString();
        var Lindex = $("#myselect7varlog").prop('selectedIndex');
        var Rindex = $("#myselect8varlog").prop('selectedIndex');
        if (Lindex == 0)
            var Lflag = true;
        if (Rindex == 0)
            var Rflag = true;
        //--------- End new changes---------

        var time1s = new Date(selectedTime_T1);
        var time1Stamp = time1s.getTime();

        var time2s = new Date(selectedTime_T2);
        var time2Stamp = time2s.getTime();

        if (time1Stamp == time2Stamp) {
            result = false;
            clearInterval(set_interval);
            set_interval = '';
        } else if (time1Stamp > time2Stamp) {
            var latestTimeStamp = selectedTime_T1;
            var userProfileSelectedTimestamp = selectedTime_T2;
        } else {
            var latestTimeStamp = selectedTime_T2;
            var userProfileSelectedTimestamp = selectedTime_T1;
        }

        if ((Lindex == 0 && Rindex != 0) && (selectedTime_T1 == 'Latest Execution' && selectedTime_T2 !== 'Latest Execution')) {
            var userProfileSelectedTimestamp = selectedTime_T2;
            if (set_interval == '')
                set_interval = setInterval(call_showrun, 10000);
        } else if ((Lindex != 0 && Rindex == 0) && (selectedTime_T1 == 'Latest Execution' && selectedTime_T2 !== 'Latest Execution')) {
            var userProfileSelectedTimestamp = selectedTime_T1;
            if (set_interval == '')
                set_interval = setInterval(call_showrun, 10000);
        } else if ((Lindex == 0 && Rindex == 0) && (selectedTime_T1 === 'Latest Execution' && selectedTime_T2 === 'Latest Execution')) {
            clearInterval(set_interval);
            set_interval = '';
            result = false;
        }

    }
    var archieveLogTimestampObj = new Date(userProfileSelectedTimestamp);
    var archieveLogTimestamp = archieveLogTimestampObj.toUTCString();
    var userProfileIpAddress = document.getElementById("myselect6").value;
    var userProfileName = document.getElementById('profileId').innerHTML;

    if (selectedTime_T1 == 'Latest Execution' || selectedTime_T2 == 'Latest Execution') {
        get_actual_latest = 'Latest Execution'
    }
    if (result) {
        var content = {'profilename': userProfileName, 'usernameIP': userProfileIpAddress, 'timeStamp_T1': timeStamp_T1, 'selectedTime_T1': selectedTime_T1, 'timeStamp_T2': timeStamp_T2, 'selectedTime_T2': selectedTime_T2, 'Lflag': Lflag, 'Rflag': Rflag, 'archieveLogTimestamp': archieveLogTimestamp, 'archieveLogTimestampGmt': userProfileSelectedTimestamp, 'archieveLogCurrentTimestampGmt': latestTimeStamp, 'page_name': page_name, 'page_title': page_title};
        url = API_CALL_PREFIX + 'urlParamaterEncode',
                $.ajax({
                    url: url,
                    method: 'POST',
                    dataType: 'text',
                    async: false,
                    data: content
                }).done(function (jsonUrl) {
            get_comaprision_differnce_report_content = jsonUrl;
            get_comaprision_differnce_report_url = 'report.html?reportData=' + jsonUrl;
            result = true;
        }).fail(function (jqXHR, textStatus, errorThrown) {
            errorHandler(jqXHR);
        });
    }
    return result;
}
//--------------------------Difference code End----------------
function openDetailedReportPage() {
    window.open(detailed_page_report_print_url, '_blank');
}
//------------Generate Detailed Report code start Here------------------
function setDetailedReport() {
    var userProfileSelectedTimestamp = document.getElementById("myselect5varlog").value;
    var userProfileIpAddress = document.getElementById("myselect5").value;
    var userProfileName = $('#profileid_name').val();
    var page_error = true;
    var archieveLogTimestampObj = new Date(userProfileSelectedTimestamp);
    var archieveLogTimestamp = archieveLogTimestampObj.toUTCString();
    var archieveLogFirst = false;
    var archieveLogCurrentTimestampGmt = $("#myselect5varlog option:selected").text();
    var page_name = 'detailed_report';
    var report_type = $("#pass_opt_value").val();
    if (report_type == '') {
        $('#report_detailed_log').attr('disabled', true);
    } else {
        $('#report_detailed_log').attr('disabled', false);

        if (report_type == 'summary') {
            var page_title = 'Cloud Raxak Summary Report';
        }
        if (report_type == 'executive_summary') {
            var page_title = 'Cloud Raxak Executive Summary Report';
        }
        if (report_type == 'full_report') {
            var page_title = 'Cloud Raxak Detailed Report';
        }

        var nickname = $("#myselect5 option:selected").text();
        var content = {profilename: userProfileName, getnickname: nickname, usernameIP: userProfileIpAddress, archieveLogTimestamp: archieveLogTimestamp, archieveLogTimestampGmt: archieveLogCurrentTimestampGmt, 'archieveLogFirst': archieveLogFirst, 'page_name': page_name, 'page_title': page_title};
        url = API_CALL_PREFIX + 'urlParamaterEncode',
                $.ajax({
                    url: url,
                    method: 'POST',
                    dataType: 'text',
                    data: content
                }).done(function (jsonUrl) {
            var new_page_path = 'report.html?report_type=' + report_type + '&reportData=' + jsonUrl;
            detailed_page_report_print_url = new_page_path;
        }).fail(function (jqXHR, textStatus, errorThrown) {
            errorHandler(jqXHR);
        });
    }
}
//-----------------------Detailed report code end here -----------------------

//--------------------------Onchange Code start here----------------------------------
function onchange_opt() {
    $("#myselect5").change(function () {
        if ($(this).data('options') == undefined) {
            $(this).data('options', $('#myselect5varlog option').clone());
        }
        var id = $(this).val();
        showDate(id, 1);
        onUserselectUpdateDiv(id);
        $("#tooltip_detail").html(id);
        $('#pass_opt_value').val('');
    });
}

function onchange_option_value() {
    $("#myselect6").change(function () {
        if ($(this).data('options') == undefined) {
            $(this).data('options', $('#myselect7varlog option').clone());
        }
        var id = $(this).val();
        showDate(id, '');
        onUserselectUpdateDiv(id);
        $("#tooltip_detail").html(id);
    });
}

function onchange_option() {
    $("#myselect6").change(function () {
        if ($(this).data('options') == undefined) {
            $(this).data('options', $('#myselect5varlog option').clone());
        }
        var id = $(this).val();
        $("#tooltip_difference").html(id);
    });
}

function onChangedatelog(timestmp) {
    var ip_name = $('#myselect5').val();
    $('#pass_opt_value').val('');
    getShowrun(ip_name, timestmp, 'timestamp');
    $('#report_detailed_log').attr('disabled', true);
}

function onchange_opt_varlog() {
    var varlog7 = $("select#myselect7varlog").prop('selectedIndex');
    var test = $("#myselect5varlog").val();
    $("#myselect5varlog").change(function () {
        if ($(this).data('options') == undefined) {
            $(this).data('options', $('#myselect5varlog option').clone());
        }
        var id = $(this).val();
        var options = $(this).data('options:selected');
        $("#pass_opt_value")[0].selectedIndex = 0;
        $("#select2-pass_opt_value-container").text('Please select');
        onChangedatelog(id);
        $("#last_exec").html(id);
        $('#myselect5varlog').html(options);
    });
}
//------------------------Onchange code End here -------------------

//----------------Latest Difference Report code .This code is used for displaying information on the second tab---------------- 
function getLatestDiffReport(latest_diff) {
    var html = '';
    var varlog7 = $("select#myselect7varlog").prop('selectedIndex');
    var get_selected_date_diff = $("#myselect7varlog option:selected").val();
    var varlog8 = $("select#myselect8varlog").prop('selectedIndex');
    if (get_selected_date_diff == 'Latest Execution') {
        $("#latest_executed_time").show();
    } else {
        $("#latest_executed_time").show();
    }
    if (varlog8 == 0 && varlog7 > 1) {
        $("#latest_id1").show();
    }
    $("#latest_id").hide();
    if (varlog7 > 0) {
        $("#latest_id").hide();
    }
    else {
        $("#latest_id").show();
    }
    if (varlog8 > 0) {
        $("#latest_id1").hide();
    }
    else if (varlog8 > 1) {
        $("#latest_id1").show();
    }
    if (varlog7 > 0 && varlog8 > 0) {
        $("#latest_id").hide();
    }
    var res = setComaprisionDiffernceReportUrl(latest_diff);
    if (res) {
        var content = get_comaprision_differnce_report_content;
        $.ajax({
            timeout: DEFAULT_TIMEOUT,
            method: "POST",
            //dataType:'text',
            data: {reportData: content},
            //async:false,
            url: '/raxakapi/v1/get_Summary_ComparisionReport/',
            success: function (response) {
                var mapOfObjects = eval(response);
                var os_name = mapOfObjects['os'];
                var host_name = mapOfObjects['host_name'];
                var os_version = mapOfObjects['os_version'];
                var latest_profile = mapOfObjects['reporta_profile'];
                var old_profile = mapOfObjects['reportb_profile'];
                var latest_executed_time = mapOfObjects['timeStamp_T1'];
                var old_executed_time = mapOfObjects['timeStamp_T2'];
                var latest_execution_mode = mapOfObjects['reporta_execution_mode'];
                var old_execution_mode = mapOfObjects['reportb_execution_mode'];
                var latest_code_version = mapOfObjects['reporta_code_version'];
                var old_code_version = mapOfObjects['reportb_code_version'];
                var reporta_check_status = mapOfObjects['reporta_check_status'];
                var reportb_check_status = mapOfObjects['reportb_check_status'];
                var total_rules_count = mapOfObjects['total_rules_count'];
                var reporta_outcome = mapOfObjects['reporta_dic_outcome'];
                var reportb_outcome = mapOfObjects['reportb_dic_outcome'];
                var get_utc_date = String(latest_executed_time);
                var utc_format = new Date(get_utc_date + ' UTC');
                var get_utc_date = String(utc_format).replace('GMT+0530 (IST)', "");
                var change_latest_date = String(get_utc_date).replace('GMT+0530 (India Standard Time)', "");

                //-- Get the profile counts from session.
                var latest_profile_mod = latest_profile.replace(/[^a-z0-9]+/gi, '_').toLowerCase();
                var old_profile_mod = old_profile.replace(/[^a-z0-9]+/gi, '_').toLowerCase();
                var latest_profile_counts = sessionStorage.getItem(latest_profile_mod + '_counts');
                var old_profile_counts = sessionStorage.getItem(old_profile_mod + '_counts');

                if (latest_profile_counts) {
                    latest_profile = latest_profile + ' <b>(Total Rules: ' + latest_profile_counts + ')</b>';
                }

                if (old_profile_counts) {
                    old_profile = old_profile + ' <b>(Total Rules: ' + old_profile_counts + ')</b>';
                }

                report_abort_status = '(<font color="darkred"><b>ABORTED</b></font>)';
                report_raxak_abort_status = '(<font color="darkred"><b>ABORTED (connection lost)</b></font>)';
                if (reporta_check_status == '(ABORTED)') {
                    reporta_check_status = report_abort_status;
                }
                else if( reporta_check_status == '(ABORTED BY RAXAK PROTECT)')
                {
                    reporta_check_status = report_raxak_abort_status;
                }

                if (reportb_check_status == '(ABORTED)') {
                    reportb_check_status = report_abort_status;
                }
                else if( reportb_check_status == '(ABORTED BY RAXAK PROTECT)')
                {
                    reportb_check_status = report_raxak_abort_status;
                }

                if (reporta_outcome == 'INACCESSIBLE' || reportb_outcome == 'INACCESSIBLE') {
                    $("#difference_table").hide();
                    $("#difference_table_show").hide();
                    html = '<div style="font-size:larger;text-align:center;margin-top:20px;"><p style="margin-top:8px;color:darkred;">Unable to reach target machine !</p></div>';
                    $('#inaccessiblediff').html(html);
                    $('#inaccessiblediff').show();
                } else if (reporta_outcome != 'INACCESSIBLE' || reportb_outcome != 'INACCESSIBLE') {
                    if (get_actual_time == 'Latest Execution' && get_selected_date_diff == 'Latest Execution') {
                        reporta_check_status = '<span id="diff_status"><font color="orange">(<b>In Progress</b>)</font></span>';
                        //$('#myselect7varlog').attr('disabled', true);
                    }
                    if (old_executed_time == 'Latest Execution') {
                        reportb_check_status = '<span id="diff_status"><font color="orange">(<b>In Progress</b>)</font></span>';
                    }
                    $("#hosta").html(host_name);
                    $("#hostb").html(host_name);
                    $("#os_version").html(os_version);
                    $("#os_version1").html(os_version);
                    $("#latest_profile").html(latest_profile);
                    $("#old_profile").html(old_profile);
                    $("#latest_executed_time").html(latest_executed_time + reporta_check_status);
                    $("#old_executed_time").html(old_executed_time + reportb_check_status);
                    $("#latest_execution_mode").html(latest_execution_mode);
                    $("#old_execution_mode").html(old_execution_mode);
                    $("#latest_code_version").html(latest_code_version);
                    $("#old_code_version").html(old_code_version);
                    $("#total_rules_count").html(total_rules_count);
                    $('#diff_id').attr('disabled', false);
                    $("#difference_table").show();
                    $("#difference_table_show").hide();
                    $('#inaccessiblediff').hide();
                }
            }, error: function (jqXHR, textStatus, errorThrown) {
                if (textStatus == 'timeout') {
                    swal({
                        text: 'Request timed out',
                        type: 'error'
                    });
                } else {
                    errorHandler(jqXHR);
                }
                //errorHandler(jqXHR);
            }
        });
    } else {
        $('#difference_table').hide();
        $('#diff_id').attr('disabled', true);
        $('#inaccessiblediff').hide();
        $('#difference_table_show').show();
    }
}

//--------------------------End-------------------------

$(document).ready(function () {
    getIp();
    onchange_opt();
    onchange_option_value();
    onchange_option();
    onchange_opt_varlog();
    set_interval = setInterval(call_showrun, 10000);
    $("#pass_opt_value")[0].selectedIndex = 0;
    //$('#pass_opt_value').val('');
    $('#latest_run').prop('checked', true);
    $('#old_run').prop('checked', false);
    $("#difference_table").hide();
    $("#difference_table_show").show();
    $('#diff_id').attr('disabled', true);
    $("#latest_id1").hide();
    $("#latest_id").show();
});
