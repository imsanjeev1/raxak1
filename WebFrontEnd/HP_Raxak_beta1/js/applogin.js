var loginuser = function (){
    var username = $("#loginform input[name='username']").val();
    var password = $("#loginform input[name='password']").val();
    
    //validate formdata entries
    if(!validateForm(username, password)){
        return false;
    }
    
    if(authenticateUser(username, password)){
        $.cookie('name', 'CRxk_b1');
        
        window.location = "index1.html";
    }
};

var validateForm = function (loginform){
    //handle all validation here by js/jq
    var result = true;
    return result;
};

var authenticateUser = function (username, password){
    var result = false;
    var validUsername = 'consumer';//will be from LDAP in future
    var validPassword = 'cloud';//will be from LDAP in future

    if((validUsername === username) && (validPassword === password)){
        result = true;
        console.log('User '+username+' validated!');
    }
    
    if(!result){
        $('.err_log_detail').html('Error login details');
    }else{
        $('.err_log_detail').html('');
    }
    
    return result;
};