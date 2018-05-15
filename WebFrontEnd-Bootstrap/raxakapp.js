var profileRunIP = "None";
var statusExecution;
var executedIPs = "None"; // To check the status of rules execution of list of the IPs
var show_profile = " ";//To hold the profile name which has to be displayed in report tab.
var show_execmode = "0";//To hold the execution mode which has to be displayed in report tabe.
var success = manual = failed = 0; //To track the success,failure,manual count for rule sets
var selectedTimeStamp = "None"; //To track the selected timestamp from archive log selector.
var executed_on = "";//To track the archive/latest/last run timestamp.It is used to show the time in report tab.
var latest_client_time = "";
var sel_profile = "";
var defaultTimeout = 100000;//Default timeout for ajax request is set to 10 sec.
var flagIpChanges;
var compliance_in_progress = false;
var show_report_result = true;
var user_action = 'add_by_ip_details';//for csv upload
var csv_ip_detail = [];//for csv upload
var csvFileFlag = false;//for csv upload
var tmCount = 0;//To hold target machine count
var compliance_ip = "";
var txtareaContentConsoleTab = '';
var flagTriggerSort = false;
var consoleLogData;//for consoleTab search
var consoleTextarea;

var API_CALL_PREFIX = "../raxakapi/v1/";

var ipList = [];    // object holding ipList from last run IPs
var username = [];  // object holding user information
var version = "";   // version string
var ipDetails = []; // full details of what is known about an IP
var enrolledIPs = [];// IPs enrolled by the user

var menu_tab_select_flag = {
    'select_profile': false,
    'apply_profile': false,
    'success': false,
    'failure': false,
    'manual': false,
    'console_log': false,
    'report_log': false,
    'schedule': false,
    'target_machines': false
};

$(document).ready(function () {
    $.get("../motd.txt", function(data) {
        console.log("Motd message " + data);
        $("#motd").html(data);
    }, "text")
    // Get the version number of the code
    $.get(API_CALL_PREFIX + "version", function (data) {
        $("#version").html(data);
    }).fail(function (data) {
        alert("Failed " + data)
    });
    // Get the username and other user information
    $.get(API_CALL_PREFIX + "whoAmI", function (data) {
        username = data;
        $("#username").html(username['email']);
        var loginIcon = "../crlogo.png";
        switch (username['login']) {
            case "Google":
                loginIcon = "../lib/images/ggle_icn.jpg";
                break;
            case "Amazon":
                loginIcon = "../lib/images/amzn_icn.jpg";
                break;
            case "IBM":
                loginIcon = "../lib/images/ibm_icn.jpg";
                break;
            case "HP":
                loginIcon = "../lib/images/hp_icn.jpg";
                break;
        }
        $("#authenticator").html(" <img style='height:20px' src='" + loginIcon + "'/>");
    }, "json").fail(function (data) {
        console.log("Unable to get whoAmI data: " + data/success);
    });

    // Get the list of IP addresses enrolled by current user
    $.get(API_CALL_PREFIX + "getIPs", function (data) {
        enrolledIPs = data;
        $("#enrolledIPs").html($(enrolledIPs).length);
        // Create the modal data that will be shown on clicking "more info"
        //var html = $("#enrolledInfoBody").html();
        var html = "<div class='table-responsive'><table class='table table-hover'><thead>" +
        "<tr><th>Server IP</th><th>Access</th><th>OS</th>" +
        "<th>Nickname</th></tr></thead><tbody>";
        $.each(enrolledIPs, function(key, value) {
            console.log(key);
            console.log(value);
            var v = JSON.parse(value);
            var highlightclass = "";
            var access = "";
            switch (v.access) {
                case 1:
                    highlightclass = "class='success'";
                    access = "OK (1)";
                    break;
                case '-2':
                    highlightclass = "class='danger'";
                    access = "Unreachable (-2)";
                    break;
                case '-3':
                    highlightclass = "class='warning'";
                    access = "Cannot SSH (-3)";
                    break;
                case '-4':
                    highlightclass = "class='info'";
                    access = "No sudo (-4)";
                    break;
                case '-5':
                    highlightclass = "class='active'";
                    access = "In progress (-5)";
                    break;
                case '-6':
                    highlightclass = "class='danger'";
                    access = "Cannot VPN (-6)";
                    break;
                default:
                    access = "Code: " + v.access;
                    break;
            }
            html += "<tr " + highlightclass + "><td>" + v.ip + "</td><td>" + access + "</td>";
            html += "<td>" + v.osname + " " + v.osversion + "</td>";
            html += "<td>" + v.nickname + "</td></tr>";

        });

        html += "</tbody></table></div>";
        $("#enrolledInfoBody").html(html);
    }, "json");


    // Get the last run overview and details
    $.get("../raxakapi/v1/getlastrunIPs", function (data) {
        ipList = data;
        var table_html = "<table class='table table-hover'><thead><tr><th>Enrolled Machine</th>" +
            "<th>Nickname</th><th>Status</th>" +
            "</thead><tbody></tbody></table>";
        $("#lastrunIPs").html(table_html);

        table_html = "";
        $("#numberMachines").html($(ipList).length);
        $.each(ipList, function (key, value) {
            // for each ip address in the last run, get the details of the run
            $.get(API_CALL_PREFIX + "showExecutionStatus/" + key, function (data) {
                ipDetails[key] = [];
                ipDetails[key]['executionstatus'] = data;
            }).fail(function (data) {
                ipDetails[key]['executionstatus'] = "Error";
            });

            $.get(API_CALL_PREFIX + "getIPDetails?ip=" + key, function (data) {
                if (data == []) {
                    var OS = [];
                    OS['os'] = 'Unknown';
                    OS['os_version'] = '';
                    OS['hostname'] = 'Unknown';
                    ipDetails[key]['OS'] = OS;
                }
                ipDetails[key]['OS'] = data;
            }).fail(function (data) {
                ipDetails[key]['OS'] = [];
            });

            $.get(API_CALL_PREFIX + "showrun/" + key, function (data) {
                ipDetails[key]['rundetails'] = data; //where data is a list of JSON objects
            }).fail(function() {
                ipDetails[key]['rundetails'] = [];
            });

            $(document).ajaxStop(function () {
                if (value == "") value = "<small>None</small>";
                if (ipDetails[key]['executionstatus'].indexOf('execution completed')) {
                    table_html += "<tr><td>" + key + "</td><td>" + value + "</td>";
                    table_html += "<td>Complete</td></tr>";
                }
                else {
                    table_html += "<tr class='warning'><td>" + key + "</td><td>" + value + "</td>";
                    table_html += "<td>In Progress</td></tr>";
                }
                $("#lastrunIPs").append(table_html);
                // If this is the first row, then call function to build graphical display
                if ($("#lastrunIPs > tbody > tr").length == 1) showchart( $("#lastrunIPs tbody tr")[0]);
                $('#lastrunIPs').on('click', 'tbody tr', function (event) {
                    $(this).addClass('active').siblings().removeClass('active');

                    showchart( this );
                });
            });

            // for each ip address in the last run, get the details of the run

        });
    }, "json").fail(function (data) {
        alert("Failed to get lastrunIPs " + data)
    });


});

