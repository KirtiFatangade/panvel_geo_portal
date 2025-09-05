import React, { useState, useEffect, useRef } from 'react';
import FileSaver from 'file-saver';
import { HOST } from '../host';
import Modal from 'react-modal';
import "./viewsurvey.css";
import CreateSurveyForm from "./CreateSurveyForm";
import { logToServer } from '../logger';
import { toast } from 'react-toastify';

function ViewSurveyForm({ id }) {
  const [surveyData, setSurveyData] = useState([]);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSurvey, setSelectedSurvey] = useState(null);
  const [dataInputs, setDataInputs] = useState([]);
  const [responseData, setResponseData] = useState([]);
  const [isResponseVisible, setIsResponseVisible] = useState(false);
  const [isViewModel, setIsViewModel] = useState(false);
  const [selectedResponse, setSelectedResponse] = useState(null);
  const [userEmails, setUserEmails] = useState([]);
  const [selectedEmails, setSelectedEmails] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: '', direction: 'ascending' });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [currentResponsePage, setCurrentResponsePage] = useState(1);
  const [totalResponsePages, setTotalResponsePages] = useState(1);
  const [isCreateMode, setIsCreateMode] = useState(false);
  const [deleteSuccess, setDeleteSuccess] = useState(false);
  const itemsPerPage = 10;

  const fetchSurveyData = async () => {

    try {
      const response = await fetch(`${HOST}/view_survey_field_data/${id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch survey data');
      }
      const data = await response.json();
      setSurveyData(data.survey_data);

      console.log(data.survey_data);

      setTotalPages(Math.ceil(data.survey_data.length / itemsPerPage));
      logToServer('info', 'Fetching survey data');
    } catch (error) {
      logToServer('error', `${error}`);
      setError('Failed to fetch survey data. Please try again later.');
    }
  };


  const fetchSurveyResponses = async (id) => {
    try {
      const response = await fetch(`${HOST}/surveyfield/${id}/`);
      if (!response.ok) {
        throw new Error('Failed to fetch survey responses');
      }
      const data = await response.json();
      console.log("data", data.survey_data.response);

      const reversedData = data.survey_data.response.reverse();

      console.log("reversedData", reversedData);

      setResponseData(reversedData);   
      setIsResponseVisible(true);
      setTotalResponsePages(Math.ceil(data.survey_data.response.length / itemsPerPage));
      setError(false)
      logToServer('info', 'Fetching survey response successfully');
    } catch (error) {
      logToServer('error', `${error}`);
      setError('Failed to fetch survey responses. Please try again later.');
    }
  };

  const fetchResponseData = async (id, index) => {
    console.log("response id", id);
    try {
      const response = await fetch(`${HOST}/view-survey-response/${id}/${index}`);
     
      if (!response.ok) {
        throw new Error('Failed to fetch survey data');
      }
      const data = await response.json();
      setSelectedResponse(data.response);
      logToServer('info', 'Fetching survey data');
    } catch (error) {
      logToServer('error', `${error}`);
      setError('Failed to fetch survey Response. Please try again later.');
    }
  };


  const deleteResponse = async (id, index) => {

    const confirmed = window.confirm('Are you sure you want to delete this response?');
    if (!confirmed) {
      return;
    }
    try {
      const response = await fetch(`${HOST}/clear-survey-response/${id}/${index}`, {
        method: 'DELETE',
        credentials:'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (response.status === 200) {
        setDeleteSuccess(true);
        fetchSurveyResponses(id);
        toast.success("Deleted survey response successfully")
        console.log("Deleted survey response successfully");

      } else {
        console.log("Failed to delete survey response");
        toast.error("Failed to delete survey response. Please try again later");
      }
    } catch (error) {
      console.log(`Error: ${error}`);
      toast.error("Failed to delete survey response. Please try again later");
      setError('Failed to delete survey response. Please try again later.');
    }
  };


  const deleteAllResponse = async (id) => {
    console.log("id :", id);

    const confirmed = window.confirm('Are you sure you want to delete this response?');
    if (!confirmed) {
      return;
    }
    try {
      const response = await fetch(`${HOST}/clear-all-survey-response/${id}`, {
        method: 'DELETE',
        credentials:'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      if (response.status === 200) {
        setDeleteSuccess(true);
        fetchSurveyResponses(id);
        toast.success("Deleted survey response successfully")
        console.log("Deleted survey response successfully");
      } else {
        console.log("Failed to delete survey response");
        toast.error("Failed to delete survey response. Please try again later");
      }
    } catch (error) {
      console.log(`Error: ${error}`);
      toast.error("Failed to delete survey response. Please try again later");
      setError('Failed to delete survey response. Please try again later.');
    }
  };

  useEffect(() => {
    fetchSurveyData();
    fetchUserEmails();
  }, []);


  const handleDelete = async (id) => {
    // Show confirmation prompt
    const confirmed = window.confirm('Are you sure you want to delete this survey?');

    // If the user cancels, exit the function
    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(`${HOST}/delete_survey/${id}`, {
        method: 'DELETE', 
        credentials:'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete survey data');
      }

      // Update the state after successful deletion
      setSurveyData(surveyData.filter(survey => survey.id !== id));
      setTotalPages(Math.ceil((surveyData.length - 1) / itemsPerPage));
      logToServer('info', 'Deleted survey data successfully');
    } catch (error) {
      logToServer('error', `${error}`);
      setError('Failed to delete survey data. Please try again later.');
    }
  };


  const handleEdit = async (survey) => {
    setSelectedSurvey(survey);
    setDataInputs(survey.data_inputs);
    setIsModalOpen(true);
  };

  const handleView = (index) => {
    setSelectedResponse(null)
    fetchResponseData(selectedSurvey.id, index)
    setIsViewModel(true);
    setModalIsOpen(true);
  };



  const handleViewResponses = async (id) => {
    setSelectedSurvey({ "id": id })
    await fetchSurveyResponses(id);
  };

  const handleAcknowledge = () => {
    setIsResponseVisible(false);
  };

  const handleSave = async () => {
    try {
      const response = await fetch(`${HOST}/edit_survey_data_inputs/${selectedSurvey.id}/`, {
        method: 'PUT',
        credentials:'include',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ data_inputs: dataInputs, selected_email: selectedEmails })
      });
      if (!response.ok) {
        throw new Error('Failed to update survey data inputs');
      }
      setIsModalOpen(false);
      fetchSurveyData();
      logToServer('info', 'Edit survey form successfully');
    } catch (error) {
      logToServer('error', `${error}`);
      setError('Failed to update survey data inputs. Please try again later.');
    }
  };

  const handleInputChange = (index, key, value) => {
    const newDataInputs = [...dataInputs];
    newDataInputs[index][key] = value;
    setDataInputs(newDataInputs);
  };

  const handleOptionChange = (inputIndex, optionIndex, field, value) => {
    const newDataInputs = [...dataInputs];
    newDataInputs[inputIndex].options[optionIndex][field] = value;
    setDataInputs(newDataInputs);
  };

  const handleAddOption = (inputIndex) => {
    const newDataInputs = [...dataInputs];
    newDataInputs[inputIndex].options.push({ name: '', value: '' });
    setDataInputs(newDataInputs);
  };

  const handleDeleteOption = (inputIndex, optionIndex) => {
    const newDataInputs = [...dataInputs];
    newDataInputs[inputIndex].options.splice(optionIndex, 1);
    setDataInputs(newDataInputs);
  };

  const handleDownloadCsv = async (id) => {
    // Ask for the user's email
    const email = prompt("Please enter the email address:");

    // Validate the email format (basic validation)
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailPattern.test(email)) {
      alert("Please enter a valid email address.");
      return;
    }

    try {
      const response = await fetch(`${HOST}/survey/${id}/${email}`, {
        method: 'GET',
        // Send email in the request body
      });

      if (!response.ok) {
        alert("Error Generating CSV");
      } else {
        alert("CSV Generation Started. The file will be sent to the desired email shortly.");
      }

      logToServer('info', 'Downloading CSV successfully');
    } catch (error) {
      logToServer('error', `${error}`);
      setError('Failed to download CSV. Please try again later.');
    }
  };

  const handleAddField = () => {
    const newField = {
      title: '',
      type: '',
      options: []
    };
    setDataInputs([...dataInputs, newField]);
  };

  const handleDeleteField = (index) => {
    const newDataInputs = [...dataInputs];
    newDataInputs.splice(index, 1);
    setDataInputs(newDataInputs);
  };

  const isValidUrl = (string) => {
    try {
      const url = new URL(string);
      const truncatedUrl = `${url.protocol}//${url.hostname}${url.pathname.length > 20 ? url.pathname.substring(0, 20) + '...' : url.pathname}`;
      return truncatedUrl;
    } catch (_) {
      return false;
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const fetchUserEmails = () => {
    fetch(`${HOST}/fetch_emails/${id}`, {
      method: 'GET',
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error('Failed to fetch user emails');
        }
        return response.json();
      })
      .then((data) => {
        setUserEmails(data);
        logToServer('info', 'Fetched user emails successfully');
      })
      .catch((error) => {
        logToServer('error', `${error}`);
      });
  };

  const toggleDropdown = () => {
    setShowDropdown(!showDropdown);
  };

  const toggleEmail = (email) => {
    const isSelected = selectedEmails.includes(email);
    if (isSelected) {
      setSelectedEmails(selectedEmails.filter((selected) => selected !== email));
    } else {
      setSelectedEmails([...selectedEmails, email]);
    }
  };

  const filteredSurveyData = surveyData.filter((survey) =>
    survey.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (isResponseVisible &&
      responseData.some(
        (response) =>
          response.firstname.toLowerCase().includes(searchQuery.toLowerCase()) ||
          response.lastname.toLowerCase().includes(searchQuery.toLowerCase())
      ))
  );

  const sortSurveyData = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });

    const sortedData = [...surveyData].sort((a, b) => {
      if (a[key] < b[key]) {
        return direction === 'ascending' ? -1 : 1;
      }
      if (a[key] > b[key]) {
        return direction === 'ascending' ? 1 : -1;
      }
      return 0;
    });

    const reversedSortedData = sortedData.reverse();
    console.log('reversedSortedData',reversedSortedData);
    setSurveyData(reversedSortedData);
  };


  const getSortIcon = (key) => {
    if (sortConfig.key === key) {
      return sortConfig.direction === 'ascending' ? '▲' : '▼';
    }
    return ' ';
  };

  const paginate = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  const paginateResponses = (pageNumber) => {
    setCurrentResponsePage(pageNumber);
  };

  const toggleMode = () => {
    setIsCreateMode((prevMode) => !prevMode);
  };

  const currentItems = filteredSurveyData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const currentResponseItems = responseData.slice((currentResponsePage - 1) * itemsPerPage, currentResponsePage * itemsPerPage);

  return (
    <div style={{ height: '70vh' }}>
      {/* <div style={{ display: 'flex', flexDirection: "row-reverse" }}>
      <button
            onClick={toggleMode}
            className='add-btn'
            style={{
              backgroundColor: isCreateMode ? '#2c3e50' : '#2c3e50',
            }}
          >
            {"Create Survey"}

          </button>
        <input
          type="text"
          placeholder="Search Forms..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ marginLeft: '10px', padding: '5px', borderRadius: '3px', border: '1px solid #ccc', marginBottom: '8px' }}
        />
      </div> */}

      {/* Edited Design  */}
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
            onChange={(e) => setSearchQuery(e.target.value)}
            aria-describedby="basic-addon1"
          />
        </div>
        <button onClick={toggleMode} type="submit" className="m-1 add-btn">
          <i className="fa-solid fa-plus"></i> {"Create Survey"}
        </button>
        {isCreateMode && (
          <CreateSurveyForm id={id} setIsCreateMode={setIsCreateMode} />
        )}
      </div>

      {error && <div className='text-dark'>Error: {error}</div>}

      {!isResponseVisible && (
        <div className="all-tab-container">
          <div className="user-container">
            <div className="row">
              <div className="col-12">
                <table className="table w-100">
                  <thead className="thead-light" style={{ position: 'sticky', top: '0', zIndex: '1' }}>
                    <tr>
                      {/* <th onClick={() => sortSurveyData('id')}>
                  ID {getSortIcon('id')}
                </th> */}
                      <th onClick={() => sortSurveyData('user')}>
                        UserName {getSortIcon('user')}
                      </th>
                      <th onClick={() => sortSurveyData('name')}>
                        Form Name {getSortIcon('name')}
                      </th>
                      <th>
                        Count
                      </th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody className='tbody'>
                    {Array.isArray(currentItems) && currentItems.length > 0 ? (
                      currentItems.map((survey, index) => (
                        <React.Fragment key={survey.id}>
                          <tr>
                            {/* <td>{survey.id}</td> */}
                            <td>{survey.user}</td>
                            <td>{survey.name}</td>
                            <td>{survey.count}</td>
                            <td>
                              <button onClick={() => handleViewResponses(survey.id)} className='badd-btn' title='View Survey'>
                                <i className="fa fa-eye"></i>
                              </button>
                              <button onClick={() => handleEdit(survey)} className='add-btn' title='Edit Survey'>
                                <i className="fa fa-edit"></i>
                              </button>
                              <button onClick={() => handleDownloadCsv(survey.id)} className='add-btn' title='Download Survey'>
                                <i className="fa fa-download"></i>
                              </button>
                              <button onClick={() => handleDelete(survey.id)} className='btn-danger' title='Delete Survey'>
                                <i className="fa fa-trash"></i>
                              </button>
                            </td>
                          </tr>
                        </React.Fragment>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="4">No survey data available.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
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
        </div>
      )}

      {isResponseVisible && (
        <div>
          <div style={{ height: '5vh' }}>
            <button onClick={handleAcknowledge} style={{ position: 'sticky', top: '0', zIndex: '1', backgroundColor: '#2c3e50' }}>
              Back
            </button>
            <button onClick={() => deleteAllResponse(selectedSurvey.id)} style={{ position: 'sticky', top: '0', zIndex: '1', backgroundColor: 'red' }}>
              Clear All
            </button>
          </div>

          <div className="all-tab-container">
            <div className="user-container">
              <div className="row">
                <div className="col-12">
                  <table className="table w-100">
                    <thead style={{ position: 'sticky', top: '0', zIndex: '1', backgroundColor: '#f5f5f5' }}>
                      <tr>
                        <th >
                          Serial ID
                        </th>
                        {/* <th onClick={() => sortSurveyData('user_id')}>
                    User ID {getSortIcon('user_id')}
                  </th> */}
                        <th onClick={() => sortSurveyData('name')}>
                          Name {getSortIcon('name')}
                        </th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody className='tbody'>
                      {Array.isArray(currentResponseItems) && currentResponseItems.length > 0 ? (
                        currentResponseItems
                          .filter((response) =>
                            `${response.firstname} ${response.lastname}`.toLowerCase().includes(searchQuery.toLowerCase())
                          )
                          .map((response, index) => (
                            <tr key={response.index}>
                              <td>{index + 1}</td>
                              {/* <td>{response.user_id}</td> */}
                              <td>{response.firstname} {response.lastname}</td>
                              <td>
                                <button onClick={() => handleView(response.index)} >
                                  <i className="fa fa-eye" title='view response'></i>
                                </button>
                                <button onClick={() => deleteResponse(selectedSurvey.id, response.index)} className='btn-danger'>
                                  <i className="fa fa-trash" title='Delete response'></i>
                                </button>
                              </td>
                            </tr>
                          ))
                      ) : (
                        <tr>
                          <td colSpan="4">No responses available.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
          <div className="pagination">
            <button onClick={() => paginateResponses(currentResponsePage - 1)} disabled={currentResponsePage === 1}>&lt;</button>
            {currentResponsePage > 3 && <button onClick={() => paginateResponses(1)}>1</button>}
            {currentResponsePage > 4 && <span>...</span>}
            {currentResponsePage > 2 && <button onClick={() => paginateResponses(currentResponsePage - 2)}>{currentResponsePage - 2}</button>}
            {currentResponsePage > 1 && <button onClick={() => paginateResponses(currentResponsePage - 1)}>{currentResponsePage - 1}</button>}
            <button className="current-page">{currentResponsePage}</button>
            {currentResponsePage < totalResponsePages && <button onClick={() => paginateResponses(currentResponsePage + 1)}>{currentResponsePage + 1}</button>}
            {currentResponsePage < totalResponsePages - 1 && <button onClick={() => paginateResponses(currentResponsePage + 2)}>{currentResponsePage + 2}</button>}
            {currentResponsePage < totalResponsePages - 3 && <span>...</span>}
            {currentResponsePage < totalResponsePages - 2 && <button onClick={() => paginateResponses(totalResponsePages)}>{totalResponsePages}</button>}
            <button onClick={() => paginateResponses(currentResponsePage + 1)} disabled={currentResponsePage === totalResponsePages}>&gt;</button>
          </div>
        </div>
      )}
      {isModalOpen && (
        <div className='col-lg-3 col-sm-2 custom-modal' style={{ margin: '-3% 10%', zIndex: '10000', maxHeight: '60vh' }}>
          <div className="user-modal-header">
            <i className="fa-solid fa-xmark cancel" onClick={() => setIsModalOpen(false)}>
            </i>
          </div>


          <div className="col-lg-12 col-md-6 col-sm-10 mt-2">
            <span style={{ color: 'black' }}>Select User Emails:</span>
            <div style={{ position: 'relative', }}>
              <button onClick={toggleDropdown} style={{ marginBottom: '10px' }}>
                {showDropdown ? 'Hide' : 'Show'} Emails
              </button>
              {showDropdown && (
                <div ref={dropdownRef} className="email-dropdown form-control">
                  {userEmails.map((email, index) => (
                    <label key={index} style={{ display: 'block' }}>
                      <input
                        type="checkbox"

                        checked={selectedEmails.includes(email)}
                        onChange={() => toggleEmail(email)}
                      />{' '}
                      {email}
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
          {dataInputs.map((input, index) => (
            <div key={index} className='mt-5' style={{ marginBottom: '15px', display: 'flex', alignItems: 'center', color: 'black' }}>
              <div style={{ flex: 1 }}>
                <h6 style={{ marginBottom: '5px' }}>Field {index + 1}</h6>
                <label style={{ marginRight: '10px' }}>Title:</label>
                <input
                  type="text"
                  name="title"
                  value={input.title}
                  onChange={(e) => handleInputChange(index, 'title', e.target.value)}
                  style={{
                    padding: '5px',
                    fontSize: '14px',
                    border: '1px solid #ccc',
                    borderRadius: '5px',
                  }}
                />
                <label style={{ marginLeft: '10px', marginRight: '10px' }}>Type:</label>
                <select
                  name="type"
                  value={input.type}
                  onChange={(e) => handleInputChange(index, 'type', e.target.value)}
                  style={{
                    padding: '5px',
                    fontSize: '14px',
                    border: '1px solid #ccc',
                    borderRadius: '5px',
                  }}
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
                <button onClick={() => handleDeleteField(index)} style={{ marginLeft: '10px', backgroundColor: 'red' }}>
                  <i className="fa fa-trash"></i>
                </button>

                {input.type === 'radio' && (
                  <div style={{ marginTop: '5px', marginLeft: '2vh' }}>
                    <h6 style={{ marginBottom: '5px' }}>Options:</h6>
                    {input.options.map((option, optionIndex) => (
                      <div key={optionIndex} style={{ marginBottom: '5px', display: 'flex', alignItems: 'center' }}>
                        <input
                          type="radio"
                          checked={option.value === input.selectedOption}
                          onChange={() => handleOptionChange(index, optionIndex, 'value', option.value)}
                          style={{ marginRight: '5px' }}
                        />
                        <input
                          type="text"
                          value={option.name}
                          onChange={(e) => handleOptionChange(index, optionIndex, 'name', e.target.value)}
                          placeholder="Option Name"
                          style={{ marginRight: '5px' }}
                        />
                        <button
                          onClick={() => handleDeleteOption(index, optionIndex)}
                          style={{ marginLeft: '5px' }}
                        >
                          Delete Option
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => handleAddOption(index)}
                      style={{ marginTop: '5px' }}
                    >
                      Add Option
                    </button>
                  </div>
                )}

                {input.type === 'checkbox' && (
                  <div style={{ marginTop: '5px', marginLeft: '2vh' }}>
                    <h6 style={{ marginBottom: '5px' }}>Options:</h6>
                    {input.options.map((option, optionIndex) => (
                      <div key={optionIndex} style={{ marginBottom: '5px', display: 'flex', alignItems: 'center' }}>
                        <input
                          type="checkbox"
                          checked={option.checked}
                          onChange={(e) => handleOptionChange(index, optionIndex, 'checked', e.target.checked)}
                          style={{ marginRight: '5px' }}
                        />
                        <input
                          type="text"
                          value={option.name}
                          onChange={(e) => handleOptionChange(index, optionIndex, 'name', e.target.value)}
                          placeholder="Option Name"
                          style={{ marginRight: '5px' }}
                        />
                        <button
                          onClick={() => handleDeleteOption(index, optionIndex)}
                          style={{ marginLeft: '5px' }}
                        >
                          Delete Option
                        </button>
                      </div>
                    ))}
                    <button
                      onClick={() => handleAddOption(index)}
                      style={{ marginTop: '5px' }}
                    >
                      Add Option
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}

          <div style={{ textAlign: 'left', marginTop: '10px' }}>
            <button onClick={handleAddField} style={{ marginTop: '10px' }}>
              Add Field
            </button>
            <button onClick={handleSave}>Save</button>
            <button onClick={() => setIsModalOpen(false)} style={{ backgroundColor: 'red' }}>
              Cancel
            </button>
          </div>
        </div>



      )}

      {isViewModel && (
        <>

          <Modal
            isOpen={modalIsOpen}
            onRequestClose={() => setModalIsOpen(false)}
            contentLabel="Update User Modal"
            className='col-lg-2 col-sm-2 custom-modal'
            style={{ zIndex: '1' }}
          >
            <div className="mt-2 user-modal-header" style={{ justifyContent: 'flex-start' }}>
              <h4 style={{ color: "black" }}>Survey Response Details</h4>
            </div>

            <form className="col-lg-12 col-md-6 col-sm-10">
              {!selectedResponse ? (
                // Loader while waiting for selectedResponse
                <div style={{ textAlign: 'center', marginTop: '20px' }}>
                  <div className="loader"></div>
                  <p style={{ color: 'black' }}>Loading response details...</p>
                </div>
              ) : (
                <div style={{ marginBottom: '15px' }}>
                  <h6 style={{ color: "black" }}>
                    Response from: {selectedResponse.firstname} {selectedResponse.lastname}
                  </h6>
                  <p style={{ color: "black", margin: '0px 0px' }}><strong>User ID:</strong> {selectedResponse.user_id}</p>

                  {Object.entries(selectedResponse.response).map(([key, value]) => (
                    <div style={{ color: "black" }} key={key}>
                      <strong>{key}:</strong>
                      {typeof value === 'string' && value.includes('media/survey_response') ? (
                        <img
                          src={`http://localhost:8000/${value}`}
                          alt={key}
                          style={{ maxWidth: '100px', maxHeight: '100px' }}
                        />
                      ) : typeof value === 'string' && isValidUrl(value) ? (
                        <a href={value} target="_blank" rel="noopener noreferrer">
                          {value}
                        </a>
                      ) : (
                        typeof value === 'object' ? JSON.stringify(value) : value
                      )}
                    </div>
                  ))}
                </div>
              )}
            </form>
            <div className="modal-footer">
              <button
                onClick={() => setIsViewModel(false)}
                className='mt-2 btn-add bg-danger'
              >
                Close
              </button>


            </div>

          </Modal>

          {/* <div className="modal" style={{ display: 'block', marginTop: '240px' }}>
            <div style={{ marginLeft: '30%', marginRight: '30%' }}>
              <div className="modal-content">
                <h2 style={{ color: "black" }}>Survey Response Details</h2>

                {!selectedResponse ? (
                  // Loader while waiting for selectedResponse
                  <div style={{ textAlign: 'center', marginTop: '20px' }}>
                    <div className="loader"></div>
                    <p style={{ color: 'black' }}>Loading response details...</p>
                  </div>
                ) : (
                  <div style={{ marginBottom: '15px' }}>
                    <h4 style={{ color: "black" }}>
                      Response from: {selectedResponse.firstname} {selectedResponse.lastname}
                    </h4>
                    <p style={{ color: "black" }}>User ID: {selectedResponse.user_id}</p>

                    {Object.entries(selectedResponse.response).map(([key, value]) => (
                      <div style={{ color: "black" }} key={key}>
                        <strong>{key}:</strong>
                        {typeof value === 'string' && value.includes('media/survey_response') ? (
                          <img
                            src={`http://localhost:8000/${value}`}
                            alt={key}
                            style={{ maxWidth: '100px', maxHeight: '100px' }}
                          />
                        ) : typeof value === 'string' && isValidUrl(value) ? (
                          <a href={value} target="_blank" rel="noopener noreferrer">
                            {value}
                          </a>
                        ) : (
                          typeof value === 'object' ? JSON.stringify(value) : value
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <button
                  onClick={() => setIsViewModel(false)}
                  style={{
                    marginTop: '10px',
                    padding: '10px 20px',
                    fontSize: '16px',
                    backgroundColor: '#f44336',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer',
                    marginLeft: '30%',
                    marginRight: '30%'
                  }}
                >
                  Close
                </button>
              </div>
            </div>
          </div> */}
        </>
      )}

    </div>
  );
}

export default ViewSurveyForm;