//var urlAPI = 'https://130.211.133.165:8089/api/service?category=APPLICATION_SERVICES&count=10&offset=0&sort=ascend';
//var urlAPI_1a = 'https://130.211.133.165:8089/api/service?count=10&offset=0&sort=ascend';
//var urlAPI_1b = 'https://130.211.133.165:8089/api/service?category=APPLICATION_SERVICES&count=10&offset=0&sort=ascend';
//var urlAPI_2 = 'https://130.211.133.165:8089/api/service/8a7040664c0a81f8014c151691734a8a?catalog=90d9650a36988e5d0136988f03ab000f&category=APPLICATION_SERVICES';
//var urlAPI_2a = 'https://130.211.133.165:8089/api/service/property/field_8a7040664c0a81f8014c1516923e4a95';
//var urlAPI_2b = 'https://130.211.133.165:8089/api/service/property/field_8a7040664c0a81f8014c1516923e4a96';
//var urlAPI_2c = 'https://130.211.133.165:8089/api/service/property/field_8a7040664c0a81f8014c1516923e4a99';
//var urlAPI_2d = 'https://130.211.133.165:8089/api/service/property/field_8a7040664c0a81f8014c1516923e4a97';//Note for urlAPI_2d: Selection modified to "Amazon Linux" for Platform type
//var urlAPI_2e = 'https://130.211.133.165:8089/api/service/property/field_8a7040664c0a81f8014c1516923e4a98';
//var urlAPI_2fa = 'https://130.211.133.165:8089/api/service/property/field_8a7040664c0a81f8014c1516926c4aae';
////same as above; depends upon DYNAMIC FIELD-ID returned by API 
//var urlAPI_2fb = 'https://130.211.133.165:8089/api/service/property/field_8a7040664c0a81f8014c1516926c4aae';
//var urlAPI_3 = 'https://130.211.133.165:8089/api/service/8a7040664c0a81f8014c151691734a8a?catalog=90d9650a36988e5d0136988f03ab000f';
//
//flow 2: To show Existing subscriptions
//var urlAPI2_1 = 'https://130.211.133.165:8089/api/subscription?count=10&offset=0&sort=newest';
//var urlAPI2_2 = 'https://130.211.133.165:8089/api/subscription/8a7040664c0a81f8014c7f1128e10e8c';//Note: Need to call Dynamically!

var urlAPI = '/HP_Raxak_beta1/myapidata/1services_all.html';//test url
var urlAPI_1a = '/HP_Raxak_beta1/myapidata/1services.html';//dataString = 'count=10&offset=0&sort=ascend';
var urlAPI_1b = '/HP_Raxak_beta1/myapidata/1services_rxk.html';
var urlAPI_2 = '/HP_Raxak_beta1/myapidata/2services.html';
var urlAPI_2a = '/HP_Raxak_beta1/myapidata/2services_2a.html';
var urlAPI_2b = '/HP_Raxak_beta1/myapidata/2services_2b.html';
var urlAPI_2c = '/HP_Raxak_beta1/myapidata/2services_2c.html';
var urlAPI_2d = '/HP_Raxak_beta1/myapidata/2services_2d.html';//Note for urlAPI_2d: Selection modified to "Amazon Linux" for Platform type
var urlAPI_2e = '/HP_Raxak_beta1/myapidata/2services_2e.html';
var urlAPI_2fa = '/HP_Raxak_beta1/myapidata/2services_2fa.html';
var urlAPI_2fb = '/HP_Raxak_beta1/myapidata/2services_2fb.html';
var urlAPI_3 = '/HP_Raxak_beta1/myapidata/3services.py';

var urlAPI2_1 = '/HP_Raxak_beta1/myapidata/2flow_service_1.html';
var urlAPI2_2 = '/HP_Raxak_beta1/myapidata/2flow_service_2.html';



if(typeof $.cookie('name') === 'undefined'){
    console.log('cukie=undefined');
    //$('.err_log_detail').html('Plz login first!');
    window.location = "index.html";
}    
if($.cookie('name') !== 'CRxk_b1'){
    console.log('cukie='+$.cookie('name'));
    window.location = "index.html";
}


var logout = function (){
    $.removeCookie('name');
    window.location = "index.html";
};


