# Generate the web client from OpenAPI

NestJS DTOs and validation define the external REST contract, and the Next.js client uses `openapi-typescript` plus `openapi-fetch` generated from the resulting OpenAPI document rather than sharing backend validation or persistence models. Errors use RFC 9457 Problem Details, and CI rejects stale specifications or generated clients. This duplicates some presentation validation but preserves the API as the security boundary and prevents frontend code from depending on backend implementation details.
