import React from 'react';
import datasetInfoDictionary from './Info';

export default function InfoWindow({ selFeature }) {
  return (
    <div >
      {selFeature.name && (
        <div>
          {datasetInfoDictionary[selFeature.name]}
        </div> 
      )}
    </div>
  );
}

