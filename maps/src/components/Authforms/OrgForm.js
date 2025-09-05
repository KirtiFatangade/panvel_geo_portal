import React, { useState, useContext } from "react";
import { ToastContainer, toast } from "react-toastify";
import { useNavigate, NavLink } from "react-router-dom";
import "react-toastify/dist/ReactToastify.css";
import "./Form.css";
import Modal from "react-modal";
import { HOST } from "../host";
import { GlobalContext } from "../../App";
import { logToServer } from "../logger";

const OrganizationForm = ({ setShowOrgForm, fetchOrganizations, email }) => {
  const navigate = useNavigate("");
  const { getCsrfToken } = useContext(GlobalContext);
  const [formData, setFormData] = useState({
    name: "",
    organization_email: "",
    website_name: "",
    number: "",
    address: "",
    logo: null,
  });

  const [successMsg, setSuccessMsg] = useState("");
  const handleChange = (e) => {
    let file;
    if (e.target.files && e.target.files.length > 0) {
      file = e.target.files[0];
    } else {
      file = null;
    }
    const maxSize = 1 * 1024 * 1024;
    if (file && file.size > maxSize) {
      toast.warn("File size exceeds 1 MB limit.");
      e.target.value = null;
      return;
    }
    if (e.target.name === "logo") {
      setFormData({ ...formData, [e.target.name]: e.target.files[0] });
    } else {
      setFormData({ ...formData, [e.target.name]: e.target.value });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const formDataToSend = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        formDataToSend.append(key, value);
      });

      if (formData.logo instanceof File) {
        formDataToSend.append("logo", formData.logo);
      }

      const response = await fetch(`${HOST}/create-organizations/`, {
        method: "POST",
        credentials: "include",
        body: formDataToSend,
        headers: {
          "X-CSRFToken": await getCsrfToken(),
        },
      });
      if (response.ok) {
        const responseData = await response.json();
        if (responseData.success) {
          const randomPassword = responseData.random_password;

          console.log("Admin Password:", randomPassword);
          toast.success(
            responseData.message ||
              `Organziation created successfully \n Admin Password: ${randomPassword}`
          );
          setSuccessMsg(
            <>
              Organization created successfully!
              <br />
              Copy Admin Password: {randomPassword} <br />
              <button
                className="m-0 mt-2 btn-add"
                style={{ padding: "8px", width: "360px" }}
                onClick={() => setSuccessMsg(null)}
              >
                OK
              </button>
            </>
          );

          setFormData({
            name: "",
            organization_email: "",
            website_name: "",
            number: "",
            address: "",
            logo: null,
          });
          fetchOrganizations(email);
          logToServer("info", "Created organizations sucessfully");
        } else {
          toast.error("Failed to create organization");
          logToServer("error", `${responseData.error}`);
        }
      } else if (response.status === 400) {
        const data = await response.json();
        toast.error(data.error);
        console.log("error", data.error);
      }
    } catch (error) {
      toast.error("Error creating organization:");
      logToServer("error", `${error}`);
    }
  };

  return (
    <>
      <Modal
        isOpen={true}
        onRequestClose={() => setShowOrgForm(false)}
        className="col-lg-2 col-sm-2 custom-modal"
        contentLabel="Create User Modal"
      >
        <div className="user-modal-header">
          <i
            className="fa-solid fa-xmark cancel"
            onClick={() => setShowOrgForm(false)}
          ></i>
        </div>

        <form
          onSubmit={handleSubmit}
          className="col-lg-12 col-md-6 col-sm-10"
          style={{
            maxHeight: "cal(100vh-200px)",
            overflow: "hidden",
            overflowY: "scroll",
          }}
        >
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className="mt-2 form-control"
            placeholder="Enter organization"
          />

          <input
            type="email"
            id="organization_email"
            name="organization_email"
            value={formData.organization_email}
            onChange={handleChange}
            className="mt-2 form-control"
            placeholder="organization email"
          />

          <input
            type="url"
            id="website_name"
            name="website_name"
            value={formData.website_name}
            onChange={handleChange}
            className="mt-2 form-control"
            placeholder="https://.."
          />

          <input
            type="text"
            id="number"
            name="number"
            value={formData.number}
            onChange={handleChange}
            className="mt-2 form-control"
            maxLength={13}
            placeholder="start with country code"
          />

          <textarea
            id="address"
            name="address"
            value={formData.address}
            onChange={handleChange}
            className="mt-2 form-control"
            placeholder="Enter address"
            style={{ maxHeight: "120px" }}
          ></textarea>

          <input
            type="file"
            id="logo"
            name="logo"
            accept="image/png, image/jpeg"
            onChange={handleChange}
            className="mt-2 form-control"
            placeholder="upload logo"
          />

          <p> {successMsg} </p>

          <div className="modal-footer">
            <button type="submit" className="btn-add">
              Create Organization
            </button>
          </div>

          <ToastContainer
            position="bottom-right"
            theme="colored"
            draggable={false}
          />
        </form>
      </Modal>
    </>
  );
};

export default OrganizationForm;