$(document).ready(function () {
    //Start: Default API call(s) to load the page content
    //defaultFunction(urlAPI);
    //End: Default API call(s) to load the page content

    //1 Start: Category page data 
    $(document).on('change', '#select_category', function (e) {
        console.log('select_category = ' + $('#select_category').val());
        //var categoryVM = this.options[e.target.selectedIndex].text;//select option text

        if ($('#select_category').val() === '5') {
            urlAPI = urlAPI_1a;
        } else {
            urlAPI = urlAPI_1b;
        }
        defaultFunction(urlAPI);
    });
    //1 End: Category page data

    //2 Start: Page 2 Events 
    $(document).on('change', '.select_account', function (e) {
        var optionSelected = $("option:selected", this);
        var valueSelected = this.value;
        if('us-west-2' === valueSelected){
            callRegionChanger();
        }else{
            serviceOptions();
        }
    });
    
    $(document).on('change', '.select_elbProtocol', function (e) {
        var optionSelected = $("option:selected", this);
        var valueSelected = this.value;
        if('http' === valueSelected){
            replaceSelectHtml(urlAPI_2fa, 'select_ec2Protocol');
        }
        if('tcp' === valueSelected){//<-------------------------------------Err: My test returns 0 for tcp and 1 for secure tcp in browser console; whereas response from API shows "tcp", etc as values => Dynamic value asignment each time by HP!
            replaceSelectHtml(urlAPI_2fb, 'select_ec2Protocol');
        }
    });
    //2 End: Page 2 Events 
    
    
});

/********************* Page 1 Starts here *************************************/
var defaultFunction = function (urlAPI) {
    $("#cat_vmachine").html('');//Clear previous data

    $.ajax({
        type: "get",
        url: urlAPI,
        dataType: "json",
        //data: dataString,
        success: function (response) {

            drawCatalogListDiv(response);
        },
        error: function (e) {
            console.log('ERROR: ' + e.message);
            $("#cat_vmachine").html('<div>Error: Please try again...</div>');
        }
    });
};

var drawCatalogListDiv = function (data) {
    var countDataRow = data.length;
    var divHtml = '';
    var tempUrl = 'index2.html';

    for (var i = 0; i < countDataRow; i++) {
        var publishDate = data[i].publishedDate;
        //publishDate = publishDate.split("-");
        //publishDate = new Date(publishDate[2], publishDate[1] - 1, publishDate[0]);

        divHtml += "<div class='list'>";
        divHtml += " <a href='" + tempUrl + "'>";
        divHtml += "     <div class='pro_box'><img src='images/cl_logo.png' /></div>";
        //divHtml+= "     <div class='pro_box'><img src='"+data[i].image+"' /></div>";//uncomment to get dynamic image
        divHtml += "     <div class='pro_con'>";
        divHtml += "         <h3>" + data[i].displayName + " (" + data[i].offeringVersion + ")</h3>";
        divHtml += "         <p>" + data[i].category.displayName + "</p>";
        divHtml += "         <div class='pro_small'>" + data[i].catalogName + "</div>";
        divHtml += "         <div class='pro_small'>Published On " + publishDate + "</div>";
        divHtml += "     </div>";
        divHtml += "     <div class='price_box'>";
        divHtml += "         <b>from: " + data[i].initPrice.currency + " " + data[i].initPrice.price + "</b>";
        divHtml += "         <br />+ " + data[i].recurringPrice.currency + " " + data[i].recurringPrice.price + " " + data[i].recurringPrice.basedOn + "";
        divHtml += "         <div class='cl'></div>";
        divHtml += "     </div>";
        divHtml += " </a>";
        divHtml += " <div class='cl'></div>";
        divHtml += "</div>";
    }

    $("#cat_vmachine").append(divHtml);
};
/********************* Page 1 Ends here *************************************/

/********************* Page 2 Starts here *************************************/
/**
 * Page 2: Service Options
 */
var serviceOptions = function () {
    
    $.ajax({
        type: "get",
        url: urlAPI_2,
        dataType: "json",
        //data: dataString,
        success: function (response) {
            
            showServiceDetail(response);
            showServerDetail(response.layout[0]);
            showServerSpecifications(response);
            
        },
        error: function (e) {
            console.log('ERROR: ' + e.message);
            //$("#cat_vmachine").html('<div>Error: Please try again...</div>');
        }
    });
};

