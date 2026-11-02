"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Sun,
  Moon as MoonIcon,
  Eye,
  EyeOff,
  MapPin,
  Calendar,
  Sunrise,
  Sunset,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Telescope,
  Info,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────

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

interface MilkyWayInfo {
  galactic_center_altitude: number;
  galactic_center_azimuth: number;
  is_visible: boolean;
  best_viewing_hour_utc: number;
  seasonal_visibility: string;
  seasonal_description: string;
  optimal_months: string[];
}

interface MeteorShower {
  name: string;
  peak_date: string;
  zhr: number;
  days_from_peak: number;
  near_peak: boolean;
}

interface FactEntry {
  fact: string;
  source: string;
}

interface SkyEvents {
  milky_way: MilkyWayInfo;
  meteor_showers: MeteorShower[];
  active_shower_count: number;
  facts: FactEntry[];
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
  sky_events?: SkyEvents;
}

// ─── Helpers ─────────────────────────────────────────────────────────

function formatTime(isoString: string | null): string {
  if (!isoString) return "—";
  const d = new Date(isoString);
  return d.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDaylight(hours: number | null): string {
  if (hours == null) return "—";
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}h ${m}m`;
}

function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-IN", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function shiftDate(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function getToday(): string {
  return new Date().toISOString().slice(0, 10);
}

// ─── Moon Phase SVG (compact, 32px) ─────────────────────────────────

function MoonPhase({ fraction, illumination }: { fraction: number; illumination: number }) {
  const pct = Math.max(0, Math.min(100, illumination));
  const isWaxing = fraction <= 0.5;
  const baseColor = "var(--sky-moon-base)";
  const litColor = "var(--sky-moon-lit)";

  return (
    <svg width="32" height="32" viewBox="0 0 32 32" className="flex-shrink-0">
      <circle cx="16" cy="16" r="14" fill={baseColor} />
      {pct > 0 && (
        <>
          {pct >= 100 ? (
            <circle cx="16" cy="16" r="14" fill={litColor} />
          ) : pct <= 1 ? (
            <circle cx="16" cy="16" r="14" fill={baseColor} />
          ) : isWaxing ? (
            <>
              <path d="M16 2 A14 14 0 0 1 16 30 Z" fill={litColor} opacity={0.9} />
              <ellipse cx="16" cy="16" rx={14 * (1 - pct / 100)} ry="14" fill={baseColor} />
            </>
          ) : (
            <>
              <path d="M16 2 A14 14 0 0 0 16 30 Z" fill={litColor} opacity={0.9} />
              <ellipse cx="16" cy="16" rx={14 * ((100 - pct) / 100)} ry="14" fill={baseColor} />
            </>
          )}
        </>
      )}
    </svg>
  );
}

// ─── Day Arc Timeline ────────────────────────────────────────────────

function DayArc({ solar }: { solar: SolarData }) {
  const sunriseMin = solar.sunrise
    ? new Date(solar.sunrise).getHours() * 60 + new Date(solar.sunrise).getMinutes()
    : 360;
  const sunsetMin = solar.sunset
    ? new Date(solar.sunset).getHours() * 60 + new Date(solar.sunset).getMinutes()
    : 1080;
  const nowMin = new Date().getHours() * 60 + new Date().getMinutes();

  const range = 1200;
  const offset = 300;

  const startPct = Math.max(0, ((sunriseMin - offset) / range) * 100);
  const endPct = Math.min(100, ((sunsetMin - offset) / range) * 100);
  const nowPct = Math.max(0, Math.min(100, ((nowMin - offset) / range) * 100));

  return (
    <div className="mt-3 pt-3" style={{ borderTop: "1px solid var(--sky-divider)" }}>
      <div className="relative h-1 rounded-full" style={{ background: "var(--sky-arc-track)" }}>
        <div
          className="absolute top-0 left-0 h-full rounded-full"
          style={{
            left: `${startPct}%`,
            width: `${Math.max(endPct - startPct, 0)}%`,
            background: "var(--sky-arc-fill)",
          }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 w-1 h-2.5 rounded-full -ml-0.5"
          style={{ left: `${nowPct}%`, background: "var(--sky-arc-marker)" }}
        />
      </div>
      <div className="flex justify-between mt-1.5">
        <span className="text-[10px]" style={{ color: "var(--sky-muted)" }}>
          <Sunrise className="w-3 h-3 inline mr-1" />
          {formatTime(solar.sunrise)}
        </span>
        <span className="text-[10px]" style={{ color: "var(--sky-muted)" }}>
          <Sunset className="w-3 h-3 inline mr-1" />
          {formatTime(solar.sunset)}
        </span>
      </div>
    </div>
  );
}

// ─── Planet Symbols ──────────────────────────────────────────────────

const PLANET_SYMBOLS: Record<string, string> = {
  Mercury: "\u263F",
  Venus: "\u2640",
  Mars: "\u2642",
  Jupiter: "\u2643",
  Saturn: "\u2644",
  Uranus: "\u26E2",
  Neptune: "\u2646",
};

// ─── Loading / Error ─────────────────────────────────────────────────

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="w-5 h-5 border border-sky-500/20 border-t-sky-400 rounded-full animate-spin" />
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center py-24">
      <span className="text-xs text-red-400/80">{message}</span>
    </div>
  );
}

// ─── Dashboard ───────────────────────────────────────────────────────

export default function Dashboard() {
  const [data, setData] = useState<DailySkyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState(getToday());

  const fetchData = useCallback(async (dateStr: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/sky/daily?date=${dateStr}`);
      if (!res.ok) throw new Error(`API ${res.status}`);
      const json = await res.json();
      setData(json.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(currentDate);
  }, [currentDate, fetchData]);

  const goPrevDay = () => setCurrentDate(shiftDate(currentDate, -1));
  const goNextDay = () => setCurrentDate(shiftDate(currentDate, 1));
  const goToday = () => setCurrentDate(getToday());

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;
  if (!data) return null;

  const sunUp = data.solar.current_position?.is_above_horizon ?? false;
  const moonUp = data.lunar.current_position?.is_above_horizon ?? false;
  const isToday = currentDate === getToday();

  return (
    <div className="space-y-4">
      {/* ── Date & Location Header with Navigation ──────────────── */}
      <div className="text-center py-2">
        <div className="flex items-center justify-center gap-3 mb-1">
          <button
            onClick={goPrevDay}
            className="date-btn"
            aria-label="Previous day"
            title="Previous day"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <div>
            <div className="flex items-center justify-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" style={{ color: "var(--sky-accent)" }} />
              <h1 className="text-base font-semibold">
                {isToday ? "Today" : formatDateShort(currentDate)}
              </h1>
            </div>
            {!isToday && (
              <button
                onClick={goToday}
                className="text-[10px] mt-0.5 underline underline-offset-2"
                style={{ color: "var(--sky-accent)" }}
              >
                Back to today
              </button>
            )}
          </div>
          <button
            onClick={goNextDay}
            className="date-btn"
            aria-label="Next day"
            title="Next day"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="flex items-center justify-center gap-1.5 text-[11px]" style={{ color: "var(--sky-muted)" }}>
          <MapPin className="w-3 h-3" />
          <span>{data.location.name}</span>
          <span style={{ color: "var(--sky-footer-text)" }}>&middot;</span>
          <span className="font-mono text-[10px]">
            {data.location.latitude.toFixed(2)}&deg;N {data.location.longitude.toFixed(2)}&deg;E
          </span>
        </div>
      </div>

      {/* ── Solar & Lunar Grid ──────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Solar */}
        <div className="sky-card">
          <div className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Sun className="w-3.5 h-3.5" style={{ color: sunUp ? "#fbbf24" : "#818cf8" }} />
              <span className="section-label">Solar</span>
              <span className={sunUp ? "status-dot-on" : "status-dot-off"} />
            </div>

            <div className="flex items-center justify-between py-1.5">
              <span className="row-label">Sunrise</span>
              <span className="row-value">{formatTime(data.solar.sunrise)}</span>
            </div>
            <div className="flex items-center justify-between py-1.5">
              <span className="row-label">Sunset</span>
              <span className="row-value">{formatTime(data.solar.sunset)}</span>
            </div>
            <div className="flex items-center justify-between py-1.5">
              <span className="row-label">Solar Noon</span>
              <span className="row-value">{formatTime(data.solar.solar_noon)}</span>
            </div>
            <div className="flex items-center justify-between py-1.5">
              <span className="row-label">Daylight</span>
              <span className="row-value">{formatDaylight(data.solar.daylight_hours)}</span>
            </div>

            <div className="my-2 sky-divider" />

            <div className="flex items-center justify-between py-1.5">
              <span className="row-label">Civil Twilight</span>
              <span className="row-value">
                {formatTime(data.solar.civil_twilight_morning_end)} &mdash; {formatTime(data.solar.civil_twilight_evening_start)}
              </span>
            </div>
            <div className="flex items-center justify-between py-1.5">
              <span className="row-label">Nautical Twilight</span>
              <span className="row-value">
                {formatTime(data.solar.nautical_twilight_morning_end)} &mdash; {formatTime(data.solar.nautical_twilight_evening_start)}
              </span>
            </div>
            <div className="flex items-center justify-between py-1.5">
              <span className="row-label">Astronomical Twilight</span>
              <span className="row-value">
                {formatTime(data.solar.astronomical_twilight_morning_end)} &mdash; {formatTime(data.solar.astronomical_twilight_evening_start)}
              </span>
            </div>

            {data.solar.current_position && (
              <>
                <div className="my-2 sky-divider" />
                <div className="flex items-center justify-between py-1.5">
                  <span className="row-label">Altitude</span>
                  <span className="row-value">
                    {data.solar.current_position.altitude_deg.toFixed(1)}&deg;
                  </span>
                </div>
                <div className="flex items-center justify-between py-1.5">
                  <span className="row-label">Status</span>
                  <span className="flex items-center gap-1.5 row-value">
                    {sunUp ? (
                      <Eye className="w-3 h-3" style={{ color: "#34d399" }} />
                    ) : (
                      <EyeOff className="w-3 h-3" style={{ color: "var(--sky-muted)" }} />
                    )}
                    <span style={{ color: sunUp ? "#34d399" : "var(--sky-muted)" }}>
                      {sunUp ? "Above horizon" : "Below horizon"}
                    </span>
                  </span>
                </div>
              </>
            )}

            <DayArc solar={data.solar} />
          </div>
        </div>

        {/* Lunar */}
        <div className="sky-card">
          <div className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <MoonIcon className="w-3.5 h-3.5" style={{ color: moonUp ? "#c4b5fd" : "var(--sky-muted)" }} />
              <span className="section-label">Lunar</span>
              <span className={moonUp ? "status-dot-on" : "status-dot-off"} />
            </div>

            {/* Moon phase row */}
            <div className="flex items-center gap-3 mb-2">
              <MoonPhase
                fraction={data.lunar.phase_fraction}
                illumination={data.lunar.illumination_percent}
              />
              <div>
                <p className="text-xs font-medium row-value">
                  {data.lunar.phase_name}
                </p>
                <p className="text-[10px] mt-0.5" style={{ color: "var(--sky-muted)" }}>
                  {data.lunar.illumination_percent.toFixed(0)}% illuminated
                </p>
              </div>
            </div>

            <div className="my-2 sky-divider" />

            <div className="flex items-center justify-between py-1.5">
              <span className="row-label">Moonrise</span>
              <span className="row-value">{formatTime(data.lunar.moonrise)}</span>
            </div>
            <div className="flex items-center justify-between py-1.5">
              <span className="row-label">Moonset</span>
              <span className="row-value">{formatTime(data.lunar.moonset)}</span>
            </div>

            {data.lunar.current_position && (
              <>
                <div className="my-2 sky-divider" />
                <div className="flex items-center justify-between py-1.5">
                  <span className="row-label">Altitude</span>
                  <span className="row-value">
                    {data.lunar.current_position.altitude_deg.toFixed(1)}&deg;
                  </span>
                </div>
                <div className="flex items-center justify-between py-1.5">
                  <span className="row-label">Status</span>
                  <span className="flex items-center gap-1.5 row-value">
                    {moonUp ? (
                      <Eye className="w-3 h-3" style={{ color: "#34d399" }} />
                    ) : (
                      <EyeOff className="w-3 h-3" style={{ color: "var(--sky-muted)" }} />
                    )}
                    <span style={{ color: moonUp ? "#34d399" : "var(--sky-muted)" }}>
                      {moonUp ? "Above horizon" : "Below horizon"}
                    </span>
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── Planets ─────────────────────────────────────────────── */}
      <div className="sky-card">
        <div className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Telescope className="w-3.5 h-3.5" style={{ color: "var(--sky-muted)" }} />
            <span className="section-label">Planets</span>
          </div>

          <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
            {data.planets.map((planet) => (
              <div
                key={planet.name}
                className="rounded-lg p-2.5 text-center border transition-colors"
                style={{
                  background: planet.is_above_horizon
                    ? "var(--sky-visible-bg)"
                    : "var(--sky-planet-bg)",
                  borderColor: planet.is_above_horizon
                    ? "var(--sky-visible-border)"
                    : "var(--sky-planet-border)",
                  opacity: planet.is_above_horizon ? 1 : 0.4,
                }}
              >
                <span className="text-sm leading-none">
                  {PLANET_SYMBOLS[planet.name] || "\u25CF"}
                </span>
                <p className="text-[10px] font-medium mt-1.5" style={{ color: "var(--sky-muted)" }}>
                  {planet.name}
                </p>
                <p className="text-[10px] mt-0.5" style={{ color: "var(--sky-footer-text)" }}>
                  {planet.altitude_deg.toFixed(0)}&deg;
                </p>
                <div className="mt-1">
                  <span className={planet.is_above_horizon ? "status-dot-on" : "status-dot-off"} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Milky Way Events ────────────────────────────────────── */}
      {data.sky_events?.milky_way && (
        <div className="sky-card">
          <div className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-3.5 h-3.5" style={{ color: "#a855f7" }} />
              <span className="section-label">Milky Way</span>
              <span className={data.sky_events.milky_way.is_visible ? "status-dot-on" : "status-dot-off"} />
            </div>

            <div className="flex items-center justify-between py-1.5">
              <span className="row-label">Galactic Center Alt.</span>
              <span className="row-value">
                {data.sky_events.milky_way.galactic_center_altitude.toFixed(1)}&deg;
              </span>
            </div>
            <div className="flex items-center justify-between py-1.5">
              <span className="row-label">Azimuth</span>
              <span className="row-value">
                {data.sky_events.milky_way.galactic_center_azimuth.toFixed(1)}&deg;
              </span>
            </div>
            <div className="flex items-center justify-between py-1.5">
              <span className="row-label">Best Viewing (UTC)</span>
              <span className="row-value">
                {String(data.sky_events.milky_way.best_viewing_hour_utc).padStart(2, "0")}:00
              </span>
            </div>
            <div className="flex items-center justify-between py-1.5">
              <span className="row-label">Seasonal Visibility</span>
              <span
                className="row-value text-[11px] capitalize"
                style={{
                  color:
                    data.sky_events.milky_way.seasonal_visibility === "excellent"
                      ? "#34d399"
                      : data.sky_events.milky_way.seasonal_visibility === "good"
                      ? "#fbbf24"
                      : "#f87171",
                }}
              >
                {data.sky_events.milky_way.seasonal_visibility}
              </span>
            </div>

            <div className="my-2 sky-divider" />

            <p className="text-[11px] leading-relaxed" style={{ color: "var(--sky-muted)" }}>
              {data.sky_events.milky_way.seasonal_description}
            </p>
            <p className="text-[10px] mt-1.5" style={{ color: "var(--sky-footer-text)" }}>
              Optimal months: {data.sky_events.milky_way.optimal_months.join(", ")}
            </p>
          </div>
        </div>
      )}

      {/* ── Sky Events (Meteor Showers) ─────────────────────────── */}
      {data.sky_events && (
        <div className="sky-card">
          <div className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-3.5 h-3.5" style={{ color: "#8b5cf6" }} />
              <span className="section-label">Sky Events</span>
              {data.sky_events.active_shower_count > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: "var(--sky-shower-bg)", color: "#8b5cf6" }}>
                  {data.sky_events.active_shower_count} active
                </span>
              )}
            </div>

            {data.sky_events.meteor_showers.length === 0 ? (
              <p className="text-[11px] py-3 text-center" style={{ color: "var(--sky-muted)" }}>
                No major meteor showers active on this date.
              </p>
            ) : (
              <div className="space-y-2">
                {data.sky_events.meteor_showers.map((shower) => (
                  <div
                    key={shower.name}
                    className="rounded-lg p-3 border"
                    style={{
                      background: "var(--sky-shower-bg)",
                      borderColor: "var(--sky-shower-border)",
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium row-value">
                          {shower.name}
                          {shower.near_peak && (
                            <span
                              className="ml-2 text-[9px] px-1.5 py-0.5 rounded-full font-semibold"
                              style={{ background: "#8b5cf6", color: "#fff" }}
                            >
                              PEAK
                            </span>
                          )}
                        </p>
                        <p className="text-[10px] mt-0.5" style={{ color: "var(--sky-muted)" }}>
                          Peak: {shower.peak_date} &middot; ZHR ~{shower.zhr}/hr
                        </p>
                      </div>
                      <span className="text-[10px]" style={{ color: "var(--sky-footer-text)" }}>
                        {shower.days_from_peak === 0
                          ? "Peak night"
                          : `${shower.days_from_peak}d from peak`}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Astronomical Facts ──────────────────────────────────── */}
      {data.sky_events?.facts && data.sky_events.facts.length > 0 && (
        <div className="sky-card">
          <div className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Info className="w-3.5 h-3.5" style={{ color: "var(--sky-accent)" }} />
              <span className="section-label">Astronomical Facts</span>
            </div>

            <div className="space-y-2">
              {data.sky_events.facts.map((entry, idx) => (
                <div
                  key={idx}
                  className="rounded-lg p-3 border"
                  style={{
                    background: "var(--sky-fact-bg)",
                    borderColor: "var(--sky-fact-border)",
                  }}
                >
                  <p className="text-[11px] leading-relaxed row-value">
                    {entry.fact}
                  </p>
                  <p className="text-[9px] mt-1.5 uppercase tracking-wider" style={{ color: "var(--sky-footer-text)" }}>
                    {entry.source === "date-specific" ? "\u2728 Date-specific" : entry.source === "proximity" ? "\u25CE Nearby date" : "\u2605 General"}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Footer ──────────────────────────────────────────────── */}
      <div className="text-center pt-2 pb-6">
        <p className="text-[10px]" style={{ color: "var(--sky-footer-text)" }}>
          Skyfield &middot; DE440S &middot; Pathfinder
        </p>
      </div>
    </div>
  );
}
