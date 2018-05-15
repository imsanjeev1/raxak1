//Start: Constants//
var MEDIA_DIR = './'; //static/
var IMG_DIR = MEDIA_DIR + 'images/';
var CSS_DIR = MEDIA_DIR + 'css/';
var JS_DIR = MEDIA_DIR + 'js/';
var DEFAULT_TIMEOUT = 10 * 1000;//10 seconds
var ipDetails = [];
var value_array = new Array();
var key_array = [];
var target_machine_count = [];
var get_show_executiondata = [];
var show_key = '';
var ip = '';
var frequency = '';
var nextrun = '';
var API_CALL_PREFIX = "../raxakapi/v1/";
var TIMEOUT_MESSAGE = 'Retry the web page by clicking the refresh/reload button, <br> if the problem persists then please contact the raxak administrator for further assistance.';
var interVal;
var runningIp;
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
function boxOff(i) {
    if (i == 1) {
        $(".selected").prop("disabled", true);
        $(".unselected").prop("disabled", true);
        $(".atr").prop("disabled", true);
        $(".str").prop("disabled", true);
        $(".atl").prop("disabled", true);
        $(".stl").prop("disabled", true);
        $('#allOk').prop("disabled", true);
        $('#unsupportedOS').prop("disabled", true);
        $('#unabletoreach').prop("disabled", true);
        $('#unabletologinwithspecifieduser').prop("disabled", true);
        $('#insufficientexecutionprivilege').prop("disabled", true);
        $('#executionCount').val(0);
    } else {
        var is_ussuccess = $('.unselected option').hasClass('success');
        var is_success = $('.selected option').hasClass('success');
        if (is_ussuccess) {
            $(".atr").prop("disabled", false);
        }
        if (is_success) {
            $(".atl").prop("disabled", false);
        }
        $(".selected").prop("disabled", false);
        $(".unselected").prop("disabled", false);
        //$(".str").prop("disabled", false);
        //$(".stl").prop("disabled", false);
        $('#allOk').prop("disabled", false);
        $('#unsupportedOS').prop("disabled", false);
        $('#unabletoreach').prop("disabled", false);
        $('#unabletologinwithspecifieduser').prop("disabled", false);
        $('#insufficientexecutionprivilege').prop("disabled", false);
        $('#executionCount').val(0);
//comment
    }
}

function compareRuleProfiles(p1, p2) {
    if (p1.profilename < p2.profilename)
        return -1;
    else if (p1.profilename > p2.profilename)
        return 1;
    else
        return 0;
}

function getProfileListing() {
    var html = '';
    var RuleProfiles = [];
    var profileOptions = $.trim(sessionStorage.getItem('profileOptions'));
    var profileApplied = sessionStorage.getItem('profileApplied');
    if (profileOptions) {
        var profileOptionsObj = JSON.parse(profileOptions);
        $.each(profileOptionsObj, function (key, value) {
            var counts = "";
            var value = $.trim(profileOptionsObj[key].profilename);
            if (parseInt(profileOptionsObj[key].rulescount) > 0) {
                counts = parseInt(profileOptionsObj[key].rulescount);
            }
            if (value == profileApplied) {
                $('#rulecounts').html('<b>' + counts + ' Rule(s)</b>');
                html += '<option value="' + value + '" selected="selected" rules="' + counts + '">' + value + '</option>';
            } else {
                html += '<option value="' + value + '" rules="' + counts + '">' + value + '</option>';
            }
        });
        $("#selectedprofile").html(html);
        return;
    } else {
        $.ajax({
        	timeout:DEFAULT_TIMEOUT,
            url: API_CALL_PREFIX + "profileDetails/",
            async: false,
            success: function (response) {
                try {
                    var profiles = JSON.parse(response);
                    $.each(profiles, function (key, value) {
                        RuleProfiles.push(value);
                    });
                    RuleProfiles.sort(compareRuleProfiles);
                    $.each(RuleProfiles, function (key, value) {
                        var counts = "";
                        var value = $.trim(RuleProfiles[key].profilename);
                        if (parseInt(RuleProfiles[key].rulescount) > 0) {
                            counts = parseInt(RuleProfiles[key].rulescount);
                        }
                        if (value == 'Demonstration Profile') {
                            $('#rulecounts').html('<b>' + counts + ' Rule(s)</b>');
                            html += '<option value="' + value + '" selected="selected" rules="' + counts + '">' + value + '</option>';
                            sessionStorage.setItem('profileApplied', value);
                        } else {
                            html += '<option value="' + value + '" rules="' + counts + '">' + value + '</option>';
                        }
                    });
                    sessionStorage.setItem('profileOptions', JSON.stringify(RuleProfiles));
                    $("#selectedprofile").html(html);
                } catch (e) {
                    alert(e);
                }
            }, error: function (jqxhrFail, textStatusFail, errorThrownFail) {
            	if(textStatusFail == 'timeout'){
                	swal({
                        text: 'Request timed out',
                        type: 'error'
                    });
                }
                	 else{
                    	 errorHandler(jqxhrFail);
                	 }
            }
        });
    }
}

