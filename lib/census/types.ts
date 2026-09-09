/** ACS dataset vintage, e.g. 2023. */
export type Vintage = number;

/** Geography level supported by resolve_geography. */
export type GeoLevel = "state" | "county" | "place";

/** A geography candidate returned by resolve_geography. */
export interface GeoCandidate {
  /** Full name as the Census Bureau writes it, e.g. "DeKalb County, Georgia" */
  name: string;
  level: GeoLevel;
  /** State FIPS, always present, e.g. "13" for Georgia */
  state: string;
  /** County FIPS within the state, e.g. "089". Absent for state-level. */
  county?: string;
  /** Place FIPS within the state. Absent unless level is "place". */
  place?: string;
}

/** Census API responses are arrays of arrays; row 0 is headers. */
export type CensusRawResponse = string[][];