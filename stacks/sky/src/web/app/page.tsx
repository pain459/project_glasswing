"use client";

import React, { useEffect, useState, useCallback } from "react";
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
  Globe,
  BookOpen,
  Satellite,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────

interface SolarData {
  sunrise: string | null;
  sunset: string | null;
  solar_noon: string | null;
  solar_culmination?: string | null;
  daylight_hours: number | null;
  civil_twilight_morning_end: string | null;
  civil_twilight_evening_start: string | null;
  nautical_twilight_morning_end: string | null;
  nautical_twilight_evening_start: string | null;
  astronomical_twilight_morning_end: string | null;
  astronomical_twilight_evening_start: string | null;
  polar_day: boolean;
  polar_night: boolean;
  golden_hour?: {
    morning: { start: string; end: string };
    evening: { start: string; end: string };
  };
  blue_hour?: {
    morning: { start: string; end: string };
    evening: { start: string; end: string };
  };
  current_position?: {
    altitude_deg: number;
    azimuth_deg: number;
    distance_au: number;
    angular_diameter_arcsec?: number;
    is_above_horizon: boolean;
  };
}

interface PlanetData {
  name: string;
  ra_hours?: number;
  dec_deg?: number;
  altitude_deg: number;
  azimuth_deg?: number;
  is_above_horizon: boolean;
  distance_au?: number;
  angular_diameter_arcsec?: number;
  constellation?: string;
  magnitude?: number | null;
  is_retrograde?: boolean;
  airmass?: number | null;
  rise?: string | null;
  set?: string | null;
  culmination?: string | null;
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
  solar_declination?: {
    solar_declination_deg: number;
    right_ascension_hours: number;
    equation_of_time_minutes: number;
    season: string;
    day_of_year: number;
  };
  sun_constellation?: string;
  moon_constellation?: string;
  moon_distance?: {
    distance_km: number;
    distance_label: string;
    angular_diameter_arcmin: number;
  };
  next_season_event?: {
    event: string;
    datetime_utc: string | null;
    days_away: number | null;
  };
  dark_twilight_classification?: Array<{
    hour_utc: number;
    classification: string;
    code: number;
  }>;
}

