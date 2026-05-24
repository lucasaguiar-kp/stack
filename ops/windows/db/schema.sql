--
-- PostgreSQL database dump
--

\restrict FqLgJ3CHFxE5tM3QvodHHVAbkPtZkd7DN8sUk4wZZTL1lf8JLRPk4QHsCTkDg7D

-- Dumped from database version 16.13
-- Dumped by pg_dump version 16.13

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
-- Name: device_audio_asset_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.device_audio_asset_status AS ENUM (
    'draft',
    'active',
    'archived'
);


--
-- Name: device_connection_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.device_connection_status AS ENUM (
    'online',
    'offline',
    'unknown'
);


--
-- Name: device_group_multicast_source_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.device_group_multicast_source_type AS ENUM (
    'radio_url',
    'audio_file'
);


--
-- Name: device_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.device_status AS ENUM (
    'provisioning',
    'active',
    'failed'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: account; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.account (
    id text NOT NULL,
    account_id text NOT NULL,
    provider_id text NOT NULL,
    user_id text NOT NULL,
    access_token text,
    refresh_token text,
    id_token text,
    access_token_expires_at timestamp without time zone,
    refresh_token_expires_at timestamp without time zone,
    scope text,
    password text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone NOT NULL
);


--
-- Name: device; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.device (
    id text NOT NULL,
    user_id text NOT NULL,
    group_id text NOT NULL,
    name text NOT NULL,
    extension text NOT NULL,
    sip_user text NOT NULL,
    sip_password text NOT NULL,
    mac_address text,
    device_ip text,
    mqtt_topic text NOT NULL,
    status public.device_status DEFAULT 'provisioning'::public.device_status NOT NULL,
    connection_status public.device_connection_status DEFAULT 'unknown'::public.device_connection_status NOT NULL,
    last_seen_at timestamp without time zone,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: device_audio_asset; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.device_audio_asset (
    id text NOT NULL,
    device_id text NOT NULL,
    name text NOT NULL,
    original_file_name text NOT NULL,
    storage_path text NOT NULL,
    mime_type text,
    duration_ms integer,
    size_bytes bigint,
    sort_order integer DEFAULT 0 NOT NULL,
    status public.device_audio_asset_status DEFAULT 'draft'::public.device_audio_asset_status NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: device_group; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.device_group (
    id text NOT NULL,
    user_id text NOT NULL,
    name text NOT NULL,
    extension text,
    multicast_address text,
    description text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: device_group_multicast_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.device_group_multicast_config (
    id text NOT NULL,
    group_id text NOT NULL,
    source_type public.device_group_multicast_source_type NOT NULL,
    source_url text,
    audio_file_data text,
    audio_file_name text,
    participant_device_ids text[] DEFAULT '{}'::text[] NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: session; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.session (
    id text NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    token text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone NOT NULL,
    ip_address text,
    user_agent text,
    user_id text NOT NULL
);


--
-- Name: user; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."user" (
    id text NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    extension text,
    sip_user text,
    sip_password text,
    email_verified boolean DEFAULT false NOT NULL,
    image text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: verification; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.verification (
    id text NOT NULL,
    identifier text NOT NULL,
    value text NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: account account_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account
    ADD CONSTRAINT account_pkey PRIMARY KEY (id);


--
-- Name: device_audio_asset device_audio_asset_deviceId_name_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.device_audio_asset
    ADD CONSTRAINT "device_audio_asset_deviceId_name_unique" UNIQUE (device_id, name);


--
-- Name: device_audio_asset device_audio_asset_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.device_audio_asset
    ADD CONSTRAINT device_audio_asset_pkey PRIMARY KEY (id);


--
-- Name: device_group device_group_extension_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.device_group
    ADD CONSTRAINT device_group_extension_unique UNIQUE (extension);


--
-- Name: device_group_multicast_config device_group_multicast_config_group_id_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.device_group_multicast_config
    ADD CONSTRAINT device_group_multicast_config_group_id_unique UNIQUE (group_id);


--
-- Name: device_group_multicast_config device_group_multicast_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.device_group_multicast_config
    ADD CONSTRAINT device_group_multicast_config_pkey PRIMARY KEY (id);


--
-- Name: device_group device_group_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.device_group
    ADD CONSTRAINT device_group_pkey PRIMARY KEY (id);


--
-- Name: device device_mqttTopic_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.device
    ADD CONSTRAINT "device_mqttTopic_unique" UNIQUE (mqtt_topic);


--
-- Name: device device_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.device
    ADD CONSTRAINT device_pkey PRIMARY KEY (id);


--
-- Name: session session_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.session
    ADD CONSTRAINT session_pkey PRIMARY KEY (id);


--
-- Name: session session_token_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.session
    ADD CONSTRAINT session_token_unique UNIQUE (token);


--
-- Name: user user_email_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."user"
    ADD CONSTRAINT user_email_unique UNIQUE (email);


--
-- Name: user user_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."user"
    ADD CONSTRAINT user_pkey PRIMARY KEY (id);


--
-- Name: verification verification_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.verification
    ADD CONSTRAINT verification_pkey PRIMARY KEY (id);


--
-- Name: account_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "account_userId_idx" ON public.account USING btree (user_id);


--
-- Name: device_audio_asset_deviceId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "device_audio_asset_deviceId_idx" ON public.device_audio_asset USING btree (device_id);


--
-- Name: device_groupId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "device_groupId_idx" ON public.device USING btree (group_id);


--
-- Name: device_group_multicast_config_groupId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "device_group_multicast_config_groupId_idx" ON public.device_group_multicast_config USING btree (group_id);


--
-- Name: device_group_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "device_group_userId_idx" ON public.device_group USING btree (user_id);


--
-- Name: device_mqttTopic_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "device_mqttTopic_idx" ON public.device USING btree (mqtt_topic);


--
-- Name: device_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "device_userId_idx" ON public.device USING btree (user_id);


--
-- Name: session_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "session_userId_idx" ON public.session USING btree (user_id);


--
-- Name: user_extension_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX user_extension_unique ON public."user" USING btree (extension);


--
-- Name: user_sipUser_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "user_sipUser_unique" ON public."user" USING btree (sip_user);


--
-- Name: verification_identifier_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX verification_identifier_idx ON public.verification USING btree (identifier);


--
-- Name: account account_user_id_user_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account
    ADD CONSTRAINT account_user_id_user_id_fk FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: device_audio_asset device_audio_asset_device_id_device_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.device_audio_asset
    ADD CONSTRAINT device_audio_asset_device_id_device_id_fk FOREIGN KEY (device_id) REFERENCES public.device(id) ON DELETE CASCADE;


--
-- Name: device device_group_id_device_group_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.device
    ADD CONSTRAINT device_group_id_device_group_id_fk FOREIGN KEY (group_id) REFERENCES public.device_group(id) ON DELETE CASCADE;


--
-- Name: device_group_multicast_config device_group_multicast_config_group_id_device_group_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.device_group_multicast_config
    ADD CONSTRAINT device_group_multicast_config_group_id_device_group_id_fk FOREIGN KEY (group_id) REFERENCES public.device_group(id) ON DELETE CASCADE;


--
-- Name: device_group device_group_user_id_user_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.device_group
    ADD CONSTRAINT device_group_user_id_user_id_fk FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: device device_user_id_user_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.device
    ADD CONSTRAINT device_user_id_user_id_fk FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- Name: session session_user_id_user_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.session
    ADD CONSTRAINT session_user_id_user_id_fk FOREIGN KEY (user_id) REFERENCES public."user"(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict FqLgJ3CHFxE5tM3QvodHHVAbkPtZkd7DN8sUk4wZZTL1lf8JLRPk4QHsCTkDg7D

