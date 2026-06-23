// @fastify/view's type definitions don't support custom propertyName values.
// Required workaround for the viewPartial renderer registered without a global
// layout in src/main.ts. Remove this file when the upstream issue is resolved.
// https://github.com/fastify/point-of-view/issues/301
declare module 'fastify' {
  interface FastifyReply {
    viewPartial(page: string, data?: Record<string, unknown>): FastifyReply;
    viewPartialAsync(
      page: string,
      data?: Record<string, unknown>,
    ): Promise<string>;
  }
}
