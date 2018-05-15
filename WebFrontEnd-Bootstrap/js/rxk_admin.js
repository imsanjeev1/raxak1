/* 
 * Js for User management
 */
var API_CALL_PREFIX = "../raxakapi/v1/";
var DEFAULT_TIMEOUT = 10 * 1000; //10 seconds
var editobject = '';
var old_period = '';
var resetForm = function () {
    $(':input', '#f_addip')
            .not(':button, :submit, :reset, :hidden')
            .val('')
            .removeAttr('checked')
            .removeAttr('selected');
};
/* 
 //enable enter key should work work when edit enrolled server.
 $(document).unbind("keyup").keyup(function (e) {
 var code = e.which; // recommended to use e.which, it's normalized across browsers
 if (code === 13 && is_editable) {
 modifyTargetMmachine();
 return false;
 }
 });
 */
var errorHandler = function (jqxhr) {
    if ((jqxhr.status == '404') || (jqxhr.status == '502')) {
        window.location.href = 'maintenance.html';
    } else {
        swal({
            // title : "Error",
            text: 'Getting error : ' + jqxhr.statusText,
            type: 'error',
        });
        return;
    }
};
$(function () {
//  add user
    var response = '';
    $.validator.addMethod(
            "emailExist",
            function (value, element) {
                var content = {email: value};
                $.ajax({
                    method: 'POST',
                    data: content,
                    async: false,
                    url: '/raxakapi/v1/getemailexist/',
                    success: function (msg) {
                        //If emailid exists, set response to true
                        response = (msg == true) ? false : true;
                    }
                });
                return response;
            },
            "Entered email id is already exist."
            );
    $('#registration-form').validate({
        onkeyup: false, // to prevent the multiple email existing API calls. 
        rules: {
            firstname: {
                required: true,
                required: true
            },
            lastname: {
                required: true,
                required: true
            },
            email: {
                required: true,
                email: true,
                emailExist: true
            },
            company: {
                required: true,
                required: true
            },
            country: {
                required: true,
                required: true
            },
            agree: "required"
        },
        messages: {
            firstname: "Please enter first name.",
            lastname: "Please enter last name.",
            email: {
                required: "Please enter correct email id.",
                email: "Please enter a valid email id.",
                emailExist: "Email id already exist. Try another?"
            },
            company: "Please enter your company name.",
            country: "Please select your country."
        },
        highlight: function (element) {
            $(element).closest('.control-group').removeClass('success').addClass('error');
        },
        success: function (element) {
            element
                    //.text('OK!').addClass('valid')
                    .closest('.control-group').removeClass('error').addClass('success');
        },
        submitHandler: function (form) {
            var firstname = $('#firstname').val();
            var lastname = $('#lastname').val();
            var email = $('#email').val();
            var phone = $('#phone').val();
            var company = $('#company').val();
            var country = $('#country').val();
            var password = $('#password').val();
            var content = {firstname: firstname, lastname: lastname, email: email, phone: phone, company: company, country: country, password: password};
            $.ajax({
                method: 'POST',
                url: '/raxakapi/v1/addUser/',
                data: content,
                beforeSend: function (xhr) {
                    $('#addusersinfo').modal('hide');
                },
                success: function (data) {
                    var arrayOfObjects = eval(data);
                    var rowIdHtml = arrayOfObjects[0].email;
                    var reAccHtml = "reCheckAccess('" + arrayOfObjects[0].email + "')";
                    var reAccIDHtml = "chkbx_" + arrayOfObjects[0].email;
                    var table = $('#editable-sample').dataTable();
                    var newRow = table.fnAddData([
                        //'<td align="center"><a class="edit" href="javascript:;"><i class="fa fa-fw fa-pencil"></i></a></td>',
                        '<td>' + arrayOfObjects[0].firstname + '</td>',
                        '<td>' + arrayOfObjects[0].lastname + '</td>',
                        '<td>' + arrayOfObjects[0].email + '</td>',
                        '<td>' + arrayOfObjects[0].company + '</td>',
                        '<td>' + arrayOfObjects[0].phone + '</td>',
                        '<td>' + arrayOfObjects[0].country + '</td>',
                        '<td>' + arrayOfObjects[0].date + '</td>',
                        '<td> never </td>',
                        '<td align="center"><a class="block" href="javascript:;" align="center"><i class="fa fa-fw fa-ban"></i></a></td>',
                        '<td>Email confirmation is pending</td>',
                        '<td align="center"><a class="access" href="javascript:;" style="font-weight: bold; text-decoration: underline; color: rgb(51, 122, 183);">No Trial</a></td>',
                        '<td align="center"><span style="padding-right:10px;"><a class="edit" href="javascript:;"><i class="fa fa-fw fa-pencil"></i></a></span><span><a class="delete" href="javascript:;"><i class="fa fa-fw fa-trash-o"></i></a></span></td>'
                    ]);
                    var newDTRow = table.fnSettings().aoData[ newRow[0]].nTr;
                    $(newDTRow).attr('id', arrayOfObjects[0].email);

                    var table = $('#editable-sample').DataTable();
                    var length = getUserCount(table, 9, "");
                    var blocked_length = getUserCount(table, 9, "Account blocked");

                    $("#usercounts_all").text(length);
                    $("#usercounts_blocked").text(blocked_length);
                    $("#registration-form").get(0).reset();
                    $(".block, .access").parent('td').attr('align', 'center');
                    $("#editable-sample .edit").closest('td').attr('align', 'center');
                    $("#editable-sample .edit").closest('td').css('text-align', 'center');
                }
            });
        }
    });
//  modify user info.

    $.validator.addMethod(
            "emailExist",
            function (value, element) {
                var content = {email: value};
                $.ajax({
                    method: 'POST',
                    data: content,
                    async: false,
                    url: '/raxakapi/v1/getemailexist/',
                    success: function (msg) {
                        //If emailid exists, set response to true
                        response = (msg == true) ? false : true;
                    }
                });
                return response;
            },
            "Entered email id is already exist."
            );
    $('#modifyuser-form').validate({
        onkeyup: false, // to prevent the multiple email existing API calls. 
        rules: {
            e_firstname: {
                required: true,
                required: true
            },
            e_lastname: {
                required: true,
                required: true
            },
            e_email: {
                required: true,
                email: true,
                //emailExist: true
            },
            e_company: {
                required: true,
                required: true
            },
            e_country: {
                required: true,
                required: true
            },
            agree: "required"
        },
        messages: {
            e_firstname: "Please enter first name.",
            e_lastname: "Please enter last name.",
            e_email: {
                required: "Please enter correct email id.",
                email: "Please enter a valid email id.",
                //emailExist: "Email id already exist. Try another?"
            },
            e_company: "Please enter your company name.",
            e_country: "Please select your country."
        },
        highlight: function (element) {
            $(element).closest('.control-group').removeClass('success').addClass('error');
        },
        success: function (element) {
            element
                    //.text('OK!').addClass('valid')
                    .closest('.control-group').removeClass('error').addClass('success');
        },
        submitHandler: function (form) {
            var firstname = $('#e_firstname').val();
            var lastname = $('#e_lastname').val();
            var email = $('#e_email').val();
            var phone = $('#e_phone').val();
            var company = $('#e_company').val();
            var country = $('#e_country').val();
            var content = {firstname: firstname, lastname: lastname, email: email, phone: phone, company: company, country: country};
            $.ajax({
                method: 'POST',
                url: '/raxakapi/v1/modifyUser/',
                data: content,
                beforeSend: function (xhr) {
                    $('#editusersinfo').modal('hide');
                },
                success: function (data) {
                    var obj = eval(data);
                    var trid = $(editobject).closest('tr').attr('id');

                    var oTable = $("#editable-sample").dataTable();
                    oTable.fnUpdate(firstname, $(editobject).parents('tr')[0], 0);
                    oTable.fnUpdate(lastname, $(editobject).parents('tr')[0], 1);
                    oTable.fnUpdate(email, $(editobject).parents('tr')[0], 2);
                    oTable.fnUpdate(company, $(editobject).parents('tr')[0], 3);
                    oTable.fnUpdate(phone, $(editobject).parents('tr')[0], 4);
                    oTable.fnUpdate(country, $(editobject).parents('tr')[0], 5);
                    // oTable.fnUpdate(date, $(editobject).parents('tr')[0], 6);

                    $("#usercounts_all").text(length);
                }
            });
        }
    });
});
function getUserInfo() {
    var html = '';
    var add_class = '';
    var admin_msg = '';
    var activation = '';
    uri = API_CALL_PREFIX + "Get_User_Info/";
    $.ajax({
        url: uri,
        dataType: 'json',
        async: false,
        timeout: DEFAULT_TIMEOUT
    }).done(function (response) {
        var user_info_length = Object.keys(response).length;
        if (user_info_length > 0) {
            $.each(response, function (key, value) {
                var data = value;
                var first_name = data.firstname;
                var last_name = data.lastname;
                var email = data.email;
                var company = data.company;
                var phone = data.phone;
                var country = data.country;
                var date = data.date;
                var status_block = data.blocked;
                var admin_privilege = data.admin;
                var activation_status = data.activation;
                var last_logged_in = new Date(data.lastlogin).toLocaleString()
                last_logged_in = (last_logged_in != 'Invalid Date') ? last_logged_in : 'never';

                if (status_block == 0) {
                    add_class = 'fa fa-fw fa-unlock';
                } else {
                    add_class = 'fa fa-fw fa-ban';
                }

                if (activation_status == 0 && status_block == 0) {
                    activation = '<a class="review" href="javascript:;" style="font-weight: bold; text-decoration: underline; color: rgb(51, 122, 183);">Admin Review Pending</a>';
                } else if (activation_status == 1 && status_block == 0) {
                    activation = 'Email Confirmation Pending';
                } else if (activation_status == 2 && status_block == 0) {
                    activation = 'Account Activated';
                } else if (status_block == 1) {
                    activation = 'Account blocked';
                } else {
                    activation = 'Account blocked';
                }

                if (data.period) {
                    var period = data.period;
                } else {
                    var period = "No Trial";
                }
                html += "<tr id=" + email + ">";
                //html += '<td align="center"><a class="edit" href="javascript:;"><i class="fa fa-fw fa-pencil"></i></a></td>';
                html += "<td>" + first_name + "</td>";
                html += "<td>" + last_name + "</td>";
                html += "<td>" + email + "</td>";
                html += "<td>" + company + "</td>";
                html += "<td>" + phone + "</td>";
                html += "<td>" + country + "</td>";
                html += "<td>" + date + "</td>";
                html += "<td>" + last_logged_in + "</td>";
                html += '<td align="center"><a class="block" href="javascript:;"><i class="' + add_class + '"></i></a></td>';
                html += '<td><i>' + activation + '</i></td>';
                html += '<td align="center"><a class="access" href="javascript:;" style="font-weight: bold; text-decoration: underline; color: rgb(51, 122, 183);">' + period + '</a></td>';
                html += '<td align="center"><span style="padding-right:10px;"><a class="edit" href="javascript:;"><i class="fa fa-fw fa-pencil"></i></a></span><span><a class="delete" href="javascript:;"><i class="fa fa-fw fa-trash-o"></i></a></span></td>';
                html += "</tr>";
            });
            //html += "</table>";
            $("#usercounts_all").html(user_info_length);
            $("#editable-sample tbody").html(html);

            $("#editable-sample").dataTable({
                "sPaginationType": "full_numbers",
                "aoColumnDefs": [{
                        'bSortable': false,
                        'aTargets': [8, 11]
                    }
                ]
            });
            var table = $("#editable-sample").DataTable();
            $("#usercounts_blocked").text(getUserCount(table, 9, "Account blocked"));
        }
        $("#image-holder-page").fadeOut('slow');
    }).fail(function (jqxhrFail, textStatusFail, errorThrownFail) {
        errorHandler(jqxhrFail);
    });
}

