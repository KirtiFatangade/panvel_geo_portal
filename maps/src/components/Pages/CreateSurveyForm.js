// src/components/CreateSurveyForm.js

import React, { useEffect, useState, useRef, useContext } from "react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { HOST } from "../host";
// import log from '../logger.js';
import './Createsurvey.css';
import log, { logToServer } from '../logger.js';
import Modal from 'react-modal';
import { GlobalContext } from '../../App.js';

const CreateSurveyForm = ({ id,setIsCreateMode }) => {
  const [dataInputs, setDataInputs] = useState([{ title: '', type: '', options: [], errors: { title: false, type: false, options: [] } }]);
  const [surveyName, setSurveyName] = useState('');
  const [userEmails, setUserEmails] = useState([]);
  const [selectedEmails, setSelectedEmails] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const {getCsrfToken}=useContext(GlobalContext);

  useEffect(() => {
    fetchUserEmails();
  }, [id]);

  const fetchUserEmails = () => {
    fetch(`${HOST}/fetch_emails/${id}`)
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to fetch user emails");
        }
        return response.json();
      })
      .then((data) => {
        setUserEmails(data);
        logToServer("info", "Fetch All Emials join with Same Organization"); // Log to server
      })
      .catch((error) => {
        const errorMessage = "Error fetching user emails";
        logToServer(
          "error",
          `Error creating survey form Failed to Fetch user Emails: ${error}`
        ); // Log error to server
        toast.error("Failed to fetch user emails");
      });
  };

  const toggleDropdown = () => {
    setShowDropdown(!showDropdown);
  };

  const toggleEmail = (email) => {
    setSelectedEmails((prevSelected) => {
      if (prevSelected.includes(email)) {
        return prevSelected.filter((selected) => selected !== email);
      } else {
        return [...prevSelected, email];
      }
    });
  };

  const handleAddInput = () => {
    setDataInputs((prevInputs) => [
      ...prevInputs,
      {
        title: "",
        type: "",
        options: [],
        errors: { title: false, type: false, options: [] },
      },
    ]);
  };

  const handleDeleteInput = (index) => {
    if (dataInputs.length > 1) {
      setDataInputs((prevInputs) => {
        const newDataInputs = [...prevInputs];
        newDataInputs.splice(index, 1);
        return newDataInputs;
      });
    }
  };

  const handleChange = (index, event) => {
    const { name, value } = event.target;
    setDataInputs((prevInputs) => {
      const newDataInputs = [...prevInputs];
      newDataInputs[index][name] = value;
      newDataInputs[index].errors[name] = value === "";
      return newDataInputs;
    });
  };

  const handleOptionChange = (inputIndex, optionIndex, event) => {
    const { value } = event.target;
    setDataInputs((prevInputs) => {
      const newDataInputs = [...prevInputs];
      newDataInputs[inputIndex].options[optionIndex].name = value;
      newDataInputs[inputIndex].errors.options[optionIndex] = value === "";
      return newDataInputs;
    });
  };

  const handleAddOption = (inputIndex) => {
    setDataInputs((prevInputs) => {
      const newDataInputs = prevInputs.map((input, idx) => {
        if (idx === inputIndex) {
          return {
            ...input,
            options: [...input.options, { name: "" }],
            errors: {
              ...input.errors,
              options: [...input.errors.options, false],
            },
          };
        }
        return input;
      });
      return newDataInputs;
    });
  };

  const handleDeleteOption = (inputIndex, optionIndex) => {
    setDataInputs((prevInputs) => {
      const newDataInputs = [...prevInputs];
      newDataInputs[inputIndex].options.splice(optionIndex, 1);
      newDataInputs[inputIndex].errors.options.splice(optionIndex, 1);
      return newDataInputs;
    });
  };

  const handleSurveyNameChange = (event) => {
    setSurveyName(event.target.value);
  };

  const handleSaveData = async () => {
    if (selectedEmails.length === 0) {
      toast.error("Please select at least one email.");
      return;
    }

    let hasError = false;
    const newDataInputs = [...dataInputs];

    newDataInputs.forEach((input, index) => {
      if (input.title === "") {
        hasError = true;
        newDataInputs[index].errors.title = true;
      }
      if (input.type === "") {
        hasError = true;
        newDataInputs[index].errors.type = true;
      }
      if (["radio", "checkbox"].includes(input.type)) {
        input.options.forEach((option, optionIndex) => {
          if (option.name === "") {
            hasError = true;
            newDataInputs[index].errors.options[optionIndex] = true;
          }
        });
      }
    });

    if (hasError) {
      setDataInputs(newDataInputs);
      toast.error("Please complete all fields and options.");
      return;
    }

    const surveyData = {
      surveyName,
      dataInputs,
      selectedEmails,
    };

    fetch(`${HOST}/create_survey_form/${id}`, {
      method: 'POST',
      credentials:'include',
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": await getCsrfToken(),
      },
      body: JSON.stringify(surveyData),
    })
      .then((response) => {
        if (!response.ok) {
          toast.error("Network response was not ok");
          throw new Error("Network response was not ok");
        }
        return response.json();
      })
      .then((data) => {
        toast.success(
          `${surveyName} Survey form has been created successfully!`
        );
        setSurveyName("");
        setDataInputs([
          {
            title: "",
            type: "",
            options: [],
            errors: { title: false, type: false, options: [] },
          },
        ]);
        setSelectedEmails([]);
        logToServer('info', 'Survey form created successfully');
      })
      .catch((error) => {
        toast.error('There was an error creating the survey form!');
        logToServer('error', `Error creating survey form: ${error}`); 
      });
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);
  const modalStyles = {
    overlay: {
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      zIndex: 1000,
    },
    content: {
      background: '#fff',
      padding: '20px',
      borderRadius: '8px',
      maxWidth: '500px',
      width: '100%',
      maxHeight: '80vh', 
      overflowY: 'auto', 
      boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
      position: 'relative',
      margin: 'auto',
      marginTop: '10%',
    },
  };
  return (
    <Modal
      isOpen={true}
      onRequestClose={() => setIsCreateMode(false)}
      style={modalStyles}
      className="col-lg-2 col-sm-2 custom-modal"
      contentLabel="Create User Modal"
    >
      <div className="survey-form-container">
        <h2 className="form-title">Create Survey Form</h2>

        <div className="form-section">
          <label className="form-label">Survey Form Name:</label>
          <input
            type="text"
            name="surveyName"
            value={surveyName}
            onChange={handleSurveyNameChange}
            className="form-input"
          />
        </div>

        <div className="form-section">
          <h4 className="form-label">Select User Emails:</h4>
          <div className="dropdown-container">
            <button className="dropdown-button" onClick={toggleDropdown}>
              {showDropdown ? "Hide Emails" : "Select Emails"}
            </button>
            {showDropdown && (
              <div className="email-dropdown" ref={dropdownRef}>
                {userEmails.map((email, index) => (
                  <div key={index} className="email-item">
                    <input
                      type="checkbox"
                      id={`email-${index}`}
                      value={email}
                      checked={selectedEmails.includes(email)}
                      onChange={() => toggleEmail(email)}
                    />
                    <label htmlFor={`email-${index}`}>{email}</label>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="form-section">
          <h4 className="form-label">Survey Fields:</h4>
          <div className="fields-container">
            {dataInputs.map((input, index) => (
              <div key={index} className="field-item">
                <div className="field-header">
                  <h6>Field {index + 1}</h6>
                  <button
                    className="delete-button"
                    onClick={() => handleDeleteInput(index)}
                  >
                    Delete Field
                  </button>
                </div>
                <div className="field-content">
                  <label className="form-label">Title:</label>
                  <input
                    type="text"
                    name="title"
                    value={input.title}
                    onChange={(e) => handleChange(index, e)}
                    className={`form-input ${
                      input.errors.title ? "error" : ""
                    }`}
                  />
                  {input.errors.title && (
                    <div className="error-message">Title is required</div>
                  )}
                  <label className="form-label">Type:</label>
                  <select
                    name="type"
                    value={input.type}
                    onChange={(e) => handleChange(index, e)}
                    className={`form-input ${input.errors.type ? "error" : ""}`}
                  >
                    <option value="">Select Type</option>
                    <option value="text">Text</option>
                    <option value="number">Number</option>
                    <option value="date">Date</option>
                    <option value="time">Time</option>
                    <option value="location">Location</option>
                    <option value="media">Media</option>
                    <option value="radio">Single Option</option>
                    <option value="checkbox">Multiple Option</option>
                  </select>
                  {input.errors.type && (
                    <div className="error-message">Type is required</div>
                  )}
                  {["radio", "checkbox"].includes(input.type) && (
                    <div className="options-container">
                      <h6>Options:</h6>
                      {input.options.map((option, optionIndex) => (
                        <div key={optionIndex} className="option-item">
                          <input
                            type="text"
                            value={option.name}
                            onChange={(e) =>
                              handleOptionChange(index, optionIndex, e)
                            }
                            placeholder="Option Name"
                            className={`form-input ${
                              input.errors.options[optionIndex] ? "error" : ""
                            }`}
                          />
                          {input.errors.options[optionIndex] && (
                            <div className="error-message">
                              Option name is required
                            </div>
                          )}
                          <button
                            className="delete-option"
                            onClick={() =>
                              handleDeleteOption(index, optionIndex)
                            }
                          >
                            Delete
                          </button>
                        </div>
                      ))}
                      <button
                        className="add-option"
                        onClick={() => handleAddOption(index)}
                      >
                        Add Option
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="form-section">
          <button className="add-field" onClick={handleAddInput}>
            Add Field
          </button>
          <button className="save-button" onClick={handleSaveData}>
            Save Survey
          </button>
        </div>
      </div>

      <ToastContainer />
    </Modal>
  );
};

export default CreateSurveyForm;
