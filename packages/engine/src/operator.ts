import type { GraphNode } from '@vector-nodes/core';

/** What an evaluator receives when computing one node's outputs. */
export interface EvaluatorContext {
  /**
   * Resolved input socket values, keyed by input socket name. An input is
   * present when it is connected (the upstream output value) or has a default on
   * its definition; otherwise it is absent.
   */
  inputs: Record<string, unknown>;
  /** Effective parameter values: definition defaults overlaid with node params. */
  params: Record<string, unknown>;
  /** The node instance being evaluated. */
  node: GraphNode;
}

/**
 * Computes a node's output socket values from its inputs and params. The return
 * value maps output socket name → value.
 */
export type NodeEvaluator = (ctx: EvaluatorContext) => Record<string, unknown>;

/** A table of node evaluators keyed by node type. */
export type OperatorTable = Record<string, NodeEvaluator>;
