import React, { useEffect, useState, useContext } from "react";
import { useParams, Link } from 'react-router-dom';
import { PHONEPE_URL } from "../host";
import V1 from '../authbg.mp4';
import html2pdf from "html2pdf.js";
import { GlobalContext } from "../../App";

function Payment2() {
  const { userInfo, getCsrfToken } = useContext(GlobalContext);
  const { transactionId } = useParams();
  const [paymentStatus, setPaymentStatus] = useState(null);  // Store payment status
  const [loading, setLoading] = useState(true);  // Show loading state
  const [error, setError] = useState(null);  // Store any error during fetch

  useEffect(() => {
    // Fetch payment status using the transactionId
    const fetchPaymentStatus = async () => {
      try {
        const response = await fetch(`${PHONEPE_URL}/payment-status/${transactionId}`);
        const result = await response.json();
        if (response.ok) {
          setPaymentStatus(result);  // Set the payment status
        } else {
          setError("Error fetching payment status");
        }
      } catch (err) {
        setError("Failed to fetch payment status. Please try again.");
      } finally {
        setLoading(false);  // Hide the loading indicator once done
      }
    };

    fetchPaymentStatus();
  }, [transactionId]);

  if (loading) {
    return <p style={{ color: "white" }}>Loading payment status...</p>;
  }

  if (error) {
    return <p style={{ color: "red" }}>{error}</p>;
  }

  const generateInvoicePDF = (e) => {
    e.preventDefault();

    // Check if the payment status exists
    if (!paymentStatus) {
      alert("Payment status is not available.");
      return;
    }

    // Prepare the HTML content for the invoice
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
            justify-content: flex-end;
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
              <img src="vgtlogo.png" alt="Logo">
            </div>
          </header>
          <section class="billing-info">
            <p><strong>ISSUED TO:</strong></p>
            <p>${userInfo.is_superuser || userInfo.is_admin ? paymentStatus.memb_name : userInfo.username}</p>
            <p>${userInfo.is_superuser || userInfo.is_admin ? paymentStatus.email : userInfo.email_address}</p>
            <p><strong>INVOICE NO:</strong> ${paymentStatus.utr}</p>
            <p><strong>DATE:</strong> ${new Date(paymentStatus.created).toLocaleDateString()}</p>
          </section>
          <section class="pay-to">
            <p><strong>PAY TO:</strong> Vasundharaa Geo Technologies</p>
            <p><strong>Account Name:</strong> Vasundharaa Geo Technologies</p>
            <p><strong>Account No.:</strong> XXXX XXXX 0123</p>
          </section>
          <section class="invoice-items">
            <table>
              <thead>
                <tr>
                  <th>DESCRIPTION</th>
                  <th>UNIT PRICE</th>
                  <th>QTY</th>
                  <th>TOTAL</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Credits Purchased</td>
                  <td>INR ${paymentStatus.amount}</td>
                  <td>${paymentStatus.amount}</td>
                  <td>INR ${paymentStatus.amount}</td>
                </tr>
              </tbody>
            </table>
          </section>
          <section class="total-section">
            <div class="totals">
              <p><strong>SUBTOTAL:</strong> INR ${paymentStatus.amount}</p>
              <p><strong>GST 18%:</strong> ${paymentStatus.amount * 0.18}</p>
              <p><strong>TOTAL:</strong> INR ${paymentStatus.amount * 1.18}</p>
            </div>
          </section>
        </div>
      </body>
      </html>
    `;

    // PDF options
    const opt = {
      margin: 1,
      filename: `invoice_${paymentStatus.utr}.pdf`,
      html2canvas: { scale: 2 },
      jsPDF: { unit: "in", format: "letter", orientation: "portrait" },
    };

    // Generate and open the PDF
    html2pdf()
      .from(invoiceHTML)
      .set(opt)
      .outputPdf("blob")
      .then(function (pdfBlob) {
        const blobUrl = URL.createObjectURL(pdfBlob);
        window.open(blobUrl);
      });
  };

  if (loading) {
    return <p style={{ color: "white" }}>Loading payment status...</p>;
  }

  if (error) {
    return <p style={{ color: "red" }}>{error}</p>;
  }



  return (
    <>
      {/* <div className="paysuccess-parent">
        <div className="succes-box">
          <h2 className="text-white">Payment Status</h2>
          <div className="mt-5" >
            <p><strong>Transaction ID:</strong>68676gjghj76798 </p>
            <p><strong>Credit Amount:</strong> 1</p>
            <p><strong>Status:</strong> Pending </p>

            <p><strong>Payment Method:</strong>UPI </p>


            <p><strong>UTR:</strong> </p>

          </div>
          <div className="mt-5 d-flex">
            <Link className="button" to="/user-console">
              <button >Go to User Console</button>
            </Link>
            <button className="button" onClick={(e) =>generateInvoicePDF(e, transaction)}>Download</button>
          </div>  
        </div>
   </div> */}

      <div className="paysuccess-parent">
        <div className="succes-box">
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '25px'
          }} >
            <i className="fa-regular fa-circle-check" style={{ color: 'rgb(48, 61, 68)', textAlign: 'center', fontSize: '50px' }}></i>
            <h2 style={{ color: 'rgb(48, 61, 68)', textAlign: 'center' }}>Payment Status</h2>
          </div>
          {paymentStatus ? (
            <div className="mt-3">
              <p><strong>Transaction ID:</strong> {transactionId}</p>
              <p><strong>Credit Amount:</strong> {paymentStatus.amount}</p>
              <p><strong>Status:</strong> {paymentStatus.status}</p>
              {paymentStatus.method && (
                <p><strong>Payment Method:</strong> {paymentStatus.method}</p>
              )}
              {paymentStatus.utr && (
                <p><strong>UTR:</strong> {paymentStatus.utr}</p>
              )}
            </div>
          ) : (
            <p style={{ color: "white" }}>No payment status found.</p>
          )}

          <div className="mt-4 d-flex" style={{ flexDirection: 'column' }}>
            <Link to="/user-console">
              <button className="w-100 btn" style={{ backgroundColor: '#314149', color: 'white', fontSize: '15px' }} >Go to User Console</button>
            </Link>
            <button className="w-100 btn" style={{ backgroundColor: '#314149', color: 'white', fontSize: '15px' }}
              onClick={generateInvoicePDF}
            >
              Download Invoice </button>
          </div>
        </div>
      </div>

      {/* <div className="paysuccess-parent">
        <div className="succes-box">
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '25px'
          }} >
            <i className="fa-regular fa-circle-check" style={{ color: 'rgb(48, 61, 68)', textAlign: 'center', fontSize: '50px' }}></i>
            <h2 style={{ color: 'rgb(48, 61, 68)', textAlign: 'center' }}>Payment Status</h2>
          </div>
          <div className="mt-3">
            <p><strong>Transaction ID: </strong> 42342</p>
            <p><strong>Credit Amount: </strong> 534</p>
            <p><strong>Status: </strong> success</p>
            <p><strong>Payment Method: </strong> UPI</p>
            <p><strong>UTR: </strong> 098097878926127</p>
          </div>

          <div className="mt-4 d-flex" style={{ flexDirection: 'column' }}>
            <Link to="/user-console">
              <button className="w-100 btn" style={{ backgroundColor: '#314149', color: 'white', fontSize: '15px' }}>Go to User Console</button>
            </Link>
            <button className="mt-2 w-100 btn" style={{ backgroundColor: '#314149', color: 'white', fontSize: '15px' }}>
              Download Invoice </button>
          </div>
        </div>
      </div> */}
    </>
  );
}

// const styles = {
//   container: {
//     backgroundColor: "#282c34",
//     color: "white",
//     padding: "20px",
//     borderRadius: "10px",
//     textAlign: "center",
//     width: "100%",
//     maxWidth: "600px",
//     margin: "0 auto",
//     marginTop: "50px",
//   },
//   title: {
//     fontSize: "24px",
//     marginBottom: "20px",
//   },
//   statusContainer: {
//     fontSize: "18px",
//     lineHeight: "1.6",
//   },
//   link: {
//     display: "inline-block",
//     marginTop: "20px",
//     color: "#61dafb",
//     textDecoration: "none",
//     fontSize: "16px",
//     padding: "10px 20px",
//     backgroundColor: "#20232a",
//     borderRadius: "5px",
//     border: "1px solid #61dafb",
//   },
// };

export default Payment2;
