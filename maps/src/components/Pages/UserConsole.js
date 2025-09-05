
import React, { useState, useEffect, useContext, useRef } from "react";
import { useNavigate, useLocation, NavLink } from "react-router-dom";
import "./AdminPage.css";
import "./admin.css";
import UserTable from "./ManageUser";
import OrganizationTable from "./ManageOrg";
import RoleTable from "./ManageRole";
import { HOST } from "../host";
import PermissionsTable from "./Permissions";
import CreateUser from "../Authforms/AddUser";
import UserProfile from "./userprofile";
import ProjectSpace from "./ProjectSpace";
import Tracker from "./hisTracker";
import ManageConversaton from "./ManageConversaton";
import ManageCloud from "./ManageCloud";
import DataInput from "./DataInput";
import files from "../static";
import Logs from "./logs";
import TransTable from "./transactions";
import UP42ORDERS from "./up42Orders";
import SKYORDERS from "./SkywatchOrders";
import { GlobalContext } from "../../App";
import { logToServer } from "../logger";
import Modal from "react-modal";
import Help from "../Authforms/HelpForm";
import ManageHelpSupport from "./ManageHelpSupport";
import PlacedOrders from "./PlacedOrders";

// import files from "../static";

const Notification = ({ notification, onAction }) => (
  <div className="notification">
    <p>Organization: {notification.organization_name}</p>
    <p>Status: {notification.status ? "Approved" : "Pending"}</p>
    {!notification.status && (
      <div className="notification-actions">
        <button
          onClick={() => onAction(notification.id, true)}
          className="btn-approve"
        >
          Approve
        </button>
        <button
          onClick={() => onAction(notification.id, false)}
          className="btn-reject"
        >
          Reject
        </button>
      </div>
    )}
  </div>
);

