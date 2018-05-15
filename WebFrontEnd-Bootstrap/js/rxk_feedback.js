var API_CALL_PREFIX = "../raxakapi/v1/";
var DEFAULT_TIMEOUT = 10 * 1000; //10 seconds
var editobject = '';
var old_period = '';
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
function feedbackInfo(flag) {
    var html = '';
    var uri = API_CALL_PREFIX + "feedbackInfo/";
    $.ajax({
        url: uri,
        dataType: 'json',
        async: false,
        timeout: DEFAULT_TIMEOUT,
    }).done(function (response) {
        var user_info_length = Object.keys(response).length;
        var i= 1;
        if (user_info_length > 0) {               
            $.each(response, function (key, value) {
                var data = JSON.parse(value);
                var user = data.user;
                var feedback = data.feedback;
                    html += "<tr id=" + user + ">";
                    html += "<td>" + i + "</td>";
                    html += "<td>" + feedback + "</td>";
                    html += "<td>" + user + "</td>";
                    html += '<td align="center"><a class="delete" href="javascript:;"><i class="fa fa-fw fa-trash-o"></i></a></td>';
                    html += "</tr>";
                    i++;
            });
            $("#feedbackcounts").text(user_info_length);
            $("#editable-sample tbody").html(html);
            
        }
        initDataTable();
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
            html: "Are you sure you want to delete <b><i>" + rowData[1] + "</i></b>?",
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
                    	deleteFeedback(rowData,nRowID);
                        oTable.fnDeleteRow(nRow);
                    }
                });
    }
});
function deleteFeedback(rowData,nRowID) {
    $.ajax({
        dataType: 'json',
        url: API_CALL_PREFIX + "deleteFeedback/?email="+nRowID+"&feedback=" + rowData[1]
    }).done(function (response) {
        swal({
            html: "<b><i>" + rowData[1] + '</i></b> has been deleted successfully.',
            type: "success",
        });
    }).fail(function (jqxhrFail, textStatusFail, errorThrownFail) {
        errorHandler(jqxhrFail);
    });
}
var initDataTable = function () {
    $('#editable-sample').DataTable({
        "sPaginationType": "full_numbers",
        columnDefs: [{
                targets: [0],
                orderData: [0, 1]
            }, {
                targets: [1],
                orderData: [1, 0]
            }, {
                targets: [3],
                orderData: [3, 0]
            }],
        "aoColumnDefs": [{
                'bSortable': false,
                'aTargets': [3]
            }
        ]
    });
};
$(document).ready(function () {
	feedbackInfo();
});
