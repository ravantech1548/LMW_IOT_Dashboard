import React, { useState, useEffect } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell
} from 'recharts';
import api from '../utils/api';

// Reusable Semi-Circle Gauge Component using Recharts
const Gauge = ({ value, min, max, label, unit, color }) => {
  const safeVal = Math.min(Math.max(value, min), max);
  const percentage = (safeVal - min) / (max - min);
  
  const data = [
    { name: 'value', value: percentage * 100, color: color || '#3B82F6' },
    { name: 'rest', value: (1 - percentage) * 100, color: '#E5E7EB' }
  ];

  return (
    <div className="flex flex-col items-center">
      <div className="relative h-32 w-full flex justify-center">
        <ResponsiveContainer width={200} height={160}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="75%"
              startAngle={180}
              endAngle={0}
              innerRadius={60}
              outerRadius={80}
              paddingAngle={0}
              dataKey="value"
              stroke="none"
              cornerRadius={5}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute bottom-2 text-center w-full">
          <div className="text-3xl font-bold text-gray-800">{Number(value).toFixed(2)} <span className="text-sm text-gray-500 font-medium">{unit}</span></div>
        </div>
      </div>
      <div className="text-sm font-semibold text-gray-500 uppercase tracking-wider mt-2">{label}</div>
    </div>
  );
};

