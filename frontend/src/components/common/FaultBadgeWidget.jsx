import React, { useState, useMemo } from 'react';

const FaultBadgeWidget = ({ sensor, value, onClick, historicalData }) => {
    const [showModal, setShowModal] = useState(false);

    // Calculate faults from historical data
    const events = useMemo(() => {
        if (!historicalData || !Array.isArray(historicalData)) return [];

        const originalNameLower = sensor.nameLower || sensor.name.toLowerCase();
        let faultEvents = [];
        let currentEvent = null;

        historicalData.forEach(point => {
            const pval = point[originalNameLower];
            const isActive = pval !== undefined && parseFloat(pval) === 1;
            const timeStr = point.time || new Date(point.timestamp).toLocaleTimeString();

            if (isActive && !currentEvent) {
                // Fault started
                currentEvent = {
                    start: timeStr,
                    startTimeMs: new Date(point.timestamp).getTime(),
                    end: 'Ongoing',
                    duration: '-'
                };
            } else if (!isActive && currentEvent) {
                // Fault ended
                currentEvent.end = timeStr;
                const endMs = new Date(point.timestamp).getTime();
                const diffMin = Math.round((endMs - currentEvent.startTimeMs) / 60000);
                currentEvent.duration = diffMin > 0 ? `${diffMin} min` : '< 1 min';
                faultEvents.push(currentEvent);
                currentEvent = null;
            }
        });

        // If a fault is ongoing at the end of the shift/data
        if (currentEvent) {
            faultEvents.push(currentEvent);
        }

        // Reverse so newest events are at the top
        return faultEvents.reverse();
    }, [historicalData, sensor]);

    const isCurrentlyActive = parseFloat(value) === 1;
    const faultCount = events.length;
    
    // Severity color logic:
    // If it's a Mechanical Fault, let's make it a warning (amber/orange) style when active.
    // If it's an Electrical Fault, let's make it a critical (red) style.
    // If it's NOT active, keep it muted green or gray.
    const isE = sensor.name.toLowerCase().includes('e fault') || sensor.name.toLowerCase() === 'p10';
    const isM = sensor.name.toLowerCase().includes('m fault') || sensor.name.toLowerCase() === 'p11';

    let colorConfig = {
        bg: 'bg-white',
        border: 'border-gray-200',
        title: 'text-gray-700',
        badgeBg: 'bg-gray-100',
        badgeText: 'text-gray-800'
    };

    if (isCurrentlyActive) {
        if (isE) {
            colorConfig = {
                bg: 'bg-red-50',
                border: 'border-red-400',
                title: 'text-red-800',
                badgeBg: 'bg-red-500',
                badgeText: 'text-white shadow-sm ring-2 ring-red-200 ring-offset-2'
            };
        } else if (isM) {
            colorConfig = {
                bg: 'bg-amber-50',
                border: 'border-amber-400',
                title: 'text-amber-800',
                badgeBg: 'bg-amber-500',
                badgeText: 'text-white shadow-sm ring-2 ring-amber-200 ring-offset-2'
            };
        } else {
            colorConfig = {
                bg: 'bg-orange-50',
                border: 'border-orange-400',
                title: 'text-orange-800',
                badgeBg: 'bg-orange-500',
                badgeText: 'text-white shadow-sm'
            };
        }
    } else {
        // Not active - maybe it had faults earlier? Make the badge noticeable if there were faults today.
        if (faultCount > 0) {
            colorConfig.badgeBg = isE ? 'bg-red-100' : 'bg-amber-100';
            colorConfig.badgeText = isE ? 'text-red-700' : 'text-amber-700';
        }
    }

    const handleClick = (e) => {
        if (onClick) onClick(e);
        setShowModal(true);
    };

    return (
        <>
            <div
                onClick={handleClick}
                className={`rounded-lg p-6 border-2 flex flex-col justify-between transition-all duration-300 transform hover:scale-[1.02] cursor-pointer hover:shadow-md min-h-[220px] ${colorConfig.bg} ${colorConfig.border}`}
            >
                <div className="flex justify-between items-start mb-4">
                    <h3 className={`text-lg font-bold truncate ${colorConfig.title}`} title={sensor.name}>
                        {sensor.name}
                    </h3>
                    {isCurrentlyActive && (
                        <span className="flex h-3 w-3 relative">
                            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isE ? 'bg-red-400' : 'bg-amber-400'}`}></span>
                            <span className={`relative inline-flex rounded-full h-3 w-3 ${isE ? 'bg-red-500' : 'bg-amber-500'}`}></span>
                        </span>
                    )}
                </div>

                <div className="flex flex-col items-center justify-center flex-1 space-y-3">
                    <div className={`flex items-center justify-center w-20 h-20 rounded-full ${colorConfig.badgeBg} ${colorConfig.badgeText} transition-all duration-300`}>
                        <span className="text-4xl font-extrabold pb-1">
                            {faultCount}
                        </span>
                    </div>
                    <span className="text-sm font-semibold uppercase tracking-wider text-gray-500">
                        Total Incidents
                    </span>
                </div>

                <div className="w-full mt-auto flex justify-center text-xs font-semibold text-gray-400">
                    <span className="hover:text-blue-500 transition-colors uppercase tracking-wide">
                        Click to view events
                    </span>
                </div>
            </div>

            {/* Events Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[80vh]">
                        {/* Header */}
                        <div className={`px-6 py-4 border-b flex justify-between items-center ${isCurrentlyActive ? (isE ? 'bg-red-50' : 'bg-amber-50') : 'bg-gray-50'}`}>
                            <div>
                                <h2 className={`text-xl font-bold ${isCurrentlyActive ? (isE ? 'text-red-700' : 'text-amber-700') : 'text-gray-800'}`}>
                                    {sensor.name} Events
                                </h2>
                                <p className="text-sm text-gray-500 mt-1">Incident log for selected shift</p>
                            </div>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowModal(false);
                                }}
                                className="text-gray-400 hover:text-gray-600 focus:outline-none transition-colors"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Event List */}
                        <div className="p-0 overflow-y-auto flex-1">
                            {events.length === 0 ? (
                                <div className="p-8 text-center text-gray-500">
                                    <svg className="mx-auto h-12 w-12 text-gray-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    <p className="font-semibold text-gray-700">No fault incidents recorded</p>
                                    <p className="text-sm">Operations are running smoothly.</p>
                                </div>
                            ) : (
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50 top-0 sticky">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Start Time</th>
                                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">End Time</th>
                                            <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Duration</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {events.map((evt, idx) => (
                                            <tr key={idx} className={`${evt.end === 'Ongoing' ? (isE ? 'bg-red-50' : 'bg-amber-50') : 'hover:bg-gray-50'} transition-colors`}>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                                    {evt.start}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {evt.end === 'Ongoing' ? (
                                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${isE ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}`}>
                                                            Active Now
                                                        </span>
                                                    ) : (
                                                        evt.end
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                    {evt.duration}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                        
                        {/* Footer */}
                        <div className="px-6 py-4 border-t bg-gray-50 flex justify-end">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowModal(false);
                                }}
                                className="px-4 py-2 bg-gray-100 border border-gray-300 rounded-md text-gray-700 font-medium hover:bg-gray-200 transition-colors focus:outline-none"
                            >
                                Close Log
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default FaultBadgeWidget;
