$j14(document).ready(function () {
    $j14("#uploadcsvfile").change(function (e) {
        var ext = $j14("input#uploadcsvfile").val().split(".").pop().toLowerCase();

        if ($j14.inArray(ext, ["csv"]) == -1) {
            myDialog2.set("title", "Info");
            button = "<center><button class='info-btn-ok' data-dojo-type='dijit/form/Button' id='csv-fileerr' type='submit'>OK</button></center>";
            myDialog2.set("content", "<div class='info-content'>Please upload CSV file only.</div>" +button);
            myDialog2.set("style", "height:140px;");
            myDialog2.show();
            csvFileFlag = false;
            return false;
        }else{
            csvFileFlag = true;
        }

        if (e.target.files != undefined) {
            var reader = new FileReader();
            reader.onload = function (e) {
                csv_ip_detail=[];//clearing here as new file is selected

                /* Start: New code for csv read */
                var allTextLines = e.target.result;
                allTextLines = allTextLines.split(/\r|\n|\r\n|\n\r/);
                for (var line in allTextLines) {
                    var tmpvar = $j14.trim(allTextLines[line].split(","));
                    if(tmpvar !== ''){
                        csv_ip_detail[csv_ip_detail.length] = allTextLines[line].split(",");//csv_ip_detail is global
                    }
                }
                /* End: New code for csv read */

                /* Start: Previous code for csv read
                var csvval = e.target.result.split("\n");
                var csvdata = csvval[0].split("\r");
                var line_count = csvdata.length;
                for (var tmpi = 0; tmpi < line_count; tmpi++) {
                    csv_ip_detail[csv_ip_detail.length] = csvdata[tmpi].split(",");//csv_ip_detail is global
                }
                /* End: Previous code for csv read */
            };
            reader.readAsText(e.target.files.item(0));
        }

        return false;
    });
});

function displayTogglePrivateInputs(){
    if (document.getElementById('private_ip').checked == true){
        $j14('.private_ip_fields').show();
    } else {
        $j14('.private_ip_fields').hide();
    }
}

$j14(document).ready(function () {
    $j14('#demo').change(function () {
        $j14('#profile-rules-list').html("");
        var selected_profile = $j14("input[name='radioGroup']:checked").val();
        getRulesByProfile(selected_profile);
    });
});

//Start: search selector (Target machine tab)
$j14.fn.filterByText = function (textbox, selectSingleMatch) {
    return this.each(function () {
        var select = this;
        var options = [];
        $j14(select).find('option').each(function () {
            options.push({value: $j14(this).val(), text: $j14(this).text(), class: $j14(this).attr('class'), title: $j14(this).attr('title'), access: $j14(this).attr('access')});
        });
        $j14(select).data('options', options);
        $j14(textbox).bind('change keyup', function () {
            var options = $j14(select).empty().scrollTop(0).data('options');
            var search = $j14.trim($j14(this).val());
            var regex = new RegExp(search, 'gi');

            $j14.each(options, function (i) {
                var option = options[i];
                if (option.text.match(regex) !== null) {
                    $j14(select).append(
                            $j14('<option>').text(option.text).val(option.value).attr('class', option.class).attr('title', option.title).attr('access', option.access)
                            );
                }
            });
            if (selectSingleMatch === true &&
                    $j14(select).children().length === 1) {
                $j14(select).children().get(0).selected = true;
            }
        });
    });
};

function clearSearchInput() {
    $j14('#search_machine').val('').trigger("keyup");
    $j14('#ipadd_del_sel_holder .ms2side__header a').css("display", "none");
}
//End: search selector (Target machine tab)

