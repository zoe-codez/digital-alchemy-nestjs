/* eslint-disable spellcheck/spell-checker */

type DurationSensor = {
  device_class: "duration";
  unit_of_measurement: "h" | "min" | "s" | "d";
};
type TemperatureSensor = {
  device_class: "temperature";
  unit_of_measurement: "K" | "°C" | "°F";
};
type Precipitation = {
  device_class: "precipitation";
  unit_of_measurement: "cm" | "in" | "mm";
};
type ApparentPowerSensor = {
  device_class: "apparent_power";
  unit_of_measurement: "VA";
};
type WaterSensor = {
  device_class: "water";
  unit_of_measurement: "L" | "gal" | "m³" | "ft³" | "CCF";
};
type WeightSensor = {
  device_class: "weight";
  unit_of_measurement: "kg" | "g" | "mg" | "µg" | "oz" | "lb" | "st";
};
type WindSpeedSensor = {
  device_class: "wind_speed";
  unit_of_measurement: "ft/s" | "km/h" | "kn" | "m/s" | "mph";
};
type SpeedSensor = {
  device_class: "speed";
  unit_of_measurement:
    | "ft/s"
    | "in/d"
    | "in/h"
    | "km/h"
    | "kn"
    | "m/s"
    | "mph"
    | "mm/d";
};
type VoltageSensor = {
  device_class: "voltage";
  unit_of_measurement: "V" | "mV";
};
type SignalStrengthSensor = {
  device_class: "signal_strength";
  unit_of_measurement: "dB" | "dBm";
};
type VolumeSensor = {
  device_class: "volume";
  unit_of_measurement: "L" | "mL" | "gal" | "fl. oz." | "m³" | "ft³" | "CCF";
};
type SoundPressureSensor = {
  device_class: "sound_pressure";
  unit_of_measurement: "dB" | "dBA";
};
type PressureSensor = {
  device_class: "pressure";
  unit_of_measurement:
    | "cbar"
    | "bar"
    | "hPa"
    | "inHg"
    | "kPa"
    | "mbar"
    | "Pa"
    | "psi";
};
type ReactivePowerSensor = {
  device_class: "reactive_power";
  unit_of_measurement: "var";
};
type PrecipitationIntensitySensor = {
  device_class: "precipitation_intensity";
  unit_of_measurement: "in/d" | "in/h" | "mm/d" | "mm/h";
};
type PowerFactorSensor = {
  device_class: "power_factor";
  unit_of_measurement: "%" | "None";
};
type PowerSensor = {
  device_class: "power";
  unit_of_measurement: "W" | "kW";
};
type MixedGasSensor = {
  device_class:
    | "nitrogen_monoxide"
    | "nitrous_oxide"
    | "ozone"
    | "pm1"
    | "pm25"
    | "pm10"
    | "volatile_organic_compounds";
  unit_of_measurement: "µg/m³";
};

type IlluminanceSensor = {
  device_class: "illuminance";
  unit_of_measurement: "lx";
};
type IrradianceSensor = {
  device_class: "irradiance";
  unit_of_measurement: "W/m²" | "BTU/(h⋅ft²)";
};
type GasSensor = {
  device_class: "gas";
  unit_of_measurement: "m³" | "ft³" | "CCF";
};
type FrequencySensor = {
  device_class: "frequency";
  unit_of_measurement: "Hz" | "kHz" | "MHz" | "GHz";
};
type EnergySensor = {
  device_class: "energy";
  unit_of_measurement: "Wh" | "kWh" | "MWh" | "MJ" | "GJ";
};
type DistanceSensor = {
  device_class: "distance";
  unit_of_measurement: "km" | "m" | "cm" | "mm" | "mi" | "yd" | "in";
};
type MonetarySensor = {
  device_class: "monetary";
  /**
   * https://en.wikipedia.org/wiki/ISO_4217#Active_codes
   */
  unit_of_measurement: string;
};
type DataRateSensor = {
  device_class: "data_rate";
  unit_of_measurement:
    | "bit/s"
    | "kbit/s"
    | "Mbit/s"
    | "Gbit/s"
    | "B/s"
    | "kB/s"
    | "MB/s"
    | "GB/s"
    | "KiB/s"
    | "MiB/s"
    | "GiB/s";
};
type DataSizeSensor = {
  device_class: "data_size";
  unit_of_measurement:
    | "bit"
    | "kbit"
    | "Mbit"
    | "Gbit"
    | "B"
    | "kB"
    | "MB"
    | "GB"
    | "TB"
    | "PB"
    | "EB"
    | "ZB"
    | "YB"
    | "KiB"
    | "MiB"
    | "GiB"
    | "TiB"
    | "PiB"
    | "EiB"
    | "ZiB"
    | "YiB";
};
type AtmosphericPressureSensor = {
  device_class: "atmospheric_pressure";
  unit_of_measurement:
    | "cbar"
    | "bar"
    | "hPa"
    | "inHg"
    | "kPa"
    | "mbar"
    | "Pa"
    | "psi";
};
type CurrentSensor = {
  device_class: "current";
  unit_of_measurement: "A" | "mA";
};
type CarbonSensor = {
  device_class: "carbon_dioxide" | "carbon_monoxide";
  unit_of_measurement: "ppm";
};
type PercentSensor = {
  device_class: "battery" | "humidity" | "moisture";
  unit_of_measurement: "%";
};
type DefaultSensor = {
  /**
   * The type/class of the sensor to set the icon in the frontend.
   *
   * @see https://www.home-assistant.io/integrations/sensor/#device-class
   */
  device_class?: "timestamp" | "date" | "aqi" | "enum";
};

export type SensorDeviceClasses =
  | DurationSensor
  | TemperatureSensor
  | Precipitation
  | ApparentPowerSensor
  | WaterSensor
  | WeightSensor
  | WindSpeedSensor
  | SpeedSensor
  | VoltageSensor
  | SignalStrengthSensor
  | VolumeSensor
  | SoundPressureSensor
  | PressureSensor
  | ReactivePowerSensor
  | PowerFactorSensor
  | PowerSensor
  | PrecipitationIntensitySensor
  | MixedGasSensor
  | IlluminanceSensor
  | IrradianceSensor
  | PercentSensor
  | GasSensor
  | FrequencySensor
  | EnergySensor
  | DistanceSensor
  | MonetarySensor
  | DataRateSensor
  | CurrentSensor
  | CarbonSensor
  | DataSizeSensor
  | AtmosphericPressureSensor
  | DefaultSensor;
