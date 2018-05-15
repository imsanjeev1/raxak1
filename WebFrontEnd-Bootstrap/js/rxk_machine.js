/* 
 * Js for Target Machine Page
 */
var prev_name = '';
var prev_nickname = '';
var prev_ipaddress = '';
var prev_tunnel_name = '';
var prev_tunnel_ip = '';
var oldsshport = '';
var editobject = '';
var is_editable = false;
var gCSVFileFlag = '';
var g_ServerGroups = '';
var g_prev_groupname = '';
var detailRows = [];
var isCallDual = false;
var iseCallDual = false;
var isUpadateGroups = false;
var DEFAULT_TIMEOUT = 10 * 1000;//10 seconds

function changeUserIpDetailAction(action) {
    $("#add_ip_details_user_selection").val(action);

    document.getElementById('private_ip').checked = false;
    $('.private_ip_fields').hide();

    $('#username').val('');
    $('#ipaddress').val('');
    $('#nickname2').val('');
    $('#username_pip').val('');
    $('#paswd_pip').val('');
    $('#ipaddress_pip').val('');
 
    if (action == 'add_by_ip_details') {
        $("#addtmip").show();
        $("#addtmip_csv").hide();
    }
    if (action == 'add_by_csv_file') {
        $("#addtmip").hide();
        $("#addtmip_csv").show();
    }
}

function displayTogglePrivateInputs(divid, chkboxid) {
    if (document.getElementById(chkboxid).checked == true) {
        $('#' + divid).show();
    } else {
        $('#' + divid).hide();
        $('#' + divid +" input").val('');
    }
}

