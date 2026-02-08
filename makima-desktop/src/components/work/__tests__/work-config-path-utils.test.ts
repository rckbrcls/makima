import { describe, expect, it } from "vitest"
import { getAtPath, setAtPath, unsetAtPath } from "../work-config-path-utils"

describe("work-config-path-utils", () => {
  it("reads and writes deep object paths immutably", () => {
    const source = {
      gateway: {
        auth: {
          token: "abc",
        },
      },
    }

    const updated = setAtPath(source, ["gateway", "auth", "token"], "xyz")
    expect(getAtPath(updated, ["gateway", "auth", "token"])).toBe("xyz")
    expect(getAtPath(source, ["gateway", "auth", "token"])).toBe("abc")
  })

  it("creates missing branches when setting a value", () => {
    const source = {}
    const updated = setAtPath(source, ["agents", "list", 0, "id"], "agent-1")
    expect(getAtPath(updated, ["agents", "list", 0, "id"])).toBe("agent-1")
  })

  it("unsets object and array paths", () => {
    const source = {
      agents: {
        list: [{ id: "a" }, { id: "b" }],
      },
      gateway: { auth: { token: "abc" } },
    }

    const withoutToken = unsetAtPath(source, ["gateway", "auth", "token"])
    expect(getAtPath(withoutToken, ["gateway", "auth", "token"])).toBeUndefined()

    const withoutSecondAgent = unsetAtPath(source, ["agents", "list", 1])
    expect(getAtPath(withoutSecondAgent, ["agents", "list"])).toEqual([{ id: "a" }])
  })
})
