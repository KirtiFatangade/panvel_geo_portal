import React, { useContext } from "react";
import { PHONEPE_URL } from "../host";
import { GlobalContext } from "../../App";
import { useNavigate } from "react-router-dom";

function Payment() {
  const { userInfo, getCsrfToken } = useContext(GlobalContext);
  const navigate = useNavigate(); // Initialize useNavigate

  async function makePayment() {
    let amount = prompt("Please Enter Amount");
    if (amount) {
      try {
        const response = await fetch(
          `${PHONEPE_URL}/payment-url/${amount}/${userInfo.id}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-CSRFToken": await getCsrfToken(),
            },
          }
        );
        const data = await response.json();

        if (data.url) {
          console.log(data.url);
          window.location.href = data.url; 
        }
      } catch (error) {
        console.error("Error sending message:", error);
      }
    } else {
      alert("Please enter an Amount");
    }
  }

  return (
    <>
      <button onClick={() => makePayment()}>Make Payment</button>
    </>
  );
}

export default Payment;
