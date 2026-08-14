import ChatUI from "../components/ChatUI";

export default function VisionPage() {
  return (
    <ChatUI
      api="/api/vision"
      title="👁️ Agent Vision"
      subtitle="Wklej screenshot, wrzuć plik lub przeciągnij obraz"
      placeholder="Zadaj pytanie o obraz…"
      markdown
      images
      emptyHint={
        "📸 Ctrl+V — wklej screenshot\n📁 Kliknij 📎 — wybierz plik\n🖱️ Przeciągnij — upuść obraz"
      }
      suggestions={[
        "Co widzisz na tym obrazie?",
        "Wyciągnij cały tekst z tego screena",
        "Opisz to w 3 zdaniach",
        "Jakie kolory dominują? Podaj kody HEX",
      ]}
    />
  );
}
