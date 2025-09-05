import React, { useState, useEffect, useContext } from 'react';
import CsvToHtmlTable from './CsvTable';
import { GlobalContext } from '../../App';
import { Rnd } from "react-rnd";

const ResizableDiv = ({ csvData, setTable, setTableData, name }) => {
  // const [size, setSize] = useState({ width: 1825, height: 800 }); // Initial width and height
  const [size, setSize] = useState({
    width: window.innerWidth * 0.99, 
    height: window.innerHeight * 0.92, 
  });
  const [maxHeight, setMaxHeight] = useState(850); 
  const [isResizing, setIsResizing] = useState(false);
  const { Canvas } = useContext(GlobalContext)
  const handleMouseDown = (e) => {
    setIsResizing(true);
    e.preventDefault();
  };

  const handleMouseMove = (e) => {
    if (isResizing) {
      setSize((prevSize) => ({
        width: Math.max(900, prevSize.width + e.movementX), 
        height: Math.max(600, prevSize.height + e.movementY) 
      }));

      // Dynamically update maxHeight during resizing
      setMaxHeight(Math.max(200, size.height + e.movementY));
    }
  };

  const handleMouseUp = () => {
    setIsResizing(false);
  };

  // Add event listeners for mouse move and mouse up
  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing, size.height]); 

  return (
    <div
      style={{
        position: 'absolute',
        top: '60px',
        left: '10px',
        zIndex: 1,
        backgroundColor: 'white',
        borderRadius: '3px',
        padding: '1vh',
        boxShadow: '1px 1px 10px rgba(0, 0, 0, 0.1)',
        overflowY: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        // minWidth:'95vw',
        // minHeight:'90vh',
        width: size.width,
        height: size.height
      }}
    >
      
      <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'flex-end' }}>
        <button
          title="close"
          className="cancel"
          onClick={() => {
            setTable(false);
            setTableData(null);
            if (Canvas) {
              Canvas.RemoveHighlight(name)
            }
          }}

          style={{
            margin: '0px',
            fontSize: '15px',
            padding: '2px 2px',
            width: '30px',
            height: '30px',
            borderRadius: '10%'
          }}
        >
          &times;
        </button>
      </div>


      <CsvToHtmlTable
        data={csvData}
        csvDelimiter=","
        tableClassName="table table-striped table-hover"
        name={name}
        maxHeight={maxHeight}
      />


      {/* Resizing handle */}

      <div
        style={{
          position: 'absolute',
          bottom: '5px',
          right: '5px',
          width: '10px',
          height: '10px',
          cursor: 'se-resize',
          backgroundColor: 'rgba(0, 0, 0, 0.2)'
        }}
        onMouseDown={handleMouseDown}
      />
    </div>
  );
};

export default ResizableDiv;
