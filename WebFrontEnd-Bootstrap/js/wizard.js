//Start: Constants//
var MEDIA_DIR = './';//static/
var IMG_DIR = MEDIA_DIR + 'images/';
var CSS_DIR = MEDIA_DIR + 'css/';
var JS_DIR = MEDIA_DIR + 'js/';

var ip = '';
var frequency = '';
var API_CALL_PREFIX = "../raxakapi/v1/";
var interVal = '';
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
            var description = $.trim(profileOptionsObj[key].description);
            if (parseInt(profileOptionsObj[key].rulescount) > 0) {
                counts = parseInt(profileOptionsObj[key].rulescount);
            }
            if (value == profileApplied) {
                $('#sprofiletab').text("(" + value + ")");
                $('#ruledescription').text(description);
                $('#rulecounts').html('<strong>' + counts + ' Rule(s)</strong>');
                html += '<option value="' + value + '" selected="selected" rules="' + counts + '" description="' + description + '">' + value + '</option>';
            } else {
                html += '<option value="' + value + '" rules="' + counts + '" description="' + description + '">' + value + '</option>';
            }
        });
        $("#selectprofile").html(html);
        return;
    } else {
        $.ajax({
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
                        var description = $.trim(RuleProfiles[key].description);
                        if (parseInt(RuleProfiles[key].rulescount) > 0) {
                            counts = parseInt(RuleProfiles[key].rulescount);
                        }
                        // "Demonstration Profile" is default profile.
                        if (value == 'Demonstration Profile') {
                            html += '<option value="' + value + '" selected="selected" rules="' + counts + '" description="' + description + '">' + value + '</option>';
                            $('#sprofiletab').text("(" + value + ")");
                            $('#rulecounts').html('<strong>' + counts + ' Rule(s)</strong>');
                            $('#ruledescription').text(description);
                            sessionStorage.setItem('profileApplied', value);
                        } else {
                            html += '<option value="' + value + '" rules="' + counts + '" description="' + description + '">' + value + '</option>';
                        }
                    });
                    sessionStorage.setItem('profileOptions', JSON.stringify(RuleProfiles));
                    $("#selectprofile").html(html);
                } catch (e) {
                    alert(e);
                }
            }, error: function (jqxhrFail) {
                errorHandler(jqxhrFail);
            }
        });
    }
}

function runProfile() {
    var frequency = "none";
    var autoremediate = 0;
    var cron_prompt_confirm = "yes";
    var profile = $('#selectprofile').val(); //select profile from dropdown
    var runningIp = $("#targetmachinesoption option:selected").val();
    runningIp = runningIp.replace(/,(\s+)?$/, '');

    if ($('#remedmodeautomatic').is(':checked')) {
        autoremediate = 1;
        if ($("#croninterval option:selected").val().toString().toLowerCase() !== "one time") {
            frequency = $("#croninterval option:selected").val();
        }
    }

    var url = API_CALL_PREFIX + "runProfiles/?ip=" + runningIp + "&profile=" + profile + "&autoremediate=" + autoremediate + "&frequency=" + frequency + "&cron_prompt_confirm=" + cron_prompt_confirm + "";
    $.ajax({
        url: url,
        async: true,
        success: function (result) {
            try {
                sessionStorage.setItem("currentRunningIp", runningIp);
                interVal = setInterval("getRunningStatus('" + runningIp + "',1)", 10000);
                $('#spanCronMessage').html("Compliance execution started.....");
            } catch (e) {
                alert(e);
            }
        }, error: function (jqxhrFail) {
            errorHandler(jqxhrFail);
        }
    });
}

function getLastrunIPs() {
    var html = '';
    var url = API_CALL_PREFIX + "getlastrunIPs";
    $.ajax({
        url: url,
        async: true,
        success: function (response) {
            if (response.length > 0) {
                var ip = '';
                for (var i in response) {
                    var json = JSON.parse(response[i]);
                    var var_ip = json.ip;
                    var lastrun = json.lastrun
                    if (lastrun != "1") {
                        continue;
                    }
                    if (ip == "") {
                        ip = var_ip;
                    } else {
                        ip += ',' + var_ip;
                    }
                }

                if (ip.length > 0) {
                    getRunningStatus(ip, 0);
                    runningIp = ip;
                    interVal = setInterval("getRunningStatus('" + ip + "',0)", 10000);
                }
            }

        }, error: function (jqxhrFail) {
            errorHandler(jqxhrFail);
        }
    });
}

