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

    $.validator.addMethod(
            "complex",
            function (value, element) {
                //var regex = /^(?=.*\d+)(?=.*[a-z])(?=.*[A-Z])[0-9a-zA-Z]{8,16}$/;
                var regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[$@$!%*?&])[A-Za-z\d$@$!%*?&]{8,}/;
                var result = regex.test(value);
                return result;
            },
            "Minimum 8 characters at least 1 uppercase alphabet, 1 lowercase alphabet, 1 number and 1 special character"
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
                //minlength: 6
                complex: true
            },
            confirm_password: {
                required: true,
                //minlength: 6,
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
                //minlength: "Password length should be at least 6 characters."
                complex: "Minimum 8 characters at least 1 uppercase alphabet, 1 lowercase alphabet, 1 number and 1 special character."
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
                success: function (data) {
                    window.location.href = 'thanks.html';
                }
            });
        }
    });
});
