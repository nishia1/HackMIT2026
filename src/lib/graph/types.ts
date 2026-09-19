export type NodeType =
  | "PERSON"
  | "EVENT"
  | "CLUB"
  | "COURSE"
  | "PROJECT"
  | "INTEREST"
  | "PLACE"
  | "COMMUNITY";

export type EdgeType =
  | "KNOWS"
  | "ATTENDED"
  | "MEMBER_OF"
  | "STUDIES"
  | "INTERESTED_IN"
  | "PRESENTED_AT"
  | "WORKS_ON"
  | "LOCATED_IN";

export interface GNode {
  id: string;
  type: NodeType;
  name: string;
  emoji: string | null;
  meta: Record<string, unknown>;
}

export interface GEdge {
  id: string;
  type: EdgeType;
  fromId: string;
  toId: string;
  weight: number;
}

/** An adjacency-indexed view of the whole graph. */
export interface GraphIndex {
  nodes: Map<string, GNode>;
  adj: Map<string, { edge: GEdge; otherId: string }[]>;
  /** Number of edges touching a node. Used for rarity scoring. */
  degree: Map<string, number>;
}

/** One hop of a string: "through CS 2110", "you both know Maya". */
export interface Hop {
  via: GNode;
  edgeIn: GEdge;
  edgeOut: GEdge;
}

/** A single string: one explainable path from you to someone else. */
export interface Strand {
  path: GNode[];
  hops: Hop[];
  score: number;
  label: string;
}

/** Every string between you and one person. */
export interface StringBundle {
  target: GNode;
  strands: Strand[];
  score: number;
  known: boolean;
}