var showServiceDetail = function (response){
    var divHtml = '';
    var tempUrl = '#';
    var publishDate = response.publishedDate;
    //publishDate = publishDate.split("-");
    //publishDate = new Date(publishDate[2], publishDate[1] - 1, publishDate[0]);

    divHtml += " <a href='" + tempUrl + "'>";
    divHtml += "     <div class='pro_box'><img src='images/cl_logo.png' /></div>";
    //divHtml+= "     <div class='pro_box'><img src='"+response.image+"' /></div>";//uncomment to get dynamic image
    divHtml += "     <div class='pro_con'>";
    divHtml += "         <h3>" + response.displayName + " (" + response.offeringVersion + ")</h3>";
    divHtml += "         <p>" + response.category.displayName + "</p>";
    divHtml += "         <div class='pro_small'>Published On " + publishDate + "</div>";
    divHtml += "     </div>";
    divHtml += "     <div class='price_box'>";
    divHtml += "         <b>from: " + response.initPrice.currency + " " + response.initPrice.price + "</b>";
    divHtml += "         <br />+ " + response.recurringPrice.currency + " " + response.recurringPrice.price + " " + response.recurringPrice.basedOn + "";
    divHtml += "         <div class='cl'></div>";
    divHtml += "     </div>";
    divHtml += " </a>";
    divHtml += " <div class='cl'></div>";

    $(".list").append(divHtml);
};

var showServerDetail = function (data){
    var divHtml = '';
    var imageUrl = 'images/default.png';
    //var imageUrl = response.layout.image;

    divHtml += " <div class='pro_d_im'><img src='"+imageUrl+"' /></div>";
    divHtml += " <div class='pro_d_con'><h3>"+data.displayName+"</h3>"+data.description+"</div>";
    divHtml += " <div class='cl'></div>";

    $(".middle_section .pro_d").html(divHtml);
};

var showServerSpecifications = function (response){
    var divHtml = '';
    var btm_bxHtml = '';

    divHtml += generateServerHtml(response.fields[0]);
    
    divHtml += "<div class='grey_box'>";
    divHtml += generateSelectHtml(response.fields[1]);
    divHtml += generateSelectHtml(response.fields[2]);
    divHtml += generateSelectHtml(response.fields[3]);
    divHtml += generateSelectHtml(response.fields[4]);
    divHtml += generateSelectHtml(response.fields[5]);
    divHtml += generateSelectHtml(response.fields[8]);
    divHtml += generateSelectPlusHtml(response.fields[6]);
    divHtml += generateTextFieldHtml(response.fields[7]);
    divHtml += generateSelectHtml(response.fields[9]);//8a
    divHtml += generateSelectHtml(response.fields[11]);//8c
    divHtml += generateTextFieldHtml(response.fields[10]);//8b
    divHtml += generateTextFieldHtml(response.fields[12]);//8d
    divHtml += "</div>";//close grey_box div

    $("#grey_box_wp").html(divHtml);
    
    //todo: Start: Need to check here
    var imageUrl = 'images/default.png';
    //var imageUrl = response.layout.image;
    btm_bxHtml += "<div class='pro_d'>";
    btm_bxHtml += " <div class='pro_d_im'><img src='"+imageUrl+"' /></div>";
    btm_bxHtml += " <div class='pro_d_con'><h3>"+response.layout[0].displayName+"</h3>"+response.layout[0].description+"</div>";
    btm_bxHtml += " <div class='cl'></div>";
    btm_bxHtml += "</div>";
    btm_bxHtml += "<div class='cl'></div>";
    //todo: End: Need to check here
    
    btm_bxHtml += "<div id='grey_box_wp_btm' class='grey_box_wp'>";
    btm_bxHtml += generateServerHtml(response.fields[13]);
    btm_bxHtml += "<div class='grey_box'>";
    btm_bxHtml += generateSelectPlusHtml(response.fields[14]);
    btm_bxHtml += generateSelectPlusHtml(response.fields[15]);
    btm_bxHtml += "</div>";//close grey_box div
    btm_bxHtml += "<div class='cl'></div>";
    btm_bxHtml += "</div>";//close grey_box_wp_btm div
    
    $(".btm_bx").html(btm_bxHtml);
};

/**
 * generateServerHtml fuction is called from showServerSpecifications() for page2(Service option)
 * @param {type} field
 * @returns {String}
 */