function checkedCriteria(selectedCriteria, isCheck) {
    //        tempValue = $j14('.selectedIPs  input:checkbox').map(function (n) {
    //            if (this.checked) {
    //                console.log(this.value);
    //                tempValue = tempValue+","+this.value;
    //                //return  this.value;
    //            };
    //        }).get().join(',');
    var tempValue = '';
    $j14(".selectedIPs input:checkbox").each(function () {
        if ($j14(this).is(":checked")) {
            console.log("valueis::" + this.value);
            tempValue = tempValue + "," + this.value;
        }
    });

    //console.log("previous tempValue::"+tempValue);
    //tempValue = tempValue.replace(/(^\s*,)|(,\s*$)/g, '');
    //console.log("after tempValue::"+tempValue);
    if (isCheck) {
        //alert("selectedCriteria ::" + selectedCriteria + "& isCheck::" + isCheck);
        var opts = document.getElementById("ipadd").getElementsByTagName('option');
        for (var i = 0; i < opts.length; i++) {
            var cls = opts[i].className;
            cls = cls.replace(" displayBlock", "");
            cls = cls.replace(" displayNone", "");
            //console.log("tempValue::"+tempValue+"&opts[i].getAttribute('access')::"+opts[i].getAttribute('access')+"&&Index Of"+tempValue.indexOf(","+opts[i].getAttribute('access')));
            if (tempValue.indexOf("," + opts[i].getAttribute('access')) > -1) {
                //opts[i].style = "display:block";
                opts[i].className = cls + " displayBlock";
            } else {
                //opts[i].style = "display:none;";
                opts[i].className = cls + " displayNone";
            }
        }
        $j14('#ipadd').multiselect2side('destroy');
        //$('#searchable_item').multiselect2side();
        $j14('#ipadd').multiselect2side({
            moveOptions: false,
            //selectedPosition: 'right',
            labelTop: '+ +',
            labelBottom: '- -',
            labelUp: '+',
            labelDown: '-',
            labelsx: '* Selected *',
            labeldx: 'Selected Target Machine(s)',
            search: "Search : "
        });
    } else {
        if (getBooleanFlag()) {
            document.getElementById("alltargetmachines").checked = true;
            checkedCriteria($j14("#alltargetmachines").val(), true);
        } else {
            var opts = document.getElementById("ipadd").getElementsByTagName('option');
            for (var i = 0; i < opts.length; i++) {
                var cls = opts[i].className;
                cls = cls.replace(" displayBlock", "");
                cls = cls.replace(" displayNone", "");
                //console.log(opts[i].getAttribute('access')+"&&&&"+selectedCriteria+"&&indexOF::"+opts[i].getAttribute('access').indexOf(selectedCriteria));
                if (opts[i].getAttribute('access').indexOf(selectedCriteria) > -1) {
                    opts[i].className = cls + " displayNone";
                }
            }
            $j14('#ipadd').multiselect2side('destroy');
            //$('#searchable_item').multiselect2side();
            $j14('#ipadd').multiselect2side({
                moveOptions: false,
                //selectedPosition: 'right',
                labelTop: '+ +',
                labelBottom: '- -',
                labelUp: '+',
                labelDown: '-',
                labelsx: '* Selected *',
                labeldx: 'Selected Machine(s)',
                search: "Search: "
            });
        }
    }
}

function checkedCriteria_del(selectedCriteria, isCheck2) {
    var tempValue2 = '';
    $j14(".selectedIPs_del input:checkbox").each(function () {
        if ($j14(this).is(":checked")) {
            //console.log("del_val_is::"+this.value);
            tempValue2 = tempValue2 + "," + this.value;
        }
    });

    //        $j14('#search_machine').val('');

    //console.log("isCheck2 = "+isCheck2);
    if (isCheck2) {
        //alert("selectedCriteria ::" + selectedCriteria + "& isCheck2::" + isCheck2);
        var flagEnableBtn = false;
        var opts = document.getElementById("ipadd_del").getElementsByTagName('option');
        for (var i = 0; i < opts.length; i++) {
            var cls = opts[i].className;
            cls = cls.replace(" displayBlock", "");
            cls = cls.replace(" displayNone", "");
            //console.log("tempValue2::"+tempValue2+"&opts[i].getAttribute('access')::"+opts[i].getAttribute('access')+"&&Index Of"+tempValue2.indexOf(","+opts[i].getAttribute('access')));
            if (tempValue2.indexOf("," + opts[i].getAttribute('access')) > -1) {
                //opts[i].style = "display:block";
                opts[i].className = cls + " displayBlock";
                flagEnableBtn = true;
            } else {
                //opts[i].style = "display:none;";
                opts[i].className = cls + " displayNone";
            }
        }
        if (flagEnableBtn) {
            enableButtons(true);
        } else {
            enableButtons(false);
        }
        $j14('#ipadd_del').filterByText($j14('#search_machine'), false);//Reinitialize searchFilter each time when options gets changed(display)
    } else {
        if (getBooleanFlag('_del')) {
            document.getElementById("alltargetmachines_del").checked = true;
            checkedCriteria($j14("#alltargetmachines_del").val(), true);
        } else {
            var opts = document.getElementById("ipadd_del").getElementsByTagName('option');
            for (var i = 0; i < opts.length; i++) {
                var cls = opts[i].className;
                cls = cls.replace(" displayBlock", "");
                cls = cls.replace(" displayNone", "");
                //console.log(opts[i].getAttribute('access')+"&&&&"+selectedCriteria+"&&indexOF::"+opts[i].getAttribute('access').indexOf(selectedCriteria));
                if (opts[i].getAttribute('access').indexOf(selectedCriteria) > -1) {
                    opts[i].className = cls + " displayNone";
                }
            }
        }
    }
}

