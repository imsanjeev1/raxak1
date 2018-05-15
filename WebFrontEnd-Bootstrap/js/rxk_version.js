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
var errorHandler = function (jqxhr) {
    if ((jqxhr.status == '404') || (jqxhr.status == '502')) {
        window.location.href = 'login.html';
    } else {
        $('#errorModal .modal-title').html('Error');
        $('#errorModal .modal-body').html('Getting error : ' + jqxhr.statusText);
        $('#errorModal').modal('show');
        return;
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

// Get the username and other user information
var getUserDetail = function () {
    $.ajax({
        dataType: 'json',
        timeout: DEFAULT_TIMEOUT,
        url: API_CALL_PREFIX + "whoAmI/"
    }).done(function (responseData) {
        gLoggedUser = responseData;

        //Encode ALL data before storing in session for SECURITY!!!
        sessionStorage.setItem('logged_user', JSON.stringify(gLoggedUser));
        $("#logged_user").html(gLoggedUser['email']);
        $("#username").html(gLoggedUser['user']);
        var loginIcon = IMG_DIR + "crlogo.png";
        switch (gLoggedUser['login']) {
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
        $("#authenticator").html("<img src='" + loginIcon + "'/>");
    }).fail(function (jqxhrFail, textStatusFail, errorThrownFail) {
        errorHandler(jqxhrFail);
    });
};
$(document).ready(function () {
    getAPPVersion();
    getUserDetail();
});
