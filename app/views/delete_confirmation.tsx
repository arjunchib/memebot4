import { ButtonStyle, MessageFlags } from "discord.js";
import { ActionRow, Button, Container, Message, TextDisplay } from "mango";

export class DeleteConfirmation {
  constructor(private props: { id: string }) {}

  render() {
    return (
      <Message flags={MessageFlags.Ephemeral}>
        <Container accent_color={0xff0000}>
          <TextDisplay>Are you sure you want to delete this meme?</TextDisplay>
          <ActionRow>
            <Button style={ButtonStyle.Secondary} custom_id="delete:cancel">
              Cancel
            </Button>
            <Button
              style={ButtonStyle.Danger}
              custom_id={`delete:confirm:${this.props.id}`}
            >
              Delete
            </Button>
          </ActionRow>
        </Container>
      </Message>
    );
  }
}
