--
-- PostgreSQL database dump
--

\restrict jvyL6zBUIdMfMcJWfwbkKfXSR1tqQrhmHAT6VdmU6cUaKBkKx9c7CZQ02v3wA0q

-- Dumped from database version 17.8
-- Dumped by pg_dump version 17.8

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: api_keys; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.api_keys (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    key_hash character varying(64) NOT NULL,
    key_prefix character varying(20) NOT NULL,
    environment character varying(20) NOT NULL,
    permissions text[] DEFAULT '{}'::text[] NOT NULL,
    last_used_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT api_keys_environment_check CHECK (((environment)::text = ANY ((ARRAY['production'::character varying, 'sandbox'::character varying])::text[])))
);


ALTER TABLE public.api_keys OWNER TO postgres;

--
-- Name: application_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.application_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    level character varying(20) NOT NULL,
    message text NOT NULL,
    metadata jsonb,
    ip_address character varying(45),
    user_agent text,
    browser_name character varying(100),
    browser_version character varying(50),
    os_name character varying(100),
    os_version character varying(50),
    device_type character varying(50),
    method character varying(10),
    path character varying(2000),
    status_code integer,
    duration_ms integer,
    user_id uuid,
    organization_id uuid,
    auth_type character varying(20),
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.application_logs OWNER TO postgres;

--
-- Name: auth_tokens; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.auth_tokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    token_hash character varying(64) NOT NULL,
    token_type character varying(20) NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    revoked_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT auth_tokens_token_type_check CHECK (((token_type)::text = ANY ((ARRAY['access'::character varying, 'refresh'::character varying])::text[])))
);


ALTER TABLE public.auth_tokens OWNER TO postgres;

--
-- Name: document_fields; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.document_fields (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    document_id uuid NOT NULL,
    recipient_id uuid NOT NULL,
    type character varying(50) NOT NULL,
    label character varying(255) NOT NULL,
    x numeric(8,4) NOT NULL,
    y numeric(8,4) NOT NULL,
    width numeric(8,4) NOT NULL,
    height numeric(8,4) NOT NULL,
    page integer DEFAULT 1 NOT NULL,
    required boolean DEFAULT true NOT NULL,
    value text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    options jsonb,
    radio_group_id character varying(255),
    profile_type character varying(80),
    profile_types jsonb,
    page_hash character varying(32),
    template_page integer
);


ALTER TABLE public.document_fields OWNER TO postgres;

--
-- Name: document_recipients; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.document_recipients (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    document_id uuid NOT NULL,
    name character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    role character varying(50) DEFAULT 'recipient_a'::character varying NOT NULL,
    color character varying(20) DEFAULT '#2563eb'::character varying NOT NULL,
    order_index integer,
    status character varying(50) DEFAULT 'pending'::character varying NOT NULL,
    last_active timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    profile_type character varying(80)
);


ALTER TABLE public.document_recipients OWNER TO postgres;

--
-- Name: documents; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    title character varying(500) NOT NULL,
    status character varying(50) DEFAULT 'draft'::character varying NOT NULL,
    pages integer DEFAULT 1 NOT NULL,
    workflow_type character varying(50),
    email_subject character varying(500),
    email_message text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    file_name text,
    file_hash character varying(64),
    signed_file_hash character varying(64),
    email_attachments jsonb DEFAULT '[]'::jsonb NOT NULL,
    sent_content_hash character varying(64),
    sent_at timestamp with time zone,
    sent_ip character varying(45),
    sent_by_name character varying(255),
    sent_by_email character varying(255)
);


ALTER TABLE public.documents OWNER TO postgres;

--
-- Name: invoices; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.invoices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    invoice_date date NOT NULL,
    amount numeric(10,2) NOT NULL,
    status character varying(20) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT invoices_status_check CHECK (((status)::text = ANY ((ARRAY['paid'::character varying, 'pending'::character varying])::text[])))
);


ALTER TABLE public.invoices OWNER TO postgres;

--
-- Name: organizations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.organizations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    plan character varying(50) DEFAULT 'starter'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    logo_url text,
    primary_color character varying(20),
    button_color character varying(20)
);