var generateServerHtml = function (field) {
    var divHtml = '';
    divHtml += "<div class='grey_wp_left'>";
    divHtml += "    <input type='radio' id='"+field.id+"' name='"+field.name+"' checked>";
    divHtml += "    "+field.displayName+"<br /><span>"+field.description+"</span>";
    divHtml += "</div>";
    divHtml += "<div class='grey_wp_left price_b'>";
    divHtml += "    Initial Price: <b>"+field.initPrice.currency+" "+field.initPrice.price+"</b><br>";
    divHtml += "    Recurring Price: <b>"+field.recurringPrice.currency+" "+field.recurringPrice.price+" "+field.recurringPrice.basedOn+"</b>";
    divHtml += "</div>";
    divHtml += "<div class='cl'></div>";

    return divHtml;
};

/**
 * generateSelectHtml fuction is called from showServerSpecifications() for page2(Service option)
 * @param {type} field
 * @returns {String}
 */
var generateSelectHtml = function (field){
    var divHtml = '';
    divHtml += "<div class='select_row'>";
    divHtml += "    <h5>"+field.displayName+"</h5>";
    divHtml += "    <h6>"+field.description+"</h6>";
    divHtml += "    <select id='"+field.id+"' class='select_"+field.name+"'>";
    
    var selectCount = field.availableValues.length;
    var tmp_opt = '';
    for(var tmpi = 0; tmpi < selectCount; tmpi++){
        if(field.value === field.availableValues[tmpi].value){
            tmp_opt = ' selected="selected"';
        }else{
            tmp_opt = '';
        }
        divHtml += "<option value='"+field.availableValues[tmpi].value+"'"+tmp_opt+">";
        divHtml += field.availableValues[tmpi].displayName;
        divHtml += "</option>";
    }
    divHtml += "    </select>";
    divHtml += "</div>";
    
    return divHtml;
};

/**
 * generateSelectPlusHtml fuction is called from showServerSpecifications() for page2(Service option)
 * @param {type} field
 * @returns {String}
 */
var generateSelectPlusHtml = function (field){
    var divHtml = '';
    divHtml += "<div class='select_row'>";
    divHtml += "    <h5>"+field.displayName+"</h5>";
    divHtml += "    <select id='"+field.id+"' class='select_"+field.name+"'>";
    
    var selectCount = field.availableValues.length;
    var tmp_opt = '';
    for(var tmpi = 0; tmpi < selectCount; tmpi++){
        if(field.value === field.availableValues[tmpi].value){
            tmp_opt = ' selected="selected"';
        }else{
            tmp_opt = '';
        }
        divHtml += "<option value='"+field.availableValues[tmpi].value+"'"+tmp_opt+">";
        divHtml += field.availableValues[tmpi].displayName;
        divHtml += " &mdash; "+field.availableValues[tmpi].initPrice.currency+" "+field.availableValues[tmpi].initPrice.price;
        divHtml += " + "+field.availableValues[tmpi].recurringPrice.currency+" "+field.availableValues[tmpi].recurringPrice.price+" "+field.availableValues[tmpi].recurringPrice.basedOn+'LY';
        divHtml += "</option>";
    }
    divHtml += "    </select>";
    divHtml += "</div>";
    
    return divHtml;
};

/**
 * generateTextFieldHtml fuction is called from showServerSpecifications() for page2(Service option)
 * @param {type} field
 * @returns {String}
 */
var generateTextFieldHtml = function (field){
    var divHtml = '';
    divHtml += "<div class='select_row'>";
    divHtml += "    <h5>"+field.displayName+"</h5>";
    
    if(typeof field.description !== 'undefined' ){
        divHtml += "    <h6>"+field.description+"</h6>";
    }
    
    var tmp_val = '';
    if(typeof field.description === 'undefined' ){
        tmp_val = " value=''";
    }else{
        tmp_val = " value='"+field.value+"'";
    }
    
    divHtml += "    <input type='text' name='"+field.name+"'"+tmp_val+" maxValue='"+field.maxValue+"' minValue='"+field.minValue+"' id='"+field.id+"'>";
    divHtml += "</div>";
    
    return divHtml;
};

/***** *** Start: Page 2 Events Handlers *** *****/

var callRegionChanger = function(){
    replaceSelectHtml(urlAPI_2a, 'select_AvailabilityZone');
    replaceSelectHtml(urlAPI_2b, 'select_keypair');
    replaceSelectHtml(urlAPI_2c, 'select_elb');
    replaceSelectHtml2(urlAPI_2d, 'select_PlatformType', 'Amazon Linux#us-west-2');
    replaceSelectHtml(urlAPI_2e, 'select_image');
};