$('#editable-sample a.delete').live('click', function (e) {
    //e.preventDefault();
    var nRow = $(this).parents('tr')[0];
    var nRowID = $(this).parents('tr').attr('id');
    if ($(this).parents('tr').children('td').find('.delete').attr("disabled") == "disabled") {
        e.preventDefault();
    } else {
        swal({
            html: "Are you sure you want to delete <b><i>" + nRowID + "</i></b>?",
            type: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Yes, delete it!',
            closeOnConfirm: true
        },
        function (isDelete) {
            if (isDelete)
            {
                deleteUser(nRowID);
                var table = $("#editable-sample").DataTable();
                table.row(nRow).remove().draw();
                $("#usercounts_blocked").text(getUserCount(table, 9, "Account blocked"));
                $("#usercounts_all").text(getUserCount(table, 9, ""));
            }
        })
    }
});

function deleteUser(email) {
    $.ajax({
        dataType: 'json',
        url: API_CALL_PREFIX + "deleteUser/?email=" + email
    }).done(function (response) {
        swal({
            // title : "Delete Status",
            html: "User <b><i>" + email + "</i></b> has been deleted successfully.",
            type: 'success',
        });
    }).fail(function (jqxhrFail, textStatusFail, errorThrownFail) {
        errorHandler(jqxhrFail);
    });
}

