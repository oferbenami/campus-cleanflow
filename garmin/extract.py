#!/usr/bin/env python3
"""
Garmin workout extractor — downloads FIT files from Garmin Connect.

Re-runnable: tracks downloaded activity IDs in workouts/.state.json so that
each run only fetches workouts not yet saved locally.

Usage:
    python garmin/extract.py                    # extract all 2026 workouts
    python garmin/extract.py --year 2025        # extract a different year
    python garmin/extract.py --start 2026-03-01 --end 2026-03-31  # date range

Credentials are read from GARMIN_EMAIL / GARMIN_PASSWORD environment variables
or from a .env file in the garmin/ directory.
"""

import argparse
import json
import os
import sys
import time
from datetime import date, datetime
from pathlib import Path

from dotenv import load_dotenv

# Load .env from the garmin/ directory (next to this script)
load_dotenv(Path(__file__).parent / ".env")

WORKOUTS_DIR = Path(__file__).parent.parent / "workouts"
STATE_FILE = WORKOUTS_DIR / ".state.json"


# ---------------------------------------------------------------------------
# State helpers — track which activity IDs have already been downloaded
# ---------------------------------------------------------------------------

def load_state() -> set:
    """Return the set of activity IDs already downloaded."""
    if STATE_FILE.exists():
        with open(STATE_FILE) as f:
            return set(json.load(f).get("downloaded_ids", []))
    return set()


def save_state(downloaded_ids: set) -> None:
    STATE_FILE.parent.mkdir(parents=True, exist_ok=True)
    with open(STATE_FILE, "w") as f:
        json.dump({"downloaded_ids": sorted(downloaded_ids)}, f, indent=2)


# ---------------------------------------------------------------------------
# Garmin Connect helpers
# ---------------------------------------------------------------------------

def get_client():
    """Authenticate with Garmin Connect and return an API client."""
    import garminconnect  # imported here so the script gives a clear error if missing

    email = os.environ.get("GARMIN_EMAIL", "").strip()
    password = os.environ.get("GARMIN_PASSWORD", "").strip()
    if not email or not password:
        sys.exit(
            "ERROR: Set GARMIN_EMAIL and GARMIN_PASSWORD in your environment "
            "or in garmin/.env"
        )

    print(f"Connecting to Garmin Connect as {email} …")
    client = garminconnect.Garmin(email, password)
    client.login()
    print("Logged in successfully.")
    return client


def fetch_activities_in_range(client, start_date: date, end_date: date) -> list:
    """
    Return all activities whose start date falls within [start_date, end_date].
    Garmin returns activities newest-first; we stop early once we pass start_date.
    """
    activities = []
    offset = 0
    page_size = 100

    print(f"Fetching activities from {start_date} to {end_date} …")

    while True:
        try:
            batch = client.get_activities(offset, page_size)
        except Exception as exc:
            print(f"  Warning: failed to fetch page at offset {offset}: {exc}")
            break

        if not batch:
            break

        for act in batch:
            raw_date = act.get("startTimeLocal", "")[:10]
            if not raw_date:
                continue
            try:
                act_date = datetime.strptime(raw_date, "%Y-%m-%d").date()
            except ValueError:
                continue

            # Activities are newest-first; once we go past our window, stop.
            if act_date < start_date:
                return activities

            if act_date <= end_date:
                activities.append(act)

        offset += page_size
        time.sleep(0.5)  # be gentle with the API

    return activities


def download_fit(client, activity_id: int, dest: Path) -> None:
    """Download the FIT file for *activity_id* and write it to *dest*."""
    import garminconnect

    raw = client.download_activity(
        activity_id, dl_fmt=client.ActivityDownloadFormat.ORIGINAL
    )
    dest.write_bytes(raw)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def parse_args():
    parser = argparse.ArgumentParser(
        description="Download Garmin workouts as FIT files (re-runnable)."
    )
    parser.add_argument(
        "--year", type=int, default=2026,
        help="Calendar year to extract (default: 2026). Ignored if --start/--end are set."
    )
    parser.add_argument("--start", metavar="YYYY-MM-DD", help="Start date (inclusive).")
    parser.add_argument("--end",   metavar="YYYY-MM-DD", help="End date (inclusive).")
    return parser.parse_args()


def main():
    args = parse_args()

    if args.start or args.end:
        start_date = datetime.strptime(args.start, "%Y-%m-%d").date() if args.start else date(args.year, 1, 1)
        end_date   = datetime.strptime(args.end,   "%Y-%m-%d").date() if args.end   else date(args.year, 12, 31)
    else:
        start_date = date(args.year, 1, 1)
        end_date   = date(args.year, 12, 31)

    WORKOUTS_DIR.mkdir(parents=True, exist_ok=True)

    client          = get_client()
    downloaded_ids  = load_state()
    activities      = fetch_activities_in_range(client, start_date, end_date)

    print(f"Found {len(activities)} activit(y|ies) in range.")

    new_count     = 0
    skipped_count = 0
    error_count   = 0

    for act in activities:
        activity_id   = str(act["activityId"])
        activity_date = act.get("startTimeLocal", "")[:10]
        type_key      = (act.get("activityType") or {}).get("typeKey", "unknown")
        name          = act.get("activityName", "Unnamed")

        if activity_id in downloaded_ids:
            skipped_count += 1
            continue

        filename = f"{activity_date}_{type_key}_{activity_id}.fit"
        dest     = WORKOUTS_DIR / filename

        print(f"  Downloading  [{activity_date}]  {name}  →  {filename}")

        try:
            download_fit(client, int(activity_id), dest)
            downloaded_ids.add(activity_id)
            save_state(downloaded_ids)  # persist after every successful download
            new_count += 1
            time.sleep(0.3)
        except Exception as exc:
            error_count += 1
            print(f"    ERROR: {exc}")

    print(
        f"\nDone.  "
        f"Downloaded {new_count} new | "
        f"Skipped {skipped_count} already present | "
        f"Errors {error_count}"
    )


if __name__ == "__main__":
    main()