function showchart ( tablerow ) {
    var l = $(tablerow).find('td');
    for (var i = 0; i< l.length; i++) {
        console.log(i + " " + l[i].innerHTML);
    };

    var server = l[0].innerHTML;
    var ipD = ipDetails[server];
    var runD = ipD.rundetails;
    var profile = JSON.parse( runD[0]).profile;
    console.log("profile = " + profile);
    var totrules = runD.length;
    console.log("rules = " + totrules);
    var remediation = JSON.parse( runD[0]).exemode;
    console.log("remd = "+remediation);
    var s = 0;
    var m = 0;
    var f = 0;
    var rf = 0;
    var sr = 0;

    for (i = 0; i < runD.length; i++) {
        remd = JSON.parse(runD[i]);
        // console.log(remd.outcome);
        switch (remd.outcome) {
            case 'successful':
                s++;
                break;
            case 'successfully remediated':
                sr++;
                break;
            case 'needs manual intervention (remediation failed)':
                rf++;
                break;
            case 'failed':
                f++;
                break;
            case 'needs manual intervention':
                m++;
                break;
            default:
                console.log("unknown case: ", remd.outcome);
                break;

        }
    }
    console.log(s, sr, rf, f, m);

    var html = server +"<br>";
    html += profile + "<br>";
    html += "Total Rules: " + totrules + "<br>";
    if (remediation == 1) html += "Automatic Remediation";
    else html += "Manual Remediation";
    $("#profileName").html(html);

    $("#morris-donut-chart").html("");
    Morris.Donut({
        element: 'morris-donut-chart',
        data: [{
            label: "Success",
            value: s
        }, {
            label: "Remediated",
            value: sr
        }, {
            label: "Failed",
            value: f
        }, {
            label: "Remediation Failed",
            value: rf
        }, {
            label: "Manual",
            value: m
        }
        ],

        resize: true
    });
}
