import React, { useState, useEffect, useContext } from "react";
import { HOST, PHONEPE_URL } from "../host";
import { NavLink, useNavigate } from "react-router-dom";
import { GlobalContext } from "../../App";
import files from "../static";
import "./admin.css";
import Modal from "react-modal";
import { ToastContainer, toast } from "react-toastify";
import { logToServer } from "../logger";

export default function UserProfile({ email, user }) {
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [memberId, setUserId] = useState([]);
  const [username, setName] = useState("");
  const [first_name, setFirstName] = useState("");
  const [last_name, setLastName] = useState("");
  const [number, setNumber] = useState("");
  const [member_email, setUserEmail] = useState("");
  const [isUpdate, setIsUpdate] = useState(false);
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState("");
  const { userInfo, setUserInfo, getCsrfToken, updateCredit } =
    useContext(GlobalContext);
  const [space, setSpace] = useState(null);
  const [reset, setReset] = useState(false);
  const [pass, setPass] = useState("");
  const [cPass, setCpass] = useState("");
  const [profilePicture, setProfilePicture] = useState(null);
  const [profilePictureUrl, setProfilePictureUrl] = useState("");
  const [orgModalIsOpen, setOrgModalIsOpen] = useState(false);
  const [organizationName, setOrganizationName] = useState("");
  const [org_name, setorg_name] = useState("");
  const [org_web, setorg_web] = useState("");
  const [org_add, setorg_add] = useState("");
  const [org_plan, setorg_plan] = useState("");
  const [ProfilemodalIsOpen, setProfileModalIsOpen] = useState(false);
  const [planModal, setPlanModal] = useState(false);
  const [creditsModal, SetCreditsModal] = useState(false);
  const [Bcredits, setCredits] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const planDict = {
    0: "Individual",
    1: "Basic",
    2: "Advanced",
    3: "Enterprise",
  };
  const [formData, setFormData] = useState({
    country_code: "",
  });
  const [countryCodes, setCountryCodes] = useState([]);

  const [creditCoupon, setCreditCoupon] = useState([]);
  const [coupenModalIsOpen, setCoupenModalIsOpen] = useState(false);

  const navigate = useNavigate();

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
        logToServer("info", "Fetched country codes successfully");
      })
      .catch((error) => {
        console.error("Error fetching country codes:", error);
        logToServer("error", `${error}`);
      });
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleAddOrganization = async (e) => {
    e.preventDefault();
    try {
      const csrfToken = await getCsrfToken();

      const response = await fetch(
        `${HOST}/send_organization_request/${userInfo.id}/ `,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "X-CSRFToken": csrfToken,
          },
          body: JSON.stringify({ email: organizationName }),
        }
      );

      const data = await response.json();
      console.log(data);

      if (response.ok) {
        logToServer("info", "Organization added successfully");
        toast.success("Organization added successfully");
        setOrgModalIsOpen(false);
      } else {
        toast.error(data.error || "Failed to add organization");
      }
    } catch (error) {
      toast.error("An unexpected error occurred");
      logToServer("eroor", `${error}`);
      console.error("Error adding organization:", error);
    }
  };

  const convertToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = (error) => reject(error);
    });
  };

  async function handleProfilePictureUpload(e) {
    e.preventDefault();
    try {
      const csrfToken = await getCsrfToken();
      const base64Image = await convertToBase64(profilePicture);

      const res = await fetch(`${HOST}/upload-profile-picture/${userInfo.id}`, {
        method: "POST",
        credentials: "include",
        body: JSON.stringify({ profile_picture: base64Image }),
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": csrfToken,
        },
      });

      if (res.ok) {
        toast.success("Profile picture uploaded successfully");
        logToServer("info", "Profile picture uploaded successfully");
        fetchProfilePicture();
        setModalIsOpen(false);
      } else {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to upload profile picture");
      }
    } catch (error) {
      logToServer("error", `${error}`);
      toast.error(error.message);
    }
  }

  const handleProfilePictureChange = (e) => {
    setProfilePicture(e.target.files[0]);
    toast.success("Logo Uploaded Successfully!");
  };

  async function resetPass(e) {
    e.preventDefault();
    const email = sessionStorage.getItem("email");
    if (pass && cPass && pass !== "" && cPass !== "") {
      if (pass === cPass) {
        if (passwordRegex.test(pass) && pass.length >= 8) {
          try {
            const res = await fetch(`${HOST}/reset-password`, {
              method: "POST",
              credentials: "include",
              body: JSON.stringify({
                data: { email: userInfo.email_address, password: pass },
              }),
            });

            if (res.status === 400) {
              alert("Password reset failed");
              logToServer("error", "Password reset failed");
            } else if (res.status === 200) {
              alert("Password Reset Successfully");
              logToServer("info", "Password Reset Successfully");
              sessionStorage.removeItem("email");
            }
          } catch (e) {
            alert("Unexpected error occurred. Please try again");
          }
        } else {
          alert(
            "Password should contain at least one uppercase letter, one lowercase letter, one digit, and be at least 8 characters long"
          );
        }
      } else {
        alert("Password and Confirm Password don't match");
      }
    } else {
      alert("Please enter Password and Confirm Password");
    }
  }

  async function ChangePlan(event) {
    event.preventDefault();
    const planData =
      userInfo.org_name !== "global"
        ? {
            org_plan: org_plan,
          }
        : {
            org_name: org_name,
            org_web: org_web,
            org_add: org_add,
            org_plan: org_plan,
          };
    await fetch(`${HOST}/change-plan/${userInfo.id}`, {
      method: "POST",
      credentials: "include",
      body: JSON.stringify(planData),
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "X-CSRFToken": await getCsrfToken(),
      },
    })
      .then((response) => {
        if (response.ok) {
          alert("Plan updated Successfully. Please Refresh to see the changes");
          toast.success("Plan updated Successfully");
          logToServer("info", "Plan update successfully");
          window.location.reload();
          return;
        } else {
          throw new Error("Failed to update Plan");
        }
      })
      .catch((error) => {
        logToServer("error", `${error}`);
      });
  }

  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d#@]{8,}$/;
  const handleEdit = () => {
    setName(userInfo.username);
    setFirstName(userInfo.first_name);
    setLastName(userInfo.last_name);
    setUserEmail(userInfo.email_address);
    setNumber(userInfo.number);
    setUserId(userInfo.id);
    setIsUpdate(true);
    setModalIsOpen(true);
  };

  const handleUpdateUser = async (event, memberId) => {
    event.preventDefault();
    const updatedUserData = {
      username: username,
      first_name: first_name,
      last_name: last_name,
      email: member_email,
      number: number,
    };

    await fetch(`${HOST}/update-member/${memberId}`, {
      method: "POST",
      credentials: "include",
      body: JSON.stringify(updatedUserData),
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "X-CSRFToken": await getCsrfToken(),
      },
    })
      .then((response) => {
        if (response.ok) {
          setUserInfo((prevUserInfo) => ({
            ...prevUserInfo,
            username: username,
            first_name: first_name,
            last_name: last_name,
            email: member_email,
            number: number,
          }));
          setIsUpdate(false);
          console.log(userInfo.number);
          alert("User updated Successfully. Please Refresh to see the changes");
          toast.success("User updated Successfully");
          logToServer("info", "User update successfully");
          navigate("/user-console");
          return;
        } else {
          throw new Error("Failed to update member");
        }
      })
      .catch((error) => {
        logToServer("error", `${error}`);
      });
  };

  async function fetchSpace() {
    try {
      const res = await fetch(`${HOST}/fetch-space/${userInfo.id}`);
      const data = await res.json();
      if (res.status === 400) {
        alert("Unexpected Error Occured. Please try again");
        navigate("/user-console");
      } else if (res.status === 200) {
        setSpace(data.space);
      }
    } catch (e) {
      alert("Unexpected Error Occured. Please try again");
      navigate("/user-console");
    }
  }

  const fetchProfilePicture = async () => {
    try {
      const res = await fetch(`${HOST}/get-profile-picture/${userInfo.id}`);
      if (res.ok) {
        const data = await res.json();
        // Decode base64 string received from backend
        const decodedImage = `data:image/jpeg;base64,${data.profile_pic_base64}`;
        setProfilePictureUrl(decodedImage);
        logToServer("info", "fetch Profile picture successfully");
      } else {
        throw new Error("Failed to fetch profile picture");
      }
    } catch (error) {
      logToServer("error", `${error}`);
      // Handle error, e.g., show a default profile picture
    }
  };
  async function makePayment(event) {
    event.preventDefault();
    if (Bcredits && Bcredits != "") {
      try {
        const response = await fetch(
          `${PHONEPE_URL}/payment-url/${Bcredits}/${userInfo.id}`,
          {
            method: "GET",
          }
        );
        const data = await response.json();
        console.log(data);
        if (data.url) {
          console.log(data.url);
          window.location.href = data.url;
        }
      } catch (error) {
        console.error("Error sending message:", error);
      }
    } else {
      alert("Please enter the Amount of Credits");
    }
  }
  async function AddCredit(e) {
    e.preventDefault();
    if (!creditCoupon) {
      toast.error("Please enter Coupon");
      return;
    }
    try {
      const response = await fetch(
        `${HOST}/add-credit-coupon/${userInfo.id}/${creditCoupon}`,
        {
          method: "GET",
          credentials: "include",
        }
      );
      if (response.ok) {
        console.log("added coupon");
        toast.success("Coupon applied Succesfully ");
        updateCredit();
      } else {
        toast.error("Coupon Not Applied.");
      }
    } catch (error) {
      toast.error("Coupon Not Applied.");
    }
  }
  useEffect(() => {
    fetchSpace();
    fetchProfilePicture();
  }, []);

  return (
    <>
      <div className="all-tab-container">
        <div className="profile-container">
          <div className="edit-profile-pic">
            <img
              src={
                profilePictureUrl ||
                `${process.env.PUBLIC_URL}/${files}userprofile.png`
              }
            />
            <br />
            <button onClick={handleEdit} className="updt-btn">
              Update Profile
            </button>
            <button
              onClick={() => setProfileModalIsOpen(true)}
              className="updt-btn"
            >
              Update Logo
            </button>
          </div>

          <div className="edit-profile-info">
            <table>
              <tr>
                <th className="th">Username :</th>
                <td>{userInfo.username}</td>
              </tr>
              <tr>
                <th className="th">First Name :</th>
                <td>{userInfo.first_name}</td>
              </tr>
              <tr>
                <th className="th">Last Name :</th>
                <td>{userInfo.last_name}</td>
              </tr>
              <tr>
                <th className="th">Email :</th>
                <td>{userInfo.email_address}</td>
              </tr>
              <tr>
                <th className="th">Contact No. :</th>
                <td>{userInfo.number ? userInfo.number : "-"}</td>
              </tr>
              {userInfo.org_name !== "global" && (
                <tr>
                  <th className="th">Organization</th>
                  <td>{userInfo.org_name}</td>
                </tr>
              )}

              <tr>
                <th className="th">Space Used</th>
                <td>
                  {space
                    ? space < 1024
                      ? space.toFixed(4)
                      : (space / 1024).toFixed(1)
                    : "Loading..."}{" "}
                  {space ? (space < 1024 ? "MB" : "GB") : ""}/ 5 GB
                </td>
              </tr>
            </table>
          </div>
        </div>

        <Modal
          isOpen={orgModalIsOpen}
          onRequestClose={() => setOrgModalIsOpen(false)}
          contentLabel="Add Organization Modal"
          className="col-lg-3 col-sm-2 custom-modal"
        >
          <div className="user-modal-header">
            <i
              className="fa-solid fa-xmark cancel"
              onClick={() => setProfileModalIsOpen(false)}
            ></i>
          </div>

          <form
            className="col-lg-12 col-md-6 col-sm-10"
            onSubmit={handleAddOrganization}
          >
            <div className="form-group">
              <input
                type="text"
                value={organizationName}
                onChange={(e) => setOrganizationName(e.target.value)}
                placeholder="Enter Organization Email"
                className="form-control"
                required
              />
            </div>
            <div className="modal-footer">
              <button type="submit" className="mt-3 add-btn">
                Save
              </button>
            </div>
            {/* <button type="button" className="mt-3 cancel" onClick={() => setOrgModalIsOpen(false)}>Close</button> */}
          </form>
        </Modal>

        <Modal
          isOpen={ProfilemodalIsOpen}
          onRequestClose={() => setProfileModalIsOpen(false)}
          contentLabel="Profile Picture Modal"
          className="col-lg-3 col-sm-2 custom-modal"
        >
          <div className="user-modal-header">
            <i
              className="fa-solid fa-xmark cancel"
              onClick={() => setProfileModalIsOpen(false)}
            ></i>
          </div>

          <form className="col-12 mt-2" onSubmit={handleProfilePictureUpload}>
            <div style={{ textAlign: "center" }}>
              <img
                src={
                  profilePictureUrl ||
                  `${process.env.PUBLIC_URL}/${files}userprofile.png`
                }
                style={{
                  width: "200px",
                  maxHeight: "200px",
                  borderRadius: "50%",
                }}
              />
            </div>
            <div>
              <input
                id="profilePictureInputModal1"
                type="file"
                name="profilePictureInputModal1"
                accept="image/*"
                onChange={handleProfilePictureChange}
                className="mt-2 form-control"
                style={{ display: "none" }}
                required
              />
              <div className="w-100 modal-footer">
                <button
                  type="submit"
                  className="mt-3 w-100 btn-add"
                  onClick={() =>
                    document.getElementById("profilePictureInputModal1").click()
                  }
                >
                  Profile Upload
                </button>
                <button type="submit" className="mt-3 btn-add">
                  Save
                </button>
              </div>
            </div>
          </form>
        </Modal>

        <Modal
          isOpen={modalIsOpen}
          onRequestClose={() => setModalIsOpen(false)}
          contentLabel="Update Profile Modal"
          className="col-lg-2 col-sm-1 custom-modal"
          style={{ width: "250px" }}
        >
          <div className="user-modal-header">
            <i
              className="fa-solid fa-xmark cancel"
              onClick={() => setModalIsOpen(false)}
            ></i>
          </div>

          <form className="col-lg-12 col-md-6 col-sm-10 mt-3">
            <div className="form-group">
              <input
                type="text"
                value={username}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter Username"
                className="form-control"
              />
            </div>
            <div className="form-group">
              <input
                type="text"
                value={first_name}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Enter Firstname"
                className="mt-2 form-control"
              />
            </div>
            <div className="form-group">
              <input
                type="text"
                value={last_name}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Enter Lastname"
                className="mt-2 form-control"
              />
            </div>
            <div className="form-group">
              <input
                type="text"
                value={member_email}
                onChange={(e) => setUserEmail(e.target.value)}
                placeholder="Enter Email"
                className="mt-2 form-control"
              />
            </div>
            <div className="form-group">
              <input
                type="text"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                placeholder="Kindly start with country code"
                className="mt-2 form-control"
                maxLength={13}
              />
            </div>

          </form>

          <button
            onClick={() => setReset(!reset)}
            className="mt-3 btn-add"
            style={{ flex: "1" }}
          >
            Change Password
          </button>
          <button
            type="submit"
            className="mt-3 btn-add"
            onClick={(e) => {
              handleUpdateUser(e, memberId);
              setModalIsOpen(false);
            }}
            style={{ flex: "1" }}
          >
            Update User
          </button>
          {/* </div> */}

          {reset && (
            <>
              <form className="col-lg-12 col-md-6 col-sm-10 mt-2">
                <div className="input-group">
                  <input
                    type={showPassword ? "text" : "password"}
                    className="form-control"
                    value={pass}
                    onChange={(e) => setPass(e.target.value)}
                    placeholder="New password"
                    required
                    style={{ border: "none" }}
                  />
                  <button
                    type="button"
                    className="btn"
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                    style={{
                      backgroundColor: "white",
                      padding: "6px 5px",
                      borderRadius: "4px",
                      margin: "0px",
                    }}
                  >
                    <i
                      className={`fa ${
                        showPassword ? "fa-eye-slash" : "fa-eye"
                      }`}
                    />
                  </button>
                </div>

                <div className="input-group mt-2">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    className="form-control"
                    value={cPass}
                    onChange={(e) => setCpass(e.target.value)}
                    placeholder="Confirm password"
                    required
                    style={{ border: "none" }}
                  />
                  <button
                    type="button"
                    className="btn"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    tabIndex={-1}
                    style={{
                      backgroundColor: "white",
                      padding: "6px 5px",
                      borderRadius: "4px",
                      margin: "0px",
                    }}
                  >
                    <i
                      className={`fa ${
                        showConfirmPassword ? "fa-eye-slash" : "fa-eye"
                      }`}
                    />
                  </button>
                </div>
              </form>
              <button
                type="submit"
                className="mt-3 btn-add"
                onClick={(e) => resetPass(e)}
              >
                Reset Password
              </button>
            </>
          )}
        </Modal>

        <ToastContainer
          position="bottom-right"
          theme="colored"
          draggable={false}
        />
      </div>
    </>
  );
}
