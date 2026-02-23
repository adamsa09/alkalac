google.charts.load('current', { 'packages': ['gauge', 'corechart'] });
google.charts.setOnLoadCallback(drawTable);

function drawTable() {
  fetch('ph_data.jsonl').then(response => response.text()).then(text => {
    const data = text.trim().split('\n').map(line => JSON.parse(line));
    buildDataTable(data);
  })
}

function buildDataTable(data) {
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
  data.slice().reverse().forEach(item => {
    const row = document.createElement('tr');
    const timeCell = document.createElement('td');
    const date = new Date(item.timestamp);
    timeCell.textContent = date.toLocaleString();
    const phCell = document.createElement('td');
    phCell.textContent = item.pH.toFixed(2);
    row.appendChild(timeCell);
    row.appendChild(phCell);
    tbody.appendChild(row);
  });
  table.appendChild(tbody);

  tableContainer.appendChild(table);
}
