import React, { useState, useEffect, useContext } from "react";
import { HOST } from "../host";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Modal from 'react-modal';
import { GlobalContext } from "../../App";
import { logToServer } from "../logger";
import './Manageuser.css';


export default function RoleTable({ email }) {
  const [roles, setRoles] = useState([]);
  const [filteredRoles, setFilteredRoles] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [selectedOrganization, setSelectedOrganization] = useState("");
  const [creatingRole, setCreatingRole] = useState(false);
  const [roleName, setRoleName] = useState("");
  const [editingRoleId, setEditingRoleId] = useState(null);
  const [updatedRoleName, setUpdatedRoleName] = useState("");
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState("");
  const [userPermissions, setUserPermissions] = useState([]);
  const { userInfo, getCsrfToken } = useContext(GlobalContext);
  const [searchInput, setSearchInput] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortOrder, setSortOrder] = useState({
    column: null,
    direction: 'asc',
  });
  const itemsPerPage = 10;
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchRoles(email);
  }, []);

  useEffect(() => {
    if (userInfo && userInfo.user_permissions) {
      setUserPermissions(userInfo.user_permissions);
    }
  }, [userInfo]);

  useEffect(() => {
    setFilteredRoles(roles); // Initialize filtered roles with all roles on first load
  }, [roles]);

  useEffect(() => {
    if (roles.length > 0) {
      handleSort(null); // Initial sorting by default when roles are fetched
    }
  }, [roles]);

  const fetchRoles = (organizationId) => {
    fetch(`${HOST}/view-role/${email}`,
      {
        credentials: 'include',
      }
    )
      .then((response) => response.json())
      .then((response) => {
        logToServer('info', 'fetching role successfully')
        setRoles(response.data);
        setFilteredRoles(response.data); // Update filtered roles on successful fetch
        setTotalPages(Math.ceil(response.data.length / itemsPerPage));
      })
      .catch((error) => {
        console.error("Error fetching roles:", error);
        logToServer('error', 'Error fetching roles')
      });
  };

  const createRole = async (e) => {
    e.preventDefault();
    if (roleName === "" && !roleName) {
      toast.error("Role name and organization must be provided.");
      return;
    }

    await fetch(`${HOST}/create-role/`, {
      method: "POST",
      credentials: 'include',
      headers: {
        "Content-Type": "application/json",
        'X-CSRFToken': await getCsrfToken(),
      },
      body: JSON.stringify({
        name: roleName,
        is_active: true,
        organization_name: userInfo.org_name
      }),
    })
      .then((response) => {
        if (response.ok) {
          logToServer('info', 'Role created successfully')
          toast.success('Role created successfully')
          fetchRoles(selectedOrganizationId);
          setCreatingRole(false);
          setRoles([...roles, { name: roleName, is_active: true, organization_id: selectedOrganizationId }]);
        } else {
          throw new Error("Failed to create role");
        }
      })
      .catch((error) => {
        console.error("Error creating role:", error);
        logToServer('error', 'Error create role')
      });
  };

  const toggleCreatingRole = () => {
    setCreatingRole(true);
    setModalIsOpen(true);
  };

  const handleSearchInputChange = (event) => {
    setSearchInput(event.target.value);
    filterRoles(event.target.value);
  };

  const filterRoles = (searchQuery) => {
    const filtered = roles.filter(role =>
      role.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      role.organization_name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredRoles(filtered);
    setTotalPages(Math.ceil(filtered.length / itemsPerPage));
  };

  const updateRole = async (roleId) => {
    fetch(`${HOST}/update-role/`, {
      method: "POST",
      credentials: 'include',
      headers: {
        "Content-Type": "application/json",
        'X-CSRFToken': await getCsrfToken(),
      },
      body: JSON.stringify({ role_id: roleId, name: updatedRoleName }),
    })
      .then((response) => {
        if (response.ok) {
          logToServer('info', 'Role updated successfully')
          toast.success('Role updated successfully')
          fetchRoles(selectedOrganizationId);
          setEditingRoleId(null);
        } else {
          throw new Error("Failed to update role");
        }
      })
      .catch((error) => {
        logToServer('error', 'Error update role')
      });
  };

  const deleteRole = async (roleId) => {
    if (window.confirm("Are you sure you want to delete this role?")) {
      fetch(`${HOST}/delete-role/`, {
        method: "POST",
        credentials: 'include',
        headers: {
          "Content-Type": "application/json",
          'X-CSRFToken': await getCsrfToken(),
        },
        body: JSON.stringify({ role_id: roleId }),
      })
        .then((response) => {
          if (response.ok) {
            logToServer('info', "Role deleted successfully")
            toast.success('Role deleted successfully');
            fetchRoles(selectedOrganizationId);
          } else {
            throw new Error("Failed to delete role");
          }
        })
        .catch((error) => {
          logToServer('error', 'Error deleting role')
        });
    }
  };

  const handleSort = (columnName) => {
    let direction = 'asc';
    if (sortOrder.column === columnName && sortOrder.direction === 'asc') {
      direction = 'desc';
    }
    setSortOrder({ column: columnName, direction: direction });

    const sortedRoles = [...roles].sort((a, b) => {
      if (columnName === 'name') {
        return direction === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name);
      } else if (columnName === 'status') {
        return direction === 'asc' ? (a.is_active ? -1 : 1) : (b.is_active ? -1 : 1);
      } else if (columnName === 'organization_name') {
        return direction === 'asc' ? a.organization_name.localeCompare(b.organization_name) : b.organization_name.localeCompare(a.organization_name);
      }
      return 0;
    });

    setFilteredRoles(sortedRoles);
  };

  const paginate = (pageNumber) => {
    setCurrentPage(pageNumber);
  };
  const currentItems = filteredRoles.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <>
      {creatingRole && (
        <Modal
          isOpen={modalIsOpen}
          onRequestClose={() => setModalIsOpen(false)}
          contentLabel="Create Role Modal"
          className='col-lg-2 col-sm-2 custom-modal'
        >
          <div className="user-modal-header">
            <i className="fa-solid fa-xmark cancel" onClick={() => {
              setModalIsOpen(false);
              setCreatingRole(false);
            }}>
            </i>
          </div>

          <form className="col-lg-12 col-md-6 col-sm-10 mt-2">
            <div className="form-group">
              <input
                type="text"
                className="form-control"
                placeholder="Role Name"
                value={roleName}
                onChange={(e) => setRoleName(e.target.value)}
                required
              />
            </div>
          </form>

          <div className="modal-footer">
            <button type="submit" className="mt-2 btn-add"
              onClick={createRole}
            >
              Create
            </button>
            {/* <button
              type="button"
              className="cancel"
              style={{
                padding: '5px 10px',
                fontSize: '12px',
                cursor: 'pointer',
              }}
              onClick={() => {
                setModalIsOpen(false);
                setCreatingRole(false);
              }}
            >
              Close
            </button> */}
          </div>
        </Modal>

      )}
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
            placeholder="Search Roles..."
            aria-label="Search Roles..."
            value={searchInput}
            onChange={handleSearchInputChange}
            aria-describedby="basic-addon1"
          />
        </div>
        {(userPermissions.includes('add_role') || userInfo.is_admin || userInfo.is_superuser) && (
          <button onClick={toggleCreatingRole} type="submit" className="m-1 add-btn">
            <i className="fa-solid fa-plus"></i> Add Role
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
                    <th onClick={() => handleSort('name')}>
                      Name {sortOrder.column === 'name' && (sortOrder.direction === 'asc' ? '▲' : '▼')}
                    </th>
                    <th>
                      Status
                    </th>
                    <th onClick={() => handleSort('organization_name')}>
                      Organization Name {sortOrder.column === 'organization_name' && (sortOrder.direction === 'asc' ? '▲' : '▼')}
                    </th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody className="tbody">
                  {currentItems.map((role, index) => (
                    <tr key={index}>
                      <td>
                        {editingRoleId === role.id && (
                          <Modal
                            isOpen={modalIsOpen}
                            onRequestClose={() => setModalIsOpen(false)}
                            contentLabel="Update Role Modal"
                            className='col-lg-2 col-sm-2 custom-modal'
                          >
                            <div className="user-modal-header">
                              <i className="fa-solid fa-xmark cancel" onClick={() => setModalIsOpen(false)}>
                              </i>
                            </div>

                            <form className="col-lg-12 col-md-6 col-sm-10 mt-2">
                              <input
                                type="text"
                                value={updatedRoleName}
                                className="form-control"
                                onChange={(e) => setUpdatedRoleName(e.target.value)}

                              />
                            </form>
                            <div className="modal-footer">
                              <button
                                type="submit" className="mt-2 btn-add"
                                onClick={() => updateRole(role.id)}
                              >
                                Update
                              </button>
                              {/* <button
                                type="button"
                                className="cancel"
                                style={{
                                  padding: '5px 10px',
                                  fontSize: '12px',
                                  cursor: 'pointer',
                                }}
                                onClick={() => setModalIsOpen(false)}
                              >
                                Close
                              </button> */}
                            </div>
                          </Modal>


                        )}
                        {role.name}
                      </td>
                      <td>
                        {role.is_active ? (
                          <i className="fa-solid fa-circle-check active-dot"></i>
                        ) : (
                          <i className="fa-solid fa-circle-check active-dot"></i>
                        )}
                      </td>

                      <td>{role.organization_name}</td>

                      <td className="d-flex">
                        {(userPermissions.includes('change_role') || userInfo.is_admin || userInfo.is_superuser) ? (
                          <button type="button" onClick={() => { setUpdatedRoleName(role.name); setEditingRoleId(role.id); setModalIsOpen(true); }} className="btn update" >
                            <i className="fa-solid fa-pen"></i>
                          </button>
                        ) : (<div style={{ color: "white" }}>""</div>)}
                        {(userPermissions.includes('add_role') || userInfo.is_admin || userInfo.is_superuser) ? (
                          <button onClick={() => deleteRole(role.id)} type="button" className="btn btn-danger" >
                            <i className="fa-solid fa-trash-can"></i>
                          </button>
                        ) : (<div style={{ color: "white" }}>""</div>)}
                      </td>

                    </tr>
                  ))}
                </tbody>
              </table>

            </div>
          </div>
        </div>
      </div>


      <div className="pagination">
        <button onClick={() => paginate(currentPage - 1)} disabled={currentPage === 1}>&lt;</button>
        {currentPage > 3 && <button onClick={() => paginate(1)}>1</button>}
        {currentPage > 4 && <span>...</span>}
        {currentPage > 2 && <button onClick={() => paginate(currentPage - 2)}>{currentPage - 2}</button>}
        {currentPage > 1 && <button onClick={() => paginate(currentPage - 1)}>{currentPage - 1}</button>}
        <button className="current-page">{currentPage}</button>
        {currentPage < totalPages && <button onClick={() => paginate(currentPage + 1)}>{currentPage + 1}</button>}
        {currentPage < totalPages - 1 && <button onClick={() => paginate(currentPage + 2)}>{currentPage + 2}</button>}
        {currentPage < totalPages - 3 && <span>...</span>}
        {currentPage < totalPages - 2 && <button onClick={() => paginate(totalPages)}>{totalPages}</button>}
        <button onClick={() => paginate(currentPage + 1)} disabled={currentPage === totalPages}>&gt;</button>
      </div>
      <ToastContainer position="bottom-right" theme="colored" draggable={false} />
    </>
  );
}
