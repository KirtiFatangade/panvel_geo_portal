
import React, { useState, useEffect, useContext } from "react";
import { GlobalContext } from "../../App";
import { NavLink } from "react-router-dom";
import CProject from "../Authforms/createProject";
import { HELP_SUPPORT_URL } from "../host";
import Modal from 'react-modal';
import { logToServer } from "../logger";
import { toast } from "react-toastify";

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

export default function ManageHelpSupport({ id }) {
    const [supportRecords, setSupportRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { userInfo, getCsrfToken } = useContext(GlobalContext);
    const [searchInput, setSearchInput] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const itemsPerPage = 10;
    const [isEditing, setIsEditing] = useState(null);
    const [resolvedValue, setResolvedValue] = React.useState(false);


    const handleSaveClick = async (recordId, resolvedValue) => {
        try {
            const response = await fetch(`${HELP_SUPPORT_URL}/update-support/${recordId}/`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    "X-CSRFToken": await getCsrfToken(),
                },
                body: JSON.stringify({
                    resolved: resolvedValue,
                }),
            });

            const data = await response.json();
            if (data.success) {
                console.log("Updated successfully");
                toast.success('Query Updated Successfully!')
                setSupportRecords((prevRecords) =>
                    prevRecords.map((record) =>
                        record.id === recordId
                            ? { ...record, resolved: resolvedValue }
                            : record
                    )
                );
            } else {
                console.error(data.error || "Failed to update");
            }
        } catch (error) {
            console.error("Error updating support:", error);
        } finally {
            setIsEditing(false);
        }

    };

    useEffect(() => {
        fetchQueries();
    }, []);

    const fetchQueries = () => {
        fetch(`${HELP_SUPPORT_URL}/manage-support/${userInfo.id}/`)
            .then((response) => response.json())
            .then((response) => {
                const updatedData = response.support_data.map(record => ({
                    ...record,
                    resolved: record.resolved !== undefined ? record.resolved : false
                }));
                setSupportRecords(updatedData);
                console.log('response', response)
            })
            .catch((error) => {
                console.error("Error fetching queries:", error);
                logToServer('error', 'Error fetching queries');
            });
    };

    const paginate = (pageNumber) => {
        setCurrentPage(pageNumber);
    };
    //   const currentItems = filteredRoles.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    return (
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
                        placeholder="Search Queries..."
                        aria-label="Search Queries..."
                        // value={searchInput}
                        // onChange={handleSearchInputChange}
                        aria-describedby="basic-addon1"
                    />
                </div>

            </div>

            <div className="all-tab-container">
                <div className="user-container">
                    <div className="row">
                        <div className="col-12">
                            <table className="table w-100">
                                <thead className="thead-light">
                                    <tr>
                                        <th>Name</th>
                                        <th> Email</th>
                                        <th>Query Asked</th>
                                        <th>Resolved</th>
                                        {/* <th>Actions</th> */}
                                    </tr>
                                </thead>
                                <tbody className="tbody">
                                    {supportRecords.map((record, index) => (
                                        <tr key={index}>
                                            <td>{record.full_name}</td>
                                            <td>{record.member_email} </td>
                                            <td className='col-2 text-truncate' style={{ textAlign: 'center', maxWidth: '150px' }}>{record.message}</td>
                                            <td>
                                                <label className="switch">
                                                    <input
                                                        type="checkbox"
                                                        checked={record.resolved}
                                                        disabled={record.resolved} 
                                                        onChange={() => {
                                                            if (!record.resolved) { 
                                                                handleSaveClick(record.id, true); 
                                                            }
                                                        }}
                                                    />
                                                    <span className="slider round"></span>
                                                </label>
                                            </td>

                                            {/* <td>
                                                <>
                                                {isEditing === index ? (
                                                    <input type="checkbox"
                                                        checked={resolvedValue !== null ? resolvedValue : record.resolved}
                                                        onChange={(e) => setResolvedValue(e.target.checked)}
                                                    />
                                                ) : (
                                                    record.resolved ? "Yes" : "No"
                                                )
                                                }

                                                <label class="switch">
                                                    <input type="checkbox"/>
                                                        <span class="slider round"></span>
                                                </label>
                                                </>
                                            </td> */}

                                            {/* <td>
                                                {isEditing === index ? (
                                                    <button
                                                        type="button"
                                                        className="btn update"
                                                        onClick={() => {
                                                            handleSaveClick(record.id, resolvedValue);
                                                            setIsEditing(null);
                                                        }}
                                                    >
                                                        Save
                                                    </button>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        className="btn update"
                                                        onClick={() => {
                                                            setIsEditing(index);
                                                            setResolvedValue(record.resolved);
                                                        }}
                                                    >
                                                        <i className="fa-solid fa-pen"></i>
                                                    </button>
                                                )}
                                            </td> */}
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



        </>
    );
}