export default function AdminPage({}) {
  const navigate = useNavigate();
  const [showUserTable, setShowUserTable] = useState(false);
  const [showOrgTable, setShowOrgTable] = useState(false);
  const [showRoleTable, setShowRoleTable] = useState(false);
  const [loginTime, setLoginTime] = useState(null);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [userPermissionId, setUserPermissionId] = useState("");
  const [showPermissions, setShowPermissions] = useState(false);
  const [selectedUserName, setSelectedUserName] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showuserProfile, setShowuserProfile] = useState(true);
  const [showProjects, setShowProject] = useState(false);
  const [showConversation, setShowConversation] = useState(false);
  const [ShowTracker, setTracker] = useState(false);
  const [modalIsOpen, setModalIsOpen] = useState(false);

  const location = useLocation();
  const [showCloud, setShowCloud] = useState(false);
  const {
    setUserInfo,
    Logout,
    SetLogout,
    userInfo,
    UTab,
    SetuTab,
    getCsrfToken,
    Canvas,
    UsedLayers,
    setOrganizationProjects,
    setUserProjects,
    SetMap,
    setMapData,
    SetMapBox,
  } = useContext(GlobalContext);
  const [showNotificationModal, setShowNotificationModal] = useState(false); // State for notification modal
  const [notifications, setNotifications] = useState([]); // State for notifications
  const [profilePictureUrl, setProfilePictureUrl] = useState("");

  const notificationModalRef = useRef(null);

  useEffect(() => {
    fetchLoginTime();
  }, [location.state?.loggedInUserEmail]);

  const fetchProfilePicture = async () => {
    try {
      const res = await fetch(`${HOST}/get-profile-picture/${userInfo.id}`);
      if (res.ok) {
        const data = await res.json();
        // Decode base64 string received from backend
        const decodedImage = `data:image/jpeg;base64,${data.profile_pic_base64}`;
        setProfilePictureUrl(decodedImage);
        logToServer("info", "fetching project successfully");
      } else {
        throw new Error("Failed to fetch profile picture");
      }
    } catch (error) {
      // Handle error, e.g., show a default profile picture
      logToServer("error", `${error}`);
    }
  };

  useEffect(() => {
    fetchProfilePicture(); // Fetch profile picture when component mounts
  }, []);

  const fetchLoginTime = async () => {
    try {
      const response = await fetch(`${HOST}/login-time/`);
      if (!response.ok) {
        throw new Error("Failed to fetch login time");
      }
      const data = await response.json();
      const loginTimeFromServer = data.loginTime;
      logToServer("info", "fetching login time");
      setLoginTime(loginTimeFromServer);
    } catch (error) {
      logToServer("error", `${error}`);
    }
  };
  const fetchNotifications = async () => {
    try {
      const response = await fetch(`${HOST}/user-requests/${userInfo.id}`);
      if (!response.ok) {
        throw new Error("Failed to fetch notifications");
      }
      const data = await response.json();
      setNotifications(data.requests);
      logToServer("info", "fetching notification Successfully");
    } catch (error) {
      logToServer("error", `${error}`);
    }
  };

  const handleAction = async (notificationId, approve) => {
    try {
      const response = await fetch(
        `${HOST}/approve-request/${notificationId}/action`,
        {
          method: "POST",
          credentials:'include',
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "X-CSRFToken": await getCsrfToken(),
          },
          body: JSON.stringify({ approve }),
        }
      );
      if (!response.ok) {
        throw new Error("Failed to update notification status");
      }
      setNotifications(
        notifications.map((n) =>
          n.id === notificationId ? { ...n, status: approve } : n
        )
      );
      logToServer("info", "updating notification Status");
    } catch (error) {
      logToServer("error", `${error}`);
    }
  };

  const toggleNotificationModal = async () => {
    setShowNotificationModal(!showNotificationModal);
    if (!showNotificationModal) {
      await fetchNotifications();
    }
  };

  const handleClickOutside = (event) => {
    if (
      notificationModalRef.current &&
      !notificationModalRef.current.contains(event.target)
    ) {
      setShowNotificationModal(false);
    }
  };

  useEffect(() => {
    if (showNotificationModal) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showNotificationModal]);

  const logout = async () => {
    const result = window.confirm("Are you sure to logout?");
    if (!result) {
      return;
    }
    await fetch(`${HOST}/logout`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "X-CSRFToken": await getCsrfToken(),
      },
      body: JSON.stringify({}),
    });
    // if(!(window.location.pathname.startsWith("/MapBox"))){
    //   Canvas.clear();
    // }
    Canvas.clear();
    Object.keys(UsedLayers).forEach((id) => {
      if (typeof UsedLayers[id] === "object") {
        UsedLayers[id].remove();
      }
    });
    setUserInfo(null);
    SetLogout(false);
    setOrganizationProjects([]);
    SetMap(null);
    setMapData(null); // Clear organization projects
    setUserProjects([]);
    SetuTab("1"); // Clear user projects
    SetMapBox(null);
    // navigate("/login");

    if (userInfo.org_id === 44 || userInfo.org_name === "KMC" || userInfo.org_name === "Khopoli Municipal Council") {
      navigate("/kmc-login");
    } else {
       navigate("/login");
    }
    
  };

  const [currentTabName, setCurrentTabName] = useState("Dashboard");

  useEffect(() => {
    const storedTabName = localStorage.getItem("currentTabName");
    if (storedTabName) {
      setCurrentTabName(storedTabName);
    }
  }, []);

  const handleTabClick = (tabName, tabId) => {
    setCurrentTabName(tabName);
    localStorage.setItem("currentTabName", tabName);
    SetuTab(tabId);
  };

  const getHeaderText = () => {
    switch (UTab) {
      case "1":
        return "Profile";
      case "2":
        return "Organizations";
      case "3":
        return "Users";
      case "4":
        return "Roles";
      case "5":
        return "Projects";
      case "6":
        return "Manage Conversations";
      case "7":
        return "Activity Tracker";
      case "8":
        return "Cloud";
      case "9":
        return "Survey";
      case "10":
        return "Logger";
      case "11":
        return "Transactions";
      case "12":
        return "UP42 Orders";
      case "13":
        return "SkyWatch Orders";
      case "14":
        return "Help & Support";
      default:
        return "Dashboard";
    }
  };

  const showHelpPopup = () => {
    setModalIsOpen(true);
    console.log("clicked help");
  };
  return (
    <>
      <div className="admin-container">
        <div className="left-section">
          <div className="profile">
            <div className="profile-img">
              <img
                src={
                  profilePictureUrl ||
                  `${process.env.PUBLIC_URL}/${files}userprofile.png`
                }
              />
            </div>
            <div className="profile-info">
              <div className="username"> {userInfo.email_address} </div>
              <div className="logintime"> Last login:{loginTime}</div>
            </div>
          </div>
          <div className="menus">
            <ul>
              <li
                className={`li ${UTab === "1" ? "active" : ""}`}
                onClick={() => SetuTab("1")}
              >
                Profile
              </li>
          
              {(userInfo.user_permissions.includes("view_user") ||
                userInfo.is_superuser ||
                userInfo.is_admin) && (
                <li
                  className={`li ${UTab === "3" ? "active" : ""}`}
                  onClick={() => SetuTab("3")}
                >
                  Manage Users
                </li>
              )}

              <NavLink
                onClick={() => sessionStorage.setItem("storedPath", "/panvel")}
                to="/panvel"
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <li className={`li ${UTab === "portal" ? "active" : ""}`}>
                  Portal
                </li>
              </NavLink>
              <NavLink
                target="_blank"
                to="/MapBox"
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <li className={`li ${UTab === "MapBox" ? "active" : ""}`}>
                  3D Map
                </li>
              </NavLink>
              <NavLink
                to="/privacy-policy"
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <li className={`li ${UTab === "portal" ? "active" : ""}`}>
                  Privacy Policy
                </li>
              </NavLink>

              <li
                 className={`li ${UTab === "14" ? "active" : ""}`}
                 onClick={() => SetuTab("14")}
              >
                Help & Support
              </li>
            </ul>
          </div>
        </div>
        <div className="right-section">
          <div className="toolbar">
            <div className="active-tab"> {getHeaderText()}</div>
            <div className="admin-tools">
              <i
                className="fa-solid fa-power-off text-danger"
                title="Logout"
                onClick={logout}
              ></i>
            </div>
          </div>
          <div className="tab-container">
            {UTab === "2" && <OrganizationTable email={userInfo.id} />}
            {UTab === "3" && <UserTable email={userInfo.id} />}
            {UTab === "4" && <RoleTable email={userInfo.id} />}
            {UTab === "1" && <UserProfile email={userInfo.id} />}
            {UTab === "5" && <ProjectSpace email={userInfo.id} />}
            {UTab === "6" && (
              <ManageConversaton
                id={userInfo.id}
                showConversation={showConversation}
                setShowConversation={setShowConversation}
              />
            )}
            {UTab === "14" && <ManageHelpSupport />}
          </div>
        </div>

        {showNotificationModal && (
          <div className="notification-modal-overlay">
            <div className="notification-modal">
              <button onClick={toggleNotificationModal} className="close-modal">
                &times;
              </button>

              <div className="modal-body">
                {notifications.length ? (
                  <div className="notifications-list">
                    {notifications.map((notification) => (
                      <Notification
                        key={notification.id}
                        notification={notification}
                        onAction={handleAction}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="empty-notifications">
                    <p>No new notifications</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* {modalIsOpen && (
          <Modal
            isOpen={modalIsOpen}
            onRequestClose={() => setModalIsOpen(false)}
            className="col-lg-12 col-sm-2 p-0 custom-modal"
            style={{ zIndex: "1", width: "600px" }}
          >
            
            <div
              style={{ display: "flex", flexDirection: "row", width: "700px" }}
            >
              <div className="p-3"
                style={{
                  flex: "5",
                  color: "white",
                  textAlign: "left",
              
                }}
              >
                <img
                src={`${process.env.PUBLIC_URL}/${files}contact.jpg` }
                style={{
                  width:'360px',
                  height:'462px'
                }}
              />

              </div>
              <div style={{ flex: "5", padding: "1%" }}>
                <Help setModalIsOpen={setModalIsOpen} />
              </div>
            </div>
          </Modal>
        )} */}
        
      </div>
    </>
  );
}
