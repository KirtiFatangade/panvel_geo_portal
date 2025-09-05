import React, { useRef, useContext, useState, useEffect } from 'react';
import domtoimage from 'dom-to-image';
import { saveAs } from 'file-saver';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { convertArea } from "@turf/turf"
import { GlobalContext } from '../../App';
import L from "leaflet"
import { logToServer } from '../logger';


const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {

    const dataPoint = payload[0].payload;

    return (
      <div style={{ backgroundColor: "black" }}>
        <p style={{color:"white"}}>{label}</p>
        <p style={{ color: payload[0].stroke }}>{`Surface Area : ${dataPoint.line1} acres`}</p>
      </div>
    );
  }
  return null;
};
const MultiLineChart = () => {
  const {
    chartData,
    chartCollapse,
    chartType,
    map,
    Waterlayers,
    setWaterLayers,
    once
  } = useContext(GlobalContext)
  const chartRef = useRef(null);
  // const [Waterlayers, setWaterLayers] = useState({})
  const [current, setCurrent] = useState(null)
  const [Max, setMax] = useState(null)
  const [Min, SetMin] = useState(null)
  
  const getRandomColor = () => {
    const hue = Math.floor(Math.random() * 360);
    const saturation = 30 + Math.floor(Math.random() * 70); 
    const lightness = 40 + Math.floor(Math.random() * 60); 

    const hslToRgb = (h, s, l) => {
        h /= 360;
        s /= 100;
        l /= 100;
        let r, g, b;
        if (s === 0) {
            r = g = b = l;
        } else {
            const hue2rgb = (p, q, t) => {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1 / 6) return p + (q - p) * 6 * t;
                if (t < 1 / 2) return q;
                if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
                return p;
            };
            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            r = hue2rgb(p, q, h + 1 / 3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1 / 3);
        }
        const toHex = x => Math.round(x * 255).toString(16).padStart(2, '0');
        return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
    };

    return hslToRgb(hue, saturation, lightness);
};



  function AddLayers() {
    logToServer('info', 'Adding layers to map');
    if(Object.keys(Waterlayers).length ){
      Object.keys(Waterlayers).forEach((ele)=>{
        Waterlayers[ele].remove()
      })
    }
    setWaterLayers({})
    dates.forEach((date) => {
      const [area, url] = chartData[date];
      let layer = L.tileLayer(url, { maxZoom: 20, zIndex: 2005, opacity: date === Max || date === Min ? 1 : 0 });
      layer.addTo(map);
      setWaterLayers((prevLayerDict) => ({
        ...prevLayerDict,
        [date]: layer,
      }));
    });

  }


  const calculateMinMax = () => {
    let max = null;
    let min = null;
    let maxArea = 0;
    let minArea = 1e100;

    dates.forEach((date) => {
      const [area, url] = chartData[date];
      const convertedArea = convertArea(area, "meters", "acres");

      if (convertedArea > maxArea) {
        max = date;
        maxArea = convertedArea;
      }

      if (convertedArea < minArea) {
        min = date;
        minArea = convertedArea;
      }
    });

    setMax(max);
    SetMin(min);
  };

  const processData = () => {
    if (chartType === 'ndvi') {
      return dates.map((date) => {
        const values = chartData[date];
        const entry = { date };

        values.forEach((value, index) => {
          entry[`line${index + 1}`] = value === 2 ? null : value.toFixed(4);
        });

        return entry;
      });
    } else if (chartType === 'water') {
      const newData = dates.map((date) => {
        const [area, url] = chartData[date];
        return { date, line1: convertArea(area, "meters", "acres").toFixed(2) };
      });
      return newData;
    }

    return [];
  };

  const dates = Object.keys(chartData);
  const Data = processData();
  const minY = Math.min(...Data.map(item => item.line1));
  const maxY = Math.max(...Data.map(item => item.line1));
  useEffect(() => {
    logToServer('info', 'Component mounted or updated');
    if (chartType === 'water' && !once.current) {
      calculateMinMax();
      if(Min && Max){
        once.current=true   
        AddLayers();
      }
    }
  }, [chartType,once.current,Min,Max]);


  function download() {
    logToServer('info', 'Initiating chart download');
    const chartNode = chartRef.current;
    chartNode.style.backgroundColor = '#31304D'
    domtoimage.toBlob(chartNode)
      .then(blob => {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'chart.png';
        link.click();
      })
      .catch(error => {
        logToServer('error', 'Error generating chart image', error);
        console.error('Error generating chart image:', error);
      });
    let csvData;
    if (chartType === 'water') {
      csvData = [
        'Month,Area (in acres)',
        ...Object.entries(chartData).map(([date, [area]]) => `${date},${convertArea(area, "meters", "acres").toFixed(2)}`)
      ].join('\n');
    } else {
      csvData = [
        ['Date', ...Array.from({ length: chartData[dates[0]].length }, (_, index) => `Area${index + 1}`)].join(','),
        ...dates.map((date) => [date, ...chartData[date]].join(','))
      ].join('\n');
    }


    const csvBlob = new Blob([csvData], { type: 'text/csv' });
    saveAs(csvBlob, 'chart-data.csv');
  }



  function handleHover(e) {
    logToServer('info', 'Handling chart hover event');
    if (e.isTooltipActive) {
      if (e.activeLabel !== Max) {
        Waterlayers[Max].setOpacity(0);
      }
      if (e.activeLabel !== Min) {
        Waterlayers[Min].setOpacity(0);
      }


      if (current !== Waterlayers[e.activeLabel]) {
        if (current) {
          current.setOpacity(0)
          setCurrent(null)
        }
        Waterlayers[e.activeLabel].setOpacity(1)
        setCurrent(Waterlayers[e.activeLabel])
      }
    } else {
      if (current) {
        current.setOpacity(0)
        setCurrent(null)
      }
      Waterlayers[Max].setOpacity(1);
      Waterlayers[Min].setOpacity(1);


    }
  }


  function log(e) {
    logToServer('info', 'Logging action');
    Waterlayers[Max].setOpacity(1);
    Waterlayers[Min].setOpacity(1);
    if (current) {
      current.setOpacity(0)
      setCurrent(null)
    }
  }
  return (
    <div>
      <div style={{ height: chartCollapse ? '120px' : 'calc(100vh*0.33)' }} ref={chartRef}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart margin={{ right: 40, left: 20, top: 10, bottom: chartCollapse ? 0 : 5 }} data={Data} onMouseMove={(e) => chartType === 'water' ? handleHover(e) : null} onMouseLeave={(e) => chartType === 'water' ? log(e) : null}  >
            <CartesianGrid strokeDasharray="2 2" fill='black' />
            <XAxis dataKey="date" fontSize={chartCollapse ? 5 : 10} interval={0} tick={{ fill: 'white',angle:30 }} textAnchor="start" />
            <YAxis fontSize={chartCollapse ? 5 : 12} type="number" tick={{ fill: 'white' }} domain={ [minY - 0.1 * minY, maxY + 0.1 * maxY]} interval={0} tickFormatter={ (value) => value.toFixed(1)} />
            <Tooltip position={{ y: 0 }}contentStyle={{backgroundColor:"black"}} labelStyle={{color:"white"}} content={chartType === 'water' ? <CustomTooltip /> : null} />
            <Legend opacity={1} />
            {chartType === "ndvi" ? (
              Object.keys(chartData[dates[0]]).map((key, index) => (
                <Line
                connectNulls={true}
                  key={index}
                  type="monotone"
                  dataKey={`line${index + 1}`}
                  name={`Area ${index + 1}`}
                  stroke={getRandomColor()}
                />
              ))
            ) :
              <Line
                type="monotone"
                dataKey={`line1`}
                name={`Water-Body`}
                stroke={getRandomColor()}

                isAnimationActive={false}
              />
            }

          </LineChart>
        </ResponsiveContainer>
      </div>

      <div style={{ position: "absolute", bottom: "5px", left: "5px" }}>
        <button title='Download'
          className='btn' onClick={download}
          style={{ color: "black", fontSize: "10px", backgroundColor:'#397aa5', padding: "2px 2px", width: chartCollapse ? "20px" : "30px", height: chartCollapse ? "20px" : "30px", borderRadius: "10%" }}
        >
          <i className="fa fa-download" />
        </button>
      </div>


    </div>

  );
};

export default MultiLineChart;
