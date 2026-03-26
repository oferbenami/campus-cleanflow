#!/usr/bin/env python3
"""
Garmin FIT file parser — parses FIT files and stores comprehensive workout data.

Re-runnable: tracks which FIT files have already been parsed in
garmin/data/.parse_state.json; new files are parsed and *appended* to the
existing output (garmin/data/parsed_workouts.json) without re-processing
files already present.

Captured data per workout
─────────────────────────
  • file_id / activity metadata
  • session summary (distance, duration, calories, sport, training effect …)
  • laps (one entry per lap/interval with per-lap stats)
  • splits (auto-pause splits, distance splits, etc.)
  • records (second-by-second: timestamp, position_lat/long, distance, speed,
             heart_rate, cadence, power, altitude, temperature, vertical_oscillation,
             ground_contact_time, stance_time_percent, vertical_ratio …)
  • events (timer events, workout steps, auto-lap triggers …)
  • hr_zone / time_in_zone breakdowns

Usage:
    python garmin/parse.py                  # parse all new FIT files
    python garmin/parse.py --workouts-dir /path/to/fits  # custom source dir
    python garmin/parse.py --no-records     # skip per-second records (smaller file)
"""

import argparse
import json
import sys
from datetime import date, datetime
from pathlib import Path

DATA_DIR   = Path(__file__).parent / "data"
OUTPUT     = DATA_DIR / "parsed_workouts.json"
STATE_FILE = DATA_DIR / ".parse_state.json"

# ---------------------------------------------------------------------------
# JSON serialization — handle datetime / enum values from fitparse
# ---------------------------------------------------------------------------

class _FitEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, (datetime, date)):
            return obj.isoformat()
        if hasattr(obj, "value"):       # fitparse enum wrappers
            return obj.value
        if hasattr(obj, "__str__"):
            return str(obj)
        return super().default(obj)


def _serialize(obj):
    """Convert any fitparse value to a JSON-safe Python native type."""
    if obj is None:
        return None
    if isinstance(obj, (bool, int, float, str)):
        return obj
    if isinstance(obj, (datetime, date)):
        return obj.isoformat()
    if hasattr(obj, "value"):           # garmin enum
        return obj.value
    return str(obj)


def _fields_to_dict(message) -> dict:
    """Extract all non-None fields from a fitparse message as a plain dict."""
    return {
        f.name: _serialize(f.value)
        for f in message.fields
        if f.value is not None
    }


# ---------------------------------------------------------------------------
# State helpers
# ---------------------------------------------------------------------------

def load_state() -> set:
    if STATE_FILE.exists():
        with open(STATE_FILE) as f:
            return set(json.load(f).get("parsed_files", []))
    return set()


def save_state(parsed_files: set) -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    with open(STATE_FILE, "w") as f:
        json.dump({"parsed_files": sorted(parsed_files)}, f, indent=2)


def load_existing_data() -> list:
    if OUTPUT.exists():
        with open(OUTPUT) as f:
            return json.load(f)
    return []


def save_data(data: list) -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT, "w") as f:
        json.dump(data, f, indent=2, cls=_FitEncoder)


# ---------------------------------------------------------------------------
# FIT parser
# ---------------------------------------------------------------------------

# Message types we capture (anything else is ignored but won't cause errors)
_KNOWN_LISTS = {
    "lap", "record", "split", "split_summary", "event",
    "hr_zone", "time_in_zone", "workout_step",
}
_KNOWN_SINGLES = {
    "file_id", "session", "activity",
    "device_info", "user_profile", "zones_target",
    "training_file",
}


