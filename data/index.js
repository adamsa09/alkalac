google.charts.load('current', { 'packages': ['gauge', 'corechart'] });
google.charts.setOnLoadCallback(drawCharts);

let allData = [];
let lineChart, lineData, lineOptions;
let currentPeriod = '1day';

function drawCharts() {
  [gaugeChart, gaugeData, gaugeOptions] = buildGaugeChart(7);
  gaugeChart.draw(gaugeData, gaugeOptions);

  fetch('ph_data.jsonl').then(response => response.text()).then(text => {
    const data = text.trim().split('\n').map(line => JSON.parse(line));
    allData = data;
    [lineChart, lineData, lineOptions] = buildLineChart(filterDataByPeriod(data, '1day'));
    lineChart.draw(lineData, lineOptions);
    buildDataTable(data);
    setupChartButtons();
  })

  fetch('dispense_data.jsonl').then(response => response.text()).then(text => {
    const data = text.trim().split('\n').map(line => JSON.parse(line));
    buildDispenseTable(data);
  })

  setupDownloadButton();
}

function buildGaugeChart(value) {
  var data = google.visualization.arrayToDataTable([
    ['Label', 'Value'],
    ['pH', value],
  ]);

  var options = {
    width: 300, height: 300,
    redFrom: 9, redTo: 14,
    yellowFrom: 0, yellowTo: 5,
    yellowColor: '#dc3912',
    greenFrom: 6, greenTo: 8,
    majorTicks: ['', '', '', '', '', '', '', ''],
    min: 0, max: 14
  };

  chart = new google.visualization.Gauge(document.getElementById('chart_div'))

  return [chart, data, options];
}

function buildLineChart(data) {
  var rows = data.map(item => [item.timestamp, item.pH]);
  var dataTable = google.visualization.arrayToDataTable([
    ['Time', 'pH'],
    ...rows
  ]);

  var options = {
    curveType: 'function',
    legend: { position: 'none' },
    hAxis: {
      textPosition: 'none',
      textStyle: { color: 'white', fontName: 'Inter', fontSize: 12, bold: false, italic: false },
      baselineColor: 'white',
      gridlines: {color: 'transparent'},
      minorGridlines: {color: 'transparent'}
    },
    vAxis: {
      baselineColor: 'white',
      title: 'pH',
      titleTextStyle: { color: 'white', fontName: 'Inter', fontSize: 18, bold: false, italic: false },
      textStyle: { color: 'white', fontName: 'Inter', fontSize: 12, bold: false, italic: false },
      ticks: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14],
      gridlines: {color: 'transparent'},
      minorGridlines: {color: 'transparent'}
    },
    backgroundColor: '#211657',
    explorer: {zoomDelta: 1.07, maxZoomIn: 0.1},
    chartArea: {width:'90%',height:'100%'},
    width: 1350,
    height: 500 
  };

  var chart = new google.visualization.LineChart(document.getElementById('line_chart'));

  return [chart, dataTable, options];
}

function buildDataTable(data) {
  const latest10 = data.slice(-10).reverse();
  const tableContainer = document.getElementById('data_table');
  
  const table = document.createElement('table');
  table.className = 'data-table';
  
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  const timestampHeader = document.createElement('th');
  timestampHeader.textContent = 'Timestamp';
  const phHeader = document.createElement('th');
  phHeader.textContent = 'pH';
  headerRow.appendChild(timestampHeader);
  headerRow.appendChild(phHeader);
  thead.appendChild(headerRow);
  table.appendChild(thead);
  
  const tbody = document.createElement('tbody');
  latest10.forEach(item => {
    const row = document.createElement('tr');
    const timeCell = document.createElement('td');
    const date = new Date(item.timestamp);
    timeCell.textContent = date.toLocaleTimeString();
    const phCell = document.createElement('td');
    phCell.textContent = item.pH.toFixed(2);
    row.appendChild(timeCell);
    row.appendChild(phCell);
    tbody.appendChild(row);
  });
  table.appendChild(tbody);
  
  tableContainer.appendChild(table);
}

function buildDispenseTable(data) {
  const latest10 = data.slice(-10).reverse();
  const tableContainer = document.getElementById('dispense_table');
  
  if (latest10.length === 0) return;
  
  const table = document.createElement('table');
  table.className = 'data-table';
  
  // Get all unique keys from the data to dynamically build headers
  const keys = Object.keys(latest10[0]);
  
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  keys.forEach(key => {
    const header = document.createElement('th');
    header.textContent = key.charAt(0).toUpperCase() + key.slice(1);
    headerRow.appendChild(header);
  });
  thead.appendChild(headerRow);
  table.appendChild(thead);
  
  const tbody = document.createElement('tbody');
  latest10.forEach(item => {
    const row = document.createElement('tr');
    keys.forEach(key => {
      const cell = document.createElement('td');
      let value = item[key];
      
      // Format timestamp as time only
      if (key === 'timestamp') {
        const date = new Date(value);
        value = date.toLocaleTimeString();
      } else if (typeof value === 'number') {
        value = value.toFixed(2);
      }
      
      cell.textContent = value;
      row.appendChild(cell);
    });
    tbody.appendChild(row);
  });
  table.appendChild(tbody);
  
  tableContainer.appendChild(table);
}


function filterDataByPeriod(data, period) {
  const now = new Date();
  let startDate = new Date();

  if (period === '1day') {
    startDate.setDate(now.getDate() - 1);
  } else if (period === '1week') {
    startDate.setDate(now.getDate() - 7);
  } else if (period === '1month') {
    startDate.setMonth(now.getMonth() - 1);
  } else if (period === '1year') {
    startDate.setFullYear(now.getFullYear() - 1);
  } else if (period === '5year') {
    startDate.setFullYear(now.getFullYear() - 5);
  } else if (period === 'max') {
    startDate = new Date(0);
  }

  return data.filter(item => new Date(item.timestamp) >= startDate);
}

function setupChartButtons() {
  const buttons = document.querySelectorAll('[class*="chart-btn"]');
  buttons.forEach(btn => {
    btn.addEventListener('click', function() {
      const period = this.getAttribute('data-period');
      currentPeriod = period;
      
      buttons.forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      
      const filteredData = filterDataByPeriod(allData, period);
      [lineChart, lineData, lineOptions] = buildLineChart(filteredData);
      lineChart.draw(lineData, lineOptions);
    });
  });
}

function setupDownloadButton() {
  const downloadBtn = document.getElementById('download-btn');
  downloadBtn.addEventListener('click', function() {
    fetch('ph_data.jsonl')
      .then(response => response.blob())
      .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'ph_data.jsonl';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      });
  });
}
