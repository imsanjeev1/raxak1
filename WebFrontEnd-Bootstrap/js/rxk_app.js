//********** ********** Start: Config ********** **********//

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

var API_CALL_PREFIX = "../raxakapi/v1/";
var DEFAULT_TIMEOUT = 10 * 1000;//10 seconds
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
TM_ACCESS_NORMS["-5"] = {status: "In progress", class: "grayclass", cssclass: "text-active", title: "Access check in progress"};
TM_ACCESS_NORMS["-6"] = {status: "Cannot VPN", class: "pingnotreachableclass", cssclass: "danger", title: "Cannot VPN"};
TM_ACCESS_NORMS["-99"] = {status: "Already exists", class: "pingreachclass", cssclass: "", title: "Target machine already exists"};
//End: Do Not delete code (contains additional access codes -6 and -99)

var APP_VERSION = '';//One time value by API call
//End: Constants//

//Start: Global variables//
var gLoggedUser;//One time Value by API call
var gSessionData;
var gEnrolledTMs;//Value by API call
var gEnrolledTMCount;//Value by API call

var gFlagError = false;
var gErrorStatus = {error: []};

var gSelectedTM;
var gSelectedTimestamp;
var gSelectedProfile;
var gFlagExecution = false;
var gCurrentExecutionOnTMs = '';
var gLastExecutedAtTimestamp;//Value by API call
var gLastExecutedOnTMs;//Value by API call
var gCustomClientTimeDisplay;
var gWidgetDisplays = [];

var gCSVFileFlag = false;
var gCSVIPDetail = [];
//End: Global variables//

//********** ********** End: Config ********** **********//

//********** ********** Start: Onload APP ********** **********//

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

// Get the list of IP addresses enrolled by current user
var getTMs = function () {
    $.ajax({
        dataType: 'json',
        timeout: DEFAULT_TIMEOUT,
        async: false,
        url: API_CALL_PREFIX + "getIPs/"
    }).done(function (responseData) {
        gEnrolledTMs = responseData;
        gEnrolledTMCount = gEnrolledTMs.length;
        sessionStorage.setItem('gEnrolledTMs', JSON.stringify(gEnrolledTMs));
        sessionStorage.setItem('gEnrolledTMCount', gEnrolledTMCount);
        $("#enrolledIPs").html(gEnrolledTMCount);
        //$('.singleaccess, .edit_tm_info, .delete').parent().attr('align','center');
    }).fail(function (jqxhrFail, textStatusFail, errorThrownFail) {
    	if(textStatusFail == 'timeout'){
    	    	swal({
    	            text: 'AJAX request timed out',
    	            type: 'error'
    	        });
    	    } else{
    	         errorHandler(jqxhrFail);
    	     }
       // errorHandler(jqxhrFail);
    });
};

var get_ip_details = function () {
    $.ajax({
        dataType: 'json',
        timeout: 1,
        url: API_CALL_PREFIX + "getlastrunIPs"
    }).done(function (responseData) {
        var lastTMS = responseData;
        var html = "<div class='table-responsive'><table class='table table-hover'><thead>" +
                "<tr><th>Enrolled Machine</th><th>Nickname</th><th>Status</th></tr></thead><tbody>";

        $.each(lastTMS, function (key, value) {
            $.get(API_CALL_PREFIX + "showExecutionStatus/" + key, function (showdata) {
                ipDetails[key] = [];
                ipDetails[key]['executionstatus'] = showdata;
                target_machine_count.push(key);
                get_show_executiondata.push(showdata);
                //start
                var status = '';
                if (showdata.match('execution completed')) {
                    status += 'Completed';
                    $("#spin_id").css("display", "none");
                    $("#change_value").html("Completed");
                    $("#spin_idd").css("display", "block");
                }
                else {
                    status += 'In Progress';
                    $("#spin_idd").css("display", "none");
                    $("#spin_id").css("display", "moz-stack");
                }
                html += "<tr>";
                html += "<td>" + key + "</td>";
                html += "<td>" + value + "</td>";
                html += "<td>" + status + "</td>";
                html += "</tr>";
                $("#numberMachines").html($(unique(target_machine_count)).length);
                $("#spinnerText").html($(unique(target_machine_count)).length);
                $("#lastrunIPs").html(html);
                //$("#spinner").html(html);
                $("#active_machine").html(html);
                html += "</tbody></table></div>";
            });

        });//each close
    }).fail(function (jqxhrFail, textStatusFail, errorThrownFail) {
        //errorHandler(jqxhrFail);
        if(textStatusFail == 'timeout'){
	    	swal({
	            text: 'AJAX request timed out',
	            type: 'error'
	        });
	    }
	    else{
	         errorHandler(jqxhrFail);
	     }
    });
};
//********** ********** End: Onload APP ********** **********//
