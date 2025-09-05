
import React, { useState, useContext, useEffect } from "react";
import { GlobalContext } from "../../App";
import { NavLink, useNavigate } from "react-router-dom";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import files from "../static";
import './Form.css';
import { HOST } from "../host";
import OTP from "./otp";
import V1 from '../authbg.mp4';
import { logToServer } from "../logger";


function Forget() {
  const navigate = useNavigate();
  const [member_email, setUserEmail] = useState("");
  const [enter, SetEnter] = useState(false)
  const [reset, setReset] = useState(false);
  const[ shouldSignUp, setShouldSignUp]= useState(false);
  const [isVerified, setisVerified] = useState(false);
  const [pass, setPass] = useState("");
  const [cPass, setCpass] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { setUserInfo, userInfo,getCsrfToken } = useContext(GlobalContext);
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d#@]{8,}$/;

  // useEffect(()=>{
  //   if(userInfo){
  //     navigate("/projects")
  //   }
  // },[])

  const sendOTP = async (e) => {
    e.preventDefault();
    if (!member_email) {
      toast.warn("Please enter email");
      return;
    }
    const key = sessionStorage.getItem('optkey');
    let url = !key ? `${HOST}/send-otp/${member_email}` : `${HOST}/send-otp-key/${member_email}/${key}`
    const csrftoken = document.cookie.split('; ').find(row => row.startsWith('csrftoken='));
    try {
      const res = await fetch(url, {
        method: "POST",
        credentials:'include',
        body: {},
      });

      const data = await res.json();

      if (res.status === 400 || res.status === 500 || !data || data.error) {
        SetEnter(false)
        logToServer('error', 'Error sending OTP')
        toast.error("Error sending OTP. Please try again");
      } else if (res.status === 200) {
        toast.success(`OTP sent successfully`);
        SetEnter(true)
        setShouldSignUp(false)

        logToServer('info', 'OTP sent successfully')
        sessionStorage.setItem('otpkey', data.key);
        const expirationTime = new Date().getTime() + 1 * 60 * 1000;
        sessionStorage.setItem(`otp_expiration`, expirationTime);
        sessionStorage.setItem(`email`, member_email);
        

        // setReset(true)
        // try {
        //   toast.success(`Welcome ${data.user_info.name}`);
        //   await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for 2 seconds
        //   navigate("/projects");
        // } catch (error) {
        //   console.error("Error navigating to welcome page:", error);
        // }
        // return;
      }
    }
    catch (e) {
      toast.error("Invalid credentials");
      logToServer('error', `${e}`)
    }

  };

  async function resetPass(e) {
    e.preventDefault();
    const email = sessionStorage.getItem('email');
    if (pass && cPass && pass !== "" && cPass !== "") {
      if (pass === cPass) {
        if (passwordRegex.test(pass) && pass.length >= 8) {
          try {
            const res = await fetch(`${HOST}/reset-password`, {
              method: "POST",
              credentials:'include',
              body: JSON.stringify({ data: { email: email, password: pass }, },),
              headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': await getCsrfToken(),
              },
            });

            if (res.status === 400) {
              toast.error("Password reset failed");
              logToServer('error', 'password reset Failed')
            } else if (res.status === 200) {
              toast.success("Password Reset Successfully")
              logToServer('info', 'password Reset Successfully')
              
              sessionStorage.removeItem('email');
                setTimeout(() => {
                  navigate("/login")
              }, 2000);
            }
          }
          catch (e) {
            toast.error("Unexpected error occured. Please try again");
            logToServer("error", `${e}`)
          }
        } else {
          toast.warn("Password should contain at least one uppercase letter, one lowercase letter, one digit, and be at least 8 characters long");
        }

      } else {
        toast.error("Password and Comfirm Password don't match");
      }

    } else {
      toast.error("Please enter Password and Comfirm Password");
    }
  }



  return (
    <>
      <div className="main">

        <div className="left-side">
          {/* <MapboxExample /> */}
          <video src={V1} autoPlay loop muted />
        </div>

        <div className="right-side">
          <div className="logo">
            <img src={`${process.env.PUBLIC_URL}/${files}vgtlogo.png`} alt="Vasundharaa Logo" />
          </div>

          <form className="login-form">
            {!enter && (
              <>
                <input
                  type="email"
                  className="mt-3"
                  value={member_email}
                  onChange={(e) => setUserEmail(e.target.value)}
                  placeholder="Enter email"
                  required
                />

                <button
                  type="submit"
                  className="button"
                  id="login-btn"
                  onClick={(e) => sendOTP(e)}
                >
                  Send OTP
                </button>

                <button
                  type="button"
                  className="mt-2 button"
                  id="back-btn"
                  onClick={() => navigate("/login")}
                >
                  Back
                </button>
              </>
            )}

            {/* {enter && !reset && (
              <>
                <OTP setReset={setReset} />
                <br />
                <button
                  type="button"
                  className="button"
                  id="back-btn"
                  onClick={() => SetEnter(false)}
                >
                  Back
                </button>
              </>
            )} */}

            {reset &&  (
              <>
                <form className="mt-4 login-form">
                  <div className="pass-container">
                    <input
                      type={showPassword ? "text" : "password"}
                      className="type-pass"
                      value={pass}
                      onChange={(e) => setPass(e.target.value)}
                      placeholder="New password"
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

                  <div className="pass-container">
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      className="type-pass"
                      value={cPass}
                      onChange={(e) => setCpass(e.target.value)}
                      placeholder="Confirm password"
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
 
                  <button
                    type="submit"
                    className="button"
                    id="reset-btn"
                    onClick={(e) => resetPass(e)}
                  >
                    Reset Password
                  </button>

                  <button
                    type="button"
                    className="mt-2 button"
                    id="back-btn"
                    onClick={() => {
                      SetEnter(false);
                      setReset(false)
                    }}
                  >
                    Back
                  </button>
                </form>
              </>
            )}
          </form>

          {enter && !reset && (
            <>
              <form style={{ width: '80%' }}>
                <OTP setReset={setReset} SetEnter={SetEnter} setShouldSignUp={setShouldSignUp} setisVerified={setisVerified} sendOTP={sendOTP}/>
              </form>
              <br />
            </>
           )}
        </div>


        {/* <div className="form-div">
          <form className="forml">
            <img
              src={`${files}vgtlogo.png`}
              alt="logo"
              width="240px"
              height="70px"
              style={{ margin: '0px 0px 25px 25px' }}
            />

            {!enter && (
              <>
                <input
                  type="email"
                  className="input"
                  value={member_email}
                  onChange={(e) => setUserEmail(e.target.value)}
                  placeholder="Enter email"
                  required
                />
                <br />
                <button
                  type="submit"
                  className="login"
                  id="login-btn"
                  onClick={(e) => sendOTP(e)}
                >
                  Send OTP
                </button>
                <br />
                <button
                  type="button"
                  className="login"
                  id="back-btn"
                  onClick={() => navigate("/login")}
                >
                  Back
                </button>
              </>
            )}

            {enter && !reset && (
              <>
                <OTP setReset={setReset} />
                <br />
                <button
                  type="button"
                  className="login"
                  id="back-btn"
                  onClick={() => SetEnter(false)}
                >
                  Back
                </button>
              </>
            )}

            {reset && (
              <>
                <input
                  type="password"
                  className="input"
                  value={pass}
                  onChange={(e) => setPass(e.target.value)}
                  placeholder="New password"
                  required
                />
                <input
                  type="password"
                  className="input"
                  value={cPass}
                  onChange={(e) => setCpass(e.target.value)}
                  placeholder="Confirm password"
                  required
                />
                <br />
                <button
                  type="submit"
                  className="login"
                  id="reset-btn"
                  onClick={(e) => resetPass(e)}
                >
                  Reset Password
                </button>
                <br />
                <button
                  type="button"
                  className="login"
                  id="back-btn"
                  onClick={() => {
                    SetEnter(false);
                    setReset(false)
                  }}
                >
                  Back
                </button>
              </>
            )}
          </form>
        </div> */}
      </div>
      <ToastContainer position="bottom-right" theme="colored" draggable={false} />
    </>
  )
}

export default Forget