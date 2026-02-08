import Testing
@testable import makima_mobile

struct ComposerPayloadBuilderTests {
    @Test
    func buildsTextOnlyPayload() {
        let payload = ComposerPayloadBuilder.build(
            text: "Hello world",
            attachments: []
        )

        #expect(payload == "Hello world")
        #expect(ComposerPayloadBuilder.canSend(text: "Hello world", attachments: []))
    }

    @Test
    func buildsAttachmentOnlyPayload() {
        let payload = ComposerPayloadBuilder.build(
            text: "   ",
            attachments: [
                ComposerAttachment(kind: .file, displayName: "notes.txt")
            ]
        )

        #expect(payload == "Attachments:\n- [file] notes.txt")
        #expect(ComposerPayloadBuilder.canSend(text: "", attachments: [ComposerAttachment(kind: .file, displayName: "notes.txt")]))
    }

    @Test
    func buildsCombinedPayload() {
        let payload = ComposerPayloadBuilder.build(
            text: "Please review these files.",
            attachments: [
                ComposerAttachment(kind: .image, displayName: "Photo 1"),
                ComposerAttachment(kind: .file, displayName: "brief.pdf")
            ]
        )

        #expect(
            payload ==
            """
            Attachments:
            - [image] Photo 1
            - [file] brief.pdf

            Please review these files.
            """
        )
    }

    @Test
    func emptyComposerProducesEmptyPayload() {
        let payload = ComposerPayloadBuilder.build(text: "   ", attachments: [])

        #expect(payload.isEmpty)
        #expect(!ComposerPayloadBuilder.canSend(text: "   ", attachments: []))
    }
}
