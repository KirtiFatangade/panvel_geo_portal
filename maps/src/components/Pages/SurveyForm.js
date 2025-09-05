import React, { useState, useEffect, useContext, useRef } from 'react';
import { ToastContainer, toast } from 'react-toastify';
import { HOST } from '../host';
import Modal from 'react-modal';
import { logToServer } from '../logger';
import './Survey.css'
import { isMobile } from 'react-device-detect';
import { GlobalContext } from '../../App';
const SurveyForm = ({ id, email, toggleModal, initialLat, initialLng }) => {
  const { getCsrfToken } = useContext(GlobalContext)
  const [surveyForms, setSurveyForms] = useState([]);
  const [selectedForm, setSelectedForm] = useState('');
  const [formData, setFormData] = useState({});
  const [mediaStream, setMediaStream] = useState(null);
  const [showCamera, setShowCamera] = useState({});
  const [isCapturingMedia, setIsCapturingMedia] = useState({});
  const [isFrontCamera, setIsFrontCamera] = useState(false);

  useEffect(() => {
    console.log("User email:", email);
    fetchSurveyData();
  }, []);

  const fetchSurveyData = async () => {
    try {
      const response = await fetch(`${HOST}/get_survey_forms/${id}`, {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error('Failed to fetch survey data');
      }
      const data = await response.json();
      const validForms = data.filter(form => form.selected_emails.includes(email));
      if (validForms.length === 0) {
        alert('Survey form not share by Organization');
        toggleModal();
        return;
      }
      setSurveyForms(validForms);
      if (validForms.length > 0) {
        setSelectedForm(validForms[0].name);
        initializeFormData(validForms[0]);
      }
      logToServer('info', 'Fetching Survey data successfully');
    } catch (error) {
      logToServer('error', `${error}`);
    }
  };




  const initializeFormData = (form) => {
    const initialFormData = {};
    form.data_inputs.forEach(input => {
      if (input.type === 'checkbox') {
        initialFormData[input.title] = [];
      } else if (input.type === 'location') {
        initialFormData[input.title] = {
          lat: initialLat || '',
          long: initialLng || ''
        };
      } else if (input.type === 'media') {
        initialFormData[input.title] = null;
      } else {
        initialFormData[input.title] = '';
      }
    });
    setFormData(initialFormData);
  };

  const handleFormChange = (event) => {
    const selectedName = event.target.value;
    setSelectedForm(selectedName);
    const selectedFormData = surveyForms.find(form => form.name === selectedName);
    initializeFormData(selectedFormData);
  };

  const handleInputChange = (title, value) => {
    setFormData(prevFormData => ({
      ...prevFormData,
      [title]: value
    }));
  };

  const handleCheckboxChange = (title, value) => {
    setFormData(prevFormData => {
      const currentValues = prevFormData[title] || [];
      if (currentValues.includes(value)) {
        return {
          ...prevFormData,
          [title]: currentValues.filter(item => item !== value)
        };
      } else {
        return {
          ...prevFormData,
          [title]: [...currentValues, value]
        };
      }
    });
  };



  const handleLocationChange = (event, title, field) => {
    const { value } = event.target;
    setFormData(prevState => ({
      ...prevState,
      [title]: {
        ...prevState[title],
        [field]: value
      }
    }));
  };




  const captureImage = (title) => {
    const video = document.querySelector('video');
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    const imageUrl = canvas.toDataURL('image/png');
    setFormData(prevFormData => ({
      ...prevFormData,
      [title]: imageUrl
    }));
    stopCapture(title);
  };

  const startCapture = async (title) => {
    try {
      console.log(title)
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: isFrontCamera ? 'user' : 'environment' } });
      setMediaStream(stream);
      setShowCamera(prevFormData => ({
        ...prevFormData,
        [title]: true
      }));
      setIsCapturingMedia(prevFormData => ({
        ...prevFormData,
        [title]: true
      }));
      setFormData(prevFormData => ({
        ...prevFormData,
        [title]: null
      }));
    } catch (error) {
      console.error('Error accessing webcam:', error);
      toast.error('Failed to access webcam');
    }
  };

  const stopCapture = (title) => {
    if (mediaStream) {
      mediaStream.getTracks().forEach(track => track.stop());
      setIsCapturingMedia(prevFormData => ({
        ...prevFormData,
        [title]: false
      }));
      setShowCamera(prevFormData => ({
        ...prevFormData,
        [title]: false
      }));
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (Object.values(isCapturingMedia).some(isCapturing => isCapturing)) {
      return;
    }
    try {
      const payload = {
        user_id: id,
        name: selectedForm,
        response: { ...formData }
      };

      const response = await fetch(`${HOST}/survey_form_submit`, {
        method: 'POST',
        credentials:'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': await getCsrfToken(),
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error('Failed to submit survey');
      }

      const selectedFormData = surveyForms.find(form => form.name === selectedForm);
      if (selectedFormData) {
        initializeFormData(selectedFormData);
      } else {
        setFormData({});
      }
      logToServer('info', 'Survey submitted successfully')
      toast.success('Survey submitted successfully!');
    } catch (error) {
      logToServer('error', `${error}`)
      toast.error('Failed to submit survey');
    }
  };

  const renderFormFields = () => {
    const selectedFormObj = surveyForms.find(form => form.name === selectedForm);
    if (!selectedFormObj) return null;
    return selectedFormObj.data_inputs.map(input => {
      switch (input.type) {
        case 'radio':
          return (
            <div key={input.title} style={inputContainer}>
              <label style={labelStyle} className='text-capitalize fw-bold'>{input.title}</label>
              {input.options.map(option => (
                <div key={option.name}>
                  <input
                    type="radio"
                    name={input.title}
                    value={option.name}
                    checked={formData[input.title] === option.name}
                    onChange={() => handleInputChange(input.title, option.name)}
                    style={{ marginRight: '1vh' }}
                  />
                  <label>{option.name}</label>
                </div>
              ))}
            </div>
          );
        case 'checkbox':
          return (
            <div key={input.title} style={inputContainer}>
              <label style={labelStyle} className='text-capitalize fw-bold'>{input.title}</label>
              {input.options.map(option => (
                <div key={option.name}>
                  <input
                    type="checkbox"
                    name={input.title}
                    value={option.name}
                    checked={formData[input.title]?.includes(option.name)}
                    onChange={() => handleCheckboxChange(input.title, option.name)}
                    style={{ marginLeft: '2%' }}
                  />
                  <label>{option.name}</label>
                </div>
              ))}
            </div>
          );
        case 'location':
          return (
            <div key={input.title} style={inputContainer}>
              <label style={labelStyle} className='text-capitalize fw-bold'>{input.title}</label>
              <div>
                <input
                  type="text"
                  placeholder="Latitude"
                  value={formData[input.title].lat || ''}
                  onChange={(e) => handleLocationChange(e, input.title, 'lat')}
                  className='form-control'
                  disabled
                />
                <input
                  type="text"
                  placeholder="Longitude"
                  value={formData[input.title].long || ''}
                  onChange={(e) => handleLocationChange(e, input.title, 'long')}
                  className='mt-1 form-control'
                  disabled
                />
              </div>
            </div>
          );
        case 'media':
          return (
            <div key={input.title} style={inputContainer}>
              <label style={labelStyle} className='text-capitalize fw-bold'>{input.title}</label>
              <div>
                {formData[input.title] && (
                  <div style={{ marginBottom: '10px' }}>
                    <img src={formData[input.title]} alt="Captured" style={{ width: '100%', marginBottom: '10px' }} />
                  </div>
                )}
                <button type="button" onClick={() => startCapture(input.title)} className='btn-add w-100' disabled={isCapturingMedia[input.title]}>Capture</button>
              </div>

              {showCamera[input.title] && (
                <div className="camera-modal">
                  <video autoPlay muted playsInline className="camera-feed" style={{ width: '100%' }} ref={(video) => { if (video) video.srcObject = mediaStream; }}></video>
                  <div className="capture-buttons">
                    <button type="button" className='capture-button' onClick={() => captureImage(input.title)}>Click</button>
                    <button type="button" className='bg-danger capture-button' onClick={() => setShowCamera(prev => ({ ...prev, [input.title]: false }))}>Close</button>
                  </div>
                </div>
              )}
            </div>
          );
        case 'text':
        case 'number':
        case 'time':
        case 'date':
          return (
            <div key={input.title} className='inputContainer' style={inputContainer}>
              <label style={labelStyle} className='text-capitalize fw-bold'  >{input.title}</label>
              <input
                type={input.type}
                name={input.title}
                value={formData[input.title]}
                onChange={(e) => handleInputChange(input.title, e.target.value)}
                className='form-control'
              />
            </div>
          );
        default:
          return null;
      }
    });
  };

  const isFormValid = () => {
    const selectedFormObj = surveyForms.find(form => form.name === selectedForm);
    if (!selectedFormObj) return false;
    return selectedFormObj.data_inputs.every(input => {
      const value = formData[input.title];
      if (input.type === 'checkbox') {
        return Array.isArray(value) && value.length > 0;
      }
      if (input.type === 'location') {
        return value.lat && value.long;
      }
      if (input.type === 'media') {
        return value !== null;
      }
      return value !== '';
    });
  };

  return (
    <>
      <Modal
        isOpen={true}
        contentLabel="Update User Modal"
        className='col-lg-2 col-sm-2 custom-survey-modal'
        style={{ zIndex: '1' }}
      >
        <div className="user-modal-header">
          <i className="fa-solid fa-xmark cancel" onClick={toggleModal}>
          </i>
        </div>

        <div className="col-lg-12">
          <h1 style={headerStyle}>Survey Form</h1>
          <select value={selectedForm} onChange={handleFormChange} className='mt-4 form-select' style={{fontSize:'13px'}}>
            {surveyForms.map(form => (
              <option key={form.name} value={form.name}>{form.name}</option>
            ))}
          </select>
          <form className='mt-3' onSubmit={handleSubmit}>
            {renderFormFields()}
            <div className="modal-footer">
              <button type="submit" className='btn-add w-100' disabled={!isFormValid()}>Submit</button>
            </div>
          </form>
          <ToastContainer />
        </div>
      </Modal>


      {/*  <div className="modal" style={{ display: 'block', width: isMobile ? '100%' : '40%' }}>
      <div className="modal-content" style={{ padding: "5vh", borderRadius: '20px', height: '60vh', overflowY: 'scroll' }}>
        <span className="close" style={{ cursor: 'pointer', marginRight: '2vh', fontSize: '30px', color: 'red' }} onClick={toggleModal}>&times;</span>
        <div className='SurveyForm'>
          <h1 style={headerStyle}>Survey Form</h1>
          <select value={selectedForm} onChange={handleFormChange} style={selectStyle}>
            {surveyForms.map(form => (
              <option key={form.name} value={form.name}>{form.name}</option>
            ))}
          </select>
          <form onSubmit={handleSubmit}>
            {renderFormFields()}
            <button type="submit" style={{ fontSize: '2vh' }} disabled={!isFormValid()}>Submit</button>
          </form>
          <ToastContainer />
        </div>
      </div>
    </div>
  );
}; */}

    </>
  );
};

// Internal CSS styles
const headerStyle = {
  textAlign: 'center',
  color: 'black',
};

const inputContainer = {
  display: 'flex',
  flexDirection: 'column',
  marginBottom: '10px',
};

const labelStyle = {
  marginBottom: '5px',
  color: 'black',
};

const inputStyle = {
  padding: '8px',
  fontSize: '16px',
  border: '1px solid #ccc',
  borderRadius: '4px',
};

const selectStyle = {
  marginTop: '10px',
  marginBottom: '20px',
  padding: '5px',
  fontSize: '16px',
};

export default SurveyForm;