$j14(document).ready(function () {
    selectIpfunction();
    selectIpfunction('del');

    $j14('#search_machine').keyup(function () {
        var srchMac = $j14('#search_machine').val();
        if (srchMac.length > 0) {
            $j14('#ipadd_del_sel_holder .ms2side__header a').css("display", "inline");
        } else {
            $j14('#ipadd_del_sel_holder .ms2side__header a').css("display", "none");
        }
    });

    //Start: Toggle close button Customized tab Search
    toggleSearchClose_Customized('search_success_div_id', 'search_success_rule');
    toggleSearchClose_Customized('search_failure_div_id', 'search_failure_rule');
    toggleSearchClose_Customized('search_manual_div_id', 'search_manual_rule');
    //End: Toggle close button Customized tab Search
    //
    $j14('#search_console_rule').keyup(function (event) {
        var searchTerm = $j14.trim($j14("#search_console_rule").val());
        if(searchTerm) {
            var strShowData = '';
            $j14.each(consoleLogData, function (key, value) {
                var rule_num = value.rule;
                if (rule_num.indexOf(searchTerm) > -1 ) {
                    strShowData += value.console;
                }
            });
            $j14("#textarea_id").html(strShowData);
        } else{
             $j14("#textarea_id").html(consoleTextarea);
        }
        if ($j14.trim($j14("#search_console_rule").val()).length > 0) {
            $j14('#search_console_div_id a').css("display", "inline");
        } else {
            $j14('#search_console_div_id a').css("display", "none");
        }
    });

});

function selectIpfunction(selected_ip_id) {
    var appendId = '';
    if (selected_ip_id === 'del') {
        appendId = '_del';
    }

    var id = "";
    //var booleanFlag = false;
    $j14("#alltargetmachines" + appendId).attr("checked", true);
    $j14(".searchableCriteria" + appendId).click(function () {
        id = $j14(this).attr("id");
        if (id === ("alltargetmachines" + appendId) && $j14("#alltargetmachines" + appendId).is(':checked')) {
            $j14(".searchableCriteria" + appendId).each(function () {
                if ($j14(this).attr("id") !== ("alltargetmachines" + appendId)) {
                    document.getElementById($j14(this).attr("id")).checked = false;
                }
            });

            if (appendId == '_del') {
                checkedCriteria_del($j14(this).val(), true);
            } else {
                checkedCriteria($j14(this).val(), true);
            }
        } else if (id !== "alltargetmachines" + appendId) {
            //console.log(getBooleanFlag(appendId));
            if (getBooleanFlag(appendId)) {
                document.getElementById("alltargetmachines" + appendId).checked = true;
                if (appendId == '_del') {
                    checkedCriteria_del($j14("#alltargetmachines" + appendId).val(), false);
                } else {
                    checkedCriteria($j14("#alltargetmachines").val(), true);
                }
            } else {
                document.getElementById("alltargetmachines" + appendId).checked = false;
            }

            if (appendId == '_del') {
                checkedCriteria_del($j14(this).val(), true);
            } else {
                checkedCriteria($j14(this).val(), true);
            }
        } else if (id == ("alltargetmachines" + appendId) && !$j14("#alltargetmachines" + appendId).is(':checked')) {
            myDialog2.set("title", "Info");
            button = "<button class='info-btn' data-dojo-type='dijit/form/Button' id='leave_tab_ok' value='OK' type='submit'>OK</button>"
            myDialog2.set("content", "<div class='info-content'>Please select atleast one searching criteria</div>" + "<center>" + button + "</center>");
            myDialog2.set("style", "height:140px;");
            myDialog2.show()
            //$j14("#alltargetmachines").attr("checked",true);
            document.getElementById(id).checked = true;

        }
    });

}

