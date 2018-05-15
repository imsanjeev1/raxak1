/* 
 * Js for Common functions which can be called in multiple/all pages
 */
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
var errorHandler = function (jqxhr) {
    var message;
    var statusErrorMap = {
        //'0': "Not connected.\nPlease verify your network connection.",
        '400': "Server understood the request, but request content was invalid.",
        '401': "Unauthorized access.",
        '403': "Forbidden resource can't be accessed.",
        '404': "The requested URL not found.",
        '500': "Internal server error.",
        '502': "Bad gateway.",
        '503': "Service unavailable.",
        '504': "Server is taking too long to respond. Try again later.",
    };

    if ((jqxhr.status !== 0)) {
        message = statusErrorMap[jqxhr.status];
        $('#ajaxloader').hide();
        if (!message) {
            message = "Unknown Error.";
        }
        if ((jqxhr.status == 403)) {
            sessionStorage.clear(); // destroy all session.
            window.location.href = 'login.html';
        } else if (jqxhr.status == 404 || jqxhr.status == 502) {
            sessionStorage.clear(); // destroy all session.
            window.location.href = 'maintenance.html';
        } else if(jqxhr.status == 504){
            swal({
                //title: 'Error',
                text: message,
                type: 'error'
            });
            return;
        } else {
            swal({
                //title: 'Error',
                text: 'Error : ' + message,
                type: 'error'
            });
            return;
        }
    }
};

// Get the version number of the code

var getAPPVersion = function () {
    if (sessionStorage.getItem('osversion')) {
        $("#version").html(sessionStorage.getItem('osversion'));
        return;
    }

    $.ajax({
        timeout: DEFAULT_TIMEOUT,
        url: API_CALL_PREFIX + "version/"
    }).done(function (responseData) {
        APP_VERSION = responseData;
        sessionStorage.setItem('osversion', responseData);
        $("#version").html(APP_VERSION);
    }).fail(function (jqxhrFail, textStatusFail, errorThrownFail) {
        errorHandler(jqxhrFail);
    });
};

//Onclick cancel Event 
function CancelHide() {
    $('#feedback_error_message').text('');
    $('#feedbackmsg').val('');
    $('#feedback').modal('hide');
}
//Feedback JS Function
var feedback = function () {
    var feedbackmsg = $('#feedbackmsg').val();
    var content = {'feedback': feedbackmsg};
    if (feedbackmsg != '') {
        $('#feedback_error_message').val('');
        $('#feedback').modal('hide');
        $.ajax({
            method: 'POST',
            data: content,
            timeout: DEFAULT_TIMEOUT,
            url: API_CALL_PREFIX + "feedback/"
        }).done(function (data) {
            swal({
                text: 'Feedback has been sent successfully.',
                type: "success",
            });
        }).fail(function (jqxhrFail, textStatusFail, errorThrownFail) {
            errorHandler(jqxhrFail);
        });
        $('#feedbackmsg').val('');
    } else {
        $('#feedback_error_message').text("Field can't be blank");
        return false;
    }
}
//Hide Ticket function
function CancelHideTicket() {
    $('#ticket_error_message').text('');
    $('#issueid').val('');
    $('#titleid').val('');
    $('#vmid').val('');
    $('#descid').val('');
    $('#createticket').modal('hide');
}
//CreateTicket JS Function
var CreateTicket = function () {
    error_flag = false;
    error_msg = '';
    var issueid = $('#issueid').val();
    var titleid = $('#titleid').val();
    var vmid = $('#vmid').val();
    var descid = $('#descid').val();
    if (issueid === '') {
        error_flag = true;
        $('#issueid').focus();
        error_msg = 'Please select issue type';
    }
    else if (titleid === '') {
        error_flag = true;
        $('#titleid').focus();
        error_msg = 'Please enter issue title';
    }
    else if (vmid === '') {
        error_flag = true;
        $('#vmid').focus();
        error_msg = 'Please enter virtual Machine/group name';
    }
    else if (descid === '') {
        error_flag = true;
        $('#descid').focus();
        error_msg = 'Please enter description';
    }
    var content = {'issueid': issueid, 'titleid': titleid, 'vmid': vmid, 'descid': descid};
    if (error_flag) {
        $('#ticket_error_message').text(error_msg);
        return false;
    } else {
        $.ajax({
            method: 'POST',
            data: content,
            timeout: DEFAULT_TIMEOUT,
            url: API_CALL_PREFIX + "CreateTicket/"
        }).done(function (data) {
            swal({
                text: 'Ticket successfully created.',
                type: "success",
            });
        }).fail(function (jqxhrFail, textStatusFail, errorThrownFail) {
            errorHandler(jqxhrFail);
        });
        $('#issueid').val('');
        $('#titleid').val('');
        $('#vmid').val('');
        $('#descid').val('');
        $('#createticket').modal('hide');
    }

}

