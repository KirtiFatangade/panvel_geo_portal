import React, { useState, useContext, useRef } from "react";
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { HOST } from "../../host";
import { GlobalContext } from "../../../App";
import { SideBarContext } from "../sidebar";
import { logToServer } from "../../logger";
// import RangeCal from "./RangeCal";
// import io from 'socket.io-client';

function NDVI() {
    const {
        usedShapes,
        setChart,
        setChartType,
        once
    } = useContext(GlobalContext)
    const {
        setloader
    } = useContext(SideBarContext)

    const [SDate, SetSDate] = useState("2023-10-31")
    const [EDate, SetEDate] = useState('2023-12-26')
    const [showerror, seterror] = useState(false)
    const [percent, setpercent] = useState(null);
    const cKey = useRef(null)

    const handleDateChange = (dates) => {
        if (Array.isArray(dates)) {
            const [start, end] = dates;
            SetSDate(start);
            SetEDate(end);
        }
    }

    function setDates(e) {
        if (e.target.name === "start") {
            SetSDate(e.target.value)
        } else {
            SetEDate(e.target.value)
        }
    }

    const progressInterval = setInterval(async () => {
        try {
            if (cKey.current) {
                const progressResponse = await fetch(`${HOST}/ndvi-progress/${cKey.current}`);
                if (progressResponse.ok) {
                    const progressData = await progressResponse.json();
                    if (progressData.percent) {
                        setpercent(Number(progressData.percent).toFixed(2));

                    }
                }
            } else {
                clearInterval(progressInterval)
            }

        } catch (error) {
            console.error("Error fetching progress:", error);
        }
    }, 10000);
    async function click() {
        console.log("Clicked"); // Add this line to ensure the function is called
        console.log("Start Date:", SDate);
        console.log("End Date:", EDate);

        if (SDate && EDate && SDate < EDate && (usedShapes.getLayers()).length) {
            seterror(false)
            var geometry = [];
            usedShapes.eachLayer(function (layer) {
                geometry.push(JSON.stringify(layer.toGeoJSON()["geometry"]["coordinates"]));
            });
            console.log("Start Date:", SDate);
            console.log("End Date:", EDate);

            try {
                const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
                let key = '';

                for (let i = 0; i < 8; i++) {
                    const randomIndex = Math.floor(Math.random() * characters.length);
                    key += characters.charAt(randomIndex);
                }
                cKey.current = key;
                setpercent(null);
                setloader(true);

                const response = await fetch(`${HOST}/ndvi-trends`, {
                    method: "POST",
                    credentials: 'include',
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ data: { "aoi": geometry, "start_date": SDate, "end_date": EDate, "key": key } }),
                    body: JSON.stringify({ data: { "aoi": geometry, "start_date": SDate, "end_date": EDate, "key": key } }),
                });
                try {
                    progressInterval();
                } catch (e) {

                }

                if (response.ok) {
                    const data = await response.json();
                    cKey.current = null;
                    once.current = false
                    setChartType("ndvi")
                    setChart(data);
                    // clearInterval(progressInterval)
                    setpercent(100)
                    logToServer('info', 'Data fetched successfully')
                } else {
                    // alert("Unexpected Error occurred. Please try again");
                    alert("The area you're trying to work with is too large. Please try with a smaller area.");

                }
                setloader(false);
            } catch (error) {
                // alert("Unexpected Error occurred. Please try again");
                alert("The area you're trying to work with is too large. Please try with a smaller area.");

                console.log(error)
                setloader(false);
                logToServer('error', `${error}`)
            }
        } else {
            seterror(true)

        }


    }
    return (
        <>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <div style={{ marginTop: "15px" }}>
                    <label htmlFor="start" style={{ fontSize: '12px', marginRight: "25px", color: "#FAF8D4" }}>Start Date:</label>

                    <input type="date" id="start" name="start" min="2000-01-02" style={{ fontSize: '14px', padding: '1px 17px' }} onChange={(e) => setDates(e)} defaultValue="2023-10-31" />
                </div>


                <div style={{ marginTop: "15px" }}>
                    <label htmlFor="end" style={{ fontSize: '12px', marginRight: "30px", color: "#FAF8D4" }}>End Date:</label>

                    <input type="date" style={{ fontSize: '14px', padding: '1px 17px' }} id="end" name="end" defaultValue="2023-12-26" onChange={(e) => setDates(e)} />
                </div>


                <div>
                <label for="datemin">Enter a date after 2000-01-01:</label>
                <input type="date" id="datemin" name="datemin" min="2000-01-02"/><br></br>
                </div>

                    <div style={{ marginTop: "15px" }}>
                        <button className="btn-visualize" onClick={click}>Visualize</button>
                    </div>

                    {showerror && (
                        <>
                            <div style={{ marginTop: "15px", color: "#FAF8D4" }}><p>Select Valid Dates or select ROI</p></div>
                        </>
                    )}

                    {percent ? (
                        <>
                            <p style={{ color: "white", fontSize: "20px" }}>Progress : {percent <= 100 ? percent : 100} %</p>
                        </>
                    ) : null}

                </div>

                </>
                )

}
                export default NDVI


