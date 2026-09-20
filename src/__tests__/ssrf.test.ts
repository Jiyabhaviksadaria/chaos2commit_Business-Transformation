import { describe, it, expect } from "vitest"
import { isPrivateIP } from "../lib/ssrf"

describe("SSRF Protection - isPrivateIP", () => {
  it("blocks localhost", () => {
    expect(isPrivateIP("127.0.0.1")).toBe(true)
    expect(isPrivateIP("::1")).toBe(true)
    expect(isPrivateIP("127.0.1.1")).toBe(true)
  })

  it("blocks 10.x local network", () => {
    expect(isPrivateIP("10.0.0.1")).toBe(true)
    expect(isPrivateIP("10.255.255.255")).toBe(true)
  })

  it("blocks 172.16 - 172.31 local network", () => {
    expect(isPrivateIP("172.16.0.1")).toBe(true)
    expect(isPrivateIP("172.31.255.255")).toBe(true)
    
    // Valid public IP in the 172 block
    expect(isPrivateIP("172.32.0.1")).toBe(false)
    expect(isPrivateIP("172.15.255.255")).toBe(false)
  })

  it("blocks 192.168 local network", () => {
    expect(isPrivateIP("192.168.1.1")).toBe(true)
    expect(isPrivateIP("192.168.255.255")).toBe(true)
    
    // Valid public IP in the 192 block
    expect(isPrivateIP("192.167.255.255")).toBe(false)
  })

  it("blocks metadata AWS/GCP IPs", () => {
    expect(isPrivateIP("169.254.169.254")).toBe(true)
  })

  it("allows standard public IPs", () => {
    expect(isPrivateIP("8.8.8.8")).toBe(false)
    expect(isPrivateIP("1.1.1.1")).toBe(false)
    expect(isPrivateIP("104.21.43.12")).toBe(false)
  })
})
