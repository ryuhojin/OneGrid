export interface AdapterRequestEnvelope<TRequest = unknown> {
  readonly body: TRequest;
  readonly headers?: Readonly<Record<string, string>>;
}

export function createJsonEnvelope<TRequest>(body: TRequest): AdapterRequestEnvelope<TRequest> {
  return {
    body,
    headers: { "content-type": "application/json" }
  };
}