def parse_fit_file(fit_path: Path, include_records: bool = True) -> dict:
    """
    Parse a single FIT file and return a structured dict.

    Structure
    ─────────
    {
      "file":     "<filename>",
      "file_id":  { … },          # device / file metadata
      "activity": { … },          # activity-level meta
      "session":  { … },          # full session summary
      "laps":     [ { … }, … ],   # per-lap summaries
      "splits":   [ { … }, … ],   # splits / intervals
      "split_summaries": [ … ],
      "records":  [ { … }, … ],   # per-second data points (optional)
      "events":   [ { … }, … ],   # timer / auto-lap / workout events
      "hr_zones": [ { … }, … ],
      "time_in_zone": [ { … }, … ],
      "workout_steps": [ { … }, … ],
      "device_info": { … },
      "user_profile": { … },
      "zones_target": { … },
    }
    """
    try:
        from fitparse import FitFile
    except ImportError:
        sys.exit("ERROR: 'fitparse' not installed. Run: pip install fitparse")

    fit = FitFile(str(fit_path))

    workout: dict = {
        "file":           fit_path.name,
        "file_id":        {},
        "activity":       {},
        "session":        {},
        "laps":           [],
        "splits":         [],
        "split_summaries": [],
        "records":        [],
        "events":         [],
        "hr_zones":       [],
        "time_in_zone":   [],
        "workout_steps":  [],
        "device_info":    {},
        "user_profile":   {},
        "zones_target":   {},
    }

    for msg in fit.get_messages():
        name   = msg.name
        fields = _fields_to_dict(msg)

        if not fields:
            continue

        if name in _KNOWN_SINGLES:
            workout[name.replace("file_id", "file_id")] = fields
        elif name == "lap":
            workout["laps"].append(fields)
        elif name == "record":
            if include_records:
                workout["records"].append(fields)
        elif name == "split":
            workout["splits"].append(fields)
        elif name == "split_summary":
            workout["split_summaries"].append(fields)
        elif name == "event":
            workout["events"].append(fields)
        elif name == "hr_zone":
            workout["hr_zones"].append(fields)
        elif name == "time_in_zone":
            workout["time_in_zone"].append(fields)
        elif name == "workout_step":
            workout["workout_steps"].append(fields)
        # all other message types are silently skipped

    # Derive a human-friendly summary at the top level for quick access
    session = workout["session"]
    workout["_summary"] = {
        "date":              session.get("start_time"),
        "sport":             session.get("sport"),
        "sub_sport":         session.get("sub_sport"),
        "total_distance_m":  session.get("total_distance"),
        "total_elapsed_s":   session.get("total_elapsed_time"),
        "total_timer_s":     session.get("total_timer_time"),
        "calories":          session.get("total_calories"),
        "avg_heart_rate":    session.get("avg_heart_rate"),
        "max_heart_rate":    session.get("max_heart_rate"),
        "avg_cadence":       session.get("avg_running_cadence") or session.get("avg_cadence"),
        "max_cadence":       session.get("max_running_cadence") or session.get("max_cadence"),
        "avg_speed_ms":      session.get("avg_speed"),
        "max_speed_ms":      session.get("max_speed"),
        "avg_power_w":       session.get("avg_power"),
        "normalized_power_w": session.get("normalized_power"),
        "training_stress_score": session.get("training_stress_score"),
        "total_ascent_m":    session.get("total_ascent"),
        "total_descent_m":   session.get("total_descent"),
        "num_laps":          len(workout["laps"]),
        "num_records":       len(workout["records"]),
    }

    return workout


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def parse_args():
    parser = argparse.ArgumentParser(
        description="Parse Garmin FIT files and append to parsed_workouts.json."
    )
    parser.add_argument(
        "--workouts-dir", default=None,
        help="Directory containing FIT files (default: workouts/ at project root)."
    )
    parser.add_argument(
        "--no-records", action="store_true",
        help="Skip per-second records to reduce output file size."
    )
    return parser.parse_args()


def main():
    args = parse_args()

    workouts_dir = (
        Path(args.workouts_dir)
        if args.workouts_dir
        else Path(__file__).parent.parent / "workouts"
    )

    if not workouts_dir.exists():
        sys.exit(f"ERROR: workouts directory not found: {workouts_dir}")

    fit_files = sorted(workouts_dir.glob("*.fit"))
    if not fit_files:
        print(f"No FIT files found in {workouts_dir}")
        return

    DATA_DIR.mkdir(parents=True, exist_ok=True)

    parsed_files  = load_state()
    existing_data = load_existing_data()
    new_files     = [f for f in fit_files if f.name not in parsed_files]

    print(
        f"FIT files found: {len(fit_files)} total, "
        f"{len(new_files)} new, "
        f"{len(fit_files) - len(new_files)} already parsed."
    )

    if not new_files:
        print("Nothing to do.")
        return

    include_records = not args.no_records
    new_count       = 0
    error_count     = 0

    for fit_path in new_files:
        print(f"  Parsing  {fit_path.name} …")
        try:
            workout = parse_fit_file(fit_path, include_records=include_records)
            existing_data.append(workout)
            parsed_files.add(fit_path.name)

            # Persist state after every successful parse so a crash mid-run
            # doesn't lose progress.
            save_state(parsed_files)
            new_count += 1
        except Exception as exc:
            error_count += 1
            print(f"    ERROR: {exc}")

    if new_count:
        save_data(existing_data)
        print(
            f"\nDone.  Parsed {new_count} new workout(s).  "
            f"Total in output: {len(existing_data)}\n"
            f"Output → {OUTPUT}"
        )
    else:
        print("\nNo new workouts successfully parsed.")

    if error_count:
        print(f"Warnings: {error_count} file(s) failed — see messages above.")


if __name__ == "__main__":
    main()
