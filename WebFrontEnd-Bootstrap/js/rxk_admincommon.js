/* 
 * Js for Common functions which can be called in multiple/all pages
 */

//********** ********** Start: Config ********** **********//

//Start: Constants//

var MEDIA_DIR = './';//static/
var IMG_DIR = MEDIA_DIR + 'images/';
var CSS_DIR = MEDIA_DIR + 'css/';
var JS_DIR = MEDIA_DIR + 'js/';

var API_CALL_PREFIX = "../raxakapi/v1/";
var DEFAULT_TIMEOUT = 10 * 1000;//10 seconds
var TIMEOUT_MESSAGE = 'Retry the web page by clicking the refresh/reload button, <br> if the problem persists then please contact the raxak administrator for further assistance.';


var APP_VERSION = '';//One time value by API call
//End: Constants//

//Start: Global variables//

var gLoggedUser;//One time Value by API call

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
        '503': "Service unavailable."
    };

    if ((jqxhr.status !== 0)) {
        message = statusErrorMap[jqxhr.status];
        if (!message) {
            message = "Unknown Error.";
        }
        if ((jqxhr.status == 403)) {
            sessionStorage.clear(); // destroy all session.
            window.location.href = 'admin.html';
        } else if (jqxhr.status == 404 || jqxhr.status == 502) {
            sessionStorage.clear(); // destroy all session.
            window.location.href = 'maintenance.html';
        } else {
            $('#ajaxloader').hide();
            swal({
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

// Get the username and other user information

var getUserDetail = function () {
    var gLoggedUser = '';
    //-- check user session, if exist dont't call the API.
    var userSession = sessionStorage.getItem('logged_user');
    if (userSession) {
        gLoggedUser = JSON.parse(userSession); //convert in object.
    } else {
        $.ajax({
            dataType: 'json',
            async: false,
            timeout: DEFAULT_TIMEOUT,
            url: API_CALL_PREFIX + "whoAmI/"
        }).done(function (response) {
            var count = Object.keys(response).length;
            if (count > 0) {
                gLoggedUser = response;
                sessionStorage.setItem('logged_user', JSON.stringify(gLoggedUser));
            } else {
                window.location.href = 'admin.html';
                return false;
            }
        }).fail(function (jqxhrFail, textStatusFail, errorThrownFail) {
            errorHandler(jqxhrFail);
        });
    }
    $("#username").text(gLoggedUser.email);
    $("#version").text(gLoggedUser.codeversion);
};

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

$(document).ready(function () {
    //getUserDetail();
});