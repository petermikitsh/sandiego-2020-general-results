interface PrecinctContestResult {
  id: string;
  candidate: string;
  votes: number;
  consName: string;
}

export type ResultSet = PrecinctContestResult[];

export interface Election {
  id: string;
  precincts: Precincts;
  consolidations: Consolidations;
}

export interface Consolidations {
  type: string;
  features: Feature[];
}

export interface Feature {
  type: 'Feature';
  geometry: Geometry;
  properties: {
    CONSNAME: string;
  };
}

interface Geometry {
  type: GeometryType;
  coordinates: Array<Array<Array<number[] | number>>>;
}

enum GeometryType {
  MultiPolygon = 'MultiPolygon',
  Polygon = 'Polygon',
}

export interface Precincts {
  type: string;
  features: {
    type: 'Feature';
    geometry: Geometry;
    properties: {
      PRECINCT: string;
      CONSNAME: string;
    };
  }[];
}
