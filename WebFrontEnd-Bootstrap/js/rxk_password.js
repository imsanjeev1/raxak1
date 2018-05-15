/* 
 * Js for User Registration Page
 */

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

$(function () {
    $.validator.addMethod(
            "complex",
            function (value, element) {
                //var regex = /^(?=.*\d+)(?=.*[a-z])(?=.*[A-Z])[0-9a-zA-Z]{8,16}$/;
                var regex = /^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$%^&*-]).{8,}$/;

                var result = regex.test(value);
                return result;
            },
            "Minimum 8 characters at least 1 uppercase alphabet, 1 lowercase alphabet, 1 number and 1 special character"
            );
    $('#changepassword-form').validate({
        rules: {
            password: {
                required: true,
                complex: true
                        //minlength: 6
            },
            confirm_password: {
                required: true,
                //minlength: 6,
                equalTo: "#password"
            },
            agree: "required"
        },
        messages: {
            password: {
                required: "Please enter the password.",
                complex: "Minimum 8 characters at least 1 uppercase alphabet, 1 lowercase alphabet, 1 number and 1 special character"
                        //minlength: "Password length should be at least 6 characters."
            },
            confirm_password: {
                required: "Please Re-enter the password.",
                //minlength: "Password length should be at least 6 characters.",
                equalTo: "Please enter the correct password."
            },
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
            $.urlParam = function (name) {
                var results = new RegExp('[\?&]' + name + '=([^&#]*)').exec(window.location.href);
                if (results == null) {
                    return null;
                } else {
                    return results[1];
                }
            }

            var email = $.urlParam('email');
            var hash = $.urlParam('hash');
            var password = $('#password').val();
            var confirm_password = $('#confirm_password').val();
            var content = {email: email, hash: hash, password: password};

            if (email && hash) {
                $.ajax({
                    method: "POST",
                    data: content,
                    url: '/raxakapi/v1/changePassword/',
                    success: function (response) {
                        if (response[0].status) {
                            window.location.href = 'success.html';
                            //$("#error_message").attr('class', 'text-primary');
                            //$("#error_message").text(response[0].message);
                        } else {
                            $("#error_message").attr('class', 'redText');
                            $("#error_message").text(response[0].message);
                        }
                    }, error: function (xhr, status, err) {
                        console.log(status, err);
                    },
                });
            }
        }
    });

    $('#forgotpassword-form').validate({
        onkeyup: false, // to prevent the multiple email existing API calls. 
        rules: {
            email: {
                required: true,
                email: true,
            },
            agree: "required"
        },
        messages: {
            email: {
                required: "Please enter correct email id.",
                email: "Please enter a valid email id.",
            }
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
            var email = $('#email').val();
            var content = {email: email};
            if (email) {
                $.ajax({
                    method: "POST",
                    data: content,
                    url: '/raxakapi/v1/forgotPassword/',
                    success: function (response) {
                        if (response[0].status) {
                            //window.location.href = 'success.html';
                            $("#error_message").attr('class', 'text-primary');
                            $("#error_message").text(response[0].message);

                        } else {
                            $("#error_message").attr('class', 'redText');
                            $("#error_message").text(response[0].message);
                        }
                    }, error: function (xhr, status, err) {
                        console.log(status, err);
                    },
                });
            }
        }
    });
});
