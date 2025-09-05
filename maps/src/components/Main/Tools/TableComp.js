import React, { useEffect, useState } from 'react';
import { HOST } from '../../host';

function Table({ setType, setValues1, setValues2,val1,setType2 }) {
  const [firstOptions, setFirstOptions] = useState([]);
  const [selectedFirstValue, setSelectedFirstValue] = useState('');
  const [secondOptions, setSecondOptions] = useState([]);
  const [selectedSecondValue, setSelectedSecondValue] = useState('');
  const [thirdOptions, setThirdOptions] = useState([]);
  const [selectedThirdValue, setSelectedThirdValue] = useState('');
  const [data, setData] = useState([]);

  // Fetch options for the first select
  useEffect(() => {
    const fetchFirstOptions = async () => {
      try {
        const response = await fetch(`${HOST}/all-tables/0/0/0`); // Replace with your API endpoint
        const result = await response.json();
        const filteredOptions = result.values.filter(option => 
          !option.includes("map_app") && !option.includes("django") && !option.includes("auth")
        );
        setFirstOptions(filteredOptions);
      } catch (error) {
        console.error('Error fetching first options:', error);
      }
    };

    fetchFirstOptions();
  }, []);

  // Fetch options for the second select based on the selected value in the first select
  useEffect(() => {
    const fetchSecondOptions = async () => {
      if (selectedFirstValue) {
        try {
          const response = await fetch(`${HOST}/all-tables/${selectedFirstValue}/0/0`); // Replace with your API endpoint
          const result = await response.json();
          setSecondOptions(result.values);
          setSelectedSecondValue(''); // Reset second select value when the first select changes
          setSelectedThirdValue(''); // Reset third select value when the first select changes
        } catch (error) {
          console.error('Error fetching second options:', error);
        }
      }
    };

    fetchSecondOptions();
  }, [selectedFirstValue]);

  // Fetch options for the third select based on the selected value in the second select
  useEffect(() => {
    const fetchThirdOptions = async () => {
      if (selectedSecondValue) {
        try {
          const response = await fetch(`${HOST}/all-tables/${val1?val1[0]:selectedFirstValue}/${selectedSecondValue}/${val1?selectedFirstValue:"0"}`); // Replace with your API endpoint
          const result = await response.json();
          setThirdOptions(result.values);
          setSelectedThirdValue(''); // Reset third select value when the second select changes
        } catch (error) {
          console.error('Error fetching third options:', error);
        }
      }
    };

    fetchThirdOptions();
  }, [selectedSecondValue]);

  // Fetch data based on the selected value in the third select
  useEffect(() => {
    const fetchData = async () => {
      if (selectedThirdValue) {
        try {
          const response = await fetch(`${HOST}/table-type/${selectedFirstValue}`); // Replace with your API endpoint
          const result = await response.json();
          console.log(result);
          if (setType) {
            setType(result.type);
          }
          if(setType2){
            setType2(result.type)
          }
        } catch (error) {
          console.error('Error fetching data:', error);
        }
      }
    };

    fetchData();
  }, [selectedThirdValue]);

  const handleFirstSelectChange = (event) => {
    const value = event.target.value;
    setSelectedFirstValue(value);
    if (setValues1) {
      setValues1(prev => [value]);
    } else if (setValues2) {
      setValues2(prev => [value]);
    }
    if(setType){
      setType(null)
    }
  };

  const handleSecondSelectChange = (event) => {
    const value = event.target.value;
    setSelectedSecondValue(value);
    if (setValues1) {
      setValues1(prev => [...prev, value]);
    } else if (setValues2) {
      setValues2(prev => [...prev, value]);
    }
  };

  const handleThirdSelectChange = (event) => {
    const value = event.target.value;
    setSelectedThirdValue(value);
    if (setValues1) {
      setValues1(prev => [...prev, value]);
    } else if (setValues2) {
      setValues2(prev => [...prev, value]);
    }
  };

  return (
    <div>
      <select className="form-select border-0 mt-3"   style={{ marginBottom: "5px", height: '30px', fontSize: '12px' }} onChange={handleFirstSelectChange} value={selectedFirstValue}>
        <option value="">Select Table</option>
        {firstOptions.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>

      {secondOptions.length > 0 && (
        <select className="form-select border-0 mt-3"   style={{ marginBottom: "5px", height: '30px', fontSize: '12px' }} onChange={handleSecondSelectChange} value={selectedSecondValue}>
          <option value="">Filter by</option>
          {secondOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      )}

      {thirdOptions.length > 0 && (
        <select className="form-select border-0 mt-3"  style={{ marginBottom: "5px", height: '30px', fontSize: '12px' }} onChange={handleThirdSelectChange} value={selectedThirdValue}>
          <option value="">Select Unique Values</option>
          {thirdOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}

export default Table;
