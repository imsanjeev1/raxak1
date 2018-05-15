/* 
 * Js for Select Profile/Profile details Page
 */

/* Get profile list */

//Start: Constants//
var MEDIA_DIR = './';//static/
var IMG_DIR = MEDIA_DIR + 'images/';
var CSS_DIR = MEDIA_DIR + 'css/';
var JS_DIR = MEDIA_DIR + 'js/';
var ipDetails = [];
var value_array = new Array();
var key_array = [];
var target_machine_count = [];
var get_show_executiondata = [];
var show_key = '';
var ip = '';
var frequency = '';
var nextrun = '';
var DEFAULT_PROFILE = "Demonstration Profile"; // Demonstration Profile

var API_CALL_PREFIX = "../raxakapi/v1/";
var DEFAULT_TIMEOUT = 10 * 1000;//10 seconds
var TIMEOUT_MESSAGE = 'Retry the web page by clicking the refresh/reload button, <br> if the problem persists then please contact the raxak administrator for further assistance.';

function getProfileListing() {
    var jsHTML = "";
    var RuleProfiles = [];
    // var RuleCounts = [];
    // var RuleDescriptions = [];
    var selectedheader = '';
    var selectedprofile = $.trim(sessionStorage.getItem('selectedProfile'));
    if (sessionStorage.getItem('profileHTML') && selectedprofile) {
        var currentProfileId = sessionStorage.getItem('currentProfileId');
        var currentprofileHtml = sessionStorage.getItem('currentprofileHtml');
        var currentprofileCounts = sessionStorage.getItem(selectedprofile + "_count");
        $("#theMenu").html(sessionStorage.getItem('profileHTML'));
        $("#theMenu li h3").removeClass('selected');
        $('#' + currentProfileId).parent('h3').addClass('selected');
        $('#' + currentProfileId).find('span:first').text(" (" + currentprofileCounts + ")");
        $('#' + currentProfileId).parent('h3').parent('li').find('ul li').html(currentprofileHtml);
        initAccordina();
        $('#image-holder-page').hide();
        return;
    }

    $.ajax({
        timeout: DEFAULT_TIMEOUT,
        url: API_CALL_PREFIX + "profileDetails/",
        async: false,
        success: function (responseData) {
            try {
                var profiles = JSON.parse(responseData);
                $.each(profiles, function (key, value) {
                    RuleProfiles.push(value);
                });

                RuleProfiles.sort(compareRuleProfiles);

                var i = 1;
                $.each(RuleProfiles, function (key, value) {
                    var temp_value = $.trim(RuleProfiles[key].profilename);
                    var counts = "";
                    if (parseInt(RuleProfiles[key].rulescount) > 0) {
                        counts = " (" + parseInt(RuleProfiles[key].rulescount) + ")";
                    }
                    jsHTML += "<li>";
                    if (selectedprofile == temp_value && (selectedprofile != 'null' || selectedprofile != '')) {
                        selectedheader = selectedprofile;
                        $('#selectedProfile').val(selectedprofile);
                        jsHTML += "<h3 class='head selected'>";
                    } else if (temp_value == DEFAULT_PROFILE && (selectedprofile == 'null' || selectedprofile == '')) {
                        sessionStorage.setItem('selectedProfile', DEFAULT_PROFILE);
                        selectedheader = temp_value;
                        var dataresults = getinternalHtml(RuleProfiles[key].profilename);
                        sessionStorage.setItem('currentprofileHtml', dataresults['html']);
                        sessionStorage.setItem('currentProfileId', 'profile_' + i);
                        //set the default profile when load the page.
                        $('#selectedProfile').val(temp_value);
                        //sessionStorage.setItem('selectedProfile', temp_value);
                        jsHTML += "<h3 class='head selected'>";
                        jsHTML += "<a href='javascript:void(0);' class='tip' \
                                    onClick='setcurrentprofile(" + "\"" + RuleProfiles[key].profilename + "\",this);' \
                                    id='profile_" + i + "'>" + RuleProfiles[key].profilename + "<span>" + counts + "</span>\
                                    <span class='profile_access_white'>View Details<span class='profile-tooltip'>" + RuleProfiles[key].description + "</span></span></a>"
                        jsHTML += "</h3>";
                        jsHTML += " <ul id='xtraMenu' style='display:block;margin-top:5px;'><li><div class='table-responsive'>";
                        jsHTML += dataresults['html'];
                        jsHTML += " </div></li></ul>";
                    } else {
                        jsHTML += "<h3 class='head'>";
                        jsHTML += "<a href='javascript:void(0);' class='tip' \
                                    onClick='setcurrentprofile(" + "\"" + RuleProfiles[key].profilename + "\",this);' \
                                    id='profile_" + i + "'>" + RuleProfiles[key].profilename + "<span>" + counts + "</span>\
                                    <span class='profile_access_blue'>View Details<span class='profile-tooltip'>" + RuleProfiles[key].description + "</span></span></a>"
                        jsHTML += "</h3>";
                        jsHTML += " <ul id='xtraMenu' style='display: block;margin-top:5px;'><li><div class='table-responsive'>";
//                      jsHTML += dataresults['html'];//getinternalHtml(RuleProfiles[key]);
                        jsHTML += " </div> </li> </ul>";
                    }
                    jsHTML += "</li>";
                    i++;
                });
                $("#theMenu").html(jsHTML);
                sessionStorage.setItem('profileHTML', jsHTML);
                sessionStorage.setItem('selectedHead', selectedprofile);
                initAccordina();
                $('#image-holder-page').hide();
            } catch (e) {
                alert(e);
            }
        },
        error: function (jqxhrFail, textStatusFail, errorThrownFail) {
            if (textStatusFail == 'timeout') {
                swal({
                    text: 'AJAX request timed out',
                    type: 'error'
                });
            }
            else {
                errorHandler(jqxhrFail);
            }
        }
    });
}

