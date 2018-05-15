var MEDIA_DIR = './';//static/
var IMG_DIR = MEDIA_DIR + 'images/';
var CSS_DIR = MEDIA_DIR + 'css/';
var JS_DIR = MEDIA_DIR + 'js/';
var API_CALL_PREFIX = "../raxakapi/v1/";
var DEFAULT_TIMEOUT = 10 * 1000;//10 seconds
var TIMEOUT_MESSAGE = 'Retry the web page by clicking the refresh/reload button, <br> if the problem persists then please contact the raxak administrator for further assistance.';
var gFlagError = false;
var gErrorStatus = {error: []};
var editobject = '';
var is_editable = false;

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

$(function () {
    $('#motd-form').validate({
        onkeyup: false, // to prevent the multiple existing API calls. 
        rules: {
            e_username: {
                required: true
            },
            dp3id: {
                required: true
            },
            dp4id: {
                required: true
            },
            textfield: {
                required: true
            }
        },
        messages: {
            e_username: {required: "Please enter the title."},
            dp3id: {
                required: "Please enter the date."
            },
            dp4id: {
                required: "Please enter the date"
            },
            textfield: {required: "Pleaser enter the description.",
            }
        },
        highlight: function (element) {
            $(element).closest('.control-group').removeClass('success').addClass('error');
        },
        success: function (element) {
            element
                    .closest('.control-group').removeClass('error').addClass('success');
        },
        submitHandler: function (form) {
            var title = $('#e_username').val();
            var date_from = $('#dp3id').val();
            var date_to = $('#dp4id').val();
            var description = $('#textfield').val();
            var epocTime = (new Date).getTime();
            var content = {'id': epocTime, 'Title': title, 'Date_from': date_from, 'Date_to': date_to, 'Description': description};
            $.ajax({
                method: 'POST',
                url: '/raxakapi/v1/addMotd/',
                data: content,
                success: function (data) {
                    console.log(data);
                    table_row_id = epocTime
                    var table = $('#editable-sample').dataTable();
                    var newRow = table.fnAddData([
                        '<td>' + title + '</td>',
                        '<td>' + date_from + '</td>',
                        '<td>' + date_to + '</td>',
                        '<td>' + description + '</td>',
                        '<td align="center"><a class="edit" href="javascript:;"><i class="fa fa-fw fa-pencil"></i></a></td>',
                        '<td align="center"><a class="delete" href="javascript:;" id="' + epocTime + '" ><i class="fa fa-fw fa-trash-o"></i></a></td>',
                    ]);
                    var newDTRow = table.fnSettings().aoData[ newRow[0]].nTr;
                    $(newDTRow).attr('id', table_row_id);
                    $('.delete').parent().attr('align', 'center');
                    $('.edit').parent().attr('align', 'center');
                    $('#addtargetmotd').modal('hide'); //To close the pop-up on click of submit button.
                    //Showing the updated entry count on the top of table.
                    total_entries = document.getElementById("editable-sample").rows.length - 1;
                    $('#motdcount').text('(' + total_entries + ')');
                    $('#e_username').val('');
                    $('#textfield').val('');
                }
            });
        }
    });
});

function showMotd() {
    var html = '';
    var uri = API_CALL_PREFIX + "getMotds/";
    $.ajax({
        url: uri,
        dataType: 'json',
        timeout: DEFAULT_TIMEOUT
    }).done(function (response) {
        $.each(response, function (key, value) {
            var get_motd_data = JSON.parse(value);
            delete_icon_id = get_motd_data.id;
            var id = get_motd_data.id;
            html += '<tr id="' + id + '">';
            html += "<td>" + get_motd_data.title + "</td>";
            html += "<td>" + get_motd_data.from_date + "</td>";
            html += "<td>" + get_motd_data.to_date + "</td>";
            html += "<td>" + get_motd_data.description + "</td>";
            html += '<td align="center"><a class="edit" href="javascript:;"><i class="fa fa-fw fa-pencil"></i></a></td>';
            html += '<td align="center"><a class="delete" href="javascript:;" id="' + id + '" ><i class="fa fa-fw fa-trash-o"></i></a></td>';
            html += "</tr>";
        });
        //Showing the entries count at the top of table.
        var total_entries = Object.keys(response).length;
        $('#motdcount').text('(' + total_entries + ')');
        $("#editable-sample tbody").html(html);
        initDataTable();
        $("#image-holder-page").fadeOut('slow');
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
                'aTargets': [4, 5]
            }
        ]
    });
};

