# Turgor — Autonomous Greenhouse Control System

**Date:** 2026-03-01
**Status:** Design approved

## Overview

Turgor is an open-source autonomous greenhouse control system. A Raspberry Pi serves as the central brain, ESP32 microcontrollers act as distributed sensor/actuator nodes, and an AI layer makes intelligent growing decisions with safety guarantees.

Named after turgor pressure — the water pressure inside plant cells that keeps them upright and healthy. Literally what this system maintains.

## Architecture: Layered Hybrid

Two distinct layers with a clean boundary.

### Field Layer (Rust, bare metal on Pi)

The "keep plants alive" layer. Runs as a single Rust binary via systemd. No containers, no runtime dependencies.

**Responsibilities:**
- Read sensor data from ESP32 nodes via MQTT
- Store time-series data locally (SQLite)
- Execute safety rules — hard limits the AI cannot override
- Send actuator commands to ESP32 nodes
- Expose a local HTTP API for the Intelligence Layer

**Safety Rule Engine:**

Rules defined in TOML. Simple, auditable, no code required:

```toml
[rules.frost_protection]
trigger = "temperature < 4"
action = "heater.on"
priority = "critical"
override_allowed = false  # AI cannot disable this

[rules.max_temperature]
trigger = "temperature > 38"
action = "vent.open, fan.on"
priority = "critical"
override_allowed = false

[rules.soil_dry]
trigger = "soil_moisture < 25"
action = "valve.zone1.on(duration=300)"
priority = "normal"
override_allowed = true  # AI can adjust threshold/duration
```

`override_allowed = false` = AI can never suppress or modify this rule.

**Local Data Storage:** SQLite time-series — sensor readings, rule execution log, actuator command history. Default 30-day retention on Pi.

**Local API:** Exposes sensor state, rule status, actuator control over HTTP. The Intelligence Layer is just another client.

**MQTT Topics:**
- `greenhouse/{id}/sensor/{node}/{type}` — sensor readings (published by ESP32)
- `greenhouse/{id}/actuator/{node}/{type}/command` — commands (subscribed by ESP32)
- `greenhouse/{id}/node/{node}/status` — heartbeat/health

### Intelligence Layer (Docker Compose, portable)

The "be smart about it" layer. Three containerized services. Can run on the same Pi, a separate machine, or a VPS.

**AI Agent (Python):**
- Dual-model: local Ollama for routine decisions (works offline), cloud LLM for complex reasoning (when available)
- Pluggable LLM interface — user picks their backend
- Decision loop: collect state every N minutes, build context (sensors + rules + plant profiles + weather + time), ask model for actions, submit commands through field layer API
- Natural language interface: same agent handles user queries from chat bot

**Web Dashboard (Astro):**
- Real-time sensor data (gauges, graphs)
- Historical charts
- Rule management (view/edit, confirmation for critical rules)
- AI activity log (decisions, reasoning, outcomes)
- Zone/plant management
- System health (node status, connectivity)

**Notification Service (Python):**
- Telegram bot (v1)
- Alert severity: critical (immediate), warning (batched), info (daily digest)
- AI summaries: daily/weekly greenhouse reports
- Natural language commands via chat

### ESP32 Firmware (C++ / PlatformIO)

One universal firmware, configured per node via TOML:

```toml
[node]
id = "node-01"
zone = "zone-1"

[[sensors]]
type = "dht22"
pin = 4
reads = ["temperature", "humidity"]
interval_seconds = 30

[[sensors]]
type = "capacitive_soil"
pin = 34
reads = ["soil_moisture"]
interval_seconds = 60

[[actuators]]
type = "relay"
pin = 16
controls = "valve.zone1"
```

**Behavior:** Boot, connect WiFi, connect MQTT, read sensors at intervals, publish readings, subscribe to commands, heartbeat every 30s. Buffer readings locally if MQTT connection lost.

## Connectivity

Hybrid approach:
- **Primary:** MQTT over WiFi — ESP32 built-in, lightweight pub/sub, resilient to disconnects
- **Future (v2+):** RS-485 wired fallback for critical actuators (heater, main water valve)

## Plant Profiles & Zones

Users define what they're growing. AI uses this for decisions.

