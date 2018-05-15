/* 
 * Js for User management
 */
var API_CALL_PREFIX = "../raxakapi/v1/";
var DEFAULT_TIMEOUT = 10 * 1000;//10 seconds

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
var errorHandler = function () {
    $('#image-holder-page').hide();//hide the loader if available.
    $('#errorModal .modal-title').html(gErrorStatus.error[0].identifier);
    $('#errorModal .modal-body').html(gErrorStatus.error[0].custom_msg);
    $('#errorModal').modal('show');
};

$(function () {
//    var response = false;
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
            password: {
                required: true,
                minlength: 6
            },
            confirm_password: {
                required: true,
                minlength: 6,
                equalTo: "#password"
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
            password: {
                required: "Please enter the password.",
                minlength: "Password length should be at least 6 characters."
            },
            confirm_password: {
                required: "Please Re-enter the password.",
                minlength: "Password length should be at least 6 characters.",
                equalTo: "Please enter the correct password."
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
            var confirm_password = $('#confirm_password').val();
            var content = {firstname: firstname, lastname: lastname, email: email, phone: phone, company: company, country: country, password: password};
            $.ajax({
                method: 'POST',
                url: '/raxakapi/v1/register/',
                data: content,
                beforeSend: function (xhr) {
                    $('#addusersinfo').modal('hide');
                    $('#ajaxloader').show();
                },
                success: function (data) {
                    //console.log(data);
                    //window.location.href = 'success.html';
                    $('#addusersinfo').modal('hide');
                }
            });
        }
    });
});

function getUserInfo() {
    var html = '';
    var firstname = '';
    var user_count = [];
    var uri = API_CALL_PREFIX + "Get_User_Info/";
    $.ajax({
        url: uri,
        dataType: 'json',
        async: false,
        timeout: DEFAULT_TIMEOUT
    }).done(function (response) {
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
            $("#usercounts").html(user_count.length);
            $("#editable-sample tbody").html(html);
        }
        $("#image-holder-page").fadeOut('slow');
    }).fail(function (jqxhrFail, textStatusFail, errorThrownFail) {
        errorHandler(jqxhrFail);
    });
}

function deleteUser(email) {
    $.ajax({
        //timeout: TIMEOUT_MESSAGE,
        dataType: 'json',
        url: API_CALL_PREFIX + "deleteUser/?email=" + email
    }).done(function (response) {
        alert((response.message));
//        //getTMs(); // to reset the sessions,facing recheckdata isuues.
//        var table = $('#editable-sample').dataTable();
//        var table_length = table.fnSettings().fnRecordsDisplay();
//        $('#usercounts').text('(' + table_length + ')');
//        if (table_length === 0) {
//            $('#enrolledservers').hide();
//        }
//        $('#errorModal .modal-title').html('Delete Status');
//        $('#errorModal .modal-body').html(emailId + ' has been deleted successfully.');
//        $('#errorModal').modal('show');
//        setTimeout(function () {
//            $('#errorModal').modal('hide');
//        }, 3000); //close model box automatically.
    }).fail(function (jqxhrFail, textStatusFail, errorThrownFail) {
        var customMessage = TIMEOUT_MESSAGE;
        if (textStatusFail === "timeout") {
            gErrorStatus["error"].push({identifier: 'deleteTM', custom_msg: TIMEOUT_MESSAGE, message: errorThrownFail});
        } else {
            customMessage = errorThrownFail;
            gErrorStatus["error"].push({identifier: 'deleteTM', custom_msg: errorThrownFail, message: errorThrownFail});
        }
        $('#errorModal .modal-title').html("Delete Status");
        $('#errorModal .modal-body').html(customMessage);
        $('#errorModal').modal('show');
    });
}

function blockUser(email) {
    $.ajax({
        method: "POST",
        data: {email: email},
        url: '/raxakapi/v1/blockUser/',
        success: function (response) {
            if (response.status == 1)
                $('#message').text('Your account has been activated successfully.');
            if (response.status == 2)
                $('#message').text('Your account is already activated.');
            if (response.status == 3)
                $('#message').text('The given URL is not correct.');
        }, error: function (xhr, status, err) {
            console.log(status, err);
        },
    });
}

$(document).ready(function () {
    getUserInfo();
    //getUsers();
    //deleteUser('teswt@gmail.com');
    //blockUser('sunilsingh@gmail.com');
});