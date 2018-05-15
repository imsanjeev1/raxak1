$(function () {
    $('#login-admin-form').validate({
        rules: {
            email: {
                required: true,
                email: true
            },
            password: {
                required: true
                        //minlength: 6
            },
            agree: "required"
        },
        messages: {
            email: {
                required: "Please enter email id.",
                email: "Please enter a valid email id."
            },
            password: {
                required: "Please enter the password."
                        //minlength: "Password length should be at least 6 characters."
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
            var email = $('#email').val();
            var password = $('#password').val();
            var content = {email: email, password: password};
            if (email && password !== '') {
                $.ajax({
                    method: "POST",
                    data: content,
                    url: '/raxakapi/v1/adminSignin/',
                    success: function (response) {
                        if (response.status == "False") {
                            $("#error_message").text(response.message);
                            return false;
                        } else {
                            document.cookie = "usertoken=" + response.usertoken;
                            sessionStorage.setItem("is_admin", true);
                            window.location.href = 'dashboard.html';
                        }
                    }, error: function (xhr, status, err) {
                        console.log(status, err);
                    }
                });
            }
        }
    });
});