function onclickResetpasswordvalue() {
    $('#old_password').val('');
    $('#regpwd_id').val('');
    $('#reenterpassword').val('');
    $('#regpwd_text_id').val('');
    $('#reset_error_message').text('');
    $("#regpwd_show_anch").show();
    $("#regpwd_show_anch").text('show');
    $('#regpwd_strength_str').text('');
    $('#regpwd_strength_bar').removeAttr('style');
}
function mask_hide() {
    $("#regpwd_show_anch").show();
    $("#regpwd_show_anch").text('hide');
    $('#regpwd_strength_str').text('');
    $('#regpwd_strength_bar').removeAttr('style');
    //$('#regpwd_text_id').val('');
}

error_flag = false;
error_msg = '';
var ResetPassword = function () {
    $('#reset_error_message').text('');
    var regex = /^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$%^&*-]).{8,}$/;
    var oldpassword = $('#old_password').val();
    var newpassword = $('#regpwd_id').val();
    var confirm_password = $('#reenterpassword').val();
    if (oldpassword === '') {
        //error_flag = true;
        $('#old_password').focus();
        //error_msg = 'Please Enter old Password';
        $('#old_msg').text('Please Enter old Password');
        return false;
    }else{
     $('#old_msg').text('');}
    if (newpassword === '') {
        //error_flag = true;
        $('#regpwd_id').focus();
        //error_msg = 'Please Enter New Password';
        $('#new_msg').text('Please Enter New Password');
        return false;

    }else{$('#new_msg').text('');}
    if (!newpassword.match(regex)) {
        //error_flag = true;
        $('#regpwd_id').focus();
        error_msg = 'Minimum 8 characters at least 1 uppercase, 1 lowercase, 1 number and 1 special character';
        $('#new_msg').text('Minimum 8 characters at least 1 uppercase, 1 lowercase, 1 number and 1 special character.');
        return false;
    }else{$('#new_msg').text('');}
    if (confirm_password === '') {
        error_flag = true;
        $('#reenterpassword').focus();
        //error_msg = 'Please Re-enter your password';
        $('#reenter_msg').text('Please Re-enter your password');
        return false;
    }else{ $('#reenter_msg').text('');}
    if (newpassword != confirm_password) {
        //error_flag = true;
        $('#reenterpassword').focus();
        $('#reenter_msg').text('Password not match with new password');
        return false;
        //error_msg = 'Password not match with new password';
    }else{$('#reenter_msg').text('');}
    if (newpassword == confirm_password) {
        error_flag = false;
    }
    var content = {'oldpassword': oldpassword, 'newpassword': newpassword};
    if (error_flag) {
        $('#eset_error_message').text(error_msg);
        error_msg = '';
        return false;
    }
    else {
        $.ajax({
            method: 'POST',
            data: content,
            timeout: DEFAULT_TIMEOUT,
            url: API_CALL_PREFIX + "ResetPassword/"
        }).done(function (data) {
            if (data[0].status == true) {
                $('#resetpassword').modal('hide');
                swal({
                    text: 'Password successfully Reset.',
                    type: "success"
                });
                $('#old_password').val('');
                $('#regpwd_id').val('');
                $('#reenterpassword').val('');

            } else {
                $('#reset_error_message').text('Old Password not matched');
                $("#regpwd_show_anch").show();
                $("#regpwd_show_anch").text('show');
                $('#regpwd_strength_str').text('');
                $('#old_password').val('');
                $('#regpwd_id').val('');
                $('#reenterpassword').val('');
                $('#regpwd_text_id').val('');
            }
        }).fail(function (jqxhrFail, textStatusFail, errorThrownFail) {
            errorHandler(jqxhrFail);
        });
    }
};

