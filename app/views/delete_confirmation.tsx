import { ButtonStyle, MessageFlags } from "discord.js";
import { ActionRow, Button, Container, Message, TextDisplay } from "mango";

export class DeleteConfirmation {
  constructor(private props: { id: string; allowed?: boolean }) {}

  render() {
    const { id, allowed } = this.props;
    const content = allowed ? (
      <>
        <TextDisplay>Are you sure you want to delete this meme?</TextDisplay>
        <ActionRow>
          <Button style={ButtonStyle.Secondary} custom_id="delete:cancel">
            Cancel
          </Button>
          <Button style={ButtonStyle.Danger} custom_id={`delete:confirm:${id}`}>
            Delete
          </Button>
        </ActionRow>
      </>
    ) : (
      <TextDisplay>
        You are not authorized to delete this command. Ask the admin or meme
        owner to delete.
      </TextDisplay>
    );

    return (
      <Message flags={MessageFlags.Ephemeral}>
        <Container accent_color={0xff0000}>{content}</Container>
      </Message>
    );
  }
}
