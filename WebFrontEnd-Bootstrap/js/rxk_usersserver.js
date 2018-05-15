/* 
 * Js for User management
 */
var API_CALL_PREFIX = "../raxakapi/v1/";
var DEFAULT_TIMEOUT = 10 * 1000;//10 seconds
var editobject = '';

var errorHandler = function (jqxhr) {
    if ((jqxhr.status == '404') || (jqxhr.status == '502')) {
        window.location.href = 'maintenance.html';
    } else {
        $('#errorModal .modal-title').html('Error');
        $('#errorModal .modal-body').html('Getting error : ' + jqxhr.statusText);
        $('#errorModal').modal('show');
        return;
    }
};

function getUserIps(username) {
    var html = '';
    var uri = API_CALL_PREFIX + "getUserIPs/" + username;
    $.ajax({
        url: uri,
        dataType: 'json',
        async: false,
        timeout: DEFAULT_TIMEOUT,
    }).done(function (response) {
        var user_info_length = Object.keys(response).length;
        if (user_info_length > 0) {
            $.each(response, function (key, value) {
                //var get_profile_data = JSON.parse(value);
                var data = JSON.parse(value);
                if (data.ip === data.nickname || data.nickname == '') {
                    var nickname = '--';
                } else {
                    var nickname = data.nickname;
                }
                if (data.hasOwnProperty('tunnelUsername')) {
                    var privateip = data.tunnelUsername;
                } else {
                    var privateip = 'N/A';
                }
                html += "<tr id=" + data.ip + ">";
                html += "<td>" + data.ip.split('@')[0] + "</td>";
                html += "<td>" + data.ip.split('@')[1] + "</td>";
                html += "<td>" + nickname + "</td>";
                html += "<td>" + privateip + "</td>";
                html += '<td align="center"><a class="delete" href="javascript:;"><i class="fa fa-fw fa-trash-o"></i></a></td>';
                html += "</tr>";
            });
            $("#usercounts").text(user_info_length);
            $("#editable-sample tbody").html(html);
        } else {
            $("#editable-sample tbody").html('');
        }
    }).fail(function (jqxhrFail, textStatusFail, errorThrownFail) {
        errorHandler(jqxhrFail);
    });
}

function deleteUser(ip) {
    $.ajax({
        //timeout: TIMEOUT_MESSAGE,
        dataType: 'json',
        url: API_CALL_PREFIX + "deleteUserIP/?username=GTestUser&ip=" + ip
    }).done(function (response) {
        $('#errorModal .modal-title').html('Delete Status');
        $('#errorModal .modal-body').html('User server has been deleted successfully.');
        $('#errorModal').modal('show');
    }).fail(function (jqxhrFail, textStatusFail, errorThrownFail) {
        errorHandler(jqxhrFail);
    });
}

function getUsers() {
    var html = '';
    var username = '';
    $.ajax({
        dataType: 'json',
        async: false,
        url: API_CALL_PREFIX + "getUsers/"
    }).done(function (response) {
        if (response) {
            $.each(response, function (key, value) {
                if (key === 0) {
                    username = $.trim(value.email);
                }
                html += '<option value="' + value.email + '">' + value.email + '</option>';
            });
            $('#userslist').html(html);
            getUserIps(username);
        }
    }).fail(function (jqxhrFail, textStatusFail, errorThrownFail) {
        errorHandler(jqxhrFail);
    });
}

$(document).on("click", "#go", function () {
    var username = $("#userslist option:selected").val();
    username = $.trim(username);
    getUserIps(username);
});

$(document).ready(function () {
    getUsers();
});
