// ManageCloud.js
import React, { useEffect, useState } from "react";
import ManageCloudFile from "./ManageCloudFile";


export default function ManageCloud({ id }) {
    const [showManageCloud, setShowManageCloud] = useState(true);
    const [path, setPath] = useState("/");

    return (
        <div className="cloud-container" style={styles.container}>
            {showManageCloud && (
                <ManageCloudFile
                    path={path}
                    setPath={setPath}
                    id={id}
                />
            )}
        </div>
    );
}

const styles = {
    container: {
        padding: '20px',
        backgroundColor: 'transparent',
        borderRadius: '8px',
        boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
        margin: '0 auto',
    }
};
