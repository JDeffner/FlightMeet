export interface DemoPanelHandle {
  setRole(role: string | null): void
  showWarning(message: string): void
  destroy(): void
}

declare global {
  interface Window {
    DemoPanel: {
      mount(options: {
        project: string
        homeUrl: string
        roles: { id: string; label: string }[]
        help: string
        onRole(role: string): void | Promise<void>
        onReset(): void | Promise<void>
      }): DemoPanelHandle
    }
  }
}
