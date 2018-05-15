var API_CALL_PREFIX = "../raxakapi/v1/";
var DEFAULT_TIMEOUT = 10 * 1000;//10 seconds
var editobject = '';
var MEDIA_DIR = './';//static/
var IMG_DIR = MEDIA_DIR + 'images/';
var CSS_DIR = MEDIA_DIR + 'css/';
var JS_DIR = MEDIA_DIR + 'js/';
var gErrorStatus = {error: []};
var is_editable = false;

var errorHandler = function () {
    $('#image-holder-page').hide();//hide the loader if available.
    swal({
        text : gErrorStatus.error[0].custom_msg,
        type : "error",
    });
};
var firstname ='';
var lastname ='';
var company ='';
var phone ='';
function getUserDetails() {
    var html = '';
    uri = API_CALL_PREFIX + "getUserDetails/"
    $.ajax({
        url: uri,
        dataType: 'json',
        timeout: DEFAULT_TIMEOUT,
    }).done(function (response) {
		sessionStorage.setItem('UserDetails', response);	
		firstname = response.firstname;
		lastname = response.lastname;
		var email = response.email;
		company = response.company;
		phone = response.phone;
		var country = response.country;
		var date = response.date;
		var period = response.period;
		$("#firstname").html(firstname);
		$("#lastname").html(lastname);
		$("#email").html(email);
		$("#company").html(company);
		$("#phone").html(phone);
		$("#country").html(country);
		$("#date").html(date);
        var left_period = (eval(response.period) >= 0 ) ? response.period : 0;
        if(period != "N/A" || period !== undefined || period !='') {
            var percent_left = ( response.left_period / period ) * 100;
        	$("#period").html("Total "+period +" days");
            $(".progress-group .progress-text").prepend(left_period)
            $(".progress-group .progress-bar").css('width', percent_left +"%");
            if( response.left_period <= 7 )
            {
                $(".progress-group .progress-bar").css('background-color', "red");
            }
        }
        else
        {
            $("#subscription").css("display", "none");
        }
    }).fail(function (jqxhrFail, textStatusFail, errorThrownFail) {
        if (textStatusFail === "timeout") {
            gErrorStatus["error"].push({identifier: 'getAPPVersion', custom_msg: TIMEOUT_MESSAGE, message: errorThrownFail});
        } else {
            gErrorStatus["error"].push({identifier: 'getAPPVersion', custom_msg: errorThrownFail, message: errorThrownFail});
        }
        errorHandler();
    });
}
$(document).on("click", "#but", function () {
	var html ='';
	    var firstname = $("#firstname").text();
	    var lastname = $("#lastname").text();
	    var company = $("#company").text();
	    var phone = $("#phone").text();
		 $("#edit_profiledetail .modal-body #e_firstname").val(firstname);
		 $("#edit_profiledetail .modal-body #e_lastname").val(lastname);
		 $("#edit_profiledetail .modal-body #e_company").val(company);
		 $("#edit_profiledetail .modal-body #e_phone").val(phone);
		 $("#edit_profiledetail .modal-body .error").text('');
         $("#edit_profiledetail").modal('show');
});
$(document).unbind("keyup").keyup(function (e) {
    is_editable = true;
});
	function modifyUserDetails(){
    $(':input', '#addtargetedip')
            .not(':button, :submit, :reset, :hidden')
            .val('');
    $('#profileform').validate({
        onkeyup: false,
        rules: {
    	e_firstname: {
                required: true
            },
            e_lastname: {
                required: true
            },
            e_phone: {
                required: true
            },
            e_company: {
                required: true
            }
        },
        messages: {
        	e_firstname: {required: "Please enter first name."},
        	e_lastname: {
                required: "Please enter last name."
            },
            e_phone: {
                required: "Please enter phone number."
            },
            e_company: {required: "Please enter company name.",
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
            	  var firstname = $("#e_firstname").val();
            	    var lastname = $('#e_lastname').val();
            	    var phone = $('#e_phone').val();
            	    var company = $('#e_company').val();
                //Modify the values from database.
            	    var content = {'firstname': firstname, 'lastname': lastname,'company': company,'phone': phone};
                $.ajax({
                    method: 'POST',
                    url: '/raxakapi/v1/modifyUserDetails/',
                    data: content,
                    success: function (data) {
                	$("#firstname").text(firstname);
                    $("#lastname").text(lastname);
                    $("#company").text(company);
                    $("#phone").text(phone);
                        swal({
                            text : 'Your profile has been successfully updated.',
                            type : "success",
                        });
                        $('#edit_profiledetail').modal('hide');
                    }
                });
            }
        }
    });
	};
//});



function CloseHide() { 
    $('#edit_profiledetail').modal('hide');
};



$(document).ready(function () {
	getUserDetails();
	$("#e_phone").keypress(function (e) {
	     if (e.which != 8 && e.which != 0 && (e.which < 48 || e.which > 57)) {
	        $("#errmsg1").html("Digits Only").show().fadeOut("slow");
	               return false;
	    }
	   });
});
