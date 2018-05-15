/* 
 * Js for Target Machine Page
 */
var API_CALL_PREFIX = "../raxakapi/v1/";
var DEFAULT_TIMEOUT = 10 * 1000; //10 seconds
//Start: Do Not delete code (contains additional access codes -6 and -99)
var TM_ACCESS_NORMS = {};
TM_ACCESS_NORMS["1"] = {status: "OK", title: "ALL OK", class: "#96db79"};
TM_ACCESS_NORMS["-1"] = {status: "OS not supported", title: "OS not supported", class: "#dff0d8"};
TM_ACCESS_NORMS["-2"] = {status: "Unreachable", title: "Ping failed", class: "#f65e5e"};
TM_ACCESS_NORMS["-3"] = {status: "Cannot SSH", title: "SSH login fails", class: "#f9e473"};
TM_ACCESS_NORMS["-4"] = {status: "No sudo", title: "Insufficient execution privilege", class: "#dff0d8"};
TM_ACCESS_NORMS["-5"] = {status: "In progress", title: "Access check in progress", class: "#dff0d8"};
TM_ACCESS_NORMS["-6"] = {status: "Cannot VPN", title: "Cannot VPN", class: '#dff0d8'};
TM_ACCESS_NORMS["-99"] = {status: "Already exists", title: "Target machine already exists", class: "#dff0d8"};
// Get the list of IP addresses enrolled by current user
var session_get = '';
var getgraph = function () {
    var accessObj = {};
    var accessdata = [];
    $.ajax({
        dataType: 'json',
        timeout: DEFAULT_TIMEOUT,
        async: false,
        url: API_CALL_PREFIX + "getIPs/"
    }).done(function (response) {
        var ipscount = response.length;
        $('#enrolledservercount').text(ipscount);
        if (ipscount > 0) {
            $.each(response, function (key, value) {
                var get_tms = JSON.parse(value);
                if (get_tms.access != null) {
                    accessObj[get_tms.access] = (accessObj[get_tms.access] || 0) + 1;
                }
            });
            var html = "<div class='table-responsive'><table class='table table-hover'><thead>" +
                    "<tr><th>Status</th><th>Number of servers</th></tr></thead><tbody>";
            $.each(accessObj, function (key, val) {
                var title = TM_ACCESS_NORMS[key].title;
                accessdata.push({name: TM_ACCESS_NORMS[key].title, y: val, color: TM_ACCESS_NORMS[key].class});
                html += "<tr>";
                html += "<td>" + title + "</td>";
                html += "<td>" + val + "</td>";
                html += "</tr>";
            });
            html += "<tr>";
            html += "<td><b>Total Enrolled Servers</b></td>";
            html += "<td><b>" + ipscount + "</b></td>";
            html += "</tr>";
            html += "</tbody></table></div>";
            if (accessdata.length) {
                $('#accesschartContainer').highcharts({
                    chart: {
                        type: 'pie',
                        options3d: {
                            enabled: true,
                            alpha: 45,
                            beta: 0
                        }
                    },
                    title: {
                        //text: 'Access Status',
                        text: '',
                        align: 'bottom',
                        x: 180, //  this to move x-coordinate of title to desired location
                        y: 190 //  this to move y-coordinate of title to desired location
                                //y: $('#accesschartContainer').height() * 0.90   // this will position the title with 90% margin from the top.
                    },
                    tooltip: {
                        //pointFormat: '{series.name}: <b>{point.percentage:.1f}%</b>'
                        //pointFormat: '{point.name}: <b>{point.percentage:.1f}%</b>'
                        pointFormat: '<span style="font-size: 10px;font-weight:bold;">{point.name}</span> :{point.percentage:.1f}%'
                    },
                    plotOptions: {
                        pie: {
                            allowPointSelect: true,
                            cursor: 'pointer',
                            depth: 35,
                            dataLabels: {
                                enabled: false,
                                format: '{point.name}'
                            },
                            showInLegend: true
                        }
                    },
                    legend: {
                        enabled: true,
                        layout: 'horizontal',
                        align: 'center',
                        verticalAlign: 'top',
                        //x: 100, //set as you want
                        //y: 0 // set as you want
                        /*
                         *  labelFormatter: function () {
                         return this.name + ' ' + this.y + '%';
                         }*/
                    },
                    xAxis: {
                        categories: ['Jan', 'Feb', 'Jul', 'Aug']
                    },
                    series: [{
                            type: 'pie',
                            name: 'accessdata',
                            data: accessdata
                        }]
                });
                $('#enrolledInfoBody').html(html);
            } else {
                $('#accesschartContainer').text('No records found!');
            }
        } else {
            $('#select_prof_id').text('No records found!');
        }
    }).fail(function (jqxhrFail, textStatusFail, errorThrownFail) {
        if (textStatusFail === "timeout") {
            gErrorStatus["error"].push({identifier: 'getAPPVersion', custom_msg: TIMEOUT_MESSAGE, message: errorThrownFail});
        } else {
            gErrorStatus["error"].push({identifier: 'getAPPVersion', custom_msg: errorThrownFail, message: errorThrownFail});
        }
        errorHandler();
    });
};
var getCronJobDetails = function () {
    var freq_arr = '';
    $.ajax({
        dataType: 'json',
        timeout: DEFAULT_TIMEOUT,
        url: API_CALL_PREFIX + "getCronJobs"
    }).done(function (response) {
        var sortedDates = '';
        var schedulecount = response.length;
        $('#schedukercount').text(schedulecount);
        if (schedulecount > 0) {
            var frequency = '<div style="font-size:12px;"><a href ="../enrolled_servers.html" style="cursor:pointer;text-decoration:none;color:#fff;">Click here to set the Schedular</a>.</div>';
            var html = "<table class='table table-hover'><thead>" +
                    "<tr><th>Server IP</th><th>Profile</th><th>Frequency</th><th>Nextrun</th></tr></thead><tbody>";
            var date_array = [];
            $.each(response, function (key, value) {
                var get_cron_job = JSON.parse(value);
                var ip = get_cron_job.ip;
                var frequency = get_cron_job.frequency;
                var cron_profile = get_cron_job.profile;
                freq_arr += frequency;
                var nextrun = get_cron_job.nextrun;
                var utc_format = new Date(nextrun + ' UTC');
                var get_utc_date = String(utc_format).replace('GMT+0530 (IST)', "");

                date_array.push(get_utc_date);
                sort_date = date_array.sort();
                sortedDates = sort_date.sort(function (var1, var2) {
                    var a = new Date(var1), b = new Date(var2);
                    if (a > b)
                        return 1;
                    if (a < b)
                        return -1;
                    return 0;
                });
                html += "<tr>";
                html += "<td>" + ip + "</td>";
                html += "<td>" + cron_profile + "</td>";
                html += "<td>" + frequency + "</td>";
                html += "<td>" + get_utc_date + "</td>";
                html += "</tr>";
            });
            $("#nextRun").text(sortedDates[0]);
        } else {
            var html = '<div style="font-size:12px;text-align:center;" >To set the Schedular<a href ="../apply_profile.html"  style="cursor:pointer;text-decoration:none;">.Click here.</div>';
            var frequency = '<div><a href ="../apply_profile.html" style="cursor:pointer;text-decoration:none;font-size: 12px;">Click here to set the Schedular</a>.</div>';
            $("#nextRun").html(frequency);
        }
        html += "</tbody></table>";
        $("#cron_job_count").html(html);
    }).fail(function (jqxhrFail, textStatusFail, errorThrownFail) {
        if (textStatusFail === "timeout") {
            gErrorStatus["error"].push({identifier: 'getAPPVersion', custom_msg: TIMEOUT_MESSAGE, message: errorThrownFail});
        } else {
            gErrorStatus["error"].push({identifier: 'getAPPVersion', custom_msg: errorThrownFail, message: errorThrownFail});
        }
        errorHandler();
    });
};
var getGroupDetails = function () {
    $.ajax({
        dataType: 'json',
        method: 'post',
        timeout: DEFAULT_TIMEOUT,
        url: API_CALL_PREFIX + "getGroups/"
    }).done(function (response) {
        if (response.length > 0) {
            var frequency = '<div style="font-size:12px;">No Information is available.</div>';
            var html = "<table class='table table-hover'><thead>" +
                    "<tr><th>Group Name</th><th>Server Group Count</th></tr></thead><tbody>";
            $.each(response, function (key, value) {
                var get_group_value = JSON.parse(value);
                var groupname = get_group_value.groupname;
                var ipCount = get_group_value.ips;
				var split_ipCount = ipCount.split(',')
				var server_group_count = split_ipCount.length;
                html += "<tr>";
                html += "<td>" + groupname + "</td>";
                html += "<td>"+server_group_count+"</td>";
                html += "</tr>";
            });
			$(".info-box-number").html(response.length)
        } else {
            var html = '<div style="font-size:12px;text-align:center;" >No Information is available.</div>';
        }
        html += "</tbody></table>";
        $("#groupInfoBody").html(html);
    }).fail(function (jqxhrFail, textStatusFail, errorThrownFail) {
        if (textStatusFail === "timeout") {
            gErrorStatus["error"].push({identifier: 'getAPPVersion', custom_msg: TIMEOUT_MESSAGE, message: errorThrownFail});
        } else {
            gErrorStatus["error"].push({identifier: 'getAPPVersion', custom_msg: errorThrownFail, message: errorThrownFail});
        }
        errorHandler();
    });
};

