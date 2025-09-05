import React, { useState, useContext } from "react";
import { GlobalContext } from "../../App";
import { useNavigate } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import files from "../static";
import V1 from "../authbg.mp4";
import { HOST } from "../host";
import { logToServer } from "../logger";

export default function Login() {
  const navigate = useNavigate();
  const [member_email, setUserEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const { setUserInfo, getCsrfToken } = useContext(GlobalContext);
  const [loader, setLoader] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loginUser = async (e) => {
    e.preventDefault();
    setLoader(true);
    setIsSubmitting(true);

    if (!member_email || !password) {
      toast.warn("Please enter both email and password.");
      setLoader(false);
      setIsSubmitting(false);
      return;
    }
    const formData = {
      member_email: member_email,
      password: password,
    };
    try {
      const res = await fetch(`${HOST}/login/`, {
        method: "POST",
        credentials: "include",
        body: JSON.stringify(formData),
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": await getCsrfToken(),
        },
      });
      const data = await res.json();
      if (res.status === 400 || res.status === 500 || !data || data.error) {
        toast.error(`${data.error}`);
        logToServer("error", `${data.error}`);
      } else if (res.status === 200) {
        console.log(data.user_info);
        toast.success(`Welcome ${data.user_info.first_name}`);
        logToServer("info", "login Successfully");
        setUserInfo(data.user_info);
      }
    } catch (e) {
      logToServer("error", `${e}`);
      toast.error("Invalid credentials");
    } finally {
      setLoader(false);
      setIsSubmitting(false);
    }
  };

  return (
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
        <form className="login-form" style={{height:'35vh'}}>
          <input
            style={{ opacity: loader ? "0.3" : "1" }}
            value={member_email}
            className="mt-3"
            onChange={(e) => setUserEmail(e.target.value)}
            type="email"
            placeholder="name@gmail.com or username123"
            required
          />
          <div className="pass-container">
            <input
              type={showPassword ? "text" : "password"}
              style={{ opacity: loader ? "0.3" : "1" }}
              className="type-pass"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="password"
              autocomplete="username"
              required
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
          <div className="pass-section">
            <span
              onClick={() => navigate("/forget-password")}
              style={{ opacity: loader ? "0.3" : "1" }}
              className="reset"
            >
              Forget password ?{" "}
            </span>
          </div>
          <button
            type="submit"
            onClick={(e) => loginUser(e)}
            className="button"
          >
            {isSubmitting ? "Signing in..." : " Sign in "}
          </button>

          <div
            onClick={() => navigate("/signup")}
            className="signup-link"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              width: "100%",
            }}
          >
            <div style={{ textAlign: "left" }}>
              Don’t have an account? <span>Sign up</span>
            </div>

            {loader && (
            <div
              style={{
                position: "relative",
                opacity: "1",
                zIndex: "1000",
                display:'flex',
                marginRight:'10%'
              }}
            >
              <div className="lds-dual-ring">
                <i className="fa-solid fa-globe"></i>
              </div>
            </div>
             )}
          </div>
        </form>
      </div>
      {/* <ToastContainer position="bottom-right" draggable={false} /> */}
    </div>
  );
}