function runProfile() {
    runningIp = "";
    $(".selected > option").each(function () {
        var ip = this.value;
        runningIp = runningIp + ip + ',';
    });
    runningIp = runningIp.replace(/,(\s+)?$/, '');

    var autoremediate = 0;
    var cron_prompt_confirm = "yes";
    var profile = $('#selectedprofile').val(); //select profile from dropdown
    var frequency = $("#select_croninterval option:selected").val();

    if (profile != '')
        sessionStorage.setItem('profileApplied', profile);

    if ($('#optionsRadiosautmetic').prop("checked"))
        autoremediate = 1;// autoremediate is 1 for auto and 0 for manual

    var url = API_CALL_PREFIX + "runProfiles/?ip=" + runningIp + "&profile=" + profile + "&autoremediate=" + autoremediate + "&frequency=" + frequency + "&cron_prompt_confirm=" + cron_prompt_confirm + "";
    $.ajax({
        url: url,
        async: true,
        success: function (result) {
            try {
                interVal = setInterval("getRunningStatus('" + runningIp + "',1)", 10000);
                //$('#spanCronMessage').html("Compliance checking in progress(0%).....");
                $('#spanCronMessage').html("Compliance execution started.....");
                $('#apply_profile_action').prop("disabled", true);
            } catch (e) {
                alert(e);
            }
        }, error: function (jqxhrFail) {
            errorHandler(jqxhrFail);
        }
    });
}

function getSelectedTMs(username) {
    var url = API_CALL_PREFIX + "getSelectedTMs/";
    
    $.ajax({
    	timeout:DEFAULT_TIMEOUT,
        url: url,
        async: true,
        success: function (result) {
            sessionStorage.setItem('selectedTMS', result);
        }, error: function (jqxhrFail, textStatusFail, errorThrownFail) {
        	if(textStatusFail == 'timeout'){
            	swal({
                    text: 'Request timed out',
                    type: 'error'
                });
            }else{
                	 errorHandler(jqxhrFail);
            	 }
        }
    });
}

function getLastrunIPs() {
    var html = '';
    var stringArray = '';
    var url = API_CALL_PREFIX + "getlastrunIPs";
    $.ajax({
    	timeout:DEFAULT_TIMEOUT,
        url: url,
        async: true,
        success: function (result) {
            arrayOfObjects = result;
            if (arrayOfObjects.length > 0) {
                var ip = '';
                for (var i in arrayOfObjects) {
                    var json = JSON.parse(arrayOfObjects[i]);
                    var var_ip = json.ip;
                    var lastrun = json.lastrun
                    if (lastrun != "1"){
                        continue;
                    }
                    if (ip == "")
                    {
                        ip = var_ip;
                    }
                    else
                    {
                        ip += ',' + var_ip;
                    }
                }

                if (ip.length > 0) {
                    getRunningStatus(ip, 0);
                    runningIp = ip;
                    interVal = setInterval("getRunningStatus('" + ip + "',0)", 10000);
                }
            }

        }, error: function (jqxhrFail, textStatusFail, errorThrownFail) {
        	if(textStatusFail == 'timeout'){
            	swal({
                    text: 'Request timed out',
                    type: 'error'
                });
            }else{
               	 errorHandler(jqxhrFail);
            	 }
        }
    });
}

