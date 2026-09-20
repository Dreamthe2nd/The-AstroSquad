# Spectroscopic Analysis of Galaxies M82 and M31

## Overview

This repository contains observational data, reduction scripts, analysis notebooks, and research documentation for our project investigating the spectroscopic properties of two contrasting celestial targets: **M82** (a starburst galaxy) and **M31** (the Andromeda Galaxy).

Key research areas include:

* Measuring spectral Doppler shifts to determine redshift (M82) and blueshift (M31)


* Heliocentric radial velocity estimation and distance comparisons


* Galactic chemical composition and emission/absorption profiles (e.g., $H\alpha$, $H\beta$, $[N\text{ II}]$, $[S\text{ II}]$)


* Spectral signatures of star-formation regions and ionized gas outflows


* Evaluating observational accuracy, instrument response, and telluric corrections



## Research Team

* Shlok
* Annushka
* Keya
* Sheetal

## Project Status

🟡 Preparation / Data Collection

## Repository Structure

| Directory | Purpose |
| --- | --- |
| `data/` | Raw and processed observational spectra (FITS, 1D extracted profiles) |
| `research/` | Research questions, hypotheses, targets background, and literature |
| `targets/` | Observational logs and ephemerides for M82 and M31 |
| `analysis/` | Data reduction, wavelength calibration, and radial velocity scripts |
| `results/` | Calibrated spectra, line measurements, figures, and comparison tables |
| `observing/` | Observatory logs, flat-field, and arc lamp calibration records |
| `docs/` | Methodology, pipeline documentation, and project reports |

## Data Policy

Original observational FITS frames and calibration exposures (darks, flats, and neon/argon calibration lamp spectra) must be preserved in unmodified raw format.

Processed 1D spectra and reduced data products should be stored separately, with all reduction steps (bias/dark subtraction, flat fielding, wavelength calibration, and sky subtraction) documented reproducible pipelines.

## Scientific Reproducibility

Spectral extraction and data reduction should follow documented procedures with version-controlled code.

All observational spectra must retain comprehensive metadata (telescope configuration, grating parameters, exposure cadence, calibration solution) to allow reproduction and independent verification.

## Project Goals

The project aims to obtain independent spectroscopic measurements of M82 and M31 and compare derived radial velocities, Doppler shifts, and spectral signatures with standard astronomical reference templates and theoretical models.

---

**Project status:** 🟡 Preparation / Data Collection