ALTER TABLE public.organizations OWNER TO postgres;

--
-- Name: password_reset_tokens; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.password_reset_tokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    token_hash character varying(64) NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    used_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.password_reset_tokens OWNER TO postgres;

--
-- Name: sdk_configs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.sdk_configs (
    organization_id uuid NOT NULL,
    allowed_domains text[] DEFAULT '{}'::text[] NOT NULL,
    callback_on_complete text,
    callback_on_decline text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.sdk_configs OWNER TO postgres;

--
-- Name: signing_sessions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.signing_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    token_hash character varying(64) NOT NULL,
    document_id uuid NOT NULL,
    recipient_id uuid NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    viewed_at timestamp with time zone,
    completed_at timestamp with time zone,
    declined_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    investor_recipient_id uuid,
    sent_ip character varying(45),
    viewed_ip character varying(45),
    signed_ip character varying(45)
);


ALTER TABLE public.signing_sessions OWNER TO postgres;

--
-- Name: team_invites; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.team_invites (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    email character varying(255) NOT NULL,
    role character varying(50) DEFAULT 'member'::character varying NOT NULL,
    status character varying(50) DEFAULT 'invited'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.team_invites OWNER TO postgres;

--
-- Name: usage_metrics; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.usage_metrics (
    organization_id uuid NOT NULL,
    api_calls integer DEFAULT 0 NOT NULL,
    embedded_sessions integer DEFAULT 0 NOT NULL,
    documents_signed integer DEFAULT 0 NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.usage_metrics OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    name character varying(255) NOT NULL,
    role character varying(50) DEFAULT 'owner'::character varying NOT NULL,
    organization_id uuid NOT NULL,
    email_verified boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: webhooks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.webhooks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    organization_id uuid NOT NULL,
    url text NOT NULL,
    events text[] DEFAULT '{}'::text[] NOT NULL,
    secret_hash character varying(64) NOT NULL,
    retries integer DEFAULT 3 NOT NULL,
    active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.webhooks OWNER TO postgres;

--
-- Data for Name: api_keys; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.api_keys (id, organization_id, name, key_hash, key_prefix, environment, permissions, last_used_at, created_at) FROM stdin;
\.


--
-- Data for Name: application_logs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.application_logs (id, level, message, metadata, ip_address, user_agent, browser_name, browser_version, os_name, os_version, device_type, method, path, status_code, duration_ms, user_id, organization_id, auth_type, created_at) FROM stdin;
d7868778-0941-425a-b1ef-0f16ad54a4a2	info	GET /api/v1/documents 401	{"logType": "http"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:152.0) Gecko/20100101 Firefox/152.0	Firefox	152.0	Windows	10.0	desktop	GET	/api/v1/documents	401	184	\N	\N	\N	2026-06-26 11:22:53.256056+05:30
687241d5-6f05-4e29-9a58-87ef7f4699b5	info	POST /api/v1/auth/refresh 401	{"logType": "http"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:152.0) Gecko/20100101 Firefox/152.0	Firefox	152.0	Windows	10.0	desktop	POST	/api/v1/auth/refresh	401	175	\N	\N	\N	2026-06-26 11:22:53.491303+05:30
dd17c07b-8df7-4354-8877-05dabdf41480	info	POST /api/v1/auth/login 200	{"logType": "http"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:152.0) Gecko/20100101 Firefox/152.0	Firefox	152.0	Windows	10.0	desktop	POST	/api/v1/auth/login	200	691	\N	\N	\N	2026-06-26 11:23:06.941919+05:30
8ce1bcb6-8635-4b78-9ac0-d7e23e068097	info	GET /api/v1/documents 200	{"logType": "http"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:152.0) Gecko/20100101 Firefox/152.0	Firefox	152.0	Windows	10.0	desktop	GET	/api/v1/documents	200	37	9df61226-cccb-4dd5-bce1-fad1d6c814d1	684d003d-7c24-4ce3-bcfc-05ae1c504dbd	user	2026-06-26 11:23:07.133533+05:30
f8b4cb37-a9b9-481b-beea-6e36a12de3e4	info	GET /api/v1/dashboard/stats 200	{"logType": "http"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:152.0) Gecko/20100101 Firefox/152.0	Firefox	152.0	Windows	10.0	desktop	GET	/api/v1/dashboard/stats	200	290	9df61226-cccb-4dd5-bce1-fad1d6c814d1	684d003d-7c24-4ce3-bcfc-05ae1c504dbd	user	2026-06-26 11:23:07.400071+05:30
86b93a73-1b87-4473-95aa-1fc9a7b76b43	info	GET /api/v1/api-keys 200	{"logType": "http"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:152.0) Gecko/20100101 Firefox/152.0	Firefox	152.0	Windows	10.0	desktop	GET	/api/v1/api-keys	200	16	9df61226-cccb-4dd5-bce1-fad1d6c814d1	684d003d-7c24-4ce3-bcfc-05ae1c504dbd	user	2026-06-26 11:23:09.785156+05:30
36921d62-d61c-4aea-9b73-7b38ad0adf49	info	GET /api/v1/teams/members 200	{"logType": "http"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:152.0) Gecko/20100101 Firefox/152.0	Firefox	152.0	Windows	10.0	desktop	GET	/api/v1/teams/members	200	21	9df61226-cccb-4dd5-bce1-fad1d6c814d1	684d003d-7c24-4ce3-bcfc-05ae1c504dbd	user	2026-06-26 11:23:13.424183+05:30
e4e39f1e-e925-4e5c-91f0-ffc07bcbd10b	info	GET /api/v1/billing/invoices 200	{"logType": "http"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:152.0) Gecko/20100101 Firefox/152.0	Firefox	152.0	Windows	10.0	desktop	GET	/api/v1/billing/invoices	200	13	9df61226-cccb-4dd5-bce1-fad1d6c814d1	684d003d-7c24-4ce3-bcfc-05ae1c504dbd	user	2026-06-26 11:23:16.883564+05:30
dd543034-c079-42bc-a606-150be418ece5	info	GET /api/v1/billing/usage 200	{"logType": "http"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:152.0) Gecko/20100101 Firefox/152.0	Firefox	152.0	Windows	10.0	desktop	GET	/api/v1/billing/usage	200	19	9df61226-cccb-4dd5-bce1-fad1d6c814d1	684d003d-7c24-4ce3-bcfc-05ae1c504dbd	user	2026-06-26 11:23:16.891746+05:30
b13a52a5-4d83-47da-b99d-d753605c95d0	info	GET /api/v1/webhooks 304	{"logType": "http"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:152.0) Gecko/20100101 Firefox/152.0	Firefox	152.0	Windows	10.0	desktop	GET	/api/v1/webhooks	304	13	9df61226-cccb-4dd5-bce1-fad1d6c814d1	684d003d-7c24-4ce3-bcfc-05ae1c504dbd	user	2026-06-26 11:23:18.704115+05:30
d3219695-7e37-46ba-84ed-ae7ec3a03127	info	GET /api/v1/documents 304	{"logType": "http"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:152.0) Gecko/20100101 Firefox/152.0	Firefox	152.0	Windows	10.0	desktop	GET	/api/v1/documents	304	321	9df61226-cccb-4dd5-bce1-fad1d6c814d1	684d003d-7c24-4ce3-bcfc-05ae1c504dbd	user	2026-06-26 11:23:39.087053+05:30
adb5aade-12a1-4558-a9cb-9be4f7bece4b	info	GET /api/v1/dashboard/stats 304	{"logType": "http"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:152.0) Gecko/20100101 Firefox/152.0	Firefox	152.0	Windows	10.0	desktop	GET	/api/v1/dashboard/stats	304	394	9df61226-cccb-4dd5-bce1-fad1d6c814d1	684d003d-7c24-4ce3-bcfc-05ae1c504dbd	user	2026-06-26 11:23:39.176138+05:30
e531b2f2-e7ce-4479-846b-b344c94a0e4a	info	GET /api/v1/documents 304	{"logType": "http"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:152.0) Gecko/20100101 Firefox/152.0	Firefox	152.0	Windows	10.0	desktop	GET	/api/v1/documents	304	13	9df61226-cccb-4dd5-bce1-fad1d6c814d1	684d003d-7c24-4ce3-bcfc-05ae1c504dbd	user	2026-06-26 11:23:42.355735+05:30
6b297c30-c30c-46ce-be52-07f61ff444dc	info	GET /api/v1/dashboard/stats 304	{"logType": "http"}	127.0.0.1	Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:152.0) Gecko/20100101 Firefox/152.0	Firefox	152.0	Windows	10.0	desktop	GET	/api/v1/dashboard/stats	304	17	9df61226-cccb-4dd5-bce1-fad1d6c814d1	684d003d-7c24-4ce3-bcfc-05ae1c504dbd	user	2026-06-26 11:23:42.361142+05:30
\.


--
-- Data for Name: auth_tokens; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.auth_tokens (id, user_id, token_hash, token_type, expires_at, revoked_at, created_at) FROM stdin;
26ec0871-aa00-4749-86a4-fc2215fce03c	9df61226-cccb-4dd5-bce1-fad1d6c814d1	ef1cc90127f2d03c79133af7a1f2aa2b0af41e9662f63f6659b9f02ed945e089	access	2026-06-26 11:38:06.914+05:30	\N	2026-06-26 11:23:06.915577+05:30
e3d044ef-8498-4b55-9f46-eddda954a7a3	9df61226-cccb-4dd5-bce1-fad1d6c814d1	1c13f5c70b7ae8735fa1bae728c851557c9368da95ffaa2c3aa82619251a58af	refresh	2026-07-03 11:23:06.914+05:30	\N	2026-06-26 11:23:06.937785+05:30
\.


--
-- Data for Name: document_fields; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.document_fields (id, document_id, recipient_id, type, label, x, y, width, height, page, required, value, created_at, options, radio_group_id, profile_type, profile_types, page_hash, template_page) FROM stdin;
\.


--
-- Data for Name: document_recipients; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.document_recipients (id, document_id, name, email, role, color, order_index, status, last_active, created_at, profile_type) FROM stdin;
\.


--
-- Data for Name: documents; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.documents (id, organization_id, title, status, pages, workflow_type, email_subject, email_message, created_at, updated_at, file_name, file_hash, signed_file_hash, email_attachments, sent_content_hash, sent_at, sent_ip, sent_by_name, sent_by_email) FROM stdin;
\.


--
-- Data for Name: invoices; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.invoices (id, organization_id, invoice_date, amount, status, created_at) FROM stdin;
\.


--
-- Data for Name: organizations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.organizations (id, name, plan, created_at, updated_at, logo_url, primary_color, button_color) FROM stdin;
684d003d-7c24-4ce3-bcfc-05ae1c504dbd	Admin Workspace	enterprise	2026-06-26 11:18:21.47189+05:30	2026-06-26 11:18:21.47189+05:30	\N	#2563eb	\N
\.


--
-- Data for Name: password_reset_tokens; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.password_reset_tokens (id, user_id, token_hash, expires_at, used_at, created_at) FROM stdin;
\.


--
-- Data for Name: sdk_configs; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.sdk_configs (organization_id, allowed_domains, callback_on_complete, callback_on_decline, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: signing_sessions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.signing_sessions (id, token_hash, document_id, recipient_id, expires_at, viewed_at, completed_at, declined_at, created_at, investor_recipient_id, sent_ip, viewed_ip, signed_ip) FROM stdin;
\.


--
-- Data for Name: team_invites; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.team_invites (id, organization_id, email, role, status, created_at) FROM stdin;
\.


--
-- Data for Name: usage_metrics; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.usage_metrics (organization_id, api_calls, embedded_sessions, documents_signed, updated_at) FROM stdin;
684d003d-7c24-4ce3-bcfc-05ae1c504dbd	0	0	0	2026-06-26 11:23:07.36978+05:30
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id, email, password_hash, name, role, organization_id, email_verified, created_at, updated_at) FROM stdin;
9df61226-cccb-4dd5-bce1-fad1d6c814d1	admin@work.com	$2b$12$VDyryBv/3zRMzP.qamfDpuOSzXwnEVY34xoR1j2w93dkBn2LGHNHy	Admin	owner	684d003d-7c24-4ce3-bcfc-05ae1c504dbd	t	2026-06-26 11:18:21.47189+05:30	2026-06-26 11:18:21.47189+05:30
\.


--
-- Data for Name: webhooks; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.webhooks (id, organization_id, url, events, secret_hash, retries, active, created_at) FROM stdin;
\.


--
-- Name: api_keys api_keys_key_hash_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.api_keys
    ADD CONSTRAINT api_keys_key_hash_key UNIQUE (key_hash);


--
-- Name: api_keys api_keys_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.api_keys
    ADD CONSTRAINT api_keys_pkey PRIMARY KEY (id);


--
-- Name: application_logs application_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.application_logs
    ADD CONSTRAINT application_logs_pkey PRIMARY KEY (id);


--
-- Name: auth_tokens auth_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.auth_tokens
    ADD CONSTRAINT auth_tokens_pkey PRIMARY KEY (id);


--
-- Name: auth_tokens auth_tokens_token_hash_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.auth_tokens
    ADD CONSTRAINT auth_tokens_token_hash_key UNIQUE (token_hash);


--
-- Name: document_fields document_fields_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document_fields
    ADD CONSTRAINT document_fields_pkey PRIMARY KEY (id);


--
-- Name: document_recipients document_recipients_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document_recipients
    ADD CONSTRAINT document_recipients_pkey PRIMARY KEY (id);


--
-- Name: documents documents_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_pkey PRIMARY KEY (id);


--
-- Name: invoices invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_pkey PRIMARY KEY (id);


--
-- Name: organizations organizations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_pkey PRIMARY KEY (id);


--
-- Name: password_reset_tokens password_reset_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_pkey PRIMARY KEY (id);


--
-- Name: password_reset_tokens password_reset_tokens_token_hash_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_token_hash_key UNIQUE (token_hash);


--
-- Name: sdk_configs sdk_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sdk_configs
    ADD CONSTRAINT sdk_configs_pkey PRIMARY KEY (organization_id);


--
-- Name: signing_sessions signing_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.signing_sessions
    ADD CONSTRAINT signing_sessions_pkey PRIMARY KEY (id);


--
-- Name: signing_sessions signing_sessions_token_hash_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.signing_sessions
    ADD CONSTRAINT signing_sessions_token_hash_key UNIQUE (token_hash);


--
-- Name: team_invites team_invites_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.team_invites
    ADD CONSTRAINT team_invites_pkey PRIMARY KEY (id);


--
-- Name: usage_metrics usage_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usage_metrics
    ADD CONSTRAINT usage_metrics_pkey PRIMARY KEY (organization_id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: webhooks webhooks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.webhooks
    ADD CONSTRAINT webhooks_pkey PRIMARY KEY (id);


--
-- Name: idx_api_keys_organization_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_api_keys_organization_id ON public.api_keys USING btree (organization_id);


--
-- Name: idx_application_logs_created_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_application_logs_created_at ON public.application_logs USING btree (created_at DESC);


--
-- Name: idx_application_logs_ip_address; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_application_logs_ip_address ON public.application_logs USING btree (ip_address);


--
-- Name: idx_application_logs_level; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_application_logs_level ON public.application_logs USING btree (level);


--
-- Name: idx_application_logs_organization_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_application_logs_organization_id ON public.application_logs USING btree (organization_id);


--
-- Name: idx_auth_tokens_expires_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_auth_tokens_expires_at ON public.auth_tokens USING btree (expires_at);


--
-- Name: idx_auth_tokens_token_hash; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_auth_tokens_token_hash ON public.auth_tokens USING btree (token_hash);


--
-- Name: idx_auth_tokens_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_auth_tokens_user_id ON public.auth_tokens USING btree (user_id);


--
-- Name: idx_document_fields_document_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_document_fields_document_id ON public.document_fields USING btree (document_id);


--
-- Name: idx_document_recipients_document_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_document_recipients_document_id ON public.document_recipients USING btree (document_id);


--
-- Name: idx_documents_file_hash; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_documents_file_hash ON public.documents USING btree (file_hash) WHERE (file_hash IS NOT NULL);


--
-- Name: idx_documents_organization_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_documents_organization_id ON public.documents USING btree (organization_id);


--
-- Name: idx_documents_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_documents_status ON public.documents USING btree (status);


--
-- Name: idx_invoices_organization_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_invoices_organization_id ON public.invoices USING btree (organization_id);


--
-- Name: idx_password_reset_tokens_token_hash; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_password_reset_tokens_token_hash ON public.password_reset_tokens USING btree (token_hash);


--
-- Name: idx_password_reset_tokens_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_password_reset_tokens_user_id ON public.password_reset_tokens USING btree (user_id);


--
-- Name: idx_signing_sessions_document_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_signing_sessions_document_id ON public.signing_sessions USING btree (document_id);


--
-- Name: idx_signing_sessions_investor_recipient_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_signing_sessions_investor_recipient_id ON public.signing_sessions USING btree (investor_recipient_id);


--
-- Name: idx_signing_sessions_token_hash; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_signing_sessions_token_hash ON public.signing_sessions USING btree (token_hash);


--
-- Name: idx_team_invites_organization_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_team_invites_organization_id ON public.team_invites USING btree (organization_id);


--
-- Name: idx_users_email; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_email ON public.users USING btree (email);


--
-- Name: idx_users_organization_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_organization_id ON public.users USING btree (organization_id);


--
-- Name: idx_webhooks_organization_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_webhooks_organization_id ON public.webhooks USING btree (organization_id);


--
-- Name: api_keys api_keys_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.api_keys
    ADD CONSTRAINT api_keys_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: application_logs application_logs_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.application_logs
    ADD CONSTRAINT application_logs_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL;


--
-- Name: application_logs application_logs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.application_logs
    ADD CONSTRAINT application_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: auth_tokens auth_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.auth_tokens
    ADD CONSTRAINT auth_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: document_fields document_fields_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document_fields
    ADD CONSTRAINT document_fields_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.documents(id) ON DELETE CASCADE;


--
-- Name: document_fields document_fields_recipient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document_fields
    ADD CONSTRAINT document_fields_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES public.document_recipients(id) ON DELETE CASCADE;


--
-- Name: document_recipients document_recipients_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.document_recipients
    ADD CONSTRAINT document_recipients_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.documents(id) ON DELETE CASCADE;


--
-- Name: documents documents_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: invoices invoices_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: password_reset_tokens password_reset_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: sdk_configs sdk_configs_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.sdk_configs
    ADD CONSTRAINT sdk_configs_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: signing_sessions signing_sessions_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.signing_sessions
    ADD CONSTRAINT signing_sessions_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.documents(id) ON DELETE CASCADE;


--
-- Name: signing_sessions signing_sessions_investor_recipient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.signing_sessions
    ADD CONSTRAINT signing_sessions_investor_recipient_id_fkey FOREIGN KEY (investor_recipient_id) REFERENCES public.document_recipients(id) ON DELETE CASCADE;


--
-- Name: signing_sessions signing_sessions_recipient_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.signing_sessions
    ADD CONSTRAINT signing_sessions_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES public.document_recipients(id) ON DELETE CASCADE;


--
-- Name: team_invites team_invites_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.team_invites
    ADD CONSTRAINT team_invites_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: usage_metrics usage_metrics_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.usage_metrics
    ADD CONSTRAINT usage_metrics_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: users users_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: webhooks webhooks_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.webhooks
    ADD CONSTRAINT webhooks_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict jvyL6zBUIdMfMcJWfwbkKfXSR1tqQrhmHAT6VdmU6cUaKBkKx9c7CZQ02v3wA0q

