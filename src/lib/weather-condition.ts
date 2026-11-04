// One budget for every viewport: desktop and mobile always show the same description.
export const WEATHER_CONDITION_LIMIT = 10;

export function compactWeatherCondition(description: string): string {
  const text = description.trim().replace(/\s+/g, " ") || "Clear";
  if (Array.from(text).length <= WEATHER_CONDITION_LIMIT) return text;

  // Retain the weather itself, discarding detail only when the original exceeds the budget.
  const rules: [RegExp, string][] = [
    [/thunderstorm/i, "Storms"],
    [/rain.*snow|snow.*rain|sleet/i, "Rain/snow"],
    [/freezing.*rain/i, "Icy rain"],
    [/heavy.*rain|extreme.*rain/i, "Heavy rain"],
    [/light.*rain/i, "Light rain"],
    [/rain/i, "Rain"],
    [/heavy.*snow/i, "Heavy snow"],
    [/light.*snow/i, "Light snow"],
    [/snow/i, "Snow"],
    [/drizzle/i, "Drizzle"],
    [/overcast/i, "Overcast"],
    [/cloud/i, "Cloudy"],
    [/squall/i, "Squalls"],
    [/dust/i, "Dust"],
    [/sand/i, "Sand"],
  ];
  const match = rules.find(([pattern]) => pattern.test(text));
  if (match) return match[1];

  // Unrecognized descriptions still have a bounded fallback, with whole words when possible.
  const clipped = Array.from(text).slice(0, WEATHER_CONDITION_LIMIT - 1).join("");
  const boundary = clipped.lastIndexOf(" ");
  return `${(boundary > 0 ? clipped.slice(0, boundary) : clipped).trimEnd()}…`;
}
