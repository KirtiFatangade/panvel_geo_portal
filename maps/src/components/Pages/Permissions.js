import React, { useContext, useState, useEffect } from "react";
import { GlobalContext } from "../../App";
import "./ManageOrg.css";
import { HOST } from "../host";
import { logToServer } from "../logger";

const PermissionsTable = ({ setShowPermissions, memberId, permissionId }) => {
  const { userInfo,getCsrfToken,setUserInfo } = useContext(GlobalContext);
  const [permissionsData, setPermissionsData] = useState(null);

  useEffect(() => {
    fetchPermissions(memberId);  
    
  }, [memberId]);

  const fetchPermissions = async (id) => {
    await fetch(`${HOST}/manage-permissions/${id}`, {
      method: "POST",
      credentials: 'include',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-CSRFToken': await getCsrfToken(),
      },
    })
      .then((response) => {
        if (!response.ok) {
          console.log(response);
          throw new Error('Network response was not ok');
        }
        return response.json();
  
      })
      .then((data) => {
        setPermissionsData(data);
        logToServer('info','manage permission successfully')
      })
      .catch((error) => logToServer('error', `${error}`));
  };


  const fetchUpdatePermissions = async (id, permission_id, status) => { 
    try {
        const response = await fetch(`${HOST}/update-permissions/${id}/${permission_id}/${status}`, {
            headers: {
                "Content-Type": "application/json",
            },
            credentials:"include",
        });
        
        if (!response.ok) {
            console.log(response);
            throw new Error('Response was not ok');
        }

        const data = await response.json();
        if(id===userInfo.id){
          userInfo.user_permissions = data.user_permissions;
        }
        
         logToServer('info','updated permission succcessfully')
        // setUserInfo(prevUserInfo => ({ ...prevUserInfo, user_permissions:data.user_permissions }));
        // console.log(userInfo);
        return data;
    } catch (error) {
        console.error('Fetch error:', error);
        logToServer('error',`${error}`)
        throw error; 
    }
};

  const updateCheckbox = (permissionId) => {
    const checkBox = document.getElementById(`check_${permissionId}`);
    const status = checkBox.checked;
    fetchUpdatePermissions(memberId,permissionId,Number(status))
    .then(() => {    
      setPermissionsData((prevData) => {
        const updatedPermissionsData = { ...prevData };  
        for (const [modelName, permissions] of Object.entries(updatedPermissionsData)) {
          const updatedPermissions = permissions.map((permission) => {
            if (permission.id === permissionId) {
              return { ...permission, has_permission: status };
            }
            return permission;
          });
          updatedPermissionsData[modelName] = updatedPermissions;
        }
        return updatedPermissionsData;
      });
    })
    .catch((error) => {
      console.error('Fetch error:', error);
      logToServer('error',`${error}`)
    });
  }

  

  return (
    <div className="table-container" >
      {/* <button className='btn-add' onClick={() => updateCheckbox(memberId, permissionId)}>Update Permissions</button> */}
      <div style={{ maxHeight: 'calc(100vh - 200px)', overflow: 'hidden', overflowY: 'scroll', boxShadow: '1px 5px 10px 8px #bbbbbb' }}>
      <table>
        <thead>
          <tr style={{ borderBottom: "1px solid gray" }}>
            <th className="th">Name</th>
            <th>Can add</th>  
            <th>Can Change</th>
            <th>Can Delete</th>
            <th>Can View</th>
          </tr>
        </thead>
        <tbody>
          {permissionsData &&
            Object.entries(permissionsData).map(([modelName, permissions], index) => (
              <tr key={index}>
                <th className="th">{modelName}</th>

                <td>
                  {permissions.map(permission => (
                    permission.codename.startsWith('add_') && permission.codename.split('_')[0] === 'add' && (
                      <div key={permission.codename}>
                        <input type="checkbox" id={`check_${permission.id}`} checked={permission.has_permission} onClick={()=> updateCheckbox(permission.id)} disabled={modelName==="Organization" && !userInfo.is_superuser}/>                 
                      </div>
                    )
                  ))}
                </td>
                <td>
                  {permissions.map(permission => (
                    permission.codename.startsWith('change_') && permission.codename.split('_')[0] === 'change' && (
                      <div key={permission.codename}>
                         <input type="checkbox" id={`check_${permission.id}`} checked={permission.has_permission} onClick={()=> updateCheckbox(permission.id)}/> 
                      </div>
                    )
                  ))}
                </td>
                <td>
                  {permissions.map(permission => (
                    permission.codename.startsWith('delete_') && permission.codename.split('_')[0] === 'delete' && (
                      <div key={permission.codename}>
                          <input type="checkbox" id={`check_${permission.id}`} checked={permission.has_permission} onClick={()=> updateCheckbox(permission.id)} disabled={modelName==="Organization" && !userInfo.is_superuser}/> 
                      </div>
                    )
                  ))}
                </td>
                <td>
                  {permissions.map(permission => (
                    permission.codename.startsWith('view_') && permission.codename.split('_')[0] === 'view' && (
                      <div key={permission.codename}>
                         <input type="checkbox" id={`check_${permission.id}`} checked={permission.has_permission} onClick={()=> updateCheckbox(permission.id)}/> 
                      </div>
                    )
                  ))}
                </td>
              </tr>
            ))}
        </tbody>
      </table>
      </div>
      <button className="mt-3 btn-add" onClick={() => {
            setShowPermissions(false);
          }}>
            Back
          </button>
    </div>
  );
};
export default PermissionsTable;