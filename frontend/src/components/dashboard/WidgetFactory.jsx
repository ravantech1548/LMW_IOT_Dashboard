import React from 'react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, AreaChart, Area, BarChart, Bar,
    RadialBarChart, RadialBar, Legend
} from 'recharts';

// ─────────────────────────────────────────────────────────
// Numeric Card Widget
// ─────────────────────────────────────────────────────────
export const NumericCard = ({ sensor, value, isOffline }) => {
    const displayValue = value !== null && value !== undefined
        ? (typeof value === 'number' ? value.toFixed(2) : value)
        : '--';

    return (
        <div style={cardStyle(isOffline)}>
            <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 600, marginBottom: '8px' }}>
                {sensor.name || sensor.alias}
            </div>
            <div style={{ fontSize: '40px', fontWeight: 800, color: isOffline ? '#94a3b8' : '#1e293b', lineHeight: 1.1 }}>
                {displayValue}
            </div>
            <div style={{ fontSize: '14px', color: '#64748b', marginTop: '4px' }}>
                {sensor.unit || ''}
            </div>
            {sensor.location_name && (
                <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '8px' }}>
                    📍 {sensor.location_name}
                </div>
            )}
            {isOffline && (
                <div style={offlineBadgeStyle}>● Offline</div>
            )}
        </div>
    );
};

// ─────────────────────────────────────────────────────────
// Switch / On-Off Card Widget
// ─────────────────────────────────────────────────────────
export const SwitchCard = ({ sensor, value, isOffline }) => {
    const isOn = !isOffline && (value === 1 || value === '1' || value === true);

    return (
        <div style={{
            ...cardStyle(isOffline),
            border: `2px solid ${isOffline ? '#e2e8f0' : isOn ? '#22c55e' : '#ef4444'}`,
            background: isOffline ? '#f8fafc' : isOn ? '#f0fdf4' : '#fff5f5'
        }}>
            <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 600, marginBottom: '12px' }}>
                {sensor.name || sensor.alias}
            </div>
            <div style={{
                width: '60px', height: '60px', borderRadius: '50%',
                background: isOffline ? '#e2e8f0' : isOn ? '#22c55e' : '#ef4444',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '24px', margin: '0 auto 12px',
                boxShadow: isOffline ? 'none' : `0 0 20px ${isOn ? 'rgba(34,197,94,0.4)' : 'rgba(239,68,68,0.3)'}`
            }}>
                {isOffline ? '⚫' : isOn ? '🟢' : '🔴'}
            </div>
            <div style={{
                fontSize: '20px', fontWeight: 700, textAlign: 'center',
                color: isOffline ? '#94a3b8' : isOn ? '#16a34a' : '#dc2626'
            }}>
                {isOffline ? 'Offline' : isOn ? 'ON' : 'OFF'}
            </div>
            {sensor.location_name && (
                <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '8px', textAlign: 'center' }}>
                    📍 {sensor.location_name}
                </div>
            )}
        </div>
    );
};

// ─────────────────────────────────────────────────────────
// Gauge Widget
// ─────────────────────────────────────────────────────────
export const GaugeWidget = ({ sensor, value, isOffline }) => {
    const min = sensor.min_value ?? 0;
    const max = sensor.max_value ?? 100;
    const displayValue = value !== null && value !== undefined ? parseFloat(value) : 0;
    const percentage = Math.min(100, Math.max(0, ((displayValue - min) / (max - min)) * 100));

    // Color coding: green < 60%, yellow 60-80%, red > 80%
    const getColor = (pct) => {
        if (pct < 60) return '#22c55e';
        if (pct < 80) return '#f59e0b';
        return '#ef4444';
    };

    const gaugeData = [
        { name: 'value', value: percentage, fill: isOffline ? '#94a3b8' : getColor(percentage) }
    ];

    return (
        <div style={cardStyle(isOffline)}>
            <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 600, marginBottom: '4px' }}>
                {sensor.name || sensor.alias}
            </div>
            <div style={{ position: 'relative' }}>
                <ResponsiveContainer width="100%" height={130}>
                    <RadialBarChart
                        cx="50%" cy="80%"
                        innerRadius="60%" outerRadius="100%"
                        startAngle={180} endAngle={0}
                        data={gaugeData}
                    >
                        <RadialBar dataKey="value" cornerRadius={8} />
                    </RadialBarChart>
                </ResponsiveContainer>
                <div style={{
                    position: 'absolute', bottom: '0', left: 0, right: 0,
                    textAlign: 'center'
                }}>
                    <div style={{ fontSize: '28px', fontWeight: 800, color: isOffline ? '#94a3b8' : '#1e293b' }}>
                        {isOffline ? '--' : displayValue.toFixed(1)}
                    </div>
                    <div style={{ fontSize: '13px', color: '#64748b' }}>
                        {sensor.unit || ''}
                    </div>
                </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94a3b8', marginTop: '4px' }}>
                <span>{min}</span>
                <span>{max}</span>
            </div>
            {sensor.location_name && (
                <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '6px' }}>📍 {sensor.location_name}</div>
            )}
            {isOffline && <div style={offlineBadgeStyle}>● Offline</div>}
        </div>
    );
};

