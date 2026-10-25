export type SubmitSuccess = { ok: true; reference: string };
export type SubmitFailure = {
  ok: false;
  error: "validation_error" | "rate_limited" | "forbidden" | "unavailable" | "server_error";
  message: string;
  fields?: Record<string, string>;
};
export type SubmitResult = SubmitSuccess | SubmitFailure;
