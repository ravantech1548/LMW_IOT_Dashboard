import React from 'react';

// Helper to calculate arc points for SVG paths
const polarToCartesian = (centerX, centerY, radius, angleInDegrees) => {
  const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
  return {
    x: centerX + (radius * Math.cos(angleInRadians)),
    y: centerY + (radius * Math.sin(angleInRadians))
  };
};

// Generates an SVG Arc path string
const describeArc = (x, y, radius, startAngle, endAngle) => {
  const start = polarToCartesian(x, y, radius, endAngle);
  const end = polarToCartesian(x, y, radius, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

  // Arc path drawing from end Angle CCW to start Angle
  return [
    "M", start.x, start.y, 
    "A", radius, radius, 0, largeArcFlag, 0, end.x, end.y
  ].join(" ");
};

const GaugeWidget = ({ sensor, value, onClick }) => {
    // Determine bounds and value
    const min = parseFloat(sensor.min_value || 0);
    const max = parseFloat(sensor.max_value || 100);
    
    // Safety check range
    const validMin = isNaN(min) ? 0 : min;
    const validMax = isNaN(max) || max <= validMin ? validMin + 100 : max;
    
    const val = value !== undefined && value !== null ? parseFloat(value) : validMin;
    const formattedVal = Number(val).toFixed(Math.floor(val) === val ? 0 : 2);

    const range = validMax - validMin;
    const percent = Math.min(Math.max((val - validMin) / range, 0), 1);

    // Arc & Widget layout parameters
    const cx = 80;
    const cy = 80;
    const radius = 64;
    const strokeWidth = 14;

    // A standard large dial runs from -135 degrees (bottom left) to 135 degrees (bottom right)
    // 0 degrees is top center (12 o'clock). Total sweep = 270 degrees.
    const startAngle = -135;
    const sweep = 270;
    
    // Zone limits
    // Green: 0% - 60%
    const greenEnd = startAngle + sweep * 0.6;
    // Amber: 60% - 80%
    const amberEnd = startAngle + sweep * 0.8;
    // Red: 80% - 100%
    const endAngle = startAngle + sweep;

    const needleAngle = startAngle + (sweep * percent);

    return (
        <div
            onClick={onClick}
            className={`bg-white rounded-lg p-6 border-2 flex flex-col justify-between transition-all duration-300 min-h-[220px] transform hover:scale-[1.02] ${onClick ? 'cursor-pointer hover:border-gray-300 hover:shadow-md' : 'border-gray-200'}`}
        >
            <h3 className="text-lg font-semibold text-gray-700 mb-2 truncate text-center" title={sensor.name}>
                {sensor.name}
            </h3>

            <div className="relative flex items-center justify-center flex-1">
                <svg width="100%" height="160" viewBox="0 0 160 160" className="drop-shadow-sm overflow-visible">
                    {/* Background Track Zones */}
                    
                    {/* Green Zone (0-60%) */}
                    <path
                        d={describeArc(cx, cy, radius, startAngle, greenEnd)}
                        fill="none"
                        stroke="#22c55e"
                        strokeWidth={strokeWidth}
                        strokeLinecap="butt"
                    />
                    {/* Amber Zone (60-80%) */}
                    <path
                        d={describeArc(cx, cy, radius, greenEnd, amberEnd)}
                        fill="none"
                        stroke="#f59e0b"
                        strokeWidth={strokeWidth}
                        strokeLinecap="butt"
                    />
                    {/* Red Zone (80-100%) */}
                    <path
                        d={describeArc(cx, cy, radius, amberEnd, endAngle)}
                        fill="none"
                        stroke="#ef4444"
                        strokeWidth={strokeWidth}
                        strokeLinecap="butt"
                    />

                    {/* Gauge Needle */}
                    <g 
                        transform={`rotate(${needleAngle}, ${cx}, ${cy})`} 
                        className="transition-all duration-1000 ease-out"
                        style={{ filter: 'drop-shadow(0px 4px 4px rgba(0, 0, 0, 0.25))' }}
                    >
                        {/* Needle Body */}
                        <polygon points={`${cx - 5},${cy} ${cx + 5},${cy} ${cx},${cy - radius - 4}`} fill="#1e293b" />
                        {/* Needle Pivot */}
                        <circle cx={cx} cy={cy} r="8" fill="#1e293b" />
                        <circle cx={cx} cy={cy} r="3" fill="#ffffff" />
                    </g>
                </svg>
                
                {/* Value Display */}
                <div className="absolute flex flex-col items-center justify-center pointer-events-none" style={{ top: '100px' }}>
                    <span className="text-3xl font-bold text-gray-800 tracking-tighter bg-white/80 px-2 rounded-lg">
                        {formattedVal}
                    </span>
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-widest mt-1">
                        {sensor.unit || '%'}
                    </span>
                </div>
            </div>

            <div className="w-full flex justify-between mt-auto text-xs font-medium text-gray-400 px-4">
                <span>{validMin}</span>
                <span>{validMax}</span>
            </div>
        </div>
    );
};

export default GaugeWidget;
