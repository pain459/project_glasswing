"""
Sky Stories — Daily astronomy stories for kids.

Generates a short, engaging story about what's visible in the sky
on a given date, tailored for young stargazers (ages 6-12).
"""

import logging
from datetime import datetime, timezone
from typing import Optional

logger = logging.getLogger(__name__)

# Story templates keyed by moon phase
MOON_STORIES = {
    "New Moon": {
        "intro": "Tonight the Moon is playing hide-and-seek! It's a New Moon, so the Moon is hiding in the darkness.",
        "tip": "This is the perfect night to look for faint stars and the Milky Way!",
    },
    "Waxing Crescent": {
        "intro": "A thin sliver of Moon is peeking out! It's called a Waxing Crescent — like a smiling curve in the sky.",
        "tip": "Look west after sunset to spot the Moon's tiny smile.",
    },
    "First Quarter": {
        "intro": "Half the Moon is lit up! It's the First Quarter phase — the Moon has filled up halfway like a glass of juice.",
        "tip": "The Moon rises around noon and sets around midnight.",
    },
    "Waxing Gibbous": {
        "intro": "The Moon is getting bigger and brighter! More than half is lit — it's called Waxing Gibbous.",
        "tip": "Soon it will be a Full Moon. Keep watching each night!",
    },
    "Full Moon": {
        "intro": "Wow! The Moon is fully lit up like a giant silver coin! It's a Full Moon — the brightest it gets all month.",
        "tip": "Try the 'Moon walk' — imagine you're bouncing on the Moon's surface!",
    },
    "Waning Gibbous": {
        "intro": "The Full Moon is slowly shrinking, but still very bright! This is the Waning Gibbous phase.",
        "tip": "The Moon rises a little later each night. Can you notice?",
    },
    "Last Quarter": {
        "intro": "The Moon is half-lit again, but the other half! It's the Last Quarter — three-quarters of the way through its cycle.",
        "tip": "This Moon rises around midnight. Night owls get the best view!",
    },
    "Waning Crescent": {
        "intro": "Just a thin crescent of Moon is left before the cycle starts over. It's called a Waning Crescent.",
        "tip": "Look east before sunrise to see the Moon's final glow.",
    },
}

# Planet stories for kids
PLANET_KID_STORIES = {
    "Mercury": "Mercury is the shy planet — it hides so close to the Sun that it's very hard to see!",
    "Venus": "Venus is the brightest planet! It's so shiny it's sometimes called the 'Morning Star' or 'Evening Star'.",
    "Mars": "Mars is the Red Planet! It looks like a tiny red LED light in the sky.",
    "Jupiter": "Jupiter is the giant of our solar system! It's so big that 1,300 Earths could fit inside it.",
    "Saturn": "Saturn wears beautiful rings made of ice and rock. You need a telescope to see them!",
    "Uranus": "Uranus is a pale blue-green world that spins on its side — like a rolling ball!",
    "Neptune": "Neptune is the windiest planet, with storms that blow faster than 2,000 km/h!",
}

# Seasonal sky stories
SEASONAL_STORIES = {
    "winter": "Winter skies are crystal clear! The bright stars of Orion the Hunter dominate the sky. Look for his three belt stars — they point to Sirius, the brightest star in the night sky!",
    "spring": "Spring brings new constellations! Leo the Lion is easy to spot — look for his sickle-shaped head. The Big Dipper points toward Arcturus, a bright orange star.",
    "summer": "Summer is Milky Way season! The bright band of our galaxy stretches across the sky. The Summer Triangle — Vega, Deneb, and Altair — is easy to find on clear nights.",
    "autumn": "Autumn skies feature the Great Square of Pegasus. It's so big you need both hands held apart to measure it! Andromeda Galaxy hides nearby — our nearest galactic neighbor.",
}


