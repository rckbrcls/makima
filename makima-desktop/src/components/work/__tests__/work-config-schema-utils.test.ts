import { describe, expect, it } from "vitest"
import {
  buildConfigSections,
  getModelOptions,
  getProviderOptions,
  toConfigSchemaNode,
} from "../work-config-schema-utils"

describe("work-config-schema-utils", () => {
  it("builds domain sections from schema/config keys", () => {
    const schema = toConfigSchemaNode({
      type: "object",
      properties: {
        agents: { type: "object" },
        providers: { type: "object" },
        gateway: { type: "object" },
        tools: { type: "array" },
        sessions: { type: "object" },
      },
    })

    const sections = buildConfigSections(schema, {
      customFeature: {},
    })

    expect(sections.map((section) => section.id)).toEqual([
      "agents",
      "providers_models",
      "gateway_auth",
      "tools_safety",
      "session_history",
      "other",
    ])
  })

  it("extracts model options from schema enum and existing config", () => {
    const options = getModelOptions(
      {
        type: "string",
        enum: ["anthropic/claude-sonnet-4-5", "openai/gpt-4.1"],
      },
      {
        agents: {
          list: [{ id: "writer", model: "custom/local-model" }],
        },
      },
    )

    expect(options.map((option) => option.value)).toEqual([
      "anthropic/claude-sonnet-4-5",
      "custom/local-model",
      "openai/gpt-4.1",
    ])
  })

  it("extracts provider options from schema and inferred model prefixes", () => {
    const options = getProviderOptions(
      {
        type: "string",
        enum: ["anthropic", "openai"],
      },
      {
        agents: {
          list: [{ id: "writer", model: "xai/grok-2" }],
        },
      },
    )

    expect(options.map((option) => option.value)).toEqual([
      "anthropic",
      "openai",
      "xai",
    ])
  })
})
