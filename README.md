# Alkalac

Alkalac is an autonomous floating water neutralization device designed to combat lake acidification and restore aquatic biodiversity. The device monitors water pH on a continuous basis and automatically dispenses crushed limestone when acidity exceeds safe thresholds, replacing the polluting and labor-intensive process of manual liming.

---

## Features

- Autonomous pH-based limestone dispensing
- Solar-powered operation with 12V battery backup for night use
- Real-time and historical pH monitoring via a web dashboard
- Dispense history logging
- Wireless network support allowing multiple Alkalac units to activate simultaneously from a primary signal
- One-way dispensing system preventing water ingress into the device
- Silica gel moisture control to prevent powder solidification

---

## How It Works

A SEN0161 pH sensor polls the water every two days. When the pH drops below 6.5, the ESP32 microcontroller (programmed in C++) sends a signal to a TB660 motor controller, which drives a NEMA23 stepper motor. The stepper motor turns a worm screw (vis sans fin) that pushes crushed limestone powder from a funnel-shaped internal reservoir through a one-way valve into the water.

The entire unit floats on a styrofoam base, is sealed against moisture, and is powered by a solar panel that charges a 12V battery during the day.

### Coverage

Based on a crushed limestone bulk density of 2.71 g/cm3, a single unit holds approximately 348 lbs (60 L) of limestone. A lake of one acre requires between 600 and 1000 lbs of limestone for full neutralization, meaning a network of approximately 5 units is sufficient for one acre of water, depending on the desired recharge interval.

---

## Dashboard

The web dashboard is hosted directly on the ESP32 microcontroller and written in JavaScript. It provides:

- Live pH gauge
- Table of latest pH data points
- Table of latest dispense events
- Historical pH chart
- CSV download of pH data

---

## Hardware

| Component | Purpose |
|---|---|
| ESP32 microcontroller | Main logic, web server, motor control |
| SEN0161 pH sensor | Water pH measurement |
| TB660 motor controller | Stepper motor driver |
| NEMA23 stepper motor | Drives the worm screw |
| Solar panel + 12V battery | Power supply |
| 3D-printed modular funnel | Limestone hopper |
| Silica gel container | Moisture absorption |
| Styrofoam block | Buoyancy |

---

## Software

- Firmware: C++ on ESP32
- Dashboard: JavaScript, served from the ESP32
- Wireless: Multi-unit network support via ESP32 wireless capabilities

---

## Future Work

- Seal the funnel permanently (currently open for demonstration purposes)
- Integrate a custom PCB for improved wiring reliability and organization

---

## Changelog

### v3 - March 2026
- Completed software and web dashboard
- Added historical pH chart and dispense history logging
- Added CSV data export

### v2 - April 2025
- Redesigned internal layout to maximize limestone storage capacity (60 L per unit)
- Replaced vertical funnel-only design with a full horizontal worm screw system
- Introduced modular 3D-printed funnel to accommodate printer volume limits
- Added silica gel container for moisture control
- Added styrofoam buoyancy block
- Designed wireless network protocol for multi-unit simultaneous activation
- Created first technical drawings (CAD)

### v1 - Initial Concept
- Preliminary sketch establishing core logic: pH sensing, worm screw dispensing, funnel storage, solar power, lateral floats

---

## Authors

**Adam Sarhan** and **Lucas Dauth**
Collège Sainte-Anne de Lachine
Expo-sciences finale locale, 2026
Category: Engineering Design -- Application of computer and mechanical engineering in an environmental context
