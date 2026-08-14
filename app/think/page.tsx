import ChatUI from "../components/ChatUI";

export default function ThinkPage() {
  return (
    <ChatUI
      api="/api/think"
      title="🧠 Tryb głębokiego myślenia"
      subtitle="Agent pokazuje tok rozumowania krok po kroku"
      placeholder="Zadaj trudne pytanie…"
      markdown
      images
    />
  );
}