// ─────────────────────────────────────────────────────────
// Line Chart Widget
// ─────────────────────────────────────────────────────────
export const LineChartWidget = ({ sensor, data = [], isOffline }) => {
    return (
        <div style={{ ...cardStyle(isOffline), minWidth: '280px' }}>
            <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 600, marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
                <span>{sensor.name || sensor.alias}</span>
                {data.length > 0 && (
                    <span style={{ fontWeight: 700, color: '#1e293b' }}>
                        {parseFloat(data[data.length - 1]?.value ?? 0).toFixed(2)} {sensor.unit || ''}
                    </span>
                )}
            </div>
            {isOffline && <div style={offlineBadgeStyle}>● Offline</div>}
            <ResponsiveContainer width="100%" height={120}>
                <AreaChart data={data} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                    <defs>
                        <linearGradient id={`grad-${sensor.id}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip
                        contentStyle={{ fontSize: '12px', borderRadius: '6px' }}
                        formatter={(v) => [`${parseFloat(v).toFixed(2)} ${sensor.unit || ''}`, sensor.name]}
                    />
                    <Area
                        type="monotone"
                        dataKey="value"
                        stroke="#6366f1"
                        fill={`url(#grad-${sensor.id})`}
                        strokeWidth={2}
                        dot={false}
                        isAnimationActive={false}
                    />
                </AreaChart>
            </ResponsiveContainer>
            {sensor.location_name && (
                <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '6px' }}>📍 {sensor.location_name}</div>
            )}
        </div>
    );
};

// ─────────────────────────────────────────────────────────
// Bar Chart Widget
// ─────────────────────────────────────────────────────────
export const BarChartWidget = ({ sensor, data = [], isOffline }) => {
    return (
        <div style={{ ...cardStyle(isOffline), minWidth: '280px' }}>
            <div style={{ fontSize: '13px', color: '#64748b', fontWeight: 600, marginBottom: '8px' }}>
                {sensor.name || sensor.alias}
            </div>
            {isOffline && <div style={offlineBadgeStyle}>● Offline</div>}
            <ResponsiveContainer width="100%" height={120}>
                <BarChart data={data} margin={{ top: 5, right: 5, bottom: 0, left: -20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip contentStyle={{ fontSize: '12px', borderRadius: '6px' }} />
                    <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
            {sensor.location_name && (
                <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '6px' }}>📍 {sensor.location_name}</div>
            )}
        </div>
    );
};

// ─────────────────────────────────────────────────────────
// Widget Factory — renders the correct widget based on widget_type
// ─────────────────────────────────────────────────────────
const WidgetFactory = ({ sensor, liveValue, historicalData = [], isOffline = false }) => {
    const widgetType = sensor.widget_type || 'line_chart';

    switch (widgetType) {
        case 'on_off_card':
            return <SwitchCard sensor={sensor} value={liveValue} isOffline={isOffline} />;
        case 'gauge':
            return <GaugeWidget sensor={sensor} value={liveValue} isOffline={isOffline} />;
        case 'line_chart':
            return <LineChartWidget sensor={sensor} data={historicalData} isOffline={isOffline} />;
        case 'numeric_card':
            return <NumericCard sensor={sensor} value={liveValue} isOffline={isOffline} />;
        case 'bar_chart':
            return <BarChartWidget sensor={sensor} data={historicalData} isOffline={isOffline} />;
        default:
            return <NumericCard sensor={sensor} value={liveValue} isOffline={isOffline} />;
    }
};

// ─── Shared Styles ───────────────────────────────────────
const cardStyle = (isOffline) => ({
    background: '#fff',
    border: `1px solid ${isOffline ? '#e2e8f0' : '#f1f5f9'}`,
    borderRadius: '12px',
    padding: '16px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    position: 'relative',
    opacity: isOffline ? 0.7 : 1,
    minWidth: '160px'
});

const offlineBadgeStyle = {
    position: 'absolute', top: '10px', right: '10px',
    background: '#fef2f2', color: '#ef4444', borderRadius: '20px',
    padding: '2px 8px', fontSize: '11px', fontWeight: 700
};

export default WidgetFactory;