def generate_sky_story(
    date: datetime,
    moon_phase: str,
    moon_illumination: float,
    visible_planets: list,
    season: str,
    moon_distance_label: str = "normal",
    active_showers: list = None,
    is_moon_above_horizon: bool = False,
) -> dict:
    """Generate a kid-friendly sky story for the given date.

    Returns:
    {
        "title": str,
        "story": str,
        "moon_story": str,
        "planet_highlights": list[str],
        "seasonal_tip": str,
        "fun_fact": str,
        "activity": str,
    }
    """
    story_parts = []

    # Moon story
    moon_info = MOON_STORIES.get(moon_phase, MOON_STORIES["New Moon"])
    moon_story = moon_info["intro"]

    if moon_distance_label == "supermoon":
        moon_story += " And today it's extra big — a Supermoon! The Moon looks bigger and brighter than usual."
    elif moon_distance_label == "micromoon":
        moon_story += " The Moon is far away today — a Micromoon. It looks a bit smaller than usual."

    if not is_moon_above_horizon:
        moon_story += " Unfortunately, the Moon is below the horizon tonight, so you'll have to wait for another night to see it!"

    # Build the main story
    story_parts.append(_get_greeting(date))
    story_parts.append(moon_story)

    # Planet highlights
    planet_highlights = []
    for planet in visible_planets:
        name = planet.get("name", "")
        if name in PLANET_KID_STORIES:
            planet_highlights.append(PLANET_KID_STORIES[name])

    if planet_highlights:
        story_parts.append("\n🪐 **Planets to look for:**")
        story_parts.extend(planet_highlights[:3])  # Top 3

    # Meteor shower mention
    if active_showers:
        for shower in active_showers[:1]:
            if shower.get("near_peak"):
                story_parts.append(
                    f"\n☄️ **Meteor Alert!** The {shower['name']} meteor shower is peaking! "
                    f"Look for shooting stars — up to {shower['zhr']} per hour!"
                )

    # Seasonal tip
    seasonal_tip = SEASONAL_STORIES.get(season, SEASONAL_STORIES["winter"])
    story_parts.append(f"\n🌟 **This Season:** {seasonal_tip}")

    # Fun fact
    fun_fact = _get_fun_fact_for_date(date)
    story_parts.append(f"\n🧠 **Did You Know?** {fun_fact}")

    # Activity suggestion
    activity = _get_activity_suggestion(moon_phase, is_moon_above_horizon, season)
    story_parts.append(f"\n🎯 **Tonight's Activity:** {activity}")

    title = f"Sky Story for {date.strftime('%B %d, %Y')}"

    return {
        "title": title,
        "story": "\n".join(story_parts),
        "moon_story": moon_story,
        "planet_highlights": planet_highlights[:3],
        "seasonal_tip": seasonal_tip,
        "fun_fact": fun_fact,
        "activity": activity,
    }


def _get_greeting(date: datetime) -> str:
    """Get a time-appropriate greeting."""
    hour = date.hour if date.hour else 21
    if 6 <= hour < 12:
        return "☀️ Good morning, young astronomer!"
    elif 12 <= hour < 18:
        return "🌤️ Good afternoon, sky explorer!"
    else:
        return "🌙 Good evening, star gazer!"


def _get_fun_fact_for_date(date: datetime) -> str:
    """Get a fun fact based on the date."""
    import hashlib
    facts = [
        "Sunlight takes about 8 minutes to reach Earth. When you look at the Sun (never directly!), you're seeing it as it was 8 minutes ago!",
        "The Moon is drifting away from Earth at about 3.8 cm per year — that's about as fast as your fingernails grow!",
        "Jupiter's Great Red Spot is a storm bigger than Earth that has been raging for at least 350 years!",
        "If you could fold a piece of paper 42 times, it would reach the Moon!",
        "There are more stars in the universe than grains of sand on all the beaches on Earth!",
        "A day on Venus is longer than a year on Venus!",
        "Saturn is so light that if you could find a big enough bathtub, it would float in water!",
        "The Milky Way galaxy is about 100,000 light-years across. Light travels at 300,000 km per second!",
        "Neutron stars spin so fast that some rotate over 700 times per second!",
        "The air on Venus is so thick that you could fly in it with a pair of wings made of paper!",
        "One teaspoon of a neutron star would weigh about 6 billion tons on Earth!",
        "The Sun is so big that about 1.3 million Earths could fit inside it!",
    ]
    # Deterministic selection based on date
    seed = hashlib.md5(date.strftime("%Y%m%d").encode()).hexdigest()
    idx = int(seed[:8], 16) % len(facts)
    return facts[idx]


def _get_activity_suggestion(
    moon_phase: str,
    is_moon_above: bool,
    season: str,
) -> str:
    """Suggest an activity based on conditions."""
    if moon_phase == "New Moon" and is_moon_above:
        return "Grab a blanket and lie down — the dark sky is perfect for spotting the Milky Way!"
    if moon_phase == "Full Moon" and is_moon_above:
        return "Try moon-gazing! Can you spot the dark patches (maria) on the Moon's surface?"
    if "Crescent" in moon_phase and is_moon_above:
        return "Draw the Moon's shape tonight and compare it tomorrow — it changes every night!"
    if not is_moon_above:
        return "The Moon is below the horizon — perfect for finding faint stars and constellations!"
    return "Look up and count how many stars you can see in 30 seconds. Can you beat your record?"
