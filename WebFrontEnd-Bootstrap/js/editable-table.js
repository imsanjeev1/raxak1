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
                //jqTds[5].innerHTML = '<a><i class="fa fa-fw fa-info"></i></a>';
                //jqTds[6].innerHTML = '<input type="checkbox" name="checkbox" id="chkbx_' + aData[2] + '" value="' + aData[2] + '">';
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
                oTable.fnUpdate('<a><i class="fa fa-fw fa-info"></i></a>', nRow, 5, false);
                oTable.fnUpdate('<input type="checkbox" name="checkbox" id="chkbx_' + jqInputs[1].value + '" value="' + jqInputs[1].value + '">', nRow, 6, false);

                oTable.fnUpdate('<a class="delete" href=""><i class="fa fa-fw fa-trash-o"></i></a>', nRow, 7, false);
                oTable.fnDraw();
            }

            function cancelEditRow(oTable, nRow) {
                var jqInputs = $('input', nRow);
                oTable.fnUpdate(jqInputs[0].value, nRow, 0, false);
                oTable.fnUpdate(jqInputs[1].value, nRow, 1, false);
                oTable.fnUpdate(jqInputs[2].value, nRow, 2, false);
                oTable.fnUpdate(jqInputs[3].value, nRow, 3, false);
                oTable.fnUpdate(jqInputs[4].value, nRow, 4, false);
                oTable.fnUpdate(jqInputs[7].value, nRow, 7, false);
                oTable.fnDraw();
            }

            var oTable = $('#editable-sample').dataTable({
                "order": [[3, "asc"]],
                /*
                 "aLengthMenu": [
                 [10, 20, 30, -1],
                 [10, 20, 30, "All"] // change per page values here
                 ],*/
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
                        'aTargets': [0, 6, 7, 8, 9]
                    }
                ]
            });

            oTable.fnSetColumnVis(1, false);
            oTable.fnSetColumnVis(2, false);
            oTable.fnSetColumnVis(4, false);
            oTable.fnSetColumnVis(5, false);
            oTable.fnSetColumnVis(6, false);

            //--- manage select or deselect checkboxes when change the pagination and sorting.

            $(oTable).on('order.dt', function () {
                eventFired('Order');
            }).on('page.dt', function () {
                eventFired('Page');
            });

            var eventFired = function (type) {
                var table = $('#editable-sample').DataTable();
                var info = table.page.info();
                var allPages = table.cells().nodes(); // get all nods checkbox
                $('#checkboxAll').prop('checked', false);
                $(allPages).find('input[type="checkbox"]').prop('checked', false);
                if (type === "Order" || type === "order")
                    $(allPages).find('.singleaccess, .edit_tm_info, .delete').parent().attr('align', 'center');  //align center to the columns when add new machine
            };

            var nEditing = null;

            $('#editable-sample_new').click(function (e) {
                e.preventDefault();
                var aiNew = oTable.fnAddData(['', '', '', '',
                    '<a class="edit" href=""><i class="fa fa-fw fa-pencil"></i></a>', '<a class="cancel" data-mode="new" href="">Cancel</a>'
                ]);
                var nRow = oTable.fnGetNodes(aiNew[0]);
                editRow(oTable, nRow);
                nEditing = nRow;
            });

            $('#editable-sample a.delete').live('click', function (e) {
                var oTable = $('#editable-sample').dataTable();
                //e.preventDefault();
                var nRow = $(this).parents('tr')[0];
                var rowData = oTable.fnGetData(nRow); // getting row data from datatable object
                var nRowID = $(this).parents('tr').attr('id');
                if ($(this).parents('tr').children('td').find('.delete').attr("disabled") == "disabled") {
                    e.preventDefault();
                } else {
                    swal({
                        html: "Are you sure you want to delete <b><i>" + rowData[3] + "</i></b>?",
                        type: 'warning',
                        showCancelButton: true,
                        confirmButtonColor: '#3085d6',
                        cancelButtonColor: '#d33',
                        confirmButtonText: 'Yes, delete it!',
                        closeOnConfirm: true
                    },
                    function (isConfirm) {
                        if (isConfirm) {
                            deleteTM(rowData);
                            oTable.fnDeleteRow(nRow);
                        }
                    });
                }
            });

            $('#editable-sample a.cancel').live('click', function (e) {
                e.preventDefault();
                if ($(this).attr("data-mode") == "new") {
                    var nRow = $(this).parents('tr')[0];
                    oTable.fnDeleteRow(nRow);
                } else {
                    restoreRow(oTable, nEditing);
                    nEditing = null;
                }
            });

            $('#editable-sample a.singleaccess').live('click', function (e) {
                e.preventDefault();

                var nRow = $(this).parents('tr')[0];
                var nRowID = $(this).parents('tr').attr('id');
                reCheckAccess(nRowID, 'single', this);
            });

            $('#editable-sample a.edit').live('click', function (e) {
                e.preventDefault();

                /* Get the row as a parent of the link that was clicked on */
                var nRow = $(this).parents('tr')[0];
                var nRowID = $(this).parents('tr').attr('id');

                if (nEditing !== null && nEditing != nRow) {
                    /* Currently editing - but not this row - restore the old before continuing to edit mode */
                    restoreRow(oTable, nEditing);
                    editRow(oTable, nRow);
                    nEditing = nRow;
                } else if (nEditing == nRow && this.innerHTML == '<i class="fa fa-fw fa-save"></i>') {
                    /* Editing this row and want to save it */
                    saveRow(oTable, nEditing);
                    var aData = oTable.fnGetData(nEditing);
                    modifyTM({e_username: aData[1], e_tmIP: aData[2], e_nickname: aData[3]});
                    nEditing = null;
                } else {
                    /* No edit in progress - let's start one */
                    editRow(oTable, nRow);
                    nEditing = nRow;
                }
            });
        }

    };

}();
