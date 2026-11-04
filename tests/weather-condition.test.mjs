import test from 'node:test';
import assert from 'node:assert/strict';
import {compactWeatherCondition, WEATHER_CONDITION_LIMIT} from '../src/lib/weather-condition.ts';

test('short weather descriptions retain their wording', () => {
  for (const description of ['Clear sky','Light rain','Heavy rain','Light snow','Mist','Fog','Haze','Tornado']) {
    assert.equal(compactWeatherCondition(description), description);
  }
  assert.equal(compactWeatherCondition('  Light   rain  '), 'Light rain');
  assert.equal(compactWeatherCondition(''), 'Clear');
});
test('long descriptions keep the main condition within one shared budget', () => {
  const cases = [
    ['Thunderstorm with light rain','Storms'],
    ['Thunderstorm with heavy drizzle','Storms'],
    ['Very heavy rain','Heavy rain'],
    ['Light intensity rain','Light rain'],
    ['Freezing rain','Icy rain'],
    ['Light rain and snow','Rain/snow'],
    ['Heavy shower snow','Heavy snow'],
    ['Light intensity drizzle','Drizzle'],
    ['Overcast clouds','Overcast'],
    ['Partly cloudy','Cloudy'],
    ['Scattered clouds','Cloudy'],
    ['Sand/dust whirls','Dust'],
    ['Ragged squalls','Squalls'],
  ];
  for (const [description, expected] of cases) {
    const result = compactWeatherCondition(description);
    assert.equal(result, expected);
    assert.ok(Array.from(result).length <= WEATHER_CONDITION_LIMIT);
  }
});
test('unknown long descriptions truncate at a word boundary and bound single tokens', () => {
  assert.equal(compactWeatherCondition('Unusual atmospheric phenomenon'), 'Unusual…');
  for (const value of ['Unrecognizedphenomenon', '😀'.repeat(20)]) {
    assert.equal(Array.from(compactWeatherCondition(value)).length, WEATHER_CONDITION_LIMIT);
  }
});
