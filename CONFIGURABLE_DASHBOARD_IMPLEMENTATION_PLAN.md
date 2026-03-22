# Configurable IoT Dashboard — Implementation Plan

## Overview

Transform the current hardcoded "Switch sensors" dashboard into a **fully configurable, multi-tenant IoT Dashboard** that:
- Accepts a generic MQTT payload with generic keys (`p1`, `p2`, `p3`, ...)
- Allows admins to map those keys to any sensor type (Temperature, Humidity, Switch, Pressure, etc.) + custom alias
- Dynamically renders appropriate widgets per sensor type on the dashboard (gauges, charts, on/off cards)
- Routes "Live" broadcasts via WebSocket and stores "Interval" averaged data in the database

---

## Current State (What Exists)

| Layer | What's there |
|---|---|
| Database | `clients`, `departments`, `locations`, `sensor_types`, `sensors`, `sensor_data`, `shifts`, `users`, `system_settings` |
| MQTT Handler | Hardcoded to Voltas `{ did, date, data:[{s1,st},{s2,st},...] }` format, maps `s1→ch01` (Switch only) |
| Backend | Full CRUD: clients, departments, locations, sensor-types, sensors, data, settings, shifts, users |
| Frontend | Dashboard (Switch cards only), SwitchSensors page, Settings, Reports, Login |
| WebSocket | Socket.IO per `sensor_<id>` rooms |

---

## Phase 1 — Database Schema Extensions

### 1A. New migration: `channel_mappings` table

```sql
-- Maps a device's generic payload key (p1, p2, ...) to a sensor
CREATE TABLE IF NOT EXISTS channel_mappings (
    id SERIAL PRIMARY KEY,
    device_id VARCHAR(50) NOT NULL,          -- MQTT device identifier (did)
    payload_key VARCHAR(20) NOT NULL,         -- Generic key in payload: p1, p2, s1, s2, etc.
    sensor_id INT REFERENCES sensors(id) ON DELETE CASCADE,
    alias VARCHAR(100),                       -- Display name: "Line 1 Temp", "Boiler Humidity"
    data_mode VARCHAR(10) DEFAULT 'live',     -- 'live' or 'interval'
    interval_seconds INT DEFAULT 60,          -- For 'interval' mode: average/store every N seconds
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(device_id, payload_key)
);

CREATE INDEX IF NOT EXISTS idx_channel_mappings_device ON channel_mappings(device_id);
CREATE INDEX IF NOT EXISTS idx_channel_mappings_sensor ON channel_mappings(sensor_id);
```

### 1B. Extend `sensor_types` with a `widget_type` column

```sql
ALTER TABLE sensor_types 
ADD COLUMN IF NOT EXISTS widget_type VARCHAR(30) DEFAULT 'line_chart';
-- Possible values: 'line_chart', 'gauge', 'on_off_card', 'bar_chart', 'numeric_card'
```

### 1C. Extend `sensors` with a `data_mode` column

```sql
ALTER TABLE sensors
ADD COLUMN IF NOT EXISTS data_mode VARCHAR(10) DEFAULT 'live',
ADD COLUMN IF NOT EXISTS interval_seconds INT DEFAULT 60;
```

**Files to create:**
- `backend/migrations/add_channel_mappings.sql`
- `backend/migrations/extend_sensor_types_widget.sql`

---

## Phase 2 — Backend Changes

### 2A. New Controller: `channelMappingController.js`

Located at: `backend/src/controllers/channelMappingController.js`

```
Endpoints:
GET    /api/channel-mappings?device_id=xxx    → list all mappings for a device
POST   /api/channel-mappings                  → create a new mapping
PUT    /api/channel-mappings/:id              → update mapping (alias, sensor_id, data_mode)
DELETE /api/channel-mappings/:id              → delete mapping
GET    /api/channel-mappings/devices          → list all distinct device_ids that have mappings
```

### 2B. Update `mqttHandler.js` — Universal Payload Parser

Change the MQTT handler to:

1. **Accept ANY payload key** (not just `s1`–`s6`), by querying `channel_mappings` table instead of the hardcoded map.
2. **Distinguish data mode per channel:**
   - `'live'` → broadcast WebSocket immediately, store to DB if changed (current behavior)
   - `'interval'` → buffer readings in memory, compute average every N seconds, then store + broadcast

**New flow:**

```
MQTT message arrives
  → Parse JSON payload (support both Voltas format & generic {did, data:[{p1, p2, ...}]} format)
  → For each key in payload data array:
      → Look up channel_mappings WHERE device_id=did AND payload_key=key
      → If mapping found:
          → Get sensor_id, data_mode, interval_seconds
          → If data_mode = 'live':  
              → Check value changed → store in sensor_data, broadcast via WS
          → If data_mode = 'interval':
              → Buffer value into intervalBuffer[sensor_id]
              → Averaging job fires every interval_seconds → compute avg → store → broadcast
      → If NO mapping: log warning (configurable)
```

**New in-memory buffer structure:**

```js
// intervalBuffer[sensorId] = { values: [v1, v2...], deviceId, startTime }
let intervalBuffer = {};
let intervalJobs = {}; // sensorId → setInterval handle
```

### 2C. Register new route

`backend/src/routes/channelMappings.js`
```js
router.get('/', authMiddleware, getAllMappings);
router.get('/devices', authMiddleware, getDevices);
router.post('/', authMiddleware, requireAdmin, createMapping);
router.put('/:id', authMiddleware, requireAdmin, updateMapping);
router.delete('/:id', authMiddleware, requireAdmin, deleteMapping);
```

Register in `server.js`:
```js
const channelMappingRoutes = require('./routes/channelMappings');
app.use('/api/channel-mappings', channelMappingRoutes);
```

### 2D. Update `sensorTypeController.js`

Add `widget_type` field to GET/POST/PUT operations so frontend can retrieve widget preferences.

---

## Phase 3 — Frontend Changes

### 3A. New Page: Channel Mapping UI (`frontend/src/pages/ChannelMapping.jsx`)

**Purpose:** Allow admins to:
1. Select a Device ID (from live MQTT payloads or manually entered)
2. See all detected payload keys (p1, p2, s1, s2, ...) for that device
3. For each key: assign a sensor from the sensor list + set an alias + choose data mode

**UI Design:**
```
┌──────────────────────────────────────────────────────────────────┐
│  Channel Mapping                              [ Device: 00002 ▼ ] │
├──────────────────────────────────────────────────────────────────┤
│  Payload Key │ Sensor (type)        │ Alias           │ Mode     │
│  ─────────── │ ──────────────────── │ ─────────────── │ ──────── │
│  p1          │ [CH01 (Switch)    ▼] │ [Line 1       ] │ [Live ▼] │
│  p2          │ [TempSensor1 (Temp)▼]│ [Boiler Temp  ] │ [Int. ▼] │
│  p3          │ [Not Mapped       ▼] │                 │          │
│  s1          │ [CH01 (Switch)    ▼] │ [Switch 1     ] │ [Live ▼] │
└──────────────────────────────────────────────────────────────────┘
                                              [ Save All Mappings ]
```

**Component structure:**
- `ChannelMappingPage` (page)
  - `DevicePicker` (select device_id from API)
  - `MappingTable` (table of rows per payload key)
    - `MappingRow` (per key: sensor dropdown, alias input, mode select)

### 3B. New Component: Widget Factory (`frontend/src/components/dashboard/WidgetFactory.jsx`)

Renders the correct widget based on `sensor_type.widget_type`:

| `widget_type` | Component used |
|---|---|
| `on_off_card` | `SwitchCard` (existing `SensorCard`) |
| `gauge` | `GaugeWidget` (new, using recharts RadialBarChart or echarts) |
| `line_chart` | `LineChartWidget` (recharts LineChart) |
| `numeric_card` | `NumericCard` (simple value + unit display) |
| `bar_chart` | `BarChartWidget` (recharts BarChart) |