//To delete the specific row
$(document).on("click", "#editable-sample a.delete", function (e) {
//$('#editable-sample a.delete').on('click', function (e) {
    var oTable = $('#editable-sample').dataTable();
    var nRow = $(this).parents('tr')[0];
    var rowData = oTable.fnGetData(nRow);
    var row_id = $(this).attr('id');
    if ($(this).parents('tr').children('td').find('.delete').attr("disabled") == "disabled") {
        e.preventDefault();
    } else {
        swal({
            html: "Are you sure you wnat to delete <b><i>" + rowData[1] + "</i></b>?",
            type: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Yes, delete it!',
            closeOnConfirm: false
        },
        function (isDelete) {
            if (isDelete) {
                deleteMotd(rowData);
                oTable.fnDeleteRow(nRow);
                //Showing the updated entry count on the top of table.
                total_entries = document.getElementById("editable-sample").rows.length - 1;
                $('#motdcount').text('(' + total_entries + ')');
            }
        });
    }
});

//Deleting the row from database
function deleteMotd(rowData) {
    var content = {rowid: rowData.DT_RowId};
    $.ajax({
        method: 'POST',
        url: '/raxakapi/v1/deleteMotd/',
        data: content,
        success: function (data) {
            swal({
                html: "MOTD <b><i>" + rowData[1] + "</i></b> has been deleted successfully.",
                type: 'success'
            });
        }
    });
}

//Edit pop-up to retrieve the values from row .
$(document).on("click", ".edit", function () {
    var trid = $(this).closest('tr').attr('id');
    var title = $("tr[id='" + trid + "'] td:nth-child(1)").text();
    var date_from = $("tr[id='" + trid + "'] td:nth-child(2)").text();
    var date_in = $("tr[id='" + trid + "'] td:nth-child(3)").text();
    var description = $("tr[id='" + trid + "'] td:nth-child(4)").text();
    editobject = this;
    $("#editmotd .modal-body #e_title").val(title);
    $("#editmotd .modal-body #dp3editid").val(date_from);
    $("#editmotd .modal-body #dp4editid").val(date_in);
    $("#editmotd .modal-body #e_description").val(description);
    $("#editmotd").modal('show');
});

//update the variable when any edit happens.
$(document).unbind("keyup").keyup(function (e) {
    is_editable = true;
});

var resetForm = function () {
    $(':input', '#addtargetmotd')
            .not(':button, :submit, :reset, :hidden')
            $('#e_username').val('');
            $('#textfield').val('');
    return false;
};

var resetEditForm = function () {
    $(':input', '#editmotd')
            .not(':button, :submit, :reset, :hidden')
            .val('');
    return false;
};

$(function () {
    showMotd();

    $(':input', '#addtargetmotd')
            .not(':button, :submit, :reset, :hidden')
            .val('');

    $('#edit-motd-form').validate({
        onkeyup: false,
        rules: {
            e_title: {
                required: true
            },
            dp3editid: {
                required: true
            },
            dp4editid: {
                required: true
            },
            e_description: {
                required: true
            }
        },
        messages: {
            e_title: {required: "Please enter the title."},
            dp3editid: {
                required: "Please enter the date."
            },
            dp4editid: {
                required: "Please enter the date"
            },
            e_description: {required: "Pleaser enter the description.",
            }
        },
        highlight: function (element) {
            $(element).closest('.control-group').removeClass('success').addClass('error');
        },
        success: function (element) {
            element
                    .closest('.control-group').removeClass('error').addClass('success');
        },
        submitHandler: function (form) {
            if (is_editable == true) {
                var edit_title = $('#e_title').val();
                var edit_from_date = $('#dp3editid').val();
                var edit_to_date = $('#dp4editid').val();
                var edit_description = $('#e_description').val();
                var trid = $(editobject).closest('tr').attr('id');
                var row_id = trid.replace("row", "");
                //Modify the values from database.
                var content = {id: row_id, title: edit_title, date_from: edit_from_date, date_to: edit_to_date, description: edit_description};
                $.ajax({
                    method: 'POST',
                    url: '/raxakapi/v1/modifyMotd/',
                    data: content,
                    success: function (data) {
                        $("tr[id='" + trid + "'] td:nth-child(1)").text(edit_title);
                        $("tr[id='" + trid + "'] td:nth-child(2)").text(edit_from_date);
                        $("tr[id='" + trid + "'] td:nth-child(3)").text(edit_to_date);
                        $("tr[id='" + trid + "'] td:nth-child(4)").text(edit_description);
                        $("#editmotd").modal('hide');
                    }
                });
            }
        }
    });
});
//Add motd for enter key
$(function() {
    $("#textfield").keypress(function (e) {
        if(e.which == 13) {
        $( "#motdid" ).trigger("click");
        e.preventDefault();
        }
    });
});

//Edit motd for enter key

$(function() {
    $("#e_description").keypress(function (e) {
        if(e.which == 13) {
        $( "#editmotd_submitbtn_id" ).trigger("click");
        e.preventDefault();
        }
    });
});