function getRunningStatus(ip, show) {
    var url = API_CALL_PREFIX + "getExecutionStatus/?ip=" + ip + "";

    $.ajax({
        url: url,
        async: true,
        success: function (result) {
            try {
                var res = result.toString().split(":");//false:47
                if (show == 0) {
                    if (res[0] == "false") {
                        if (res[1] >= 100) {
                            res[1] = 99;
                        }
                        $('#spanCronMessage').html("Compliance execution  in progress(" + res[1] + "%).....");
                    } else {
                        clearInterval(interVal);
                        interVal = '';
                        var text = $('#spanCronMessage').html();
                        if (text.length > 5) {
                            $('#spanCronMessage').html("<span style='color:green'>Compliance execution finished !! <span>");
                            sessionStorage.setItem("currentRunningIp", "");
                        }
                    }
                    return;
                }
                if (res[0] == "false") {
                    if (res[1] >= 100) {
                        res[1] = 99;
                    }
                    $('#spanCronMessage').html("Compliance execution in progress(" + res[1] + "%).....");
                } else {
                    clearInterval(interVal);
                    interVal = '';
                    sessionStorage.setItem("currentRunningIp", "");
                    $('#spanCronMessage').html("<span style='color:green'>Compliance execution finished !! <span>");
                }
                return result;
            } catch (e) {
                alert(e);
            }
        }, error: function (jqxhrFail, exception) {
            errorHandler(jqxhrFail);
        }
    });
    return false;
}

function getIps() {
    var html = '';
    $.ajax({
        dataType: 'json',
        async: false,
        cache: false,
        url: API_CALL_PREFIX + "getIPs/"
    }).done(function (response) {
        var machineCount = response.length;
        if (machineCount > 0) {
            //sessionStorage.setItem('gEnrolledTMs', JSON.stringify(response));
            //sessionStorage.setItem('machineCount', machineCount);
            var currentRunningIp = $.trim(sessionStorage.getItem("currentRunningIp"));
            try {
                $.each(response, function (key, value) {
                    var respObj = JSON.parse(value);
                    var ip = $.trim(respObj.ip);
                    var optionValue = $.trim(respObj.nickname);
                    var optionTitle = ip + ' : ' + TM_ACCESS_NORMS[respObj.access].title;
                    var optionClass = TM_ACCESS_NORMS[respObj.access].cssclass;
                    var optionDisabled = true;//'disabled="disabled"';
                    if (respObj.access == 1) {
                        optionDisabled = false;
                        //optionDisabled = '';
                        var optionTitle = ip + ' (' + respObj.osname + ' ' + respObj.osversion + ')';
                    }

                    if (respObj.nickname == "") {
                        var optionValue = ip;
                    }
                    var selected = false;
                    if (currentRunningIp == ip) {
                        var selected = true;
                    }

                    $('#targetmachinesoption').append($('<option>', {
                        value: ip,
                        text: optionValue,
                        title: optionTitle,
                        class: optionClass,
                        selected: selected,
                        disabled: optionDisabled
                    }));
                    //html += '<option value="' + ip + '" title="' + optionTitle + '" class="' + optionClass + '" ' + optionDisabled + '>' + optionValue + '</option>';
                });
                //$("#targetmachinesoption").html(html);
                getProfileListing();
                getServerGroups();
            } catch (e) {
                alert(e);
            }
        } else {
            $("#maincontent").hide();
            $("#no_info").show();
        }
    }).fail(function (jqxhrFail, textStatusFail, errorThrownFail) {
        errorHandler(jqxhrFail);
    });
    return false;
}

function getServerGroups() {
    var html = '';
    var content = {username: 'raxak'};
    $.ajax({
        dataType: 'json',
        method: "post",
        //async: false,
        data: content,
        url: API_CALL_PREFIX + "getGroups/",
    }).done(function (response) {
        var groupcounts = response.length;
        if (groupcounts) {
            $.each(response, function (key, value) {
                var data = JSON.parse(value);
                var groupname = $.trim(data.groupname);
                html += '<option value="' + groupname + '">' + groupname + '</option>';
            });
        }
        //sessionStorage.setItem('groupTms_' + groupname, groupips);
        $('#servergroupsoption').html(html);
    });
}