var get_motd_info = function (dformat) {
    var html = '';
    if (sessionStorage.getItem('motd_info')) {
        $('#motd_info').hide();
        return;
    }
    var content = {date: dformat};
    $.ajax({
        method: 'POST',
        dataType: 'json',
        data: content,
        url: API_CALL_PREFIX + "getMotds/"
    }).done(function (response) {
        if (Object.keys(response).length > 0) {
            var motd_data = JSON.parse(response[0]);
            var description = motd_data.description;
            sessionStorage.setItem('motd_info', description);
            $('#motd_get').html('<font color="#31708F">' + description);
        } else {
            var loggedin_user = sessionStorage.getItem('logged_user');
            var loggedin_user = JSON.parse(loggedin_user);
            var loggedinUsername = loggedin_user.firstname;
            var logged_username = loggedinUsername.charAt(0).toUpperCase() + loggedinUsername.slice(1);
            var date1 = new Date();
            var time = date1.getHours() + ":" + date1.getMinutes() + ":" + date1.getSeconds();
            var gethour = date1.getHours();
            sessionStorage.setItem('motd_info', true);
            if (time > '00:00:00' && time < '11:59:59') {
                html = 'Good Morning, ' + logged_username + '&nbsp;';
            }
            else if (time > '12:00:00' && time < '16:00:00') {
                html = 'Good Afternoon, ' + logged_username + '&nbsp;';
            }
            else if (time > '16:00:00' && time < '23:59:59') {
                html = 'Good Evening, ' + logged_username + '&nbsp;';
            }
            $('#motd_get').html(html);
        }
    }).fail(function (jqxhrFail, textStatusFail, errorThrownFail) {
        errorHandler(jqxhrFail);
    });
};
var d = new Date();
var curr_date = d.getDate();
var curr_month = d.getMonth();
curr_month++;
var curr_year = d.getFullYear();
var month_names = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
var get_month = month_names[d.getMonth()];
var dashboard_login_time = get_month + ' ' + curr_date + ',' + ' ' + curr_year;
$(document).ready(function () {
getGroupDetails();
    Number.prototype.padLeft = function (base, chr) {
        var len = (String(base || 10).length - String(this).length) + 1;
        return len > 0 ? new Array(len).join(chr || '0') + this : this;
    }
    var dateObj = new Date,
            dformat = [dateObj.getDate().padLeft(),
                (dateObj.getMonth() + 1).padLeft(),
                dateObj.getFullYear()].join('-');
    get_motd_info(dformat);
    $('.highcharts-title').hide();// hide graph text
});

