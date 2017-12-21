(function () {
    var DEFAULT_FORMAT = 'EEEE, dd MMMM yyyy';
    var timeZoneOffset = new Date().getTimezoneOffset();
    var $languageSelect = $('#language-select');
    var $localeFormatSelect = $('#date-time-format-select');
    var $chartTypeSelect = $('#chart-type-select');
    var chartContainer = $chartTypeSelect.val() + '-container';
    var localeCode;
    var localeFormat;
    var charts = {
        'anychart': null,
        'anystock': null,
        'anymap': null,
        'anygantt': null
    };

    var createChartInit;

    formats = {};

    $(document).ready(function () {
        $('#' + chartContainer).addClass('in active');
        getLocaleText();
    });

    $(window).on('load', function () {
        hidePreloader();
    });

    function getLocaleText() {
        $.ajax({
            url: 'https://cdn.anychart.com/releases/v8/index.json',
            success: function (res) {
                var locales = res.locales;

                var localeUrl = 'https://cdn.anychart.com/releases/v8/locales/';
                var locale;
                var localeArray = [];

                for (key in locales) {
                    if (locales.hasOwnProperty(key)) {
                        localeArray.push({
                            'code': key,
                            'eng-name': locales[key]['eng-name'],
                            'native-name': locales[key]['native-name']
                        });
                    }
                }

                localeArray.sort(function (a, b) {
                    return a['eng-name'].localeCompare(b['eng-name']);
                });

                for (var i = 0; i < localeArray.length; i++) {
                    $languageSelect.append(
                        '<option data-locale-src="' + localeUrl + localeArray[i]['code'] + '.js' +
                        '" value="' + localeArray[i]['code'] + '">' +
                        localeArray[i]['eng-name'] + ' - ' + localeArray[i]['native-name'] +
                        '</option>'
                    )
                }

                $languageSelect.selectpicker('refresh');

                $languageSelect.val('en-us').change();
            }
        });
    }

    $languageSelect.on('change', function () {
        var url = $(this).find('option:selected').data().localeSrc;
        var code = $(this).find('option:selected').val();

        localeCode = code;

        loadScript(url, changeLocale, code);
    });

    $chartTypeSelect.on('change', function () {
        $('.chart').removeClass('in active');
        $('#' + $(this).val() + '-container').addClass('in active');
        createChartInit = null;
        createChart();
        displayFullSource();
    });

    $localeFormatSelect.on('change', function () {
        localeFormat = $localeFormatSelect.val();
        changeDatePattern();
    });

    function getDateTimePattern() {
        var url = 'formats/' + localeCode + '.js';

        loadScript(url, changeDateTimeSelect, localeCode);
    }

    function changeDateTimeSelect(code) {
        $localeFormatSelect.empty();

        for (var i = 0; i < formats[code].length; i++) {
            $localeFormatSelect.append(
                '<option value="' + formats[code][i] + '">' +
                formats[code][i] +
                '</option>');
        }

        $localeFormatSelect.selectpicker('refresh');

        displayFormatArray(code);
    }

    function loadScript(url, callback, code) {
        var $body = $('body');
        var script = document.createElement('script');
        var el = 'script[src="' + url + '"]';

        script.src = url;

        if ($(el).length === 0) {
            $(script).attr('defer', 'defer');
            $body.find('script').last().after(script);
        }

        var result = script.onload = callback(code);

        var timer = setInterval(function () {
            if (result) {
                clearInterval(timer);
                displayLocaleJSON(url);
                getDateTimePattern();
                displayFullSource();
            }
        }, 50);
    }

    function displayLocaleJSON(url) {
        $.ajax({
            url: url,
            success: function (source) {
                var code = JSON.stringify(eval(source), null, '\t');
                var $lang = $('#locale-json').find('.language-json');

                $lang.text(code);
                Prism.highlightElement($lang[0]);
            }
        });
    }

    function displayFormatArray(code) {
        var $lang = $('#locale-array').find('.language-javascript');
        var text = 'var formats = {};\n' + 'formats' + '[\'' + code + '\'] = ';
        var formatsText = formats[code].map(function (value, index) {
            if (index == 0) {
                return '"' + value + '"'
            }
            return '\t\t\t\t\t"' + value + '"'
        });
        $lang.text(text + '[' + formatsText.join(',\n') + ']');
        Prism.highlightElement($lang[0]);
    }

    function displayFullSource() {
        var timer = setTimeout(function () {
            if (typeof createChartInit === 'function') {
                clearTimeout(timer);

                var additionalScripts = [''];
                $('[data-chart="' + $chartTypeSelect.val() + '"]').map(function (index, item) {
                    additionalScripts.push(item.outerHTML.replace(/ data-chart="[A-z]*"/, ''));
                });

                if (additionalScripts.length) {
                    additionalScripts = additionalScripts.join('\n\t');
                }

                var $lang = $('.language-markup');
                var format = localeFormat || DEFAULT_FORMAT;
                var codeFunc = createChartInit.toString()
                    .replace(/function create(.*)\)\s*\{/, '')
                    .replace(/charts\[\'any.*;\n*/, '')
                    .replace(/}$/, '')
                    .replace(/\(container\)/, "('container')")
                    .trim();
                var code = 'anychart.onDocumentReady(function () {' +
                    '\n\n\t\tvar format ="' + format + '";\n' +
                    '\t\tvar locale = "' + localeCode + '";\n\n' +
                    '\t\tanychart.format.outputLocale(\"' + localeCode + '\");\n' +
                    '\t\tanychart.format.outputDateTimeFormat(\"' + format + '\");\n\n\t\t' +
                    'var timeZoneOffset = new Date().getTimezoneOffset();\n\n\t\t' +
                    codeFunc + '\n\t\t});';
                var doc = '<!DOCTYPE html>\n<html lang="en">\n<head>' +
                    '\n\t<meta charset="utf-8" />' +
                    '\n\t<link rel="stylesheet" href="https://cdn.anychart.com/releases/v8/css/anychart-ui.min.css">' +
                    '\n\t<link rel="stylesheet" href="https://cdn.anychart.com/releases/v8/fonts/css/anychart-font.min.css">' +
                    '\n\t<script src="https://cdn.anychart.com/releases/v8/js/anychart-base.min.js"></script>' +
                    additionalScripts +
                    '\n\t<script src="https://cdn.anychart.com/releases/v8/js/anychart-exports.min.js"></script>' +
                    '\n\t<script src="https://cdn.anychart.com/releases/v8/js/anychart-ui.min.js"></script>' +
                    '\n\t<script src="' + 'https://cdn.anychart.com/releases/v8/locales/' + localeCode + '.js"></script>' +
                    '\n</head>\n<body>' +
                    '\n\t<div id="container" style="width: 850px; height: 600px; margin: 0 auto;"></div>' +
                    '\n\t<script>\n\t\t' + code +
                    '\n\t</script>\n</body>\n</html>';

                $lang.text(doc);
                Prism.highlightElement($lang[0]);
            }
        }, 50);
    }

    function disposeChart() {
        var chart = charts[$chartTypeSelect.val()];
        if (chart) {
            chart.dispose();
            chart = null;
        }
    }

    function changeLocale(code) {
        if (typeof code === 'string') {
            if (anychart.format.outputLocale() != code) {
                var timerId = setInterval(reDrawChart, 50);
            }
        }

        function reDrawChart() {
            if (window['anychart']['format']['locales'][code] !== undefined) {
                localeFormat = $localeFormatSelect.val() || DEFAULT_FORMAT;

                clearInterval(timerId);
                createChart();
            }
        }

        return true
    }

    function changeDatePattern() {
        createChart();
        displayFullSource();
    }

    function createChart() {
        disposeChart();

        // set a localization for output.
        anychart.format.outputLocale(localeCode);
        anychart.format.outputDateTimeFormat(localeFormat);

        switch ($chartTypeSelect.val()) {
            case 'anychart':
                chartContainer = 'anychart-container';
                createChartInit = createAnychart;
                break;
            case 'anystock':
                chartContainer = 'anystock-container';
                createChartInit = createAnystock;
                break;
            case 'anymap':
                chartContainer = 'anymap-container';
                createChartInit = createAnymap;
                break;
            case 'anygantt':
                chartContainer = 'anygantt-container';
                createChartInit = createAnygantt;
                break;
        }

        createChartInit(chartContainer, localeCode, localeFormat);
    }

    function hidePreloader() {
        $('#loader').fadeOut('slow');
    }

    /* Prism copy to clipbaord */
    $('pre.copytoclipboard').each(function () {
        $this = $(this);
        $button = $('<button></button>');
        $this.wrap('<div/>').removeClass('copytoclipboard');
        $wrapper = $this.parent();
        $wrapper.addClass('copytoclipboard-wrapper').css({position: 'relative'});
        $button.css({
            position: 'absolute',
            top: 10,
            right: 27,
            width: 55,
            height: 31
        }).appendTo($wrapper).addClass('copytoclipboard btn btn-default');

        var copyCode = new Clipboard('button.copytoclipboard', {
            target: function (trigger) {
                return trigger.previousElementSibling;
            }
        });
        copyCode.on('success', function (event) {
            event.clearSelection();
            $(event.trigger).addClass('copied');
            window.setTimeout(function () {
                $(event.trigger).removeClass('copied');
            }, 2000);
        });
        copyCode.on('error', function (event) {
            event.trigger.textContent = 'Press "Ctrl + C" to copy';
            window.setTimeout(function () {
                event.trigger.textContent = 'Copy';
            }, 2000);
        });
    });

    function createAnychart(container, locale, format) {
        var data = [
            ['2015-01', 22, 43, 75],
            ['2015-02', 34, 45, 56],
            ['2015-03', 16, 26, 67],
            ['2015-04', 12, 86, 42],
            ['2015-05', 41, 35, 17],
            ['2015-06', 47, 31, 12],
            ['2015-07', 39, 27, 9],
            ['2015-08', 28, 16, 23],
            ['2015-09', 21, 27, 47],
            ['2015-10', 18, 31, 58],
            ['2015-11', 24, 42, 69],
            ['2015-12', 29, 39, 71]
        ];

        var title = 'ACME corp. Problems During the Year\n' + 'From: ' +
            anychart.format.dateTime(data[0][0], format, timeZoneOffset, locale) +
            '\nTo: ' + anychart.format.dateTime(data[data.length - 1][0], format, timeZoneOffset, locale);

        // create data set on our data, also we can put data directly to series
        var dataSet = anychart.data.set(data);

        // map data for the first series,take value from first column of data set
        var seriesData_1 = dataSet.mapAs({'x': 0, 'value': 1});

        // map data for the second series,take value from second column of data set
        var seriesData_2 = dataSet.mapAs({'x': 0, 'value': 2});

        // map data for the third series, take x from the zero column and value from the third column of data set
        var seriesData_3 = dataSet.mapAs({'x': 0, 'value': 3});

        // create line chart
        var chart = anychart.line();
        // turn on the crosshair and tune it
        chart.crosshair()
            .enabled(true)
            .yLabel(false)
            .xLabel(false)
            .yStroke(null);

        // set chart title text settings
        chart.title(title);
        // set chart padding
        chart.padding().top(10);
        // set yAxis title
        chart.yAxis().title('Occurences per month');

        /** Helper Function to setup series
         *  @param series - stroke color
         *  @param name - stroke series name
         */
        var seriesConfiguration = function (series, name) {
            series.name(name);
            series.hovered().markers()
                .enabled(true)
                .size(4);
        };

        // temp variable to store series instance
        var series;

        // setup first series
        series = chart.line(seriesData_1);
        series.stroke('#7CC0F7');
        seriesConfiguration(series, 'Purchase Returns');

        // setup second series
        series = chart.line(seriesData_2);
        series.stroke('#3C8AD8');
        seriesConfiguration(series, 'Delivery Failure');

        // setup third series
        series = chart.line(seriesData_3);
        series.stroke('#F18126');
        seriesConfiguration(series, 'Order Cancellation');

        // turn the legend on
        chart.legend().enabled(true).padding([0, 0, 10, 0]);

        chart.xAxis().labels().format(function () {
            return anychart.format.dateTime(this.value, 'MMM', timeZoneOffset, locale);
        });
        chart.tooltip().titleFormat(function () {
            return anychart.format.dateTime(this.points[0].x, format, timeZoneOffset, locale);
        });

        chart.tooltip().displayMode('union');

        // set container id for the chart
        chart.container(container);
        // initiate chart drawing
        chart.draw();
        charts['anychart'] = chart;
    }

    function createAnystock(container, locale, format) {
        var data = get_dollar_to_euro_rate();
        // create data table on loaded data
        var dataTable = anychart.data.table();
        dataTable.addData(data);

        var _title = 'USD/EUR, ' + anychart.format.dateTime(data[0][0], format, timeZoneOffset, locale) +
            ' - ' + anychart.format.dateTime(data[data.length - 1][0], format, timeZoneOffset, locale);

        // map loaded data
        var mapping = dataTable.mapAs({'value': 1});

        // create stock chart
        var chart = anychart.stock();
        charts['anystock'] = chart;

        // set chart title text settings
        chart.title(_title).title().padding([0, 0, 20, 0]);
        chart.padding([10, 5, 0, 50]);

        // create value plot on the chart
        var plot = chart.plot(0);
        var series = plot.splineArea(mapping);
        series.name('USD/EUR')
            .stroke('2 #1a9af9')
            .fill(['#1a9af9', '#FFFFFF'], -90, true, 0.25);
        series.legendItem()
            .iconType('area')
            .iconFill('#1a9af9');
        plot.xGrid(true)
            .yGrid(true);
        plot.xMinorGrid(true)
            .yMinorGrid(true);

        // create scroller series with mapped data
        chart.scroller().line(mapping);

        // set container id for the chart
        chart.container(container);

        // initiate chart drawing
        chart.draw();

        charts['anystock'] = chart;
    }

    function createAnygantt(container, locale, format) {
        // The data used in this sample can be obtained from the CDN
        // https://cdn.anychart.com/samples-data/gantt-charts/server-status-list/data.json
        anychart.data.loadJsonFile('https://cdn.anychart.com/samples-data/gantt-charts/server-status-list/data.json', function (data) {
            // create data tree on our data
            var treeData = anychart.data.tree(data, 'as-table');

            // create project gantt chart
            var chart = anychart.ganttResource();

            chart.padding().top(10);

            // set data for the chart
            chart.data(treeData);

            // set start splitter position settings
            chart.splitterPosition(320);

            // get chart data grid link to set column settings
            var dataGrid = chart.dataGrid();

            dataGrid.column(0).enabled(false);

            dataGrid.tooltip()
                .allowLeaveChart(true)
                .allowLeaveStage(false);

            // set first column settings
            var firstColumn = dataGrid.column(1);
            firstColumn.cellTextSettings().hAlign('left');
            firstColumn.title('Server')
                .width(140)
                .cellTextSettingsOverrider(labelTextSettingsOverrider)
                .format(function (item) {
                    return item.get('name');
                });

            // set first column settings
            var secondColumn = dataGrid.column(2);
            secondColumn.cellTextSettings().hAlign('right');
            secondColumn.title('Online')
                .width(60)
                .cellTextSettingsOverrider(labelTextSettingsOverrider)
                .format(function (item) {
                    return item.get('online') || '';
                });

            // set first column settings
            var thirdColumn = dataGrid.column(3);
            thirdColumn.cellTextSettings().hAlign('right');
            thirdColumn.title('Maintenance')
                .width(60)
                .cellTextSettingsOverrider(labelTextSettingsOverrider)
                .format(function (item) {
                    return item.get('maintenance') || '';
                });

            // set first column settings
            var fourthColumn = dataGrid.column(4);
            fourthColumn.cellTextSettings().hAlign('right');
            fourthColumn.title('Offline')
                .width(60)
                .cellTextSettingsOverrider(labelTextSettingsOverrider)
                .format(function (item) {
                    return item.get('offline') || '';
                });

            // set container id for the chart
            chart.container(container);

            chart.draw();

            chart.zoomTo(Date.UTC(2008, 0, 31, 1, 36), Date.UTC(2008, 1, 15, 10, 3));
            charts['anygantt'] = chart;
        });

        function labelTextSettingsOverrider(label, item) {
            switch (item.get('type')) {
                case 'online':
                    label.fontColor('green').fontWeight('bold');
                    break;
                case 'offline':
                    label.fontColor('red').fontWeight('bold');
                    break;
                case 'maintenance':
                    label.fontColor('orange').fontWeight('bold');
                    break;
            }
        }
    }

    function createAnymap(container, locale, format) {
        var data = [
            {id: 'AF', name: 'Afghanistan', size: 7.5, date: '26 October 2015', description: 'Hindu Kush earthquake'},
            {id: 'DZ', name: 'Algeria', size: 7.7, date: '10 October 1980', description: 'El Asnam earthquake'},
            {id: 'AR', name: 'Argentina', size: 8.0, date: '27 October 1894', description: 'San Juan earthquake'},
            {id: 'AU', name: 'Australia', size: 7.2, date: '29 April 1941', description: ''},
            {id: 'BD', name: 'Bangladesh', size: 8.8, date: '2 April 1762', description: 'Arakan earthquake'},
            {id: 'BE', name: 'Belgium', size: 6.3, date: '18 September 1692', description: ''},
            {id: 'BO', name: 'Bolivia', size: 8.5, date: '9 May 1877', description: 'Iquique earthquake'},
            {id: 'BR', name: 'Brazil', size: 6.2, date: '31 January 1955', description: ''},
            {id: 'BG', name: 'Bulgaria', size: 7.8, date: '4 April 1904', description: ''},
            {id: 'CA', name: 'Canada', size: 8.9, date: '26 January 1700', description: 'Cascadia earthquake'},
            {id: 'CN', name: 'China', size: 8.6, date: '15 August 1950', description: 'Assam–Tibet earthquake'},
            {id: 'CL', name: 'Chile', size: 9.5, date: '22 May 1960', description: 'Valdivia earthquake'},
            {id: 'CO', name: 'Colombia', size: 8.8, date: '31 January 1906', description: 'Ecuador–Colombia earthquake'},
            {id: 'CU', name: 'Cuba', size: 6.8, date: '11 June 1766', description: ''},
            {id: 'DK', name: 'Denmark', size: 4.3, date: '16 December 2008', description: ''},
            {id: 'DO', name: 'Dominican Republic', size: 8.1, date: '4 August 1946', description: 'Dominican Republic earthquake'},
            {id: 'EC', name: 'Ecuador', size: 8.8, date: '31 January 1906', description: 'Ecuador–Colombia earthquake'},
            {id: 'EG', name: 'Egypt', size: 7.3, date: '22 November 1995', description: 'Gulf of Aqaba earthquake'},
            {id: 'EE', name: 'Estonia', size: 4.5, date: '25 October 1976', description: ''},
            {id: 'FI', name: 'Finland', size: 3.5, date: '21 February 1989', description: ''},
            {id: 'FR', name: 'France', size: 6.2, date: '11 June 1909', description: 'Provence earthquake'},
            {id: 'DE', name: 'Germany', size: 6.1, date: '18 February 1756', description: ''},
            {id: 'GR', name: 'Greece', size: 8.5, date: '21 July 365', description: 'Crete earthquake'},
            {id: 'GT', name: 'Guatemala', size: 7.7, date: '6 August 1942', description: 'Guatemala earthquake'},
            {id: 'HT', name: 'Haiti', size: 8.1, date: '7 May 1842', description: 'Cap-Haitien earthquake'},
            {id: 'IS', name: 'Iceland', size: 6.6, date: '17 June 2000', description: 'Iceland earthquakes'},
            {id: 'IN', name: 'India', size: 8.6, date: '15 August 1950', description: 'Assam–Tibet earthquake'},
            {id: 'ID', name: 'Indonesia', size: 9.2, date: '26 December 2004', description: 'Boxing Day earthquake'},
            {id: 'IR', name: 'Iran', size: 7.9, date: '22 December 856', description: 'Damghan earthquake'},
            {id: 'IT', name: 'Italy', size: 7.4, date: '11 January 1693', description: 'Sicily earthquake'},
            {id: 'JP', name: 'Japan', size: 9.0, date: '11 March 2011', description: 'Tōhoku earthquake'},
            {id: 'LB', name: 'Lebanon', size: 7.5, date: '9 July 551', description: 'Beirut earthquake'},
            {id: 'MY', name: 'Malaysia', size: 6.0, date: '5 June 2015', description: 'Sabah earthquake'},
            {id: 'MX', name: 'Mexico', size: 8.6, date: '28 March 1787', description: 'Mexico earthquake'},
            {id: 'MN', name: 'Mongolia', size: 8.4, date: '23 July 1905', description: 'Bolnai earthquake'},
            {id: 'ME', name: 'Montenegro', size: 7, date: '15 April 1979', description: 'Montenegro earthquake'},
            {id: 'NP', name: 'Nepal', size: 8, date: '15 January 1934	', description: 'Nepal–Bihar earthquake'},
            {id: 'NL', name: 'Netherlands', size: 5.3, date: '13 April 1992', description: 'Roermond earthquake'},
            {id: 'NZ', name: 'New Zealand', size: 8.3, date: '23 January 1855', description: 'Wairarapa earthquake'},
            {id: 'NI', name: 'Nicaragua', size: 7.7, date: '2 September 1992', description: 'Nicaragua earthquake'},
            {id: 'KP', name: 'North Korea', size: 6.5, date: '19 March 1952', description: ''},
            {id: 'NO', name: 'Norway', size: 6.2, date: '19 February 2004', description: 'Svalbard earthquake'},
            {id: 'PK', name: 'Pakistan', size: 8.1, date: '28 November 1945', description: 'Balochistan earthquake'},
            {id: 'PE', name: 'Peru', size: 8.6, date: '28 October 1746', description: 'Lima–Callao earthquake'},
            {id: 'PH', name: 'Philippines', size: 8.3, date: '15 August 1918', description: 'Celebes Sea earthquake'},
            {id: 'PL', name: 'Poland', size: 5.4, date: '31 December 1999', description: ''},
            {id: 'PT', name: 'Portugal', size: 8.7, date: '1 November 1755', description: '1755 Lisbon earthquake'},
            {id: 'RO', name: 'Romania', size: 7.9, date: '26 October 1802', description: 'Vrancea earthquake'},
            {id: 'RU', name: 'Russia', size: 9.0, date: '4 November 1952', description: 'Kamchatka earthquake'},
            {id: 'WS', name: 'Samoa', size: 8.5, date: '26 June 1917', description: 'Samoa earthquake'},
            {id: 'ZA', name: 'South Africa', size: 6.3, date: '29 September 1969', description: ''},
            {id: 'ES', name: 'Spain', size: 7.0, date: '21 March 1954', description: ''},
            {id: 'SE', name: 'Sweden', size: 4.7, date: '15 September 2014', description: ''},
            {id: 'CH', name: 'Switzerland', size: 6.5, date: '18 October 1356', description: 'Basel earthquake'},
            {id: 'TW', name: 'Taiwan', size: 7.6, date: '21 September 1999', description: '921 earthquake'},
            {id: 'TH', name: 'Thailand', size: 6.3, date: '5 May 2014', description: 'Mae Lao earthquake'},
            {id: 'TR', name: 'Turkey', size: 7.8, date: '27 December 1939', description: 'Erzincan earthquake'},
            {id: 'GB', name: 'United Kingdom', size: 6.1, date: '7 June 1931', description: 'Dogger Bank earthquake'},
            {id: 'US', name: 'United States', size: 9.2, date: '27 March 1964', description: 'Alaska earthquake'},
            {id: 'VE', name: 'Venezuela', size: 7.5, date: '26 March 1812', description: 'Caracas earthquake'},
            {id: 'VN', name: 'Vietnam', size: 6.8, date: '24 June 1983', description: 'Tuan Giao earthquake'}
        ];

        data.sort(function (a, b) {
            return new Date(a['date']).getTime() - new Date(b['date']).getTime();
        });

        // creates data set
        var dataSet = anychart.data.set(data);

        var title = 'Strongest Earthquakes by Country\n' + 'From: ' +
            anychart.format.dateTime(data[0].date, format, timeZoneOffset, locale) +
            '\nTo: ' + anychart.format.dateTime(data[data.length - 1].date, format, timeZoneOffset, locale);

        // creates Map Chart
        var chart = anychart.map();
        // sets geodata using https://cdn.anychart.com/releases/v8/geodata/custom/world/world.js
        chart.geoData(anychart.maps.world);

        chart.padding().top(10);

        chart.credits()
            .enabled(true)
            .url('//en.wikipedia.org/wiki/Lists_of_earthquakes')
            .text('Data source: http://en.wikipedia.org/wiki/Lists_of_earthquakes')
            .logoSrc('//en.wikipedia.org/static/favicon/wikipedia.ico');

        // sets Chart Title
        chart.title()
            .enabled(true)
            .text(title);

        chart.interactivity().selectionMode(false);

        // sets bubble max size settings
        chart.minBubbleSize(3);
        chart.maxBubbleSize(15);

        // creates bubble series
        var series = chart.bubble(dataSet);
        // sets series geo id field settings
        series.geoIdField('iso_a2');
        // sets series settings
        series.labels(false);
        series.fill('#ff8f00 0.6')
            .stroke('1 #ff6f00 0.9');
        series.hovered()
            .fill('#78909c')
            .stroke('1 #546e7a 1');

        // sets tooltip
        var tooltipSettings = {
            background: {fill: 'white', stroke: '#c1c1c1', corners: 3, cornerType: 'ROUND'},
            padding: [8, 13, 10, 13]
        };
        series.tooltip(tooltipSettings);
        series.tooltip().useHtml(true);
        series.tooltip().title().fontColor('#7c868e');

        series.tooltip().format(function () {
            var span_for_value = '<span style="color: #545f69; font-size: 12px; font-weight: bold">';
            var span_for_date = '<br/><span style="color: #7c868e; font-size: 11px">';
            var span_for_description = '<br/><span style="color: #7c868e; font-size: 12px; font-style: italic">"';
            if (this.getData('description') != '')
                return span_for_value + this.size + 'M </span></strong>'
                    + span_for_description + this.getData('description') + '"</span>'
                    + span_for_date + anychart.format.dateTime(this.getData('date'), format, timeZoneOffset, locale) + '</span>';
            else
                return span_for_value + this.size + 'M </span></strong>'
                    + span_for_date + anychart.format.dateTime(this.getData('date'), format, timeZoneOffset, locale) + '</span>';
        });

        // set container id for the chart
        chart.container(container);

        // initiate chart drawing
        chart.draw();
        charts['anymap'] = chart;
    }
})();
