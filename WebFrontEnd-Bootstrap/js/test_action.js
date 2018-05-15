$(function () {
    $('#login-form').validate({
        rules: {
            name: {
                required: true,
               // name: true
            },
            password: {
                required: true,
                //password: true
            },
		phone: {
                required: true,
               // phone: true
            },
            agree: "required"
        },
        messages: {
            name: {
                required: "Please enter email id.",
            },
            password: {
                required: "Please enter the password.",
            },
			phone: {
                required: "Please enter the phone.",
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

            var name = $('#name').val();
            var password = $('#password').val();
            var phone = $('#phone').val();
            var content = {name: name, password: password, phone: phone};
                $.ajax({
                    method: "POST",
                    data: content,
                    url: '/raxakapi/v1/insert_query/',
                    success: function (response) {
						alert('Success');
                       $('#name').val('');
                       $('#password').val('');
                       $('#phone').val('');
                    }, error: function (xhr, status, err) {
                        console.log(status, err);
                    }
                });
           
        }
    });
});