const Analytics = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState('');
  
  const [selectedShiftId, setSelectedShiftId] = useState(() => {
    const h = new Date().getHours();
    if (h >= 7 && h < 15) return 1;
    if (h >= 15 && h < 23) return 2;
    return 3;
  });
  
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    const tzOffset = d.getTimezoneOffset() * 60000;
    return new Date(Date.now() - tzOffset).toISOString().split('T')[0];
  });

  // Corrected Port Mapping based on documentation:
  // V: p1(R-Y), p2(Y-B), p3(B-R) | Hz: p4 | I: p5(R), p6(Y), p7(B) | PF: p8 | kWh: p9
  const PORT_MAP = {
    v1: 'p1', v2: 'p2', v3: 'p3',
    hz: 'p4',
    i1: 'p5', i2: 'p6', i3: 'p7',
    pf: 'p8', kwh: 'p9',
    kw: 'p10', 
    p: 'p11', q: 'p12', s: 'p13',
    thd1: 'p14', thd2: 'p15', thd3: 'p16'
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  useEffect(() => {
    if (selectedDevice && selectedDate) {
      fetchAnalyticsData();
      const interval = setInterval(fetchAnalyticsData, 60000);
      return () => clearInterval(interval);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDevice, selectedShiftId, selectedDate]);

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
    if (!selectedDevice || !selectedDate) return;
    try {
      const start = new Date(`${selectedDate}T00:00:00`);
      const end = new Date(`${selectedDate}T00:00:00`);

      if (selectedShiftId === 1) { // 7am to 3pm
        start.setHours(7, 0, 0, 0);
        end.setHours(14, 59, 59, 999);
      } else if (selectedShiftId === 2) { // 3pm to 11pm
        start.setHours(15, 0, 0, 0);
        end.setHours(22, 59, 59, 999);
      } else if (selectedShiftId === 3) { // 11pm to 7am logically
        start.setHours(23, 0, 0, 0);
        end.setDate(end.getDate() + 1);
        end.setHours(6, 59, 59, 999);
      }
      
      const response = await api.get(`/data/device-reports/${selectedDevice}`, {
        params: {
          start_time: start.toISOString(),
          end_time: end.toISOString(),
          limit: 100000 
        }
      });

      // Format data for Recharts, filling the logical shift gaps so X-Axis spans entirety
      const dataMap = new Map();
      response.data.forEach(item => {
        const date = new Date(item.timestamp);
        const timeLabel = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
        dataMap.set(timeLabel, item);
      });

      const formattedData = [];
      let current = new Date(start);
      while (current <= end) {
        const timeLabel = `${current.getHours().toString().padStart(2, '0')}:${current.getMinutes().toString().padStart(2, '0')}`;
        const existing = dataMap.get(timeLabel);
        
        if (existing) {
          formattedData.push({ ...existing, timeLabel });
        } else {
          formattedData.push({ timeLabel }); 
        }
        current.setMinutes(current.getMinutes() + 1);
      }

      setData(formattedData);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching analytics data:', error);
      setLoading(false);
    }
  };

  // Safe parsing helper to get latest valid measurement for gauges
  const getLatestVal = (key) => {
    // Reverse find the first non-null/undefined value
    for (let i = data.length - 1; i >= 0; i--) {
      if (data[i] && data[i][PORT_MAP[key]] != null) {
        return parseFloat(data[i][PORT_MAP[key]]);
      }
    }
    return 0;
  };

  const currentFreq = getLatestVal('hz');
  const currentPF = getLatestVal('pf');

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Energy Meter Analytics</h1>
          <p className="text-gray-600">Phase balancing and historical trend monitoring</p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 bg-white shadow-sm font-medium h-10"
          />
          <select
            value={selectedShiftId}
            onChange={(e) => setSelectedShiftId(parseInt(e.target.value))}
            className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 bg-white shadow-sm font-medium h-10"
          >
            <option value={1}>Shift 1 (7 AM - 3 PM)</option>
            <option value={2}>Shift 2 (3 PM - 11 PM)</option>
            <option value={3}>Shift 3 (11 PM - 7 AM)</option>
          </select>
          <select
            value={selectedDevice}
            onChange={(e) => setSelectedDevice(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 bg-white shadow-sm font-medium h-10"
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
          No analytics data available for the selected shift. Ensure the device is sending interval payloads.
        </div>
      ) : (
        <div className="space-y-8">
          
          {/* TOP ROW: Gauges/KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center justify-center">
              <Gauge 
                value={currentFreq} 
                min={45} max={55} 
                label="P4: Current Frequency" 
                unit="Hz" 
                color="#8B5CF6" 
              />
            </div>
            
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center justify-center">
              <Gauge 
                value={currentPF} 
                min={0} max={1} 
                label="P8: Average Power Factor" 
                unit="" 
                color="#10B981" 
              />
            </div>
          </div>

          {/* MIDDLE ROW: Primary Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">P1, P2, P3: Line Voltage (V_RMS)</h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data} syncId="energySync">
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis dataKey="timeLabel" tick={{fontSize: 12, fill: '#6B7280'}} tickMargin={10} minTickGap={30} />
                    <YAxis domain={[350, 450]} tick={{fontSize: 12, fill: '#6B7280'}} width={40} />
                    <RechartsTooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'}} />
                    <Legend iconType="circle" wrapperStyle={{paddingTop: '20px'}} />
                    <Line type="monotone" dataKey={PORT_MAP.v1} name="P1 (R-Y)" stroke="#EF4444" strokeWidth={2} dot={false} activeDot={{r: 6}} connectNulls />
                    <Line type="monotone" dataKey={PORT_MAP.v2} name="P2 (Y-B)" stroke="#EAB308" strokeWidth={2} dot={false} activeDot={{r: 6}} connectNulls />
                    <Line type="monotone" dataKey={PORT_MAP.v3} name="P3 (B-R)" stroke="#3B82F6" strokeWidth={2} dot={false} activeDot={{r: 6}} connectNulls />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">P5, P6, P7: Current (I_RMS)</h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  {/* Changed to Area Chart directly representing R, Y, B as overlapping filled phases */}
                  <AreaChart data={data} syncId="energySync">
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis dataKey="timeLabel" tick={{fontSize: 12, fill: '#6B7280'}} tickMargin={10} minTickGap={30} />
                    <YAxis domain={[50, 130]} tick={{fontSize: 12, fill: '#6B7280'}} width={40} />
                    <RechartsTooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'}} />
                    <Legend iconType="circle" wrapperStyle={{paddingTop: '20px'}} />
                    <Area type="monotone" dataKey={PORT_MAP.i1} name="P5 (R Amp)" stroke="#EF4444" fill="#EF4444" fillOpacity={0.2} strokeWidth={2} connectNulls />
                    <Area type="monotone" dataKey={PORT_MAP.i2} name="P6 (Y Amp)" stroke="#EAB308" fill="#EAB308" fillOpacity={0.2} strokeWidth={2} connectNulls />
                    <Area type="monotone" dataKey={PORT_MAP.i3} name="P7 (B Amp)" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.2} strokeWidth={2} connectNulls />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* BOTTOM ROW: Secondary */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pb-12">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">P8: Power Factor Trend</h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data} syncId="energySync">
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis dataKey="timeLabel" tick={{fontSize: 12, fill: '#6B7280'}} tickMargin={10} minTickGap={30} />
                    <YAxis domain={[0, 1]} tick={{fontSize: 12, fill: '#6B7280'}} width={40} />
                    <RechartsTooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'}} />
                    <Legend iconType="circle" wrapperStyle={{paddingTop: '20px'}} />
                    <Line type="monotone" dataKey={PORT_MAP.pf} name="Power Factor" stroke="#10B981" strokeWidth={2} dot={false} activeDot={{r: 6}} connectNulls />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">P9: Energy Usage (kWh)</h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data} syncId="energySync">
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis dataKey="timeLabel" tick={{fontSize: 12, fill: '#6B7280'}} tickMargin={10} minTickGap={30} />
                    <YAxis tick={{fontSize: 12, fill: '#6B7280'}} width={40} />
                    <RechartsTooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'}} />
                    <Legend iconType="circle" wrapperStyle={{paddingTop: '20px'}} />
                    <Bar dataKey={PORT_MAP.kwh} name="Energy (kWh)" fill="#F97316" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
};

export default Analytics;
