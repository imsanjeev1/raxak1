/* 
 * Js for User management
 */
var API_CALL_PREFIX = "../raxakapi/v1/";
var DEFAULT_TIMEOUT = 10 * 1000;//10 seconds

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

function getUsers() {
    var html = '';
    var counts = '';
    $.ajax({
        //timeout: TIMEOUT_MESSAGE,
        dataType: 'json',
        async: false,
        url: API_CALL_PREFIX + "getUsers/"
    }).done(function (response) {
        if (response) {
            var i = 1;
            $.each(response, function (key, value) {
                var first_name = value.firstname;
                var last_name = value.lastname;
                var email = value.email;
                var admin = value.admin;
                if (admin == 1) {
                    counts++;
                    html += "<tr id='" + email + "'>";
                    html += "<td>" + first_name + "</td>";
                    html += "<td>" + last_name + "</td>";
                    html += "<td>" + email + "</td>";
                    html += '<td align="center"><a class="delete" href="javascript:;"><i class="fa fa-fw fa-trash-o"></i></a></td>';
                    html += "</tr>";
                }
            });
            $("#usercounts").html(counts);
            $("#editable-sample tbody").html(html);
        }
    }).fail(function (jqxhrFail, textStatusFail, errorThrownFail) {
        errorHandler(jqxhrFail);
    });
}

// function deleteAdminPrivilege(email) {
//     $.ajax({
//         method: "POST",
//         data: {email: email},
//         url: '/raxakapi/v1/adminPrivilege/',
//         success: function (response) {
//         }, error: function (xhr, status, err) {
//             console.log(status, err);
//         },
//     });
// }

function adminPrivilege(email, admin) {
    $.ajax({
        method: "POST",
        data: {email: email, admin: admin},
        url: '/raxakapi/v1/adminPrivilege/',
        success: function (response) {
            console.log(response);
            if (response[0].status == true) {
                if (response[0].admin == 1) {
                    getUsers();
                    swal({
                        html: "<b><i>" + email + "</i></b> has been added to admin successfully",
                        type: 'success',
                    });
                }
                else if (response[0].admin == 0)
                {
                    swal({
                        // title : "Delete Status",
                        html: "Privilage of <b><i>" + email + "</i></b> has removed successfully",
                        type: 'success',
                    });
                    var table = $('#editable-sample').dataTable();
                    var counts = table.fnSettings().fnRecordsDisplay();
                    $("#usercounts").html(counts);
                }

            }
            else
            {
                swal({
                    html: "<b><i>" + email + "</i></b> " + response[0].message,
                    type: 'error',
                })
            }
        }, error: function (jqxhrFail, status, err) {
            errorHandler(jqxhrFail);
        }
    });
}

$('#page-wrapper').on("click", "#add-admin", function () {
    jQuery.validator.setDefaults({
        debug: true,
        success: "valid"
    });
    $("#add-admin-form").validate({
        rules: {
            email: {
                required: true,
                email: true
                        // emailExist : true,
            }
        },
        message: {
            email: {
                required: "Please enter correct email id.",
                email: "Please enter a valid email id."
                        // emailExist : "Already Admin."
            }
        },
        highlight: function (element) {
            $(element).closest('.control-group').removeClass('success').addClass('error');
        },
        success: function (element) {
            element.closest('.control-group').removeClass('error').addClass('success');
        },
        submitHandler: function (form) {
            var email = $("#admin-email").val();
            adminPrivilege(email, 'true');
            $("#admin-email").val('');
        }
    });
});

$(document).ready(function () {
    getUsers();
    EditableTable.init();
});