var replaceSelectHtml2 = function (url, identityClass, defaultSelected){
    $.ajax({
        type: "get",
        url: url,
        dataType: "json",
        //data: dataString,
        success: function (response) {
            var countObject = response.length;
            var newOptions = '';
            var selOpt = '';
            for (var i = 0; i < countObject; i++) {
                if(defaultSelected === response[i].value){
                    selOpt = ' selected="selected"';
                }else{
                    selOpt = '';
                }
                newOptions += "<option value='" +response[i].value+ "''"+selOpt+">" +response[i].displayName+ "</option>";
            }
            $('.'+identityClass).empty().html(newOptions);
        },
        error: function (e) {
            console.log('Error= '+ e.message);
        }
    });
};

var replaceSelectHtml = function (url, identityClass){
    $.ajax({
        type: "get",
        url: url,
        dataType: "json",
        //data: dataString,
        success: function (response) {
            var countObject = response.length;
            var newOptions = '';
            for (var i = 0; i < countObject; i++) {
                newOptions += "<option value='" +response[i].value+ "'>" +response[i].displayName+ "</option>";
            }
            $('.'+identityClass).empty().html(newOptions);
        },
        error: function (e) {
            console.log('Error= '+ e.message);
        }
    });
};

/***** *** End: Page 2 Events Handlers *** *****/

/********************* Page 2 Ends here *************************************/

/********************* Page 3 Starts here *************************************/
var orderOptions = function () {
//    document.getElementById('#showstartDate').valueAsDate = new Date();
//    document.getElementById('#showendDate').valueAsDate = new Date();
    var currentDate = new Date().toDateInputValue().slice(0,10);
    $('#showstartDate').val(currentDate);

    var todayDate = new Date(currentDate);
    todayDate.setDate(todayDate.getDate() + 1);
    
    $('#showendDate').val(todayDate.toDateInputValue().slice(0,10));
    $('#startDate').val(new Date().toDateInputValue());
    $('#endDate').val(todayDate.toDateInputValue());
    
};
Date.prototype.toDateInputValue = (function() {
    var local = new Date(this);
    local.setMinutes(this.getMinutes() - this.getTimezoneOffset());
    return local.toJSON().slice(0,24);
});

/***** *** *** Page 3 form start *** *** *****/ 
//callback handler for form submit
$("#trickydata").submit(function(e){
//    var postData = $(this).serializeArray();
    var postData = $(this);
    console.log(postData);
//    var formURL = $(this).attr("action");
//    $.ajax(
//    {
//        url : urlAPI_3,
//        type: "POST",
//        data : postData,
//        dataType: "json",
//        success:function(data, textStatus, jqXHR) 
//        {
//            //data: return data from server
//            console.log(data);
//        },
//        error: function(jqXHR, textStatus, errorThrown) 
//        {
//            //if fails      
//        }
//    });
//    e.preventDefault(); //STOP default action
//    e.unbind(); //unbind. to stop multiple form submit.
});
/***** *** *** Page 3 form end *** *** *****/ 

//3 Start: Page 3 Events 
var requestOrder = function (){
    $("#trickydata").submit();
//    window.location.href = 'Request_Confirmation.html';
};
//3 End: Page 3 Events 

/********************* Page 3 Ends here *************************************/



/*************** Flow2: Page 1: Start: List subscription **********************/

var subscriptionPage = function (){
    $.ajax({
        type: "get",
        url: urlAPI2_1,
        dataType: "json",
        //data: dataString,
        success: function (response) {
            
            subscriptionListHtml(response);
        },
        error: function (e) {
            console.log('ERROR: ' + e.message);
            //$("#cat_vmachine").html('<div>Error: Please try again...</div>');
        }
    });
};

