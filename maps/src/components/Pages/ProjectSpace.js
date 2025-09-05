
import React, { useState, useEffect, useContext } from "react";
import { GlobalContext } from "../../App";
import { NavLink } from "react-router-dom";
import CProject from "../Authforms/createProject";
import { HOST } from "../host";
import Modal from 'react-modal';
import { logToServer } from "../logger";
import { toPadding } from "chart.js/helpers";
import { ToastContainer, toast } from 'react-toastify';

const customStyles = {
    content: {
        top: '50%',
        left: '50%',
        right: 'auto',
        bottom: 'auto',
        marginRight: '-50%',
        transform: 'translate(-50%, -50%)',
        width: '40vw',
        height: '60vh'
    }
};

export default function ProjectSpace() {
    const {
        setOrganizationProjects,
        setUserProjects,
        userProjects,
        organizationProjects,
        userInfo
    } = useContext(GlobalContext);
    const [create, setCreate] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [orgCurrentPage, setOrgCurrentPage] = useState(1);
    const [userCurrentPage, setUserCurrentPage] = useState(1);
    const [projectsPerPage] = useState(10);
    const [orgSortConfig, setOrgSortConfig] = useState({ key: 'created_at', direction: 'descending' });
    const [userSortConfig, setUserSortConfig] = useState({ key: 'created_at', direction: 'descending' });
    const [view, setView] = useState(userInfo.org_name === "global" ? "user" : "organization");

    useEffect(() => {
        if (userInfo) {
            fetchProjects(userInfo.id);
        }
    }, [userInfo]);

    function toTitleCase(str) {
        return str.replace(/\w\S*/g, function (txt) {
            return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
        });
    }

    const fetchProjects = (id) => {
        fetch(`${HOST}/fetch_projects/${id}`)
            .then((response) => {
                if (!response.ok) {
                    throw new Error("Failed to fetch projects");
                }
                return response.json();
            })
            .then((data) => {
                setOrganizationProjects(data.organization_projects);
                setUserProjects(data.member_projects);
                logToServer('info', 'fetch project Successfully');
            })
            .catch((error) => {
                logToServer('error', `${error}`);
            });
    };

    const deletePro = (id) => {
        if (window.confirm("Are you sure you want to delete this project?")) {
            fetch(`${HOST}/delete-project/${id}`)
                .then((response) => {
                    if (response.ok) {
                        fetchProjects(userInfo.id);
                        logToServer('info', 'delete project successfully');
                    } else {
                        throw new Error("Failed to delete Project");
                    }
                })
                .catch((error) => {
                    logToServer('error', `${error}`);
                });
        }
    };

    function formatDate(dateString) {
        const date = new Date(dateString);
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    }

    const filteredOrganizationProjects = organizationProjects.filter(project =>
        project.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredUserProjects = userProjects.filter(project =>
        project.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const sortProjects = (projects, sortConfig) => {
        let sortedProjects = [...projects];
        if (sortConfig !== null) {
            sortedProjects.sort((a, b) => {
                if (a[sortConfig.key] < b[sortConfig.key]) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (a[sortConfig.key] > b[sortConfig.key]) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
                return 0;
            });
        }
        return sortedProjects;
    };

    const requestSort = (key, type) => {
        if (type === 'organization') {
            let direction = 'ascending';
            if (orgSortConfig.key === key && orgSortConfig.direction === 'ascending') {
                direction = 'descending';
            }
            setOrgSortConfig({ key, direction });
        } else if (type === 'user') {
            let direction = 'ascending';
            if (userSortConfig.key === key && userSortConfig.direction === 'ascending') {
                direction = 'descending';
            }
            setUserSortConfig({ key, direction });
        }
    };

    const sortedOrgProjects = sortProjects(filteredOrganizationProjects, orgSortConfig);
    const sortedUserProjects = sortProjects(filteredUserProjects, userSortConfig);

    const orgIndexOfLastProject = orgCurrentPage * projectsPerPage;
    const orgIndexOfFirstProject = orgIndexOfLastProject - projectsPerPage;
    const currentOrgProjects = sortedOrgProjects.slice(orgIndexOfFirstProject, orgIndexOfLastProject);

    const userIndexOfLastProject = userCurrentPage * projectsPerPage;
    const userIndexOfFirstProject = userIndexOfLastProject - projectsPerPage;
    const currentUserProjects = sortedUserProjects.slice(userIndexOfFirstProject, userIndexOfLastProject);

    const paginateOrg = (pageNumber) => {
        setOrgCurrentPage(pageNumber);
    };

    const paginateUser = (pageNumber) => {
        setUserCurrentPage(pageNumber);
    };

    return (

        <>
            <div
                style={{
                    display: "flex",
                    flexDirection: "row",
                    justifyContent: "flex-end",
                    margin: "-3% 1% 2% 0%",
                    //   border:'2px solid black'
                }}
            >
                <div className="input-group m-1 search-input">
                    <span className="input-group-text" id="basic-addon1">
                        <i className="fa-solid fa-magnifying-glass"></i>
                    </span>
                    <input
                        type="text"
                        className="form-control"
                        placeholder="Search Projects .."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        aria-label="Username"
                    />
                </div>
                {(userInfo.org_name !== "global" || userInfo.user_permissions.includes("add_org_project") || userInfo.user_permissions.includes("add_project") || userInfo.is_admin || userInfo.is_superuser) && (
                    <button onClick={() => setCreate(!create)} type="submit" className="m-1 add-btn">
                        <i className="fa-solid fa-plus"></i> New Projects
                    </button>
                )}
            </div>

            <table className="w-100" style={{boxShadow:'none' }}>
                <thead className="tabs-header" >
                    <tr className="tabs-header" >
                        {(userInfo.org_name !== "global" || userInfo.user_permissions.includes("view_org_project") || userInfo.is_admin || userInfo.is_superuser) && (
                            <th colSpan={2}
                                className={`project-tabs ${view === 'organization' ? 'active' : ''}`}
                                onClick={() => setView('organization')}
                            >
                                Organization
                            </th>
                        )}
                        {(userInfo.user_permissions.includes("view_project") || userInfo.is_admin || userInfo.is_superuser) && (
                            <th colSpan={2}
                                className={`project-tabs ${view === 'user' ? 'active' : ''}`}
                                onClick={() => setView('user')}
                            >
                                User
                            </th>
                        )}
                    </tr>
                </thead>
            </table>

            <div className="all-tab-container">
                <div className="user-container">
                    <div className="row">
                        <div className="table-container col-12" >
                            <table className="table w-100">
                                <thead className="tabs-header" >       
                                    <tr className="tabs-header">
                                        <th onClick={() => requestSort('name', view)}>Project Name {orgSortConfig.key === 'name' && (orgSortConfig.direction === 'ascending' ? '▲' : '▼')}</th>
                                        <th onClick={() => requestSort('created_at', view)}>Created At {orgSortConfig.key === 'created_at' && (orgSortConfig.direction === 'ascending' ? '▲' : '▼')}</th>
                                        <th onClick={() => requestSort('updated_at', view)}>Updated At {orgSortConfig.key === 'updated_at' && (orgSortConfig.direction === 'ascending' ? '▲' : '▼')}</th>
                                        <th>Actions</th>
                                    </tr>

                                </thead>

                                <tbody className="tbody" style={{ backgroundColor: 'white'}}>
                                    {view === "organization" ? (
                                        currentOrgProjects.map((project) => (
                                            <tr key={project.id}>
                                                <td className="th fw-light text-dark" >
                                                    <NavLink
                                                        onClick={() => sessionStorage.setItem('storedPath', `/project/${project.name}/${project.id}`)}
                                                        to={`/project/${project.name}/${project.id}`}
                                                        className="text-dark project-link"
                                                        style={{ textDecoration: "none" }}
                                                    >
                                                        {toTitleCase(project.name)}
                                                    </NavLink>
                                                </td>
                                                <td>{formatDate(project.created_at)}</td>
                                                <td>{formatDate(project.updated_at)}</td>
                                                <td>
                                                    {(userInfo.is_admin || userInfo.is_superuser || userInfo.user_permissions.includes("delete_project")) ? (
                                                        <button className="btn btn-danger" onClick={() => deletePro(project.id)}>
                                                            <i className="fa fa-trash"></i>
                                                        </button>
                                                    ) : null}
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        currentUserProjects.map((project) => (
                                            <tr key={project.id}>
                                                <td className="th fw-light text-dark" >
                                                    <NavLink
                                                        onClick={() => sessionStorage.setItem('storedPath', `/project/${project.name}/${project.id}`)}
                                                        to={`/project/${project.name}/${project.id}`}
                                                        className="text-dark project-link"
                                                        style={{ textDecoration: "none" }}
                                                    >
                                                        {toTitleCase(project.name)}
                                                    </NavLink>
                                                </td>
                                                <td>{formatDate(project.created_at)}</td>
                                                <td>{formatDate(project.updated_at)}</td>
                                                <td>
                                                    {(userInfo.is_admin || userInfo.is_superuser || userInfo.user_permissions.includes("delete_project")) ? (
                                                        <button type="button" className="btn btn-danger" onClick={() => deletePro(project.id)}>
                                                            <i className="fa-solid fa-trash-can"></i>
                                                        </button>
                                                    ) : null}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                        
                    </div>

                    
                </div>
            </div>

            {view === "organization" ? (
                            <>
                                <div className="pagination">
                                    <button onClick={() => paginateOrg(orgCurrentPage - 1)} disabled={orgCurrentPage === 1}>&lt;</button>
                                    {orgCurrentPage > 3 && <button onClick={() => paginateOrg(1)}>1</button>}
                                    {orgCurrentPage > 4 && <span>...</span>}
                                    {Array.from({ length: Math.ceil(filteredOrganizationProjects.length / projectsPerPage) }).map((_, index) => (
                                        (index + 1 >= orgCurrentPage - 2 && index + 1 <= orgCurrentPage + 2) || index === 0 || index === Math.ceil(filteredOrganizationProjects.length / projectsPerPage) - 1 ? (
                                            <button
                                                key={index + 1}
                                                className={`pagination-button ${index + 1 === orgCurrentPage ? 'active' : ''}`}
                                                onClick={() => paginateOrg(index + 1)}
                                            >
                                                {index + 1}
                                            </button>
                                        ) : null
                                    ))}
                                    {orgCurrentPage < Math.ceil(filteredOrganizationProjects.length / projectsPerPage) - 2 && <span>...</span>}
                                    {orgCurrentPage < Math.ceil(filteredOrganizationProjects.length / projectsPerPage) - 1 && <button onClick={() => paginateOrg(Math.ceil(filteredOrganizationProjects.length / projectsPerPage))}>{Math.ceil(filteredOrganizationProjects.length / projectsPerPage)}</button>}
                                    <button onClick={() => paginateOrg(orgCurrentPage + 1)} disabled={orgCurrentPage === Math.ceil(filteredOrganizationProjects.length / projectsPerPage)}>&gt;</button>
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="pagination">
                                    <button onClick={() => paginateUser(userCurrentPage - 1)} disabled={userCurrentPage === 1}>&lt;</button>
                                    {userCurrentPage > 3 && <button onClick={() => paginateUser(1)}>1</button>}
                                    {userCurrentPage > 4 && <span>...</span>}
                                    {Array.from({ length: Math.ceil(filteredUserProjects.length / projectsPerPage) }).map((_, index) => (
                                        (index + 1 >= userCurrentPage - 2 && index + 1 <= userCurrentPage + 2) || index === 0 || index === Math.ceil(filteredUserProjects.length / projectsPerPage) - 1 ? (
                                            <button
                                                key={index + 1}
                                                className={`pagination-button ${index + 1 === userCurrentPage ? 'active' : ''}`}
                                                onClick={() => paginateUser(index + 1)}
                                            >
                                                {index + 1}
                                            </button>
                                        ) : null
                                    ))}
                                    {userCurrentPage < Math.ceil(filteredUserProjects.length / projectsPerPage) - 2 && <span>...</span>}
                                    {userCurrentPage < Math.ceil(filteredUserProjects.length / projectsPerPage) - 1 && <button onClick={() => paginateUser(Math.ceil(filteredUserProjects.length / projectsPerPage))}>{Math.ceil(filteredUserProjects.length / projectsPerPage)}</button>}
                                    <button onClick={() => paginateUser(userCurrentPage + 1)} disabled={userCurrentPage === Math.ceil(filteredUserProjects.length / projectsPerPage)}>&gt;</button>
                                </div>
                            </>
                        )}
            {create && (
                <Modal
                    isOpen={create}
                    onRequestClose={() => setCreate(false)}
                    // style={customStyles}
                    contentLabel="Create Project"
                    className="col-lg-12 col-sm-2 custom-modal-cproject"
                    
                >
                    <CProject setCreate={setCreate} fetchProjects={fetchProjects} />
                </Modal>
            )}
             <ToastContainer position="bottom-right"  draggable={false} />
        </>
    );
}