function nextsteps(stab) {
    var message = '';
    var error = false;
    var ismanual = $('#remedmodemanual').is(':checked');
    var isautomatic = $('#remedmodeautomatic').is(':checked');

    switch (stab) {
        case "1": //select tab Remediation Mode
            var selectedprofile = $('#selectprofile option:selected').val();
            if (selectedprofile === '') {
                message = "Please select profile";
                error = true;
            } else {
                $('#selectedprofile').text(selectedprofile);
            }
            break;
        case "2": //select tab Frequency
            if (!ismanual && !isautomatic) {
                message = "Please select remediation mode";
                error = true;
            }
            if (ismanual) {
                //stab = '3'; // direct jump to apply profile tab if remediation mode is manual.
                $('#selectedremdmode').text('Manual');
                $('#frequencycontent').hide();
            }
            if (isautomatic) {
                $("#croninterval").prop("disabled", false);
            }
            break;
        case "3": //select tab Apply Profile
            var croninterval = $('#croninterval option:selected').val();
            if (croninterval === '') {
                message = "Please select cron interval";
                error = true;
            } else {
                if (isautomatic) {
                    $('#frequencycontent').show();
                    $('#selectedremdmode').text('Automatic');
                    $('#selectedfrequency').text(croninterval);
                }
            }
            break;
        case "4":

            break;
    }

    if (error) {
        swal({
            // title: 'Warning!',
            type: 'warning',
            text: message //'Please select select profile',
        });
        return false;
    }

    var lis = $("ul.resp-tabs-list > li");
    lis.removeClass("resp-tab-active");
    $("ul.resp-tabs-list li[aria-controls='tab_item-" + stab + "']").addClass("resp-tab-active");
    var divs = $("#horizontalTab .resp-tabs-container > div");
    divs.removeClass("resp-tab-content-active").removeAttr("style");
    $("#horizontalTab .resp-tabs-container div[aria-labelledby='tab_item-" + stab + "']").addClass("resp-tab-content-active").attr("style", "display: block;");


}

function backsteps(stab) {
    var lis = $("ul.resp-tabs-list > li");
    lis.removeClass("resp-tab-active");
    $("ul.resp-tabs-list li[aria-controls='tab_item-" + stab + "']").addClass("resp-tab-active");
    var divs = $("#horizontalTab .resp-tabs-container > div");
    divs.removeClass("resp-tab-content-active").removeAttr("style");
    $("#horizontalTab .resp-tabs-container div[aria-labelledby='tab_item-" + stab + "']").addClass("resp-tab-content-active").attr("style", "display: block;");
}

$(document).on("change", "#selectprofile", function () {
    var counts = $('option:selected', this).attr('rules');
    var value = $.trim($('option:selected', this).attr('value'));
    var description = $.trim($('option:selected', this).attr('description'));
    $('#sprofiletab').text("(" + value + ")");
    $('#rulecounts').html('<b>' + counts + ' Rule(s)</b>');
    $('#ruledescription').text(description);
    sessionStorage.setItem('profileApplied', value);
    sessionStorage.setItem(value + '_count', counts);
    //sessionStorage.setItem('currentProfileId', "profile_"+($(this).prop('selectedIndex')+1));
});

$(document).on("change", "#croninterval", function () {
    var frequency = $.trim($('option:selected', this).attr('value'));
    $('#sfrequencytab').text("(" + frequency + ")");
    sessionStorage.setItem('selectedfrequency', frequency);
});

$(function () {
    getIps();
    var selectedremedmode = sessionStorage.getItem('selectedremedmode');
    var selectedfrequency = sessionStorage.getItem('selectedfrequency');
    if (selectedremedmode == "Automatic") {
        $('#remedmodeautomatic').prop("checked", true);
        $('#sremediationtab').text("(Automatic)");
        $("#croninterval").prop("disabled", false);
        var frequency = $("#croninterval option:selected").val();
        $('#sfrequencytab').text("(" + frequency + ")");
    } else {
        $('#remedmodemanual').prop("checked", true);
        $('#sfrequencytab').text('');
    }

    if (selectedfrequency) {
        $("#croninterval").val(selectedfrequency);
    }

    $('#remedmodeautomatic').click(function () {
        if ($(this).is(':checked')) {
            $('#sremediationtab').text("(Automatic)");
            $("#croninterval").prop("disabled", false);
            var frequency = $("#croninterval option:selected").val();
            $('#sfrequencytab').text("(" + frequency + ")");
            sessionStorage.setItem('selectedremedmode', 'Automatic');
        }
    });

    $('#remedmodemanual').click(function () {
        if ($(this).is(':checked')) {
            $('#sremediationtab').text("(Manual)");
            $('#sfrequencytab').text('');
            $("#croninterval").prop("disabled", true);
            $("#croninterval").val("One time"); // reset at default option
            sessionStorage.setItem('selectedremedmode', 'Manual');
            sessionStorage.setItem('selectedfrequency', '');
        }
    });
});