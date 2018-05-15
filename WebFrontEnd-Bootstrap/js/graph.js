/* 
 * Js for Target Machine Page
 */
// ------- Start Constant -------------//
var API_CALL_PREFIX = "../raxakapi/v1/";
var DEFAULT_TIMEOUT = 10 * 1000; //10 seconds
//Start: Do Not delete code (contains additional access codes -6 and -99)
var TM_ACCESS_NORMS = {};
TM_ACCESS_NORMS["1"] = {status: "OK", title: "ALL OK", class: "#96db79"};
TM_ACCESS_NORMS["-1"] = {status: "OS not supported", title: "OS Not Supported", class: "#dff0d8"};
TM_ACCESS_NORMS["-2"] = {status: "Unreachable", title: "Ping Failed", class: "#f65e5e"};
TM_ACCESS_NORMS["-3"] = {status: "Cannot SSH", title: "SSH Login Fails", class: "#f9e473"};
TM_ACCESS_NORMS["-4"] = {status: "No sudo", title: "Insufficient Execution Privilege", class: "#dff0d8"};
TM_ACCESS_NORMS["-5"] = {status: "In progress", title: "Access Check In Progress", class: "#dff0d8"};
TM_ACCESS_NORMS["-6"] = {status: "Cannot VPN", title: "Cannot VPN", class: '#dff0d8'};
TM_ACCESS_NORMS["-99"] = {status: "Already exists", title: "Target Machine Already Exists", class: "#dff0d8"};
// ------- End Constant -------------//

var getgraph = function () {
    var osnameObj = {};
    var osverobj = {};
    var accessObj = {};
    var osversion = [];
    var ospoints = [];
    var osversionpoints = [];
    var accesspoints = [];
    $.ajax({
        dataType: 'json',
        timeout: DEFAULT_TIMEOUT,
        async: false,
        url: API_CALL_PREFIX + "getIPs/",
        /*beforeSend: function () {
         $('#ajaxloader').show();
         }*/
    }).done(function (response) {
        //$('#ajaxloader').hide();
        var ipscount = response.length;
        if (ipscount > 0) {
            $.each(response, function (key, value) {
                var get_tms = JSON.parse(value);
                if (get_tms.osname != null) {
                    //var osname = get_tms.osname;
                    var osname = get_tms.osname.charAt(0).toUpperCase() + get_tms.osname.slice(1); //capatilize first latter.
                    osversion.push({
                        osname: osname + ' v' + get_tms.osversion,
                        //osversion: get_tms.osversion
                    });
                    osnameObj[get_tms.osname] = (osnameObj[osname] || 0) + 1;
                }
                if (get_tms.access != null) {
                    accessObj[get_tms.access] = (accessObj[get_tms.access] || 0) + 1;
                }
            });
            $.each(osnameObj, function (key, val) {
                ospoints.push({y: val, label: key});
            });
            $.each(osversion, function (key, val) {
                osverobj[val.osname] = (osverobj[val.osname] || 0) + 1;
            });
            $.each(osverobj, function (key, val) {
                osversionpoints.push({y: val, label: key});
            });
            $.each(accessObj, function (key, val) {
                //accesspoints.push([TM_ACCESS_NORMS[key].title, val]);
                accesspoints.push({name: TM_ACCESS_NORMS[key].title, y: val, color: TM_ACCESS_NORMS[key].class});
            });
            //alert(JSON.stringify(accesspoints));

            if (ospoints.length) {
                var oschart = new CanvasJS.Chart("oschartContainer",
                        {
                            title: {
                                text: "",
                            },
                            axisY: {
                                title: "Number Of Servers"
                            },
                            legend: {
                                verticalAlign: "bottom",
                                horizontalAlign: "center"
                            },
                            theme: "theme1",
                            data: [
                                {
                                    type: "column",
                                    showInLegend: true,
                                    legendMarkerColor: "grey",
                                    legendText: "Operating System Wise",
                                    dataPoints: ospoints
                                            //dataPoints: [{"y":1,"label":"Ubuntu"},{"y":1,"label":"centos"},{"y":3,"label":"centos3"},{"y":7,"label":"centos3"}]
                                },
                            ]
                        });
                oschart.render();
                // $('#osversionchartContainer').hide();
            } else {
                $('#oschartContainer').text('No records found!');
            }
            if (osversionpoints.length) {
                var osversionchart = new CanvasJS.Chart("osversionchartContainer",
                        {
                            title: {
                                text: "",
                            },
                            axisY: {
                                title: "Number"
                            },
                            legend: {
                                verticalAlign: "bottom",
                                horizontalAlign: "center"
                            },
                            theme: "theme1",
                            data: [
                                {
                                    type: "column",
                                    showInLegend: true,
                                    legendMarkerColor: "grey",
                                    legendText: "Operating System and Version Wise",
                                    dataPoints: osversionpoints
                                },
                            ]
                        });
                osversionchart.render();
            } else {
                $('#osversionchartContainer').text('No records found!');
            }
            if (accesspoints.length) {
                //new Chartkick.PieChart("accesschartContainer", accesspoints); //[["Blueberry", 10], ["Strawberry", 20], ["Banana", 30], ["Apple", 40], ["Grape", 10]]);

                $('#accesschartContainer').highcharts({
                    chart: {
                        type: 'pie',
                        options3d: {
                            enabled: true,
                            alpha: 35,
                            beta: 0
                        }
                    },
                    title: {
                        text: 'Access Status',
                        align: 'center',
                        verticalAlign: 'bottom',
                        //x: 352, //  this to move x-coordinate of title to desired location
                        //y: 400 //  this to move y-coordinate of title to desired location
                        //y: $('#accesschartContainer').height() * 0.90   // this will position the title with 90% margin from the top.
                    },
                    tooltip: {
                        //pointFormat: '{series.name}: <b>{point.percentage:.1f}%</b>'
                        pointFormat: '<b>{point.percentage:.1f}%</b>'
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
                    series: [{
                            type: 'pie',
                            name: 'Access Status',
                            data: accesspoints
                        }]
                });
            } else {
                $('#accesschartContainer').text('No records found!');
            }
        } else {
            $("#maincontent").hide();
            $("#no_info").show();
        }
        $('#osversionchartContainer').hide(); //hide graph to fixe the length of graph.
        $('#image-holder-page').hide();
    }).fail(function (jqXHR, textStatus, errorThrown) {
        errorHandler(jqXHR);
    });
//    return osname;
};
//function viewgraphdetails(status) {
$('#pass_opt_value').on('change', function () {
    var status = $('#pass_opt_value option:selected').val().trim();
    var statustxt = $('#pass_opt_value option:selected').text().trim();
    $(this).next(".holder").text(statustxt);
    if (status === "osversion") {
        $('#oschartContainer').hide();
        $('#osversionchartContainer').show();
        $('#accesschartContainer').hide();
    } else if (status === "statusaccess") {
        $('#accesschartContainer').show();
        $('#oschartContainer').hide();
        $('#osversionchartContainer').hide();
    } else {
        $('#oschartContainer').show();
        $('#accesschartContainer').hide();
        $('#osversionchartContainer').hide();
    }
});

$(function () {
    getgraph();
    $("#pass_opt_value")[0].selectedIndex = 0;
});