function setcurrentprofile(currentprofile, obj) {
    $.each($(".tip"), function (index, elem) {
        $(elem).find('span:eq(1)').removeClass("profile_access_white");
        $(elem).find('span:eq(1)').addClass("profile_access_blue");
    });
    $(obj).find('span:eq(1)').addClass('profile_access_white');
    $(obj).find('span:eq(1)').removeClass('profile_access_blue');
    var prev_profile = sessionStorage.getItem('selectedProfile');
    $.each($('#theMenu > li'), function (i, val) {
        $('#theMenu > li > h3').removeClass('closeselected');
    });
    if ((prev_profile == currentprofile || prev_profile == null) && $(obj).parent().hasClass('selected') == true) {
        $(obj).parent().addClass('closeselected');
    }
    $('#selectedProfile').val(currentprofile);
    sessionStorage.setItem('selectedProfile', currentprofile);
    var results = getinternalHtml(currentprofile);
    sessionStorage.setItem('currentProfileId', $(obj).attr('id'));
    sessionStorage.setItem('currentprofileHtml', results['html']);

    $(obj).parent('h3').parent('li').find('ul li').html(results['html']);
}

function getinternalHtml(ruleprofiles) {
    var jsHTMLInternal = "";
    var rulecount = "";
    var results = [];
    var arr = [];
    try {
        if (sessionStorage.getItem(ruleprofiles)) {
            //results['counts'] = '';
            results['html'] = sessionStorage.getItem(ruleprofiles);
            // results['rulecount'] = sessionStorage.getItem(ruleprofiles + "_count");

        } else {
            $.ajax({
                url: API_CALL_PREFIX + "ruleTitle/" + ruleprofiles,
                timeout: DEFAULT_TIMEOUT,
                async: false,
                success: function (result) {
                    rulecount = Object.keys(result).length;
                    jsHTMLInternal += '<table class="table table-hover " width="100%" cellpadding="0" cellspacing="0">';
                    jsHTMLInternal += '<tbody>';
//                    $.each(arr, function (i, val) {
                    $.each(result, function (i, val) {
                        jsHTMLInternal += '<tr><td><a title="Click on a rule to see the detailed description" data-toggle="modal" data-target="#descriptions" href="javascript:void(0);" onClick="displayRuleDesc(' + '\'' + val.rule + '\');">' + val.rule + ' - ' + val.title + '</a></td></tr>';
                    });
                    jsHTMLInternal += '</tbody></table>';
                    results['counts'] = eval(result).length;
                    results['rulecount'] = rulecount;
                    results['html'] = jsHTMLInternal;
                }
            });
            sessionStorage.setItem(ruleprofiles + "_count", rulecount);
            sessionStorage.setItem(ruleprofiles, jsHTMLInternal);
        }
    } catch (e) {
        alert(e);
    }
    return results;
}

function compareRuleProfiles(p1, p2) {
    if (p1.profilename < p2.profilename)
        return -1;
    else if (p1.profilename > p2.profilename)
        return 1;
    else
        return 0;
}

function displayRuleDesc(rulenum) {
    var ruleId = rulenum;
    rulenum = rulenum.substring(2);
    var checkString = '';
    var fixString = '';
    var html = '';
    $.ajax({
        url: API_CALL_PREFIX + "showCheckRule/" + rulenum,
        timeout: DEFAULT_TIMEOUT,
        async: false,
        success: function (result) {
            try {
                var res = result.split("\n");
                checkString = '<h4><b> Check Description: </b></h4>';
                for (i = 0; i < res.length; i++) {
                    if ($.trim(res[i]).length > 0) {
                        if (res[i].slice(0, 1) == "$" || res[i].slice(0, 1) == "#") {
                            checkString = checkString + '<p class="showrules">' + res[i] + '</p>';
                        } else {
                            checkString = checkString + "<p>" + res[i] + "</p>";
                        }
                    }
                }
                $.ajax({
                    url: API_CALL_PREFIX + "showFixRule/" + rulenum,
                    timeout: DEFAULT_TIMEOUT,
                    success: function (htmlResults) {
                        try {
                            var htres = htmlResults.split("\n");
                            fixString = "</br><h4><b>Fix Description: </b></h4>";
                            for (i = 0; i < htres.length; i++) {
                                if ($.trim(htres[i]).length > 0) {
                                    if (htres[i].slice(0, 1) == "#" || htres[i].slice(0, 1) == "$") {
                                        fixString = fixString + '<p class="showrules">' + htres[i] + '</p>';
                                    } else {
                                        fixString = fixString + "<p>" + htres[i] + "</p>";
                                    }
                                }
                            }
                        } catch (e) {
                            alert(e);
                        }
                        html += checkString;
                        html += fixString;
                    },
                    complete: function () {
                        $('#my_header').text('Rule ' + ruleId);
                        $("#modal_body").html(html);
                        $('#descriptions').modal('show');
                    },
                });
            } catch (e) {
                alert(e);
            }
        }
    });
}
$(function () {
    getProfileListing();
});
