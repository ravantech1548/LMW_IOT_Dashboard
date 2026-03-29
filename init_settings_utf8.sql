--
-- PostgreSQL database dump
--

\restrict ddWDdqw1hx1UcsmkLF1V5YryJCZX2EcIuvrGhxntuww4FSJXpvIxdPCtlo5QmrB

-- Dumped from database version 15.17
-- Dumped by pg_dump version 15.17

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: clients; Type: TABLE DATA; Schema: public; Owner: iotuser
--

INSERT INTO public.clients VALUES (1, 'Voltas', NULL, NULL, '2026-01-05 14:31:40.889235+05:30', '2026-01-05 14:31:40.889235+05:30');


--
-- Data for Name: departments; Type: TABLE DATA; Schema: public; Owner: iotuser
--

INSERT INTO public.departments VALUES (1, 1, 'Engineering', NULL, '2026-01-05 14:31:55.011557+05:30');


--
-- Data for Name: locations; Type: TABLE DATA; Schema: public; Owner: iotuser
--

INSERT INTO public.locations VALUES (1, 1, 'CBE', NULL, NULL, '2026-01-05 14:32:10.011989+05:30');


--
-- Data for Name: sensor_types; Type: TABLE DATA; Schema: public; Owner: iotuser
--

INSERT INTO public.sensor_types VALUES (1, 'Switch', 'State', NULL, 0, 1, '2026-01-05 14:46:50.936064+05:30');


--
-- Data for Name: sensors; Type: TABLE DATA; Schema: public; Owner: iotuser
--

INSERT INTO public.sensors VALUES (1, 1, 1, 'CH01', 'client/1/location/1/sensor/', 1, 'active', NULL, '2026-01-05 15:09:52.81797+05:30', '2026-01-05 15:09:52.81797+05:30', '00002', 's1', 'voltas');
INSERT INTO public.sensors VALUES (2, 1, 1, 'CH02', 'client/1/location/1/sensor/', 1, 'active', NULL, '2026-01-05 15:10:15.420016+05:30', '2026-01-05 15:10:15.420016+05:30', '00002', 's2', 'voltas');
INSERT INTO public.sensors VALUES (3, 1, 1, 'CH03', 'client/1/location/1/sensor/', 1, 'active', NULL, '2026-01-05 15:10:43.001522+05:30', '2026-01-05 15:10:43.001522+05:30', '00002', 's3', 'voltas');
INSERT INTO public.sensors VALUES (4, 1, 1, 'CH04', 'client/1/location/1/sensor/', 1, 'active', NULL, '2026-01-05 15:11:04.409141+05:30', '2026-01-05 15:11:04.409141+05:30', '00002', 's4', 'voltas');
INSERT INTO public.sensors VALUES (5, 1, 1, 'CH05', 'client/1/location/1/sensor/', 1, 'active', NULL, '2026-01-05 15:11:24.967772+05:30', '2026-01-05 15:11:24.967772+05:30', '00002', 's5', 'voltas');
INSERT INTO public.sensors VALUES (6, 1, 1, 'CH06', 'client/1/location/1/sensor/', 1, 'active', NULL, '2026-01-05 15:11:44.466488+05:30', '2026-01-05 15:11:44.466488+05:30', '00002', 's6', 'voltas');


--
-- Name: clients_id_seq; Type: SEQUENCE SET; Schema: public; Owner: iotuser
--

SELECT pg_catalog.setval('public.clients_id_seq', 1, true);


--
-- Name: departments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: iotuser
--

SELECT pg_catalog.setval('public.departments_id_seq', 1, true);


--
-- Name: locations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: iotuser
--

SELECT pg_catalog.setval('public.locations_id_seq', 1, true);


--
-- Name: sensor_types_id_seq; Type: SEQUENCE SET; Schema: public; Owner: iotuser
--

SELECT pg_catalog.setval('public.sensor_types_id_seq', 1, true);


--
-- Name: sensors_id_seq; Type: SEQUENCE SET; Schema: public; Owner: iotuser
--

SELECT pg_catalog.setval('public.sensors_id_seq', 6, true);


--
-- PostgreSQL database dump complete
--

\unrestrict ddWDdqw1hx1UcsmkLF1V5YryJCZX2EcIuvrGhxntuww4FSJXpvIxdPCtlo5QmrB