function blockUser(email, block_status) {
    $.ajax({
        method: "POST",
        data: {email: $(email).attr('id')},
        url: '/raxakapi/v1/blockUser/',
        success: function (response) {

            var oTable = $("#editable-sample").dataTable();
            if (response[0].blocked == 0) {
                var newBlock = '<a class="block" href="javascript:;"> <i class="fa fa-fw fa-unlock"></i> </a>';
                oTable.fnUpdate(newBlock, email, 8);
            } else {
                var newBlock = '<a class="block" href="javascript:;"> <i class="fa fa-fw fa-ban"></i> </a>';
                oTable.fnUpdate(newBlock, email, 8);
            }
            if (response[0].activation == 0 && response[0].blocked == 0) {
                var newBlock = '<a class="block" href="javascript:;"> <i class="fa fa-fw fa-unlock"></i> </a>';
                var newStatus = '<i> <a style="font-weight: bold; text-decoration: underline; color: rgb(51, 122, 183);" href="javascript:;" class="review">Admin Review Pending</a></i>';
                oTable.fnUpdate(newBlock, email, 8);
                oTable.fnUpdate(newStatus, email, 9);

            } else if (response[0].activation == 1 && response[0].blocked == 0) {
                var newStatus = '<i> Email Confirmation Pending </i>';
                oTable.fnUpdate(newStatus, email, 9);
            } else if (response[0].activation == 0 && response[0].blocked == 1) {
                var newBlock = '<a class="block" href="javascript:;"> <i class="fa fa-fw fa-ban"></i> </a>';
                var newStatus = '<i> Account blocked </i>';
                oTable.fnUpdate(newBlock, email, 8);
                oTable.fnUpdate(newStatus, email, 9);

            } else if (response[0].activation == 1 && response[0].blocked == 1) {
                var newStatus = '<i> Account blocked </i>';
                oTable.fnUpdate(newStatus, email, 9);
            }
            else if (response[0].activation == 2 && response[0].blocked == 1) {
                var newStatus = '<i> Account blocked </i>';
                oTable.fnUpdate(newStatus, email, 9);
            }
            else if (response[0].activation == 2 && response[0].blocked == 0) {
                var newStatus = '<i> Account activated </i>';
                oTable.fnUpdate(newStatus, email, 9);
            }
            else {
                var newStatus = '<i> Account blocked </i>';
                oTable.fnUpdate(newStatus, email, 9);
            }

            var table = $("#editable-sample").DataTable();
            $("#usercounts_blocked").text(getUserCount(table, 9, "Account blocked"));

        }, error: function (xhr, status, err) {
            console.log(status, err);
        },
    });
}

