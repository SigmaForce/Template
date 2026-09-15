import type { NextFunction, Request, Response } from "express";
import type { JsonLogger } from "./logging.mjs";

export const CORRELATION_ID_HEADER: "x-correlation-id";
export function resolveCorrelationId(candidate: string | null): string;
export function correlationIdMiddleware(
  request: Request,
  response: Response,
  next: NextFunction,
): void;
export function getResponseCorrelationId(response: Response): string;
export function createRequestLoggingMiddleware(
  logger: JsonLogger,
): (request: Request, response: Response, next: NextFunction) => void;
