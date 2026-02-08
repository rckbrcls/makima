import { fireEvent, render, screen } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"
import { WorkModelField } from "../work-model-field"

describe("WorkModelField", () => {
  it("renders suggested options and accepts custom values", () => {
    const onChange = vi.fn()

    render(
      <WorkModelField
        id="model-test"
        value=""
        onChange={onChange}
        provider="openai"
        options={[
          { value: "openai/gpt-4.1", label: "GPT-4.1", provider: "openai" },
          { value: "anthropic/claude-sonnet-4-5", label: "Claude", provider: "anthropic" },
        ]}
      />,
    )

    const input = screen.getByPlaceholderText("provider/model (custom allowed)")
    fireEvent.change(input, { target: { value: "openai/custom-model" } })

    expect(onChange).toHaveBeenCalledWith("openai/custom-model")
    const datalist = document.getElementById("model-test")
    expect(datalist?.textContent).toContain("openai/gpt-4.1")
    expect(datalist?.textContent).not.toContain("anthropic/claude-sonnet-4-5")
  })
})
