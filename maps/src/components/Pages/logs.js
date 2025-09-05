import React, { useEffect, useState } from 'react';
import { HOST } from '../host';
import "./log.css";

const Logs = () => {
  const [logs, setLogs] = useState([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [logsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState({ key: 'timestamp', direction: 'desc' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch logs from API
  const fetchLogs = () => {
    setLoading(true);
    let url = `${HOST}/get_log?`;
    if (startDate) url += `start_date=${startDate}&`;
    if (endDate) url += `end_date=${endDate}`;

    fetch(url)
      .then(response => {
        if (!response.ok) {
          throw new Error('Failed to fetch logs');
        }
        return response.json();
      })
      .then(data => {
        setLogs(data.logs);
        setLoading(false);
      })
      .catch(error => {
        console.error('Error fetching logs:', error);
        setError('Failed to fetch logs. Please try again.');
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchLogs();
  }, [startDate, endDate]);

  const deleteLog = (id) => {
    fetch(`${HOST}/delete_log/${id}`, {
      method: 'DELETE',
      credentials:'include',
      headers: {
        'Content-Type': 'application/json',
      },
    })
      .then(response => {
        if (response.ok) {
          setLogs(logs.filter(log => log.id !== id));
        } else {
          throw new Error('Failed to delete log');
        }
      })
      .catch(error => {
        console.error('Error deleting log:', error);
        setError('Failed to delete log. Please try again.');
      });
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };
  const sortedLogs = [...logs].sort((a, b) => {
    if (a[sortConfig.key] < b[sortConfig.key]) {
      return sortConfig.direction === 'asc' ? -1 : 1;
    }
    if (a[sortConfig.key] > b[sortConfig.key]) {
      return sortConfig.direction === 'asc' ? 1 : -1;
    }
    return 0;
  });
  const filteredLogs = sortedLogs.filter(log => {
    return (
      log.level.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.message.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });
  const indexOfLastLog = currentPage * logsPerPage;
  const indexOfFirstLog = indexOfLastLog - logsPerPage;
  const currentLogs = filteredLogs.slice(indexOfFirstLog, indexOfLastLog);
  const totalPages = Math.ceil(filteredLogs.length / logsPerPage);

  const paginate = (pageNumber) => {
    if (pageNumber < 1 || pageNumber > totalPages) return;
    setCurrentPage(pageNumber);
  };

  return (

    <>
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          justifyContent: "flex-end",
          gap: "3px",
          margin: "-3% 1% 2% 0%",
          fontSize:'15px'
        }}
      >
        <div style={{flex:'10', display: "flex", flexDirection: "row", fontSize:'15px'}}>
        <label className="mt-2 text-dark">Start Date:</label>
        <input value={startDate} onChange={(e) => setStartDate(e.target.value)} type="date" className="m-2"/>

        <label className="mt-2 text-dark">End Date:</label>
        <input  value={endDate} onChange={(e) => setEndDate(e.target.value)}  type="date" className="m-2"/>

        <button onClick={fetchLogs} type='submit' className="m-2 btn add-btn">Filter</button>

        </div>
 
        <div className="input-group m-1 search-input"  style={{flex:'3'}}>
          <span className="input-group-text" id="basic-addon1">
            <i className="fa-solid fa-magnifying-glass"></i>
          </span>
          <input
            type="text"
            className="form-control"
            placeholder="Search Logs"
            aria-label="Username"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-describedby="basic-addon1"
          /> 
        </div>
      </div>

      <div className="all-tab-container">
        <div className="user-container">
          <div className="row">
          <div className="table-container col-12">
              <table className="table w-100">
                <thead className="tabs-header">
                  <tr className="tabs-header">
                    <th onClick={() => handleSort('level')} >Level {sortConfig.key === 'level' && (sortConfig.direction === 'asc' ? '▲' : '▼')}</th>
                    <th  onClick={() => handleSort('message')}>Message {sortConfig.key === 'message' && (sortConfig.direction === 'asc' ? '▲' : '▼')}</th>
                    <th onClick={() => handleSort('timestamp')}>Timestamp {sortConfig.key === 'timestamp' && (sortConfig.direction === 'asc' ? '▲' : '▼')}</th>
                    <th>Count</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody className='tbody'>
                 {currentLogs.map((log, index) => (
                  <tr key={log.id}>
                    {/* <td>{indexOfFirstLog + index + 1}</td> */}
                    <td>{log.level}</td>
                    <td>{log.message}</td>
                    <td>{new Date(log.timestamp).toLocaleString()}</td>
                    <td>{log.count}</td>
                    <td>
                      <button className="btn btn-danger" onClick={() => deleteLog(log.id)}>
                        <i className="fa fa-trash"> </i>
                      </button>
                    </td>
                  </tr>
                ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
      <div className="mt-3 pagination">
            <button onClick={() => paginate(currentPage - 1)} disabled={currentPage === 1}>&lt;</button>
            {currentPage > 3 && <button onClick={() => paginate(1)}>1</button>}
            {currentPage > 4 && <span>...</span>}
            {currentPage > 2 && <button onClick={() => paginate(currentPage - 2)}>{currentPage - 2}</button>}
            {currentPage > 1 && <button onClick={() => paginate(currentPage - 1)}>{currentPage - 1}</button>}
            <button className="current-page">{currentPage}</button>
            {currentPage < totalPages && <button onClick={() => paginate(currentPage + 1)}>{currentPage + 1}</button>}
            {currentPage < totalPages - 1 && <button onClick={() => paginate(currentPage + 2)}>{currentPage + 2}</button>}
            {currentPage < totalPages - 3 && <span>...</span>}
            {currentPage < totalPages - 2 && <button onClick={() => paginate(totalPages)}>{totalPages}</button>}
            <button onClick={() => paginate(currentPage + 1)} disabled={currentPage === totalPages}>&gt;</button>
          </div>
    </>
  );
};

export default Logs;