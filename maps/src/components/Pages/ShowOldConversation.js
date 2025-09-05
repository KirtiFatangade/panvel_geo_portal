import React, { useEffect, useState, useContext } from 'react';
import Markdown from 'react-markdown';
import files from '../static';
import { HOST, HOST_CHATBOT_APP_URL } from "../host";
import { GlobalContext } from '../../App';
import { logToServer } from '../logger';


export default function ShowOldConversation({ idFetch, setshowOldChat }) {
    const [chatHistory, setChatHistory] = useState([]);
    const [promptMessage, setPromptMessage] = useState("");
    const [responseText, setResponseText] = useState("");
    const [previousChatId, setPreviousChatId] = useState("");
    const { userInfo, getCsrfToken } = useContext(GlobalContext);


    useEffect(() => {
        const fetchData = async () => {
            try {
                await fetchChatHistory(userInfo.id, idFetch);
            } catch (error) {
                console.error("Error fetching chat data:", error);
            }
        };

        fetchData(userInfo.id, idFetch);
    }, [userInfo.id, idFetch]);


    const fetchChatHistory = async (id, chatId) => {
        try {
            const response = await fetch(`${HOST_CHATBOT_APP_URL}/get-chat-history/${id}/${chatId}`, {
                
                credentials: 'include',
                
            });
            if (!response.ok) {
                throw new Error('Failed to fetch chat history');
            }
            logToServer('info', 'fetching chat history Successfully')
            const data = await response.json();
            setChatHistory(data.his);
        } catch (error) {
            console.error("Error fetching chat history:", error);
            logToServer('error', `${error}`)
        }
    };


    return (
        <>
            <div className="chatbot-section-container">
                {/* <div className="row d-flex justify-content-center border-0" style={{ maxHeight: '500px' }}>
                    <div className="col-md-9 col-lg-12 col-sm-9 col-xl-12" style={{ overflowY: 'hidden', position: 'relative', minHeight: "500px" }}> */}

                {/* <div className="card" id="chat1" style={{ borderRadius: "15px", overflowY: 'scroll', borderStyle: "none", maxHeight: '500px' }}> */}
                <div className="chatbot-chat-section" style={{ maxHeight: '550px', overflow: 'hidden', overflowY: 'scroll' }}>
                    {chatHistory && Array.isArray(chatHistory) && chatHistory.map((child) => (
                        <div style={{ position: 'relative' }} className={`d-flex flex-row justify-content-${child.sender === 'user' ? 'end' : 'start'} mb-4`}>
                            {child.sender === 'user' ? (
                                <>
                                    <div className="p-3 ms-3 position-relative" style={{ borderRadius: "15px", backgroundColor: "rgba(57, 192, 237, 0.2)", minWidth: "120px" }}>
                                        <p className="small mb-0 text-dark" >{child.text}</p>
                                    </div>
                                    <img src={`${process.env.PUBLIC_URL}/${files}userprofile.png`} alt="avatar 1" style={{ width: "35px", height: "100%", marginLeft: '2%' }} />
                                </>
                            ) : (
                                <>
                                    <img src={`${process.env.PUBLIC_URL}/${files}chatbot.png`} alt="avatar 1" style={{ width: "35px", height: "100%" }} />
                                    <div className="p-3 me-3 border" style={{ borderRadius: "15px", backgroundColor: "#fbfbfb", maxWidth: '70%' }}>
                                        <p className="small mb-0 text-dark" style={{ maxWidth: '100%', overflowWrap: 'break-word' }}><Markdown>{child.text}</Markdown></p>
                                    </div>

                                </>
                            )}
                        </div>
                    ))}
                </div>
                <div className="chatbot-footer-section">
                    <button type="submit" className='mt-2 mb-2 close-chatbot btn-danger' style={{ marginLeft: '80%' }} onClick={() => { setshowOldChat(false) }}>Close</button>
                </div>
                {/* </div> */}
                {/* </div>
                </div> */}
            </div>
        </>
    )
}