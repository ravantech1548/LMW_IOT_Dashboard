import React from 'react';
import SensorCard from './SensorCard';
import NumericCard from './NumericCard';
import GaugeWidget from './GaugeWidget';
import FaultBadgeWidget from './FaultBadgeWidget';

const formatSensorName = (name) => {
    if (!name) return '';
    // If the name contains a dash, assume the format is clientID-port
    if (name.includes('-')) {
        const parts = name.split('-');
        const portPart = parts.slice(1).join('-');
        
        // Optional nice formatting: "p1" -> "Port 1"
        if (/^p\d+$/i.test(portPart)) {
            return `Port ${portPart.substring(1)}`;
        }
        
        return portPart;
    }
    return name;
};

const WidgetFactory = ({ sensor, value, isActive, onClick, historicalData }) => {
    let widgetType = sensor.widget_type || 'on_off_card';
    
    // Create a new sensor object with the formatted name for display
    const displaySensor = {
        ...sensor,
        name: formatSensorName(sensor.name)
    };

    // Force port 3, 6, and 9 to use GaugeWidget as requested
    if (['p3', 'p6', 'p9'].includes(displaySensor.name)) {
        widgetType = 'gauge';
    }

    // Check for E fault and M fault specifically, or by port equivalent
    if (
        displaySensor.name.toLowerCase() === 'p10' ||
        displaySensor.name.toLowerCase() === 'e fault'
    ) {
        displaySensor.name = 'E fault';
        widgetType = 'fault_badge';
    } else if (
        displaySensor.name.toLowerCase() === 'p11' ||
        displaySensor.name.toLowerCase() === 'm fault'
    ) {
        displaySensor.name = 'M fault';
        widgetType = 'fault_badge';
    } else if (displaySensor.name.toLowerCase().includes('fault')) {
        widgetType = 'fault_badge';
    }

    if (widgetType === 'numeric_card') {
        return <NumericCard sensor={displaySensor} value={value} onClick={onClick} />;
    } else if (widgetType === 'gauge') {
        return <GaugeWidget sensor={displaySensor} value={value} onClick={onClick} />;
    } else if (widgetType === 'fault_badge') {
        // We pass the historicalData back down to the FaultBadge component so it can parse occurrences
        return <FaultBadgeWidget sensor={displaySensor} value={value} onClick={onClick} historicalData={historicalData} />;
    } else if (widgetType === 'line_chart') {
        // If we wanted to draw simple lines per card we could, but fallback to Numeric for the small cards view
        return <NumericCard sensor={displaySensor} value={value} onClick={onClick} />;
    } else {
        // on_off_card or legacy switch behavior
        if (sensor.type?.toLowerCase() === 'switch' || widgetType === 'on_off_card') {
            return <SensorCard sensor={displaySensor} isActive={isActive} onClick={onClick} />;
        } else {
            return <NumericCard sensor={displaySensor} value={value} onClick={onClick} />;
        }
    }
};

export default WidgetFactory;
