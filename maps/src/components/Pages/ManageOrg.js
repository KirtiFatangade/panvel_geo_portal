import React, { useState, useEffect, useContext } from "react";
import "./ManageOrg.css";
import { HOST } from "../host";
import { GlobalContext } from "../../App";
import Modal from "react-modal";
import { ToastContainer, toast } from "react-toastify";
import OrganizationForm from "../Authforms/OrgForm";
import { logToServer } from "../logger";

export default function OrganizationTable({ email }) {
  const [organizationId, setOrganizationId] = useState([null]);
  const [name, setName] = useState("");
  const [number, setContactNumber] = useState("");
  const [website_name, setwebsite_name] = useState("");
  const [address, setaddress] = useState("");
  const [logo, setlogo] = useState("");
  const [email_address, setEmailAddress] = useState("");
  const [isUpdate, setIsUpdate] = useState(null);
  const [organizations, setOrganizations] = useState([]);
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [modalDelIsOpen, setModalDelIsOpen] = useState(false);
  const [userPermissions, setUserPermissions] = useState([]);
  const [showOrgForm, setShowOrgForm] = useState(false);
  const { userInfo, getCsrfToken } = useContext(GlobalContext);

  useEffect(() => {
    fetchOrganizations(email);
    if (userInfo && userInfo.user_permissions) {
      setUserPermissions(userInfo.user_permissions);
    }
  }, [userInfo]);

  const fetchOrganizations = (email) => {
    fetch(`${HOST}/read-organization/${email}`, {
      credentials: "include",
    })
      .then((response) => response.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setOrganizations(data);
          logToServer("info", "fetching organizations successfully");
        } else {
          console.error("Error: Data is not an array");
        }
      })
      .catch((error) => {
        logToServer("error", `Error fetching organizations:${error}`);
      });
  };

  const handleDeleteOrg = async (event, organizationId) => {
    event.preventDefault();
    // if (window.confirm("Are you sure you want to delete this organziation?")) {
    await fetch(`${HOST}/delete-organization/`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": await getCsrfToken(),
      },
      body: JSON.stringify({ organization_id: organizationId }),
    })
      .then((response) => {
        if (response.ok) {
          toast.success("Organization deleted successfully");
          logToServer("info", "Organization deleted successfully");
          fetchOrganizations(email);
          setModalDelIsOpen(false);
        } else {
          throw new Error("Failed to delete organization");
        }
      })
      .catch((error) => {
        logToServer("error", `Error deleting organization:${error}`);
      });
    // }
  };

  const handleUpdateOrg = async (e) => {
    e.preventDefault();
    var formData = new FormData();
    formData.append("organization_id", organizationId);
    formData.append("name", name);
    formData.append("email_address", email_address);
    formData.append("website_name", website_name);
    formData.append("number", number);
    formData.append("address", address);

    if (logo instanceof File) {
      formData.append("logo", logo);
    }

    if (!email_address.trim()) {
      delete formData["email_address"];
    }

    if (!number.trim()) {
      delete formData["number"];
    }

    await fetch(`${HOST}/update-organization/`, {
      method: "POST",
      credentials: "include",
      body: formData,
      headers: {
        "X-CSRFToken": await getCsrfToken(),
      },
    })
      .then((response) => {
        if (response.ok) {
          toast.success("Organization updated successfully");
          logToServer("info", "Organization updated successfully");
          return response.json();
        } else {
          throw new Error("Failed to update organization");
        }
      })
      .then((data) => {
        console.log(data);
        if (data.message === "Update successful") {
          fetchOrganizations(email);
          setName("");
          setContactNumber("");
          setEmailAddress("");
          setwebsite_name("");
          setaddress("");
          setlogo("");
          setIsUpdate(false);
        } else {
          throw new Error("Failed to update organization");
        }
      })
      .catch((error) => {
        logToServer("error", `Failed to update organization${error}`);
        toast.error(error);
      });
  };

  const handleEdit = (organizationId, organizationData) => {
    setOrganizationId(organizationId);
    setName(organizationData.name);
    setContactNumber(organizationData.number);
    setEmailAddress(organizationData.email_address);
    setwebsite_name(organizationData.website_name);
    setaddress(organizationData.address);
    setlogo(organizationData.logo);
    setIsUpdate(organizationId);
    setModalIsOpen(true);
  };

  const toggleOrgForm = () => {
    setShowOrgForm(true);
  };

  return (
    <>
      {!showOrgForm ? (
        <>
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              margin: "-3% 2% 2% 0%",
            }}
          >
            {(userInfo.is_superuser ||
              userInfo.user_permissions.includes("add_organization")) && (
              <button
                onClick={() => toggleOrgForm()}
                type="submit"
                className="mt-1 btn add-btn"
              >
                <i className="fa-solid fa-plus"></i> Add Organization
              </button>
            )}
          </div>
          <div>
            <div className="all-tab-container">
              {organizations.map((organization, index) => (
                <>
                  <div
                    className="profile-container"
                    key={organization.id || index}
                  >
                    <div className="edit-profile-pic">
                      <img
                        src={`${
                          window.location.origin.includes("localhost")
                            ? "http://localhost:8000"
                            : "https://portal.vasundharaa.in"
                        }${organization.logo}`}
                        className="org-logo"
                        alt="Organization Logo"
                      />
                      <br />
                      {!isUpdate &&
                        (userInfo.is_superuser ||
                          userPermissions.includes("change_organization") ||
                          userInfo.is_admin) && (
                          <button
                            className="mt-1 add-btn"
                            onClick={() =>
                              handleEdit(organization.id, organization)
                            }
                          >
                            Update Organization
                          </button>
                        )}
                      {(userPermissions.includes("delete_organization") ||
                        userInfo.is_superuser) && (
                        <> 
                          <button
                            className="btn btn-danger"
                            style={{ padding: "6px 18px" }}
                            onClick={(e) => handleDeleteOrg(e, organization.id)}
                          >
                            Delete Organization
                          </button>
                        </>
                      )}
                    </div>

                    <div className="edit-profile-info">
                      <table>
                        <tbody>
                          <tr>
                            <th className="th">Name:</th>
                            <td>{organization.name}</td>
                          </tr>
                          <tr>
                            <th className="th">Email:</th>
                            <td>{organization.email_address}</td>
                          </tr>
                          <tr>
                            <th className="th">Website:</th>
                            <td>{organization.website_name}</td>
                          </tr>
                          <tr>
                            <th className="th">Contact No.:</th>
                            <td>{organization.number}</td>
                          </tr>
                          <tr>
                            <th className="th">Address:</th>
                            <td>{organization.address || "-"}</td>
                          </tr>
                          <tr>
                            <th className="th">Credits:</th>
                            <td>{organization.credits || "-"}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <hr
                    style={{
                      border: "1px solid #4d4d4d",
                      margin: "1% 2% 1% 0%",
                    }}
                  />
                </>
              ))}
            </div>
            {isUpdate && (
              <>
                <Modal
                  isOpen={modalIsOpen}
                  onRequestClose={() => setModalIsOpen(false)}
                  contentLabel="Example Modal"
                  className="col-lg-3 col-sm-2 custom-modal"
                >
                  <div className="user-modal-header">
                    <i
                      className="fa-solid fa-xmark cancel"
                      onClick={() => setModalIsOpen(false)}
                    ></i>
                  </div>

                  <form className="col-lg-12 col-md-6 col-sm-10">
                    <div class="form-group">
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="mt-2 form-control"
                        placeholder="Enter name"
                      />
                    </div>
                    <div class="form-group">
                      <input
                        type="text"
                        value={email_address}
                        onChange={(e) => setEmailAddress(e.target.value)}
                        className="mt-2 form-control"
                        placeholder="Enter email"
                      />
                    </div>
                    <div class="form-group">
                      <input
                        type="text"
                        value={website_name}
                        onChange={(e) => setwebsite_name(e.target.value)}
                        className="mt-2 form-control"
                        placeholder="Enter url"
                      />
                    </div>
                    <div class="form-group">
                      <input
                        type="text"
                        value={number}
                        maxLength={13}
                        onChange={(e) => setContactNumber(e.target.value)}
                        className="mt-2 form-control"
                        placeholder="Start with country code"
                      />
                    </div>
                    <div class="form-group">
                      <input
                        type="text"
                        value={address}
                        onChange={(e) => setaddress(e.target.value)}
                        className="mt-2 form-control"
                        placeholder="Enter Address"
                      />
                    </div>
                    <div class="form-group">
                      <input
                        type="file"
                        name="logo"
                        accept="image/png, image/jpeg"
                        onChange={(e) => setlogo(e.target.files[0])}
                        className="mt-2 form-control"
                      />
                    </div>
                  </form>

                  <div className="modal-footer">
                    <button
                      type="submit"
                      onClick={handleUpdateOrg}
                      className="mt-3 btn-add"
                    >
                      Save
                    </button>
                  </div>
                </Modal>
              </>
            )}
          </div>
        </>
      ) : (
        <OrganizationForm
          fetchOrganizations={fetchOrganizations}
          setShowOrgForm={setShowOrgForm}
          email={email}
        />
      )}
      <ToastContainer
        position="bottom-right"
        theme="colored"
        draggable={false}
      />
    </>
  );
}
