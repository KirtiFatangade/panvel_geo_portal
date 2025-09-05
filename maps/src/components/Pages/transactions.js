import React, { useState, useEffect, useContext } from "react";
import { HOST, PHONEPE_URL } from "../host";
import { ToastContainer, toast } from "react-toastify";
import html2pdf from "html2pdf.js";
import Modal from "react-modal";
import { GlobalContext } from "../../App";
import { logToServer } from "../logger";
import files from "../static";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

export default function TransTable() {
  const [transactions, setTransactions] = useState([]);
  const [credits, setCredits] = useState([]);
  const { userInfo, getCsrfToken } = useContext(GlobalContext);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [totalPages, setTotalPages] = useState(1);
  const [activeTab, setActiveTab] = useState("Payments"); // Default tab is Payments
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const dict = {
    0: "Pending",
    1: "Success",
    2: "Failed",
  };
  const debitDict = {
    0: "Admin",
    1: "Self",
  };
  const typeDict = {
    0: "Credit",
    1: "Debit",
  };

  useEffect(() => {
    if (activeTab === "Payments") {
      fetchTransactions(userInfo.id);
    } else {
      fetchCreditTransactions(userInfo.id);
    }
  }, [activeTab, userInfo.id]);

  useEffect(() => {
    if (activeTab === "Payments") {
      setTotalPages(Math.ceil(transactions.length / itemsPerPage));
    } else {
      setTotalPages(Math.ceil(credits.length / itemsPerPage));
    }
  }, [transactions, credits]);

  const fetchTransactions = () => {
    fetch(`${PHONEPE_URL}/get-transaction/${userInfo.id}`, {
      credentials: "include",
    })
      .then((response) => response.json())
      .then((data) => {
        console.log(data);
        setTransactions(data.data);
      })
      .catch((error) => {
        console.error("Error fetching transactions:", error);
        logToServer("error", "Error fetching transactions");
      });
  };

  const fetchCreditTransactions = () => {
    fetch(`${HOST}/get-credit-transaction/${userInfo.id}`, {
      credentials: "include",
    })
      .then((response) => response.json())
      .then((data) => {
        console.log(data);
        setCredits(data.data);
      })
      .catch((error) => {
        console.error("Error fetching credit transactions:", error);
        logToServer("error", "Error fetching credit transactions");
      });
  };

  const paginate = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  const currentItems =
    activeTab === "Payments"
      ? transactions.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
      )
      : credits.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
      );

  const generateSummaryPDF = () => {
    // Filter credits based on the selected date range
    if (!startDate || !endDate) {
      alert("Please select Date Range");
      return;
    }

    const filteredCredits = credits.filter((credit) => {
      const transactionDate = new Date(credit.created);
      return (
        transactionDate >= startDate &&
        transactionDate <= endDate &&
        credit.feature // Ensure that the credit has a feature
      );
    });

    // Calculate total amount of filtered credits
    const totalAmount = filteredCredits.reduce(
      (sum, credit) => sum + credit.amount,
      0
    );
    const username =
      userInfo.is_superuser || userInfo.is_admin
        ? filteredCredits[0].memb_name
        : userInfo.username;
    const email =
      userInfo.is_superuser || userInfo.is_admin
        ? filteredCredits[0].email
        : userInfo.email_address;
    const org =
      userInfo.is_superuser || userInfo.is_admin
        ? filteredCredits[0].org
        : "N/A";

    // Create PDF content
    const invoiceHTML = `
      <html>
        <head>
          <title>Summary</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: Arial, sans-serif;
              font-size: 14px;
              line-height: 1.6;
              background-color: #f7f7f7;
              padding: 20px;
            }
            .invoice-container {
              max-width: 800px;
              background-color: white;
              margin: auto;
              padding: 30px;
              box-shadow: 0px 0px 15px rgba(0, 0, 0, 0.1);
              border-radius: 8px;
            }
            header {
              margin-bottom: 20px;
            }
            h2 {
              text-align: center;
              color: #333;
              margin-bottom: 20px;
              font-size: 24px;
            }
            .billing-info {
              display: flex;
              justify-content: space-between;
              margin: 20px 0;
            }
            .issued-to, .pay-to {
              width: 48%;
            }
            .billing-info p {
              margin-bottom: 5px;
              font-weight: bold;
            }
            .invoice-items {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
            }
            .invoice-items th, .invoice-items td {
              padding: 12px;
              text-align: center; /* Center align both header and cell content */
              border-bottom: 1px solid #ddd;
            }
            .invoice-items th {
              background-color: #f2f2f2;
              font-weight: bold;
              text-transform: uppercase;
              color: #333;
            }
            .invoice-items tr:nth-child(even) {
              background-color: #f9f9f9;
            }
            .invoice-items tr:hover {
              background-color: #e9ecef;
            }
            .total-section {
              display: flex;
              justify-content: flex-end;
              padding-right: 30px;
              margin-top: 20px;
            }
            .totals {
              text-align: right;
              font-weight: bold;
              font-size: 18px;
              color: #2c3e50;
            }
            .signature {
              text-align: right;
              font-family: "Brush Script MT", cursive;
              font-size: 24px;
              margin-top: 40px;
              color: #2c3e50;
            }
            .invoice-header {
              display: flex;
              justify-content: flex-end; /* Aligns the logo to the right */
              margin-bottom: 20px;
            }
            .invoice-header img { 
              width: 200px; 
            }
          </style>
        </head>
        <body>
          <div class="invoice-container">
            <header>
              <div class="invoice-header">
                <img src="${process.env.PUBLIC_URL}/${files}vgtlogo.png" alt="Logo">
              </div>
            </header>
            <h2>Credits Summary</h2>
            <div class="billing-info">
              <div class="issued-to">
                <p><strong>User Details:</strong></p>
                <p>${username}</p>
                <p>${email}</p>
                <p>${org}</p>
              </div>           
            </div>
            <div class="invoice-items">
              <table>
                <thead>
                  <tr>
                    <th>Feature</th>
                    <th>Tokens Used</th>
                  </tr>
                </thead>
                <tbody>
                  ${filteredCredits
        .map(
          (credit) => `
                    <tr>
                      <td>${credit.feature}</td>
                      <td>${credit.amount}</td>
                    </tr>
                  `
        )
        .join("")}
                </tbody>
              </table>
            </div>
            <div class="total-section">
              <div class="totals">
                <h5>Total Amount: ${totalAmount}</h5>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    const opt = {
      margin: 1,
      filename: `vgt_credit_summary.pdf`,
      html2canvas: { scale: 2 },
      jsPDF: { unit: "in", format: "letter", orientation: "portrait" },
    };

    html2pdf()
      .from(invoiceHTML)
      .set(opt)
      .outputPdf("blob")
      .then(function (pdfBlob) {
        // Create a new Blob URL
        const blobUrl = URL.createObjectURL(pdfBlob);

        // Open the Blob URL in a new window
        window.open(blobUrl);
      });
    // html2pdf().from(invoiceHTML).set(opt).save();
  };

  const generateInvoicePDF = (e, transaction) => {
    e.preventDefault();
    console.log('transaction', transaction);
    const invoiceHTML = `
              <html lang="en">
              <head>
                  <meta charset="UTF-8">
                  <meta name="viewport" content="width=device-width, initial-scale=1.0">
                  <title>Invoice</title>
                  <style>
                      body { 
                          font-family: Arial, sans-serif; 
                        }
                      .invoice-container { 
                         max-width: 800px; 
                         margin: auto; 
                         padding: 20px; 
                         border: 1px solid #eee; 
                         }
                      .invoice-header {
                        display: flex;
                        justify-content: flex-end; /* Aligns the logo to the right */
                        margin-bottom: 20px;
                        }
                      .invoice-header img { width: 200px; }
                      .billing-info, .pay-to { margin-bottom: 20px; }
                      table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
                      table th, table td { padding: 12px; border: 1px solid #ddd; text-align: left; }
                      .totals p { margin: 0; padding: 5px 0; }
                  </style>
              </head>
              <body>
                  <div class="invoice-container">
                      <header>
                         <div class="invoice-header">
                        <img src="${process.env.PUBLIC_URL}/${files}vgtlogo.png" alt="Logo">
                      </header>
                    
                      <section class="billing-info">
                          <p><strong>ISSUED TO:</strong></p>
                          <p>${userInfo.is_superuser || userInfo.is_admin ? transaction.memb_name : userInfo.username}</p>
                          <p>${userInfo.is_superuser || userInfo.is_admin ? transaction.email : userInfo.email_address}</p>
                          <p><strong>INVOICE NO:</strong> ${transaction.utr}</p>
                          <p><strong>DATE:</strong> ${new Date(transaction.created).toLocaleDateString()}</p>
                      </section>
                      <section class="pay-to">
                          <p><strong>PAY TO:</strong>  Vasundharaa Geo Technologies</p>
                          
                          <p><strong>Account Name:</strong> Vasundharaa Geo Technologies</p>
                          <p><strong>Account No.:</strong> XXXX XXXX 0123</p>
                      </section>
                      <section class="invoice-items">
                          <table>
                              <thead>
                                  <tr>
                                      <th class='text-center'>DESCRIPTION</th>
                                      <th class='text-center'>UNIT PRICE</th>
                                      <th class='text-center'>QTY</th>
                                      <th class='text-center'>TOTAL</th>
                                  </tr>
                              </thead>
                              <tbody >
                                  <tr>
                                      <td style='font-size:14px;'>Credits Purchased</td>
                                      <td style='font-size:14px;'>INR ${transaction.amount}</td>
                                      <td style='font-size:14px;'>${transaction.amount}</td>
                                      <td style='font-size:14px;'>INR ${transaction.amount}</td>
                                  </tr>
                              </tbody>
                          </table>
                      </section>
                      <section class="total-section">
                          <div class="totals">
                              <p><strong>SUBTOTAL:</strong> INR ${transaction.amount}</p>
                               <p><strong>GST 18%:</strong> ${transaction.amount * 0.18}</p>
                              <p><strong>TOTAL:</strong> INR ${transaction.amount * 1.18}</p>
                          </div>
                      </section>
                  </div>
              </body>
              </html>
          `;

    // Generate the PDF
    const opt = {
      margin: 1,
      filename: `invoice_${transaction.utr}.pdf`,
      html2canvas: { scale: 2 },
      jsPDF: { unit: "in", format: "letter", orientation: "portrait" },
    };
    // openInvoiceInNewWindow(invoiceHTML);

    // Generate PDF as Blob and open in a new window
    html2pdf()
      .from(invoiceHTML)
      .set(opt)
      .outputPdf("blob")
      .then(function (pdfBlob) {
        // Create a new Blob URL
        const blobUrl = URL.createObjectURL(pdfBlob);

        // Open the Blob URL in a new window
        window.open(blobUrl);
      });
    // html2pdf().from(invoiceHTML).set(opt).save();
  };

  function openInvoiceInNewWindow(invoiceHTML) {
    const newWindow = window.open("", "_blank"); // Opens a new tab or window
    newWindow.document.write(invoiceHTML); // Writes the HTML into the new window
    newWindow.document.close(); // Close the document stream to render the HTML
  }
  return (
    <>
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          justifyContent: "flex-end",
          margin: "-3% 1% 2% 0%",
        }}
      >
        {activeTab === "Credits" && (
          <>
            <div className="m-2 date-range-picker">
              <label>Start Date : </label>
              <DatePicker
                selected={startDate}
                onChange={(date) => setStartDate(date)}
                className='datpicker-input'
                placeholderText="dd/mm/yy"
              />
            </div>
            <div className="m-2 date-range-picker">
              <label>End Date : </label>
              <DatePicker
                selected={endDate}
                onChange={(date) => setEndDate(date)}
                className='datpicker-input'
                placeholderText="dd/mm/yy"
              />
            </div>
            <button className="add-btn" style={{ width: '45px', height: '35px', }} onClick={generateSummaryPDF}>
              <i className="fa-solid fa-download"></i>
            </button>
          </>
        )}
      </div>

      <table className="w-100" style={{ boxShadow: "none" }}>
        <thead className="tabs-header">
          <tr className="tabs-header">
            <th
              colSpan={2}
              className={`project-tabs ${activeTab === "Payments" ? "active" : ""
                }`}
              onClick={() => setActiveTab("Payments")}
            >
              Payments
            </th>
            <th
              colSpan={2}
              className={`project-tabs ${activeTab === "Credits" ? "active" : ""
                }`}
              onClick={() => setActiveTab("Credits")}
            >
              Credits
            </th>
          </tr>
        </thead>
      </table>

      <div className="all-tab-container">
        <div className="user-container">
          <div className="row">
            <div className="table-container col-12">
              <table className="table w-100">
                <thead className="tabs-header">
                  {activeTab === "Payments" && (
                    <>
                      <tr className="tabs-header">
                        {userInfo.is_superuser && <th>Organization</th>}
                        {(userInfo.is_admin || userInfo.is_superuser) && (
                          <th>User ID</th>
                        )}
                        {(userInfo.is_admin || userInfo.is_superuser) && (
                          <th>Username</th>
                        )}
                        <th>Amount</th>
                        <th>Status</th>
                        <th>Method</th>
                        <th>UTR</th>
                        <th>Time</th>
                        <th></th>
                      </tr>
                    </>
                  )}

                  {activeTab === "Credits" && (
                    <>
                      <tr className="tabs-header">
                        {userInfo.is_superuser && <th>Organization</th>}
                        {(userInfo.is_admin || userInfo.is_superuser) && (
                          <th>User ID</th>
                        )}
                        {(userInfo.is_admin || userInfo.is_superuser) && (
                          <th>Username</th>
                        )}
                        <th>Amount</th>
                        <th>Type</th>
                        <th>Credited By</th>
                        <th>Feature</th>
                        <th>Time</th>
                      </tr>
                    </>
                  )}
                </thead>

                <tbody className="tbody" style={{ backgroundColor: "white" }}>
                  {currentItems.map((transaction, index) => (
                    <tr key={index}>
                      {userInfo.is_superuser && <td>{transaction.org}</td>}
                      {(userInfo.is_admin || userInfo.is_superuser) && (
                        <td>{transaction.memb_id}</td>
                      )}
                      {(userInfo.is_admin || userInfo.is_superuser) && (
                        <td>{transaction.memb_name}</td>
                      )}
                      <td>{transaction.amount}</td>

                      {activeTab === "Payments" && (
                        <>
                          <td>{dict[transaction.status]}</td>
                          <td>{transaction.method}</td>
                          <td>{transaction.utr}</td>
                        </>
                      )}

                      {activeTab === "Credits" && (
                        <>
                          <td>{typeDict[transaction.type]}</td>
                          {transaction.type === 0 ? (
                            <td>{debitDict[transaction.debit_type]}</td>
                          ) : (
                            <td></td>
                          )}
                          {transaction.type === 1 ? (
                            <td>{transaction.feature}</td>
                          ) : (
                            <td></td>
                          )}
                        </>
                      )}

                      <td>
                        {new Date(transaction.created).toLocaleString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                          hour12: true,
                        })}
                      </td>

                      {activeTab === "Payments" && (
                        <>
                          <td>
                            <a
                              onClick={(e) =>
                                generateInvoicePDF(e, transaction)
                              }
                              href=""
                            >
                              {transaction.status === 1 && "Invoice"}
                            </a>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
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
        {currentPage > 3 && <button onClick={() => paginate(1)}>1</button>}
        {currentPage > 4 && <span>...</span>}
        {currentPage > 2 && (
          <button onClick={() => paginate(currentPage - 2)}>
            {currentPage - 2}
          </button>
        )}
        {currentPage > 1 && (
          <button onClick={() => paginate(currentPage - 1)}>
            {currentPage - 1}
          </button>
        )}
        <button className="current-page">{currentPage}</button>
        {currentPage < totalPages && (
          <button onClick={() => paginate(currentPage + 1)}>
            {currentPage + 1}
          </button>
        )}
        {currentPage < totalPages - 1 && (
          <button onClick={() => paginate(currentPage + 2)}>
            {currentPage + 2}
          </button>
        )}
        {currentPage < totalPages - 3 && <span>...</span>}
        {currentPage < totalPages - 2 && (
          <button onClick={() => paginate(totalPages)}>{totalPages}</button>
        )}
        <button
          onClick={() => paginate(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          &gt;
        </button>
      </div>
    </>
  );
}
