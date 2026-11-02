"use client";

import { useEffect, useState } from "react";

interface SolarData {
  sunrise: string | null;
  sunset: string | null;
  solar_noon: string | null;
  daylight_hours: number | null;
  civil_twilight_morning_end: string | null;
  civil_twilight_evening_start: string | null;
  nautical_twilight_morning_end: string | null;
  nautical_twilight_evening_start: string | null;
  astronomical_twilight_morning_end: string | null;
  astronomical_twilight_evening_start: string | null;
  polar_day: boolean;
  polar_night: boolean;
  current_position?: {
    altitude_deg: number;
    azimuth_deg: number;
    is_above_horizon: boolean;
  };
}

interface LunarData {
  moonrise: string | null;
  moonset: string | null;
  phase_name: string;
  phase_fraction: number;
  illuminated_fraction: number;
  illumination_percent: number;
  current_position?: {
    altitude_deg: number;
    is_above_horizon: boolean;
  };
}

interface PlanetData {
  name: string;
  altitude_deg: number;
  is_above_horizon: boolean;
  distance_au?: number;
}

interface DailySkyData {
  date: string;
  location: {
    name: string;
    latitude: number;
    longitude: number;
    timezone: string;
  };
  solar: SolarData;
  lunar: LunarData;
  planets: PlanetData[];
  visible_planets: PlanetData[];
}

function formatTime(isoString: string | null): string {
  if (!isoString) return "N/A";
  const d = new Date(isoString);
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

function MoonPhaseIcon({ fraction, illumination }: { fraction: number; illumination: number }) {
  const fill = Math.max(0, Math.min(1, illumination / 100));
  return (
    <div className="relative w-16 h-16">
      <svg viewBox="0 0 100 100" className="w-full h-full">
        <circle cx="50" cy="50" r="45" fill="#1f2937" stroke="#4b5563" strokeWidth="2" />
        <circle
          cx="50"
          cy="50"
          r="45"
          fill="#fbbf24"
          opacity={0.15 + fill * 0.7}
        />
      </svg>
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState<DailySkyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/v1/sky/daily")
      .then((res) => {
        if (!res.ok) throw new Error(`API error: ${res.status}`);
        return res.json();
      })
      .then((json) => {
        setData(json.data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="text-gray-400 animate-pulse text-lg">Loading sky data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="text-red-400 text-lg">Error: {error}</div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold tracking-tight">{data.date}</h2>
        <p className="text-gray-400 mt-1">
          {data.location.name} · {data.location.latitude.toFixed(2)}°N,{" "}
          {data.location.longitude.toFixed(2)}°E · {data.location.timezone}
        </p>
      </div>

      {/* Solar & Lunar Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Solar Card */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            ☀️ Solar
          </h3>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-400">Sunrise</dt>
              <dd>{formatTime(data.solar.sunrise)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-400">Sunset</dt>
              <dd>{formatTime(data.solar.sunset)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-400">Solar Noon</dt>
              <dd>{formatTime(data.solar.solar_noon)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-400">Daylight</dt>
              <dd>
                {data.solar.daylight_hours
                  ? `${data.solar.daylight_hours.toFixed(1)} hours`
                  : "N/A"}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-400">Civil Twilight</dt>
              <dd>
                {formatTime(data.solar.civil_twilight_morning_end)} —{" "}
                {formatTime(data.solar.civil_twilight_evening_start)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-400">Astronomical Twilight</dt>
              <dd>
                {formatTime(data.solar.astronomical_twilight_morning_end)} —{" "}
                {formatTime(data.solar.astronomical_twilight_evening_start)}
              </dd>
            </div>
            {data.solar.current_position && (
              <>
                <hr className="border-gray-800 my-2" />
                <div className="flex justify-between">
                  <dt className="text-gray-400">Current Altitude</dt>
                  <dd>
                    {data.solar.current_position.altitude_deg.toFixed(1)}°
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-400">Status</dt>
                  <dd className={data.solar.current_position.is_above_horizon ? "text-yellow-400" : "text-blue-400"}>
                    {data.solar.current_position.is_above_horizon ? "☀️ Above horizon" : "🌙 Below horizon"}
                  </dd>
                </div>
              </>
            )}
          </dl>
        </div>

        {/* Lunar Card */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            🌙 Lunar
          </h3>
          <div className="flex items-start gap-4 mb-4">
            <MoonPhaseIcon fraction={data.lunar.phase_fraction} illumination={data.lunar.illumination_percent} />
            <div>
              <p className="font-medium">{data.lunar.phase_name}</p>
              <p className="text-sm text-gray-400">
                Illumination: {data.lunar.illumination_percent.toFixed(1)}%
              </p>
            </div>
          </div>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-400">Moonrise</dt>
              <dd>{formatTime(data.lunar.moonrise)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-400">Moonset</dt>
              <dd>{formatTime(data.lunar.moonset)}</dd>
            </div>
            {data.lunar.current_position && (
              <>
                <hr className="border-gray-800 my-2" />
                <div className="flex justify-between">
                  <dt className="text-gray-400">Current Altitude</dt>
                  <dd>
                    {data.lunar.current_position.altitude_deg.toFixed(1)}°
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-400">Status</dt>
                  <dd className={data.lunar.current_position.is_above_horizon ? "text-yellow-200" : "text-blue-400"}>
                    {data.lunar.current_position.is_above_horizon ? "🌙 Above horizon" : "Below horizon"}
                  </dd>
                </div>
              </>
            )}
          </dl>
        </div>
      </div>

      {/* Planets */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold mb-4">🪐 Planets Tonight</h3>
        {data.visible_planets.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {data.visible_planets.map((planet) => (
              <div
                key={planet.name}
                className="bg-gray-800 rounded-lg p-4 text-center"
              >
                <p className="font-medium">{planet.name}</p>
                <p className="text-sm text-gray-400 mt-1">
                  Alt: {planet.altitude_deg.toFixed(1)}°
                </p>
                <p className="text-xs text-green-400 mt-1">Visible</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-400 text-sm">
            No planets currently above the minimum altitude threshold.
          </p>
        )}

        <hr className="border-gray-800 my-4" />
        <h4 className="text-sm font-medium text-gray-400 mb-3">All Planets</h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {data.planets.map((planet) => (
            <div
              key={planet.name}
              className={`rounded-lg p-4 text-center ${
                planet.is_above_horizon ? "bg-gray-800" : "bg-gray-900 opacity-50"
              }`}
            >
              <p className="font-medium">{planet.name}</p>
              <p className="text-sm text-gray-400 mt-1">
                Alt: {planet.altitude_deg.toFixed(1)}°
              </p>
              <p
                className={`text-xs mt-1 ${
                  planet.is_above_horizon ? "text-green-400" : "text-gray-500"
                }`}
              >
                {planet.is_above_horizon ? "Above horizon" : "Below horizon"}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-xs text-gray-600 pt-8">
        <p>Powered by Skyfield · Pathfinder Sky Platform</p>
      </div>
    </div>
  );
}
