import React, { useState, useEffect } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  AreaChart, Area, BarChart, Bar
} from 'recharts';
import api from '../utils/api';

const Analytics = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState('');

  // Assumptions for Port Mapping (These can be customized)
  // V: p1,p2,p3 | I: p4,p5,p6 | kW: p7 | PF: p8 | Hz: p9 | kWh: p10 | P,Q,S: p11,p12,p13 | THD: p14,p15,p16
  const PORT_MAP = {
    v1: 'p1', v2: 'p2', v3: 'p3',
    i1: 'p4', i2: 'p5', i3: 'p6',
    kw: 'p7', pf: 'p8', hz: 'p9', kwh: 'p10',
    p: 'p11', q: 'p12', s: 'p13',
    thd1: 'p14', thd2: 'p15', thd3: 'p16'
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  useEffect(() => {
    if (selectedDevice) {
      fetchAnalyticsData();
      // Set up polling every 60 seconds
      const interval = setInterval(fetchAnalyticsData, 60000);
      return () => clearInterval(interval);
    }
  }, [selectedDevice]);

  const fetchDevices = async () => {
    try {
      const response = await api.get('/channel-mappings/devices');
      setDevices(response.data || []);
      if (response.data && response.data.length > 0) {
        setSelectedDevice(response.data[0].device_id);
      }
    } catch (error) {
      console.error('Error fetching devices:', error);
      setLoading(false);
    }
  };

  const fetchAnalyticsData = async () => {
    if (!selectedDevice) return;
    try {
      const now = new Date();
      const pastHour = new Date(now.getTime() - 60 * 60 * 1000);
      
      const response = await api.get(`/data/device-reports/${selectedDevice}`, {
        params: {
          start_time: pastHour.toISOString(),
          limit: 60 // 60 minutes
        }
      });

      // Format data for Recharts
      const formattedData = response.data.map(item => {
        const date = new Date(item.timestamp);
        return {
          ...item,
          timeLabel: `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
        };
      });

      setData(formattedData);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching analytics data:', error);
      setLoading(false);
    }
  };

  // Get Latest Values for KPIs
  const latestData = data.length > 0 ? data[data.length - 1] : {};
  
  // Safe parsing helper
  const safeVal = (key, fallback = 0) => {
    const val = parseFloat(latestData[PORT_MAP[key]]);
    return isNaN(val) ? fallback : val.toFixed(2);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">3-Phase Power Analytics</h1>
          <p className="text-gray-600">Real-time monitoring and historical trend analysis</p>
        </div>
        <div>
          <select
            value={selectedDevice}
            onChange={(e) => setSelectedDevice(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 bg-white shadow-sm font-medium"
          >
            {devices.length === 0 && <option value="">No devices found</option>}
            {devices.map(d => (
              <option key={d.device_id} value={d.device_id}>Device ID: {d.device_id}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      ) : data.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
          No analytics data available for the last hour. Ensure the device is sending interval payloads.
        </div>
      ) : (
        <>
          {/* Quick Metrics KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col">
              <span className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-1">Total Active Power</span>
              <div className="flex items-baseline space-x-2">
                <span className="text-3xl font-bold text-gray-900">{safeVal('kw')}</span>
                <span className="text-sm font-medium text-gray-500">kW</span>
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col">
              <span className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-1">Average Power Factor</span>
              <div className="flex items-baseline space-x-2">
                <span className="text-3xl font-bold text-gray-900">{safeVal('pf')}</span>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col">
              <span className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-1">Current Frequency</span>
              <div className="flex items-baseline space-x-2">
                <span className="text-3xl font-bold text-gray-900">{safeVal('hz')}</span>
                <span className="text-sm font-medium text-gray-500">Hz</span>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col">
              <span className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-1">Energy Consumption</span>
              <div className="flex items-baseline space-x-2">
                <span className="text-3xl font-bold text-gray-900">{safeVal('kwh')}</span>
                <span className="text-sm font-medium text-gray-500">kWh</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Phase Voltage Chart */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Phase Balancing - Voltage (V_RMS)</h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data} syncId="powerSync">
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis dataKey="timeLabel" tick={{fontSize: 12, fill: '#6B7280'}} tickMargin={10} />
                    <YAxis domain={['auto', 'auto']} tick={{fontSize: 12, fill: '#6B7280'}} width={40} />
                    <RechartsTooltip 
                      contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'}}
                    />
                    <Legend iconType="circle" wrapperStyle={{paddingTop: '20px'}} />
                    <Line type="monotone" dataKey={PORT_MAP.v1} name="L1 Voltage" stroke="#EF4444" strokeWidth={2} dot={false} activeDot={{r: 6}} />
                    <Line type="monotone" dataKey={PORT_MAP.v2} name="L2 Voltage" stroke="#EAB308" strokeWidth={2} dot={false} activeDot={{r: 6}} />
                    <Line type="monotone" dataKey={PORT_MAP.v3} name="L3 Voltage" stroke="#3B82F6" strokeWidth={2} dot={false} activeDot={{r: 6}} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Current Chart */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Phase Balancing - Current (I_RMS)</h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data} syncId="powerSync">
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis dataKey="timeLabel" tick={{fontSize: 12, fill: '#6B7280'}} tickMargin={10} />
                    <YAxis domain={['auto', 'auto']} tick={{fontSize: 12, fill: '#6B7280'}} width={40} />
                    <RechartsTooltip 
                      contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'}}
                    />
                    <Legend iconType="circle" wrapperStyle={{paddingTop: '20px'}} />
                    <Line type="monotone" dataKey={PORT_MAP.i1} name="L1 Current" stroke="#EF4444" strokeWidth={2} dot={false} activeDot={{r: 6}} />
                    <Line type="monotone" dataKey={PORT_MAP.i2} name="L2 Current" stroke="#EAB308" strokeWidth={2} dot={false} activeDot={{r: 6}} />
                    <Line type="monotone" dataKey={PORT_MAP.i3} name="L3 Current" stroke="#3B82F6" strokeWidth={2} dot={false} activeDot={{r: 6}} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Power Demand Area Chart */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Power Demand Over Time</h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data} syncId="powerSync">
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis dataKey="timeLabel" tick={{fontSize: 12, fill: '#6B7280'}} tickMargin={10} />
                    <YAxis tick={{fontSize: 12, fill: '#6B7280'}} width={40} />
                    <RechartsTooltip 
                      contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'}}
                    />
                    <Legend iconType="circle" wrapperStyle={{paddingTop: '20px'}} />
                    <Area type="monotone" dataKey={PORT_MAP.p} name="Real Power (P)" stackId="1" stroke="#10B981" fill="#10B981" fillOpacity={0.6} />
                    <Area type="monotone" dataKey={PORT_MAP.q} name="Reactive Power (Q)" stackId="1" stroke="#F59E0B" fill="#F59E0B" fillOpacity={0.6} />
                    <Area type="monotone" dataKey={PORT_MAP.s} name="Apparent Power (S)" stackId="1" stroke="#6366F1" fill="#6366F1" fillOpacity={0.6} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Harmonic Distortion Bar Chart */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">Total Harmonic Distortion (THD)</h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.slice(-10)}> {/* Show moving window of last 10 points for bars */}
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis dataKey="timeLabel" tick={{fontSize: 12, fill: '#6B7280'}} tickMargin={10} />
                    <YAxis tick={{fontSize: 12, fill: '#6B7280'}} width={40} />
                    <RechartsTooltip 
                      contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'}}
                    />
                    <Legend iconType="circle" wrapperStyle={{paddingTop: '20px'}} />
                    <Bar dataKey={PORT_MAP.thd1} name="THD L1" fill="#EF4444" radius={[4, 4, 0, 0]} />
                    <Bar dataKey={PORT_MAP.thd2} name="THD L2" fill="#EAB308" radius={[4, 4, 0, 0]} />
                    <Bar dataKey={PORT_MAP.thd3} name="THD L3" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default Analytics;