function getRunningStatus(ip, show) {
    var runCount = $('#executionCount').val();
    var url = API_CALL_PREFIX + "getExecutionStatus/?ip=" + ip + "";
    sessionStorage.setItem("currentRunningIp", ip);
    $.ajax({
        url: url,
        async: true,
        success: function (result) {
            runCount = runCount + 1;
            $('#executionCount').val(runCount);
            try {
                var res = result.toString().split(":"); //false:47
                if (show == 0) {
                    if (res[0] == "false") {
                        if (res[1] >= 100) {
                            res[1] = 99;
                        }
                        $('#spanCronMessage').html("Compliance execution  in progress(" + res[1] + "%).....");
                        boxOff(1);
                        setRunProfileEnabled(1);
                        $('#apply_profile_action').prop("disabled", true);
                        $("#abort_action").prop("disabled", false);
                    } else {
                        clearInterval(interVal);
                        var text = $('#spanCronMessage').html();
                        if (text.length > 5) {
                            setRunProfileEnabled(0);
                            if ($('#optionsRadiosautmetic').is(':checked')) {
                                setRunRadioBoxEnabled(1);
                                $('#apply_profile_action').prop("disabled", false);
                            }
                            boxOff(0);
                            sessionStorage.setItem("currentRunningIp", "");
                            sessionStorage.setItem("setfrequency", "");
                        }
                    }
                    return;
                }
                if (res[0] == "false") {
                    if (res[1] >= 100) {
                        res[1] = 99;
                    }
                    $('#spanCronMessage').html("Compliance execution in progress(" + res[1] + "%).....");
                    $("#abort_action").prop("disabled", false);
                } else {
                    if (runCount > 1) {
                        $('#spanCronMessage').html("<span style='color:green'>Compliance execution finished !! <span>");
                        clearInterval(interVal);
                        setRunProfileEnabled(0);
                        if ($('#optionsRadiosautmetic').is(':checked')) {
                            setRunRadioBoxEnabled(1);
                            $('#apply_profile_action').prop("disabled", false);
                        }
                        boxOff(0);
                        sessionStorage.setItem("currentRunningIp", "");
                        sessionStorage.setItem("setfrequency", "");
                    } else {
                        $('#spanCronMessage').html("Compliance execution in progress(0%).....");
                    }
                }
                return result;
            } catch (e) {
                alert(e);
            }
        }, error: function (jqxhrFail, textStatusFail, errorThrownFail) {
           errorHandler(jqxhrFail);
        }
    });
    return false;
}

function abortAction() {
    if (runningIp) {
        var url = API_CALL_PREFIX + "abortExecution/?ip=" + runningIp + "";
        $.ajax({
        	timeout:DEFAULT_TIMEOUT,
            url: url,
            async: true,
            success: function (result) {
                if (result.toString().toLowerCase() == "aborted execution") {
                    $('#spanCronMessage').html("<span style='color:darkred'>Compliance execution has been aborted successfully! <span>");
                    sessionStorage.setItem("setfrequency", "");
                    clearInterval(interVal);
                }
            },
            error: function (jqxhrFail, textStatusFail, errorThrownFail) {
                if(textStatusFail == 'timeout'){
                	swal({
                        text: 'Request timed out',
                        type: 'error'
                    });
                }else{
                   	 errorHandler(jqxhrFail);
                	 }
            }
        });
    } else {
        alert("No running job to abort");
    }
    return false;
}

// function to select particular ips 