$('#editable-sample a.block').live('click', function (e) {
    //e.preventDefault();
    var nRow = $(this).parents('tr')[0];
    var nRowID = $(this).parents('tr').attr('id');
    var block_status = $(this).html().indexOf('fa-ban');
    if ($(this).parents('tr').children('td').find('.block').attr("disabled") == "disabled") {
        e.preventDefault();
    } else {
        console.log("blocked ", block_status);
        var action = (block_status > -1) ? "unblock" : "block";
        swal({
            html: "Are you sure you want to " + action + " <b><i>" + nRowID + "</i></b>?",
            type: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Yes, ' + action + ' it!',
            closeOnConfirm: true
        },
        function (isAction) {
            if (isAction)
            {
                blockUser(nRow, block_status);
            }
        })
    }
});

$(document).on("click", ".edit", function () {
    var oTable = $('#editable-sample').dataTable();
    var rowData = oTable.fnGetData($(this).parents('tr')[0]); // getting row data from datatable object

    var trid = $(this).closest('tr').attr('id');
    var firstName = rowData[0];
    var lastName = rowData[1];
    var email = rowData[2];
    var company = rowData[3];
    var phone = rowData[4];
    var country = rowData[5];
    //is_editable = true;
    editobject = this;
    $("#editusersinfo .modal-body #e_firstname").val(firstName);
    $("#editusersinfo .modal-body #e_lastname").val(lastName);
    $("#editusersinfo .modal-body #e_email").val(email);
    $("#editusersinfo .modal-body #e_phone").val(phone);
    $("#editusersinfo .modal-body #e_company").val(company);
    $("#editusersinfo .modal-body #e_country").val(country);
    $("#editusersinfo").modal('show');
});