```jsx
// WidgetFactory.jsx
const WidgetFactory = ({ sensor, liveValue, historicalData }) => {
  switch (sensor.widget_type || 'line_chart') {
    case 'on_off_card':  return <SwitchCard sensor={sensor} value={liveValue} />;
    case 'gauge':        return <GaugeWidget sensor={sensor} value={liveValue} />;
    case 'line_chart':   return <LineChartWidget sensor={sensor} data={historicalData} />;
    case 'numeric_card': return <NumericCard sensor={sensor} value={liveValue} />;
    case 'bar_chart':    return <BarChartWidget sensor={sensor} data={historicalData} />;
    default:             return <NumericCard sensor={sensor} value={liveValue} />;
  }
};
```

### 3C. Update Dashboard (`frontend/src/pages/Dashboard.jsx`)

Replace the hardcoded Switch-sensors filter with a **dynamic sensor query**:

1. Fetch ALL active sensors (any type) via `GET /api/sensors`
2. For each sensor, subscribe to its WebSocket room
3. Render via `WidgetFactory` based on `sensor.widget_type`
4. Group sensors by location or type using tabs/sections

**Updated data flow:**
```
componentDidMount:
  → GET /api/sensors  (all active sensors, any type)
  → For each sensor, subscribe WS room `sensor_<id>`
  → GET /api/data/latest?sensor_ids=1,2,3,...  (initial values)

on WebSocket sensor_update:
  → Update liveValues[sensor_id] = { value, timestamp, data_status }
  → If data_status='offline' → show offline badge on that sensor's widget

render:
  → Group sensors by sensor_type or location
  → For each sensor: <WidgetFactory sensor={s} liveValue={liveValues[s.id]} />
```

### 3D. Add Route in App.jsx

```jsx
import ChannelMapping from './pages/ChannelMapping';

// Add route:
<Route path="/channel-mapping" element={<ProtectedRoute><Layout><ChannelMapping /></Layout></ProtectedRoute>} />
```

### 3E. Add Navigation Link in Layout/Sidebar

Add "Channel Mapping" link visible only to admin users.

---

## Phase 4 — MQTT Payload Format Support

### Supported Payload Formats

**Format 1 — Voltas (existing):**
```json
{ "did": "00002", "date": "2026-01-01 10:00:00", "data": [{"s1": 1, "st": "10:00:00"}, {"s2": 0, "st": "10:00:00"}] }
```

**Format 2 — Generic (new):**
```json
{ "did": "DEVICE001", "ts": 1700000000000, "data": {"p1": 23.5, "p2": 65.2, "p3": 1, "p4": 850} }
```

**Format 3 — Array Generic:**
```json
{ "did": "DEVICE001", "date": "2026-01-01", "data": [{"p1": 23.5, "p2": 65.2, "ts": "10:00:00"}] }
```

The updated MQTT handler will detect the format and normalize all readings into:
```js
{ device_id, payload_key, value, timestamp }
```
before looking up `channel_mappings`.

---

## Phase 5 — Interval Data Averaging

For sensors with `data_mode = 'interval'`:

```
Every incoming MQTT reading → push to buffer[sensor_id]
Every interval_seconds:
  → compute avg(buffer[sensor_id].values)
  → INSERT INTO sensor_data (sensor_id, value, timestamp, data_status='interval')
  → broadcast via WebSocket with data_status='interval'
  → clear buffer
```

This allows tracking averaged temperature/humidity data every 60 seconds without writing every single reading.

---

## Implementation Order (Step-by-Step)

### Step 1 — Database Migration ✅ Ready to implement
- [ ] Create `backend/migrations/add_channel_mappings.sql`
- [ ] Create `backend/migrations/extend_sensor_widget.sql`
- [ ] Update `database_init.sql` to include new tables/columns

### Step 2 — Backend: Channel Mapping API
- [ ] Create `backend/src/controllers/channelMappingController.js`
- [ ] Create `backend/src/routes/channelMappings.js`
- [ ] Register route in `backend/src/server.js`

### Step 3 — Backend: Universal MQTT Parser
- [ ] Refactor `backend/src/services/mqttHandler.js`:
  - Replace hardcoded `s1→ch01` map with DB-driven `channel_mappings` lookup
  - Add generic payload format support (p1, p2, ...) 
  - Add interval buffer + averaging logic