//End--------------------------//
var getUserDetail = function () {
    //-- check user session, if exist dont't call the API.
    var userSession = sessionStorage.getItem('logged_user');
    if (userSession) {
        gLoggedUser = JSON.parse(userSession); //convert in object.
    } else {
        $.ajax({
            dataType: 'json',
            timeout: DEFAULT_TIMEOUT,
            async: false,
            url: API_CALL_PREFIX + "whoAmI/"
        }).done(function (response) {
            var count = Object.keys(response).length;
            if (count > 0) {
                gLoggedUser = response;
                sessionStorage.setItem('logged_user', JSON.stringify(gLoggedUser));
            } else {
                window.location.href = 'login.html';
                return false;
            }
        }).fail(function (jqxhrFail, textStatusFail, errorThrownFail) {
            errorHandler(jqxhrFail);
        });
    }

    var loginIcon = IMG_DIR + "crlogo-white.png";
    switch (gLoggedUser.login) {
        case "Google":
            loginIcon = IMG_DIR + "ggle_icn.jpg";
            break;
        case "Amazon":
            loginIcon = IMG_DIR + "amzn_icn.jpg";
            break;
        case "IBM":
            loginIcon = IMG_DIR + "ibm_icn.jpg";
            break;
        case "HP":
            loginIcon = IMG_DIR + "hp_icn.jpg";
            break;
    }

    var checkloginname = gLoggedUser.login;
    if (checkloginname == 'Local Auth') {
        $('#reset_hide').show();
    }
    else {
        $('#reset_hide').hide();
    }
    $("#username").text(gLoggedUser.email);
    $("#version").text(gLoggedUser.codeversion);
    $("#authenticator").html("<img src='" + loginIcon + "'/>");
    getCustomProfileListing();
};

function compareRuleProfiles(p1, p2) {
    if (p1.profilename < p2.profilename)
        return -1;
    else if (p1.profilename > p2.profilename)
        return 1;
    else
        return 0;
}

function getCustomProfileListing() {
    var html = '';
    var RuleProfiles = [];
    var customProfileOptions = $.trim(sessionStorage.getItem('customProfileOptions'));
    if (customProfileOptions) {
        var profileOptionsObj = JSON.parse(customProfileOptions);
        html += '<option value="" rules="0">Select</option>';
        $.each(profileOptionsObj, function (key, value) {
            var counts = "";
            var value = $.trim(profileOptionsObj[key].profilename);
            if (parseInt(profileOptionsObj[key].rulescount) > 0) {
                counts = parseInt(profileOptionsObj[key].rulescount);
            }
            html += '<option value="' + value + '" rules="' + counts + '">' + value + '</option>';
        });
        $("#customprofile").html(html);
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
                    html += '<option value="" rules="0">None</option>';
                    $.each(RuleProfiles, function (key, value) {
                        var counts = "";
                        var value = $.trim(RuleProfiles[key].profilename);
                        var profilename = value.replace(/[^a-z0-9]+/gi, '_').toLowerCase();
                        if (parseInt(RuleProfiles[key].rulescount) > 0) {
                            counts = parseInt(RuleProfiles[key].rulescount);
                            sessionStorage.setItem(profilename + '_counts', counts);
                        }
                        html += '<option value="' + value + '" rules="' + counts + '">' + value + '</option>';
                    });
                    sessionStorage.setItem('customProfileOptions', JSON.stringify(RuleProfiles));
                    $("#customprofile").html(html);
                } catch (e) {
                    alert(e);
                }
            }, error: function (jqxhrFail) {
                errorHandler(jqxhrFail);
            }
        });
    }
}

