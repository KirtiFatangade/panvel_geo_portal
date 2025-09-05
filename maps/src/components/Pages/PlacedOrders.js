import { useEffect, useState } from 'react';
import UP42ORDERS from './up42Orders';
import SKYORDERS from './SkywatchOrders';
import { placedOrders } from '../Main/Actions/satStatic';



export default function PlacedOrders() {
    const [orders, setOrders] = useState([]);
    const [selectedOrder, setSelectedOrder] = useState('');

    useEffect(() => {
        setOrders(placedOrders);
    }, []);

    const handleSelectChange = (e) => {
        setSelectedOrder(e.target.value);
    };

    return (
        <>
            <label style={{ color: "black", fontSize: '15px', fontWeight:'bold' }}>Select Data Providers : </label>
            <select value={selectedOrder} onChange={handleSelectChange} style={{ marginLeft: '15px', padding: '6px 6px 6px 6px', borderRadius: '5px', border: '1px solid #ddd', fontSize: '13px' }}>
            <option style={{fontSize: '15px'}}>Select Order</option>
                {orders.map((order, index) => (
                    <option key={index} value={order} style={{fontSize: '15px'}} >
                        {order}
                    </option>
                ))}
            </select>
            <div className="tab-container">
                {selectedOrder === 'UP42' && (<UP42ORDERS />)}
                {selectedOrder === 'SkyWatch' && (<SKYORDERS />)}
            </div>

        </>

    )
}
