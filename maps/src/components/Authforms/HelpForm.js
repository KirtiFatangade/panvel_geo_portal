import React, { useState, useContext, useEffect } from "react";
import { GlobalContext } from "../../App";
import { NavLink, useNavigate } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import files from "../static";
import { HOST, HELP_SUPPORT_URL } from "../host";

export default function Help({ setModalIsOpen }) {
  const navigate = useNavigate();
  const [member_email, setUserEmail] = useState("");
  const [fname, setFname] = useState("");
  const [message, setMessage] = useState("");
  const { setUserInfo, userInfo, getCsrfToken } = useContext(GlobalContext);
  const [loader, setLoader] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submitHelp = async (e) => {
    e.preventDefault();
    setLoader(true);
    setIsSubmitting(true);
    if (!fname || !member_email || !message) {
      toast.warn("Please enter all fields.");
      setLoader(false);
      return;
    }

    const formData = {
      id: userInfo.id,
      fname: fname,
      member_email: member_email,
      message: message,
    };

    try {
      const res = await fetch(`${HELP_SUPPORT_URL}/get-help/`, {
        method: "POST",
        credentials: "include",
        body: JSON.stringify(formData),
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": await getCsrfToken(),
        },
      });
      const data = await res.json();
      console.log(data);
      if (res.status === 500 || !data || data.error) {
        toast.error(`${data.error}`);
      } else if (res.status === 200) {
        console.log("got help");
        setIsSubmitting(true)
        setModalIsOpen(false);
        toast.success("Your response has been submitted!");
      }
    } catch (e) {
      console.log("Did not get help");
      toast.error("Invalid credentials");
    }
  };

  const closeModal = () => {
    setModalIsOpen(false);
  };

  return (
    <div>
      <div className="user-modal-header">
        <i className="fa-solid fa-xmark cancel" onClick={closeModal}></i>
      </div>
      <form className="col-12">
        <label htmlFor="fname">Full Name : </label>
        <br />
        <input
          style={{
            opacity: loader ? "0.3" : "1",
            fontSize: "13px",
            padding: "2px 5px",
          }}
          value={fname}
          className="form-control"
          onChange={(e) => setFname(e.target.value)}
          type="text"
          placeholder="First Name"
          autocomplete="username"
          required
        />
        <br />
        <label htmlFor="fname">Contact Email Address: </label>
        <br />
        <input
          style={{
            opacity: loader ? "0.3" : "1",
            fontSize: "13px",
            padding: "2px 5px",
          }}
          value={member_email}
          className="form-control"
          onChange={(e) => setUserEmail(e.target.value)}
          type="email"
          placeholder="name@gmail.com"
          autocomplete="username"
          required
        />

        <br />
        <label htmlFor="fname">Your Question: </label>
        <br />
        <textarea
          style={{
            opacity: loader ? "0.3" : "1",  
            fontSize: "13px",
            padding: "2px 5px",
            height: "200px",
            maxHeight: "200px",
            overflow: "hidden",
            overflowY: "scroll",
          }}
          value={message}
          className="w-100 form-control"
          onChange={(e) => setMessage(e.target.value)}
          type="text"
          placeholder="Type Here"
          autocomplete="username"
          required
        />

        <br />
        <button
          disabled={isSubmitting}
          type="submit"
          onClick={(e) => submitHelp(e)}
          className="w-100 button"
          style={{ backgroundColor: "#2C3E50", border:'2px solid #2C3E50' }}
        >
          {isSubmitting ? "Submitting.." : " Submit"}
        </button>
      </form>
    </div>
  );
}
