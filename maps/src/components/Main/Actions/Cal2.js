import React, { useEffect, useState, useRef, useContext } from 'react';
import Calendar from 'react-calendar';
import { HOST } from '../../host';
import 'react-calendar/dist/Calendar.css';
import { GlobalContext } from '../../../App';
import { SideBarContext } from '../sidebar';
import { logToServer } from '../../logger';

function Cal({ SetSDate }) {
  const [showmess, setmess] = useState(true);
  const [date, setDate] = useState(new Date());
  const abortController = useRef(null);
  const [hDate, SetHdate] = useState(null);
  const { lastRect, drawnItems, map, mapBox, getCsrfToken } = useContext(GlobalContext);
  const { setloader } = useContext(SideBarContext);
  const [dates, setDates] = useState([]);

  async function GetDates(month, year) {
    logToServer('info', `Fetching dates for month: ${month + 1}, year: ${year}`);
    setmess(false);
    setloader(true);
    if (abortController.current) {
      abortController.current.abort();
    }
    abortController.current = new AbortController();
    try {
      const response = await fetch(`${HOST}/get-dates/open`, {
        method: "POST",
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': await getCsrfToken(),
        },
        body: JSON.stringify({
          data: {
            "month": month + 1,
            "year": year,
            "dataset": "Synthetic Aperture Radar - Sentinel 1",
            "extent": map.getBounds(),
            "cloud": 0
          }
        }),
        signal: abortController.current.signal,
      });

      const data = await response.json();
      let datesList = [];
      data.day.forEach((ele) => {
        datesList.push(new Date(ele));
      });
      setDates(datesList);
      logToServer('info', `Dates fetched successfully: ${datesList}`);
      setloader(false);
    } catch (error) {
      if (error.name !== 'AbortError') {
        logToServer('error', `Unexpected error occurred: ${error.message}`);
        alert("Unexpected Error occurred. Please try again.");
        setloader(false);
      } else {
        logToServer('info', 'Fetch aborted');
      }
    }
  }

  useEffect(() => {
    let timeoutId;

    const handleMoveEnd = () => {
      clearTimeout(timeoutId);

      timeoutId = setTimeout(() => {
        GetDates(date.getMonth(), date.getFullYear());
      }, 200);
    };

    map.on("move", handleMoveEnd);

    return () => {
      clearTimeout(timeoutId);
      map.off("move", handleMoveEnd);
    };
  }, [GetDates, map, date]);

  const tileContent = ({ date, view }) => {
    if (dates.length > 0) {
      const currentDate = new Date(date);

      if (dates.some(d => d.toDateString() === currentDate.toDateString()) && view === "month") {
        return "highlight";
      }
    }
    return null;
  };

  const handleViewChange = ({ activeStartDate }) => {
    let newDate = new Date(activeStartDate);
    setDate(newDate);
    logToServer('info', `Calendar view changed: ${newDate}`);
  };

  const onChange = (newDate) => {
    SetSDate(newDate);
    logToServer('info', `Date selected: ${newDate}`);
  };

  return (
    <div>
      <style>{`
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
    color: #ffffff;
  }

  .react-calendar__year-view .react-calendar__tile,
  .react-calendar__decade-view .react-calendar__tile,
  .react-calendar__century-view .react-calendar__tile {
    padding: 1em 0.5em;
    color: white;
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
`}</style>

      <Calendar tileClassName={tileContent} value={date} onClickDay={onChange} onActiveStartDateChange={handleViewChange} />
    </div>
  );
}

export default Cal;
