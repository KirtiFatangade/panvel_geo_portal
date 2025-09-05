

import React, { useEffect, useState, useRef, useContext } from 'react';
import Calendar from 'react-calendar';
import { HOST } from '../../host';
import 'react-calendar/dist/Calendar.css';
import { logToServer } from '../../logger';
import { GlobalContext } from '../../../App';

function Cal({ map, mapBox, selData, SetSDate, SDate, setloader, highlight, min, max, cloud, cloudValue, add }) {
  const [showmess, setmess] = useState(true);
  const { tools, getCsrfToken } = useContext(GlobalContext)
  const [date, setDate] = useState(new Date());
  const abortController = useRef(null);
  const [hDate, SetHdate] = useState(null);
  const [dates, setDates] = useState([]);

  const onChange = (newDate) => {
    SetSDate(newDate);
  };

  async function GetDates(month, year, cloudvals = null) {
    if (map) {
      console.log(map.getBounds())
    }
    const isMapZoomed = map && map.getZoom() >= 7;
    const isMapBoxZoomed = mapBox && mapBox.getZoom() >= 7;

    if (highlight) {
      if (isMapZoomed || isMapBoxZoomed) {
        setmess(false);
        setloader(true);
        let convertedObj = null
        if (isMapBoxZoomed) {
          let obj = mapBox.getBounds()
          convertedObj = {
            '_southWest': {
              'lat': obj._sw.lat,
              'lng': obj._sw.lng
            },
            '_northEast': {
              'lat': obj._ne.lat,
              'lng': obj._ne.lng
            }
          };
        } else if (isMapZoomed) {
          convertedObj = map.getBounds();
        }
        if (abortController.current) {
          try {
            abortController.current.abort();
          } catch {

          }
        }
        abortController.current = new AbortController();
        try {
          const response = await fetch(`${HOST}/get-dates`, {
            method: "POST",
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
              'X-CSRFToken': await getCsrfToken(),
            },
            body: JSON.stringify({
              data: {
                month: month + 1,
                year: year,
                dataset: selData,
                extent: convertedObj,
                cloud: cloudvals,
                add: add
              }
            }),
            signal: abortController.current.signal,
          });
          const data = await response.json();
          if (data && data.day) {
            let datesList = data.day.map((ele) => new Date(ele));
            setDates(datesList);
          } else {
            setDates([]);
          }
          setloader(false);
        } catch (error) {
          console.error(error);
          if (error.name !== 'AbortError') {
            alert("Unexpected Error occurred. Please try again.");
            setloader(false);
          }
        }
      } else {
        setmess(true);
      }
    } else {
      SetHdate(null);
      setmess(false);
      setloader(false);
    }
  }

  useEffect(() => {
    console.log(tools)
    if (!tools) {
      if (highlight) {
        console.log(min, max)
        if (cloud) {
          GetDates(date.getMonth(), date.getFullYear(), cloudValue);
        } else {
          GetDates(date.getMonth(), date.getFullYear());
        }
      } else {

        setmess(false);
      }
    }

  }, [selData, date, map, mapBox, cloud, cloudValue, tools]);

  const handleViewChange = ({ activeStartDate }) => {
    let newDate = new Date(activeStartDate)
    setDate(newDate)
  };


  useEffect(() => {
    let timeoutId;

    const handleMoveEnd = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        if (cloud) {
          GetDates(date.getMonth(), date.getFullYear(), cloudValue);
        } else {
          GetDates(date.getMonth(), date.getFullYear());
        }
      }, 200);
    };

    if (map) {
      if (!tools) {
        map.on("move", handleMoveEnd);
      }

    }

    if (mapBox) {
      if (!tools) {
        mapBox.on("move", handleMoveEnd);
      }

    }

    return () => {
      clearTimeout(timeoutId);
      if (map) {
        map.off("move", handleMoveEnd);
      }
      if (mapBox) {
        mapBox.off("move", handleMoveEnd);
      }
    };
  }, [GetDates, map, mapBox, date, cloud, cloudValue, tools]);

  const tileContent = ({ date, view }) => {
    try {
      const currentDate = new Date(date);
      if (dates.length > 0) {
        if (dates.some(d => d.toDateString() === currentDate.toDateString() && view === "month" && SDate && currentDate.toDateString() === SDate.toDateString())) {
          return "sel";
        }
        if (dates.some(d => d.toDateString() === currentDate.toDateString()) && view === "month") {
          return "highlight";
        }
      }
      if (SDate && currentDate.toDateString() === SDate.toDateString()) {
        return "sel";
      }
      return null;
    } catch {

    }

  };

  return (
    <div style={{ padding: "0px", marginTop: "10px" }}>
      <style>
        {`
  .react-calendar {
    width: 100%; /* Use 100% of its parent */
    max-width: 100%; /* Prevent overflow */
    height: auto; /* Allow height to adjust based on content */
    border: none;
    color: white;
    line-height: 1.125em;
    margin-bottom: 5px;
    border-radius: 5%;
    background: transparent;
  }

  .react-calendar__month-view__weekdays__weekday abbr,
  .react-calendar__month-view__days__day abbr,
  .react-calendar__year-view__months__month abbr,
  .react-calendar__decade-view__years__year,
  .react-calendar__century-view__decades__decade {
    color: white;
  }

  .react-calendar__navigation button {
    background-color: transparent;
    width: 10%; /* Use percentage for responsive sizing */
    height: 40px; /* Fixed height */
    color: white;
    font-size: 0.9em; /* Responsive font size */
  }

  .react-calendar__navigation__label {
    width: 60%; /* Responsive width */
    height: 40px; /* Fixed height */
    
  }

  .react-calendar__navigation {
    display: flex;
    height: 40px; /* Fixed height */
    margin-bottom: 1em;
  }

  .react-calendar__navigation button:enabled:hover,
  .react-calendar__navigation button:enabled:focus {
    background-color: transparent;
    color: white;
  }
 
    .react-calendar__navigation button:disabled {
    background-color: #6b6b6b;
}


.react-calendar__tile:disabled {
    background-color: transparent;
}

  .highlight {
    background-color: #2E865F;
    color: white;
  }

  .react-calendar__tile {
    width: 14%; /* Adjust this based on your layout */
    height: auto; /* Allow height to adjust based on content */
    display: flex;
    color: white;
    justify-content: center;
    align-items: center;
  }
   
  .react-calendar__month-view__days__day--neighboringMonth,
  .react-calendar__decade-view__years__year--neighboringDecade,
  .react-calendar__century-view__decades__decade--neighboringCentury {
    color: white;
  }

  .react-calendar__year-view .react-calendar__tile,
  .react-calendar__decade-view .react-calendar__tile,
  .react-calendar__century-view .react-calendar__tile {
    padding: 1em 0.5em;
    color: white;
  }

   .react-calendar__tile:disabled {
   background-color: #6b6b6b;
  }

  .react-calendar__tile:hover {
    color: black;
    background-color: #6b6b6b;
  }
    .react-calendar__tile:enabled:hover,
.react-calendar__tile:enabled:focus { 
 background-color: black;
  color:white;
}

  .react-calendar__tile--now {
    background-color: transparent !important;
  }

  .react-calendar__tile--active {
    background-color: transparent !important;
  }

  .sel {
    background-color: #50bcfa !important;
    color: black;
  }

  @media screen and (min-width: 550px) and (max-width: 1370px) {
    .react-calendar {
      max-width: 100%;
      font-family: Arial, Helvetica, sans-serif;
      line-height: 1.125em;
    }
  }
`}
      </style>

      {showmess ? (
        <p style={{ color: "white", textAlign: "center", fontSize: '12px', marginLeft: "10px" }}>Zoom to view data</p>
      ) : (
        <Calendar
          minDate={min ? new Date(min) : null}
          maxDate={max ? new Date(max) : null}
          onClickDay={onChange}
          tileClassName={tileContent}
          onActiveStartDateChange={handleViewChange}
          value={date}
        />
      )}
    </div>
  );
}

export default Cal;