### Step 4 — Frontend: Channel Mapping Page
- [ ] Create `frontend/src/pages/ChannelMapping.jsx`
- [ ] Create supporting components (DevicePicker, MappingTable, MappingRow)
- [ ] Add route in `App.jsx`
- [ ] Add nav link in Layout

### Step 5 — Frontend: Widget Factory
- [ ] Create `frontend/src/components/dashboard/WidgetFactory.jsx`
- [ ] Create `GaugeWidget.jsx` component
- [ ] Create `NumericCard.jsx` component  
- [ ] Create `LineChartWidget.jsx` component
- [ ] Update `SwitchCard`/`SensorCard` to fit the factory pattern

### Step 6 — Frontend: Dynamic Dashboard
- [ ] Refactor `Dashboard.jsx` to fetch ALL sensor types
- [ ] Integrate `WidgetFactory` in place of hardcoded Switch card grid
- [ ] Group sensors by location/type tabs
- [ ] Ensure offline state works per-sensor (not just global)

### Step 7 — Update Sensor Types in Settings
- [ ] Add `widget_type` selector to the Sensor Type form in `Settings.jsx`
- [ ] Show widget preview tooltips for each type

### Step 8 — Testing & Validation
- [ ] Test with existing Voltas payload (backward compatibility)
- [ ] Test with new generic payload format
- [ ] Test interval averaging (mock rapid MQTT messages)
- [ ] Test Channel Mapping UI (CRUD)
- [ ] Test dynamic widget rendering per sensor type

---

## File Summary — Files to Create/Edit

### New Files
| File | Purpose |
|---|---|
| `backend/migrations/add_channel_mappings.sql` | DB migration for channel_mappings table |
| `backend/migrations/extend_sensor_widget.sql` | DB migration for widget_type column |
| `backend/src/controllers/channelMappingController.js` | CRUD API for channel mappings |
| `backend/src/routes/channelMappings.js` | Route definitions |
| `frontend/src/pages/ChannelMapping.jsx` | Admin channel mapping UI |
| `frontend/src/components/dashboard/WidgetFactory.jsx` | Widget type router |
| `frontend/src/components/dashboard/GaugeWidget.jsx` | Gauge chart widget |
| `frontend/src/components/dashboard/NumericCard.jsx` | Numeric value widget |
| `frontend/src/components/dashboard/LineChartWidget.jsx` | Line chart widget |

### Modified Files
| File | Change |
|---|---|
| `backend/src/services/mqttHandler.js` | Universal payload parser + interval buffer |
| `backend/src/server.js` | Register /api/channel-mappings route |
| `backend/src/controllers/sensorTypeController.js` | Add widget_type field |
| `frontend/src/App.jsx` | Add /channel-mapping route |
| `frontend/src/components/common/Layout.jsx` | Add Channel Mapping nav link |
| `frontend/src/pages/Dashboard.jsx` | Dynamic sensor rendering via WidgetFactory |
| `frontend/src/pages/Settings.jsx` | Add widget_type field to sensor type form |
| `database_init.sql` | Add channel_mappings table + new columns |

---

## Dependencies to Install

### Backend
```bash
# No new packages needed (pg, mqtt, socket.io already installed)
```

### Frontend
```bash
# If not already installed:
npm install echarts echarts-for-react
# or use recharts RadialBarChart for gauges (recharts already installed)
```

---

## Notes

- **Backward Compatibility:** The existing Voltas payload format (`{did, date, data:[{s1,st},...]}`) must continue to work. The new system will first check `channel_mappings` for `s1`, and fall back to the existing hardcoded map only if no mapping is found.
- **Cache Strategy:** The `channel_mappings` table will be cached in memory (similar to current `sensorConfigCache`) and refreshed every 5 minutes.
- **Security:** Only `admin` role can create/edit/delete channel mappings.
- **Multi-Device Support:** One device can have multiple channels mapped to different sensor types in different locations.
