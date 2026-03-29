import React, { useState, useEffect } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell
} from 'recharts';
import api from '../utils/api';

// ------------------------------------------------------------------
// REUSABLE GAUGE COMPONENT
// ------------------------------------------------------------------
const Gauge = ({ value, min, max, label, unit, color }) => {
  const safeVal = Math.min(Math.max(value || 0, min), max);
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
          <div className="text-3xl font-bold text-gray-800">
            {Number(value || 0).toFixed(2)} <span className="text-sm text-gray-500 font-medium">{unit}</span>
          </div>
        </div>
      </div>
      <div className="text-sm font-semibold text-gray-500 uppercase tracking-wider mt-2">{label}</div>
    </div>
  );
};

// ------------------------------------------------------------------
// DASHBOARD 1: ENERGY METER
// ------------------------------------------------------------------
const EnergyDashboard = ({ data }) => {
  const PORT_MAP = {
    v1: 'p1', v2: 'p2', v3: 'p3', hz: 'p4',
    i1: 'p5', i2: 'p6', i3: 'p7', pf: 'p8', kwh: 'p9'
  };

  const getLatestVal = (key) => {
    for (let i = data.length - 1; i >= 0; i--) {
      if (data[i] && data[i][PORT_MAP[key]] != null) return parseFloat(data[i][PORT_MAP[key]]);
    }
    return 0;
  };

  return (
    <div className="space-y-8">
      {/* TOP ROW: Gauges/KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center justify-center">
          <Gauge value={getLatestVal('hz')} min={45} max={55} label="P4: Current Frequency" unit="Hz" color="#8B5CF6" />
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex items-center justify-center">
          <Gauge value={getLatestVal('pf')} min={0} max={1} label="P8: Average Power Factor" unit="" color="#10B981" />
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
  );
};

// ------------------------------------------------------------------
// DASHBOARD 2: PLC
// ------------------------------------------------------------------
const PLCDashboard = ({ data, selectedDate, selectedShiftId }) => {
  const PORT_MAP = {
    shift: 'p1', length: 'p2', kgs: 'p3', hr: 'p4', min: 'p5',
    eff: 'p6', can: 'p7', break: 'p8', defect: 'p9',
    efault: 'p10', mfault: 'p11'
  };

  const getLatestVal = (key) => {
    for (let i = data.length - 1; i >= 0; i--) {
      if (data[i] && data[i][PORT_MAP[key]] != null) return parseFloat(data[i][PORT_MAP[key]]);
    }
    return 0;
  };

  const currentKgs = getLatestVal('kgs');
  const currentCan = getLatestVal('can');
  const currentEff = getLatestVal('eff');
  const currentDefect = getLatestVal('defect');
  const currentShift = getLatestVal('shift') || 1;
  const currentLength = getLatestVal('length') || 0;
  const currentHr = getLatestVal('hr') || 0;
  const currentMin = getLatestVal('min') || 0;

  // Build timeline payload where each minute tick represents a colored block.
  const timelineData = data.map(d => {
    const isEfault = d.p10 ? parseFloat(d.p10) > 0 : false;
    const isMfault = d.p11 ? parseFloat(d.p11) > 0 : false;
    const isBreak = d.p8 ? parseFloat(d.p8) > 0 : false;
    const hasData = Object.keys(d).length > 2; // contains actual data instead of just timeLabel boundary empty placeholder
    
    return {
      timeLabel: d.timeLabel,
      running: (hasData && !isEfault && !isMfault && !isBreak) ? 1 : 0,
      onBreak: isBreak ? 1 : 0,
      eFault: isEfault ? 1 : 0,
      mFault: isMfault ? 1 : 0
    };
  });

  // Shift Marathon Logic
  const actualProductionMins = currentHr * 60 + currentMin;
  const start = new Date(`${selectedDate}T00:00:00`);
  if (selectedShiftId === 1) start.setHours(7, 0, 0, 0);
  else if (selectedShiftId === 2) start.setHours(15, 0, 0, 0);
  else if (selectedShiftId === 3) start.setHours(23, 0, 0, 0);

  const now = new Date();
  const totalShiftMins = 480; 
  let timeElapsedMins = 0;
  
  if (now > start) {
    timeElapsedMins = Math.min(Math.floor((now - start) / 60000), totalShiftMins);
  }

  const safeActualMins = Math.min(actualProductionMins, totalShiftMins);
  const pctElapsed = (timeElapsedMins / totalShiftMins) * 100;
  const pctActual = (safeActualMins / totalShiftMins) * 100;

  const isBehindSchedule = safeActualMins < timeElapsedMins;
  const barColor = isBehindSchedule ? 'bg-orange-500' : 'bg-emerald-500';

  return (
    <div className="space-y-6 pb-12">
      {/* SHIFT MARATHON BAR */}
      <div className="bg-white rounded-xl shadow border border-gray-100 p-8 flex flex-col justify-between items-center bg-gradient-to-r from-slate-50 to-white">
        <div className="w-full flex justify-between items-end mb-6">
           <div>
             <h2 className="text-2xl font-bold text-gray-800 flex items-center">
               <span className={`w-3 h-3 rounded-full mr-3 animate-pulse ${isBehindSchedule ? 'bg-orange-500' : 'bg-emerald-500'}`}></span>
               Shift Marathon (Production Pace)
             </h2>
             <p className="text-sm text-gray-500 font-medium ml-6 mt-1">
               Visualizing P4/P5 Machine Runtime vs Physical Shift Time
             </p>
           </div>
           
           <div className="text-right">
             <div className="text-sm font-bold text-slate-500">Target Elapsed: {Math.floor(timeElapsedMins/60)}h {timeElapsedMins%60}m</div>
             <div className={`text-sm font-black tracking-wide ${isBehindSchedule ? 'text-orange-600' : 'text-emerald-600'}`}>
               Actual Prod: {Math.floor(safeActualMins/60)}h {safeActualMins%60}m
             </div>
           </div>
        </div>

        <div className="w-full relative py-2">
           {/* Background Track */}
           <div className="w-full bg-slate-200 rounded-full h-8 relative shadow-inner overflow-hidden border border-slate-300">
             
             {/* Target/Elapsed Progress Backdrop */}
             <div className="absolute top-0 left-0 h-full bg-slate-300 border-r-2 border-slate-400 transition-all duration-500 opacity-60" style={{width: `${pctElapsed}%`}}></div>
             
             {/* Actual Production Progress Colored Bar */}
             <div className={`absolute top-0 left-0 h-full rounded-r-sm transition-all duration-700 ease-out shadow-md opacity-90 ${barColor}`} style={{width: `${pctActual}%`}}></div>
           </div>

           {/* Elapsed Target Marker (The Pointer) */}
           {pctElapsed > 0 && pctElapsed < 100 && (
             <div className="absolute top-0 bottom-0 w-[3px] bg-slate-800 z-10 shadow-md" style={{left: `${pctElapsed}%`, transform: 'translateX(-50%)'}}>
               <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-[10px] font-black uppercase tracking-wider text-slate-800 whitespace-nowrap bg-white px-2 py-0.5 rounded shadow-sm border border-slate-200">
                 Target Scope
               </div>
               <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-4 h-4 bg-slate-800 rotate-45 rounded-sm"></div>
             </div>
           )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT COLUMN: KPI Grid */}
        <div className="lg:col-span-1 space-y-6">
          {/* Single Score Card for P2 (Length Incremental) */}
          <div className="bg-gradient-to-br from-indigo-50 to-white rounded-xl shadow-sm border border-indigo-100 p-8 flex flex-col justify-center min-h-[180px]">
            <h3 className="text-indigo-600 uppercase font-black tracking-wider text-sm mb-4">P2: Output Length Produced</h3>
            <div className="text-6xl font-extrabold text-gray-900 tracking-tighter">{currentLength.toLocaleString()}</div>
          </div>
          
          {/* Single Score Card for P3 (Kilograms Incremental) */}
          <div className="bg-gradient-to-br from-blue-50 to-white rounded-xl shadow-sm border border-blue-100 p-8 flex flex-col justify-center min-h-[180px]">
            <h3 className="text-blue-600 uppercase font-black tracking-wider text-sm mb-4">P3: Production Weight (KGs)</h3>
            <div className="text-6xl font-extrabold text-gray-900 tracking-tighter">{currentKgs.toLocaleString()}</div>
          </div>
        </div>

        {/* CENTER COLUMN: Efficiency Donut */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col justify-center">
          <h3 className="text-xl font-bold text-gray-800 mb-8 text-center">Machine Reliability Diagnostics</h3>
          <div className="flex flex-col md:flex-row justify-around items-center space-y-8 md:space-y-0">
            <Gauge value={currentEff} min={0} max={100} label="P6: Operational Efficiency" unit="%" color={currentEff >= 85 ? '#10B981' : currentEff >= 60 ? '#F59E0B' : '#EF4444'} />
            <Gauge value={currentDefect} min={0} max={100} label="P9: Defect Rejection Rate" unit="%" color="#EF4444" />
          </div>
        </div>
      </div>

      {/* BOTTOM ROW: Fault Timeline */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-gray-800">Fault & Downtime Analysis</h3>
          <div className="flex items-center space-x-6 text-sm font-semibold text-gray-600">
            <span className="flex items-center"><span className="w-3 h-3 rounded bg-[#10B981] mr-2"></span> Running</span>
            <span className="flex items-center"><span className="w-3 h-3 rounded bg-[#FACC15] mr-2"></span> On Break (P8)</span>
            <span className="flex items-center"><span className="w-3 h-3 rounded bg-[#EF4444] mr-2"></span> E-Fault (P10)</span>
            <span className="flex items-center"><span className="w-3 h-3 rounded bg-[#A855F7] mr-2"></span> M-Fault (P11)</span>
          </div>
        </div>
        <div className="h-24">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={timelineData} barGap={0} barCategoryGap={0}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
              <XAxis dataKey="timeLabel" tick={{fontSize: 12, fill: '#6B7280'}} minTickGap={30} axisLine={false} tickLine={false} />
              <YAxis hide domain={[0, 1]} />
              <RechartsTooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'}} cursor={{fill: 'transparent'}} />
              <Bar dataKey="running" stackId="a" fill="#10B981" animationDuration={0} name="Running" />
              <Bar dataKey="onBreak" stackId="a" fill="#FACC15" animationDuration={0} name="On Break" />
              <Bar dataKey="eFault" stackId="a" fill="#EF4444" animationDuration={0} name="Electrical Fault" />
              <Bar dataKey="mFault" stackId="a" fill="#A855F7" animationDuration={0} name="Mechanical Fault" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};


// ------------------------------------------------------------------
// MAIN WRAPPER
// ------------------------------------------------------------------
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

      // Format data and pad completely missing shift times so the timeline structurally expands to 100% width natively
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

  // Determine which dashboard UI to render exclusively based on the selected device string identifier
  const isPLC = selectedDevice && selectedDevice.startsWith('300000000001');

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl relative">
      {/* Universal Page Header Controls */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">
            {isPLC ? 'PLC Asset Analytics' : 'Energy Meter Analytics'}
          </h1>
          <p className="text-gray-600">
            {isPLC ? 'Real-time production, downtime, and pulse monitoring' : 'Phase balancing and historical trend monitoring'}
          </p>
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
            className="px-4 py-2 border border-transparent ring-2 ring-blue-500 rounded-md focus:outline-none bg-blue-50 text-blue-700 shadow-sm font-bold h-10"
          >
            {devices.length === 0 && <option value="">No devices found</option>}
            {devices.map(d => (
              <option key={d.device_id} value={d.device_id}>Device ID: {d.device_id}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Render Dynamic Dashboard Variant */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      ) : data.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
          No analytics data available for the selected shift. Ensure the device is sending interval payloads.
        </div>
      ) : isPLC ? (
        <PLCDashboard data={data} selectedDate={selectedDate} selectedShiftId={selectedShiftId} />
      ) : (
        <EnergyDashboard data={data} />
      )}
    </div>
  );
};

export default Analytics;
