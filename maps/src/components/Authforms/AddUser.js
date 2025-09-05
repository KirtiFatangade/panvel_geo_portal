import React, { useState, useContext, useEffect } from "react";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import "../Pages/admin.css";
import { HOST } from "../host";
import { GlobalContext } from "../../App";
import { logToServer } from "../logger";
import Modal from 'react-modal';

function CreateUser({ setShowCreateForm }) {
  const { getCsrfToken, userInfo } = useContext(GlobalContext);
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    name: "",
    country_code: "",
    number: "",
    email: "",
    password: "",
  });
  const [successMsg, setSuccessMsg] = useState("");
  const [loader, setLoader] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [countryCodes, setCountryCodes] = useState([]);
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d#@]{8,}$/;

  useEffect(() => {
    fetch('https://countriesnow.space/api/v0.1/countries/codes')
      .then(response => response.json())
      .then(data => {
        if (data.error) {
          throw new Error(data.msg);
        }
        const codes = data.data.map(country => ({
          name: country.name,
          code: country.dial_code,
        })).filter(country => country.code);
        setCountryCodes(codes);
        logToServer('info', 'Fetched country codes successfully');
      })
      .catch(error => {
        console.error('Error fetching country codes:', error);
        logToServer('error', `${error}`);
      });
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  function togglePasswordVisibility() {
    setShowPassword(!showPassword);
  }

  const handleSubmit = async (e) => {
    setLoader(true);
    e.preventDefault();

    if (!passwordRegex.test(formData.password) || formData.password.length < 8) {
      toast.warn("Password should contain at least one uppercase letter, one lowercase letter, one digit, and be at least 8 characters long");
      setLoader(false);
      return;
    }

    try {
      const response = await fetch(`${HOST}/create-member/${userInfo.id}`, {
        method: "POST",
        credentials: 'include',
        body: JSON.stringify(formData),
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': await getCsrfToken(),
        },
      });

      if (response.ok) {
        const responseData = await response.json();
        setLoader(false);
        logToServer('info', 'User created successfully');
        toast.success(responseData.message || 'User created successfully');
        setFormData({
          first_name: "",
          last_name: "",
          name: "",
          country_code: "",
          number: "",
          email: "",
          password: "",
        });
      } else if (response.status === 400) {
        setLoader(false);
        const data = await response.json();
        if (data.error === 'Email already exists') {
          toast.error("Email already registered");

        }
        else if (data.error === 'Number already exists') {
          toast.error("Number already registered");
        }
        else if (data.error === 'Username already exists') {
          toast.error("Username already registered");
        } else if (data.error === 'Enter 8 characters long Password') {
          toast.warn("Enter 8 characters long Password");
        } else {
          logToServer('error', `${data.error}`)
        }
      }
    } catch (error) {
      logToServer('error', `${error}`);
      toast.error('Failed to create member');
      console.error("Error creating User", error);
      setLoader(false);
    }
  };

  const modalOverlayStyle = {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    background: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  };

  const modalContainerStyle = {
    background: '#fff',
    padding: '20px',
    borderRadius: '8px',
    maxWidth: '500px',
    width: '100%',
    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
    position: 'relative',
  };

  const formStyle = {
    display: 'flex',
    flexDirection: 'column',
  };

  const inputStyle = {
    marginBottom: '1rem',
    padding: '10px',
    borderRadius: '4px',
    border: '1px solid #ddd',
    fontSize: '14px',
  };

  const selectStyle = {
    marginBottom: '1rem',
    padding: '10px',
    borderRadius: '4px',
    border: '1px solid #ddd',
    fontSize: '14px',
  };

  const passwordWrapperStyle = {
    display: 'flex',
    alignItems: 'center',
    position: 'relative',
  };

  const passwordToggleStyle = {
    position: 'absolute',
    right: '10px',
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
  };

  const buttonStyle = {
    padding: '10px 20px',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
  };

  const addButtonStyle = {
    ...buttonStyle,
    backgroundColor: '#28a745',
    color: '#fff',
  };

  const cancelButtonStyle = {
    ...buttonStyle,
    backgroundColor: '#dc3545',
    color: '#fff',
  };

  const successMsgStyle = {
    color: 'green',
    marginTop: '10px',
  };

  const loaderStyle = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    border: '4px solid rgba(0,0,0,0.1)',
    borderRadius: '50%',
    borderTop: '4px solid #28a745',
    width: '40px',
    height: '40px',
    animation: 'spin 1s linear infinite',
  };
  const modalStyles = {
    overlay: {
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      zIndex: 1000,
    },
    content: {
      background: '#fff',
      padding: '20px',
      borderRadius: '8px',
      maxWidth: '500px',
      width: '100%',
      boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
      position: 'relative',
      margin: 'auto',
      marginTop: "10%"
    },
  };

  return (
    <>
      <Modal
        isOpen={true}
        onRequestClose={() => setShowCreateForm(false)}
        className="col-lg-2 col-sm-2 custom-modal"
        contentLabel="Create User Modal"
      >
        <div className="user-modal-header">
          <i className="fa-solid fa-xmark cancel" onClick={() => setShowCreateForm(false)}>
          </i>
        </div>

        <form className="col-lg-12 col-md-6 col-sm-10 mt-3" onSubmit={handleSubmit} style={formStyle}>
          <input className="form-control"
            type="text"
            name="first_name"
            value={formData.first_name}
            onChange={handleChange}
            placeholder="First Name"
            required
          />
          <input className="mt-2 form-control"
            type="text"
            name="last_name"
            value={formData.last_name}
            onChange={handleChange}
            placeholder="Last Name"
            required
          />
          <input className="mt-2 form-control"
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Username"
            required
          />
          <select
            className="mt-2"
            name="country_code"
            value={formData.country_code}
            onChange={handleChange}
            style={{
              fontSize: '12px',
              width: '100%',
              padding: '5px 12px',
              border: '1px solid grey',
              borderRadius: '4px',
              outline: 'none',
              cursor: 'pointer',
              boxSizing: 'border-box',
              marginRight: '8px',
            }}
            required
          >
            <option value="" disabled>Select Country Code</option>
            {countryCodes.map((country, index) => (
              <option key={index} value={country.code}>
                {country.name} ({country.code})
              </option>
            ))}
          </select>
          <input className="mt-2 form-control"
            type="text"
            name="number"
            value={formData.number}
            onChange={handleChange}
            maxLength={13 - formData.country_code.length}
            placeholder="Phone Number"
            required
          />
          <input className="mt-2 form-control"
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="Email"
            required
          />
          <div style={passwordWrapperStyle}>
            <input className="mt-2 form-control"
              type={showPassword ? "text" : "password"}
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Password"

              required
            />
            <button type="button" style={passwordToggleStyle} onClick={togglePasswordVisibility}>
              {showPassword ? (
                <i className="fa fa-eye-slash"></i>
              ) : (
                <i className="fa fa-eye"></i>
              )}
            </button>
          </div>
          <p style={successMsgStyle}>{successMsg}</p>

          <div className="modal-footer">
            <button type="submit" className="btn-add">
              {loader ? 'Creating...' : 'Create User'}
            </button>
            {/* <button type="button" style={cancelButtonStyle} onClick={() => setShowCreateForm(false)}>
              Cancel
            </button> */}
          </div>
          {loader && (
            <div style={loaderStyle}></div>
          )}
        </form>
      </Modal>
      <ToastContainer position="bottom-right"  draggable={false} />
    </>
  );
}

export default CreateUser;