function getBooleanFlag(appendId) {
    var booleanFlag = false;
    $j14(".searchableCriteria" + appendId).each(function () {
        booleanFlag = false;
        if ($j14(this).is(':checked') && $j14(this).attr('id') !== "alltargetmachines" + appendId) {
            return false;
        } else {
            booleanFlag = true;
        }
    });
    return booleanFlag;
}

function selectOnlyRemainingTM(){
    if(tmCount === 1){
        $j14("#ipadd_del").prop("selectedIndex", 0);
    }else if(tmCount > 1){
        $j14('#ipadd_del option:selected').removeAttr('selected');
    }
}

//Start: search selector (success tab)
$j14.fn.filterByText_Customized = function (textbox, selectSingleMatch) {
    return this.each(function () {
        var select = this;
        var options = [];
        $j14(select).find('option').each(function () {
            options.push({value: $j14(this).val(), text: $j14(this).text(), title: $j14(this).attr('title')});
        });
        $j14(select).data('options', options);
        $j14(textbox).bind('change keyup', function () {
            var options = $j14(select).empty().scrollTop(0).data('options');
            var search = $j14.trim($j14(this).val());
            var regex = new RegExp(search, 'gi');

            $j14.each(options, function (i) {
                var option = options[i];
                if (option.text.match(regex) !== null) {
                    $j14(select).append(
                            $j14('<option>').text(option.text).val(option.value).attr('title', option.title)
                            );
                }
            });
            if (selectSingleMatch === true &&
                    $j14(select).children().length === 1) {
                $j14(select).children().get(0).selected = true;
            }
        });
    });
};

/**
 * This funtion "clearSearchInput_Customized" clears the search input
 * @param {string} idDiv => Container of "searchIdInput"
 * @param {string} searchIdInput => text-input to search
 * @returns {undefined}
 */
function clearSearchInput_Customized(idDiv, searchIdInput) {
    $j14('#'+searchIdInput).val('').trigger("keyup");
    $j14('#'+idDiv+' .ms2side__header a').css("display", "none");
}

/**
 * This funtion "activateSearch_Customized" activates the search
 * @param {string} selectorId => select tag id on which search will carried out
 * @param {string} searchIdInput => text-input to search
 * @returns {void}
 */
function activateSearch_Customized(selectorId, searchIdInput){
    $j14('#'+searchIdInput).val('');//clear on reload
    $j14(function () {
        $j14('#'+selectorId).filterByText_Customized($j14('#'+searchIdInput), false);//set true to select only one remaining ip
    });
}

/**
 * This funtion "toggleSearchClose_Customized" clears the search input
 * @param {string} idDiv => Container of "searchIdInput"
 * @param {string} searchIdInput => text-input to search
 * @returns {undefined}
 */
function toggleSearchClose_Customized(idDiv, searchIdInput){
    $j14('#'+searchIdInput).keyup(function () {
        var srchMac = $j14('#'+searchIdInput).val();
        if (srchMac.length > 0) {
            $j14('#'+idDiv+' a').css("display", "inline");
        } else {
            $j14('#'+idDiv+' a').css("display", "none");
        }
    });
}
//End: search selector (Target machine tab)

//Start: Search (Console Tab)
function clearConsoleSearchInput() {
    $j14('#search_console_rule').val('').trigger("keyup");
    $j14('#search_console_div_id .ms2side__header a').css("display", "none");
}
//End: Search(Console Tab)

function blockExecutingTMs(flag){
    var aSelIpInfo = executingTM.split(",");
    var countSelIpInfo = aSelIpInfo.length;
    if (flag) {
        for(var i=0;i< countSelIpInfo; i++){
            $j14("#ipadd_del option").each(function () {
                if ($j14(this).val() == aSelIpInfo[i]) {
                    $j14(this).attr("disabled", "disabled");
                }
            });
        }
    }else{
        for(var i=0;i< countSelIpInfo; i++){
            $j14("#ipadd_del option").each(function () {
                if ($j14(this).val() == aSelIpInfo[i]) {
                    $j14(this).removeAttr("disabled");
                }
            });
        }
        executingTM = '';
    }
}