var subscriptionListHtml = function (data){
    var countDataRow = data.length;
    var divHtml = '';
    var tempUrl = 'subscription_details.html';
    
    for (var i = 0; i < countDataRow; i++){
        divHtml += "<div class='subscription_row'>";
        divHtml += "    <div class='subscription_list'>";
        divHtml += "        <div class='sbsc_left'>";
        divHtml += "            <a href='" + tempUrl + "'>";
        divHtml += "                <div class='sbsc_pro'><img src='images/cl_logo.png' /></div>";
        divHtml += "                <div class='sbsc_dtl'>";
        divHtml += "                    <h3>"+data[i].name+"</h3>";
        divHtml += "                    <span class='terminated'>"+data[i].status+"</span>";
        divHtml += "                </div>";
        divHtml += "                <div class='sbsc_con'>";
        divHtml += "                    <div class='cube'><i class='fa fa-cube'></i>"+data[i].name+"</div>";
        divHtml += "                    <div class='consumer'><i class='fa fa-user'></i>"+data[i].owner+"</div>";
        divHtml += "                    <div class='renew'><i class='fa fa-history'></i>"+data[i].modifiable+"</div>";
        divHtml += "                    <div class='price_row'><i class='fa fa-usd'></i>Initial Price: <b>"+data[i].initPrice.currency+" "+data[i].initPrice.price+"</b></br />";
        divHtml += "                        Recurring Price: <b>"+data[i].recurringPrice.currency+" "+data[i].recurringPrice.price+" "+data[i].recurringPrice.basedOn+"</b></div>";
        divHtml += "                </div>";
        divHtml += "            </a>";
        divHtml += "        </div>";
        divHtml += "        <div class='delete_bx'>";
        divHtml += "            <a href='#'>";
        divHtml += "                <button class='round_btn' id='delete'><i class='fa fa-trash'></i></button><br />Delete";
        divHtml += "            </a>";
        divHtml += "        </div>";
        divHtml += "        <div class='cl'></div>";
        divHtml += "    </div>";
        divHtml += "</div>";
    }
    
    $(".list_all_subscription").append(divHtml);
};

/***************** Flow2: Page 1: End: List subscription **********************/

/*************** Flow2: Page 2: Start: subscription detail ********************/
var subscriptionDetailPage = function (){
    $.ajax({
        type: "get",
        url: urlAPI2_2,
        dataType: "json",
        //data: dataString,
        success: function (response) {
            
            subscriptionDetailHtml(response);
        },
        error: function (e) {
            console.log('ERROR: ' + e.message);
            //$("#cat_vmachine").html('<div>Error: Please try again...</div>');
        }
    });
};

var subscriptionDetailHtml = function (data){
    var countDataRow = data.length;
    var divHtml = '';
    
    console.log(data);
    //divHtml += getHtml_sub_dtl();
    
    
    $(".list_all_subscription").append(divHtml);
};

var getHtml_sub_dtl = function (data){
    var divHtml = '';
    
    divHtml += "<div class='sub_dtl'>";
    divHtml += "    <div class='sub_im_bx'><img src='images/cl_logo.png' alt='' /></div>";
    divHtml += "    <div class='sub_dtl_left'>";
    divHtml += "        <h3>"+data.ownerEmail+"</h3>";
    divHtml += "        <h3>"+data.name+"</h3>";
    divHtml += "        <span class='terminated'>"+data.status+"</span>";
    divHtml += "    </div>";
    divHtml += "    <div class='sbsc_con'>";
    divHtml += "        <div class='cube'><i class='fa fa-cube'></i>"+data.serviceName+"</div>";
    divHtml += "        <div class='consumer'><i class='fa fa-user'></i>"+data.owner+"</div>";
    divHtml += "        <div class='renew'><i class='fa fa-history'></i>"+data.modifiable+"</div>";
    divHtml += "    </div>";
    divHtml += "    <div class='cl'></div>";
    divHtml += "</div>";
    
    return divHtml;
//    <div class='sub_im_bx'><img src='images/cl_logo.png' alt='' /></div>
//    <div class='sub_dtl_left'>
//        <h3>consumer@csaconsumer.com</h3>
//        <h3>Raxak-CSA Integration (1.0.0)</h3>
//        <span class='terminated'>Terminated Subscription</span>	
//    </div>
//    <div class='sbsc_con'>
//        <div class='cube'><i class='fa fa-cube'></i>Amazon EC2 Simple Compute (1.0.0)</div>
//        <div class='consumer'><i class='fa fa-user'></i>consumer</div>
//        <div class='renew'><i class='fa fa-history'></i>March 6, 2015 - March 8, 2015</div>
//    </div>
//    <div class='cl'></div>
};
/*************** Flow2: Page 2: End: subscription detail ********************/


