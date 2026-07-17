import { useState } from "react"
import { Button } from "@/components/ui/button"
import { apiUrl } from "@/lib/api"

type TestState = {
  status: "idle" | "loading" | "success" | "error"
  data?: unknown
  error?: string
  durationMs?: number
}

const initialState: TestState = { status: "idle" }

function StatusBadge({ status }: { status: TestState["status"] }) {
  const styles: Record<TestState["status"], string> = {
    idle: "bg-zinc-200 text-zinc-700",
    loading: "bg-amber-200 text-amber-900",
    success: "bg-emerald-200 text-emerald-900",
    error: "bg-red-200 text-red-900",
  }
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${styles[status]}`}
    >
      {status}
    </span>
  )
}

function ResultPanel({ state }: { state: TestState }) {
  if (state.status === "idle") {
    return <p className="text-sm text-zinc-500">Not run yet.</p>
  }
  if (state.status === "loading") {
    return <p className="text-sm text-zinc-500">Calling backend…</p>
  }
  if (state.status === "error") {
    return (
      <pre className="overflow-x-auto rounded-md bg-red-50 p-3 text-xs text-red-900">
        {state.error}
      </pre>
    )
  }
  return (
    <div className="space-y-2">
      {state.durationMs !== undefined && (
        <p className="text-xs text-zinc-500">
          Completed in {state.durationMs} ms
        </p>
      )}
      <pre className="overflow-x-auto rounded-md bg-zinc-50 p-3 text-xs text-zinc-800">
        {JSON.stringify(state.data, null, 2)}
      </pre>
    </div>
  )
}

export function BackendTest() {
  const [pingState, setPingState] = useState<TestState>(initialState)
  const [echoState, setEchoState] = useState<TestState>(initialState)
  const [echoInput, setEchoInput] = useState<string>(
    JSON.stringify({ hello: "world", n: 42 }, null, 2),
  )

  async function runPing() {
    setPingState({ status: "loading" })
    const t0 = performance.now()
    try {
      const res = await fetch(apiUrl("/api/ping"), {
        headers: { Accept: "application/json" },
      })
      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`)
      const data = await res.json()
      setPingState({
        status: "success",
        data,
        durationMs: Math.round(performance.now() - t0),
      })
    } catch (err) {
      setPingState({
        status: "error",
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  async function runEcho() {
    setEchoState({ status: "loading" })
    const t0 = performance.now()
    try {
      let body: unknown
      try {
        body = JSON.parse(echoInput)
      } catch {
        throw new Error("Invalid JSON in request body")
      }
      const res = await fetch(apiUrl("/api/echo"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`)
      const data = await res.json()
      setEchoState({
        status: "success",
        data,
        durationMs: Math.round(performance.now() - t0),
      })
    } catch (err) {
      setEchoState({
        status: "error",
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4 p-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Backend test</h1>
        <p className="text-sm text-zinc-500">
          Verifies that the Vite dev server is proxying <code>/api</code> to the
          CodeIgniter backend on <code>localhost:8080</code>.
        </p>
      </header>

      <section className="rounded-lg border border-zinc-200 p-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="font-medium">GET /api/ping</h2>
            <p className="text-xs text-zinc-500">Health check</p>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={pingState.status} />
            <Button onClick={runPing} disabled={pingState.status === "loading"}>
              Run
            </Button>
          </div>
        </div>
        <ResultPanel state={pingState} />
      </section>

      <section className="rounded-lg border border-zinc-200 p-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="font-medium">POST /api/echo</h2>
            <p className="text-xs text-zinc-500">Round-trips a JSON body</p>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={echoState.status} />
            <Button onClick={runEcho} disabled={echoState.status === "loading"}>
              Run
            </Button>
          </div>
        </div>
        <label className="mb-2 block text-xs font-medium text-zinc-600">
          Request body (JSON)
        </label>
        <textarea
          value={echoInput}
          onChange={(e) => setEchoInput(e.target.value)}
          rows={5}
          className="mb-3 w-full rounded-md border border-zinc-200 bg-white p-2 font-mono text-xs focus:border-zinc-400 focus:outline-none"
        />
        <ResultPanel state={echoState} />
      </section>
    </div>
  )
}

export default BackendTest
