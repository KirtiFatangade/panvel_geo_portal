import React, { useEffect, useContext, useState } from "react";
import { HOST } from "../host";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./otp.css"; // Import the CSS file where you define the styles
import { logToServer } from "../logger";
import OtpInput from "react-otp-input";
import { GlobalContext } from "../../App";
import { useNavigate } from "react-router-dom";

function useForceUpdate() {
  const [, setValue] = useState(0);

  return () => setValue((value) => value + 1);
}

function OTP({ setReset, setisVerified, handleSubmit, shouldSignUp, sendOTP }) {
  const [otp, setOTP] = useState("");
  const { getCsrfToken } = useContext(GlobalContext);
  const [isResendDisabled, setIsResendDisabled] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const navigate = useNavigate();

  const handleChange = (value) => {
    setOTP(value);
  };

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setIsResendDisabled(false);
    }
  }, [countdown]);

  async function verify(e) {
    e.preventDefault();

    if (otp && String(otp).length === 4) {
      const key = sessionStorage.getItem("otpkey");
      const expirationTime = sessionStorage.getItem("otp_expiration");
      const currentTime = new Date().getTime();
      if (key && expirationTime) {
        if (currentTime > expirationTime) {
          sessionStorage.removeItem("otpkey");
          sessionStorage.removeItem("otp_expiration");
          toast.error("OTP has expired. Please try again");
          return;
        }
      } else {
        toast.error("Unexpected error occured. Please resend OTP");
        return;
      }
      const otpString = String(otp);
      try {
        const res = await fetch(`${HOST}/verify-otp/${otpString}/${key}`, {
          method: "POST",
          credentials: "include",
          body: {},
          headers: {
            "X-CSRFToken": await getCsrfToken(),
          },
        });

        if (res.status === 400) {
          toast.error("OTP could not be verified");
          logToServer("error", "OTP could not be verified");
        } else if (res.status === 200) {
          toast.success(`OTP Verified`);
          setisVerified(true);
          setReset(true);
          if (shouldSignUp == true) {
            handleSubmit();
          }
          logToServer("info", "OTP Verified successfully");
          sessionStorage.removeItem("otpkey");
          sessionStorage.removeItem("otp_expiration");
        }
      } catch (e) {
        console.log("e", e);
        toast.error("Invalid credentials");
        logToServer("error", `${e}`);
      }
    } else {
      toast.error("Please type OTP or type all 4 digits");
    }
  }

  const handleResendOTP = (e) => {
    e.preventDefault();
    setIsResendDisabled(true);
    sendOTP(e);
    setCountdown(60);
  };

  return (
    <>
      <div style={{ marginTop: shouldSignUp ? "2px" : "5px" }}>
        <div className="row otp-input">
          {/* <input className="otp-input" required type="text" autoComplete="one-time-code" inputMode="numeric" maxLength="4" onChange={(e) => handleChange(e.target.value)} value={otp}></input> */}
          <OtpInput
            value={otp}
            onChange={(value) => handleChange(value)}
            numInputs={4}
            renderInput={(props) => (
              <input
                {...props}
                className="otp-container"
                style={{ width: "4em", padding: "15px",color:'#007bff', border:'1px solid #007bff ' }}
              />
            )}
          />
        </div>

        <p style={{ color: "white", marginTop: "10px", textAlign: "center" }}>
          {countdown > 0 ? (
            `OTP expires in ${countdown}s`
          ) : (
            <>
              {" "}
              <span className="text-danger">OTP expired </span> <span style={{ color: "#31465eff" }}>Request a new
              one.</span>
            </>
          )}
        </p>

        <div
          style={{
            display: "flex",
            flexDirection: shouldSignUp ? "row" : "column",
          }}
        >
          <button
            onClick={(e) => verify(e)}
             className="btn btn-primary w-100 mb-1"
            id="back-btn"
          >
            {" "}
            {shouldSignUp ? "Verify & Sign Up" : "Verify"}
          </button>

          <button
             className="btn btn-primary w-100 mb-1"
            id="back-btn"
            onClick={handleResendOTP}
            disabled={isResendDisabled}
          >
            {isResendDisabled ? "Please wait..." : "Resend OTP"}
          </button>
        </div>
      </div>
    </>
  );
}

export default OTP;
