var EditableTable = function () {

    return {
        //main function to initiate the module
        init: function () {
            function restoreRow(oTable, nRow) {
                var aData = oTable.fnGetData(nRow);
                var jqTds = $('>td', nRow);

                for (var i = 0, iLen = jqTds.length; i < iLen; i++) {
                    oTable.fnUpdate(aData[i], nRow, i, false);
                }

                oTable.fnDraw();
            }

            function editRow(oTable, nRow) {
                var aData = oTable.fnGetData(nRow);
                var jqTds = $('>td', nRow);
                jqTds[0].innerHTML = '<a class="edit" href=""><i class="fa fa-fw fa-save"></i></a>';
                jqTds[1].innerHTML = '<input type="text" class="form-control small" value="' + aData[1] + '">';
                jqTds[2].innerHTML = '<input type="text" class="form-control small" value="' + aData[2] + '">';
                jqTds[3].innerHTML = '<input type="text" class="form-control small" value="' + aData[3] + '">';
                jqTds[4].innerHTML = aData[4];
                jqTds[5].innerHTML = '<a><i class="fa fa-fw fa-info"></i></a>';
                jqTds[6].innerHTML = '<input type="checkbox" name="checkbox" id="chkbx_' + aData[2] + '" value="' + aData[2] + '">';
                jqTds[7].innerHTML = '<a class="cancel" href=""><i class="fa fa-fw fa-close"></i></a>';
            }

            function saveRow(oTable, nRow) {
                var jqInputs = $('input', nRow);
                var aData = oTable.fnGetData(nRow);
                console.log(jqInputs);
                oTable.fnUpdate('<a class="edit" href=""><i class="fa fa-fw fa-pencil"></i></a>', nRow, 0, false);
                oTable.fnUpdate(jqInputs[0].value, nRow, 1, false);
                oTable.fnUpdate(jqInputs[1].value, nRow, 2, false);
                oTable.fnUpdate(jqInputs[2].value, nRow, 3, false);
                oTable.fnUpdate(aData[4], nRow, 4, false);
//		oTable.fnUpdate(jqInputs[3].value, nRow, 5, false);
//              oTable.fnUpdate(jqInputs[4].value, nRow, 6, false);
                oTable.fnUpdate('<a><i class="fa fa-fw fa-info"></i></a>', nRow, 5, false);
                oTable.fnUpdate('<input type="checkbox" name="checkbox" id="chkbx_' + jqInputs[1].value + '" value="' + jqInputs[1].value + '">', nRow, 6, false);

                oTable.fnUpdate('<a class="delete" href=""><i class="fa fa-fw fa-trash-o"></i></a>', nRow, 7, false);
                oTable.fnDraw();

                //oTable.fnUpdate(jqInputs[0].value, nRow, 0, false);
                // oTable.fnUpdate(jqInputs[1].value, nRow, 1, false);
                // oTable.fnUpdate(jqInputs[2].value, nRow, 2, false);
                //  oTable.fnUpdate(jqInputs[3].value, nRow, 3, false);
                // oTable.fnUpdate('<a class="edit" href=""><i class="fa fa-fw fa-pencil"></i></a>', nRow, 4, false);
                // oTable.fnUpdate('<a class="delete" href=""><i class="fa fa-fw fa-trash-o"></i></a>', nRow, 5, false);
                // oTable.fnDraw();
            }

            function cancelEditRow(oTable, nRow) {
                var jqInputs = $('input', nRow);
                oTable.fnUpdate(jqInputs[0].value, nRow, 0, false);
                oTable.fnUpdate(jqInputs[1].value, nRow, 1, false);
                oTable.fnUpdate(jqInputs[2].value, nRow, 2, false);
                oTable.fnUpdate(jqInputs[3].value, nRow, 3, false);
//		oTable.fnUpdate(jqInputs[4].value, nRow, 2, false);
//              oTable.fnUpdate(jqInputs[5].value, nRow, 3, false);
//              oTable.fnUpdate('<a class="edit" href=""><i class="fa fa-fw fa-pencil"></i></a>', nRow, 4, false);
                oTable.fnUpdate(jqInputs[4].value, nRow, 4, false);
                oTable.fnUpdate(jqInputs[5].value, nRow, 5, false);
                oTable.fnUpdate(jqInputs[6].value, nRow, 6, false);
                oTable.fnUpdate(jqInputs[7].value, nRow, 7, false);
                oTable.fnDraw();
            }

            var oTable = $('#editable-sample').dataTable({
                "aLengthMenu": [
                    [10, 20, 30, -1],
                    [10, 20, 30, "All"] // change per page values here
                ],
                // set the initial value
                "iDisplayLength": 10,
                "sDom": "<'row'<'col-lg-6'l><'col-lg-6'f>r>t<'row'<'col-lg-6'i><'col-lg-6'p>>",
                "sPaginationType": "full_numbers",
                "oLanguage": {
                    "sLengthMenu": "_MENU_ Records per page",
                    "oPaginate": {
                        "sPrevious": "Previous",
                        "sNext": "Next"
                    }
                },
                "aoColumnDefs": [{
                        'bSortable': false,
                        'aTargets': [3]
                    }
                ]
            });

            //jQuery('#editable-sample_wrapper .form-group input-group  input').addClass("form-control medium"); // modify table search input
            //jQuery('#editable-sample_wrapper .dataTables_length select').addClass("form-control xsmall"); // modify table per page dropdown


            $('#editable-sample a.delete').live('click', function (e) {
                //e.preventDefault();
                var nRow = $(this).parents('tr')[0];
                var nRowID = $(this).parents('tr').attr('id');
                if ($(this).parents('tr').children('td').find('.delete').attr("disabled") == "disabled") {
                    e.preventDefault();
                } else {
                    
                    swal({
                        html : "Are you sure you want to remove <b><i>"+nRowID+"</i></b> from admin group?",
                        type : 'warning',
                        showCancelButton : true,
                        confirmButtonColor : '#3085d6',
                        cancelButtonColor: '#d33',
                        confirmButtonText: 'Yes, remove it!',
                        closeOnConfirm : false,
                    },
                    function(isDelete){
						if(isDelete)
						{
	                        adminPrivilege(nRowID, 'false');
    	                    oTable.fnDeleteRow(nRow);
						}
                    });
                }
            });
        }
    };
}();
