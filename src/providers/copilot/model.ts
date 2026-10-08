/** Copilot model ids are namespaced `copilot/<model>` everywhere we store or price them, so they can't collide with other providers'. */
export function copilotModel(id: string): string {
  return id.startsWith("copilot/") ? id : `copilot/${id}`;
}