interface LunarData {
  moonrise: string | null;
  moonset: string | null;
  lunar_culmination?: string | null;
  phase_name: string;
  phase_fraction: number;
  illuminated_fraction: number;
  illumination_percent: number;
  phase_angle_deg?: number;
  elongation_deg?: number;
  current_position?: {
    altitude_deg: number;
    azimuth_deg?: number;
    distance_km?: number;
    is_above_horizon: boolean;
  };
  upcoming_phases?: Array<{
    phase: string;
    datetime_utc: string;
  }>;
  upcoming_nodes?: Array<{
    type: string;
    datetime_utc: string;
  }>;
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

interface AltitudePoint {
  hour: number;
  altitude: number;
  azimuth: number;
  distance_km?: number;
}

interface UpcomingEvent {
  date: string;
  type: string;
  title: string;
  description: string;
  icon: string;
}

interface UpcomingEventsData {
  events: UpcomingEvent[];
}

interface ConjunctionData {
  date: string;
  planet_a: string;
  planet_b: string;
  separation_deg: number;
  end: string;
}

interface EclipseData {
  date: string;
  type: string;
  title: string;
  description: string;
  icon: string;
}

interface ISSPass {
  start_time: string;
  max_elevation_time: string;
  end_time: string;
  max_elevation_deg: number;
  duration_minutes: number;
  approach_azimuth: number;
  direction: string;
}

interface ISSData {
  status: string;
  current_position?: {
    altitude_deg: number;
    azimuth_deg: number;
    distance_km: number;
    is_above_horizon: boolean;
    direction: string;
  };
  passes: ISSPass[];
  total_passes: number;
}

// ─── Planet Tonight Types ────────────────────────────────────────────

interface PlanetTonightEntry {
  name: string;
  symbol: string;
  rise: string | null;
  set: string | null;
  altitude_deg: number;
  is_above_horizon: boolean;
  viewing_window: string;
  quality: string;
  comment: string;
  needs_optics: boolean;
}

interface PlanetTonightData {
  date: string;
  location: string;
  planets: PlanetTonightEntry[];
  constellation_transitions?: Record<string, Array<{
    constellation: string;
    start: string;
    end: string;
  }>>;
}

// ─── Season Calendar Types ───────────────────────────────────────────

interface SeasonEvent {
  name: string;
  date: string;
  datetime_utc?: string;
  type: string;
  hemisphere: string;
  emoji: string;
  description: string;
  days_away?: number;
}

interface SeasonCalendarData {
  events: SeasonEvent[];
  year: number | null;
}

// ─── Sky Story Types ─────────────────────────────────────────────────

interface SkyStoryData {
  title: string;
  story: string;
  moon_story: string;
  planet_highlights: string[];
  seasonal_tip: string;
  fun_fact: string;
  activity: string;
}

// ─── Extended Types ──────────────────────────────────────────────────

interface StarData {
  name: string;
  magnitude: number;
  spectral_type: string;
  distance_ly: number;
  constellation: string;
  altitude_deg: number;
  azimuth_deg: number;
  airmass?: number | null;
}

interface MessierData {
  designation: string;
  type: string;
  magnitude: number;
  size_arcmin: number;
  constellation: string;
  altitude_deg: number;
  azimuth_deg: number;
  airmass?: number | null;
}

interface OppositionData {
  date: string;
  planet: string;
  elongation_deg: number;
  end: string;
}

interface ZodiacEntry {
  constellation: string;
  zodiac: string;
}

interface ZodiacPlanetEntry {
  planet: string;
  constellation: string;
  zodiac: string;
}

interface ZodiacData {
  sun: ZodiacEntry;
  moon: ZodiacEntry;
  planets: ZodiacPlanetEntry[];
}

interface MoonStandstillData {
  type: string;
  declination_range: string;
  description: string;
  years_to_major: number | null;
}

interface SolarDataExtended extends SolarData {
  daylight_trend?: string;
}

interface LunarDataExtended extends LunarData {
  current_position?: {
    altitude_deg: number;
    azimuth_deg?: number;
    distance_km?: number;
    is_above_horizon: boolean;
    airmass?: number | null;
  };
}

// ─── Tab definitions ────────────────────────────────────────────────

type TabKey = "daily" | "planets" | "calendar" | "stories" | "iss" | "events";

const TABS: Array<{ key: TabKey; label: string; icon: React.ReactNode }> = [
  { key: "daily", label: "Daily Sky", icon: <Sun className="w-3.5 h-3.5" /> },
  { key: "planets", label: "Planets", icon: <Globe className="w-3.5 h-3.5" /> },
  { key: "calendar", label: "Calendar", icon: <Calendar className="w-3.5 h-3.5" /> },
  { key: "stories", label: "Stories", icon: <BookOpen className="w-3.5 h-3.5" /> },
  { key: "iss", label: "ISS", icon: <Satellite className="w-3.5 h-3.5" /> },
  { key: "events", label: "Events", icon: <Sparkles className="w-3.5 h-3.5" /> },
];

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
  const parts = dateStr.split("-").map(Number);
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  return d.toLocaleDateString("en-IN", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function toLocalISOString(d: Date): string {
  const y = String(d.getFullYear());
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function shiftDate(dateStr: string, days: number): string {
  const parts = dateStr.split("-").map(Number);
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  d.setDate(d.getDate() + days);
  return toLocalISOString(d);
}

function getToday(): string {
  return toLocalISOString(new Date());
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

// ─── Brightness Spectrum helpers ─────────────────────────────────────

function minFromIso(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes();
}

function minToPct(min: number): number {
  return (min / 1440) * 100;
}

function getSkyPhase(min: number, solar: SolarData): { phase: string; brightness: string } {
  const sr = minFromIso(solar.sunrise);
  const ss = minFromIso(solar.sunset);
  const civilM = minFromIso(solar.civil_twilight_morning_end);
  const civilE = minFromIso(solar.civil_twilight_evening_start);
  const nautM = minFromIso(solar.nautical_twilight_morning_end);
  const nautE = minFromIso(solar.nautical_twilight_evening_start);
  const astroM = minFromIso(solar.astronomical_twilight_morning_end);
  const astroE = minFromIso(solar.astronomical_twilight_evening_start);
  if (sr != null && ss != null && min >= sr && min <= ss) return { phase: "Daylight", brightness: "☀" };
  if (civilM != null && sr != null && min >= civilM && min < sr) return { phase: "Civil twilight", brightness: "🌅" };
  if (civilE != null && ss != null && min > ss && min <= civilE) return { phase: "Civil twilight", brightness: "🌅" };
  if (nautM != null && civilM != null && min >= nautM && min < civilM) return { phase: "Nautical twilight", brightness: "🌆" };
  if (nautE != null && civilE != null && min > civilE && min <= nautE) return { phase: "Nautical twilight", brightness: "🌆" };
  if (astroM != null && nautM != null && min >= astroM && min < nautM) return { phase: "Astronomical twilight", brightness: "🌌" };
  if (astroE != null && nautE != null && min > nautE && min <= astroE) return { phase: "Astronomical twilight", brightness: "🌌" };
  return { phase: "Night", brightness: "🌙" };
}

// ─── Solar Spectrum Bar ──────────────────────────────────────────────

function SolarSpectrum({ solar }: { solar: SolarData }) {
  const [hover, setHover] = useState<{ pct: number; min: number } | null>(null);

  const sr = minFromIso(solar.sunrise);
  const ss = minFromIso(solar.sunset);
  const noon = minFromIso(solar.solar_noon);
  const civilM = minFromIso(solar.civil_twilight_morning_end);
  const civilE = minFromIso(solar.civil_twilight_evening_start);
  const nautM = minFromIso(solar.nautical_twilight_morning_end);
  const nautE = minFromIso(solar.nautical_twilight_evening_start);
  const astroM = minFromIso(solar.astronomical_twilight_morning_end);
  const astroE = minFromIso(solar.astronomical_twilight_evening_start);
  const nowMin = new Date().getHours() * 60 + new Date().getMinutes();

  const stops: string[] = [];
  if (sr != null && ss != null) {
    stops.push("rgba(15,23,42,1) 0%");
    if (astroM != null) stops.push(`rgba(30,41,59,1) ${minToPct(astroM)}%`);
    if (nautM != null) stops.push(`rgba(51,65,85,1) ${minToPct(nautM)}%`);
    if (civilM != null) stops.push(`rgba(120,80,40,1) ${minToPct(civilM)}%`);
    stops.push(`rgba(245,158,11,1) ${minToPct(sr)}%`);
    if (noon != null) stops.push(`rgba(253,224,71,1) ${minToPct(noon)}%`);
    stops.push(`rgba(245,158,11,1) ${minToPct(ss)}%`);
    if (civilE != null) stops.push(`rgba(120,80,40,1) ${minToPct(civilE)}%`);
    if (nautE != null) stops.push(`rgba(51,65,85,1) ${minToPct(nautE)}%`);
    if (astroE != null) stops.push(`rgba(30,41,59,1) ${minToPct(astroE)}%`);
    stops.push("rgba(15,23,42,1) 100%");
  }
  const gradient = stops.length > 1 ? `linear-gradient(to right, ${stops.join(", ")})` : undefined;

  const markers: Array<{ pct: number; label: string; sublabel: string }> = [];
  if (sr != null) markers.push({ pct: minToPct(sr), label: formatTime(solar.sunrise), sublabel: "Sunrise" });
  if (noon != null) markers.push({ pct: minToPct(noon), label: formatTime(solar.solar_noon), sublabel: "Solar noon" });
  if (ss != null) markers.push({ pct: minToPct(ss), label: formatTime(solar.sunset), sublabel: "Sunset" });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = (x / rect.width) * 100;
    const min = Math.round((pct / 100) * 1440);
    setHover({ pct, min });
  };

  const timeStr = hover ? `${String(Math.floor(hover.min / 60)).padStart(2, "0")}:${String(hover.min % 60).padStart(2, "0")}` : "";
  const skyInfo = hover ? getSkyPhase(hover.min, solar) : null;

  return (
    <div>
      <div className="relative">
        <div
          className="h-4 rounded-full cursor-crosshair"
          style={{ background: gradient || "var(--sky-arc-track)" }}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHover(null)}
        />
        <div className="absolute top-0" style={{ left: `${minToPct(nowMin)}%` }}>
          <div className="w-0.5 h-5 rounded-full mx-auto -translate-y-0.5" style={{ background: "var(--sky-arc-marker)" }} />
        </div>
        {hover && skyInfo && (
          <div
            className="absolute bottom-full mb-1 px-2.5 py-1.5 rounded-lg text-[10px] whitespace-nowrap pointer-events-none z-10"
            style={{
              left: `${hover.pct}%`,
              transform: "translateX(-50%)",
              background: "var(--sky-card)",
              border: "1px solid var(--sky-border)",
              color: "var(--sky-text)",
              boxShadow: "0 4px 12px rgba(0,0,0,0.18)",
            }}
          >
            <div className="font-semibold text-[11px]">{skyInfo.brightness} {timeStr}</div>
            <div style={{ color: "var(--sky-muted)" }}>{skyInfo.phase}</div>
          </div>
        )}
      </div>
      <div className="relative mt-2" style={{ height: "32px" }}>
        {markers.map((m, i) => (
          <div key={i} className="absolute -translate-x-1/2 text-center" style={{ left: `${m.pct}%` }}>
            <div className="w-1.5 h-1.5 rounded-full mx-auto" style={{ background: "var(--sky-accent)" }} />
            <span className="text-[9px] font-medium mt-0.5 block" style={{ color: "var(--sky-text)" }}>{m.label}</span>
            <span className="text-[8px] block" style={{ color: "var(--sky-muted)" }}>{m.sublabel}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Moon Spectrum Bar ───────────────────────────────────────────────

function MoonSpectrum({ lunar, arcPoints }: { lunar: LunarData; arcPoints: AltitudePoint[] }) {
  const [hover, setHover] = useState<{ pct: number; min: number; point?: AltitudePoint } | null>(null);

  const mr = minFromIso(lunar.moonrise);
  const ms = minFromIso(lunar.moonset);
  const nowMin = new Date().getHours() * 60 + new Date().getMinutes();

  const stops: string[] = [];
  if (arcPoints.length > 0) {
    for (const p of arcPoints) {
      const pct = minToPct(p.hour * 60);
      const intensity = Math.max(0.08, Math.min(1, (p.altitude + 30) / 90));
      const r = Math.round(196 * intensity + 30 * (1 - intensity));
      const g = Math.round(181 * intensity + 41 * (1 - intensity));
      const b = Math.round(253 * intensity + 59 * (1 - intensity));
      stops.push(`rgba(${r},${g},${b},1) ${pct}%`);
    }
  } else {
    stops.push("rgba(30,41,59,0.4) 0%");
    stops.push("rgba(30,41,59,0.4) 100%");
  }
  const gradient = `linear-gradient(to right, ${stops.join(", ")})`;

  const markers: Array<{ pct: number; label: string; sublabel: string }> = [];
  if (mr != null) markers.push({ pct: minToPct(mr), label: formatTime(lunar.moonrise), sublabel: "Moonrise" });
  if (ms != null) markers.push({ pct: minToPct(ms), label: formatTime(lunar.moonset), sublabel: "Moonset" });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = (x / rect.width) * 100;
    const min = Math.round((pct / 100) * 1440);
    let nearest: AltitudePoint | undefined;
    let minDist = Infinity;
    for (const p of arcPoints) {
      const d = Math.abs(p.hour * 60 - min);
      if (d < minDist) { minDist = d; nearest = p; }
    }
    setHover({ pct, min, point: nearest });
  };

  const timeStr = hover ? `${String(Math.floor(hover.min / 60)).padStart(2, "0")}:${String(hover.min % 60).padStart(2, "0")}` : "";

  return (
    <div>
      <div className="relative">
        <div
          className="h-4 rounded-full cursor-crosshair"
          style={{ background: gradient }}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHover(null)}
        />
        <div className="absolute top-0" style={{ left: `${minToPct(nowMin)}%` }}>
          <div className="w-0.5 h-5 rounded-full mx-auto -translate-y-0.5" style={{ background: "var(--sky-arc-marker)" }} />
        </div>
        {hover && hover.point && (
          <div
            className="absolute bottom-full mb-1 px-2.5 py-1.5 rounded-lg text-[10px] whitespace-nowrap pointer-events-none z-10"
            style={{
              left: `${hover.pct}%`,
              transform: "translateX(-50%)",
              background: "var(--sky-card)",
              border: "1px solid var(--sky-border)",
              color: "var(--sky-text)",
              boxShadow: "0 4px 12px rgba(0,0,0,0.18)",
            }}
          >
            <div className="font-semibold text-[11px]">🌙 {timeStr}</div>
            <div style={{ color: "var(--sky-muted)" }}>
              Alt {hover.point.altitude.toFixed(1)}° · Az {hover.point.azimuth.toFixed(0)}°
              {hover.point.distance_km != null && ` · ${(hover.point.distance_km / 1000).toFixed(1)}k km`}
            </div>
            <div style={{ color: "var(--sky-muted)" }}>
              {hover.point.altitude > 0 ? "Above horizon" : "Below horizon"}
            </div>
          </div>
        )}
      </div>
      <div className="relative mt-2" style={{ height: "32px" }}>
        {markers.map((m, i) => (
          <div key={i} className="absolute -translate-x-1/2 text-center" style={{ left: `${m.pct}%` }}>
            <div className="w-1.5 h-1.5 rounded-full mx-auto" style={{ background: "#c4b5fd" }} />
            <span className="text-[9px] font-medium mt-0.5 block" style={{ color: "var(--sky-text)" }}>{m.label}</span>
            <span className="text-[8px] block" style={{ color: "var(--sky-muted)" }}>{m.sublabel}</span>
          </div>
        ))}
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

// ─── Quality badge helper ────────────────────────────────────────────

function QualityBadge({ quality }: { quality: string }) {
  const styles: Record<string, { bg: string; color: string; label: string }> = {
    excellent: { bg: "rgba(16,185,129,0.15)", color: "#34d399", label: "Excellent" },
    good: { bg: "rgba(59,130,246,0.15)", color: "#60a5fa", label: "Good" },
    moderate: { bg: "rgba(251,191,36,0.15)", color: "#fbbf24", label: "Moderate" },
    poor: { bg: "rgba(248,113,113,0.15)", color: "#f87171", label: "Poor" },
    not_visible: { bg: "rgba(148,163,184,0.1)", color: "#94a3b8", label: "Not visible" },
  };
  const s = styles[quality] || styles.poor;
  return (
    <span
      className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold"
      style={{ background: s.bg, color: s.color }}
    >
      {s.label}
    </span>
  );
}

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
  const [activeTab, setActiveTab] = useState<TabKey>("daily");
  const [data, setData] = useState<DailySkyData | null>(null);
  const [arcData, setArcData] = useState<{ solar: AltitudePoint[]; lunar: AltitudePoint[] } | null>(null);
  const [eventsData, setEventsData] = useState<UpcomingEventsData | null>(null);
  const [issData, setIssData] = useState<ISSData | null>(null);
  const [planetTonightData, setPlanetTonightData] = useState<PlanetTonightData | null>(null);
  const [seasonCalendarData, setSeasonCalendarData] = useState<SeasonCalendarData | null>(null);
  const [skyStoryData, setSkyStoryData] = useState<SkyStoryData | null>(null);
  const [conjunctionData, setConjunctionData] = useState<ConjunctionData[] | null>(null);
  const [eclipseData, setEclipseData] = useState<EclipseData[] | null>(null);
  const [starData, setStarData] = useState<StarData[] | null>(null);
  const [messierData, setMessierData] = useState<MessierData[] | null>(null);
  const [oppositionData, setOppositionData] = useState<OppositionData[] | null>(null);
  const [zodiacData, setZodiacData] = useState<ZodiacData | null>(null);
  const [moonStandstillData, setMoonStandstillData] = useState<MoonStandstillData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState(getToday());

  const fetchData = useCallback(async (dateStr: string) => {
    setLoading(true);
    setError(null);
    try {
      const [dailyRes, arcRes] = await Promise.all([
        fetch(`/api/v1/sky/daily?date=${dateStr}`),
        fetch(`/api/v1/sky/arc?date=${dateStr}`),
      ]);
      if (!dailyRes.ok) throw new Error(`API ${dailyRes.status}`);
      const dailyJson = await dailyRes.json();
      setData(dailyJson.data);
      if (arcRes.ok) {
        const arcJson = await arcRes.json();
        setArcData(arcJson.data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(currentDate);
  }, [currentDate, fetchData]);

  // Fetch independent data on mount
  useEffect(() => {
    let cancelled = false;

    // Upcoming events
    fetch("/api/v1/sky/events/upcoming?days=28")
      .then(r => r.json())
      .then(json => { if (!cancelled) setEventsData(json.data); })
      .catch(() => {});

    // ISS data
    fetch("/api/v1/sky/iss")
      .then(r => r.json())
      .then(json => { if (!cancelled) setIssData(json.data); })
      .catch(() => {});

    // Planet tonight
    fetch(`/api/v1/sky/planets/tonight?date=${currentDate}`)
      .then(r => r.json())
      .then(json => { if (!cancelled) setPlanetTonightData(json.data); })
      .catch(() => {});

    // Season calendar
    fetch("/api/v1/sky/calendar/seasons")
      .then(r => r.json())
      .then(json => { if (!cancelled) setSeasonCalendarData(json.data); })
      .catch(() => {});

    // Sky story
    fetch(`/api/v1/sky/story?date=${currentDate}`)
      .then(r => r.json())
      .then(json => { if (!cancelled) setSkyStoryData(json.data); })
      .catch(() => {});

    // Planetary conjunctions
    fetch("/api/v1/sky/conjunctions?days=30")
      .then(r => r.json())
      .then(json => { if (!cancelled) setConjunctionData(json.data); })
      .catch(() => {});

    // Upcoming eclipses
    fetch("/api/v1/sky/eclipses?days=180")
      .then(r => r.json())
      .then(json => { if (!cancelled) setEclipseData(json.data); })
      .catch(() => {});

    // Bright stars
    fetch(`/api/v1/sky/stars?date=${currentDate}`)
      .then(r => r.json())
      .then(json => { if (!cancelled) setStarData(json.data); })
      .catch(() => {});

    // Messier objects
    fetch(`/api/v1/sky/messier?date=${currentDate}`)
      .then(r => r.json())
      .then(json => { if (!cancelled) setMessierData(json.data); })
      .catch(() => {});

    // Planetary oppositions
    fetch("/api/v1/sky/oppositions?days=180")
      .then(r => r.json())
      .then(json => { if (!cancelled) setOppositionData(json.data); })
      .catch(() => {});

    // Zodiac info
    fetch(`/api/v1/sky/zodiac?date=${currentDate}`)
      .then(r => r.json())
      .then(json => { if (!cancelled) setZodiacData(json.data); })
      .catch(() => {});

    // Moon standstill
    fetch(`/api/v1/sky/moon/standstill?date=${currentDate}`)
      .then(r => r.json())
      .then(json => { if (!cancelled) setMoonStandstillData(json.data); })
      .catch(() => {});

    return () => { cancelled = true; };
  }, [currentDate]);

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
      {/* ── Date & Location Header ──────────────────────────────── */}
      <div className="text-center py-2">
        <div className="flex items-center justify-center gap-3 mb-1">
          <button onClick={goPrevDay} className="date-btn" aria-label="Previous day" title="Previous day">
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <div className="min-w-[120px]">
            <div className="flex items-center justify-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "var(--sky-accent)" }} />
              <h1 className="text-base font-semibold">
                {isToday ? "Today" : formatDateShort(currentDate)}
              </h1>
            </div>
            <input
              type="date"
              value={currentDate}
              onChange={(e) => { if (e.target.value) setCurrentDate(e.target.value); }}
              className="text-[10px] mt-1 px-1.5 py-0.5 rounded border text-center cursor-pointer"
              style={{
                background: "var(--sky-date-btn-bg)",
                color: "var(--sky-text)",
                borderColor: "var(--sky-date-btn-border)",
                width: "100%",
                boxSizing: "border-box",
              }}
            />
            {!isToday && (
              <button onClick={goToday} className="text-[10px] mt-0.5 underline underline-offset-2" style={{ color: "var(--sky-accent)" }}>
                Back to today
              </button>
            )}
          </div>
          <button onClick={goNextDay} className="date-btn" aria-label="Next day" title="Next day">
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

      {/* ── Tab Bar ─────────────────────────────────────────────── */}
      <div className="flex gap-1 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium whitespace-nowrap transition-all border"
            style={{
              background: activeTab === tab.key ? "var(--sky-accent)" : "var(--sky-card)",
              color: activeTab === tab.key ? "#fff" : "var(--sky-muted)",
              borderColor: activeTab === tab.key ? "var(--sky-accent)" : "var(--sky-border)",
            }}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Tab Content ─────────────────────────────────────────── */}
      <div>
        {/* ──── Daily Sky Tab ──── */}
        {activeTab === "daily" && (
          <div className="space-y-4">
            {/* Solar & Lunar Grid */}
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
                  {data.solar.solar_culmination && (
                    <div className="flex items-center justify-between py-1.5">
                      <span className="row-label">Culmination</span>
                      <span className="row-value">{formatTime(data.solar.solar_culmination)}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between py-1.5">
                    <span className="row-label">Daylight</span>
                    <span className="row-value">{formatDaylight(data.solar.daylight_hours)}</span>
                  </div>
                  {(data.solar as any).daylight_trend && (
                    <div className="flex items-center justify-between py-1.5">
                      <span className="row-label">Trend</span>
                      <span className="row-value text-[10px]" style={{ color: "var(--sky-muted)" }}>
                        {(data.solar as any).daylight_trend}
                      </span>
                    </div>
                  )}

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

                  {data.solar.golden_hour && (
                    <>
                      <div className="my-2 sky-divider" />
                      <div className="flex items-center justify-between py-1.5">
                        <span className="row-label">Golden Hour</span>
                        <span className="row-value">
                          {formatTime(data.solar.golden_hour.morning.start)} &mdash; {formatTime(data.solar.golden_hour.morning.end)}
                          <span className="text-[9px] ml-1" style={{ color: "var(--sky-footer-text)" }}>AM</span>
                          &nbsp;·&nbsp;
                          {formatTime(data.solar.golden_hour.evening.start)} &mdash; {formatTime(data.solar.golden_hour.evening.end)}
                          <span className="text-[9px] ml-1" style={{ color: "var(--sky-footer-text)" }}>PM</span>
                        </span>
                      </div>
                    </>
                  )}

                  {data.solar.blue_hour && (
                    <div className="flex items-center justify-between py-1.5">
                      <span className="row-label">Blue Hour</span>
                      <span className="row-value">
                        {formatTime(data.solar.blue_hour.morning.start)} &mdash; {formatTime(data.solar.blue_hour.morning.end)}
                        <span className="text-[9px] ml-1" style={{ color: "var(--sky-footer-text)" }}>AM</span>
                        &nbsp;·&nbsp;
                        {formatTime(data.solar.blue_hour.evening.start)} &mdash; {formatTime(data.solar.blue_hour.evening.end)}
                        <span className="text-[9px] ml-1" style={{ color: "var(--sky-footer-text)" }}>PM</span>
                      </span>
                    </div>
                  )}

                  {data.solar.current_position && (
                    <>
                      <div className="my-2 sky-divider" />
                      <div className="flex items-center justify-between py-1.5">
                        <span className="row-label">Altitude</span>
                        <span className="row-value">{data.solar.current_position.altitude_deg.toFixed(1)}&deg;</span>
                      </div>
                      <div className="flex items-center justify-between py-1.5">
                        <span className="row-label">Azimuth</span>
                        <span className="row-value">{data.solar.current_position.azimuth_deg.toFixed(1)}&deg;</span>
                      </div>
                      <div className="flex items-center justify-between py-1.5">
                        <span className="row-label">Distance</span>
                        <span className="row-value">
                          {(data.solar.current_position.distance_au * 149_597_870.7 / 1_000_000).toFixed(2)}M km
                        </span>
                      </div>
                      {data.solar.current_position.angular_diameter_arcsec != null && (
                        <div className="flex items-center justify-between py-1.5">
                          <span className="row-label">Angular Size</span>
                          <span className="row-value">{data.solar.current_position.angular_diameter_arcsec.toFixed(1)}″</span>
                        </div>
                      )}
                      <div className="flex items-center justify-between py-1.5">
                        <span className="row-label">Status</span>
                        <span className="flex items-center gap-1.5 row-value">
                          {sunUp ? <Eye className="w-3 h-3" style={{ color: "#34d399" }} /> : <EyeOff className="w-3 h-3" style={{ color: "var(--sky-muted)" }} />}
                          <span style={{ color: sunUp ? "#34d399" : "var(--sky-muted)" }}>
                            {sunUp ? "Above horizon" : "Below horizon"}
                          </span>
                        </span>
                      </div>
                    </>
                  )}

                  {data.sky_events?.solar_declination && (
                    <>
                      <div className="my-2 sky-divider" />
                      <div className="flex items-center justify-between py-1.5">
                        <span className="row-label">Declination</span>
                        <span className="row-value">{data.sky_events.solar_declination.solar_declination_deg.toFixed(1)}&deg;</span>
                      </div>
                      <div className="flex items-center justify-between py-1.5">
                        <span className="row-label">Right Ascension</span>
                        <span className="row-value">{data.sky_events.solar_declination.right_ascension_hours.toFixed(2)}h</span>
                      </div>
                      <div className="flex items-center justify-between py-1.5">
                        <span className="row-label">Eq. of Time</span>
                        <span className="row-value">
                          {data.sky_events.solar_declination.equation_of_time_minutes >= 0 ? "+" : ""}{data.sky_events.solar_declination.equation_of_time_minutes.toFixed(1)} min
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-1.5">
                        <span className="row-label">Season</span>
                        <span className="row-value capitalize">{data.sky_events.solar_declination.season}</span>
                      </div>
                      <div className="flex items-center justify-between py-1.5">
                        <span className="row-label">Day of Year</span>
                        <span className="row-value">{data.sky_events.solar_declination.day_of_year}</span>
                      </div>
                    </>
                  )}

                  {data.sky_events?.sun_constellation && (
                    <>
                      <div className="my-2 sky-divider" />
                      <div className="flex items-center justify-between py-1.5">
                        <span className="row-label">Sun Constellation</span>
                        <span className="row-value">{data.sky_events.sun_constellation}</span>
                      </div>
                    </>
                  )}
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

                  <div className="flex items-center gap-3 mb-2">
                    <MoonPhase fraction={data.lunar.phase_fraction} illumination={data.lunar.illumination_percent} />
                    <div>
                      <p className="text-xs font-medium row-value">{data.lunar.phase_name}</p>
                      <p className="text-[10px] mt-0.5" style={{ color: "var(--sky-muted)" }}>
                        {data.lunar.illumination_percent.toFixed(0)}% illuminated
                        {data.lunar.phase_angle_deg != null && (
                          <span className="ml-1" style={{ color: "var(--sky-footer-text)" }}>
                            · {data.lunar.phase_angle_deg.toFixed(1)}° phase
                          </span>
                        )}
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
                  {data.lunar.lunar_culmination && (
                    <div className="flex items-center justify-between py-1.5">
                      <span className="row-label">Culmination</span>
                      <span className="row-value">{formatTime(data.lunar.lunar_culmination)}</span>
                    </div>
                  )}

                  {data.lunar.elongation_deg != null && (
                    <div className="flex items-center justify-between py-1.5">
                      <span className="row-label">Sun Elongation</span>
                      <span className="row-value">{data.lunar.elongation_deg.toFixed(1)}°</span>
                    </div>
                  )}

                  {data.lunar.current_position && (
                    <>
                      <div className="my-2 sky-divider" />
                      <div className="flex items-center justify-between py-1.5">
                        <span className="row-label">Altitude</span>
                        <span className="row-value">{data.lunar.current_position.altitude_deg.toFixed(1)}&deg;</span>
                      </div>
                      <div className="flex items-center justify-between py-1.5">
                        <span className="row-label">Azimuth</span>
                        <span className="row-value">
                          {data.lunar.current_position.azimuth_deg != null ? `${data.lunar.current_position.azimuth_deg.toFixed(1)}°` : "—"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-1.5">
                        <span className="row-label">Distance</span>
                        <span className="row-value">
                          {data.lunar.current_position.distance_km != null ? `${(data.lunar.current_position.distance_km / 1000).toFixed(0)}k km` : "—"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-1.5">
                        <span className="row-label">Airmass</span>
                        <span className="row-value">
                          {(data.lunar.current_position as any)?.airmass != null
                            ? (data.lunar.current_position as any).airmass.toFixed(2)
                            : "—"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-1.5">
                        <span className="row-label">Status</span>
                        <span className="flex items-center gap-1.5 row-value">
                          {moonUp ? <Eye className="w-3 h-3" style={{ color: "#34d399" }} /> : <EyeOff className="w-3 h-3" style={{ color: "var(--sky-muted)" }} />}
                          <span style={{ color: moonUp ? "#34d399" : "var(--sky-muted)" }}>
                            {moonUp ? "Above horizon" : "Below horizon"}
                          </span>
                        </span>
                      </div>
                    </>
                  )}

                  {data.sky_events?.moon_constellation && (
                    <>
                      <div className="my-2 sky-divider" />
                      <div className="flex items-center justify-between py-1.5">
                        <span className="row-label">Constellation</span>
                        <span className="row-value">{data.sky_events.moon_constellation}</span>
                      </div>
                    </>
                  )}

                  {data.sky_events?.moon_distance && (
                    <>
                      <div className="flex items-center justify-between py-1.5">
                        <span className="row-label">Angular Size</span>
                        <span className="row-value">{data.sky_events.moon_distance.angular_diameter_arcmin.toFixed(1)}′</span>
                      </div>
                      <div className="flex items-center justify-between py-1.5">
                        <span className="row-label">Distance</span>
                        <span className="row-value">
                          {(data.sky_events.moon_distance.distance_km / 1000).toFixed(0)}k km
                          {data.sky_events.moon_distance.distance_label !== "normal" && (
                            <span
                              className="ml-1.5 text-[9px] px-1 py-0.5 rounded-full font-semibold uppercase"
                              style={{
                                background: data.sky_events.moon_distance.distance_label === "supermoon" ? "rgba(251,191,36,0.15)" : "rgba(96,165,250,0.15)",
                                color: data.sky_events.moon_distance.distance_label === "supermoon" ? "#fbbf24" : "#60a5fa",
                              }}
                            >
                              {data.sky_events.moon_distance.distance_label}
                            </span>
                          )}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Day Arc — 24h Brightness Spectrum */}
            <div className="sky-card">
              <div className="p-4">
                <div className="flex items-center gap-2 mb-4">
                  <Sun className="w-3.5 h-3.5" style={{ color: sunUp ? "#fbbf24" : "var(--sky-muted)" }} />
                  <MoonIcon className="w-3.5 h-3.5" style={{ color: "#c4b5fd" }} />
                  <span className="section-label">Day Arc</span>
                </div>

                <div className="mb-1">
                  <span className="text-[10px] font-medium" style={{ color: "var(--sky-muted)" }}>Solar brightness</span>
                </div>
                <SolarSpectrum solar={data.solar} />

                <div className="mt-5 mb-1">
                  <span className="text-[10px] font-medium" style={{ color: "var(--sky-muted)" }}>Moon altitude</span>
                </div>
                <MoonSpectrum lunar={data.lunar} arcPoints={arcData?.lunar || []} />

                <div className="flex items-center justify-between mt-3 pt-3" style={{ borderTop: "1px solid var(--sky-divider)" }}>
                  <span className="text-[9px]" style={{ color: "var(--sky-muted)" }}>
                    <Sunrise className="w-3 h-3 inline mr-1 -mt-0.5" /> Sunrise
                  </span>
                  <span className="text-[9px]" style={{ color: "var(--sky-muted)" }}>Hover for details</span>
                  <span className="text-[9px]" style={{ color: "var(--sky-muted)" }}>
                    <Sunset className="w-3 h-3 inline mr-1 -mt-0.5" /> Sunset
                  </span>
                </div>
              </div>
            </div>

            {/* Milky Way */}
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
                    <span className="row-value">{data.sky_events.milky_way.galactic_center_altitude.toFixed(1)}&deg;</span>
                  </div>
                  <div className="flex items-center justify-between py-1.5">
                    <span className="row-label">Azimuth</span>
                    <span className="row-value">{data.sky_events.milky_way.galactic_center_azimuth.toFixed(1)}&deg;</span>
                  </div>
                  <div className="flex items-center justify-between py-1.5">
                    <span className="row-label">Best Viewing (UTC)</span>
                    <span className="row-value">{String(data.sky_events.milky_way.best_viewing_hour_utc).padStart(2, "0")}:00</span>
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

            {/* Dark Sky Windows */}
            {data.sky_events?.dark_twilight_classification && (
              <div className="sky-card">
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Eye className="w-3.5 h-3.5" style={{ color: "#818cf8" }} />
                    <span className="section-label">Dark Sky Windows</span>
                    <span className="text-[9px] ml-auto" style={{ color: "var(--sky-muted)" }}>Best observing hours</span>
                  </div>

                  <div className="grid grid-cols-12 gap-1">
                    {data.sky_events.dark_twilight_classification.map((tw, i) => {
                      const code = tw.code;
                      const labels = ["Night", "Astronomical", "Nautical", "Civil", "Day"];
                      const colors = ["#312e81", "#4338ca", "#6366f1", "#f59e0b", "#fbbf24"];
                      const bgColors = ["rgba(49,46,129,0.4)", "rgba(67,56,202,0.3)", "rgba(99,102,241,0.2)", "rgba(245,158,11,0.15)", "rgba(251,191,36,0.1)"];
                      const isNight = code <= 1;
                      return (
                        <div
                          key={i}
                          className="rounded text-center py-2 border"
                          style={{
                            background: bgColors[code] || "transparent",
                            borderColor: isNight ? "rgba(99,102,241,0.3)" : "transparent",
                          }}
                        >
                          <span className="text-[9px]" style={{ color: colors[code] || "var(--sky-muted)" }}>
                            {String(tw.hour_utc).padStart(2, "0")}:00
                          </span>
                          <div className="mt-1">
                            <span
                              className="text-[8px] px-1 py-0.5 rounded-full"
                              style={{
                                background: isNight ? "rgba(52,211,153,0.2)" : "transparent",
                                color: isNight ? "#34d399" : colors[code] || "var(--sky-muted)",
                                fontWeight: isNight ? 600 : 400,
                              }}
                            >
                              {labels[code] || "Unknown"}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <p className="text-[9px] mt-2" style={{ color: "var(--sky-footer-text)" }}>
                    Green = best for deep sky · Yellow = daylight · Blue = twilight
                  </p>
                </div>
              </div>
            )}

            {/* Daily Astronomy Facts */}
            {data.sky_events?.facts && data.sky_events.facts.length > 0 && (
              <div className="sky-card">
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="w-3.5 h-3.5" style={{ color: "#fbbf24" }} />
                    <span className="section-label">Did You Know?</span>
                  </div>

                  <div className="space-y-2">
                    {data.sky_events.facts.map((fact, i) => (
                      <div
                        key={i}
                        className="rounded-lg p-2.5 border"
                        style={{ background: "rgba(251,191,36,0.05)", borderColor: "rgba(251,191,36,0.15)" }}
                      >
                        <p className="text-[11px] leading-relaxed" style={{ color: "var(--sky-muted)" }}>
                          {fact.fact}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

          </div>
        )}

        {/* ──── Planets Tab ──── */}
        {activeTab === "planets" && (
          <div className="space-y-4">
            <div className="sky-card">
              <div className="p-4">
                <div className="flex items-center gap-2 mb-4">
                  <Globe className="w-3.5 h-3.5" style={{ color: "#60a5fa" }} />
                  <span className="section-label">Planets — Full Reference</span>
                  <span className="text-[9px] ml-auto" style={{ color: "var(--sky-muted)" }}>
                    {planetTonightData?.date ? formatDateShort(planetTonightData.date) : ""}
                  </span>
                </div>

                {!planetTonightData ? (
                  <LoadingState />
                ) : planetTonightData.planets.length === 0 ? (
                  <p className="text-[11px] py-3 text-center" style={{ color: "var(--sky-muted)" }}>
                    No planet data available.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {planetTonightData.planets.map((planet) => {
                      const raw = data.planets.find(p => p.name === planet.name);

                      return (
                        <div
                          key={planet.name}
                          className="rounded-lg p-3 border"
                          style={{
                            background: planet.is_above_horizon ? "var(--sky-visible-bg)" : "var(--sky-planet-bg)",
                            borderColor: planet.is_above_horizon ? "var(--sky-visible-border)" : "var(--sky-planet-border)",
                          }}
                        >
                          {/* Header: symbol, name, badges, horizon status */}
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">{planet.symbol}</span>
                              <span className="text-[12px] font-semibold" style={{ color: "var(--sky-text)" }}>
                                {planet.name}
                              </span>
                              <QualityBadge quality={planet.quality} />
                              {planet.needs_optics && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: "rgba(139,92,246,0.15)", color: "#a78bfa" }}>
                                  🔭 Optics needed
                                </span>
                              )}
                              <span className={planet.is_above_horizon ? "status-dot-on" : "status-dot-off"} />
                            </div>
                            <span className="text-[10px]" style={{ color: "var(--sky-muted)" }}>
                              {planet.is_above_horizon ? "Above horizon" : "Below horizon"}
                            </span>
                          </div>

                          {/* Constellation + transitions */}
                          {raw?.constellation && (
                            <div className="mb-2" style={{ borderTop: "1px solid var(--sky-divider)", paddingTop: "6px" }}>
                              <div className="flex items-center gap-1.5 mb-1">
                                <span className="text-[9px]" style={{ color: "var(--sky-footer-text)" }}>In</span>
                                <span className="text-[10px] font-semibold" style={{ color: "#a78bfa" }}>
                                  {raw.constellation}
                                </span>
                              </div>
                              {planetTonightData?.constellation_transitions?.[planet.name] && (
                                <div className="flex items-center gap-1 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
                                  {planetTonightData.constellation_transitions[planet.name].map((seg, si) => {
                                    const isCurrent = seg.constellation === raw.constellation;
                                    return (
                                      <span
                                        key={si}
                                        className="text-[9px] px-1.5 py-0.5 rounded-full flex-shrink-0"
                                        style={{
                                          background: isCurrent ? "rgba(167,139,250,0.2)" : "rgba(148,163,184,0.1)",
                                          color: isCurrent ? "#a78bfa" : "var(--sky-footer-text)",
                                          fontWeight: isCurrent ? 600 : 400,
                                        }}
                                      >
                                        {seg.constellation}
                                        <span className="ml-1 opacity-60">
                                          {seg.start.slice(5)} → {seg.end.slice(5)}
                                        </span>
                                      </span>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Timing: rise, set, culmination */}
                          <div className="grid grid-cols-3 gap-2 mb-2">
                            <div>
                              <span className="text-[9px]" style={{ color: "var(--sky-footer-text)" }}>Rise</span>
                              <p className="text-[10px] font-medium" style={{ color: "var(--sky-detail-text)" }}>
                                {planet.rise ? formatTime(planet.rise) : "—"}
                              </p>
                            </div>
                            <div>
                              <span className="text-[9px]" style={{ color: "var(--sky-footer-text)" }}>Set</span>
                              <p className="text-[10px] font-medium" style={{ color: "var(--sky-detail-text)" }}>
                                {planet.set ? formatTime(planet.set) : "—"}
                              </p>
                            </div>
                            <div>
                              <span className="text-[9px]" style={{ color: "var(--sky-footer-text)" }}>Culmination</span>
                              <p className="text-[10px] font-medium" style={{ color: "var(--sky-detail-text)" }}>
                                {raw?.culmination ? formatTime(raw.culmination) : "—"}
                              </p>
                            </div>
                          </div>

                          {/* Position: altitude, azimuth, RA, Dec */}
                          <div className="grid grid-cols-4 gap-2 mb-2" style={{ borderTop: "1px solid var(--sky-divider)", paddingTop: "6px" }}>
                            <div>
                              <span className="text-[9px]" style={{ color: "var(--sky-footer-text)" }}>Altitude</span>
                              <p className="text-[10px] font-medium" style={{ color: "var(--sky-detail-text)" }}>
                                {planet.altitude_deg.toFixed(1)}°
                              </p>
                            </div>
                            <div>
                              <span className="text-[9px]" style={{ color: "var(--sky-footer-text)" }}>Azimuth</span>
                              <p className="text-[10px] font-medium" style={{ color: "var(--sky-detail-text)" }}>
                                {raw?.azimuth_deg != null ? `${raw.azimuth_deg.toFixed(0)}°` : "—"}
                              </p>
                            </div>
                            <div>
                              <span className="text-[9px]" style={{ color: "var(--sky-footer-text)" }}>RA</span>
                              <p className="text-[10px] font-medium" style={{ color: "var(--sky-detail-text)" }}>
                                {raw?.ra_hours != null ? `${raw.ra_hours.toFixed(1)}h` : "—"}
                              </p>
                            </div>
                            <div>
                              <span className="text-[9px]" style={{ color: "var(--sky-footer-text)" }}>Dec</span>
                              <p className="text-[10px] font-medium" style={{ color: "var(--sky-detail-text)" }}>
                                {raw?.dec_deg != null ? `${raw.dec_deg >= 0 ? "+" : ""}${raw.dec_deg.toFixed(1)}°` : "—"}
                              </p>
                            </div>
                          </div>

                          {/* Physical: distance, angular diameter, magnitude, retrograde */}
                          <div className="grid grid-cols-2 gap-2 mb-2" style={{ borderTop: "1px solid var(--sky-divider)", paddingTop: "6px" }}>
                            <div>
                              <span className="text-[9px]" style={{ color: "var(--sky-footer-text)" }}>Distance</span>
                              <p className="text-[10px] font-medium" style={{ color: "var(--sky-detail-text)" }}>
                                {raw?.distance_au != null ? `${raw.distance_au.toFixed(3)} AU` : "—"}
                              </p>
                            </div>
                            <div>
                              <span className="text-[9px]" style={{ color: "var(--sky-footer-text)" }}>Angular Size</span>
                              <p className="text-[10px] font-medium" style={{ color: "var(--sky-detail-text)" }}>
                                {raw?.angular_diameter_arcsec != null ? `${raw.angular_diameter_arcsec.toFixed(1)}″` : "—"}
                              </p>
                            </div>
                            <div>
                              <span className="text-[9px]" style={{ color: "var(--sky-footer-text)" }}>Magnitude</span>
                              <p className="text-[10px] font-medium" style={{ color: "var(--sky-detail-text)" }}>
                                {raw?.magnitude != null ? ` ${raw.magnitude.toFixed(1)}` : "—"}
                              </p>
                            </div>
                            <div>
                              <span className="text-[9px]" style={{ color: "var(--sky-footer-text)" }}>Motion</span>
                              <p className="text-[10px] font-medium" style={{ color: "var(--sky-detail-text)" }}>
                                {raw?.is_retrograde ? (
                                  <span style={{ color: "#f87171" }}>↺ Retrograde</span>
                                ) : (
                                  <span style={{ color: "#34d399" }}>→ Direct</span>
                                )}
                              </p>
                            </div>
                            <div>
                              <span className="text-[9px]" style={{ color: "var(--sky-footer-text)" }}>Airmass</span>
                              <p className="text-[10px] font-medium" style={{ color: "var(--sky-detail-text)" }}>
                                {raw?.airmass != null ? raw.airmass.toFixed(2) : "—"}
                              </p>
                            </div>
                          </div>

                          {/* Commentary: viewing window + comment */}
                          <div style={{ borderTop: "1px solid var(--sky-divider)", paddingTop: "6px" }}>
                            {planet.viewing_window && (
                              <p className="text-[10px] mb-1" style={{ color: "var(--sky-muted)" }}>
                                <span style={{ color: "var(--sky-footer-text)" }}>Viewing: </span>
                                {planet.viewing_window}
                              </p>
                            )}
                            <p className="text-[10px] leading-relaxed" style={{ color: "var(--sky-muted)" }}>
                              {planet.comment}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ──── Calendar Tab ──── */}
        {activeTab === "calendar" && (
          <div className="space-y-4">
            <div className="sky-card">
              <div className="p-4">
                <div className="flex items-center gap-2 mb-4">
                  <Calendar className="w-3.5 h-3.5" style={{ color: "#fbbf24" }} />
                  <span className="section-label">Equinox & Solstice Calendar</span>
                  <span className="text-[9px] ml-auto" style={{ color: "var(--sky-muted)" }}>
                    2026 — 2027
                  </span>
                </div>

                {!seasonCalendarData ? (
                  <LoadingState />
                ) : seasonCalendarData.events.length === 0 ? (
                  <p className="text-[11px] py-3 text-center" style={{ color: "var(--sky-muted)" }}>
                    No season events available.
                  </p>
                ) : (
                  <div className="space-y-0">
                    {(() => {
                      const today = new Date();
                      const grouped: Record<string, SeasonEvent[]> = {};
                      for (const ev of seasonCalendarData.events) {
                        const year = ev.date.split("-")[0];
                        if (!grouped[year]) grouped[year] = [];
                        grouped[year].push(ev);
                      }

                      return Object.entries(grouped).map(([year, events]) => (
                        <div key={year} className="mb-4 last:mb-0">
                          <div className="flex items-center gap-2 mb-3">
                            <span className="text-[11px] font-bold" style={{ color: "var(--sky-accent)" }}>{year}</span>
                            <div className="flex-1 h-px" style={{ background: "var(--sky-divider)" }} />
                          </div>
                          <div className="space-y-2">
                            {events.map((ev, idx) => {
                              const evDate = new Date(ev.date + "T00:00:00");
                              const isPast = evDate < today;
                              const isNext = !isPast && !seasonCalendarData.events.find((e, i) => {
                                if (i <= seasonCalendarData.events.indexOf(ev)) return false;
                                return new Date(e.date + "T00:00:00") >= today;
                              });

                              return (
                                <div
                                  key={idx}
                                  className="flex items-start gap-3 rounded-lg px-3 py-2.5 border transition-colors"
                                  style={{
                                    background: isNext ? "var(--sky-visible-bg)" : isPast ? "var(--sky-planet-bg)" : "var(--sky-planet-bg)",
                                    borderColor: isNext ? "var(--sky-visible-border)" : "var(--sky-planet-border)",
                                    opacity: isPast ? 0.6 : 1,
                                  }}
                                >
                                  <span className="text-xl leading-none mt-0.5">{ev.emoji}</span>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                      <span className="text-[12px] font-semibold" style={{ color: "var(--sky-text)" }}>
                                        {ev.name}
                                      </span>
                                      {isNext && (
                                        <span className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold" style={{ background: "rgba(16,185,129,0.15)", color: "#34d399" }}>
                                          NEXT
                                        </span>
                                      )}
                                      <span className="text-[9px] ml-auto" style={{ color: "var(--sky-muted)" }}>
                                        {new Date(ev.date + "T00:00:00").toLocaleDateString("en-IN", { weekday: "short", month: "short", day: "numeric" })}
                                      </span>
                                    </div>
                                    <p className="text-[10px] mt-0.5" style={{ color: "var(--sky-muted)" }}>
                                      {ev.description}
                                    </p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                )}
              </div>
            </div>

          </div>
        )}

        {/* ──── Sky Stories Tab ──── */}
        {activeTab === "stories" && (
          <div className="space-y-4">
            <div className="sky-card">
              <div className="p-4">
                <div className="flex items-center gap-2 mb-4">
                  <BookOpen className="w-3.5 h-3.5" style={{ color: "#a78bfa" }} />
                  <span className="section-label">Sky Story for Kids</span>
                  <span className="text-[9px] ml-auto" style={{ color: "var(--sky-muted)" }}>
                    {skyStoryData?.title ? formatDateShort(currentDate) : ""}
                  </span>
                </div>

                {!skyStoryData ? (
                  <LoadingState />
                ) : (
                  <div className="space-y-4">
                    {/* Story content — render with line breaks */}
                    <div
                      className="rounded-lg p-4 border leading-relaxed"
                      style={{
                        background: "var(--sky-planet-bg)",
                        borderColor: "var(--sky-planet-border)",
                        color: "var(--sky-text)",
                        whiteSpace: "pre-wrap",
                        fontSize: "12px",
                        lineHeight: "1.7",
                      }}
                    >
                      {skyStoryData.story}
                    </div>

                    {/* Activity card */}
                    {skyStoryData.activity && (
                      <div
                        className="rounded-lg p-4 border text-center"
                        style={{
                          background: "rgba(168,85,247,0.06)",
                          borderColor: "rgba(168,85,247,0.15)",
                        }}
                      >
                        <p className="text-[11px] font-semibold" style={{ color: "#a78bfa" }}>
                          🎯 Tonight's Activity
                        </p>
                        <p className="text-[11px] mt-1" style={{ color: "var(--sky-muted)" }}>
                          {skyStoryData.activity}
                        </p>
                      </div>
                    )}

                    {/* Fun fact card */}
                    {skyStoryData.fun_fact && (
                      <div
                        className="rounded-lg p-4 border text-center"
                        style={{
                          background: "rgba(59,130,246,0.06)",
                          borderColor: "rgba(59,130,246,0.15)",
                        }}
                      >
                        <p className="text-[11px] font-semibold" style={{ color: "#60a5fa" }}>
                          🧠 Did You Know?
                        </p>
                        <p className="text-[11px] mt-1" style={{ color: "var(--sky-muted)" }}>
                          {skyStoryData.fun_fact}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ──── ISS Tab ──── */}
        {activeTab === "iss" && (
          <div className="space-y-4">
            {issData && issData.status === "available" ? (
              <div className="sky-card">
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Satellite className="w-3.5 h-3.5" style={{ color: "#34d399" }} />
                    <span className="section-label">ISS Visibility</span>
                    {issData.current_position?.is_above_horizon && (
                      <span className="text-[9px] font-semibold" style={{ color: "#34d399" }}>
                        ● Visible now
                      </span>
                    )}
                    <span className="text-[9px] ml-auto" style={{ color: "var(--sky-muted)" }}>
                      Next 48h
                    </span>
                  </div>

                  {/* Current position */}
                  {issData.current_position && (
                    <div
                      className="rounded-lg p-3 mb-3 border"
                      style={{
                        background: issData.current_position.is_above_horizon ? "var(--sky-visible-bg)" : "var(--sky-planet-bg)",
                        borderColor: issData.current_position.is_above_horizon ? "var(--sky-visible-border)" : "var(--sky-planet-border)",
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-[10px] font-medium" style={{ color: "var(--sky-text)" }}>
                            {issData.current_position.is_above_horizon ? "🛰 In view" : "🛰 Below horizon"}
                          </span>
                          <span className="text-[9px] ml-2" style={{ color: "var(--sky-muted)" }}>
                            Alt {issData.current_position.altitude_deg.toFixed(1)}° · {issData.current_position.direction}
                          </span>
                        </div>
                        <span className="text-[9px]" style={{ color: "var(--sky-muted)" }}>
                          {(issData.current_position.distance_km / 1000).toFixed(1)}k km
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Upcoming passes */}
                  {issData.passes.length > 0 ? (
                    <div className="space-y-1.5">
                      {issData.passes.slice(0, 5).map((pass, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-2.5 rounded-lg px-3 py-2 border"
                          style={{ background: "var(--sky-planet-bg)", borderColor: "var(--sky-planet-border)" }}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] font-medium" style={{ color: "var(--sky-text)" }}>
                                Max {pass.max_elevation_deg}°
                              </span>
                              <span className="text-[9px]" style={{ color: "var(--sky-muted)" }}>
                                {pass.duration_minutes.toFixed(0)} min
                              </span>
                              <span className="text-[9px]" style={{ color: "var(--sky-muted)" }}>
                                from {pass.direction}
                              </span>
                            </div>
                            <span className="text-[10px]" style={{ color: "var(--sky-muted)" }}>
                              {new Date(pass.start_time).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                              {" – "}
                              {new Date(pass.end_time).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                              {" · "}
                              {new Date(pass.start_time).toLocaleDateString("en-IN", { weekday: "short", month: "short", day: "numeric" })}
                            </span>
                          </div>
                        </div>
                      ))}
                      {issData.total_passes > 5 && (
                        <div className="text-center text-[9px] pt-1" style={{ color: "var(--sky-muted)" }}>
                          +{issData.total_passes - 5} more passes
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-[10px]" style={{ color: "var(--sky-muted)" }}>
                      No visible passes in the next 48 hours
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="sky-card">
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Satellite className="w-3.5 h-3.5" style={{ color: "var(--sky-muted)" }} />
                    <span className="section-label">ISS Visibility</span>
                  </div>
                  <div className="text-center py-4 text-[10px]" style={{ color: "var(--sky-muted)" }}>
                    {issData?.status === "unavailable" ? "ISS data unavailable (network error)" : "Loading..."}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ──── Events Tab ──── */}
        {activeTab === "events" && (
          <div className="space-y-4">
            {/* Meteor Showers */}
            {data.sky_events && (
              <div className="sky-card">
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="w-3.5 h-3.5" style={{ color: "#8b5cf6" }} />
                    <span className="section-label">Meteor Showers</span>
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
                          style={{ background: "var(--sky-shower-bg)", borderColor: "var(--sky-shower-border)" }}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-xs font-medium row-value">
                                {shower.name}
                                {shower.near_peak && (
                                  <span className="ml-2 text-[9px] px-1.5 py-0.5 rounded-full font-semibold" style={{ background: "#8b5cf6", color: "#fff" }}>
                                    PEAK
                                  </span>
                                )}
                              </p>
                              <p className="text-[10px] mt-0.5" style={{ color: "var(--sky-muted)" }}>
                                Peak: {shower.peak_date} &middot; ZHR ~{shower.zhr}/hr
                              </p>
                            </div>
                            <span className="text-[10px]" style={{ color: "var(--sky-footer-text)" }}>
                              {shower.days_from_peak === 0 ? "Peak night" : `${shower.days_from_peak}d from peak`}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Upcoming Astronomical Events */}
            {eventsData && eventsData.events.length > 0 && (
              <div className="sky-card">
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="w-3.5 h-3.5" style={{ color: "#fbbf24" }} />
                    <span className="section-label">Upcoming Events</span>
                    <span className="text-[9px] ml-auto" style={{ color: "var(--sky-muted)" }}>
                      Next 4 weeks
                    </span>
                  </div>

                  <div className="space-y-0">
                    {(() => {
                      const today = getToday();
                      const weeks: Record<string, UpcomingEvent[]> = {};
                      for (const ev of eventsData.events) {
                        const evDate = new Date(ev.date + "T00:00:00");
                        const todayDate = new Date(today + "T00:00:00");
                        const diffDays = Math.round((evDate.getTime() - todayDate.getTime()) / 86400000);
                        const weekNum = Math.floor(diffDays / 7) + 1;
                        const weekLabel = weekNum === 1 ? "This week" : `Week ${weekNum}`;
                        if (!weeks[weekLabel]) weeks[weekLabel] = [];
                        weeks[weekLabel].push(ev);
                      }

                      return Object.entries(weeks).map(([weekLabel, weekEvents]) => (
                        <div key={weekLabel} className="mb-3 last:mb-0">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-[9px] font-semibold uppercase tracking-wide" style={{ color: "var(--sky-muted)" }}>
                              {weekLabel}
                            </span>
                            <div className="flex-1 h-px" style={{ background: "var(--sky-divider)" }} />
                          </div>
                          <div className="space-y-1.5">
                            {weekEvents.map((ev, idx) => (
                              <div
                                key={idx}
                                className="flex items-start gap-2.5 rounded-lg px-3 py-2 border transition-colors"
                                style={{ background: "var(--sky-planet-bg)", borderColor: "var(--sky-planet-border)" }}
                              >
                                <span className="text-base leading-none mt-0.5">{ev.icon}</span>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[11px] font-medium" style={{ color: "var(--sky-text)" }}>
                                      {ev.title}
                                    </span>
                                    <span className="text-[9px] flex-shrink-0" style={{ color: "var(--sky-muted)" }}>
                                      {new Date(ev.date + "T00:00:00").toLocaleDateString("en-IN", {
                                        weekday: "short", month: "short", day: "numeric",
                                      })}
                                    </span>
                                  </div>
                                  <span className="text-[10px]" style={{ color: "var(--sky-muted)" }}>
                                    {ev.description}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              </div>
            )}

            {/* Astronomical Facts */}
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
                        style={{ background: "var(--sky-fact-bg)", borderColor: "var(--sky-fact-border)" }}
                      >
                        <p className="text-[11px] leading-relaxed row-value">{entry.fact}</p>
                        <p className="text-[9px] mt-1.5 uppercase tracking-wider" style={{ color: "var(--sky-footer-text)" }}>
                          {entry.source === "date-specific" ? "\u2728 Date-specific" : entry.source === "proximity" ? "\u25CE Nearby date" : "\u2605 General"}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Planetary Conjunctions */}
            {conjunctionData && conjunctionData.length > 0 && (
              <div className="sky-card">
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Globe className="w-3.5 h-3.5" style={{ color: "#60a5fa" }} />
                    <span className="section-label">Planetary Conjunctions</span>
                    <span className="text-[9px] ml-auto" style={{ color: "var(--sky-muted)" }}>Next 30 days</span>
                  </div>

                  <div className="space-y-2">
                    {conjunctionData.map((conj, idx) => (
                      <div
                        key={idx}
                        className="rounded-lg p-3 border"
                        style={{ background: "var(--sky-planet-bg)", borderColor: "var(--sky-planet-border)" }}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[11px] font-medium" style={{ color: "var(--sky-text)" }}>
                            {conj.planet_a} &amp; {conj.planet_b}
                          </span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: "rgba(96,165,250,0.15)", color: "#60a5fa" }}>
                            {conj.separation_deg.toFixed(1)}° apart
                          </span>
                        </div>
                        <p className="text-[10px]" style={{ color: "var(--sky-muted)" }}>
                          {conj.date.slice(5)} → {conj.end.slice(5)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Upcoming Eclipses */}
            {eclipseData && eclipseData.length > 0 && (
              <div className="sky-card">
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <MoonIcon className="w-3.5 h-3.5" style={{ color: "#f87171" }} />
                    <span className="section-label">Upcoming Eclipses</span>
                    <span className="text-[9px] ml-auto" style={{ color: "var(--sky-muted)" }}>Next 6 months</span>
                  </div>

                  <div className="space-y-2">
                    {eclipseData.map((eclipse, idx) => (
                      <div
                        key={idx}
                        className="rounded-lg p-3 border"
                        style={{
                          background: eclipse.type === "solar_eclipse" ? "rgba(251,191,36,0.05)" : "rgba(139,92,246,0.05)",
                          borderColor: eclipse.type === "solar_eclipse" ? "rgba(251,191,36,0.15)" : "rgba(139,92,246,0.15)",
                        }}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg">{eclipse.icon}</span>
                          <div>
                            <p className="text-[11px] font-medium" style={{ color: "var(--sky-text)" }}>
                              {eclipse.title}
                            </p>
                            <p className="text-[10px]" style={{ color: "var(--sky-muted)" }}>
                              {new Date(eclipse.date + "T00:00:00").toLocaleDateString("en-IN", {
                                weekday: "short", month: "short", day: "numeric", year: "numeric",
                              })}
                              {" · "}
                              {eclipse.description}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Planetary Oppositions */}
            {oppositionData && oppositionData.length > 0 && (
              <div className="sky-card">
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Globe className="w-3.5 h-3.5" style={{ color: "#f472b6" }} />
                    <span className="section-label">Planetary Oppositions</span>
                    <span className="text-[9px] ml-auto" style={{ color: "var(--sky-muted)" }}>Next 6 months</span>
                  </div>

                  <div className="space-y-2">
                    {oppositionData.map((opp, idx) => (
                      <div
                        key={idx}
                        className="rounded-lg p-3 border"
                        style={{ background: "rgba(244,114,182,0.05)", borderColor: "rgba(244,114,182,0.15)" }}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[11px] font-medium" style={{ color: "var(--sky-text)" }}>
                            {opp.planet}
                          </span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: "rgba(244,114,182,0.15)", color: "#f472b6" }}>
                            {opp.elongation_deg.toFixed(1)}° from Sun
                          </span>
                        </div>
                        <p className="text-[10px]" style={{ color: "var(--sky-muted)" }}>
                          {opp.date.slice(5)} → {opp.end.slice(5)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Zodiac Signs */}
            {zodiacData && (
              <div className="sky-card">
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="w-3.5 h-3.5" style={{ color: "#c084fc" }} />
                    <span className="section-label">Zodiac Positions</span>
                  </div>

                  <div className="space-y-2">
                    <div className="rounded-lg p-3 border" style={{ background: "rgba(251,191,36,0.05)", borderColor: "rgba(251,191,36,0.15)" }}>
                      <div className="flex items-center gap-2">
                        <span className="text-sm">☀️</span>
                        <span className="text-[11px] font-medium" style={{ color: "var(--sky-text)" }}>Sun</span>
                        <span className="text-[10px] ml-auto" style={{ color: "var(--sky-muted)" }}>
                          {zodiacData.sun.zodiac}
                        </span>
                      </div>
                    </div>
                    <div className="rounded-lg p-3 border" style={{ background: "rgba(148,163,184,0.05)", borderColor: "rgba(148,163,184,0.15)" }}>
                      <div className="flex items-center gap-2">
                        <span className="text-sm">🌙</span>
                        <span className="text-[11px] font-medium" style={{ color: "var(--sky-text)" }}>Moon</span>
                        <span className="text-[10px] ml-auto" style={{ color: "var(--sky-muted)" }}>
                          {zodiacData.moon.zodiac}
                        </span>
                      </div>
                    </div>
                    {zodiacData.planets.map((pz, idx) => (
                      <div key={idx} className="rounded-lg p-3 border" style={{ background: "var(--sky-planet-bg)", borderColor: "var(--sky-planet-border)" }}>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-medium" style={{ color: "var(--sky-text)" }}>{pz.planet}</span>
                          <span className="text-[10px] ml-auto" style={{ color: "var(--sky-muted)" }}>
                            {pz.zodiac}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Moon Standstill */}
            {moonStandstillData && (
              <div className="sky-card">
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <MoonIcon className="w-3.5 h-3.5" style={{ color: "#38bdf8" }} />
                    <span className="section-label">Moon Standstill Cycle</span>
                  </div>

                  <div className="rounded-lg p-3 border" style={{ background: "rgba(56,189,248,0.05)", borderColor: "rgba(56,189,248,0.15)" }}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-[9px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wide ${
                        moonStandstillData.type === "major" ? "bg-purple-600 text-white" :
                        moonStandstillData.type === "minor" ? "bg-blue-600 text-white" :
                        "bg-gray-600 text-gray-200"
                      }`}>
                        {moonStandstillData.type}
                      </span>
                      <span className="text-[10px]" style={{ color: "var(--sky-muted)" }}>
                        Declination range: {moonStandstillData.declination_range}
                      </span>
                    </div>
                    <p className="text-[10px] leading-relaxed" style={{ color: "var(--sky-muted)" }}>
                      {moonStandstillData.description}
                    </p>
                    {moonStandstillData.years_to_major != null && (
                      <p className="text-[9px] mt-1.5" style={{ color: "var(--sky-footer-text)" }}>
                        Next major standstill in ~{moonStandstillData.years_to_major} years
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Bright Stars */}
            {starData && starData.length > 0 && (
              <div className="sky-card">
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="w-3.5 h-3.5" style={{ color: "#fde68a" }} />
                    <span className="section-label">Bright Stars</span>
                    <span className="text-[9px] ml-auto" style={{ color: "var(--sky-muted)" }}>
                      {starData.length} visible
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {starData.slice(0, 20).map((star, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 rounded-lg px-3 py-2 border"
                        style={{ background: "var(--sky-planet-bg)", borderColor: "var(--sky-planet-border)" }}
                      >
                        <span className="text-[9px] w-6 text-center font-mono flex-shrink-0" style={{ color: "var(--sky-muted)" }}>
                          {star.magnitude.toFixed(1)}
                        </span>
                        <div className="flex-1 min-w-0">
                          <span className="text-[11px] font-medium" style={{ color: "var(--sky-text)" }}>
                            {star.name}
                          </span>
                          <span className="text-[9px] ml-2" style={{ color: "var(--sky-footer-text)" }}>
                            {star.spectral_type}
                          </span>
                        </div>
                        <span className="text-[9px] flex-shrink-0" style={{ color: "var(--sky-muted)" }}>
                          {star.constellation}
                        </span>
                        <span className="text-[9px] w-10 text-right flex-shrink-0" style={{ color: "var(--sky-footer-text)" }}>
                          {star.altitude_deg.toFixed(0)}°
                        </span>
                      </div>
                    ))}
                    {starData.length > 20 && (
                      <p className="text-[9px] text-center pt-1" style={{ color: "var(--sky-footer-text)" }}>
                        +{starData.length - 20} more stars visible
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Messier Objects */}
            {messierData && messierData.length > 0 && (
              <div className="sky-card">
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Telescope className="w-3.5 h-3.5" style={{ color: "#34d399" }} />
                    <span className="section-label">Messier Objects</span>
                    <span className="text-[9px] ml-auto" style={{ color: "var(--sky-muted)" }}>
                      {messierData.length} visible
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {messierData.slice(0, 20).map((obj, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 rounded-lg px-3 py-2 border"
                        style={{ background: "var(--sky-planet-bg)", borderColor: "var(--sky-planet-border)" }}
                      >
                        <span className="text-[9px] w-6 text-center font-mono flex-shrink-0" style={{ color: "var(--sky-muted)" }}>
                          {obj.magnitude.toFixed(0)}
                        </span>
                        <div className="flex-1 min-w-0">
                          <span className="text-[11px] font-medium" style={{ color: "var(--sky-text)" }}>
                            {obj.designation}
                          </span>
                          <span className="text-[9px] ml-2" style={{ color: "var(--sky-footer-text)" }}>
                            {obj.type}
                          </span>
                        </div>
                        <span className="text-[9px] flex-shrink-0" style={{ color: "var(--sky-muted)" }}>
                          {obj.constellation}
                        </span>
                        <span className="text-[9px] w-10 text-right flex-shrink-0" style={{ color: "var(--sky-footer-text)" }}>
                          {obj.altitude_deg.toFixed(0)}°
                        </span>
                      </div>
                    ))}
                    {messierData.length > 20 && (
                      <p className="text-[9px] text-center pt-1" style={{ color: "var(--sky-footer-text)" }}>
                        +{messierData.length - 20} more objects visible
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

          </div>
        )}
      </div>

      {/* ── Footer ──────────────────────────────────────────────── */}
      <div className="text-center pt-2 pb-6">
        <p className="text-[10px]" style={{ color: "var(--sky-footer-text)" }}>
          Skyfield &middot; DE440S &middot; Pathfinder
        </p>
      </div>
    </div>
  );
}
