-- =========================================================================
-- COMPLETE DATABASE INITIALIZATION SCRIPT FOR VOLTAS IOT DASHBOARD
-- Includes: Base Settings + New Energy Meter (Device 200000000046)
-- =========================================================================

-- 1. Base Structure Defaults
INSERT INTO public.clients (id, name) VALUES (1, 'Voltas') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.departments (id, client_id, name) VALUES (1, 1, 'Engineering') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.locations (id, department_id, name) VALUES (1, 1, 'CBE') ON CONFLICT (id) DO NOTHING;

-- 2. Your Local Original Configured Switch Sensors 
INSERT INTO public.sensor_types (id, name, unit) VALUES (1, 'Switch', 'State') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.sensors (id, location_id, sensor_type_id, name, mqtt_topic, sensor_count, status, device_id, channel_code, mqtt_payload_topic) VALUES 
(1, 1, 1, 'CH01', 'client/1/location/1/sensor/', 1, 'active', '00002', 's1', 'voltas'),
(2, 1, 1, 'CH02', 'client/1/location/1/sensor/', 1, 'active', '00002', 's2', 'voltas'),
(3, 1, 1, 'CH03', 'client/1/location/1/sensor/', 1, 'active', '00002', 's3', 'voltas'),
(4, 1, 1, 'CH04', 'client/1/location/1/sensor/', 1, 'active', '00002', 's4', 'voltas'),
(5, 1, 1, 'CH05', 'client/1/location/1/sensor/', 1, 'active', '00002', 's5', 'voltas'),
(6, 1, 1, 'CH06', 'client/1/location/1/sensor/', 1, 'active', '00002', 's6', 'voltas')
ON CONFLICT (id) DO NOTHING;

-- =========================================================================
-- 3. NEW ENERGY METER CONFIGURATION (Device: 200000000046)
-- =========================================================================

-- Add New Energy Meter Client 
-- Note: Using Integer ID fallback (2) because Postgres 'clients.id' column natively restricts to 32-bit Integer sequence natively! 
-- Your payload Client ID 100000000001 is referenced in Name for GUI viewing
INSERT INTO public.clients (id, name) VALUES (2, 'Client_100000000001') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.departments (id, client_id, name) VALUES (2, 2, 'Energy Management') ON CONFLICT (id) DO NOTHING;
INSERT INTO public.locations (id, department_id, name) VALUES (2, 2, 'Main Grid') ON CONFLICT (id) DO NOTHING;

-- Add Corresponding Energy Meter Sensor Types
INSERT INTO public.sensor_types (id, name, unit, widget_type, min_value, max_value) VALUES 
(101, 'Voltage', 'V', 'line_chart', 0, 500),
(102, 'Current', 'A', 'line_chart', 0, 100),
(103, 'Frequency', 'Hz', 'gauge_chart', 0, 60),
(104, 'Active Power', 'kW', 'line_chart', 0, 100),
(105, 'Reactive Power', 'kVar', 'line_chart', 0, 500),
(106, 'Apparent Power', 'kVA', 'line_chart', 0, 500),
(107, 'Power Factor', '', 'gauge_chart', 0, 1),
(108, 'Export Energy', 'kWh', 'stat_card', 0, 10000),
(109, 'Import Energy', 'kWh', 'stat_card', 0, 10000)
ON CONFLICT (id) DO NOTHING;

-- Combine Device 200000000046 to its Channels (p1 -> p9)
INSERT INTO public.sensors (id, location_id, sensor_type_id, name, device_id, channel_code, data_mode, status, mqtt_payload_topic, mqtt_topic) VALUES
(101, 2, 101, 'Voltage Line 1', '200000000046', 'p1', 'live', 'active', 'voltas', 'energy/200000000046'),
(102, 2, 102, 'Current Line 1', '200000000046', 'p2', 'live', 'active', 'voltas', 'energy/200000000046'),
(103, 2, 103, 'Frequency', '200000000046', 'p3', 'live', 'active', 'voltas', 'energy/200000000046'),
(104, 2, 104, 'Active Power', '200000000046', 'p4', 'live', 'active', 'voltas', 'energy/200000000046'),
(105, 2, 105, 'Reactive Power', '200000000046', 'p5', 'live', 'active', 'voltas', 'energy/200000000046'),
(106, 2, 106, 'Apparent Power', '200000000046', 'p6', 'live', 'active', 'voltas', 'energy/200000000046'),
(107, 2, 107, 'Power Factor', '200000000046', 'p7', 'live', 'active', 'voltas', 'energy/200000000046'),
(108, 2, 108, 'Export Energy', '200000000046', 'p8', 'live', 'active', 'voltas', 'energy/200000000046'),
(109, 2, 109, 'Import Energy', '200000000046', 'p9', 'live', 'active', 'voltas', 'energy/200000000046')
ON CONFLICT (id) DO NOTHING;

-- Synchronize Database Primary Key Autoincrements
SELECT pg_catalog.setval('public.clients_id_seq', (SELECT MAX(id) FROM public.clients), true);
SELECT pg_catalog.setval('public.departments_id_seq', (SELECT MAX(id) FROM public.departments), true);
SELECT pg_catalog.setval('public.locations_id_seq', (SELECT MAX(id) FROM public.locations), true);
SELECT pg_catalog.setval('public.sensor_types_id_seq', (SELECT MAX(id) FROM public.sensor_types), true);
SELECT pg_catalog.setval('public.sensors_id_seq', (SELECT MAX(id) FROM public.sensors), true);
