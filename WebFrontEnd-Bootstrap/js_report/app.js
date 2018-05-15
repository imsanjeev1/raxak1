(function () {
    var
            form = $('#report_container'),
            cache_width = form.width(),
            a4 = [595.28, 841.89];  // for a4 size paper width and height

    $('#generatepdf').on('click', function () {
        //$('body').scrollTop(0);
        $('#ajaxloader').show();
        createPDF();
    });
//create pdf
    function createPDF() {
        var date_format = String(new Date()).replace('GMT+0530 (IST)', '');
        var report_type = $.urlParam('report_type');
        getCanvas().then(function (canvas) {
            var doc = new jsPDF({unit: 'px', format: 'a4'});
            var imgData = canvas.toDataURL("image/png");
            form.width(cache_width);

            /*
             Here are the numbers (paper width and height) that I found to work. 
             It still creates a little overlap part between the pages, but good enough for me.
             if you can find an official number from jsPDF, use them.
             */
            var imgWidth = 210;
            var pageHeight = 295;
            var imgHeight = canvas.height * imgWidth / canvas.width;
            var heightLeft = imgHeight;
            var doc = new jsPDF('p', 'mm');
            var position = 0;
            doc.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;

            while (heightLeft >= 0) {
                position = heightLeft - imgHeight;
                doc.addPage();
                doc.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                heightLeft -= pageHeight;
            }
            doc.save(report_type + '_' + date_format + '.pdf');
        });
    }
// create canvas object
    function getCanvas() {
        form.width((a4[0] * 1.33333) - 80).css({
            'max-width': 'none',
            margin: 'auto'
        }); // manage the page margin.
        return html2canvas(form, {
            imageTimeout: 60000,
            //imageTimeout: 0,
            logging: true,
            "proxy": "",
            onrendered: function (canvas) {
                // document.body.appendChild(canvas);
            },
            removeContainer: true
        });
    }
}());