function customsetup() {
    $('#custom_error_message').text('');
    $('#customusername').val('raxak');
    $('#customprofile').val('');
    $('#customenroll').prop('checked', false);
    $("#customenrollcontent").hide();
    $("#cremedationcontent").hide();
    $('#customremidiatemanual').prop('checked', true);
    $("#customcroninterval").prop('selectedIndex', 0);
    $("#customcroninterval").prop("disabled", true);
    $('#customsetup').modal('show');
}
function addCustomSetUp() {
    var error_flag = false;
    var error_msg = '';
    var customenroll = 'False';
    var customusername = $("#customusername").val();
    var customprofile = $("#customprofile").val();
    var custominterval = $("#customcroninterval").val();

    if ($('#customenroll').prop("checked")) {
        customenroll = 'True';
    }

    if ($('#customremidiateautomatic').prop("checked")) {
        var remidiation = true;
        var repeat = custominterval;
    } else {
        var remidiation = false;
        var repeat = 'once';
    }
    if (customusername === '') {
        error_flag = true;
        $('#customusername').focus();
        error_msg = 'Please enter user name';
    }
    /*
     if (customusername === '') {
     error_flag = true;
     $('#customusername').focus();
     error_msg = 'Please enter user name';
     } else if (customprofile === '') {
     error_flag = true;
     $('#user_name').focus();
     error_msg = 'Please select profile';
     }
     */

    if (customprofile === '') {
        customprofile = "None";
    }

    if (error_flag) {
        $('#custom_error_message').text(error_msg);
        return false;
    } else {
        var url = "/raxakapi/v1/customsetup/" + customusername + "/" + customenroll + "/" + customprofile + "/" + remidiation + "/" + repeat;
        $.ajax({
            type: "POST",
            url: url,
            success: function (response, status, xhr) {
                $('#customsetup').modal('hide'); // hide model box before downlaod popup.
                // check for a filename
                var filename = "";
                var disposition = xhr.getResponseHeader('Content-Disposition');

                if (disposition && disposition.indexOf('attachment') !== -1) {
                    var filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
                    var matches = filenameRegex.exec(disposition);
                    if (matches != null && matches[1])
                        filename = matches[1].replace(/['"]/g, '');
                }

                var type = xhr.getResponseHeader('Content-Type');
                var blob = new Blob([response], {type: type});
                if (typeof window.navigator.msSaveBlob !== 'undefined') {
                    window.navigator.msSaveBlob(blob, filename);
                } else {
                    var URL = window.URL || window.webkitURL;
                    var downloadUrl = URL.createObjectURL(blob);
                    if (filename) {
                        // use HTML5 a[download] attribute to specify filename
                        var a = document.createElement("a");
                        // safari doesn't support this yet
                        if (typeof a.download === 'undefined') {
                            window.location = downloadUrl;
                        } else {
                            a.href = downloadUrl;
                            a.download = filename;
                            document.body.appendChild(a);
                            a.click();
                        }
                    } else {
                        window.location = downloadUrl;
                    }

                    setTimeout(function () {
                        URL.revokeObjectURL(downloadUrl);
                    }, 100); // cleanup
                }
            }
        });
    }
}

var getBrowser = function () {
    if (navigator.userAgent.indexOf("Firefox") != -1) {
        return 'Firefox';
    } else if (navigator.userAgent.indexOf("Chrome") != -1) {
        return 'Chrome';
    } else if (navigator.userAgent.indexOf("Safari") != -1) {
        return 'Safari';
    } else if ((navigator.userAgent.indexOf("Opera") || navigator.userAgent.indexOf('OPR')) != -1) {
        return 'Opera';
    } else if ((navigator.userAgent.indexOf("MSIE") != -1) || (!!document.documentMode == true)) { //IF IE > 10
        return 'Internet Explorer';
    } else {
        return 'other';
    }
};

$(document).on("click", "#customremidiateautomatic", function () {
    if ($(this).is(':checked')) {
        $("#customcroninterval").prop("disabled", false);
    }
});

$(document).on("click", "#customremidiatemanual", function () {
    if ($(this).is(':checked')) {
        $("#customcroninterval").prop('selectedIndex', 0);
        $("#customcroninterval").prop("disabled", true);
    }
});
$(document).on("click", "#customenroll", function () {
    $("#customenrollcontent").toggle();
    $("#cremedationcontent").hide();
    $("#customprofile").prop('selectedIndex', 0);
    $('#customremidiatemanual').prop('checked', true);
    $("#customcroninterval").prop('selectedIndex', 0);
    $("#customcroninterval").prop("disabled", true);

});
$(document).on("change", "#customprofile", function () {
    var cProfile = $(this).val();
    if (cProfile == '' || cProfile == 'None') {
        $("#cremedationcontent").hide();
        $('#customremidiatemanual').prop('checked', true);
        $("#customcroninterval").prop('selectedIndex', 0);
        $("#customcroninterval").prop("disabled", true);
    } else {
        $("#cremedationcontent").show();
    }
});
//enable enter key should work work when  Reset Password.
$(document).unbind("keyup").keyup(function (e) {
    var code = e.which; // recommended to use e.which, it's normalized across browsers
    //-- enable enter button submit on add 
    if (e.which === 13) {
        ResetPassword();
        //event.stopPropagation();
        e.preventDefault();
        return false;
    }

});

$(document).ready(function () {
    getUserDetail();
});
