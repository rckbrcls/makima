import { describe, expect, it } from "vitest"
import { normalizeWizardState } from "../wizard-normalization"

describe("normalizeWizardState", () => {
  it("normalizes top-level prompts payload", () => {
    const state = normalizeWizardState({
      sessionId: "wizard-1",
      completed: false,
      prompts: [
        {
          id: "gateway.port",
          label: "Gateway Port",
          type: "number",
          required: true,
          default: 18789,
        },
      ],
    })

    expect(state.sessionId).toBe("wizard-1")
    expect(state.completed).toBe(false)
    expect(state.prompts).toHaveLength(1)
    expect(state.prompts[0]).toMatchObject({
      id: "gateway.port",
      label: "Gateway Port",
      type: "number",
      required: true,
      defaultValue: 18789,
    })
  })

  it("normalizes nested step payload and choice options", () => {
    const state = normalizeWizardState({
      session_id: "wizard-2",
      step: {
        id: "auth",
        title: "Authentication",
        description: "Choose auth mode",
        questions: [
          {
            key: "auth.mode",
            question: "Auth Mode",
            type: "select",
            choices: [
              { value: "token", label: "Token" },
              { value: "password", label: "Password" },
            ],
          },
          {
            key: "auth.enabled",
            question: "Enable auth",
            type: "boolean",
          },
        ],
      },
    })

    expect(state.sessionId).toBe("wizard-2")
    expect(state.stepId).toBe("auth")
    expect(state.title).toBe("Authentication")
    expect(state.description).toBe("Choose auth mode")
    expect(state.prompts).toHaveLength(2)

    expect(state.prompts[0]).toMatchObject({
      id: "auth.mode",
      type: "select",
      options: [
        { value: "token", label: "Token" },
        { value: "password", label: "Password" },
      ],
    })

    expect(state.prompts[1]).toMatchObject({
      id: "auth.enabled",
      type: "boolean",
    })
  })

  it("marks completed when status is completed", () => {
    const state = normalizeWizardState({
      id: "wizard-3",
      status: "completed",
    })

    expect(state.sessionId).toBe("wizard-3")
    expect(state.completed).toBe(true)
    expect(state.prompts).toEqual([])
  })
})
