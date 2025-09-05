import React, { useEffect, useContext, useRef, useState } from 'react';
import Chart from 'chart.js/auto';
import './3dMapbox.css';
import { GlobalContext } from '../../../App';
import mapboxgl from 'mapbox-gl';
import { getRelativePosition } from 'chart.js/helpers';
const ElevationProfile = ({ elevationData }) => {
  const chartRef = useRef(null);
  const chartInstance = useRef(null);
  const [tooltip, setTooltip] = useState(null);
  const { mapBox } = useContext(GlobalContext);
  const markerRef = useRef(null);
  const handleMouseMove = (event) => {
    if (chartInstance.current) {
      // console.log(event)
       const pos=getRelativePosition(event, chartInstance.current)
       const canvas=chartRef.current
        const rect = canvas.getBoundingClientRect();
        const x = pos.x
        const y = pos.y

        const xScale = chartInstance.current.scales.x;
        const yScale = chartInstance.current.scales.y;

        const mouseX = x / canvas.width * xScale.width;
        const mouseY = y / canvas.height * yScale.height;

        const nearestIndex = Math.round(xScale.getValueForPixel(mouseX));
        const lowerIndex = Math.max(nearestIndex - 1, 0);
        const upperIndex = Math.min(nearestIndex + 1, elevationData.length - 1);

        const lowerPoint = elevationData[lowerIndex];
        const upperPoint = elevationData[upperIndex];

        const lowerX = xScale.getPixelForValue(lowerIndex);
        const upperX = xScale.getPixelForValue(upperIndex);

        const ratio = (mouseX - lowerX) / (upperX - lowerX);
        const interpolatedElevation = lowerPoint.elevation 
        const interpolatedLat = lowerPoint.latitude 
        const interpolatedLng = lowerPoint.longitude
        const startElevation = elevationData[0].elevation;
        const endElevation = elevationData[elevationData.length - 1].elevation;
        const avgElevation = elevationData.reduce((sum, point) => sum + point.elevation, 0) / elevationData.length;
        // console.log(mouseX + xScale.left,yScale.getPixelForValue(interpolatedElevation) + yScale.top)
        setTooltip({
            x: mouseX + xScale.left,
            y: yScale.getPixelForValue(interpolatedElevation) + yScale.top,
            text: `Elevation: ${interpolatedElevation.toFixed(2)}m\t End Elevation: ${endElevation.toFixed(2)} m\nAvg Elevation: ${avgElevation.toFixed(2)} m`
        });

        if (markerRef.current) {
            markerRef.current.setLngLat([interpolatedLng, interpolatedLat]);
        } else {
            markerRef.current = new mapboxgl.Marker()
                .setLngLat([interpolatedLng, interpolatedLat])
                .addTo(mapBox);
        }

        // Create or update the popup
        const popupContent = `Elevation: ${interpolatedElevation.toFixed(2)} m<br/>long:${interpolatedLng}<br/>lat:${interpolatedLat}`;
        if (!markerRef.current.getPopup()) {
            const popup = new mapboxgl.Popup({ offset: 25 })
                .setHTML(popupContent)
                .addTo(mapBox);
            markerRef.current.setPopup(popup);
        } else {
            markerRef.current.getPopup().setHTML(popupContent);
        }
    }
};
  useEffect(() => {
    if (chartInstance.current) {
      chartInstance.current.destroy();
    }

    const canvas = chartRef.current;
    const ctx = canvas.getContext('2d');

    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;

    if (elevationData && elevationData.length > 0) {
      chartInstance.current = new Chart(ctx, {
        type: 'line',
        data: {
          labels: elevationData.map((_, index) => `Point ${index + 1}`),
          datasets: [
            {
              label: 'Elevation Profile',
              data: elevationData.map(point => point.elevation),
              borderColor: '#3498db',
              backgroundColor: 'rgba(52, 152, 219, 0.2)',
              fill: true,
              tension: 0.4, // Smooth the line by adding tension
              borderWidth: 2,
              pointRadius: 0, // Remove point markers
            }
          ]
        },
        options: {
          onHover:handleMouseMove,
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: {
              grid: {
                display: false
              },
              title: {
                display: true,
                text: 'Distance (km)',
                color: '#ecf0f1'
              }
            },
            y: {
              min: 0,
              grid: {
                display: true,
                color: 'rgba(255, 255, 255, 0.1)'
              },
              title: {
                display: true,
                text: 'Elevation (m)',
                color: '#ecf0f1'
              }
            }
          },
          elements: {
            point: {
              radius: 0, // Ensure no point markers are displayed
            }
          },
          layout: {
            padding: {
              top: 10,
              right: 20,
              bottom: 10,
              left: 20
            }
          },
          plugins: {
            tooltip: {
              enabled: false // Disable the default tooltip
            }
          }
        }
      });

     

      const handleMouseLeave = () => {
        setTooltip(null);
        if (markerRef.current) {
          markerRef.current.remove();
          markerRef.current = null;
        }
      };

      // canvas.addEventListener('mousemove', handleMouseMove);
      canvas.addEventListener('mouseleave', handleMouseLeave);

      return () => {
        // canvas.removeEventListener('mousemove', handleMouseMove);
        canvas.removeEventListener('mouseleave', handleMouseLeave);
        if (chartInstance.current) {
          chartInstance.current.destroy();
        }
        if (markerRef.current) {
          markerRef.current.remove();
        }
      };
    }
  }, [elevationData]);

  return (
    <div
      style={{
        position: 'relative',
        width: '80vw',
        height: '20vh',
        backgroundColor: '#34495e',
        marginLeft: '100px',
        boxShadow: '0 6px 12px rgba(0, 0, 0, 0.3)',
        borderRadius: '8px',
        overflow: 'hidden',
        zIndex: 1000,
        bottom: "0px"
      }}
    >
      <canvas ref={chartRef} style={{ width: '100%', height: '100%' }} />
      {tooltip && (
        <div
          style={{
            position: 'absolute',
            left: tooltip.x,
            top: tooltip.y,
            backgroundColor: '#2c3e50',
            color: 'white',
            padding: '6px 8px',
            borderRadius: '4px',
            pointerEvents: 'none',
            transform: 'translate(-50%, -120%)',
            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
          }}
        >
          {tooltip.text}
        </div>
      )}
    </div>
  );
};

export default ElevationProfile;
