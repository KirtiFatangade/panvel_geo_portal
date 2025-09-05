import React, { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./Form.css";
import V1 from "../authbg.mp4";
import { HOST } from "../host";
import { GlobalContext } from "../../App";
import { logToServer } from "../logger";
import files from "../static";
import OTP from "./otp";

export default function SignUp() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { getCsrfToken } = useContext(GlobalContext);
  const [formData, setFormData] = useState({
    fname: "",
    lname: "",
    username: "",
    country_code: "",
    number: "",
    member_email: "",
    password: "",
    cpassword: "",
    type: "user",
    org_name: "",
    org_website: "",
    org_add: "",
    org_plan: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [countryCodes, setCountryCodes] = useState([]);
  const [loader, setLoader] = useState(false);
  const [verifyEmail, setVerifyEmail] = useState(false);
  const [isVerified, setisVerified] = useState(false);
  const [shouldSignUp, setShouldSignUp] = useState(false);
  const [reset, setReset] = useState(false);

  const passwordRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@#$])[a-zA-Z\d@#$]{8,}$/;

  useEffect(() => {
    fetch("https://countriesnow.space/api/v0.1/countries/codes")
      .then((response) => response.json())
      .then((data) => {
        if (data.error) {
          throw new Error(data.msg);
        }
        const codes = data.data
          .map((country) => ({
            name: country.name,
            code: country.dial_code,
          }))
          .filter((country) => country.code);
        setCountryCodes(codes);
        setFormData({ ...formData, ["country_code"]: "+91" });
        logToServer("info", "fetching all Country codes");
      })
      .catch((error) => {
        logToServer("error", `${error}`);
      });
  }, []);

  const handleChange = (e) => {
    console.log(e.target.name, e.target.value);
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  function validateUsername(username) {
    var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (emailRegex.test(username)) {
      toast.warn("Email addresses are not allowed in the username field.");
      return false;
    }
    return true;
  }

  const formDataValidation = async (formData) => {
    if (!formData.fname) {
      toast.warn("First name is required");
      return false;
    }

    if (!formData.lname) {
      toast.warn("Last name is required");
      return false;
    }

    if (!formData.username) {
      toast.warn("Username is required");
      return false;
    }

    if (!validateUsername(formData.username)) {
      return false;
    }

    if (!formData.number) {
      toast.warn("Phone number is required");
      return false;
    }

    if (!formData.country_code) {
      toast.warn("Country code is required");
      return false;
    }

    const combinedLength =
      formData.country_code.length + formData.number.length;
    if (combinedLength !== 13) {
      toast.warn(
        "Country code and phone number combined must be exactly 13 characters"
      );
      return false;
    }

    if (!formData.member_email) {
      toast.warn("Email is required");
      return false;
    }

    if (!formData.password) {
      toast.warn("Password is required");
      return false;
    }

    if (
      !passwordRegex.test(formData.password) ||
      formData.password.length < 8 ||
      !/[A-Z]/.test(formData.password) ||
      !/[a-z]/.test(formData.password) ||
      !/\d/.test(formData.password) ||
      !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]+/.test(formData.password)
    ) {
      toast.warn(
        "Password should contain at least one uppercase letter, one lowercase letter, one digit, atleast one special character and be at least 8 characters long.."
      );
      return false;
    }

    if (!formData.cpassword) {
      toast.warn("Confirm password is required");
      return false;
    }

    if (formData.password !== formData.cpassword) {
      toast.error("Passwords are not matching");
      return false;
    }

    if (formData.type === "org") {
      if (
        !formData.org_name ||
        !formData.org_website ||
        !formData.org_add ||
        !formData.org_plan ||
        !formData.org_plan === ""
      ) {
        toast.warn("Please enter Organization Details");
        return false;
      }
    }
    return true;
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();

    setLoader(true);
    setIsSubmitting(true);

    if (!(await formDataValidation(formData))) {
      setLoader(false);
      setIsSubmitting(false);
      return;
    }

    const response = await fetch(`${HOST}/sign-up/`, {
      method: "POST",
      credentials: "include",
      body: JSON.stringify(formData),
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "X-CSRFToken": await getCsrfToken(),
      },
    });

    if (response.ok) {
      const responseData = await response.json();
      if (responseData.success) {
        toast.success("User Registered Successfully");
        logToServer("info", "User Register Successfully");
        try {
          await new Promise((move) => setTimeout(move, 2000));
          navigate("/login");
        } catch (error) {
          logToServer("error", `${error}`);
        }
      } else {
        logToServer("error", "Registration Failed ");
      }
      return;
    } else if (response.status === 400) {
      const data = await response.json();
      if (data.error) {
        toast.error(data.error);
      }
    } else {
      logToServer("error", "Registration Failed ");
      console.log("Signup request failed with status:", response.status);
    }
    setLoader(false);
    setIsSubmitting(false);
  };

  const sendOTP = async (e) => {
    e.preventDefault();
    if (!(await formDataValidation(formData))) {
      setLoader(false);
      setIsSubmitting(false);
      return;
    }
    let url = `${HOST}/send-signup-verification-otp/${formData.member_email}/${formData.username}`;
    try {
      const res = await fetch(url, {
        method: "POST",
        credentials: "include",
        body: JSON.stringify({}),
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": await getCsrfToken(),
        },
      });

      const data = await res.json();

      if (res.status === 400 || res.status === 500 || !data || data.error) {
        logToServer("error", "Error sending OTP");
        toast.error(data.error);
      } else if (res.status === 200) {
        setVerifyEmail(true);
        setShouldSignUp(true);
        setReset(false);
        toast.success(`OTP sent successfully`);
        logToServer("info", "OTP sent successfully");
        sessionStorage.setItem("otpkey", data.key);
        const expirationTime = new Date().getTime() + 1 * 60 * 1000;
        sessionStorage.setItem(`otp_expiration`, expirationTime);
        sessionStorage.setItem(`email`, formData.member_email);
      }
    } catch (e) {
      toast.error("Invalid credentials");
      logToServer("error", `${e}`);
    }
  };

  return (
    <>
      <div className="main">
        <div className="left-side">
          <video src={V1} autoPlay loop muted />
        </div>
        <div className="right-side">
          <div className="logo">
            <img
              src={`${process.env.PUBLIC_URL}/${files}panvel_municipal_corporation.png`}
              alt="Vasundharaa Logo"
            />
          </div>

          <form className="login-form">
                <input
                  className="mt-3"
                  value={formData.fname}
                  onChange={handleChange}
                  type="text"
                  placeholder="First Name"
                  required
                  name="fname"
                />
                <input
                  value={formData.lname}
                  onChange={handleChange}
                  type="text"
                  placeholder="Last Name"
                  required
                  name="lname"
                />
                <input
                  value={formData.username}
                  onChange={handleChange}
                  type="text"
                  placeholder="Username"
                  required
                  name="username"
                />
                <div className="phone-input">
                  <div style={{ flex: 1, marginRight: "5px" }}>
                    <select
                      name="country_code"
                      value={formData.country_code}
                      onChange={handleChange}
                      className="country-code select-plan"
                      required
                    >
                      <option value="" disabled>
                        Select Country Code
                      </option>
                      {countryCodes.map((country, index) => (
                        <option key={index} value={country.code}>
                          {country.name} ({country.code})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div style={{ flex: 3 }}>
                    <input
                      value={formData.number}
                      name="number"
                      onChange={handleChange}
                      type="text"
                      placeholder="736528376"
                      required
                      maxLength={13 - formData.country_code.length}
                    />
                  </div>
                </div>

                <input
                  value={formData.member_email}
                  name="member_email"
                  onChange={handleChange}
                  type="email"
                  placeholder="name@gmail.com"
                  required
                />

                <div className="pass-container">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    className="type-pass"
                    onChange={handleChange}
                    placeholder="Password"
                    required
                    name="password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <i className="fa fa-eye-slash" title="Hide Password"></i>
                    ) : (
                      <i className="fa fa-eye" title="Show Password"></i>
                    )}
                  </button>
                </div>
                <p className="password-condition-note">
                  Password should contain at least one uppercase letter, one
                  lowercase letter, one digit, atleast one special character and
                  be at least 8 characters long..
                </p>

                <div className="pass-container">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={formData.cpassword}
                    name="cpassword"
                    className="type-pass"
                    onChange={handleChange}
                    placeholder="Confirm Password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <i className="fa fa-eye-slash" title="Hide Password"></i>
                    ) : (
                      <i className="fa fa-eye" title="Show Password"></i>
                    )}
                  </button>
                </div>
    
            {!verifyEmail ? (
              <>
                <button onClick={(e) => sendOTP(e)} className="button">
                  Verify Email
                </button>
              </>
            ) : !isVerified ? (
              <>
                <OTP
                  isVerified={isVerified}
                  setisVerified={setisVerified}
                  setShouldSignUp={setShouldSignUp}
                  shouldSignUp={shouldSignUp}
                  reset={reset}
                  setReset={setReset}
                  handleSubmit={handleSubmit}
                  sendOTP={sendOTP}
                />
              </>
            ) : (
              toast.success("Email Verified!")
            )}

            <button onClick={() => navigate("/")} className="mt-2 button">
              Back
            </button> 

            {loader && (
              <div
                style={{
                  flex: "1",
                  position: "relative",
                  marginLeft: "100%",
                  opacity: "1",
                  zIndex: "1000",
                }}
              >
                <div className="lds-dual-ring">
                  <i className="fa-solid fa-globe"></i>
                </div>
              </div>
            )}

            {/* Toast Notifications */}
            <ToastContainer
              position="bottom-right"
              theme="dark"
              draggable={false}
            />
          </form>
        </div>
      </div>
    </>
  );
}