function filterIps() {
    var allok = $('#allOk');
    var unsupportedOS = $('#unsupportedOS'); // unsupported Orange color
    var unabletoreach = $('#unabletoreach'); //ping-fail red
    var unabletologinwithspecifieduser = $('#unabletologinwithspecifieduser'); // sshlogin falil Yellow color
    var insufficientexecutionprivilege = $('#insufficientexecutionprivilege'); // ccnnot sudo Blue color
    var alltargetmachines = $('#alltargetmachines');
    alltargetmachines.prop("checked", "");
    var tms = JSON.parse(sessionStorage.getItem('response'));
    var selected = sessionStorage.getItem('selectedTMS');
    if (allok.prop('checked') || unsupportedOS.prop('checked') || unabletoreach.prop('checked') || unabletologinwithspecifieduser.prop('checked') || insufficientexecutionprivilege.prop('checked')) {
        $('.unselected').html('');
        $.each(tms, function (i, data) {
            var item = JSON.parse(data);
            var optionDisabled = true;
            var optionValue = item.nickname;
            var optionClass = TM_ACCESS_NORMS[item.access].cssclass;
            var optionTitle = item.ip + ' : ' + TM_ACCESS_NORMS[item.access].title;
            if (item.access === 1) {
                optionTitle = item.ip + ' (' + item.osname + ' ' + item.osversion + ')';
                optionDisabled = false;
            }

            if (item.nickname == "") {
                var optionValue = item.ip;
            }
            if (allok.prop('checked') && selected.toString().indexOf(item.ip) == -1) {
                var filterC = allok.attr('value');
                if (filterC == item.access) {
                    if ($(".unselected option[value='" + item.ip + "']").length == 0) {
                        $('.unselected').append($('<option>', {
                            value: item.ip,
                            text: optionValue,
                            title: optionTitle,
                            class: optionClass,
                            disabled: optionDisabled
                        }));
                    }
                }
            }

            if (unsupportedOS.prop('checked')) {
                var filterC = unsupportedOS.attr('value');
                if (filterC == item.access) {
                    if ($(".unselected option[value='" + item.ip + "']").length == 0) {
                        $('.unselected').append($('<option>', {
                            value: item.ip,
                            text: optionValue,
                            title: optionTitle,
                            class: optionClass,
                            disabled: optionDisabled
                        }));
                    }
                }
            }

            if (unabletoreach.prop('checked')) {
                var filterC = unabletoreach.attr('value');
                if (filterC == item.access) {
                    if ($(".unselected option[value='" + item.ip + "']").length == 0) {
                        $('.unselected').append($('<option>', {
                            value: item.ip,
                            text: optionValue,
                            title: optionTitle,
                            class: optionClass,
                            disabled: optionDisabled
                        }));
                    }
                }
            }

            if (unabletologinwithspecifieduser.prop('checked')) {
                var filterC = unabletologinwithspecifieduser.attr('value');
                if (filterC == item.access) {
                    if ($(".unselected option[value='" + item.ip + "']").length == 0) {
                        $('.unselected').append($('<option>', {
                            value: item.ip,
                            text: optionValue,
                            title: optionTitle,
                            class: optionClass,
                            disabled: optionDisabled
                        }));
                    }
                }
            }

            if (insufficientexecutionprivilege.prop('checked')) {
                var filterC = insufficientexecutionprivilege.attr('value');
                if (filterC == item.access) {
                    if ($(".unselected option[value='" + item.ip + "']").length == 0) {
                        $('.unselected').append($('<option>', {
                            value: item.ip,
                            text: optionValue,
                            title: optionTitle,
                            class: optionClass,
                            disabled: optionDisabled
                        }));
                    }
                }
            }
        });
    } else {
        $.each(tms, function (i, data) {
            var item = JSON.parse(data);
            var optionValue = item.nickname;
            var optionTitle = item.ip + ' : ' + TM_ACCESS_NORMS[item.access].title;
            var optionClass = TM_ACCESS_NORMS[item.access].cssclass;
            var optionDisabled = true;
            if (item.nickname == "") {
                var optionValue = item.ip;
            }

            if (item.access === 1) {
                optionTitle = item.ip + ' (' + item.osname + ' ' + item.osversion + ')';
                optionDisabled = false;
            }
            if (selected.toString().indexOf(item.ip) == -1) {
                if ($(".unselected option[value='" + item.ip + "']").length == 0) {
                    $('.unselected').append($('<option>', {
                        value: item.ip,
                        text: optionValue,
                        title: optionTitle,
                        class: optionClass,
                        disabled: optionDisabled
                    }));
                }
            } else {
                if ($(".selected option[value='" + item.ip + "']").length == 0) {
                    $('.selected').append($('<option>', {
                        value: item.ip,
                        text: optionValue,
                        title: optionTitle,
                        class: optionClass,
                        disabled: optionDisabled
                    }));
                }
            }
        });
        alltargetmachines.prop("checked", "true");
        return false;
    }
}

function getIps() {
    $.ajax({
    	timeout:DEFAULT_TIMEOUT,
        dataType: 'json',
        async: false,
        cache: false,
        url: API_CALL_PREFIX + "getIPs/"
    }).done(function (response) {
        var machineCount = response.length;
        if (machineCount > 0) {
            sessionStorage.setItem('gEnrolledTMs', JSON.stringify(response));
            sessionStorage.setItem('machineCount', machineCount);
            $("#enrolledIPs").html(machineCount);
            getSelectedTMs();
            getProfileListing();
        } else {
        	sessionStorage.setItem('gEnrolledTMs', JSON.stringify(machineCount));
            $("#maincontent").hide();
            $("#no_info").show();
        }
        return true;
    }).fail(function (jqxhrFail, textStatusFail, errorThrownFail) {
    	if(textStatusFail == 'timeout'){
        	swal({
                text: 'Request timed out',
                type: 'error'
            });
        }else{
           	 errorHandler(jqxhrFail);
        	 }
    });
    return false;
}

$(document).on("change", "#selectedprofile", function () {
    var counts = $('option:selected', this).attr('rules');
    var value = $('option:selected', this).attr('value');
    $('#rulecounts').html('<b>' + counts + ' Rule(s)</b>');
    sessionStorage.setItem('profileApplied', $.trim(value));
    sessionStorage.setItem($.trim(value) + '_count', counts);
    //sessionStorage.setItem('currentProfileId', "profile_"+($(this).prop('selectedIndex')+1));
});

$(document).on("change", "#select_croninterval", function () {
    var frequency = $.trim($('option:selected', this).attr('value'));
    sessionStorage.setItem('selectedfrequency', frequency);
});