```toml
[profile.tomato]
name = "Tomato (Summer)"
temperature_range = [18, 30]
optimal_temperature = [22, 26]
soil_moisture_range = [40, 70]
light_hours = 14
growth_stages = ["seedling", "vegetative", "flowering", "fruiting"]
notes = "Reduce watering during fruiting to improve flavor"
```

Zones map nodes to profiles:

```toml
[zone.zone-1]
name = "Tomato Bed"
profile = "tomato"
growth_stage = "vegetative"
nodes = ["node-01", "node-03"]
```

AI thinks in zones, not individual sensors.

## Data Flow

```
ESP32 reads sensor
  -> publishes MQTT
    -> Field Layer receives, stores in SQLite
      -> Rule engine checks safety bounds
        -> Publishes to internal topic for Intelligence Layer
          -> AI Agent reasons with full context
            -> Submits command to field layer API
              -> Rule engine validates
                -> Field Layer sends MQTT command to ESP32
                  -> ESP32 actuates
```

## Cloud & LLM Strategy

- **Local-first:** Core system works fully offline on Pi
- **Optional cloud:** Self-hostable Docker Compose stack for remote access, backups, LLM API calls
- **LLM hybrid:** Small local model (Ollama) handles routine decisions offline, cloud LLM for complex reasoning when available
- **Pluggable:** LLM interface trait — ship with Ollama and OpenAI-compatible adapters

## Tech Stack

| Component | Tech | Why |
|-----------|------|-----|
| Field layer | Rust | Safety-critical, low resource, runs forever |
| AI agent | Python | Best LLM library ecosystem |
| Dashboard | Astro | Lightweight, SSR works on Pi |
| Notifications | Python | Same runtime as agent, simple bot libs |
| ESP32 firmware | C++ / PlatformIO | Industry standard, Arduino ecosystem |
| MQTT broker | Mosquitto | Battle-tested, tiny footprint |
| Local DB | SQLite | Zero config, single file |
| LLM local | Ollama | Simple API, runs small models on Pi |
| LLM cloud | OpenAI-compatible | Pluggable, user's choice |

## Project Structure

```
turgor/
├── field/                   # Rust — field layer binary
│   ├── src/
│   │   ├── main.rs
│   │   ├── mqtt.rs
│   │   ├── rules.rs
│   │   ├── storage.rs
│   │   ├── api.rs
│   │   └── actuator.rs
│   ├── Cargo.toml
│   └── config/
│       ├── rules.toml
│       ├── zones.toml
│       └── profiles/
│
├── intelligence/
│   ├── docker-compose.yml
│   ├── agent/               # Python — AI agent
│   ├── dashboard/           # Astro — web dashboard
│   └── notifications/       # Python — notification service
│
├── firmware/                # PlatformIO — ESP32 firmware
│   ├── src/
│   ├── platformio.ini
│   └── config/
│
├── docs/
│   ├── architecture.md
│   ├── setup-guide.md
│   └── hardware-bom.md
│
├── deploy/
│   ├── pi-setup.sh
│   ├── install.sh
│   └── cloud/
│       └── docker-compose.yml
│
└── README.md
```

## Target Users

1. **V1:** Build for own greenhouse
2. **Design for:** Technical hobbyists (flash firmware, wire sensors)
3. **Aspire to:** Semi-technical gardeners (follow a setup guide)

## V1 Scope

**In:**
- Field layer: rule engine, SQLite, MQTT broker, local API
- ESP32 firmware: DHT22, capacitive soil moisture, relay-controlled valves/fans/vents/heater
- AI agent: Ollama local + OpenAI-compatible cloud adapter
- Web dashboard: real-time sensors, history, zones, AI log
- Telegram bot: alerts + natural language commands
- Plant profiles: tomato, lettuce, herbs, peppers
- Pi setup script and documentation
- Docker Compose for intelligence layer

**Out (future):**
- Multiple greenhouse support
- RS-485 wired fallback
- Cameras / visual plant health
- Weather forecast integration
- OTA firmware updates
- Mobile app
- User accounts / multi-user
- Cloud sync / self-hosted cloud
- pH/EC nutrient dosing

## V1 Success Criteria

Walk away from the greenhouse for a week, come back to healthy plants. The system waters, ventilates, and heats autonomously. Telegram alerts if anything needs attention. Ask "how are the tomatoes?" and get an intelligent answer.
