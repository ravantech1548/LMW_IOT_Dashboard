import React from 'react';

const NumericCard = ({ sensor, value, onClick }) => {
    return (
        <div
            onClick={onClick}
            className={`bg-white rounded-lg p-6 border-2 transition-all duration-300 transform hover:scale-[1.02] ${onClick ? 'cursor-pointer hover:border-blue-400 hover:shadow-md' : 'border-gray-200'}`}
        >
            <h3 className="text-lg font-semibold text-gray-700 mb-2">{sensor.name}</h3>
            <div className="flex items-end space-x-2">
                <span className="text-4xl font-bold text-blue-600">
                    {value !== undefined && value !== null ? Number(value).toFixed(Math.floor(value) === value ? 0 : 2) : '--'}
                </span>
                <span className="text-sm text-gray-500 mb-1">{sensor.unit || ''}</span>
            </div>
            <div className="mt-3 text-xs text-gray-500 flex justify-between">
                <div>{sensor.type || 'Numeric'}</div>
            </div>
        </div>
    );
};

export default NumericCard;