function setAccessPeriod() {
    var current_period = $('#accessperiod').val();
    var emailid = $(editobject).closest('tr').attr('id');

    if (current_period !== '' && current_period !== 'No Trial') {
        if (current_period !== old_period) {
            var content = {'emailid': emailid, 'period': current_period};
            $.ajax({
                data: content,
                type: 'POST',
                url: API_CALL_PREFIX + "setAccessPeriod/",
                beforeSend: function (xhr) {
                    $('#addvalidity').modal('hide');
                    $('#ajaxloader').show();
                }
            }).done(function (response) {
                if (response[0].status) {
                    var oTable = $('#editable-sample').dataTable();
                    var new_period = '<a class="access" href="javascript:;"' +
                            ' style="font-weight: bold; text-decoration: underline; color: rgb(51, 122, 183);">'
                            + response[0].period + '</a>'
                    oTable.fnUpdate(new_period, $(editobject).parents('tr')[0], 10);
                }
            }).fail(function (jqxhrFail) {
                errorHandler(jqxhrFail);
            });
        } else {
            $('#addvalidity').modal('hide');
        }
    } else {
        $('#error_message').text('Please select access period.');
        return false;
    }
}

$(document).on("click", ".access", function () {
    editobject = this;
    $('#blockusercontainer').hide();

    var oTable = $('#editable-sample').dataTable();
    var rowData = oTable.fnGetData($(this).parents('tr')[0]); // getting row data from datatable object

    var trid = $(this).closest('tr').attr('id');
    var period = $(rowData[10]).text();
    old_period = period;
    console.log(period);
    if (period !== '' && period !== 'No Trial') {
        $("#addvalidity .modal-body #accessperiod").val(period);
    }
    $("#addvalidity").modal('show');
});

function setAdminReview() {
    var current_period = $('#r_accessperiod').val();
    var blockuserno = $('#blockuserno').prop('checked');
    var blockuseryes = $('#blockuseryes').prop('checked');
    var emailid = $(editobject).closest('tr').attr('id');

    if (blockuserno) {
        var blocked = '0';
    }
    if (blockuseryes) {
        var blocked = '1';
    }
    if (current_period !== '' && current_period !== 'No Trial') {
        if (current_period !== old_period) {
            var content = {'emailid': emailid, 'period': current_period, 'blocked': blocked};
            $.ajax({
                data: content,
                type: 'POST',
                url: API_CALL_PREFIX + "adminReview/",
                beforeSend: function (xhr) {
                    $('#addvalidity').modal('hide');
                    $('#ajaxloader').show();
                }
            }).done(function (response) {
                if (response[0].status) {
                    var oTable = $('#editable-sample').dataTable();
                    if (response[0].blocked == 1) {
                        var newBlock = '<a class="block" href="javascript:;"> <i class="fa fa-fw fa-ban"></i> </a>';
                        oTable.fnUpdate("Accont Blocked", $(editobject).parents('tr')[0], 9);
                        oTable.fnUpdate(newBlock, $(editobject).parents('tr')[0], 8);
                    } else {
                        var newBlock = '<a class="block" href="javascript:;"> <i class="fa fa-fw fa-unlock"></i> </a>';
                        var new_period = '<a class="access" href="javascript:;"' +
                                ' style="font-weight: bold; text-decoration: underline; color: rgb(51, 122, 183);">'
                                + response[0].period + '</a>'
                        oTable.fnUpdate(new_period, $(editobject).closest('tr')[0], 10);
                        oTable.fnUpdate(newBlock, $(editobject).parents('tr')[0], 8);
                        oTable.fnUpdate("Email Confirmation Pending", $(editobject).parents('tr')[0], 9);
                    }
                }
                $('#adminreview').modal('hide');
            }).fail(function (jqxhrFail) {
                errorHandler(jqxhrFail);
            });
        } else {
            $('#adminreview').modal('hide');
        }
    } else {
        $('#r_error_message').text('Please select access period.');
        return false;
    }
}

var getUserCount = function (fromTable, col, type)
{
    var fTable = fromTable.column(col)
            .data()
            .filter(function (value, index) {
                return (value.indexOf(type) > -1) ? true : false;
            });

    return fTable.length;
};

var clearSearch = function ()
{
    var table = $('#editable-sample').DataTable();
    table
            .search('')
            .columns().search('')
            .draw();

};

$(document).on("click", ".review", function () {
    editobject = this;
    var oTable = $('#editable-sample').dataTable();
    var rowData = oTable.fnGetData($(this).parents('tr')[0]); // getting row data from datatable object

    var trid = $(this).closest('tr').attr('id');
    var period = rowData[10];
    old_period = period;
    if (period !== '' && period !== 'No Trial') {
        $("#adminreview .modal-body #accessperiod").val(period);
    }
    $("#adminreview").modal('show');
});

$(document).ready(function () {
    getUserInfo();
});
