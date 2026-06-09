import Ajv2020Import from 'ajv/dist/2020.js';
import type { ErrorObject, ValidateFunction } from 'ajv/dist/2020.js';

import type { Graph } from './graph.js';

// ajv ships CJS; under NodeNext the default import is typed as the namespace, but
// at runtime it is the Ajv2020 constructor (the value is unchanged). Cast to a
// constructor typed by the one method we use.
type AjvInstance = { compile: (schema: object) => ValidateFunction };
const Ajv2020 = Ajv2020Import as unknown as new (opts?: object) => AjvInstance;
import { VNODES_SCHEMA } from './schema.js';

/** A single schema-validation problem, derived from an ajv error. */
export interface VnodesValidationIssue {
  /** JSON Pointer to the offending value (ajv `instancePath`). */
  path: string;
  /** Human-readable description. */
  message: string;
  /** The schema keyword that failed (e.g. `"required"`, `"enum"`). */
  keyword: string;
}

/** Error thrown when a value fails `.vnodes` schema validation. */
export class VnodesValidationError extends Error {
  readonly issues: VnodesValidationIssue[];

  constructor(issues: VnodesValidationIssue[]) {
    super(
      `Invalid .vnodes document:\n${issues
        .map((issue) => `  - ${issue.path || '/'} ${issue.message}`)
        .join('\n')}`,
    );
    this.name = 'VnodesValidationError';
    this.issues = issues;
  }
}

const ajv = new Ajv2020({ allErrors: true, strict: false });
const validateFn: ValidateFunction = ajv.compile(VNODES_SCHEMA);

function toIssues(errors: ErrorObject[] | null | undefined): VnodesValidationIssue[] {
  return (errors ?? []).map((error) => ({
    path: error.instancePath,
    message: error.message ?? 'is invalid',
    keyword: error.keyword,
  }));
}

/**
 * Validate an arbitrary value against the `.vnodes` schema. Returns the list of
 * issues; an empty array means the value is valid.
 */
export function validateVnodes(value: unknown): VnodesValidationIssue[] {
  return validateFn(value) ? [] : toIssues(validateFn.errors);
}

/** Type guard: whether a value is a schema-valid {@link Graph}. */
export function isValidVnodes(value: unknown): value is Graph {
  return validateFn(value) as boolean;
}

/** Assert a value is a schema-valid {@link Graph}, throwing otherwise. */
export function assertValidVnodes(value: unknown): asserts value is Graph {
  const issues = validateVnodes(value);
  if (issues.length > 0) {
    throw new VnodesValidationError(issues);
  }
}

/**
 * Parse `.vnodes` JSON text into a validated {@link Graph}.
 *
 * @throws SyntaxError if the text is not valid JSON.
 * @throws VnodesValidationError if the document does not match the schema.
 */
export function parseVnodes(text: string): Graph {
  const value: unknown = JSON.parse(text);
  assertValidVnodes(value);
  return value;
}

/**
 * Serialize a {@link Graph} to `.vnodes` JSON text. Indents with `space` spaces
 * (default 2) and appends a trailing newline.
 */
export function serializeVnodes(graph: Graph, space = 2): string {
  return `${JSON.stringify(graph, null, space)}\n`;
}
