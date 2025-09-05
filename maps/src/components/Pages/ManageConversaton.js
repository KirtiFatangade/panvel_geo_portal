import React, { useState, useEffect, useContext } from "react";
import {HOST_CHATBOT_APP_URL} from "../host";
import ShowOldConversation from "./ShowOldConversation";
import "./viewsurvey.css";
import { ToastContainer, toast } from 'react-toastify';
import { GlobalContext } from "../../App";
import { logToServer } from '../logger'
export default function ManageConversation({ id }) {
    const [modalIsOpen, setModalIsOpen] = useState(false);
    const [conversations, setConversations] = useState([]);
    const { userInfo } = useContext(GlobalContext);
    const [idFetch, setId] = useState(null);
    const [showOldChat, setshowOldChat] = useState(false);
    const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });

    useEffect(() => {
        fetchConversation(id);
    }, [id]);

    const fetchConversation = async (id) => {
        try {
            const response = await fetch(`${HOST_CHATBOT_APP_URL}/list-conversations/${id}`, {
                method: "GET",
                headers: {
                    'Authorization': `Bearer ${sessionStorage.getItem('access_token')}`,
                },
            });
            if (!response.ok) {
                throw new Error('Failed to fetch conversation');
            }
            const data = await response.json();
            logToServer('info', 'Fetching conversation successfully');
            const conversationsWithFormattedDate = data.conversations.map((conversation, index) => ({
                ...conversation,
                serial: index + 1,
                created_at: conversation.created_at.split(' ')[0] // Extracting only the date part
            }));
            setConversations(conversationsWithFormattedDate);
        } catch (error) {
            logToServer('error', `Error fetching conversation: ${error}`);
        }
    };
    const deleteConversation = async (chatId) => {
        if (window.confirm("Are you sure you want to delete this Conversation?")) {
            try {
                const response = await fetch(`${HOST_CHATBOT_APP_URL}/delete-conversation/${id}/${chatId}`);
                if (response.ok) {
                    logToServer('info', 'Conversation deleted successfully');
                    fetchConversation(id);
                } else {
                    throw new Error("Failed to delete Conversation");
                }
            } catch (error) {
                console.error("Error deleting Conversation:", error);
                logToServer('error', `Error deleting Conversation: ${error}`);
            }
        }
    };
    const sortBy = (key) => {
        let direction = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };
    useEffect(() => {
        if (sortConfig.key !== null) {
            const sortedConversations = [...conversations].sort((a, b) => {
                if (a[sortConfig.key] < b[sortConfig.key]) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (a[sortConfig.key] > b[sortConfig.key]) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
                return 0;
            });
            setConversations(sortedConversations);
        }
    }, [sortConfig]);
    
    const handleView = (e, userId) => {
        e.preventDefault();
        e.stopPropagation();
        setshowOldChat(true);
        setId(userId);
    };
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (
                event.target.closest(".chatbot-window") === null &&
                event.target.closest(".chat-btn") === null
            ) {
                setshowOldChat(false);
            }
        };
        document.addEventListener("click", handleClickOutside);
        return () => {
            document.removeEventListener("click", handleClickOutside);
        };
    }, []);
    const getSortIcon = (key) => {
        if (sortConfig.key === key) {
            return sortConfig.direction === 'ascending' ? '▲' : '▼';
        }
        return null;
    };
    return (
        <>
            <div className="all-tab-container">
                <div className="user-container">
                    <div className="row">
                        <div className="col-12">
                            <table className="table w-100">
                                <thead className="thead-light">
                                    <tr>
                                        <th onClick={() => sortBy('username')}>Username {getSortIcon('username')}</th>
                                        <th onClick={() => sortBy('created_at')}>Chat Created At {getSortIcon('created_at')}</th>
                                        <th onClick={() => sortBy('created_at')}>Mode {getSortIcon('created_at')}</th>
                                        <th onClick={() => sortBy('total_messages')}>Total Messages {getSortIcon('total_messages')}</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="tbody">
                                    {conversations.map((conversation) => (
                                        <tr key={conversation.chat_id}>
                                            <td>{userInfo.username}</td>
                                            {/* <td>{conversation.serial}</td> */}
                                            <td>{conversation.created_at}</td>
                                            <td>
                                                {conversation.mode === 1
                                                    ? "Perform Spatial Analysis"
                                                    : conversation.mode === 2
                                                        ? "Help & Support"
                                                        : conversation.mode === 3
                                                            ? "Automated Actions"
                                                            : "Unknown Mode"}
                                            </td>
                                            <td>{conversation.total_messages}</td>
                                            <td className="d-flex">
                                                <button type="submit" className="btn update text-white" data-toggle="modal" data-target=".bd-example-modal-lg"
                                                    onClick={(e) => handleView(e, conversation.chat_id)}>
                                                    <i className="fa fa-eye"></i>
                                                </button>
                                                <button type="submit" className="btn btn-danger" onClick={() => deleteConversation(conversation.chat_id)}>
                                                    <i className="fa fa-trash"></i>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
                {showOldChat && idFetch && (
                    <div className="chatbot-window" style={{ position: 'absolute', zIndex: '1000', top: '45%', left: '50%', transform: 'translate(-50%, -50%)', boxShadow: '1px 2px 9px 3px #383838' }}>
                        <ShowOldConversation idFetch={idFetch} setshowOldChat={setshowOldChat} />
                        {/* <button type="submit" className='cancel' style={{ marginLeft: '80%' }} onClick={() => { setshowOldChat(false) }}>Close</button> */}
                    </div>
                )}
            </div>
        </>




    )
}