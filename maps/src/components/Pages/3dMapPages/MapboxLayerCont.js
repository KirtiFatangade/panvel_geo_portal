import React, { useContext, useState } from 'react';
import { GlobalContext } from '../../../App';

const MapboxLayerCont = ({ onClose }) => {
  const { boxLayers, setBoxLayers, mapBox } = useContext(GlobalContext);
  const [visibleLayers, setVisibleLayers] = useState({});

  const handleDeleteLayer = (layerId) => {
    if (mapBox) {
      try {
          mapBox.removeSource(layerId);
          mapBox.removeLayer(`${layerId}-layer`);
       

        setBoxLayers(prevLayers => prevLayers.filter(layer => layer.name !== layerId));
      } catch (error) {
        console.error(`Error deleting layer ${layerId}:`, error);
      }
    }
  };

  const handleToggleLayer = (layerId, isVisible) => {
    if (mapBox) {
      try {
        const visibility = isVisible ? 'visible' : 'none';
        mapBox.setLayoutProperty(`${layerId}-layer`, 'visibility', visibility);

        // Update the layer visibility in the state
        setBoxLayers(prevLayers =>
          prevLayers.map(layer =>
            layer.name === layerId ? { ...layer, visible: isVisible } : layer
          )
        );
      } catch (error) {
        console.error(`Error toggling layer ${layerId}:`, error);
      }
    }
  };

  return (
    <div style={{
      position: 'absolute',
      top: '252px',
      left: '81vw',
      backgroundColor: 'black',
      color: 'white',
      padding: '10px',
      boxShadow: '0px 0px 5px rgba(0, 0, 0, 0.3)',
      zIndex: 1000,
      width: '300px',
      maxHeight: '40vh',
      overflowY: 'scroll'
    }}>
      <h5 onClick={onClose} style={{ marginBottom: '10px', textAlignLast: 'right', cursor: 'pointer' }}>X</h5>
      <h4>Layers on Map</h4>
      <ul>
        {boxLayers.map(layer => (
          <li key={layer.name}>
            <label>
              <input
                type="checkbox"
                checked={layer.visible}
                onChange={(e) => handleToggleLayer(layer.name, e.target.checked)}
              />
              {layer.name}
            </label>
            <button onClick={() => handleDeleteLayer(layer.name)} style={{ marginLeft: '10px' }}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default MapboxLayerCont;