function checkUsername(username) {
    var check_user = /^[a-zA-Z0-9~!#^%*&`\_\-{|}/'$?+=]+([\.]?[a-zA-Z0-9~!#^%*&`\_\-{|}/'$?+=]+)?$/;
    var msg = 'Valid username';
    var result = true;
    username = username.trim();

    if (username === '') {
        msg = 'Please enter Username';
        result = false;
    } else if ((username.length < 1) || (username.length > 20)) {
        msg = 'Username should not be more than 20 characters';
        result = false;
    } else if ((username !== '') && username.match(' ')) {
        msg = 'Spaces not allowed in Username';
        result = false;
    } else if (!username.match(check_user)) {
        msg = 'Please enter a valid Username';
        result = false;
    }

    return {
        result: result,
        message: msg
    };
}

function checkNickname(nickname) {
    var check_nickname = /^[Aa-zZ0-9\.\@]*/;
    var msg = 'Valid nickname';
    var result = true;
    if (nickname !== '') {
        nickname = nickname.trim();
    }
    return {
        result: result,
        message: msg
    };
}

function checkIPAddress(ipAddress) {
    var RegE = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    var msg = 'Valid IP Address';
    var result = true;
    ipAddress = ipAddress.trim();
    if (ipAddress === '') {
        msg = 'Please enter IP Address';
        result = false;
    }
    if (ipAddress.match(RegE)) {
        msg = 'Please enter valid IP Address';
        result = false;
    }
    return {
        result: result,
        message: msg
    };
}

function checkPrivatePassword(password) {
    var msg = 'Valid Password';
    var result = true;
    password = password.trim();
    if (password === '') {
        msg = 'Please enter password';
        result = false;
    }
    return {
        result: result,
        message: msg
    };
}

function addTargetedIpDetails() {
    // var user_action = 'add_by_ip_details';
    // if (document.getElementById('add_ip_details_csv').checked == true) {
    //     user_action = 'add_by_csv_file';
    // }

    // if (user_action == 'add_by_csv_file') {
    //     addByCSVFile();
    // } else if (user_action == 'add_by_ip_details') {
    // }
    var user_val = $("#user_name").val();
    var user_ip = $("#ipaddress").val();
    var user_nickname = $("#nickname2").val();

    checkData(user_val, user_ip, user_nickname);
    return false;
}
//@ upload csv file to add multiple server at once.
function addByCSVFile() {
    if (!gCSVFileFlag) { //gCSVFileFlag is global
        $('#add_error_msg').text('Please upload CSV file only.');
        return false;
    }

    var dataCount = gCSVIPDetail.length; //gCSVIPDetail is global
    var ipToAdd = [];
    var failedIp = [];
    var failedIpHtml = '<div class="table-responsive" style="overflow-y: auto;max-height: 500px;"><table border="1" width="100%" cellpadding="0" cellspacing="0"  class="table table-hover table-bordered"><tr><th>Target Machine Detail</th><th>Reason</th></tr>';
    if (dataCount > 0) {
        for (var tmpj = 0; tmpj < dataCount; tmpj++) {
            var arrDetail = gCSVIPDetail[tmpj];
            if (arrDetail.length > 1) {
                var csv_user_val = arrDetail[0];
                var csv_user_ip = arrDetail[1];
                var csv_user_nickname = arrDetail[2];
                var csv_pip_usrname = arrDetail[3];
                var csv_pip_paaswrd = arrDetail[4];
                var csv_pip_tunelip = arrDetail[5];

                if ((typeof csv_user_nickname === 'undefined')) {
                    csv_user_nickname = '';
                }

                if ((typeof csv_pip_usrname === 'undefined')) {
                    csv_pip_usrname = '';
                }

                if ((typeof csv_pip_paaswrd === 'undefined')) {
                    csv_pip_paaswrd = '';
                }

                if ((typeof csv_pip_tunelip === 'undefined')) {
                    csv_pip_tunelip = '';
                }

                //validate data
                var result = verifyCsvData(csv_user_val, csv_user_ip, csv_user_nickname, csv_pip_usrname, csv_pip_paaswrd, csv_pip_tunelip);
                if (result[0]) {
                    ipToAdd.push(arrDetail);
                } else {
                    failedIp.push(arrDetail);
                    failedIpHtml += '<tr><td>' + arrDetail + '</td><td>' + result[1] + '</td></tr>';
                }
            } else {
                failedIp.push(arrDetail);
                failedIpHtml += '<tr><td>' + arrDetail + '</td><td>No data or Invalid detail format;<br>Expecting: username,IP address,nickname(optional)</td></tr>';
            }
        }
    }
    failedIpHtml += '</table></div>';

    var addIpCounts = ipToAdd.length;

    if (addIpCounts > 0) {

        //Start:: Slice the csv data in chunk of defined length.

        var chunk = 10;
        var finalIpToAdd = [],
                i, len;
        $('#load_percentage').text('0%');
        for (i = 0, len = addIpCounts; i < len; i += chunk) {
            finalIpToAdd.push(ipToAdd.slice(i, i + chunk));
        }

        //End:: Slice the csv data in chunk of defined length.

        // Start: Add block
        //var json_ipToAdd = JSON.stringify(ipToAdd);
        var json_failedIp = JSON.stringify(failedIp);

        var addedIp = [];
        var addedTMDetail = [];
        //Duplicate ips on server
        var duplicateIpHtml = '';
        var duplicateIp = [];
        var CSVReportHtml = '';

        $(finalIpToAdd).each(function (index, data) {
            var json_finalIpToAdd = JSON.stringify(data);
            var content = {
                ipList: json_finalIpToAdd
            };
            $.ajax({
                method: 'POST',
                data: content,
                async: false,
                url: API_CALL_PREFIX + "addMultipleIPs/",
                beforeSend: function () {
                    $('#addtargetmachineinfo').modal('hide');
                    $('#ajaxloader').show();
                }
            }).done(function (responseData) {
                var jsonCSVResults = responseData;
                jsonCSVResults = jsonCSVResults['SUCCESS'];
                var countTMResults = jsonCSVResults.length;

                //return;
                for (var csv_i = 0; csv_i < countTMResults; csv_i++) {
                    //-99 show for this only
                    if (jsonCSVResults[csv_i][0].access == -99) {
                        duplicateIpHtml += '<br>' + jsonCSVResults[csv_i][0].ip;
                        duplicateIp.push(jsonCSVResults[csv_i][0].ip);
                    } else {
                        addedIp.push(jsonCSVResults[csv_i][0].ip);
                        addedTMDetail.push([jsonCSVResults[csv_i][0].access,
                            jsonCSVResults[csv_i][0].ip,
                            jsonCSVResults[csv_i][0].nickname
                        ]);
                    }
                }
                //@ calculate percentage to show in progress bar.
                var addedIpCounts = addedIp.length;
                if (addedIpCounts > 0) {
                    var percentage = Math.round((addedIpCounts / dataCount) * 100);
                    $('#load_percentage').text(percentage + '%');
                }
            }).fail(function (jqxhrFail, textStatusFail, errorThrownFail) {
                gCSVIPDetail = []; //clearing here
                errorHandler(jqxhrFail);
            }); // End: Add ajax block */
        }); // End: final ip each block*/

        // Start:: New changes to manage timeout and generate html to show upload report.

        if (addedIp.length > 0) {
            CSVReportHtml += '<p>' + addedIp.length + ' Target machine(s) added successfully.</p>';
            var table = $('#editable-sample').dataTable();
            for (var j = 0; j < addedIp.length; j++) {
                var rowIdHtml = addedTMDetail[j][1];
                var reAccHtml = "reCheckAccess('" + addedTMDetail[j][1] + "')";
                var reAccIDHtml = "chkbx_" + addedTMDetail[j][1];
                var ruleclass = TM_ACCESS_NORMS[addedTMDetail[j][0]].cssclass;
                var newRow = table.fnAddData([
                    '<td><input type="checkbox" name="checkbox" id="' + reAccIDHtml + '" value=' + addedTMDetail[j][1] + '></td>',
                    addedTMDetail[j][1].split('@')[0],
                    addedTMDetail[j][1].split('@')[1],
                    addedTMDetail[j][2],
                    //TM_ACCESS_NORMS[addedTMDetail[j][0]].status,
                    'N/A',
                    'N/A',
                    '22', // adding default port
                    '<td style="text-align:center"><a href="javascript:void(0)" class="singleaccess" title="Recheck access to target machine"><i class="fa fa-fw fa-exchange" style="font-size:16px"></i></a></td>',
                    '<td align="center"><a href="javascript:void(0)" class="edit_tm_info" title="Edit target machine details"><i class="fa fa-fw fa-pencil"></i></a></td>',
                    '<td align="center"><a href="javascript:void(0)" class="delete"><i class="fa fa-fw fa-trash-o" title="Delete target machine"></i></a></td>'
                ]);
                var newDTRow = table.fnSettings().aoData[newRow[0]].nTr;
                $(newDTRow).attr('id', rowIdHtml);
                $(newDTRow).attr('class', ruleclass);
            }

            var length = table.fnSettings().fnRecordsDisplay();
            $('#servercounts').text(' (' + length + ')');
            var tmCountSession = sessionStorage.getItem('gEnrolledTMCount');
            if (tmCountSession == 0)
                $('#enrolledservers').show();
            getTMs(); //refresh session after showing the table
        } else {
            CSVReportHtml += '<p>Not able to add any target machine</p>';
        }
        //failed Ips
        if (failedIp.length > 0) {
            CSVReportHtml += '<p>' + failedIp.length + ' Target machine(s) failed to add : </p>';
            CSVReportHtml += failedIpHtml;
        }
        if (duplicateIp.length > 0) {
            CSVReportHtml += '<p>' + duplicateIp.length + ' Target machine(s) already exists' + duplicateIpHtml + '</p>';
        }
        $('#ajaxloader').hide();

        //Upload report
        $('#errorModal .modal-title').html('CSV Upload Status');
        $('#errorModal .modal-body').html(CSVReportHtml);
        $('#errorModal').modal('show');
        //End: Upload report
        gCSVIPDetail = []; //clearing here
    } else {
        $('#addtargetmachineinfo').modal('hide');
        //Start: Upload report (client side validation not cleared)
        var CSVReportHtml = '<p>Not able to add any target machine</p>';
        //failed Ips
        if (failedIp.length > 0) {
            CSVReportHtml += '<p>' + failedIp.length + ' Target machine(s) failed to add:</p>';
            CSVReportHtml += failedIpHtml;
        } else {
            CSVReportHtml = '<p>File is blank or contains invalid detail format</p>';
            CSVReportHtml += '<p>Format : username, IP address, nickname(optional)</p>';
            CSVReportHtml += '<p class="showrules">Example : raxak, 192.168.0.1, test_machine</p>';
        }
        //Upload report
        $('#errorModal .modal-title').html('Csv Upload Status'); //CSVReportHtml
        $('#errorModal .modal-body').html(CSVReportHtml);
        $('#errorModal').modal('show');
        //End: Upload report (client side validation not cleared)
        gCSVIPDetail = []; //clearing here
    }
    $('.singleaccess, .edit_tm_info, .delete').parent().attr('align', 'center');
    $("input#uploadcsvfile").val('');
    gCSVFileFlag = false; //resetting
}

function checkData(user_val, user_ip, user_nickname) {
    var error_flag = 0;
    var error_msg = '';
    var portnumber = '';
    var portRegE = /^([1-9][0-9]*)$/;
    var is_sshport = $('#chksshport').is(":checked");
    var is_private = $('#private_ip').is(":checked");
    var check_user = /^[a-zA-Z0-9~!#^%*&`\_\-{|}/'$?+=]+([\.]?[a-zA-Z0-9~!#^%*&`\_\-{|}/'$?+=]+)?$/;
    var RegE = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    //var portRegE = /^([1-9]{1,4}?)(\s-p\s\d+)*$/;

    user_val = user_val.trim();
    user_nickname = user_nickname.trim();

    if (is_sshport)
        var portnumber = $("#sshport").val();

    if (user_val === '' && user_ip === '') {
        error_flag = 1;
        $('#user_name').focus();
        error_msg = 'Please enter Username and IP Address';
    } else if (user_val === '') {
        error_flag = 1;
        $('#user_name').focus();
        error_msg = 'Please enter Username';
    } else if ((user_val.length < 1) || (user_val.length > 20)) {
        error_flag = 1;
        $('#user_name').focus();
        error_msg = 'Username should not be more than 20 characters';
    } else if ((user_val !== '') && user_val.match(' ')) {
        error_flag = 1;
        $('#user_name').focus();
        error_msg = 'Spaces not allowed in Username';
    } else if (!user_val.match(check_user)) {
        error_flag = 1;
        $('#user_name').focus();
        error_msg = 'Please enter a valid Username';
    } else if (user_ip === '') {
        error_flag = 1;
        $('#ipaddress').focus();
        error_msg = 'Please enter IP Address';
    } else if (!user_ip.match(RegE)) {
        error_flag = 1;
        $('#ipaddress').focus();
        error_msg = 'Please enter a valid IP Address';
    } else if (is_sshport && (portnumber === '' || !portnumber.match(portRegE))) {
        error_flag = 1;
        $('#sshport').focus();
        error_msg = 'Please enter SSH Port number';
    } else if (is_private) {
        var private_username = $("#username_pip").val();
        var private_password = $("#paswd_pip").val();
        var private_tunnel_ip = $("#ipaddress_pip").val();
        if (private_username == '') {
            error_flag = 1;
            $('#username_pip').focus();
            error_msg = 'Please enter private IP Username';
        } else if (private_password == '') {
            error_flag = 1;
            $('#paswd_pip').focus();
            error_msg = 'Please enter Password';
        } else if (private_tunnel_ip == '') {
            error_flag = 1;
            $('#ipaddress_pip').focus();
            error_msg = 'Please enter Tunnel IP Address';
        } else if (!private_tunnel_ip.match(RegE)) {
            error_flag = 1;
            $('#ipaddress_pip').focus();
            error_msg = 'Please enter valid Tunnel IP Address';
        }
    }

    if (error_flag) {
        $('#add_error_msg').text(error_msg);
        return false;
    } else {
        var htmlTM = '';
        var ip_list_target = [];
        var ip = user_val + '@' + user_ip;

        if (user_nickname == '')
            user_nickname = ip;

        for (var i = 0; i < gEnrolledTMs.length; i++) {
            ip_list_target.push(JSON.parse(gEnrolledTMs[i]).ip);
        }

        if (ip_list_target.indexOf(ip) != -1) {
            $('#add_error_msg').text("Enrolled server " + ip + " already present in list.");
        } else {
            var pipFlag = false;
            var content = {};
            var uri = "addIP/"
            content["username"] = 'raxak';
            content["ip"] = ip;
            content["nickname"] = user_nickname;
            if (is_sshport && portnumber && portnumber !== '22')
                content["sshport"] = portnumber;

            if (is_private) {
                pipFlag = true;
                content["tunnelusername"] = private_username;
                content["tunnelpassword"] = private_password;
                content["tunnelip"] = private_tunnel_ip;
            }

            $.ajax({
                dataType: 'json',
                method: "post",
                data: content,
                url: API_CALL_PREFIX + uri,
                beforeSend: function () {
                    $('#addtargetmachineinfo').modal('hide');
                    $('#ajaxloader').show();
                }
            }).done(function (responseData) {
                var tmCountSession = sessionStorage.getItem('gEnrolledTMCount');
                if (tmCountSession == 0) {
                    $('#enrolledservers').show();
                }
                swal({
                    text: 'Server has been successfully enrolled.',
                    type: 'success'
                });

                var arrayOfObjects = eval(responseData);

                var obj_nickname = arrayOfObjects[0].nickname;
                var rowIdHtml = arrayOfObjects[0].ip;
                var reAccHtml = "reCheckAccess('" + arrayOfObjects[0].ip + "')";
                var reAccIDHtml = "chkbx_" + arrayOfObjects[0].ip;
                var ruleclass = TM_ACCESS_NORMS[arrayOfObjects[0].access].cssclass;
                if (pipFlag == true) {
                    pUsernameHtml = private_username;
                    pIpHtml = private_tunnel_ip;
                } else {
                    pUsernameHtml = 'N/A';
                    pIpHtml = 'N/A';
                }
                if (arrayOfObjects[0].sshport) {
                    var port = arrayOfObjects[0].sshport;
                } else {
                    var port = '22'; //set default port to show in column
                }
                var table = $('#editable-sample').dataTable();
                /*    
                 var newRow = table.fnAddData([
                 '<td><input type="checkbox" name="checkbox" id="' + reAccIDHtml + '" value=' + arrayOfObjects[0].ip + '></td>',
                 arrayOfObjects[0].ip.split('@')[0],
                 arrayOfObjects[0].ip.split('@')[1],
                 obj_nickname,
                 //'<td>' + TM_ACCESS_NORMS[arrayOfObjects[0].access].status + '</td>',
                 pUsernameHtml,
                 pIpHtml,
                 port,
                 '<td style="text-align:center"><a href="javascript:void(0)" class="singleaccess" title="Recheck access to target machine"><i class="fa fa-fw fa-exchange" style="font-size:16px"></i></a></td>',
                 //'<td><a href="#editinfo" data-toggle="modal" class="edit_tm_info"><i class="fa fa-fw fa-pencil"></i></a></td>',
                 '<td align="center"><a href="javascript:void(0)" class="edit_tm_info" title="Edit target machine details"><i class="fa fa-fw fa-pencil"></i></a></td>',
                 '<td align="center"><a class="delete" href="javascript:void(0)" title="Delete target machine"><i class="fa fa-fw fa-trash-o"></i></a></td>'
                 ]);
                 */
                var newRow = table.fnAddData({
                    'DT_RowId': rowIdHtml,
                    0: '<td><input type="checkbox" name="checkbox" id="' + reAccIDHtml + '" value=' + arrayOfObjects[0].ip + '></td>',
                    1: arrayOfObjects[0].ip.split('@')[0],
                    2: arrayOfObjects[0].ip.split('@')[1],
                    3: obj_nickname,
                    4: pUsernameHtml,
                    5: pIpHtml,
                    6: port,
                    7: '<td style="text-align:center"><a href="javascript:void(0)" class="singleaccess" title="Recheck access to target machine"><i class="fa fa-fw fa-exchange" style="font-size:16px"></i></a></td>',
                    8: '<td align="center"><a href="javascript:void(0)" class="edit_tm_info" title="Edit target machine details"><i class="fa fa-fw fa-pencil"></i></a></td>',
                    9: '<td align="center"><a class="delete" href="javascript:void(0)" title="Delete target machine"><i class="fa fa-fw fa-trash-o"></i></a></td>'
                });
                var newDTRow = table.fnSettings().aoData[newRow[0]].nTr;
                $(newDTRow).attr('id', rowIdHtml);
                $(newDTRow).attr('class', ruleclass);
                $(newDTRow).attr('title', getTitleForNewIP(responseData));

                var length = table.fnSettings().fnRecordsDisplay();
                $('#servercounts').text(' (' + length + ')');
                $("#user_name").val('raxak');
                $("#ipaddress").val('');
                $("#nickname2").val('');
                $("#username_pip").val('');
                $("#ipaddress_pip").val('');
                $("#paswd_pip").val('');
                $('#ajaxloader').hide();

                //if (tmCountSession > 0) {}
                getTMs(); // to reset the sessions,facing recheckdata isuues.
            }).fail(function (jqxhrFail, textStatusFail, errorThrownFail) {
                errorHandler(jqxhrFail);
            });
        }
    }
}

var verifyCsvData = function (user_val, user_ip, user_nickname, csv_pip_usrname, csv_pip_paaswrd, csv_pip_tunelip) {
    var check_user = /^[a-zA-Z0-9~!#^%*&`\_\-{|}/'$?+=]+([\.]?[a-zA-Z0-9~!#^%*&`\_\-{|}/'$?+=]+)?$/;
    var check_nickname = /^[Aa-zZ0-9\.\@]*/;
    user_val = user_val.trim();

    if (user_nickname !== '') {
        user_nickname = user_nickname.trim();
    }
    if (user_val == '' && user_ip == '') {
        return [false, 'Please enter Username and IP Address'];
    } else if (user_ip == '') {
        return [false, 'Please enter IP Address'];
    } else if (user_val == '') {
        return [false, 'Please enter Username'];
    } else if ((user_val.length < 1) || (user_val.length > 20)) {
        return [false, 'Username should not be more than 20 characters'];
    } else if ((user_val != '') && user_val.match(' ')) {
        return [false, 'Spaces not allowed in Username'];
    } else if (!user_val.match(check_user)) {
        return [false, 'Please enter a valid Username'];
    } else if ((csv_pip_usrname !== '') && ((csv_pip_paaswrd == '') || (csv_pip_tunelip == ''))) { //#482
        return [false, 'Please enter complete Private address details'];
    } else {
        RegE = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
        if (!user_ip.match(RegE)) {
            return [false, 'Please enter valid IP Address'];
        }
    }
    return [true, 'Valid ' + user_ip];
};

var resetForm = function () {
    $(':input', '#f_addip')
            .not(':button, :submit, :reset, :hidden')
            .val('')
            .removeAttr('checked')
            .removeAttr('selected');
    displayTogglePrivateInputs('private_ip_fields', 'private_ip'); // close the private Ip tab
    $('#user_name').val('raxak');
    $('#uploadcsvfile').val('');
    gCSVFileFlag = false;
    return false;
};

function validateSubmitData(user_name, ip_address, user_nickname, prev_full_tmip, current_full_tmip) {
    var e_portnumber = '';
    var portRegE = /^([1-9][0-9]*)$/;
    var is_sshport = $('#e_chksshport').is(":checked");
    var is_privateip = $('#e_private_ip').is(":checked");
    var ip_list_target = [];

    var check_user = /^[a-zA-Z0-9~!#^%*&`\_\-{|}/'$?+=]+([\.]?[a-zA-Z0-9~!#^%*&`\_\-{|}/'$?+=]+)?$/;
    var RegE = /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

    user_name = user_name.trim();

    if (current_full_tmip !== prev_full_tmip) {
        for (var i = 0; i < gEnrolledTMs.length; i++) {
            ip_list_target.push(JSON.parse(gEnrolledTMs[i]).ip);
        }
    }

    if (is_sshport) {
        e_portnumber = $("#e_sshport").val();
    }
    if (user_nickname !== '') {
        user_nickname = user_nickname.trim();
    }
    if (user_name == '' && ip_address == '') {
        $('#e_username').focus();
        $('#error_message').text('Please enter Username and IP Address');
        return false;
    } else if (user_name == '') {
        $('#e_username').focus();
        $('#error_message').text('Please enter Username');
        return false;
    } else if ((user_name.length < 1) || (user_name.length > 20)) {
        $('#e_username').focus();
        $('#error_message').text('Username should not be more than 20 characters');
        return false;
    } else if ((user_name != '') && user_name.match(' ')) {
        $('#e_username').focus();
        $('#error_message').text('Spaces not allowed in Username');
        return false;
    } else if (!user_name.match(check_user)) {
        $('#e_username').focus();
        $('#error_message').text('Please enter a valid Username');
        return false;
    } else if (ip_address == '') {
        $('#e_ipaddress').focus();
        $('#error_message').text('Please enter IP Address');
        return false;
    } else if (ip_address != '' && !ip_address.match(RegE)) {
        // if (!ip_address.match(RegE)) {
        $('#e_ipaddress').focus();
        $('#error_message').html('Please enter a valid IP Address');
        return false;
        // }
    } else if (ip_list_target.indexOf(current_full_tmip) != -1) {
        $('#e_ipaddress').focus();
        $('#error_message').html("IP address " + current_full_tmip + " already in list");
        return false;
    } else if (is_sshport && (e_portnumber === '' || !e_portnumber.match(portRegE))) {
        $('#e_sshport').focus();
        $('#error_message').html('Please enter SSH Port number');
        return false;
    } else if (is_privateip) {
        var e_username_pip = $('#e_username_pip').val();
        var e_paswd_pip = $('#e_paswd_pip').val();
        var e_ipaddress_pip = $('#e_ipaddress_pip').val();
        if (e_username_pip == '') {
            $('#e_username_pip').focus();
            $('#error_message').html('Please enter private ip user name');
            return false;
        } else if (e_paswd_pip == '') {
            $('#e_paswd_pip').focus();
            $('#error_message').html('Please enter password');
            return false;
        } else if (e_ipaddress_pip == '') {
            $('#e_ipaddress_pip').focus();
            $('#error_message').html('Please enter tunnel IP');
            return false;
        } else if (e_ipaddress_pip != '' && !e_ipaddress_pip.match(RegE)) {
            $('#e_ipaddress_pip').focus();
            $('#error_message').html('Please enter a valid IP Address');
            return false;
        } else {
            $('#error_message').text('');
            return true;
        }
    } else {
        $('#error_message').text('');
        return true;
    }
}

// enable enter key should work work when edit enrolled server.
$(document).unbind("keyup").keyup(function (e) {
    var code = e.which; // recommended to use e.which, it's normalized across browsers
    if (code === 13 && is_editable) {
        modifyTargetMmachine();
        return false;
    }
    //-- enable enter button submit on add 
    if (e.which === 13) {
        addTargetedIpDetails();
        //event.stopPropagation();
        e.preventDefault();
        return false;
    }

});

var getTitleForNewIP = function (response) {
    var rowTitle = response[0].ip + ' : ' + TM_ACCESS_NORMS[response[0].access].title;
    if (response[0].access === 1) {
        rowTitle = response[0].ip + ' ALL OK (' + response[0].osname + ' v' + response[0].osversion + ')';
    }
    return rowTitle;
};

function modifyTargetMmachine() {
    var current_name = $('#e_username').val();
    var current_ipaddress = $('#e_ipaddress').val();
    var current_nickname = $('#e_nickname2').val();
    var current_pipaddress = $("#e_ipaddress_pip").val();
    var current_ppassword = $("#e_paswd_pip").val();
    var current_pusername = $("#e_username_pip").val();
    var prev_full_tmip = prev_name + '@' + prev_ipaddress;
    var current_full_tmip = current_name + '@' + current_ipaddress;
    var current_port = $("#e_sshport").val();
    var return_status = validateSubmitData(current_name, current_ipaddress, current_nickname, prev_full_tmip, current_full_tmip);
    //var is_sshport = $('#e_chksshport').is(":checked");

    var content = {
        usernameIP: prev_full_tmip,
        submitIP: current_full_tmip,
        submitNickName: current_nickname,
        selectedNickName: prev_nickname
    };
    content["sshport"] = current_port;
    content["oldsshport"] = oldsshport;

    if ($('#e_private_ip').is(":checked")) {
        content["isprivate"] = true;
        content["tunnelusername"] = current_pusername;
        content["tunnelpassword"] = current_ppassword;
        content["tunnelip"] = current_pipaddress;
    }

    if (return_status) {
        if (current_name !== prev_name || current_ipaddress !== prev_ipaddress || current_nickname !== prev_nickname || current_port !== oldsshport || current_pipaddress !== prev_tunnel_ip || current_pusername !== prev_tunnel_name) {
            $.ajax({
                dataType: 'json',
                data: content,
                type: 'POST',
                url: API_CALL_PREFIX + "modifyIP",
                beforeSend: function (xhr) {
                    $('#editinfo').modal('hide');
                    $('#ajaxloader').show();
                }
            }).done(function (response) {
                isUpadateGroups = true;
                getTMs(); // to reset the sessions,facing recheck data isuues.

                var current_ipname = current_name + '@' + current_ipaddress;
                tmp_nickname = (current_nickname != '') ? current_nickname : current_ipname;

                var oTable = $("#editable-sample").dataTable();
                oTable.fnUpdate(current_name, $(editobject).parents('tr')[0], 1);
                oTable.fnUpdate(current_ipaddress, $(editobject).parents('tr')[0], 2);
                oTable.fnUpdate(tmp_nickname, $(editobject).parents('tr')[0], 3);

                if ($('#e_private_ip').is(":checked")) {
                    oTable.fnUpdate(current_pusername, $(editobject).parents('tr')[0], 4);
                    oTable.fnUpdate(current_pipaddress, $(editobject).parents('tr')[0], 5);
                }
                else{
                    oTable.fnUpdate("N/A", $(editobject).parents('tr')[0], 4);
                    oTable.fnUpdate("N/A", $(editobject).parents('tr')[0], 5);   
                }
                oTable.fnUpdate(current_port, $(editobject).parents('tr')[0], 6);
                $(editobject).closest('tr').attr('id', current_ipname);
                //-- Change row color whwn not only change the nick name.
                if (response.length && typeof response == 'object') {
                    var ruletitle = getTitleForNewIP(response);
                    $(editobject).closest('tr').attr('title', ruletitle);
                    $(editobject).closest('tr').attr('class', TM_ACCESS_NORMS[response[0].access].cssclass);
                }
                $('#ajaxloader').hide();
                swal({
                    text: 'Server has been updated successfully.',
                    type: 'success'
                });
            }).fail(function (jqxhrFail) {
                errorHandler(jqxhrFail);
            });
        } else {
            $('#editinfo').modal('hide');
        }
        is_editable = false;
    }
}

function reCheckAccess(recheckTM, flag, object) {
    var htmlTM = '';
    $.ajax({
        dataType: 'json',
        //async: false,
        url: API_CALL_PREFIX + "checkAccess/?username=raxak&ip=" + recheckTM,
        beforeSend: function () {
            if (flag == 'single') {
                $(object).parents('tr').children('td').find('.singleaccess i').attr('class', 'fa fa-refresh fa-spin');
                $(object).parents('tr').children('td').find("input[type='checkbox']").prop('disabled', true);
                $(object).parents('tr').attr('title', 'recheck access in progress');
                $(object).parents('tr').attr('class', 'inprogess');
            } else {
                $('#ajaxloader').show();
            }
            $('#addtargetedip').attr('disabled', true);
            $('#cancelbtn').attr('disabled', true);
            $('#recheckbtn').attr('disabled', true);
            $('#multidelete').attr('disabled', true);
            $('#checkboxAll').attr('disabled', true);
        }
    }).done(function (responseData) {
        var access_msg = '';
        swal_dict = {
            // 'title' : 'Recheck Status',
            'type': 'warning'
        };
        if (flag == 'single') {
            access_msg = responseData[0].ip + ' : ' + TM_ACCESS_NORMS[responseData[0].access].title;
            if (responseData[0].access == 1) {
                access_msg = responseData[0].ip + ' : ALL OK ' + ' (' + responseData[0].osname + ' v' + responseData[0].osversion + ')';
                swal_dict["type"] = 'success';
                swal_dict["text"] = access_msg;
                swal(swal_dict);
            } else {
                swal_dict["type"] = 'warning';
                swal_dict["text"] = access_msg;
                swal(swal_dict);
            }
            //$(object).parents('tr').find("td:eq(4)").text(TM_ACCESS_NORMS[responseData[0].access].status);
            $(object).parents('tr').attr('title', access_msg);
            $(object).parents('tr').children('td').find('.singleaccess i').attr('class', "fa fa-fw fa-exchange");
            $(object).parents('tr').children('td').find("input[type='checkbox']").prop('disabled', false);
            $(object).parents('tr').attr('class', TM_ACCESS_NORMS[responseData[0].access].cssclass);
        } else {
            access_msg += '<div class="table-responsive" style="overflow-y: auto;max-height: 500px;">';
            access_msg += '<p>' + responseData.length + ' Target machine(s) rechecked. </p>';
            access_msg += '<table border="1" width="100%" cellpadding="0" cellspacing="0" class="table table-hover table-bordered"><tr><th>Target Machine</th><th>Status</th></tr>';
            $(responseData).each(function (index, data) {
                var cssclass = TM_ACCESS_NORMS[data.access].cssclass;
                var title = TM_ACCESS_NORMS[data.access].title;
                if (data.access == 1)
                    var title = TM_ACCESS_NORMS[data.access].title + ' (' + data.osname + ' v' + data.osversion + ')';
                $("tr[id='" + data.ip + "']").attr('class', cssclass);
                $("tr[id='" + data.ip + "']").attr('title', title);
                if (data.ip == data.nickname) {
                    var nickname = '';
                } else {
                    var nickname = '(' + data.nickname + ')';
                }
                access_msg += '<tr><td>' + data.ip + '</td><td>' + title + '</td></tr>';
            });
            access_msg += '</table></div>';
            $('#ajaxloader').hide();
            $('#errorModal .modal-title').html('Recheck Status');
            $('#errorModal .modal-body').html(access_msg);
            $('#errorModal').modal('show');
        }

        $('#checkboxAll').removeAttr('checked');
        $('#editable-sample tbody input:checkbox').removeAttr('checked');
        $('#addtargetedip').attr('disabled', false);
        $('#cancelbtn').attr('disabled', false);
        $('#checkboxAll').attr('disabled', false);
        $('#recheckbtn').attr('disabled', false);
        $('#multidelete').attr('disabled', false);
    }).fail(function (jqxhrFail, textStatusFail, errorThrownFail) {
        $('#ajaxloader').hide();
        $('#checkboxAll').removeAttr('checked');
        $(object).parents('tr').removeClass('danger');
        $('#addtargetedip').attr('disabled', false);
        $('#cancelbtn').attr('disabled', false);
        $('#checkboxAll').attr('disabled', false);
        $('#recheckbtn').attr('disabled', false);
        $('#multidelete').attr('disabled', false);
        $('#editable-sample tbody input:checkbox').removeAttr('checked');
        $(object).parents('tr').children('td').find("input[type='checkbox']").prop('disabled', false);
        $(object).parents('tr').children('td').find('.singleaccess i').attr('src', "fa fa-fw fa-exchange");
        errorHandler(jqxhrFail);
    });
}

function getExecutedStatus(ip) {
    var results = '';
    $.ajax({
        type: 'GET',
        async: false,
        url: API_CALL_PREFIX + "showExecutionStatus/" + ip,
    }).done(function (response) {
        if (response != null && response.match('in progress')) {
            results = true;
        } else {
            results = false;
        }
    }).fail(function () {
        results = false;
    });
    return results;
}

function loadExistingTMs() {
    var htmlTM = '';
    var tmCountSession = sessionStorage.getItem('gEnrolledTMCount');
    $('#servercounts').text(' (' + tmCountSession + ')');
    var tms = JSON.parse(sessionStorage.getItem('gEnrolledTMs'));
    if (tms.length > 0) {
        for (var i = 0; i < tmCountSession; i++) {
            var disabled = '';
            var tmDetail = JSON.parse(tms[i]);
            var rowIdHtml = tmDetail.ip;
            var ruleclass = TM_ACCESS_NORMS[tmDetail.access].cssclass;
            var ruletitle = rowIdHtml + ' : ' + TM_ACCESS_NORMS[tmDetail.access].title;
            if (tmDetail.access == 1) {
                ruletitle = tmDetail.ip + ' : ALL OK ' + ' (' + tmDetail.osname + ' v' + tmDetail.osversion + ')';
                var executedstatus = getExecutedStatus(tmDetail.ip);
                if (executedstatus) {
                    disabled = 'disabled="disabled"';
                    ruleclass = 'inprogess';
                    ruletitle = tmDetail.ip + ':Rules execution is in progress';
                }
            }
            // if (tmDetail.ip === tmDetail.nickname || tmDetail.nickname == '') {
            //     var nickname = '--';
            // } else {
            // }
            var nickname = tmDetail.nickname;
            htmlTM += '<tr id="' + rowIdHtml + '" class="' + ruleclass + '" title="' + ruletitle + '" >';
            htmlTM += '<td><input type="checkbox" name="checkbox" value="' + tmDetail.ip + '" id="chkbx_' + tmDetail.ip + '" ' + disabled + '></td>';
            htmlTM += '<td>' + tmDetail.ip.split('@')[0] + '</td>';
            htmlTM += '<td>' + tmDetail.ip.split('@')[1] + '</td>';
            htmlTM += '<td>' + nickname + '</td>';
            //htmlTM += '<td>' + TM_ACCESS_NORMS[tmDetail.access].status + '</td>';

            if (tmDetail.hasOwnProperty('tunnelusername')) { //remove i==0 condition, its for testing only...
                htmlTM += '<td>' + tmDetail.tunnelusername + '</td>';
                htmlTM += '<td>' + tmDetail.tunnelip + '</td>';
            } else {
                htmlTM += '<td>N/A</td>';
                htmlTM += '<td>N/A</td>';
            }
            var sshport = '22';
            if (tmDetail.sshport) {
                sshport = tmDetail.sshport;
            }
            htmlTM += '<td>' + sshport + '</td>';
            htmlTM += '<td align="center"><a href="javascript:void(0);" class="singleaccess" title="Recheck access to target machine"><i class="fa fa-fw fa-exchange" style="font-size:16px"></i></a></td>';
            //htmlTM += '<td><a href="#editinfo" data-toggle="modal" class="edit_tm_info"><i class="fa fa-fw fa-pencil" title="Edit ip"></i></a></td>';
            htmlTM += '<td align="center"><a href="javascript:void(0);" class="edit_tm_info" title="Edit target machine details"><i class="fa fa-fw fa-pencil"></i></a></td>';
            htmlTM += '<td align="center"><a href="javascript:void(0);" class="delete"  title="Delete target machine"><i class="fa fa-fw fa-trash-o"></i></a></td>';
            htmlTM += '</tr>';
        }
        $('#editable-sample tbody').html(htmlTM);
    } else {
        $('#enrolledservers').hide();
    }
    $('#image-holder-page').hide();
}

function recheckTMsAccess() {
    var selectedTMs = [];
    $('#editable-sample tbody input:checked').each(function () {
        selectedTMs.push($(this).attr('value'));
    });
    if (selectedTMs.length > 0) {
        reCheckAccess(selectedTMs.join());
    } else {
        swal({
            // title: 'Warning!',
            text: 'Please select at least one server!',
            type: 'warning'
        });
        return false;
    }
}

function deleteTM(rowData) {
    $.ajax({
        dataType: 'json',
        url: API_CALL_PREFIX + "deleteIP/?username=raxak&ip=" + rowData.DT_RowId
    }).done(function (response) {
        isUpadateGroups = true;
        getTMs(); // to reset the sessions,facing recheckdata isuues.
        var table = $('#editable-sample').dataTable();
        var table_length = table.fnSettings().fnRecordsDisplay();
        $('#servercounts').text(' (' + table_length + ')');
        $('#editable-sample input:checkbox').removeAttr('checked');
        if (table_length === 0) {
            $('#enrolledservers').hide();
        }
        swal({
            // title : "Delete Status",
            text: rowData[3] + ' has been deleted successfully.',
            type: 'success'
        });
    }).fail(function (jqxhrFail, textStatusFail, errorThrownFail) {
        errorHandler(jqxhrFail);
    });
}

function deleteAllTM() {
    var selectedTMs = [];
    $('#editable-sample tbody input:checked').each(function () {
        selectedTMs.push($(this).attr('value'));
    });

    if (selectedTMs.length > 0) {
        swal({
            text: "Are you sure you want to delete selected server's?",
            type: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#3085d6',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Yes, delete it!',
            closeOnConfirm: true
        },
        function (isDelete) {
            if (isDelete) {
                $.ajax({
                    dataType: 'json',
                    url: API_CALL_PREFIX + "deleteIP/?username=raxak&ip=" + selectedTMs,
                    beforeSend: function () {
                        //$('#addtargetedip').hide();
                        $('#ajaxloader').show();
                        $('#recheckbtn').attr('disabled', true);
                        $('#multidelete').attr('disabled', true);
                    }
                }).done(function (response) {
                    isUpadateGroups = true;
                    getTMs(); // to reset the sessions,facing recheckdata isuues.
                    var table = $('#editable-sample').dataTable();
                    $('#editable-sample tbody input:checked').each(function () {
                        var nRow = $(this).parents('tr')[0];
                        table.fnDeleteRow(nRow);
                    });
                    var table_length = table.fnSettings().fnRecordsDisplay();
                    $('#servercounts').text(' (' + table_length + ')');
                    $('#recheckbtn').attr('disabled', false);
                    $('#multidelete').attr('disabled', false);
                    $('#checkboxAll').attr('disabled', false);
                    $('#editable-sample input:checkbox').removeAttr('checked');
                    if (table_length === 0) {
                        $('#enrolledservers').hide();
                    }
                    $('#ajaxloader').hide();
                    swal({
                        // title: 'Delete Status',
                        text: 'Selected server(s) has been deleted successfully.',
                        type: 'success'
                    });
                    setTimeout(function () {
                        $('#errorModal').modal('hide');
                    }, 4000); //close model box automatically.
                }).fail(function (jqxhrFail, textStatusFail, errorThrownFail) {
                    errorHandler(jqxhrFail);
                });
            }
        });
    } else {
        swal({
            // title: 'Warning!',
            text: 'Please select at least one server!',
            type: 'warning'
        });
        return false;
    }
}

$(document).on("click", "#addtargetmachins", function () {
    $('#add_error_msg').text('');
    $("input#uploadcsvfile").val('');
    $('#add_ip_details_ip').prop('checked', true);
    //--Start: Disabled the ssh port----//
    $('#chksshport').prop('checked', false);
    $('#sshport').val('22');
    $('#sshport').attr('disabled', true);
    $('#sshdanger').hide();
    //-- End: Disabled the ssh port----//
    changeUserIpDetailAction('add_by_ip_details');
    $("#addtargetmachineinfo").modal('show');
});

//--Start:: Manage server groups---------------//

$(document).on("click", "#addgroups", function () {
    $('#groupname').val('');
    $('#groupdescription').val('');
    $('#addgroup_error').text('');

    //-- manage the dual list box without reload page, when add/edit/delete machines.
    if (isCallDual) {
        $('#dual-list-box-groupmachinelists').empty();
        $('#dual-list-box-groupmachinelists').append('<select multiple="multiple" data-title="groupmachinelists" id="undo_redo"></select>');
        $('#dual-list-box-groupmachinelists').attr('id', 'dual-list-box');
    }
    isCallDual = true;
    callDuleBox('add', '');
    $("#addgroupsinfo").modal('show');
});

function callDuleBox(event, selectedTms) {
    var tms = JSON.parse(sessionStorage.getItem('gEnrolledTMs'));
    // inserting ips into select list
    if (tms.length) {
        $.each(tms, function (i, data) {
            var item = JSON.parse(data);
            var optionValue = item.nickname;
            var optionTitle = item.ip;
            var optionClass = TM_ACCESS_NORMS[item.access].cssclass;
            if (item.access == 1) {
                var optionTitle = item.ip + ' (' + item.osname + ' ' + item.osversion + ')';
            }

            if (item.nickname == "") {
                var optionValue = item.ip;
            }
            if (event === 'add') {
                $('#undo_redo').append($('<option>', {
                    value: item.ip,
                    text: optionValue,
                    title: optionTitle,
                    class: optionClass
                }));
            }
            if (event === 'edit') {
                if (selectedTms.toString().indexOf(item.ip) == -1) {
                    $('#e_undo_redo').append($('<option>', {
                        value: item.ip,
                        text: optionValue,
                        title: optionTitle,
                        class: optionClass
                    }));
                }
            }
        });
    }
    //setTimeout(function () {
    if (event === 'add')
        $('#undo_redo').DualListBox();
    if (event === 'edit') {
        $('#e_undo_redo').DualListBox();
        callSelectedBox(selectedTms);
    }
    // }, 200); //close model box automatically.
}

function callSelectedBox(selected) {
    var tms = JSON.parse(sessionStorage.getItem('gEnrolledTMs'));
    if (tms.length > 0) {
        $.each(tms, function (i, data) {
            var item = JSON.parse(data);
            var optionValue = item.nickname;
            var optionTitle = item.ip;
            var optionClass = TM_ACCESS_NORMS[item.access].cssclass;
            if (item.nickname == "") {
                var optionValue = item.ip;
            }
            if (selected.toString().indexOf(item.ip) != -1 && $(".selected option[value='" + item.ip + "']").length == 0) {
                $('.selected').append($('<option>', {
                    value: item.ip,
                    text: optionValue,
                    title: optionTitle,
                    class: optionClass
                }));
                var count = parseInt($('.selected-count').html());
                $('.selected-count').html(count + 1);
            }
        });
    }
    toggleButtonsOnLoad(); // sunil: Disabled the buttons on load.
}
/** Toggles the buttons based on the length of the selects. */
function toggleButtonsOnLoad() {
    if ($('.unselected option').length == 0) {
        $('.atr').prop('disabled', true);
        $('.str').prop('disabled', true);
    } else {
        $('.atr').prop('disabled', false);
    }

    if ($('.selected option').length == 0) {
        $('.atl').prop('disabled', true);
        $('.stl').prop('disabled', true);
        $('#apply_profile_action').prop('disabled', true);
    } else {
        $('.atl').prop('disabled', false);
    }
}

function createServerGroups() {
    var error = false;
    var error_msg = '';
    var ipList = "";
    var groupname = $('#groupname').val();
    var description = $('#groupdescription').val();

    if (groupname === '') {
        error = true;
        $('#grouupname').focus();
        error_msg = 'Please enter group name';
    } else if (groupname.match(/\s/g)) {
        error = true;
        $('#grouupname').focus();
        error_msg = 'Spaces not allowed in group name';
    } else if ($('.selected')[0].options.length > 0) {
        $(".selected > option").each(function () {
            ipList = ipList + this.value + ',';
        });
        ipList = ipList.replace(/,(\s+)?$/, '');
    } else {
        error = true;
        error_msg = 'Please select target machine(s)';
    }
    /*
     else if (groupdescription === '') {
     error = true;
     $('#groupdescription').focus();
     error_msg = 'Please enter group description';
     }
     */
    if (error) {
        $('#addgroup_error').text(error_msg);
        return false;
    } else {
        var content = {
            groupname: groupname,
            ips: ipList,
            description: description
        };
        $.ajax({
            dataType: 'json',
            method: "post",
            data: content,
            url: API_CALL_PREFIX + "createGroup/",
            beforeSend: function () {
                $('#ajaxloader').show();
            }
        }).done(function (response) {
            $('#ajaxloader').hide();
            //console.log('response ::', response.status);
            if (response.status) {
                $("#addgroupsinfo").modal('hide');
                var groupname = $.trim(response.groupname);
                var description = $.trim(response.description);
                if (description == '') {
                    description = '--';
                }
                sessionStorage.setItem('groupTms_' + groupname, $.trim(response.ips));
                var oTable = $('#groupinfocontent').dataTable();
                var newRow = oTable.fnAddData([
                    //'<input type="checkbox" id="chk_' + groupname + '" value="' + groupname + '">',
                    groupname,
                    description,
                    //'<a href="javascript:void(0)" class="groupinfo" rel="' + groupname + '"><i class="fa fa-fw fa-file-text-o"></i></a>&nbsp; &nbsp;\n\
                    '<a title="Edit Group" class="editgroup" href="javascript:void(0);"><i class="fa fa-fw fa-pencil"></i></a> &nbsp; &nbsp;\n\
                     <a title="Delete Group" class="deletegroup" href="javascript:void(0);"><i class="fa fa-fw fa-trash-o"></i></a>',
                ]);
                var newDTRow = oTable.fnSettings().aoData[newRow[0]].nTr;
                var length = oTable.fnSettings().fnRecordsDisplay();
                $(newDTRow).attr('id', groupname);
                //$(newDTRow).attr('class', ruleclass);
                $('#groupcounts').text('(' + length + ')');
                $('.editgroup').parent().attr('align', 'center');
                $('.ocontrol').css('padding-left', '35px');
                swal({
                    text: 'Server group has been created successfully.',
                    type: 'success'
                });
            } else {
                $('#addgroup_error').text(response.message);
                return false;
            }
        });
    }
}

function getServerGroups() {
    var html = '';
    var content = {
        username: 'raxak'
    };
    $.ajax({
        dataType: 'json',
        method: "post",
        async: false,
        data: content,
        url: API_CALL_PREFIX + "getGroups/",
        beforeSend: function () {
            $('#ajaxloader').show();
        }
    }).done(function (response) {
        var groupcounts = response.length;
        $('#groupcounts').text(' (' + groupcounts + ')');
        if (groupcounts) {
            g_ServerGroups = response;
            $.each(response, function (key, value) {
                var ipsarray = [];
                var data = JSON.parse(value);
                var groupname = $.trim(data.groupname);
                var description = $.trim(data.description);
                var groupips = $.trim(data.ips);
                if (description == '') {
                    description = '--';
                }
                sessionStorage.setItem('groupTms_' + groupname, groupips);
                html += '<tr id="' + groupname + '">';
                //html += '<td><input type="checkbox" id="chk_' + groupname + '" value="' + groupname + '"></td>';
                html += '<td style="padding-left:35px">' + groupname + '</td>';
                html += '<td>' + description + '</td>';
                //html += '<td align="center"><a href="javascript:void(0)" class="groupinfo" rel="' + groupname + '"><i class="fa fa-fw fa-file-text-o"></i></a>&nbsp; &nbsp;<a title="Edit Group" class="editgroup" href="javascript:void(0);"><i class="fa fa-fw fa-pencil"></i></a> &nbsp; &nbsp;<a title="Delete Group" class="deletegroup" href="javascript:void(0);"><i class="fa fa-fw fa-trash-o"></i></a></td>';
                html += '<td align="center"><a title="Edit Group" class="editgroup" href="javascript:void(0);"><i class="fa fa-fw fa-pencil"></i></a> &nbsp; &nbsp;<a title="Delete Group" class="deletegroup" href="javascript:void(0);"><i class="fa fa-fw fa-trash-o"></i></a></td>';
                html += '</tr>';
            });
        }
        $('#groupinfocontent tbody').html(html);
        initServerGroup();
        $('#ajaxloader').hide();
    });
}

var initServerGroup = function () {
    var oTable = $('#groupinfocontent').DataTable({
        "sPaginationType": "full_numbers",
        responsive: {
            details: {
                type: 'column',
                target: 1
            }
        },
        "columnDefs": [{
                className: 'ocontrol',
                "searchable": true,
                "orderable": true,
                "targets": 0
            },
            {
                "searchable": false,
                "orderable": false,
                "targets": 2
            }
        ],
        order: [0, 'asc']
    });

    // Array to track the ids of the details displayed rows
    //var detailRows = [];

    $('#groupinfocontent tbody').on('click', 'tr td.ocontrol', function () {
        var tr = $(this).closest('tr');
        var row = oTable.row(tr);
        var idx = $.inArray(tr.attr('id'), detailRows);
        var groupname = $.trim(tr.attr('id'));
        if (row.child.isShown()) {
            tr.removeClass('parent');
            row.child.hide();
            // Remove from the 'open' array
            detailRows.splice(idx, 1);
        }
        else {
            tr.addClass('parent');
            row.child(format(groupname)).show();

            // Add to the 'open' array
            if (idx === -1) {
                detailRows.push(tr.attr('id'));
            }
        }
    });

    // On each draw, loop over the `detailRows` array and show any child rows
    oTable.on('draw', function () {
        $.each(detailRows, function (i, id) {
            $('#' + id + ' td.ocontrol').trigger('click');
        });
    });
};

function format(groupname) {
    var html = '';
    var groupServers = $.trim(sessionStorage.getItem('groupTms_' + groupname));
    if (groupServers) {
        var ipsarray = groupServers.split(",");
        html += '<table cellpadding="0" cellspacing="0" border="0" style="padding-left:50px;width:100%;" class="table-bordered">';
        html += '<thead>';
        html += '<th style="50%">User Name</th>';
        html += '<th style="50%">Server</th>';
        html += '</thead><tbody>';
        if (ipsarray.length) {
            $.each(ipsarray, function (key, value) {
                html += '<tr>';
                html += '<td>' + value.split('@')[0] + '</td>';
                html += '<td>' + value.split('@')[1] + '</td>';
                html += '</tr>';
            });
        }
        html += '</tbody></table>';
    }
    return html;
}

function modifyServerGroups() {
    var error = false;
    var error_msg = '';
    var ipList = "";
    var groupList = [];
    var groupname = $.trim($('#e_groupname').val());
    var description = $('#e_groupdescription').val();

    $.each(g_ServerGroups, function (key, value) {
        var data = JSON.parse(value);
        var groupname = $.trim(data.groupname);
        groupList.push(groupname);
    });

    if (groupname === '') {
        error = true;
        $('#e_grouupname').focus();
        error_msg = 'Please enter group name';
    } else if (g_prev_groupname !== groupname && groupList.indexOf(groupname) != -1) {
        error = true;
        $('#e_grouupname').focus();
        error_msg = 'Group name already present in list';
    } else if (groupname.match(/\s/g)) {
        error = true;
        $('#grouupname').focus();
        error_msg = 'Spaces not allowed in group name';
    } else if ($('.selected')[0].options.length > 0) {
        $(".selected > option").each(function () {
            ipList = ipList + this.value + ',';
        });
        ipList = ipList.replace(/,(\s+)?$/, '');
    } else {
        error = true;
        error_msg = 'Please select target machine(s)';
    }

    if (error) {
        $('#editgrouperror').text(error_msg);
        return false;
    } else {
        var content = {
            groupname: g_prev_groupname,
            currentgroupname: groupname,
            ips: ipList,
            description: description
        };
        $.ajax({
            dataType: 'json',
            method: "post",
            data: content,
            url: API_CALL_PREFIX + "modifyGroup/",
            beforeSend: function () {
                $("#editgroupsinfo").modal('hide');
                $('#ajaxloader').show();
            }
        }).done(function (response) {
            var oTable = $("#groupinfocontent").dataTable();
            sessionStorage.setItem('groupTms_' + $.trim(response.message.groupname), $.trim(response.message.ips)); //--update session
            if (groupname !== g_prev_groupname) {
                var idx = $.inArray(g_prev_groupname, detailRows); //-- check old groupname is available in array
                if (idx !== -1) {
                    // Remove from the 'open' array
                    detailRows.splice(idx, 1); // remove the previous row id
                    detailRows.push(groupname); // push the current row id
                }
                $('#' + g_prev_groupname).closest('tr').attr('id', groupname); // update tr id.
                oTable.fnUpdate(groupname, $('#' + groupname).children('td')[0], 0);
            }
            oTable.fnUpdate(description, $('#' + groupname).children('td')[0], 1);
            $('#ajaxloader').hide();
            swal({
                text: 'Server has been updated successfully.',
                type: 'success'
            });
        });
    }
}
$(document).on("click", ".editgroup", function () {
    var oTable = $('#groupinfocontent').dataTable();
    $('.selected').empty();
    //var nRow = $(this).parents('tr')[0];
    var nRow = $(this).parents('tr');
    var rowData = oTable.fnGetData($(this).parents('tr')[0]); // getting row data from datatable object
    var trid = $.trim($(this).closest('tr').attr('id'));
    var gropName = rowData[0];
    g_prev_groupname = gropName; //set global group name

    var description = rowData[1];
    var groupMachines = sessionStorage.getItem('groupTms_' + trid);
    if (description === '--')
        description = '';
    $("#editgroupsinfo .modal-body #editgrouperror").text('');
    $("#editgroupsinfo .modal-body #e_groupname").val(gropName);
    $("#editgroupsinfo .modal-body #e_groupdescription").val(description);
    if (groupMachines) {
        //-- manage the edit dual list box without reload page, when edit machines.
        if (iseCallDual) {
            $('#dual-list-box-e_groupmachinelists').empty();
            $('#dual-list-box-e_groupmachinelists').append('<select multiple="multiple" data-title="e_groupmachinelists" id="e_undo_redo"></select>');
            $('#dual-list-box-e_groupmachinelists').attr('id', 'dual-list-box');
        }
        iseCallDual = true;
        callDuleBox('edit', groupMachines);
    }
    $("#editgroupsinfo").modal('show');
});

$(document).on("click", ".deletegroup", function () {
    var oTable = $('#groupinfocontent').dataTable();
    var nRow = $(this).parents('tr')[0];
    // var rowData = oTable.fnGetData(nRow); // getting row data from datatable object
    var trid = $.trim($(this).closest('tr').attr('id'));
    swal({
        html: "Are you sure you want to delete <b><i>" + trid + "</i></b>?",
        type: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'Yes, delete it!',
        closeOnConfirm: false
    },
    function (isDelete) {
        if (isDelete) {
            $.ajax({
                dataType: 'json',
                method: "post",
                data: {
                    groupname: trid
                },
                url: API_CALL_PREFIX + "deleteGroup/",
                beforeSend: function () {
                    $('#ajaxloader').show();
                }
            }).done(function (response) {
                /*  $('#groupinfocontent tbody input:checked').each(function () {
                 var nRow = $(this).parents('tr')[0];
                 oTable.fnDeleteRow(nRow);
                 });
                 
                 $('#groupinfocontent input:checkbox').removeAttr('checked');
                 if (table_length === 0) {
                 $('#enrolledgroups').hide();
                 }*/
                oTable.fnDeleteRow(nRow);
                var table_length = oTable.fnSettings().fnRecordsDisplay();
                $('#groupcounts').text(' (' + table_length + ')');
                $('#ajaxloader').hide();
                swal({
                    text: trid + ' group has been deleted successfully.',
                    type: 'success'
                });
            }).fail(function (jqxhrFail, textStatusFail, errorThrownFail) {
                errorHandler(jqxhrFail);
            });
        }
    });
});

//--Start:: Manage server groups---------------//

$(document).on("click", ".edit_tm_info", function () {

    var oTable = $('#editable-sample').dataTable();
    var rowData = oTable.fnGetData($(this).parents('tr')[0]); // getting row data from datatable object
    
    var c4Vis = oTable.fnSettings().aoColumns[ 4 ].bVisible
    var c5Vis = oTable.fnSettings().aoColumns[ 5 ].bVisible
    
    if ((rowData[4] == "N/A" && rowData[5] == "N/A") ||
        (c4Vis == false && c5Vis == false) ) {
        //--------- Start : Clear and hide private ip fields--------//
        $('#error_message').text('');
        $('#e_paswd_pip').val('');
        $('#e_private_ip').attr('checked', false);
        $('#e_username_pip').val('');
        $('#e_ipaddress_pip').val('');
        $('#e_private_ip_fields').hide();
        //--------- End : Clear and hide private ip fields--------//
    } else {
        $('#e_private_ip').attr('checked', true);
        $('#e_username_pip').val(rowData[4]);
        $('#e_ipaddress_pip').val(rowData[5]);
        $('#e_private_ip_fields').show();
        prev_tunnel_ip = rowData[5];
        prev_tunnel_name = rowData[4];
    }

    var trid = $(this).closest('tr').attr('id');
    var userName = rowData[1];
    var ipaddress = rowData[2];
    var nickname = rowData[3];
    var sshport = rowData[6];

    is_editable = true;
    editobject = this;
    prev_name = userName;
    prev_ipaddress = ipaddress;
    oldsshport = sshport;

    if ($.trim(nickname) === '--' || nickname == userName + "@" + ipaddress) {
        prev_nickname = '';
    } else {
        prev_nickname = nickname;
    }

    if (sshport === '22') {
        $('#e_sshport').val('22');
        $('#e_chksshport').attr('checked', false);
        $('#e_sshport').attr('disabled', true);
        $('#e_sshdanger').hide();
    } else {
        $('#e_chksshport').attr('checked', true);
        $('#e_sshport').attr('disabled', false);
        $('#e_sshdanger').show();
    }

    $("#editinfo .modal-body #e_username").val(userName);
    $("#editinfo .modal-body #e_ipaddress").val(ipaddress);
    $("#editinfo .modal-body #e_nickname2").val(prev_nickname);
    $("#editinfo .modal-body #e_sshport").val(sshport);
    $("#editinfo").modal('show');
});

$(document).on("click", "#chksshport", function () {
    var checked_status = this.checked;
    if (checked_status) {
        $('#sshport').val('');
        $('#sshport').attr('disabled', false);
        //$(this).parent('div').removeClass('toggleinputs');
        $('#sshdanger').show();
    } else {
        $('#sshport').val('22');
        $('#sshport').attr('disabled', true);
        //$(this).parent('div').addClass('toggleinputs');
        $('#sshdanger').hide();
    }
});

$(document).on("click", "#e_chksshport", function () {
    var checked_status = this.checked;
    if (checked_status) {
        $('#e_sshport').val('');
        $('#e_sshport').attr('disabled', false);
        //$(this).parent('div').removeClass('toggleinputs');
        $('#e_sshdanger').show();
    } else {
        $('#e_sshport').val('22');
        $('#e_sshport').attr('disabled', true);
        //$(this).parent('div').addClass('toggleinputs');
        $('#e_sshdanger').hide();
    }
});

var getVPNAllowedServers = function () {
    $.ajax({
        dataType: 'json',
        url: API_CALL_PREFIX + "getVPNAllowedServers/"
    }).done(function (response) {
        var hostname = $.trim(document.location.host);
        if ($.inArray(hostname, response) != -1) {
//            var oTable = $('#editable-sample').dataTable({
//                "aoColumnDefs": [
//                    {"sClass": "center", "aTargets": [7, 8]}
//                ]
//            });
            var oTable = $('#editable-sample').dataTable();
            oTable.fnSetColumnVis(4, true);
            oTable.fnSetColumnVis(5, true);
            $('.privateipgroup').show();
        } else {
            $("#editable-sample thead th:nth-child(3)").css("text-align", "center");
            $("#editable-sample thead th:nth-child(4)").css("text-align", "center");
            $("#editable-sample thead th:nth-child(5)").css("text-align", "center");
        }
    }).fail(function (jqxhrFail, textStatusFail, errorThrownFail) {
        errorHandler(jqxhrFail);
    });
};

$(document).ready(function () {
    getTMs();
    loadExistingTMs();
    //getServerGroups(); // open when server group tab in functioning.
    getVPNAllowedServers();
    $('#add_ip_details_csv').prop('checked', false);
    $('#add_ip_details_ip').prop('checked', true);
    $("#editable-sample #checkboxAll").change(function () {
        var checked_status = this.checked;
        $('#editable-sample tbody input[type=checkbox]').not(":disabled").prop("checked", checked_status);
    });

    //Select/Deselect select all checkboxe
    $("#editable-sample tbody input[type=checkbox]").change(function () {
        var checkbox = "#editable-sample tbody input[type=checkbox]";
        if ($(checkbox + ':checked').length === $(checkbox).length) {
            $('#checkboxAll').prop('checked', true);
        } else {
            $('#checkboxAll').prop('checked', false);
        }
    });

    $("#uploadcsvfile").change(function (e) {
        var ext = $("input#uploadcsvfile").val().split(".").pop().toLowerCase();
        if ($.inArray(ext, ["csv"]) == -1) {
            $("input#uploadcsvfile").val('');
            $('#add_error_msg').text('Please upload CSV file only.');
            gCSVFileFlag = false;
            return false;
        } else {
            gCSVFileFlag = true;
        }

        if (e.target.files != undefined) {
            var reader = new FileReader();
            reader.onload = function (e) {
                gCSVIPDetail = []; //clearing here as new file is selected
                var allTextLines = e.target.result;
                allTextLines = allTextLines.split(/\r|\n|\r\n|\n\r/);
                for (var line in allTextLines) {
                    var tmpvar = $.trim(allTextLines[line].split(","));

                    if (tmpvar !== '') {
                        gCSVIPDetail[gCSVIPDetail.length] = allTextLines[line].split(","); //gCSVIPDetail is global
                    }
                }
            };
            reader.readAsText(e.target.files.item(0));
        }
        return false;
    });
});
