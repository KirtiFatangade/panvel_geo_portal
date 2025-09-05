import React, { useState, useEffect, useContext, useRef } from "react";
import { HOST } from "../host";
import Modal from 'react-modal';
import { ToastContainer, toast } from 'react-toastify';
import { GlobalContext } from "../../App";
import PermissionsTable from "./Permissions";
import CreateUser from "../Authforms/AddUser";
import { logToServer } from "../logger";
import Payment2 from '../Authforms/paySuccess';
import './Manageuser.css';

export default function UserTable({ email }) {
  const [deleteSuccess, setDeleteSuccess] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [memberId, setUserId] = useState([]);
  const [name, setName] = useState("");
  const [member_email, setUserEmail] = useState("");
  const [isUpdate, setIsUpdate] = useState(false);
  const [members, setUsers] = useState([]);
  const [filteredMembers, setFilteredMembers] = useState([]);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState("");
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [userPermissions, setUserPermissions] = useState([]);
  const { userInfo, getCsrfToken } = useContext(GlobalContext);
  const toastShownRef = useRef(false);
  const [showPermissions, setShowPermissions] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });
  const [currentPage, setCurrentPage] = useState(1);
  const [membersPerPage] = useState(10); // Adjust as needed

  useEffect(() => {
    fetchUsers(email);
  }, [email]);

  useEffect(() => {
    if (userInfo && userInfo.user_permissions) {
      setUserPermissions(userInfo.user_permissions);
    }
  }, [userInfo]);

  const fetchUsers = (email) => {
    if (email) {
      fetch(`${HOST}/read-member/${email}`, {
        credentials: 'include',
      })
        .then((response) => response.json())
        .then((response) => {
          if (response.success === true) {
            setUsers(response.data);
            setFilteredMembers(response.data);
            logToServer('info', 'fetching member Successfully');
          } else {
            if (!toastShownRef.current && response.message === 'User does not have permission to perform this action.') {
              toast.error(response.message);
              toastShownRef.current = true;
            }
          }
        })
        .catch((error) => {
          console.error("Error fetching members:", error);
          logToServer('error', `${error}`);
        });
    }
  };

  const handleDeleteUser = async (memberId) => {
    if (window.confirm("Are you sure you want to remove this member?")) {
      await fetch(`${HOST}/delete/`, {
        method: "POST",
        credentials: 'include',
        body: JSON.stringify({ member_id: memberId }),
        headers: {
          "Content-Type": "application/json",
          'X-CSRFToken': await getCsrfToken(),
        },
      })
        .then((response) => {
          if (response.ok) {
            setDeleteSuccess(true);
            toast.success('User deleted successfully');
            logToServer('info', 'Deleted user successfully');
            fetchUsers(email);
          } else {
            console.log(response.message);
            if (!toastShownRef.current && response.message === 'User does not have permission to perform this action.') {
              toast.error(response.message);
              toastShownRef.current = true;
            }
            throw new Error("Failed to delete user");
          }
        })
        .catch((error) => {
          logToServer('error', `${error}`);
        });
    }
  };

  const handleUpdateUser = async (event, memberId) => {
    event.preventDefault();
    const updatedUserData = {
      member_id: memberId,
      username: name,
      email: member_email,
    };

    await fetch(`${HOST}/update-member/`, {
      method: "POST",
      credentials: 'include',
      body: JSON.stringify(updatedUserData),
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-CSRFToken': await getCsrfToken(),
      },
    })
      .then((response) => {
        if (response.ok) {
          setUsers((prevUsers) =>
            prevUsers.map((user) => {
              if (user.id === memberId) {
                return {
                  ...user,
                  username: name,
                  email: member_email,
                };
              }
              return user;
            })
          );
          setFilteredMembers((prevUsers) =>
            prevUsers.map((user) => {
              if (user.id === memberId) {
                return {
                  ...user,
                  username: name,
                  email: member_email,
                };
              }
              return user;
            })
          );
          setUpdateSuccess(true);
          toast.success('User updated successfully');
          fetchUsers(email);
          setIsUpdate(false);
          logToServer('info', 'user update Successfully');
          return;
        } else {
          toast.error("Updated value already exists");
          throw new Error("Failed to update member");
        }
      })
      .catch((error) => {
        logToServer('error', `${error}`);
      });
  };

  const handleEdit = (memberId, memberData) => {
    setName(memberData.username);
    setUserEmail(memberData.email);
    setUserId(memberId);
    setIsUpdate(true);
    setModalIsOpen(true);
  };

  const togglePermissions = (memberId, memberName) => {
    console.log("Viewing permissions for:", memberId, memberName);
    setShowPermissions(true);
    setSelectedUserId(memberId);
  };

  const toggleCreateForm = () => {
    setShowCreateForm(!showCreateForm);
  };

  const handleSearch = (event) => {
    const query = event.target.value;
    setSearchQuery(query);
    const filtered = members.filter(
      (member) =>
        member.username.toLowerCase().includes(query.toLowerCase()) ||
        member.email.toLowerCase().includes(query.toLowerCase())
    );
    setFilteredMembers(filtered);
  };

  const handleSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  useEffect(() => {
    let sortedMembers = [...filteredMembers];
    if (sortConfig.key !== null) {
      sortedMembers.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    setFilteredMembers(sortedMembers);
  }, [sortConfig]);

  // Pagination logic
  const indexOfLastMember = currentPage * membersPerPage;
  const indexOfFirstMember = indexOfLastMember - membersPerPage;
  const currentMembers = filteredMembers.slice(indexOfFirstMember, indexOfLastMember);
  const totalPages = Math.ceil(filteredMembers.length / membersPerPage);

  const paginate = (pageNumber) => {
    if (pageNumber < 1 || pageNumber > totalPages) return;
    setCurrentPage(pageNumber);
  };

  const getArrow = (key) => {
    if (sortConfig.key === key) {
      return sortConfig.direction === 'ascending' ? '▲' : '▼';
    }
    return '';
  };
  async function sendCredit(id, name) {
    const amount = window.prompt("Enter the amount of credit you want to send:");

    // Validate the input
    if (amount !== null) {
      const creditAmount = parseInt(amount, 10);

      if (!isNaN(creditAmount) && creditAmount > 0) {
        try {
          const response = await fetch(`${HOST}/send-credit/${id}/${creditAmount}`, {
            method: "GET",
            credentials: "include"
          });
          if (response.ok) {

            alert(`Credits sent Successfully to ${name}`)
            fetchUsers(email);
          } else {
            alert("Credits not sent Successfully")
          }
        } catch (error) {
          alert("Credits not sent Successfully")

        }

      } else {
        alert("Please enter a valid positive number.");
      }
    } else {
      // User canceled the prompt
      console.log("Credit sending canceled.");
    }
  }
  return (
    <>
    
      {!showPermissions ? (
        <>
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              justifyContent: "flex-end",
              margin: "-3% 1% 2% 0%",
            }}
          >
            <div className="input-group m-1 search-input">
              <span className="input-group-text" id="basic-addon1">
                <i className="fa-solid fa-magnifying-glass"></i>
              </span>
              <input
                type="text"
                className="form-control"
                placeholder="Username"
                aria-label="Username"
                value={searchQuery}
                onChange={handleSearch}
                aria-describedby="basic-addon1"
              />
            </div>
            {(userPermissions.includes('add_user') || userInfo.is_admin) && (
              <button onClick={() => toggleCreateForm()} type="submit" className="m-1 add-btn">
                <i className="fa-solid fa-plus"></i> Add User
              </button>
            )}
          </div>

          <div className="all-tab-container">
            <div className="user-container">
              <div className="row">
                <div className="col-12">
                  <table className="table w-100">
                    <thead className="thead-light">
                      <tr>
                        <th onClick={() => handleSort('username')} style={{ cursor: 'pointer' }}>
                          Username {getArrow('username')}
                        </th>
                        <th onClick={() => handleSort('email')} style={{ cursor: 'pointer' }}>
                          Email {getArrow('email')}
                        </th>
                        <th>Permission</th>
                        
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody className="tbody">
                      {filteredMembers.map((member) => (
                        <tr key={member.id}>
                          <td>{member.username}</td>
                          <td>{member.email}</td>
                          <td>
                            {(userPermissions.includes('change_user') || userInfo.is_admin) && member.id !== userInfo.id && !member.is_admin ? (
                              <button
                                type="button"
                                onClick={() => togglePermissions(member.id, member.name)}
                                className="btn update"
                                aria-label={`View permissions for ${member.username}`}
                              >
                                View Permissions
                              </button>
                            ) : (
                              <span>All Permissions</span>
                            )}
                          </td>

                        
                          <td className="d-flex">
                            {(userPermissions.includes('change_user') || userInfo.is_admin) && !member.is_admin && member.id !== userInfo.id ? (
                              <button type="button" onClick={() => handleEdit(member.id, member)} className="btn update" aria-label={`Update ${member.username}`}>
                                <i className="fa-solid fa-pen"></i>
                              </button>
                            ) : (<div>-</div>)}
                            {(userPermissions.includes('delete_user') || userInfo.is_admin) && member.id !== userInfo.id && !member.is_admin ? (
                              <button onClick={() => handleDeleteUser(member.id)} type="button" className="btn btn-danger" aria-label={`Remove ${member.username}`}>
                                <i className="fa-solid fa-trash-can"></i>
                              </button>
                            ) : (<div> -</div>)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                </div>
              </div>
            </div>
          </div>



          {isUpdate && (
            <Modal
              isOpen={modalIsOpen}
              onRequestClose={() => setModalIsOpen(false)}
              contentLabel="Update User Modal"
              className='col-lg-2 col-sm-2 custom-modal'
              style={{ zIndex: '1' }}
            >
              <div className="user-modal-header">
                <i className="fa-solid fa-xmark cancel" onClick={() => setModalIsOpen(false)}>
                </i>
              </div>

              <form className="col-lg-12 col-md-6 col-sm-10">
                <input
                  type="text"
                  value={name}
                  className="mt-2 form-control"
                  onChange={(e) => setName(e.target.value)}
                />
                <input
                  type="text"
                  value={member_email}
                  className="mt-2 form-control"
                  onChange={(e) => setUserEmail(e.target.value)}
                />
              </form>
              <div className="modal-footer">
                <button type="submit" className='mt-2 btn-add' onClick={(e) => handleUpdateUser(e, memberId)}>Update User</button>
                {/* <button type="submit" className='mt-5 cancel' onClick={() => { setModalIsOpen(false); setIsUpdate(false); }}>Close</button> */}
              </div>
              <p>{updateSuccess}</p>
            </Modal>
          )}

          {showCreateForm && (
            <CreateUser setShowCreateForm={setShowCreateForm} />
          )}

          <div className="pagination">
            <button onClick={() => paginate(currentPage - 1)} disabled={currentPage === 1}>
              &lt;
            </button>
            {[...Array(totalPages)].map((_, index) => (
              <button
                key={index + 1}
                onClick={() => paginate(index + 1)}
                className={currentPage === index + 1 ? 'active' : ''}
              >
                {index + 1}
              </button>
            ))}
            <button onClick={() => paginate(currentPage + 1)} disabled={currentPage === totalPages}>
              &gt;
            </button>
          </div>
        </>
      ) : showPermissions && !showCreateForm && (
        <PermissionsTable memberId={selectedUserId} setShowPermissions={setShowPermissions} />
      )}
      <ToastContainer position="bottom-right" theme="light" draggable={false} />
    </>
  );
}
