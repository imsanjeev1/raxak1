var API_CALL_PREFIX = "../raxakapi/v1/";
var DEFAULT_TIMEOUT = 10 * 1000;//10 seconds

var showCronJobs = function () {
    var html = '';
    var uri = "/raxakapi/v1/getCronJobs";
    $.ajax({
        dataType: 'json',
        timeout: DEFAULT_TIMEOUT,
        async: false,
        url: uri
    }).done(function (responseData1) {
        arrayOfObjects = responseData1;
        var length = Object.keys(responseData1).length;
        if (arrayOfObjects != '') {
            html = "<table class='table table-bordered table-hover' id ='editable-sample'><thead>" +
                    "<tr><th width='19%'>Server Name</th><th width='19%'>Profile</th><th width='24%'>Remediation Mode</th><th width='16%'>Frequency</th><th width='19%'>Next run</th><!--<th width='36%'>Edit</th>--><th width='19%'>Delete</th></tr></thead><tbody>";

            $.each(arrayOfObjects, function (key1, value1) {
                var json = JSON.parse(arrayOfObjects[key1]);
                var ip = json.ip;
                var profile = json.profile;
                var frequency = json.frequency;
                var remediation = json.remediationmode;
                frequency = frequency.substr(0, 1).toUpperCase() + frequency.substr(1).toLowerCase();
                var nickname = json.nickname;
                var nextrun = json.nextrun;
                var cron_time = new Date(nextrun + ' UTC');
                latest_client_time = cron_time.toString().split("GMT")[0];

                if (remediation == '1') {
                    var remediationmode = "Automatic";
                } else {
                    var remediationmode = "Manual";
                }

                html += "<tr>";
                html += "<td>" + nickname + "</td>";
                html += "<td>" + profile + "</td>";
                html += "<td>" + remediationmode + "</td>";
                html += "<td>" + frequency + "</td>";
                html += "<td>" + latest_client_time + "</td>";
                //html += '<td align="center"><a href="javascript:void(0);" class="edit_tm_info" title="Edit Cron"><i class="fa fa-fw fa-pencil"></i></a></td>';
                html += '<td id ="' + key1 + '" ip="' + ip + '" profile="' + profile + '" frequency="' + frequency + '"  align="center" onClick="deleteCronJob(' + '\'' + ip + '\',' + '\'' + profile + '\',' + '\'' + frequency + '\',' + '\'' + remediation + '\');">';
                html += "<i class='fa fa-fw fa-trash' style='cursor:pointer;'></i></td>";
                html += "</td>";
                html += "</tr>";
            });
            html += "</tbody></table>";
            $("#schedular_table").html(html);
            $("#servercounts").text(length);
        } else {
            $("#servercounts").text(length);
            $("#schedulecontents").hide();
            $("#no_info").show();
        }
        $('#image-holder-page').hide();
    }).fail(function (jqxhrFail, textStatusFail, errorThrownFail) {
    	if(textStatusFail == 'timeout'){
        	swal({
                text: 'AJAX request timed out',
                type: 'error'
            });
        }else{
           	 errorHandler(jqxhrFail);
        	 }
    });
};

function deleteCronJob(usernameip, profile, frequency, remediation) {
    var uri = "/raxakapi/v1/deleteCronJob";
    var content = {usernameIP: usernameip, profilename: profile, frequency: frequency, remediationmode: remediation};
    var content_length = Object.keys(content).length;
    if (content_length > 0) {
        swal({
            text: "Are you sure you want to delete selected scheduler?",
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
                	timeout: DEFAULT_TIMEOUT,
                    type: "POST",
                    url: uri,
                    data: content,
                    timeout: DEFAULT_TIMEOUT
                }).done(function (responseData) {
                    swal({
                        // title : "Delete Status",
                        text: "Scheduler has been deleted successfully.",
                        type: "success",
                    });
                    showCronJobs();
                }).fail(function (jqxhrFail, textStatusFail, errorThrownFail) {
                	if(textStatusFail == 'timeout'){
                    	swal({
                            text: 'AJAX request timed out',
                            type: 'error'
                        });
                    }else{
                       	 errorHandler(jqxhrFail);
                    	 }
                });
            }
        });
    }

}

function filterRules(id) {
    var that = id;
    var tableBody = $('.table-list-search tbody');
    var tableRowsClass = $('.table-list-search tbody tr');
    tableRowsClass.each(function (i, val) {
        var rowText = $(val).text().toLowerCase();
        var inputText = $(that).val().toLowerCase();
        if (inputText != '') {
            $('.search-query-sf').remove();
        } else {
            $('.search-query-sf').remove();
        }
        if (rowText.indexOf(inputText) == -1) {
            tableRowsClass.eq(i).hide();
        } else {
            $('.search-sf').remove();
            tableRowsClass.eq(i).show();
        }
    });
    if (tableRowsClass.children(':visible').length == 0) {
        tableBody.append('<tr class="search-sf"><td class="text-muted" colspan="6" style="text-align:center;">No match found.</td></tr>');
    }
}
$(document).ready(function () {
    showCronJobs();

    $("#addschedulerbtn").on("click", function () {
        $("#addschedulerinfo").modal('show');
    });
    $(".edit_tm_info").on("click", function () {
        $("#editschedulerinfo").modal('show');
    });
    $('#manual-search').keyup(function () {
        filterRules('#manual-search');
    });
});
