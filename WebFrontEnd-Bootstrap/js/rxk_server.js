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
        swal({
            // title : 'Error',
            text: 'Getting error : ' + jqxhr.statusText,
            type: 'error',
        });
        return;
    }
};

function getUserIps(username, flag) {
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
            //- First clear table then add rows in table @onchange
            if (flag) {
                var oTable = $('#editable-sample').dataTable();
                oTable.fnSettings().fnRecordsDisplay();
                oTable.fnClearTable();
                oTable.fnDraw();
            }

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
                if (flag === false) {
                    html += "<tr id=" + data.ip + ">";
                    html += "<td>" + data.ip.split('@')[0] + "</td>";
                    html += "<td>" + data.ip.split('@')[1] + "</td>";
                    html += "<td>" + nickname + "</td>";
                    html += "<td>" + privateip + "</td>";
                    html += '<td align="center"><a class="delete" href="javascript:;"><i class="fa fa-fw fa-trash-o"></i></a></td>';
                    html += "</tr>";
                } else {
                    var newRow = oTable.fnAddData([
                        data.ip.split('@')[0],
                        data.ip.split('@')[1],
                        nickname,
                        privateip,
                        '<td align="center"><a class="delete" href="javascript:;"><i class="fa fa-fw fa-trash-o"></i></a></td>'
                    ]);
                    var newDTRow = oTable.fnSettings().aoData[newRow[0]].nTr;
                    $(newDTRow).attr('id', data.ip);
                    var length = oTable.fnSettings().fnRecordsDisplay();
                }
            });
            $("#usercounts").text(user_info_length);
            if (flag === false)
                $("#editable-sample tbody").html(html);
        } else {
            if (flag) {
                var oTable = $('#editable-sample').dataTable();
                oTable.fnClearTable();
                oTable.fnDraw();
                var length = oTable.fnSettings().fnRecordsDisplay();
                $("#usercounts").text(user_info_length);
            }
        }
    }).fail(function (jqxhrFail, textStatusFail, errorThrownFail) {
        errorHandler(jqxhrFail);
    });
}
$('#editable-sample a.delete').live('click', function (e) {
    var nRow = $(this).parents('tr')[0];
    var nRowID = $(this).parents('tr').attr('id').trim();
    var oTable = $('#editable-sample').dataTable();
    var rowData = oTable.fnGetData(nRow); // getting row data from datatable object
    if ($(this).parents('tr').children('td').find('.delete').attr("disabled") == "disabled") {
        e.preventDefault();
    } else {
        swal({
            html: "Are you sure you want to delete <b><i>" + rowData[2] + "</i></b>?",
            type: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Yes, delete it!',
            closeOnConfirm: false,
        },
                function (isDelete) {
                    if (isDelete)
                    {
                        deleteUserIp(rowData, nRowID);
                        oTable.fnDeleteRow(nRow);
                    }
                });
    }
});

function deleteUserIp(rowData, nRowID) {
    var username = $('#userslist option:selected').val().trim();
    $.ajax({
        //timeout: TIMEOUT_MESSAGE,
        dataType: 'json',
        //url: API_CALL_PREFIX + "deleteUserIP/?username="+username+"&ip=" + rowData.DT_RowId
        url: API_CALL_PREFIX + "deleteUserIP/?username=" + username + "&ip=" + nRowID
    }).done(function (response) {
        swal({
            html: "<b><i>" + rowData[2] + '</i></b> has been deleted successfully.',
            type: "success",
        });
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
                    $('.holder').text(username);
                }
                html += '<option value="' + value.email + '">' + value.email + '</option>';
            });
            $('#userslist').html(html);
            var flag = false;
            getUserIps(username, flag);
        }
    }).fail(function (jqxhrFail, textStatusFail, errorThrownFail) {
        errorHandler(jqxhrFail);
    });
}
//----------Start//Onchange UserIps Function
//function onChangeuserIps() {
$('#userslist').on('change', function () {
    var flag = true;
    var username = $('#userslist').val();
    $(this).next(".holder").text(username);
    getUserIps(username, flag);
    $('#editable-sample_filter').val('');
});

//------------End

$(document).ready(function () {
    getUsers();
    EditableTable.init();
});
