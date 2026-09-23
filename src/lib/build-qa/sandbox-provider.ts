/* eslint-disable @typescript-eslint/no-explicit-any */
import { exec } from "child_process"
import { promisify } from "util"

const execAsync = promisify(exec)

export interface SandboxExecutionResult {
  command: string
  exitCode: number
  stdout: string
  stderr: string
  durationMs: number
  success: boolean
}

export interface SandboxProvider {
  name: string
  runCommand(cwd: string, command: string, timeoutMs?: number): Promise<SandboxExecutionResult>
}

export class LocalSandboxProvider implements SandboxProvider {
  name = "LocalSandbox"

  async runCommand(cwd: string, command: string, timeoutMs = 30000): Promise<SandboxExecutionResult> {
    const start = Date.now()
    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd,
        timeout: timeoutMs,
        env: { ...process.env, NODE_ENV: "test" }
      })
      const durationMs = Date.now() - start
      return {
        command,
        exitCode: 0,
        stdout: stdout || "",
        stderr: stderr || "",
        durationMs,
        success: true
      }
    } catch (err: any) {
      const durationMs = Date.now() - start
      return {
        command,
        exitCode: err.code || 1,
        stdout: err.stdout || "",
        stderr: err.stderr || err.message || "Command execution failed in sandbox.",
        durationMs,
        success: false
      }
    }
  }
}
