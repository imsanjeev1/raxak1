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

var errorHandler = function () {
    $('#image-holder-page').hide();//hide the loader if available.
    $('#errorModal .modal-title').html(gErrorStatus.error[0].identifier);
    $('#errorModal .modal-body').html(gErrorStatus.error[0].custom_msg);
    $('#errorModal').modal('show');
};

function get_user_info() {
    var html = '';
    var user_count = [];
    uri = API_CALL_PREFIX + "Get_User_Info/"
    var firstname = ''
    $.ajax({
        url: uri,
        dataType: 'json',
        timeout: DEFAULT_TIMEOUT,
    }).done(function (response) {
        //var html = '<div class="adv-table editable-table table-responsive"><table class="table table-striped table-hover table-bordered" id="editable-sample"><thead><tr><th width="4%">Edit</th><th width="7%">First Name</th><th  width="7%">Last name</th><th width="12%" >Email</th><th width="7%">Comapny</th><th width="8%">Phone</th><th width="7%">country</th><th width="10%" >Date of Registration </th><th width="5%" >Block</th><th width="5%">Delete</th><th width="10%">Status</th></tr></thead><tbody>';
        var user_info_length = Object.keys(response).length;
        if (user_info_length > 0) {
            $.each(response, function (key, value) {
                var get_profile_data = JSON.parse(value);
                var first_name = get_profile_data.firstname;
                var last_name = get_profile_data.lastname;
                var email = get_profile_data.email;
                var company = get_profile_data.company;
                var phone = get_profile_data.phone;
                var country = get_profile_data.country;
                var date = get_profile_data.date;
                var user_length = first_name.length;
                user_count.push(first_name);

                html += "<tr>";
                html += '<td align="center"><a class="edit" href="javascript:;"><i class="fa fa-fw fa-pencil"></i></a></td>';
                html += "<td>" + first_name + "</td>";
                html += "<td>" + last_name + "</td>";
                html += "<td>" + email + "</td>";
                html += "<td>" + company + "</td>";
                html += "<td>" + phone + "</td>";
                html += "<td>" + country + "</td>";
                html += "<td>" + date + "</td>";
                html += '<td align="center"><a class="delete" href="javascript:;"><i class="fa fa-fw fa-ban"></i></a></td>';
                html += '<td align="center"><a class="delete" href="javascript:;"><i class="fa fa-fw fa-trash-o"></i></a></td>';
                html += '<td>Email confirmation is pending</td>';
                html += "</tr>";
            });
            var user_length1 = user_count.length;
            //html += "</table>";
            $("#usercounts").html(user_length1);
            $("#editable-sample tbody").html(html);
        }
    }).fail(function (jqxhrFail, textStatusFail, errorThrownFail) {
        if (textStatusFail === "timeout") {
            gErrorStatus["error"].push({identifier: 'getAPPVersion', custom_msg: TIMEOUT_MESSAGE, message: errorThrownFail});
        } else {
            gErrorStatus["error"].push({identifier: 'getAPPVersion', custom_msg: errorThrownFail, message: errorThrownFail});
        }
        errorHandler();
    });
}

$(document).ready(function () {
    get_user_info();
});
