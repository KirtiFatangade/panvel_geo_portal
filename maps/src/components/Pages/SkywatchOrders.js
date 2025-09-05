import React, { useEffect, useState, useContext } from "react";
import { HOST, HOST_HIGH_RES_DATA_PROVIDERS_URL } from "../host";
import "./log.css";
import { GlobalContext } from "../../App";

const SKYORDERS = () => {
  const { userInfo } = useContext(GlobalContext);
  const [logs, setLogs] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [logsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState({
    key: "timestamp",
    direction: "desc",
  });
  const [loader, setloader] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${HOST_HIGH_RES_DATA_PROVIDERS_URL}/get-orders-skywatch/${userInfo.id}`
      );
      if (!response.ok) throw new Error("Failed to fetch Orders");
      const data = await response.json();
      setLogs(data.orders || []);
    } catch (err) {
      console.error("Error fetching logs:", err);
      setError("Failed to fetch logs. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const fetchAndDownloadAsset = async (orderId) => {
    try {
      setloader(true);
      const response = await fetch(
        `${HOST_HIGH_RES_DATA_PROVIDERS_URL}/fetch-order-assets-skywatch/${orderId}`
      );
      if (!response.ok) throw new Error("Failed to fetch assets.");
      const data = await response.json();

      const link = document.createElement("a");
      link.href = data["assets"];
      // link.download = asset.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error("Error downloading asset:", err);
      alert("Failed to download asset. Please try again.");
      setloader(false);
    }
    setloader(false);
  };

  const ToCloud = async (orderId) => {
    // Ask for confirmation before proceeding

    try {
      setloader(true);
      const response = await fetch(
        `${HOST_HIGH_RES_DATA_PROVIDERS_URL}/cloud-order-assets-skywatch/${userInfo.id}/${orderId}`
      );

      if (!response.ok) {
        alert("Error Moving Data to Cloud.Please try again Later");
        setloader(false);
        return;
      }
      alert(
        "Moving process started. The data will be available on the cloud soon"
      );
      setloader(false);
    } catch (error) {
      console.error("Error placing order:", error);
      alert("Error Moving Data to Cloud.Please try again Later");
      setloader(false);
    } finally {
      setloader(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleSort = (key) => {
    const direction =
      sortConfig.key === key && sortConfig.direction === "asc" ? "desc" : "asc";
    setSortConfig({ key, direction });
  };

  const sortedLogs = [...logs].sort((a, b) => {
    const valueA = a[sortConfig.key];
    const valueB = b[sortConfig.key];
    if (valueA < valueB) return sortConfig.direction === "asc" ? -1 : 1;
    if (valueA > valueB) return sortConfig.direction === "asc" ? 1 : -1;
    return 0;
  });

  const indexOfLastLog = currentPage * logsPerPage;
  const indexOfFirstLog = indexOfLastLog - logsPerPage;
  const currentLogs = sortedLogs.slice(indexOfFirstLog, indexOfLastLog);
  const totalPages = Math.ceil(logs.length / logsPerPage);

  const paginate = (pageNumber) => {
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <>
      <div style={{ flex: 1, display: "flex", justifyContent: "flex-end" }}>
        {loader && (
          <div
            style={{
              opacity: "1",
              position: "relative",
              margin: "-3% 3% 5% 0",
            }}
          >
            <div className="lds-dual-ring">
              <i className="fa-solid fa-globe"></i>
            </div>
          </div>
        )}
      </div>
      <div className="all-tab-container">
        <div className="user-container">
          <div className="row">
            <div className="col-12">
              <table className="table w-100">
                <thead className="thead-light">
                  <tr>
                    <th>Order ID</th>
                    <th>Status</th>
                    <th onClick={() => handleSort("timestamp")}>
                      Timestamp{" "}
                      {sortConfig.key === "timestamp" &&
                        (sortConfig.direction === "asc" ? "▲" : "▼")}
                    </th>
                  </tr>
                </thead>
                {logs.length ? (
                  <tbody className="tbody">
                    {currentLogs.map((log, index) => (
                      <tr key={log.id}>
                        <td>{log.id}</td>
                        <td>{log.status}</td>
                        <td>
                          {new Date(
                            log.time.replace("T", " ").replace("Z", "")
                          ).toLocaleString("en-US", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                            hour12: true,
                          })}
                        </td>
                        <td>
                          {log.status === "complete" && (
                            <button
                              onClick={() => fetchAndDownloadAsset(log.id)}
                            >
                              <i class="fa-solid fa-download"> </i>
                              {/* Download */}
                            </button>
                          )}
                        </td>
                        <td>
                          {log.status === "complete" && (
                            <button onClick={() => ToCloud(log.id)}>
                              <i class="fa-solid fa-cloud"> </i>
                              {/* to cloud */}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                ) : (
                  <tbody className="tbody">
                    <tr>
                      <td>No Data Available</td>
                    </tr>
                  </tbody>
                )}
              </table>
            </div>
          </div>
        </div>
      </div>

      <div className="pagination">
        <button
          onClick={() => paginate(currentPage - 1)}
          disabled={currentPage === 1}
        >
          &lt;
        </button>
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
          <button
            key={page}
            onClick={() => paginate(page)}
            className={page === currentPage ? "current-page" : ""}
          >
            {page}
          </button>
        ))}
        <button
          onClick={() => paginate(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          &gt;
        </button>
      </div>
    </>
  );
};

export default SKYORDERS;
