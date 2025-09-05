import React, { useContext, useState } from 'react';
import { GlobalContext } from '../../../App';
import files from '../../static';

const MapBoxbaseLayer = ({ onClose }) => {
  const { mapBox } = useContext(GlobalContext);

  const styles = [
   
    {
      name: 'Satellite Streets',
      url: 'mapbox://styles/mapbox/satellite-streets-v12',
      imageUrl:  `${process.env.PUBLIC_URL}/${files}streetsMapbox.png`
    },
    {
      name: 'Standard',
      url: 'mapbox://styles/mapbox/standard',
      imageUrl: `${process.env.PUBLIC_URL}/${files}standard.png` 
    },
    {
      name: 'Standard Satellite',
      url: 'mapbox://styles/mapbox/standard-satellite',
      imageUrl: `${process.env.PUBLIC_URL}/${files}Standard Satellite.png`
    },
    {
      name: 'Streets',
      url: 'mapbox://styles/mapbox/streets-v12',
      imageUrl: `${process.env.PUBLIC_URL}/${files}streets.png`
    },
    {
      name: 'Outdoors',
      url: 'mapbox://styles/mapbox/outdoors-v12',
      imageUrl: `${process.env.PUBLIC_URL}/${files}streets.png`
    },
    {
      name: 'Light',
      url: 'mapbox://styles/mapbox/light-v11',
      imageUrl: `${process.env.PUBLIC_URL}/${files}light.png`
    },
    {
      name: 'Dark',
      url: 'mapbox://styles/mapbox/dark-v11',
      imageUrl: `${process.env.PUBLIC_URL}/${files}dark.png`
    },
    // {
    //   name: 'Satellite',
    //   url: 'mapbox://styles/mapbox/satellite-v9',
    //   imageUrl: 'path/to/satellite-image.png',
      
    // },
  
  
  ];

  const [selectedStyle, setSelectedStyle] = useState(styles[0].url);

  const handleStyleChange = (url) => {
    setSelectedStyle(url);
    if (mapBox) {
      mapBox.setStyle(url);
    }
  };

  return (
    <div className="mapbox-base-layer"
      style={{
        position: 'absolute',
        top: '352px',
        left: '77vw',
        backgroundColor: 'black',
        color: 'white',
        padding: '10px',
        boxShadow: '0px 0px 5px rgba(0, 0, 0, 0.3)',
        zIndex: 1000,
        width: '300px',
        maxHeight: '35vh',
        overflowY: 'scroll'
      }}>
      <h5 onClick={onClose} style={{ marginBottom: '10px', textAlign: 'right', cursor: 'pointer' }}>X</h5>
      <h3>Select Map Style</h3>
      <div className="mapbox-style-options"
        style={{
          display: 'flex',
          flexDirection:"column",
          gap: '10px'
        }}>
        {styles.map((style) => (
          <label key={style.url} className="mapbox-style-option" style={{ flex: '1 0 45%' }}>
            <input
              type="radio"
              name="mapStyle"
              value={style.url}
              checked={selectedStyle === style.url}
              onChange={() => handleStyleChange(style.url)}
            />
            <img src={style.imageUrl} alt={style.name} className="mapbox-style-image" style={{ width: '18%', margin: '5px' ,borderRadius:'7px'}} />
            <span>{style.name}</span>
          </label>
        ))}
      </div>
    </div>
  );
};

export default MapBoxbaseLayer;
// import React, { useContext, useState } from 'react';
// import { GlobalContext } from '../../../App';
// import files from '../../static';

// const MapBoxbaseLayer = ({ onClose, selectedStyle, setSelectedStyle }) => {
//   const { mapBox } = useContext(GlobalContext);

//   const styles = [
//     {
//       name: 'Satellite Streets',
//       url: 'mapbox://styles/mapbox/satellite-streets-v12',
//       imageUrl: `${process.env.PUBLIC_URL}/${files}streetsMapbox.png`
//     },
//     {
//       name: 'Standard',
//       url: 'mapbox://styles/mapbox/standard',
//       imageUrl: `${process.env.PUBLIC_URL}/${files}standard.png`
//     },
//     {
//       name: 'Standard Satellite',
//       url: 'mapbox://styles/mapbox/standard-satellite',
//       imageUrl: `${process.env.PUBLIC_URL}/${files}Standard Satellite.png`
//     },
//     {
//       name: 'Streets',
//       url: 'mapbox://styles/mapbox/streets-v12',
//       imageUrl: `${process.env.PUBLIC_URL}/${files}streets.png`
//     },
//     {
//       name: 'Outdoors',
//       url: 'mapbox://styles/mapbox/outdoors-v12',
//       imageUrl: `${process.env.PUBLIC_URL}/${files}streets.png`
//     },
//     {
//       name: 'Light',
//       url: 'mapbox://styles/mapbox/light-v11',
//       imageUrl: `${process.env.PUBLIC_URL}/${files}light.png`
//     },
//     {
//       name: 'Dark',
//       url: 'mapbox://styles/mapbox/dark-v11',
//       imageUrl: `${process.env.PUBLIC_URL}/${files}dark.png`
//     },
//     {
//       name: 'Satellite',
//       url: 'mapbox://styles/mapbox/satellite-v9',
//       imageUrl: 'path/to/satellite-image.png',
//     },
//   ];

//   const handleStyleChange = (url) => {
//     setSelectedStyle(url);
//     if (mapBox) {
//       mapBox.setStyle(url);
//     }
//   };

//   return (
//     <div className="mapbox-base-layer"
//       style={{
//         position: 'absolute',
//         top: '352px',
//         left: '77vw',
//         backgroundColor: 'black',
//         color: 'white',
//         padding: '10px',
//         boxShadow: '0px 0px 5px rgba(0, 0, 0, 0.3)',
//         zIndex: 1000,
//         width: '300px',
//         maxHeight: '35vh',
//         overflowY: 'scroll'
//       }}>
//       <h5 onClick={onClose} style={{ marginBottom: '10px', textAlign: 'right', cursor: 'pointer' }}>X</h5>
//       <h3>Select Map Style</h3>
//       <div className="mapbox-style-options"
//         style={{
//           display: 'flex',
//           flexDirection: "column",
//           gap: '10px'
//         }}>
//         {styles.map((style) => (
//           <label key={style.url} className="mapbox-style-option" style={{ flex: '1 0 45%' }}>
//             <input
//               type="radio"
//               name="mapStyle"
//               value={style.url}
//               checked={selectedStyle === style.url}
//               onChange={() => handleStyleChange(style.url)}
//             />
//             <img src={style.imageUrl} alt={style.name} className="mapbox-style-image" style={{ width: '18%', margin: '5px', borderRadius: '7px' }} />
//             <span>{style.name}</span>
//           </label>
//         ))}
//       </div>
//     </div>
//   );
// };

// export default MapBoxbaseLayer;
