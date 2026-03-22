import React, { useState, useEffect } from 'react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';

const ChannelMapping = () => {
    const { user } = useAuth();
    const isAdmin = user?.role === 'admin';

    // State
    const [devices, setDevices] = useState([]);
    const [selectedDevice, setSelectedDevice] = useState('');
    const [newDeviceInput, setNewDeviceInput] = useState('');

    // Device level configuration
    const [deviceClientId, setDeviceClientId] = useState('');
    const [deviceAssetType, setDeviceAssetType] = useState('');
    const [deviceMessageType, setDeviceMessageType] = useState('');

    // Master Lists for dropdowns
    const [clients, setClients] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [locations, setLocations] = useState([]);
    const [sensorTypes, setSensorTypes] = useState([]);

    // The grid mapping data
    const [channels, setChannels] = useState([]);
    const [newPayloadKey, setNewPayloadKey] = useState('');

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [notification, setNotification] = useState(null);

    useEffect(() => {
        fetchMasterData();
        fetchDevices();
    }, []);

    useEffect(() => {
        if (selectedDevice) {
            const devObj = devices.find(d => d.device_id === selectedDevice);
            if (devObj) {
                setDeviceClientId(devObj.client_id || '');
                setDeviceAssetType(devObj.asset_type || '');
                setDeviceMessageType(devObj.message_type || '');
            } else {
                setDeviceClientId('');
                setDeviceAssetType('');
                setDeviceMessageType('');
            }
            fetchDeviceConfig(selectedDevice);
        } else {
            setChannels([]);
            setDeviceClientId('');
            setDeviceAssetType('');
            setDeviceMessageType('');
        }
    }, [selectedDevice, devices]);

    const showNotification = (message, type = 'success') => {
        setNotification({ message, type });
        setTimeout(() => setNotification(null), 4000);
    };

    const fetchMasterData = async () => {
        try {
            const [cRes, dRes, lRes, stRes] = await Promise.all([
                api.get('/clients'),
                api.get('/departments'),
                api.get('/locations'),
                api.get('/sensor-types')
            ]);
            setClients(cRes.data || []);
            setDepartments(dRes.data || []);

            // Enrich locations with client_id via department
            const deptMap = {};
            (dRes.data || []).forEach(d => { deptMap[d.id] = d.client_id; });
            const enrichedLocs = (lRes.data || []).map(loc => ({
                ...loc,
                client_id: deptMap[loc.department_id] || null
            }));
            setLocations(enrichedLocs);
            setSensorTypes(stRes.data || []);
        } catch (err) {
            console.error('Failed to load master data:', err);
            showNotification('Failed to load dropdown data', 'error');
        }
    };

    const fetchDevices = async () => {
        try {
            const res = await api.get('/channel-mappings/devices');
            setDevices(res.data || []);
        } catch (err) {
            console.error('Error fetching devices', err);
        }
    };

    const fetchDeviceConfig = async (deviceId) => {
        setLoading(true);
        try {
            // Get all mappings for this device
            const res = await api.get(`/channel-mappings?device_id=${deviceId}`);
            const data = res.data || [];

            // Fetch the actual sensor objects so we can auto-fill location / sensor_type in the grid
            const sensorIds = [...new Set(data.map(m => m.sensor_id).filter(id => id))];
            let sensorsDict = {};
            if (sensorIds.length > 0) {
                // Fetch full sensor info to get the location_id/sensor_type_id
                const sensorsRes = await api.get('/sensors'); // we filter client side for speed
                const allSensors = sensorsRes.data || [];
                sensorsDict = allSensors.reduce((acc, curr) => {
                    acc[curr.id] = curr;
                    return acc;
                }, {});
            }

            // Transform mappings to UI rows
            const loadedChannels = data.map(m => {
                const s = sensorsDict[m.sensor_id] || {};
                let clientId = null;
                if (s.location_id) {
                    const loc = locations.find(l => l.id === s.location_id);
                    if (loc) clientId = loc.client_id;
                }

                return {
                    id: m.id,
                    payload_key: m.payload_key,
                    alias: m.alias || '',
                    sensor_id: m.sensor_id, // keep link attached
                    client_id: clientId || '',
                    location_id: s.location_id || '',
                    sensor_type_id: s.sensor_type_id || '',
                    mqtt_topic: s.mqtt_topic || 'voltas',
                    _isNew: false
                };
            });

            setChannels(loadedChannels);
        } catch (err) {
            console.error('Failed to fetch config', err);
            setChannels([]);
        } finally {
            setLoading(false);
        }
    };

    const handleAddDevice = () => {
        const trimmed = newDeviceInput.trim();
        if (!trimmed) {
            showNotification('Please enter a Device ID', 'error');
            return;
        }
        if (!devices.find(d => d.device_id === trimmed)) {
            setDevices(prev => [...prev, { device_id: trimmed, client_id: null, asset_type: null, message_type: null }]);
        }
        setSelectedDevice(trimmed);
        setNewDeviceInput('');
    };

    const handleAddPayloadKey = () => {
        const trimmed = newPayloadKey.trim().toLowerCase();
        if (!trimmed) return;
        if (channels.find(c => c.payload_key === trimmed)) {
            showNotification(`Key "${trimmed}" already exists`, 'error');
            return;
        }
        setChannels(prev => [...prev, {
            id: null,
            payload_key: trimmed,
            alias: '',
            client_id: '',
            location_id: '',
            sensor_type_id: '',
            mqtt_topic: 'voltas',
            _isNew: true,
            _isDirty: true
        }]);
        setNewPayloadKey('');
    };

    const handleChannelChange = (index, field, value) => {
        setChannels(prev => {
            const row = { ...prev[index], [field]: value, _isDirty: true };
            // If client changes, reset location
            if (field === 'client_id') row.location_id = '';
            const copy = [...prev];
            copy[index] = row;
            return copy;
        });
    };

    const handleRemoveChannel = async (index) => {
        const ch = channels[index];
        if (ch.id) {
            try {
                await api.delete(`/channel-mappings/${ch.id}`);
                showNotification('Channel removed');
            } catch (err) {
                showNotification('Failed to delete channel', 'error');
                return;
            }
        }
        setChannels(prev => prev.filter((_, i) => i !== index));
    };

    const handleSaveAll = async () => {
        if (!selectedDevice) return;
        setSaving(true);
        try {
            // Validate required fields
            const invalidRow = channels.find(c => c.payload_key && (!c.sensor_type_id || !c.location_id));
            if (invalidRow) {
                showNotification(`Location and Sensor Type are required for mapping ${invalidRow.payload_key}`, 'error');
                setSaving(false);
                return;
            }

            const payload = channels
                .filter(c => c.payload_key)
                .map(c => ({
                    payload_key: c.payload_key,
                    alias: c.alias,
                    location_id: c.location_id,
                    sensor_type_id: c.sensor_type_id,
                    mqtt_topic: c.mqtt_topic
                }));

            await api.post('/channel-mappings/device-config', {
                device_id: selectedDevice,
                client_id: deviceClientId || null,
                asset_type: deviceAssetType || null,
                message_type: deviceMessageType || null,
                channels: payload
            });

            showNotification(`✅ Successfully saved configuration for device "${selectedDevice}"`);
            await fetchDeviceConfig(selectedDevice); // reload to get proper sensor IDs back
            await fetchDevices();
        } catch (err) {
            console.error('Error saving config', err);
            showNotification(err.response?.data?.error || 'Failed to save configuration', 'error');
        } finally {
            setSaving(false);
        }
    };

    // UI Helpers
    const getSensorTypeObj = (id) => sensorTypes.find(st => st.id === parseInt(id));

    return (
        <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto', fontFamily: 'Inter, sans-serif' }}>
            {/* Notification */}
            {notification && (
                <div style={{
                    position: 'fixed', top: '20px', right: '20px', zIndex: 1000,
                    padding: '12px 20px', borderRadius: '8px', fontWeight: 600,
                    background: notification.type === 'error' ? '#ef4444' : '#22c55e',
                    color: '#fff', boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                }}>
                    {notification.message}
                </div>
            )}

            {/* Header */}
            <div style={{ marginBottom: '28px' }}>
                <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#1e293b', margin: 0 }}>
                    🔗 Device & Sensor Configuration
                </h1>
                <p style={{ color: '#64748b', marginTop: '6px', fontSize: '14px' }}>
                    Map MQTT payload keys to locations and sensor types. Sensors and mappings will be created automatically.
                    Live vs Interval data mode is auto-detected from the device payload.
                </p>
            </div>

            {/* Device Selector */}
            <div style={{
                display: 'flex', gap: '12px', alignItems: 'flex-end',
                marginBottom: '24px', flexWrap: 'wrap'
            }}>
                <div style={{ flex: '1', minWidth: '200px' }}>
                    <label style={labelStyle}>Select Device</label>
                    <select
                        value={selectedDevice}
                        onChange={e => { setSelectedDevice(e.target.value); setNewDeviceInput(''); }}
                        style={inputStyle}
                    >
                        <option value="">-- Select a device --</option>
                        {devices.map(d => (
                            <option key={d.device_id} value={d.device_id}>{d.device_id}</option>
                        ))}
                    </select>
                </div>

                {isAdmin && (
                    <>
                        <div style={{ flex: '1', minWidth: '200px' }}>
                            <label style={labelStyle}>Or Enter New Device ID</label>
                            <input
                                type="text"
                                value={newDeviceInput}
                                onChange={e => setNewDeviceInput(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleAddDevice()}
                                placeholder="e.g. 200000000051"
                                style={inputStyle}
                            />
                        </div>
                        <button onClick={handleAddDevice} style={{ ...btnStyle, background: '#6366f1' }}>
                            + Add Device
                        </button>
                    </>
                )}
            </div>

            {/* Configuration Grid */}
            {selectedDevice && (
                <div style={{ background: '#fff', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
                    <div style={{
                        padding: '16px 20px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                    }}>
                        <span style={{ fontWeight: 600, color: '#1e293b', fontSize: '15px' }}>
                            Configuring Device: <code style={{ background: '#e2e8f0', padding: '2px 8px', borderRadius: '4px' }}>{selectedDevice}</code>
                        </span>
                        {isAdmin && (
                            <button
                                onClick={handleSaveAll}
                                disabled={saving}
                                style={{ ...btnStyle, background: saving ? '#94a3b8' : '#22c55e' }}
                            >
                                {saving ? '⏳ Saving...' : '💾 Save Configuration'}
                            </button>
                        )}
                    </div>

                    <div style={{ padding: '16px 20px', background: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                        <div style={{ flex: '1', minWidth: '200px' }}>
                            <label style={labelStyle}>Client ID (Device Owner)</label>
                            <select
                                disabled={!isAdmin}
                                value={deviceClientId}
                                onChange={e => setDeviceClientId(e.target.value)}
                                style={inputStyle}
                            >
                                <option value="">-- Select Client --</option>
                                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div style={{ flex: '1', minWidth: '200px' }}>
                            <label style={labelStyle}>Asset Type</label>
                            <input
                                disabled={!isAdmin}
                                type="text"
                                value={deviceAssetType}
                                onChange={e => setDeviceAssetType(e.target.value)}
                                placeholder="e.g. carding"
                                style={inputStyle}
                            />
                        </div>
                        <div style={{ flex: '1', minWidth: '200px' }}>
                            <label style={labelStyle}>Message Type</label>
                            <input
                                disabled={!isAdmin}
                                type="text"
                                value={deviceMessageType}
                                onChange={e => setDeviceMessageType(e.target.value)}
                                placeholder="e.g. Seconds"
                                style={inputStyle}
                            />
                        </div>
                    </div>

                    {loading ? (
                        <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>Loading configuration...</div>
                    ) : (
                        <>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ background: '#f1f5f9' }}>
                                        <th style={thStyle}>Payload Key</th>
                                        <th style={thStyle}>Client / Location *</th>
                                        <th style={thStyle}>Sensor Type * / Unit</th>
                                        <th style={thStyle}>Display Name (Alias)</th>
                                        <th style={thStyle}>MQTT Topic</th>
                                        {isAdmin && <th style={thStyle}>Actions</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {channels.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>
                                                No payload keys configured yet. Add keys (e.g., p1, p2) below.
                                            </td>
                                        </tr>
                                    ) : (
                                        channels.map((ch, index) => {
                                            const filteredLocations = ch.client_id
                                                ? locations.filter(l => String(l.client_id) === String(ch.client_id))
                                                : locations;

                                            const stInfo = getSensorTypeObj(ch.sensor_type_id);

                                            return (
                                                <tr key={`row-${index}`} style={{
                                                    borderBottom: '1px solid #f1f5f9',
                                                    background: ch._isDirty || ch._isNew ? '#fff7ed' : 'transparent',
                                                    verticalAlign: 'top'
                                                }}>
                                                    {/* Key */}
                                                    <td style={{ ...tdStyle, paddingTop: '16px' }}>
                                                        <code style={{
                                                            background: '#e2e8f0', padding: '4px 8px', borderRadius: '6px',
                                                            fontWeight: 600, fontSize: '13px', color: '#1e293b'
                                                        }}>
                                                            {ch.payload_key}
                                                        </code>
                                                        {ch._isNew && (
                                                            <div style={{ fontSize: '11px', color: '#f59e0b', fontWeight: 600, marginTop: '4px' }}>NEW</div>
                                                        )}
                                                    </td>

                                                    {/* Client & Location */}
                                                    <td style={tdStyle}>
                                                        <select
                                                            disabled={!isAdmin}
                                                            value={ch.client_id || ''}
                                                            onChange={e => handleChannelChange(index, 'client_id', e.target.value)}
                                                            style={{ ...inputStyle, marginBottom: '8px' }}
                                                        >
                                                            <option value="">-- Select Client --</option>
                                                            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                                        </select>
                                                        <select
                                                            disabled={!isAdmin || !ch.client_id}
                                                            value={ch.location_id || ''}
                                                            onChange={e => handleChannelChange(index, 'location_id', parseInt(e.target.value))}
                                                            style={inputStyle}
                                                        >
                                                            <option value="">{ch.client_id ? '-- Select Location --' : '(Select Client First)'}</option>
                                                            {filteredLocations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                                                        </select>
                                                    </td>

                                                    {/* Sensor Type & Unit */}
                                                    <td style={tdStyle}>
                                                        <select
                                                            disabled={!isAdmin}
                                                            value={ch.sensor_type_id || ''}
                                                            onChange={e => handleChannelChange(index, 'sensor_type_id', parseInt(e.target.value))}
                                                            style={inputStyle}
                                                        >
                                                            <option value="">-- Select Sensor Type --</option>
                                                            {sensorTypes.map(st => <option key={st.id} value={st.id}>{st.name}</option>)}
                                                        </select>
                                                        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '6px', paddingLeft: '4px' }}>
                                                            Unit: <strong style={{ color: '#1e293b' }}>{stInfo?.unit || '—'}</strong>
                                                        </div>
                                                    </td>

                                                    {/* Alias */}
                                                    <td style={{ ...tdStyle, verticalAlign: 'middle' }}>
                                                        <input
                                                            disabled={!isAdmin}
                                                            type="text"
                                                            value={ch.alias || ''}
                                                            onChange={e => handleChannelChange(index, 'alias', e.target.value)}
                                                            placeholder={`${selectedDevice}-${ch.payload_key}`}
                                                            style={{ ...inputStyle, margin: 0 }}
                                                        />
                                                    </td>

                                                    {/* MQTT Topic */}
                                                    <td style={{ ...tdStyle, verticalAlign: 'middle' }}>
                                                        <input
                                                            disabled={!isAdmin}
                                                            type="text"
                                                            value={ch.mqtt_topic || ''}
                                                            onChange={e => handleChannelChange(index, 'mqtt_topic', e.target.value)}
                                                            placeholder="voltas"
                                                            style={{ ...inputStyle, margin: 0, width: '100px' }}
                                                        />
                                                    </td>

                                                    {/* Actions */}
                                                    {isAdmin && (
                                                        <td style={{ ...tdStyle, verticalAlign: 'middle' }}>
                                                            <button
                                                                onClick={() => handleRemoveChannel(index)}
                                                                style={{ ...btnStyle, background: '#ef4444', padding: '6px 12px', fontSize: '13px' }}
                                                            >
                                                                🗑️ Drop
                                                            </button>
                                                        </td>
                                                    )}
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>

                            {isAdmin && (
                                <div style={{
                                    padding: '16px 20px', borderTop: '1px dashed #e2e8f0',
                                    display: 'flex', gap: '10px', alignItems: 'center', background: '#f8fafc'
                                }}>
                                    <span style={{ color: '#64748b', fontSize: '14px', fontWeight: 500 }}>Add payload key:</span>
                                    <input
                                        type="text"
                                        value={newPayloadKey}
                                        onChange={e => setNewPayloadKey(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleAddPayloadKey()}
                                        placeholder="e.g. p1, p2, p3"
                                        style={{ ...inputStyle, margin: 0, width: '180px' }}
                                    />
                                    <button onClick={handleAddPayloadKey} style={{ ...btnStyle, background: '#6366f1' }}>
                                        + Add Key Row
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}

            {!selectedDevice && (
                <div style={{
                    background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '12px',
                    padding: '24px', marginTop: '16px'
                }}>
                    <h3 style={{ color: '#0369a1', margin: '0 0 12px 0', fontSize: '16px' }}>ℹ️ How Configuration Works</h3>
                    <ul style={{ color: '#0c4a6e', lineHeight: '1.8', margin: 0, paddingLeft: '20px', fontSize: '14px' }}>
                        <li>Type your <strong>Device ID</strong> (e.g. <code>200000000051</code>) and click + Add Device.</li>
                        <li>Add rows for each data key your device sends (e.g. <code>p1</code>, <code>p2</code>).</li>
                        <li>Select which <strong>Location</strong> and <strong>Sensor Type</strong> this key represents.</li>
                        <li>Sensors will be <strong>automatically created</strong> in the system based on this mapping table.</li>
                        <li>Live vs Interval handling is managed automatically by the backend via the payload's <code>Device_status</code> field.</li>
                    </ul>
                </div>
            )}
        </div>
    );
};

// Styles
const labelStyle = {
    display: 'block', fontSize: '13px', fontWeight: 600,
    color: '#374151', marginBottom: '6px'
};

const inputStyle = {
    width: '100%', padding: '8px 12px', border: '1px solid #d1d5db',
    borderRadius: '6px', fontSize: '14px', color: '#1e293b',
    background: '#fff', outline: 'none', boxSizing: 'border-box'
};

const btnStyle = {
    padding: '8px 16px', border: 'none', borderRadius: '6px',
    color: '#fff', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap'
};

const thStyle = {
    padding: '12px 16px', textAlign: 'left', fontSize: '12px',
    fontWeight: 700, color: '#64748b', textTransform: 'uppercase',
    letterSpacing: '0.05em', borderBottom: '1px solid #e2e8f0'
};

const tdStyle = {
    padding: '12px 16px', fontSize: '14px', color: '#1e293b'
};

export default ChannelMapping;
